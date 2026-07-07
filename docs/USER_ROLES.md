# User Roles & Workspace Authorities

Cygnal v1.0 implements a role-based access control (RBAC) rank registry to define platform capability thresholds.

## 🎖️ User Rank Hierarchy Registry
The roles matrix maps authority levels to ranks from 10 to 70:

| Role | Authority Rank | Target Users | Dashboard Mode |
|---|---|---|---|
| **admin** | 70 | Platform Administrators | Full Admin Telemetry Panel |
| **director** | 60 | Executive Leadership | Global Compliance Analytics |
| **soc_manager** | 50 | Security Team Managers | Manager Command Console |
| **red_lead** | 40 | Offensive Operations Leads | Operations Command Console |
| **blue_lead** | 40 | Defensive Investigations Leads | Operations Command Console |
| **analyst** | 20 | Tier 1/2 Investigators | Analyst Command Workspace |
| **intern** | 10 | Junior Operators / Viewers | Analyst Command Workspace |

## 👁️ Interface Layout Control
The sidebar navigation maps links dynamically by parsing the active user role:
- **`admin` Only:** Displays "System Auditing" and "Admin Control".
- **Rank >= 50 (Managers/Directors/Admins):** Displays "Employee Analytics" and "Reports Compiler".
- **Rank >= 20 (Analysts and higher):** Displays "Incident Cases" and "Multi-Agent AI".
- **All Logged Nodes:** Displays "Operations Hub", "Scanners Directory", "RAG AI Assistant", and "My Profile".
