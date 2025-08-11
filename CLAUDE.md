# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Maigret UI is a modern web frontend for the Maigret OSINT tool, which searches for usernames across 3000+ websites. It's a full-stack application with a Next.js frontend and FastAPI backend that integrates with the core Maigret Python package for conducting digital footprint investigations.

## Architecture

- **Frontend**: Next.js 15.4.6 with React 19, TypeScript, and Tailwind CSS
- **Backend**: FastAPI with WebSocket support for real-time updates
- **Core Engine**: Maigret OSINT Python package (0.5.0a1)
- **Real-time Communication**: WebSocket connections for live search progress
- **Session Management**: JSON file-based persistence in `backend/search_sessions.json`

## Development Commands

### Frontend (from `/frontend`)
```bash
npm install              # Install dependencies
npm run dev             # Development server (localhost:3000)
npm run build           # Production build
npm run lint            # ESLint
npm start               # Production server
```

### Backend (from `/backend`)
```bash
python -m venv venv && source venv/bin/activate  # Setup virtual environment
pip install -r requirements.txt                 # Install dependencies
python main.py                                  # Start server (localhost:8000)
```

### Testing & Quality
```bash
make test               # Run Python tests with coverage
make lint               # Run all linting checks
make format             # Format code (Black for Python)
```

## Key Architecture Patterns

### Frontend Structure
- **App Router**: Uses Next.js App Router with pages in `src/app/`
- **Components**: shadcn/ui components in `src/components/ui/`, custom components organized by feature
- **Custom Hooks**: `useSearch` and `useWebSocketSearch` handle search state and real-time updates
- **API Client**: Centralized in `src/lib/api.ts` for backend communication
- **Type Definitions**: Comprehensive TypeScript types in `src/types/`

### Backend Architecture
- **FastAPI Server**: `backend/main.py` with RESTful endpoints and WebSocket support
- **Session Management**: Search sessions persisted in JSON format
- **Subprocess Integration**: Executes Maigret CLI commands with progress parsing
- **Real-time Updates**: WebSocket streams for live search progress

### Core Data Flow
1. Frontend initiates search via `POST /api/search`
2. Backend creates session and starts Maigret subprocess
3. Progress updates streamed via WebSocket to `ws/{sessionId}`
4. Results processed and available at `GET /api/results/{sessionId}`

## Important API Endpoints

- `POST /api/search` - Start new username search
- `GET /api/search/{sessionId}` - Get search status
- `GET /api/results/{sessionId}` - Get formatted results
- `WebSocket /ws/{sessionId}` - Real-time progress updates
- `GET /api/sites` - Available sites database (3000+ sites)
- `GET /api/tags` - Site categories for filtering

## Key Files & Directories

- `frontend/src/hooks/useSearch.ts` - Search state management
- `frontend/src/components/search/SearchProgress.tsx` - Real-time progress display
- `backend/main.py` - Main FastAPI application
- `backend/search_sessions.json` - Session persistence
- `maigret/resources/data.json` - Database of 3000+ searchable sites

## Development Notes

### Environment Setup
- Requires Node.js 18+ and Python 3.10+
- Backend runs on port 8000, frontend on port 3000
- WebSocket connections handle real-time search progress

### UI Framework
- Uses shadcn/ui with "New York" style components
- Tailwind CSS with custom theme configuration
- Radix UI primitives for accessibility

### Search Functionality
- Supports multiple usernames simultaneously
- Site filtering by tags (social, gaming, tech, etc.)
- Advanced options: timeouts, proxy support, recursive search
- Export formats: JSON, CSV, PDF, HTML

### Session Management
- Each search creates a unique session ID
- Sessions persist in JSON format for resume capability
- WebSocket connections tied to session IDs for progress updates