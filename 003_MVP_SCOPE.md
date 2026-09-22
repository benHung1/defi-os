# DeFi OS MVP Scope

> **Build the smallest product that proves DeFi OS can reduce decision-making cost.**

---

## Status

Accepted v1.0

---

## Purpose

Define what DeFi OS v1 includes and excludes.

Anything not listed in this document is not part of the MVP unless this document is updated first.

---

# MVP Goal

Build a Chinese-first DeFi Decision Dashboard that helps users understand:

- What is happening in the DeFi market
- Where their capital is allocated
- Which protocols deserve attention
- Whether any meaningful action may be required

The MVP should be simple enough to understand within 30 seconds.

---

# In Scope

## 1. Decision Dashboard

The homepage of DeFi OS.

It should provide a simplified daily overview of:

- Market status
- Portfolio status
- Important warnings
- Relevant opportunities
- Meaningful protocol or chain events

Its primary question is:

> **Do I need to pay attention to anything today?**

The Dashboard must remain simple.

It must not become a full analytics terminal.

---

## 2. Portfolio

Users connect a wallet in read-only mode so DeFi OS can inspect public onchain data.

The MVP should support:

- Connect and disconnect a wallet without requesting signatures or approvals
- Read supported wallet assets from the public address
- Detect supported protocol positions through protocol-specific adapters
- Verify position balances against protocol contracts
- View allocation by asset
- View allocation by protocol
- View allocation by chain

Position fields include:

- Asset
- Protocol
- Chain
- Position type
- Amount
- Current USD value when available
- Current APR or APY without converting between the two
- Verification source and timestamp

Initial protocol-position coverage is intentionally curated: Aave, Spark, Compound V3, Morpho Blue, Fluid, Maple, Yearn, Pareto, Midas, Dolomite, and Sentora on Ethereum. Standard vaults are valued through their protocol contracts; dynamic product discovery uses official registries or APIs and verifies the user's balance onchain. Unsupported positions must be shown as unsupported or unavailable, never silently treated as zero.

---

## 3. Protocol

Users can open a protocol detail page to understand its current condition.

The MVP may display:

- Protocol name
- Supported chain
- TVL
- APR or APY
- Data source
- Last updated time
- Relevant risk evidence
- Relevant Chain Events

The page should answer:

> **Is this protocol worth my attention, and why?**

The MVP does not require a complete Safety Score Engine.

Explicit evidence is more important than a composite score.

---

## 4. Market

The Market module provides a simplified view of relevant DeFi opportunities.

The MVP should support:

- Filter by asset
- Filter by chain
- Sort by TVL
- Sort by APR or APY
- View a limited list of relevant protocols

Initial examples may include:

- USDC
- ETH
- BTC-related assets

The Market module must not attempt to reproduce all DefiLlama features.

Only information useful for comparison and decision making should be shown.

Every product admitted to the formal Market search must have a live read-only position adapter. Discovery sources may find additional products, but those products stay outside the user-facing result set until Portfolio can identify the matching position reliably.

---

## 5. Chain Events

The MVP includes a lightweight Chain Events section.

Relevant event types may include:

- Security incidents
- Contract pauses
- Protocol upgrades
- Governance changes
- Significant liquidity movement
- Important protocol announcements

The MVP uses a protocol event adapter registry. A protocol is marked covered only when an official governance,
verified onchain, or official repository source has been connected. Unsupported protocols remain visibly
uncovered instead of being filled with generic news.

The first source set covers Aave, Spark, Morpho Blue, Compound, Fluid, Maple, Dolomite, and Yearn. Coverage is
source-specific: for example, Yearn currently covers official security disclosures and does not claim complete
governance coverage. Pareto, Midas, and Sentora remain explicit coverage gaps until a reliable formal source is
integrated.

A full real-time on-chain monitoring system is not required.

---

## 6. Chinese-first UI

The complete MVP flow must be usable in Chinese.

Important English terms may remain visible when they improve accuracy.

Examples:

- TVL
- APR
- APY
- Timelock
- Multisig

The product should explain terminology instead of mechanically translating it.

---

## 7. Data Transparency

Important external data must include:

- Source
- Last updated time
- Clear unit
- Unavailable state when data is missing

APR and APY must remain distinct.

Missing data must not be displayed as zero.

---

## 8. Core UI States

Important screens must handle:

- Loading
- Empty
- Error
- Partial data
- Data unavailable

The product must remain understandable even when an external provider fails.

---

# Out of Scope

The MVP does not include:

- Automated transactions
- Notifications
- Mobile application
- Login
- Multi-user accounts
- AI summaries
- AI investment recommendations
- Full Safety Score Engine
- Real-time blockchain monitoring
- Automated portfolio rebalancing
- Swap
- Bridge
- Trading
- Social features
- PostgreSQL
- Redis
- NestJS
- Microservices

---

# MVP Completion Criteria

DeFi OS v1 is complete when:

1. The Dashboard provides a clear daily overview
2. Users can connect a wallet read-only and inspect supported, onchain-verified portfolio positions
3. Users can view protocol details
4. Users can browse a simplified Market view
5. Users can view relevant Chain Events
6. External data displays source and update time
7. APR and APY are labeled correctly
8. Important pages support loading, empty, and error states
9. The main experience is available in Chinese
10. The main user journey can be completed without opening another DeFi dashboard

---

# MVP Success Test

The MVP should be tested through real daily use.

The key question is:

> **Would the founder open DeFi OS regularly before opening DefiLlama?**

If the answer is no, adding more features is not the solution.

The core experience must be improved first.
