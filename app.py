from flask import Flask, request, jsonify
from flask_cors import CORS
from models import get_db, init_db

app = Flask(__name__)
CORS(app)
init_db()


@app.route('/api/clients', methods=['GET'])
def get_clients():
    """Returns all clients from database."""
    conn = get_db()
    clients = conn.execute('SELECT * FROM clients ORDER BY created_at DESC').fetchall()
    conn.close()
    return jsonify([dict(client) for client in clients])


@app.route('/api/clients', methods=['POST'])
def create_client():
    """Creates a new client."""
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    phone = data.get('phone', '')
    
    if not name or not email:
        return jsonify({'error': 'Name and email are required'}), 400
    
    conn = get_db()
    cursor = conn.execute(
        'INSERT INTO clients (name, email, phone) VALUES (?, ?, ?)',
        (name, email, phone)
    )
    conn.commit()
    client_id = cursor.lastrowid
    conn.close()
    
    return jsonify({'id': client_id, 'message': 'Client created successfully'}), 201


@app.route('/api/clients/<int:client_id>', methods=['DELETE'])
def delete_client(client_id):
    """Deletes a client and their invoices."""
    conn = get_db()
    conn.execute('DELETE FROM clients WHERE id = ?', (client_id,))
    conn.execute('DELETE FROM invoices WHERE client_id = ?', (client_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Client deleted successfully'})


@app.route('/api/invoices', methods=['GET'])
def get_invoices():
    """Returns all invoices with client details."""
    conn = get_db()
    invoices = conn.execute('''
        SELECT 
            invoices.*,
            clients.name as client_name
        FROM invoices
        JOIN clients ON invoices.client_id = clients.id
        ORDER BY invoices.created_at DESC
    ''').fetchall()
    conn.close()
    return jsonify([dict(invoice) for invoice in invoices])


@app.route('/api/invoices', methods=['POST'])
def create_invoice():
    """Creates a new invoice."""
    data = request.get_json()
    client_id = data.get('client_id')
    amount = data.get('amount')
    description = data.get('description', '')
    due_date = data.get('due_date', '')
    
    if not client_id or not amount:
        return jsonify({'error': 'Client ID and amount are required'}), 400
    
    conn = get_db()
    cursor = conn.execute(
        'INSERT INTO invoices (client_id, amount, description, due_date) VALUES (?, ?, ?, ?)',
        (client_id, amount, description, due_date)
    )
    conn.commit()
    invoice_id = cursor.lastrowid
    conn.close()
    
    return jsonify({'id': invoice_id, 'message': 'Invoice created successfully'}), 201


@app.route('/api/invoices/<int:invoice_id>/status', methods=['PUT'])
def update_invoice_status(invoice_id):
    """Updates invoice payment status."""
    data = request.get_json()
    status = data.get('status')
    
    if status not in ['paid', 'unpaid']:
        return jsonify({'error': 'Status must be paid or unpaid'}), 400
    
    conn = get_db()
    conn.execute('UPDATE invoices SET status = ? WHERE id = ?', (status, invoice_id))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Invoice status updated successfully'})


@app.route('/api/invoices/<int:invoice_id>', methods=['DELETE'])
def delete_invoice(invoice_id):
    """Deletes an invoice."""
    conn = get_db()
    conn.execute('DELETE FROM invoices WHERE id = ?', (invoice_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Invoice deleted successfully'})


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Returns dashboard statistics."""
    conn = get_db()
    
    total_clients = conn.execute('SELECT COUNT(*) as count FROM clients').fetchone()['count']
    total_invoices = conn.execute('SELECT COUNT(*) as count FROM invoices').fetchone()['count']
    paid_total = conn.execute("SELECT SUM(amount) as total FROM invoices WHERE status = 'paid'").fetchone()['total'] or 0
    unpaid_total = conn.execute("SELECT SUM(amount) as total FROM invoices WHERE status = 'unpaid'").fetchone()['total'] or 0
    
    conn.close()
    
    return jsonify({
        'total_clients': total_clients,
        'total_invoices': total_invoices,
        'paid_total': paid_total,
        'unpaid_total': unpaid_total
    })


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
