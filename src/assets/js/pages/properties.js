/**
 * Properties Management
 * Refactored to use core modules (apiClient, notify, utils)
 */

// Global variables
let properties = [];
let currentProperty = null;
let currentPage = 1;
const itemsPerPage = 10;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    if (!checkAuth()) return;

    initializeModal();
    loadProperties();
    setupEventListeners();
    loadStats();
});

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../pages/login.html';
        return false;
    }
    return true;
}

// Initialize modal with proper positioning
function initializeModal() {
    const modal = document.getElementById('propertyModal');
    if (modal) {
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.zIndex = '1050';
        modal.style.display = 'none';

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
    const form = document.getElementById('propertyForm');

    // Add Property button
    const addButton = document.querySelector('[data-pc-target="#propertyModal"]');
    if (addButton) {
        addButton.addEventListener('click', function() {
            resetForm();
            document.getElementById('propertyModalLabel').textContent = 'Add Property';
            showModal();
        });
    }

    // Close modal buttons
    document.querySelectorAll('[data-pc-dismiss="modal"]').forEach(btn => {
        btn.addEventListener('click', hideModal);
    });

    // Form submission
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    // Filters
    const statusFilter = document.getElementById('statusFilter');
    const typeFilter = document.getElementById('typeFilter');

    if (statusFilter) statusFilter.addEventListener('change', applyFilters);
    if (typeFilter) typeFilter.addEventListener('change', applyFilters);
}

// Show modal
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
        const data = await apiClient.get('/properties');
        properties = data.data || [];
        renderPropertiesTable();
        updatePagination();
    } catch (error) {
        utils.handleAPIError(error);
    }
}

// Load statistics
async function loadStats() {
    try {
        const data = await apiClient.get('/dashboard/stats');
        updateStatsDisplay(data.data);
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Update stats display
function updateStatsDisplay(stats) {
    const summary = stats?.summary || {};

    const totalEl = document.getElementById('totalProperties');
    const availableEl = document.getElementById('availableProperties');
    const occupiedEl = document.getElementById('occupiedProperties');
    const maintenanceEl = document.getElementById('maintenanceProperties');

    if (totalEl) totalEl.textContent = summary.totalProperties || 0;
    if (availableEl) availableEl.textContent = summary.availableProperties || 0;
    if (occupiedEl) occupiedEl.textContent = summary.occupiedProperties || 0;
    if (maintenanceEl) maintenanceEl.textContent = summary.maintenanceProperties || 0;
}

// Render properties table
function renderPropertiesTable() {
    const tbody = document.getElementById('propertiesTableBody');

    if (!tbody) return;

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
                <div class="font-semibold">${utils.sanitizeHTML(property.title)}</div>
                <small class="text-muted">${utils.sanitizeHTML(property.type || 'N/A')}</small>
            </td>
            <td>
                <div class="text-sm">${utils.sanitizeHTML(property.address || 'N/A')}</div>
            </td>
            <td>${utils.capitalize(property.type || 'N/A')}</td>
            <td>${utils.sanitizeHTML(property.size || 'N/A')}</td>
            <td>${utils.formatCurrency(property.monthlyRent || 0)}</td>
            <td>${utils.getStatusBadge(property.status || 'available')}</td>
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

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const propertyData = Object.fromEntries(formData.entries());

    // Convert monthlyRent to number
    if (propertyData.monthlyRent) {
        propertyData.monthlyRent = parseFloat(propertyData.monthlyRent);

        // Validate positive number
        if (propertyData.monthlyRent < 0) {
            notify.error('Monthly rent cannot be negative');
            return;
        }
    }

    try {
        if (currentProperty) {
            // Update existing property
            await apiClient.put(`/properties/${currentProperty._id}`, propertyData);
            notify.success('Property updated successfully');
        } else {
            // Create new property
            await apiClient.post('/properties', propertyData);
            notify.success('Property created successfully');
        }

        hideModal();
        loadProperties();
        loadStats();
    } catch (error) {
        utils.handleAPIError(error);
    }
}

// Edit property
async function editProperty(propertyId) {
    try {
        const data = await apiClient.get(`/properties/${propertyId}`);
        currentProperty = data.data;
        populateForm(currentProperty);
        document.getElementById('propertyModalLabel').textContent = 'Edit Property';
        showModal();
    } catch (error) {
        utils.handleAPIError(error);
    }
}

// Delete property
async function deleteProperty(propertyId) {
    const confirmed = await utils.confirm(
        'Are you sure you want to delete this property?\n\nThis will also delete all associated expired/terminated leases and payments.',
        'Delete Property'
    );

    if (!confirmed) return;

    try {
        const response = await apiClient.delete(`/properties/${propertyId}`);

        // Show cascade delete info if any records were deleted
        if (response.cascadeDeleted) {
            const { leases, payments } = response.cascadeDeleted;
            if (leases > 0 || payments > 0) {
                notify.info(
                    `Property deleted. Also removed ${leases} expired lease(s) and ${payments} payment record(s).`,
                    6000
                );
            } else {
                notify.success('Property deleted successfully');
            }
        } else {
            notify.success('Property deleted successfully');
        }

        loadProperties();
        loadStats();
    } catch (error) {
        utils.handleAPIError(error);
    }
}

// Populate form with property data
function populateForm(property) {
    const fields = {
        'propertyTitle': property.title,
        'propertyAddress': property.address,
        'propertyType': property.type,
        'propertySize': property.size,
        'monthlyRent': property.monthlyRent,
        'propertyStatus': property.status || 'available',
        'propertyNotes': property.notes
    };

    Object.keys(fields).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.value = fields[id] || '';
        }
    });
}

// Reset form
function resetForm() {
    currentProperty = null;
    const form = document.getElementById('propertyForm');
    if (form) form.reset();
}

// Apply filters
function applyFilters() {
    const statusFilter = document.getElementById('statusFilter')?.value;
    const typeFilter = document.getElementById('typeFilter')?.value;

    let filteredProperties = [...properties];

    if (statusFilter) {
        filteredProperties = filteredProperties.filter(p => p.status === statusFilter);
    }

    if (typeFilter) {
        filteredProperties = filteredProperties.filter(p => p.type === typeFilter);
    }

    // Temporarily update properties for rendering
    const originalProperties = [...properties];
    properties = filteredProperties;
    currentPage = 1;
    renderPropertiesTable();
    updatePagination();
    properties = originalProperties;
}

// Clear filters
function clearFilters() {
    const statusFilter = document.getElementById('statusFilter');
    const typeFilter = document.getElementById('typeFilter');

    if (statusFilter) statusFilter.value = '';
    if (typeFilter) typeFilter.value = '';

    currentPage = 1;
    renderPropertiesTable();
    updatePagination();
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(properties.length / itemsPerPage);
    const pagination = document.getElementById('pagination');

    if (!pagination) return;

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    const pages = utils.calculatePagination(currentPage, totalPages);

    let html = '<ul class="pagination justify-content-center">';

    // Previous button
    html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1}); return false;">Previous</a>
        </li>
    `;

    // Page numbers
    pages.forEach(page => {
        if (page === '...') {
            html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        } else {
            html += `
                <li class="page-item ${page === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changePage(${page}); return false;">${page}</a>
                </li>
            `;
        }
    });

    // Next button
    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1}); return false;">Next</a>
        </li>
    `;

    html += '</ul>';
    pagination.innerHTML = html;
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

    const showingStart = document.getElementById('showingStart');
    const showingEnd = document.getElementById('showingEnd');
    const showingTotal = document.getElementById('showingTotal');

    if (showingStart) showingStart.textContent = properties.length > 0 ? startIndex + 1 : 0;
    if (showingEnd) showingEnd.textContent = endIndex;
    if (showingTotal) showingTotal.textContent = properties.length;
}
