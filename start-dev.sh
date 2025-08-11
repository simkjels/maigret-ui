#!/bin/bash

# Start development servers for Maigret UI

echo "🚀 Starting Maigret UI Development Servers..."

# Ensure we are in the script directory
cd "$(dirname "$0")"

# Kill anything using ports 3000 and 8000
echo "🔧 Ensuring ports 3000 and 8000 are free..."
if lsof -ti tcp:3000 >/dev/null 2>&1; then
  lsof -ti tcp:3000 | xargs -r kill -9 || true
fi
if lsof -ti tcp:8000 >/dev/null 2>&1; then
  lsof -ti tcp:8000 | xargs -r kill -9 || true
fi

# Function to cleanup background processes on exit
cleanup() {
    echo "🛑 Stopping servers..."
    kill $FRONTEND_PID $BACKEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start backend server
echo "📡 Starting backend server..."
cd backend
if [ -f "venv/bin/activate" ]; then
  source venv/bin/activate
fi
python main.py &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

# Start frontend server
echo "🎨 Starting frontend server..."
cd frontend
if command -v bun >/dev/null 2>&1; then
  # Prefer bun if available for faster dev
  rm -rf .next
  bun run dev &
else
  rm -rf .next
  npm run dev &
fi
FRONTEND_PID=$!
cd ..

echo "✅ Servers started!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for background processes
wait
