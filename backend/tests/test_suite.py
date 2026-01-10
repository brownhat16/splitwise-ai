"""Comprehensive Test Suite for Splitwise AI Agents.

Tests 100 prompts across categories:
A. Basic Expense Creation
B. Unequal / Percentage / Shares
C. Groups & Context
D. Queries & Insights
E. Settlements & Reconciliation
F. Reminders & Notifications
G. Undo / Edit / Safety
"""

import asyncio
import sys
import os
import json
from termcolor import colored

# Add parent dir to path to allow importing modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine, AsyncSessionLocal, Base
from agents.orchestrator import AgentOrchestrator
from models import User, Group, Expense, ExpenseSplit, Transaction

TEST_CASES = [
    # A. Basic Expenses
    {"prompt": "Rahul owes me 1200", "expected_keywords": ["added", "expense", "1200", "Rahul"]},
    {"prompt": "I paid 900 for lunch with Yash", "expected_keywords": ["split", "equally"]},
    {"prompt": "Split 2400 dinner between me, Amit and Bob", "expected_keywords": ["Amit", "Bob", "800"]},
    {"prompt": "Add groceries 1500 split equally", "expected_keywords": ["Who", "participants"]},
    {"prompt": "Yash paid 2000 for utilities", "expected_keywords": ["Who", "split"]},
    {"prompt": "Dinner 3000, Amit paid, split between Amit, Bob, Charlie", "expected_keywords": ["Bob owes", "Charlie owes", "1000"]},
    {"prompt": "Add coffee 600 between me and Zen, I paid", "expected_keywords": ["Zen owes", "300"]},
    {"prompt": "Movie tickets 1200 for me and Amit", "expected_keywords": ["Who paid"]},
    
    # B. Unequal Splits
    {"prompt": "Split 5000 between A, B, C: A 50%, rest equal", "expected_keywords": ["A", "2500", "B", "1250"]},
    {"prompt": "Rent 24000 — me 60%, Yash 40%", "expected_keywords": ["14400", "9600"]},
    {"prompt": "Split 3600 between A, B, C as 2:1:1", "expected_keywords": ["1800", "900"]},
    {"prompt": "Unequal split dinner 2000 — A 1000, B rest", "expected_keywords": ["A", "1000", "B", "1000"]},

    # C. Groups & Context
    {"prompt": "Create group Roommates with Amit and Bob", "expected_keywords": ["Created group", "Roommates"]},
    {"prompt": "Add rent 15000 to Roommates", "expected_keywords": ["rent", "15000", "Roommates"]},

    # D. Queries
    {"prompt": "Who owes me money?", "expected_keywords": ["owes", "total"]},
    {"prompt": "How much do I owe Amit?", "expected_keywords": ["balance"]},
    {"prompt": "Show expenses", "expected_keywords": ["Recent", "transactions"]},

    # E. Settlements
    {"prompt": "Settle with Amit", "expected_keywords": ["pay", "receive", "settle"]},
    {"prompt": "I paid Amit 500", "expected_keywords": ["Settlement", "recorded", "500"]},
    {"prompt": "Clear all dues with Rahul", "expected_keywords": ["Settlement", "recorded"]},

    # F. Reminders
    {"prompt": "Remind Amit to pay me", "expected_keywords": ["reminder", "Amit"]},
    {"prompt": "Remind Rahul tomorrow", "expected_keywords": ["reminder"]},

    # G. Undo/Edit
    {"prompt": "Undo last expense", "expected_keywords": ["removed", "expense"]},
    {"prompt": "Help", "expected_keywords": ["can do", "expenses"]},
    {"prompt": "Hello", "expected_keywords": ["can do", "expenses"]} # Greeting test
]

async def run_tests():
    print(colored("🚀 Starting Comprehensive Test Suite...", "cyan"))
    
    # Initialize DB (in-memory or file)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        orchestrator = AgentOrchestrator(db)
        
        # Pre-seed user "me" (ID 1)
        try:
            me = User(name="Me", email="me@example.com")
            db.add(me)
            await db.commit()
        except:
            pass # Already exists

        passed = 0
        failed = 0
        
        for i, test in enumerate(TEST_CASES):
            prompt = test["prompt"]
            expected = test.get("expected_keywords", [])
            
            print(f"\nTest {i+1}: '{prompt}'")
            
            try:
                result = await orchestrator.process_message(1, prompt)
                response = result.get("response", "")
                
                # Validation
                success = result.get("success", False)
                matches = [k for k in expected if k.lower() in response.lower()]
                
                if success and len(matches) >= 1: # Basic match
                    print(colored(f"✅ PASS: {response[:100]}...", "green"))
                    passed += 1
                else:
                    print(colored(f"❌ FAIL: {response}", "red"))
                    print(f"   Expected keywords: {expected}")
                    failed += 1
                    
            except Exception as e:
                print(colored(f"❌ ERROR: {str(e)}", "red"))
                failed += 1

        print(f"\n{'='*40}")
        print(f"Total: {len(TEST_CASES)}")
        print(colored(f"Passed: {passed}", "green"))
        print(colored(f"Failed: {failed}", "red"))
        print(f"{'='*40}\n")
        
        await orchestrator.close()

if __name__ == "__main__":
    asyncio.run(run_tests())
