"""Notification Agent - Smart reminders and contextual notifications."""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from .agent_config import BaseAgent, AgentConfig, parse_json_response


class NotificationAgent(BaseAgent):
    """
    Agent responsible for smart notifications and reminders.
    
    Handles:
    - Payment reminders with behavioral context
    - Expense summaries and reports
    - Non-spammy, contextual notifications
    - Smart timing based on user patterns
    """
    
    def __init__(self, config: AgentConfig = None):
        super().__init__(config)
        self.system_prompt = """You are a smart notification assistant for an expense sharing app. Your role is to:

1. Generate friendly, non-spammy payment reminders
2. Create engaging expense summaries
3. Suggest optimal reminder timing
4. Personalize messages based on user behavior

Guidelines:
- Be friendly but not pushy
- Use appropriate urgency levels
- Keep messages concise
- Celebrate positive behaviors
- Be sensitive about money topics

Always respond with JSON containing:
{
    "message": "The notification message",
    "urgency": "low/medium/high",
    "suggested_time": "ISO datetime or null",
    "should_send": true/false
}"""

    async def process(self, user_input: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Process a notification-related request."""
        messages = self._build_messages(user_input, context)
        response = await self._call_llm(messages, temperature=0.6)
        return parse_json_response(response)
    
    async def generate_payment_reminder(self, debtor_name: str, creditor_name: str,
                                         amount: float, days_outstanding: int,
                                         payment_history: List[Dict] = None) -> Dict[str, Any]:
        """
        Generate a smart payment reminder.
        
        Args:
            debtor_name: Who owes money
            creditor_name: Who is owed money
            amount: Amount owed
            days_outstanding: Days since expense was added
            payment_history: Previous payment patterns
            
        Returns:
            Reminder message with metadata
        """
        history_context = ""
        if payment_history:
            avg_days = sum(h.get('days_to_pay', 7) for h in payment_history) / len(payment_history)
            history_context = f"Historical average: pays in {avg_days:.0f} days."
        
        prompt = f"""Generate a friendly payment reminder:

{debtor_name} owes {creditor_name}: ₹{amount:,.2f}
Days since expense: {days_outstanding}
{history_context}

Create a reminder that is:
- Friendly and non-confrontational
- Appropriately urgent based on the amount and time
- Brief but clear

Return JSON with:
{{
    "message": "the reminder text",
    "urgency": "low/medium/high",
    "tone": "friendly/gentle/firm"
}}"""

        messages = [
            {"role": "system", "content": "You are a tactful payment reminder assistant. Generate friendly, effective reminders."},
            {"role": "user", "content": prompt}
        ]
        
        response = await self._call_llm(messages, temperature=0.6)
        result = parse_json_response(response)
        
        # Add metadata
        result["amount"] = amount
        result["days_outstanding"] = days_outstanding
        result["should_send"] = True
        
        return result
    
    async def generate_weekly_summary(self, user_name: str, 
                                       expenses: List[Dict],
                                       balance_summary: Dict) -> str:
        """
        Generate a weekly expense summary.
        
        Args:
            user_name: User's name
            expenses: List of expenses from the week
            balance_summary: Current balance information
            
        Returns:
            Friendly weekly summary
        """
        total_spent = sum(e.get('amount', 0) for e in expenses if e.get('payer_name') == user_name)
        total_owed = balance_summary.get('total_you_owe', 0)
        total_owing = balance_summary.get('total_owed_to_you', 0)
        
        prompt = f"""Generate a friendly weekly expense summary for {user_name}:

This week's stats:
- Number of expenses: {len(expenses)}
- Total spent: ₹{total_spent:,.2f}
- Currently owed to others: ₹{total_owed:,.2f}
- Currently owed by others: ₹{total_owing:,.2f}

Make it:
- Concise but informative
- Slightly fun/engaging
- Include a tip or observation if relevant
- End with an encouraging note"""

        messages = [
            {"role": "system", "content": "You are a friendly financial summary assistant. Create engaging weekly summaries."},
            {"role": "user", "content": prompt}
        ]
        
        return await self._call_llm(messages, temperature=0.7)
    
    async def should_send_reminder(self, debtor_history: Dict,
                                    amount: float,
                                    days_outstanding: int) -> Dict[str, Any]:
        """
        Determine if a reminder should be sent.
        
        Args:
            debtor_history: Payment history and patterns
            amount: Amount owed
            days_outstanding: Days since expense
            
        Returns:
            Decision with reasoning
        """
        avg_pay_days = debtor_history.get('avg_days_to_pay', 7)
        last_reminder = debtor_history.get('last_reminder_days_ago', 999)
        reliability_score = debtor_history.get('reliability_score', 0.8)
        
        prompt = f"""Decide if we should send a payment reminder:

Amount owed: ₹{amount:,.2f}
Days outstanding: {days_outstanding}
User's average payment time: {avg_pay_days} days
Days since last reminder: {last_reminder}
User reliability score: {reliability_score:.1%}

Return JSON with:
{{
    "should_send": true/false,
    "reasoning": "brief explanation",
    "wait_days": number (if should not send, how many days to wait)
}}"""

        messages = [
            {"role": "system", "content": "You are a smart notification timing optimizer. Make thoughtful decisions about when to send reminders."},
            {"role": "user", "content": prompt}
        ]
        
        response = await self._call_llm(messages, temperature=0.3)
        return parse_json_response(response)
    
    async def generate_settlement_celebration(self, user1_name: str, 
                                               user2_name: str) -> str:
        """
        Generate a celebration message when two users settle up.
        
        Args:
            user1_name: First user
            user2_name: Second user
            
        Returns:
            Celebration message
        """
        prompt = f"""Generate a brief, fun celebration message:

{user1_name} and {user2_name} are now completely settled up!

Make it:
- Short (1-2 sentences)
- Celebratory with an emoji
- Friendly and warm"""

        messages = [
            {"role": "system", "content": "You are a celebration message generator. Create short, joyful messages."},
            {"role": "user", "content": prompt}
        ]
        
        return await self._call_llm(messages, temperature=0.8)
    
    async def generate_group_activity_summary(self, group_name: str,
                                               member_count: int,
                                               recent_expenses: List[Dict],
                                               total_volume: float) -> str:
        """
        Generate a group activity summary.
        
        Args:
            group_name: Name of the group
            member_count: Number of members
            recent_expenses: Recent group expenses
            total_volume: Total money moved in the period
            
        Returns:
            Group activity summary
        """
        prompt = f"""Generate a group activity summary:

Group: {group_name}
Members: {member_count}
Recent expenses: {len(recent_expenses)}
Total volume: ₹{total_volume:,.2f}

Expense types: {[e.get('description', 'expense') for e in recent_expenses[:5]]}

Make it informative and engaging. Include a fun observation about the group's spending patterns."""

        messages = [
            {"role": "system", "content": "You are a group expense analyst. Create engaging group summaries."},
            {"role": "user", "content": prompt}
        ]
        
        return await self._call_llm(messages, temperature=0.7)
