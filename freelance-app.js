/**
 * app.js - FreelancePay Tracker with Railway Backend
 * Frontend app that connects to Flask API
 */

// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://freelance-tracker-production.up.railway.app'\;

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

// ============ API HELPERS ============

async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}
