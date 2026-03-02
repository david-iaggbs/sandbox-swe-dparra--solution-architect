# ADR-0001: Introduce Minesweeper Product Domain

| Field | Value |
|-------|-------|
| **Date** | 2026-03-01 |
| **Status** | Accepted |
| **Categories** | product, infra, service, ui |
| **Deciders** | @david-iaggbs |
| **Jira** | [ITL-5671](https://jira.example.com/browse/ITL-5671) |
| **Supersedes** | — |
| **Superseded by** | — |
| **Originating Epic** | https://github.com/david-iaggbs/sandbox-swe-dparra--solution-architect/issues/2 |

---

## Context

The sandbox has one product domain: booking. Epic 2 (Lanzar un juego Buscaminas jugable en el navegador) requires a new domain: minesweeper. It will host a game engine backend service, a browser UI, shared infra, and architecture docs. Architecture constraints remain unchanged: ECS Fargate, no Lambda, no API Gateway, EventBridge for async communication, ALB routing, and database-per-service.

## Decision

We will introduce minesweeper as an independent product domain with 4 repositories: `sandbox-swe-dparra--minesweeper--design`, `sandbox-swe-dparra--terraform-minesweeper--infra`, `sandbox-swe-dparra--minesweeper--engine--service`, and `sandbox-swe-dparra--minesweeper--game--ui`.

## Options Considered

### Option 1: Extend booking domain (rejected)

**Summary:** Add minesweeper functionality under the existing booking product domain.

**Pros:**
- No new repos to maintain

**Cons:**
- Violates bounded-context separation — no functional overlap between booking and minesweeper
- Pollutes the booking domain with unrelated game logic

### Option 2: Serverless Lambda deployment (rejected)

**Summary:** Deploy the game engine as a Lambda function instead of ECS Fargate.

**Pros:**
- Lower infrastructure overhead for event-driven game logic

**Cons:**
- Lambda is explicitly forbidden by architecture constraints
- Inconsistent with the established ECS Fargate compute platform

### Option 3: New minesweeper domain (chosen)

**Summary:** Create a clean, isolated product domain mirroring the booking pattern.

**Pros:**
- Clean bounded-context isolation — minesweeper evolves independently
- Mirrors the established booking domain pattern for consistency
- Independent lifecycle for each component repo

**Cons:**
- Four new repos to maintain
- ALB listener priority range must be documented and extended (UI 50, engine 200)

## Rationale

Database-per-service and no cross-domain shared infrastructure are hard constraints. The booking domain has no functional overlap with a game engine. Extending it would introduce artificial coupling and violate bounded-context principles. A standalone minesweeper domain is the only compliant option that respects both the architecture constraints and clean service boundaries.

## Consequences

**Positive:**
- Minesweeper evolves independently from booking with no risk of cross-domain interference
- ALB priorities extended cleanly (UI: 50, engine: 200) with documented ranges
- Design ADRs for minesweeper are isolated in the minesweeper design repo

**Negative / trade-offs:**
- Four additional repos to maintain across the organization
- ALB listener priority range must be documented and kept current as new services are added

**Follow-up actions:**
- [x] Scaffold design repo: `sandbox-swe-dparra--minesweeper--design`
- [x] Scaffold infra repo: `sandbox-swe-dparra--terraform-minesweeper--infra`
- [x] Scaffold engine service repo: `sandbox-swe-dparra--minesweeper--engine--service`
- [x] Scaffold game UI repo: `sandbox-swe-dparra--minesweeper--game--ui`
- [x] Register minesweeper in product registry (README.md)

## Related

- Related ADRs: —
- Jira: [ITL-5671](https://jira.example.com/browse/ITL-5671)
- Repos:
  - [sandbox-swe-dparra--minesweeper--design](https://github.com/david-iaggbs/sandbox-swe-dparra--minesweeper--design)
  - [sandbox-swe-dparra--terraform-minesweeper--infra](https://github.com/david-iaggbs/sandbox-swe-dparra--terraform-minesweeper--infra)
  - [sandbox-swe-dparra--minesweeper--engine--service](https://github.com/david-iaggbs/sandbox-swe-dparra--minesweeper--engine--service)
  - [sandbox-swe-dparra--minesweeper--game--ui](https://github.com/david-iaggbs/sandbox-swe-dparra--minesweeper--game--ui)
