// Properties Management JavaScript
const API_BASE_URL = 'http://localhost:5000/api';

// Global variables
let properties = [];
let currentProperty = null;
let currentPage = 1;
const itemsPerPage = 10;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    initializeModal();
    loadProperties();
    setupEventListeners(); 
    loadStats();
});

// Initialize modal with proper positioning
function initializeModal() {
    const modal = document.getElementById('propertyModal');
    if (modal) {
        // Ensure modal is properly positioned
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.zIndex = '1050';
        modal.style.display = 'none';
        
        // Add backdrop
        modal.addEventListener('show.bs.modal', function() {
            modal.style.display = 'flex';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        });
        
        modal.addEventListener('hide.bs.modal', function() {
            modal.style.display = 'none';
        });
    }
}

// Setup event listeners
function setupEventListeners() {
    // Modal show/hide events
    const modal = document.getElementById('propertyModal');
    const form = document.getElementById('propertyForm');
    
    // Add Property button
    document.querySelector('[data-pc-target="#propertyModal"]').addEventListener('click', function() {
        resetForm();
        document.getElementById('propertyModalLabel').textContent = 'Add Property';
        showModal();
    });
    
    // Close modal buttons
    document.querySelectorAll('[data-pc-dismiss="modal"]').forEach(btn => {
        btn.addEventListener('click', hideModal);
    });
    
    // Form submission
    form.addEventListener('submit', handleFormSubmit);
    
    // Filters
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('typeFilter').addEventListener('change', applyFilters);
}

// Show modal with proper positioning
function showModal() {
    const modal = document.getElementById('propertyModal');
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Hide modal
function hideModal() {
    const modal = document.getElementById('propertyModal');
    modal.style.display = 'none';
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
}

// Load properties from API
async function loadProperties() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/properties`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            properties = data.properties || [];
            renderPropertiesTable();
            updatePagination();
        } else {
            showError('Failed to load properties');
        }
    } catch (error) {
        console.error('Error loading properties:', error);
        showError('Error loading properties');
    }
}

// Load statistics
async function loadStats() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            updateStatsDisplay(stats);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Update stats display
function updateStatsDisplay(stats) {
    document.getElementById('totalProperties').textContent = stats.totalProperties || 0;
    document.getElementById('availableProperties').textContent = stats.availableProperties || 0;
    document.getElementById('occupiedProperties').textContent = stats.occupiedProperties || 0;
    document.getElementById('maintenanceProperties').textContent = stats.maintenanceProperties || 0;
}

// Render properties table
function renderPropertiesTable() {
    const tbody = document.getElementById('propertiesTableBody');
    
    if (properties.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-8">
                    <div class="text-muted">
                        <i class="ti ti-home-2 text-4xl mb-2"></i>
                        <p>No properties found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProperties = properties.slice(startIndex, endIndex);
    
    tbody.innerHTML = paginatedProperties.map(property => `
        <tr>
            <td>
                <div class="font-semibold">${escapeHtml(property.title)}</div>
                <small class="text-muted">${escapeHtml(property.type || 'N/A')}</small>
            </td>
            <td>
                <div class="text-sm">${escapeHtml(property.address || 'N/A')}</div>
            </td>
            <td>${escapeHtml(property.type || 'N/A')}</td>
            <td>${escapeHtml(property.size || 'N/A')}</td>
            <td>${property.monthlyRent ? '$' + property.monthlyRent.toLocaleString() : 'N/A'}</td>
            <td>
                <span class="badge bg-${getStatusColor(property.status)}-500 text-white">
                    ${property.status || 'available'}
                </span>
            </td>
            <td class="text-end">
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary" onclick="editProperty('${property._id}')" title="Edit">
                        <i class="ti ti-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteProperty('${property._id}')" title="Delete">
                        <i class="ti ti-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    updatePaginationInfo();
}

// Get status color
function getStatusColor(status) {
    switch (status) {
        case 'available': return 'success';
        case 'occupied': return 'warning';
        case 'maintenance': return 'danger';
        case 'unavailable': return 'secondary';
        default: return 'primary';
    }
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const propertyData = Object.fromEntries(formData.entries());
    
    // Convert monthlyRent to number
    if (propertyData.monthlyRent) {
        propertyData.monthlyRent = parseFloat(propertyData.monthlyRent);
    }
    
    try {
        const token = localStorage.getItem('token');
        const url = currentProperty 
            ? `${API_BASE_URL}/properties/${currentProperty._id}`
            : `${API_BASE_URL}/properties`;
        
        const method = currentProperty ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(propertyData)
        });
        
        if (response.ok) {
            showSuccess(currentProperty ? 'Property updated successfully' : 'Property added successfully');
            hideModal();
            loadProperties();
            loadStats();
        } else {
            const error = await response.json();
            showError(error.message || 'Failed to save property');
        }
    } catch (error) {
        console.error('Error saving property:', error);
        showError('Error saving property');
    }
}

// Edit property
async function editProperty(propertyId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/properties/${propertyId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const property = await response.json();
            currentProperty = property;
            populateForm(property);
            document.getElementById('propertyModalLabel').textContent = 'Edit Property';
            showModal();
        } else {
            showError('Failed to load property details');
        }
    } catch (error) {
        console.error('Error loading property:', error);
        showError('Error loading property');
    }
}

// Delete property
async function deleteProperty(propertyId) {
    if (!confirm('Are you sure you want to delete this property?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/properties/${propertyId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showSuccess('Property deleted successfully');
            loadProperties();
            loadStats();
        } else {
            const error = await response.json();
            showError(error.message || 'Failed to delete property');
        }
    } catch (error) {
        console.error('Error deleting property:', error);
        showError('Error deleting property');
    }
}

// Populate form with property data
function populateForm(property) {
    document.getElementById('propertyTitle').value = property.title || '';
    document.getElementById('propertyAddress').value = property.address || '';
    document.getElementById('propertyType').value = property.type || '';
    document.getElementById('propertySize').value = property.size || '';
    document.getElementById('monthlyRent').value = property.monthlyRent || '';
    document.getElementById('propertyStatus').value = property.status || 'available';
    document.getElementById('propertyNotes').value = property.notes || '';
}

// Reset form
function resetForm() {
    currentProperty = null;
    document.getElementById('propertyForm').reset();
}

// Apply filters
function applyFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;
    
    let filteredProperties = [...properties];
    
    if (statusFilter) {
        filteredProperties = filteredProperties.filter(p => p.status === statusFilter);
    }
    
    if (typeFilter) {
        filteredProperties = filteredProperties.filter(p => p.type === typeFilter);
    }
    
    // Update the filtered properties array temporarily for rendering
    const originalProperties = [...properties];
    properties = filteredProperties;
    currentPage = 1;
    renderPropertiesTable();
    updatePagination();
    properties = originalProperties;
}

// Clear filters
function clearFilters() {
    document.getElementById('statusFilter').value = '';
    document.getElementById('typeFilter').value = '';
    currentPage = 1;
    renderPropertiesTable();
    updatePagination();
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(properties.length / itemsPerPage);
    const pagination = document.getElementById('pagination');
    
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">Previous</a>
        </li>
    `;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage || (i <= 3) || (i >= totalPages - 2) || (Math.abs(i - currentPage) <= 1)) {
            paginationHTML += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
                </li>
            `;
        } else if (i === 4 && currentPage > 6) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        } else if (i === totalPages - 3 && currentPage < totalPages - 5) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    
    // Next button
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">Next</a>
        </li>
    `;
    
    pagination.innerHTML = paginationHTML;
}

// Change page
function changePage(page) {
    const totalPages = Math.ceil(properties.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderPropertiesTable();
        updatePagination();
    }
}

// Update pagination info
function updatePaginationInfo() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, properties.length);
    
    document.getElementById('showingStart').textContent = properties.length > 0 ? startIndex + 1 : 0;
    document.getElementById('showingEnd').textContent = endIndex;
    document.getElementById('showingTotal').textContent = properties.length;
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showSuccess(message) {
    // Simple alert for now - can be replaced with toast notification
    alert('Success: ' + message);
}

function showError(message) {
    // Simple alert for now - can be replaced with toast notification
    alert('Error: ' + message);
}

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../pages/login.html';
        return false;
    }
    return true;
}

// Initialize auth check
if (!checkAuth()) {
    // Redirect will happen in checkAuth
} 