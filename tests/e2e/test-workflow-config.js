/**
 * Static configuration tests — validate that all workflow files, templates,
 * and CLAUDE.md are correctly structured. No GitHub credentials required.
 * These always run, even in pull requests.
 */
import { describe, it } from 'node:test';
import {
  assertEpicEvaluationWorkflowExists,
  assertEpicEvaluationTrigger,
  assertEpicEvaluationLabelFilter,
  assertEpicEvaluationPermissions,
  assertEpicEvaluationUsesClaudeAction,
  assertEpicEvaluationPromptCoversAllSteps,
  assertInitiativeIntakeWorkflowExists,
  assertInitiativeIntakeTrigger,
  assertInitiativeIntakeInputs,
  assertInitiativeIntakePermissions,
  assertInitiativeIntakePromptCoversAllSteps,
  assertClaudeWorkflowExcludesEpics,
  assertClaudeWorkflowHasWritePermissions,
  assertIssueTemplatesExist,
  assertIssueTemplateHasRequiredFields,
  assertDesignTemplateHasSpecTypeDropdown,
  assertInfraTemplateHasIamField,
  assertServiceTemplateRequiresDesignSpec,
  assertUiTemplateRequiresDesignSpec,
  assertAdrTemplateExists,
  assertAdrTemplateHasRequiredSections,
  assertAdrReadmeExists,
  assertClaudeMdHasIssueCreationRules,
} from './helpers/assert-workflow-config.js';

// ── Epic Evaluation Workflow ─────────────────────────────────────────────────

describe('epic-evaluation.yml', () => {
  let content;

  it('file exists and is not empty', () => {
    content = assertEpicEvaluationWorkflowExists();
  });

  it('triggers on issues: labeled (not opened)', () => {
    assertEpicEvaluationTrigger(content);
  });

  it('job is filtered to epic label only', () => {
    assertEpicEvaluationLabelFilter(content);
  });

  it('has issues: write and id-token: write permissions', () => {
    assertEpicEvaluationPermissions(content);
  });

  it('uses anthropics/claude-code-action with CLAUDE_CODE_OAUTH_TOKEN and GH_TOKEN', () => {
    assertEpicEvaluationUsesClaudeAction(content);
  });

  it('prompt covers all 5 evaluation steps', () => {
    assertEpicEvaluationPromptCoversAllSteps(content);
  });
});

// ── Initiative Intake Workflow ───────────────────────────────────────────────

describe('initiative-intake.yml', () => {
  let content;

  it('file exists and is not empty', () => {
    content = assertInitiativeIntakeWorkflowExists();
  });

  it('uses workflow_dispatch and repository_dispatch triggers (not projects_v2)', () => {
    assertInitiativeIntakeTrigger(content);
  });

  it('declares initiative_title input for workflow_dispatch', () => {
    assertInitiativeIntakeInputs(content);
  });

  it('has issues: write and contents: write, but not projects: read', () => {
    assertInitiativeIntakePermissions(content);
  });

  it('prompt covers all 4 evaluation steps', () => {
    assertInitiativeIntakePromptCoversAllSteps(content);
  });
});

// ── General Claude Workflow ──────────────────────────────────────────────────

describe('claude.yml', () => {
  it('excludes epic-labeled issues to prevent double-processing', () => {
    assertClaudeWorkflowExcludesEpics();
  });

  it('has issues: write and pull-requests: write', () => {
    assertClaudeWorkflowHasWritePermissions();
  });
});

// ── Issue Templates ──────────────────────────────────────────────────────────

describe('templates/issues/', () => {
  it('all four template files exist (design, infra, service, ui)', () => {
    assertIssueTemplatesExist();
  });

  for (const tpl of ['design.yml', 'infra.yml', 'service.yml', 'ui.yml']) {
    it(`templates/issues/${tpl} has required fields (Epic, Initiative, Context, Acceptance Criteria)`, () => {
      assertIssueTemplateHasRequiredFields(`templates/issues/${tpl}`);
    });
  }

  it('design.yml has spec-type dropdown with Endpoint spec and Event contract options', () => {
    assertDesignTemplateHasSpecTypeDropdown();
  });

  it('infra.yml has IAM & Security field', () => {
    assertInfraTemplateHasIamField();
  });

  it('service.yml requires a link to an approved design specification', () => {
    assertServiceTemplateRequiresDesignSpec();
  });

  it('ui.yml requires a link to an approved design specification', () => {
    assertUiTemplateRequiresDesignSpec();
  });
});

// ── ADR Infrastructure ───────────────────────────────────────────────────────

describe('adr/', () => {
  it('adr/template.md exists', () => {
    assertAdrTemplateExists();
  });

  it('adr/template.md has all required sections', () => {
    assertAdrTemplateHasRequiredSections();
  });

  it('adr/README.md exists and has an ## Index section', () => {
    assertAdrReadmeExists();
  });
});

// ── CLAUDE.md ────────────────────────────────────────────────────────────────

describe('.claude/CLAUDE.md', () => {
  it('documents gh issue create pattern and references templates/issues/', () => {
    assertClaudeMdHasIssueCreationRules();
  });
});
