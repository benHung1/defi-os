# DeFi OS Product Principles

> **Simple enough to understand.**
>
> **Clear enough to trust.**
>
> **Useful enough to act.**

---

## Status

Accepted v1.0

---

## Purpose

Define how DeFi OS should think, design, and make product decisions.

These principles apply to:

- Product decisions
- UX and UI
- Data presentation
- Recommendations
- Engineering tradeoffs
- Future feature proposals

When there is uncertainty, choose the option that better follows these principles.

---

# 1. Decision over Information

Data is the input.

Decisions are the output.

DeFi OS should not display information simply because it is available.

Every metric, chart, label, and event must help users answer a meaningful question.

Before adding anything, ask:

> **What decision does this help the user make?**

If there is no clear answer, it should not be added.

---

# 2. Reduce Cognitive Load

Every feature must reduce the effort required to understand DeFi.

Complexity is not a sign of professionalism.

Complexity is a cost paid by the user.

DeFi OS should:

- Remove unnecessary choices
- Summarize fragmented information
- Prioritize important changes
- Hide secondary details until needed
- Use clear and consistent language

Users should not need to become analysts to understand their own assets.

---

# 3. One Screen, One Primary Question

Every screen should answer one primary question.

## Decision Dashboard

> **Do I need to do anything today?**

## Portfolio

> **Where is my capital allocated?**

## Protocol

> **Is this protocol still healthy, and why?**

## Market

> **Where are the relevant opportunities and changes?**

## Chain Events

> **What important event deserves my attention?**

A page may contain supporting information, but it should never lose its primary purpose.

---

# 4. Explain Everything

Every recommendation must explain why.

Never show only:

> Health Score: 82

Instead, explain the evidence:

- One protocol represents 58% of the portfolio
- APR decreased significantly
- TVL remains stable
- No recent critical security event was detected

Users should never be asked to blindly trust a score, label, or recommendation.

A recommendation without an explanation is not a recommendation.

It is an opinion.

---

# 5. Clarity over Completeness

More information does not always create better understanding.

DeFi OS should not attempt to show everything.

It should show what matters first.

Prefer:

- A small number of meaningful metrics
- Clear prioritization
- Plain language
- Progressive disclosure
- Focused comparisons

Avoid:

- Dense dashboards
- Unnecessary charts
- Long tables without context
- Multiple competing calls to action
- Data shown only because competitors show it

Clear beats complete.

Always.

---

# 6. Progressive Disclosure

Important information should appear first.

Supporting evidence should remain available without overwhelming the main experience.

The default view should answer:

> **What matters now?**

Users can then explore:

- Why it matters
- Where the data came from
- Historical details
- Risk evidence
- Protocol-level information

DeFi OS should be simple on the surface and detailed underneath.

Simple does not mean shallow.

---

# 7. Trust through Transparency

Trust must be earned through evidence.

Every external metric should include:

- Source
- Last updated time
- Clear unit
- Clear meaning
- Missing-data state when unavailable

Every score should explain:

- What factors were evaluated
- What data is missing
- What limitations exist
- Why the result changed

Never hide uncertainty.

Never present estimates as facts.

Never use absolute claims such as:

- Safe
- Risk-free
- Guaranteed
- Certain

Use evidence-based language instead.

---

# 8. Context before Numbers

A number without context creates confusion.

Do not show only:

> APR: 4.8%

Explain where useful:

- Whether it is APR or APY
- Whether it increased or decreased
- Whether the change is meaningful
- How it compares with the user's current position
- When the data was last updated

Metrics should help users understand significance, not merely display precision.

---

# 9. Signal over Noise

Not every market change deserves attention.

Not every transaction is an event.

Not every news item requires action.

DeFi OS should prioritize:

- Material APR or APY changes
- Significant TVL changes
- Security incidents
- Governance changes affecting users
- Contract pauses or upgrades
- Changes relevant to the user's portfolio

Minor fluctuations should not create unnecessary alerts or anxiety.

The product should make users calmer, not more reactive.

---

# 10. Portfolio before Market

The user's existing positions are more important than the entire market.

DeFi OS should first answer:

- What do I currently own?
- Where is it allocated?
- Has anything relevant changed?
- Do I need to take action?

Market exploration is valuable, but it should not distract from portfolio health.

The product begins with the user, not the market.

---

# 11. Recommendations must be Proportional

Not every concern requires immediate action.

Recommendations should reflect severity.

Use clear levels such as:

- Maintain
- Watch
- Consider adjusting
- Review immediately

Avoid turning every signal into an emergency.

The product should distinguish between:

- Information
- Attention
- Decision
- Action

---

# 12. Chinese-first, Not Translation-first

DeFi OS is designed for Chinese-speaking users.

Chinese-first means more than translating English interfaces.

It means:

- Natural Chinese terminology
- Clear explanations of technical concepts
- Consistent naming
- Reduced jargon
- Context appropriate for Chinese-speaking investors

Do not translate terminology mechanically when the result becomes harder to understand.

Important English terms may remain visible when they improve accuracy.

Examples:

- TVL
- APR
- APY
- Timelock
- Multisig

The goal is understanding, not linguistic purity.

---

# 13. Consistency Creates Confidence

The same concept should always use the same:

- Name
- Color meaning
- Risk level
- Date format
- Number format
- Interaction pattern
- Recommendation language

Do not call the same concept:

- Dashboard in one place
- Overview in another
- Home somewhere else

Inconsistency increases cognitive load and weakens trust.

---

# 14. Do Not Create False Precision

DeFi risk cannot be reduced to a perfect number.

Scores and labels are decision aids, not truth.

Avoid presenting uncertain assessments with excessive precision.

Prefer:

> Risk Level: Moderate

With supporting reasons.

Instead of:

> Safety: 87.43

Unless the precision is genuinely supported and useful.

Evidence is more important than decorative accuracy.

---

# 15. User Control over Automation

DeFi OS may recommend.

It should not silently act.

Users must understand:

- What is being recommended
- Why it is recommended
- What the risks are
- What action would occur

Automation, wallet execution, and strategy management are future possibilities.

They must never remove meaningful user control.

---

# 16. Privacy by Default

Users should not need to reveal more information than necessary.

Prefer:

- Read-only access
- Manual input before wallet connection
- Minimal data collection
- Clear explanation of stored information
- No unnecessary personal profiles

Portfolio information is sensitive.

Treat it accordingly.

---

# 17. Build the Smallest Useful Version

Do not build for hypothetical scale before proving user value.

Prefer:

- One complete user journey
- A small number of supported protocols
- A small number of trusted data sources
- Explicit rules
- Simple architecture
- Real daily use

Avoid premature:

- Microservices
- Complex databases
- Large abstraction layers
- Multi-user systems
- Automated strategy engines
- Broad protocol coverage

Start small.

Learn quickly.

Expand only when the product earns complexity.

---

# 18. Evidence before Recommendation

A recommendation must be based on observable evidence.

The order should be:

1. Collect data
2. Confirm relevance
3. Explain the change
4. Evaluate severity
5. Present a recommendation

Never begin with a conclusion and search for data to support it.

---

# 19. Calm is a Product Feature

DeFi products often increase urgency, anxiety, and FOMO.

DeFi OS should do the opposite.

Good product language should be:

- Calm
- Specific
- Honest
- Neutral
- Actionable

Avoid:

- Fear-driven alerts
- Promotional language
- Artificial urgency
- Guaranteed outcomes
- Sensational headlines

Confidence comes from understanding, not excitement.

---

# 20. Every Feature must Earn its Place

Before building a feature, ask:

1. Does it reduce cognitive load?
2. Does it improve decision quality?
3. Can it be explained simply?
4. Would the user use it regularly?
5. Would removing it make the product meaningfully worse?

If the answer is unclear, do not build it yet.

---

# Final Standard

Before merging any meaningful product change, ask:

> **Does this help someone make a better DeFi decision?**

If the answer is no,

the change does not belong in DeFi OS.