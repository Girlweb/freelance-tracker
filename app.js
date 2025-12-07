/**
 * app.js - Complete Frontend JavaScript for FreelancePay Tracker
 * NEW FEATURES: Edit clients, Edit invoices, Search clients, Filter invoices
 */

// API configuration
const API_URL = 'http://localhost:5000/api';

let currentPage = 'home';
let currentUser = null;
let allClients = []; // Store all clients for search filtering
let allInvoices = []; // Store all invoices for status filtering
let currentFilter = 'all'; // Current invoice filter status

// Initialize app on page load
function init() {
    checkAuthStatus();
}

window.addEventListener('DOMContentLoaded', init);


// ============ AUTHENTICATION ============

async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_URL}/me`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const user = await response.json();
            currentUser = user;
            
            if (user.name) {
                const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
                document.getElementById('user-initials').textContent = initials;
                document.getElementById('user-name-topbar').textContent = user.name.split(' ')[0];
            }
            
            showMainApp();
            loadStats();
            loadClients();
            loadInvoices();
            loadClientOptions();
        } else {
            showAuthPage('login');
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        showAuthPage('login');
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    const errorDiv = document.getElementById('register-error');
    errorDiv.textContent = '';
    errorDiv.classList.remove('show');
    
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Registration successful!');
            await checkAuthStatus();
        } else {
            errorDiv.textContent = data.error || 'Registration failed.';
            errorDiv.classList.add('show');
        }
    } catch (error) {
        console.error('Registration error:', error);
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.classList.add('show');
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    const errorDiv = document.getElementById('login-error');
    errorDiv.textContent = '';
    errorDiv.classList.remove('show');
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Login successful!');
            await checkAuthStatus();
        } else {
            errorDiv.textContent = data.error || 'Invalid credentials.';
            errorDiv.classList.add('show');
        }
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.classList.add('show');
    }
}

async function logout() {
    if (!confirm('Are you sure you want to logout?')) {
        return;
    }
    
    try {
        await fetch(`${API_URL}/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        currentUser = null;
        showAuthPage('login');
        alert('Logged out successfully!');
    } catch (error) {
        console.error('Logout error:', error);
        showAuthPage('login');
    }
}


// ============ PAGE NAVIGATION ============

function showAuthPage(page) {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('register-page').style.display = 'none';
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('sidebar').style.display = 'none';
    document.querySelector('.topbar').style.display = 'none';
    
    if (page === 'login') {
        document.getElementById('login-page').style.display = 'flex';
    } else if (page === 'register') {
        document.getElementById('register-page').style.display = 'flex';
    }
}

function showMainApp() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('register-page').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    document.getElementById('sidebar').style.display = 'block';
    document.querySelector('.topbar').style.display = 'flex';
    showPage('home');
}

function showPage(pageName) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    document.getElementById(`${pageName}-page`).classList.add('active');
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    const clickedLink = document.querySelector(`[onclick="showPage('${pageName}')"]`);
    if (clickedLink) {
        clickedLink.classList.add('active');
    }
    
    document.getElementById('sidebar').classList.remove('active');
    currentPage = pageName;
    
    if (pageName === 'settings') {
        updateSettingsPage();
        loadSettingsStats();
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}


// ============ PROFILE MENU ============

function toggleProfileMenu() {
    const dropdown = document.getElementById('profile-dropdown');
    dropdown.classList.toggle('show');
}

document.addEventListener('click', function(event) {
    const profileMenu = document.querySelector('.profile-menu');
    const dropdown = document.getElementById('profile-dropdown');
    
    if (dropdown && profileMenu) {
        if (!profileMenu.contains(event.target) && !dropdown.contains(event.target)) {
            dropdown.classList.remove('show');
        }
    }
});


// ============ THEME SWITCHING ============

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    
    if (currentTheme === 'light') {
        document.documentElement.removeAttribute('data-theme');
        document.getElementById('theme-icon').textContent = '☀️';
        document.getElementById('theme-label').textContent = 'Light Mode';
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        document.getElementById('theme-icon').textContent = '🌙';
        document.getElementById('theme-label').textContent = 'Dark Mode';
    }
}


// ============ SETTINGS PAGE ============

function updateSettingsPage() {
    if (currentUser) {
        document.getElementById('settings-name').textContent = currentUser.name || '-';
        document.getElementById('settings-email').textContent = currentUser.email || '-';
        
        if (currentUser.created_at) {
            document.getElementById('settings-joined').textContent = formatDate(currentUser.created_at);
        } else {
            document.getElementById('settings-joined').textContent = '-';
        }
    }
}

function loadSettingsStats() {
    fetch(`${API_URL}/stats`, { credentials: 'include' })
        .then(response => response.json())
        .then(stats => {
            document.getElementById('settings-total-clients').textContent = stats.total_clients || 0;
            document.getElementById('settings-total-invoices').textContent = stats.total_invoices || 0;
            const totalRevenue = (stats.paid_total || 0) + (stats.unpaid_total || 0);
            document.getElementById('settings-total-revenue').textContent = `KSh ${totalRevenue.toFixed(2)}`;
        })
        .catch(error => console.error('Error loading settings stats:', error));
}


// ============ DASHBOARD ============

async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/stats`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                showAuthPage('login');
                return;
            }
            throw new Error('Failed to load stats');
        }
        
        const stats = await response.json();
        
        document.getElementById('home-total-clients').textContent = stats.total_clients;
        document.getElementById('home-total-invoices').textContent = stats.total_invoices;
        document.getElementById('home-paid-total').textContent = `KSh ${stats.paid_total.toFixed(2)}`;
        document.getElementById('home-unpaid-total').textContent = `KSh ${stats.unpaid_total.toFixed(2)}`;
        
        document.getElementById('month-revenue').textContent = `KSh ${stats.paid_total.toFixed(2)}`;
        if (stats.total_invoices > 0) {
            const avg = (stats.paid_total + stats.unpaid_total) / stats.total_invoices;
            document.getElementById('avg-invoice').textContent = `KSh ${avg.toFixed(2)}`;
        }
        
        loadRecentInvoices();
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadRecentInvoices() {
    try {
        const response = await fetch(`${API_URL}/invoices`, {
            credentials: 'include'
        });
        
        if (!response.ok) return;
        
        const invoices = await response.json();
        const recentList = document.getElementById('recent-invoices-list');
        
        if (invoices.length === 0) {
            recentList.innerHTML = '<p class="empty-message">No invoices yet</p>';
            return;
        }
        
        const recent = invoices.slice(0, 5);
        recentList.innerHTML = recent.map(invoice => `
            <div class="activity-item">
                <div>
                    <strong>${invoice.client_name}</strong>
                    <p style="font-size: 0.875rem; color: var(--text-secondary);">${invoice.description || 'No description'}</p>
                </div>
                <div style="text-align: right;">
                    <strong>KSh ${parseFloat(invoice.amount).toFixed(2)}</strong>
                    <p style="font-size: 0.875rem;">
                        <span class="status-badge ${invoice.status}">${invoice.status.toUpperCase()}</span>
                    </p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading recent invoices:', error);
    }
}


// ============ CLIENTS (WITH SEARCH & EDIT) ============

async function loadClients() {
    try {
        const response = await fetch(`${API_URL}/clients`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                showAuthPage('login');
                return;
            }
            throw new Error('Failed to load clients');
        }
        
        const clients = await response.json();
        allClients = clients; // Store for filtering
        renderClients(clients);
    } catch (error) {
        console.error('Error loading clients:', error);
    }
}

function renderClients(clients) {
    const tableBody = document.getElementById('clients-table-body');
    
    if (clients.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="empty-message">No clients found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = clients.map(client => `
        <tr>
            <td><strong>${client.name}</strong></td>
            <td>${client.email}</td>
            <td>${client.phone || 'Not provided'}</td>
            <td>${formatDate(client.created_at)}</td>
            <td class="action-cell">
                <button class="btn-small" onclick="openEditClientModal(${client.id}, '${escapeHtml(client.name)}', '${escapeHtml(client.email)}', '${escapeHtml(client.phone || '')}')">Edit</button>
                <button class="delete-btn btn-small" onclick="deleteClient(${client.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

// NEW: Search/Filter clients
function filterClients() {
    const searchTerm = document.getElementById('client-search').value.toLowerCase();
    
    const filtered = allClients.filter(client => 
        client.name.toLowerCase().includes(searchTerm) ||
        client.email.toLowerCase().includes(searchTerm)
    );
    
    renderClients(filtered);
}

async function addClient(event) {
    event.preventDefault();
    
    const name = document.getElementById('client-name').value;
    const email = document.getElementById('client-email').value;
    const phone = document.getElementById('client-phone').value;
    
    try {
        const response = await fetch(`${API_URL}/clients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, email, phone })
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                showAuthPage('login');
                return;
            }
            throw new Error('Failed to add client');
        }
        
        document.getElementById('client-form').reset();
        loadClients();
        loadClientOptions();
        loadStats();
        alert('Client added successfully!');
    } catch (error) {
        console.error('Error adding client:', error);
        alert('Failed to add client.');
    }
}

// NEW: Edit client modal functions
function openEditClientModal(id, name, email, phone) {
    document.getElementById('edit-client-id').value = id;
    document.getElementById('edit-client-name').value = name;
    document.getElementById('edit-client-email').value = email;
    document.getElementById('edit-client-phone').value = phone;
    document.getElementById('edit-client-modal').style.display = 'flex';
}

function closeEditClientModal() {
    document.getElementById('edit-client-modal').style.display = 'none';
}

async function updateClient(event) {
    event.preventDefault();
    
    const id = document.getElementById('edit-client-id').value;
    const name = document.getElementById('edit-client-name').value;
    const email = document.getElementById('edit-client-email').value;
    const phone = document.getElementById('edit-client-phone').value;
    
    try {
        const response = await fetch(`${API_URL}/clients/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, email, phone })
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                showAuthPage('login');
                return;
            }
            throw new Error('Failed to update client');
        }
        
        closeEditClientModal();
        loadClients();
        loadClientOptions();
        alert('Client updated successfully!');
    } catch (error) {
        console.error('Error updating client:', error);
        alert('Failed to update client.');
    }
}

async function deleteClient(clientId) {
    if (!confirm('Delete this client and all their invoices?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/clients/${clientId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                showAuthPage('login');
                return;
            }
            throw new Error('Failed to delete');
        }
        
        loadClients();
        loadInvoices();
        loadClientOptions();
        loadStats();
        alert('Client deleted!');
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to delete client.');
    }
}

async function loadClientOptions() {
    try {
        const response = await fetch(`${API_URL}/clients`, {
            credentials: 'include'
        });
        
        if (!response.ok) return;
        
        const clients = await response.json();
        const select = document.getElementById('invoice-client');
        
        select.innerHTML = '<option value="">Select Client</option>' + 
            clients.map(client => `<option value="${client.id}">${client.name}</option>`).join('');
    } catch (error) {
        console.error('Error loading client options:', error);
    }
}


// ============ INVOICES (WITH FILTER & EDIT) ============

async function loadInvoices() {
    try {
        const response = await fetch(`${API_URL}/invoices`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                showAuthPage('login');
                return;
            }
            throw new Error('Failed to load invoices');
        }
        
        const invoices = await response.json();
        allInvoices = invoices; // Store for filtering
        filterInvoices(currentFilter);
    } catch (error) {
        console.error('Error loading invoices:', error);
    }
}

// NEW: Filter invoices by status
function filterInvoices(status) {
    currentFilter = status;
    
    // Update button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event?.target?.classList.add('active');
    
    // Filter invoices
    let filtered = allInvoices;
    if (status !== 'all') {
        filtered = allInvoices.filter(inv => inv.status === status);
    }
    
    renderInvoices(filtered);
}

function renderInvoices(invoices) {
    const invoicesList = document.getElementById('invoices-list');
    
    if (invoices.length === 0) {
        invoicesList.innerHTML = '<p class="empty-message">No invoices found</p>';
        return;
    }
    
    invoicesList.innerHTML = invoices.map(invoice => `
        <div class="card">
            <div class="card-header">
                <h3>${invoice.client_name}</h3>
                <span class="status-badge ${invoice.status}">${invoice.status.toUpperCase()}</span>
            </div>
            <div class="card-body">
                <p><strong>Amount:</strong> KSh ${parseFloat(invoice.amount).toFixed(2)}</p>
                <p><strong>Description:</strong> ${invoice.description || 'No description'}</p>
                <p><strong>Due Date:</strong> ${formatDate(invoice.due_date)}</p>
                <p class="card-date">Created: ${formatDate(invoice.created_at)}</p>
            </div>
            <div class="card-actions">
                <button class="btn-small" onclick="openEditInvoiceModal(${invoice.id}, ${invoice.amount}, '${escapeHtml(invoice.description || '')}', '${invoice.due_date || ''}')">Edit</button>
                ${invoice.status === 'unpaid' ? 
                    `<button class="success-btn" onclick="markAsPaid(${invoice.id})">Mark Paid</button>` :
                    `<button class="warning-btn" onclick="markAsUnpaid(${invoice.id})">Mark Unpaid</button>`
                }
                <button class="delete-btn" onclick="deleteInvoice(${invoice.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

async function addInvoice(event) {
    event.preventDefault();
    
    const client_id = document.getElementById('invoice-client').value;
    const amount = document.getElementById('invoice-amount').value;
    let description = document.getElementById('invoice-description').value;
    const due_date = document.getElementById('invoice-due-date').value;
    
    if (description === 'Custom') {
        description = document.getElementById('invoice-description-custom').value;
        if (!description.trim()) {
            alert('Please enter a custom description');
            return;
        }
    }
    
    try {
        const response = await fetch(`${API_URL}/invoices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ client_id, amount, description, due_date })
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                showAuthPage('login');
                return;
            }
            throw new Error('Failed to create invoice');
        }
        
        document.getElementById('invoice-form').reset();
        document.getElementById('invoice-description-custom').style.display = 'none';
        loadInvoices();
        loadStats();
        alert('Invoice created!');
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to create invoice.');
    }
}

// NEW: Edit invoice modal functions
function openEditInvoiceModal(id, amount, description, dueDate) {
    document.getElementById('edit-invoice-id').value = id;
    document.getElementById('edit-invoice-amount').value = amount;
    document.getElementById('edit-invoice-description').value = description;
    document.getElementById('edit-invoice-due-date').value = dueDate;
    document.getElementById('edit-invoice-modal').style.display = 'flex';
}

function closeEditInvoiceModal() {
    document.getElementById('edit-invoice-modal').style.display = 'none';
}

async function updateInvoice(event) {
    event.preventDefault();
    
    const id = document.getElementById('edit-invoice-id').value;
    const amount = document.getElementById('edit-invoice-amount').value;
    const description = document.getElementById('edit-invoice-description').value;
    const due_date = document.getElementById('edit-invoice-due-date').value;
    
    try {
        const response = await fetch(`${API_URL}/invoices/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ amount, description, due_date })
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                showAuthPage('login');
                return;
            }
            throw new Error('Failed to update invoice');
        }
        
        closeEditInvoiceModal();
        loadInvoices();
        loadStats();
        alert('Invoice updated successfully!');
    } catch (error) {
        console.error('Error updating invoice:', error);
        alert('Failed to update invoice.');
    }
}

async function markAsPaid(invoiceId) {
    await updateInvoiceStatus(invoiceId, 'paid');
}

async function markAsUnpaid(invoiceId) {
    await updateInvoiceStatus(invoiceId, 'unpaid');
}

async function updateInvoiceStatus(invoiceId, status) {
    try {
        const response = await fetch(`${API_URL}/invoices/${invoiceId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status })
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                showAuthPage('login');
                return;
            }
            throw new Error('Failed to update');
        }
        
        loadInvoices();
        loadStats();
        alert(`Invoice marked as ${status}!`);
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to update invoice.');
    }
}

async function deleteInvoice(invoiceId) {
    if (!confirm('Delete this invoice?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/invoices/${invoiceId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                showAuthPage('login');
                return;
            }
            throw new Error('Failed to delete');
        }
        
        loadInvoices();
        loadStats();
        alert('Invoice deleted!');
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to delete invoice.');
    }
}


// ============ UTILITIES ============

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}


// ============ CUSTOM DESCRIPTION TOGGLE ============

window.addEventListener('DOMContentLoaded', function() {
    const descSelect = document.getElementById('invoice-description');
    const customInput = document.getElementById('invoice-description-custom');
    
    descSelect?.addEventListener('change', function() {
        if (this.value === 'Custom') {
            customInput.style.display = 'block';
            customInput.required = true;
        } else {
            customInput.style.display = 'none';
            customInput.required = false;
            customInput.value = '';
        }
    });
    
    // Close modals when clicking outside
    window.onclick = function(event) {
        const editClientModal = document.getElementById('edit-client-modal');
        const editInvoiceModal = document.getElementById('edit-invoice-modal');
        
        if (event.target === editClientModal) {
            closeEditClientModal();
        }
        if (event.target === editInvoiceModal) {
            closeEditInvoiceModal();
        }
    };
});
