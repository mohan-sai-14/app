// Debug helper functions

/**
 * Console logs with timestamp and scope
 */
export function debugLog(scope: string, message: string, data?: any) {
  const timestamp = new Date().toISOString().split('T')[1].substring(0, 8);
  console.log(`[${timestamp}][${scope}] ${message}`);
  if (data !== undefined) {
    console.log(data);
  }
}

/**
 * Test authentication status
 */
export async function checkAuthStatus() {
  try {
    debugLog('AUTH', 'Checking authentication status...');
    const res = await fetch('/api/me', {
      credentials: 'include',
    });
    
    if (res.ok) {
      const user = await res.json();
      debugLog('AUTH', 'User is authenticated:', user);
      return true;
    } else {
      debugLog('AUTH', `Authentication check failed: ${res.status} ${res.statusText}`);
      return false;
    }
  } catch (error) {
    debugLog('AUTH', 'Authentication check error:', error);
    return false;
  }
}

/**
 * Test connection to a specific API endpoint
 */
export async function testApiEndpoint(endpoint: string) {
  try {
    debugLog('API', `Testing endpoint: ${endpoint}`);
    const res = await fetch(endpoint, {
      credentials: 'include',
    });
    
    const status = res.status;
    const statusText = res.statusText;
    
    if (res.ok) {
      debugLog('API', `Endpoint ${endpoint} is accessible: ${status} ${statusText}`);
      try {
        const data = await res.json();
        debugLog('API', 'Response data:', data);
        return { success: true, status, data };
      } catch (e) {
        debugLog('API', 'Could not parse JSON response');
        return { success: true, status, data: null };
      }
    } else {
      debugLog('API', `Endpoint ${endpoint} failed: ${status} ${statusText}`);
      try {
        const errorData = await res.json();
        debugLog('API', 'Error details:', errorData);
        return { success: false, status, error: errorData };
      } catch (e) {
        return { success: false, status, error: statusText };
      }
    }
  } catch (error) {
    debugLog('API', `Network error testing ${endpoint}:`, error);
    return { success: false, status: 0, error };
  }
}