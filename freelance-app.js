/**
 * app.js - FreelancePay Tracker with Supabase
 * Pure frontend app - No Flask backend needed!
 */

// Initialize Supabase client
const SUPABASE_URL = 'https://ollwfglnkccowmaoouck.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sbHdmZ2xua2Njb3dtYW9vdWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNjc0OTgsImV4cCI6MjA4NDg0MzQ5OH0.T0v3e3mPfvEIr9knf11PNpmRgbJWhVxaLL9FBswldGE';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// ============ AUTHENTICATION ============

async function checkAuthStatus() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        currentUser = session.user;
        
        // Set user initials
        const email = currentUser.email;
        const initials = email.substring(0, 2).toUpperCase();
        document.getElementById('user-initials').textContent = initials;
        document.getElementById('user-name-topbar').textContent = email.split('@')[0];
        
        showMainApp();
        await loadStats();
        await loadClients();
        await loadInvoices();
        await loadClientOptions();
    } else {
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
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    name: name
                }
            }
        });
        
        if (error) {
            errorDiv.textContent = error.message;
            errorDiv.classList.add('show');
        } else {
            alert('Registration successful! Please check your email to confirm your account.');
            showAuthPage('login');
        }
    } catch (error) {
        console.error('Registration error:', error);
        errorDiv.textContent = 'Registration failed. Please try again.';
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
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            errorDiv.textContent = error.message;
            errorDiv.classList.add('show');
        } else {
            await checkAuthStatus();
        }
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = 'Login failed. Please try again.';
        errorDiv.classList.add('show');
    }
}

async function logout() {
    if (!confirm('Are you sure you want to logout?')) {
        return;
    }
    
    await supabase.auth.signOut();
    currentUser = null;
    showAuthPage('login');
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
        document.getElementById('settings-name').textContent = currentUser.user_metadata?.name || '-';
        document.getElementById('settings-email').textContent = currentUser.email || '-';
        document.getElementById('settings-joined').textContent = formatDate(currentUser.created_at);
    }
}

async function loadSettingsStats() {
    const stats = await getStats();
    document.getElementById('settings-total-clients').textContent = stats.total_clients;
    document.getElementById('settings-total-invoices').textContent = stats.total_invoices;
    const totalRevenue = stats.paid_total + stats.unpaid_total;
    document.getElementById('settings-total-revenue').textContent = `KSh ${totalRevenue.toFixed(2)}`;
}

// ============ DASHBOARD ============

async function loadStats() {
    const stats = await getStats();
    
    document.getElementById('home-total-clients').textContent = stats.total_clients;
    document.getElementById('home-total-invoices').textContent = stats.total_invoices;
    document.getElementById('home-paid-total').textContent = `KSh ${stats.paid_total.toFixed(2)}`;
    document.getElementById('home-unpaid-total').textContent = `KSh ${stats.unpaid_total.toFixed(2)}`;
    
    document.getElementById('month-revenue').textContent = `KSh ${stats.paid_total.toFixed(2)}`;
    if (stats.total_invoices > 0) {
        const avg = (stats.paid_total + stats.unpaid_total) / stats.total_invoices;
        document.getElementById('avg-invoice').textContent = `KSh ${avg.toFixed(2)}`;
    }
    
    await loadRecentInvoices();
}

async function loadRecentInvoices() {
    const { data: invoices } = await supabase
        .from('invoices')
        .select(`
            *,
            client:clients(name)
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(5);
    
    const recentList = document.getElementById('recent-invoices-list');
    
    if (!invoices || invoices.length === 0) {
        recentList.innerHTML = '<p class="empty-message">No invoices yet</p>';
        return;
    }
    
    recentList.innerHTML = invoices.map(invoice => `
        <div class="activity-item">
            <div>
                <strong>${invoice.client.name}</strong>
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
}

async function getStats() {
    const { data: clients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id);
    
    const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', currentUser.id);
    
    const paid = invoices?.filter(i => i.status === 'paid') || [];
    const unpaid = invoices?.filter(i => i.status === 'unpaid') || [];
    
    const paidTotal = paid.reduce((sum, i) => sum + parseFloat(i.amount), 0);
    const unpaidTotal = unpaid.reduce((sum, i) => sum + parseFloat(i.amount), 0);
    
    return {
        total_clients: clients?.length || 0,
        total_invoices: invoices?.length || 0,
        paid_total: paidTotal,
        unpaid_total: unpaidTotal
    };
}

// ============ CLIENTS ============

async function loadClients() {
    const { data: clients } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
    
    allClients = clients || [];
    renderClients(allClients);
}

function renderClients(clients) {
    const tableBody = document.getElementById('clients-table-body');
    
    if (clients.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="empty-message">No clients found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = clients.map(client => `
        <tr>
            <td><strong>${escapeHtml(client.name)}</strong></td>
            <td>${escapeHtml(client.email)}</td>
            <td>${escapeHtml(client.phone || 'Not provided')}</td>
            <td>${formatDate(client.created_at)}</td>
            <td class="action-cell">
                <button class="btn-small" onclick="openEditClientModal(${client.id}, '${escapeHtml(client.name)}', '${escapeHtml(client.email)}', '${escapeHtml(client.phone || '')}')">Edit</button>
                <button class="delete-btn btn-small" onclick="deleteClient(${client.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

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
    
    const { error } = await supabase
        .from('clients')
        .insert([
            { user_id: currentUser.id, name, email, phone }
        ]);
    
    if (error) {
        alert('Failed to add client: ' + error.message);
        return;
    }
    
    document.getElementById('client-form').reset();
    await loadClients();
    await loadClientOptions();
    await loadStats();
    alert('Client added successfully!');
}

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
    
    const { error } = await supabase
        .from('clients')
        .update({ name, email, phone })
        .eq('id', id)
        .eq('user_id', currentUser.id);
    
    if (error) {
        alert('Failed to update client: ' + error.message);
        return;
    }
    
    closeEditClientModal();
    await loadClients();
    await loadClientOptions();
    alert('Client updated successfully!');
}

async function deleteClient(clientId) {
    if (!confirm('Delete this client and all their invoices?')) {
        return;
    }
    
    // Delete invoices first
    await supabase
        .from('invoices')
        .delete()
        .eq('client_id', clientId);
    
    // Then delete client
    const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)
        .eq('user_id', currentUser.id);
    
    if (error) {
        alert('Failed to delete client: ' + error.message);
        return;
    }
    
    await loadClients();
    await loadInvoices();
    await loadClientOptions();
    await loadStats();
    alert('Client deleted!');
}

async function loadClientOptions() {
    const { data: clients } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('name');
    
    const select = document.getElementById('invoice-client');
    select.innerHTML = '<option value="">Select Client</option>' + 
        (clients || []).map(client => `<option value="${client.id}">${escapeHtml(client.name)}</option>`).join('');
}

// ============ INVOICES ============

async function loadInvoices() {
    const { data: invoices } = await supabase
        .from('invoices')
        .select(`
            *,
            client:clients(name)
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
    
    allInvoices = invoices || [];
    filterInvoices(currentFilter);
}

function filterInvoices(status) {
    currentFilter = status;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event?.target?.classList.add('active');
    
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
                <h3>${escapeHtml(invoice.client.name)}</h3>
                <span class="status-badge ${invoice.status}">${invoice.status.toUpperCase()}</span>
            </div>
            <div class="card-body">
                <p><strong>Amount:</strong> KSh ${parseFloat(invoice.amount).toFixed(2)}</p>
                <p><strong>Description:</strong> ${escapeHtml(invoice.description || 'No description')}</p>
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
    
    const client_id = parseInt(document.getElementById('invoice-client').value);
    const amount = parseFloat(document.getElementById('invoice-amount').value);
    let description = document.getElementById('invoice-description').value;
    const due_date = document.getElementById('invoice-due-date').value;
    
    if (description === 'Custom') {
        description = document.getElementById('invoice-description-custom').value;
        if (!description.trim()) {
            alert('Please enter a custom description');
            return;
        }
    }
    
    const { error } = await supabase
        .from('invoices')
        .insert([
            { user_id: currentUser.id, client_id, amount, description, due_date }
        ]);
    
    if (error) {
        alert('Failed to create invoice: ' + error.message);
        return;
    }
    
    document.getElementById('invoice-form').reset();
    document.getElementById('invoice-description-custom').style.display = 'none';
    await loadInvoices();
    await loadStats();
    alert('Invoice created!');
}

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
    const amount = parseFloat(document.getElementById('edit-invoice-amount').value);
    const description = document.getElementById('edit-invoice-description').value;
    const due_date = document.getElementById('edit-invoice-due-date').value;
    
    const { error } = await supabase
        .from('invoices')
        .update({ amount, description, due_date })
        .eq('id', id)
        .eq('user_id', currentUser.id);
    
    if (error) {
        alert('Failed to update invoice: ' + error.message);
        return;
    }
    
    closeEditInvoiceModal();
    await loadInvoices();
    await loadStats();
    alert('Invoice updated successfully!');
}

async function markAsPaid(invoiceId) {
    await updateInvoiceStatus(invoiceId, 'paid');
}

async function markAsUnpaid(invoiceId) {
    await updateInvoiceStatus(invoiceId, 'unpaid');
}

async function updateInvoiceStatus(invoiceId, status) {
    const { error } = await supabase
        .from('invoices')
        .update({ status })
        .eq('id', invoiceId)
        .eq('user_id', currentUser.id);
    
    if (error) {
        alert('Failed to update status: ' + error.message);
        return;
    }
    
    await loadInvoices();
    await loadStats();
    alert(`Invoice marked as ${status}!`);
}

async function deleteInvoice(invoiceId) {
    if (!confirm('Delete this invoice?')) {
        return;
    }
    
    const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId)
        .eq('user_id', currentUser.id);
    
    if (error) {
        alert('Failed to delete invoice: ' + error.message);
        return;
    }
    
    await loadInvoices();
    await loadStats();
    alert('Invoice deleted!');
}

// ============ UTILITIES ============

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
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
