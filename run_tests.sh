#!/bin/bash

# Check if API Key is set
if [ -z "$NVIDIA_API_KEY" ] && [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  WARNING: No API Key found in environment."
    echo "Please export your key first:"
    echo "  export NVIDIA_API_KEY=nvapi-..."
    echo "  OR"
    echo "  export OPENAI_API_KEY=sk-..."
    exit 1
fi

echo "🚀 Running Splitwise AI Comprehensive Test Suite..."
echo "Using In-Memory Database for safety."

# Use in-memory DB for testing
export DATABASE_URL="sqlite+aiosqlite:///:memory:"

# Run the test suite
python backend/tests/test_suite.py
