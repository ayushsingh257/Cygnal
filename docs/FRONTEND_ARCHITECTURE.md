# Frontend Architecture Specification

The frontend uses Next.js (App Router) in TypeScript, focusing on strict layout containers, responsive styling, and role-based client routing.

## 📂 Next.js Directory Layout Routing Map
```
frontend/app/
├── (public)/                     # Marketing homepage (loading transitions, FAQ, contact)
├── login/                        # Clean login credentials entry page
├── register/                     # Enlistment details configuration route
├── forgot-password/              # Token request recovery card
├── email-verification/           # Ingress key validation gate
├── profile-setup/                # Selection of team/department
├── welcome/                      # Post-setup workspace welcome board
├── dashboard/                    # Tailored console based on roles rank
├── cases/                        # Custody worksheet and SVG IOC graph
├── chat/                         # Natural language RAG chat
├── profile/                      # Personal achievements and statistics
└── settings/                     # Tabbed configurations interface
```

## 🔄 Global State Synchronization (Zustand)
`store/useAuthStore.ts` tracks:
- `user`: Mapped username, role, department, team, status.
- `token`: Active JWT handshake credential.
- Core functions: `login(token, user)`, `logout()`, `setUser(user, token)`.
- Persistence: Stored inside client `localStorage` for session retention.

## 🎨 Layout Containers Design Code
Page view templates avoid stretching elements edge-to-edge. Inner viewports wrap components in:
```tsx
<div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
  {children}
</div>
```
This forces clean gutters, centered cards, and readability across desktop displays.
