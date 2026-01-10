"""Expense splitting logic supporting multiple split types."""

from typing import List, Dict, Optional
from dataclasses import dataclass
from enum import Enum


class SplitType(Enum):
    """Type of expense split."""
    EQUAL = "equal"
    UNEQUAL = "unequal"
    PERCENTAGE = "percentage"
    SHARES = "shares"


@dataclass
class SplitResult:
    """Result of a split calculation for one participant."""
    user_id: int
    amount: float
    percentage: Optional[float] = None
    shares: Optional[int] = None


class ExpenseSplitter:
    """Handles all expense splitting calculations."""
    
    @staticmethod
    def split_equal(total_amount: float, participant_ids: List[int]) -> List[SplitResult]:
        """
        Split an expense equally among all participants.
        
        Args:
            total_amount: Total expense amount
            participant_ids: List of user IDs to split among
            
        Returns:
            List of SplitResult for each participant
        """
        if not participant_ids:
            raise ValueError("At least one participant is required")
        
        num_participants = len(participant_ids)
        base_amount = total_amount / num_participants
        
        # Handle rounding - distribute remaining cents to first participants
        base_amount_rounded = round(base_amount, 2)
        remainder = round(total_amount - (base_amount_rounded * num_participants), 2)
        
        results = []
        for i, user_id in enumerate(participant_ids):
            amount = base_amount_rounded
            # Add extra cent to first participants if there's remainder
            if i < int(remainder * 100):
                amount += 0.01
            amount = round(amount, 2)
            
            results.append(SplitResult(
                user_id=user_id,
                amount=amount,
                percentage=round(100 / num_participants, 2)
            ))
        
        return results
    
    @staticmethod
    def split_unequal(total_amount: float, amounts: Dict[int, float]) -> List[SplitResult]:
        """
        Split an expense with exact amounts for each participant.
        
        Args:
            total_amount: Total expense amount (for validation)
            amounts: Dict of {user_id: amount} for each participant
            
        Returns:
            List of SplitResult for each participant
        """
        if not amounts:
            raise ValueError("At least one participant amount is required")
        
        sum_amounts = sum(amounts.values())
        if abs(sum_amounts - total_amount) > 0.01:
            raise ValueError(f"Split amounts ({sum_amounts}) don't match total ({total_amount})")
        
        return [
            SplitResult(
                user_id=user_id,
                amount=round(amount, 2),
                percentage=round((amount / total_amount) * 100, 2) if total_amount > 0 else 0
            )
            for user_id, amount in amounts.items()
        ]
    
    @staticmethod
    def split_percentage(total_amount: float, percentages: Dict[int, float], 
                        participants: List[int] = None) -> List[SplitResult]:
        """
        Split an expense by percentages.
        
        Args:
            total_amount: Total expense amount
            percentages: Dict of {user_id: percentage} for each participant
            participants: Optional list of all user IDs involved. If provided and 
                         percentages sum < 100, remainder is split equally among
                         participants not in the percentages dict.
            
        Returns:
            List of SplitResult for each participant
        """
        if not percentages:
            raise ValueError("At least one participant percentage is required")
        
        total_percentage = sum(percentages.values())
        
        # Handle < 100% if participants provided (hybrid split)
        remaining_users = []
        if participants and total_percentage < 99.99:
            remaining_users = [uid for uid in participants if uid not in percentages]
            if remaining_users:
                remainder = 100 - total_percentage
                share = remainder / len(remaining_users)
                for uid in remaining_users:
                    percentages[uid] = share
                total_percentage = 100.0

        if abs(total_percentage - 100) > 0.01:
            raise ValueError(f"Total percentage ({total_percentage}) must be 100")
        
        results = []
        running_total = 0
        items = list(percentages.items())
        
        for i, (user_id, percentage) in enumerate(items):
            if i == len(items) - 1:
                # Last person gets remainder of amount to avoid rounding issues
                amount = round(total_amount - running_total, 2)
            else:
                amount = round(total_amount * (percentage / 100), 2)
                running_total += amount
            
            results.append(SplitResult(
                user_id=user_id,
                amount=amount,
                percentage=round(percentage, 2)
            ))
        
        return results
    
    @staticmethod
    def split_shares(total_amount: float, shares: Dict[int, int]) -> List[SplitResult]:
        """
        Split an expense by shares (e.g., 2 shares vs 1 share).
        
        Args:
            total_amount: Total expense amount
            shares: Dict of {user_id: num_shares} for each participant
            
        Returns:
            List of SplitResult for each participant
        """
        if not shares:
            raise ValueError("At least one participant share is required")
        
        total_shares = sum(shares.values())
        if total_shares == 0:
            raise ValueError("Total shares must be greater than 0")
        
        share_value = total_amount / total_shares
        
        results = []
        running_total = 0
        items = list(shares.items())
        
        for i, (user_id, num_shares) in enumerate(items):
            if i == len(items) - 1:
                # Last person gets remainder
                amount = round(total_amount - running_total, 2)
            else:
                amount = round(share_value * num_shares, 2)
                running_total += amount
            
            results.append(SplitResult(
                user_id=user_id,
                amount=amount,
                shares=num_shares,
                percentage=round((num_shares / total_shares) * 100, 2)
            ))
        
        return results
    
    @classmethod
    def calculate_split(cls, total_amount: float, split_type: SplitType, 
                        participants: List[int] = None,
                        amounts: Dict[int, float] = None,
                        percentages: Dict[int, float] = None,
                        shares: Dict[int, int] = None) -> List[SplitResult]:
        """
        Calculate split based on the split type.
        
        This is the main entry point for split calculations.
        """
        if split_type == SplitType.EQUAL:
            if not participants:
                raise ValueError("participants required for equal split")
            return cls.split_equal(total_amount, participants)
        
        elif split_type == SplitType.UNEQUAL:
            if not amounts:
                raise ValueError("amounts required for unequal split")
            return cls.split_unequal(total_amount, amounts)
        
        elif split_type == SplitType.PERCENTAGE:
            if not percentages:
                raise ValueError("percentages required for percentage split")
            return cls.split_percentage(total_amount, percentages)
        
        elif split_type == SplitType.SHARES:
            if not shares:
                raise ValueError("shares required for shares split")
            return cls.split_shares(total_amount, shares)
        
        else:
            raise ValueError(f"Unknown split type: {split_type}")


def format_split_summary(payer_name: str, total_amount: float, currency: str,
                         splits: List[SplitResult], user_names: Dict[int, str]) -> str:
    """
    Generate a human-readable summary of a split.
    
    Args:
        payer_name: Name of the person who paid
        total_amount: Total expense amount
        currency: Currency symbol/code
        splits: List of SplitResult objects
        user_names: Dict of {user_id: name} for all participants
        
    Returns:
        Human-readable summary string
    """
    lines = [f"{payer_name} paid {currency}{total_amount:,.2f}"]
    
    for split in splits:
        name = user_names.get(split.user_id, f"User {split.user_id}")
        if split.percentage:
            lines.append(f"  • {name}: {currency}{split.amount:,.2f} ({split.percentage}%)")
        elif split.shares:
            lines.append(f"  • {name}: {currency}{split.amount:,.2f} ({split.shares} shares)")
        else:
            lines.append(f"  • {name}: {currency}{split.amount:,.2f}")
    
    return "\n".join(lines)
