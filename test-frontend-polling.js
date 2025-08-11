// Test script to simulate frontend polling behavior
const API_BASE_URL = 'http://localhost:8000';

async function testFrontendPolling() {
  console.log('=== Testing Frontend Polling Behavior ===');
  
  try {
    // 1. Start a search
    console.log('1. Starting search...');
    const startTime = Date.now();
    
    const searchResponse = await fetch(`${API_BASE_URL}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usernames: ['frontendtest123'],
        options: { topSites: 100, timeout: 60 }
      })
    });
    
    const searchResponseTime = Date.now() - startTime;
    console.log(`   Search POST took ${searchResponseTime}ms`);
    
    const searchData = await searchResponse.json();
    if (!searchData.success) {
      throw new Error(`Search failed: ${searchData.error}`);
    }
    
    const sessionId = searchData.data.id;
    console.log(`   Session created: ${sessionId}`);
    
    // 2. Start polling immediately
    console.log('2. Starting polling...');
    let pollCount = 0;
    const maxPolls = 30; // Poll for up to 30 seconds
    
    const pollInterval = setInterval(async () => {
      pollCount++;
      console.log(`   Poll ${pollCount}: Checking status...`);
      
      try {
        const statusResponse = await fetch(`${API_BASE_URL}/api/search/${sessionId}`);
        const statusData = await statusResponse.json();
        console.log(`   Poll ${pollCount}: Full response:`, JSON.stringify(statusData));
        
        if (statusData.success && statusData.data) {
          const { status, progress, sitesChecked, totalSites } = statusData.data;
          console.log(`   Poll ${pollCount}: Status=${status}, Progress=${progress}%, Sites=${sitesChecked}/${totalSites}`);
          
          if (status === 'completed' || status === 'failed') {
            console.log(`3. Search ${status}! Stopping polling.`);
            clearInterval(pollInterval);
            return;
          }
        } else {
          console.log(`   Poll ${pollCount}: Error - ${statusData.error || 'No data'}`);
        }
      } catch (error) {
        console.log(`   Poll ${pollCount}: Network error - ${error.message}`);
      }
      
      if (pollCount >= maxPolls) {
        console.log('   Max polls reached, stopping');
        clearInterval(pollInterval);
      }
    }, 1000); // Poll every second
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testFrontendPolling();