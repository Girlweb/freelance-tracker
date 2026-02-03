from flask import Flask, request, jsonify, session
from flask_cors import CORS
from models_supabase import get_db, init_db, create_user, get_user_by_email, get_user_by_id, verify_password
from datetime import timedelta
import os

app = Flask(__name__, static_folder='.', static_url_path='')

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

@app.route('/')
def home():
    """Serve the frontend"""
    return app.send_static_file('index.html')

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
        'created_at': str(user['created_at'])
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
    cursor = conn.cursor()
    cursor.execute(
        'SELECT * FROM clients WHERE user_id = %s ORDER BY created_at DESC',
        (user_id,)
    )
    clients = cursor.fetchall()
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
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO clients (user_id, name, email, phone) VALUES (%s, %s, %s, %s) RETURNING id',
        (user_id, name, email, phone)
    )
    client_id = cursor.fetchone()['id']
    conn.commit()
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
    cursor = conn.cursor()
    
    # Verify client belongs to user
    cursor.execute(
        'SELECT * FROM clients WHERE id = %s AND user_id = %s',
        (client_id, user_id)
    )
    client = cursor.fetchone()
    
    if not client:
        conn.close()
        return jsonify({'error': 'Client not found or unauthorized'}), 404
    
    # Update client
    cursor.execute(
        'UPDATE clients SET name = %s, email = %s, phone = %s WHERE id = %s',
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
    cursor = conn.cursor()
    
    # Verify client belongs to user
    cursor.execute(
        'SELECT * FROM clients WHERE id = %s AND user_id = %s',
        (client_id, user_id)
    )
    client = cursor.fetchone()
    
    if not client:
        conn.close()
        return jsonify({'error': 'Client not found or unauthorized'}), 404
    
    # Delete client and associated invoices
    cursor.execute('DELETE FROM clients WHERE id = %s', (client_id,))
    cursor.execute('DELETE FROM invoices WHERE client_id = %s', (client_id,))
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
    cursor = conn.cursor()
    
    # Join to ensure only user's invoices are returned
    cursor.execute('''
        SELECT 
            invoices.*,
            clients.name as client_name
        FROM invoices
        JOIN clients ON invoices.client_id = clients.id
        WHERE clients.user_id = %s
        ORDER BY invoices.created_at DESC
    ''', (user_id,))
    
    invoices = cursor.fetchall()
    conn.close()
    
    # Convert dates to strings for JSON serialization
    result = []
    for invoice in invoices:
        inv_dict = dict(invoice)
        if inv_dict.get('due_date'):
            inv_dict['due_date'] = str(inv_dict['due_date'])
        if inv_dict.get('created_at'):
            inv_dict['created_at'] = str(inv_dict['created_at'])
        result.append(inv_dict)
    
    return jsonify(result)


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
    due_date = data.get('due_date', None)
    
    if not client_id or not amount:
        return jsonify({'error': 'Client ID and amount are required'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify client belongs to user
    cursor.execute(
        'SELECT * FROM clients WHERE id = %s AND user_id = %s',
        (client_id, user_id)
    )
    client = cursor.fetchone()
    
    if not client:
        conn.close()
        return jsonify({'error': 'Client not found or unauthorized'}), 404
    
    cursor.execute(
        'INSERT INTO invoices (client_id, amount, description, due_date) VALUES (%s, %s, %s, %s) RETURNING id',
        (client_id, amount, description, due_date)
    )
    invoice_id = cursor.fetchone()['id']
    conn.commit()
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
    due_date = data.get('due_date', None)
    
    if not amount:
        return jsonify({'error': 'Amount is required'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify invoice belongs to user's client
    cursor.execute('''
        SELECT invoices.* FROM invoices
        JOIN clients ON invoices.client_id = clients.id
        WHERE invoices.id = %s AND clients.user_id = %s
    ''', (invoice_id, user_id))
    
    invoice = cursor.fetchone()
    
    if not invoice:
        conn.close()
        return jsonify({'error': 'Invoice not found or unauthorized'}), 404
    
    # Update invoice
    cursor.execute(
        'UPDATE invoices SET amount = %s, description = %s, due_date = %s WHERE id = %s',
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
    cursor = conn.cursor()
    
    # Verify invoice belongs to user's client
    cursor.execute('''
        SELECT invoices.* FROM invoices
        JOIN clients ON invoices.client_id = clients.id
        WHERE invoices.id = %s AND clients.user_id = %s
    ''', (invoice_id, user_id))
    
    invoice = cursor.fetchone()
    
    if not invoice:
        conn.close()
        return jsonify({'error': 'Invoice not found or unauthorized'}), 404
    
    cursor.execute('UPDATE invoices SET status = %s WHERE id = %s', (status, invoice_id))
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
    cursor = conn.cursor()
    
    # Verify invoice belongs to user's client
    cursor.execute('''
        SELECT invoices.* FROM invoices
        JOIN clients ON invoices.client_id = clients.id
        WHERE invoices.id = %s AND clients.user_id = %s
    ''', (invoice_id, user_id))
    
    invoice = cursor.fetchone()
    
    if not invoice:
        conn.close()
        return jsonify({'error': 'Invoice not found or unauthorized'}), 404
    
    cursor.execute('DELETE FROM invoices WHERE id = %s', (invoice_id,))
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
    cursor = conn.cursor()
    
    # Get stats scoped to current user
    cursor.execute(
        'SELECT COUNT(*) as count FROM clients WHERE user_id = %s',
        (user_id,)
    )
    total_clients = cursor.fetchone()['count']
    
    cursor.execute('''
        SELECT COUNT(*) as count FROM invoices
        JOIN clients ON invoices.client_id = clients.id
        WHERE clients.user_id = %s
    ''', (user_id,))
    total_invoices = cursor.fetchone()['count']
    
    cursor.execute('''
        SELECT COALESCE(SUM(amount), 0) as total FROM invoices
        JOIN clients ON invoices.client_id = clients.id
        WHERE clients.user_id = %s AND invoices.status = 'paid'
    ''', (user_id,))
    paid_total = float(cursor.fetchone()['total'])
    
    cursor.execute('''
        SELECT COALESCE(SUM(amount), 0) as total FROM invoices
        JOIN clients ON invoices.client_id = clients.id
        WHERE clients.user_id = %s AND invoices.status = 'unpaid'
    ''', (user_id,))
    unpaid_total = float(cursor.fetchone()['total'])
    
    conn.close()
    
    return jsonify({
        'total_clients': total_clients,
        'total_invoices': total_invoices,
        'paid_total': paid_total,
        'unpaid_total': unpaid_total
    })


# For Vercel serverless deployment
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
