# DeFi OS — Project Operations

> This document is the operational source of truth for collaboration,
> task execution, code review, merge workflow, and the current project checkpoint.
>
> Product truth belongs in Product / Principles / Scope / Roadmap documents.
> Architecture truth belongs in Architecture documents.
> Durable technical/product decisions belong in DECISIONS.
>
> This file answers:
>
> **How do we work together, and where is the project right now?**

---

# 1. Roles

The project uses a three-party collaboration model.

## Product Owner / Coordinator — User

Responsibilities:

- Defines product intent and priorities.
- Provides product feedback.
- Makes final product decisions when tradeoffs exist.
- Coordinates handoff between GPT and Cursor.
- Provides Cursor reports and review packages back to GPT.
- Approves major changes in product direction.

The Product Owner does not need to manually translate technical implementation details between GPT and Cursor.

Reports should be passed between agents as completely as practical.

---

## PM / Architect / Code Reviewer — GPT

Responsibilities:

- Clarify product intent.
- Protect MVP scope.
- Translate product discussions into executable Tasks.
- Define:
  - Goal
  - Scope
  - Out of Scope
  - Architecture constraints
  - Acceptance criteria
  - Validation requirements
  - Git requirements
- Review Cursor completion reports.
- Request actual implementation evidence before merge.
- Perform Code Review.
- Identify blocking vs non-blocking findings.
- Issue focused review-fix Tasks when required.
- Approve merge only after Code Review passes.
- Determine when a Task is CLOSED.
- Help determine the next smallest useful product slice.

GPT must not treat a Cursor completion report as sufficient evidence for Code Review when implementation code changed.

---

## Engineer — Cursor

Responsibilities:

- Inspect the repository before implementation.
- Verify repository state before modifying code.
- Produce an implementation plan when requested.
- Implement only the approved Task scope.
- Follow existing architecture and conventions.
- Run required validation.
- Self-review the diff.
- Create focused commits.
- Produce accurate completion reports.
- Provide full diffs / relevant file contents when requested for Code Review.
- Apply only approved review fixes.
- Perform Git merge/push/branch cleanup only after explicit merge approval.

Cursor must not independently start the next Task.

---

# 2. Core Collaboration Rules

## 2.1 Repository and project documents are the source of truth

Chat history and agent memory are not the authoritative project record.

When there is disagreement between remembered conversation and repository documentation:

1. inspect the current repository;
2. inspect project documents;
3. inspect Git history;
4. clarify only if ambiguity remains.

Do not reconstruct critical project state from memory alone.

---

## 2.2 One Task at a time

A Task must be completed before the next Task begins.

A Task is not complete merely because implementation is committed.

The normal lifecycle is:

Discuss
→ Task Brief
→ Implementation
→ Validation
→ Commit
→ Completion Report
→ Code Review
→ Review Fix if required
→ Code Review Approval
→ Merge Approval
→ Fast-forward Merge
→ Push
→ Branch Cleanup
→ Final Repository Verification
→ Task CLOSED

Only after CLOSED may the next Task begin.

---

## 2.3 Completion Report is not Code Review

A Cursor Completion Report is an implementation summary.

It is not independent evidence that the implementation is correct.

For implementation Tasks, GPT should review actual implementation evidence before merge.

Evidence may include:

- `git diff`
- changed files
- relevant final file contents
- API contracts
- state/data-flow traces
- validation results

For very small or documentation-only changes, review depth may be reduced when appropriate.

---

## 2.4 Code Review has explicit outcomes

Code Review must result in one of:

### APPROVED

No blocking issue remains.

The Task may proceed to merge approval.

### CHANGES REQUESTED

At least one blocking issue exists.

GPT should identify:

- exact problem;
- why it matters;
- minimum required fix;
- explicit non-goals for the fix.

Cursor then creates a focused review-fix commit.

The original implementation commit should normally remain intact.

---

## 2.5 Merge requires explicit approval

Cursor must not merge merely because:

- implementation is complete;
- tests pass;
- a Completion Report was produced;
- review fixes were committed.

GPT must explicitly issue:

`Task-XXX merge APPROVED`

before merge operations begin.

---

## 2.6 Prefer fast-forward merges

Normal feature integration:

`git merge --ff-only <feature-branch>`

Avoid unnecessary merge commits.

Do not:

- force push;
- rewrite reviewed history;
- squash reviewed commits unless explicitly approved;
- rebase reviewed commits unless explicitly approved.

If fast-forward merge cannot be performed because repository state changed unexpectedly:

STOP and report.

---

## 2.7 Dirty working tree is a STOP condition

Before:

- starting implementation;
- performing review-sensitive Git operations;
- merging;

verify repository state.

Unexpected modified/untracked files must not be silently deleted, stashed, committed, or ignored.

STOP and report the discrepancy unless the Task explicitly authorizes handling it.

---

## 2.8 Scope discipline

Cursor implements the approved Task, not adjacent ideas.

When unrelated cleanup or opportunities are discovered:

- report them as follow-ups;
- do not implement them automatically.

Examples:

- refactoring unrelated components;
- renaming unrelated types;
- expanding provider coverage;
- adding another asset;
- adding wallet integration;
- building future Decision Engine behavior.

A useful idea is not automatically part of the current Task.

---

## 2.9 Blocking vs non-blocking findings

Code Review should distinguish:

### Blocking

Must be fixed before merge.

Examples:

- incorrect behavior;
- unsafe data semantics;
- architecture violation;
- misleading product behavior;
- broken validation;
- scope violation;
- recommendation behavior without sufficient evidence.

### Non-blocking

May be recorded for later.

Examples:

- naming cleanup;
- dead CSS with no behavioral impact;
- component size;
- minor duplication;
- future architecture improvements;
- optional UX refinement.

Do not expand a Task solely to eliminate every non-blocking imperfection.

---

# 3. Product Guardrails During Implementation

These rules supplement the main Product Principles.

## Portfolio before Market

User-owned positions are more important than general market exploration.

When possible, prioritize:

1. user state;
2. changes relevant to the user;
3. supporting evidence;
4. broader market exploration.

---

## Decision over Information

More data is not automatically more useful.

Every new block should answer a distinct user question.

Avoid multiple sections repeating the same conclusion.

---

## Progressive Disclosure

Prefer:

Summary
→ Evidence
→ Details
→ Broader Exploration

Do not show the same summary repeatedly at multiple levels.

---

## Evidence before Recommendation

Factual comparison does not automatically justify a recommendation.

Example:

`Candidate APY is +1.2% above current position`

is evidence.

It does not automatically mean:

`MOVE`

or:

`Recommended`.

Recommendation behavior requires explicitly approved decision rules.

---

## APR / APY comparison guard

Direct numerical personal comparison is allowed only when rate semantics are comparable.

Current rule:

`candidate.rateType === currentPositionRate.rateType`

APR and APY must not be directly compared without an explicitly designed normalization model.

Do not invent APR↔APY conversion assumptions.

---

## Higher yield is not automatically attention

The existence of a higher-yield opportunity does not by itself mean:

- user attention is required;
- current position is unhealthy;
- user should move;
- HOLD/MOVE can be determined.

Yield difference is evidence, not a decision.

---

# 4. Standard Task Structure

GPT Tasks should normally contain:

1. Task title
2. Expected repository start state
3. Product/engineering goal
4. Context/problem
5. Before-coding inspection
6. Scope
7. Explicit Out of Scope
8. Architecture/product constraints
9. Required behavior
10. Validation
11. Git rules
12. Completion Report requirements
13. Expected final state
14. STOP instruction

Not every Task requires every section at equal length.

Use the minimum detail required to make execution deterministic.

---

# 5. Standard Review Workflow

After Cursor commits an implementation:

## Step 1 — Completion Report

Cursor reports:

- branch;
- commit;
- files changed;
- implementation summary;
- validation;
- repository state;
- known concerns.

## Step 2 — Code Review Handoff

When necessary, GPT requests:

- full diff;
- relevant final code;
- data-flow traces;
- API contracts;
- exact UI copy;
- validation evidence.

No code changes occur during this handoff.

## Step 3 — GPT Code Review

GPT evaluates:

- correctness;
- scope;
- architecture;
- product semantics;
- data semantics;
- regressions;
- maintainability;
- validation.

## Step 4A — APPROVED

Proceed to explicit merge approval.

## Step 4B — CHANGES REQUESTED

GPT issues a narrowly scoped fix Task.

Cursor:

- fixes only blockers;
- creates a new focused commit;
- reports;
- waits for second review.

---

# 6. Standard Merge Workflow

Before merge:

- correct feature branch;
- clean working tree;
- expected reviewed HEAD;
- fetch origin;
- expected main/origin-main state.

Unexpected state:

STOP.

Normal procedure:

1. switch main;
2. pull `--ff-only`;
3. merge feature `--ff-only`;
4. verify HEAD;
5. push main;
6. verify origin/main;
7. delete local feature branch;
8. delete remote feature branch if it exists;
9. fetch/prune;
10. verify final repository state.

A remote feature branch that was never pushed does not constitute merge failure.

Never create a remote feature branch merely so it can be deleted.

---

# 7. Definition of Task CLOSED

A normal implementation Task is CLOSED only when:

- implementation completed;
- validation passed;
- Code Review approved;
- approved commits merged;
- main pushed;
- main = origin/main;
- working tree clean;
- feature branch cleaned up as appropriate;
- final repository state verified;
- no next Task started prematurely.

---

# 8. Current Project State

> Update this section after a Task is CLOSED.
> Keep it concise.

Last Completed Task:

**v1 Integration Validation — Position-aware Decision Dashboard**

Status:

**CLOSED / MERGED through GitHub PR #1 on 2026-09-23**

Working tree:

**Task-013 is active on `codex/task-013-production-beta-foundation`, based on `main` / `origin/main` at `e1c6cae`.**

Current Dashboard hierarchy:

1. Decision Hero
2. Portfolio
3. Personal position / market comparison
4. DeFi Market
5. Chain Events

Current Market scope:

**Supported multi-chain USDC, USDT, ETH, and BTC-related yield products with Portfolio-readable coverage.**

Current personal comparison:

- connected-wallet positions come from read-only protocol adapters;
- all 12 registered position adapters have deterministic contract tests for their core balance or share conversion path;
- market candidates come from `/api/decision/usdc`;
- only matching `rateType` values may be numerically compared;
- higher yield remains factual evidence, not recommendation.

Current Market source:

`/api/market/dashboard`

Important unfinished areas:

- periodic re-validation of public live-address samples when protocol contracts or APIs change;
- founder validation with a real wallet that holds at least one supported position.
- production deployment, reliability hardening, and privacy-safe operational visibility;
- 7–14 day founder Beta validation of the 30-second daily journey.

Next Product Task:

**Task-013 — implement the smallest deployment readiness and privacy-safe observability foundation.**

## Phase 2 Scope

Phase 2 is **Production Beta and Daily Validation**.

It includes:

- one stable production deployment;
- production Reown origin and environment configuration;
- bounded provider timeout, cache, retry, and failure isolation where required;
- privacy-safe API availability and latency visibility;
- a minimal health endpoint;
- desktop, mobile wallet, reconnect, disconnect, theme, and empty-state validation;
- periodic public live-address adapter checks;
- one founder-controlled supported-position pass when such a position is available;
- 7–14 days of founder use before selecting another major feature.

It explicitly excludes AI summaries, notifications, historical analytics, additional coverage without evidence,
accounts, database infrastructure without a demonstrated need, automated transactions, Safety Score, and a native
mobile application.

## v1 Integration Acceptance

The Dashboard has one decision flow:

`Decision Hero → Portfolio evidence → Personal USDC comparison → Market exploration → Position-relevant events`

Before a v1 release candidate is approved:

- disconnected mode must explain the read-only connection and must not imply that portfolio data was checked;
- complete position mode must keep totals, position counts, comparison scope, and event scope consistent;
- partial coverage must label displayed values as verified subsets and must not infer that missing positions are zero;
- event copy must use the same 45-day window as the event query and Decision Hero;
- Portfolio loading and Event loading must be presented as separate stages;
- automated tests, typecheck, lint, production build, desktop visual review, and narrow-screen review must pass;
- one founder-controlled wallet with a supported live position must complete the same flow without using a development fixture.

Development fixtures validate presentation and data contracts, but they do not satisfy the final real-wallet item.

## Local Portfolio Acceptance Scenario

The development-only URL below exercises the same Dashboard data contract with clearly labeled Aave, Morpho
Blue, and Spark positions:

`http://localhost:3001/?demoPortfolio=aave-morpho-spark`

The scenario is gated by `import.meta.dev`; the same query parameter has no effect in a production build. It must
always display the `開發測試資料` notice and must never be presented as live wallet evidence.

To verify the three live adapters against any public Ethereum address:

`pnpm verify:positions -- 0x<public-address>`

The default report shows at most 10 positions per adapter and deduplicates warning text. Add `--full` only when
the complete raw report is required.

Aave and Spark read protocol contracts directly. Morpho uses its indexer for discovery metadata and verifies
shares or balances onchain before returning a position.

To run the manual live-address smoke suite for every registered adapter:

`pnpm verify:position-samples`

The suite uses Blockscout only to discover a current public receipt-token holder, then requires the corresponding
adapter to independently return a non-zero contract-verified position. It does not store a user's address, sign a
message, request an approval, or run in CI. On 2026-09-22 all 12 registered adapters returned non-zero positions
with zero warnings. The live run also identified and fixed Yearn portfolio discovery so retired vaults
remain visible to existing holders; market admission continues to apply separate active-product rules.

Automated adapter coverage currently includes Aave, SparkLend, Spark Savings, Compound V3, Morpho Blue,
Fluid, Maple, Yearn V2/V3, Pareto, Midas, Dolomite, and Sentora. These tests use deterministic RPC/API responses
to lock decimals, receipt-share conversion, underlying-asset conversion, rate type, valuation, zero-balance, and
dust behavior. They do not replace the public-address live checks listed above.

Portfolio partial-data acceptance can be inspected in development at:

`http://localhost:3001/?demoPortfolio=partial-coverage`

The Portfolio API reports balance, protocol-position, and USD-price coverage independently. A partial response
keeps verified data visible, suppresses an unverified aggregate total, and must never describe an unavailable
adapter as a zero balance. The Decision Hero remains in an unknown state until coverage is complete.

## Accessibility, responsive, and performance acceptance

The Market filter moves keyboard focus into the dialog, restores focus after Escape or explicit close, and exposes
multi-select state with `aria-pressed`. Loading and failure states use live-region semantics, all common controls
share a visible focus treatment, and reduced-motion preferences disable non-essential transitions. The fixed
Dashboard header keeps a single row at narrow mobile widths and hides only the redundant brand wordmark.

Reown AppKit initializes from a dynamically loaded client module instead of the global Nuxt entry. In the
2026-09-22 production build this reduced the render-blocking client entry from 915.44 kB (265.80 kB gzip) to
49.62 kB (18.84 kB gzip). The wallet SDK remains a large deferred chunk, and the build therefore still reports
the standard large-chunk advisory; the disconnected state and Connect modal opening were re-tested after the split.

---

# 9. Recent Task History

Keep only the most recent few Tasks that materially help restore project context.

Older implementation history remains available in Git.

---

## Task-013 — Production Beta Foundation

Status:

**ACTIVE**

Goal:

Create the smallest production-readiness layer before choosing a hosting target or expanding product features.

Current slice:

- add a dependency-free `/api/health` readiness endpoint;
- fail production readiness when required Reown configuration is absent;
- add API completion observations without wallet addresses or query data;
- lock the privacy and retry rules with deterministic tests;
- keep deployment provider selection, external log storage, broad retry work, DB, accounts, and new product features out of scope.

---

## Task-012 — v1 Integration Validation and Release Candidate

Status:

**CLOSED / MERGED**

Goal:

Complete and validate the position-aware Decision Dashboard as one coherent v1 journey.

Result:

- connected Decision Hero, Portfolio, personal USDC comparison, Market, Product detail, and Chain Events;
- covered all 12 position adapters with deterministic tests and public live-address smoke checks;
- added explicit partial-data semantics, accessibility, responsive behavior, and deferred wallet loading;
- resolved Code Review findings for provider rejection handling, debt netting, and Aave product identity;
- added GitHub CI for tests, typecheck, lint, and production build;
- merged GitHub PR #1 into `main` with all checks passing.

Merge commit:

`3cd582d`

Outstanding acceptance:

- founder-controlled wallet validation remains pending until a supported live position is available.

---

## Task-011 — Dashboard Information Architecture

Status:

**CLOSED / MERGED**

Goal:

Reduce homepage duplication and create a clearer information hierarchy.

Result:

- removed standalone `市場差異觀察`;
- Hero remains concise summary;
- Personal USDC section remains detailed evidence;
- Market moved after personal comparison;
- Market heading prepared for broader future direction:
  - `DeFi 市場`
  - `目前先看 USDC`
- no multi-asset support added;
- no Decision Engine behavior added.

Merged commit:

`648e71a871bca504ea410aaafdd25c33f53953b5`

---

## Task-010 — Personal USDC Decision Data

Status:

**MERGED**

Goal:

Connect personal USDC comparison to real Decision Candidate data.

Result:

- `/api/decision/usdc` is the source of market candidates;
- current user position remains temporary/mock;
- fake candidate comparison data removed;
- no recommendation/MOVE/HOLD engine added.

Implementation commit:

`896650a2952c69bd75e813936a29baf8381023ed`

Review-fix commit:

`5f34a34ed163107f67bf78d14c38591546e1027f`

Important Code Review decisions:

1. APR and APY must not be directly compared.
2. Only matching `rateType` values enter personal numeric comparison.
3. Higher yield alone must not trigger Hero attention/warning.
4. Factual comparison is not recommendation.

---

# 10. Document Maintenance

This document must remain small enough to restore project context quickly.

## Update every CLOSED Task

Update only:

- Current Project State;
- Recent Task History.

## Recent Task limit

Normally retain approximately the latest **3 significant Tasks**.

When a new Task is added, older Tasks may be removed from this file.

Git history remains the complete implementation archive.

## Durable decisions

If a Task creates a rule that future work must respect, record that rule in the appropriate DECISIONS document.

Do not rely on Recent Task History as permanent decision storage.

## Collaboration changes

Sections 1–7 should change only when the collaboration process itself changes.

Do not rewrite the collaboration protocol every Task.

---

# 11. Cold-Start Procedure

When starting a new ChatGPT/Cursor conversation with no reliable chat history:

1. Read the project Product/Vision document.
2. Read Product Principles.
3. Read MVP Scope.
4. Read Roadmap.
5. Read Architecture.
6. Read DECISIONS.
7. Read this `PROJECT_OPERATIONS.md`.
8. Inspect current Git state before issuing or executing a new Task.

Do not ask the Product Owner to reconstruct old conversations when the repository documents and Git history already contain the answer.

The repository is the project memory.
