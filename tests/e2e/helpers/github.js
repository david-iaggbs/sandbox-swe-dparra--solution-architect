import { execSync } from 'node:child_process';

const REPO = 'david-iaggbs/sandbox-swe-dparra--solution-architect';
const ORG  = 'david-iaggbs';

/** Run a gh command and return parsed JSON output. */
export function gh(args) {
  const out = execSync(`gh ${args} --json`, { encoding: 'utf8' }).trim();
  return JSON.parse(out);
}

/** Run a gh command and return raw string output. */
export function ghRaw(args) {
  return execSync(`gh ${args}`, { encoding: 'utf8' }).trim();
}

/**
 * Create a GitHub issue in the SA repo with a [TEST] title prefix.
 * Returns the created issue object { number, url }.
 */
export function createTestIssue({ title, body = '', labels = [] }) {
  const labelFlags = labels.map(l => `--label "${l}"`).join(' ');
  const result = ghRaw(
    `issue create --repo ${REPO} --title "[TEST] ${title}" --body "${body.replace(/"/g, '\\"')}" ${labelFlags}`
  );
  // gh issue create returns the URL of the created issue
  const url = result.trim();
  const number = parseInt(url.split('/').pop(), 10);
  return { number, url };
}

/**
 * Add a label to an existing issue.
 */
export function addLabelToIssue(issueNumber, label) {
  ghRaw(`issue edit ${issueNumber} --repo ${REPO} --add-label "${label}"`);
}

/**
 * Close an issue with a comment explaining it is a test artifact.
 */
export function closeIssue(issueNumber, repo = REPO) {
  ghRaw(`issue close ${issueNumber} --repo ${repo} --comment "Closed by automated test cleanup."`);
}

/**
 * List all open issues in the SA repo whose title contains a pattern.
 * Returns array of { number, title, url, labels }.
 */
export function listIssuesByTitlePattern(pattern) {
  const raw = execSync(
    `gh issue list --repo ${REPO} --state open --limit 100 --json number,title,url,labels`,
    { encoding: 'utf8' }
  ).trim();
  const issues = JSON.parse(raw);
  return issues.filter(i => i.title.includes(pattern));
}

/**
 * Get comments on an issue. Returns array of { body, createdAt }.
 */
export function getIssueComments(issueNumber, repo = REPO) {
  const raw = execSync(
    `gh issue view ${issueNumber} --repo ${repo} --json comments`,
    { encoding: 'utf8' }
  ).trim();
  return JSON.parse(raw).comments;
}

/**
 * Get the label names on an issue.
 */
export function getIssueLabelNames(issueNumber, repo = REPO) {
  const raw = execSync(
    `gh issue view ${issueNumber} --repo ${repo} --json labels`,
    { encoding: 'utf8' }
  ).trim();
  return JSON.parse(raw).labels.map(l => l.name);
}

/**
 * Trigger a workflow_dispatch on a workflow file in the SA repo.
 * `inputs` is an object of input name → value.
 */
export function triggerWorkflow(workflowFile, inputs = {}) {
  const inputFlags = Object.entries(inputs)
    .map(([k, v]) => `-f ${k}="${v}"`)
    .join(' ');
  ghRaw(`workflow run ${workflowFile} --repo ${REPO} ${inputFlags}`);
}

/**
 * Poll for a workflow run triggered after `afterTimestamp` (ISO string).
 * Returns the run object when found, or throws after `timeoutMs`.
 */
export async function waitForWorkflowRun(workflowFile, afterTimestamp, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(5_000);
    const raw = execSync(
      `gh run list --repo ${REPO} --workflow ${workflowFile} --limit 5 --json databaseId,status,conclusion,createdAt,url`,
      { encoding: 'utf8' }
    ).trim();
    const runs = JSON.parse(raw);
    const run = runs.find(r => new Date(r.createdAt) >= new Date(afterTimestamp));
    if (run) return run;
  }
  throw new Error(`Timeout: no workflow run for ${workflowFile} found within ${timeoutMs}ms`);
}

/**
 * Poll until a workflow run reaches a terminal status (completed/failure/cancelled).
 * Returns the final run object.
 */
export async function waitForWorkflowCompletion(runId, timeoutMs = 300_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(10_000);
    const raw = execSync(
      `gh run view ${runId} --repo ${REPO} --json status,conclusion,url`,
      { encoding: 'utf8' }
    ).trim();
    const run = JSON.parse(raw);
    if (run.status === 'completed') return run;
  }
  throw new Error(`Timeout: workflow run ${runId} did not complete within ${timeoutMs}ms`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
