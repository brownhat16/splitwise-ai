from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import User, Invite, InviteStatus, LedgerEntry, ExpenseSplit
from sqlalchemy import update

# Config
SECRET_KEY = "your-secret-key-keep-it-secret" # In production, use env var
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 300

# Security Context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

router = APIRouter(prefix="/auth", tags=["auth"])

# --- Models ---
class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    name: str
    role: str

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None

# --- Utils ---
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    query = select(User).where(User.email == email)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_admin(current_user: User = Depends(get_current_active_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

# --- Routes ---

@router.post("/register", response_model=Token)
async def register(user: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if user exists
    query = select(User).where(User.email == user.email)
    result = await db.execute(query)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    # First user is admin, others are users (simple logic for now)
    is_first_user = False # We will handle admin creation manually or via first-user logic
    
    # Check if there are any users at all
    q_all = select(User).limit(1)
    res_all = await db.execute(q_all)
    if not res_all.scalar_one_or_none():
        is_first_user = True

    new_user = User(
        name=user.name,
        email=user.email,
        phone=user.phone,
        hashed_password=hashed_password,
        role="admin" if is_first_user else "user",
        is_active=True
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # === AUTO-LINK PENDING INVITES ===
    # Find all pending invites with this email
    invite_query = select(Invite).where(
        Invite.invitee_email == user.email.lower(),
        Invite.status == InviteStatus.PENDING
    )
    invite_result = await db.execute(invite_query)
    pending_invites = invite_result.scalars().all()
    
    for invite in pending_invites:
        if invite.placeholder_user_id:
            placeholder_id = invite.placeholder_user_id
            
            # Update all LedgerEntry records
            await db.execute(
                update(LedgerEntry)
                .where(LedgerEntry.debtor_id == placeholder_id)
                .values(debtor_id=new_user.id)
            )
            await db.execute(
                update(LedgerEntry)
                .where(LedgerEntry.creditor_id == placeholder_id)
                .values(creditor_id=new_user.id)
            )
            
            # Update ExpenseSplit records
            await db.execute(
                update(ExpenseSplit)
                .where(ExpenseSplit.user_id == placeholder_id)
                .values(user_id=new_user.id)
            )
            
            # Delete placeholder user (optional - could keep for audit)
            placeholder = await db.get(User, placeholder_id)
            if placeholder:
                await db.delete(placeholder)
        
        # Mark invite as accepted
        invite.status = InviteStatus.ACCEPTED
    
    await db.commit()
    # === END AUTO-LINK ===
    
    # Generate token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_user.email, "role": new_user.role, "id": new_user.id},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_id": new_user.id,
        "name": new_user.name,
        "role": new_user.role
    }

@router.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    # Authenticate
    query = select(User).where(User.email == form_data.username)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user or not user.hashed_password or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role, "id": user.id}, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_id": user.id,
        "name": user.name,
        "role": user.role
    }
