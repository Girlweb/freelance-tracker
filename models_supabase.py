"""
models_supabase.py - Database models for FreelancePay Tracker (PostgreSQL)
Works with Railway PostgreSQL or Supabase PostgreSQL.
"""
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import hashlib

DATABASE_URL = os.environ.get('DATABASE_URL')


def get_db():
    """Creates and returns a PostgreSQL database connection."""
    if not DATABASE_URL:
        raise Exception("DATABASE_URL environment variable is not set!")
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    return conn


def hash_password(password):
    """Hash a password using SHA-256."""
    return hashlib.sha256(password.encode('utf-8')).hexdigest()


def verify_password(stored_password, provided_password):
    """Verify a password against a stored hash."""
    return stored_password == hash_password(provided_password)


def init_db():
    """Initialize database tables. Errors are logged but don't crash the app."""
    conn = None
    cursor = None
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
        print("Database initialized successfully!")

    except Exception as e:
        print(f"Database init error: {e}")
        if conn:
            conn.rollback()
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def create_user(email, password, name):
    """
    Create a new user account.
    Returns user_id if successful, None if email already exists.
    """
    conn = None
    try:
        hashed_pw = hash_password(password)
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO users (email, password, name) VALUES (%s, %s, %s) RETURNING id',
            (email, hashed_pw, name)
        )
        user_id = cursor.fetchone()['id']
        conn.commit()
        return user_id
    except psycopg2.IntegrityError:
        if conn:
            conn.rollback()
        return None
    except Exception as e:
        print(f"create_user error: {e}")
        if conn:
            conn.rollback()
        return None
    finally:
        if conn:
            conn.close()


def get_user_by_email(email):
    """Find a user by email address."""
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE email = %s', (email,))
        user = cursor.fetchone()
        return dict(user) if user else None
    except Exception as e:
        print(f"get_user_by_email error: {e}")
        return None
    finally:
        if conn:
            conn.close()


def get_user_by_id(user_id):
    """Find a user by ID."""
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE id = %s', (user_id,))
        user = cursor.fetchone()
        return dict(user) if user else None
    except Exception as e:
        print(f"get_user_by_id error: {e}")
        return None
    finally:
        if conn:
            conn.close()
