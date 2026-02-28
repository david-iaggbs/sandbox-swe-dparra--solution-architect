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

## Available Skills

| Skill | Invocation | Purpose |
|-------|-----------|---------|
| `decompose-usecase` | `/decompose-usecase [use case]` | Analyze a use case → full architecture plan |
| `scaffold-microservice` | `/scaffold-microservice [spec]` | Scaffold Spring Boot service + CDK |
| `scaffold-webui` | `/scaffold-webui [spec]` | Scaffold Astro SSR UI + CDK |
