// Tenants Management JavaScript
const API_BASE_URL = 'http://localhost:5000/api';

// Global variables
let tenants = [];
let currentTenant = null;
let currentPage = 1;
const itemsPerPage = 10;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    initializeModal();
    loadTenants();
    setupEventListeners();
    loadStats();
});

// Initialize modal with proper positioning
function initializeModal() {
    const modal = document.getElementById('tenantModal');
    if (modal) {
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.zIndex = '1050';
        modal.style.display = 'none';
    }
}

// Setup event listeners
function setupEventListeners() {
    const form = document.getElementById('tenantForm');
    
    // Add Tenant button
    document.querySelector('[data-pc-target="#tenantModal"]').addEventListener('click', function() {
        resetForm();
        document.getElementById('tenantModalLabel').textContent = 'Add Tenant';
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
    document.getElementById('searchFilter').addEventListener('input', applyFilters);
}

// Show modal
function showModal() {
    const modal = document.getElementById('tenantModal');
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Hide modal
function hideModal() {
    const modal = document.getElementById('tenantModal');
    modal.style.display = 'none';
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
}

// Load tenants from API
async function loadTenants() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/tenants`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            tenants = data.tenants || [];
            renderTenantsTable();
            updatePagination();
        } else {
            showError('Failed to load tenants');
        }
    } catch (error) {
        console.error('Error loading tenants:', error);
        showError('Error loading tenants');
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
    document.getElementById('totalTenants').textContent = stats.totalTenants || 0;
    document.getElementById('activeTenants').textContent = stats.activeTenants || 0;
}

// Render tenants table
function renderTenantsTable() {
    const tbody = document.getElementById('tenantsTableBody');
    
    if (tenants.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-8">
                    <div class="text-muted">
                        <i class="ti ti-users text-4xl mb-2"></i>
                        <p>No tenants found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedTenants = tenants.slice(startIndex, endIndex);
    
    tbody.innerHTML = paginatedTenants.map(tenant => `
        <tr>
            <td>
                <div class="font-semibold">${escapeHtml(tenant.name)}</div>
                <small class="text-muted">${escapeHtml(tenant.email || 'N/A')}</small>
            </td>
            <td>
                <div>${escapeHtml(tenant.phone || 'N/A')}</div>
                <small class="text-muted">${escapeHtml(tenant.email || 'N/A')}</small>
            </td>
            <td>${escapeHtml(tenant.idPassport || 'N/A')}</td>
            <td>
                <span class="badge bg-${tenant.status === 'active' ? 'success' : 'secondary'}-500 text-white">
                    ${tenant.status || 'active'}
                </span>
            </td>
            <td>
                <small class="text-muted">
                    ${tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : 'N/A'}
                </small>
            </td>
            <td class="text-end">
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary" onclick="editTenant('${tenant._id}')" title="Edit">
                        <i class="ti ti-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteTenant('${tenant._id}')" title="Delete">
                        <i class="ti ti-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    updatePaginationInfo();
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const tenantData = Object.fromEntries(formData.entries());
    
    // Handle emergency contact
    if (tenantData['emergencyContact.name'] || tenantData['emergencyContact.phone'] || tenantData['emergencyContact.relationship']) {
        tenantData.emergencyContact = {
            name: tenantData['emergencyContact.name'] || '',
            phone: tenantData['emergencyContact.phone'] || '',
            relationship: tenantData['emergencyContact.relationship'] || ''
        };
        delete tenantData['emergencyContact.name'];
        delete tenantData['emergencyContact.phone'];
        delete tenantData['emergencyContact.relationship'];
    }
    
    try {
        const token = localStorage.getItem('token');
        const url = currentTenant 
            ? `${API_BASE_URL}/tenants/${currentTenant._id}`
            : `${API_BASE_URL}/tenants`;
        
        const method = currentTenant ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tenantData)
        });
        
        if (response.ok) {
            showSuccess(currentTenant ? 'Tenant updated successfully' : 'Tenant added successfully');
            hideModal();
            loadTenants();
            loadStats();
        } else {
            const error = await response.json();
            showError(error.message || 'Failed to save tenant');
        }
    } catch (error) {
        console.error('Error saving tenant:', error);
        showError('Error saving tenant');
    }
}

// Edit tenant
async function editTenant(tenantId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const tenant = await response.json();
            currentTenant = tenant;
            populateForm(tenant);
            document.getElementById('tenantModalLabel').textContent = 'Edit Tenant';
            showModal();
        } else {
            showError('Failed to load tenant details');
        }
    } catch (error) {
        console.error('Error loading tenant:', error);
        showError('Error loading tenant');
    }
}

// Delete tenant
async function deleteTenant(tenantId) {
    if (!confirm('Are you sure you want to delete this tenant?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showSuccess('Tenant deleted successfully');
            loadTenants();
            loadStats();
        } else {
            const error = await response.json();
            showError(error.message || 'Failed to delete tenant');
        }
    } catch (error) {
        console.error('Error deleting tenant:', error);
        showError('Error deleting tenant');
    }
}

// Populate form with tenant data
function populateForm(tenant) {
    document.getElementById('tenantName').value = tenant.name || '';
    document.getElementById('tenantPhone').value = tenant.phone || '';
    document.getElementById('tenantEmail').value = tenant.email || '';
    document.getElementById('tenantIdPassport').value = tenant.idPassport || '';
    document.getElementById('tenantStatus').value = tenant.status || 'active';
    document.getElementById('tenantNotes').value = tenant.notes || '';
    
    // Emergency contact
    if (tenant.emergencyContact) {
        document.getElementById('emergencyName').value = tenant.emergencyContact.name || '';
        document.getElementById('emergencyPhone').value = tenant.emergencyContact.phone || '';
        document.getElementById('emergencyRelationship').value = tenant.emergencyContact.relationship || '';
    }
}

// Reset form
function resetForm() {
    currentTenant = null;
    document.getElementById('tenantForm').reset();
}

// Apply filters
function applyFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    const searchFilter = document.getElementById('searchFilter').value.toLowerCase();
    
    let filteredTenants = [...tenants];
    
    if (statusFilter) {
        filteredTenants = filteredTenants.filter(t => t.status === statusFilter);
    }
    
    if (searchFilter) {
        filteredTenants = filteredTenants.filter(t => 
            t.name.toLowerCase().includes(searchFilter) ||
            (t.email && t.email.toLowerCase().includes(searchFilter)) ||
            (t.phone && t.phone.includes(searchFilter)) ||
            (t.idPassport && t.idPassport.toLowerCase().includes(searchFilter))
        );
    }
    
    const originalTenants = [...tenants];
    tenants = filteredTenants;
    currentPage = 1;
    renderTenantsTable();
    updatePagination();
    tenants = originalTenants;
}

// Clear filters
function clearFilters() {
    document.getElementById('statusFilter').value = '';
    document.getElementById('searchFilter').value = '';
    currentPage = 1;
    renderTenantsTable();
    updatePagination();
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(tenants.length / itemsPerPage);
    const pagination = document.getElementById('pagination');
    
    let paginationHTML = '';
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    // Previous button
    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">Previous</a>
        </li>
    `;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
            </li>
        `;
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
    const totalPages = Math.ceil(tenants.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderTenantsTable();
        updatePagination();
    }
}

// Update pagination info
function updatePaginationInfo() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, tenants.length);
    
    document.getElementById('showingStart').textContent = tenants.length > 0 ? startIndex + 1 : 0;
    document.getElementById('showingEnd').textContent = endIndex;
    document.getElementById('showingTotal').textContent = tenants.length;
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showSuccess(message) {
    alert('Success: ' + message);
}

function showError(message) {
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