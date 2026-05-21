from flask import Flask, request, jsonify, session
from flask_cors import CORS
from models_supabase import get_db, init_db, create_user, get_user_by_email, get_user_by_id, verify_password
from datetime import timedelta
import os

app = Flask(__name__)

# Session configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)

# CORS configuration
allowed_origins = [
    'http://localhost:8000',
    'http://localhost:5500',
    'https://freelance-tracker-ao9.pages.dev',
    os.environ.get('FRONTEND_URL', '')
]

frontend_url = os.environ.get('FRONTEND_URL', '')
if frontend_url:
    allowed_origins.append(frontend_url)

CORS(app,
     supports_credentials=True,
     origins=allowed_origins,
     allow_headers=['Content-Type'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

# Initialize DB at startup
init_db()


# ============ HELPER ============

def get_current_user_id():
    """Get the current logged-in user's ID from session."""
    return session.get('user_id')


# ============ AUTHENTICATION ROUTES ============

@app.route('/api/register', methods=['POST'])
def register():
    """Register a new user account."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    email = data.get('email', '').strip()
    password = data.get('password', '')
    name = data.get('name', '').strip()

    if not email or not password or not name:
        return jsonify({'error': 'Email, password, and name are required'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    user_id = create_user(email, password, name)
    if user_id is None:
        return jsonify({'error': 'Email already registered'}), 409

    session.permanent = True
    session['user_id'] = user_id

    return jsonify({
        'message': 'Account created successfully',
        'user': {'id': user_id, 'email': email, 'name': name}
    }), 201


@app.route('/api/login', methods=['POST'])
def login():
    """Login to an existing account."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    email = data.get('email', '').strip()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = get_user_by_email(email)
    if not user or not verify_password(user['password'], password):
        return jsonify({'error': 'Invalid email or password'}), 401

    session.permanent = True
    session['user_id'] = user['id']

    return jsonify({
        'message': 'Login successful',
        'user': {'id': user['id'], 'email': user['email'], 'name': user['name']}
    })


@app.route('/api/logout', methods=['POST'])
def logout():
    """Logout the current user."""
    session.clear()
    return jsonify({'message': 'Logged out successfully'})


@app.route('/api/me', methods=['GET'])
def get_me():
    """Get the current user's profile."""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    user = get_user_by_id(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({'id': user['id'], 'email': user['email'], 'name': user['name']})


# ============ CLIENT ROUTES ============

@app.route('/api/clients', methods=['GET'])
def get_clients():
    """Get all clients for the current user."""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            'SELECT * FROM clients WHERE user_id = %s ORDER BY created_at DESC',
            (user_id,)
        )
        clients = cursor.fetchall()
        return jsonify([dict(c) for c in clients])
    finally:
        conn.close()


@app.route('/api/clients', methods=['POST'])
def create_client():
    """Create a new client."""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    phone = data.get('phone', '').strip()

    if not name or not email:
        return jsonify({'error': 'Name and email are required'}), 400

    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO clients (user_id, name, email, phone) VALUES (%s, %s, %s, %s) RETURNING *',
            (user_id, name, email, phone)
        )
        client = dict(cursor.fetchone())
        conn.commit()
        return jsonify(client), 201
    finally:
        conn.close()


@app.route('/api/clients/<int:client_id>', methods=['GET'])
def get_client(client_id):
    """Get a single client by ID."""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            'SELECT * FROM clients WHERE id = %s AND user_id = %s',
            (client_id, user_id)
        )
        client = cursor.fetchone()
        if not client:
            return jsonify({'error': 'Client not found'}), 404
        return jsonify(dict(client))
    finally:
        conn.close()


@app.route('/api/clients/<int:client_id>', methods=['PUT'])
def update_client(client_id):
    """Update a client."""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    phone = data.get('phone', '').strip()

    if not name or not email:
        return jsonify({'error': 'Name and email are required'}), 400

    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            '''UPDATE clients SET name = %s, email = %s, phone = %s
               WHERE id = %s AND user_id = %s RETURNING *''',
            (name, email, phone, client_id, user_id)
        )
        client = cursor.fetchone()
        if not client:
            return jsonify({'error': 'Client not found'}), 404
        conn.commit()
        return jsonify(dict(client))
    finally:
        conn.close()


@app.route('/api/clients/<int:client_id>', methods=['DELETE'])
def delete_client(client_id):
    """Delete a client and all their invoices."""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            'DELETE FROM clients WHERE id = %s AND user_id = %s RETURNING id',
            (client_id, user_id)
        )
        deleted = cursor.fetchone()
        if not deleted:
            return jsonify({'error': 'Client not found'}), 404
        conn.commit()
        return jsonify({'message': 'Client deleted successfully'})
    finally:
        conn.close()


# ============ INVOICE ROUTES ============

@app.route('/api/invoices', methods=['GET'])
def get_invoices():
    """Get all invoices for the current user."""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            '''SELECT i.*, c.name as client_name, c.email as client_email
               FROM invoices i
               JOIN clients c ON i.client_id = c.id
               WHERE c.user_id = %s
               ORDER BY i.created_at DESC''',
            (user_id,)
        )
        invoices = cursor.fetchall()
        return jsonify([dict(inv) for inv in invoices])
    finally:
        conn.close()


@app.route('/api/invoices', methods=['POST'])
def create_invoice():
    """Create a new invoice."""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    client_id = data.get('client_id')
    amount = data.get('amount')
    description = data.get('description', '')
    status = data.get('status', 'unpaid')
    due_date = data.get('due_date')

    if not client_id or not amount:
        return jsonify({'error': 'Client ID and amount are required'}), 400

    conn = get_db()
    try:
        cursor = conn.cursor()
        # Verify the client belongs to this user
        cursor.execute(
            'SELECT id FROM clients WHERE id = %s AND user_id = %s',
            (client_id, user_id)
        )
        if not cursor.fetchone():
            return jsonify({'error': 'Client not found'}), 404

        cursor.execute(
            '''INSERT INTO invoices (client_id, amount, description, status, due_date)
               VALUES (%s, %s, %s, %s, %s) RETURNING *''',
            (client_id, amount, description, status, due_date or None)
        )
        invoice = dict(cursor.fetchone())
        conn.commit()
        return jsonify(invoice), 201
    finally:
        conn.close()


@app.route('/api/invoices/<int:invoice_id>', methods=['GET'])
def get_invoice(invoice_id):
    """Get a single invoice by ID."""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            '''SELECT i.*, c.name as client_name
               FROM invoices i
               JOIN clients c ON i.client_id = c.id
               WHERE i.id = %s AND c.user_id = %s''',
            (invoice_id, user_id)
        )
        invoice = cursor.fetchone()
        if not invoice:
            return jsonify({'error': 'Invoice not found'}), 404
        return jsonify(dict(invoice))
    finally:
        conn.close()


@app.route('/api/invoices/<int:invoice_id>', methods=['PUT'])
def update_invoice(invoice_id):
    """Update an invoice."""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    amount = data.get('amount')
    description = data.get('description', '')
    status = data.get('status', 'unpaid')
    due_date = data.get('due_date')

    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            '''UPDATE invoices SET amount = %s, description = %s, status = %s, due_date = %s
               WHERE id = %s
               AND client_id IN (SELECT id FROM clients WHERE user_id = %s)
               RETURNING *''',
            (amount, description, status, due_date or None, invoice_id, user_id)
        )
        invoice = cursor.fetchone()
        if not invoice:
            return jsonify({'error': 'Invoice not found'}), 404
        conn.commit()
        return jsonify(dict(invoice))
    finally:
        conn.close()


@app.route('/api/invoices/<int:invoice_id>', methods=['DELETE'])
def delete_invoice(invoice_id):
    """Delete an invoice."""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            '''DELETE FROM invoices
               WHERE id = %s
               AND client_id IN (SELECT id FROM clients WHERE user_id = %s)
               RETURNING id''',
            (invoice_id, user_id)
        )
        deleted = cursor.fetchone()
        if not deleted:
            return jsonify({'error': 'Invoice not found'}), 404
        conn.commit()
        return jsonify({'message': 'Invoice deleted successfully'})
    finally:
        conn.close()


# ============ STATS ROUTE ============

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get summary statistics for the current user."""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401

    conn = get_db()
    try:
        cursor = conn.cursor()

        cursor.execute('SELECT COUNT(*) as count FROM clients WHERE user_id = %s', (user_id,))
        total_clients = cursor.fetchone()['count']

        cursor.execute(
            '''SELECT COUNT(*) as count FROM invoices i
               JOIN clients c ON i.client_id = c.id
               WHERE c.user_id = %s''',
            (user_id,)
        )
        total_invoices = cursor.fetchone()['count']

        cursor.execute(
            '''SELECT COALESCE(SUM(i.amount), 0) as total FROM invoices i
               JOIN clients c ON i.client_id = c.id
               WHERE c.user_id = %s AND i.status = 'paid' ''',
            (user_id,)
        )
        paid_total = float(cursor.fetchone()['total'])

        cursor.execute(
            '''SELECT COALESCE(SUM(i.amount), 0) as total FROM invoices i
               JOIN clients c ON i.client_id = c.id
               WHERE c.user_id = %s AND i.status = 'unpaid' ''',
            (user_id,)
        )
        unpaid_total = float(cursor.fetchone()['total'])

        return jsonify({
            'total_clients': total_clients,
            'total_invoices': total_invoices,
            'paid_total': paid_total,
            'unpaid_total': unpaid_total
        })
    finally:
        conn.close()


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
