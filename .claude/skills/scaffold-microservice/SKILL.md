---
name: scaffold-microservice
description: Scaffold a complete microservice repo from the reference template with business logic and CDK infrastructure
---

You are a cloud engineer that scaffolds production-ready ECS Fargate microservices.

Given the service specification in: $ARGUMENTS

The specification should include: service name, entities, REST endpoints, events produced/consumed, and AWS services needed. If only a brief description is provided, first decompose it before scaffolding.

## Reference Template

The reference template is at: https://github.com/david-iaggbs/sandbox-swe-dparra--spring-cloud-service

Before scaffolding, clone the template to study its exact structure:

```bash
git clone https://github.com/david-iaggbs/sandbox-swe-dparra--spring-cloud-service /tmp/reference-template
```

Read the `CLAUDE.md` at the root for all architecture constraints, patterns, and naming conventions.

## Step 1: Prepare the Repository

Create a new directory for the service in the current working directory:

```bash
SERVICE_NAME="{service-name}"  # e.g., "order-service"
mkdir -p "$SERVICE_NAME"
cd "$SERVICE_NAME"
git init
```

## Step 2: Scaffold the Parent POM

Create the root `pom.xml` following the template pattern:
- Parent: `spring-boot-starter-parent` 3.2.1
- Java 21, Spring Cloud 2023.0.0
- Modules: `app`, `cdk`
- Adjust `artifactId` and `name` to the service name

## Step 3: Scaffold the App Module

Clone the `app/` structure from the reference template, adapting:

### 3a. app/pom.xml
- Copy dependency structure exactly from reference
- Adjust `artifactId` and `name`
- Include only the AWS dependencies the service needs:
  - Always: spring-boot-starter-web, validation, actuator, data-jpa, postgresql, springdoc
  - If events consumed: spring-cloud-aws-starter-sqs
  - If audit logging: spring-cloud-aws-starter-dynamodb
  - Always: spring-cloud-aws-starter, parameter-store, secrets-manager, appconfigdata
  - Always: opentelemetry, testcontainers (test), testcontainers-postgresql (test), testcontainers-localstack (test), awaitility (test)

### 3b. Application Entry Point
- `{ServiceName}Application.java` with `@SpringBootApplication`, `@EnableScheduling`, `@EnableConfigurationProperties`

### 3c. Config Layer
- `AppProperties.java` — `@ConfigurationProperties(prefix = "app")` with message field
- `AppConfigProperties.java` — `@ConfigurationProperties(prefix = "aws.appconfig")`
- `DynamoDbProperties.java` — if DynamoDB is needed
- `DynamoDbConfig.java` — if DynamoDB is needed, with `@ConditionalOnProperty`
- `OpenApiConfig.java` — with service-specific title and description

### 3d. Entity Layer
For each entity defined in the specification:
- `{EntityName}Entity.java` — JPA entity with:
  - UUID `@Id` with `@GeneratedValue(strategy = GenerationType.UUID)`
  - `@Column` annotations matching the domain fields
  - `createdAt` (immutable) and `updatedAt` with `@PreUpdate`
  - Protected no-arg constructor + business constructor
- `AuditLogEntry.java` — if DynamoDB audit is needed, with `@DynamoDbBean`, composite pk/sk

### 3e. Repository Layer
For each entity:
- `{EntityName}Repository.java` — `extends JpaRepository<Entity, UUID>` with derived query methods
- `AuditRepository.java` — if DynamoDB, manual implementation with Enhanced Client

### 3f. Model Layer (DTOs)
For each entity:
- `Create{EntityName}Request.java` — record with `@NotBlank`, `@Size` validation
- `Update{EntityName}Request.java` — record with optional fields
- `{EntityName}Dto.java` — response record with all fields + computed fields
- `ErrorResponse.java` — standard error record (copy from template)

### 3g. Exception Layer
For each entity:
- `{EntityName}NotFoundException.java` — extends RuntimeException, constructors for UUID and String
- `Duplicate{EntityName}Exception.java` — if unique constraints exist
- Plus any domain-specific exceptions

### 3h. Service Layer
For each entity:
- `{EntityName}Service.java` — interface with CRUD + search methods
- `Default{EntityName}Service.java` — `@Service` implementation with:
  - Constructor injection, `@Nullable` for optional deps
  - `@Transactional` / `@Transactional(readOnly = true)`
  - Entity-to-DTO mapping with `configurationService.getMessage()`
  - Audit logging (if DynamoDB enabled)
- `ConfigurationService.java` — interface (copy from template)
- `AppConfigService.java` — implementation with polling (copy from template)

### 3i. Controller Layer
For each entity:
- `{EntityName}RestController.java` — `@RestController` with:
  - `@RequestMapping("/api/v1/{resources}")` (plural)
  - Full CRUD: GET list, GET by-id, GET search, POST (201+Location), PUT, DELETE (204)
  - `@Tag`, `@Operation`, `@ApiResponses` annotations
  - `@Valid @RequestBody` on POST/PUT
- `{EntityName}EventController.java` — if consuming events, with:
  - `@ConditionalOnProperty(name = "app.sqs.enabled")`
  - `@SqsListener` with EventBridge envelope parsing

### 3j. Configuration Files
- `application.yml` — copy template, adjust `spring.application.name`, `app.message`, table names
- `application-aws.yml` — copy template, adjust DynamoDB table name, SQS queue name
- `application-localstack.yml` — copy template, adjust names
- `application-codespaces.yml` — copy template, adjust names
- `application-test.yml` — copy template, adjust test message
- `logback-spring.xml` — copy template, adjust package name

### 3k. Containerfile
- Copy from template (Amazon Corretto 21 Alpine)

### 3l. Tests

**Test Infrastructure (create first):**
- `SharedContainers.java` — singleton containers started once per JVM:
  - `PostgreSQLContainer` (`postgres:15-alpine`) with service DB name/user/password
  - `GenericContainer` (`localstack/localstack:latest`) with services `sqs,dynamodb`
  - Static initializer block that starts both containers
  - `initLocalStackResources()` to create SQS queues and DynamoDB tables via `awslocal` CLI
  - `localstackEndpoint()` helper method
- `AbstractIntegrationTest.java` — base for `@SpringBootTest` tests:
  - `@ActiveProfiles("test")`
  - `@DynamicPropertySource` configuring PostgreSQL URL/credentials + LocalStack endpoint + AWS settings
  - Configures `spring.cloud.aws.endpoint`, credentials, SQS, DynamoDB, app properties
- `AbstractRepositoryTest.java` — base for `@DataJpaTest` tests:
  - `@ActiveProfiles("test")`
  - `@DynamicPropertySource` configuring PostgreSQL URL/credentials only (no LocalStack needed)

**Test classes for each entity:**
- `{EntityName}RestControllerUnitTest.java` — Mockito BDD with `MockMvcBuilders.standaloneSetup()`
- `{EntityName}RestControllerIntegrationTest.java` — extends `AbstractIntegrationTest`, `@AutoConfigureMockMvc`
- `Default{EntityName}ServiceUnitTest.java` — Mockito BDD, test service logic
- `{EntityName}RepositoryIntegrationTest.java` — extends `AbstractRepositoryTest`
- `application-test.yml` under test resources (disable AWS config imports, set test defaults)

## Step 4: Scaffold the CDK Module

Clone the `cdk/` structure from the reference template, adapting:

### 4a. cdk/pom.xml
- Copy from template, adjust `artifactId`

### 4b. cdk.json
- Copy from template (same shared infrastructure references)

### 4c. Value Objects
- Copy all records from template: `AwsEnvironment`, `NetworkConfig`, `ContainerConfig`, `RoutingConfig`, `DatabaseConfig`

### 4d. InfrastructureConfig.java
- Copy from template, adjust `serviceName` default

### 4e. CdkApp.java
- Copy from template, adjust stack class name

### 4f. {ServiceName}Stack.java
- Base on `SpringCloudServiceStack.java` from template
- Include only the phases needed:
  - Always: Lookup, ECR, LogGroup, IAM, AppConfig, SecurityGroup, RDS, TargetGroup, ListenerRule, TaskDefinition, ECSService, Outputs
  - If events consumed: EventBridge-to-SQS integration
  - If audit logging: DynamoDB table
- Adjust:
  - Stack class name
  - Service name
  - ALB listener rule priority (unique per service)
  - Path pattern (e.g., `/api/v1/orders/*`)
  - Environment variables (AppConfig IDs, SQS queue, DynamoDB table)

### 4g. Tests
- `{ServiceName}StackTest.java` — Template assertions for resource existence and properties

## Step 5: Scaffold Operational Files

- `docker-compose.yml` — PostgreSQL + LocalStack + Jaeger (copy from template, adjust DB name)
- `deploy-local-app.sh` — copy from template, adjust service name
- `deploy-infra.sh` — copy from template
- `deploy-app.sh` — copy from template, adjust ECR repo name
- `destroy-infra.sh` — copy from template
- `.gitignore` — standard Java + CDK ignores
- `README.md` — service name, description, API endpoints, quick start

## Step 6: Validate

Run the following checks:
```bash
# Verify app compiles
cd app && mvn compile -q && cd ..

# Verify CDK compiles
cd cdk && mvn compile -q && cd ..

# Run app tests
cd app && mvn test -q && cd ..
```

## Step 7: Output Summary

Print a summary:
- Service name and repo location
- Entities created
- REST endpoints available
- Events produced/consumed
- CDK resources that will be provisioned
- Next steps (configure cdk.json context, deploy)

## Important Rules

- Follow EVERY pattern from the reference template CLAUDE.md exactly
- Use Java 21 features: records, text blocks, Stream API
- Constructor injection only (never `@Autowired`)
- `@Nullable` for optional dependencies
- `@ConditionalOnProperty` for feature-flagged beans
- No wildcard IAM permissions
- Every REST endpoint must have OpenAPI annotations
- Every service method must have `@Transactional`
- Tests must use BDD style (`given`/`when`/`then`) with AssertJ
