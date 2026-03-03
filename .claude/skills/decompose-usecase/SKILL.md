---
name: decompose-usecase
description: Analyze a use case and produce a comprehensive microservice decomposition plan for an ECS Fargate solution including backend services and web UI components (analysis only, no code generation)
---

You are a cloud architect specializing in full-stack ECS Fargate solutions on AWS.

Produce a comprehensive microservice decomposition plan with **backend services** and **web UI components** — analysis only, no code generation.

## Analysis Process

Parse the use case and identify:
1. **Business Domains / Bounded Contexts** — logical separation of concerns
2. **Core Entities** — domain models and their relationships
3. **Key User Workflows** — end-to-end user journeys requiring UI interaction
4. **Data Ownership Boundaries** — which service owns which data
5. **UI Views & Pages** — screens, forms, and user interactions needed
6. **API Surface** — what backend endpoints the UI will consume
7. **Service Complexity** — for each bounded context, classify as CRUD or rich-domain (see below)

## Service Type Classification

For every backend service in the decomposition, you **must** classify it as one of two types before defining its details. Choose based on domain complexity:

### CRUD Microservice (`scaffold-crud-microservice`)

Use when the bounded context is **data-centric with simple lifecycle**:
- Entities have no meaningful state machine — status changes are trivial or absent
- Business rules are limited to validation (non-null, format, uniqueness)
- No cross-entity invariants that must be enforced in code
- Operations are dominated by create/read/update/delete with no complex orchestration
- No domain events produced as a result of business decisions
- Examples: product catalog, user profiles, reference data, configuration, tags, categories

Technical characteristics:
- Layered architecture: `controller → service → repository`
- JPA entities with Spring Data repositories
- `@Transactional` on service methods
- Template: `scaffold-crud-microservice`

### Rich-Domain Microservice (`scaffold-rich-domain-microservice`)

Use when the bounded context has **complex business rules and meaningful domain behaviour**:
- Entities have a lifecycle with meaningful status transitions (e.g., `CONFIRMED → CANCELLED`)
- Domain invariants must be enforced (e.g., no double-booking, capacity limits, blackout dates)
- Business logic cannot be expressed as simple CRUD — it requires domain decisions
- Multiple value objects capturing domain concepts (e.g., `TimeSlot`, `Money`, `Address`)
- Domain events are produced as outcomes of business operations
- Side effects (audit, notifications) exist but are optional / decoupled
- Examples: booking/reservation, order management, payment processing, inventory allocation, workflow approval

Technical characteristics:
- Hexagonal architecture: pure domain layer → application ports → adapters
- Aggregate roots with `create()`/`reconstitute()` factory methods
- Sealed `DomainEvent` interface with record implementations
- Inbound/outbound port interfaces separating domain from infrastructure
- HATEOAS API exposing state-driven hypermedia links
- AppConfig hot-reload for domain configuration (e.g., business rules, thresholds)
- DynamoDB audit log built-in
- RDS PostgreSQL provisioned via CDK (not just docker-compose)
- Template: `scaffold-rich-domain-microservice`

### Classification Decision Table

| Signal | CRUD | Rich-Domain |
|--------|------|-------------|
| Status enum with business meaning | — | ✓ |
| Business rules enforced in code | — | ✓ |
| Value objects (Money, TimeSlot, Address) | — | ✓ |
| Domain events produced | — | ✓ |
| Audit trail required | — | ✓ |
| HATEOAS state-driven links | — | ✓ |
| Primarily read-heavy reference data | ✓ | — |
| Simple CRUD with validation only | ✓ | — |
| No lifecycle / status changes | ✓ | — |

When in doubt, prefer **CRUD** for supporting services and **rich-domain** for the core business capability of the product.

---

## Backend Services Definition

For each proposed backend service, first state its **type** (CRUD or rich-domain), then define:

### Fields common to both types

- **Service Name**: `{domain}-service` (e.g., `order-service`, `inventory-service`)
- **Type**: `CRUD` | `rich-domain`
- **Bounded Context**: Clear business domain responsibility
- **REST Endpoints**: Full CRUD operations
  - `GET /api/v1/{resource}` — list/search with pagination
  - `GET /api/v1/{resource}/{id}` — retrieve single resource
  - `POST /api/v1/{resource}` — create new resource
  - `PUT /api/v1/{resource}/{id}` — update existing resource
  - `DELETE /api/v1/{resource}/{id}` — delete resource
- **EventBridge Events Produced**:
  - detail-type (e.g., `"OrderCreated"`, `"PaymentProcessed"`)
  - payload schema (JSON structure)
  - when/why the event is published
- **SQS Events Consumed**:
  - From which service (event source)
  - Queue name pattern: `{consumer-service}-{event-type}-queue`
  - Handler logic description
- **AWS Services Needed**: Only from allowed list (see constraints below)
- **ALB Configuration**:
  - Path patterns: `/api/v1/{resource}/*` (CRUD) or `/api/v1/{resource}/*`, `/api/hateoas/v1/{resource}/*`, `/swagger-ui*`, `/actuator/*`, `/sse` (rich-domain)
  - Priority (100, 200, 300, etc. — increment by 100 per service)
  - Health check endpoint: `/actuator/health`
- **Database Schema**: Tables, indexes, foreign keys (PostgreSQL or DynamoDB)

### Additional fields for CRUD services

- **JPA Entities**: Domain models with key fields, relationships, validation rules
- **Spring Data Repositories**: method signatures for custom queries
- **Service Layer**: `@Service @Transactional` methods

### Additional fields for rich-domain services

- **Aggregate Root(s)**: Name, factory methods (`create` / `reconstitute`), business methods and the invariants they enforce
- **Value Objects**: Name, fields, validation rules in compact constructor
- **Domain Events** (sealed interface): each event record with fields and when it is published
- **Domain Exceptions**: each exception, the invariant it represents, HTTP status it maps to
- **Inbound Ports** (use-case interfaces): method signatures
- **Outbound Ports**: repository, event publisher, audit logger, notification sender interfaces
- **AppConfig**: JSON schema for hot-reload domain configuration (e.g., business rules thresholds)
- **DynamoDB Audit Log**: PK/SK pattern for the audit table

## Web UI Components Definition

For each proposed web UI, define:
- **UI Name**: `{purpose}-ui` (e.g., `customer-portal-ui`, `admin-dashboard-ui`)
- **Purpose**: Target user persona and primary use cases
- **Pages/Views**: List of screens with descriptions
  - Page route (e.g., `/`, `/orders`, `/orders/:id`)
  - Purpose and content
  - Key user actions (buttons, forms, links)
- **BFF API Routes**: Server-side API routes that proxy to backend services
  - Route pattern (e.g., `/api/orders`, `/api/products/:id`)
  - Backend service target (which microservice)
  - HTTP method (GET, POST, PUT, DELETE)
  - Request/response transformation logic (if any)
- **Configuration Needs**: SSM parameters required
  - `/{ui-service}/api.backend.url` — backend service URLs (one per backend dependency)
  - `/{ui-service}/api.timeout.ms` — request timeout
  - `/{ui-service}/api.retry.count` — retry attempts
  - `/{ui-service}/log.level` — logging level (debug, info, warn, error)
  - `/{ui-service}/rate.limit.rpm` — rate limiting
- **Technology Stack**:
  - Astro 5 with SSR (Node.js standalone adapter)
  - TypeScript for type safety
  - Node.js 20-alpine container
  - Pino structured logging with OpenTelemetry correlation
- **Observability**:
  - OpenTelemetry distributed tracing (aligned with backend services)
  - Structured JSON logging to CloudWatch
  - Health check endpoint: `/api/health`
- **Infrastructure (CDK)**:
  - ECR Repository for container images
  - CloudWatch Log Group with 30-day retention
  - IAM Roles (task execution + task role with SSM permissions)
  - Security Group (allows inbound from VPC on port 4321)
  - ALB Target Group (health check on `/api/health`)
  - ALB Listener Rule (path pattern and priority)
  - ECS Task Definition (Fargate, 256 CPU, 512 MiB memory)
  - ECS Service (Fargate with public IP)
  - SSM Parameters for runtime configuration
- **Resilience Patterns**:
  - Retry with exponential backoff on backend calls
  - Circuit breaker for backend dependencies
  - Graceful degradation strategies
  - Error boundary handling

## Event Flow Definition

For each event between services, define:
- **Source Service**: Which service publishes the event
- **Detail-Type**: EventBridge event type (e.g., `"OrderCreated"`)
- **Shared Bus**: EventBridge bus name (usually `default` or custom shared bus)
- **Target Queue**: SQS queue name owned by consuming service
- **Payload Schema**: JSON structure with all fields
- **Consumer Service**: Which service processes the event
- **Processing Logic**: High-level description of what happens when event is consumed

## Output Structure

Your analysis must include these sections:

### 1. Architecture Overview
- **ASCII Diagram** showing:
  - Web UI components (Astro SSR apps)
  - Backend microservices (Spring Boot apps)
  - Shared infrastructure (VPC, ECS Cluster, ALB, EventBridge Bus)
  - Data stores (RDS PostgreSQL, DynamoDB)
  - Event flows (EventBridge → SQS → Service)
  - User interaction flows (Browser → UI → BFF → Backend Services)
- **Narrative Description**: 2-3 paragraphs explaining the architecture, key design decisions, and how components interact

### 2. Service Catalog

**Backend Services Table:**

| Service Name | Type | Bounded Context | Aggregate / Entities | REST Endpoints | Events Published | Events Consumed | AWS Services | ALB Priority | Database |
|--------------|------|-----------------|----------------------|----------------|------------------|-----------------|--------------|--------------|----------|
| order-service | rich-domain | Order Management | `Order` aggregate (CONFIRMED→CANCELLED), `OrderItem` VO | /api/v1/orders/*, /api/hateoas/v1/orders/* | OrderCreated, OrderUpdated | PaymentProcessed | RDS, SQS, EventBridge, AppConfig, DynamoDB | 100 | PostgreSQL + DynamoDB audit |
| product-service | CRUD | Product Catalog | `Product`, `Category` entities | /api/v1/products/* | — | — | RDS, SSM | 200 | PostgreSQL |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |

For each **rich-domain** service, also include a domain detail block immediately below the table:

```
Order Service — Domain Detail
  Aggregate:      Order (status: CONFIRMED | CANCELLED)
  Value Objects:  OrderItem(productId, quantity, unitPrice), Money(amount, currency)
  Domain Events:  OrderConfirmed, OrderCancelled (sealed DomainEvent interface)
  Invariants:     - total items must be > 0
                  - cancellation only allowed within freeCancellationHours
                  - duplicate product not allowed in same order
  AppConfig:      { "freeCancellationHours": 24, "maxItemsPerOrder": 50 }
  Audit Log PK:   ORDER#{id}, SK: ACTION#{timestamp}
```

**Web UI Components Table:**

| UI Name | Purpose | Pages | Backend Dependencies | ALB Priority | Port | SSM Parameters |
|---------|---------|-------|---------------------|--------------|------|----------------|
| customer-portal-ui | Customer-facing storefront | /, /products, /cart, /checkout | product-service, order-service, payment-service | 50 | 4321 | 5 parameters |
| admin-dashboard-ui | Internal admin operations | /, /orders, /inventory, /users | order-service, inventory-service, user-service | 75 | 4321 | 6 parameters |
| ... | ... | ... | ... | ... | ... | ... |

### 3. Event Flow Sequences

For each main workflow, provide:
- **Workflow Name** (e.g., "Customer Places Order")
- **Step-by-step sequence**:
  ```
  1. User submits order via customer-portal-ui (/api/orders POST)
  2. customer-portal-ui BFF proxies to order-service REST API
  3. order-service creates Order entity, saves to PostgreSQL
  4. order-service publishes OrderCreated event to EventBridge
  5. EventBridge routes event to payment-service-order-queue (SQS)
  6. payment-service consumes event via @SqsListener
  7. payment-service processes payment, publishes PaymentProcessed event
  8. EventBridge routes to order-service-payment-queue
  9. order-service updates order status, notifies customer via UI polling/SSE
  ```
- **Data Flow**: What data moves between components
- **Error Scenarios**: What happens if a step fails

### 4. Repository Plan

One git repository per component (backend service + web UI), each following the appropriate template.

**CRUD Backend Services** (template: https://github.com/david-iaggbs/sandbox-swe-dparra--spring-cloud-service, skill: `scaffold-crud-microservice`):
- Repository: `sandbox-swe-dparra--{product}--{service}--service`
- Scaffold command: `/scaffold-crud-microservice <service-name> [spec]`
- Structure:
  - `app/` — Spring Boot 3.2.1, Java 21, layered architecture (controller → service → repository)
  - `cdk/` — AWS CDK Java (ECS Fargate, SSM, IAM, Security Groups, ALB routing, optionally SQS+DynamoDB)
  - `docker-compose.yml` — LocalStack, PostgreSQL, Jaeger
  - `deploy-*.sh` scripts

**Rich-Domain Backend Services** (template: https://github.com/david-iaggbs/sandbox-swe-dparra--business--spring-cloud-service, skill: `scaffold-rich-domain-microservice`):
- Repository: `sandbox-swe-dparra--{product}--{service}--service`
- Scaffold command: `/scaffold-rich-domain-microservice <service-name> <domain-name> <entity-name>`
- Structure:
  - `app/` — Spring Boot 3.2.1, Java 21, hexagonal architecture (domain → ports → adapters)
    - `domain/` — pure domain layer (no framework imports): aggregate roots, value objects, domain events, domain services, inbound/outbound ports
    - `application/` — use-case application services (`@Transactional`), lifecycle hooks
    - `adapter/` — REST + HATEOAS inbound, JPA + DynamoDB + SQS + AppConfig outbound
  - `cdk/` — AWS CDK Java (ECS Fargate, RDS PostgreSQL, AppConfig, DynamoDB audit, EventBridge→SQS, IAM, ALB)
  - `docker-compose.yml` — LocalStack, PostgreSQL, Jaeger
  - `deploy-*.sh` scripts

**Web UI Components** (template: https://github.com/david-iaggbs/sandbox-swe-dparra--astro-webui):
- Repository: `{ui-name}` (e.g., `customer-portal-ui`)
- Structure:
  - `app/` — Astro 5 SSR, Node.js 20, TypeScript, BFF API routes, OpenTelemetry, Pino logging
  - `cdk/` — AWS CDK Java (ECS Fargate, ECR, CloudWatch, IAM, Security Groups, ALB routing, SSM parameters)
  - `docker-compose.yml` — LocalStack, Jaeger
  - `deploy-*.sh` scripts

### 5. UI-Backend Integration Map

For each web UI, document backend service dependencies:

**customer-portal-ui → Backend Services:**
- `product-service`:
  - GET /api/v1/products (list products with pagination, filtering)
  - GET /api/v1/products/{id} (product details)
- `order-service`:
  - POST /api/v1/orders (create new order)
  - GET /api/v1/orders (list user orders)
  - GET /api/v1/orders/{id} (order details)
- `payment-service`:
  - POST /api/v1/payments (initiate payment)
  - GET /api/v1/payments/{id} (payment status)

**BFF Proxy Pattern:**
- UI makes requests to local BFF routes: `fetch('/api/products')`
- BFF API route (in `app/src/pages/api/products.ts`) proxies to backend
- Backend URL read from SSM: `/{ui-service}/api.backend.url`
- Retry logic, timeout, error handling in BFF layer
- Response transformation if needed (e.g., API v2 → UI model)

### 6. ALB Routing Strategy

ALB Listener Rules priority allocation (lower number = higher priority):

| Priority | Path Pattern(s) | Target | Type | Port |
|----------|----------------|--------|------|------|
| 50 | `/*` | customer-portal-ui | Web UI | 4321 |
| 75 | `/admin/*` | admin-dashboard-ui | Web UI | 4321 |
| 100 | `/api/v1/orders/*`, `/api/hateoas/v1/orders/*`, `/swagger-ui*`, `/actuator/*`, `/sse` | order-service | rich-domain backend | 8080 |
| 200 | `/api/v1/products/*`, `/actuator/*` | product-service | CRUD backend | 8080 |
| 300 | `/api/v1/payments/*`, `/api/hateoas/v1/payments/*`, `/swagger-ui*`, `/actuator/*`, `/sse` | payment-service | rich-domain backend | 8080 |
| 400 | `/api/v1/inventory/*`, `/actuator/*` | inventory-service | CRUD backend | 8080 |

**Routing rules:**
- Web UIs get lower priority numbers (50–99) for catch-all routes
- Backend API services get higher numbers (100+) for specific API paths
- **Rich-domain services** include `/api/hateoas/v1/*`, `/swagger-ui*`, `/sse` (MCP SSE transport) in addition to the standard REST path
- **CRUD services** include only `/api/v1/*` and `/actuator/*`
- UI BFF routes internally proxy to backend services via private URLs

### 7. Configuration Management

**CRUD services** (via SSM Parameter Store):
- `/{service}/spring.datasource.url` — RDS connection string
- `/{service}/spring.datasource.password` — Secrets Manager ARN
- `/{service}/aws.sqs.queue.url` — SQS queue URL (if event consumer)

**Rich-domain services** (via AppConfig hot-reload + SSM Parameter Store):
- `/{service}/spring.datasource.url` — RDS connection string
- `/{service}/db/credentials` — Secrets Manager (username + password)
- `/{service}/aws.sqs.queue.url` + `/{service}/aws.sqs.queue.name` — SQS (if consumer)
- AppConfig hosted profile — domain configuration JSON (hot-reloaded without restart):
  ```json
  { "<businessRule>": <value>, "<threshold>": <value>, ... }
  ```
  Example for booking: `{ "freeCancellationHours": 24, "feePercentage": 50, "maxAdvanceBookingDays": 90 }`

**Per Web UI** (via SSM Parameter Store):
- `/{ui-service}/app.description` — UI description/tagline
- `/{ui-service}/api.backend.url` — Backend service base URLs (JSON object: `{"products": "http://...", "orders": "http://..."}`)
- `/{ui-service}/api.timeout.ms` — Request timeout (default: 5000)
- `/{ui-service}/api.retry.count` — Retry attempts (default: 3)
- `/{ui-service}/log.level` — Log level (default: info)
- `/{ui-service}/rate.limit.rpm` — Rate limit (default: 60)

### 8. Open Questions

Flag any ambiguities or decisions that need clarification:
- Business logic uncertainties
- Unclear data ownership boundaries
- Missing use case details
- Integration points requiring design decisions
- Security/compliance requirements
- Performance/scalability targets
- User authentication/authorization strategy (SSO, OAuth, etc.)
- Session management approach (stateless JWT, server-side sessions, etc.)

---

## Architecture Constraints

### Allowed AWS Services (Only These)

**Compute:**
- ECS Fargate (no EC2, no Lambda)

**Database:**
- RDS PostgreSQL (relational data, ACID transactions)
- DynamoDB (NoSQL for audit logs, event sourcing, high-throughput use cases)

**Configuration:**
- AppConfig (dynamic/hot-reload feature flags for backend services)
- Parameter Store (static configuration for all services)
- Secrets Manager (database credentials, API keys)

**Messaging:**
- EventBridge (shared event bus for async communication)
- SQS (queue consumer with DLQ for dead letters)

**Networking:**
- VPC (shared across all services)
- ALB (shared Application Load Balancer with path-based routing)
- Security Groups (per-service isolation)

**Storage:**
- ECR (container images for both backend and UI)
- CloudWatch Logs (structured logging from all services)

**Observability:**
- CloudWatch Logs (centralized logging)
- OpenTelemetry (distributed tracing, aligned across backend + UI)

### Forbidden Patterns

- No direct HTTP calls between backend services — use EventBridge events for inter-service communication
- No shared databases — each backend service owns its data (database-per-service pattern)
- No Lambda functions — all compute on ECS Fargate (both backend and UI)
- No API Gateway — use ALB with path-based routing
- No hardcoded credentials — always use Secrets Manager
- No wildcard IAM permissions — always resource-specific ARNs
- No synchronous cross-service calls — async event-driven only (except UI → Backend via BFF)

### Inter-Service Communication Pattern

**Backend-to-Backend (Async Only):**
```
Service A (producer)
  → EventBridge Bus (shared)
  → EventBridge Rule (filters by detail-type)
  → SQS Queue (owned by Service B, with DLQ)
  → Service B (@SqsListener handler)
```

**UI-to-Backend (Sync via BFF):**
```
Browser
  → UI BFF Route (/api/products)
  → Astro SSR server-side handler
  → HTTP call to Backend Service (with retry/timeout)
  → Backend REST API
  → Response (transformed if needed)
  → Browser
```

### Repository Structure Templates

**CRUD Backend Service** (`scaffold-crud-microservice`):
```
{service-name}/
├── app/
│   ├── src/main/java/
│   │   ├── controller/         # REST controllers + GlobalExceptionHandler
│   │   ├── service/            # @Service @Transactional business logic
│   │   ├── repository/         # Spring Data JPA repositories
│   │   ├── model/              # JPA @Entity classes
│   │   ├── dto/                # Request/response records
│   │   ├── config/             # AppConfig, DynamoDB, OpenAPI config
│   │   └── event/              # @SqsListener event handler
│   ├── src/main/resources/
│   │   ├── application.yml     # Spring Boot config (all profiles)
│   │   └── db/migration/       # Flyway migrations
│   ├── src/test/java/          # Unit + integration tests (Testcontainers)
│   ├── Containerfile
│   └── pom.xml
├── cdk/                        # CDK stack (SSM, IAM, SG, ALB, ECS)
├── docker-compose.yml          # LocalStack + PostgreSQL + Jaeger
├── deploy-*.sh / destroy-infra.sh
└── README.md
```

**Rich-Domain Backend Service** (`scaffold-rich-domain-microservice`):
```
{service-name}/
├── app/
│   ├── src/main/java/
│   │   ├── domain/
│   │   │   ├── model/          # Aggregate roots, value objects (records), enums
│   │   │   ├── event/          # Sealed DomainEvent interface + event records
│   │   │   ├── exception/      # Domain rule violation exceptions
│   │   │   ├── service/        # Pure domain services (no framework imports)
│   │   │   └── port/
│   │   │       ├── inbound/    # Use-case interfaces
│   │   │       └── outbound/   # Repository, EventPublisher, AuditLogger ports
│   │   ├── application/
│   │   │   └── service/        # @Service @Transactional use-case implementations
│   │   └── adapter/
│   │       ├── inbound/
│   │       │   ├── rest/       # REST controller + HATEOAS controller + DTOs
│   │       │   └── event/      # @SqsListener (feature-flag gated)
│   │       └── outbound/
│   │           ├── persistence/ # JPA + DynamoDB adapters
│   │           ├── event/       # SQS event publisher
│   │           ├── notification/# Log notification adapter
│   │           └── config/      # AppConfig, DynamoDB, OpenAPI config
│   ├── src/main/resources/
│   │   ├── application.yml     # Spring Boot config (all profiles)
│   │   └── db/migration/       # Flyway migrations
│   ├── src/test/java/          # Unit + integration tests (docker-compose SharedContainers)
│   ├── Containerfile
│   └── pom.xml
├── cdk/                        # CDK stack (AppConfig, RDS, DynamoDB, SQS, IAM, SG, ALB, ECS)
├── docker-compose.yml          # LocalStack + PostgreSQL + Jaeger
├── deploy-*.sh / destroy-infra.sh / docker-cdk.sh / Dockerfile.cdk
└── README.md
```

**Web UI Template:**
```
{ui-name}/
├── app/
│   ├── src/
│   │   ├── pages/              # Astro pages (SSR)
│   │   │   ├── index.astro     # Homepage
│   │   │   ├── api/            # BFF API routes
│   │   │   │   ├── products.ts # Proxy to product-service
│   │   │   │   └── orders.ts   # Proxy to order-service
│   │   ├── layouts/            # Reusable layouts
│   │   ├── components/         # Astro/React components
│   │   ├── lib/                # Shared utilities
│   │   │   ├── config.ts       # SSM parameter loading
│   │   │   ├── logger.ts       # Pino logger setup
│   │   │   └── fetchWithRetry.ts  # Backend HTTP client
│   │   └── env.d.ts            # TypeScript environment types
│   ├── public/                 # Static assets
│   ├── instrumentation.mjs     # OpenTelemetry SDK bootstrap
│   ├── astro.config.mjs        # Astro config (SSR mode)
│   ├── Containerfile           # Multi-stage Docker build
│   ├── package.json
│   └── tsconfig.json
├── cdk/
│   ├── src/main/java/          # CDK stack definitions
│   ├── src/test/java/          # CDK tests
│   ├── cdk.json                # CDK context
│   └── pom.xml
├── docker-compose.yml          # LocalStack + Jaeger
├── deploy-local-app.sh
├── deploy-infra.sh
├── deploy-app.sh
├── destroy-infra.sh
└── README.md
```

---

## Example Output Format

**Architecture Overview:**
```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                            │
└─────────────────┬───────────────────────────────────────────────┘
                  │ HTTPS
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Application Load Balancer (ALB)                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Priority 50:  /* → customer-portal-ui (port 4321)          │ │
│  │ Priority 100: /api/v1/products/* → product-service (8080)  │ │
│  │ Priority 200: /api/v1/orders/* → order-service (8080)      │ │
│  └────────────────────────────────────────────────────────────┘ │
└────┬─────────────────────────┬──────────────────────────────────┘
     │                         │
     │ ┌───────────────────────┘
     │ │
     ▼ ▼
┌─────────────────┐     ┌──────────────────┐     ┌────────────────┐
│ customer-portal │     │ product-service  │     │ order-service  │
│      -ui        │────▶│   (Spring Boot)  │     │ (Spring Boot)  │
│  (Astro SSR)    │ BFF │                  │     │                │
│                 │Proxy│  RDS PostgreSQL  │     │ RDS PostgreSQL │
└─────────────────┘     └────────┬─────────┘     └────────┬───────┘
                                 │                        │
                                 │ ProductCreated         │ OrderCreated
                                 ▼                        ▼
                        ┌────────────────────────────────────┐
                        │    EventBridge Bus (default)       │
                        └────────────┬───────────────────────┘
                                     │
                         ┌───────────┴──────────┐
                         ▼                      ▼
                  ┌─────────────┐      ┌────────────────┐
                  │ SQS Queue   │      │  SQS Queue     │
                  │ (order)     │      │  (inventory)   │
                  └──────┬──────┘      └────────┬───────┘
                         │                      │
                         ▼                      ▼
                  ┌─────────────┐      ┌────────────────┐
                  │order-service│      │inventory-serv. │
                  └─────────────┘      └────────────────┘
```

This architecture implements a customer order processing system with:
- Customer-facing UI (Astro SSR) with BFF pattern for backend integration
- Product catalog service (read-heavy, RDS PostgreSQL)
- Order management service (ACID transactions, event sourcing)
- Async event-driven communication between backend services
- Shared ALB for routing with priority-based rules
- All services on ECS Fargate with auto-scaling

**Service Catalog:**

[Tables as specified above]

**Event Flow: Customer Places Order:**

1. Customer browses products via customer-portal-ui (GET /products)
2. UI BFF route proxies to product-service REST API (with retry logic)
3. Product data rendered server-side (Astro SSR)
4. Customer adds items to cart (UI state management)
5. Customer clicks "Checkout" → POST /api/orders
6. UI BFF proxies to order-service → POST /api/v1/orders
7. order-service validates order, saves to PostgreSQL, publishes OrderCreated event
8. EventBridge routes event to inventory-service-order-queue
9. inventory-service reserves stock, publishes StockReserved event
10. EventBridge routes to payment-service-stock-queue
11. payment-service processes payment, publishes PaymentProcessed event
12. EventBridge routes to order-service-payment-queue
13. order-service updates order status to "CONFIRMED"
14. Customer-portal-ui polls order status or uses SSE for real-time updates

**Open Questions:**
- Authentication strategy: OAuth2/OIDC (Cognito)? JWT tokens? Session cookies?
- Payment gateway integration: Stripe? PayPal? Square?
- Real-time order status updates: Server-Sent Events (SSE)? WebSockets? Polling?
- Customer session management: Server-side sessions? Stateless JWT?
- Product search: ElasticSearch/OpenSearch required? Or PostgreSQL full-text search sufficient?
- Multi-currency support needed?
- Internationalization/localization requirements?

---

## Usage Notes

- Focus on ANALYSIS and PLANNING — do NOT generate actual code
- Be explicit about which patterns apply to backend services vs. web UI components
- Ensure web UI to backend integration is clearly mapped (BFF routes → backend APIs)
- Document SSM configuration for both backend services and web UIs
- Flag authentication/authorization requirements for UI access
- Consider user experience flows end-to-end (browser → UI → BFF → backend → events)
- Maintain separation of concerns: UI handles presentation + BFF proxy, backend handles business logic + events
- Ensure all components use OpenTelemetry for distributed tracing alignment
