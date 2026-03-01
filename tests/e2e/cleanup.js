/**
 * Cleanup script — closes all [TEST] issues in the SA repo.
 * Run automatically as the last step in test-sa-workflows.yml,
 * or manually with: npm run cleanup
 *
 * Requires: GH_TOKEN env var
 */
import { execSync } from 'node:child_process';

const REPO = 'david-iaggbs/sandbox-swe-dparra--solution-architect';

function ghRaw(args) {
  return execSync(`gh ${args}`, { encoding: 'utf8' }).trim();
}

function listTestIssues() {
  const raw = execSync(
    `gh issue list --repo ${REPO} --state open --limit 100 --json number,title,url`,
    { encoding: 'utf8' }
  ).trim();
  const issues = JSON.parse(raw);
  return issues.filter(i => i.title.startsWith('[TEST]'));
}

function closeIssue(number) {
  ghRaw(`issue close ${number} --repo ${REPO} --comment "Closed by automated test cleanup."`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

const testIssues = listTestIssues();

if (testIssues.length === 0) {
  console.log('No [TEST] issues found — nothing to clean up.');
} else {
  console.log(`Found ${testIssues.length} [TEST] issue(s) to close:`);
  for (const issue of testIssues) {
    console.log(`  Closing #${issue.number}: ${issue.title}`);
    try {
      closeIssue(issue.number);
      console.log(`  ✓ Closed #${issue.number}`);
    } catch (err) {
      console.error(`  ✗ Failed to close #${issue.number}: ${err.message}`);
    }
  }
  console.log(`\nCleanup complete. Closed ${testIssues.length} issue(s).`);
}
