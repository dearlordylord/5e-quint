# Ralph Lane B: QNT Deepening

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "QNTD-B01-HP-RECOVERY-RUST-DRY-RUN",
      "status": "done",
      "title": "Run the Hit Point recovery manual Rust dry-run vertical"
    },
    {
      "number": 2,
      "id": "QNTD-B02-HP-RECOVERY-DRY-RUN-REVIEW",
      "status": "done",
      "title": "Review the recovery dry run for projection and connascence gaps"
    },
    {
      "number": 3,
      "id": "QNTD-B03-CREATURE-SIZE-FOCUSED-MBT",
      "status": "done",
      "title": "Add Enlarge/Reduce creature-size lifecycle focused MBT"
    },
    {
      "number": 4,
      "id": "QNTD-B04-LEVITATE-CREATURE-FOCUSED-MBT",
      "status": "done",
      "title": "Add Levitate creature lifecycle focused MBT"
    },
    {
      "number": 5,
      "id": "QNTD-B05-ROLL-MODIFIER-FOCUSED-MBT",
      "status": "done",
      "title": "Add roll-modifier active effects focused MBT"
    },
    {
      "number": 6,
      "id": "QNTD-B06-AFTER-HIT-RIDERS-FOCUSED-MBT",
      "status": "ready-for-research",
      "title": "Add after-hit damage riders focused MBT"
    },
    {
      "number": 7,
      "id": "QNTD-B07-WEAPON-HOSTED-ATTACK-FOCUSED-MBT",
      "status": "ready-for-research",
      "title": "Add weapon-hosted attack and riders focused MBT"
    },
    {
      "number": 8,
      "id": "QNTD-B08-COMMAND-OPTION-FOCUSED-MBT",
      "status": "blocked",
      "title": "Add Command option and next-turn focused MBT"
    },
    {
      "number": 9,
      "id": "QNTD-B09-ABILITY-CHECK-SEARCH-FOCUSED-MBT",
      "status": "blocked",
      "title": "Add Ability Check choice and Search holes focused MBT"
    },
    {
      "number": 10,
      "id": "QNTD-B10-SHOVE-WITNESS-POLICY",
      "status": "blocked",
      "title": "Decide whether Shove deterministic replay needs focused MBT"
    },
    {
      "number": 11,
      "id": "QNTD-B11-QNT-DEEPENING-CLOSEOUT",
      "status": "blocked",
      "title": "Close out QNT deepening artifacts and program rollup"
    },
    {
      "number": 12,
      "id": "QNTD-B12-RECURSIVE-NEXT-BATCH",
      "status": "blocked",
      "title": "Plan the next QNT deepening batch if this lane drains"
    }
  ]
}
-->

This is the next runnable QNT deepening lane after generator readiness closure.
The current generator-readiness gate is closed: `generator-readiness.jsonl` has
69 rows, every row is `generation-subset-clean`, and
`REPORT.md` says there are no missing or `not-assessed` generator-readiness
rows.

This lane is not blocker cleanup. Its goal is to deepen generator confidence by
turning high-value covered obligations into focused witness shapes and by
continuing the manual Rust dry-run path without creating generated runtime
state.

## Context Budget

Read only these by default:

- `plans/QNT_COVERAGE_PROGRAM.md`
- `plans/rules-kernel-coverage/README.md`
- `plans/rules-kernel-coverage/COMPOSITE_SLICE_CANDIDATES.md`
- `plans/rules-kernel-coverage/HIT_POINT_RECOVERY_RUST_DRY_RUN.md`
- The relevant rows in `plans/rules-kernel-coverage/obligations.jsonl`
- The relevant rows in `plans/rules-kernel-coverage/generator-readiness.jsonl`
- The exact QNT owners, TS owners, parity witnesses, SRD passages, and
  `UBIQUITOUS_LANGUAGE.md` sections named by the current task

Do not reread closed Ralph lanes or deleted historical plans. Generated
`matrix.json` and unit matrices are secondary diagnostics unless a task changes
checker output.

## Lane Rules

- Before starting each task, verify the task base:
  `git log --oneline -1 <declared-base-ref>`, `git log --oneline -1 HEAD`, and
  `git merge-base --is-ancestor <declared-base-sha> HEAD`.
- For modeled rules, read the named SRD passages under
  `.references/srd-5.2.1/` and check the named `UBIQUITOUS_LANGUAGE.md`
  sections before editing.
- Do not add production reducer behavior that diverges from the authoritative
  QNT model. If behavior changes, update the QNT owner first.
- Do not add parallel generated state. Future generator/Rust artifacts must
  project from the existing runtime owners recorded in
  `kernel-ir-boundaries.jsonl`.
- Do not dispatch production runtime behavior on authored Unit or Spell
  identity. SRD identity may appear in content, tests, and selected-identity
  evidence only.
- Keep focused MBT slices bounded. If a slice exceeds the local semantic-core
  size budget or starts mixing unrelated lifecycle invariants, split the task
  before claiming support.
- Treat battle MBT as scarce. Use source reading and focused deterministic
  tests for exploration; run the task's MBT only after code changes are ready.

## Verification

Every task must run the narrowest relevant checks and include:

- RAW/ubiquitous-language check against the SRD and language anchors named by
  the task.
- Reviewer-loop convergence: RAW traceability, ubiquitous-language/domain
  language, architecture/connascence, and code review. Fix every reasonable
  finding; reject only with a concrete reason; repeat until no reasonable
  findings remain.
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- Focused package test or MBT named by the task when implementation changes
  source or witness rows.
- `git diff --check`

For battle MBT tasks, first check:

```sh
ps aux | grep vitest | grep -v grep
ps aux | grep quint_evaluator | grep -v grep
```

If a prior `quint_evaluator` is alive, stop it with
`killall -9 quint_evaluator`. If a vitest/MBT process is alive, do not start
another MBT run. Run the MBT with the repo timing/background protocol from
`CLAUDE.md`.

## DAG / Queue Order

| # | Task | Status | Depends on | Notes |
| ---: | --- | --- | --- | --- |
| 1 | QNTD-B01-HP-RECOVERY-RUST-DRY-RUN - Run the Hit Point recovery manual Rust dry-run vertical | done | none | Starts the manual Rust dry-run path. |
| 2 | QNTD-B02-HP-RECOVERY-DRY-RUN-REVIEW - Review the recovery dry run for projection and connascence gaps | done | QNTD-B01-HP-RECOVERY-RUST-DRY-RUN | Reviews the artifact produced by Task 1. |
| 3 | QNTD-B03-CREATURE-SIZE-FOCUSED-MBT - Add Enlarge/Reduce creature-size lifecycle focused MBT | done | none | Independent focused MBT promotion. |
| 4 | QNTD-B04-LEVITATE-CREATURE-FOCUSED-MBT - Add Levitate creature lifecycle focused MBT | done | none | Independent focused MBT promotion. |
| 5 | QNTD-B05-ROLL-MODIFIER-FOCUSED-MBT - Add roll-modifier active effects focused MBT | done | none | Independent focused MBT promotion. |
| 6 | QNTD-B06-AFTER-HIT-RIDERS-FOCUSED-MBT - Add after-hit damage riders focused MBT | ready-for-research | none | Independent focused MBT promotion. |
| 7 | QNTD-B07-WEAPON-HOSTED-ATTACK-FOCUSED-MBT - Add weapon-hosted attack and riders focused MBT | ready-for-research | none | Independent focused MBT promotion. |
| 8 | QNTD-B08-COMMAND-OPTION-FOCUSED-MBT - Add Command option and next-turn focused MBT | blocked | QNTD-B03-CREATURE-SIZE-FOCUSED-MBT, QNTD-B04-LEVITATE-CREATURE-FOCUSED-MBT, QNTD-B05-ROLL-MODIFIER-FOCUSED-MBT, QNTD-B06-AFTER-HIT-RIDERS-FOCUSED-MBT, QNTD-B07-WEAPON-HOSTED-ATTACK-FOCUSED-MBT | Runs after the runtime-test-only battle rows drain. |
| 9 | QNTD-B09-ABILITY-CHECK-SEARCH-FOCUSED-MBT - Add Ability Check choice and Search holes focused MBT | blocked | QNTD-B03-CREATURE-SIZE-FOCUSED-MBT, QNTD-B04-LEVITATE-CREATURE-FOCUSED-MBT, QNTD-B05-ROLL-MODIFIER-FOCUSED-MBT, QNTD-B06-AFTER-HIT-RIDERS-FOCUSED-MBT, QNTD-B07-WEAPON-HOSTED-ATTACK-FOCUSED-MBT | Runs after the runtime-test-only battle rows drain. |
| 10 | QNTD-B10-SHOVE-WITNESS-POLICY - Decide whether Shove deterministic replay needs focused MBT | blocked | QNTD-B08-COMMAND-OPTION-FOCUSED-MBT, QNTD-B09-ABILITY-CHECK-SEARCH-FOCUSED-MBT | Runs after deterministic-replay upgrades are decided for Command and Search. |
| 11 | QNTD-B11-QNT-DEEPENING-CLOSEOUT - Close out QNT deepening artifacts and program rollup | blocked | QNTD-B01-HP-RECOVERY-RUST-DRY-RUN, QNTD-B02-HP-RECOVERY-DRY-RUN-REVIEW, QNTD-B03-CREATURE-SIZE-FOCUSED-MBT, QNTD-B04-LEVITATE-CREATURE-FOCUSED-MBT, QNTD-B05-ROLL-MODIFIER-FOCUSED-MBT, QNTD-B06-AFTER-HIT-RIDERS-FOCUSED-MBT, QNTD-B07-WEAPON-HOSTED-ATTACK-FOCUSED-MBT, QNTD-B08-COMMAND-OPTION-FOCUSED-MBT, QNTD-B09-ABILITY-CHECK-SEARCH-FOCUSED-MBT, QNTD-B10-SHOVE-WITNESS-POLICY | Closes after all implementation and policy tasks. |
| 12 | QNTD-B12-RECURSIVE-NEXT-BATCH - Plan the next QNT deepening batch if this lane drains | blocked | QNTD-B11-QNT-DEEPENING-CLOSEOUT | Keeps the lane recursive after closeout. |

## Task Details

### Task 1 - QNTD-B01-HP-RECOVERY-RUST-DRY-RUN - Run the Hit Point recovery manual Rust dry-run vertical

Status: `done`

Input:

- `plans/rules-kernel-coverage/HIT_POINT_RECOVERY_RUST_DRY_RUN_PLAN.md`
- Obligation: `SHEET.HP_REST_HIT_DICE.TRANSITIONS`
- Semantic core:
  `packages/shared-algebras/proofs/rule-core/hit-point-recovery.qnt`
- Existing runtime owner: `packages/character-sheet-runtime/src/index.ts`
- Existing parity witness:
  `packages/character-sheet-runtime/src/hp-rest-hit-dice.mbt.test.ts`
- RAW and language anchors named in the dry-run plan.

Output:

- Create the manual dry-run artifact for the first recovery vertical, parallel
  to `HIT_POINT_DAMAGE_RUST_DRY_RUN.md`.
- Map only the pure healing transition: positive-Hit-Point Unconscious recovery,
  Death Saving Throw reset, Hit Point cap, and regained-Hit-Point result.
- Keep Short Rest, Long Rest, Hit Point Dice spending, Stable elapsed-time
  recovery, and Knock Out recovery out of scope.
- Reuse existing Character Sheet state as the source of projection facts; do
  not introduce a second sheet model or Rust ABI.

Acceptance:

- New dry-run artifact records QNT-to-Rust type/function mapping and all
  projection boundaries.
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### Task 2 - QNTD-B02-HP-RECOVERY-DRY-RUN-REVIEW - Review the recovery dry run for projection and connascence gaps

Status: `done`

Input: Task 1 artifact, `kernel-ir-boundaries.jsonl`, and the existing
Character Sheet HP/rest runtime owner.

Output:

- Audit the dry run for duplicated sheet state, ambiguous optional fields,
  domain-language drift, and strong connascence between QNT and projected Rust
  shapes.
- If the dry run is clean, update the program rollup to point at it as the
  current recovery evidence. If not, append exact repair tasks to this lane.

Acceptance:

- Dry-run review has no reasonable unresolved projection or connascence finding.
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### Task 3 - QNTD-B03-CREATURE-SIZE-FOCUSED-MBT - Add Enlarge/Reduce creature-size lifecycle focused MBT

Status: `done`

Input: `QCP-CS1` from `COMPOSITE_SLICE_CANDIDATES.md`.

Output:

- Add a focused MBT pair for
  `BATTLE.SPELL.CREATURE_SIZE_CHANGE_LIFECYCLE`.
- Cover failed and successful unwilling-target saves, Enlarge/Reduce Size
  projection, Strength D20 Test roll modes, attack-hit damage adjustment,
  Concentration cleanup, and duration cleanup.
- Add the package script and update the obligation witness list.

Acceptance:

- Focused MBT green.
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### Task 4 - QNTD-B04-LEVITATE-CREATURE-FOCUSED-MBT - Add Levitate creature lifecycle focused MBT

Status: `done`

Input: `QCP-CS2` from `COMPOSITE_SLICE_CANDIDATES.md`.

Output:

- Add a focused MBT pair for
  `BATTLE.SPELL.LEVITATED_CREATURE_LIFECYCLE`.
- Cover save-gated suspension, caller-selected altitude, caster Magic Action
  control, witnessed target movement, range-gated control, duration cleanup,
  and Concentration cleanup.
- Keep route choice, fixed-object/surface reach, map geometry, and target
  visibility as caller/table facts.
- Add the package script and update the obligation witness list.

Acceptance:

- Focused MBT green.
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### Task 5 - QNTD-B05-ROLL-MODIFIER-FOCUSED-MBT - Add roll-modifier active effects focused MBT

Status: `done`

Input: `QCP-CS3` from `COMPOSITE_SLICE_CANDIDATES.md`.

Output:

- Add a focused MBT pair for `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS`.
- Cover attack-roll, Saving Throw, Ability Check, and skill-choice roll-mode
  projection, including choice holes that store the selected Ability or Skill.
- Include Thaumaturgy only if it remains bounded under the same semantic core;
  otherwise split it into a new task before implementation.
- Add the package script and update the obligation witness list.

Acceptance:

- Focused MBT green.
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### Task 6 - QNTD-B06-AFTER-HIT-RIDERS-FOCUSED-MBT - Add after-hit damage riders focused MBT

Status: `ready-for-research`

Input: `QCP-CS4` from `COMPOSITE_SLICE_CANDIDATES.md`.

Output:

- Add a focused MBT pair for `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS`.
- Keep the first slice bounded to activation, Spell Slot or free-cast spend,
  immediate hit payloads, Concentration ownership, and cleanup.
- If timed start-turn damage or escape checks push the slice over budget, split
  them into a second task before claiming the witness.
- Add the package script and update the obligation witness list.

Acceptance:

- Focused MBT green.
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### Task 7 - QNTD-B07-WEAPON-HOSTED-ATTACK-FOCUSED-MBT - Add weapon-hosted attack and riders focused MBT

Status: `ready-for-research`

Input: `QCP-CS5` from `COMPOSITE_SLICE_CANDIDATES.md`.

Output:

- Add a focused MBT pair for
  `BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS`.
- Cover spellcasting-ability attack and damage replacement, weapon damage-type
  choice, held-weapon override, weapon-hit rider application, and timed cleanup.
- Add the package script and update the obligation witness list.

Acceptance:

- Focused MBT green.
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### Task 8 - QNTD-B08-COMMAND-OPTION-FOCUSED-MBT - Add Command option and next-turn focused MBT

Status: `blocked`

Input: `QCP-CS6` from `COMPOSITE_SLICE_CANDIDATES.md`.

Output:

- Add a dedicated focused MBT pair for
  `BATTLE.COMMAND.OPTION_AND_NEXT_TURN`.
- Cover failed-save pending effect recording, Grovel, Drop, Halt, Approach,
  Flee, accepted/rejected movement fills, end-turn cleanup, and Opportunity
  Attack continuation where the reducer owns continuation.
- Keep route choice and object inventory as table-owned facts.
- Add the package script and update the obligation witness list.

Acceptance:

- Focused MBT green.
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### Task 9 - QNTD-B09-ABILITY-CHECK-SEARCH-FOCUSED-MBT - Add Ability Check choice and Search holes focused MBT

Status: `blocked`

Input: `QCP-CS7` from `COMPOSITE_SLICE_CANDIDATES.md`.

Output:

- Add a dedicated focused MBT pair for
  `BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES`.
- Cover Search success/failure against admitted hidden targets, Ability Check
  fill legality, spell-selected Skill or Ability choices, and stored roll-mode
  projection.
- Add the package script and update the obligation witness list.

Acceptance:

- Focused MBT green.
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### Task 10 - QNTD-B10-SHOVE-WITNESS-POLICY - Decide whether Shove deterministic replay needs focused MBT

Status: `blocked`

Input: `QCP-CS8` from `COMPOSITE_SLICE_CANDIDATES.md`.

Output:

- Decide whether the existing deterministic replay remains sufficient for
  `BATTLE.SHOVE.OUTCOME_AND_PUSH_BOUNDARY`.
- If it remains sufficient, document the no-op policy decision in the composite
  candidate artifact or program rollup.
- If focused MBT is required, add the MBT pair, package script, and obligation
  witness update covering save pass/fail, Prone, accepted push, blocked push,
  invalid push distance, and Attack resource spending.

Acceptance:

- Policy decision is recorded with a concrete reason, or focused MBT is green.
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### Task 11 - QNTD-B11-QNT-DEEPENING-CLOSEOUT - Close out QNT deepening artifacts and program rollup

Status: `blocked`

Input: results from Tasks 1-10.

Output:

- Refresh generated rules-kernel coverage artifacts.
- Update `QNT_COVERAGE_PROGRAM.md` and this lane with the final deepening
  status, including which obligations gained focused MBT witnesses and which
  deterministic replay witnesses deliberately remain.
- Record any new generator/Rust follow-up only as runnable task ids, not prose
  backlog.

Acceptance:

- Program rollup points at current source-of-truth artifacts with no stale lane
  or blocker claims.
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### Task 12 - QNTD-B12-RECURSIVE-NEXT-BATCH - Plan the next QNT deepening batch if this lane drains

Status: `blocked`

Input: current generated reports and lane closeout after Task 11.

Output:

- If this lane closes, create the next coherent QNT/generator/Rust deepening
  plan with 10-20 atomic tasks.
- If it does not close, append exact repair tasks here instead of ending the
  run.

Acceptance:

- Ralph has a concrete next plan or concrete repair tasks, never an empty end
  state.
