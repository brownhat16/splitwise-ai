"""Ledger Management Agent - Handles all financial operations."""

from typing import Dict, Any, List
from .agent_config import BaseAgent, AgentConfig, parse_json_response


class LedgerAgent(BaseAgent):
    """
    Agent responsible for ledger operations and financial explanations.
    
    Handles:
    - Adding expenses to the ledger
    - Processing settlements
    - Generating balance explanations
    - Creating expense summaries
    """
    
    def __init__(self, config: AgentConfig = None):
        super().__init__(config)
        self.system_prompt = """You are a financial ledger assistant for an expense sharing app. Your job is to:

1. Explain financial transactions in clear, friendly language
2. Generate human-readable summaries of expenses and balances
3. Provide clear breakdowns of how amounts were calculated
4. Suggest appropriate responses for financial operations

Always be:
- Clear and concise
- Friendly but professional
- Precise with numbers (use proper formatting like ₹1,234.56)
- Helpful in explaining calculations

Response format: Always respond with JSON containing:
{
    "message": "The main response message to show the user",
    "details": "Optional detailed breakdown",
    "success": true/false,
    "action_taken": "Description of what was done"
}"""

    async def process(self, user_input: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Process a ledger-related request."""
        messages = self._build_messages(user_input, context)
        response = await self._call_llm(messages, temperature=0.5)
        return parse_json_response(response)
    
    async def explain_expense(self, expense_data: Dict[str, Any]) -> str:
        """
        Generate a human-readable explanation of an expense.
        
        Args:
            expense_data: Dict containing expense details
                - description: What the expense was for
                - amount: Total amount
                - currency: Currency code
                - payer: Who paid
                - splits: List of {name, amount} dicts
                
        Returns:
            Human-readable explanation
        """
        prompt = f"""Generate a friendly, clear confirmation message for this expense:

Expense: {expense_data.get('description', 'expense')}
Amount: {expense_data.get('currency', '₹')}{expense_data.get('amount', 0):,.2f}
Paid by: {expense_data.get('payer', 'You')}
Split between: {expense_data.get('participants', [])}
Split details: {expense_data.get('splits', [])}

Respond with just the message, no JSON. Be concise but complete. Use ₹ for INR currency."""

        messages = [
            {"role": "system", "content": "You are a friendly expense tracking assistant. Respond with just a clear, concise message."},
            {"role": "user", "content": prompt}
        ]
        
        return await self._call_llm(messages, temperature=0.7)
    
    async def explain_balance(self, balance_data: Dict[str, Any]) -> str:
        """
        Generate a human-readable balance summary.
        
        Args:
            balance_data: Dict containing balance information
                - total_owed_to_you: Amount others owe you
                - total_you_owe: Amount you owe others
                - owed_to_you: List of {name, amount} for people who owe you
                - you_owe: List of {name, amount} for people you owe
                
        Returns:
            Human-readable balance summary
        """
        prompt = f"""Generate a friendly balance summary for this user:

Total owed to you: ₹{balance_data.get('total_owed_to_you', 0):,.2f}
Total you owe: ₹{balance_data.get('total_you_owe', 0):,.2f}
Net balance: ₹{balance_data.get('net_balance', 0):,.2f}

People who owe you:
{self._format_balance_list(balance_data.get('owed_to_you', []))}

People you owe:
{self._format_balance_list(balance_data.get('you_owe', []))}

Respond with just the message. Be friendly and clear. If there are no balances, say they're all settled up."""

        messages = [
            {"role": "system", "content": "You are a friendly financial assistant. Respond with just a clear, organized balance summary."},
            {"role": "user", "content": prompt}
        ]
        
        return await self._call_llm(messages, temperature=0.7)
    
    async def explain_settlement(self, settlement_data: Dict[str, Any]) -> str:
        """
        Generate a human-readable settlement confirmation.
        
        Args:
            settlement_data: Dict containing settlement details
                - from_user: Who paid
                - to_user: Who received
                - amount: Amount settled
                - new_balance: New balance between them
                
        Returns:
            Human-readable confirmation
        """
        prompt = f"""Generate a friendly settlement confirmation:

{settlement_data.get('from_user', 'You')} paid {settlement_data.get('to_user', 'them')}: ₹{settlement_data.get('amount', 0):,.2f}
New balance: ₹{settlement_data.get('new_balance', 0):,.2f}

Respond with just a brief, friendly confirmation message. If they're now settled up, celebrate it!"""

        messages = [
            {"role": "system", "content": "You are a friendly payment assistant. Respond with just a clear confirmation."},
            {"role": "user", "content": prompt}
        ]
        
        return await self._call_llm(messages, temperature=0.7)
    
    def _format_balance_list(self, items: List[Dict]) -> str:
        """Format a list of balance items."""
        if not items:
            return "  (none)"
        return "\n".join([f"  - {item.get('name', '?')}: ₹{item.get('amount', 0):,.2f}" for item in items])
    
    async def generate_monthly_summary(self, expenses: List[Dict], user_name: str) -> str:
        """
        Generate a monthly spending summary.
        
        Args:
            expenses: List of expense dicts for the month
            user_name: Name of the user
            
        Returns:
            Human-readable monthly summary
        """
        total = sum(e.get('amount', 0) for e in expenses)
        categories = {}
        for e in expenses:
            cat = e.get('description', 'other').lower()
            for keyword in ['food', 'dinner', 'lunch', 'groceries']:
                if keyword in cat:
                    cat = 'Food'
                    break
            else:
                for keyword in ['rent', 'utilities', 'bills']:
                    if keyword in cat:
                        cat = 'Bills'
                        break
                else:
                    cat = 'Other'
            categories[cat] = categories.get(cat, 0) + e.get('amount', 0)
        
        category_str = "\n".join([f"  - {k}: ₹{v:,.2f}" for k, v in sorted(categories.items(), key=lambda x: -x[1])])
        
        prompt = f"""Generate a friendly monthly spending summary for {user_name}:

Total spent: ₹{total:,.2f}
Number of expenses: {len(expenses)}
By category:
{category_str}

Make it insightful and friendly. Include a fun observation or tip if appropriate."""

        messages = [
            {"role": "system", "content": "You are a friendly financial assistant. Create an engaging monthly summary."},
            {"role": "user", "content": prompt}
        ]
        
        return await self._call_llm(messages, temperature=0.8)
