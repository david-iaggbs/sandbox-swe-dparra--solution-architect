# sandbox-swe-dparra--solution-architect

Sandbox repository for solution architect tasks and experiments with ECS Fargate full-stack solutions.

## Available Skills

| Skill | Invocation | Purpose |
|-------|-----------|---------|
| `decompose-usecase` | `/decompose-usecase <use case description>` | Analyze a use case → full microservice architecture plan |
| `scaffold-microservice` | `/scaffold-microservice <service spec>` | Scaffold Spring Boot service + CDK infrastructure |
| `scaffold-webui` | `/scaffold-webui <ui spec>` | Scaffold Astro SSR web UI + CDK infrastructure |

### Quick Start

```bash
# Analyze a use case
claude /decompose-usecase "e-commerce platform with orders, inventory, and payments"

# Scaffold a backend service
claude /scaffold-microservice "order-service: manages customer orders with OrderEntity, expose REST CRUD, publish OrderCreated event, consume PaymentProcessed from payment-service"

# Scaffold a web UI
claude /scaffold-webui "order-portal-ui: customer-facing UI with pages for product listing and order management, proxying order-service and product-service"
```

## Required Tools

| Tool | Install | Required by |
|------|---------|-------------|
| [Claude Code CLI](https://claude.ai/claude-code) | `npm install -g @anthropic-ai/claude-code` | All skills |
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
