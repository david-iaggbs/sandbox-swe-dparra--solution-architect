---
name: scaffold-infra
description: Scaffold a standard Terraform ECS Fargate infrastructure repo for a new product or system — VPC, IAM, ALB, ECS, and EventBridge modules wired together
argument-hint: <project-name> [aws-region] [environment]
---

You are a cloud engineer that scaffolds production-ready Terraform ECS Fargate infrastructure repositories following the organization's standard module architecture.

**Reference template:** https://github.com/david-iaggbs/sandbox-swe-dparra--terraform-ecs-cluster

---

## Step 0 — Parse Arguments

Extract from the user's arguments:
- `PROJECT_NAME` (required): slug name of the product/system, e.g. `orders`, `payments`, `catalog`. Use lowercase, hyphen-separated.
- `AWS_REGION` (optional, default: `eu-west-1`)
- `ENVIRONMENT` (optional, default: `dev`)

Derived values:
- `REPO_NAME` = `sandbox-swe-dparra--terraform-${PROJECT_NAME}--infra`
- `REPO_FULL` = `david-iaggbs/${REPO_NAME}`

If `PROJECT_NAME` is not provided, stop and ask the user for it.

---

## Step 1 — Create GitHub Repository

```bash
gh repo create david-iaggbs/${REPO_NAME} --private --description "Terraform ECS Fargate infrastructure for ${PROJECT_NAME}" --clone
cd ${REPO_NAME}
git checkout -b main
```

If the repo already exists, stop and inform the user with the repo URL.

---

## Step 2 — Scaffold Root Files

Create the following files in the repo root:

### `main.tf`

```hcl
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source = "./modules/vpc"

  project_name       = var.project_name
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
}

module "iam" {
  source = "./modules/iam"

  project_name = var.project_name
  environment  = var.environment
}

module "alb" {
  source = "./modules/alb"

  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  public_subnet_ids  = module.vpc.public_subnet_ids
  alb_security_group = module.vpc.alb_security_group_id
}

module "ecs" {
  source = "./modules/ecs"

  project_name           = var.project_name
  environment            = var.environment
  vpc_id                 = module.vpc.vpc_id
  private_subnet_ids     = module.vpc.private_subnet_ids
  ecs_security_group_id  = module.vpc.ecs_security_group_id
  ecs_task_role_arn      = module.iam.ecs_task_role_arn
  ecs_execution_role_arn = module.iam.ecs_execution_role_arn
  alb_target_group_arn   = module.alb.target_group_arn
}

module "eventbridge" {
  source = "./modules/eventbridge"

  project_name        = var.project_name
  environment         = var.environment
  allowed_account_ids = var.eventbridge_allowed_account_ids
}
```

### `variables.tf`

```hcl
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-1"
}

variable "project_name" {
  description = "Project name used as resource naming prefix"
  type        = string
  default     = "${PROJECT_NAME}"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["${AWS_REGION}a", "${AWS_REGION}b"]
}

variable "eventbridge_allowed_account_ids" {
  description = "List of AWS account IDs allowed to put events to the event bus"
  type        = list(string)
  default     = null
}
```

Substitute `${PROJECT_NAME}` and `${AWS_REGION}` with the actual parsed values.

### `outputs.tf`

```hcl
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "alb_dns_name" {
  description = "ALB DNS name for public access"
  value       = module.alb.alb_dns_name
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = module.ecs.service_name
}

output "eventbridge_bus_name" {
  description = "Name of the EventBridge event bus"
  value       = module.eventbridge.event_bus_name
}

output "eventbridge_bus_arn" {
  description = "ARN of the EventBridge event bus"
  value       = module.eventbridge.event_bus_arn
}

output "eventbridge_sqs_policy_document" {
  description = "IAM policy document for SQS queues to receive events from this bus"
  value       = module.eventbridge.sqs_target_policy_document
}
```

### `.gitignore`

```
# Terraform
*.tfstate
*.tfstate.*
**/*.tfstate
**/*.tfstate.*
*.tfvars
!environments/**/*.tfvars
crash.log
crash.*.log
*.tfplan
*.tfplan.*
.terraform/
.terraform.lock.hcl
override.tf
override.tf.json
*_override.tf
*_override.tf.json

# VS Code
.vscode/
*.code-workspace

# OS Files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE
.idea/
*.swp
*.swo
*~

# Logs
*.log

# Backup files
*.backup
```

---

## Step 3 — Scaffold Modules

Create all module directories and files.

### `modules/vpc/variables.tf`

```hcl
variable "project_name" {
  description = "Project name used as resource naming prefix"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
}
```

### `modules/vpc/main.tf`

```hcl
# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${var.project_name}-vpc-${var.environment}"
    Environment = var.environment
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "${var.project_name}-igw-${var.environment}"
    Environment = var.environment
  }
}

# Public Subnets
resource "aws_subnet" "public" {
  count                   = length(var.availability_zones)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name        = "${var.project_name}-public-subnet-${count.index + 1}-${var.environment}"
    Environment = var.environment
  }
}

# Private Subnets
resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name        = "${var.project_name}-private-subnet-${count.index + 1}-${var.environment}"
    Environment = var.environment
  }
}

# Elastic IP for NAT Gateway
resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name        = "${var.project_name}-nat-eip-${var.environment}"
    Environment = var.environment
  }

  depends_on = [aws_internet_gateway.main]
}

# NAT Gateway
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name        = "${var.project_name}-nat-${var.environment}"
    Environment = var.environment
  }

  depends_on = [aws_internet_gateway.main]
}

# Public Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name        = "${var.project_name}-public-rt-${var.environment}"
    Environment = var.environment
  }
}

# Private Route Table
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = {
    Name        = "${var.project_name}-private-rt-${var.environment}"
    Environment = var.environment
  }
}

# Route Table Associations
resource "aws_route_table_association" "public" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# ALB Security Group
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-alb-sg-${var.environment}"
  description = "Security group for ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-alb-sg-${var.environment}"
    Environment = var.environment
  }
}

# ECS Security Group
resource "aws_security_group" "ecs" {
  name        = "${var.project_name}-ecs-sg-${var.environment}"
  description = "Security group for ECS tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Traffic from ALB"
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-ecs-sg-${var.environment}"
    Environment = var.environment
  }
}
```

### `modules/vpc/outputs.tf`

```hcl
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "alb_security_group_id" {
  description = "ALB security group ID"
  value       = aws_security_group.alb.id
}

output "ecs_security_group_id" {
  description = "ECS security group ID"
  value       = aws_security_group.ecs.id
}
```

---

### `modules/iam/variables.tf`

```hcl
variable "project_name" {
  description = "Project name used as resource naming prefix"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}
```

### `modules/iam/main.tf`

```hcl
# ECS Task Execution Role
resource "aws_iam_role" "ecs_execution" {
  name = "${var.project_name}-ecs-execution-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-ecs-execution-role-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS Task Role
resource "aws_iam_role" "ecs_task" {
  name = "${var.project_name}-ecs-task-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-ecs-task-role-${var.environment}"
    Environment = var.environment
  }
}

# CloudWatch Logs Policy for Task Role
resource "aws_iam_role_policy" "ecs_task_logs" {
  name = "${var.project_name}-ecs-task-logs-${var.environment}"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}
```

### `modules/iam/outputs.tf`

```hcl
output "ecs_execution_role_arn" {
  description = "ECS execution role ARN"
  value       = aws_iam_role.ecs_execution.arn
}

output "ecs_task_role_arn" {
  description = "ECS task role ARN"
  value       = aws_iam_role.ecs_task.arn
}
```

---

### `modules/alb/variables.tf`

```hcl
variable "project_name" {
  description = "Project name used as resource naming prefix"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs"
  type        = list(string)
}

variable "alb_security_group" {
  description = "ALB security group ID"
  type        = string
}
```

### `modules/alb/main.tf`

```hcl
# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.project_name}-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = false

  tags = {
    Name        = "${var.project_name}-alb-${var.environment}"
    Environment = var.environment
  }
}

# Target Group
resource "aws_lb_target_group" "main" {
  name        = "${var.project_name}-tg-${var.environment}"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/"
    protocol            = "HTTP"
    matcher             = "200-299"
  }

  tags = {
    Name        = "${var.project_name}-tg-${var.environment}"
    Environment = var.environment
  }
}

# HTTP Listener
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }
}
```

### `modules/alb/outputs.tf`

```hcl
output "alb_arn" {
  description = "ALB ARN"
  value       = aws_lb.main.arn
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.main.dns_name
}

output "target_group_arn" {
  description = "Target group ARN"
  value       = aws_lb_target_group.main.arn
}
```

---

### `modules/ecs/variables.tf`

```hcl
variable "project_name" {
  description = "Project name used as resource naming prefix"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs"
  type        = list(string)
}

variable "ecs_security_group_id" {
  description = "ECS security group ID"
  type        = string
}

variable "ecs_execution_role_arn" {
  description = "ECS execution role ARN"
  type        = string
}

variable "ecs_task_role_arn" {
  description = "ECS task role ARN"
  type        = string
}

variable "alb_target_group_arn" {
  description = "ALB target group ARN"
  type        = string
}

variable "container_image" {
  description = "Container image to deploy"
  type        = string
  default     = "nginx:latest"
}

variable "container_port" {
  description = "Container port"
  type        = number
  default     = 80
}

variable "task_cpu" {
  description = "Task CPU units"
  type        = number
  default     = 256
}

variable "task_memory" {
  description = "Task memory in MB"
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "Desired number of tasks"
  type        = number
  default     = 2
}
```

### `modules/ecs/main.tf`

```hcl
# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "${var.project_name}-cluster-${var.environment}"
    Environment = var.environment
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${var.project_name}-${var.environment}"
  retention_in_days = 30

  tags = {
    Name        = "${var.project_name}-logs-${var.environment}"
    Environment = var.environment
  }
}

# ECS Task Definition
resource "aws_ecs_task_definition" "main" {
  family                   = "${var.project_name}-task-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = var.ecs_execution_role_arn
  task_role_arn            = var.ecs_task_role_arn

  container_definitions = jsonencode([
    {
      name      = "${var.project_name}-container"
      image     = var.container_image
      cpu       = var.task_cpu
      memory    = var.task_memory
      essential = true

      portMappings = [
        {
          containerPort = var.container_port
          hostPort      = var.container_port
          protocol      = "tcp"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = {
    Name        = "${var.project_name}-task-${var.environment}"
    Environment = var.environment
  }
}

# ECS Service
resource "aws_ecs_service" "main" {
  name            = "${var.project_name}-service-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.main.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.alb_target_group_arn
    container_name   = "${var.project_name}-container"
    container_port   = var.container_port
  }

  depends_on = [aws_ecs_task_definition.main]

  tags = {
    Name        = "${var.project_name}-service-${var.environment}"
    Environment = var.environment
  }
}

data "aws_region" "current" {}
```

### `modules/ecs/outputs.tf`

```hcl
output "cluster_id" {
  description = "ECS cluster ID"
  value       = aws_ecs_cluster.main.id
}

output "cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.main.name
}
```

---

### `modules/eventbridge/variables.tf`

```hcl
variable "project_name" {
  description = "Project name used as resource naming prefix"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "allowed_account_ids" {
  description = "List of AWS account IDs allowed to put events to this bus"
  type        = list(string)
  default     = null
}
```

### `modules/eventbridge/main.tf`

```hcl
resource "aws_cloudwatch_event_bus" "main" {
  name = "${var.project_name}-${var.environment}"

  tags = {
    Name        = "${var.project_name}-eventbus-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_event_bus_policy" "main" {
  count          = var.allowed_account_ids != null ? 1 : 0
  event_bus_name = aws_cloudwatch_event_bus.main.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowAccountsToPutEvents"
        Effect = "Allow"
        Principal = {
          AWS = [for account_id in var.allowed_account_ids : "arn:aws:iam::${account_id}:root"]
        }
        Action   = "events:PutEvents"
        Resource = aws_cloudwatch_event_bus.main.arn
      }
    ]
  })
}
```

### `modules/eventbridge/outputs.tf`

```hcl
output "event_bus_name" {
  description = "Name of the EventBridge event bus"
  value       = aws_cloudwatch_event_bus.main.name
}

output "event_bus_arn" {
  description = "ARN of the EventBridge event bus"
  value       = aws_cloudwatch_event_bus.main.arn
}

output "sqs_target_policy_document" {
  description = "IAM policy document for SQS queues to receive events from this bus"
  value = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowEventBridgeToSendMessages"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = "*"
        Condition = {
          ArnLike = {
            "aws:SourceArn" = "${aws_cloudwatch_event_bus.main.arn}/*"
          }
        }
      }
    ]
  })
}
```

---

## Step 4 — Environment Configuration

Create `environments/dev/terraform.tfvars`:

```hcl
aws_region         = "${AWS_REGION}"
project_name       = "${PROJECT_NAME}"
environment        = "${ENVIRONMENT}"
vpc_cidr           = "10.0.0.0/16"
availability_zones = ["${AWS_REGION}a", "${AWS_REGION}b"]
```

Substitute `${PROJECT_NAME}`, `${AWS_REGION}`, and `${ENVIRONMENT}` with actual parsed values.

---

## Step 5 — GitHub Actions Workflows

Create `.github/workflows/claude.yml`:

```yaml
name: Claude Code

on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]
  issues:
    types: [opened, assigned]
  pull_request_review:
    types: [submitted]

jobs:
  claude:
    if: |
      (github.event_name == 'issue_comment' && contains(github.event.comment.body, '@claude')) ||
      (github.event_name == 'pull_request_review_comment' && contains(github.event.comment.body, '@claude')) ||
      (github.event_name == 'pull_request_review' && contains(github.event.review.body, '@claude')) ||
      (github.event_name == 'issues' && (contains(github.event.issue.body, '@claude') || contains(github.event.issue.title, '@claude')))
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
      issues: read
      id-token: write
      actions: read
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - name: Run Claude Code
        id: claude
        uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          additional_permissions: |
            actions: read
```

Create `.github/workflows/claude-code-review.yml`:

```yaml
name: Claude Code Review

on:
  pull_request:
    types: [opened, synchronize, ready_for_review, reopened]

jobs:
  claude-review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
      issues: read
      id-token: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - name: Run Claude Code Review
        id: claude-review
        uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          plugin_marketplaces: 'https://github.com/anthropics/claude-code.git'
          plugins: 'code-review@claude-code-plugins'
          prompt: '/code-review:code-review ${{ github.repository }}/pull/${{ github.event.pull_request.number }}'
```

---

## Step 6 — Validate

Run from inside the cloned repo directory:

```bash
terraform init
terraform validate
```

If `terraform init` fails due to missing AWS credentials, report the error and skip to Step 7 (write files are correct, validation can be done after the user configures AWS access).

If `terraform validate` fails, diagnose the error, fix the affected file(s), and re-run. Do not commit with validation errors.

---

## Step 7 — Initial Commit and Push

```bash
git add .
git commit -m "feat: scaffold standard Terraform ECS Fargate infrastructure for ${PROJECT_NAME}

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push -u origin main
```

---

## Step 8 — Output Summary

Print a summary:

```
✓ Repository created: https://github.com/david-iaggbs/${REPO_NAME}

Modules scaffolded:
  modules/vpc         — VPC, IGW, public/private subnets, NAT GW, route tables, security groups
  modules/iam         — ECS execution role, ECS task role, CloudWatch logs policy
  modules/alb         — Application Load Balancer, target group (IP), HTTP listener
  modules/ecs         — ECS cluster (insights), CloudWatch log group, Fargate task definition, ECS service
  modules/eventbridge — Custom event bus, optional cross-account policy, SQS policy output

Resource naming convention: ${PROJECT_NAME}-<resource-type>-<environment>

Next steps:
  1. Configure an S3 backend in main.tf for remote state
  2. Update container_image in environments/dev/terraform.tfvars (currently nginx:latest)
  3. Run: AWS_PROFILE=<your-profile> terraform apply -var-file="environments/dev/terraform.tfvars"
  4. Add CLAUDE_CODE_OAUTH_TOKEN secret to the GitHub repo for Claude Code Actions
```

---

## Important Rules

1. Never add `allowed-tools` to YAML frontmatter — it is unsupported and causes warnings.
2. Use `project_name` (underscore) in all Terraform identifiers; the repo name uses hyphens.
3. Naming convention for all AWS resources: `${project_name}-${resource_type}-${environment}`.
4. Always keep execution role separate from task role — least privilege principle.
5. ECS tasks always deploy in **private** subnets. Only the ALB uses public subnets.
6. Never commit `.tfstate` files. Only commit `environments/**/*.tfvars`, not root-level `.tfvars`.
7. Run `terraform validate` before committing. Do not commit with validation errors.
8. Set `project_name` in the tfvars file to the user-supplied project name (not the repo name).
9. Repo naming convention: `david-iaggbs/sandbox-swe-dparra--terraform-<project-name>--infra`.
10. Branch naming for subsequent changes: `feat/ITL-5671-<short-description>`.
