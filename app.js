// API base URL
const API_URL = 'http://localhost:5000/api';

// Current page tracking
let currentPage = 'home';

// Initialize app on page load
function init() {
    loadStats();
    loadClients();
    loadInvoices();
    loadClientOptions();
    showPage('home');
}

window.addEventListener('DOMContentLoaded', init);

// Handle custom description toggle
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
});


// ============ NAVIGATION ============

function showPage(pageName) {
    /**
     * Handles page navigation by hiding all pages and showing selected one
     * Updates active state in sidebar navigation
     */
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    document.getElementById(`${pageName}-page`).classList.add('active');
    
    // Update nav links active state
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Find and activate the clicked nav link
    const clickedLink = document.querySelector(`[onclick="showPage('${pageName}')"]`);
    if (clickedLink) {
        clickedLink.classList.add('active');
    }
    
    // Always close sidebar after navigation
    document.getElementById('sidebar').classList.remove('active');
    
    currentPage = pageName;
}

function toggleSidebar() {
    /**
     * Toggles sidebar visibility - opens and closes the menu
     */
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}


// ============ DASHBOARD (HOME PAGE) ============

async function loadStats() {
    /**
     * Loads statistics and updates both home page and other pages
     */
    try {
        const response = await fetch(`${API_URL}/stats`);
        const stats = await response.json();
        
        // Update home page stats
        document.getElementById('home-total-clients').textContent = stats.total_clients;
        document.getElementById('home-total-invoices').textContent = stats.total_invoices;
        document.getElementById('home-paid-total').textContent = `KSh ${stats.paid_total.toFixed(2)}`;
        document.getElementById('home-unpaid-total').textContent = `KSh ${stats.unpaid_total.toFixed(2)}`;
        
        // Update reports page
        document.getElementById('month-revenue').textContent = `KSh ${stats.paid_total.toFixed(2)}`;
        if (stats.total_invoices > 0) {
            const avg = (stats.paid_total + stats.unpaid_total) / stats.total_invoices;
            document.getElementById('avg-invoice').textContent = `KSh ${avg.toFixed(2)}`;
        }
        
        // Load recent invoices for home page
        loadRecentInvoices();
    } catch (error) {
        console.error('Error loading stats:', error);
        alert('Failed to load statistics. Check if the server is running.');
    }
}

async function loadRecentInvoices() {
    /**
     * Loads the 5 most recent invoices for home page display
     */
    try {
        const response = await fetch(`${API_URL}/invoices`);
        const invoices = await response.json();
        const recentList = document.getElementById('recent-invoices-list');
        
        if (invoices.length === 0) {
            recentList.innerHTML = '<p class="empty-message">No invoices yet</p>';
            return;
        }
        
        // Show only the 5 most recent
        const recent = invoices.slice(0, 5);
        recentList.innerHTML = recent.map(invoice => `
            <div class="activity-item">
                <div>
                    <strong>${invoice.client_name}</strong>
                    <p style="font-size: 0.875rem; color: #666;">${invoice.description || 'No description'}</p>
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


// ============ CLIENTS PAGE ============

async function loadClients() {
    /**
     * Loads all clients and renders them in a table format
     * Used in the dedicated Clients page
     */
    try {
        const response = await fetch(`${API_URL}/clients`);
        const clients = await response.json();
        const tableBody = document.getElementById('clients-table-body');
        
        if (clients.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="empty-message">No clients yet. Add your first client above!</td></tr>';
            return;
        }
        
        // Render clients in table rows
        tableBody.innerHTML = clients.map(client => `
            <tr>
                <td><strong>${client.name}</strong></td>
                <td>${client.email}</td>
                <td>${client.phone || 'Not provided'}</td>
                <td>${formatDate(client.created_at)}</td>
                <td class="action-cell">
                    <button class="delete-btn btn-small" onclick="deleteClient(${client.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading clients:', error);
        alert('Failed to load clients.');
    }
}

async function addClient(event) {
    /**
     * Creates a new client via API
     * Refreshes client list and options after success
     */
    event.preventDefault();
    
    const name = document.getElementById('client-name').value;
    const email = document.getElementById('client-email').value;
    const phone = document.getElementById('client-phone').value;
    
    try {
        const response = await fetch(`${API_URL}/clients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone })
        });
        
        if (response.ok) {
            document.getElementById('client-form').reset();
            loadClients();
            loadClientOptions();
            loadStats();
            alert('Client added successfully!');
        } else {
            alert('Failed to add client. Check your input.');
        }
    } catch (error) {
        console.error('Error adding client:', error);
        alert('Failed to add client. Check your connection.');
    }
}

async function deleteClient(clientId) {
    /**
     * Deletes a client and all associated invoices
     * Requires user confirmation
     */
    if (!confirm('Are you sure you want to delete this client? All their invoices will also be deleted.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/clients/${clientId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadClients();
            loadInvoices();
            loadClientOptions();
            loadStats();
            alert('Client deleted successfully!');
        } else {
            alert('Failed to delete client.');
        }
    } catch (error) {
        console.error('Error deleting client:', error);
        alert('Failed to delete client.');
    }
}

async function loadClientOptions() {
    /**
     * Populates client dropdown in invoice form
     */
    try {
        const response = await fetch(`${API_URL}/clients`);
        const clients = await response.json();
        
        const select = document.getElementById('invoice-client');
        select.innerHTML = '<option value="">Select Client</option>' + 
            clients.map(client => `<option value="${client.id}">${client.name}</option>`).join('');
    } catch (error) {
        console.error('Error loading client options:', error);
    }
}


// ============ INVOICES PAGE ============

async function loadInvoices() {
    /**
     * Loads all invoices with client information
     * Displays as cards with action buttons
     */
    try {
        const response = await fetch(`${API_URL}/invoices`);
        const invoices = await response.json();
        const invoicesList = document.getElementById('invoices-list');
        
        if (invoices.length === 0) {
            invoicesList.innerHTML = '<p class="empty-message">No invoices yet. Create your first invoice above!</p>';
            return;
        }
        
        // Render invoice cards
        invoicesList.innerHTML = invoices.map(invoice => `
            <div class="card">
                <div class="card-header">
                    <h3>${invoice.client_name}</h3>
                    <span class="status-badge ${invoice.status}">
                        ${invoice.status.toUpperCase()}
                    </span>
                </div>
                <div class="card-body">
                    <p><strong>Amount:</strong> KSh ${parseFloat(invoice.amount).toFixed(2)}</p>
                    <p><strong>Description:</strong> ${invoice.description || 'No description'}</p>
                    <p><strong>Due Date:</strong> ${formatDate(invoice.due_date)}</p>
                    <p class="card-date">Created: ${formatDate(invoice.created_at)}</p>
                </div>
                <div class="card-actions">
                    ${invoice.status === 'unpaid' ? 
                        `<button class="success-btn" onclick="markAsPaid(${invoice.id})">Mark as Paid</button>` :
                        `<button class="warning-btn" onclick="markAsUnpaid(${invoice.id})">Mark as Unpaid</button>`
                    }
                    <button class="delete-btn" onclick="deleteInvoice(${invoice.id})">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading invoices:', error);
        alert('Failed to load invoices.');
    }
}

async function addInvoice(event) {
    /**
     * Creates new invoice with selected or custom description
     */
    event.preventDefault();
    
    const client_id = document.getElementById('invoice-client').value;
    const amount = document.getElementById('invoice-amount').value;
    let description = document.getElementById('invoice-description').value;
    const due_date = document.getElementById('invoice-due-date').value;
    
    // Handle custom description
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
            body: JSON.stringify({ client_id, amount, description, due_date })
        });
        
        if (response.ok) {
            document.getElementById('invoice-form').reset();
            document.getElementById('invoice-description-custom').style.display = 'none';
            loadInvoices();
            loadStats();
            alert('Invoice created successfully!');
        } else {
            alert('Failed to create invoice. Check your input.');
        }
    } catch (error) {
        console.error('Error creating invoice:', error);
        alert('Failed to create invoice.');
    }
}

async function markAsPaid(invoiceId) {
    await updateInvoiceStatus(invoiceId, 'paid');
}

async function markAsUnpaid(invoiceId) {
    await updateInvoiceStatus(invoiceId, 'unpaid');
}

async function updateInvoiceStatus(invoiceId, status) {
    /**
     * Updates invoice payment status
     */
    try {
        const response = await fetch(`${API_URL}/invoices/${invoiceId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            loadInvoices();
            loadStats();
            alert(`Invoice marked as ${status}!`);
        } else {
            alert('Failed to update invoice status.');
        }
    } catch (error) {
        console.error('Error updating invoice:', error);
        alert('Failed to update invoice.');
    }
}

async function deleteInvoice(invoiceId) {
    /**
     * Deletes an invoice after confirmation
     */
    if (!confirm('Are you sure you want to delete this invoice?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/invoices/${invoiceId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadInvoices();
            loadStats();
            alert('Invoice deleted successfully!');
        } else {
            alert('Failed to delete invoice.');
        }
    } catch (error) {
        console.error('Error deleting invoice:', error);
        alert('Failed to delete invoice.');
    }
}


// ============ UTILITIES ============

function formatDate(dateString) {
    /**
     * Formats date strings to readable format
     */
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}
