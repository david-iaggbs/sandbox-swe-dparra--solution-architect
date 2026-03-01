import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('../../../', import.meta.url).pathname);

function readWorkflow(name) {
  const path = resolve(ROOT, `.github/workflows/${name}`);
  assert.ok(existsSync(path), `Workflow file missing: .github/workflows/${name}`);
  return readFileSync(path, 'utf8');
}

function readTemplate(relativePath) {
  const path = resolve(ROOT, relativePath);
  assert.ok(existsSync(path), `Template file missing: ${relativePath}`);
  return readFileSync(path, 'utf8');
}

// ── Epic Evaluation workflow ─────────────────────────────────────────────────

export function assertEpicEvaluationWorkflowExists() {
  const content = readWorkflow('epic-evaluation.yml');
  assert.ok(content.length > 0, 'epic-evaluation.yml must not be empty');
  return content;
}

export function assertEpicEvaluationTrigger(content) {
  assert.ok(
    content.includes("types: [labeled]"),
    'epic-evaluation.yml must trigger on issues: [labeled]'
  );
  assert.ok(
    !content.includes("types: [opened]"),
    'epic-evaluation.yml must NOT use opened trigger (would fire before label is set)'
  );
}

export function assertEpicEvaluationLabelFilter(content) {
  assert.ok(
    content.includes("github.event.label.name == 'epic'"),
    "epic-evaluation.yml job must filter on github.event.label.name == 'epic'"
  );
}

export function assertEpicEvaluationPermissions(content) {
  assert.ok(content.includes('issues: write'), 'epic-evaluation.yml must have issues: write');
  assert.ok(content.includes('id-token: write'), 'epic-evaluation.yml must have id-token: write');
}

export function assertEpicEvaluationUsesClaudeAction(content) {
  assert.ok(
    content.includes('anthropics/claude-code-action'),
    'epic-evaluation.yml must use anthropics/claude-code-action'
  );
  assert.ok(
    content.includes('CLAUDE_CODE_OAUTH_TOKEN'),
    'epic-evaluation.yml must use CLAUDE_CODE_OAUTH_TOKEN secret'
  );
  assert.ok(
    content.includes('GH_TOKEN'),
    'epic-evaluation.yml must use GH_TOKEN for cross-repo issue creation'
  );
}

export function assertEpicEvaluationPromptCoversAllSteps(content) {
  const steps = [
    'Initiative Mapping',
    'Product Impact',
    'Component Issue Creation',
    'ADR',
    'Summary Comment',
  ];
  for (const step of steps) {
    assert.ok(content.includes(step), `epic-evaluation.yml prompt must cover step: ${step}`);
  }
}

// ── Initiative Intake workflow ───────────────────────────────────────────────

export function assertInitiativeIntakeWorkflowExists() {
  const content = readWorkflow('initiative-intake.yml');
  assert.ok(content.length > 0, 'initiative-intake.yml must not be empty');
  return content;
}

export function assertInitiativeIntakeTrigger(content) {
  assert.ok(
    content.includes('workflow_dispatch'),
    'initiative-intake.yml must support workflow_dispatch trigger'
  );
  assert.ok(
    content.includes('repository_dispatch'),
    'initiative-intake.yml must support repository_dispatch trigger'
  );
  assert.ok(
    content.includes('initiative-created'),
    'initiative-intake.yml must declare initiative-created repository_dispatch type'
  );
  assert.ok(
    !content.includes('projects_v2'),
    'initiative-intake.yml must NOT use projects_v2 (not a valid repo-level trigger)'
  );
}

export function assertInitiativeIntakeInputs(content) {
  assert.ok(
    content.includes('initiative_title'),
    'initiative-intake.yml must declare initiative_title input'
  );
}

export function assertInitiativeIntakePermissions(content) {
  assert.ok(content.includes('issues: write'), 'initiative-intake.yml must have issues: write');
  assert.ok(content.includes('contents: write'), 'initiative-intake.yml must have contents: write');
  assert.ok(
    !content.includes('projects: read'),
    'initiative-intake.yml must NOT declare projects: read (not a valid workflow permission)'
  );
}

export function assertInitiativeIntakePromptCoversAllSteps(content) {
  const steps = ['Domain Fit', 'Product Impact', 'ADR', 'Intake Issue'];
  for (const step of steps) {
    assert.ok(content.includes(step), `initiative-intake.yml prompt must cover step: ${step}`);
  }
}

// ── General Claude workflow ──────────────────────────────────────────────────

export function assertClaudeWorkflowExcludesEpics() {
  const content = readWorkflow('claude.yml');
  assert.ok(
    content.includes("!contains(github.event.issue.labels.*.name, 'epic')"),
    "claude.yml must exclude epic-labeled issues to avoid double-processing"
  );
}

export function assertClaudeWorkflowHasWritePermissions() {
  const content = readWorkflow('claude.yml');
  assert.ok(content.includes('issues: write'), 'claude.yml must have issues: write');
  assert.ok(content.includes('pull-requests: write'), 'claude.yml must have pull-requests: write');
}

// ── Issue templates ──────────────────────────────────────────────────────────

export function assertIssueTemplatesExist() {
  const templates = [
    'templates/issues/design.yml',
    'templates/issues/infra.yml',
    'templates/issues/service.yml',
    'templates/issues/ui.yml',
  ];
  for (const t of templates) {
    readTemplate(t); // throws if missing
  }
}

export function assertIssueTemplateHasRequiredFields(templatePath) {
  const content = readTemplate(templatePath);
  const requiredFields = ['Originating Epic', 'Initiative', 'Context', 'Acceptance Criteria'];
  for (const field of requiredFields) {
    assert.ok(content.includes(field), `${templatePath} must contain field: ${field}`);
  }
}

export function assertDesignTemplateHasSpecTypeDropdown() {
  const content = readTemplate('templates/issues/design.yml');
  assert.ok(content.includes('Endpoint spec'), 'design.yml must include Endpoint spec option');
  assert.ok(content.includes('Event contract'), 'design.yml must include Event contract option');
}

export function assertInfraTemplateHasIamField() {
  const content = readTemplate('templates/issues/infra.yml');
  assert.ok(content.includes('IAM'), 'infra.yml must include IAM & Security field');
}

export function assertServiceTemplateRequiresDesignSpec() {
  const content = readTemplate('templates/issues/service.yml');
  assert.ok(
    content.includes('Design Specification'),
    'service.yml must require a link to an approved design spec'
  );
}

export function assertUiTemplateRequiresDesignSpec() {
  const content = readTemplate('templates/issues/ui.yml');
  assert.ok(
    content.includes('Design Specification'),
    'ui.yml must require a link to an approved design spec'
  );
}

// ── ADR infrastructure ───────────────────────────────────────────────────────

export function assertAdrTemplateExists() {
  readTemplate('adr/template.md');
}

export function assertAdrTemplateHasRequiredSections() {
  const content = readTemplate('adr/template.md');
  const sections = ['Context', 'Decision', 'Options Considered', 'Rationale', 'Consequences'];
  for (const s of sections) {
    assert.ok(content.includes(s), `adr/template.md must contain section: ${s}`);
  }
}

export function assertAdrReadmeExists() {
  const content = readTemplate('adr/README.md');
  assert.ok(content.includes('## Index'), 'adr/README.md must contain an ## Index section');
}

// ── CLAUDE.md ────────────────────────────────────────────────────────────────

export function assertClaudeMdHasIssueCreationRules() {
  const content = readTemplate('.claude/CLAUDE.md');
  assert.ok(
    content.includes('gh issue create'),
    '.claude/CLAUDE.md must document the gh issue create pattern'
  );
  assert.ok(
    content.includes('templates/issues/'),
    '.claude/CLAUDE.md must reference templates/issues/'
  );
}
