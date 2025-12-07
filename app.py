from flask import Flask, request, jsonify, session
from flask_cors import CORS
from models import get_db, init_db, create_user, get_user_by_email, get_user_by_id, verify_password
from datetime import timedelta
import os

app = Flask(__name__)

# Session configuration - use environment variable in production
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-change-this-in-production')
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)

# CORS configuration - support both development and production
allowed_origins = [
    'http://localhost:8001',
    'http://localhost:8000',
    'http://127.0.0.1:8001',
    'http://127.0.0.1:8000'
]

# Add production frontend URL if it exists
frontend_url = os.environ.get('FRONTEND_URL')
if frontend_url:
    allowed_origins.append(frontend_url)

CORS(app, 
     supports_credentials=True, 
     origins=allowed_origins,
     allow_headers=['Content-Type'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

init_db()


# ============ AUTHENTICATION ROUTES ============

@app.route('/api/register', methods=['POST'])
def register():
    """Create new user account"""
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')
    
    if not email or not password or not name:
        return jsonify({'error': 'Email, password, and name are required'}), 400
    
    if '@' not in email:
        return jsonify({'error': 'Invalid email address'}), 400
    
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    
    user_id = create_user(email, password, name)
    
    if user_id is None:
        return jsonify({'error': 'Email already registered'}), 400
    
    session['user_id'] = user_id
    session.permanent = True
    
    return jsonify({
        'message': 'Registration successful',
        'user_id': user_id
    }), 201


@app.route('/api/login', methods=['POST'])
def login():
    """Authenticate user and create session"""
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    
    user = get_user_by_email(email)
    
    if not user or not verify_password(user['password'], password):
        return jsonify({'error': 'Invalid email or password'}), 401
    
    session['user_id'] = user['id']
    session.permanent = True
    
    return jsonify({
        'message': 'Login successful',
        'user': {
            'id': user['id'],
            'email': user['email'],
            'name': user['name']
        }
    }), 200


@app.route('/api/logout', methods=['POST'])
def logout():
    """Clear user session"""
    session.pop('user_id', None)
    return jsonify({'message': 'Logged out successfully'}), 200


@app.route('/api/me', methods=['GET'])
def get_current_user():
    """Get current logged-in user information"""
    user_id = session.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user = get_user_by_id(user_id)
    
    if not user:
        session.pop('user_id', None)
        return jsonify({'error': 'User not found'}), 401
    
    return jsonify({
        'id': user['id'],
        'email': user['email'],
        'name': user['name'],
        'created_at': user['created_at']
    }), 200


# ============ HELPER FUNCTION ============

def get_current_user_id():
    """Get current logged-in user ID from session"""
    return session.get('user_id')


# ============ CLIENT ROUTES ============

@app.route('/api/clients', methods=['GET'])
def get_clients():
    """Get all clients for current user"""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    conn = get_db()
    clients = conn.execute(
        'SELECT * FROM clients WHERE user_id = ? ORDER BY created_at DESC',
        (user_id,)
    ).fetchall()
    conn.close()
    
    return jsonify([dict(client) for client in clients])


@app.route('/api/clients', methods=['POST'])
def create_client():
    """Create new client for current user"""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    phone = data.get('phone', '')
    
    if not name or not email:
        return jsonify({'error': 'Name and email are required'}), 400
    
    conn = get_db()
    cursor = conn.execute(
        'INSERT INTO clients (user_id, name, email, phone) VALUES (?, ?, ?, ?)',
        (user_id, name, email, phone)
    )
    conn.commit()
    client_id = cursor.lastrowid
    conn.close()
    
    return jsonify({'id': client_id, 'message': 'Client created successfully'}), 201


@app.route('/api/clients/<int:client_id>', methods=['PUT'])
def update_client(client_id):
    """Update client information"""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    phone = data.get('phone', '')
    
    if not name or not email:
        return jsonify({'error': 'Name and email are required'}), 400
    
    conn = get_db()
    
    # Verify client belongs to user
    client = conn.execute(
        'SELECT * FROM clients WHERE id = ? AND user_id = ?',
        (client_id, user_id)
    ).fetchone()
    
    if not client:
        conn.close()
        return jsonify({'error': 'Client not found or unauthorized'}), 404
    
    # Update client
    conn.execute(
        'UPDATE clients SET name = ?, email = ?, phone = ? WHERE id = ?',
        (name, email, phone, client_id)
    )
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Client updated successfully'})


@app.route('/api/clients/<int:client_id>', methods=['DELETE'])
def delete_client(client_id):
    """Delete client (authorization check)"""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    conn = get_db()
    
    # Verify client belongs to user
    client = conn.execute(
        'SELECT * FROM clients WHERE id = ? AND user_id = ?',
        (client_id, user_id)
    ).fetchone()
    
    if not client:
        conn.close()
        return jsonify({'error': 'Client not found or unauthorized'}), 404
    
    # Delete client and associated invoices
    conn.execute('DELETE FROM clients WHERE id = ?', (client_id,))
    conn.execute('DELETE FROM invoices WHERE client_id = ?', (client_id,))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Client deleted successfully'})


# ============ INVOICE ROUTES ============

@app.route('/api/invoices', methods=['GET'])
def get_invoices():
    """Get all invoices for current user's clients"""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    conn = get_db()
    
    # Join to ensure only user's invoices are returned
    invoices = conn.execute('''
        SELECT 
            invoices.*,
            clients.name as client_name
        FROM invoices
        JOIN clients ON invoices.client_id = clients.id
        WHERE clients.user_id = ?
        ORDER BY invoices.created_at DESC
    ''', (user_id,)).fetchall()
    
    conn.close()
    
    return jsonify([dict(invoice) for invoice in invoices])


@app.route('/api/invoices', methods=['POST'])
def create_invoice():
    """Create new invoice (with authorization check)"""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.get_json()
    client_id = data.get('client_id')
    amount = data.get('amount')
    description = data.get('description', '')
    due_date = data.get('due_date', '')
    
    if not client_id or not amount:
        return jsonify({'error': 'Client ID and amount are required'}), 400
    
    conn = get_db()
    
    # Verify client belongs to user
    client = conn.execute(
        'SELECT * FROM clients WHERE id = ? AND user_id = ?',
        (client_id, user_id)
    ).fetchone()
    
    if not client:
        conn.close()
        return jsonify({'error': 'Client not found or unauthorized'}), 404
    
    cursor = conn.execute(
        'INSERT INTO invoices (client_id, amount, description, due_date) VALUES (?, ?, ?, ?)',
        (client_id, amount, description, due_date)
    )
    conn.commit()
    invoice_id = cursor.lastrowid
    conn.close()
    
    return jsonify({'id': invoice_id, 'message': 'Invoice created successfully'}), 201


@app.route('/api/invoices/<int:invoice_id>', methods=['PUT'])
def update_invoice(invoice_id):
    """Update invoice information"""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.get_json()
    amount = data.get('amount')
    description = data.get('description', '')
    due_date = data.get('due_date', '')
    
    if not amount:
        return jsonify({'error': 'Amount is required'}), 400
    
    conn = get_db()
    
    # Verify invoice belongs to user's client
    invoice = conn.execute('''
        SELECT invoices.* FROM invoices
        JOIN clients ON invoices.client_id = clients.id
        WHERE invoices.id = ? AND clients.user_id = ?
    ''', (invoice_id, user_id)).fetchone()
    
    if not invoice:
        conn.close()
        return jsonify({'error': 'Invoice not found or unauthorized'}), 404
    
    # Update invoice
    conn.execute(
        'UPDATE invoices SET amount = ?, description = ?, due_date = ? WHERE id = ?',
        (amount, description, due_date, invoice_id)
    )
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Invoice updated successfully'})


@app.route('/api/invoices/<int:invoice_id>/status', methods=['PUT'])
def update_invoice_status(invoice_id):
    """Update invoice status (with authorization check)"""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.get_json()
    status = data.get('status')
    
    if status not in ['paid', 'unpaid']:
        return jsonify({'error': 'Status must be paid or unpaid'}), 400
    
    conn = get_db()
    
    # Verify invoice belongs to user's client
    invoice = conn.execute('''
        SELECT invoices.* FROM invoices
        JOIN clients ON invoices.client_id = clients.id
        WHERE invoices.id = ? AND clients.user_id = ?
    ''', (invoice_id, user_id)).fetchone()
    
    if not invoice:
        conn.close()
        return jsonify({'error': 'Invoice not found or unauthorized'}), 404
    
    conn.execute('UPDATE invoices SET status = ? WHERE id = ?', (status, invoice_id))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Invoice status updated successfully'})


@app.route('/api/invoices/<int:invoice_id>', methods=['DELETE'])
def delete_invoice(invoice_id):
    """Delete invoice (with authorization check)"""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    conn = get_db()
    
    # Verify invoice belongs to user's client
    invoice = conn.execute('''
        SELECT invoices.* FROM invoices
        JOIN clients ON invoices.client_id = clients.id
        WHERE invoices.id = ? AND clients.user_id = ?
    ''', (invoice_id, user_id)).fetchone()
    
    if not invoice:
        conn.close()
        return jsonify({'error': 'Invoice not found or unauthorized'}), 404
    
    conn.execute('DELETE FROM invoices WHERE id = ?', (invoice_id,))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Invoice deleted successfully'})


# ============ STATS ROUTE ============

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get statistics for current user"""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    conn = get_db()
    
    # Get stats scoped to current user
    total_clients = conn.execute(
        'SELECT COUNT(*) as count FROM clients WHERE user_id = ?',
        (user_id,)
    ).fetchone()['count']
    
    total_invoices = conn.execute('''
        SELECT COUNT(*) as count FROM invoices
        JOIN clients ON invoices.client_id = clients.id
        WHERE clients.user_id = ?
    ''', (user_id,)).fetchone()['count']
    
    paid_total = conn.execute('''
        SELECT SUM(amount) as total FROM invoices
        JOIN clients ON invoices.client_id = clients.id
        WHERE clients.user_id = ? AND invoices.status = 'paid'
    ''', (user_id,)).fetchone()['total'] or 0
    
    unpaid_total = conn.execute('''
        SELECT SUM(amount) as total FROM invoices
        JOIN clients ON invoices.client_id = clients.id
        WHERE clients.user_id = ? AND invoices.status = 'unpaid'
    ''', (user_id,)).fetchone()['total'] or 0
    
    conn.close()
    
    return jsonify({
        'total_clients': total_clients,
        'total_invoices': total_invoices,
        'paid_total': paid_total,
        'unpaid_total': unpaid_total
    })


if __name__ == '__main__':
    # Use PORT from environment variable (for deployment) or default to 5000
    port = int(os.environ.get('PORT', 5000))
    # Set debug=False for production
    debug = os.environ.get('DEBUG', 'True') == 'True'
    app.run(debug=debug, host='0.0.0.0', port=port)
