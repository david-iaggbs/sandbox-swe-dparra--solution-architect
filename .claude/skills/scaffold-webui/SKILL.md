---
name: scaffold-webui
description: Scaffold a complete Astro SSR web UI repo deployed on ECS Fargate with CDK infrastructure and BFF API pattern
---

You are a software engineer, with cloud engineering knowledge, that scaffolds production-ready Astro SSR web UIs deployed on ECS Fargate.

Given the UI specification in: $ARGUMENTS

The specification should include: service name, target backend service(s) and their API endpoints to proxy, pages/views needed, and any custom SSM configuration parameters. If only a brief description is provided, first clarify the scope before scaffolding.

## Reference Template

The reference template is at: https://github.com/david-iaggbs/sandbox-swe-dparra--astro-webui

Before scaffolding, clone the template to study its exact structure:

```bash
git clone https://github.com/david-iaggbs/sandbox-swe-dparra--astro-webui /tmp/webui-reference-template
```

Read the project structure, configuration files, and patterns carefully.

Local workspace directory: /Users/david/Workspaces/david-iaggbs . The new service should be created under /Users/david/Workspaces/david-iaggbs/{service-name}.

## Architecture Constraints

Allowed AWS: ECS Fargate, ALB, ECR, SSM Parameter Store, CloudWatch. No Lambda, no API Gateway, no S3 static hosting. The web UI runs as an SSR application on ECS Fargate behind an ALB. All backend communication goes through BFF API routes (never direct browser-to-backend). IAM least privilege with resource-specific ARNs.

## Project Structure

Every web UI service has two modules: app/ (Astro SSR) and cdk/ (AWS CDK Java).

## Step 1: Prepare the Repository

Create a new directory and initialize git:

```bash
SERVICE_NAME="{service-name}"  # e.g., "order-webui"
mkdir -p /Users/david/Workspaces/david-iaggbs/$SERVICE_NAME
cd /Users/david/Workspaces/david-iaggbs/$SERVICE_NAME
git init
```

## Step 2: Scaffold the Parent POM

Create the root `pom.xml`:
- No parent (not a Spring Boot project)
- `<packaging>pom</packaging>`
- Modules: `cdk`
- Adjust `groupId`, `artifactId`, and `name` to the service name

## Step 3: Scaffold the App Module

### 3a. app/package.json
- Name: `{service-name}`
- Type: `module`
- Dependencies: `astro` 5.x, `@astrojs/node` 9.x, `@aws-sdk/client-ssm`, `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`, `@opentelemetry/exporter-trace-otlp-proto`, `@opentelemetry/api`, `pino`
- Dev dependencies: `vitest` 4.x, `typescript`, `pino-pretty`
- Scripts:
  - `dev`: `NODE_OPTIONS='--import ./instrumentation.mjs' astro dev`
  - `build`: `astro build`
  - `preview`: `astro preview`
  - `start`: `node --import ./instrumentation.mjs dist/server/entry.mjs`
  - `test`: `vitest run`
  - `test:watch`: `vitest`

### 3b. app/astro.config.mjs
- `output: 'server'` (SSR mode)
- `adapter: node({ mode: 'standalone' })`
- `server: { port: 4321, host: '0.0.0.0' }`
- `vite: { ssr: { external: ['pino', 'pino-pretty'] } }`

### 3c. app/tsconfig.json
- `{ "extends": "astro/tsconfigs/strict" }`

### 3d. app/vitest.config.ts
- Globals enabled, restoreMocks: true
- Include pattern: `['src/**/*UnitTest.ts', 'src/**/*IntegrationTest.ts']`

### 3e. app/instrumentation.mjs
- OpenTelemetry SDK bootstrap with `NodeSDK`
- OTLP trace exporter (proto)
- Auto-instrumentations for Node.js
- Only active when `OTEL_EXPORTER_OTLP_ENDPOINT` is set
- Copy pattern from reference template

### 3f. Library Layer (app/src/lib/)
- `config.ts` — SSM Parameter Store configuration loader:
  - `SSMClient` with optional `AWS_SSM_ENDPOINT` override (for LocalStack)
  - Parameters namespaced under `/{SERVICE_NAME}/`
  - Every function has a hardcoded fallback for resilience
  - Functions: `loadDescription()`, `getApiBackendUrl()`, `getApiTimeoutMs()`, `getApiRetryCount()`, `getLogLevel()`, `getRateLimitRpm()`
  - Add any service-specific config functions needed
- `fetchWithRetry.ts` — HTTP client wrapper:
  - `AbortSignal.timeout()` for per-request timeouts
  - Configurable retry count from SSM
  - Structured logging on retries, recovery, and exhaustion
- `logger.ts` — Pino structured logger:
  - `pino-pretty` transport in non-production (`NODE_ENV !== 'production'`)
  - Base fields: `service` name
  - Dynamic log level from SSM via `initLogLevel()` (fire-and-forget)

### 3g. Layout Layer (app/src/layouts/)
- `Layout.astro` — Base HTML layout:
  - Typed `Props` interface with `title` prop
  - Full HTML document: `<!doctype html>`, `<head>`, `<body>`
  - Sticky header with service brand name and nav links
  - Footer
  - `<slot />` for page content
  - Global CSS variables in `:root` for theming (colors, fonts, spacing)
  - Responsive design considerations

### 3h. Page Layer (app/src/pages/)
For each page/view in the specification:
- `{page}.astro` — Astro page component:
  - Server-side frontmatter: load config, fetch initial data if needed
  - HTML structure using `<Layout>` wrapper
  - Client-side `<script>` for interactivity (vanilla TypeScript, no framework)
  - Scoped `<style>` block
  - DOM manipulation for dynamic content (forms, lists, cards)
  - `fetch()` calls to local BFF API routes (`/api/...`)

### 3i. API Route Layer — BFF Pattern (app/src/pages/api/)
- `health.ts` — `GET /api/health` returns `{ status: "UP" }` (local, no backend call)
- `config.ts` — `GET /api/config` returns runtime config (description, backend URL)
- For each backend resource to proxy:
  - `{resources}/index.ts` — `GET` (list) and `POST` (create) proxying to `{backendUrl}/api/v1/{resources}`
  - `{resources}/[id].ts` — `GET` (by ID) and `DELETE` proxying to `{backendUrl}/api/v1/{resources}/{id}`
  - All proxy routes: use `fetchWithRetry`, return 502 with `{ message: "Service temporarily unavailable" }` on network failure
  - Forward response status and body from backend
  - Return null body on 204 (delete success)

### 3j. Static Assets (app/public/)
- `favicon.svg` — custom SVG favicon

### 3k. Containerfile
- Multi-stage build:
  - Build stage: `node:20-alpine`, `npm ci`, `npm run build`
  - Runtime stage: `node:20-alpine`, copy `dist/`, `instrumentation.mjs`, install prod-only deps
- Expose port 4321
- CMD: `node --import ./instrumentation.mjs dist/server/entry.mjs`

### 3l. Tests
Co-located with source files using naming convention:
- `src/lib/configUnitTest.ts` — SSM parameter loading, fallbacks, endpoint override
- `src/lib/fetchWithRetryUnitTest.ts` — retry logic, timeout, logging
- `src/pages/api/healthUnitTest.ts` — health endpoint response
- For each API route:
  - `src/pages/api/{resources}/indexUnitTest.ts` — GET/POST proxy, error forwarding, 502 on failure
  - `src/pages/api/{resources}/idUnitTest.ts` — GET/DELETE by ID, 404 forwarding, null body on 204
  - `src/pages/api/{resources}/integrationTest.ts` — end-to-end flow (CRUD), error scenarios (409, 400, 404, 500)
- Patterns:
  - `vi.mock()` for module mocking (config, logger, SSM)
  - `vi.stubGlobal('fetch', mockFetch)` for global fetch
  - `vi.resetModules()` + dynamic `await import()` for fresh state per test
  - Mock logger: `{ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }`

## Step 4: Scaffold the CDK Module

### 4a. cdk/pom.xml
- Copy from reference template, adjust `artifactId`
- Dependencies: `aws-cdk-lib` 2.154.0, `constructs` 10.x, JUnit 5

### 4b. cdk.json
- Copy from reference template (same shared infrastructure references: vpcId, ecsClusterName, albName)
- App command: `mvn -e -q compile exec:java`

### 4c. Value Objects
- `AwsEnvironment.java` — record with validation (region, accountId, environmentName)
- `NetworkConfig.java` — record (vpcId, ecsClusterName, albName)
- `ContainerConfig.java` — record (port, cpu, memoryMiB, desiredCount, imageTag)
- `RoutingConfig.java` — record (pathPattern, healthCheckPath, listenerRulePriority)
- No `DatabaseConfig` (web UIs don't have databases)

### 4d. InfrastructureConfig.java
- Builder pattern with defaults:
  - serviceName: `{service-name}`
  - port: 4321
  - cpu: 256, memoryMiB: 512
  - desiredCount: 0
  - pathPattern: `/*` (or service-specific path)
  - healthCheckPath: `/api/health`
  - listenerRulePriority: unique per service (e.g., 200)
  - region: `eu-west-1`

### 4e. CdkApp.java
- Context resolution (vpcId, ecsClusterName, albName)
- Stack instantiation with resolved config

### 4f. {ServiceName}Stack.java
The CDK stack creates resources in phases:
1. **Lookup** — VPC (by ID), ECS Cluster (by name), ALB (by tag), HTTP Listener (port 80)
2. **ECR Repository** — image scanning enabled, mutable tags, RemovalPolicy.DESTROY
3. **CloudWatch Log Group** — `/ecs/{service-name}`, 30-day retention
4. **IAM Roles**:
   - Task Execution Role: `AmazonECSTaskExecutionRolePolicy`
   - Task Role: `ssm:GetParameter` on `/{service-name}/*` parameters only
5. **SSM Parameters** — seed configuration parameters (description, backend URL, timeout, retry count, log level, rate limit)
6. **Security Group** — allow inbound from VPC CIDR on container port (4321)
7. **ALB Target Group** — HTTP on port 4321, health check at `/api/health`
8. **ALB Listener Rule** — path pattern, unique priority
9. **ECS Task Definition** — Fargate, 256 CPU / 512 MiB, env vars: HOST, PORT, SERVICE_NAME, AWS_REGION, OTEL_SERVICE_NAME, NODE_ENV
10. **ECS Fargate Service** — public subnets, desired count 0
11. **Outputs** — ECR repo URI, service URL, ECS service name

Key differences from microservice stack (NO):
- No RDS / database
- No AppConfig (6 resources)
- No DynamoDB
- No EventBridge / SQS
- No Secrets Manager

### 4g. Tests
- `{ServiceName}StackTest.java` — JUnit 5 with CDK `Template` assertions:
  - Verify all expected resources: ECR, Log Group, IAM roles, SG, Target Group, Task Definition, ECS Service, Listener Rule, SSM Parameters
  - Verify config builder defaults
  - Verify NO backend resources (RDS, SQS, EventBridge, AppConfig, DynamoDB)

## Step 5: Scaffold Operational Files

- `docker-compose.yml` — LocalStack (SSM) + Jaeger (tracing). No database containers.
- `localstack-init/init-aws.sh` — seeds SSM parameters on LocalStack startup
- `deploy-local-app.sh` — local dev orchestrator (start/stop/restart/logs/status/aws/clean)
- `deploy-infra.sh` — CDK bootstrap + deploy (supports `--docker` flag for macOS ARM64)
- `deploy-app.sh` — `npm ci` + `npm run build` + Docker build (linux/amd64) + ECR push + ECS force-new-deployment
- `destroy-infra.sh` — clean ECR images + CDK destroy
- `Dockerfile.cdk` — workaround for JSII on macOS ARM64 (eclipse-temurin:21-jdk + Node.js 20 + Maven + CDK CLI)
- `.devcontainer/devcontainer.json` — Codespaces config with Node.js 20, Java 21, Maven, AWS CLI, CDK
- `.devcontainer/docker-compose.yml` — dev container + LocalStack + Jaeger
- `.devcontainer/localstack-init/init-aws.sh` — SSM parameter seeding for Codespaces
- `.devcontainer/post-create.sh` — post-create setup (CDK, npm deps, Maven deps, aliases)
- `.gitignore` — Node.js + Java/Maven + CDK ignores
- `README.md` — service name, description, pages, API routes, quick start, deployment

## Step 6: Validate

Run the following checks:
```bash
# Install dependencies
cd app && npm ci && cd ..

# Verify app builds
cd app && npm run build && cd ..

# Run app tests
cd app && npm test && cd ..

# Verify CDK compiles
cd cdk && mvn compile -q && cd ..

# Run CDK tests
cd cdk && mvn test -q && cd ..
```

## Step 7: Output Summary

Print a summary:
- Service name and repo location
- Pages/views created
- BFF API routes available
- Backend service(s) proxied
- SSM configuration parameters
- CDK resources that will be provisioned
- Next steps (configure cdk.json context, deploy backend first, deploy UI)

## Important Rules

- Follow EVERY pattern from the reference template exactly
- TypeScript strict mode throughout
- Astro SSR with `@astrojs/node` standalone adapter
- BFF pattern: all backend calls go through API routes, never direct from browser
- SSM Parameter Store for all configuration with hardcoded fallbacks
- `fetchWithRetry` for all backend HTTP calls (timeout + retry)
- Pino structured logging with OpenTelemetry correlation
- Co-located tests with `*UnitTest.ts` / `*IntegrationTest.ts` naming
- Vitest with globals, `vi.mock()` for mocking, `vi.stubGlobal()` for fetch
- No UI framework (React/Vue/Svelte) — vanilla Astro components + TypeScript `<script>` blocks
- Scoped CSS with CSS custom properties for theming
- Multi-stage Docker build with `node:20-alpine`
- CDK Java with builder pattern, value object records, and Template assertions
- No wildcard IAM permissions — resource-specific ARNs only
- RemovalPolicy.DESTROY for dev environment resources
