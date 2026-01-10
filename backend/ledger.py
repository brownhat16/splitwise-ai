"""Ledger management with double-entry bookkeeping for accurate balance tracking."""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from models import LedgerEntry, User, Expense, ExpenseSplit, Transaction
from typing import Dict, List, Tuple
from datetime import datetime
from collections import defaultdict


class LedgerManager:
    """Manages the double-entry ledger for expense tracking."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def record_expense(self, expense: Expense, splits: List[ExpenseSplit]) -> List[LedgerEntry]:
        """
        Record an expense in the ledger using double-entry bookkeeping.
        
        For each split, we create entries showing:
        - The payer is owed money BY each participant
        - Each participant owes money TO the payer
        """
        entries = []
        payer_id = expense.payer_id
        
        for split in splits:
            if split.user_id == payer_id:
                continue  # Skip the payer's own share
            
            # Create entry for payer (they are owed money)
            payer_entry = LedgerEntry(
                user_id=payer_id,
                counterparty_id=split.user_id,
                amount=split.amount,  # Positive: owed TO payer
                expense_id=expense.id,
                description=f"Expense: {expense.description}",
                timestamp=datetime.utcnow()
            )
            entries.append(payer_entry)
            
            # Create entry for the ower (they owe money)
            ower_entry = LedgerEntry(
                user_id=split.user_id,
                counterparty_id=payer_id,
                amount=-split.amount,  # Negative: user OWES
                expense_id=expense.id,
                description=f"Expense: {expense.description}",
                timestamp=datetime.utcnow()
            )
            entries.append(ower_entry)
        
        self.db.add_all(entries)
        await self.db.flush()
        return entries
    
    async def record_settlement(self, from_user_id: int, to_user_id: int, amount: float, 
                                 description: str = "Settlement") -> Tuple[LedgerEntry, LedgerEntry]:
        """
        Record a settlement payment in the ledger.
        
        When A pays B, it reduces A's debt to B (or increases B's debt to A if overpaid).
        """
        # Entry for the payer (their debt decreases)
        payer_entry = LedgerEntry(
            user_id=from_user_id,
            counterparty_id=to_user_id,
            amount=amount,  # Positive: reduces what they owe
            description=description,
            timestamp=datetime.utcnow()
        )
        
        # Entry for the receiver (their credit decreases)
        receiver_entry = LedgerEntry(
            user_id=to_user_id,
            counterparty_id=from_user_id,
            amount=-amount,  # Negative: reduces what they're owed
            description=description,
            timestamp=datetime.utcnow()
        )
        
        self.db.add_all([payer_entry, receiver_entry])
        await self.db.flush()
        return payer_entry, receiver_entry
    
    async def get_balance_between_users(self, user_id: int, other_user_id: int) -> float:
        """
        Get the net balance between two users.
        
        Returns positive if other_user owes user, negative if user owes other_user.
        """
        query = select(func.sum(LedgerEntry.amount)).where(
            LedgerEntry.user_id == user_id,
            LedgerEntry.counterparty_id == other_user_id
        )
        result = await self.db.execute(query)
        balance = result.scalar() or 0.0
        return balance

    async def reverse_expense(self, expense: Expense) -> List[LedgerEntry]:
        """
        Reverse an expense by creating offsetting ledger entries.
        """
        # Find original entries for this expense
        query = select(LedgerEntry).where(LedgerEntry.expense_id == expense.id)
        result = await self.db.execute(query)
        original_entries = result.scalars().all()
        
        reversal_entries = []
        for entry in original_entries:
            reversal = LedgerEntry(
                user_id=entry.user_id,
                counterparty_id=entry.counterparty_id,
                amount=-entry.amount, # Invert amount
                expense_id=expense.id,
                description=f"Reversal: {entry.description}",
                timestamp=datetime.utcnow()
            )
            reversal_entries.append(reversal)
            
        self.db.add_all(reversal_entries)
        await self.db.flush()
        return reversal_entries

    async def reverse_settlement(self, transaction_id: int) -> bool:
        """
        Reverse a settlement (Transaction) by creating offsetting ledger entries.
        """
        # Find original entries for this transaction
        query = select(LedgerEntry).where(LedgerEntry.transaction_id == transaction_id)
        result = await self.db.execute(query)
        original_entries = result.scalars().all()
        
        if not original_entries:
            return False
            
        reversal_entries = []
        for entry in original_entries:
            reversal = LedgerEntry(
                user_id=entry.user_id,
                counterparty_id=entry.counterparty_id,
                amount=-entry.amount, # Invert amount
                transaction_id=transaction_id,
                description=f"Reversal: {entry.description}",
                timestamp=datetime.utcnow()
            )
            reversal_entries.append(reversal)
            
        self.db.add_all(reversal_entries)
        await self.db.flush()
        return True
    
    async def get_all_balances_for_user(self, user_id: int) -> Dict[int, float]:
        """
        Get all balances for a user with their counterparties.
        
        Returns a dict of {counterparty_id: balance} where:
        - Positive balance means counterparty owes user
        - Negative balance means user owes counterparty
        """
        query = select(
            LedgerEntry.counterparty_id,
            func.sum(LedgerEntry.amount)
        ).where(
            LedgerEntry.user_id == user_id
        ).group_by(
            LedgerEntry.counterparty_id
        )
        
        result = await self.db.execute(query)
        balances = {row[0]: row[1] for row in result.all() if row[1] != 0}
        return balances
    
    async def get_total_owed_to_user(self, user_id: int) -> float:
        """Get total amount owed TO this user (positive balances only)."""
        balances = await self.get_all_balances_for_user(user_id)
        return sum(b for b in balances.values() if b > 0)
    
    async def get_total_user_owes(self, user_id: int) -> float:
        """Get total amount this user owes to others (negative balances only)."""
        balances = await self.get_all_balances_for_user(user_id)
        return abs(sum(b for b in balances.values() if b < 0))
    
    async def get_user_summary(self, user_id: int) -> Dict:
        """Get a complete financial summary for a user."""
        balances = await self.get_all_balances_for_user(user_id)
        
        owed_to_user = []
        user_owes = []
        
        for counterparty_id, balance in balances.items():
            # Get counterparty name
            query = select(User.name).where(User.id == counterparty_id)
            result = await self.db.execute(query)
            name = result.scalar() or f"User {counterparty_id}"
            
            if balance > 0:
                owed_to_user.append({"user_id": counterparty_id, "name": name, "amount": balance})
            elif balance < 0:
                user_owes.append({"user_id": counterparty_id, "name": name, "amount": abs(balance)})
        
        return {
            "user_id": user_id,
            "total_owed_to_you": sum(item["amount"] for item in owed_to_user),
            "total_you_owe": sum(item["amount"] for item in user_owes),
            "net_balance": sum(balances.values()),
            "owed_to_you": owed_to_user,
            "you_owe": user_owes
        }
    
    async def get_ledger_history(self, user_id: int, limit: int = 50) -> List[Dict]:
        """Get the ledger history for a user."""
        query = select(LedgerEntry).where(
            LedgerEntry.user_id == user_id
        ).order_by(
            LedgerEntry.timestamp.desc()
        ).limit(limit)
        
        result = await self.db.execute(query)
        entries = result.scalars().all()
        
        history = []
        for entry in entries:
            # Get counterparty name
            query = select(User.name).where(User.id == entry.counterparty_id)
            result = await self.db.execute(query)
            counterparty_name = result.scalar() or f"User {entry.counterparty_id}"
            
            history.append({
                "id": entry.id,
                "counterparty_id": entry.counterparty_id,
                "counterparty_name": counterparty_name,
                "amount": entry.amount,
                "description": entry.description,
                "timestamp": entry.timestamp.isoformat()
            })
        
        return history
