# Testing Strategy

This document specifies the testing plan, coverage requirements, and verification checklists for Cygnal v1.0.

## 🧪 1. Backend Unit Testing (`pytest`)
Backend API endpoints are tested using the Pytest framework:
- **Test File Location:** `api/tests/`.
- **Target Areas:**
  - `test_endpoints.py`: Validates authorization middleware, registration payloads, and scanner dispatches.
  - `test_validators.py`: Checks URL, domain name, and IP address sanitization inputs.
  - `test_task_manager.py`: Tests the background thread executor and progress key updates.

## 🖥️ 2. Frontend Local Compilation Gates
Before files are pushed, developers must run the production compiler:
```bash
# Navigate to the frontend directory and compile
npm run build
```
This ensures there are no TypeScript type errors, missing components, or broken relative imports.

## 🚶‍♂️ 3. Manual Interactive UI Checklist
Verify the following user flows in the browser:
1. **Unauthenticated Redirects:** Open `/dashboard` directly without logging in and confirm it redirects to `/login`.
2. **Setup Sequence:** Register a new account at `/register`, verify the email gate, select a department, and click through the welcome screen.
3. **Scanner Perms Check:** Verify that analysts cannot run tools that have policy override blocks configured.
4. **Timeline Validation:** File a case, upload evidence, and verify that the timeline updates with a valid SHA-256 seal.
5. **Print Styles:** Open a report and verify that headers and sidebar components are hidden in print previews.
