# ADR-0002: Introduce booking-portal-ui as the customer-facing Astro SSR frontend for the booking product

| Field | Value |
|-------|-------|
| **Date** | 2026-03-16 |
| **Status** | Accepted |
| **Categories** | product, ui, initiative |
| **Deciders** | @david-iaggbs |
| **Jira** | ITL-5671 |
| **Supersedes** | — |
| **Superseded by** | — |
| **Originating Epic** | https://github.com/david-iaggbs/sandbox-swe-dparra--solution-architect/issues/9 |

---

## Context

The booking product currently has one service (availability-service) and no web UI. The epic "Allow guests to cancel their bookings online" requires a customer-facing interface through which guests can view and cancel their reservations. No UI component has ever been registered under the booking product. This decision captures the introduction of the first UI boundary in this product domain.

## Decision

We will introduce sandbox-swe-dparra--booking--booking-portal--ui as a dedicated Astro 5 SSR application deployed on ECS Fargate, following the BFF (Backend for Frontend) pattern to proxy all backend calls through server-side API routes.

## Options Considered

### Option 1: Extend an existing UI (not applicable)

**Summary:** Reuse a UI from another product domain.

**Pros:**
- No new repo

**Cons:**
- No other UI exists in this org that covers the booking domain
- Cross-domain UI coupling violates bounded context separation

### Option 2: Single-page app served from availability-service

**Summary:** Embed static HTML/JS in the Spring Boot service.

**Pros:**
- Simpler deployment (one container)

**Cons:**
- Violates separation of concerns — UI and API lifecycle coupled
- Cannot SSR independently or scale UI separately from API
- Contradicts the architecture standard (Astro SSR on ECS Fargate)

### Option 3: New Astro SSR UI on ECS Fargate _(chosen)_

**Summary:** Scaffold booking-portal-ui as a standalone Astro 5 SSR app with its own CDK stack.

**Pros:**
- Follows the established Astro SSR + ECS Fargate pattern
- Independent deployment and scaling of UI vs backend
- BFF pattern keeps backend URLs out of the browser
- SSM-driven configuration (no hardcoded URLs)

**Cons:**
- Additional repository and ECS task to manage
- Slightly higher infrastructure cost vs embedding in the service

## Rationale

Option 3 is the only approach consistent with the architecture standards. The BFF pattern is mandatory for all UIs in this organisation — browsers must never call backend services directly. An independent Astro SSR container also allows the UI to be scaled, deployed, and versioned separately from the availability-service, which is critical as the booking product grows.

## Consequences

**Positive:**
- Establishes the first customer-facing touchpoint for the booking product
- Decouples UI deployment from backend service deployment
- All guest interactions are server-side rendered — no PII leaks via client-side JS calls

**Negative / trade-offs:**
- New ECS task adds infrastructure cost and operational overhead
- A new repository (booking-portal-ui) must be scaffolded and maintained

**Follow-up actions:**
- [x] Create sandbox-swe-dparra--booking--booking-portal--ui repo using scaffold-webui skill
- [x] Update README product registry to register the new UI
- [ ] Approve design spec in sandbox-swe-dparra--booking--design#3 before deploying

## Related

- Related ADRs: ADR-0001 (minesweeper product domain — parallel pattern)
- Jira: ITL-5671
- Repos: sandbox-swe-dparra--booking--design, sandbox-swe-dparra--booking--availability--service, sandbox-swe-dparra--booking--booking-portal--ui
- Epic: https://github.com/david-iaggbs/sandbox-swe-dparra--solution-architect/issues/9
