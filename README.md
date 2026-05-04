# 🛡️ AegisVault

**Zero-Knowledge Enterprise Document Management System**

AegisVault is a MERN stack application that provides end-to-end encrypted document storage. Files are encrypted in the browser using **AES-256-GCM** via the Web Crypto API before upload — the server never sees plaintext content, ensuring true zero-knowledge architecture.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Browser (React + Web Crypto API)                            │
│  ┌────────────┐  ┌───────────────┐  ┌─────────────────────┐ │
│  │ Redux Store│  │ AES-256-GCM   │  │ Encrypted Upload    │ │
│  │ Auth State │  │ Encrypt/      │  │ (ciphertext + IV    │ │
│  │ Doc State  │  │ Decrypt       │  │  sent to server)    │ │
│  └────────────┘  └───────────────┘  └─────────────────────┘ │
└──────────────────────┬───────────────────────────────────────┘
                       │ HTTPS (JWT Bearer)
┌──────────────────────▼───────────────────────────────────────┐
│  Express API                                                  │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐   │
│  │ Auth       │  │ Document   │  │ S3 Storage           │   │
│  │ (Bcrypt +  │  │ CRUD       │  │ (encrypted blobs)    │   │
│  │  JWT)      │  │            │  │                      │   │
│  └────────────┘  └────────────┘  └──────────────────────┘   │
└──────────────────────┬───────────────────────────────────────┘
                       │
              ┌────────▼────────┐
              │   MongoDB       │
              │   (metadata     │
              │    only — no    │
              │    plaintext)   │
              └─────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **Docker & Docker Compose** (optional, for containerized setup)
- **MongoDB** (local or Atlas)
- **AWS S3** bucket (for document storage)

### 1. Clone & Configure

```bash
git clone <repo-url> AegisVault
cd AegisVault
cp .env.example .env
# Fill in your values in .env
```

### 2A. Run with Docker (Recommended)

```bash
docker-compose up --build
```

| Service  | URL                     |
|----------|-------------------------|
| Frontend | http://localhost:5173    |
| Backend  | http://localhost:5000    |
| MongoDB  | mongodb://localhost:27017 |

### 2B. Run Manually

```bash
# Backend
cd server
npm install
npm run dev

# Frontend (in a new terminal)
cd client
npm install
npm run dev
```

---

## 📁 Project Structure

```
AegisVault/
├── .env.example
├── .gitignore
├── docker-compose.yml
├── README.md
│
├── client/                          # React 19 + Vite + Tailwind v4
│   ├── Dockerfile
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── index.css                # Tailwind + design tokens
│       ├── main.jsx                 # Entry point
│       ├── App.jsx                  # Route definitions
│       ├── components/
│       │   ├── Layout.jsx           # App shell with sidebar
│       │   └── ProtectedRoute.jsx   # Auth guard
│       ├── pages/
│       │   ├── LoginPage.jsx
│       │   ├── RegisterPage.jsx
│       │   ├── DashboardPage.jsx
│       │   └── UploadPage.jsx
│       ├── store/
│       │   ├── store.js             # Redux store
│       │   └── slices/
│       │       ├── authSlice.js
│       │       └── documentSlice.js
│       ├── services/
│       │   └── api.js               # Axios client
│       └── utils/
│           └── crypto.js            # Web Crypto AES-256-GCM
│
└── server/                          # Node.js + Express
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── index.js                 # Server entry point
        ├── config/
        │   ├── db.js                # MongoDB connection
        │   └── s3.js                # AWS S3 client
        ├── models/
        │   ├── User.model.js
        │   └── Document.model.js
        ├── middleware/
        │   ├── auth.middleware.js    # JWT verification
        │   └── error.middleware.js   # Global error handler
        ├── controllers/
        │   ├── auth.controller.js
        │   ├── document.controller.js
        │   └── user.controller.js
        ├── routes/
        │   ├── auth.routes.js
        │   ├── document.routes.js
        │   └── user.routes.js
        └── utils/
            └── token.js             # JWT generation helper
```

---

## 🔒 Security Features

| Feature | Implementation |
|---------|---------------|
| Client-side encryption | AES-256-GCM via Web Crypto API |
| Password hashing | Bcrypt (12 rounds) |
| Authentication | JWT (HTTP-only cookies + Bearer header) |
| Zero-knowledge | Server never receives plaintext documents |
| Transport security | HTTPS (configure in production) |

---

## 📡 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user | ✗ |
| POST | `/api/auth/login` | Login | ✗ |
| POST | `/api/auth/logout` | Logout | ✓ |
| GET | `/api/auth/me` | Get current user | ✓ |
| GET | `/api/users/profile` | Get profile | ✓ |
| PUT | `/api/users/profile` | Update profile | ✓ |
| GET | `/api/users` | List users | ✓ |
| GET | `/api/documents` | List documents | ✓ |
| GET | `/api/documents/:id` | Get document | ✓ |
| POST | `/api/documents` | Upload document | ✓ |
| DELETE | `/api/documents/:id` | Delete document | ✓ |

---

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, Redux Toolkit, React Router v7
- **Backend:** Node.js, Express, Mongoose ODM
- **Database:** MongoDB 7
- **Storage:** AWS S3 (v3 SDK)
- **Security:** Web Crypto API, JWT, Bcrypt
- **DevOps:** Docker, Docker Compose
