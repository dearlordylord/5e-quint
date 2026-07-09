# Ralph L1-2 Cleanroom Generation Readiness

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L12CRG-01-BASELINE-RECONCILIATION",
      "status": "ready-for-research",
      "title": "Reconcile current SRD level 1-2 support, route evidence, and cleanroom blockers"
    },
    {
      "number": 2,
      "id": "L12CRG-02-SRD-L12-DENOMINATOR-CONTRACT",
      "status": "ready-for-research",
      "title": "Define the SRD level 1-2 cleanroom denominator contract"
    },
    {
      "number": 3,
      "id": "L12CRG-03-CAPABILITY-FACT-CONTRACT",
      "status": "ready-for-research",
      "title": "Define identity-free capability facts required per executable row"
    },
    {
      "number": 4,
      "id": "L12CRG-04-ROUTE-PROOF-INVENTORY",
      "status": "ready-for-research",
      "title": "Inventory focused generic route proofs and missing connectors"
    },
    {
      "number": 5,
      "id": "L12CRG-05-SRD-ROW-TO-GENERIC-FACT-MAPPING",
      "status": "ready-for-research",
      "title": "Map each SRD row to generic facts, route proof, and verifier expectation"
    },
    {
      "number": 6,
      "id": "L12CRG-06-VERIFIER-GATE-DESIGN",
      "status": "ready-for-research",
      "title": "Design verifier gates for residual grouped rows and missing evidence"
    },
    {
      "number": 7,
      "id": "L12CRG-07-BYTE-SIZE-TASK-DECOMPOSITION",
      "status": "ready-for-research",
      "title": "Decompose implementation work into one-agent-session Ralph tasks"
    },
    {
      "number": 8,
      "id": "L12CRG-08-WRITE-EXHAUSTIVE-RALPH-PLAN",
      "status": "ready-for-research",
      "title": "Write the exhaustive SRD L1-2 cleanroom generation Ralph plan"
    },
    {
      "number": 9,
      "id": "L12CRG-09-REVIEWER-LOOP-CONVERGENCE",
      "status": "ready-for-research",
      "title": "Run reviewer-loop convergence on the exhaustive plan and artifacts"
    }
  ]
}
-->

## Purpose

This is a Ralph meta-plan. Its only deliverable is a researched, exhaustive,
byte-sized implementation plan for SRD level 1-2 cleanroom generation:

- `plans/RALPH_L12_CLEANROOM_EXHAUSTIVE_GENERATION.md`

This plan must not implement runtime behavior, QNT behavior, Surface content,
cleanroom target code, or verifier code. Its job is to turn existing SRD,
coverage, route, cleanroom, and verifier artifacts into an implementation plan
that a later Ralph run can execute without hidden research.

The later exhaustive plan is complete only when it covers these five
non-omittable gates:

1. SRD level 1-2 denominator.
2. Identity-free capability facts per row.
3. Focused generic route proof/connectors or equivalent machine proof.
4. SRD surface row to generic facts mapping.
5. Verifier gates that fail residual grouped or unaccepted rows.

Scope is SRD-only and level 1-2 only. PHB+ content and synthetic non-SRD
catalog identities are out of scope for this plan and for the exhaustive plan
it produces.

## Current Inputs

The current checked-in source artifacts establish the starting point for
research:

- `plans/unit-profile-coverage/level1-2-full-support.json` reports
  `claimGate.status: pass`, `strictFinalSupportBlockerCount: 0`,
  `selectedIdentityBlockerCount: 0`, `authoredReadinessBlockerCount: 0`, and
  `strictTargetOpenCount: 0`.
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md` reports a strict
  executable denominator of 115 rows, 96 supported-profile rows, 19
  non-supported frontier rows, and 0 open frontier rows.
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json` currently has
  one `levelDenominators[0]` denominator with 107 `driverRouteAssignments`:
  75 `reducer-routed`, 16 `component-first`, 15 `catalog-after-substrate`, and
  1 `replay-refresh-only`.
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json` currently
  has 107 rows, with 105 `ready` and 2 `applied`.
- `plans/cleanroom-branch-coverage/REPORT.md` reports source branch coverage
  status, scoped obligations, target replay evidence status, and current
  branch obligation counts.

Any mismatch between these facts and later generated facts is not a reason to
pick one artifact by preference. Task 1 must reconcile the mismatch and
classify it as source-support, cleanroom-evidence, route-connector, verifier,
or out-of-scope.

## Artifact Directory

All plan-owned research outputs go under:

- `plans/ralph-artifacts/l12-cleanroom-generation/`

Required research artifact names:

- `baseline-reconciliation.md`
- `baseline-reconciliation.json`
- `srd-l12-denominator.schema.json`
- `srd-l12-denominator.json`
- `capability-fact-contract.schema.json`
- `capability-fact-coverage-matrix.json`
- `route-proof-inventory.json`
- `srd-row-generic-fact-map.schema.json`
- `srd-row-generic-fact-map.json`
- `verifier-gate-spec.md`
- `verifier-gate-spec.json`
- `exhaustive-task-graph.json`
- `reviewer-loop-report.md`

These artifacts are research and plan inputs. They are not production runtime
authority unless a later implementation task explicitly promotes a verifier or
schema into a checked source artifact.

## Global Rules

- Every task starts with the Ralph task-base check:
  - log the task-declared Base ref or SHA;
  - log `HEAD`;
  - run `git merge-base --is-ancestor <Base SHA> HEAD`;
  - stop and report a branch-base mismatch if the check fails.
- Read relevant local SRD 5.2.1 passages under `.references/srd-5.2.1/` and
  check `UBIQUITOUS_LANGUAGE.md` before classifying any rule-bearing row.
- Do not browse external rules sources. The local SRD corpus is the source of
  truth for RAW in this repository.
- Keep provenance, structured input, and runtime projection separate. SRD is
  the only provenance for this plan's shipped-content denominator.
- Do not collapse authored identity into runtime semantics. SRD ids, names,
  slugs, and source headings may appear in denominator, catalog, provenance,
  mapping, tests, and evidence boundaries, but implementation tasks must route
  through generic facts, procedure shapes, runtime state, and support-profile
  admission facts.
- Do not treat grouped selected-identity traces as cleanroom acceptance
  evidence unless a task also provides focused generic route proof or an
  equivalent machine proof.
- Do not add redundant state to the planned target. If an artifact proposes a
  field, the task must search for an existing source of that fact across
  Surface, rules-kernel, QNT, runtime context, and cleanroom guidance.
- Use current artifacts as inputs, not stale historical counts. If the route
  denominator, source support reports, or checker outputs change, refresh the
  reconciliation artifact and update downstream task graph dependencies.
- MBT is scarce. This meta-plan should not run battle MBT; it may name focused
  MBT commands in the later exhaustive implementation plan only where a task
  changes runtime or QNT behavior.

## Verification

Every task must include:

- reviewer-loop convergence: run RAW traceability, ubiquitous-language/domain
  language, architecture/connascence, cleanroom-authored-identity, Ralph
  task-quality, and code-review passes after artifact changes; fix every
  reasonable finding, explicitly reject only findings with a concrete reason,
  and repeat until no reasonable findings remain;
- RAW/ubiquitous-language check: confirm all rule-bearing classifications trace
  to specific local SRD passages and project domain terms;
- `git diff --check`.

Final checks for the meta-plan work:

```sh
pnpm unit-profile-coverage:check
pnpm rules-kernel-coverage:check
pnpm cleanroom-branch-coverage:check
pnpm cleanroom-scaffold:check
pnpm cleanroom-harness:check
pnpm check:reducer-route-connectors
git diff --check
```

Task 8 must also validate the generated Ralph plan structure by parsing the
`ralph-task-index`, verifying unique task numbers and ids, and verifying every
indexed task has a matching `### Task N` body.

## DAG

| Task | Depends On | Output |
| --- | --- | --- |
| `L12CRG-01` | none | reconciled baseline facts and mismatch classifications |
| `L12CRG-02` | `L12CRG-01` | denominator schema and generated denominator |
| `L12CRG-03` | `L12CRG-01`, `L12CRG-02` | capability fact schema and coverage matrix |
| `L12CRG-04` | `L12CRG-01`, `L12CRG-02` | route proof inventory and connector gaps |
| `L12CRG-05` | `L12CRG-02`, `L12CRG-03`, `L12CRG-04` | SRD row to generic fact map |
| `L12CRG-06` | `L12CRG-02`, `L12CRG-03`, `L12CRG-04`, `L12CRG-05` | verifier gate spec |
| `L12CRG-07` | `L12CRG-02`-`L12CRG-06` | byte-sized task graph |
| `L12CRG-08` | `L12CRG-07` | exhaustive Ralph implementation plan |
| `L12CRG-09` | `L12CRG-08` | reviewed and converged final plan |

## Required Task Shape For The Exhaustive Plan

Every task in `plans/RALPH_L12_CLEANROOM_EXHAUSTIVE_GENERATION.md` must include:

- `Goal`: one denominator slice, fact family, connector/proof, mapping family,
  verifier gate, or replay lane.
- `Input`: exact source files, generated artifact rows, SRD passages, and
  dependency task outputs.
- `Output`: exact files or evidence artifacts to create or update.
- `Validation`: exact commands and artifact checks.
- `Success Criteria`: pass/fail conditions that do not rely on prose-only
  confidence.
- `Dependencies`: task ids that must be complete first.
- `One-Agent-Session Scope`: why the task is small enough for one Ralph
  session, or how it must be split before execution.
- `Forbidden Shortcuts`: no authored-identity dispatch, no grouped-driver
  acceptance without focused generic proof, no duplicate runtime state, and no
  PHB+ or synthetic non-SRD identity.
- `Reviewer Loop`: RAW/domain, architecture/connascence,
  cleanroom-authored-identity, and code-review convergence.
- `Plan Impact`: `none`, `update-required`, or `applied`.

## Task Details

### Task 1 - L12CRG-01-BASELINE-RECONCILIATION

Status: `ready-for-research`

Goal:

Reconcile source SRD support counts, cleanroom route/evidence counts, current
fresh cleanroom blocker reports if present, and unresolved blocker families.

Input:

- `plans/unit-profile-coverage/level1-2-full-support.json`
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`
- `plans/cleanroom-branch-coverage/REPORT.md`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- any current cleanroom `BLOCKERS.json` or `FRESH_RUN_REPORT.md` present in
  the task-provided cleanroom run directory
- `plans/QNT_EVIDENCE_TYPES_CLEANROOM_GUIDE.md`
- `plans/cleanroom-guidance/reducer-spine.md`

Output:

- `plans/ralph-artifacts/l12-cleanroom-generation/baseline-reconciliation.md`
- `plans/ralph-artifacts/l12-cleanroom-generation/baseline-reconciliation.json`

Validation:

- Ralph task-base check.
- Compare source support counts, route denominator counts, backlog counts,
  selected identity evidence counts, and cleanroom blocker families.
- Classify every mismatch as one of: source-support, cleanroom-evidence,
  route-connector, verifier, or out-of-scope.
- Run:

  ```sh
  pnpm unit-profile-coverage:check
  pnpm cleanroom-branch-coverage:check
  git diff --check
  ```

Success Criteria:

- Every observed mismatch is classified with source artifact path, row id or
  count, classification, downstream owner, and proposed follow-up task family.
- The report explicitly distinguishes source support truth from cleanroom
  replay evidence.
- The report records whether current cleanroom blocker artifacts were present;
  absence is a research fact, not a blocker invented from stale paths.

Dependencies:

- none.

One-Agent-Session Scope:

- This is a read-only artifact reconciliation task. It may generate two
  research files but must not change production code, QNT, or verifier scripts.

### Task 2 - L12CRG-02-SRD-L12-DENOMINATOR-CONTRACT

Status: `ready-for-research`

Goal:

Define and generate the SRD level 1-2 cleanroom-relevant denominator. The
denominator must make mixed-provenance and mixed-license states unrepresentable
at the collection boundary.

Input:

- Task 1 baseline artifacts.
- `plans/unit-profile-coverage/level1-2-full-support.json`
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`
- SRD inventory artifacts referenced by the unit-profile coverage report.
- `plans/rules-kernel-coverage/profile-obligations.jsonl`
- `plans/rules-kernel-coverage/matrix.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `.references/srd-5.2.1/`
- `UBIQUITOUS_LANGUAGE.md`

Output:

- `plans/ralph-artifacts/l12-cleanroom-generation/srd-l12-denominator.schema.json`
- `plans/ralph-artifacts/l12-cleanroom-generation/srd-l12-denominator.json`

Validation:

- Ralph task-base check.
- Schema validates that denominator rows are SRD-only and level 1-2 only.
- Every row carries exactly one disposition:
  `executable`, `no-battle-table-closed`, `character-sheet-owned`,
  `handoff-owned`, or `outside-cleanroom-battle-route-denominator`.
- Run:

  ```sh
  pnpm unit-profile-coverage:check
  pnpm rules-kernel-coverage:check
  pnpm cleanroom-branch-coverage:check
  git diff --check
  ```

Success Criteria:

- Every SRD level 1-2 row from source support inputs appears exactly once or is
  explained by a source-level exclusion.
- Optional fields and empty collections have distinct documented meanings in
  the schema; `undefined` is not used as a second spelling for an empty list.
- Denominator rows can be joined to later capability, route, mapping, and
  verifier artifacts without authored identity becoming runtime dispatch.

Dependencies:

- `L12CRG-01`.

One-Agent-Session Scope:

- Generate schema and denominator artifact only. If generation requires code,
  Task 2 may add a plan-owned research script under the artifact directory but
  must not promote it to production tooling.

### Task 3 - L12CRG-03-CAPABILITY-FACT-CONTRACT

Status: `ready-for-research`

Goal:

Define identity-free capability facts required for every executable denominator
row.

Input:

- Task 1 and Task 2 artifacts.
- Existing route vocabulary in `packages/battle-runtime/*route*.qnt`.
- `packages/battle-runtime/rule-core-component-route.qnt`
- rules-kernel obligations in `plans/rules-kernel-coverage/`
- reducer route inventory and cleanroom guidance.
- `.references/srd-5.2.1/`
- `UBIQUITOUS_LANGUAGE.md`

Output:

- `plans/ralph-artifacts/l12-cleanroom-generation/capability-fact-contract.schema.json`
- `plans/ralph-artifacts/l12-cleanroom-generation/capability-fact-coverage-matrix.json`

Validation:

- Ralph task-base check.
- For each executable denominator row, record required generic facts for:
  action timing, resource cost, target shape, attack/save/check shape,
  damage/effect facts, duration/lifecycle, owners, and exact arithmetic where
  needed.
- Search for existing fact owners before proposing any new field or runtime
  concept.
- Run:

  ```sh
  pnpm rules-kernel-coverage:check
  pnpm cleanroom-branch-coverage:check
  pnpm check:reducer-route-connectors
  git diff --check
  ```

Success Criteria:

- Every executable denominator row has a complete required-fact set or an
  explicit source-harness/connector task explaining the missing generic fact.
- Fact names describe rule/domain concepts, not migration state such as
  normalized, legacy, current, or promoted.
- The contract contains no spell/unit name, id, slug, source heading, page ref,
  or catalog label in runtime fact discriminants.

Dependencies:

- `L12CRG-01`
- `L12CRG-02`

One-Agent-Session Scope:

- Contract and matrix only. Do not change runtime readers, QNT route modules,
  or generated source coverage.

### Task 4 - L12CRG-04-ROUTE-PROOF-INVENTORY

Status: `ready-for-research`

Goal:

Map denominator rows to existing focused generic route connectors or component
connectors, and name missing connector/proof tasks.

Input:

- Task 1 and Task 2 artifacts.
- `packages/**/*.route.mbt.qnt`
- `packages/battle-runtime/rule-core-component-route.qnt`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/QNT_EVIDENCE_TYPES_CLEANROOM_GUIDE.md`
- current cleanroom replay evidence if supplied by the task prompt

Output:

- `plans/ralph-artifacts/l12-cleanroom-generation/route-proof-inventory.json`

Validation:

- Ralph task-base check.
- For every executable denominator row, classify proof as `focused-qRoute`,
  `focused-qComponentRoute`, `equivalent-machine-proof`,
  `grouped-selected-identity-not-accepted`, or `missing-proof`.
- Check connector paths exist and expose the expected projection name.
- Run:

  ```sh
  pnpm cleanroom-branch-coverage:check
  pnpm check:reducer-route-connectors
  git diff --check
  ```

Success Criteria:

- No grouped selected-identity driver is treated as acceptance evidence without
  focused generic route proof or equivalent machine proof.
- Every missing proof row becomes a concrete connector/proof task candidate
  with input driver, expected generic subject family, and verifier expectation.
- Route proof rows preserve the MBT driver closure discipline by naming focused
  leaf connectors rather than whole-battle imports.

Dependencies:

- `L12CRG-01`
- `L12CRG-02`

One-Agent-Session Scope:

- Inventory only. Do not add or edit QNT connector files in this meta-plan.

### Task 5 - L12CRG-05-SRD-ROW-TO-GENERIC-FACT-MAPPING

Status: `ready-for-research`

Goal:

Map each SRD denominator row or Unit id to its generic capability profile,
route proof, and cleanroom verifier expectation.

Input:

- Task 2 denominator.
- Task 3 capability fact contract.
- Task 4 route proof inventory.
- `plans/unit-profile-coverage/level1-2-full-support.json`
- `plans/rules-kernel-coverage/profile-obligations.jsonl`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`

Output:

- `plans/ralph-artifacts/l12-cleanroom-generation/srd-row-generic-fact-map.schema.json`
- `plans/ralph-artifacts/l12-cleanroom-generation/srd-row-generic-fact-map.json`

Validation:

- Ralph task-base check.
- Every executable row joins to capability facts, proof status, and verifier
  expectation.
- Every non-executable or outside-denominator row carries the exact owner
  disposition from Task 2 and does not require runtime route facts.
- Run:

  ```sh
  pnpm unit-profile-coverage:check
  pnpm rules-kernel-coverage:check
  pnpm cleanroom-branch-coverage:check
  git diff --check
  ```

Success Criteria:

- Production runtime could consume the mapped generic facts without branching
  on authored identity.
- Mapping joins are one-to-one or explicitly many-to-one by generic fact owner;
  they do not duplicate derivable facts beside source facts.
- Rows with missing facts or missing proof become implementation task inputs,
  not accepted evidence.

Dependencies:

- `L12CRG-02`
- `L12CRG-03`
- `L12CRG-04`

One-Agent-Session Scope:

- Mapping schema and mapping artifact only. Split by denominator family if the
  generated artifact is too large to review in one session.

### Task 6 - L12CRG-06-VERIFIER-GATE-DESIGN

Status: `ready-for-research`

Goal:

Design verifier gates that fail residual grouped rows, missing capability
facts, missing route proofs, stale hashes, and identity-dispatch leaks.

Input:

- Task 2 denominator.
- Task 3 capability fact contract.
- Task 4 route proof inventory.
- Task 5 mapping artifact.
- Existing checker scripts:
  - `scripts/unit-profile-coverage-check.cjs`
  - `scripts/rules-kernel-coverage-check.cjs`
  - `scripts/cleanroom-branch-coverage-check.cjs`
  - `scripts/check-reducer-route-connectors.cjs`
  - `scripts/check-cleanroom-harness.cjs`
  - `scripts/render-cleanroom-scaffold.cjs`
- Existing cleanroom scaffold evidence schema examples under
  `plans/cleanroom-scaffolds/tasks/`.

Output:

- `plans/ralph-artifacts/l12-cleanroom-generation/verifier-gate-spec.md`
- `plans/ralph-artifacts/l12-cleanroom-generation/verifier-gate-spec.json`

Validation:

- Ralph task-base check.
- The gate spec names exact existing checker owners or concrete new checker
  tasks.
- The gate spec includes stale hash checks, residual grouped evidence failures,
  missing capability fact failures, missing proof failures, and
  authored-identity dispatch leak checks.
- Run:

  ```sh
  pnpm unit-profile-coverage:check
  pnpm rules-kernel-coverage:check
  pnpm cleanroom-branch-coverage:check
  pnpm cleanroom-scaffold:check
  pnpm cleanroom-harness:check
  pnpm check:reducer-route-connectors
  git diff --check
  ```

Success Criteria:

- The final exhaustive plan has concrete checker implementation tasks instead
  of prose-only confidence.
- Every verifier failure condition identifies source artifact, expected row
  shape, failure message intent, and self-test fixture requirement.
- Strong connascence is localized: duplicated magic strings or count contracts
  are moved into named schema fields or generated artifacts in planned tasks.

Dependencies:

- `L12CRG-02`
- `L12CRG-03`
- `L12CRG-04`
- `L12CRG-05`

One-Agent-Session Scope:

- Verifier design only. Do not edit checker scripts in this meta-plan.

### Task 7 - L12CRG-07-BYTE-SIZE-TASK-DECOMPOSITION

Status: `ready-for-research`

Goal:

Decompose the later exhaustive plan into one-agent-session tasks grouped by
denominator, facts, connectors, mapping, verifier, and cleanroom replay.

Input:

- Task 1 through Task 6 artifacts.

Output:

- `plans/ralph-artifacts/l12-cleanroom-generation/exhaustive-task-graph.json`

Validation:

- Ralph task-base check.
- Every task graph node has explicit input, output, validation, success
  criteria, dependencies, and one-agent-session scope.
- Every missing fact, proof, mapping, and verifier gap from Tasks 2-6 appears
  in exactly one task or is intentionally grouped with a nearby task by a named
  invariant.
- Run:

  ```sh
  pnpm cleanroom-branch-coverage:check
  git diff --check
  ```

Success Criteria:

- No implementation task depends on unstated research.
- Tasks are ordered so checker/schema/gate work can fail residual grouped or
  unaccepted rows before cleanroom replay is treated as complete.
- Task grouping is based on domain owner or verifier invariant, not convenience
  from historical implementation batches.

Dependencies:

- `L12CRG-02`
- `L12CRG-03`
- `L12CRG-04`
- `L12CRG-05`
- `L12CRG-06`

One-Agent-Session Scope:

- Task graph only. If the task graph exceeds a single reviewable file, split it
  by task family and keep `exhaustive-task-graph.json` as the index.

### Task 8 - L12CRG-08-WRITE-EXHAUSTIVE-RALPH-PLAN

Status: `ready-for-research`

Goal:

Write the exhaustive SRD level 1-2 cleanroom generation Ralph implementation
plan with synchronized index, DAG, task bodies, and validation commands.

Input:

- `plans/ralph-artifacts/l12-cleanroom-generation/exhaustive-task-graph.json`
- Task 1 through Task 6 artifacts.
- This meta-plan's required task shape.

Output:

- `plans/RALPH_L12_CLEANROOM_EXHAUSTIVE_GENERATION.md`

Validation:

- Ralph task-base check.
- Parse the `ralph-task-index` JSON block.
- Verify task numbers are unique and sequential, task ids are unique, every
  indexed task has a matching `### Task N - <id>` body, and every body id is in
  the index.
- Verify every task body has `Goal`, `Input`, `Output`, `Validation`, `Success
  Criteria`, `Dependencies`, and `One-Agent-Session Scope`.
- Run:

  ```sh
  pnpm unit-profile-coverage:check
  pnpm rules-kernel-coverage:check
  pnpm cleanroom-branch-coverage:check
  pnpm cleanroom-scaffold:check
  pnpm cleanroom-harness:check
  pnpm check:reducer-route-connectors
  git diff --check
  ```

Success Criteria:

- The exhaustive plan represents all five non-omittable gates as validateable
  Ralph tasks.
- Every indexed task has a matching task body.
- No implementation task depends on unstated research.
- No task admits grouped selected-identity evidence without a focused generic
  proof task or an explicit missing-proof blocker.

Dependencies:

- `L12CRG-07`

One-Agent-Session Scope:

- Write and validate one Markdown plan from the already-generated task graph.
  Do not add new research during Task 8; if research is missing, return to the
  owning earlier task.

### Task 9 - L12CRG-09-REVIEWER-LOOP-CONVERGENCE

Status: `ready-for-research`

Goal:

Review the final exhaustive plan and research artifacts until no reasonable
findings remain.

Input:

- `plans/RALPH_L12_CLEANROOM_EXHAUSTIVE_GENERATION.md`
- all artifacts under `plans/ralph-artifacts/l12-cleanroom-generation/`

Output:

- updated exhaustive plan and research artifacts
- `plans/ralph-artifacts/l12-cleanroom-generation/reviewer-loop-report.md`

Validation:

- Ralph task-base check.
- Run reviewer passes for:
  - RAW traceability and local SRD source coverage;
  - ubiquitous-language/domain naming;
  - architecture and connascence;
  - cleanroom authored-identity discipline;
  - Ralph task quality and one-agent-session sizing;
  - code-review stance for any scripts or schema-like artifacts created under
    the research directory.
- Run final checks:

  ```sh
  pnpm unit-profile-coverage:check
  pnpm rules-kernel-coverage:check
  pnpm cleanroom-branch-coverage:check
  pnpm cleanroom-scaffold:check
  pnpm cleanroom-harness:check
  pnpm check:reducer-route-connectors
  git diff --check
  ```

Success Criteria:

- RAW/domain, architecture/connascence, cleanroom-authored-identity, and Ralph
  task-quality passes converge.
- Every reasonable finding is fixed.
- Every rejected note has a concrete reason in `reviewer-loop-report.md`.
- The final exhaustive plan remains structurally synchronized after fixes.

Dependencies:

- `L12CRG-08`

One-Agent-Session Scope:

- Review and repair the plan/artifacts only. If review finds implementation
  work, record it as a task in the exhaustive plan rather than performing it in
  this meta-plan.
