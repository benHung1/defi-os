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
