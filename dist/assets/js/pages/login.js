// Login Page JavaScript
const API_BASE_URL = 'http://localhost:5000/api';

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    if (localStorage.getItem('token')) {
        window.location.href = '../dashboard/index.html';
        return;
    }
    
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    const form = document.getElementById('loginForm');
    if (form) {
        form.addEventListener('submit', handleLogin);
    }
    
    // Demo credentials buttons
    const demoButtons = document.querySelectorAll('.demo-credentials');
    demoButtons.forEach(button => {
        button.addEventListener('click', function() {
            document.getElementById('username').value = 'admin';
            document.getElementById('password').value = 'admin123';
        });
    });
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('loginBtn');
    const originalText = submitBtn.textContent;
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="ti ti-loader animate-spin mr-2"></i>Signing in...';
    
    const formData = new FormData(e.target);
    const loginData = {
        username: formData.get('username'),
        password: formData.get('password')
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Store token
            localStorage.setItem('token', data.token);
            
            // Show success message
            showMessage('Login successful! Redirecting...', 'success');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '../dashboard/index.html';
            }, 1000);
            
        } else {
            const error = await response.json();
            showMessage(error.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Network error. Please check your connection.', 'error');
    } finally {
        // Reset button state
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Show message to user
function showMessage(message, type) {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    // Create new alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type === 'error' ? 'danger' : 'success'} mb-3`;
    alert.innerHTML = `
        <div class="flex items-center">
            <i class="ti ti-${type === 'error' ? 'alert-circle' : 'check-circle'} mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Insert alert before the form
    const form = document.getElementById('loginForm');
    if (form) {
        form.parentNode.insertBefore(alert, form);
        
        // Auto-remove success messages
        if (type === 'success') {
            setTimeout(() => {
                alert.remove();
            }, 3000);
        }
    }
}

// Check if server is running
async function checkServerStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            showServerWarning();
        }
    } catch (error) {
        showServerWarning();
    }
}

// Show server warning
function showServerWarning() {
    const warning = document.createElement('div');
    warning.className = 'alert alert-warning mb-3';
    warning.innerHTML = `
        <div class="flex items-center">
            <i class="ti ti-alert-triangle mr-2"></i>
            <span>Server is not running. Please start the backend server first.</span>
        </div>
    `;
    
    const form = document.getElementById('loginForm');
    if (form) {
        form.parentNode.insertBefore(warning, form);
    }
}

// Check server status on page load
setTimeout(checkServerStatus, 1000); 