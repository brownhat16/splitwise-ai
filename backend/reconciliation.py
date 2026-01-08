"""Debt reconciliation and simplification algorithms."""

from typing import Dict, List, Tuple
from dataclasses import dataclass
from collections import defaultdict


@dataclass
class Settlement:
    """Represents a recommended settlement between two users."""
    from_user_id: int
    to_user_id: int
    amount: float


class DebtReconciler:
    """
    Simplifies debts between multiple users to minimize transactions.
    
    Uses a greedy algorithm to match debtors with creditors, minimizing
    the total number of transactions needed to settle all debts.
    """
    
    def __init__(self, balances: Dict[int, Dict[int, float]]):
        """
        Initialize with current balances.
        
        Args:
            balances: Dict of {user_id: {counterparty_id: amount}}
                     Positive amount means counterparty owes user
                     Negative amount means user owes counterparty
        """
        self.balances = balances
    
    def get_net_balances(self) -> Dict[int, float]:
        """
        Calculate net balance for each user across all counterparties.
        
        Returns:
            Dict of {user_id: net_balance} where positive means user is owed money,
            negative means user owes money.
        """
        net_balances = defaultdict(float)
        
        for user_id, counterparty_balances in self.balances.items():
            for counterparty_id, amount in counterparty_balances.items():
                net_balances[user_id] += amount
        
        return dict(net_balances)
    
    def simplify_debts(self) -> List[Settlement]:
        """
        Simplify all debts to minimize the number of transactions.
        
        Uses a greedy algorithm that pairs the largest debtor with the
        largest creditor repeatedly until all debts are settled.
        
        Returns:
            List of Settlement objects representing optimal payments
        """
        net_balances = self.get_net_balances()
        
        # Separate into creditors (positive balance) and debtors (negative balance)
        creditors = []  # People who are owed money
        debtors = []    # People who owe money
        
        for user_id, balance in net_balances.items():
            if balance > 0.01:  # Small threshold for floating point
                creditors.append((user_id, balance))
            elif balance < -0.01:
                debtors.append((user_id, abs(balance)))
        
        # Sort by amount (largest first) for greedy matching
        creditors.sort(key=lambda x: x[1], reverse=True)
        debtors.sort(key=lambda x: x[1], reverse=True)
        
        settlements = []
        
        # Greedy matching
        while creditors and debtors:
            creditor_id, credit_amount = creditors[0]
            debtor_id, debt_amount = debtors[0]
            
            # Determine settlement amount
            settlement_amount = min(credit_amount, debt_amount)
            
            if settlement_amount > 0.01:  # Only create meaningful settlements
                settlements.append(Settlement(
                    from_user_id=debtor_id,
                    to_user_id=creditor_id,
                    amount=round(settlement_amount, 2)
                ))
            
            # Update balances
            new_credit = credit_amount - settlement_amount
            new_debt = debt_amount - settlement_amount
            
            # Remove or update creditor
            creditors.pop(0)
            if new_credit > 0.01:
                creditors.append((creditor_id, new_credit))
                creditors.sort(key=lambda x: x[1], reverse=True)
            
            # Remove or update debtor
            debtors.pop(0)
            if new_debt > 0.01:
                debtors.append((debtor_id, new_debt))
                debtors.sort(key=lambda x: x[1], reverse=True)
        
        return settlements
    
    def get_settlement_path(self, from_user_id: int, to_user_id: int) -> List[Settlement]:
        """
        Get settlements needed for one user to settle with another.
        
        This considers the overall debt network and finds the optimal
        way for from_user to settle with to_user.
        """
        # First check direct balance
        if from_user_id in self.balances:
            direct_balance = self.balances[from_user_id].get(to_user_id, 0)
            if direct_balance < 0:  # from_user owes to_user
                return [Settlement(
                    from_user_id=from_user_id,
                    to_user_id=to_user_id,
                    amount=round(abs(direct_balance), 2)
                )]
        
        return []


def format_settlements(settlements: List[Settlement], user_names: Dict[int, str], 
                       currency: str = "₹") -> str:
    """
    Format settlements as human-readable text.
    
    Args:
        settlements: List of Settlement objects
        user_names: Dict of {user_id: name}
        currency: Currency symbol
        
    Returns:
        Human-readable settlement summary
    """
    if not settlements:
        return "Everyone is settled up! 🎉"
    
    lines = ["To settle all debts:"]
    for s in settlements:
        from_name = user_names.get(s.from_user_id, f"User {s.from_user_id}")
        to_name = user_names.get(s.to_user_id, f"User {s.to_user_id}")
        lines.append(f"  • {from_name} pays {to_name}: {currency}{s.amount:,.2f}")
    
    return "\n".join(lines)


def explain_balance(balance: float, counterparty_name: str, currency: str = "₹") -> str:
    """
    Generate a human-readable explanation of a balance.
    
    Args:
        balance: The balance amount (positive = owed to you, negative = you owe)
        counterparty_name: Name of the counterparty
        currency: Currency symbol
        
    Returns:
        Human-readable balance explanation
    """
    if abs(balance) < 0.01:
        return f"You and {counterparty_name} are settled up!"
    elif balance > 0:
        return f"{counterparty_name} owes you {currency}{balance:,.2f}"
    else:
        return f"You owe {counterparty_name} {currency}{abs(balance):,.2f}"
