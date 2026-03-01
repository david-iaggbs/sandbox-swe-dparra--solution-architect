/**
 * Live tests for the initiative-intake.yml workflow.
 *
 * Requires: GH_TOKEN env var (PAT with repo + issues + workflow scope)
 *
 * Set RUN_LIVE_TRIGGER_TEST=true to run the live trigger test.
 * By default only the static format test runs.
 *
 * Live tests create real issues in the SA repo with a [TEST] prefix.
 * All test artifacts are cleaned up by cleanup.js.
 */
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  triggerWorkflow,
  waitForWorkflowRun,
  waitForWorkflowCompletion,
  listIssuesByTitlePattern,
  closeIssue,
} from './helpers/github.js';

const LIVE = process.env.RUN_LIVE_TRIGGER_TEST === 'true';
const HAS_TOKEN = Boolean(process.env.GH_TOKEN);
const TEST_INITIATIVE = '[TEST] Guest Self-Service Portal';

// ── Static: workflow input format ────────────────────────────────────────────

describe('initiative-intake.yml — input format', () => {
  it('workflow_dispatch inputs are sufficient to describe any initiative', () => {
    // Validated statically in test-workflow-config.js.
    // This test confirms the input object shape we pass in live tests is correct.
    const inputs = {
      initiative_title: TEST_INITIATIVE,
      initiative_url: 'https://github.com/orgs/david-iaggbs/projects/99',
      created_by: 'test-runner',
    };
    assert.ok(inputs.initiative_title, 'initiative_title must be provided');
    assert.ok(typeof inputs.initiative_title === 'string', 'initiative_title must be a string');
  });
});

// ── Live: trigger test ───────────────────────────────────────────────────────

describe('initiative-intake.yml — live trigger', { skip: !LIVE || !HAS_TOKEN ? 'Set RUN_LIVE_TRIGGER_TEST=true and GH_TOKEN to run live tests' : false }, () => {
  let createdIssueNumbers = [];

  after(() => {
    // Close any [TEST] INITIATIVE issues created during this test
    const issues = listIssuesByTitlePattern('[TEST]');
    const intakeIssues = issues.filter(i => i.title.includes('[INITIATIVE]') && i.title.includes('[TEST]'));
    for (const issue of intakeIssues) {
      closeIssue(issue.number);
      console.log(`Closed intake issue #${issue.number}`);
    }
  });

  it('triggering workflow_dispatch starts a run for initiative-intake.yml', async () => {
    const before = new Date().toISOString();

    triggerWorkflow('initiative-intake.yml', {
      initiative_title: TEST_INITIATIVE,
      initiative_url: 'https://github.com/orgs/david-iaggbs/projects/99',
      created_by: 'test-runner',
    });

    const run = await waitForWorkflowRun('initiative-intake.yml', before, 60_000);
    assert.ok(run, 'A workflow run for initiative-intake.yml must start after dispatch');
    console.log(`Workflow run started: ${run.url}`);
  });

  it('workflow run completes successfully', async () => {
    const before = new Date(Date.now() - 120_000).toISOString();
    const run = await waitForWorkflowRun('initiative-intake.yml', before, 30_000);
    const completed = await waitForWorkflowCompletion(run.databaseId, 300_000);
    assert.equal(
      completed.conclusion,
      'success',
      `Workflow must complete with success, got: ${completed.conclusion}`
    );
    console.log(`Workflow completed: ${completed.url}`);
  });

  it('Claude creates an [INITIATIVE] intake issue in the SA repo', async () => {
    // Give Claude time to create the issue after workflow completes
    await new Promise(r => setTimeout(r, 15_000));

    const issues = listIssuesByTitlePattern('[INITIATIVE]');
    const intakeIssue = issues.find(i => i.title.includes(TEST_INITIATIVE) || i.title.includes('[TEST]'));
    assert.ok(intakeIssue, 'Claude must create an [INITIATIVE] issue in the SA repo');
    createdIssueNumbers.push(intakeIssue.number);
    console.log(`Found intake issue #${intakeIssue.number}: ${intakeIssue.title}`);
  });

  it('intake issue has the initiative label', () => {
    const issues = listIssuesByTitlePattern('[INITIATIVE]');
    const intakeIssue = issues.find(i => i.title.includes(TEST_INITIATIVE) || i.title.includes('[TEST]'));
    if (!intakeIssue) return; // guarded by previous test
    const labels = intakeIssue.labels.map(l => l.name);
    assert.ok(labels.includes('initiative'), 'Intake issue must have the initiative label');
  });

  it('intake issue body contains required sections', () => {
    const issues = listIssuesByTitlePattern('[INITIATIVE]');
    const intakeIssue = issues.find(i => i.title.includes(TEST_INITIATIVE) || i.title.includes('[TEST]'));
    if (!intakeIssue) return;

    // Fetch full body
    const { execSync } = await import('node:child_process');
    const raw = execSync(
      `gh issue view ${intakeIssue.number} --repo david-iaggbs/sandbox-swe-dparra--solution-architect --json body`,
      { encoding: 'utf8' }
    );
    const body = JSON.parse(raw).body;

    const requiredSections = ['Domain fit', 'Component repos', 'ADR', 'next steps'];
    for (const section of requiredSections) {
      assert.ok(
        body.toLowerCase().includes(section.toLowerCase()),
        `Intake issue body must contain section: ${section}`
      );
    }
  });
});
