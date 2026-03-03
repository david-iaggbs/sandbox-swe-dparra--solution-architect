---
name: scaffold-rich-domain-microservice
description: Scaffold a production-ready hexagonal architecture (Ports & Adapters) microservice on ECS Fargate — Spring Boot 3.2.1, Java 21, rich domain model (aggregates, value objects, domain events, ports), HATEOAS, RDS PostgreSQL, DynamoDB audit, AppConfig, EventBridge + SQS, and CDK infrastructure
argument-hint: <service-name> <domain-name> <entity-name> [description]
---

You are a cloud engineer that scaffolds production-ready hexagonal architecture ECS Fargate microservices following the `david-iaggbs` workspace standard.

**Reference template:** https://github.com/david-iaggbs/sandbox-swe-dparra--business--spring-cloud-service

---

## Step 0 — Parse Arguments

Extract:
- `SERVICE_NAME` (required): kebab-case service slug, e.g. `booking`, `inventory`, `payment`. Becomes the repository suffix.
- `DOMAIN_NAME` (required): the bounded context / business domain noun (singular, PascalCase), e.g. `Booking`, `Order`, `Product`.
- `ENTITY_NAME` (required): the primary aggregate root name (PascalCase), e.g. `Booking`, `Order`. Often equals `DOMAIN_NAME`.
- `DESCRIPTION` (optional): one-sentence description. Default: `{DOMAIN_NAME} domain microservice.`

Derived values:
- `REPO_NAME` = `sandbox-swe-dparra--{SERVICE_NAME}--service`
- `REPO_FULL` = `david-iaggbs/{REPO_NAME}`
- `JAVA_PACKAGE` = `com.example.{SERVICE_NAME}` (hyphens removed, lowercase)
- `PACKAGE_PATH` = path form of `JAVA_PACKAGE`, e.g. `com/example/booking`
- `entity_name` = lowercase form of `ENTITY_NAME`, e.g. `booking`
- `CDK_STACK_NAME` = `{PascalCase(SERVICE_NAME)}Stack`, e.g. `BookingStack`

If `SERVICE_NAME` or `DOMAIN_NAME` or `ENTITY_NAME` are not provided, stop and ask the user.

---

## Step 1 — Clone the Reference Template

```bash
TEMPLATE_DIR="/tmp/scaffold-rich-domain-template"
rm -rf "$TEMPLATE_DIR"
git clone --depth 1 https://github.com/david-iaggbs/sandbox-swe-dparra--business--spring-cloud-service "$TEMPLATE_DIR"
```

Read these files before generating anything:
- `$TEMPLATE_DIR/README.md`
- `$TEMPLATE_DIR/app/pom.xml` (full dependency list)
- `$TEMPLATE_DIR/cdk/pom.xml`
- All files under `$TEMPLATE_DIR/app/src/main/java/com/example/booking/` (full package tree)
- `$TEMPLATE_DIR/app/src/main/resources/application.yml` and all `application-*.yml`
- `$TEMPLATE_DIR/docker-compose.yml`

---

## Step 2 — Create the GitHub Repository

```bash
gh repo create david-iaggbs/${REPO_NAME} \
  --private \
  --description "${DESCRIPTION}" \
  --clone
cd ${REPO_NAME}
git checkout -b main
```

If the repo already exists, stop and inform the user with the repo URL.

---

## Step 3 — Copy Template and Substitute Placeholders

Copy the full template into the new repo:

```bash
cp -r "$TEMPLATE_DIR"/. .
rm -rf .git
```

Remove the template's own skill files:
```bash
rm -rf .claude/
```

Run global substitutions across all Java, YAML, XML, shell, and Markdown files:

```bash
# Service name (kebab-case)
find . -type f \( -name "*.java" -o -name "*.yml" -o -name "*.yaml" -o -name "*.xml" -o -name "*.sh" -o -name "*.md" -o -name "*.json" \) \
  -exec sed -i '' \
    -e "s/business-spring-cloud-service/${SERVICE_NAME}--service/g" \
    -e "s/business_spring_cloud_service/${SERVICE_NAME//-/_}_service/g" \
    {} \;

# Java package: com.example.booking → com.example.{SERVICE_NAME}
find . -type f -name "*.java" \
  -exec sed -i '' "s/com\.example\.booking/${JAVA_PACKAGE//./\\.}/g" {} \;

# Domain / entity class names: Booking → {ENTITY_NAME}
find . -type f -name "*.java" \
  -exec sed -i '' \
    -e "s/Booking/${ENTITY_NAME}/g" \
    -e "s/booking/${entity_name}/g" \
    {} \;

# CDK stack name
find . -type f \( -name "*.java" -o -name "*.json" \) \
  -exec sed -i '' "s/SpringCloudServiceStack/${CDK_STACK_NAME}/g" {} \;

# Application name in YAML
find . -type f \( -name "*.yml" -o -name "*.yaml" \) \
  -exec sed -i '' "s/business-spring-cloud-service/${SERVICE_NAME}--service/g" {} \;
```

Rename Java source directories to match the new package:

```bash
TEMPLATE_PKG_PATH="app/src/main/java/com/example/booking"
NEW_PKG_PATH="app/src/main/java/${PACKAGE_PATH}"
mkdir -p "$(dirname "$NEW_PKG_PATH")"
mv "$TEMPLATE_PKG_PATH" "$NEW_PKG_PATH"

# Same for test
TEMPLATE_TEST_PATH="app/src/test/java/com/example/booking"
NEW_TEST_PATH="app/src/test/java/${PACKAGE_PATH}"
mkdir -p "$(dirname "$NEW_TEST_PATH")"
mv "$TEMPLATE_TEST_PATH" "$NEW_TEST_PATH"
```

Rename class files that include `Booking` in the filename:

```bash
find . -type f -name "*Booking*" | while read f; do
  mv "$f" "${f//Booking/${ENTITY_NAME}}"
done
find . -type f -name "*booking*" | while read f; do
  mv "$f" "${f//booking/${entity_name}}"
done
```

Fix CDK app entry in `cdk/pom.xml` if package changed:
```bash
sed -i '' "s|com\.example\.infra\.CdkApp|${JAVA_PACKAGE}.infra.CdkApp|g" cdk/pom.xml
```

---

## Step 4 — Adapt the Domain Model

After renaming, the scaffolded code is a working Booking domain. You must now adapt it to the actual business domain specified by the user. The following is the authoritative hexagonal architecture package structure — use it as the guide.

### Package structure

```
${PACKAGE_PATH}/
├── ${ENTITY_NAME}ServiceApplication.java
│
├── domain/
│   ├── model/
│   │   ├── ${ENTITY_NAME}.java                 ← aggregate root (ADAPT)
│   │   ├── [secondary entities and value objects]
│   │   ├── ${ENTITY_NAME}Status.java           ← status enum (ADAPT)
│   │   └── [other enums]
│   ├── event/
│   │   ├── DomainEvent.java                    ← sealed interface (keep as-is)
│   │   ├── ${ENTITY_NAME}Confirmed.java        ← domain event (ADAPT)
│   │   └── ${ENTITY_NAME}Cancelled.java        ← domain event (ADAPT)
│   ├── exception/
│   │   ├── ${ENTITY_NAME}NotFoundException.java
│   │   └── [other domain exceptions]
│   ├── service/
│   │   └── [pure domain services — no framework imports]
│   └── port/
│       ├── inbound/
│       │   ├── ${ENTITY_NAME}UseCase.java
│       │   ├── ConfigurationPort.java
│       │   └── [other inbound ports]
│       └── outbound/
│           ├── ${ENTITY_NAME}Repository.java
│           ├── EventPublisher.java
│           ├── AuditLogger.java
│           └── NotificationSender.java
│
├── application/
│   └── service/
│       ├── ${ENTITY_NAME}ApplicationService.java    ← @Service @Transactional
│       └── ${ENTITY_NAME}LifecycleHooks.java        ← @Component null-safe side effects
│
└── adapter/
    ├── inbound/
    │   ├── rest/
    │   │   ├── ${ENTITY_NAME}RestController.java    ← @RestController /api/v1/{entity_name}s
    │   │   ├── GlobalExceptionHandler.java          ← @RestControllerAdvice
    │   │   ├── ${ENTITY_NAME}RequestMapper.java     ← static mapping util
    │   │   ├── dto/                                 ← Create/Update requests + Response records
    │   │   └── hateoas/                             ← HAL-FORMS controllers, assemblers, models
    │   └── event/
    │       └── ${ENTITY_NAME}EventListener.java     ← @SqsListener @ConditionalOnProperty
    └── outbound/
        ├── persistence/
        │   ├── jpa/
        │   │   ├── ${ENTITY_NAME}PersistenceAdapter.java   ← implements ${ENTITY_NAME}Repository
        │   │   ├── ${ENTITY_NAME}JpaEntity.java
        │   │   └── ${ENTITY_NAME}JpaRepository.java
        │   └── dynamodb/
        │       ├── AuditDynamoDbAdapter.java               ← implements AuditLogger
        │       └── AuditLogEntry.java
        ├── event/
        │   └── SqsEventPublisher.java                      ← implements EventPublisher
        ├── notification/
        │   └── LogNotificationAdapter.java                 ← implements NotificationSender
        └── config/
            ├── AppConfigAdapter.java                       ← implements ConfigurationPort
            ├── AppConfigProperties.java
            ├── DynamoDbConfig.java
            ├── DynamoDbProperties.java
            └── OpenApiConfig.java
```

### Architecture rules (enforce strictly)

1. **Domain layer has ZERO framework imports** — no Spring, JPA, AWS, or any framework annotations
2. **Aggregate roots** use factory methods (`create(...)` and `reconstitute(...)`) — no public constructors
3. **Value objects** are Java `record` types with compact constructor validation
4. **Domain events** use a `sealed interface DomainEvent` with `record` implementations
5. **Application services** are the sole `@Transactional` boundary — never domain or adapter classes
6. **Optional outbound ports** (`AuditLogger`, `NotificationSender`) are `@Nullable`-injected and delegated through `${ENTITY_NAME}LifecycleHooks`
7. **Persistence adapters** contain inline mappers (`toDomain()` / `toJpaEntity()`) — no separate mapper class
8. **SQS listener** is gated with `@ConditionalOnProperty(name="app.features.event-listening", havingValue="true")`
9. **DynamoDB adapter** is NOT `@Component` — instantiated as a `@Bean` in `DynamoDbConfig` so it can be conditionally disabled
10. **HATEOAS** controllers expose `/api/hateoas/v1/{entity}s` alongside the standard REST API

### `${ENTITY_NAME}.java` aggregate root template

```java
// NO framework imports
public final class ${ENTITY_NAME} {
    private final UUID id;
    private String title;          // adapt fields to domain
    private ${ENTITY_NAME}Status status;
    private final Instant createdAt;
    private Instant updatedAt;
    // ... domain-specific fields

    private ${ENTITY_NAME}(UUID id, String title, ${ENTITY_NAME}Status status, Instant createdAt, Instant updatedAt) {
        this.id = id;
        // ...
    }

    /** Factory: create new ${ENTITY_NAME} */
    public static ${ENTITY_NAME} create(String title /* adapt params */) {
        // validate inputs, assign UUID, set status CONFIRMED, Instant.now()
    }

    /** Factory: reconstitute from persistence */
    public static ${ENTITY_NAME} reconstitute(UUID id, String title, ${ENTITY_NAME}Status status, Instant createdAt, Instant updatedAt) {
        return new ${ENTITY_NAME}(id, title, status, createdAt, updatedAt);
    }

    // Business methods — domain logic lives here, not in application service
}
```

### `DomainEvent.java` sealed interface

```java
public sealed interface DomainEvent permits ${ENTITY_NAME}Confirmed, ${ENTITY_NAME}Cancelled {
    Instant occurredAt();
}

public record ${ENTITY_NAME}Confirmed(UUID ${entity_name}Id, String title, Instant occurredAt) implements DomainEvent {
    public ${ENTITY_NAME}Confirmed {
        Objects.requireNonNull(${entity_name}Id);
        Objects.requireNonNull(title);
        Objects.requireNonNull(occurredAt);
    }
}
```

---

## Step 5 — Configure Application YAML

Update `app/src/main/resources/application.yml` — set the `spring.application.name` and SQS queue names:

```bash
sed -i '' \
  -e "s/spring.application.name: .*/spring.application.name: ${SERVICE_NAME}--service/" \
  -e "s/booking-events-queue: .*/booking-events-queue: ${SERVICE_NAME}--service-events/" \
  app/src/main/resources/application.yml

# Same for all profile variants
for f in app/src/main/resources/application-*.yml; do
  sed -i '' \
    -e "s|/business-spring-cloud-service/|/${SERVICE_NAME}--service/|g" \
    -e "s|business-spring-cloud-service-events|${SERVICE_NAME}--service-events|g" \
    "$f"
done
```

---

## Step 6 — Configure CDK Infrastructure

### 6a. `InfrastructureConfig` defaults

Open `cdk/src/main/java/.../infra/config/InfrastructureConfig.java` and update:

```java
.serviceName("${SERVICE_NAME}--service")          // slug used for all resource names
.containerPort(8080)
.containerCpu(256)
.containerMemoryMiB(512)
.desiredCount(0)
.imageTag("latest")
.pathPattern("/api/v1/${entity_name}s/*")          // primary REST path
.healthCheckPath("/actuator/health")
.listenerRulePriority(100)                          // adjust per product to avoid conflicts
.dbDatabaseName("${SERVICE_NAME//-/_}db")          // e.g. bookingdb
.dbUsername("dbadmin")
```

Update `cdk/cdk.json` — replace hardcoded context values with your environment's actual values:
```json
{
  "app": "mvn -e -q compile exec:java",
  "context": {
    "vpcId": "<your-vpc-id>",
    "ecsClusterName": "<your-ecs-cluster-name>",
    "albName": "<your-alb-name>",
    "environment": "dev",
    "eventBridgeBusArn": "<your-eventbridge-bus-arn>"
  }
}
```

### 6b. ALB listener rule paths

In `${CDK_STACK_NAME}.java`, the ALB listener rule includes these path patterns by default:
```java
ListenerCondition.pathPatterns(Arrays.asList(
    config.getRoutingConfig().pathPattern(),          // /api/v1/{entity_name}s/*
    "/api/hateoas/v1/" + entity_name + "s/*",        // HATEOAS endpoint
    "/swagger-ui*",
    "/v3/api-docs*",
    "/actuator/*",
    "/sse"                                            // MCP SSE transport
))
```
Adjust priority and paths to avoid conflicts with other services on the same ALB.

### 6c. AppConfig initial configuration

In `AppConfigConstruct.java`, update the initial hosted configuration JSON to match the domain's configuration fields. The default `BookingConfig` template:

```json
{
  "freeCancellationHours": 24,
  "feePercentage": 50,
  "businessStartHour": 8,
  "businessEndHour": 18,
  "minDurationMinutes": 15,
  "maxDurationMinutes": 480,
  "maxAdvanceBookingDays": 90
}
```

Replace with the actual runtime configuration fields for your domain.

---

## Step 7 — Configure LocalStack Init Script

Update `localstack-init/init-aws.sh` — replace all `business-spring-cloud-service` references:

```bash
sed -i '' "s/business-spring-cloud-service/${SERVICE_NAME}--service/g" localstack-init/init-aws.sh
```

The script creates (at LocalStack startup):
1. SSM parameter: `/${SERVICE_NAME}--service/spring.datasource.url`
2. Secrets Manager secret: `/${SERVICE_NAME}--service/db/credentials`
3. SQS DLQ: `${SERVICE_NAME}--service-events-dlq`
4. SQS Queue: `${SERVICE_NAME}--service-events` (visibility 300s, DLQ after 3 receives)
5. EventBridge bus: `${SERVICE_NAME}--service-bus`
6. EventBridge rule: routes all account events → SQS
7. DynamoDB table: `${SERVICE_NAME}--service-audit-log` (pk+sk)

Also update `.devcontainer/localstack-init/init-aws.sh` with the same substitution.

---

## Step 8 — Update Test Infrastructure

Update `SharedContainers.java` — adjust the PostgreSQL database name and queue/table names:

```bash
sed -i '' \
  -e "s/springclouddb/${SERVICE_NAME//-/_}db/g" \
  -e "s/business-spring-cloud-service/${SERVICE_NAME}--service/g" \
  app/src/test/java/${PACKAGE_PATH}/test/SharedContainers.java
```

Update `AbstractIntegrationTest.java` queue and DynamoDB table name refs:
```bash
sed -i '' \
  -e "s/test-booking-events/test-${entity_name}-events/g" \
  -e "s/test-audit-log/test-${SERVICE_NAME}-audit-log/g" \
  app/src/test/java/${PACKAGE_PATH}/test/AbstractIntegrationTest.java
```

---

## Step 9 — Update Operational Scripts

```bash
# All deploy scripts
for f in deploy-*.sh destroy-infra.sh; do
  sed -i '' \
    -e "s/business-spring-cloud-service/${SERVICE_NAME}--service/g" \
    -e "s/ECS_CLUSTER=.*/ECS_CLUSTER=\"\${ECS_CLUSTER:-ecs-cluster-cluster-dev}\"/" \
    "$f"
done
```

`docker-cdk.sh` — update the Docker image tag:
```bash
sed -i '' "s/business-spring-cloud-service-cdk/${SERVICE_NAME}--service-cdk/g" docker-cdk.sh
```

---

## Step 10 — Initial Commit and Push

```bash
git add .
git commit -m "feat: scaffold ${SERVICE_NAME} rich-domain hexagonal microservice

- Hexagonal architecture (Ports & Adapters) with pure domain layer
- Domain: ${ENTITY_NAME} aggregate root, value objects, sealed domain events
- Application layer: use-case ports, application services, lifecycle hooks
- Adapters: REST + HATEOAS inbound, JPA + DynamoDB + SQS + EventBridge outbound
- CDK: AppConfig, RDS PostgreSQL, EventBridge → SQS, DynamoDB audit table
- docker-compose: PostgreSQL + LocalStack + Jaeger

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push -u origin main
```

---

## Step 11 — Output Summary

```
✓ Repository created: https://github.com/david-iaggbs/${REPO_NAME}

Architecture:  Hexagonal (Ports & Adapters)
Domain:        ${DOMAIN_NAME}
Aggregate:     ${ENTITY_NAME}
Package:       ${JAVA_PACKAGE}

Layers scaffolded:
  domain/model/         — ${ENTITY_NAME} aggregate root + value objects + enums
  domain/event/         — DomainEvent sealed interface + ${ENTITY_NAME}Confirmed/Cancelled
  domain/exception/     — ${ENTITY_NAME}NotFoundException + domain rule violations
  domain/service/       — pure domain services (no framework deps)
  domain/port/          — inbound use-case ports + outbound repository/event/audit ports
  application/service/  — @Transactional application services + lifecycle hooks
  adapter/inbound/rest/ — REST controller (/api/v1/${entity_name}s) + HATEOAS (/api/hateoas/v1)
  adapter/inbound/event/— @SqsListener (feature-flag gated)
  adapter/outbound/     — JPA persistence, DynamoDB audit, SQS event publisher, AppConfig

Infrastructure (CDK):
  AppConfigConstruct    — hot-reload configuration profile
  DatabaseConstruct     — RDS PostgreSQL (db.t3.micro)
  MessagingConstruct    — EventBridge → SQS queue with DLQ
  DynamoDB audit table  — pk=ENTITY#{id} sk=ACTION#{ts}
  ComputeConstruct      — ECS Fargate, ALB listener rule

IMPORTANT — manual steps required after scaffolding:
  1. Adapt domain/model/${ENTITY_NAME}.java — replace Booking business logic with ${DOMAIN_NAME} logic
  2. Adapt domain/model/ value objects — replace TimeSlot/Participant etc. with your domain VOs
  3. Update domain/port/inbound/${ENTITY_NAME}UseCase.java — define your actual use case methods
  4. Update adapter/inbound/rest/dto/ — replace request/response records to match your API
  5. Update adapter/inbound/rest/hateoas/ — update HATEOAS links to reflect your state machine
  6. Update cdk.json context values — vpcId, ecsClusterName, albName, eventBridgeBusArn
  7. Update AppConfigConstruct initial JSON — replace BookingConfig fields with your domain config
  8. Review ALB listener rule priority — ensure it does not conflict with other services
  9. Update localstack-init/init-aws.sh — verify all resources match your domain naming

Run locally:
  ./deploy-local-app.sh start       # starts docker-compose + runs mvn spring-boot:run
  ./deploy-local-app.sh start-simple # runs dev server only (no LocalStack)
  open http://localhost:8080/swagger-ui.html
  open http://localhost:16686        # Jaeger distributed tracing UI
```

---

## Important Rules

1. **Domain layer purity** — never add `@Component`, `@Service`, `@Entity`, or any framework annotation inside `domain/`. Every Spring/JPA annotation belongs in the adapter or application layer.
2. **No direct domain construction** — aggregate roots must only be constructed via `create(...)` (new) or `reconstitute(...)` (from persistence). All other constructors are `private`.
3. **Value objects are immutable** — all `record` types, compact constructor validates, no setters.
4. **Sealed domain events** — `DomainEvent` is a `sealed interface`; each event is a `record` that `permits DomainEvent`.
5. **Single transactional boundary** — `@Transactional` appears only on application service methods, never in adapters or domain.
6. **Optional side effects** — `AuditLogger` and `NotificationSender` are `@Nullable` — always null-check before calling.
7. **DynamoDB adapter is a bean, not a component** — `AuditDynamoDbAdapter` must be instantiated in `DynamoDbConfig` as a `@Bean`, never annotated `@Component`.
8. **ALB priority** — default is `100`; change in `InfrastructureConfig` to avoid collision with other services sharing the same ALB.
9. **LLM tests excluded by default** — test classes tagged `@Tag("llm")` require Ollama and are excluded by `maven-surefire-plugin`'s `<excludedGroups>llm</excludedGroups>` configuration.
10. **Placeholder substitution** — after renaming, search for any remaining `booking`, `Booking`, `business-spring-cloud-service` strings and fix them before committing.
11. **cdk.json hardcoded context values** — the template ships with real `vpcId`, `ecsClusterName`, `albName`, and `eventBridgeBusArn` values from the template environment. These **must** be replaced with the target environment's values before running `cdk deploy`.
12. **`docker-cdk.sh` for macOS ARM64** — on Apple Silicon, JSII may fail natively. Use `./docker-cdk.sh deploy` instead of `npx cdk deploy`.
