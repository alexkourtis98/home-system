/**
 * API Configuration
 * Centralized API endpoint configuration
 */

// Determine API base URL based on environment
const getAPIBaseURL = () => {
  // Check if we're in development or production
  const hostname = window.location.hostname;
  const port = window.location.port;

  // If running on localhost, use appropriate port
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Check if we're on Docker port
    if (port === '43217') {
      return `http://${hostname}:${port}/api`;
    }
    // Default development port
    return `http://${hostname}:5000/api`;
  }

  // Production: use same origin
  return `${window.location.origin}/api`;
};

// Export configuration
const API_CONFIG = {
  BASE_URL: getAPIBaseURL(),
  TIMEOUT: 30000, // 30 seconds
  HEADERS: {
    'Content-Type': 'application/json'
  }
};

// Freeze config to prevent modifications
Object.freeze(API_CONFIG);

// Make it available globally
window.API_CONFIG = API_CONFIG;
