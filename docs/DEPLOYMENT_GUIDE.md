# Deployment & Setup Guide

This guide details the setup and configuration steps for deploying Cygnal v1.0.

## 🔑 1. Environment Configurations
Rename `.env.example` to `.env` in the `api` directory and define the following variables:

```ini
# Flask Server parameters
PORT=5000
HOST=0.0.0.0

# Cryptographic token parameters
JWT_SECRET=cygnal_secure_handshake_secret_key_2026
JWT_EXPIRY=3d
```

## 🐋 2. Backend Gunicorn Setup
For production environments, run the Flask backend using Gunicorn to handle concurrent connections:
```bash
# Install Gunicorn within venv
pip install gunicorn

# Start Gunicorn server binding to port 5000
gunicorn --workers 4 --bind 0.0.0.0:5000 backend:app
```

## 🌐 3. Next.js Frontend Deployment
The frontend can be deployed as a static site or run using a Node production server:
```bash
# Build the optimized production bundle
npm run build

# Start the Node.js production server
npm run start -- -p 3001
```
For static hosting (e.g. Vercel or Netlify), configure Next.js exports inside `next.config.js` (`output: 'export'`) to output static HTML pages directly.
