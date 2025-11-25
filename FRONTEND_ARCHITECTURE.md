# Frontend Architecture

This document describes the frontend architecture and core modules introduced to improve code quality, reduce duplication, and provide a consistent development experience.

## 📁 Directory Structure

```
src/assets/js/
├── config/
│   └── api-config.js          # API configuration with environment detection
├── core/
│   ├── api-client.js           # HTTP client with auth and error handling
│   ├── notifications.js        # Toast notification system
│   └── utils.js                # Utility functions
└── pages/
    ├── properties.js           # ✅ Refactored (use as template)
    ├── tenants.js              # ⏳ To be refactored
    ├── leases.js               # ⏳ To be refactored
    ├── payments.js             # ⏳ To be refactored
    └── login.js                # ⏳ To be refactored
```

## 🏗️ Core Modules

### 1. API Configuration (`config/api-config.js`)

Centralized API endpoint configuration with automatic environment detection.

**Features:**
- Auto-detects localhost vs production
- Handles Docker port (43217) and development port (5000)
- Frozen config object to prevent accidental modifications
- Available globally as `window.API_CONFIG`

**Usage:**
```javascript
// Automatically loaded - no manual configuration needed
console.log(API_CONFIG.BASE_URL); // http://localhost:5000/api
```

### 2. API Client (`core/api-client.js`)

Unified HTTP client replacing scattered `fetch()` calls throughout the application.

**Features:**
- Automatic JWT token injection from `localStorage`
- Request timeout handling (30 seconds default)
- Unified error handling
- Auto-redirect to login on 401 Unauthorized
- Consistent response parsing

**Available globally as:** `window.apiClient`

**Methods:**
```javascript
// GET request
const data = await apiClient.get('/properties');
const property = await apiClient.get('/properties/123');

// POST request
const created = await apiClient.post('/properties', {
    title: 'New Property',
    address: '123 Main St'
});

// PUT request
const updated = await apiClient.put('/properties/123', {
    status: 'occupied'
});

// PATCH request
const patched = await apiClient.patch('/properties/123', {
    monthlyRent: 1500
});

// DELETE request
const result = await apiClient.delete('/properties/123');
```

**Error Handling:**
```javascript
try {
    const data = await apiClient.get('/properties');
    // Success
} catch (error) {
    // Error is automatically structured with status and data
    console.error(error.status);    // HTTP status code
    console.error(error.message);   // Error message
    console.error(error.data);      // Full error response

    // Use utils.handleAPIError() for user-friendly error display
    utils.handleAPIError(error);
}
```

### 3. Notification System (`core/notifications.js`)

Toast notifications to replace `alert()` calls throughout the application.

**Features:**
- Four notification types: success, error, warning, info
- Auto-dismiss with configurable duration
- Animated slide-in from right
- Manual close button
- Stacks multiple notifications
- Fully styled with color-coded indicators

**Available globally as:** `window.notify`

**Methods:**
```javascript
// Success notification (green)
notify.success('Property created successfully!');
notify.success('Saved!', 3000); // Custom duration

// Error notification (red)
notify.error('Failed to delete property');

// Warning notification (orange)
notify.warning('Property has active leases');

// Info notification (blue)
notify.info('Loading data...');

// Generic notification with custom type
notify.show('Custom message', 'info', 5000);

// Clear all notifications
notify.clearAll();
```

**Best Practices:**
```javascript
// Replace this:
alert('Success: Property created');

// With this:
notify.success('Property created successfully');

// Replace this:
alert('Error: ' + error.message);

// With this:
utils.handleAPIError(error); // Automatically shows notify.error()
```

### 4. Utility Functions (`core/utils.js`)

Common helper functions used across the application.

**Available globally as:** `window.utils`

#### Formatting Functions

```javascript
// Format currency
utils.formatCurrency(1500);        // €1500.00
utils.formatCurrency(1500, '$');   // $1500.00

// Format date
utils.formatDate('2025-01-15');              // 15/01/2025
utils.formatDate('2025-01-15', 'long');      // 15 January 2025
utils.formatDate('2025-01-15', 'full');      // Monday, 15 January 2025

// Format datetime
utils.formatDateTime('2025-01-15T14:30:00'); // 15/01/2025, 14:30

// Capitalize
utils.capitalize('apartment');               // Apartment
```

#### Status Badge Generation

```javascript
// Get Bootstrap badge HTML
utils.getStatusBadge('active');     // <span class="badge bg-success">Active</span>
utils.getStatusBadge('pending');    // <span class="badge bg-warning">Pending</span>
utils.getStatusBadge('expired');    // <span class="badge bg-danger">Expired</span>

// Available statuses:
// active, inactive, pending, expired, terminated
// available, occupied, maintenance, unavailable
// paid, overdue, partial
```

#### Validation Functions

```javascript
// Email validation
utils.isValidEmail('user@example.com');  // true
utils.isValidEmail('invalid');           // false

// Phone validation (international format)
utils.isValidPhone('+30 123 456 7890');  // true
utils.isValidPhone('123-456-7890');      // true
utils.isValidPhone('abc');               // false
```

#### Security Functions

```javascript
// Sanitize HTML to prevent XSS
utils.sanitizeHTML('<script>alert("xss")</script>'); // &lt;script&gt;...
utils.sanitizeHTML(userInput); // Always sanitize user input before display
```

#### User Interface Functions

```javascript
// Confirmation dialog
const confirmed = await utils.confirm('Delete this property?', 'Confirm Delete');
if (confirmed) {
    // User clicked OK
}

// Copy to clipboard
await utils.copyToClipboard('Text to copy');
// Shows success/error notification automatically

// Handle API errors with user-friendly messages
try {
    await apiClient.delete('/properties/123');
} catch (error) {
    utils.handleAPIError(error); // Shows notify.error() with proper message
}
```

#### Pagination Functions

```javascript
// Calculate pagination pages
const pages = utils.calculatePagination(5, 10);
// Returns: [1, '...', 3, 4, 5, 6, 7, '...', 10]

// Generate pagination HTML
const paginationHTML = utils.generatePaginationHTML(
    currentPage,
    totalPages,
    (page) => changePage(page)
);
document.getElementById('pagination').innerHTML = paginationHTML;
```

#### URL and Query Parameters

```javascript
// Get query parameters
const params = utils.getQueryParams();
// { page: '1', status: 'active' }

// Update query parameters without reload
utils.updateQueryParams({ page: 2, status: 'occupied' });
```

#### Performance Optimization

```javascript
// Debounce function calls
const debouncedSearch = utils.debounce(performSearch, 500);
searchInput.addEventListener('input', debouncedSearch);
```

## 📝 Refactoring Guide

### Example: Refactoring a Page File

**Before (Old Pattern):**
```javascript
// ❌ Hardcoded API URL
const API_BASE_URL = 'http://localhost:5000/api';

// ❌ Manual fetch with repeated code
async function loadData() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/properties`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load');
        }

        const data = await response.json();
        // Process data
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// ❌ Manual HTML escaping
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ❌ Alert for user feedback
function showSuccess(message) {
    alert('Success: ' + message);
}
```

**After (New Pattern):**
```javascript
// ✅ No hardcoded API URL needed

// ✅ Clean API call
async function loadData() {
    try {
        const data = await apiClient.get('/properties');
        // Process data
    } catch (error) {
        utils.handleAPIError(error);
    }
}

// ✅ Use utils functions
const html = utils.sanitizeHTML(property.title);

// ✅ Toast notifications
notify.success('Property created successfully');
```

### Step-by-Step Refactoring Process

1. **Remove hardcoded API_BASE_URL**
   ```javascript
   // Delete this line:
   const API_BASE_URL = 'http://localhost:5000/api';
   ```

2. **Replace fetch() calls with apiClient**
   ```javascript
   // Before:
   const response = await fetch(`${API_BASE_URL}/properties`, {
       headers: {
           'Authorization': `Bearer ${token}`,
           'Content-Type': 'application/json'
       }
   });
   const data = await response.json();

   // After:
   const data = await apiClient.get('/properties');
   ```

3. **Replace alert() with notify**
   ```javascript
   // Before:
   alert('Success: Property created');
   alert('Error: ' + error.message);

   // After:
   notify.success('Property created successfully');
   utils.handleAPIError(error);
   ```

4. **Use utils functions**
   ```javascript
   // Before:
   function escapeHtml(text) { ... }

   // After:
   utils.sanitizeHTML(text)

   // Before:
   property.monthlyRent ? '$' + property.monthlyRent.toLocaleString() : 'N/A'

   // After:
   utils.formatCurrency(property.monthlyRent)

   // Before:
   if (!confirm('Delete this property?')) return;

   // After:
   const confirmed = await utils.confirm('Delete this property?', 'Confirm');
   if (!confirmed) return;
   ```

5. **Update error handling**
   ```javascript
   // Before:
   try {
       // ... API call
   } catch (error) {
       console.error('Error:', error);
       alert('Error loading data');
   }

   // After:
   try {
       // ... API call
   } catch (error) {
       utils.handleAPIError(error); // Shows user-friendly error + logs to console
   }
   ```

## 🎯 Pages to Refactor

### Priority List

1. **✅ properties.js** - COMPLETED (use as reference template)
2. **⏳ tenants.js** - Similar structure to properties.js
3. **⏳ leases.js** - Similar structure to properties.js
4. **⏳ payments.js** - Similar structure to properties.js
5. **⏳ login.js** - Simpler, mainly needs apiClient and notify

### Estimated Effort

Each page refactoring takes approximately:
- Reading and understanding: 10 minutes
- Refactoring: 20-30 minutes
- Testing: 10 minutes
- **Total per page: ~45 minutes**

## 🧪 Testing Checklist

After refactoring each page, test:

- [ ] Page loads without errors
- [ ] API calls work (create, read, update, delete)
- [ ] Toast notifications appear for success/error
- [ ] Error handling works properly
- [ ] Pagination functions correctly
- [ ] Filtering/searching works
- [ ] Form validation works
- [ ] Authentication redirect works (401)

## 🚀 Benefits of New Architecture

### Code Quality
- **-31 lines** in properties.js (446 → 415 lines)
- **Eliminated code duplication** across page files
- **Consistent error handling** throughout application
- **Better separation of concerns**

### User Experience
- **Better error messages** - user-friendly instead of technical
- **Toast notifications** - modern, non-blocking UI feedback
- **Cascade delete feedback** - shows what was deleted
- **Consistent formatting** - currency, dates, statuses

### Developer Experience
- **Centralized API calls** - single place to update
- **Reusable utilities** - don't reinvent the wheel
- **Type safety** - consistent return types
- **Easier debugging** - centralized error handling

### Security
- **XSS prevention** - automatic HTML sanitization
- **Timeout handling** - prevents hanging requests
- **Token management** - automatic injection and refresh

## 📚 Additional Resources

### Core Module Files
- `src/assets/js/config/api-config.js` - API configuration
- `src/assets/js/core/api-client.js` - HTTP client
- `src/assets/js/core/notifications.js` - Notifications
- `src/assets/js/core/utils.js` - Utilities

### Reference Implementation
- `src/assets/js/pages/properties.js` - Complete refactored example

### Backend API Documentation
See `README.md` for API endpoint documentation.

## 🤝 Contributing

When adding new features:

1. **Use core modules** - Don't duplicate functionality
2. **Follow patterns** - Use properties.js as reference
3. **Add utils** - Add reusable functions to utils.js
4. **Update docs** - Document new utilities here

---

**Last Updated:** 2025-11-23
**Architecture Version:** 1.0
