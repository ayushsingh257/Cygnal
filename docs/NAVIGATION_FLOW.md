# Navigation & Workspace Routing Flow

This document details the navigation flows, route redirects, and access control checks inside Cygnal.

## 🚦 Navigation Routing Diagram

```
[ Visitor URL Request ]
        │
        ├─► / (Marketing Landing Page)
        │
        ├─► /login / /register (Credentials entry card)
        │        │
        │        ▼ (Authenticated)
        ├─► /email-verification (Ingress code handshake gate)
        │        │
        │        ▼
        ├─► /profile-setup (Assign team / department properties)
        │        │
        │        ▼
        ├─► /welcome (Show role permissions & dashboard introduction)
        │        │
        │        ▼ (Operations Workspace Launch)
        └─► /dashboard
```

## 🔒 Session Access Verification
- **Unauthenticated Redirects:** Authenticated workspace routes (`/dashboard`, `/scanners`, `/cases`, `/settings`, `/profile`) use the `useAuthStore` credentials. If the token is empty on load, they redirect immediately back to `/login`.
- **First-Time Registration Sequence:** Newly created user accounts must follow the registration sequence (`/register` ──► `/email-verification` ──► `/profile-setup` ──► `/welcome`) before accessing `/dashboard`.
- **Legacy Redirects:** Visiting `/auth`, `/auth/login`, `/auth/register`, or `/console` triggers an automatic redirect to `/login` or `/register` to keep route paths clean.
