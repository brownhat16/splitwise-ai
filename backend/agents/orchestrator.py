"""Agent Orchestrator - Central coordinator for all AI agents."""

import json
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from .agent_config import AgentConfig
from .intent_agent import IntentAgent
from .ledger_agent import LedgerAgent
from .context_agent import ContextAgent
from .reconciliation_agent import ReconciliationAgent
from .notification_agent import NotificationAgent

from models import User, Group, Expense, ExpenseSplit, Transaction, LedgerEntry, Message, SplitType, Invite, InviteStatus
from ledger import LedgerManager
from splitter import ExpenseSplitter, SplitType as SplitterSplitType, format_split_summary
from reconciliation import DebtReconciler


class AgentOrchestrator:
    """
    Central coordinator that routes user messages to appropriate agents.
    
    This is the main entry point for all user interactions. It:
    - Parses user intent
    - Routes to specialized agents
    - Executes database operations
    - Returns natural language responses
    """
    
    def __init__(self, db: AsyncSession, config: AgentConfig = None):
        self.db = db
        self.config = config or AgentConfig()
        
        # Initialize all agents
        self.intent_agent = IntentAgent(self.config)
        self.ledger_agent = LedgerAgent(self.config)
        self.context_agent = ContextAgent(self.config)
        self.reconciliation_agent = ReconciliationAgent(self.config)
        self.notification_agent = NotificationAgent(self.config)
        
        # Ledger manager for financial operations
        self.ledger_manager = LedgerManager(db)
        
        # Intent handlers mapping
        self.intent_handlers = {
            "add_expense": self._handle_add_expense,
            "check_balance": self._handle_check_balance,
            "settle": self._handle_settle,
            "add_person": self._handle_add_person,
            "create_group": self._handle_create_group,
            "query": self._handle_query,
            "reminder": self._handle_reminder,
            "undo": self._handle_undo,
            "edit_expense": self._handle_edit_expense,
            "explain": self._handle_explain,
            "check_invite_status": self._handle_check_invite_status,
            "help": self._handle_help,
            "provide_emails": self._handle_provide_emails,
            "unclear": self._handle_unclear,
        }
    
    async def process_message(self, user_id: int, message: str, 
                               context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Main entry point for processing user messages.
        
        Args:
            user_id: The ID of the user sending the message
            message: The natural language message
            context: Optional conversation context
            
        Returns:
            Response dict with message and metadata
        """
        # Update known users for intent parsing
        known_users = await self._get_known_users()
        self.intent_agent.update_known_users(known_users)
        
        # Add rich context (last expense)
        if context is None:
            context = {}
        context["last_expense"] = await self._get_last_expense_context(user_id)
        
        # Add conversation history for multi-turn context
        context["conversation_history"] = await self._get_conversation_history(user_id, limit=5)
        
        # Parse intent
        intent_result = await self.intent_agent.process(message, context)
        
        # Check if clarification is needed
        if intent_result.get("clarification_needed"):
            return {
                "response": intent_result.get("clarification_question", "Could you please provide more details?"),
                "intent": intent_result,
                "needs_clarification": True,
                "success": True
            }
        
        # Route to appropriate handler
        intent = intent_result.get("intent", "unclear")
        handler = self.intent_handlers.get(intent, self._handle_unclear)
        
        try:
            result = await handler(user_id, intent_result, context)
            
            # Store message in history
            await self._store_message(user_id, message, result.get("response", ""), 
                                      intent, json.dumps(intent_result))
            
            return result
        except Exception as e:
            return {
                "response": f"Sorry, I encountered an error processing your request. Error: {str(e)}",
                "error": str(e),
                "success": False
            }
    
    async def _handle_add_expense(self, user_id: int, intent: Dict, 
                                   context: Dict = None) -> Dict[str, Any]:
        """Handle adding a new expense."""
        amount = intent.get("amount")
        description = intent.get("description", "Expense")
        currency = intent.get("currency", "INR")
        participants_names = intent.get("participants", [])
        payer_name = intent.get("payer", "me")
        split_type = intent.get("split_type", "equal")
        split_details = intent.get("split_details", {})
        
        if not amount:
            return {
                "response": "I need to know the amount. How much was the expense?",
                "needs_clarification": True,
                "success": False
            }
        
        # Resolve user IDs
        user = await self._get_user(user_id)
        payer_id = user_id if payer_name.lower() in ["me", "i", user.name.lower()] else await self._get_or_create_user_by_name(payer_name)
        
        participant_ids = []
        user_names = {}
        unknown_participants = []
        
        # Check for email clarification in context (user responded with emails)
        pending_emails = context.get("pending_invite_emails", {}) if context else {}
        
        for name in participants_names:
            if name.lower() in ["me", "i", user.name.lower()]:
                pid = user_id
            else:
                # Check if name contains an email (e.g., "bob@example.com" or "Bob: bob@example.com")
                import re
                email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', name)
                
                if email_match:
                    # Name contains email, extract and use it
                    email = email_match.group()
                    clean_name = re.sub(r'[\w\.-]+@[\w\.-]+\.\w+', '', name).strip(' :,-')
                    if not clean_name:
                        clean_name = email.split('@')[0].capitalize()
                    
                    # Check if invite already exists for this email
                    existing = await self._get_user_by_email(email)
                    if existing:
                        pid = existing.id
                    else:
                        pid = await self._create_invite_and_placeholder(user_id, clean_name, email)
                else:
                    # Check if user exists by name
                    existing_user = await self._get_or_create_user_by_name(name, create_if_missing=False)
                    if existing_user:
                        pid = existing_user
                    elif name in pending_emails:
                        # User provided email in follow-up, create invite
                        email = pending_emails[name]
                        pid = await self._create_invite_and_placeholder(user_id, name, email)
                    else:
                        # Check if a placeholder already exists for this name from a previous invite
                        existing_placeholder = await self._get_placeholder_by_name(name)
                        if existing_placeholder:
                            pid = existing_placeholder.id
                        else:
                            # Unknown user, need email clarification
                            unknown_participants.append(name)
                            continue
            
            participant_ids.append(pid)
            p_user = await self._get_user(pid)
            user_names[pid] = p_user.name if p_user else name
        
        # If there are unknown participants, ask for their emails
        if unknown_participants:
            names_list = ", ".join(unknown_participants)
            return {
                "response": f"I don't recognize {names_list}. Could you provide their email address(es) so I can invite them? For example: '{unknown_participants[0]}: email@example.com'",
                "needs_clarification": True,
                "clarification_type": "invite_emails",
                "unknown_users": unknown_participants,
                "pending_expense": {
                    "description": description,
                    "amount": amount,
                    "participants": participants_names,
                    "payer": payer_name,
                    "split_type": split_type,
                    "split_details": split_details
                },
                "success": False
            }
        
        # Ensure payer is in participants
        if payer_id not in participant_ids:
            participant_ids.append(payer_id)
            p_user = await self._get_user(payer_id)
            user_names[payer_id] = p_user.name if p_user else payer_name
        
        # Calculate splits
        splitter = ExpenseSplitter()
        split_type_enum = SplitterSplitType(split_type)
        
        if split_type == "equal":
            splits = splitter.split_equal(amount, participant_ids)
        elif split_type == "unequal":
            # Convert names to IDs in split_details
            amounts_by_id = {}
            for name, amt in split_details.items():
                if name.lower() in ["me", "i", user.name.lower()]:
                    amounts_by_id[user_id] = amt
                else:
                    uid = await self._get_or_create_user_by_name(name)
                    amounts_by_id[uid] = amt
            splits = splitter.split_unequal(amount, amounts_by_id)
        elif split_type == "percentage":
            percentages_by_id = {}
            for name, pct in split_details.items():
                if name.lower() in ["me", "i", user.name.lower()]:
                    percentages_by_id[user_id] = pct
                else:
                    uid = await self._get_or_create_user_by_name(name)
                    percentages_by_id[uid] = pct
            splits = splitter.split_percentage(amount, percentages_by_id, participant_ids)
        elif split_type == "shares":
            shares_by_id = {}
            for name, sh in split_details.items():
                if name.lower() in ["me", "i", user.name.lower()]:
                    shares_by_id[user_id] = sh
                else:
                    uid = await self._get_or_create_user_by_name(name)
                    shares_by_id[uid] = sh
            splits = splitter.split_shares(amount, shares_by_id)
        else:
            splits = splitter.split_equal(amount, participant_ids)
        
        # Create expense record
        expense = Expense(
            description=description,
            amount=amount,
            currency=currency,
            payer_id=payer_id,
            split_type=SplitType(split_type)
        )
        self.db.add(expense)
        await self.db.flush()
        
        # Create expense splits
        expense_splits = []
        for split in splits:
            expense_split = ExpenseSplit(
                expense_id=expense.id,
                user_id=split.user_id,
                amount=split.amount,
                percentage=split.percentage,
                shares=split.shares
            )
            self.db.add(expense_split)
            expense_splits.append(expense_split)
        
        await self.db.flush()
        
        # Record in ledger
        await self.ledger_manager.record_expense(expense, expense_splits)
        await self.db.commit()
        
        # Generate response
        payer_user = await self._get_user(payer_id)
        split_data = [{"name": user_names.get(s.user_id, f"User {s.user_id}"), "amount": s.amount} 
                      for s in splits]
        
        response = await self.ledger_agent.explain_expense({
            "description": description,
            "amount": amount,
            "currency": "₹" if currency == "INR" else currency,
            "payer": payer_user.name if payer_user else payer_name,
            "participants": list(user_names.values()),
            "splits": split_data
        })
        
        return {
            "response": response,
            "expense_id": expense.id,
            "success": True
        }
    
    async def _handle_check_balance(self, user_id: int, intent: Dict,
                                     context: Dict = None) -> Dict[str, Any]:
        """Handle balance check requests."""
        query_type = intent.get("query_type", "overall")
        specific_user = intent.get("participants", [None])[0] if intent.get("participants") else None
        
        if specific_user:
            # Balance with specific user
            other_id = await self._get_or_create_user_by_name(specific_user)
            balance = await self.ledger_manager.get_balance_between_users(user_id, other_id)
            other_user = await self._get_user(other_id)
            other_name = other_user.name if other_user else specific_user
            
            from reconciliation import explain_balance
            response = explain_balance(balance, other_name)
        else:
            # Overall balance summary
            summary = await self.ledger_manager.get_user_summary(user_id)
            response = await self.ledger_agent.explain_balance(summary)
        
        return {
            "response": response,
            "success": True
        }
    
    async def _handle_settle(self, user_id: int, intent: Dict,
                              context: Dict = None) -> Dict[str, Any]:
        """Handle settlement requests."""
        participants = intent.get("participants", [])
        amount = intent.get("amount")
        
        if not participants:
            # Get settlement suggestions for all balances
            all_balances = {}
            user_names = {}
            
            known_users = await self._get_known_users()
            for u in known_users:
                uid = u["id"]
                user_names[uid] = u["name"]
                balances_for_user = await self.ledger_manager.get_all_balances_for_user(uid)
                if balances_for_user:
                    all_balances[uid] = balances_for_user
            
            result = await self.reconciliation_agent.get_settlement_suggestions(all_balances, user_names)
            return {
                "response": result.get("message", "Here are your settlement suggestions."),
                "settlements": result.get("settlements", []),
                "success": True
            }
        
        # Settle with specific user
        other_name = participants[0]
        if other_name.lower() in ["me", "i"]:
            return {
                "response": "You can't settle with yourself! Who would you like to settle with?",
                "needs_clarification": True,
                "success": False
            }
        
        other_id = await self._get_or_create_user_by_name(other_name)
        current_balance = await self.ledger_manager.get_balance_between_users(user_id, other_id)
        
        # Determine settlement amount
        if amount:
            settle_amount = amount
        elif current_balance < 0:
            settle_amount = abs(current_balance)
        else:
            return {
                "response": f"It looks like {other_name} owes you ₹{current_balance:,.2f}. They should pay you!",
                "success": True
            }
        
        # Record settlement
        await self.ledger_manager.record_settlement(user_id, other_id, settle_amount, "Settlement")
        await self.db.commit()
        
        new_balance = await self.ledger_manager.get_balance_between_users(user_id, other_id)
        user = await self._get_user(user_id)
        
        response = await self.reconciliation_agent.explain_settlement_impact(
            user.name, other_name, settle_amount, abs(current_balance)
        )
        
        return {
            "response": response,
            "success": True
        }
    
    async def _handle_add_person(self, user_id: int, intent: Dict,
                                  context: Dict = None) -> Dict[str, Any]:
        """Handle adding a new person."""
        names = intent.get("participants", [])
        
        if not names:
            return {
                "response": "Who would you like to add?",
                "needs_clarification": True,
                "success": False
            }
        
        added = []
        for name in names:
            uid = await self._get_or_create_user_by_name(name, create_if_missing=True)
            added.append(name)
        
        await self.db.commit()
        
        if len(added) == 1:
            return {
                "response": f"Done! I've added {added[0]} to your contacts. You can now split expenses with them.",
                "success": True
            }
        else:
            names_str = ", ".join(added[:-1]) + f" and {added[-1]}"
            return {
                "response": f"Done! I've added {names_str} to your contacts.",
                "success": True
            }
    
    async def _handle_create_group(self, user_id: int, intent: Dict,
                                    context: Dict = None) -> Dict[str, Any]:
        """Handle group creation."""
        group_name = intent.get("group", intent.get("description", "New Group"))
        members = intent.get("participants", [])
        
        # Get member IDs
        member_ids = [user_id]
        for name in members:
            if name.lower() not in ["me", "i"]:
                uid = await self._get_or_create_user_by_name(name, create_if_missing=True)
                if uid not in member_ids:
                    member_ids.append(uid)
        
        # Create group
        group = Group(
            name=group_name,
            created_by_id=user_id
        )
        self.db.add(group)
        await self.db.flush()
        
        # Add members
        for mid in member_ids:
            member = await self._get_user(mid)
            if member:
                group.members.append(member)
        
        await self.db.commit()
        
        member_count = len(member_ids)
        return {
            "response": f"Created group '{group_name}' with {member_count} members! You can now add expenses to this group.",
            "group_id": group.id,
            "success": True
        }
    
    async def _handle_query(self, user_id: int, intent: Dict,
                             context: Dict = None) -> Dict[str, Any]:
        """Handle general queries about expenses."""
        query_text = intent.get("description", "")
        
        # Get relevant data
        summary = await self.ledger_manager.get_user_summary(user_id)
        history = await self.ledger_manager.get_ledger_history(user_id, limit=10)
        
        prompt = f"""User query: "{query_text}"

User's current balance summary:
- Total owed to them: ₹{summary.get('total_owed_to_you', 0):,.2f}
- Total they owe: ₹{summary.get('total_you_owe', 0):,.2f}
- Net balance: ₹{summary.get('net_balance', 0):,.2f}

Recent transactions: {history[:5]}

Provide a helpful, conversational response to their query."""

        response = await self.ledger_agent.process(prompt)
        
        return {
            "response": response.get("message", "I couldn't find specific information about that."),
            "success": True
        }
    
    async def _handle_reminder(self, user_id: int, intent: Dict,
                                context: Dict = None) -> Dict[str, Any]:
        """Handle reminder requests."""
        target = intent.get("participants", [None])[0]
        
        if not target:
            return {
                "response": "Who would you like me to remind?",
                "needs_clarification": True,
                "success": False
            }
        
        target_id = await self._get_or_create_user_by_name(target)
        balance = await self.ledger_manager.get_balance_between_users(user_id, target_id)
        
        if balance <= 0:
            return {
                "response": f"{target} doesn't owe you anything right now!",
                "success": True
            }
        
        reminder = await self.notification_agent.generate_payment_reminder(
            target, "you", balance, 0
        )
        
        return {
            "response": f"Okay, I've scheduled a reminder for {target} to pay you. I'll nudge them tomorrow!",
            "reminder": reminder,
            "success": True
        }
    
    async def _handle_undo(self, user_id: int, intent: Dict,
                            context: Dict = None) -> Dict[str, Any]:
        """Handle undo requests."""
        # Get the last expense by this user
        query = select(Expense).where(
            Expense.payer_id == user_id
        ).order_by(Expense.created_at.desc()).limit(1)
        
        result = await self.db.execute(query)
        expense = result.scalar_one_or_none()
        
        if not expense:
            return {
                "response": "I couldn't find any recent expenses to undo.",
                "success": False
            }
        
        expense_desc = expense.description
        expense_amount = expense.amount
        
        # Reverse the expense in ledger logic (create offsetting entries)
        # This preserves the audit trail in the ledger even if the expense object is removed
        await self.ledger_manager.reverse_expense(expense)
        
        # Delete the expense object to remove it from the active list
        # (Ledger entries will have expense_id set to NULL if configured, or cascade)
        await self.db.delete(expense)
        await self.db.commit()
        
        return {
            "response": f"Done! I've reversed the expense '{expense_desc}' for ₹{expense_amount:,.2f} and corrected all balances.",
            "success": True
        }
    
    async def _handle_edit_expense(self, user_id: int, intent: Dict,
                                    context: Dict = None) -> Dict[str, Any]:
        """Handle expense editing (remove participant, change amount)."""
        action = intent.get("action", "")
        
        # Get the last expense
        query = select(Expense).where(
            Expense.payer_id == user_id
        ).order_by(Expense.created_at.desc()).limit(1)
        
        result = await self.db.execute(query)
        expense = result.scalar_one_or_none()
        
        if not expense:
            return {
                "response": "I couldn't find a recent expense to edit.",
                "success": False
            }
        
        if action == "remove_participant":
            participant_name = intent.get("participant", "")
            if not participant_name:
                return {
                    "response": "Who should I remove from the expense?",
                    "needs_clarification": True,
                    "success": False
                }
            
            # Find the participant in expense splits
            participant_id = await self._get_or_create_user_by_name(participant_name, create_if_missing=False)
            if not participant_id:
                return {
                    "response": f"I don't see {participant_name} in this expense.",
                    "success": False
                }
            
            # Remove the split for this participant
            split_query = select(ExpenseSplit).where(
                ExpenseSplit.expense_id == expense.id,
                ExpenseSplit.user_id == participant_id
            )
            split_result = await self.db.execute(split_query)
            split = split_result.scalar_one_or_none()
            
            if not split:
                return {
                    "response": f"{participant_name} wasn't part of this expense.",
                    "success": False
                }
            
            # Reverse the ledger entry for this split
            await self.ledger_manager.remove_split_from_expense(expense, participant_id)
            
            # Delete the split
            await self.db.delete(split)
            
            # Recalculate remaining splits
            remaining_splits_query = select(ExpenseSplit).where(ExpenseSplit.expense_id == expense.id)
            remaining_result = await self.db.execute(remaining_splits_query)
            remaining_splits = remaining_result.scalars().all()
            
            if remaining_splits:
                new_share = expense.amount / (len(remaining_splits) + 1)  # +1 for payer
                for s in remaining_splits:
                    old_amount = s.amount
                    s.amount = new_share
                    # Update ledger
                    await self.ledger_manager.update_split_amount(expense, s.user_id, old_amount, new_share)
            
            await self.db.commit()
            
            return {
                "response": f"Done! I've removed {participant_name} from '{expense.description}' and recalculated the split.",
                "success": True
            }
        
        elif action == "change_amount":
            new_amount = intent.get("new_amount")
            if not new_amount:
                return {
                    "response": "What's the new amount?",
                    "needs_clarification": True,
                    "success": False
                }
            
            old_amount = expense.amount
            expense.amount = new_amount
            
            # Recalculate all splits proportionally
            splits_query = select(ExpenseSplit).where(ExpenseSplit.expense_id == expense.id)
            splits_result = await self.db.execute(splits_query)
            splits = splits_result.scalars().all()
            
            ratio = new_amount / old_amount if old_amount > 0 else 1
            
            for split in splits:
                old_split_amount = split.amount
                new_split_amount = old_split_amount * ratio
                split.amount = new_split_amount
                # Update ledger
                await self.ledger_manager.update_split_amount(expense, split.user_id, old_split_amount, new_split_amount)
            
            await self.db.commit()
            
            return {
                "response": f"Done! I've changed the amount from ₹{old_amount:,.0f} to ₹{new_amount:,.0f} and updated all splits proportionally.",
                "success": True
            }
        
        return {
            "response": "I'm not sure what to edit. Try 'change amount to X' or 'remove [name] from expense'.",
            "needs_clarification": True,
            "success": False
        }
    
    async def _handle_help(self, user_id: int, intent: Dict,
                            context: Dict = None) -> Dict[str, Any]:
        """Handle help requests."""
        help_text = """Here's what I can do for you:

**Adding Expenses:**
• "Split ₹1200 dinner with Amit and Sarah"
• "Rahul owes me 500"
• "Add rent expense, split equally with roommates"

**Checking Balances:**
• "Who owes me money?"
• "What's my balance with Rahul?"
• "Show my expenses"

**Settling Up:**
• "Settle with Amit"
• "Pay Rahul ₹500"

**Groups & People:**
• "Add Priya to my contacts"
• "Create a group called Roommates"

**Reminders:**
• "Remind Rahul to pay me"

Just chat naturally and I'll figure out what you need! 💬"""
        
        return {
            "response": help_text,
            "success": True
        }
    
    async def _handle_explain(self, user_id: int, intent: Dict,
                               context: Dict = None) -> Dict[str, Any]:
        """Explain the last action based on conversation history."""
        # Look at conversation history for context
        if context and context.get("conversation_history"):
            history = context["conversation_history"]
            
            # Find the most recent meaningful action
            for turn in reversed(history):
                last_intent = turn.get("intent", "")
                last_response = turn.get("assistant", "")
                
                if last_intent == "add_expense" and "successfully" in last_response.lower():
                    # Explain the expense split
                    explanation = f"""**Here's what happened:**

The expense was split using the **equal split** method, which means:
- The total amount is divided equally among all participants
- Each person pays the same share
- Any remainder (due to rounding) goes to the payer

**How splits work in Splitwise:**
- **Equal**: Total ÷ Number of people
- **Percentage**: Each person pays their specified %
- **Shares**: Like "2 parts to A, 1 part to B"
- **Unequal**: Exact amounts for each person

The transaction is recorded in the ledger, and balances are updated accordingly. 📊"""
                    return {
                        "response": explanation,
                        "success": True
                    }
                elif last_intent == "settle":
                    return {
                        "response": "The settlement cleared the debt between you and the other person. Their balance with you is now updated.",
                        "success": True
                    }
            
        # Generic explanation if no specific context
        return {
            "response": """I can explain how things work! Here's a quick overview:

**Expense Splitting:**
When you add an expense, I calculate each person's share based on the split type (equal, percentage, or custom amounts).

**Balances:**
I track who owes whom. If you paid for dinner and split it with friends, they owe you their share.

**What would you like me to explain specifically?**""",
            "success": True
        }
    
    async def _handle_check_invite_status(self, user_id: int, intent: Dict,
                                          context: Dict = None) -> Dict[str, Any]:
        """Check invite status for one or all invited users."""
        participants = intent.get("participants", [])
        
        # Query pending invites for this user
        query = select(Invite).where(Invite.inviter_id == user_id)
        
        if participants:
            # Check specific person
            name = participants[0]
            query = query.where(Invite.invitee_name.ilike(f"%{name}%"))
        
        result = await self.db.execute(query)
        invites = result.scalars().all()
        
        if not invites:
            if participants:
                # Check if the user actually exists (not a placeholder)
                existing = await self._get_or_create_user_by_name(participants[0], create_if_missing=False)
                if existing:
                    user = await self._get_user(existing)
                    if user and user.is_active:
                        return {
                            "response": f"✅ **{participants[0]}** is already on the app! No invite needed.",
                            "success": True
                        }
            return {
                "response": "You don't have any pending invites.",
                "success": True
            }
        
        # Build status report
        status_lines = []
        for invite in invites:
            if invite.status == InviteStatus.PENDING:
                status_lines.append(f"📤 **{invite.invitee_name}** ({invite.invitee_email}): Invite sent, not joined yet")
            elif invite.status == InviteStatus.ACCEPTED:
                status_lines.append(f"✅ **{invite.invitee_name}**: Joined!")
            elif invite.status == InviteStatus.EXPIRED:
                status_lines.append(f"⏰ **{invite.invitee_name}**: Invite expired")
        
        if participants and len(invites) == 1:
            invite = invites[0]
            if invite.status == InviteStatus.ACCEPTED:
                return {
                    "response": f"✅ Yes, **{invite.invitee_name}** has joined! Their balances are now active.",
                    "success": True
                }
            else:
                return {
                    "response": f"📤 **{invite.invitee_name}** hasn't joined yet. I've sent them an invite at {invite.invitee_email}.",
                    "success": True
                }
        
        status_report = "\n".join(status_lines)
        return {
            "response": f"**Invite Status:**\n{status_report}",
            "success": True
        }
    
    async def _handle_provide_emails(self, user_id: int, intent: Dict,
                                     context: Dict = None) -> Dict[str, Any]:
        """Handle email provision for pending invites."""
        email_data = intent.get("email_data", {})
        
        if not email_data:
            return {
                "response": "I couldn't parse the email addresses. Please provide them in format: 'Name: email@example.com'",
                "needs_clarification": True,
                "success": False
            }
        
        # Create invites for each email provided
        created_invites = []
        invited_names = []
        for name, email in email_data.items():
            # Create placeholder user and invite
            placeholder_id = await self._create_invite_and_placeholder(
                inviter_id=user_id,
                invitee_name=name,
                invitee_email=email
            )
            created_invites.append(f"{name} ({email})")
            invited_names.append(name)
        
        await self.db.commit()
        
        # Look for pending expense in conversation history
        pending_expense = None
        if context and context.get("conversation_history"):
            for turn in reversed(context["conversation_history"]):
                if turn.get("intent") == "add_expense":
                    # Found a recent add_expense that needed clarification
                    pending_expense = turn
                    break
        
        invites_list = ", ".join(created_invites)
        
        # If we found a pending expense, try to re-process it with the new invited users
        if pending_expense:
            # The invited users now exist, so we can suggest continuing
            return {
                "response": f"✅ Invited {invites_list}. They'll auto-link when they sign up.\n\nPlease repeat your expense request now — those names will work!",
                "success": True,
                "invites_created": invited_names,
                "hint": "Users can now repeat their original expense request"
            }
        
        return {
            "response": f"Got it! I've invited {invites_list}. They'll be linked automatically when they sign up. What expense would you like to add?",
            "success": True,
            "invites_created": invited_names
        }
    
    async def _handle_unclear(self, user_id: int, intent: Dict,
                               context: Dict = None) -> Dict[str, Any]:
        """Handle unclear intents."""
        return {
            "response": "I'm not sure I understood that. Could you rephrase? For example, you can say 'Split ₹500 with Rahul' or 'Who owes me money?'",
            "needs_clarification": True,
            "success": False
        }
    
    # Helper methods
    
    async def _get_user(self, user_id: int) -> Optional[User]:
        """Get a user by ID."""
        query = select(User).where(User.id == user_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def _get_or_create_user_by_name(self, name: str, 
                                           create_if_missing: bool = True) -> int:
        """Get user ID by name, creating if necessary."""
        query = select(User).where(User.name.ilike(name))
        result = await self.db.execute(query)
        user = result.scalar_one_or_none()
        
        if user:
            return user.id
        
        if create_if_missing:
            new_user = User(name=name)
            self.db.add(new_user)
            await self.db.flush()
            return new_user.id
        
        return None
    
    async def _user_exists_by_name(self, name: str) -> bool:
        """Check if a user exists by name (excluding placeholders without email)."""
        query = select(User).where(User.name.ilike(name))
        result = await self.db.execute(query)
        user = result.scalar_one_or_none()
        # A "real" user either has an email or a password (i.e., registered)
        if user and (user.email or user.hashed_password):
            return True
        return user is not None  # For now, any user counts
    
    async def _create_invite_and_placeholder(self, inviter_id: int, invitee_name: str, 
                                             invitee_email: str, expense_id: int = None) -> int:
        """Create an invite record and a placeholder user, returns placeholder user ID."""
        # Create placeholder user
        placeholder = User(name=invitee_name)
        self.db.add(placeholder)
        await self.db.flush()
        
        # Create invite record
        invite = Invite(
            inviter_id=inviter_id,
            invitee_name=invitee_name,
            invitee_email=invitee_email.lower(),
            expense_id=expense_id,
            placeholder_user_id=placeholder.id,
            status=InviteStatus.PENDING
        )
        self.db.add(invite)
        await self.db.flush()
        
        return placeholder.id
    
    async def _get_known_users(self) -> List[Dict]:
        """Get all known users."""
        query = select(User)
        result = await self.db.execute(query)
        users = result.scalars().all()
        return [{"id": u.id, "name": u.name} for u in users]
    
    async def _get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email address."""
        query = select(User).where(User.email == email.lower())
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def _get_placeholder_by_name(self, name: str) -> Optional[User]:
        """Get placeholder user by name (checks users with is_active=False)."""
        query = select(User).where(
            User.name.ilike(f"%{name}%"),
            User.is_active == False
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def _store_message(self, user_id: int, content: str, response: str,
                              intent: str, entities: str):
        """Store a message in the conversation history."""
        message = Message(
            user_id=user_id,
            content=content,
            response=response,
            intent=intent,
            entities=entities
        )
        self.db.add(message)
        await self.db.flush()
    
    async def close(self):
        """Close all agent connections."""
        await self.intent_agent.close()
        await self.ledger_agent.close()
        await self.context_agent.close()
        await self.reconciliation_agent.close()
        await self.notification_agent.close()

    async def _get_last_expense_context(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get context about the last expense for this user."""
        query = select(Expense).where(
            Expense.payer_id == user_id
        ).order_by(Expense.created_at.desc()).limit(1)
        result = await self.db.execute(query)
        expense = result.scalar_one_or_none()
        
        if not expense:
            return None
            
        return {
            "description": expense.description,
            "amount": expense.amount,
            "currency": expense.currency,
            "split_type": expense.split_type.value
        }
    
    async def _get_conversation_history(self, user_id: int, limit: int = 5) -> List[Dict[str, str]]:
        """Get recent conversation history for context."""
        query = select(Message).where(
            Message.user_id == user_id
        ).order_by(Message.timestamp.desc()).limit(limit)
        
        result = await self.db.execute(query)
        messages = result.scalars().all()
        
        # Reverse to get chronological order
        history = []
        for msg in reversed(messages):
            history.append({
                "user": msg.content,
                "assistant": msg.response,
                "intent": msg.intent
            })
        
        return history
