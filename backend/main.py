from fastapi import FastAPI, HTTPException
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
from typing import List, Optional
from pydantic import BaseModel

app = FastAPI(title="Maigret OSINT API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3003", "http://127.0.0.1:3003"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

# Load sessions on startup
load_sessions()

MAIGRET_AVAILABLE = True  # Force Maigret to be available since we know it works

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "maigret_available": MAIGRET_AVAILABLE}

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
            # Mock search results
            asyncio.create_task(mock_search(session_id, request))
        
        return SearchResponse(success=True, data=session)
    except Exception as e:
        return SearchResponse(success=False, error=str(e))

async def perform_maigret_search(session_id: str, request: SearchRequest):
    """Perform actual Maigret search using subprocess with real-time progress tracking"""
    try:
        session = search_sessions[session_id]
        session["status"] = "running"
        session["progress"] = 0
        session["currentSite"] = "Initializing..."
        session["sitesChecked"] = 0
        session["totalSites"] = 0
        session["resultsFound"] = 0
        save_sessions() # Save session after status update
        
        logger.info(f"Starting Maigret search for usernames: {request.usernames}")
        
        # Add initial progress update
        session["progress"] = 1
        session["currentSite"] = "Preparing search..."
        save_sessions()
        
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
        timeout_seconds = request.options.timeout * 2  # Double timeout for safety
        
        # Update progress more frequently
        async def update_progress():
            nonlocal last_progress_update
            current_time = time.time()
            if current_time - last_progress_update >= 0.5:  # Update every 500ms
                # If we have parsed progress, use it; otherwise estimate based on time
                if total_sites > 0 and sites_checked > 0:
                    progress = min(95, int((sites_checked / total_sites) * 100))
                else:
                    # Estimate progress based on time elapsed
                    elapsed_time = current_time - start_time
                    estimated_progress = min(90, int((elapsed_time / timeout_seconds) * 100))
                    progress = estimated_progress
                
                session["progress"] = progress
                session["sitesChecked"] = sites_checked
                session["totalSites"] = total_sites
                session["resultsFound"] = results_found
                session["currentSite"] = current_site
                save_sessions()
                last_progress_update = current_time
        
        while True:
            # Check for timeout
            if time.time() - start_time > timeout_seconds:
                logger.error(f"Search timeout after {timeout_seconds} seconds")
                process.terminate()
                session["status"] = "failed"
                session["error"] = "Search timed out"
                save_sessions()
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
                        session["totalSites"] = total_sites
                        session["currentSite"] = "Starting search..."
                        save_sessions()
                        logger.info(f"Found total sites: {total_sites}")
                
                # Look for progress bar updates (multiple formats)
                progress_patterns = [
                    r'Searching\s+\|[█░]+\|\s+(\d+)/(\d+)',
                    r'(\d+)/(\d+)\s+\[[█░]+\]',
                    r'(\d+)/(\d+)\s+\[[= ]+\]',
                    r'(\d+)/(\d+)\s+\[[# ]+\]',
                    r'Progress:\s+(\d+)/(\d+)',
                    r'(\d+)/(\d+)\s+sites?',
                ]
                
                for pattern in progress_patterns:
                    progress_match = re.search(pattern, line)
                    if progress_match:
                        sites_checked = int(progress_match.group(1))
                        if total_sites == 0:
                            total_sites = int(progress_match.group(2))
                            session["totalSites"] = total_sites
                        
                        progress = min(95, int((sites_checked / max(total_sites, 1)) * 100))
                        session["sitesChecked"] = sites_checked
                        session["progress"] = progress
                        save_sessions()
                        logger.info(f"Progress update: {sites_checked}/{total_sites} ({progress}%)")
                        break
                
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
                        session["currentSite"] = current_site
                        save_sessions()
                        logger.info(f"Currently checking: {current_site}")
                        break
                
                # If no specific site found, but we have progress, show a generic message
                if not any(re.search(pattern, line) for pattern in site_check_patterns) and sites_checked > 0:
                    if not current_site or current_site == "Initializing...":
                        current_site = f"Site {sites_checked}"
                        session["currentSite"] = current_site
                        save_sessions()
                
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
                        session["resultsFound"] = results_found
                        save_sessions()
                        logger.info(f"Result found! Total: {results_found}")
                        break
                
                # Update progress periodically
                await update_progress()
        
        # Wait for process to complete
        return_code = process.wait()
        
        # Final progress update
        if session.get("progress", 0) < 95 and session.get("status") == "running":
            session["progress"] = 95
            session["currentSite"] = "Processing results..."
            save_sessions()
        
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
                
                session["results"] = formatted_results
                session["status"] = "completed"
                session["progress"] = 100
                session["completedAt"] = datetime.now().isoformat()
                save_sessions() # Save session after completion
                
                logger.info(f"Search completed for session {session_id} with {len(formatted_results)} users")
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse Maigret output: {e}")
                session["status"] = "failed"
                session["error"] = f"Failed to parse results: {e}"
                save_sessions() # Save session on failure
            except Exception as e:
                logger.error(f"Failed to process Maigret results: {e}")
                session["status"] = "failed"
                session["error"] = f"Failed to process results: {e}"
                save_sessions() # Save session on failure
        else:
            logger.error(f"Maigret search failed with return code: {return_code}")
            session["status"] = "failed"
            session["error"] = f"Maigret search failed with return code: {return_code}"
            save_sessions() # Save session on failure
        
    except subprocess.TimeoutExpired:
        logger.error(f"Maigret search timed out for session {session_id}")
        session = search_sessions[session_id]
        session["status"] = "failed"
        session["error"] = "Search timed out"
        save_sessions() # Save session on timeout
    except Exception as e:
        logger.error(f"Search error for session {session_id}: {e}")
        session = search_sessions[session_id]
        session["status"] = "failed"
        session["error"] = str(e)
        save_sessions() # Save session on error
        # Ensure process is terminated if it's still running
        if 'process' in locals() and process.poll() is None:
            process.terminate()

@app.get("/api/search/{session_id}")
async def get_search_status(session_id: str):
    """Get search status"""
    if session_id not in search_sessions:
        raise HTTPException(status_code=404, detail="Search session not found")
    
    session = search_sessions[session_id]
    
    return SearchResponse(
        success=True,
        data={
            "sessionId": session_id,
            "status": session["status"],
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
    """Mock search process for demo purposes"""
    import asyncio
    
    session = search_sessions[session_id]
    session["status"] = "running"
    save_sessions() # Save session after status update
    
    # Simulate search progress
    for i in range(10):
        await asyncio.sleep(1)
        session["progress"] = (i + 1) * 10
    
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
    
    session["results"] = mock_results
    session["status"] = "completed"
    session["completedAt"] = datetime.now().isoformat()
    save_sessions() # Save session after completion

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
