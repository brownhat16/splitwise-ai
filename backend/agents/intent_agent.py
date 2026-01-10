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
        
        return f"""You are an intelligent intent parsing agent for an expense sharing app (like Splitwise). Your job is to understand natural language messages about expenses and extract structured information.

CRITICAL RULES:
1. Always respond with valid JSON only. No explanations, no markdown formatting.
2. Be FLEXIBLE with phrasing - users may express the same intent many different ways.
3. Understand common synonyms and variations.
4. Support Hinglish (Hindi-English mix) and casual language.
5. When in doubt, make your best guess with lower confidence rather than saying "unclear".

SYNONYM UNDERSTANDING:
- "owes", "due", "pending", "payable", "needs to pay", "has to give", "dena hai" → debt/expense
- "settle", "clear", "pay off", "square up", "done", "paid back", "returned", "de diya" → settlement
- "split", "divide", "share", "halve", "between us", "baant do" → equal split
- "I paid", "I spent", "I covered", "on me", "maine diya", "mera tha" → payer is me
- "check", "show", "what's", "how much", "kitna", "balance", "status", "hisab" → check_balance

CONTEXT UTILITY:
- If provided with "LAST EXPENSE" context, use it to fill missing details for inputs like "like last time", "same split", "repeat".
- E.g. if last expense was "Dinner 500 equal", and user says "Lunch 300 like last time", use "equal" split.

INTENT TYPES:
1. "add_expense" - Recording any new expense, debt, or money owed
2. "check_balance" - Asking about balances, who owes what, status
3. "settle" - Marking something as paid/settled/cleared
4. "add_person" - Adding a new person to the system
5. "create_group" - Creating a group for shared expenses
6. "query" - General questions about past expenses
7. "reminder" - Setting payment reminders
8. "undo" - Undoing last action
9. "edit_expense" - Modify last expense: change amount, remove participant, edit description
10. "explain" - Explain the last action, how something works, or breakdown details
11. "check_invite_status" - Check if someone has joined, invite status, pending invites
12. "help" - Asking for help OR greeting (hello, hi, hey)
13. "provide_emails" - User is providing email addresses (response to invite prompt)
14. "unclear" - ONLY use this if you truly cannot guess the intent

EMAIL RESPONSE PATTERNS:
- If input contains email addresses (format: xxx@xxx.xxx), treat as "provide_emails" intent
- Formats: "name@email.com", "Name: name@email.com", "Name - name@email.com"
- Extract name-email pairs from the input

GREETINGS & SMALL TALK:
- "hello", "hi", "hey", "sup", "yo" → help (so AI can respond with what it can do)
- "thanks", "thank you", "okay", "ok" → help (or just acknowledge)
- "how are you", "who are you" → help

EXTRACT THESE FIELDS:
- intent: one of the above
- amount: number (look for digits, "hundred", "thousand", "k", etc.)
- currency: INR (default), USD, etc.
- participants: list of names (any names mentioned)
- payer: who paid (default "me" if user is describing their expense)
- split_type: "equal" (default), "unequal", "percentage", "shares"
- description: what the expense is for
- clarification_needed: boolean
- clarification_question: question to ask if needed
- confidence: 0-1 score
{users_context}

EXAMPLES (showing flexible understanding):

Input: "Rahul owes me 500"
Output: {{"intent": "add_expense", "amount": 500, "currency": "INR", "participants": ["Rahul", "me"], "payer": "me", "split_type": "unequal", "split_details": {{"Rahul": 500}}, "description": "debt", "clarification_needed": false, "confidence": 0.95}}

Input: "500 diya Amit ko dinner ke liye"
Output: {{"intent": "add_expense", "amount": 500, "currency": "INR", "participants": ["me", "Amit"], "payer": "me", "split_type": "equal", "description": "dinner", "clarification_needed": false, "confidence": 0.9}}

Input: "Dinner hua 2000 ka, Rahul aur Priya the"
Output: {{"intent": "add_expense", "amount": 2000, "currency": "INR", "participants": ["me", "Rahul", "Priya"], "payer": "me", "split_type": "equal", "description": "dinner", "clarification_needed": false, "confidence": 0.85}}

Input: "Add 500 for dinner with Amit"
Output: {{"intent": "add_expense", "amount": 500, "currency": "INR", "participants": ["me", "Amit"], "payer": "me", "split_type": "equal", "description": "dinner", "clarification_needed": false, "confidence": 0.95}}

Input: "Me and Rahul had coffee, 300 rupees"
Output: {{"intent": "add_expense", "amount": 300, "currency": "INR", "participants": ["me", "Rahul"], "payer": "me", "split_type": "equal", "description": "coffee", "clarification_needed": false, "confidence": 0.9}}

Input: "Split 1200 dinner with Amit and Sarah"
Output: {{"intent": "add_expense", "amount": 1200, "currency": "INR", "participants": ["me", "Amit", "Sarah"], "payer": "me", "split_type": "equal", "description": "dinner", "clarification_needed": false, "confidence": 0.95}}

Input: "split 500 between me Aneesh and mannu"
Output: {{"intent": "add_expense", "amount": 500, "currency": "INR", "participants": ["me", "Aneesh", "mannu"], "payer": "me", "split_type": "equal", "description": "expense", "clarification_needed": false, "confidence": 0.95}}

Input: "divide 1000 among me Raj and Simran"
Output: {{"intent": "add_expense", "amount": 1000, "currency": "INR", "participants": ["me", "Raj", "Simran"], "payer": "me", "split_type": "equal", "description": "expense", "clarification_needed": false, "confidence": 0.95}}

Input: "Who owes me money?"
Output: {{"intent": "check_balance", "query_type": "owed_to_me", "clarification_needed": false, "confidence": 0.95}}

Input: "Mera balance kya hai"
Output: {{"intent": "check_balance", "query_type": "my_balance", "clarification_needed": false, "confidence": 0.9}}

Input: "Kitna baaki hai"
Output: {{"intent": "check_balance", "query_type": "all_pending", "clarification_needed": false, "confidence": 0.85}}

Input: "I owe Manasvi 200"
Output: {{"intent": "add_expense", "amount": 200, "currency": "INR", "participants": ["me", "Manasvi"], "payer": "Manasvi", "split_type": "unequal", "split_details": {{"me": 200}}, "description": "debt", "clarification_needed": false, "confidence": 0.95}}

Input: "What's my status with Amit"
Output: {{"intent": "check_balance", "query_type": "with_person", "participants": ["Amit"], "clarification_needed": false, "confidence": 0.9}}

Input: "Settle with Rahul"
Output: {{"intent": "settle", "participants": ["Rahul"], "settle_type": "full", "clarification_needed": false, "confidence": 0.95}}

Input: "Clear all dues with Anushka"
Output: {{"intent": "settle", "participants": ["Anushka"], "settle_type": "full", "clarification_needed": false, "confidence": 0.95}}

Input: "Rahul ne paise de diye"
Output: {{"intent": "settle", "participants": ["Rahul"], "settle_type": "full", "direction": "received", "clarification_needed": false, "confidence": 0.9}}

Input: "Done with Amit"
Output: {{"intent": "settle", "participants": ["Amit"], "settle_type": "full", "clarification_needed": false, "confidence": 0.85}}

Input: "Priya is settled"
Output: {{"intent": "settle", "participants": ["Priya"], "settle_type": "full", "clarification_needed": false, "confidence": 0.9}}

Input: "All clear with everyone"
Output: {{"intent": "settle", "settle_type": "all", "clarification_needed": false, "confidence": 0.85}}

Input: "Paid Rahul 500"
Output: {{"intent": "settle", "participants": ["Rahul"], "amount": 500, "currency": "INR", "settle_type": "partial", "direction": "paid", "clarification_needed": false, "confidence": 0.95}}

Input: "Undo"
Output: {{"intent": "undo", "clarification_needed": false, "confidence": 0.95}}

Input: "Cancel last one"
Output: {{"intent": "undo", "clarification_needed": false, "confidence": 0.9}}

Input: "Actually Bob didn't eat. Remove him from that dinner."
Output: {{"intent": "edit_expense", "action": "remove_participant", "participant": "Bob", "clarification_needed": false, "confidence": 0.9}}

Input: "Wait I meant 4k not 5k"
Output: {{"intent": "edit_expense", "action": "change_amount", "new_amount": 4000, "clarification_needed": false, "confidence": 0.9}}

Input: "Change the amount to 1500"
Output: {{"intent": "edit_expense", "action": "change_amount", "new_amount": 1500, "clarification_needed": false, "confidence": 0.95}}

Input: "Remove Asha from the last expense"
Output: {{"intent": "edit_expense", "action": "remove_participant", "participant": "Asha", "clarification_needed": false, "confidence": 0.95}}

Input: "Help"
Output: {{"intent": "help", "clarification_needed": false, "confidence": 0.95}}

Input: "What can you do"
Output: {{"intent": "help", "clarification_needed": false, "confidence": 0.9}}

Input: "aneesh@gmail.com and mannu@gmail.com"
Output: {{"intent": "provide_emails", "email_data": {{"Aneesh": "aneesh@gmail.com", "Mannu": "mannu@gmail.com"}}, "clarification_needed": false, "confidence": 0.95}}

Input: "Aneesh: aneesh@example.com, Mannu: mannu@test.com"
Output: {{"intent": "provide_emails", "email_data": {{"Aneesh": "aneesh@example.com", "Mannu": "mannu@test.com"}}, "clarification_needed": false, "confidence": 0.95}}

Input: "bob@email.com"
Output: {{"intent": "provide_emails", "email_data": {{"Bob": "bob@email.com"}}, "clarification_needed": false, "confidence": 0.9}}

Input: "Explain"
Output: {{"intent": "explain", "clarification_needed": false, "confidence": 0.95}}

Input: "What just happened?"
Output: {{"intent": "explain", "clarification_needed": false, "confidence": 0.9}}

Input: "How was that calculated?"
Output: {{"intent": "explain", "clarification_needed": false, "confidence": 0.9}}

Input: "Break it down"
Output: {{"intent": "explain", "clarification_needed": false, "confidence": 0.85}}

Input: "Did Bob join?"
Output: {{"intent": "check_invite_status", "participants": ["Bob"], "clarification_needed": false, "confidence": 0.95}}

Input: "Show invite status"
Output: {{"intent": "check_invite_status", "clarification_needed": false, "confidence": 0.95}}

Input: "Has Bob signed up?"
Output: {{"intent": "check_invite_status", "participants": ["Bob"], "clarification_needed": false, "confidence": 0.9}}

Input: "Is Bob notified already?"
Output: {{"intent": "check_invite_status", "participants": ["Bob"], "clarification_needed": false, "confidence": 0.9}}

Input: "What happens if Bob never joins?"
Output: {{"intent": "explain", "topic": "invite_persistence", "clarification_needed": false, "confidence": 0.9}}

Now parse the user's message. Be flexible and make your best guess:"""

    def update_known_users(self, users: List[Dict]):
        """Update the list of known users."""
        self.known_users = users
        self.system_prompt = self._build_system_prompt()
    
    def _build_messages(self, user_input: str, context: Dict[str, Any] = None) -> List[Dict[str, str]]:
        """Build messages with context injection."""
        # Start with standard messages (system prompt + history)
        messages = super()._build_messages(user_input, context)
        
        # Inject conversation history if available
        if context and context.get("conversation_history"):
            history = context["conversation_history"]
            history_str = "CONVERSATION HISTORY (recent messages):\n"
            for turn in history[-3:]:  # Last 3 turns
                history_str += f"User: {turn.get('user', '')}\n"
                history_str += f"Assistant: {turn.get('assistant', '')} (intent: {turn.get('intent', 'unknown')})\n\n"
            
            history_str += "Use this history to understand follow-up messages. If the user's current message relates to a previous message (e.g., providing emails after being asked), consider the full context."
            
            messages.insert(-1, {"role": "system", "content": history_str})
        
        # Inject last expense context if available
        if context and context.get("last_expense"):
            le = context["last_expense"]
            ctx_msg = f"""CONTEXT - LAST EXPENSE:
Description: {le.get('description')}
Amount: {le.get('amount')}
Currency: {le.get('currency')}
Split Type: {le.get('split_type')}

If the user says "like last time", "same as before", or "repeat", use the above details."""
            
            # Insert before the last message (which is usually the user input)
            messages.insert(-1, {"role": "system", "content": ctx_msg})
            
        return messages
    
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
