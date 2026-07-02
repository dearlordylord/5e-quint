# Ralph Cleanroom Replay Gate

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "CRG-01-SOURCE-READINESS-FREEZE",
      "status": "ready-for-research",
      "title": "Freeze the source cleanroom replay package inputs"
    },
    {
      "number": 2,
      "id": "CRG-02-PACKAGE-REFRESH",
      "status": "blocked",
      "title": "Build the transferable cleanroom replay package"
    },
    {
      "number": 3,
      "id": "CRG-03-TARGET-START-GATE",
      "status": "blocked",
      "title": "Install package and record target start gate"
    },
    {
      "number": 4,
      "id": "CRG-04-BASELINE-REDUCER-REPLAY",
      "status": "blocked",
      "title": "Replay the baseline reducer-spine diagnostics"
    },
    {
      "number": 5,
      "id": "CRG-05-SOURCE-FEEDBACK-REPLAY",
      "status": "blocked",
      "title": "Replay concentration and scalar active-effect source feedback"
    },
    {
      "number": 6,
      "id": "CRG-06-HANDBACK-AND-NEXT-BATCH",
      "status": "blocked",
      "title": "Decide acceptance and split the next cleanroom batch"
    }
  ]
}
-->

## Purpose

This is a later cleanroom gate plan, separate from the source-side L1/L2 harness
campaign. It prepares a fresh target replay of the stable source artifacts
without editing cleanroom target implementation code in the source worktree.

Replay is intentionally narrow. The first gate uses the active
`reducer-spine-diagnostic-v1` batch from
`plans/cleanroom-branch-coverage/reducer-route-inventory.json`, not the whole
level 1-5 route denominator.

## Stable Source Artifacts To Replay

- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/branch-scope.jsonl`
- `plans/cleanroom-guidance/reducer-spine.md`
- `plans/CLEANROOM_ASSUMPTIONS.md`
- `plans/cleanroom-scaffolds/**`
- `scripts/sync-cleanroom-input.cjs`
- `scripts/render-cleanroom-scaffold.cjs`
- `scripts/package-cleanroom-refresh.cjs`
- `scripts/check-cleanroom-harness.cjs`
- `scripts/cleanroom-branch-coverage-check.cjs`
- `.references/srd-5.2.1/**`
- `UBIQUITOUS_LANGUAGE.md`

The active replay seed is exactly these six driver and connector pairs:

| Order | Driver | Connector |
| ---: | --- | --- |
| 1 | `packages/battle-runtime/battle-runtime-magic-missile.mbt.qnt` | `packages/battle-runtime/battle-runtime-magic-missile.route.mbt.qnt` |
| 2 | `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt` | `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.route.mbt.qnt` |
| 3 | `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt` | `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.route.mbt.qnt` |
| 4 | `packages/battle-runtime/battle-runtime-death-saving-throw.mbt.qnt` | `packages/battle-runtime/battle-runtime-death-saving-throw.route.mbt.qnt` |
| 5 | `packages/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt` | `packages/battle-runtime/battle-runtime-concentration-break-teardown.route.mbt.qnt` |
| 6 | `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt` | `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.route.mbt.qnt` |

## Gate Rules

- Source-side fixture, inventory, and QNT pressure must pass before packaging.
- The package may include only allowlisted cleanroom inputs, scaffold files,
  target profile, and cleanroom checker scripts.
- Target replay evidence, not report prose or target-language unit tests,
  closes branch coverage.
- Production target behavior must route by reducer subject shape, typed fills,
  support/profile facts, and durable runtime state. It must not branch on
  authored ids, names, slugs, source headings, page references, fixture labels,
  QNT branch names, or prior cleanroom implementation history.
- Broader level 1-5 driver routing remains future work. This gate does not
  promote every current `driverRouteAssignments[]` row into a target task.

## Current Readiness Note

Task 16 validation observed `pnpm cleanroom-branch-coverage:check` reporting
`plans/cleanroom-branch-coverage/source-branch-inventory.json` and
`plans/cleanroom-branch-coverage/REPORT.md` as stale. This plan does not repair
those generated artifacts. `CRG-01-SOURCE-READINESS-FREEZE` must close that
source-side drift before `CRG-02-PACKAGE-REFRESH` can package replay inputs.

## Required Verification For Every Task

Every task in this plan must complete these checks before it can be accepted,
in addition to the task-local commands below:

- RAW/QNT traceability: confirm every modeled rule fact used by the task traces
  to copied SRD 5.2.1 text, copied QNT, `plans/CLEANROOM_ASSUMPTIONS.md`, or an
  explicit source-QNT-corpus blocker. If a task only packages or installs
  artifacts and models no rule, record that no-rule-change rationale.
- Ubiquitous-language/domain review: check `UBIQUITOUS_LANGUAGE.md` for every
  named rule/domain concept the task depends on, including Action Lifecycle,
  Hit Points and Death, Spellcasting, Concentration, Spell Effect, Saving
  Throw, Armor Class, Speed, Movement, Temporary Hit Points, Pool, Spend, and
  Settlement when those concepts are in scope.
- Architecture/connascence review: verify durable state owners, route
  connector names, driver order, target replay evidence keys, source hashes,
  target profile hashes, and manifest source commit SHA cannot drift silently.
  Weaken or localize any meaning/value/order/timing coupling before acceptance.
- Code-review pass: review target/source changes for adapter quarantine,
  engine depth, state-owner derivability, authored-identity dispatch,
  report honesty, and redundant state. Diagnostic target-language unit tests
  may support debugging but never close target replay evidence.
- Reviewer-loop convergence: fix every reasonable finding, explicitly reject
  only findings with a concrete reason, and repeat RAW/QNT,
  ubiquitous-language/domain, architecture/connascence, and code-review passes
  until no reasonable findings remain. Source-only tasks record convergence in
  the source Ralph closeout. Target tasks must also record convergence in
  `tasks/REVIEW_LOOP.json` and acceptance or rejection in
  `tasks/DECIDER_DECISION.json`.

## Task 1 - CRG-01-SOURCE-READINESS-FREEZE

Status: `ready-for-research`

Goal:

Freeze a source commit whose cleanroom replay package inputs are internally
consistent and whose active diagnostic batch still names the six intended
drivers.

Inputs:

- All stable source artifacts listed above.
- `plans/RALPH_FRESH_CLEANROOM_SOURCE_FEEDBACK.md`
- `plans/CLEANROOM_QNT_BRANCH_COVERAGE_AND_HARNESS_IMPLEMENTATION_PLAN.md`
- Current L1/L2 source harness plan closeout from
  `/workspace/typescript/dnd/.ralph/runs/l12-source-harness-20260701T171025Z/plan.md`

Acceptance:

- `reducer-spine-diagnostic-v1` contains exactly the six driver/connector
  pairs listed in this plan.
- The source branch inventory and reducer-route inventory pass their checkers.
- SDK RAW inventory, Unit profile, and rules-kernel coverage checks pass.
- No cleanroom target code, dirty target reports, or prior target output is
  copied into the source package inputs.

Verification:

Run the plan-level required verification checklist above, recording
source-side reviewer-loop convergence and any no-rule-change rationale before
running:

```bash
pnpm sdk-raw-integration-inventory:check
pnpm unit-profile-coverage:check
pnpm rules-kernel-coverage:check
pnpm cleanroom-branch-coverage:check
pnpm cleanroom-sync:check
pnpm cleanroom-scaffold:check
pnpm cleanroom-harness:check
git diff --check
```

Plan Impact:

- Unblock Task 2 when all checks pass.
- If any check fails because source artifacts drifted, keep Task 2 blocked and
  add source-side repair tasks to the owning source campaign before packaging.

## Task 2 - CRG-02-PACKAGE-REFRESH

Status: `blocked`

Depends on:

- `CRG-01-SOURCE-READINESS-FREEZE`

Goal:

Build a transferable cleanroom package from the frozen source commit.

Output:

- Archive and checksum produced by:

```bash
pnpm cleanroom-refresh:package -- \
  --profile plans/cleanroom-scaffolds/target-profiles/rust.json \
  --output /workspace/typescript/dnd-cleanroom-rust-refresh-<source-sha>.tar.gz
```

Acceptance:

- The packager runs without `--allow-dirty-scaffold`.
- The archive contains `cleanroom-input/MANIFEST.md`, copied RAW/domain/QNT
  inputs, branch inventories, guidance, target profile, task scaffolds, and
  cleanroom checker scripts.
- The archive excludes production TypeScript implementation code, production
  tests, previous cleanroom output, and uncontrolled planning logs.

Verification:

Run the plan-level required verification checklist above, recording
source-side reviewer-loop convergence and confirming that packaging changes no
rule semantics before running:

```bash
pnpm cleanroom-refresh:package -- \
  --profile plans/cleanroom-scaffolds/target-profiles/rust.json \
  --output /workspace/typescript/dnd-cleanroom-rust-refresh-<source-sha>.tar.gz
git diff --check
```

Plan Impact:

- Unblock Task 3 with the archive path, archive sha256, and manifest source
  commit SHA.

## Task 3 - CRG-03-TARGET-START-GATE

Status: `blocked`

Depends on:

- `CRG-02-PACKAGE-REFRESH`

Goal:

Install the package into a separate cleanroom target repo and record the target
start gate before implementation.

Acceptance:

- The cleanroom target repo, not this source worktree, receives the generated
  `AGENTS.md`, `README.md`, `BOOTSTRAP_QUERY.md`, `target-profile.json`,
  `tasks/**`, and `cleanroom-input/**`.
- Target start `HEAD`, clean pre-implementation status, manifest source commit
  SHA, source branch inventory SHA, first queued driver, and target profile SHA
  are recorded in the target task artifacts.
- No dirty target history, previous validation report, prior replay evidence,
  or target implementation code is accepted as source evidence.

Verification:

Run the plan-level required verification checklist above. The target start gate
must record the no-rule-change rationale and prepare `tasks/REVIEW_LOOP.json`
and `tasks/DECIDER_DECISION.json` for later replay acceptance before running:

```bash
node scripts/check-cleanroom-harness.cjs --self-test
```

Run the command from the cleanroom target package after archive extraction,
using the copied script. Full harness acceptance waits for real target replay
evidence in Tasks 4-6.

Plan Impact:

- Unblock Task 4 only after the target start gate is committed or otherwise
  durably recorded in the cleanroom target repo.

## Task 4 - CRG-04-BASELINE-REDUCER-REPLAY

Status: `blocked`

Depends on:

- `CRG-03-TARGET-START-GATE`

Goal:

Replay the baseline reducer-spine diagnostics that establish shared reducer
entrypoints and durable Hit Point lifecycle ownership before source-feedback
drivers are attempted.

Replay drivers:

- `battle-runtime-magic-missile.mbt.qnt`
- `battle-runtime-save-gated-spell-ordering.mbt.qnt`
- `battle-runtime-hit-point-restoration-ordering.mbt.qnt`
- `battle-runtime-death-saving-throw.mbt.qnt`

Acceptance:

- Target replay evidence is generated by the target harness for every in-scope
  branch in the four drivers.
- Evidence observes the copied `qRoute` projection from each connector.
- Durable target state ownership is recorded for current actor, action
  resources, spell-slot expenditure, Hit Points, zero-Hit-Point lifecycle,
  Stable, Unconscious, Dead, and death-save counters.
- Any missing reducer substrate is recorded as a target blocker, not patched by
  a driver-local replay helper.

Verification:

Run the plan-level required verification checklist above. For this task, RAW/QNT
traceability must cover spell slots, Saving Throws, Hit Points, Healing,
zero-Hit-Point lifecycle, Death Saving Throws, and the four copied driver/route
connector pairs. Record convergence in `tasks/REVIEW_LOOP.json` and
`tasks/DECIDER_DECISION.json` before accepting the replay evidence:

```bash
node scripts/cleanroom-branch-coverage-check.cjs \
  --target-replay-evidence tasks/TARGET_REPLAY_EVIDENCE.json
node scripts/check-cleanroom-harness.cjs \
  --task-root .
```

Plan Impact:

- Unblock Task 5 only when baseline target replay evidence passes.
- If target blockers remain, keep Task 5 blocked until the cleanroom decider
  accepts or splits the blocker.

## Task 5 - CRG-05-SOURCE-FEEDBACK-REPLAY

Status: `blocked`

Depends on:

- `CRG-04-BASELINE-REDUCER-REPLAY`

Goal:

Replay the cleanroom source-feedback drivers that were made publicly derivable
by `plans/RALPH_FRESH_CLEANROOM_SOURCE_FEEDBACK.md`.

Replay drivers:

- `battle-runtime-concentration-break-teardown.mbt.qnt`
- `battle-runtime-scalar-buff-active-effects.mbt.qnt`

Acceptance:

- Target replay evidence proves failed damage-save Concentration cleanup,
  voluntary Concentration end, and replacement Concentration cleanup through
  `BattleConcentrationOwner` and `BattleActiveEffectOwner` route events.
- Target replay evidence proves Armor Class, Speed, special Speed, Hit Point
  maximum, and immediate Temporary Hit Point scalar-buff projections through
  active-effect, movement, Hit Point, Temporary Hit Point, and Concentration
  owners.
- The target does not introduce adapter-local Concentration, active-effect,
  scalar-profile, movement, Hit Point, or Temporary Hit Point ledgers.
- The target does not infer behavior from spell names, fixture labels, selected
  spell ids, QNT branch names, or prior cleanroom output.

Verification:

Run the plan-level required verification checklist above. For this task, RAW/QNT
traceability must cover Concentration loss/replacement/voluntary end, active
Spell Effect cleanup, Armor Class, Speed, special Speed, Hit Point maximum, and
Temporary Hit Point projection through the two copied driver/route connector
pairs. Record convergence in `tasks/REVIEW_LOOP.json` and
`tasks/DECIDER_DECISION.json` before accepting the replay evidence:

```bash
node scripts/cleanroom-branch-coverage-check.cjs \
  --target-replay-evidence tasks/TARGET_REPLAY_EVIDENCE.json
node scripts/check-cleanroom-harness.cjs \
  --task-root .
```

Plan Impact:

- Unblock Task 6 when target replay evidence passes for both source-feedback
  drivers.
- If copied QNT/RAW/domain guidance is still insufficient, create a source-side
  feedback task and block further target replay of the affected driver.

## Task 6 - CRG-06-HANDBACK-AND-NEXT-BATCH

Status: `blocked`

Depends on:

- `CRG-05-SOURCE-FEEDBACK-REPLAY`

Goal:

Decide whether the cleanroom replay gate is accepted, then split the next
cleanroom batch from the broader route denominator.

Acceptance:

- Target `TARGET_REPLAY_EVIDENCE.json`, `ENGINE_DEPTH_MANIFEST.json`,
  `STATE_OWNER_MANIFEST.json`, `REVIEW_LOOP.json`, `DECIDER_DECISION.json`, and
  blocker ledger entries converge through the cleanroom work loop.
- Every reasonable reviewer finding is fixed or explicitly rejected with a
  concrete reason.
- The next batch is selected from `driverRouteAssignments[]` only where generic
  route or component connector evidence exists, or where a source-QNT-corpus
  blocker is explicitly recorded.

Verification:

Run the plan-level required verification checklist above. The decider must
confirm `tasks/REVIEW_LOOP.json` and `tasks/DECIDER_DECISION.json` show
converged RAW/QNT, ubiquitous-language/domain, architecture/connascence, and
code-review passes for all accepted replay tasks before running:

```bash
node scripts/cleanroom-branch-coverage-check.cjs \
  --target-replay-evidence tasks/TARGET_REPLAY_EVIDENCE.json
node scripts/check-cleanroom-harness.cjs \
  --task-root .
```

Plan Impact:

- Add a new cleanroom gate plan or extend this one with the next selected
  driver batch.
- Do not move unresolved selected-identity residual blockers into target
  implementation tasks until the generic route/component substrate exists.
