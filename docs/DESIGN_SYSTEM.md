# Visual Design System Specification

This document outlines visual design guidelines, design tokens, and components spacing tokens.

## 🎨 Color Palette & Shadows Tokens
Cygnal uses a tailored dark theme that avoids plain dark grays in favor of deep space-blue tones.

### Theme CSS Color Variables
```css
:root {
  --bg-deep: #030712;         /* Pitch dark interface base background */
  --bg-panel: #0b0f19;        /* Card and sidebar background with 80% opacity */
  --border-subtle: #1e293b;   /* Delicate borders divider */
  
  --accent-blue: #3b82f6;     /* Main action links and indicators blue */
  --accent-cyan: #06b6d4;     /* Sensor status overlays and progress cyan */
  --accent-purple: #8b5cf6;   /* Special features indicators violet */
  
  --text-primary: #f1f5f9;    /* Clean off-white header text */
  --text-muted: #94a3b8;      /* Description paragraphs text */
}
```

### Visual Effects
- **Glassmorphism:** Cards use a combination of transparent fills and backdrop blurs: `background: rgba(11, 15, 25, 0.65); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.05);`.
- **Focused Borders:** Input components transition borders on focus to cyan/blue: `border-color: rgba(59, 130, 246, 0.4); shadow: 0 0 12px rgba(59, 130, 246, 0.15);`.

## ✍️ Typography Guidelines
- **System Fonts:** Inter for headers/body UI controls, Outfit/Roboto for marketing homepage titles.
- **Monospace Text:** Fira Code or JetBrains Mono for telemetry results, IP addresses, audit logs timestamps, and hashes.

## 📏 Layout Gutters & Padding Spacings
- **Sidebar Width:** Desktop sidebar defaults to `16rem` (`w-64`), collapsing to `4.5rem` (`w-18`).
- **Main Viewport Gutters:** Pages are centered inside containers with a maximum width of `80rem` (`max-w-7xl`) and dynamic side margins: `px-4 sm:px-6 lg:px-8`.
