# Permissions & Policy Overrides Matrix (v4.0)

This document defines the Role-Based Access Control (RBAC) rank registry and policy override evaluation hierarchy for Cygnal.

---

## 🎖️ Authority Rank Hierarchy

Cygnal maps user authorities from rank 10 to 70:

| Role | Authority Rank | Target Users | Allowed Capabilities |
|---|---|---|---|
| **admin** | 70 | Platform Administrators | Full Telemetry, Tenant Onboarding, User Creation, System Auditing, Policy Overrides |
| **director** | 60 | Executive Leadership | Global Compliance Analytics, Cross-Department Reports, SLA Dashboards |
| **soc_manager** | 50 | Security Team Managers | Manager Command Console, Case Assignment, Team Roster Management |
| **red_lead** | 40 | Offensive Operations Leads | Operations Console, Deep Scanners, Exploit Correlations |
| **blue_lead** | 40 | Defensive Investigations Leads | Operations Console, Deep Scanners, Evidence Custody Approval |
| **analyst** | 20 | Tier 1/2 Investigators | Analyst Command Workspace, Incident Cases, Copilot Chat, Scanners |
| **intern** | 10 | Junior Operators / Viewers | Read-only Triage Views, Basic Scanners |

---

## 🛡️ Policy Evaluation Hierarchy

When an operator attempts to execute a tool (e.g. WHOIS Lookup, Malware Scanner, Header Auditor), permissions are evaluated sequentially:

```
[ Incoming Tool Execution Request ]
                 │
                 ├─► 1. Is User Role "admin"? ──────────────────► ALLOW
                 │
                 ├─► 2. Is there an EMPLOYEE Override? ─────────► APPLY OVERRIDE (Allow / Block)
                 │
                 ├─► 3. Is there a TEAM Override? ──────────────► APPLY OVERRIDE (Allow / Block)
                 │
                 ├─► 4. Is there a DEPARTMENT Override? ────────► APPLY OVERRIDE (Allow / Block)
                 │
                 └─► 5. Default Role Baseline Fallback ─────────► ALLOW (if Role >= Required Rank)
```

---

## 🛠️ Overrides Database Definition (`tool_permissions`)

Granular policy overrides are stored in the `tool_permissions` table:
- **`target_type`**: `employee`, `team`, or `department`.
- **`target_name`**: Target identifier (e.g. `analyst_john`, `Incident Response`, `Threat Intelligence`).
- **`tool_name`**: Target module (e.g. `whois`, `headers`, `ip_reputation`, `malware`).
- **`allowed`**: Boolean flag (`1` for allowed, `0` for restricted/blocked).
- **`tenant_id`**: Tenant organization boundary.
