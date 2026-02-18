/**
 * app.js - FreelancePay Tracker with Railway Backend
 * Frontend app that connects to Flask API
 */

// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://freelance-tracker-production.up.railway.app';

let currentPage = 'home';
let currentUser = null;
let allClients = [];
let allInvoices = [];
let currentFilter = 'all';

// Initialize app
async function init() {
    await checkAuthStatus();
}

window.addEventListener('DOMContentLoaded', init);

// ============ API HELPERS ============

async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// ============ AUTHENTICATION ============

async function checkAuthStatus() {
    try {
        const user = await apiRequest('/api/me');
        currentUser = user;
        
        // Set user initials
        const email = user.email;
        const initials = email.substring(0, 2).toUpperCase();
        const userInitialsEl = document.getElementById('user-initials');
        const userNameEl = document.getElementById('user-name-topbar');
        
        if (userInitialsEl) userInitialsEl.textContent = initials;
        if (userNameEl) userNameEl.textContent = user.name || email.split('@')[0];
        
        showMainApp();
        await loadStats();
        await loadClients();
        await loadInvoices();
        await loadClientOptions();
    } catch (error) {
        // Not authenticated
        showAuthPage('login');
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;

    try {
        const data = await apiRequest('/api/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password }),
        });

        currentUser = data.user;
        showMainApp();
        await loadStats();
        await loadClients();
        await loadInvoices();
        await loadClientOptions();
    } catch (error) {
        alert(error.message || 'Registration failed. Please try again.');
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
        const data = await apiRequest('/api/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        currentUser = data.user;
        showMainApp();
        await loadStats();
        await loadClients();
        await loadInvoices();
        await loadClientOptions();
    } catch (error) {
        alert(error.message || 'Login failed. Please check your credentials.');
    }
}

async function logout() {
    try {
        await apiRequest('/api/logout', { method: 'POST' });
        currentUser = null;
        showAuthPage('login');
    } catch (error) {
        console.error('Logout failed:', error);
        // Force logout anyway
        currentUser = null;
        showAuthPage('login');
    }
}

function showAuthPage(page) {
    const loginPage = document.getElementById('login-page');
    const registerPage = document.getElementById('register-page');
    const appContainer = document.getElementById('app-container');
    
    if (appContainer) appContainer.style.display = 'none';
    
    if (page === 'login') {
        if (loginPage) loginPage.style.display = 'flex';
        if (registerPage) registerPage.style.display = 'none';
    } else {
        if (loginPage) loginPage.style.display = 'none';
        if (registerPage) registerPage.style.display = 'flex';
    }
}

function showMainApp() {
    const loginPage = document.getElementById('login-page');
    const registerPage = document.getElementById('register-page');
    const appContainer = document.getElementById('app-container');
    
    if (loginPage) loginPage.style.display = 'none';
    if (registerPage) registerPage.style.display = 'none';
    if (appContainer) appContainer.style.display = 'flex';
    
    showPage('home');
}

// ============ NAVIGATION ============

function showPage(pageName) {
    currentPage = pageName;
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
    });
    
    // Show selected page
    const targetPage = document.getElementById(`${pageName}-page`);
    if (targetPage) {
        targetPage.style.display = 'block';
    }
    
    // Update sidebar active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeNavItem = document.querySelector(`[data-page="${pageName}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    // Load page-specific data
    if (pageName === 'home') {
        loadStats();
        loadRecentInvoices();
    } else if (pageName === 'clients') {
        loadClients();
    } else if (pageName === 'invoices') {
        loadInvoices();
    } else if (pageName === 'settings') {
        updateSettingsPage();
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.toggle('collapsed');
}

function toggleProfileMenu() {
    const menu = document.querySelector('.profile-dropdown');
    if (menu) {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateSettingsPage();
}

function updateSettingsPage() {
    const isDark = document.body.classList.contains('dark-mode');
    const themeLight = document.getElementById('theme-light');
    const themeDark = document.getElementById('theme-dark');
    
    if (themeLight) themeLight.classList.toggle('active', !isDark);
    if (themeDark) themeDark.classList.toggle('active', isDark);
    
    loadSettingsStats();
}

async function loadSettingsStats() {
    try {
        const stats = await getStats();
        const clientsEl = document.getElementById('settings-total-clients');
        const invoicesEl = document.getElementById('settings-total-invoices');
        const earnedEl = document.getElementById('settings-total-earned');
        
        if (clientsEl) clientsEl.textContent = stats.total_clients;
        if (invoicesEl) invoicesEl.textContent = stats.total_invoices;
        if (earnedEl) earnedEl.textContent = `$${stats.paid_total.toFixed(2)}`;
    } catch (error) {
        console.error('Failed to load settings stats:', error);
    }
}

// ============ STATS & DASHBOARD ============

async function loadStats() {
    try {
        const stats = await getStats();
        
        const totalClientsEl = document.getElementById('total-clients');
        const totalInvoicesEl = document.getElementById('total-invoices');
        const paidTotalEl = document.getElementById('paid-total');
        const unpaidTotalEl = document.getElementById('unpaid-total');
        
        if (totalClientsEl) totalClientsEl.textContent = stats.total_clients;
        if (totalInvoicesEl) totalInvoicesEl.textContent = stats.total_invoices;
        if (paidTotalEl) paidTotalEl.textContent = `$${stats.paid_total.toFixed(2)}`;
        if (unpaidTotalEl) unpaidTotalEl.textContent = `$${stats.unpaid_total.toFixed(2)}`;
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

async function loadRecentInvoices() {
    try {
        const invoices = await apiRequest('/api/invoices');
        const recentInvoices = invoices.slice(0, 5);
        
        const tbody = document.getElementById('recent-invoices-table');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (recentInvoices.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No invoices yet</td></tr>';
            return;
        }
        
        recentInvoices.forEach(invoice => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${escapeHtml(invoice.client_name)}</td>
                <td>$${parseFloat(invoice.amount).toFixed(2)}</td>
                <td><span class="status-badge status-${invoice.status}">${invoice.status}</span></td>
                <td>${formatDate(invoice.due_date)}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Failed to load recent invoices:', error);
    }
}

async function getStats() {
    return await apiRequest('/api/stats');
}

// ============ CLIENTS ============

async function loadClients() {
    try {
        const clients = await apiRequest('/api/clients');
        allClients = clients;
        filterClients();
    } catch (error) {
        console.error('Failed to load clients:', error);
        alert('Failed to load clients');
    }
}

function renderClients(clients) {
    const tbody = document.getElementById('clients-table');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (clients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No clients found</td></tr>';
        return;
    }
    
    clients.forEach(client => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(client.name)}</td>
            <td>${escapeHtml(client.email)}</td>
            <td>${escapeHtml(client.phone || 'N/A')}</td>
            <td class="actions">
                <button onclick="openEditClientModal(${client.id}, '${escapeHtml(client.name)}', '${escapeHtml(client.email)}', '${escapeHtml(client.phone || '')}')" class="btn-icon" title="Edit">✏️</button>
                <button onclick="deleteClient(${client.id})" class="btn-icon" title="Delete">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function filterClients() {
    const searchEl = document.getElementById('search-clients');
    const searchTerm = searchEl ? searchEl.value.toLowerCase() : '';
    const filtered = allClients.filter(client =>
        client.name.toLowerCase().includes(searchTerm) ||
        client.email.toLowerCase().includes(searchTerm)
    );
    renderClients(filtered);
}

async function addClient(event) {
    event.preventDefault();
    
    const name = document.getElementById('client-name').value.trim();
    const email = document.getElementById('client-email').value.trim();
    const phone = document.getElementById('client-phone').value.trim();
    
    try {
        await apiRequest('/api/clients', {
            method: 'POST',
            body: JSON.stringify({ name, email, phone }),
        });
        
        document.getElementById('add-client-form').reset();
        await loadClients();
        await loadClientOptions();
        alert('Client added successfully!');
    } catch (error) {
        alert(error.message || 'Failed to add client');
    }
}

function openEditClientModal(id, name, email, phone) {
    document.getElementById('edit-client-id').value = id;
    document.getElementById('edit-client-name').value = name;
    document.getElementById('edit-client-email').value = email;
    document.getElementById('edit-client-phone').value = phone;
    const modal = document.getElementById('edit-client-modal');
    if (modal) modal.style.display = 'flex';
}

function closeEditClientModal() {
    const modal = document.getElementById('edit-client-modal');
    if (modal) modal.style.display = 'none';
}

async function updateClient(event) {
    event.preventDefault();
    
    const id = document.getElementById('edit-client-id').value;
    const name = document.getElementById('edit-client-name').value.trim();
    const email = document.getElementById('edit-client-email').value.trim();
    const phone = document.getElementById('edit-client-phone').value.trim();
    
    try {
        await apiRequest(`/api/clients/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ name, email, phone }),
        });
        
        closeEditClientModal();
        await loadClients();
        await loadClientOptions();
        alert('Client updated successfully!');
    } catch (error) {
        alert(error.message || 'Failed to update client');
    }
}

async function deleteClient(clientId) {
    if (!confirm('Are you sure you want to delete this client? All their invoices will also be deleted.')) {
        return;
    }
    
    try {
        await apiRequest(`/api/clients/${clientId}`, { method: 'DELETE' });
        await loadClients();
        await loadClientOptions();
        await loadStats();
        alert('Client deleted successfully!');
    } catch (error) {
        alert(error.message || 'Failed to delete client');
    }
}

async function loadClientOptions() {
    try {
        const clients = await apiRequest('/api/clients');
        const select = document.getElementById('invoice-client');
        if (!select) return;
        
        select.innerHTML = '<option value="">Select a client</option>';
        
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = client.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load client options:', error);
    }
}

// ============ INVOICES ============

async function loadInvoices() {
    try {
        const invoices = await apiRequest('/api/invoices');
        allInvoices = invoices;
        filterInvoices(currentFilter);
    } catch (error) {
        console.error('Failed to load invoices:', error);
        alert('Failed to load invoices');
    }
}

function filterInvoices(status) {
    currentFilter = status;
    
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-filter="${status}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    
    // Filter invoices
    let filtered = allInvoices;
    if (status !== 'all') {
        filtered = allInvoices.filter(inv => inv.status === status);
    }
    
    renderInvoices(filtered);
}

function renderInvoices(invoices) {
    const tbody = document.getElementById('invoices-table');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No invoices found</td></tr>';
        return;
    }
    
    invoices.forEach(invoice => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(invoice.client_name)}</td>
            <td>$${parseFloat(invoice.amount).toFixed(2)}</td>
            <td>${escapeHtml(invoice.description || 'N/A')}</td>
            <td>${formatDate(invoice.due_date)}</td>
            <td><span class="status-badge status-${invoice.status}">${invoice.status}</span></td>
            <td class="actions">
                ${invoice.status === 'unpaid' 
                    ? `<button onclick="markAsPaid(${invoice.id})" class="btn-icon" title="Mark as Paid">✅</button>`
                    : `<button onclick="markAsUnpaid(${invoice.id})" class="btn-icon" title="Mark as Unpaid">↩️</button>`
                }
                <button onclick="openEditInvoiceModal(${invoice.id}, ${invoice.amount}, '${escapeHtml(invoice.description || '')}', '${invoice.due_date || ''}')" class="btn-icon" title="Edit">✏️</button>
                <button onclick="deleteInvoice(${invoice.id})" class="btn-icon" title="Delete">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function addInvoice(event) {
    event.preventDefault();
    
    const client_id = document.getElementById('invoice-client').value;
    const amount = parseFloat(document.getElementById('invoice-amount').value);
    const descSelect = document.getElementById('invoice-description');
    const description = descSelect.value === 'custom'
        ? document.getElementById('invoice-description-custom').value.trim()
        : descSelect.value;
    const due_date = document.getElementById('invoice-due-date').value;
    
    if (!client_id) {
        alert('Please select a client');
        return;
    }
    
    try {
        await apiRequest('/api/invoices', {
            method: 'POST',
            body: JSON.stringify({ 
                client_id: parseInt(client_id), 
                amount, 
                description, 
                due_date,
                status: 'unpaid'
            }),
        });
        
        document.getElementById('add-invoice-form').reset();
        const customDesc = document.getElementById('invoice-description-custom');
        if (customDesc) customDesc.style.display = 'none';
        await loadInvoices();
        await loadStats();
        alert('Invoice added successfully!');
    } catch (error) {
        alert(error.message || 'Failed to add invoice');
    }
}

function openEditInvoiceModal(id, amount, description, dueDate) {
    document.getElementById('edit-invoice-id').value = id;
    document.getElementById('edit-invoice-amount').value = amount;
    document.getElementById('edit-invoice-description').value = description;
    document.getElementById('edit-invoice-due-date').value = dueDate;
    const modal = document.getElementById('edit-invoice-modal');
    if (modal) modal.style.display = 'flex';
}

function closeEditInvoiceModal() {
    const modal = document.getElementById('edit-invoice-modal');
    if (modal) modal.style.display = 'none';
}

async function updateInvoice(event) {
    event.preventDefault();
    
    const id = document.getElementById('edit-invoice-id').value;
    const amount = parseFloat(document.getElementById('edit-invoice-amount').value);
    const description = document.getElementById('edit-invoice-description').value.trim();
    const due_date = document.getElementById('edit-invoice-due-date').value;
    
    try {
        const invoice = allInvoices.find(inv => inv.id === parseInt(id));
        
        await apiRequest(`/api/invoices/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ 
                amount, 
                description, 
                due_date,
                status: invoice.status
            }),
        });
        
        closeEditInvoiceModal();
        await loadInvoices();
        await loadStats();
        alert('Invoice updated successfully!');
    } catch (error) {
        alert(error.message || 'Failed to update invoice');
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
        const invoice = allInvoices.find(inv => inv.id === invoiceId);
        
        await apiRequest(`/api/invoices/${invoiceId}`, {
            method: 'PUT',
            body: JSON.stringify({ 
                amount: invoice.amount,
                description: invoice.description,
                due_date: invoice.due_date,
                status
            }),
        });
        
        await loadInvoices();
        await loadStats();
    } catch (error) {
        alert(error.message || 'Failed to update invoice status');
    }
}

async function deleteInvoice(invoiceId) {
    if (!confirm('Are you sure you want to delete this invoice?')) {
        return;
    }
    
    try {
        await apiRequest(`/api/invoices/${invoiceId}`, { method: 'DELETE' });
        await loadInvoices();
        await loadStats();
        alert('Invoice deleted successfully!');
    } catch (error) {
        alert(error.message || 'Failed to delete invoice');
    }
}

// ============ UTILITY FUNCTIONS ============

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show custom description field when "Custom" is selected
const descSelect = document.getElementById('invoice-description');
if (descSelect) {
    descSelect.addEventListener('change', function() {
        const customField = document.getElementById('invoice-description-custom');
        if (customField) {
            customField.style.display = this.value === 'custom' ? 'block' : 'none';
        }
    });
}

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

// Close profile dropdown when clicking outside
document.addEventListener('click', function(event) {
    const profileBtn = document.querySelector('.profile-btn');
    const profileMenu = document.querySelector('.profile-dropdown');
    
    if (profileBtn && profileMenu && !profileBtn.contains(event.target) && !profileMenu.contains(event.target)) {
        profileMenu.style.display = 'none';
    }
});

// Load saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
}
