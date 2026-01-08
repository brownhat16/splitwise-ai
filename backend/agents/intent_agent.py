"""Intent Parsing Agent - Converts natural language to structured commands."""

import json
from typing import Dict, Any, List, Optional
from .agent_config import BaseAgent, AgentConfig, parse_json_response


class IntentAgent(BaseAgent):
    """
    Agent responsible for parsing user intent from natural language.
    
    Extracts:
    - Intent type (add_expense, check_balance, settle, query, etc.)
    - Amount
    - Participants
    - Split type
    - Currency
    - Date/time
    - Description
    """
    
    def __init__(self, config: AgentConfig = None, known_users: List[Dict] = None):
        super().__init__(config)
        self.known_users = known_users or []
        self.system_prompt = self._build_system_prompt()
    
    def _build_system_prompt(self) -> str:
        users_context = ""
        if self.known_users:
            users_list = ", ".join([u.get("name", "") for u in self.known_users])
            users_context = f"\n\nKnown users in the system: {users_list}"
        
        return f"""You are an intent parsing agent for an expense sharing app. Your job is to parse natural language messages about expenses and extract structured information.

IMPORTANT: Always respond with valid JSON only. No explanations, no markdown formatting.

You must identify the following intents:
1. "add_expense" - User is recording a new expense
2. "check_balance" - User wants to know balances
3. "settle" - User wants to settle/pay someone
4. "add_person" - User wants to add a new person
5. "create_group" - User wants to create a group
6. "query" - User is asking a question about expenses
7. "reminder" - User wants to set a reminder
8. "undo" - User wants to undo the last action
9. "help" - User needs help
10. "unclear" - Intent is unclear, need clarification

For each message, extract:
- intent: one of the above intents
- amount: number (if mentioned)
- currency: INR, USD, etc. (default INR if ₹ or Rs mentioned, or no currency specified)
- participants: list of names involved
- payer: who paid (if mentioned)
- split_type: "equal", "unequal", "percentage", "shares" (default "equal")
- split_details: object with split specifics for unequal/percentage/shares
- description: what the expense is for
- date: when (if mentioned, in ISO format)
- group: group name if mentioned
- clarification_needed: boolean
- clarification_question: question to ask if needed
- confidence: 0-1 score of parsing confidence
{users_context}

EXAMPLES:

Input: "Rahul owes me 500"
Output: {{"intent": "add_expense", "amount": 500, "currency": "INR", "participants": ["Rahul", "me"], "payer": "me", "split_type": "unequal", "split_details": {{"Rahul": 500}}, "description": "debt from Rahul", "clarification_needed": false, "confidence": 0.95}}

Input: "Split 1200 dinner with Amit and Sarah"
Output: {{"intent": "add_expense", "amount": 1200, "currency": "INR", "participants": ["me", "Amit", "Sarah"], "payer": "me", "split_type": "equal", "description": "dinner", "clarification_needed": false, "confidence": 0.9}}

Input: "Who owes me money?"
Output: {{"intent": "check_balance", "query_type": "owed_to_me", "clarification_needed": false, "confidence": 0.95}}

Input: "Add something for groceries"
Output: {{"intent": "add_expense", "description": "groceries", "clarification_needed": true, "clarification_question": "How much was the groceries expense and who should it be split with?", "confidence": 0.3}}

Input: "Split 5000 between A 50%, B 30%, C 20%"
Output: {{"intent": "add_expense", "amount": 5000, "currency": "INR", "participants": ["A", "B", "C"], "payer": "me", "split_type": "percentage", "split_details": {{"A": 50, "B": 30, "C": 20}}, "clarification_needed": false, "confidence": 0.95}}

Now parse the user's message:"""

    def update_known_users(self, users: List[Dict]):
        """Update the list of known users."""
        self.known_users = users
        self.system_prompt = self._build_system_prompt()
    
    async def process(self, user_input: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Parse user intent from natural language.
        
        Args:
            user_input: The user's message
            context: Optional context including chat history
            
        Returns:
            Parsed intent with extracted entities
        """
        messages = self._build_messages(user_input, context)
        
        response = await self._call_llm(messages, temperature=0.3)  # Lower temp for parsing
        
        result = parse_json_response(response)
        
        # Ensure required fields
        result.setdefault("intent", "unclear")
        result.setdefault("clarification_needed", False)
        result.setdefault("confidence", 0.5)
        
        return result
    
    async def clarify(self, original_input: str, clarification: str, 
                      previous_parse: Dict[str, Any]) -> Dict[str, Any]:
        """
        Re-parse with additional clarification from user.
        
        Args:
            original_input: The original user message
            clarification: User's response to clarification question
            previous_parse: The previous parse result
            
        Returns:
            Updated parse with clarification incorporated
        """
        combined_input = f"""Original message: "{original_input}"
Previous understanding: {json.dumps(previous_parse)}
User clarification: "{clarification}"

Please provide the updated parsing:"""
        
        return await self.process(combined_input)
