# Issue Templates for Component Repositories

This directory contains the canonical GitHub issue templates for every component repository type in the `david-iaggbs` organization. Each template defines the standard structure for technical tasks created during epic evaluation.

## Templates

| File | Used in | Purpose |
|------|---------|---------|
| `design.yml` | `{product}--design` repos | Architectural specifications: endpoint specs, event contracts, UI design, data models |
| `infra.yml` | `{product}--infra` repos | CDK infrastructure changes: new resources, modifications, security updates |
| `service.yml` | `{product}--{service}--service` repos | Microservice changes: new endpoints, event producers/consumers, entity changes |
| `ui.yml` | `{product}--{ui}--ui` repos | Web UI changes: new pages, BFF routes, component and config changes |

## How Templates Are Used

**When scaffolding a new component repo**, copy the appropriate template to the new repo's `.github/ISSUE_TEMPLATE/` directory. The `scaffold-microservice` and `scaffold-webui` skills do this automatically.

**When Claude creates issues during epic evaluation**, it uses these templates as the body format for every `gh issue create` call targeting a component repo. The fields map directly to what the component team needs to begin implementation without additional clarification.

## Placement in Component Repos

```
{component-repo}/
└── .github/
    └── ISSUE_TEMPLATE/
        └── task.yml    ← copy the appropriate template here
```

## Fields Common to All Templates

Every template shares these fields:

| Field | Purpose |
|-------|---------|
| **Epic** | Link to the originating epic issue in `sandbox-swe-dparra--solution-architect` |
| **Initiative** | Name of the GitHub Project this work belongs to |
| **Context** | Why this task exists — the business need driving it |
| **Acceptance Criteria** | Verifiable conditions that must be true for the issue to be closed |
| **Related** | Links to design specs, ADRs, dependent issues in other repos |
