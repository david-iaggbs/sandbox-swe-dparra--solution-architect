# Architecture Decision Records (ADRs)

This folder contains all architectural decisions made by the solution architect for the `david-iaggbs` organization. Every significant decision — whether it routes a feature to an existing product, creates a new one, or establishes a cross-cutting pattern — is captured here as an immutable record.

---

## What is an ADR?

An ADR documents a single architectural decision: the context that prompted it, the options considered, the choice made, and the consequences that follow. ADRs are:

- **Immutable once accepted** — never edit a past decision; supersede it with a new ADR
- **Numbered sequentially** — `NNNN-short-title.md` (e.g., `0001-adopt-ecs-fargate-as-compute-platform.md`)
- **Scoped to one decision** — if you find yourself writing "and also…", split into two ADRs
- **Written at decision time** — not retroactively; capture the reasoning while it is fresh

---

## File Naming

```
adr/NNNN-<short-kebab-case-title>.md
```

| Part | Rule |
|------|------|
| `NNNN` | Zero-padded 4-digit sequence starting at `0001` |
| title | Imperative phrase describing the decision (e.g., `use-postgresql-for-booking`) |
| extension | Always `.md` |

Examples:
```
adr/0001-adopt-ecs-fargate-as-compute-platform.md
adr/0002-booking-product-creation.md
adr/0003-shared-eventbridge-bus-per-product.md
```

---

## Status Lifecycle

```
Proposed → Accepted
         → Rejected
         → Deprecated  (was accepted, no longer relevant)
         → Superseded by ADR-NNNN  (replaced by a newer decision)
```

| Status | Meaning |
|--------|---------|
| `Proposed` | Under discussion, not yet decided |
| `Accepted` | Decision taken, being acted upon |
| `Rejected` | Considered but not adopted (keep for historical record) |
| `Deprecated` | Was accepted, but the context has changed and the decision no longer applies |
| `Superseded` | Replaced by a newer ADR (always link to the superseding ADR) |

**Never delete an ADR.** Rejected and deprecated records are as valuable as accepted ones — they explain paths not taken.

---

## Decision Categories

Tag each ADR with one or more categories to make the index scannable:

| Tag | Scope |
|-----|-------|
| `org` | Organization-wide patterns and standards |
| `product` | Product boundary or creation decisions |
| `initiative` | Routing of a specific initiative to a product |
| `infra` | Shared infrastructure choices |
| `service` | Individual microservice decisions |
| `ui` | Web UI architectural decisions |
| `data` | Data model, storage, or migration decisions |
| `integration` | Cross-service or external integration patterns |
| `security` | IAM, credential management, network policies |

---

## When to Write an ADR

Write an ADR whenever:

- A **new product** is being created (captures why it exists as a separate domain)
- An **initiative** is routed to an existing product (or rejected from one)
- A **cross-cutting standard** is adopted (e.g., "all services use OpenTelemetry")
- A **technology choice** is made that affects multiple repos
- A **pattern** is established or overridden for a specific product
- A **significant trade-off** was evaluated (even if the outcome seems obvious)

Do NOT write an ADR for:

- Routine scaffolding tasks that follow established patterns
- Implementation details within a single service
- Tooling preferences with no architectural impact

---

## Index

| ADR | Title | Status | Categories | Date |
|-----|-------|--------|------------|------|
| — | _No decisions recorded yet_ | — | — | — |

> Keep this index up to date. Add a row every time a new ADR is created or its status changes.

---

## Process

### Creating a new ADR

1. Copy `template.md` to `adr/NNNN-short-title.md` (use the next available number)
2. Fill in all sections — leave none blank; write "N/A" only if genuinely not applicable
3. Set status to `Proposed`
4. Open a PR for review
5. Once agreed, update status to `Accepted` (or `Rejected`) and merge
6. Add the ADR to the index table above

### Superseding an existing ADR

1. Create a new ADR with status `Proposed`
2. In the new ADR's **Supersedes** field, reference the old ADR number
3. After merging, edit the old ADR's status line only to `Superseded by ADR-NNNN` (this is the sole exception to the immutability rule — only the status line changes)

### Reviewing ADRs

ADRs should be reviewed during:
- Initiative intake sessions
- Product boundary reviews
- Quarterly architecture reviews

---

## Good Practices

- **Write for your future self** — assume the reader has no context from the time of the decision
- **Capture rejected options** — explaining why option B was not chosen is as important as explaining why option A was
- **Be specific about consequences** — list both positive and negative consequences; honesty builds trust in the record
- **Link liberally** — reference related ADRs, product repos, design docs, and Jira tickets
- **One voice** — the ADR records the team's decision, not an individual's opinion; avoid "I think"
- **Keep titles in imperative form** — "Adopt X", "Create product Y", "Route initiative Z to product W"
