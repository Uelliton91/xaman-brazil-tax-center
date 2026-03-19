# Xaman Brazil Tax Center (MVP)

MVP mobile-first orientado a xApp para usuários brasileiros de XRPL/Xahau prepararem insumos de declaração fiscal.  
Ferramenta assistiva: não é orientação legal e não faz entrega automática.

English version: [README.md](./README.md)

## O Que Este Projeto Resolve

- Lê histórico de contas XRPL/Xahau (modo demo/manual e RPC ao vivo)
- Normaliza transações brutas em eventos fiscais
- Converte valores para BRL com camadas de valuation + FX
- Aplica regras versionadas por data efetiva/ano fiscal
- Calcula custo médio ponderado e ganho/perda realizada
- Sinaliza eventos ambíguos para revisão manual
- Exporta relatório em PDF (pt-BR) e CSV detalhado

## Status do MVP (Escopo Atual)

- Frontend xApp com UI em pt-BR e layout mobile-first
- Bootstrap de sessão:
  - modo `demo/manual` com endereço somente leitura
  - gancho de modo `xApp` com caminho de validação JWT no backend
- Pipeline de ingestão:
  - paginação
  - retry
  - persistência idempotente
  - checkpoints de sincronização
- Motor de normalização:
  - mapeamento semântico de eventos
  - razão de classificação
  - score de confiança
  - fila de revisão manual
- Modelo de identidade de ativo:
  - rede
  - tipo de ativo
  - dimensões issuer/token/NFT
- Valuation e conversão BRL:
  - abstração de provedores de preço e FX
  - rastreio de fonte e confiança
  - fallback e override manual
- Motor de regras:
  - versionamento por data efetiva e ano fiscal
  - limites e alertas configuráveis
- Cálculo fiscal e custo de aquisição:
  - método de custo médio ponderado
  - suporte a alienação parcial
  - suporte a swaps
- Exportações:
  - PDF (`/api/export/pdf`)
  - CSV (`/api/export/csv`)

## Stack Tecnológica

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS
- Prisma + SQLite (local, com troca futura para Postgres)
- Zod
- TanStack Query
- Vitest + Testing Library
- Playwright (smoke/happy path)
- pdf-lib
- PapaParse

## Rodando Localmente

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run db:init
npm run prisma:seed
npm run dev
```

Acesse `http://localhost:3000`.

Nota: o SQLite usado pelo Prisma é `prisma/dev.db` (`DATABASE_URL=file:./dev.db`, relativo ao `prisma/schema.prisma`).

## Roteiro de Demo (5 minutos)

1. Inicie a app em `http://localhost:3000`.
2. Na seção de sessão:
   - Modo: `Demo/manual`
   - Rede: `XRPL`
   - Endereço: `raUhWi8x1YgZqvumAYKZDQ5zDSLTCY8vAJ` (ou outro endereço clássico)
3. Clique em `Iniciar sessão`.
4. Deixe `Forçar provedores mock` desmarcado para usar dados ao vivo.
5. Clique em `Sincronizar e recalcular`.
6. Valide:
   - totais do dashboard
   - alertas mensais
   - eventos pendentes de revisão manual
7. Abra a lista de eventos e aplique um override manual.
8. Clique em `Recalcular` e confirme a mudança dos totais.
9. Gere `Exportar CSV` e `Exportar PDF`.

## Endpoints de API (MVP)

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

## Testes

```bash
npm run lint
npm test
npx playwright install
npm run test:e2e
```

## Segurança e Privacidade

- Não coleta/armazenha seed ou chave privada
- Análise somente leitura por endereço
- Mínimo de dados pessoais
- Validação de entrada com Zod
- Rate limit básico em APIs
- Trilha de auditoria para overrides manuais
- Consentimento e disclaimer explícitos na UI

## Posicionamento Legal/Fiscal

Este projeto é um assistente de cálculo e organização fiscal.  
Não é orientação legal, não é orientação tributária e não realiza entrega automática na Receita.

## Documentação

- [DESIGN.md](./DESIGN.md)
- [RULES.md](./RULES.md)
- [TODO.md](./TODO.md)
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)

## Nota de Ambiente

Neste ambiente Windows, bindings nativos de SWC/Turbopack podem não estar disponíveis.  
O projeto está configurado com fallback Webpack/WASM para execução local e testes.
