# DESIGN.md

## Xaman Brazil Tax Center MVP

## 1. Objectives

Build a mobile-first Xaman xApp that helps Brazilian XRPL/Xahau users prepare tax reporting artifacts (assistive, not legal advice), by:

- ingesting account history (XRPL/Xahau)
- normalizing ledger transactions into tax-relevant events
- valuing events in BRL with source + confidence metadata
- computing weighted average cost and realized gains/losses
- applying versioned, effective-date rulesets
- surfacing monthly threshold alerts and annual summaries
- exporting PDF (pt-BR) and CSV (detailed)
- enabling manual review and overrides with audit trail

## 2. Official research snapshot (as of 2026-03-19)

### Xaman / xApp patterns

- xApps are launched with an `xAppToken` (OTT) and can resolve user context + JWT through the SDK.  
  Source: https://docs.xaman.dev/concepts/authorization
- JWTs issued in xApp flow can be validated on backend with app secret; xApp JWT validity described as 24h.  
  Source: https://docs.xaman.dev/environments/xapps-dapps/your-own-backend-auth
- xApp style theme is provided by query parameter `xAppStyle`.  
  Source: https://docs.xaman.dev/environments/xapps-dapps/style-guide
- xApp `<html>` and `<body>` should use transparent background at load to avoid flicker.  
  Source: https://docs.xaman.dev/environments/xapps-dapps/requirements

### XRPL / Xahau history access

- XRPL `account_tx` supports pagination via `marker`; paging must be robust to changing ledgers.  
  Source: https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/account-methods/account_tx
- XRPL integrations should use `meta.delivered_amount` for Payment outcomes, not instruction `Amount`.  
  Source: https://xrpl.org/docs/references/protocol/transactions/metadata
- Xahau public methods include `account_tx` and use HTTP/WebSocket public servers documented by Xahau.  
  Sources: https://xahau.network/docs/features/http-websocket-apis/public-api-methods/ and https://xahau.network/docs/features/http-websocket-apis/request-formatting-guide

### Brazil crypto reporting and FX references

- Gov service page (updated 2026-02-27) states monthly reporting deadlines and annual January reporting by BR exchanges.  
  Source: https://www.gov.br/pt-br/servicos/declarar-operacoes-com-criptoativos
- Receita manual for IN RFB 1.888/2019 describes obligation logic and monthly threshold mechanics (historically R$30k for offshore/no-exchange operations).  
  Source: https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/manuais/manual-preenchimento-criptoativos
- Receita (2025-11-17 notice for IN RFB 2.291/2025) announces DeCripto transition from July 2026 and mentions threshold change context for reporting obligations.  
  Source: https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2025/novembro/rfb-atualiza-regulamentacao-de-criptoativos-para-adapta-la-ao-padrao-internacional-carf-da-ocde-2013-in-rfb-no-2-291-de-14-de-novembro-de-2025
- Receita guidance page references PTAX sale quotation for conversion in reporting context.  
  Source: https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2023/marco/receita-federal-esclarece-sobre-declaracao-de-operacoes-com-criptoativos
- BCB PTAX OData endpoints are documented for historical day/period queries (Olinda API).  
  Source: https://www.bcb.gov.br/conteudo/dadosabertos/BCBDepin/gnastportal-dados-abertostaxas-de-cambio---todos-os-boletins-diarios.pdf

## 3. Product boundaries

### In scope (MVP)

- Read-only account analytics for XRPL/Xahau addresses
- xApp mode + demo/manual address mode
- Rules-driven tax assistance
- Manual review queue and override pipeline
- PDF/CSV exports
- Local SQLite persistence

### Out of scope (MVP)

- Any custody/private-key handling
- Automatic tax filing to Receita systems
- Legal opinion generation
- Full exchange API integrations
- Push notifications infrastructure

## 4. System architecture

- **Frontend (Next.js App Router)**
  - Mobile-first pages and components (pt-BR)
  - Session bootstrap from xApp query params or manual mode
  - Dashboard, transactions/review, settings/rules, exports
  - TanStack Query for API state and revalidation

- **Backend (Next.js Route Handlers + service modules)**
  - Session/Auth: xApp JWT verification (HS256 with app secret), local session persistence
  - Ingestion: ledger providers (XRPL/Xahau/mock), pagination, checkpointing, idempotency
  - Normalization: semantic event mapping + confidence/reason + manual-review routing
  - Asset registry: deterministic identity keys using network/type/issuer/id dimensions
  - Valuation: price provider abstraction + FX provider abstraction + confidence stack
  - Rules engine: effective-date ruleset loading per tax year/date
  - Tax engine: weighted average cost inventory, disposal gain/loss, monthly/annual aggregation
  - Export service: CSV + PDF generation with disclaimers and methodological notes

- **Persistence (Prisma + SQLite)**
  - Event-sourced-ish approach:
    - immutable `RawTransaction`
    - derived `NormalizedEvent`
    - explicit `ManualOverride`
    - recomputable tax snapshots/reports

## 5. Data model rationale

Core entities:

- `UserSession`, `Wallet` for context
- `RawTransaction` for auditable ingestion storage
- `Asset` for robust identity (not ticker-only)
- `NormalizedEvent` for tax semantics decoupled from raw ledger types
- `ManualOverride` and `AuditLog` for reviewer actions
- `PricePoint`, `FxRate` for valuation traceability
- `Ruleset` for versioned legal config
- `SyncCheckpoint` for incremental history sync
- `Report` for generated outputs

Why this model:

- preserves reproducibility
- supports reclassification/revaluation without losing originals
- allows legal/rules changes by effective date without code rewrite
- enables confidence scoring and manual interventions as first-class entities

## 6. Valuation strategy rationale

Order of preference per event:

1. Use executed pair value from transaction economics when reliable
2. Infer counterpart value from one well-priced side of swap
3. Query historical crypto provider (provider abstraction)
4. Convert to BRL using historical FX provider (PTAX-oriented default in rules)
5. Flag manual review when confidence is insufficient

Every valuation stores:

- source chain (`executed_pair`, `derived_pair`, `market_price`, `manual_override`)
- source identifiers (provider + record timestamp)
- confidence score and rationale

## 7. Assumptions

- MVP defaults to public ledger history via documented account APIs
- JWT verification is optional in local demo mode
- Not all XRPL/Xahau tx types can be tax-classified with high confidence automatically
- Tax/legal changes are expected; rules are config-driven and date-versioned
- User supplies country preference via “Brazil Tax Mode” toggle unless official eligibility API is documented

## 8. Legal and regulatory uncertainties (explicitly configurable)

These must remain rules-configurable, not hardcoded:

- Monthly reporting threshold values and effective-date transitions
- Treatment of swaps, airdrops, rewards, and NFT events for gain timing
- Cost basis method alternatives and fee inclusion behavior
- Which events are taxable disposals vs informational transfers
- Annual reporting bucket mappings and category labels

Design decision:

- rules loaded from DB-configured JSON per tax year/effective period
- engine requires explicit ruleset selection and records ruleset version in outputs

## 9. Security and privacy design

- No seed/private key capture or storage
- Minimal personal data (wallet address + optional user notes)
- Input validation with Zod on all API boundaries
- Sanitized text in exports
- Basic API rate limiting middleware
- Secret redaction and no secret logging
- Explicit consent/disclaimer UX for tax-assistance processing

## 10. Open questions for post-MVP

- Official Receita rule interpretation for specific on-chain primitives (AMM LP, complex NFT flows)
- Full legal mapping of DeCripto changes effective July 2026 into machine rules
- Supported market data provider SLAs for obscure issued tokens
- Optional accountant collaboration workflow and report signing

## 11. Non-goals and legal posture text

The product is explicitly:

- **assistive** (calculation and organization)
- **not legal advice**
- **not an automatic filing system**

All reports include this disclaimer in pt-BR.
