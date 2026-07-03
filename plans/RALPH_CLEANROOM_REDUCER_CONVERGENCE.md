# Ralph Cleanroom Reducer Convergence

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "CRP-01-DENOMINATOR-BACKLOG",
      "status": "ready-for-research",
      "title": "Populate the reducer convergence denominator backlog"
    },
    {
      "number": 2,
      "id": "CRP-02-ROUTE-EVENT-PROVENANCE",
      "status": "ready-for-research",
      "title": "Require target replay evidence from observed route events"
    },
    {
      "number": 3,
      "id": "CRP-03-WITNESS-NAME-QUARANTINE",
      "status": "blocked",
      "title": "Separate witness sampled-input names from domain vocabulary"
    },
    {
      "number": 4,
      "id": "CRP-04-CREATION-FILL-BATCH",
      "status": "blocked",
      "title": "Task-shape character creation fill-batch acceptance"
    },
    {
      "number": 5,
      "id": "CRP-05-SESSION-BATTLE-ENTRY",
      "status": "blocked",
      "title": "Task-shape character session to battle entry acceptance"
    },
    {
      "number": 6,
      "id": "CRP-06-SETTLEMENT-REST-OWNERS",
      "status": "blocked",
      "title": "Task-shape settlement and rest ownership acceptance"
    },
    {
      "number": 7,
      "id": "CRP-07-DIAGNOSTIC-SEED-REPLAY",
      "status": "blocked",
      "title": "Lock the active reducer diagnostic replay seed"
    },
    {
      "number": 8,
      "id": "CRP-08-TEMPLATE-AND-CHECKER-LOCK",
      "status": "blocked",
      "title": "Lock the implementation task template and checker contract"
    },
    {
      "number": 9,
      "id": "CRP-09-CLOSEOUT-EXPANDED-QUEUE",
      "status": "blocked",
      "title": "Close the bootstrap phase with an executable implementation queue"
    }
  ]
}
-->

## Purpose

This is the durable Ralph plan for cleanroom reducer convergence. It starts
with a bootstrap phase whose job is to turn the current cleanroom reducer
architecture evidence into a precise implementation queue without prescribing a
target-language Rust shape before the source and harness contracts are
executable.

The bootstrap phase succeeds only when the next runnable implementation work is
precise enough for Ralph:

- each task names exact source inputs: QNT, RAW, domain language, guidance,
  inventory rows, and connector paths;
- each task names exact outputs: backlog rows, scaffold/checker changes,
  target replay evidence shape, or a concrete implementation plan task;
- acceptance is measurable: route class, driver path, connector projection,
  durable owner, evidence path/schema, forbidden shortcuts, and checker
  commands;
- blockers are only dependency blockers or explicit owner decisions;
- every discovery that changes downstream work is reconciled through
  `Plan Impact`.

This plan must not close merely because research notes were written. Task 9
must either append concrete implementation tasks to this plan or create a new
Ralph launch plan with a synchronized `ralph-task-index`.

## Current Evidence

Source-side denominator facts from
`plans/cleanroom-branch-coverage/reducer-route-inventory.json`:

- `level-1-5-cleanroom-route-v1` has 101 `driverRouteAssignments`.
- Route classes are currently 75 `reducer-routed`, 15
  `catalog-after-substrate`, 10 `component-first`, and 1
  `replay-refresh-only`.
- The active reducer-spine diagnostic batch has 6 drivers: Magic Missile,
  save-gated spell ordering, Hit Point restoration ordering, death saving
  throw, Concentration break teardown, and scalar-buff active effects.

Source-side gap:

- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json` exists but
  has zero rows. It is not yet the executable implementation denominator.

Historical target evidence:

- `/workspace/typescript/dnd-cleanroom-jul2` is useful for diagnostic evidence
  and target failure modes, but its reports, ledgers, adapters, and code are
  not fresh cleanroom acceptance evidence.
- `/workspace/typescript/dnd-cleanroom-rust-agent` is historical output that
  explains source/guidance pressure. Its Rust reducer spine is not authority.

Architecture constraints:

- Production target behavior routes by runtime shape, typed facts,
  capabilities, procedure state, and durable state. It must not branch on
  authored ids, fixture labels, QNT branch names, or official catalog identity.
- Battle-level orchestration goes through one shared route shape:
  `BattleState -> discover_battle_acts -> resolve_battle_subject`, plus the
  interrupt and turn-advancement surfaces named by copied route connectors.
- QNT route work stays connector-based and leaf-import based. Do not introduce
  an abstract whole-route composition model that violates
  `scripts/check-mbt-driver-closure.cjs` or ADR-0001.

## Denominator

The expanded queue must account for these families:

| Family | Source Surface | Acceptance Surface |
| --- | --- | --- |
| Active diagnostic battle seed | 6 entries in `diagnosticBatches[0].entries` | target replay observes copied `qRoute` from public reducer entrypoints |
| Full route denominator | 101 `driverRouteAssignments` | each row appears exactly once in backlog or as an explicit source blocker |
| Component-first rule-core | 10 `component-first` rows | copied `qComponentRoute` plus component owner |
| Catalog-after-substrate | 15 selected-identity rows | generic substrate route/component evidence before catalog identity counts |
| Creation fill batch | `character-creation-runtime.mbt.qnt` plus `.route.mbt.qnt` | semantic `qState` and route `qRoute` both required |
| Session battle entry | `character-session-sheet-derived-battle-acts.mbt.qnt` plus `.route.mbt.qnt` | sheet/session projection, encounter composition, runtime entry, and settlement route |
| Settlement/rest owners | character-battle settlement and character-sheet rest drivers | source-exact deltas and rest-triggered recovery owners, not duplicated target state |

## DAG

| Task | Status | Depends On | Output |
| --- | --- | --- | --- |
| `CRP-01` | `ready-for-research` | none | populated backlog denominator rows |
| `CRP-02` | `ready-for-research` | none | replay evidence provenance contract |
| `CRP-03` | `blocked` | `CRP-02` | witness/domain vocabulary split |
| `CRP-04` | `blocked` | `CRP-01` | creation fill-batch implementation task rows |
| `CRP-05` | `blocked` | `CRP-01`, `CRP-02` | session battle entry implementation task rows |
| `CRP-06` | `blocked` | `CRP-01` | settlement/rest owner implementation task rows |
| `CRP-07` | `blocked` | `CRP-02`, `CRP-03` | active diagnostic seed implementation tasks |
| `CRP-08` | `blocked` | `CRP-01`-`CRP-07` | locked task template/checker contract |
| `CRP-09` | `blocked` | `CRP-08` | executable implementation queue |

## Required Task Template

Every implementation task emitted by this plan must include these sections:

- `Goal`: one driver, fixed driver group, harness rule, or owner boundary.
- `Starting Points`: exact file paths and inventory rows.
- `Output`: exact source/checker/scaffold files or target evidence artifacts.
- `Acceptance`: driver path, route class, connector path, accepted projection
  (`qRoute`, `qComponentRoute`, or semantic projection), durable owner,
  forbidden shortcuts, and measurable pass/fail condition.
- `Verification`: exact commands, plus reviewer-loop convergence and RAW or
  ubiquitous-language traceability where rule-bearing behavior is involved.
- `Plan Impact`: `none`, `update-required`, or `applied`.

## Global Verification

All bootstrap tasks must verify:

- Ralph contract: the task index and `### Task N` bodies stay synchronized, all
  blocked tasks have `Blocker Type` and `Blocker Detail`, and no task uses fake
  blockers.
- RAW/ubiquitous-language check: every rule-bearing task must read the relevant
  local SRD files under `.references/srd-5.2.1/` and `UBIQUITOUS_LANGUAGE.md`;
  non-rule-bearing harness tasks must explicitly state that no new rule
  behavior was modeled.
- Reviewer-loop convergence: run RAW traceability, domain language,
  architecture/connascence, and code-review passes after changes; fix every
  reasonable finding, reject only with a concrete reason, and repeat until no
  reasonable findings remain.
- `pnpm cleanroom-branch-coverage:check`
- relevant scaffold or harness checker commands named by the task
- `git diff --check`

Do not run MBT for bootstrap planning/checker work unless a later task
explicitly changes into runtime behavior and names a focused MBT command.

## Task Details

### Task 1 - CRP-01-DENOMINATOR-BACKLOG

Status: `ready-for-research`

Goal:

Populate the machine-readable reducer convergence backlog from the current
source-owned route denominator.

Starting Points:

- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.schema.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `plans/RALPH_L15_REDUCER_ROUTE_QNT_ARCHITECTURE.md`

Output:

- Update `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`.
- Add or update backlog fields only when the schema supports them. If the
  schema is insufficient, update the schema in the same task.
- Update this plan's denominator and downstream task details if counts differ.

Acceptance:

- The backlog has one row for each current
  `levelDenominators[0].driverRouteAssignments[]` row.
- Each row has at least: `driverPath`, `routeClass`, connector path or explicit
  blocker, durable owner or owner TODO classification, source task id, target
  task id placeholder, status, and blocker id when blocked.
- Counts reconcile to the current route inventory: 101 rows and the current
  route-class counts, or exact updated counts with cited source JSON paths.
- No row treats dirty cleanroom reports or Rust code as acceptance evidence.

Verification:

- `pnpm cleanroom-branch-coverage:check`
- `jq empty plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `jq empty plans/cleanroom-branch-coverage/reducer-convergence-backlog.schema.json`
- RAW/ubiquitous-language check: no new rule behavior should be modeled; verify
  every owner name comes from QNT, guidance, `UBIQUITOUS_LANGUAGE.md`, or an
  explicit blocker.
- Reviewer-loop convergence.
- `git diff --check`

Plan Impact:

`applied` when downstream tasks can reference concrete backlog rows instead of
raw inventory rows.

### Task 2 - CRP-02-ROUTE-EVENT-PROVENANCE

Status: `ready-for-research`

Goal:

Harden target replay evidence so passing evidence proves observed route events
from public target reducer entrypoints, not generated report equivalence or
adapter-local expected routes.

Starting Points:

- `plans/cleanroom-scaffolds/tasks/TARGET_REPLAY_EVIDENCE.example.template.json`
- `plans/cleanroom-scaffolds/tasks/IMPLEMENTER_TASK.template.md`
- `plans/cleanroom-scaffolds/tasks/REVIEWER_CHECKLIST.template.md`
- `plans/cleanroom-scaffolds/tasks/DECIDER_CHECKLIST.template.md`
- `scripts/check-cleanroom-harness.cjs`
- `scripts/cleanroom-branch-coverage-check.cjs`
- `/workspace/typescript/dnd-cleanroom-jul2/tasks/target-replay-evidence/*.json`
- `/workspace/typescript/dnd-cleanroom-rust-agent/tasks/target-replay-evidence/*.json`

Output:

- Update the scaffold evidence example and checklists, or add a concrete
  follow-up task if the checker change is too large for one pass.
- If checker code changes are made, add focused positive and negative fixtures
  or self-test coverage following existing checker patterns.

Acceptance:

- Metadata-only equality of expected/observed projection hashes is not enough
  unless the evidence also names the observed route event source.
- Evidence records the target entrypoint sequence, observed route event source,
  and reducer/public API path used to obtain the events.
- Generated validation reports remain readable views over evidence and cannot
  substitute for executable route-event provenance.
- The task explicitly distinguishes `qRoute`, `qComponentRoute`, and semantic
  projection evidence.

Verification:

- `pnpm cleanroom-branch-coverage:check`
- Any scaffold or harness checker self-test command named by the edited files.
- RAW/ubiquitous-language check: no new rule behavior should be modeled; verify
  only evidence provenance concepts changed.
- Reviewer-loop convergence.
- `git diff --check`

Plan Impact:

`applied` when `CRP-03`, `CRP-05`, `CRP-07`, and implementation tasks can rely
on route-event provenance as an acceptance gate.

### Task 3 - CRP-03-WITNESS-NAME-QUARANTINE

Status: `blocked`

Blocker Type: dependency

Blocker Detail: depends on `CRP-02` because the witness-name policy must be
attached to real route-event evidence, not metadata-only evidence.

Goal:

Separate QNT sampled-input witness names from ordinary production/domain
vocabulary so names like `roll`, `hit`, and `damage` do not force false
production leak findings.

Starting Points:

- `/workspace/typescript/dnd-cleanroom-jul2/tasks/BLOCKERS.md`
- `plans/cleanroom-scaffolds/tasks/TARGET_REPLAY_EVIDENCE.example.template.json`
- `plans/cleanroom-scaffolds/tasks/ENGINE_DEPTH_MANIFEST.example.template.json`
- `scripts/check-cleanroom-harness.cjs`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `packages/battle-runtime/battle-runtime-death-saving-throw.mbt.qnt`
- `packages/battle-runtime/creature-attack.mbt.qnt`

Output:

- Update harness/scaffold rules so sampled input names are quarantined as
  witness protocol only when tied to evidence fields, not banned as ordinary
  domain vocabulary in production modules.
- Add source-QNT follow-up tasks only if actual QNT sampled names must be
  renamed. Do not rename QNT in this task unless the checker contract already
  proves the rename is necessary.

Acceptance:

- A target can record sampled input names required by
  `mbt::nondetPicks` without broad production renames of legitimate domain
  words.
- Production QNT action names and witness field names remain quarantined.
- The July blockers for death save `roll` and creature attack `hit`/`damage`
  are either resolved by checker policy or converted into exact source-QNT
  follow-up tasks.

Verification:

- `pnpm cleanroom-branch-coverage:check`
- Relevant harness checker self-test or focused fixture command.
- RAW/ubiquitous-language check: verify `roll`, `hit`, and `damage` are
  legitimate domain vocabulary in local RAW/domain files before treating them
  as allowed production words.
- Reviewer-loop convergence.
- `git diff --check`

Plan Impact:

`applied` when death-save and creature-attack implementation tasks can be
unblocked or assigned to exact source-QNT rename follow-ups.

### Task 4 - CRP-04-CREATION-FILL-BATCH

Status: `blocked`

Blocker Type: dependency

Blocker Detail: depends on `CRP-01` because the creation rows must be emitted
from concrete backlog rows, not handwritten from memory.

Goal:

Task-shape character creation fill-batch implementation work so a fresh target
must prove both semantic draft/fill/finalize behavior and reducer-route
reachability.

Starting Points:

- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `packages/character-creation-runtime/character-creation-runtime.mbt.qnt`
- `packages/character-creation-runtime/character-creation-runtime-slice.qnt`
- `packages/character-creation-runtime/character-creation-runtime.route.mbt.qnt`
- `packages/character-creation-runtime/character-creation-reducer-route.qnt`
- `packages/character-creation-runtime/VOCABULARY.md`
- `packages/character-creation-runtime/src/fill-reducer.ts` for source intent
  evidence only, not target acceptance evidence.

Output:

- Add concrete downstream implementation tasks or backlog child rows for
  character creation fill-batch work.
- Each emitted task must name semantic `qState` evidence and route `qRoute`
  evidence when both are required.

Acceptance:

- Tasks preserve batch semantics: stale revision rejection, duplicate fill
  rejection, wrong fill kind rejection, cardinality checks, accepted fill
  application, hole rediscovery, and finalization.
- Optional fields and empty collections have distinct meanings in any proposed
  target state owner notes.
- The plan does not tell the target to copy TS module shape or Rust July
  projection fields.

Verification:

- `pnpm cleanroom-branch-coverage:check`
- `jq empty plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- RAW/ubiquitous-language check: read local character creation SRD anchors and
  `UBIQUITOUS_LANGUAGE.md` or package vocabulary for every rule-bearing
  creation concept named in tasks.
- Reviewer-loop convergence.
- `git diff --check`

Plan Impact:

`applied` when downstream creation implementation tasks are indexed,
dependency-shaped, and measurable.

### Task 5 - CRP-05-SESSION-BATTLE-ENTRY

Status: `blocked`

Blocker Type: dependency

Blocker Detail: depends on `CRP-01` for concrete backlog rows and `CRP-02` for
route-event provenance.

Goal:

Task-shape character session to battle entry so a fresh target composes sheet
projection, encounter participants, subject profiles, Initiative, current
actor, runtime entry, and settlement through source-owned route evidence.

Starting Points:

- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `packages/character-battle-runtime/character-battle-encounter-composition.route.mbt.qnt`
- `packages/character-battle-runtime/character-session-sheet-derived-battle-acts.mbt.qnt`
- `packages/character-battle-runtime/character-session-sheet-derived-battle-acts.route.mbt.qnt`
- `packages/character-battle-runtime/character-battle-init-projection.route.mbt.qnt`
- `packages/character-battle-runtime/src/battle-creature-init.ts` for current
  system intent only.

Output:

- Add concrete downstream implementation tasks or backlog child rows for
  session battle entry and sheet-derived battle acts.

Acceptance:

- Tasks require one composed battle setup or an equivalent typed pre-entry
  operation followed immediately by runtime entry.
- Tasks forbid driver-local opponent, subject-profile, Initiative, or current
  actor caches when battle setup can own those facts.
- Tasks require source-exact spell-slot spend and settlement evidence where the
  driver demands it.

Verification:

- `pnpm cleanroom-branch-coverage:check`
- RAW/ubiquitous-language check: read local SRD anchors for combat order,
  Initiative, Spell Slots, and Settlement vocabulary before naming owner facts.
- Reviewer-loop convergence.
- `git diff --check`

Plan Impact:

`applied` when session battle entry implementation work is concrete and
depends on route-event provenance.

### Task 6 - CRP-06-SETTLEMENT-REST-OWNERS

Status: `blocked`

Blocker Type: dependency

Blocker Detail: depends on `CRP-01` because owner rows must be derived from the
backlog denominator.

Goal:

Task-shape battle-to-sheet settlement and sheet rest ownership so source-exact
resource deltas and rest-triggered recovery are not duplicated across target
state layers.

Starting Points:

- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `packages/character-battle-runtime/character-battle-settlement.mbt.qnt`
- `packages/character-battle-runtime/character-battle-settlement.route.mbt.qnt`
- `packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt`
- `packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.route.mbt.qnt`
- `packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt`
- `packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.route.mbt.qnt`
- `packages/character-sheet-runtime/src/rests.ts` for current system intent
  only.

Output:

- Add concrete downstream implementation tasks or backlog child rows for
  settlement, rest, Spell Slot, Pact Slot, Hit Point, Hit Die, Stable, and
  resource recovery owner boundaries.

Acceptance:

- Tasks distinguish battle-owned deltas, sheet-owned durable state, and
  executable boundary projections.
- Tasks reject mixed-provenance resource settlement when copied QNT requires
  conflict detection.
- Tasks require explicit treatment of Short Rest, Long Rest, and rest-triggered
  feature recovery where the source drivers require them.

Verification:

- `pnpm cleanroom-branch-coverage:check`
- RAW/ubiquitous-language check: read local SRD anchors for Short Rest, Long
  Rest, Hit Points, Hit Dice, Stable, Spell Slots, Pact Slots, and the named
  feature recovery facts before emitting tasks.
- Reviewer-loop convergence.
- `git diff --check`

Plan Impact:

`applied` when settlement/rest implementation tasks have exact owner and
evidence boundaries.

### Task 7 - CRP-07-DIAGNOSTIC-SEED-REPLAY

Status: `blocked`

Blocker Type: dependency

Blocker Detail: depends on `CRP-02` for route-event provenance and `CRP-03` for
sampled-input witness naming.

Goal:

Lock the active reducer diagnostic seed as the first target implementation
batch after the source/harness contract is precise.

Starting Points:

- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `packages/battle-runtime/battle-runtime-magic-missile.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-death-saving-throw.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-concentration-break-teardown.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.route.mbt.qnt`
- `/workspace/typescript/dnd-cleanroom-jul2/tasks/BLOCKERS.md`

Output:

- Add concrete downstream implementation tasks for the six active diagnostic
  drivers, or record exact dependency/source blockers for rows that cannot yet
  be implemented.

Acceptance:

- Magic Missile, save-gated spell ordering, Hit Point restoration ordering,
  Concentration teardown, and scalar-buff active effects have implementation
  tasks that require observed public route events.
- Death saving throw is either unblocked by `CRP-03` or explicitly blocked by
  a source-QNT sampled-input naming task.
- Tasks state durable owner expectations for action economy, Spell Slot, Hit
  Point, death-save, Concentration, active-effect, movement, Temporary Hit
  Point, and hole-frontier ownership as applicable.

Verification:

- `pnpm cleanroom-branch-coverage:check`
- RAW/ubiquitous-language check: read local SRD anchors for the six diagnostic
  driver families before finalizing emitted tasks.
- Reviewer-loop convergence.
- `git diff --check`

Plan Impact:

`applied` when the first implementation batch is runnable or blocked only by
valid dependency/owner-decision blockers.

### Task 8 - CRP-08-TEMPLATE-AND-CHECKER-LOCK

Status: `blocked`

Blocker Type: dependency

Blocker Detail: depends on `CRP-01` through `CRP-07` so the template reflects
all discovered required fields and blocker classes.

Goal:

Lock the reusable task template and checker contract used by generated
implementation tasks.

Starting Points:

- This plan's `Required Task Template`
- `scripts/ralph-run.md`
- `plans/cleanroom-scaffolds/tasks/IMPLEMENTER_TASK.template.md`
- `plans/cleanroom-scaffolds/tasks/REVIEWER_CHECKLIST.template.md`
- `plans/cleanroom-scaffolds/tasks/DECIDER_CHECKLIST.template.md`
- `plans/cleanroom-scaffolds/tasks/TARGET_REPLAY_EVIDENCE.example.template.json`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.schema.json`

Output:

- Update scaffold templates and/or this plan so every generated implementation
  task has the required sections, evidence fields, valid blocker classes, and
  verification commands.

Acceptance:

- The template requires `Goal`, `Starting Points`, `Output`, `Acceptance`,
  `Verification`, and `Plan Impact`.
- The template requires reviewer-loop convergence and RAW/ubiquitous-language
  traceability for rule-bearing tasks.
- The template forbids generic "improve architecture" wording.
- The template states that MBT is not a bootstrap verification step and is used
  only by implementation tasks that explicitly name a focused MBT command.

Verification:

- `pnpm cleanroom-branch-coverage:check`
- Relevant scaffold checker command if scaffold files changed.
- RAW/ubiquitous-language check: no new rule behavior should be modeled; verify
  only planning/harness vocabulary changed.
- Reviewer-loop convergence.
- `git diff --check`

Plan Impact:

`applied` when `CRP-09` can generate or append implementation tasks using the
locked template.

### Task 9 - CRP-09-CLOSEOUT-EXPANDED-QUEUE

Status: `blocked`

Blocker Type: dependency

Blocker Detail: depends on `CRP-08`.

Goal:

Close the bootstrap phase by producing a concrete executable implementation
queue.

Starting Points:

- This plan after `CRP-08`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-scaffolds/**`
- `scripts/ralph-run.md`

Output:

- Either append implementation tasks to this plan with synchronized
  `ralph-task-index`, DAG, and task bodies, or create a new Ralph launch plan
  such as `plans/RALPH_CLEANROOM_REDUCER_IMPLEMENTATION_QUEUE.md`.
- If a new plan is created, update this plan to point to it and mark closeout
  criteria complete.

Acceptance:

- Every generated implementation task has exact `driverPath`, `routeClass`,
  connector path or blocker, durable owner, target replay evidence requirement,
  accepted projection, forbidden shortcuts, and verification commands.
- Every still-blocked task has `Blocker Type: dependency | owner-decision` and
  a concrete `Blocker Detail`.
- No desired work is left only in prose. If work remains desired, it appears in
  the task index and DAG.
- The closeout explains why the final queue has more, fewer, or different tasks
  than the provisional nine-task bootstrap.

Verification:

- `pnpm cleanroom-branch-coverage:check`
- `jq empty plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- Validate the generated Ralph plan index and matching `### Task N` bodies by
  inspection or an available local checker.
- RAW/ubiquitous-language check: every rule-bearing generated task includes
  local SRD and `UBIQUITOUS_LANGUAGE.md` starting points.
- Reviewer-loop convergence.
- `git diff --check`

Plan Impact:

`applied` when the executable queue is present, synchronized, and ready for a
separate Ralph run.
