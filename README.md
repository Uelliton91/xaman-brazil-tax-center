# Xaman Brazil Tax Center (MVP)

Mobile-first xApp-oriented MVP to assist Brazilian XRPL/Xahau users with tax preparation workflows (assistive only, no automatic filing).

## Stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS
- Prisma + SQLite (local)
- Zod
- TanStack Query
- Vitest + Testing Library
- Playwright (smoke spec)
- pdf-lib (PDF)
- PapaParse (CSV)

## Product scope delivered

- Session bootstrap with:
  - `demo/manual` mode (address input)
  - `xApp` mode hook (JWT verification backend path)
- XRPL/Xahau ingestion pipeline:
  - paginated fetch
  - retry
  - idempotent persistence
  - sync checkpoints
- Raw tx storage + raw tx debug viewer
- Normalization layer (raw -> semantic events) with:
  - confidence
  - classification reason
  - manual-review routing
- Asset identity model using network/type/issuer/token-id dimensions
- Valuation pipeline with source/confidence metadata:
  - executed pair hints
  - market price fallback
  - FX conversion (mock + BCB PTAX provider abstraction)
- Rules engine:
  - effective-date versioned rulesets
  - threshold alerts per month
- Weighted average cost basis and gain/loss engine
- Manual review UX:
  - reclassification
  - valuation override
  - self-transfer marking
  - notes
  - audit trail
- Compliance dashboard (pt-BR):
  - patrimônio estimado
  - saldos
  - ganhos/perdas
  - alertas mensais
  - pendências manuais
- Exports:
  - PDF statement (pt-BR)
  - detailed CSV
- Local reminders/settings module

## Important legal positioning

This is an assistive calculation/reporting tool and **not** legal advice, tax advice, or an automatic Receita filing system.

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Configure env:

```bash
cp .env.example .env
```

3. Generate Prisma client:

```bash
npm run prisma:generate
```

4. Initialize local SQLite schema:

```bash
npm run db:init
```

5. Seed demo data:

```bash
npm run prisma:seed
```

6. Run app:

```bash
npm run dev
```

Open: `http://localhost:3000`

Note: the active SQLite database used by Prisma is `prisma/dev.db` (from `DATABASE_URL=file:./dev.db` resolved relative to `prisma/schema.prisma`).

## Tests

Run lint:

```bash
npm run lint
```

Run unit/integration tests:

```bash
npm test
```

Run Playwright smoke (after installing browsers):

```bash
npx playwright install
npm run test:e2e
```

## Main docs

- [DESIGN.md](./DESIGN.md)
- [RULES.md](./RULES.md)
- [TODO.md](./TODO.md)

## API endpoints (MVP)

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

## Security/privacy notes

- No seed/private key collection or storage
- Minimal personal data model
- Input validation with Zod
- Basic API rate limiting
- Audit logs for manual changes
- Explicit processing/disclaimer UX text

## Known environment note

In this Windows environment, native SWC/Turbopack bindings may be unavailable. The project is configured for Webpack dev/build scripts, and lint/tests pass in WASM fallback mode.
