# Changelog

All notable changes to the Cygnal platform are documented in this file.

## [1.0.0-design] - 2026-07-07
### Added
- Created the comprehensive new documentation system detailing technical specifications and system designs.
- Implemented `/docs/` technical architecture blueprint templates.
- Added `README.md` and `ROADMAP.md` mapping the five development eras.

### Changed
- Abandoned the prototype implementation.
- Cleared legacy pages, components, blueprints, and database tables to start from a clean slate.

## [4.0.0-RC3] - 2026-07-09
### Added
- Implemented Phase 3: Enterprise AI Platform.
- Created `vector_records` schema for storing TF-IDF vector embeddings of cases, evidence, and timeline events.
- Added pure Python embedding vectorizer and semantic search module.
- Integrated semantic context lookup into AI Copilot chat context retrieval.
- Implemented Multi-Agent Planning (Recon, Malware, Identity, Compiler) with connector config validation checks.
- Upgraded the indicator confidence scoring engine to factor in Threat Intel (40%), Semantic Memory (30%), Evidence (20%), and Timeline (10%).
- Updated the React copilot page to render the Multi-Agent HUD and range-based animated confidence badges.
