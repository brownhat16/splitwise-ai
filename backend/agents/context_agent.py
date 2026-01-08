"""Context Agent - Manages relationships, groups, and user preferences."""

from typing import Dict, Any, List, Optional
from .agent_config import BaseAgent, AgentConfig, parse_json_response


class ContextAgent(BaseAgent):
    """
    Agent responsible for relationship and context management.
    
    Handles:
    - Group management and membership
    - User relationship tracking
    - Default split preferences
    - Recurring expense patterns
    - Contextual inference
    """
    
    def __init__(self, config: AgentConfig = None):
        super().__init__(config)
        self.system_prompt = """You are a context management agent for an expense sharing app. Your role is to:

1. Manage groups and relationships between users
2. Remember user preferences and patterns
3. Infer appropriate defaults based on context
4. Suggest smart groupings and splits

When processing requests, consider:
- Past expense patterns
- Group compositions
- User preferences
- Recurring expenses

Always respond with JSON containing:
{
    "action": "action_type",
    "result": {...},
    "suggestions": [...],
    "inferred_context": {...}
}"""

    async def process(self, user_input: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Process a context-related request."""
        messages = self._build_messages(user_input, context)
        response = await self._call_llm(messages, temperature=0.5)
        return parse_json_response(response)
    
    async def infer_participants(self, message: str, known_users: List[Dict],
                                  groups: List[Dict], recent_expenses: List[Dict]) -> Dict[str, Any]:
        """
        Infer who should be included in an expense based on context.
        
        Args:
            message: The user's message
            known_users: List of known user dicts
            groups: List of group dicts with members
            recent_expenses: Recent expense history
            
        Returns:
            Dict with inferred participants and confidence
        """
        known_names = [u.get('name', '') for u in known_users]
        group_info = [{"name": g.get('name', ''), "members": g.get('members', [])} for g in groups]
        recent_participants = []
        for e in recent_expenses[:5]:
            recent_participants.extend(e.get('participants', []))
        
        prompt = f"""Based on this expense message, infer who should be included:

Message: "{message}"

Known users: {known_names}
Groups: {group_info}
Recent expense participants: {list(set(recent_participants))}

Return JSON with:
{{
    "mentioned_names": ["names explicitly mentioned"],
    "inferred_names": ["names inferred from context"],
    "suggested_group": "group name if applicable",
    "confidence": 0-1,
    "reasoning": "brief explanation"
}}"""

        messages = [
            {"role": "system", "content": "You are an expert at understanding expense contexts. Respond with valid JSON only."},
            {"role": "user", "content": prompt}
        ]
        
        response = await self._call_llm(messages, temperature=0.3)
        return parse_json_response(response)
    
    async def suggest_split_type(self, expense_description: str, 
                                  participants: List[str],
                                  historical_splits: List[Dict]) -> Dict[str, Any]:
        """
        Suggest the best split type based on context.
        
        Args:
            expense_description: What the expense is for
            participants: Who is involved
            historical_splits: Past split patterns
            
        Returns:
            Suggested split type with reasoning
        """
        prompt = f"""Suggest the best split type for this expense:

Expense: "{expense_description}"
Participants: {participants}
Historical patterns: {historical_splits[:5]}

Return JSON with:
{{
    "suggested_split_type": "equal/unequal/percentage/shares",
    "reasoning": "brief explanation",
    "if_unequal": {{"participant": amount/percentage}},
    "confidence": 0-1
}}"""

        messages = [
            {"role": "system", "content": "You are an expert at expense splitting. Respond with valid JSON only."},
            {"role": "user", "content": prompt}
        ]
        
        response = await self._call_llm(messages, temperature=0.4)
        return parse_json_response(response)
    
    async def detect_recurring_expense(self, expense: Dict, 
                                        expense_history: List[Dict]) -> Dict[str, Any]:
        """
        Detect if an expense might be recurring.
        
        Args:
            expense: Current expense details
            expense_history: Historical expenses
            
        Returns:
            Detection result with pattern info
        """
        # Find similar expenses in history
        similar = []
        desc_lower = expense.get('description', '').lower()
        for e in expense_history:
            e_desc = e.get('description', '').lower()
            if any(word in e_desc for word in desc_lower.split()) or any(word in desc_lower for word in e_desc.split()):
                similar.append(e)
        
        if len(similar) < 2:
            return {
                "is_recurring": False,
                "confidence": 0.9
            }
        
        prompt = f"""Analyze if this expense is recurring:

Current expense: {expense}
Similar past expenses: {similar[:5]}

Return JSON with:
{{
    "is_recurring": true/false,
    "pattern": "weekly/monthly/irregular",
    "typical_amount": number,
    "typical_participants": ["names"],
    "confidence": 0-1,
    "suggestion": "optional suggestion for user"
}}"""

        messages = [
            {"role": "system", "content": "You are an expense pattern analyzer. Respond with valid JSON only."},
            {"role": "user", "content": prompt}
        ]
        
        response = await self._call_llm(messages, temperature=0.3)
        return parse_json_response(response)
    
    async def generate_group_suggestion(self, user_id: int, 
                                         frequent_contacts: List[Dict]) -> Optional[Dict[str, Any]]:
        """
        Suggest creating a group based on frequent expense patterns.
        
        Args:
            user_id: Current user ID
            frequent_contacts: List of frequent expense contacts
            
        Returns:
            Group suggestion or None
        """
        if len(frequent_contacts) < 2:
            return None
        
        prompt = f"""Based on these frequent expense contacts, suggest a group:

Frequent contacts: {frequent_contacts[:10]}

Return JSON with:
{{
    "suggest_group": true/false,
    "group_name": "suggested name",
    "members": ["member names"],
    "reasoning": "why this group makes sense"
}}"""

        messages = [
            {"role": "system", "content": "You are a social expense analyst. Respond with valid JSON only."},
            {"role": "user", "content": prompt}
        ]
        
        response = await self._call_llm(messages, temperature=0.6)
        return parse_json_response(response)
