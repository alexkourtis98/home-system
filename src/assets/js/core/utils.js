/**
 * Utility Functions
 * Common helper functions used across the application
 */

const utils = {
  /**
   * Format currency
   */
  formatCurrency(amount, currency = '€') {
    if (amount === null || amount === undefined) return '-';
    return `${currency}${parseFloat(amount).toFixed(2)}`;
  },

  /**
   * Format date
   */
  formatDate(dateString, format = 'short') {
    if (!dateString) return '-';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    const options = {
      short: { year: 'numeric', month: '2-digit', day: '2-digit' },
      long: { year: 'numeric', month: 'long', day: 'numeric' },
      full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    };

    return date.toLocaleDateString('en-GB', options[format] || options.short);
  },

  /**
   * Format datetime
   */
  formatDateTime(dateString) {
    if (!dateString) return '-';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Capitalize first letter
   */
  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  /**
   * Get status badge HTML
   */
  getStatusBadge(status) {
    const badges = {
      active: '<span class="badge bg-success">Active</span>',
      inactive: '<span class="badge bg-secondary">Inactive</span>',
      pending: '<span class="badge bg-warning">Pending</span>',
      expired: '<span class="badge bg-danger">Expired</span>',
      terminated: '<span class="badge bg-dark">Terminated</span>',
      available: '<span class="badge bg-success">Available</span>',
      occupied: '<span class="badge bg-primary">Occupied</span>',
      maintenance: '<span class="badge bg-warning">Maintenance</span>',
      unavailable: '<span class="badge bg-secondary">Unavailable</span>',
      paid: '<span class="badge bg-success">Paid</span>',
      overdue: '<span class="badge bg-danger">Overdue</span>',
      partial: '<span class="badge bg-warning">Partial</span>'
    };

    return badges[status] || `<span class="badge bg-secondary">${this.capitalize(status)}</span>`;
  },

  /**
   * Debounce function
   */
  debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Validate email
   */
  isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  /**
   * Validate phone
   */
  isValidPhone(phone) {
    // Allow international format with +, -, (, ), spaces, and digits
    const re = /^[\d\s\+\-\(\)]{6,20}$/;
    return re.test(phone);
  },

  /**
   * Sanitize HTML to prevent XSS
   */
  sanitizeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Get query parameters from URL
   */
  getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    for (const [key, value] of params) {
      result[key] = value;
    }
    return result;
  },

  /**
   * Update URL query parameters without reload
   */
  updateQueryParams(params) {
    const url = new URL(window.location);
    Object.keys(params).forEach(key => {
      if (params[key] === null || params[key] === undefined) {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, params[key]);
      }
    });
    window.history.pushState({}, '', url);
  },

  /**
   * Copy to clipboard
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      window.notify?.success('Copied to clipboard');
      return true;
    } catch (error) {
      console.error('Failed to copy:', error);
      window.notify?.error('Failed to copy to clipboard');
      return false;
    }
  },

  /**
   * Handle API error
   */
  handleAPIError(error) {
    console.error('API Error:', error);

    let message = 'An error occurred. Please try again.';

    if (error.data && error.data.message) {
      message = error.data.message;
    } else if (error.message) {
      message = error.message;
    }

    window.notify?.error(message);
    return message;
  },

  /**
   * Confirm dialog (returns Promise)
   */
  async confirm(message, title = 'Confirm') {
    return new Promise((resolve) => {
      const result = window.confirm(`${title}\n\n${message}`);
      resolve(result);
    });
  },

  /**
   * Calculate pagination
   */
  calculatePagination(currentPage, totalPages) {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  },

  /**
   * Generate pagination HTML
   */
  generatePaginationHTML(currentPage, totalPages, onPageClick) {
    if (totalPages <= 1) return '';

    const pages = this.calculatePagination(currentPage, totalPages);

    let html = '<nav><ul class="pagination justify-content-center">';

    // Previous button
    html += `
      <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${currentPage - 1}">Previous</a>
      </li>
    `;

    // Page numbers
    pages.forEach(page => {
      if (page === '...') {
        html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
      } else {
        html += `
          <li class="page-item ${page === currentPage ? 'active' : ''}">
            <a class="page-link" href="#" data-page="${page}">${page}</a>
          </li>
        `;
      }
    });

    // Next button
    html += `
      <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${currentPage + 1}">Next</a>
      </li>
    `;

    html += '</ul></nav>';

    return html;
  }
};

// Make it available globally
window.utils = utils;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = utils;
}
