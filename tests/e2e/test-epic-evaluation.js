/**
 * Live tests for the epic-evaluation.yml workflow.
 *
 * Requires: GH_TOKEN env var (PAT with repo + issues scope)
 *
 * Set RUN_LIVE_TRIGGER_TEST=true to run the live trigger test.
 * By default only the static trigger verification test runs.
 *
 * Live tests create real issues in the SA repo with a [TEST] prefix.
 * All test artifacts are cleaned up by cleanup.js.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createTestIssue,
  addLabelToIssue,
  closeIssue,
  getIssueComments,
  waitForWorkflowRun,
  waitForWorkflowCompletion,
} from './helpers/github.js';
import {
  assertEpicEvaluationComment,
} from './helpers/assert-epic-evaluation.js';

const LIVE = process.env.RUN_LIVE_TRIGGER_TEST === 'true';
const HAS_TOKEN = Boolean(process.env.GH_TOKEN);
const ROOT = resolve(new URL('../../', import.meta.url).pathname);

// ── Static: fixture validation ───────────────────────────────────────────────

describe('sample-epic fixture', () => {
  it('fixture file exists and has required sections', () => {
    const content = readFileSync(
      resolve(ROOT, 'tests/e2e/fixtures/sample-epic.txt'),
      'utf8'
    );
    assert.ok(content.includes('Business Objective'), 'fixture must describe a business objective');
    assert.ok(content.includes('Scope'), 'fixture must define scope');
    assert.ok(content.includes('Affected domains'), 'fixture must list affected domains');
    assert.ok(content.includes('Constraints'), 'fixture must list constraints');
  });
});

// ── Live: trigger test ───────────────────────────────────────────────────────

describe('epic-evaluation.yml — live trigger', { skip: !LIVE || !HAS_TOKEN ? 'Set RUN_LIVE_TRIGGER_TEST=true and GH_TOKEN to run live tests' : false }, () => {
  let issueNumber;
  let issueUrl;

  before(() => {
    const epicBody = readFileSync(
      resolve(ROOT, 'tests/e2e/fixtures/sample-epic.txt'),
      'utf8'
    );
    const created = createTestIssue({
      title: 'Cancel bookings online (automated test)',
      body: epicBody,
      labels: [],  // label added separately to trigger the workflow via labeled event
    });
    issueNumber = created.number;
    issueUrl = created.url;
    console.log(`Created test issue #${issueNumber}: ${issueUrl}`);
  });

  after(() => {
    if (issueNumber) {
      closeIssue(issueNumber);
      console.log(`Closed test issue #${issueNumber}`);
    }
  });

  it('applying the epic label triggers the epic-evaluation workflow', async () => {
    const before = new Date().toISOString();

    // Applying the label triggers the workflow
    addLabelToIssue(issueNumber, 'epic');

    const run = await waitForWorkflowRun('epic-evaluation.yml', before, 60_000);
    assert.ok(run, 'A workflow run for epic-evaluation.yml must start after the epic label is applied');
    console.log(`Workflow run started: ${run.url}`);
  });

  it('workflow run completes successfully', async () => {
    // Get the most recent run
    const before = new Date(Date.now() - 120_000).toISOString(); // look back 2 min
    const run = await waitForWorkflowRun('epic-evaluation.yml', before, 30_000);
    const completed = await waitForWorkflowCompletion(run.databaseId, 300_000);
    assert.equal(completed.conclusion, 'success', `Workflow must complete with success, got: ${completed.conclusion}`);
    console.log(`Workflow completed: ${completed.url}`);
  });

  it('Claude posts a structured summary comment on the epic issue', async () => {
    // Give Claude a few seconds to post the comment after the workflow completes
    await new Promise(r => setTimeout(r, 10_000));
    const comments = getIssueComments(issueNumber);
    assertEpicEvaluationComment(comments);
    console.log(`Found ${comments.length} comment(s) on issue #${issueNumber}`);
  });
});
