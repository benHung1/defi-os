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

**Superseded by DEC-012.**

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

**The temporary-position portion is superseded by DEC-012.**

Personal USDC market comparison uses real Decision API candidates. During the earlier pre-Portfolio slice the current position was a temporary fixture; it is now supplied by the read-only wallet and protocol adapters defined in DEC-012.

Rules:

- Decision Candidate market data comes from `GET /api/decision/usdc`
- Current position identity must come from a supported, verified Portfolio position
- Numeric personal rate comparison (higher/lower, sort, delta) is allowed only when `candidate.rateType === currentPositionRate.rateType`; do not convert APR↔APY
- Comparison may show factual rate deltas for comparable candidates only
- Higher yield alone must not set Hero attention/warning state
- This does not authorize recommendation, MOVE/HOLD, safety scoring, or a Decision Engine

---

## DEC-012 — Read-only Wallet and Protocol-specific Position Adapters

The Portfolio uses a connected wallet only to obtain a public address.

Rules:

- Never request a transaction, Token Approval, arbitrary signature, seed phrase, or private key
- Wallet assets and protocol positions are read from public onchain data
- Each supported protocol has a protocol-specific position adapter
- Indexers may discover positions, but balances must be read from or verified against protocol contracts
- Initial Ethereum coverage is Aave, Spark, Compound V3, Morpho Blue, Fluid, Maple, Yearn, Pareto, Midas, Dolomite, and Sentora
- Unsupported or partially unavailable positions must not be represented as zero
- The product remains a DeFi decision companion, not a general wallet or exchange portfolio tracker

---

## DEC-013 — One Product Registry for Market and Portfolio

Market discovery and wallet-position coverage use one server-side product registry.

Rules:

- A product is admitted to formal Market search only when a matching read-only position adapter is enabled
- DefiLlama is discovery and market-observation input, not proof that a wallet position is supported
- Product identity is explicit for fixed vaults and dynamic only where the adapter discovers the same official product family
- The API returns `positionReadable`; the client renders that capability and must not infer it from protocol names
- New chains or products are added to Market only together with their position-reading path

---

## DEC-014 — Chain Events Are Position-relevant and Official-first

The Chain Events section is a compact decision-support feed, not a general DeFi news reader.

Rules:

- Query only the supported protocols found in the connected wallet's current positions
- If no supported position exists, do not call upstream event providers in the current MVP
- Include only security, pause/deprecation, upgrade, and material governance events
- Prefer official governance, verified onchain governance, and official repositories; every item must link to its original source
- Use short HTTP requests with a 10-minute server cache and a 5-minute visible-page refresh; do not keep an SSE connection open
- One unavailable provider must not hide verified results from other providers
- Governance approval must not be described as onchain execution unless execution is independently verified

---

## DEC-015 — Decision Hero Uses Deterministic, Evidence-first Rules

The first Decision Hero does not use AI to determine user status or action severity.

Rules:

- Evaluate only structured Portfolio, personal comparison, and position-relevant Chain Event evidence
- Security incidents and contract pauses affecting a detected position may produce `REVIEW_NOW`
- Material protocol upgrades and governance changes may produce `WATCH`
- A higher APR or APY candidate is supporting evidence only and must not raise the Hero severity by itself
- Missing or partial critical data must produce an unknown/incomplete state, never a healthy conclusion
- No supported position is a neutral state, not proof that a portfolio is healthy
- Every conclusion must expose its reasons and lead to the relevant evidence section
- AI may improve wording in a future version, but it must not override the deterministic status or invent evidence

---

## DEC-016 — Product Detail Is a Thin Evidence Layer

The Product detail page completes the path from a Dashboard conclusion to its underlying evidence without expanding the homepage or duplicating a full analytics terminal.

Rules:

- Market, Portfolio, and personal comparison entries may navigate to the same internal Product detail route
- Reuse the existing Market, Portfolio, and Chain Event services; do not create a second product dataset
- Show current rate, rate type, TVL, source, fetched time, related wallet positions, and official-first events when available
- A missing Market observation must not hide an otherwise verified wallet position
- Missing values remain unavailable and are never displayed as zero
- Keep the product link and provider source link visible, without claiming a third-party link is official
- The page provides evidence and context only; it does not execute transactions or issue MOVE/HOLD recommendations

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
