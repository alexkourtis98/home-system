/**
 * API Client Module
 * Centralized HTTP client with authentication and error handling
 */

class APIClient {
  constructor() {
    this.baseURL = window.API_CONFIG?.BASE_URL || 'http://localhost:5000/api';
    this.timeout = window.API_CONFIG?.TIMEOUT || 30000;
  }

  /**
   * Get authentication token from localStorage
   */
  getToken() {
    return localStorage.getItem('token');
  }

  /**
   * Get default headers with authentication
   */
  getHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...customHeaders
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Handle HTTP response
   */
  async handleResponse(response) {
    const contentType = response.headers.get('content-type');
    const isJSON = contentType && contentType.includes('application/json');

    // Parse response body
    const data = isJSON ? await response.json() : await response.text();

    // Check if response is successful
    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401) {
        this.handleUnauthorized();
      }

      // Throw error with response data
      const error = new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  /**
   * Handle unauthorized access
   */
  handleUnauthorized() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/pages/login.html';
  }

  /**
   * Make HTTP request
   */
  async request(endpoint, options = {}) {
    const { method = 'GET', body, headers = {}, timeout = this.timeout } = options;

    const url = `${this.baseURL}${endpoint}`;
    const config = {
      method,
      headers: this.getHeaders(headers)
    };

    // Add body if present (for POST, PUT, PATCH)
    if (body && method !== 'GET' && method !== 'HEAD') {
      config.body = JSON.stringify(body);
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    config.signal = controller.signal;

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);
      return await this.handleResponse(response);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * GET request
   */
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * PATCH request
   */
  async patch(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body });
  }

  /**
   * DELETE request
   */
  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

// Create singleton instance
const apiClient = new APIClient();

// Make it available globally
window.apiClient = apiClient;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = apiClient;
}
