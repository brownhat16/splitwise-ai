"""SQLAlchemy data models for the expense sharing application."""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum, Table
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from database import Base


class SplitType(enum.Enum):
    """Type of expense split."""
    EQUAL = "equal"
    UNEQUAL = "unequal"
    PERCENTAGE = "percentage"
    SHARES = "shares"


# Association table for group members
group_members = Table(
    "group_members",
    Base.metadata,
    Column("group_id", Integer, ForeignKey("groups.id"), primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True)
)



class User(Base):
    """User model - represents a person in the system."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), unique=True, nullable=True)
    email = Column(String(100), unique=True, nullable=True)
    hashed_password = Column(String(255), nullable=True) # [NEW] For auth
    role = Column(String(20), default="user") # [NEW] "admin" or "user"
    is_active = Column(Boolean, default=True) # [NEW] Soft delete/ban
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    groups = relationship("Group", secondary=group_members, back_populates="members")
    expenses_paid = relationship("Expense", back_populates="payer", foreign_keys="Expense.payer_id")
    splits = relationship("ExpenseSplit", back_populates="user")
    messages = relationship("Message", back_populates="user")
    
    def __repr__(self):
        return f"<User(id={self.id}, name='{self.name}', role='{self.role}')>"


class Group(Base):
    """Group model - represents a collection of users sharing expenses."""
    __tablename__ = "groups"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    members = relationship("User", secondary=group_members, back_populates="groups")
    expenses = relationship("Expense", back_populates="group")
    created_by = relationship("User", foreign_keys=[created_by_id])
    
    def __repr__(self):
        return f"<Group(id={self.id}, name='{self.name}')>"


class Expense(Base):
    """Expense model - represents a shared expense."""
    __tablename__ = "expenses"
    
    id = Column(Integer, primary_key=True, index=True)
    description = Column(String(255), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="INR")
    payer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    split_type = Column(Enum(SplitType), default=SplitType.EQUAL)
    date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_settled = Column(Boolean, default=False)
    
    # Relationships
    payer = relationship("User", back_populates="expenses_paid", foreign_keys=[payer_id])
    group = relationship("Group", back_populates="expenses")
    splits = relationship("ExpenseSplit", back_populates="expense", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Expense(id={self.id}, amount={self.amount}, description='{self.description}')>"


class ExpenseSplit(Base):
    """ExpenseSplit model - represents how an expense is split among users."""
    __tablename__ = "expense_splits"
    
    id = Column(Integer, primary_key=True, index=True)
    expense_id = Column(Integer, ForeignKey("expenses.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)  # The amount this user owes
    percentage = Column(Float, nullable=True)  # Optional: percentage if split by percentage
    shares = Column(Integer, nullable=True)  # Optional: shares if split by shares
    is_paid = Column(Boolean, default=False)
    
    # Relationships
    expense = relationship("Expense", back_populates="splits")
    user = relationship("User", back_populates="splits")
    
    def __repr__(self):
        return f"<ExpenseSplit(expense_id={self.expense_id}, user_id={self.user_id}, amount={self.amount})>"


class Transaction(Base):
    """Transaction model - represents a payment/settlement between users."""
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    from_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    to_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="INR")
    description = Column(String(255), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    is_settled = Column(Boolean, default=False)
    
    # Relationships
    from_user = relationship("User", foreign_keys=[from_user_id])
    to_user = relationship("User", foreign_keys=[to_user_id])
    
    def __repr__(self):
        return f"<Transaction(from={self.from_user_id}, to={self.to_user_id}, amount={self.amount})>"


class LedgerEntry(Base):
    """LedgerEntry model - immutable double-entry bookkeeping records."""
    __tablename__ = "ledger_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    counterparty_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)  # Positive = owed TO user, Negative = user OWES
    expense_id = Column(Integer, ForeignKey("expenses.id"), nullable=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    description = Column(String(255), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    counterparty = relationship("User", foreign_keys=[counterparty_id])
    
    def __repr__(self):
        return f"<LedgerEntry(user={self.user_id}, counterparty={self.counterparty_id}, amount={self.amount})>"


class Message(Base):
    """Message model - stores chat history for context."""
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    response = Column(Text, nullable=True)
    intent = Column(String(50), nullable=True)
    entities = Column(Text, nullable=True)  # JSON string of extracted entities
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="messages")
    
    def __repr__(self):
        return f"<Message(id={self.id}, user_id={self.user_id})>"
