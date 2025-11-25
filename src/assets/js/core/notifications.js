/**
 * Notification System
 * Toast notifications to replace alert() calls
 */

class NotificationSystem {
  constructor() {
    this.container = null;
    this.init();
  }

  /**
   * Initialize notification container
   */
  init() {
    // Create container if it doesn't exist
    if (!document.getElementById('notification-container')) {
      this.container = document.createElement('div');
      this.container.id = 'notification-container';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 400px;
      `;
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('notification-container');
    }
  }

  /**
   * Show notification
   */
  show(message, type = 'info', duration = 4000) {
    const notification = this.createNotification(message, type);
    this.container.appendChild(notification);

    // Trigger animation
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(notification);
      }, duration);
    }

    return notification;
  }

  /**
   * Create notification element
   */
  createNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;

    // Get icon and color based on type
    const config = this.getTypeConfig(type);

    notification.style.cssText = `
      background: white;
      border-left: 4px solid ${config.color};
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      padding: 16px;
      display: flex;
      align-items: start;
      gap: 12px;
      opacity: 0;
      transform: translateX(400px);
      transition: all 0.3s ease;
      max-width: 400px;
      word-wrap: break-word;
    `;

    notification.innerHTML = `
      <div style="flex-shrink: 0; color: ${config.color}; font-size: 20px;">
        ${config.icon}
      </div>
      <div style="flex: 1; color: #333; font-size: 14px; line-height: 1.5;">
        ${message}
      </div>
      <button class="notification-close" style="
        flex-shrink: 0;
        background: none;
        border: none;
        color: #999;
        cursor: pointer;
        font-size: 20px;
        line-height: 1;
        padding: 0;
        width: 20px;
        height: 20px;
      ">×</button>
    `;

    // Add show class styles
    notification.classList.add('notification');
    const style = document.createElement('style');
    style.textContent = `
      .notification.show {
        opacity: 1 !important;
        transform: translateX(0) !important;
      }
    `;
    if (!document.getElementById('notification-styles')) {
      style.id = 'notification-styles';
      document.head.appendChild(style);
    }

    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
      this.dismiss(notification);
    });

    return notification;
  }

  /**
   * Get type configuration
   */
  getTypeConfig(type) {
    const configs = {
      success: {
        color: '#10b981',
        icon: '✓'
      },
      error: {
        color: '#ef4444',
        icon: '✕'
      },
      warning: {
        color: '#f59e0b',
        icon: '⚠'
      },
      info: {
        color: '#3b82f6',
        icon: 'ℹ'
      }
    };

    return configs[type] || configs.info;
  }

  /**
   * Dismiss notification
   */
  dismiss(notification) {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(400px)';

    setTimeout(() => {
      notification.remove();
    }, 300);
  }

  /**
   * Shortcut methods
   */
  success(message, duration) {
    return this.show(message, 'success', duration);
  }

  error(message, duration) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration) {
    return this.show(message, 'info', duration);
  }

  /**
   * Clear all notifications
   */
  clearAll() {
    const notifications = this.container.querySelectorAll('.notification');
    notifications.forEach(notification => {
      this.dismiss(notification);
    });
  }
}

// Create singleton instance
const notify = new NotificationSystem();

// Make it available globally
window.notify = notify;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = notify;
}
