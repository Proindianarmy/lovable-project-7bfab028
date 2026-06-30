# IssueSnap — Setup Guide (Fixed)

## What changed vs. the original project

The original project was built for the **Lovable** platform and used a private
package (`@lovable.dev/vite-tanstack-config`) plus TanStack Start SSR. That
package is not published to the public npm registry, so `npm install` always
failed outside of Lovable's environment. The frontend has been converted to a
**standard Vite + React SPA** using `@tanstack/react-router` in client-only
mode. All pages, components, and business logic are unchanged.

## Prerequisites

- Node.js 18+
- MongoDB running locally (`mongodb://127.0.0.1:27017`) **or** a MongoDB Atlas
  connection string

## 1. Start MongoDB (if running locally)

```bash
# Docker (easiest):
docker run -d -p 27017:27017 --name mongo mongo

# or macOS Homebrew:
brew services start mongodb-community
```

If you'd rather use MongoDB Atlas, edit `backend/.env` and set `MONGODB_URI`
to your Atlas connection string instead.

## 2. Start the backend

```bash
cd backend
npm install
npm run dev
```

Runs on **http://localhost:5000**. Without Gmail credentials configured, OTP
codes are printed to this terminal instead of emailed — copy them from here
during registration/login testing.

## 3. Start the frontend (separate terminal)

```bash
npm install
npm run dev
```

Runs on **http://localhost:8080**. The Vite dev server proxies `/api` and
`/uploads` requests to the backend on port 5000, so there are no CORS issues
in development.

## 4. (Optional) Enable real OTP emails

Edit `backend/.env`:

```
GMAIL_USER=your.gmail@gmail.com
GMAIL_APP_PASS=your16charapppassword
```

`GMAIL_APP_PASS` **must** be a 16-character Google **App Password**, generated at
https://myaccount.google.com/apppasswords (requires 2-Step Verification to be
enabled on the account first). Your normal Gmail login password will always
be rejected with a `535 Username and Password not accepted` error.

## 5. (Required for production) Enable AI image verification

The Report flow's photo upload now runs every photo through a server-side
AI-generation + civic-issue content check before it can be attached to a
report (see `backend/controllers/imageValidationController.js`).

Edit `backend/.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Get a key at https://console.anthropic.com. Without this key set, the
`/api/reports/validate-image` endpoint logs a warning and accepts photos
based on client-side checks only — fine for local development, but it
**must** be configured before deploying to production.

## Default admin login

```
Email:    admin@issuesnap.com
Password: Admin@1234
```

(Seeded automatically on first backend startup.)
