# DeFi OS Architecture

> **Simple enough for the MVP. Structured enough to evolve.**

---

## Status

Accepted v1.0

---

## Purpose

Define the technical foundation and responsibility boundaries for DeFi OS v1.

This architecture supports the current MVP.

It is not designed for hypothetical future scale.

---

# Technology Stack

- Nuxt 4
- Vue 3
- TypeScript strict
- Nuxt Server API
- pnpm
- ESLint

Additional dependencies must solve an observed problem and require approval before installation.

---

# Architecture Overview

```text
Nuxt Application
       ↓
Pages
       ↓
Components
       ↓
Composables
       ↓
Internal Server API
       ↓
Services
       ↓
Repositories / Providers
       ↓
Local Persistence / External APIs
```

Product detail pages use an encoded product identity in the route and resolve current observations through the existing internal Market API/service layer. They do not maintain a second product dataset or require a database.

The detail page may combine:

- current Market observation
- connected wallet positions from the existing Portfolio adapters
- official-first Chain Events

Missing Market or Event data remains unavailable instead of being replaced with zero. A Portfolio position can still be inspected when its matching Market observation is temporarily unavailable.

## Production health and operational visibility

`GET /api/health` is the deployment readiness contract. It verifies the server runtime and required production
configuration without calling an external provider. Production readiness fails with HTTP 503 when the Reown project
ID is missing or malformed; the response reports only configuration status and never returns the configured value.

Server API requests emit one privacy-safe completion observation containing only:

- HTTP method;
- route pathname without query data;
- response status;
- duration;
- success/client-error/server-error outcome;
- slow-request classification.

Wallet addresses, query values, headers, request bodies, and provider response bodies are not operational log fields.
Retries are not applied globally: each provider must earn retry behavior from observed transient failures, and only
idempotent reads may be retried within a bounded request budget.

## Chain Event Adapter Registry

Chain Events use an explicit server-side registry rather than protocol conditionals in the page.

- Each wallet protocol is returned with `supported` or `unavailable` event coverage
- A provider may serve several verified protocol spaces, while a protocol may later use several providers
- Provider success and protocol coverage are separate: a configured provider can be temporarily unavailable
- Current official adapters are Aave DAO governance, Spark governance spells, verified Snapshot spaces,
  Dolomite's official governance archive, and Yearn's official security disclosures
- The service filters provider results by the wallet's protocol, chain, and asset scope, caches upstream requests
  for 10 minutes, and never substitutes generic news for missing official coverage
