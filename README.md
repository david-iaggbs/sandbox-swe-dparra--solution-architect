# sandbox-swe-dparra--solution-architect

Central solution architect workspace for the `david-iaggbs` organization. This repository serves as:

- **Product registry** — catalog of all products and their repositories
- **Initiative intake** — entry point for analyzing new business initiatives
- **Design hub** — architectural decisions and decomposition plans before any code is written

## How It Works

When a new initiative arrives, the solution architect:

1. **Evaluates fit** — checks the product registry to determine whether the functionality belongs to an existing product or requires a new one
2. **Decomposes** — runs `/decompose-usecase` to produce a full architecture plan (services, events, UI components)
3. **Delegates** — new repos are scaffolded under the right product using `/scaffold-microservice` or `/scaffold-webui`

---

## Product Registry

Each product groups related repositories under a shared domain. Naming convention:

| Repo type | Pattern | Purpose |
|-----------|---------|---------|
| Infrastructure | `sandbox-swe-dparra--{product}--infra` | Shared VPC, ECS Cluster, ALB, EventBridge bus |
| Design | `sandbox-swe-dparra--{product}--design` | Architecture plans, ADRs, API contracts |
| Service | `sandbox-swe-dparra--{product}--{service}--service` | Spring Boot microservice |
| Web UI | `sandbox-swe-dparra--{product}--{ui}--ui` | Astro SSR web UI |

### Registered Products

| Product | Domain | Infra | Design | Services | UIs |
|---------|--------|-------|--------|----------|-----|
| `booking` | Online booking and availability management | [infra](https://github.com/david-iaggbs/sandbox-swe-dparra--booking--infra) | [design](https://github.com/david-iaggbs/sandbox-swe-dparra--booking--design) | [availability-service](https://github.com/david-iaggbs/sandbox-swe-dparra--booking--availability--service) | — |

> To register a new product, add a row to this table and create the `--infra` and `--design` repos first.

---

## Initiative Evaluation Process

When a new initiative is proposed, answer these questions in order:

1. **Domain fit** — Does the functionality belong to the bounded context of an existing product?
   - Yes → add services/UIs to that product
   - No → create a new product entry

2. **Service fit** — Does the functionality extend an existing service or require a new one?
   - Extends existing → submit a design change to the product's `--design` repo
   - New service → run `/scaffold-microservice` under the product

3. **UI fit** — Does the user interaction belong to an existing UI or require a new one?
   - Extends existing → update the relevant `--ui` repo
   - New UI → run `/scaffold-webui` under the product

4. **Infrastructure impact** — Does the initiative require new shared infrastructure (new event bus, new ALB, new VPC)?
   - Yes → update the product's `--infra` repo via CDK

### Decision Log

| Date | Initiative | Decision | Rationale |
|------|-----------|----------|-----------|
| — | — | — | — |

---

## Available Skills

| Skill | Invocation | Purpose |
|-------|-----------|---------|
| `decompose-usecase` | `/decompose-usecase <use case>` | Analyze a use case → full architecture plan |
| `scaffold-microservice` | `/scaffold-microservice <spec>` | Scaffold Spring Boot service + CDK under a product |
| `scaffold-webui` | `/scaffold-webui <spec>` | Scaffold Astro SSR web UI + CDK under a product |

### Example Workflow

```bash
# 1. A new initiative arrives: "add a reservation checkout flow to booking"
# 2. Check registry → fits the existing "booking" product
# 3. Decompose to identify what's needed
claude /decompose-usecase "checkout flow for the booking product: users select availability slots, confirm reservation, receive confirmation"

# 4. Scaffold the new service under the booking product
claude /scaffold-microservice "reservation-service under david-iaggbs/sandbox-swe-dparra--booking: manages confirmed reservations, expose REST CRUD, publish ReservationConfirmed event, consume SlotReserved from availability-service"

# 5. Scaffold the UI
claude /scaffold-webui "booking-portal-ui under david-iaggbs/sandbox-swe-dparra--booking: customer-facing checkout UI, pages for slot selection and reservation confirmation, proxying availability-service and reservation-service"
```

---

## Required Tools

| Tool | Install | Required by |
|------|---------|-------------|
| [Claude Code CLI](https://claude.ai/claude-code) | `npm install -g @anthropic-ai/claude-code` | All skills |
| GitHub CLI | `brew install gh` | Repo creation, PR management |
| AWS CLI v2 | `brew install awscli` | `scaffold-microservice`, `scaffold-webui` |
| AWS CDK CLI | `npm install -g aws-cdk` | `scaffold-microservice`, `scaffold-webui` |
| Docker Desktop | [docker.com](https://www.docker.com/products/docker-desktop/) | `scaffold-microservice` (Testcontainers) |
| Java 21 (Corretto) | `brew install --cask corretto21` | `scaffold-microservice` |
| Maven 3.9+ | `brew install maven` | `scaffold-microservice` |
| Node.js 20 | `brew install node@20` | `scaffold-webui` |

## Required Environment Variables

| Variable | Purpose | Where to set |
|----------|---------|-------------|
| `AWS_PROFILE` | AWS credentials profile (`sandbox-swe-dparra-admin`) | `~/.aws/config` |

## One-Time Setup

```bash
# Configure AWS CLI with the sandbox profile
aws configure --profile sandbox-swe-dparra-admin

# Authenticate GitHub CLI
gh auth login

# Verify Docker is running
docker info
```
