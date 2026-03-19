# TODO.md

## Execution Plan

- [x] Phase 0 research on official docs (Xaman, XRPL/Xahau, Receita, BCB PTAX)
- [x] Create architecture and legal-uncertainty design docs (`DESIGN.md`, `RULES.md`)
- [x] Scaffold Next.js + TypeScript + Tailwind + Prisma + Vitest + Playwright project
- [x] Implement data layer and Prisma schema/entities
- [x] Implement mocked providers and seeded demo dataset
- [x] Implement session/auth bootstrap (xApp + demo mode)
- [x] Implement ingestion pipeline (paginated, idempotent, incremental, retry)
- [x] Implement normalization engine with confidence + manual review queue
- [x] Implement valuation + FX pipeline with provider abstraction
- [x] Implement rules engine with effective-date transitions
- [x] Implement cost basis / gain-loss engine (weighted average)
- [x] Build API routes for sync, review, calculations, exports
- [x] Build mobile-first pt-BR UI pages and components
- [x] Implement CSV export
- [x] Implement PDF export
- [x] Implement reminders/settings module and disclaimers/consent
- [x] Add automated tests (unit + integration + e2e smoke spec file)
- [x] Finalize README, `.env.example`, and update TODO progress

## Progress Notes

- The MVP ships with full **demo mode** and local seed data.
- Rules and legal assumptions are versioned/configurable in DB (`Ruleset.configJson`).
- Manual review edits are persisted with audit trail (`ManualOverride` + `AuditLog`).
- `npm run lint` and `npm test` pass.
- Current environment has native SWC/Turbopack binary incompatibility; development/test flow uses WASM/Webpack mode.
