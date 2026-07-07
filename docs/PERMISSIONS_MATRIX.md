# Permissions & Policy Overrides Matrix

This document defines how Cygnal evaluates and overrides permissions for the 10 threat scanners.

## 🛡️ Access Policy Evaluation Hierarchy
When a user dispatches a scanner (e.g. WHOIS Lookup), the backend evaluates permissions sequentially:

```
[ Check Request User & Scanner Tool ]
                 │
                 ├─► 1. Is User role "admin"? ──► ALLOW
                 │
                 ├─► 2. Is there an EMPLOYEE Override? ──► USE OVERRIDE (Allow or Block)
                 │
                 ├─► 3. Is there a TEAM Override? ──► USE OVERRIDE (Allow or Block)
                 │
                 ├─► 4. Is there a DEPARTMENT Override? ──► USE OVERRIDE (Allow or Block)
                 │
                 └─► 5. Default Policy fallback ──► ALLOW
```

## 🛠️ Overrides Database Definition
Overrides are registered in the `tool_permissions` SQLite table:
- **`target_type`:** Defines the override target (`employee`, `team`, or `department`).
- **`target_name`:** Links to the target value (e.g. `blue_analyst`, `Incident Response`, `Threat Intelligence`).
- **`tool_name`:** Maps to the scanner module name (e.g. `Port Scanner`, `WHOIS Lookup`).
- **`allowed`:** Boolean flag (`1` for allowed, `0` for restricted/blocked).
