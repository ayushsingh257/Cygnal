# UI & UX Guidelines

These guidelines define the interactions, visual hierarchy, and workspace principles in Cygnal.

## 🌀 1. Loading Experience Sequence
Before users reach the public marketing homepage, the platform presents a 4–6 second animated loading screen:
- **Visuals:** Features a clean, centered Shield outline with a rotating telemetry path. Shows mock security messages (e.g. `[OK] SSL Handshake Synchronized`, `[OK] Database Audit Ledger Checked`).
- **Transition:** Fades out using a `transition-opacity duration-700` animation.

## 🛋️ 2. Breathing Workspace & Whitespace Rules
To prevent cluttered views, the interface uses a centered grid layout:
- **Inner Gutters:** Components inside dashboard panels or scanners forms have a spacing padding of `p-6` or `p-8` (`space-y-6`).
- **No Edge-to-Edge Cards:** Cards do not touch the screen edges; they sit in a parent grid structure with margin gaps.

## 🧭 3. Component Micro-Animations
- **Hover Transitions:** Interactive buttons and cards use `transition-all duration-200 ease-in-out` hover overrides.
- **Task Progress Bars:** Real-time background workers display linear progress transitions (`transition-all duration-300`).
- **Notifications Toast:** Use toast notifications that automatically slide in from the top-right corner and clear within 3 seconds.
