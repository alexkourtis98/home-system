// Payments Management JavaScript
const API_BASE_URL = 'http://localhost:5000/api';

// Global variables
let payments = [];
let leases = [];
let currentPayment = null;
let currentPage = 1;
const itemsPerPage = 10;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    initializeModals();
    loadPayments();
    loadLeases();
    setupEventListeners();
    loadStats();
    populateFilters();
});

// Initialize modals with proper positioning
function initializeModals() {
    const modals = ['paymentModal', 'generatePaymentsModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.zIndex = '1050';
            modal.style.display = 'none';
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    const paymentForm = document.getElementById('paymentForm');
    const generateForm = document.getElementById('generatePaymentsForm');
    
    // Add Payment button
    document.querySelector('[data-pc-target="#paymentModal"]').addEventListener('click', function() {
        resetPaymentForm();
        document.getElementById('paymentModalLabel').textContent = 'Add Payment';
        showModal('paymentModal');
    });
    
    // Generate Payments button
    document.querySelector('[data-pc-target="#generatePaymentsModal"]').addEventListener('click', function() {
        showModal('generatePaymentsModal');
    });
    
    // Close modal buttons
    document.querySelectorAll('[data-pc-dismiss="modal"]').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = btn.closest('.modal');
            if (modal) hideModal(modal.id);
        });
    });
    
    // Form submissions
    if (paymentForm) paymentForm.addEventListener('submit', handlePaymentFormSubmit);
    if (generateForm) generateForm.addEventListener('submit', handleGeneratePayments);
    
    // Filters
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('monthFilter').addEventListener('change', applyFilters);
    document.getElementById('yearFilter').addEventListener('change', applyFilters);
    document.getElementById('searchFilter').addEventListener('input', applyFilters);
}

// Show modal
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Hide modal
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'none';
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
}

// Load payments from API
async function loadPayments() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/payments`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            payments = data.payments || [];
            renderPaymentsTable();
            updatePagination();
        } else {
            showError('Failed to load payments');
        }
    } catch (error) {
        console.error('Error loading payments:', error);
        showError('Error loading payments');
    }
}

// Load leases for dropdown
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
            populateLeaseDropdown();
        }
    } catch (error) {
        console.error('Error loading leases:', error);
    }
}

// Populate lease dropdown
function populateLeaseDropdown() {
    const select = document.getElementById('paymentLease');
    if (select) {
        select.innerHTML = '<option value="">Select Lease</option>';
        leases.forEach(lease => {
            const option = document.createElement('option');
            option.value = lease._id;
            option.textContent = `${lease.property?.title || 'Unknown Property'} - ${lease.tenant?.name || 'Unknown Tenant'}`;
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
    document.getElementById('expectedAmount').textContent = '$' + (stats.expectedAmount || 0).toLocaleString();
    document.getElementById('collectedAmount').textContent = '$' + (stats.collectedAmount || 0).toLocaleString();
    document.getElementById('pendingAmount').textContent = '$' + (stats.pendingAmount || 0).toLocaleString();
    
    const expectedAmount = stats.expectedAmount || 0;
    const collectedAmount = stats.collectedAmount || 0;
    const collectionRate = expectedAmount > 0 ? Math.round((collectedAmount / expectedAmount) * 100) : 0;
    document.getElementById('collectionRate').textContent = collectionRate + '%';
}

// Populate filters
function populateFilters() {
    const monthFilter = document.getElementById('monthFilter');
    const yearFilter = document.getElementById('yearFilter');
    const paymentYearSelect = document.getElementById('paymentYear');
    const generateYearSelect = document.getElementById('generateYear');
    
    // Populate months
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.textContent = month;
        monthFilter.appendChild(option);
    });
    
    // Populate years (current year and previous/next years)
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 2; year <= currentYear + 1; year++) {
        const yearOption1 = document.createElement('option');
        yearOption1.value = year;
        yearOption1.textContent = year;
        yearFilter.appendChild(yearOption1);
        
        if (paymentYearSelect) {
            const yearOption2 = document.createElement('option');
            yearOption2.value = year;
            yearOption2.textContent = year;
            paymentYearSelect.appendChild(yearOption2);
        }
        
        if (generateYearSelect) {
            const yearOption3 = document.createElement('option');
            yearOption3.value = year;
            yearOption3.textContent = year;
            generateYearSelect.appendChild(yearOption3);
        }
    }
}

// Render payments table
function renderPaymentsTable() {
    const tbody = document.getElementById('paymentsTableBody');
    
    if (payments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-8">
                    <div class="text-muted">
                        <i class="ti ti-credit-card text-4xl mb-2"></i>
                        <p>No payments found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedPayments = payments.slice(startIndex, endIndex);
    
    tbody.innerHTML = paginatedPayments.map(payment => `
        <tr>
            <td>
                <div class="font-semibold">${escapeHtml(payment.property?.title || 'N/A')}</div>
                <small class="text-muted">${escapeHtml(payment.property?.address || 'N/A')}</small>
            </td>
            <td>
                <div class="font-semibold">${escapeHtml(payment.tenant?.name || 'N/A')}</div>
                <small class="text-muted">${escapeHtml(payment.tenant?.phone || 'N/A')}</small>
            </td>
            <td>
                ${payment.month && payment.year ? `${getMonthName(payment.month)} ${payment.year}` : 'N/A'}
            </td>
            <td>$${payment.amount ? payment.amount.toLocaleString() : '0'}</td>
            <td>
                <small class="text-muted">
                    ${payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : 'N/A'}
                </small>
            </td>
            <td>
                <span class="badge bg-${getPaymentStatusColor(payment.status)}-500 text-white">
                    ${payment.status || 'pending'}
                </span>
            </td>
            <td class="text-end">
                <div class="btn-group">
                    <button class="btn btn-sm ${payment.status === 'paid' ? 'btn-outline-warning' : 'btn-outline-success'}" 
                            onclick="togglePaymentStatus('${payment._id}')" 
                            title="${payment.status === 'paid' ? 'Mark Unpaid' : 'Mark Paid'}">
                        <i class="ti ti-${payment.status === 'paid' ? 'x' : 'check'}"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-primary" onclick="editPayment('${payment._id}')" title="Edit">
                        <i class="ti ti-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deletePayment('${payment._id}')" title="Delete">
                        <i class="ti ti-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    updatePaginationInfo();
}

// Get payment status color
function getPaymentStatusColor(status) {
    switch (status) {
        case 'paid': return 'success';
        case 'pending': return 'warning';
        case 'overdue': return 'danger';
        case 'partial': return 'info';
        default: return 'secondary';
    }
}

// Get month name
function getMonthName(monthNumber) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNumber - 1] || 'Unknown';
}

// Handle payment form submission
async function handlePaymentFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const paymentData = Object.fromEntries(formData.entries());
    
    // Convert amount to number
    if (paymentData.amount) {
        paymentData.amount = parseFloat(paymentData.amount);
    }
    
    try {
        const token = localStorage.getItem('token');
        const url = currentPayment 
            ? `${API_BASE_URL}/payments/${currentPayment._id}`
            : `${API_BASE_URL}/payments`;
        
        const method = currentPayment ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentData)
        });
        
        if (response.ok) {
            showSuccess(currentPayment ? 'Payment updated successfully' : 'Payment added successfully');
            hideModal('paymentModal');
            loadPayments();
            loadStats();
        } else {
            const error = await response.json();
            showError(error.message || 'Failed to save payment');
        }
    } catch (error) {
        console.error('Error saving payment:', error);
        showError('Error saving payment');
    }
}

// Handle generate payments
async function handleGeneratePayments(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/payments/generate-monthly`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            const result = await response.json();
            showSuccess(`Generated ${result.count || 0} monthly payments`);
            hideModal('generatePaymentsModal');
            loadPayments();
            loadStats();
        } else {
            const error = await response.json();
            showError(error.message || 'Failed to generate payments');
        }
    } catch (error) {
        console.error('Error generating payments:', error);
        showError('Error generating payments');
    }
}

// Toggle payment status
async function togglePaymentStatus(paymentId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/payments/${paymentId}/toggle-status`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showSuccess('Payment status updated');
            loadPayments();
            loadStats();
        } else {
            const error = await response.json();
            showError(error.message || 'Failed to update payment status');
        }
    } catch (error) {
        console.error('Error updating payment status:', error);
        showError('Error updating payment status');
    }
}

// Edit payment
async function editPayment(paymentId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/payments/${paymentId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const payment = await response.json();
            currentPayment = payment;
            populatePaymentForm(payment);
            document.getElementById('paymentModalLabel').textContent = 'Edit Payment';
            showModal('paymentModal');
        } else {
            showError('Failed to load payment details');
        }
    } catch (error) {
        console.error('Error loading payment:', error);
        showError('Error loading payment');
    }
}

// Delete payment
async function deletePayment(paymentId) {
    if (!confirm('Are you sure you want to delete this payment?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/payments/${paymentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showSuccess('Payment deleted successfully');
            loadPayments();
            loadStats();
        } else {
            const error = await response.json();
            showError(error.message || 'Failed to delete payment');
        }
    } catch (error) {
        console.error('Error deleting payment:', error);
        showError('Error deleting payment');
    }
}

// Populate payment form
function populatePaymentForm(payment) {
    document.getElementById('paymentLease').value = payment.lease?._id || '';
    document.getElementById('paymentAmount').value = payment.amount || '';
    document.getElementById('paymentDueDate').value = payment.dueDate ? payment.dueDate.split('T')[0] : '';
    document.getElementById('paymentMonth').value = payment.month || '';
    document.getElementById('paymentYear').value = payment.year || '';
    document.getElementById('paymentStatus').value = payment.status || 'pending';
    document.getElementById('paymentMethod').value = payment.method || '';
    document.getElementById('paymentNotes').value = payment.notes || '';
}

// Reset payment form
function resetPaymentForm() {
    currentPayment = null;
    document.getElementById('paymentForm').reset();
}

// Apply filters
function applyFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    const monthFilter = document.getElementById('monthFilter').value;
    const yearFilter = document.getElementById('yearFilter').value;
    const searchFilter = document.getElementById('searchFilter').value.toLowerCase();
    
    let filteredPayments = [...payments];
    
    if (statusFilter) {
        filteredPayments = filteredPayments.filter(p => p.status === statusFilter);
    }
    
    if (monthFilter) {
        filteredPayments = filteredPayments.filter(p => p.month == monthFilter);
    }
    
    if (yearFilter) {
        filteredPayments = filteredPayments.filter(p => p.year == yearFilter);
    }
    
    if (searchFilter) {
        filteredPayments = filteredPayments.filter(p => 
            (p.property?.title && p.property.title.toLowerCase().includes(searchFilter)) ||
            (p.tenant?.name && p.tenant.name.toLowerCase().includes(searchFilter)) ||
            (p.property?.address && p.property.address.toLowerCase().includes(searchFilter))
        );
    }
    
    const originalPayments = [...payments];
    payments = filteredPayments;
    currentPage = 1;
    renderPaymentsTable();
    updatePagination();
    payments = originalPayments;
}

// Clear filters
function clearFilters() {
    document.getElementById('statusFilter').value = '';
    document.getElementById('monthFilter').value = '';
    document.getElementById('yearFilter').value = '';
    document.getElementById('searchFilter').value = '';
    currentPage = 1;
    renderPaymentsTable();
    updatePagination();
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(payments.length / itemsPerPage);
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
    const totalPages = Math.ceil(payments.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderPaymentsTable();
        updatePagination();
    }
}

// Update pagination info
function updatePaginationInfo() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, payments.length);
    
    document.getElementById('showingStart').textContent = payments.length > 0 ? startIndex + 1 : 0;
    document.getElementById('showingEnd').textContent = endIndex;
    document.getElementById('showingTotal').textContent = payments.length;
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