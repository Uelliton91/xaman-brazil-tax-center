# Xaman Brazil Tax Center (MVP)

Mobile-first xApp-oriented MVP for Brazilian XRPL/Xahau users to prepare tax reporting inputs.  
Assistive only: no legal advice and no automatic filing.

Portuguese version: [README.pt-BR.md](./README.pt-BR.md)

## What This Project Solves

- Reads XRPL/Xahau account history (demo/manual and live RPC mode)
- Normalizes raw ledger transactions into tax-relevant events
- Converts values to BRL with valuation + FX layers
- Applies date-versioned tax rulesets
- Computes weighted-average cost basis and realized gain/loss
- Flags ambiguous events for manual review
- Exports PDF statement (pt-BR) and detailed CSV

## MVP Status (Current Scope)

- Frontend xApp UI with pt-BR texts and mobile-first layout
- Session bootstrap:
  - `demo/manual` mode with read-only address input
  - `xApp` mode hook with backend JWT verification path
- Ingestion pipeline:
  - pagination
  - retry
  - idempotent persistence
  - sync checkpoints
- Normalization engine:
  - semantic event mapping
  - classification reason
  - confidence score
  - manual review queue
- Asset identity model:
  - network
  - asset type
  - issuer/token/NFT dimensions
- Valuation and BRL conversion:
  - provider abstraction for market price and FX
  - source tracking and confidence
  - fallback/manual override support
- Rules engine:
  - effective-date versioning by tax year
  - configurable thresholds and alert logic
- Cost basis and tax calculation:
  - weighted average method
  - partial disposal handling
  - swap handling
- Exports:
  - PDF (`/api/export/pdf`)
  - CSV (`/api/export/csv`)

## Tech Stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS
- Prisma + SQLite (local, swappable to Postgres)
- Zod
- TanStack Query
- Vitest + Testing Library
- Playwright (smoke/happy path)
- pdf-lib
- PapaParse

## Quick Start

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run db:init
npm run prisma:seed
npm run dev
```

Open `http://localhost:3000`.

Note: SQLite file used by Prisma is `prisma/dev.db` (`DATABASE_URL=file:./dev.db` relative to `prisma/schema.prisma`).

## 5-Minute Demo Script (For Review)

1. Start app and open `http://localhost:3000`.
2. In session section:
   - Mode: `Demo/manual`
   - Network: `XRPL`
   - Address: `raUhWi8x1YgZqvumAYKZDQ5zDSLTCY8vAJ` (or any classic address)
3. Click `Iniciar sessão`.
4. Keep `Forçar provedores mock` disabled for live data.
5. Click `Sincronizar e recalcular`.
6. Validate:
   - dashboard totals
   - monthly alerts
   - pending manual-review events
7. Open event review list and apply one manual override.
8. Click `Recalcular` and confirm totals changed.
9. Generate `Exportar CSV` and `Exportar PDF`.

## API Endpoints (MVP)

- `POST /api/session/bootstrap`
- `POST /api/sync`
- `GET /api/dashboard`
- `GET /api/events`
- `POST /api/events/[id]/override`
- `POST /api/recalculate`
- `GET /api/rulesets`
- `GET|POST /api/settings`
- `GET /api/export/csv`
- `GET /api/export/pdf`

## Testing

```bash
npm run lint
npm test
npx playwright install
npm run test:e2e
```

## Security and Privacy

- No seed/private key collection or storage
- Read-only address analysis
- Minimal personal data
- Input validation with Zod
- Basic API rate limiting
- Manual override audit trail
- Explicit consent/disclaimer UI

## Legal and Compliance Positioning

This project is a tax-assistance calculator/reporting helper.  
It is not legal advice, not tax advice, and not an automatic Receita filing system.

## Documentation

- [DESIGN.md](./DESIGN.md)
- [RULES.md](./RULES.md)
- [TODO.md](./TODO.md)
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)

## Environment Note

In this Windows environment, native SWC/Turbopack bindings may be unavailable.  
Webpack/WASM fallback is configured for local run and tests.
