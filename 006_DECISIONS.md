# DeFi OS Decisions

> Record only decisions that prevent future re-discussion.

---

## Status

Accepted v1.0

---

## Purpose

Record important product and technical decisions that materially affect the project.

Do not record minor implementation details here.

---

# Accepted Decisions

## DEC-001 — Product Position

DeFi OS is a **Daily Decision Companion** for DeFi investors.

It is not a DefiLlama clone, portfolio tracker, or generic analytics platform.

---

## DEC-002 — Dashboard is Core

The MVP includes a simplified Decision Dashboard.

Its purpose is to help users answer:

> Do I need to do anything today?

---

## DEC-003 — Chinese-first UX

The product is designed for Chinese-speaking users.

It should explain DeFi clearly instead of mechanically translating English interfaces.

---

## DEC-004 — Nuxt 4 for MVP

The MVP uses:

- Nuxt 4
- Vue 3
- TypeScript strict
- pnpm
- ESLint

Nuxt 4 is selected because DeFi OS is a new project with no migration constraints.

Starting on the current active major version avoids building new product code on a framework version approaching the end of its maintenance lifecycle.

## DEC-005 — Nuxt Server API before Separate Backend

Third-party APIs and business logic go through Nuxt Server API.

NestJS is deferred until a real need appears.

---

## DEC-006 — No Database in Sprint 0

Sprint 0 does not include PostgreSQL, Redis, or another server database.

Portfolio persistence will be decided before Portfolio implementation.

---

## DEC-007 — No Wallet in MVP

Portfolio data is entered manually in the MVP.

Wallet integration is deferred.

---

## DEC-008 — External Data must be Traceable

Important external data must include:

- source
- fetchedAt
- clear unit
- unavailable state

APR and APY must remain distinct.

---

## DEC-009 — Explainable Recommendations

Recommendations and risk labels must include reasons.

The product must not use absolute language such as:

- Safe
- Risk-free
- Guaranteed

---

## DEC-010 — Keep Documentation Minimal

The project maintains only the documents required to preserve product direction, MVP scope, architecture, decisions, and development rules.

Do not create duplicate documentation systems.

---

## DEC-011 — Personal USDC Comparison Uses Real Decision Candidates

Personal USDC market comparison uses real Decision API candidates while the current user position remains a temporary mock/fixture until the Portfolio Sprint.

Rules:

- Decision Candidate market data comes from `GET /api/decision/usdc`
- Current position identity may remain a temporary fixture and must not be presented as wallet-derived
- Comparison may show factual rate deltas
- This does not authorize recommendation, MOVE/HOLD, safety scoring, or a Decision Engine

---

# Pending Decisions

Decide only when the related work begins:

- Portfolio persistence
- Initial supported assets
- Initial supported chains
- Styling strategy
- Runtime validation library
- First health-rule thresholds

---

# Rule

Add a decision only when:

1. It materially affects product or architecture
2. We may otherwise debate it again
3. The reason is worth preserving