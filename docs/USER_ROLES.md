# User Roles & Provisioning Security Specification (v4.0)

Cygnal enforces a strict Role-Based Access Control (RBAC) rank registry to maintain zero-trust privilege boundaries across all investigation workspaces.

---

## 🎖️ User Role Specifications

### 1. `admin` (Rank 70)
- Full administrative access to the platform.
- Can create/provision high-privilege users (`POST /api/admin/users/create`).
- Can onboard new organizational tenants (`POST /api/admin/tenants`).
- Can query cryptographic system audit logs (`GET /api/admin/audit`).
- Can configure threat intelligence connector API keys and policy overrides.

### 2. `director` (Rank 60)
- Strategic and executive oversight of security posture.
- Access to high-level compliance analytics, executive report generators, and cross-team triage trends.

### 3. `soc_manager` (Rank 50)
- Operational management of the Security Operations Center.
- Assigns cases to analysts (`POST /api/cases/<id>/assign`).
- Monitors investigation queue workloads, agent loop statuses, and team rosters.

### 4. `red_lead` / `blue_lead` (Rank 40)
- Specialized tactical leads for offensive penetration testing and defensive incident response.
- Access to deep forensic modules, threat intelligence fusion, and evidence correlation graphs.

### 5. `analyst` (Rank 20)
- Primary investigator persona.
- Creates and updates incident cases, uploads evidence files, runs 10 security sensor scanners, interacts with AI Copilot, and compiles sealed forensic reports.

### 6. `intern` (Rank 10)
- Read-only trainee / viewer persona.
- Can view published reports, public dashboards, and execute basic OSINT lookups without modifying case ledgers.

---

## 🔒 Account Provisioning Rules

1. **Self-Registration (`POST /api/register`)**:
   - Strictly restricted to low-privilege roles (`analyst`, `intern`).
   - Any attempt to self-register with elevated roles (`admin`, `director`, `soc_manager`, `red_lead`, `blue_lead`) is rejected with HTTP 403 Forbidden.

2. **Administrative Provisioning (`POST /api/admin/users/create`)**:
   - Elevated accounts must be provisioned by an authenticated `admin`.
   - Generates a cryptographically strong initial credential requiring immediate MFA configuration.
