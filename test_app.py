"""
test_app.py - API Tests for FreelancePay Tracker

Comprehensive test suite covering all API endpoints.
Run with: python3 test_app.py
"""

import unittest
import json
import os
from app import app
import models


class FreelanceTrackerTestCase(unittest.TestCase):
    """Test suite for FreelancePay Tracker API"""
    
    def setUp(self):
        """Set up test environment before each test"""
        # Use separate test database
        models.DATABASE = 'test_freelance.db'
        
        app.config['TESTING'] = True
        self.client = app.test_client()
        
        # Initialize fresh database for each test
        models.init_db()
        
        print(f"\n{'='*60}")
        print(f"Running: {self._testMethodName}")
        print(f"{'='*60}")
    
    def tearDown(self):
        """Clean up after each test"""
        if os.path.exists('test_freelance.db'):
            os.remove('test_freelance.db')
    
    # ============ STATS ENDPOINT TESTS ============
    
    def test_get_stats_empty(self):
        """Test /api/stats returns zeros when database is empty"""
        response = self.client.get('/api/stats')
        data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['total_clients'], 0)
        self.assertEqual(data['total_invoices'], 0)
        self.assertEqual(data['paid_total'], 0)
        self.assertEqual(data['unpaid_total'], 0)
        
        print("✓ Stats endpoint returns correct empty state")
    
    # ============ CLIENT ENDPOINT TESTS ============
    
    def test_get_clients_empty(self):
        """Test /api/clients returns empty list initially"""
        response = self.client.get('/api/clients')
        data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data, [])
        
        print("✓ Clients endpoint returns empty list")
    
    def test_create_client_success(self):
        """Test creating a client with valid data"""
        client_data = {
            'name': 'John Doe',
            'email': 'john@example.com',
            'phone': '0712345678'
        }
        
        response = self.client.post(
            '/api/clients',
            data=json.dumps(client_data),
            content_type='application/json'
        )
        data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 201)
        self.assertIn('id', data)
        self.assertEqual(data['message'], 'Client created successfully')
        
        print(f"✓ Client created successfully with ID: {data['id']}")
    
    def test_create_client_missing_name(self):
        """Test creating client without name fails"""
        client_data = {
            'email': 'john@example.com',
            'phone': '0712345678'
        }
        
        response = self.client.post(
            '/api/clients',
            data=json.dumps(client_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 400)
        print("✓ Client creation fails without name (as expected)")
    
    def test_create_client_missing_email(self):
        """Test creating client without email fails"""
        client_data = {
            'name': 'John Doe',
            'phone': '0712345678'
        }
        
        response = self.client.post(
            '/api/clients',
            data=json.dumps(client_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 400)
        print("✓ Client creation fails without email (as expected)")
    
    def test_get_clients_after_creation(self):
        """Test retrieving clients after creating one"""
        client_data = {
            'name': 'Jane Smith',
            'email': 'jane@example.com',
            'phone': '0723456789'
        }
        
        self.client.post(
            '/api/clients',
            data=json.dumps(client_data),
            content_type='application/json'
        )
        
        response = self.client.get('/api/clients')
        data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['name'], 'Jane Smith')
        self.assertEqual(data[0]['email'], 'jane@example.com')
        
        print("✓ Client retrieval works correctly")
    
    def test_delete_client(self):
        """Test deleting a client"""
        client_data = {
            'name': 'To Delete',
            'email': 'delete@example.com'
        }
        
        create_response = self.client.post(
            '/api/clients',
            data=json.dumps(client_data),
            content_type='application/json'
        )
        client_id = json.loads(create_response.data)['id']
        
        delete_response = self.client.delete(f'/api/clients/{client_id}')
        self.assertEqual(delete_response.status_code, 200)
        
        # Verify client is gone
        get_response = self.client.get('/api/clients')
        clients = json.loads(get_response.data)
        self.assertEqual(len(clients), 0)
        
        print(f"✓ Client {client_id} deleted successfully")
    
    # ============ INVOICE ENDPOINT TESTS ============
    
    def test_get_invoices_empty(self):
        """Test /api/invoices returns empty list initially"""
        response = self.client.get('/api/invoices')
        data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data, [])
        
        print("✓ Invoices endpoint returns empty list")
    
    def test_create_invoice_success(self):
        """Test creating an invoice with valid data"""
        # Create client first
        client_data = {
            'name': 'Invoice Client',
            'email': 'invoice@example.com'
        }
        client_response = self.client.post(
            '/api/clients',
            data=json.dumps(client_data),
            content_type='application/json'
        )
        client_id = json.loads(client_response.data)['id']
        
        # Create invoice
        invoice_data = {
            'client_id': client_id,
            'amount': 5000.00,
            'description': 'Website Development',
            'due_date': '2024-12-31'
        }
        
        response = self.client.post(
            '/api/invoices',
            data=json.dumps(invoice_data),
            content_type='application/json'
        )
        data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 201)
        self.assertIn('id', data)
        self.assertEqual(data['message'], 'Invoice created successfully')
        
        print(f"✓ Invoice created successfully with ID: {data['id']}")
    
    def test_create_invoice_missing_client_id(self):
        """Test creating invoice without client_id fails"""
        invoice_data = {
            'amount': 5000.00,
            'description': 'Test'
        }
        
        response = self.client.post(
            '/api/invoices',
            data=json.dumps(invoice_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 400)
        print("✓ Invoice creation fails without client_id (as expected)")
    
    def test_create_invoice_missing_amount(self):
        """Test creating invoice without amount fails"""
        invoice_data = {
            'client_id': 1,
            'description': 'Test'
        }
        
        response = self.client.post(
            '/api/invoices',
            data=json.dumps(invoice_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 400)
        print("✓ Invoice creation fails without amount (as expected)")
    
    def test_update_invoice_status_to_paid(self):
        """Test marking an invoice as paid"""
        # Create client and invoice
        client_data = {'name': 'Test', 'email': 'test@example.com'}
        client_response = self.client.post(
            '/api/clients',
            data=json.dumps(client_data),
            content_type='application/json'
        )
        client_id = json.loads(client_response.data)['id']
        
        invoice_data = {
            'client_id': client_id,
            'amount': 3000.00,
            'description': 'Testing'
        }
        invoice_response = self.client.post(
            '/api/invoices',
            data=json.dumps(invoice_data),
            content_type='application/json'
        )
        invoice_id = json.loads(invoice_response.data)['id']
        
        # Update status to paid
        update_response = self.client.put(
            f'/api/invoices/{invoice_id}/status',
            data=json.dumps({'status': 'paid'}),
            content_type='application/json'
        )
        
        self.assertEqual(update_response.status_code, 200)
        print(f"✓ Invoice {invoice_id} marked as paid")
    
    def test_update_invoice_status_invalid(self):
        """Test updating invoice with invalid status fails"""
        # Create client and invoice
        client_data = {'name': 'Test', 'email': 'test@example.com'}
        client_response = self.client.post(
            '/api/clients',
            data=json.dumps(client_data),
            content_type='application/json'
        )
        client_id = json.loads(client_response.data)['id']
        
        invoice_data = {
            'client_id': client_id,
            'amount': 1000.00
        }
        invoice_response = self.client.post(
            '/api/invoices',
            data=json.dumps(invoice_data),
            content_type='application/json'
        )
        invoice_id = json.loads(invoice_response.data)['id']
        
        # Try invalid status
        update_response = self.client.put(
            f'/api/invoices/{invoice_id}/status',
            data=json.dumps({'status': 'invalid_status'}),
            content_type='application/json'
        )
        
        self.assertEqual(update_response.status_code, 400)
        print("✓ Invalid status rejected (as expected)")
    
    def test_delete_invoice(self):
        """Test deleting an invoice"""
        # Create client and invoice
        client_data = {'name': 'Test', 'email': 'test@example.com'}
        client_response = self.client.post(
            '/api/clients',
            data=json.dumps(client_data),
            content_type='application/json'
        )
        client_id = json.loads(client_response.data)['id']
        
        invoice_data = {
            'client_id': client_id,
            'amount': 2000.00
        }
        invoice_response = self.client.post(
            '/api/invoices',
            data=json.dumps(invoice_data),
            content_type='application/json'
        )
        invoice_id = json.loads(invoice_response.data)['id']
        
        # Delete invoice
        delete_response = self.client.delete(f'/api/invoices/{invoice_id}')
        self.assertEqual(delete_response.status_code, 200)
        
        # Verify it's gone
        get_response = self.client.get('/api/invoices')
        invoices = json.loads(get_response.data)
        self.assertEqual(len(invoices), 0)
        
        print(f"✓ Invoice {invoice_id} deleted successfully")
    
    # ============ INTEGRATION TESTS ============
    
    def test_stats_update_after_operations(self):
        """Test that stats update correctly after operations"""
        # Create client
        client_data = {'name': 'Stats Test', 'email': 'stats@example.com'}
        client_response = self.client.post(
            '/api/clients',
            data=json.dumps(client_data),
            content_type='application/json'
        )
        client_id = json.loads(client_response.data)['id']
        
        # Create paid invoice
        paid_invoice = {
            'client_id': client_id,
            'amount': 5000.00,
            'description': 'Paid work'
        }
        paid_response = self.client.post(
            '/api/invoices',
            data=json.dumps(paid_invoice),
            content_type='application/json'
        )
        paid_id = json.loads(paid_response.data)['id']
        
        # Mark as paid
        self.client.put(
            f'/api/invoices/{paid_id}/status',
            data=json.dumps({'status': 'paid'}),
            content_type='application/json'
        )
        
        # Create unpaid invoice
        unpaid_invoice = {
            'client_id': client_id,
            'amount': 3000.00,
            'description': 'Pending work'
        }
        self.client.post(
            '/api/invoices',
            data=json.dumps(unpaid_invoice),
            content_type='application/json'
        )
        
        # Check stats
        stats_response = self.client.get('/api/stats')
        stats = json.loads(stats_response.data)
        
        self.assertEqual(stats['total_clients'], 1)
        self.assertEqual(stats['total_invoices'], 2)
        self.assertEqual(stats['paid_total'], 5000.00)
        self.assertEqual(stats['unpaid_total'], 3000.00)
        
        print("✓ Stats update correctly after operations")
        print(f"  - Total Clients: {stats['total_clients']}")
        print(f"  - Total Invoices: {stats['total_invoices']}")
        print(f"  - Paid: KSh {stats['paid_total']}")
        print(f"  - Unpaid: KSh {stats['unpaid_total']}")
    
    def test_delete_client_cascades_to_invoices(self):
        """Test that deleting a client also deletes their invoices"""
        # Create client
        client_data = {'name': 'Cascade Test', 'email': 'cascade@example.com'}
        client_response = self.client.post(
            '/api/clients',
            data=json.dumps(client_data),
            content_type='application/json'
        )
        client_id = json.loads(client_response.data)['id']
        
        # Create invoice for client
        invoice_data = {
            'client_id': client_id,
            'amount': 1000.00
        }
        self.client.post(
            '/api/invoices',
            data=json.dumps(invoice_data),
            content_type='application/json'
        )
        
        # Delete client
        self.client.delete(f'/api/clients/{client_id}')
        
        # Verify invoices are gone
        invoices_response = self.client.get('/api/invoices')
        invoices = json.loads(invoices_response.data)
        self.assertEqual(len(invoices), 0)
        
        print("✓ Deleting client cascades to invoices (as expected)")


if __name__ == '__main__':
    """Run all tests with detailed output"""
    suite = unittest.TestLoader().loadTestsFromTestCase(FreelanceTrackerTestCase)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Print summary
    print(f"\n{'='*60}")
    print("TEST SUMMARY")
    print(f"{'='*60}")
    print(f"Tests Run: {result.testsRun}")
    print(f"Successes: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"{'='*60}")
    
    exit(0 if result.wasSuccessful() else 1)
