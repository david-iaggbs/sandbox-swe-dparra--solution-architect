# Solution Architect Sandbox — Claude Context

## Repository Purpose

Solution architect sandbox for designing and scaffolding ECS Fargate full-stack solutions.
This repo holds planning artifacts. Actual service repos are siblings under `/Users/david/Workspaces/david-iaggbs/`.

## Technology Stack

- **Backend**: Spring Boot 3.2.1, Java 21, Maven, AWS CDK Java
- **Frontend**: Astro 5 SSR, Node.js 20, TypeScript, Vitest
- **Infrastructure**: AWS ECS Fargate, ALB, EventBridge, SQS, RDS PostgreSQL, DynamoDB, SSM Parameter Store
- **AWS Region**: eu-west-1
- **AWS Profile**: sandbox-swe-dparra-admin

## Template Repositories

- Backend service: https://github.com/david-iaggbs/sandbox-swe-dparra--spring-cloud-service
- Web UI: https://github.com/david-iaggbs/sandbox-swe-dparra--astro-webui
- Workspace root for new services: `/Users/david/Workspaces/david-iaggbs/`

## Architecture Constraints

### Allowed AWS Services

| Category | Services |
|----------|---------|
| Compute | ECS Fargate only (no Lambda, no EC2) |
| Database | RDS PostgreSQL, DynamoDB |
| Config | AppConfig (backend), SSM Parameter Store (all), Secrets Manager (credentials) |
| Messaging | EventBridge + SQS (async backend-to-backend only) |
| Networking | VPC, ALB (path-based routing), Security Groups |
| Storage | ECR, CloudWatch Logs |
| Observability | CloudWatch + OpenTelemetry |

### Forbidden Patterns

- No direct HTTP calls between backend services (use EventBridge → SQS)
- No shared databases (database-per-service)
- No Lambda, no API Gateway
- No hardcoded credentials (use Secrets Manager / SSM)
- No wildcard IAM permissions

### Inter-Service Communication

**Backend-to-backend**: EventBridge Bus → EventBridge Rule → SQS Queue → `@SqsListener`
**UI-to-backend**: Browser → Astro BFF API route → HTTP with retry → Backend REST API

## Branch Naming Convention

| Prefix | Use case |
|--------|----------|
| `feat/[jira-id]-[description]` | New functionality |
| `fix/[jira-id]-[description]` | Bug fix |
| `hotfix/[jira-id]-[description]` | Production hotfix |

Default Jira task when unspecified: **ITL-5671**

## Jira Defaults

- Project: IB - SwE
- Epic: ITL-5673
- Task: ITL-5671

## Epic Evaluation — Issue Creation Rules

When evaluating an epic, Claude must create issues in component repos using `gh issue create`. The body of every issue must follow the corresponding template in `templates/issues/`:

| Component repo | Template | Label |
|----------------|----------|-------|
| `{product}--design` | `templates/issues/design.yml` | `specification` |
| `{product}--infra` | `templates/issues/infra.yml` | `infrastructure`, `cdk` |
| `{product}--{service}--service` | `templates/issues/service.yml` | `task` |
| `{product}--{ui}--ui` | `templates/issues/ui.yml` | `task` |

### Required fields in every created issue

Every issue must populate — at minimum — these fields from the template:
- **Originating Epic**: full URL to the epic issue in this repo
- **Initiative**: name of the GitHub Project
- **Context**: why the change is needed, derived from the epic description
- **Technical Specification**: concrete implementation detail — never left vague
- **Acceptance Criteria**: at least 3 verifiable, checkable conditions

### gh issue create command pattern

```bash
gh issue create \
  --repo "david-iaggbs/{target-repo}" \
  --title "[SPEC|INFRA|SERVICE|UI] <concise imperative title>" \
  --label "<label>" \
  --body "$(cat <<'EOF'
## Originating Epic
<url>

## Initiative
<name>

## Context
<why>

## Technical Specification
<spec>

## Acceptance Criteria
- [ ] ...
- [ ] ...

## Related
- Epic: <url>
EOF
)"
```

After creating all issues, post a summary comment on the epic issue listing every created issue with its URL and type.

## Available Skills

| Skill | Invocation | Purpose |
|-------|-----------|---------|
| `decompose-usecase` | `/decompose-usecase [use case]` | Analyze a use case → full architecture plan |
| `scaffold-design` | `/scaffold-design scaffold <product-name>` | Scaffold arc42 + C4 + ADR + draw.io design repo for a product |
| `scaffold-design` | `/scaffold-design new-adr <title> [--repo <product>]` | Create a new ADR in an existing design repo |
| `scaffold-design` | `/scaffold-design update-section <03-12> [--adr <NNNN>] [--repo <product>]` | Update an arc42 section as the design evolves |
| `scaffold-infra` | `/scaffold-infra [project-name]` | Scaffold Terraform ECS Fargate infra repo (VPC, IAM, ALB, ECS, EventBridge) |
| `scaffold-microservice` | `/scaffold-microservice [spec]` | Scaffold Spring Boot service + CDK |
| `scaffold-webui` | `/scaffold-webui [spec]` | Scaffold Astro SSR UI + CDK |

## Design Repo Scaffolding Rule

Whenever a new product is created or an existing product's architecture needs to be documented or evolved, run the `scaffold-design` skill:

```bash
# New product — create the design repo
/scaffold-design scaffold <product-name>

# Capture a decision — add an ADR
/scaffold-design new-adr "<decision title>" --repo <product-name>

# Evolve the documentation after a decision is accepted
/scaffold-design update-section <03-12> --adr <NNNN> --repo <product-name>
```

This creates or updates `david-iaggbs/sandbox-swe-dparra--<product-name>--design` with arc42 sections, C4 diagrams (draw.io), and an ADR log. The product is also registered in the solution-architect registry.

## Infra Repo Scaffolding Rule

Whenever a new `--infra` repository is needed (e.g. a new product is registered or an epic requires a new product domain), run the `scaffold-infra` skill automatically:

```bash
/scaffold-infra <product-name>
```

This creates `david-iaggbs/sandbox-swe-dparra--terraform-<product-name>--infra` with all standard Terraform modules (VPC, IAM, ALB, ECS, EventBridge) wired together.
