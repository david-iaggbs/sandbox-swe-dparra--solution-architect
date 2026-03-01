import assert from 'node:assert/strict';

/**
 * Assert that the summary comment posted by Claude on an epic issue
 * contains the expected structural sections.
 */
export function assertSummaryCommentStructure(comments) {
  assert.ok(comments.length > 0, 'Claude must post at least one comment on the epic issue');

  // Find the comment that looks like the evaluation summary
  const summary = comments.find(c =>
    c.body.includes('Initiative') ||
    c.body.includes('Affected product') ||
    c.body.includes('Issues created') ||
    c.body.includes('Epic Evaluation')
  );

  assert.ok(
    summary,
    'Claude must post a summary comment containing evaluation results (Initiative, Affected products, Issues created)'
  );
  return summary;
}

export function assertSummaryHasInitiativeSection(commentBody) {
  assert.ok(
    commentBody.includes('Initiative'),
    'Summary comment must include an Initiative section'
  );
}

export function assertSummaryHasAffectedProducts(commentBody) {
  assert.ok(
    commentBody.includes('product') || commentBody.includes('Product'),
    'Summary comment must mention affected products'
  );
}

export function assertSummaryHasIssuesTable(commentBody) {
  assert.ok(
    commentBody.includes('Issues created') || commentBody.includes('| Repo |') || commentBody.includes('github.com'),
    'Summary comment must include a table or list of created issues'
  );
}

export function assertSummaryHasAdrSection(commentBody) {
  assert.ok(
    commentBody.includes('ADR'),
    'Summary comment must include an ADR section (even if "not required")'
  );
}

/**
 * Assert the full evaluation summary structure.
 */
export function assertEpicEvaluationComment(comments) {
  const summary = assertSummaryCommentStructure(comments);
  assertSummaryHasInitiativeSection(summary.body);
  assertSummaryHasAffectedProducts(summary.body);
  assertSummaryHasIssuesTable(summary.body);
  assertSummaryHasAdrSection(summary.body);
}
