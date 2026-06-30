# IssueSnap — Production-Ready Full Stack App

A civic issue reporting portal with MongoDB Atlas backend, JWT authentication, OTP email verification, and real-time data.

---

## 📁 Project Structure

```
issuesnap/
├── src/                    ← Frontend (React + TanStack Router + Vite)
│   ├── routes/             ← All pages
│   ├── lib/
│   │   ├── api.ts          ← API client (all backend calls)
│   │   ├── useApi.ts       ← React hooks wrapping the API
│   │   └── store.tsx       ← Auth context + local state (offline fallback)
│   └── components/
├── backend/                ← Node.js + Express + MongoDB Atlas
│   ├── config/db.js
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/emailService.js
│   ├── utils/
│   ├── validators/
│   ├── uploads/            ← Uploaded photos stored here
│   ├── app.js
│   └── server.js
├── .env                    ← Frontend env vars
└── .env.example
```

---

## 🚀 Quick Start

### 1. MongoDB Atlas Setup

1. Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas) → Create free cluster
2. Create a database user (username + password)
3. Whitelist IP: `0.0.0.0/0` (or your specific IP)
4. Get connection string: `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/issuesnap?retryWrites=true&w=majority`

### 2. Configure Backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://youruser:yourpass@cluster.mongodb.net/issuesnap?retryWrites=true&w=majority
JWT_SECRET=your_random_32_char_secret_here_change_me
JWT_EXPIRES_IN=7d
ADMIN_EMAIL=admin@issuesnap.com
ADMIN_PASSWORD=Admin@1234
CORS_ORIGIN=http://localhost:5173

# Gmail App Password (for OTP emails):
# 1. Enable 2FA at myaccount.google.com
# 2. Go to myaccount.google.com/apppasswords
# 3. Create App Password for "Mail"
GMAIL_USER=your.gmail@gmail.com
GMAIL_APP_PASS=xxxx xxxx xxxx xxxx
EMAIL_FROM=noreply@issuesnap.com
```

### 3. Install & Run Backend

```bash
cd backend
npm install
npm run dev        # development (auto-restart)
# OR
npm start          # production
```

Backend runs at: `http://localhost:5000`
Health check: `http://localhost:5000/api/health`

### 4. Configure Frontend

Edit `.env` in project root:

```env
VITE_API_URL=http://localhost:5000/api
```

### 5. Install & Run Frontend

```bash
# From project root
npm install        # or: bun install
npm run dev        # or: bun run dev
```

Frontend runs at: `http://localhost:5173`

---

## 🔐 Authentication Flow

| Step | Endpoint | Description |
|------|----------|-------------|
| Register | `POST /api/auth/register` | Creates unverified user, sends OTP |
| Verify OTP | `POST /api/auth/verify-otp` | Marks user verified, returns JWT |
| Login | `POST /api/auth/login` | Returns JWT + user object |
| Forgot Password | `POST /api/auth/forgot-password` | Sends reset OTP |
| Verify Reset OTP | `POST /api/auth/verify-reset-otp` | Validates reset OTP |
| Reset Password | `POST /api/auth/reset-password` | Sets new hashed password |
| Get Me | `GET /api/auth/me` | Returns current user (requires Bearer token) |

---

## 📡 API Reference

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/verify-otp
POST   /api/auth/resend-otp
POST   /api/auth/forgot-password
POST   /api/auth/verify-reset-otp
POST   /api/auth/reset-password
GET    /api/auth/me              (protected)
```

### Reports
```
GET    /api/reports              (public, supports ?category=&status=&city=&search=&page=&limit=)
GET    /api/reports/:id          (public)
POST   /api/reports              (protected, multipart/form-data, up to 5 photos)
PUT    /api/reports/:id/status   (authority/admin only)
POST   /api/reports/:id/upvote   (protected)
POST   /api/reports/:id/downvote (protected)
POST   /api/reports/:id/comments (protected)
POST   /api/reports/:id/flag-spam (protected)
```

### Users
```
GET    /api/users/leaderboard    (public)
GET    /api/users/me             (protected)
PUT    /api/users/me             (protected)
PUT    /api/users/change-password (protected)
GET    /api/users/all            (admin only)
PUT    /api/users/:id/role       (admin only)
```

### Notifications
```
GET    /api/notifications        (protected)
PUT    /api/notifications/read-all (protected)
PUT    /api/notifications/:id/read (protected)
```

### Analytics
```
GET    /api/analytics            (public)
```

---

## 🔒 Security Features

- **Helmet** — Secure HTTP headers
- **CORS** — Whitelist-based origin control
- **Rate Limiting** — 300 req/15min global; 20 req/15min auth; 10 req/15min OTP
- **MongoDB Sanitize** — Prevents NoSQL injection
- **bcrypt** — Password hashing (12 salt rounds)
- **JWT** — Stateless auth with configurable expiry
- **OTP** — 6-digit cryptographically secure, expires in 10 minutes, max 5 attempts, deleted after use
- **Input Validation** — express-validator on all endpoints
- **File Upload** — Type + size validation (images only, max 5MB each)

---

## 📧 Email Configuration

### Option A: Gmail (Recommended for quick setup)

1. Enable 2-Factor Authentication on your Google account
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Generate an App Password for "Mail"
4. Set in `backend/.env`:
   ```
   GMAIL_USER=your.email@gmail.com
   GMAIL_APP_PASS=xxxx xxxx xxxx xxxx
   ```

### Option B: Custom SMTP (Mailtrap, SendGrid, etc.)

```env
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

### SPF / DKIM / DMARC (for production deliverability)

Add these DNS records for your domain:

```
# SPF - authorize your mail server
TXT  @  "v=spf1 include:_spf.google.com ~all"

# DKIM - get this value from Gmail/SendGrid settings
TXT  google._domainkey  "v=DKIM1; k=rsa; p=YOUR_PUBLIC_KEY"

# DMARC - policy for failed auth
TXT  _dmarc  "v=DMARC1; p=quarantine; rua=mailto:postmaster@yourdomain.com"
```

> In development, if no email env vars are set, OTPs print to the terminal console.

---

## 🏗️ Deployment

### Backend → Render

1. Push `backend/` to a GitHub repo (or the whole project)
2. Render → New Web Service → Connect repo
3. **Build command:** `npm install`
4. **Start command:** `node server.js`
5. Set all environment variables from `backend/.env.example`
6. Set `NODE_ENV=production`
7. Set `CORS_ORIGIN=https://your-frontend.vercel.app`

### Frontend → Vercel

1. Push project root to GitHub
2. Vercel → New Project → Import repo
3. **Framework:** Vite
4. **Build command:** `npm run build`
5. **Output directory:** `dist`
6. Set environment variable:
   ```
   VITE_API_URL=https://your-backend.onrender.com/api
   ```

### Backend → Railway

1. Railway → New Project → GitHub Repo
2. Add all env vars from `backend/.env.example`
3. Railway auto-detects Node.js and runs `npm start`

---

## 🌱 Default Admin Account

On first backend start, an admin account is seeded:

```
Email:    admin@issuesnap.com   (or ADMIN_EMAIL in .env)
Password: Admin@1234            (or ADMIN_PASSWORD in .env)
```

Change these in production!

---

## 🧪 Testing the API

```bash
# Health check
curl http://localhost:5000/api/health

# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Test@1234"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@issuesnap.com","password":"Admin@1234"}'

# Get reports
curl http://localhost:5000/api/reports

# Create report (authenticated)
curl -X POST http://localhost:5000/api/reports \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=Broken streetlight on MG Road" \
  -F "description=The streetlight has been broken for 3 weeks causing safety issues." \
  -F "category=Electricity" \
  -F "location=MG Road, Bangalore" \
  -F "urgency=High"
```

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TanStack Router, Vite, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas, Mongoose |
| Auth | JWT, bcrypt |
| Email | Nodemailer (Gmail / SMTP) |
| Security | Helmet, CORS, express-rate-limit, express-mongo-sanitize |
| Uploads | Multer |
| Validation | express-validator |
