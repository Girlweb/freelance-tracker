# 💼 FreelancePay Tracker

A full-stack web application for freelancers to manage clients, invoices, and payments. Built with Flask (Python) backend and vanilla JavaScript frontend.

![FreelancePay Tracker](https://img.shields.io/badge/Status-Live-success)
![Python](https://img.shields.io/badge/Python-3.8+-blue)
![Flask](https://img.shields.io/badge/Flask-3.0-lightgrey)
![License](https://img.shields.io/badge/License-MIT-green)

##  Features

### Core Functionality
- **User Authentication** - Secure registration and login system with password hashing
- **Client Management** - Add, edit, delete, and search clients with contact information
- **Invoice Tracking** - Create, edit, and manage invoices with customizable descriptions
- **Payment Status** - Track paid and unpaid invoices with status filtering
- **Dashboard Analytics** - Real-time statistics showing revenue and business metrics
- **Multi-page Interface** - Clean navigation between Home, Clients, Invoices, Reports, and Support

### Technical Features
- **REST API** - Clean API architecture with proper HTTP methods
- **Session Management** - Secure user sessions with Flask sessions
- **Data Isolation** - Users can only access their own data
- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Dark/Light Theme** - Toggle between dark and light modes
- **Search & Filter** - Real-time client search and invoice status filtering
- **Edit Functionality** - Update client and invoice information with modal dialogs
- **Form Validation** - Client-side and server-side input validation
- **Automated Testing** - Comprehensive test suite with 16+ tests

##  Live Demo

**Frontend:** https://freelance-tracker-qayl.vercel.app/  
**Backend API:** https://freelance-tracker-api.onrender.com/

> **Note:** The free Render instance may take 50+ seconds to wake up on first request after inactivity.

##  Tech Stack

### Backend
- **Python 3.8+** - Core programming language
- **Flask 3.0** - Web framework
- **SQLite** - Database
- **Flask-CORS** - Cross-origin resource sharing
- **Gunicorn** - Production WSGI server

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling with CSS Variables for theming
- **Vanilla JavaScript** - No frameworks, pure JavaScript
- **Responsive Design** - Mobile-first approach

### Deployment
- **Backend:** Render.com (Free tier)
- **Frontend:** Vercel (Free tier)

### Testing
- **unittest** - Python's built-in testing framework
- **16 Test Cases** - Covering authentication, CRUD operations, and data isolation

##  Prerequisites

Before running this project locally, make sure you have:

- Python 3.8 or higher
- pip (Python package manager)
- A modern web browser (Chrome, Firefox, Safari, Edge)

## 🔧 Local Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Girlweb/freelance-tracker.git
cd freelance-tracker
```

### 2. Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Initialize Database

```bash
python3 models.py
```

### 5. Run the Application

**Start Backend Server:**
```bash
python3 app.py
```

**Start Frontend Server (in a new terminal):**
```bash
python3 -m http.server 8000
```

**Access the Application:**
- Open your browser and go to `http://localhost:8000`
- Backend API runs on `http://localhost:5000`

##  Running Tests

```bash
python3 test_app.py
```

**Expected output:**
```
Tests Run: 16
Successes: 16
Failures: 0
Errors: 0
```

##  Project Structure

```
freelance-tracker/
├── app.py                  # Flask backend API
├── models.py              # Database models and functions
├── test_app.py            # Automated tests
├── index.html             # Frontend HTML
├── app.js                 # Frontend JavaScript
├── styles.css             # Frontend styling
├── requirements.txt       # Python dependencies
├── Procfile               # Render deployment config
├── vercel.json           # Vercel deployment config
├── .gitignore            # Git ignore file
├── README.md             # This file
└── freelance.db          # SQLite database (created on first run)
```

##  Security Features

- **Password Hashing** - SHA-256 hashing for password storage
- **Session Management** - Secure Flask sessions with secret keys
- **SQL Injection Prevention** - Parameterized queries
- **Authorization Checks** - Users can only access their own data
- **Input Validation** - Both client-side and server-side validation
- **CORS Configuration** - Properly configured cross-origin requests

##  Design Philosophy

- **Minimalist UI** - Clean, distraction-free interface
- **Dark Mode First** - Easy on the eyes, professional look
- **Responsive** - Works seamlessly on all devices
- **Fast** - Vanilla JavaScript for optimal performance
- **Accessible** - Proper contrast ratios and semantic HTML

##  API Endpoints

### Authentication
- `POST /api/register` - Create new user account
- `POST /api/login` - Authenticate user
- `POST /api/logout` - End user session
- `GET /api/me` - Get current user information

### Clients
- `GET /api/clients` - Get all clients for logged-in user
- `POST /api/clients` - Create new client
- `PUT /api/clients/:id` - Update client information
- `DELETE /api/clients/:id` - Delete client

### Invoices
- `GET /api/invoices` - Get all invoices
- `POST /api/invoices` - Create new invoice
- `PUT /api/invoices/:id` - Update invoice information
- `PUT /api/invoices/:id/status` - Update invoice payment status
- `DELETE /api/invoices/:id` - Delete invoice

### Statistics
- `GET /api/stats` - Get dashboard statistics

##  Deployment Guide

### Backend Deployment (Render.com)

1. **Create account on [Render.com](https://render.com)**
2. **Connect GitHub repository**
3. **Create new Web Service with these settings:**
   ```
   Name: freelance-tracker-api
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: gunicorn app:app
   Instance Type: Free
   ```
4. **Add Environment Variables:**
   ```
   SECRET_KEY=your-random-secret-key-here
   FRONTEND_URL=https://your-frontend-url.vercel.app
   ```
5. **Deploy!**

### Frontend Deployment (Vercel)

1. **Go to [Vercel.com](https://vercel.com)**
2. **Import GitHub repository**
3. **Deploy** (Vercel auto-detects static site)
4. **Update app.js** with your Render backend URL:
   ```javascript
   const API_URL = 'https://freelance-tracker-api.onrender.com/api';
   ```

##  Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

##  Future Enhancements

- [ ] PDF invoice generation
- [ ] Email notifications for overdue invoices
- [ ] Charts and graphs for financial insights
- [ ] Export data to CSV/Excel
- [ ] Multi-currency support
- [ ] Recurring invoices
- [ ] Payment gateway integration
- [ ] Mobile app (React Native)
- [ ] Theme preference persistence (localStorage)
- [ ] Password recovery feature

##  Known Issues

- Free Render instance spins down after inactivity (50+ second cold start)
- Theme preference not persisted across sessions
- No password recovery feature yet

##  License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

##  Author

**Girlweb**

- GitHub: [@Girlweb](https://github.com/Girlweb)
- Project Link: [FreelancePay Tracker](https://github.com/Girlweb/freelance-tracker)

##  Acknowledgments

- Inspired by the need for simple, free invoicing tools for freelancers
- Built as part of learning full-stack development
- Special thanks to the open-source community

##  Support

For support, open an issue on [GitHub](https://github.com/Girlweb/freelance-tracker/issues).

---

**Made with ❤️ by Girlweb**

 **Star this repo if you find it helpful!**

##  Quick Start

1. **Try the live demo:** https://freelance-tracker-qayl.vercel.app/
2. **Register a new account**
3. **Add your first client**
4. **Create an invoice**
5. **Track your payments!**

---

###  Project Stats

![GitHub repo size](https://img.shields.io/github/repo-size/Girlweb/freelance-tracker)
![GitHub stars](https://img.shields.io/github/stars/Girlweb/freelance-tracker?style=social)
![GitHub forks](https://img.shields.io/github/forks/Girlweb/freelance-tracker?style=social)
