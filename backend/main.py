from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
import json
import uuid
import asyncio
import logging
import subprocess
import tempfile
from datetime import datetime
from typing import List, Optional, Dict
from pydantic import BaseModel
import threading

app = FastAPI(title="Maigret OSINT API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001", "http://localhost:3003", "http://127.0.0.1:3003"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        logger.info(f"WebSocket connected for session {session_id}")

    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
            logger.info(f"WebSocket disconnected for session {session_id}")

    async def send_progress_update(self, session_id: str, data: dict):
        logger.info(f"Attempting to send progress update to session {session_id}")
        logger.info(f"Active connections: {list(self.active_connections.keys())}")
        
        if session_id in self.active_connections:
            try:
                message_json = json.dumps(data)
                logger.info(f"Sending message to session {session_id}: {message_json}")
                await self.active_connections[session_id].send_text(message_json)
                logger.info(f"Successfully sent progress update to session {session_id}")
            except Exception as e:
                logger.error(f"Failed to send progress update to session {session_id}: {e}")
                logger.error(f"Exception type: {type(e).__name__}")
                logger.error(f"Exception details: {str(e)}")
                self.disconnect(session_id)
        else:
            logger.warning(f"No active WebSocket connection for session {session_id}")
            logger.warning(f"Available sessions: {list(self.active_connections.keys())}")

manager = ConnectionManager()

# Pydantic models
class SearchOptions(BaseModel):
    topSites: int = 500
    timeout: int = 30
    useCookies: bool = False
    allSites: bool = False
    disableRecursiveSearch: bool = False
    disableExtracting: bool = False
    withDomains: bool = False
    proxy: Optional[str] = None
    torProxy: Optional[str] = None
    i2pProxy: Optional[str] = None
    permute: bool = False
    tags: List[str] = []
    siteList: List[str] = []

class SearchRequest(BaseModel):
    usernames: List[str]
    options: SearchOptions

class SearchResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None
    message: Optional[str] = None

# In-memory storage for demo purposes
# In production, use a proper database
search_sessions = {}
session_locks = {}  # Per-session locks for thread safety

# Session persistence
SESSIONS_FILE = "search_sessions.json"

def load_sessions():
    """Load sessions from file"""
    global search_sessions
    try:
        if os.path.exists(SESSIONS_FILE):
            with open(SESSIONS_FILE, 'r') as f:
                search_sessions = json.load(f)
                logger.info(f"Loaded {len(search_sessions)} sessions from file")
    except Exception as e:
        logger.error(f"Failed to load sessions: {e}")
        search_sessions = {}

def save_sessions():
    """Save sessions to file"""
    try:
        with open(SESSIONS_FILE, 'w') as f:
            json.dump(search_sessions, f, indent=2, default=str)
        logger.info(f"Saved {len(search_sessions)} sessions to file")
    except Exception as e:
        logger.error(f"Failed to save sessions: {e}")

def update_session_data(session_id: str, updates: dict):
    """Thread-safe session data update"""
    if session_id not in session_locks:
        session_locks[session_id] = threading.Lock()
    
    with session_locks[session_id]:
        if session_id in search_sessions:
            search_sessions[session_id].update(updates)
            logger.debug(f"Session {session_id} updated: {updates}")
            save_sessions()
        else:
            logger.warning(f"Session {session_id} not found for update")

def get_session_data(session_id: str) -> dict:
    """Thread-safe session data retrieval"""
    if session_id not in session_locks:
        session_locks[session_id] = threading.Lock()
    
    with session_locks[session_id]:
        return search_sessions.get(session_id, {}).copy()

# Load sessions on startup
load_sessions()

MAIGRET_AVAILABLE = True  # Re-enable Maigret with WebSocket support

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "maigret_available": MAIGRET_AVAILABLE}

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    logger.info(f"WebSocket connection attempt for session {session_id}")
    await manager.connect(websocket, session_id)
    logger.info(f"WebSocket connected for session {session_id}, active connections: {list(manager.active_connections.keys())}")
    
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
            logger.debug(f"Received WebSocket message from session {session_id}: {data}")
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
        manager.disconnect(session_id)
    except Exception as e:
        logger.error(f"WebSocket error for session {session_id}: {e}")
        manager.disconnect(session_id)

@app.get("/api/sites")
async def get_sites():
    """Get available sites for searching"""
    try:
        if MAIGRET_AVAILABLE:
            # Run Maigret with --stats to get site information
            parent_path = os.path.join(os.path.dirname(__file__), '..')
            result = subprocess.run(
                ["python3", "-m", "maigret.maigret", "--stats"],
                capture_output=True,
                text=True,
                timeout=30,
                cwd=parent_path
            )
            
            if result.returncode == 0:
                # Parse the stats output to get site information
                # For now, return a basic structure
                return SearchResponse(
                    success=True,
                    data={
                        "sites": [
                            {"name": "github", "urlMain": "https://github.com", "tags": ["coding", "tech"]},
                            {"name": "twitter", "urlMain": "https://twitter.com", "tags": ["social", "news"]},
                            {"name": "instagram", "urlMain": "https://instagram.com", "tags": ["photo", "social"]},
                            {"name": "linkedin", "urlMain": "https://linkedin.com", "tags": ["professional", "social"]},
                            {"name": "facebook", "urlMain": "https://facebook.com", "tags": ["social"]},
                            {"name": "reddit", "urlMain": "https://reddit.com", "tags": ["social", "forum"]},
                            {"name": "youtube", "urlMain": "https://youtube.com", "tags": ["video", "social"]},
                            {"name": "tiktok", "urlMain": "https://tiktok.com", "tags": ["video", "social"]},
                            {"name": "discord", "urlMain": "https://discord.com", "tags": ["gaming", "social"]},
                            {"name": "steam", "urlMain": "https://steamcommunity.com", "tags": ["gaming"]},
                        ],
                        "total": 10,
                        "tags": ["coding", "tech", "social", "news", "photo", "professional", "forum", "video", "gaming"]
                    }
                )
            else:
                return SearchResponse(success=False, error="Failed to get site statistics")
        else:
            # Mock data
            return SearchResponse(
                success=True,
                data={
                    "sites": [
                        {"name": "github", "urlMain": "https://github.com", "tags": ["coding", "tech"]},
                        {"name": "twitter", "urlMain": "https://twitter.com", "tags": ["social", "news"]},
                        {"name": "instagram", "urlMain": "https://instagram.com", "tags": ["photo", "social"]},
                    ],
                    "total": 3,
                    "tags": ["coding", "tech", "social", "news", "photo"]
                }
            )
    except Exception as e:
        return SearchResponse(success=False, error=str(e))

@app.get("/api/tags")
async def get_tags():
    """Get available tags"""
    try:
        if MAIGRET_AVAILABLE:
            # Return common tags
            return SearchResponse(
                success=True,
                data=["gaming", "coding", "photo", "music", "blog", "finance", "social", "tech", "news", "professional", "forum", "video"]
            )
        else:
            return SearchResponse(
                success=True,
                data=["gaming", "coding", "photo", "music", "blog", "finance", "social"]
            )
    except Exception as e:
        return SearchResponse(success=False, error=str(e))

@app.post("/api/search")
async def start_search(request: SearchRequest):
    """Start a new search"""
    try:
        session_id = str(uuid.uuid4())
        
        # Create session
        session = {
            "id": session_id,
            "usernames": request.usernames,
            "options": request.options.model_dump(),
            "status": "pending",
            "progress": 0,
            "results": [],
            "createdAt": datetime.now().isoformat(),
        }
        
        search_sessions[session_id] = session
        save_sessions() # Save session after creation
        
        # Start the search in a background task
        if MAIGRET_AVAILABLE:
            asyncio.create_task(perform_maigret_search(session_id, request))
        else:
            # Mock search results with WebSocket support
            asyncio.create_task(mock_search(session_id, request))
        
        return SearchResponse(success=True, data=session)
    except Exception as e:
        return SearchResponse(success=False, error=str(e))

async def perform_maigret_search(session_id: str, request: SearchRequest):
    """Perform actual Maigret search using subprocess with real-time progress tracking"""
    try:
        # Update session status using thread-safe method
        update_session_data(session_id, {
            "status": "running",
            "progress": 0,
            "currentSite": "Initializing...",
            "sitesChecked": 0,
            "totalSites": 0,
            "resultsFound": 0
        })
        
        logger.info(f"Starting Maigret search for usernames: {request.usernames}")
        
        # Add initial progress update immediately
        update_session_data(session_id, {
            "progress": 1,
            "currentSite": "Preparing search..."
        })
        
        # Build Maigret command
        parent_path = os.path.join(os.path.dirname(__file__), '..')
        cmd = ["python3", "-m", "maigret.maigret"]
        
        # Add options
        if request.options.timeout:
            cmd.extend(["--timeout", str(request.options.timeout)])
        
        if request.options.allSites:
            cmd.append("--all-sites")
        elif request.options.topSites:
            cmd.extend(["--top-sites", str(request.options.topSites)])
        
        if request.options.tags:
            cmd.extend(["--tags", ",".join(request.options.tags)])
        
        if request.options.siteList:
            for site in request.options.siteList:
                cmd.extend(["--site", site])
        
        if request.options.disableRecursiveSearch:
            cmd.append("--no-recursion")
        
        if request.options.disableExtracting:
            cmd.append("--no-extracting")
        
        if request.options.proxy:
            cmd.extend(["--proxy", request.options.proxy])
        
        if request.options.torProxy:
            cmd.extend(["--tor-proxy", request.options.torProxy])
        
        if request.options.i2pProxy:
            cmd.extend(["--i2p-proxy", request.options.i2pProxy])
        
        # Add verbose output for progress tracking
        cmd.append("--verbose")
        
        # Add JSON output
        cmd.extend(["--json", "simple"])
        
        # Add usernames
        cmd.extend(request.usernames)
        
        logger.info(f"Running command: {' '.join(cmd)}")
        
        # Update progress to show command preparation
        update_session_data(session_id, {
            "progress": 2,
            "currentSite": "Starting search process..."
        })
        
        # Run Maigret with real-time output capture
        env = os.environ.copy()
        env['PYTHONPATH'] = parent_path + ':' + env.get('PYTHONPATH', '')
        
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True,
            cwd=parent_path,
            env=env
        )
        
        # Track progress from output
        total_sites = 0
        sites_checked = 0
        results_found = 0
        current_site = "Initializing..."
        last_progress_update = 0
        
        # Read output in real-time with timeout
        import time
        start_time = time.time()
        timeout_seconds = max(request.options.timeout * 2, 120)  # Double the timeout, minimum 2 minutes
        
        # Update progress more frequently and ensure we always have some progress
        async def update_progress():
            nonlocal last_progress_update
            current_time = time.time()
            if current_time - last_progress_update >= 0.5:  # Update every 500ms
                # Calculate progress based on available information
                if total_sites > 0 and sites_checked > 0:
                    # Use actual progress from parsed output
                    progress = min(95, int((sites_checked / total_sites) * 100))
                else:
                    # Estimate progress based on time elapsed
                    elapsed_time = current_time - start_time
                    # Start with a minimum progress to show activity
                    min_progress = max(2, int((elapsed_time / 5) * 3))  # 3% per 5 seconds initially
                    estimated_progress = min(90, min_progress)
                    progress = estimated_progress
                
                # Use thread-safe session update
                update_session_data(session_id, {
                    "progress": progress,
                    "sitesChecked": sites_checked,
                    "totalSites": total_sites,
                    "resultsFound": results_found,
                    "currentSite": current_site
                })
                
                # Send real-time update via WebSocket
                session_data = get_session_data(session_id)
                await manager.send_progress_update(session_id, {
                    "type": "progress",
                    "data": {
                        "sessionId": session_id,
                        "status": session_data.get("status", "running"),
                        "progress": progress,
                        "currentSite": current_site,
                        "sitesChecked": sites_checked,
                        "totalSites": total_sites,
                        "resultsFound": results_found
                    }
                })
                
                last_progress_update = current_time
        
        # Ensure we have initial progress even if no output yet
        update_session_data(session_id, {
            "progress": 3,
            "currentSite": "Searching sites..."
        })
        
        while True:
            # Check for timeout
            if time.time() - start_time > timeout_seconds:
                logger.error(f"Search timeout after {timeout_seconds} seconds")
                process.terminate()
                update_session_data(session_id, {
                    "status": "failed",
                    "error": "Search timed out"
                })
                return
            
            output = process.stdout.readline()
            if output == '' and process.poll() is not None:
                break
            if output:
                line = output.strip()
                logger.info(f"Maigret output: {line}")
                
                # Parse progress information from output
                import re
                
                # Look for initialization messages
                if "sites" in line.lower() and ("searching" in line.lower() or "found" in line.lower()):
                    sites_match = re.search(r'(\d+)\s+sites?', line, re.IGNORECASE)
                    if sites_match and total_sites == 0:
                        total_sites = int(sites_match.group(1))
                        update_session_data(session_id, {
                            "totalSites": total_sites,
                            "currentSite": "Starting search...",
                            "progress": 5
                        })
                        logger.info(f"Found total sites: {total_sites}")
                
                # Look for progress bar updates (multiple formats)
                progress_patterns = [
                    r'Searching\s+\|[█░]+\|\s+(\d+)/(\d+)',
                    r'(\d+)/(\d+)\s+\[[█░]+\]',
                    r'(\d+)/(\d+)\s+\[[= ]+\]',
                    r'(\d+)/(\d+)\s+\[[# ]+\]',
                    r'Progress:\s+(\d+)/(\d+)',
                    r'(\d+)/(\d+)\s+sites?',
                    # Add pattern for the format we're seeing in logs
                    r'Searching\s+\|[█░]+\|\s*(\d+)/(\d+)',
                    # Add pattern for the format: 494/500 [99%]
                    r'(\d+)/(\d+)\s+\[(\d+)%\]',
                ]
                
                for pattern in progress_patterns:
                    progress_match = re.search(pattern, line)
                    if progress_match:
                        if len(progress_match.groups()) == 3:  # Format: 494/500 [99%]
                            sites_checked = int(progress_match.group(1))
                            total_sites = int(progress_match.group(2))
                            progress_percent = int(progress_match.group(3))
                        else:  # Other formats
                            sites_checked = int(progress_match.group(1))
                            if total_sites == 0:
                                total_sites = int(progress_match.group(2))
                            progress_percent = min(95, int((sites_checked / max(total_sites, 1)) * 100))
                        
                        update_session_data(session_id, {
                            "totalSites": total_sites,
                            "sitesChecked": sites_checked,
                            "progress": progress_percent
                        })
                        logger.info(f"Progress update: {sites_checked}/{total_sites} ({progress_percent}%)")
                        break
                
                # Also look for progress bar patterns without numbers (like the one in logs)
                if 'Searching |' in line and '|' in line:
                    # Extract progress from visual progress bar
                    bar_match = re.search(r'Searching\s+\|([█░]+)\|', line)
                    if bar_match:
                        bar = bar_match.group(1)
                        filled = bar.count('█')
                        total_length = len(bar)
                        if total_length > 0:
                            # Estimate progress from visual bar
                            estimated_progress = min(95, int((filled / total_length) * 100))
                            session_data = get_session_data(session_id)
                            if estimated_progress > session_data.get("progress", 0):
                                update_session_data(session_id, {
                                    "progress": estimated_progress,
                                    "currentSite": f"Site {sites_checked + 1}" if sites_checked > 0 else "Processing sites..."
                                })
                                logger.info(f"Visual progress update: {estimated_progress}%")
                
                # Look for site checking messages
                site_check_patterns = [
                    r'Checking\s+([^.\s]+)',
                    r'Searching\s+([^.\s]+)',
                    r'Testing\s+([^.\s]+)',
                    r'\[([^\]]+)\]\s+Checking',
                    r'\[([^\]]+)\]\s+Searching',
                ]
                
                for pattern in site_check_patterns:
                    site_match = re.search(pattern, line)
                    if site_match:
                        current_site = site_match.group(1)
                        update_session_data(session_id, {"currentSite": current_site})
                        logger.info(f"Currently checking: {current_site}")
                        break
                
                # If no specific site found, but we have progress, show a generic message
                if not any(re.search(pattern, line) for pattern in site_check_patterns) and sites_checked > 0:
                    if not current_site or current_site == "Initializing...":
                        current_site = f"Site {sites_checked}"
                        update_session_data(session_id, {"currentSite": current_site})
                
                # If we're still in initializing phase but have been running for a while, show activity
                if current_site == "Initializing..." and time.time() - start_time > 3:
                    current_site = "Preparing search environment..."
                    session_data = get_session_data(session_id)
                    update_session_data(session_id, {
                        "currentSite": current_site,
                        "progress": max(session_data.get("progress", 0), 4)
                    })
                
                # Look for found results
                result_patterns = [
                    r'Found!',
                    r'Claimed',
                    r'✓',
                    r'\[FOUND\]',
                    r'\[CLAIMED\]',
                    r'Success',
                ]
                
                for pattern in result_patterns:
                    if re.search(pattern, line, re.IGNORECASE):
                        results_found += 1
                        update_session_data(session_id, {"resultsFound": results_found})
                        logger.info(f"Result found! Total: {results_found}")
                        break
                
                # Update progress periodically
                await update_progress()
                
                # Ensure we have some progress even if parsing fails
                session_data = get_session_data(session_id)
                if session_data.get("progress", 0) < 3 and time.time() - start_time > 2:
                    update_session_data(session_id, {
                        "progress": 3,
                        "currentSite": "Starting search process..."
                    })
        
        # Wait for process to complete
        return_code = process.wait()
        
        # Final progress update
        session_data = get_session_data(session_id)
        if session_data.get("progress", 0) < 95 and session_data.get("status") == "running":
            update_session_data(session_id, {
                "progress": 95,
                "currentSite": "Processing results..."
            })
        
        if return_code == 0:
            # Parse JSON results from the generated file
            try:
                logger.info(f"Maigret search completed successfully for session {session_id}")
                # Maigret saves results to a JSON file in the reports directory
                all_results = []
                
                for username in request.usernames:
                    # Look for the JSON file for this username
                    json_filename = f"report_{username}_simple.json"
                    json_path = os.path.join(parent_path, "reports", json_filename)
                    
                    logger.info(f"Looking for JSON file: {json_path}")
                    
                    if os.path.exists(json_path):
                        logger.info(f"Found JSON file for {username}")
                        with open(json_path, 'r') as f:
                            data = json.load(f)
                            all_results.append(data)
                            logger.info(f"Loaded data for {username}: {len(data)} sites")
                    else:
                        logger.warning(f"JSON file not found for {username}: {json_path}")
                        # If file doesn't exist, create empty result
                        all_results.append({"username": username, "sites": {}})
                
                logger.info(f"Processing {len(all_results)} result sets")
                
                # Convert to our format
                formatted_results = []
                for username in request.usernames:
                    user_results = {
                        "username": username,
                        "sites": [],
                        "extractedData": {},
                        "networkGraph": []
                    }
                    
                    # Find results for this username
                    for result_data in all_results:
                        if isinstance(result_data, dict):
                            # The result_data is the sites dict directly (e.g., {"YouTube": {...}, "YouTube User": {...}})
                            logger.info(f"Processing result data with {len(result_data)} sites")
                            for site_name, site_data in result_data.items():
                                if isinstance(site_data, dict) and "status" in site_data:
                                    status = site_data.get("status", {})
                                    # Normalize status to match frontend expectations
                                    raw_status = status.get("status", "unknown") if isinstance(status, dict) else str(status)
                                    normalized_status = raw_status.title() if raw_status.lower() in ["claimed", "unclaimed"] else raw_status
                                    
                                    site_result = {
                                        "siteName": site_name,
                                        "url": site_data.get("url_main", ""),
                                        "status": normalized_status,
                                        "tags": site_data.get("tags", []) if "tags" in site_data else [],
                                        "metadata": site_data.get("metadata", {}),
                                        "urlUser": site_data.get("url_user", "")
                                    }
                                    user_results["sites"].append(site_result)
                                    logger.info(f"Added site {site_name} with status {site_result['status']}")
                    
                    formatted_results.append(user_results)
                    logger.info(f"Formatted results for {username}: {len(user_results['sites'])} sites")
                
                update_session_data(session_id, {
                    "results": formatted_results,
                    "status": "completed",
                    "progress": 100,
                    "completedAt": datetime.now().isoformat()
                })
                
                # Send completion notification via WebSocket
                logger.info(f"About to send WebSocket completion message for session {session_id}")
                logger.info(f"Active WebSocket connections: {list(manager.active_connections.keys())}")
                
                completion_message = {
                    "type": "completed",
                    "data": {
                        "sessionId": session_id,
                        "status": "completed",
                        "progress": 100,
                        "results": formatted_results
                    }
                }
                logger.info(f"Completion message to send: {completion_message}")
                
                try:
                    await manager.send_progress_update(session_id, completion_message)
                    logger.info(f"Successfully sent completion message to session {session_id}")
                except Exception as e:
                    logger.error(f"Failed to send completion message to session {session_id}: {e}")
                    # Try to send via HTTP polling as fallback
                    logger.info(f"Session {session_id} will need to rely on HTTP polling for completion")
                
                logger.info(f"Search completed for session {session_id} with {len(formatted_results)} users")
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse Maigret output: {e}")
                update_session_data(session_id, {
                    "status": "failed",
                    "error": f"Failed to parse results: {e}"
                })
                
                # Send failure notification via WebSocket
                await manager.send_progress_update(session_id, {
                    "type": "failed",
                    "data": {
                        "sessionId": session_id,
                        "status": "failed",
                        "error": f"Failed to parse results: {e}"
                    }
                })
            except Exception as e:
                logger.error(f"Failed to process Maigret results: {e}")
                update_session_data(session_id, {
                    "status": "failed",
                    "error": f"Failed to process results: {e}"
                })
                
                # Send failure notification via WebSocket
                await manager.send_progress_update(session_id, {
                    "type": "failed",
                    "data": {
                        "sessionId": session_id,
                        "status": "failed",
                        "error": f"Failed to process results: {e}"
                    }
                })
        else:
            logger.error(f"Maigret search failed with return code: {return_code}")
            update_session_data(session_id, {
                "status": "failed",
                "error": f"Maigret search failed with return code: {return_code}"
            })
            
            # Send failure notification via WebSocket
            await manager.send_progress_update(session_id, {
                "type": "failed",
                "data": {
                    "sessionId": session_id,
                    "status": "failed",
                    "error": f"Maigret search failed with return code: {return_code}"
                }
            })
        
    except subprocess.TimeoutExpired:
        logger.error(f"Maigret search timed out for session {session_id}")
        update_session_data(session_id, {
            "status": "failed",
            "error": "Search timed out"
        })
        
        # Send timeout notification via WebSocket
        await manager.send_progress_update(session_id, {
            "type": "failed",
            "data": {
                "sessionId": session_id,
                "status": "failed",
                "error": "Search timed out"
            }
        })
    except Exception as e:
        logger.error(f"Search error for session {session_id}: {e}")
        update_session_data(session_id, {
            "status": "failed",
            "error": str(e)
        })
        
        # Send error notification via WebSocket
        await manager.send_progress_update(session_id, {
            "type": "failed",
            "data": {
                "sessionId": session_id,
                "status": "failed",
                "error": str(e)
            }
        })
        
        # Ensure process is terminated if it's still running
        if 'process' in locals() and process.poll() is None:
            process.terminate()

@app.get("/api/search/{session_id}")
async def get_search_status(session_id: str):
    """Get search status"""
    if session_id not in search_sessions:
        raise HTTPException(status_code=404, detail="Search session not found")
    
    # Use thread-safe session data retrieval
    session = get_session_data(session_id)
    
    # Add logging to debug status requests
    logger.info(f"Status request for session {session_id}: status={session.get('status')}, progress={session.get('progress', 0)}")
    
    return SearchResponse(
        success=True,
        data={
            "sessionId": session_id,
            "status": session.get("status", "pending"),
            "progress": session.get("progress", 0),
            "currentSite": session.get("currentSite", None),
            "sitesChecked": session.get("sitesChecked", 0),
            "totalSites": session.get("totalSites", 0),
            "resultsFound": session.get("resultsFound", 0)
        }
    )

@app.get("/api/results/{session_id}")
async def get_search_results(session_id: str):
    """Get search results"""
    if session_id not in search_sessions:
        raise HTTPException(status_code=404, detail="Search session not found")
    
    session = search_sessions[session_id]
    
    if session["status"] != "completed":
        raise HTTPException(status_code=400, detail="Search not completed")
    
    return SearchResponse(success=True, data=session)

@app.post("/api/export")
async def export_results(session_id: str, format: str):
    """Export search results"""
    if session_id not in search_sessions:
        raise HTTPException(status_code=404, detail="Search session not found")
    
    session = search_sessions[session_id]
    
    # In a real implementation, you would generate the actual export file
    # For now, return a mock download URL
    return SearchResponse(
        success=True,
        data={"downloadUrl": f"/api/reports/export_{session_id}.{format}"}
    )

@app.get("/api/reports/{filename}")
async def download_report(filename: str):
    """Download a report file"""
    # In a real implementation, you would serve the actual file
    # For now, return a mock file
    return {"message": f"Download {filename}"}

async def mock_search(session_id: str, request: SearchRequest):
    """Mock search process for demo purposes with WebSocket updates"""
    import asyncio
    
    # Update session status using thread-safe method
    update_session_data(session_id, {
        "status": "running",
        "sitesChecked": 0,
        "totalSites": 10,
        "resultsFound": 0,
        "currentSite": "Starting mock search..."
    })
    
    mock_sites = ["github", "twitter", "instagram", "linkedin", "facebook", "reddit", "youtube", "tiktok", "discord", "steam"]
    
    # Simulate search progress with WebSocket updates
    for i in range(10):
        await asyncio.sleep(1)
        
        # Update session data using thread-safe method
        progress = (i + 1) * 10
        current_site = mock_sites[i] if i < len(mock_sites) else f"Site {i+1}"
        update_session_data(session_id, {
            "progress": progress,
            "sitesChecked": i + 1,
            "currentSite": current_site,
            "resultsFound": i // 2
        })
        
        # Get updated session data for WebSocket message
        session_data = get_session_data(session_id)
        
        # Send WebSocket progress update
        await manager.send_progress_update(session_id, {
            "type": "progress",
            "data": {
                "sessionId": session_id,
                "status": "running",
                "progress": progress,
                "currentSite": session_data["currentSite"],
                "sitesChecked": session_data["sitesChecked"],
                "totalSites": session_data["totalSites"],
                "resultsFound": session_data["resultsFound"]
            }
        })
        
        logger.info(f"Mock search progress: {progress}% - {session_data['currentSite']}")
    
    # Generate mock results
    mock_results = []
    for username in request.usernames:
        user_results = {
            "username": username,
            "sites": [
                {
                    "siteName": "github",
                    "url": f"https://github.com/{username}",
                    "status": "Claimed" if username != "nonexistent" else "Unclaimed",
                    "tags": ["coding", "tech"],
                    "metadata": {},
                    "urlUser": f"https://github.com/{username}" if username != "nonexistent" else None
                },
                {
                    "siteName": "twitter",
                    "url": f"https://twitter.com/{username}",
                    "status": "Claimed" if username != "nonexistent" else "Unclaimed",
                    "tags": ["social", "news"],
                    "metadata": {},
                    "urlUser": f"https://twitter.com/{username}" if username != "nonexistent" else None
                }
            ],
            "extractedData": {},
            "networkGraph": []
        }
        mock_results.append(user_results)
    
    update_session_data(session_id, {
        "results": mock_results,
        "status": "completed",
        "progress": 100,
        "completedAt": datetime.now().isoformat()
    })
    
    # Send completion WebSocket message
    await manager.send_progress_update(session_id, {
        "type": "completed",
        "data": {
            "sessionId": session_id,
            "status": "completed",
            "progress": 100,
            "results": mock_results
        }
    })
    
    logger.info(f"Mock search completed for session {session_id}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
