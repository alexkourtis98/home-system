// API Configuration
// Automatically detects the API base URL based on the current environment

const getApiBaseUrl = () => {
  // Check if we're in development or production
  const hostname = window.location.hostname;
  const port = window.location.port;
  const protocol = window.location.protocol;

  // If running on localhost, use the configured port (5000)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:5000/api`;
  }

  // In production, use the same host as the frontend
  return `${protocol}//${hostname}${port ? ':' + port : ''}/api`;
};

const API_BASE_URL = getApiBaseUrl();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { API_BASE_URL };
}
