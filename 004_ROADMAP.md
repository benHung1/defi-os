# DeFi OS Roadmap

> **Build in small vertical slices. Validate value before adding complexity.**

---

## Status

Accepted v1.0

---

## Purpose

Define the recommended development order for DeFi OS v1.

This roadmap describes sequence, not fixed dates.

---

# Sprint 0 — Project Foundation

## Goal

Create a clean and stable project foundation.

## Deliverables

- Nuxt 3 project
- Vue 3
- TypeScript strict
- pnpm
- ESLint
- Core documentation
- Basic application shell
- Successful typecheck, lint, and build

## Not Included

- Product features
- External APIs
- Database
- UI library unless explicitly approved

---

# Sprint 1 — Decision Dashboard

## Goal

Create the first visible version of the product homepage.

## Deliverables

- Dashboard page
- Market summary cards
- Portfolio summary placeholder
- Important attention items
- Chain Events preview
- Loading, empty, and error states
- Initial Chinese UI

Mock data is acceptable in this sprint.

## Validation

The screen should communicate the DeFi OS product direction before real integrations are complete.

---

# Sprint 2 — Portfolio

## Goal

Allow users to manually represent their DeFi positions.

## Deliverables

- Position data model
- Add position
- Edit position
- Delete position
- Allocation by asset
- Allocation by protocol
- Allocation by chain
- Local persistence
- Empty and error states

## Decision Required Before Starting

Choose the MVP portfolio persistence method.

---

# Sprint 3 — Protocol

## Goal

Allow users to understand an individual protocol.

## Deliverables

- Protocol detail page
- TVL
- APR or APY
- Source
- Last updated time
- Missing-data handling
- Relevant risk evidence
- Related Chain Events

## Decision Required Before Starting

Choose the first external data provider and runtime validation method.

---

# Sprint 4 — Market

## Goal

Provide a simplified protocol discovery and comparison experience.

## Deliverables

- Asset filter
- Chain filter
- TVL sorting
- APR or APY sorting
- Limited protocol results
- Protocol navigation
- Clear source and update time

## Guardrail

Do not expand this sprint into a complete DefiLlama replacement.

---

# Sprint 5 — Chain Events

## Goal

Surface meaningful events without becoming a generic news product.

## Deliverables

- Chain Events list
- Event type
- Source
- Date and time
- Related protocol
- Severity or attention level
- Event detail or source link

A simple curated or feed-based implementation is acceptable.

---

# Sprint 6 — Integration and Refinement

## Goal

Connect the core modules into one coherent daily experience.

## Deliverables

- Dashboard uses real Portfolio data
- Dashboard uses real Protocol data
- Dashboard includes relevant Market context
- Dashboard includes relevant Chain Events
- Terminology consistency
- Responsive layout
- Error recovery
- Basic accessibility
- Performance review

---

# v1 Validation

After the core product is complete:

- Use DeFi OS daily
- Record confusing areas
- Record missing decisions
- Remove unused elements
- Improve the 30-second experience

Do not begin major future features until the core product is validated.

---

# After v1

Possible future directions:

- Wallet integration
- Notifications
- Historical trends
- More data providers
- Risk scoring
- AI summaries
- Automated monitoring
- Mobile experience
- Multi-user support

Future features are not commitments.

They require product evidence before entering the roadmap.