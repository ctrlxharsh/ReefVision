#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Resolve Python interpreter
if [ -f "../Streamlit App/.venv/bin/python3" ]; then
    PYTHON_EXEC="../Streamlit App/.venv/bin/python3"
elif [ -f ".venv/bin/python3" ]; then
    PYTHON_EXEC=".venv/bin/python3"
elif [ -f "../.venv/bin/python3" ]; then
    PYTHON_EXEC="../.venv/bin/python3"
elif [ -f "/Users/harsh/Code/auv/coralseg/Streamlit App/.venv/bin/python3" ]; then
    PYTHON_EXEC="/Users/harsh/Code/auv/coralseg/Streamlit App/.venv/bin/python3"
else
    PYTHON_EXEC="python3"
fi

# Check if port 8000 is already in use
PIDS=$(lsof -ti :8000 2>/dev/null)
if [ -n "$PIDS" ]; then
    # Test if it's already responding healthy
    HEALTH=$(curl -s --connect-timeout 1 http://127.0.0.1:8000/api/health 2>/dev/null)
    if echo "$HEALTH" | grep -q "online"; then
        echo "[backend] Python Vision Engine is already running and healthy on port 8000."
        trap 'exit 0' SIGTERM SIGINT
        while true; do
            sleep 3600 &
            wait $!
        done
    else
        echo "[backend] Port 8000 is occupied by stale process ($PIDS). Releasing port..."
        for p in $PIDS; do
            kill -9 "$p" 2>/dev/null || true
        done
        sleep 1
    fi
fi

echo "[backend] Starting Reef Vision Studio FastAPI Engine on port 8000..."
exec "$PYTHON_EXEC" backend/run_server.py --port 8000 --reload "$@"
