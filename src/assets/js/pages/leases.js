// Leases Management JavaScript
const API_BASE_URL = 'http://localhost:5000/api';

// Global variables
let leases = [];
let properties = [];
let tenants = [];
let currentLease = null;
let currentPage = 1;
const itemsPerPage = 10;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    initializeModal();
    loadLeases();
    loadProperties();
    loadTenants();
    setupEventListeners();
    loadStats();
});

// Initialize modal with proper positioning
function initializeModal() {
    const modal = document.getElementById('leaseModal');
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
    const form = document.getElementById('leaseForm');
    
    // Add Lease button
    document.querySelector('[data-pc-target="#leaseModal"]').addEventListener('click', function() {
        resetForm();
        document.getElementById('leaseModalLabel').textContent = 'Add Lease';
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
    const modal = document.getElementById('leaseModal');
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Hide modal
function hideModal() {
    const modal = document.getElementById('leaseModal');
    modal.style.display = 'none';
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
}

// Load leases from API
async function loadLeases() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/leases`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            leases = data.leases || [];
            renderLeasesTable();
            updatePagination();
        } else {
            showError('Failed to load leases');
        }
    } catch (error) {
        console.error('Error loading leases:', error);
        showError('Error loading leases');
    }
}

// Load properties for dropdown
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
            populatePropertyDropdown();
        }
    } catch (error) {
        console.error('Error loading properties:', error);
    }
}

// Load tenants for dropdown
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
            populateTenantDropdown();
        }
    } catch (error) {
        console.error('Error loading tenants:', error);
    }
}

// Populate property dropdown
function populatePropertyDropdown() {
    const select = document.getElementById('leaseProperty');
    if (select) {
        select.innerHTML = '<option value="">Select Property</option>';
        properties.filter(p => p.status === 'available').forEach(property => {
            const option = document.createElement('option');
            option.value = property._id;
            option.textContent = `${property.title} - ${property.address}`;
            select.appendChild(option);
        });
    }
}

// Populate tenant dropdown
function populateTenantDropdown() {
    const select = document.getElementById('leaseTenant');
    if (select) {
        select.innerHTML = '<option value="">Select Tenant</option>';
        tenants.filter(t => t.status === 'active').forEach(tenant => {
            const option = document.createElement('option');
            option.value = tenant._id;
            option.textContent = `${tenant.name} - ${tenant.phone}`;
            select.appendChild(option);
        });
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
    document.getElementById('totalLeases').textContent = stats.totalLeases || 0;
    document.getElementById('activeLeases').textContent = stats.activeLeases || 0;
    document.getElementById('expiringSoon').textContent = stats.expiringSoon || 0;
}

// Render leases table
function renderLeasesTable() {
    const tbody = document.getElementById('leasesTableBody');
    
    if (leases.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-8">
                    <div class="text-muted">
                        <i class="ti ti-file-text text-4xl mb-2"></i>
                        <p>No leases found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedLeases = leases.slice(startIndex, endIndex);
    
    tbody.innerHTML = paginatedLeases.map(lease => `
        <tr>
            <td>
                <div class="font-semibold">${escapeHtml(lease.property?.title || 'N/A')}</div>
                <small class="text-muted">${escapeHtml(lease.property?.address || 'N/A')}</small>
            </td>
            <td>
                <div class="font-semibold">${escapeHtml(lease.tenant?.name || 'N/A')}</div>
                <small class="text-muted">${escapeHtml(lease.tenant?.phone || 'N/A')}</small>
            </td>
            <td>
                <div class="text-sm">
                    Start: ${lease.startDate ? new Date(lease.startDate).toLocaleDateString() : 'N/A'}<br>
                    End: ${lease.endDate ? new Date(lease.endDate).toLocaleDateString() : 'N/A'}
                </div>
            </td>
            <td>$${lease.monthlyRent ? lease.monthlyRent.toLocaleString() : '0'}</td>
            <td>$${lease.securityDeposit ? lease.securityDeposit.toLocaleString() : '0'}</td>
            <td>
                <span class="badge bg-${getLeaseStatusColor(lease.status)}-500 text-white">
                    ${lease.status || 'active'}
                </span>
            </td>
            <td class="text-end">
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary" onclick="editLease('${lease._id}')" title="Edit">
                        <i class="ti ti-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteLease('${lease._id}')" title="Delete">
                        <i class="ti ti-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    updatePaginationInfo();
}

// Get lease status color
function getLeaseStatusColor(status) {
    switch (status) {
        case 'active': return 'success';
        case 'expired': return 'danger';
        case 'terminated': return 'warning';
        case 'draft': return 'secondary';
        default: return 'primary';
    }
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const leaseData = Object.fromEntries(formData.entries());
    
    // Convert numeric fields
    if (leaseData.monthlyRent) leaseData.monthlyRent = parseFloat(leaseData.monthlyRent);
    if (leaseData.deposit) leaseData.securityDeposit = parseFloat(leaseData.deposit);
    delete leaseData.deposit;
    
    try {
        const token = localStorage.getItem('token');
        const url = currentLease 
            ? `${API_BASE_URL}/leases/${currentLease._id}`
            : `${API_BASE_URL}/leases`;
        
        const method = currentLease ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(leaseData)
        });
        
        if (response.ok) {
            showSuccess(currentLease ? 'Lease updated successfully' : 'Lease added successfully');
            hideModal();
            loadLeases();
            loadProperties(); // Reload to update available properties
            loadStats();
        } else {
            const error = await response.json();
            showError(error.message || 'Failed to save lease');
        }
    } catch (error) {
        console.error('Error saving lease:', error);
        showError('Error saving lease');
    }
}

// Edit lease
async function editLease(leaseId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/leases/${leaseId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const lease = await response.json();
            currentLease = lease;
            populateForm(lease);
            document.getElementById('leaseModalLabel').textContent = 'Edit Lease';
            showModal();
        } else {
            showError('Failed to load lease details');
        }
    } catch (error) {
        console.error('Error loading lease:', error);
        showError('Error loading lease');
    }
}

// Delete lease
async function deleteLease(leaseId) {
    if (!confirm('Are you sure you want to delete this lease?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/leases/${leaseId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showSuccess('Lease deleted successfully');
            loadLeases();
            loadProperties(); // Reload to update available properties
            loadStats();
        } else {
            const error = await response.json();
            showError(error.message || 'Failed to delete lease');
        }
    } catch (error) {
        console.error('Error deleting lease:', error);
        showError('Error deleting lease');
    }
}

// Populate form with lease data
function populateForm(lease) {
    document.getElementById('leaseProperty').value = lease.property?._id || '';
    document.getElementById('leaseTenant').value = lease.tenant?._id || '';
    document.getElementById('startDate').value = lease.startDate ? lease.startDate.split('T')[0] : '';
    document.getElementById('endDate').value = lease.endDate ? lease.endDate.split('T')[0] : '';
    document.getElementById('leaseMonthlyRent').value = lease.monthlyRent || '';
    document.getElementById('leaseDeposit').value = lease.securityDeposit || '';
    document.getElementById('leaseStatus').value = lease.status || 'active';
    document.getElementById('leaseNotes').value = lease.notes || '';
    
    // Handle utilities
    if (lease.utilities) {
        document.getElementById('utilitiesIncluded').checked = !!lease.utilities.included;
        document.getElementById('utilitiesNotes').value = lease.utilities.notes || '';
    }
}

// Reset form
function resetForm() {
    currentLease = null;
    document.getElementById('leaseForm').reset();
}

// Apply filters
function applyFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    const searchFilter = document.getElementById('searchFilter').value.toLowerCase();
    
    let filteredLeases = [...leases];
    
    if (statusFilter) {
        filteredLeases = filteredLeases.filter(l => l.status === statusFilter);
    }
    
    if (searchFilter) {
        filteredLeases = filteredLeases.filter(l => 
            (l.property?.title && l.property.title.toLowerCase().includes(searchFilter)) ||
            (l.tenant?.name && l.tenant.name.toLowerCase().includes(searchFilter)) ||
            (l.property?.address && l.property.address.toLowerCase().includes(searchFilter))
        );
    }
    
    const originalLeases = [...leases];
    leases = filteredLeases;
    currentPage = 1;
    renderLeasesTable();
    updatePagination();
    leases = originalLeases;
}

// Clear filters
function clearFilters() {
    document.getElementById('statusFilter').value = '';
    document.getElementById('searchFilter').value = '';
    currentPage = 1;
    renderLeasesTable();
    updatePagination();
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(leases.length / itemsPerPage);
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
    const totalPages = Math.ceil(leases.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderLeasesTable();
        updatePagination();
    }
}

// Update pagination info
function updatePaginationInfo() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, leases.length);
    
    document.getElementById('showingStart').textContent = leases.length > 0 ? startIndex + 1 : 0;
    document.getElementById('showingEnd').textContent = endIndex;
    document.getElementById('showingTotal').textContent = leases.length;
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