# Ralph L1-2 Cleanroom Exhaustive Generation

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L12CEG-01-CHECKER-LANDING-AND-STRICT-GATE",
      "status": "done",
      "title": "Checker Landing And Strict Gate"
    },
    {
      "number": 2,
      "id": "L12CEG-02-L12-ARTIFACT-PACKAGE-INCLUSION",
      "status": "done",
      "title": "L12 Artifact Package Inclusion"
    },
    {
      "number": 3,
      "id": "L12CEG-03-SCAFFOLD-L12-CONTRACT",
      "status": "done",
      "title": "Scaffold L12 Contract"
    },
    {
      "number": 4,
      "id": "L12CEG-04-TARGET-REPLAY-EVIDENCE-SCHEMA-GATE",
      "status": "done",
      "title": "Target Replay Evidence Schema Gate"
    },
    {
      "number": 5,
      "id": "L12CEG-05-REPLAY-BATCH-PARTITION-PLAN",
      "status": "done",
      "title": "Replay Batch Partition Plan"
    }
  ]
}
-->

## Purpose

This is the implementation plan produced by `plans/RALPH_L12_CLEANROOM_GENERATION_READINESS.md`. It prepares the SRD level 1-2 cleanroom generation lane for future Ralph target replay by landing source gates, packaging the current L1-2 artifacts, updating cleanroom scaffold contracts, defining replay-evidence validation, and planning replay batch partitioning.

This pass is not target replay execution. It must not claim generated cleanrooms have replayed every L1-2 row. It records the preparation work future Ralph runs will execute.

This plan is SRD-only. PHB+ and synthetic non-SRD catalog identities are out of scope. Runtime behavior must route through generic facts, procedure shapes, runtime state, and support-profile admission facts, never through authored ids, names, slugs, source headings, page references, or catalog labels.

## Research Inputs

- `plans/RALPH_L12_CLEANROOM_GENERATION_READINESS.md`
- `plans/ralph-artifacts/l12-cleanroom-generation/README.md`
- `plans/ralph-artifacts/l12-cleanroom-generation/baseline-reconciliation.json`
- `plans/ralph-artifacts/l12-cleanroom-generation/srd-l12-denominator.json`
- `plans/ralph-artifacts/l12-cleanroom-generation/srd-l12-denominator.schema.json`
- `plans/ralph-artifacts/l12-cleanroom-generation/capability-fact-contract.schema.json`
- `plans/ralph-artifacts/l12-cleanroom-generation/capability-fact-coverage-matrix.json`
- `plans/ralph-artifacts/l12-cleanroom-generation/route-proof-inventory.json`
- `plans/ralph-artifacts/l12-cleanroom-generation/srd-row-generic-fact-map.json`
- `plans/ralph-artifacts/l12-cleanroom-generation/srd-row-generic-fact-map.schema.json`
- `plans/ralph-artifacts/l12-cleanroom-generation/verifier-gate-spec.json`
- `plans/ralph-artifacts/l12-cleanroom-generation/exhaustive-task-graph.json`
- `scripts/l12-cleanroom-generation-check.cjs`
- `scripts/sync-cleanroom-input.cjs`
- `scripts/render-cleanroom-scaffold.cjs`
- `scripts/check-cleanroom-harness.cjs`
- `scripts/package-cleanroom-refresh.cjs`

## Current Accounting

- Denominator rows: 400
- Executable cleanroom rows: 146
- Route proof inventory rows: 107
- Executable rows with route proof candidates from the current heuristic join: 146
- Executable rows still requiring explicit mapping/proof work: 0
- Explicit per-Unit route-proof resolution tasks: 0
- Future replay partition batches: 56
- Current strict source mapping/proof gates: pass in this worktree
- Current generated cleanroom target replay closure for every L1-2 executable row: not claimed by this plan

The missing-proof count is intentionally conservative. It means the generated mapping could not prove a row-to-route join from current artifact names and structured fields; it is not proof that no connector exists.

## Non-Omittable Gates

| Gate | Covered By |
| --- | --- |
| SRD level 1-2 denominator source gate | `L12CEG-01-CHECKER-LANDING-AND-STRICT-GATE` |
| L1-2 artifact package inclusion for denominator, capability matrix, route inventory, mapping, and verifier spec | `L12CEG-02-L12-ARTIFACT-PACKAGE-INCLUSION` |
| Scaffold contract telling generated cleanrooms to consume the L1-2 artifacts | `L12CEG-03-SCAFFOLD-L12-CONTRACT` |
| Structural replay-evidence schema gate that rejects grouped selected-identity evidence as proof | `L12CEG-04-TARGET-REPLAY-EVIDENCE-SCHEMA-GATE` |
| Follow-up Ralph replay batch partition plan for the 146 executable rows | `L12CEG-05-REPLAY-BATCH-PARTITION-PLAN` |

## DAG

| Task | Depends On |
| --- | --- |
| `L12CEG-01-CHECKER-LANDING-AND-STRICT-GATE` | none |
| `L12CEG-02-L12-ARTIFACT-PACKAGE-INCLUSION` | `L12CEG-01-CHECKER-LANDING-AND-STRICT-GATE` |
| `L12CEG-03-SCAFFOLD-L12-CONTRACT` | `L12CEG-01-CHECKER-LANDING-AND-STRICT-GATE`, `L12CEG-02-L12-ARTIFACT-PACKAGE-INCLUSION` |
| `L12CEG-04-TARGET-REPLAY-EVIDENCE-SCHEMA-GATE` | `L12CEG-01-CHECKER-LANDING-AND-STRICT-GATE`, `L12CEG-02-L12-ARTIFACT-PACKAGE-INCLUSION`, `L12CEG-03-SCAFFOLD-L12-CONTRACT` |
| `L12CEG-05-REPLAY-BATCH-PARTITION-PLAN` | `L12CEG-01-CHECKER-LANDING-AND-STRICT-GATE`, `L12CEG-02-L12-ARTIFACT-PACKAGE-INCLUSION`, `L12CEG-03-SCAFFOLD-L12-CONTRACT`, `L12CEG-04-TARGET-REPLAY-EVIDENCE-SCHEMA-GATE` |

## Global Verification

Every task must start with the Ralph task-base check from `AGENTS.md` using
the Base SHA provided by the Ralph runner/task metadata: log the declared Base
SHA, log `HEAD`, and run `git merge-base --is-ancestor <Base SHA> HEAD`.
This generated plan does not fabricate a Base SHA. If the runner provides no
Base SHA, record `Plan Impact: update-required` for missing task metadata
instead of guessing.

Every task must also run the reviewer loop for RAW traceability, ubiquitous-language/domain language, architecture/connascence, cleanroom-authored-identity, Ralph task quality, and code-review findings. Fix every reasonable finding; reject only with a concrete reason. Each task's verification must include the project-required reviewer-loop convergence and RAW/ubiquitous-language check.

Plan-maintenance verification for this file:

- Parse the embedded `ralph-task-index` JSON.
- Confirm every indexed task has a matching `### Task N - ID` body.
- Confirm task dependencies form an acyclic graph.
- Run `pnpm check:l12-cleanroom-generation:strict`.
- Run `pnpm cleanroom-scaffold:check`.
- Run `pnpm cleanroom-harness:check`.
- Run `pnpm unit-profile-coverage:check`.
- Run `git diff --check`.
- Review that tasks are one-agent-session scoped, do not hide target replay implementation inside plan-writing, do not treat grouped selected-identity evidence as accepted cleanroom proof, and do not introduce PHB+ or synthetic non-SRD catalog identity.

## Task Details

### Task 1 - L12CEG-01-CHECKER-LANDING-AND-STRICT-GATE

Status: `done`

Goal:

Complete the checker-source-gate work named by this task without changing production runtime behavior or claiming target replay closure.

Input:

- `scripts/l12-cleanroom-generation-check.cjs`
- `package.json`
- `plans/ralph-artifacts/l12-cleanroom-generation/*.json`

Output:

- root script wiring for pnpm check:l12-cleanroom-generation:strict
- strict checker source and self-test coverage

Validation:

- `pnpm check:l12-cleanroom-generation:strict`
- `git diff --check`

Success Criteria:

- Strict checker validates current L1-2 source artifacts
- Checker rejects stale hashes and inconsistent artifact structure
- No production runtime behavior changes
- No target replay closure is claimed for executable rows

Dependencies:

- none

One-Agent-Session Scope:

One checker landing/source-wiring task; no runtime reducers, target harness implementation, or replay results.

Forbidden Shortcuts:

- Do not dispatch production runtime behavior on authored ids, names, slugs, source headings, page references, official catalog labels, or fixture labels.
- Do not count grouped selected-identity evidence as accepted cleanroom route proof without focused generic `qRoute`, focused generic `qComponentRoute`, or equivalent machine proof.
- Do not duplicate runtime facts already owned by Surface, rules-kernel, QNT, runtime context, or cleanroom guidance.
- Do not include PHB+ or synthetic non-SRD catalog identity.
- Do not mark the 146 executable rows accepted before target replay evidence exists and passes.

Reviewer Loop:

Run RAW/domain, architecture/connascence, cleanroom-authored-identity, Ralph task-quality, and code-review passes. Fix every reasonable finding and document concrete reasons for rejected notes. Confirm this task remains source/scaffold/checker planning or future replay partition planning unless it is a later replay execution task.

Plan Impact:

`update-required` if this task changes generated artifact shape or task dependencies; otherwise `none`.

### Task 2 - L12CEG-02-L12-ARTIFACT-PACKAGE-INCLUSION

Status: `done`

Goal:

Complete the artifact-package-inclusion work named by this task without changing production runtime behavior or claiming target replay closure.

Input:

- `plans/ralph-artifacts/l12-cleanroom-generation/srd-l12-denominator.json`
- `plans/ralph-artifacts/l12-cleanroom-generation/capability-fact-coverage-matrix.json`
- `plans/ralph-artifacts/l12-cleanroom-generation/route-proof-inventory.json`
- `plans/ralph-artifacts/l12-cleanroom-generation/srd-row-generic-fact-map.json`
- `plans/ralph-artifacts/l12-cleanroom-generation/verifier-gate-spec.json`
- `scripts/sync-cleanroom-input.cjs`
- `scripts/package-cleanroom-refresh.cjs`

Output:

- cleanroom package/sync includes the five L1-2 source artifacts
- package validation requires the copied artifacts

Validation:

- `pnpm check:l12-cleanroom-generation:strict`
- `pnpm cleanroom-scaffold:check`
- `git diff --check`

Success Criteria:

- Generated cleanrooms can access all required L1-2 artifacts
- Manifest hashes preserve artifact identity
- Packaged artifacts remain source inputs, not accepted replay evidence

Dependencies:

- `L12CEG-01-CHECKER-LANDING-AND-STRICT-GATE`

One-Agent-Session Scope:

One source-sync/package-inclusion task; no replay batches or runtime acceptance logic.

Forbidden Shortcuts:

- Do not dispatch production runtime behavior on authored ids, names, slugs, source headings, page references, official catalog labels, or fixture labels.
- Do not count grouped selected-identity evidence as accepted cleanroom route proof without focused generic `qRoute`, focused generic `qComponentRoute`, or equivalent machine proof.
- Do not duplicate runtime facts already owned by Surface, rules-kernel, QNT, runtime context, or cleanroom guidance.
- Do not include PHB+ or synthetic non-SRD catalog identity.
- Do not mark the 146 executable rows accepted before target replay evidence exists and passes.

Reviewer Loop:

Run RAW/domain, architecture/connascence, cleanroom-authored-identity, Ralph task-quality, and code-review passes. Fix every reasonable finding and document concrete reasons for rejected notes. Confirm this task remains source/scaffold/checker planning or future replay partition planning unless it is a later replay execution task.

Plan Impact:

`update-required` if this task changes generated artifact shape or task dependencies; otherwise `none`.

### Task 3 - L12CEG-03-SCAFFOLD-L12-CONTRACT

Status: `done`

Goal:

Complete the scaffold-contract work named by this task without changing production runtime behavior or claiming target replay closure.

Input:

- `plans/cleanroom-scaffolds/**/*.template.*`
- `scripts/render-cleanroom-scaffold.cjs`
- `plans/ralph-artifacts/l12-cleanroom-generation/verifier-gate-spec.json`

Output:

- scaffold text names the L1-2 artifact contract
- scaffold self-tests fail if the contract disappears

Validation:

- `pnpm cleanroom-scaffold:check`
- `pnpm check:l12-cleanroom-generation:strict`
- `git diff --check`

Success Criteria:

- Generated cleanroom tasks know where to find and how to cite L1-2 artifacts
- Scaffold wording keeps provenance, structured input, and runtime projection distinct
- Scaffold does not claim tasks 1-5 prove target replay closure

Dependencies:

- `L12CEG-01-CHECKER-LANDING-AND-STRICT-GATE`
- `L12CEG-02-L12-ARTIFACT-PACKAGE-INCLUSION`

One-Agent-Session Scope:

One scaffold/template contract update and self-test pass; no replay batches or target runtime code.

Forbidden Shortcuts:

- Do not dispatch production runtime behavior on authored ids, names, slugs, source headings, page references, official catalog labels, or fixture labels.
- Do not count grouped selected-identity evidence as accepted cleanroom route proof without focused generic `qRoute`, focused generic `qComponentRoute`, or equivalent machine proof.
- Do not duplicate runtime facts already owned by Surface, rules-kernel, QNT, runtime context, or cleanroom guidance.
- Do not include PHB+ or synthetic non-SRD catalog identity.
- Do not mark the 146 executable rows accepted before target replay evidence exists and passes.

Reviewer Loop:

Run RAW/domain, architecture/connascence, cleanroom-authored-identity, Ralph task-quality, and code-review passes. Fix every reasonable finding and document concrete reasons for rejected notes. Confirm this task remains source/scaffold/checker planning or future replay partition planning unless it is a later replay execution task.

Plan Impact:

`update-required` if this task changes generated artifact shape or task dependencies; otherwise `none`.

### Task 4 - L12CEG-04-TARGET-REPLAY-EVIDENCE-SCHEMA-GATE

Status: `done`

Goal:

Complete the target-replay-evidence-schema work named by this task without changing production runtime behavior or claiming target replay closure.

Input:

- `plans/ralph-artifacts/l12-cleanroom-generation/verifier-gate-spec.json`
- `scripts/check-cleanroom-harness.cjs`
- `scripts/cleanroom-branch-coverage-check.cjs`

Output:

- structural target replay evidence validation for L1-2 artifact hashes
- negative self-test coverage for missing or stale L1-2 evidence metadata

Validation:

- `pnpm cleanroom-harness:check`
- `pnpm check:l12-cleanroom-generation:strict`
- `git diff --check`

Success Criteria:

- Replay evidence validates source-hash linkage and generic route/projection linkage
- Grouped selected-identity evidence remains unaccepted as cleanroom proof
- Task does not execute target replay or mark executable rows accepted

Dependencies:

- `L12CEG-01-CHECKER-LANDING-AND-STRICT-GATE`
- `L12CEG-02-L12-ARTIFACT-PACKAGE-INCLUSION`
- `L12CEG-03-SCAFFOLD-L12-CONTRACT`

One-Agent-Session Scope:

One structural evidence-gate task and self-tests; no target replay implementation or replay outputs.

Forbidden Shortcuts:

- Do not dispatch production runtime behavior on authored ids, names, slugs, source headings, page references, official catalog labels, or fixture labels.
- Do not count grouped selected-identity evidence as accepted cleanroom route proof without focused generic `qRoute`, focused generic `qComponentRoute`, or equivalent machine proof.
- Do not duplicate runtime facts already owned by Surface, rules-kernel, QNT, runtime context, or cleanroom guidance.
- Do not include PHB+ or synthetic non-SRD catalog identity.
- Do not mark the 146 executable rows accepted before target replay evidence exists and passes.

Reviewer Loop:

Run RAW/domain, architecture/connascence, cleanroom-authored-identity, Ralph task-quality, and code-review passes. Fix every reasonable finding and document concrete reasons for rejected notes. Confirm this task remains source/scaffold/checker planning or future replay partition planning unless it is a later replay execution task.

Plan Impact:

`update-required` if this task changes generated artifact shape or task dependencies; otherwise `none`.

### Task 5 - L12CEG-05-REPLAY-BATCH-PARTITION-PLAN

Status: `done`

Goal:

Plan the follow-up Ralph partitioning step that groups executable L1-2 rows by shared route, profile, and harness path. This task produces a future execution task graph; it must not include or execute the replay batches themselves.

Input:

- `plans/ralph-artifacts/l12-cleanroom-generation/srd-l12-denominator.json`
- `plans/ralph-artifacts/l12-cleanroom-generation/capability-fact-coverage-matrix.json`
- `plans/ralph-artifacts/l12-cleanroom-generation/route-proof-inventory.json`
- `plans/ralph-artifacts/l12-cleanroom-generation/srd-row-generic-fact-map.json`
- `plans/ralph-artifacts/l12-cleanroom-generation/verifier-gate-spec.json`

Output:

- future replay partition graph covering executable L1-2 rows exactly once
- batch metadata for required artifacts, evidence schema, dependencies, and validation

Validation:

- `pnpm check:l12-cleanroom-generation:strict`
- `pnpm cleanroom-scaffold:check`
- `pnpm cleanroom-harness:check`
- `pnpm unit-profile-coverage:check`
- `git diff --check`

Success Criteria:

- Future replay batches cover all executable rows exactly once
- Each batch is pending execution and not accepted
- Graph does not claim replay closure before batches run and pass

Dependencies:

- `L12CEG-01-CHECKER-LANDING-AND-STRICT-GATE`
- `L12CEG-02-L12-ARTIFACT-PACKAGE-INCLUSION`
- `L12CEG-03-SCAFFOLD-L12-CONTRACT`
- `L12CEG-04-TARGET-REPLAY-EVIDENCE-SCHEMA-GATE`

One-Agent-Session Scope:

One planning task that writes future replay partitions; no generated cleanroom replay batches or accepted evidence.

Forbidden Shortcuts:

- Do not dispatch production runtime behavior on authored ids, names, slugs, source headings, page references, official catalog labels, or fixture labels.
- Do not count grouped selected-identity evidence as accepted cleanroom route proof without focused generic `qRoute`, focused generic `qComponentRoute`, or equivalent machine proof.
- Do not duplicate runtime facts already owned by Surface, rules-kernel, QNT, runtime context, or cleanroom guidance.
- Do not include PHB+ or synthetic non-SRD catalog identity.
- Do not mark the 146 executable rows accepted before target replay evidence exists and passes.

Reviewer Loop:

Run RAW/domain, architecture/connascence, cleanroom-authored-identity, Ralph task-quality, and code-review passes. Fix every reasonable finding and document concrete reasons for rejected notes. Confirm this task remains source/scaffold/checker planning or future replay partition planning unless it is a later replay execution task.

Plan Impact:

`update-required` if this task changes generated artifact shape or task dependencies; otherwise `none`.

