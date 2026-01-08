# AI-Native Expense Sharing App (Splitwise Clone)

An AI-native expense sharing application where **all interactions happen through natural language**. Users never need to fill forms, manually select participants, or calculate balances - AI agents interpret intent, manage ledgers, reconcile debts, and communicate outcomes automatically.

## 🚀 Features

- **Natural Language Interface** - Chat-based expense management
- **Multi-Agent AI System** - Specialized agents for different tasks
- **Double-Entry Ledger** - Accurate financial tracking
- **Smart Debt Reconciliation** - Minimizes transactions needed
- **Real-time Updates** - WebSocket support for live chat

## 💬 Example Interactions

```
"Split ₹1200 dinner with Amit and Sarah"
"Rahul owes me 500"
"Who owes me money?"
"Settle with Amit"
"Remind Rahul to pay me"
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     User Message                        │
└─────────────────────┬───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│              AgentOrchestrator                          │
│  Routes messages to specialized agents                  │
└─────────────────────┬───────────────────────────────────┘
                      ▼
┌──────────┬──────────┬──────────┬──────────┬────────────┐
│  Intent  │  Ledger  │ Context  │  Recon   │ Notify     │
│  Agent   │  Agent   │  Agent   │  Agent   │ Agent      │
└──────────┴──────────┴──────────┴──────────┴────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│              SQLite Database                            │
└─────────────────────────────────────────────────────────┘
```

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/splitwise-ai.git
cd splitwise-ai/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload
```

## 🌐 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/chat/{user_id}` | POST | Send natural language message |
| `/ws/{user_id}` | WebSocket | Real-time chat connection |
| `/users/{user_id}/balance` | GET | Get balance summary |
| `/users/{user_id}/history` | GET | Transaction history |
| `/health` | GET | Health check |

## 🔧 Tech Stack

- **Backend**: FastAPI + Python
- **Database**: SQLAlchemy + SQLite (async)
- **AI**: NVIDIA LLM API (Llama 3.1)
- **Real-time**: WebSockets

## 📁 Project Structure

```
backend/
├── main.py                 # FastAPI application
├── database.py             # Database configuration
├── models.py               # SQLAlchemy models
├── ledger.py               # Ledger management
├── splitter.py             # Expense splitting logic
├── reconciliation.py       # Debt simplification
├── requirements.txt        # Dependencies
└── agents/
    ├── __init__.py
    ├── agent_config.py     # Base agent + LLM config
    ├── intent_agent.py     # Intent parsing
    ├── ledger_agent.py     # Financial explanations
    ├── context_agent.py    # Relationships & context
    ├── reconciliation_agent.py  # Settlement recommendations
    ├── notification_agent.py    # Smart reminders
    └── orchestrator.py     # Central coordinator
```

## ☁️ Deployment

This is a Python/FastAPI backend. Recommended platforms:

| Platform | Best For | Free Tier |
|----------|----------|-----------|
| **Railway** | Easy deployment | 500 hrs/month |
| **Render** | Production | Free with limits |
| **Fly.io** | Edge deployment | Free tier |

> ⚠️ **Note**: Vercel is optimized for frontend/Node.js projects. For this Python backend with WebSocket support, use Railway or Render instead.

## 🚀 Deploy to Railway (Recommended)

1. Push to GitHub
2. Go to [railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub"
4. Select your repo
5. Railway auto-detects Python and deploys!

## 📝 License

MIT
