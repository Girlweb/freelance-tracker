"""
models_supabase.py - Database models for FreelancePay Tracker (PostgreSQL/Supabase)
"""
import psycopg2
from psycopg2.extras import RealDictCursor
import hashlib
import os

# Get database URL from environment variable
DATABASE_URL = os.environ.get('DATABASE_URL')

def get_db():
    """Creates and returns a database connection."""
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    return conn

def hash_password(password):
    """Hash a password using SHA-256 for secure storage."""
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def verify_password(stored_password, provided_password):
    """Verify a password against a stored hash."""
    return stored_password == hash_password(provided_password)

def init_db():
    """Initialize database tables"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                name TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS clients (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS invoices (
                id SERIAL PRIMARY KEY,
                client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                amount DECIMAL(10,2) NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'unpaid',
                due_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
        print("Database initialized!")
    except Exception as e:
        print(f"Database init error: {e}")
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Clients table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS clients (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Invoices table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS invoices (
            id SERIAL PRIMARY KEY,
            client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
            amount DECIMAL(10,2) NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'unpaid',
            due_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()
    print("Database initialized successfully!")

def create_user(email, password, name):
    """Create a new user account."""
    conn = get_db()
    try:
        hashed_pw = hash_password(password)
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO users (email, password, name) VALUES (%s, %s, %s) RETURNING id',
            (email, hashed_pw, name)
        )
        user_id = cursor.fetchone()['id']
        conn.commit()
        conn.close()
        return user_id
    except psycopg2.IntegrityError:
        conn.close()
        return None

def get_user_by_email(email):
    """Find a user by email address."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE email = %s', (email,))
    user = cursor.fetchone()
    conn.close()
    return user

def get_user_by_id(user_id):
    """Find a user by ID."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE id = %s', (user_id,))
    user = cursor.fetchone()
    conn.close()
    return user

if __name__ == '__main__':
    init_db()
