# Decider Checklist

The decider accepts a task only after deterministic gates pass and reviewer
findings converge. Record the decision in `tasks/DECIDER_DECISION.json`.

## Required Gates

- `base-ancestor` — `tasks/START_GATE.json` records declared Base SHA, `HEAD`,
  and a passing `git merge-base --is-ancestor <Base SHA> HEAD` result.
- `branch-coverage` — selected in-scope branches have passing
  harness-generated target replay evidence.
- `adapter-quarantine` — QNT witness protocol names are contained in adapter
  modules.
- `engine-depth` — production modules, domain APIs, adapter modules, and next
  reuse are recorded in `tasks/ENGINE_DEPTH_MANIFEST.json`.
- `state-owner-derivability` — durable fields are recorded in
  `tasks/STATE_OWNER_MANIFEST.json` with owner and derivability.
- `authored-identity-dispatch` — production runtime semantics do not branch on
  authored identity.
- `report-honesty` — validation report coverage rows are derived from target
  replay evidence, not diagnostic tests or prose.
- `reviewer-loop-convergence` — all reasonable reviewer findings are fixed or
  explicitly rejected with rationale.

## Reject Immediately

- Missing or failed Base SHA ancestor check.
- Missing source branch inventory or stale target replay evidence.
- Any selected in-scope branch without passing target QNT/MBT replay evidence.
- Public production symbol derived from a QNT action or witness field name.
- Durable field without owner and derivability classification.
- Unresolved reasonable reviewer finding.
- Validation report row that marks diagnostic target-language tests as MBT
  coverage.

## Verification Commands

{{verificationCommandsMarkdown}}
