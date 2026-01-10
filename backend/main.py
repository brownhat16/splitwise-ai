"""FastAPI application for the AI-Native Expense Sharing App."""

from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
import json

from database import async_session, init_db, get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models import User, Group, Expense
from agents import AgentOrchestrator, AgentConfig
from ledger import LedgerManager
from auth import router as auth_router

# Pydantic models for API
class ChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    response: str
    success: bool
    needs_clarification: bool = False
    data: Optional[Dict[str, Any]] = None


class UserCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    name: str
    email: Optional[str]
    phone: Optional[str]

    class Config:
        from_attributes = True


class BalanceResponse(BaseModel):
    total_owed_to_you: float
    total_you_owe: float
    net_balance: float
    owed_to_you: List[Dict[str, Any]]
    you_owe: List[Dict[str, Any]]


# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active_connections[user_id] = websocket
    
    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
    
    async def send_message(self, user_id: int, message: dict):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_json(message)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections.values():
            await connection.send_json(message)


manager = ConnectionManager()


# Application lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown (cleanup if needed)


# Create FastAPI app
app = FastAPI(
    title="AI-Native Expense Sharing App",
    description="A Splitwise-like app where all interactions happen through natural language",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

# Dependency to get database session
async def get_session():
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "AI Expense Sharing App is running!"}


# ============== CHAT ENDPOINTS ==============

from auth import get_current_user

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, 
               db: AsyncSession = Depends(get_session),
               current_user: User = Depends(get_current_user)):
    """
    Main chat endpoint for natural language interactions.
    Requires Authentication.
    """
    user_id = current_user.id
    
    # Create orchestrator and process message
    orchestrator = AgentOrchestrator(db)
    
    try:
        result = await orchestrator.process_message(
            user_id=user_id,
            message=request.message,
            context=request.context
        )
        
        return ChatResponse(
            response=result.get("response", "I processed your request."),
            success=result.get("success", True),
            needs_clarification=result.get("needs_clarification", False),
            data=result
        )
    finally:
        await orchestrator.close()


# ============== USER ENDPOINTS ==============

from auth import get_current_admin

@app.get("/users", response_model=List[UserResponse])
async def get_users(skip: int = 0, limit: int = 100, 
                   db: AsyncSession = Depends(get_session),
                   current_user: User = Depends(get_current_admin)):
    """Get all users (Admin only)."""
    query = select(User).offset(skip).limit(limit)
    result = await db.execute(query)
    users = result.scalars().all()
    return users

@app.post("/users", response_model=UserResponse)
async def create_user(user: UserCreate, db: AsyncSession = Depends(get_session)):
    """Create a new user."""
    new_user = User(
        name=user.name,
        email=user.email,
        phone=user.phone
    )
    db.add(new_user)
    await db.flush()
    await db.refresh(new_user)
    return new_user


@app.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: AsyncSession = Depends(get_session)):
    """Get user details."""
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user


@app.get("/users/{user_id}/balance", response_model=BalanceResponse)
async def get_balance(user_id: int, db: AsyncSession = Depends(get_session)):
    """Get user's balance summary."""
    ledger = LedgerManager(db)
    summary = await ledger.get_user_summary(user_id)
    
    return BalanceResponse(
        total_owed_to_you=summary.get("total_owed_to_you", 0),
        total_you_owe=summary.get("total_you_owe", 0),
        net_balance=summary.get("net_balance", 0),
        owed_to_you=summary.get("owed_to_you", []),
        you_owe=summary.get("you_owe", [])
    )


@app.get("/users/{user_id}/history")
async def get_history(user_id: int, limit: int = 50, 
                      db: AsyncSession = Depends(get_session)):
    """Get user's transaction history."""
    ledger = LedgerManager(db)
    history = await ledger.get_ledger_history(user_id, limit)
    return {"history": history}


# ============== WEBSOCKET CHAT ==============

@app.websocket("/ws/{user_id}")
async def websocket_chat(websocket: WebSocket, user_id: int):
    """
    WebSocket endpoint for real-time chat.
    
    Connect and send JSON messages:
    {"message": "Split ₹500 with Rahul"}
    """
    await manager.connect(websocket, user_id)
    
    try:
        async with async_session() as db:
            # Ensure user exists
            user_query = select(User).where(User.id == user_id)
            result = await db.execute(user_query)
            user = result.scalar_one_or_none()
            
            if not user:
                user = User(id=user_id, name=f"User {user_id}")
                db.add(user)
                await db.commit()
            
            # Send welcome message
            await websocket.send_json({
                "type": "welcome",
                "message": f"Hi {user.name}! I'm your AI expense assistant. How can I help you today?"
            })
            
            orchestrator = AgentOrchestrator(db)
            
            try:
                while True:
                    # Receive message
                    data = await websocket.receive_json()
                    message = data.get("message", "")
                    
                    if not message:
                        continue
                    
                    # Process message
                    result = await orchestrator.process_message(
                        user_id=user_id,
                        message=message,
                        context=data.get("context")
                    )
                    
                    # Send response
                    await websocket.send_json({
                        "type": "response",
                        "message": result.get("response", ""),
                        "success": result.get("success", True),
                        "needs_clarification": result.get("needs_clarification", False),
                        "data": result
                    })
                    
                    await db.commit()
            finally:
                await orchestrator.close()
                
    except WebSocketDisconnect:
        manager.disconnect(user_id)


# ============== QUICK ACCESS ENDPOINTS ==============

@app.get("/users/{user_id}/owed-to-me")
async def get_owed_to_me(user_id: int, db: AsyncSession = Depends(get_session)):
    """Quick check: Who owes me money?"""
    ledger = LedgerManager(db)
    summary = await ledger.get_user_summary(user_id)
    
    owed = summary.get("owed_to_you", [])
    total = summary.get("total_owed_to_you", 0)
    
    if not owed:
        return {"message": "No one owes you money! 🎉", "people": [], "total": 0}
    
    return {
        "message": f"{len(owed)} people owe you a total of ₹{total:,.2f}",
        "people": owed,
        "total": total
    }


@app.get("/users/{user_id}/i-owe")
async def get_i_owe(user_id: int, db: AsyncSession = Depends(get_session)):
    """Quick check: Who do I owe money to?"""
    ledger = LedgerManager(db)
    summary = await ledger.get_user_summary(user_id)
    
    owe = summary.get("you_owe", [])
    total = summary.get("total_you_owe", 0)
    
    if not owe:
        return {"message": "You don't owe anyone money! 🎉", "people": [], "total": 0}
    
    return {
        "message": f"You owe {len(owe)} people a total of ₹{total:,.2f}",
        "people": owe,
        "total": total
    }


# ============== GROUP ENDPOINTS ==============

@app.get("/users/{user_id}/groups")
async def get_user_groups(user_id: int, db: AsyncSession = Depends(get_session)):
    """Get groups the user belongs to."""
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    groups = [{"id": g.id, "name": g.name} for g in user.groups]
    return {"groups": groups}


# Entry point for running directly
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
