"""
models.py - Database models for FreelancePay Tracker

Handles database operations for users, clients, and invoices.
"""

import sqlite3
from datetime import datetime
import hashlib

# Database filename - can be overridden for testing
DATABASE = 'freelance.db'


def get_db():
    """Creates and returns a database connection."""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row  # Return rows as dictionaries
    return conn


def hash_password(password):
    """
    Hash a password using SHA-256 for secure storage.
    Never store plain text passwords.
    """
    return hashlib.sha256(password.encode('utf-8')).hexdigest()


def verify_password(stored_password, provided_password):
    """Verify a password against a stored hash."""
    return stored_password == hash_password(provided_password)


def init_db():
    """Initialize database tables with user authentication support."""
    conn = get_db()
    cursor = conn.cursor()
    
    # Users table - stores account information
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Clients table - linked to users via user_id
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    ''')
    
    # Invoices table - linked to clients via client_id
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'unpaid',
            due_date TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE
        )
    ''')
    
    conn.commit()
    conn.close()
    print("Database initialized!")


def create_user(email, password, name):
    """
    Create a new user account.
    Returns user_id if successful, None if email already exists.
    """
    conn = get_db()
    try:
        hashed_pw = hash_password(password)
        cursor = conn.execute(
            'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
            (email, hashed_pw, name)
        )
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()
        return user_id
    except sqlite3.IntegrityError:
        # Email already exists
        conn.close()
        return None


def get_user_by_email(email):
    """Find a user by email address."""
    conn = get_db()
    user = conn.execute(
        'SELECT * FROM users WHERE email = ?',
        (email,)
    ).fetchone()
    conn.close()
    return user


def get_user_by_id(user_id):
    """Find a user by ID."""
    conn = get_db()
    user = conn.execute(
        'SELECT * FROM users WHERE id = ?',
        (user_id,)
    ).fetchone()
    conn.close()
    return user


if __name__ == '__main__':
    init_db()
