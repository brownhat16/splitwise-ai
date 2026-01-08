"""Reconciliation Agent - Provides AI-powered settlement recommendations."""

from typing import Dict, Any, List
from .agent_config import BaseAgent, AgentConfig, parse_json_response
from reconciliation import DebtReconciler, Settlement, format_settlements


class ReconciliationAgent(BaseAgent):
    """
    Agent responsible for debt reconciliation and settlement suggestions.
    
    Handles:
    - Analyzing complex debt networks
    - Suggesting optimal settlement paths
    - Explaining balance relationships
    - Providing settlement confirmations
    """
    
    def __init__(self, config: AgentConfig = None):
        super().__init__(config)
        self.system_prompt = """You are a debt reconciliation specialist for an expense sharing app. Your role is to:

1. Analyze debt networks between users
2. Suggest optimal ways to settle balances
3. Explain balance relationships clearly
4. Minimize the number of transactions needed

When providing recommendations:
- Be clear about who pays whom
- Explain the reasoning behind suggestions
- Use exact amounts with proper formatting (₹1,234.56)
- Celebrate when balances are cleared!

Always respond with JSON containing:
{
    "message": "Main message to user",
    "settlements": [{"from": "name", "to": "name", "amount": number}],
    "explanation": "Why this is optimal",
    "is_settled": true/false
}"""

    async def process(self, user_input: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Process a reconciliation-related request."""
        messages = self._build_messages(user_input, context)
        response = await self._call_llm(messages, temperature=0.4)
        return parse_json_response(response)
    
    async def get_settlement_suggestions(self, balances: Dict[int, Dict[int, float]], 
                                          user_names: Dict[int, str]) -> Dict[str, Any]:
        """
        Get AI-enhanced settlement suggestions.
        
        Args:
            balances: Dict of {user_id: {counterparty_id: amount}}
            user_names: Dict of {user_id: name}
            
        Returns:
            Settlement suggestions with natural language explanations
        """
        # Use the DebtReconciler for optimal settlements
        reconciler = DebtReconciler(balances)
        settlements = reconciler.simplify_debts()
        
        if not settlements:
            return {
                "message": "Everyone is settled up! 🎉",
                "settlements": [],
                "is_settled": True
            }
        
        # Convert to readable format
        settlement_list = []
        for s in settlements:
            settlement_list.append({
                "from_user_id": s.from_user_id,
                "from_name": user_names.get(s.from_user_id, f"User {s.from_user_id}"),
                "to_user_id": s.to_user_id,
                "to_name": user_names.get(s.to_user_id, f"User {s.to_user_id}"),
                "amount": s.amount
            })
        
        # Get AI to generate a friendly explanation
        prompt = f"""Generate a friendly settlement recommendation for these transactions:

Settlements needed:
{settlement_list}

User names: {user_names}

Respond with a clear, friendly message explaining:
1. What payments need to be made
2. After these payments, everyone will be settled

Keep it concise but complete. Use ₹ for currency."""

        messages = [
            {"role": "system", "content": "You are a friendly financial assistant. Generate clear, concise settlement recommendations."},
            {"role": "user", "content": prompt}
        ]
        
        explanation = await self._call_llm(messages, temperature=0.6)
        
        return {
            "message": explanation,
            "settlements": settlement_list,
            "is_settled": False,
            "transaction_count": len(settlements)
        }
    
    async def explain_settlement_impact(self, from_user: str, to_user: str, 
                                        amount: float, current_balance: float) -> str:
        """
        Explain what happens after a settlement.
        
        Args:
            from_user: Who is paying
            to_user: Who is receiving
            amount: Settlement amount
            current_balance: Current balance before settlement
            
        Returns:
            Natural language explanation
        """
        new_balance = current_balance - amount
        
        prompt = f"""Generate a friendly confirmation for this settlement:

{from_user} paid {to_user}: ₹{amount:,.2f}
Previous balance: ₹{current_balance:,.2f}
New balance: ₹{new_balance:,.2f}

If the new balance is 0 (or very close), celebrate that they're settled!
Otherwise, mention the remaining balance clearly."""

        messages = [
            {"role": "system", "content": "You are a friendly payment assistant. Generate brief, clear confirmations."},
            {"role": "user", "content": prompt}
        ]
        
        return await self._call_llm(messages, temperature=0.7)
    
    async def suggest_partial_settlement(self, from_user_id: int, to_user_id: int,
                                          owed_amount: float, available_amount: float,
                                          user_names: Dict[int, str]) -> Dict[str, Any]:
        """
        Handle partial settlements when user can't pay full amount.
        
        Args:
            from_user_id: Who wants to pay
            to_user_id: Who should receive
            owed_amount: Total amount owed
            available_amount: Amount user can pay now
            user_names: User ID to name mapping
            
        Returns:
            Partial settlement suggestion
        """
        from_name = user_names.get(from_user_id, f"User {from_user_id}")
        to_name = user_names.get(to_user_id, f"User {to_user_id}")
        remaining = owed_amount - available_amount
        
        prompt = f"""Generate a friendly response for a partial settlement:

{from_name} owes {to_name}: ₹{owed_amount:,.2f}
{from_name} can pay now: ₹{available_amount:,.2f}
Remaining after payment: ₹{remaining:,.2f}

Acknowledge the partial payment positively and mention the remaining balance."""

        messages = [
            {"role": "system", "content": "You are a friendly financial assistant. Be encouraging about partial payments."},
            {"role": "user", "content": prompt}
        ]
        
        message = await self._call_llm(messages, temperature=0.7)
        
        return {
            "message": message,
            "settlement_amount": available_amount,
            "remaining_balance": remaining,
            "is_partial": True
        }
