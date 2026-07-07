# Contributing Guidelines

Thank you for contributing to Cygnal! Please follow these guidelines to keep the codebase clean and reliable.

## 🛠️ Development Workflow
1. **Develop in Eras:** Work must proceed incrementally following the development eras defined in `ROADMAP.md`.
2. **Never Commit Partial Work:** Ensure all features planned for an era are fully implemented and verified before pushing.
3. **Keep Code Independent:** Avoid referencing or copying legacy code from the prototype implementation.

## 🎨 Code Style Guidelines
- **Frontend Code:** Use TypeScript, write clean React hooks, and apply Tailwind CSS colors using our design tokens.
- **Backend Code:** Keep Flask routes modular using Blueprints. Use standard python docstrings for functions.
- **Relational Integrity:** Do not wipe tables or modify database schemas without writing database migrations logic in `database.py`.

## 🧪 Verification Checklists
Before pushing changes:
1. Run `npm run build` inside the frontend directory and confirm it compiles cleanly.
2. Run `pytest` inside the backend directory and ensure all unit tests pass.
