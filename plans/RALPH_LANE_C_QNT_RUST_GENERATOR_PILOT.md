# Ralph Lane C: QNT Rust Generator Pilot

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "QNTR-C01-RUST-PILOT-BOUNDARY",
      "status": "ready-for-research",
      "title": "Define the first Rust pilot boundary from existing HP dry runs"
    },
    {
      "number": 2,
      "id": "QNTR-C02-HP-DAMAGE-RUST-MANUAL",
      "status": "blocked-on-QNTR-C01-RUST-PILOT-BOUNDARY",
      "title": "Hand-code the positive-Hit-Point damage Rust pilot slice"
    },
    {
      "number": 3,
      "id": "QNTR-C03-HP-DAMAGE-RUST-PARITY",
      "status": "blocked-on-QNTR-C02-HP-DAMAGE-RUST-MANUAL",
      "title": "Add Rust parity fixtures for positive-Hit-Point damage"
    },
    {
      "number": 4,
      "id": "QNTR-C04-HP-RECOVERY-RUST-MANUAL",
      "status": "blocked-on-QNTR-C01-RUST-PILOT-BOUNDARY",
      "title": "Hand-code the pure healing Rust pilot slice"
    },
    {
      "number": 5,
      "id": "QNTR-C05-HP-RECOVERY-RUST-PARITY",
      "status": "blocked-on-QNTR-C04-HP-RECOVERY-RUST-MANUAL",
      "title": "Add Rust parity fixtures for pure Hit Point healing"
    },
    {
      "number": 6,
      "id": "QNTR-C06-RUST-PILOT-DRY-RUN-REVIEW",
      "status": "blocked-on-QNTR-C03-HP-DAMAGE-RUST-PARITY-QNTR-C05-HP-RECOVERY-RUST-PARITY",
      "title": "Review Rust pilot slices for projection and connascence gaps"
    },
    {
      "number": 7,
      "id": "QNTR-C07-GENERATOR-SUBSET-CONTRACT",
      "status": "blocked-on-QNTR-C06-RUST-PILOT-DRY-RUN-REVIEW",
      "title": "Turn the HP dry-run subset into a checked generator contract"
    },
    {
      "number": 8,
      "id": "QNTR-C08-QNT-AST-SNAPSHOT-HP-DAMAGE",
      "status": "blocked-on-QNTR-C07-GENERATOR-SUBSET-CONTRACT",
      "title": "Capture a generator-facing QNT AST snapshot for HP damage"
    },
    {
      "number": 9,
      "id": "QNTR-C09-GENERATE-HP-DAMAGE-TYPES",
      "status": "blocked-on-QNTR-C08-QNT-AST-SNAPSHOT-HP-DAMAGE",
      "title": "Generate Rust type skeletons for HP damage"
    },
    {
      "number": 10,
      "id": "QNTR-C10-GENERATE-HP-DAMAGE-FUNCTION",
      "status": "blocked-on-QNTR-C09-GENERATE-HP-DAMAGE-TYPES",
      "title": "Generate the Rust HP damage transition body"
    },
    {
      "number": 11,
      "id": "QNTR-C11-QNT-AST-SNAPSHOT-HP-RECOVERY",
      "status": "blocked-on-QNTR-C07-GENERATOR-SUBSET-CONTRACT",
      "title": "Capture a generator-facing QNT AST snapshot for HP recovery"
    },
    {
      "number": 12,
      "id": "QNTR-C12-GENERATE-HP-RECOVERY-TYPES",
      "status": "blocked-on-QNTR-C11-QNT-AST-SNAPSHOT-HP-RECOVERY",
      "title": "Generate Rust type skeletons for HP recovery"
    },
    {
      "number": 13,
      "id": "QNTR-C13-GENERATE-HP-RECOVERY-FUNCTION",
      "status": "blocked-on-QNTR-C12-GENERATE-HP-RECOVERY-TYPES",
      "title": "Generate the Rust pure healing transition body"
    },
    {
      "number": 14,
      "id": "QNTR-C14-HIT-POINT-RESTORATION-DRY-RUN",
      "status": "blocked-on-QNTR-C06-RUST-PILOT-DRY-RUN-REVIEW",
      "title": "Add the spell Hit Point restoration Rust dry run"
    },
    {
      "number": 15,
      "id": "QNTR-C15-LANE-C-CLOSEOUT",
      "status": "blocked-on-QNTR-C10-GENERATE-HP-DAMAGE-FUNCTION-QNTR-C13-GENERATE-HP-RECOVERY-FUNCTION-QNTR-C14-HIT-POINT-RESTORATION-DRY-RUN",
      "title": "Close out the Rust generator pilot and choose the next slice"
    }
  ]
}
-->

Lane C is the next QNT/generator/Rust deepening batch after Lane B closed. It
does not reopen coverage or generator-readiness blockers: `REPORT.md` shows 97
rules-kernel obligations, 91 covered obligations, 0 open transitional
obligations, and 6 boundary or unsupported obligations; `generator-readiness.jsonl`
has 69 rows, all `generation-subset-clean`, with no `blockedBy` or
`followUpTaskIds`.

The batch turns the two existing Hit Point manual dry runs into a small Rust
pilot and then a minimal generator target. It must not wire generated Rust into
production reducers, create parallel runtime state, or dispatch on authored
Unit or Spell identity.

## Context Budget

Read only these by default:

- `plans/QNT_COVERAGE_PROGRAM.md`
- `plans/rules-kernel-coverage/README.md`
- `plans/rules-kernel-coverage/HIT_POINT_DAMAGE_RUST_DRY_RUN.md`
- `plans/rules-kernel-coverage/HIT_POINT_RECOVERY_RUST_DRY_RUN.md`
- The relevant rows in `plans/rules-kernel-coverage/obligations.jsonl`,
  `generator-readiness.jsonl`, `qnt-owner-roles.jsonl`, and
  `kernel-ir-boundaries.jsonl`
- The exact QNT owners, TS owners, parity witnesses, SRD passages, and
  `UBIQUITOUS_LANGUAGE.md` sections named by the current task

Do not reread closed Ralph lanes or deleted historical plans. Parked backlog
rows in `plans/QNT_GENERATOR_READINESS_BACKLOG.md` are not active blockers; they
should be reopened only if Lane C closeout identifies a current checker-owned
reason.

## Lane Rules

- Before starting each task, verify the task base:
  `git log --oneline -1 <declared-base-ref>`, `git log --oneline -1 HEAD`, and
  `git merge-base --is-ancestor <declared-base-sha> HEAD`.
- For modeled rules, read the named SRD passages under
  `.references/srd-5.2.1/` and check the named `UBIQUITOUS_LANGUAGE.md`
  sections before editing.
- Keep generated or hand-coded Rust as pilot evidence until a later plan
  explicitly promotes runtime integration. TypeScript reducers remain the
  production source of behavior in this lane.
- Reuse existing runtime owners recorded in `kernel-ir-boundaries.jsonl`.
  Generated or hand-coded Rust may project from those owners; it must not own a
  second durable Character Sheet, BattleState, resource, active-effect, or
  authored catalog model.
- If Rust code is introduced, keep constructors parse-shaped: invalid ordinary
  input returns typed errors; internal impossible branches may assert only after
  an immediately preceding parser or narrowed workflow proves the invariant.
- Do not broaden the generator subset while implementing a task. If the current
  semantic core needs a new QNT construct, update the subset contract and the
  checker in the same task, or split a follow-up before claiming support.
- Battle MBT remains scarce. These tasks should use source reading, Rust tests,
  focused TS unit tests, and checker validation unless a task changes a battle
  MBT witness row.

## Verification

Every implementation task must run the narrowest relevant checks and include:

- RAW/ubiquitous-language check against the SRD and language anchors named by
  the task. For the HP pilot this includes
  `.references/srd-5.2.1/Playing-the-Game.md#Hit Points`,
  `#Damage Rolls`, `#Healing`, `#Dropping to 0 Hit Points`, and
  `#Temporary Hit Points`, plus `UBIQUITOUS_LANGUAGE.md#Hit Points and Death`
  and `#Damage`.
- Reviewer-loop convergence: RAW traceability, ubiquitous-language/domain
  language, architecture/connascence, and code-review passes. Fix every
  reasonable finding; reject only with a concrete recorded reason; repeat until
  no reasonable findings remain.
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- Any focused Rust, TypeScript, QNT, or MBT test named by the task.
- `git diff --check`

For any task that runs battle MBT, first check:

```sh
ps aux | grep vitest | grep -v grep
ps aux | grep quint_evaluator | grep -v grep
```

If a prior `quint_evaluator` is alive, stop it with
`killall -9 quint_evaluator`. If a vitest/MBT process is alive, do not start
another MBT run. Run MBT with the repo timing/background protocol from
`CLAUDE.md`.

## DAG / Queue Order

| # | Task | Status | Depends on | Notes |
| ---: | --- | --- | --- | --- |
| 1 | QNTR-C01-RUST-PILOT-BOUNDARY - Define the first Rust pilot boundary from existing HP dry runs | ready-for-research | none | Establishes crate/location, command shape, and no-production-wiring boundary before code appears. |
| 2 | QNTR-C02-HP-DAMAGE-RUST-MANUAL - Hand-code the positive-Hit-Point damage Rust pilot slice | blocked-on-QNTR-C01-RUST-PILOT-BOUNDARY | QNTR-C01-RUST-PILOT-BOUNDARY | Uses the existing `SHARED.HIT_POINTS.POSITIVE_DAMAGE` dry run. |
| 3 | QNTR-C03-HP-DAMAGE-RUST-PARITY - Add Rust parity fixtures for positive-Hit-Point damage | blocked-on-QNTR-C02-HP-DAMAGE-RUST-MANUAL | QNTR-C02-HP-DAMAGE-RUST-MANUAL | Proves the hand-coded slice against the closed QNT replay cases. |
| 4 | QNTR-C04-HP-RECOVERY-RUST-MANUAL - Hand-code the pure healing Rust pilot slice | blocked-on-QNTR-C01-RUST-PILOT-BOUNDARY | QNTR-C01-RUST-PILOT-BOUNDARY | Uses the existing pure-healing subset of `SHEET.HP_REST_HIT_DICE.TRANSITIONS`. |
| 5 | QNTR-C05-HP-RECOVERY-RUST-PARITY - Add Rust parity fixtures for pure Hit Point healing | blocked-on-QNTR-C04-HP-RECOVERY-RUST-MANUAL | QNTR-C04-HP-RECOVERY-RUST-MANUAL | Proves recovery reset, cap, and positive-Hit-Point Unconscious recovery behavior. |
| 6 | QNTR-C06-RUST-PILOT-DRY-RUN-REVIEW - Review Rust pilot slices for projection and connascence gaps | blocked-on-QNTR-C03-HP-DAMAGE-RUST-PARITY-QNTR-C05-HP-RECOVERY-RUST-PARITY | QNTR-C03-HP-DAMAGE-RUST-PARITY, QNTR-C05-HP-RECOVERY-RUST-PARITY | Decides whether the hand-coded Rust shape is generator-worthy or needs repairs. |
| 7 | QNTR-C07-GENERATOR-SUBSET-CONTRACT - Turn the HP dry-run subset into a checked generator contract | blocked-on-QNTR-C06-RUST-PILOT-DRY-RUN-REVIEW | QNTR-C06-RUST-PILOT-DRY-RUN-REVIEW | Adds a durable minimal subset contract rather than inferring from prose. |
| 8 | QNTR-C08-QNT-AST-SNAPSHOT-HP-DAMAGE - Capture a generator-facing QNT AST snapshot for HP damage | blocked-on-QNTR-C07-GENERATOR-SUBSET-CONTRACT | QNTR-C07-GENERATOR-SUBSET-CONTRACT | Snapshot input for generation; no Rust emission yet. |
| 9 | QNTR-C09-GENERATE-HP-DAMAGE-TYPES - Generate Rust type skeletons for HP damage | blocked-on-QNTR-C08-QNT-AST-SNAPSHOT-HP-DAMAGE | QNTR-C08-QNT-AST-SNAPSHOT-HP-DAMAGE | Emits types only, then compares to the manual pilot. |
| 10 | QNTR-C10-GENERATE-HP-DAMAGE-FUNCTION - Generate the Rust HP damage transition body | blocked-on-QNTR-C09-GENERATE-HP-DAMAGE-TYPES | QNTR-C09-GENERATE-HP-DAMAGE-TYPES | Emits the pure transition body for the smallest subset. |
| 11 | QNTR-C11-QNT-AST-SNAPSHOT-HP-RECOVERY - Capture a generator-facing QNT AST snapshot for HP recovery | blocked-on-QNTR-C07-GENERATOR-SUBSET-CONTRACT | QNTR-C07-GENERATOR-SUBSET-CONTRACT | Introduces imports and reused semantic-core shapes after damage generation works. |
| 12 | QNTR-C12-GENERATE-HP-RECOVERY-TYPES - Generate Rust type skeletons for HP recovery | blocked-on-QNTR-C11-QNT-AST-SNAPSHOT-HP-RECOVERY | QNTR-C11-QNT-AST-SNAPSHOT-HP-RECOVERY | Emits recovery lifecycle and result types. |
| 13 | QNTR-C13-GENERATE-HP-RECOVERY-FUNCTION - Generate the Rust pure healing transition body | blocked-on-QNTR-C12-GENERATE-HP-RECOVERY-TYPES | QNTR-C12-GENERATE-HP-RECOVERY-TYPES | Emits the pure transition body and compares to the manual recovery pilot. |
| 14 | QNTR-C14-HIT-POINT-RESTORATION-DRY-RUN - Add the spell Hit Point restoration Rust dry run | blocked-on-QNTR-C06-RUST-PILOT-DRY-RUN-REVIEW | QNTR-C06-RUST-PILOT-DRY-RUN-REVIEW | Extends evidence to the battle spell healing profile after shared HP rules are reviewed. |
| 15 | QNTR-C15-LANE-C-CLOSEOUT - Close out the Rust generator pilot and choose the next slice | blocked-on-QNTR-C10-GENERATE-HP-DAMAGE-FUNCTION-QNTR-C13-GENERATE-HP-RECOVERY-FUNCTION-QNTR-C14-HIT-POINT-RESTORATION-DRY-RUN | QNTR-C10-GENERATE-HP-DAMAGE-FUNCTION, QNTR-C13-GENERATE-HP-RECOVERY-FUNCTION, QNTR-C14-HIT-POINT-RESTORATION-DRY-RUN | Records whether to continue with HP restoration, scalar buffs, roll modifiers, or metamagic. |

## Task Details

### Task 1 - QNTR-C01-RUST-PILOT-BOUNDARY

Status: `ready-for-research`

Input:

- `plans/rules-kernel-coverage/HIT_POINT_DAMAGE_RUST_DRY_RUN.md`
- `plans/rules-kernel-coverage/HIT_POINT_RECOVERY_RUST_DRY_RUN.md`
- `plans/rules-kernel-coverage/kernel-ir-boundaries.jsonl`
- `packages/shared-algebras/proofs/rule-core/hit-point-damage.qnt`
- `packages/shared-algebras/proofs/rule-core/hit-point-recovery.qnt`

Output:

- Decide the pilot Rust crate or artifact location and command shape.
- Record that Rust is pilot evidence only in this lane: no TS reducer calls, no
  generated runtime state, and no ABI commitment.
- Map the shared `CreatureVitals`, Hit Point scalar, Death Saving Throw, and
  recovery marker shapes that Tasks 2 and 4 will share.

Acceptance:

- A checked planning artifact or README names the crate/artifact path, command,
  and no-production-wiring boundary.
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### Task 2 - QNTR-C02-HP-DAMAGE-RUST-MANUAL

Status: `blocked-on-QNTR-C01-RUST-PILOT-BOUNDARY`

Input:

- Obligation: `SHARED.HIT_POINTS.POSITIVE_DAMAGE`
- Semantic core:
  `packages/shared-algebras/proofs/rule-core/hit-point-damage.qnt`
- Dry run: `plans/rules-kernel-coverage/HIT_POINT_DAMAGE_RUST_DRY_RUN.md`
- RAW and language anchors named in the dry run.

Output:

- Hand-code the Rust pilot version of the positive-Hit-Point damage transition
  from the dry run.
- Use constructors for legal vitals and narrowed positive-Hit-Point damage
  admission.
- Keep damage-at-0-HP and production reducer integration out of scope.

Acceptance:

- Rust code compiles with the command chosen by Task 1.
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### Task 3 - QNTR-C03-HP-DAMAGE-RUST-PARITY

Status: `blocked-on-QNTR-C02-HP-DAMAGE-RUST-MANUAL`

Input:

- Task 2 Rust pilot.
- Existing QNT parity witness:
  `packages/battle-runtime/src/rule-core-hit-point-damage.mbt.test.ts`
- Existing QNT fixture:
  `packages/battle-runtime/rule-core-hit-point-damage.mbt.qnt`

Output:

- Add Rust tests that replay the same closed HP damage cases named by the
  deterministic QNT replay.
- Record any projection mismatch as a repair task rather than widening the
  Rust state shape.

Acceptance:

- Rust test command chosen by Task 1 passes.
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### Task 4 - QNTR-C04-HP-RECOVERY-RUST-MANUAL

Status: `blocked-on-QNTR-C01-RUST-PILOT-BOUNDARY`

Input:

- Obligation: `SHEET.HP_REST_HIT_DICE.TRANSITIONS`
- Semantic core:
  `packages/shared-algebras/proofs/rule-core/hit-point-recovery.qnt`
- Dry run: `plans/rules-kernel-coverage/HIT_POINT_RECOVERY_RUST_DRY_RUN.md`
- RAW and language anchors named in the dry run.

Output:

- Hand-code the pure healing transition only: Hit Point cap, regained-Hit-Point
  result, Death Saving Throw reset on regained Hit Points, and
  positive-Hit-Point Unconscious recovery.
- Reuse the Task 1 shared vitals shape; do not add a second Character Sheet HP
  model.
- Keep Short Rest, Long Rest, Hit Point Dice spending, Stable elapsed-time
  recovery, and Knock Out first aid out of scope.

Acceptance:

- Rust code compiles with the command chosen by Task 1.
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### Task 5 - QNTR-C05-HP-RECOVERY-RUST-PARITY

Status: `blocked-on-QNTR-C04-HP-RECOVERY-RUST-MANUAL`

Input:

- Task 4 Rust pilot.
- Existing QNT parity witness:
  `packages/character-sheet-runtime/src/hp-rest-hit-dice.mbt.test.ts`
- Existing QNT fixture:
  `packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt`

Output:

- Add Rust tests for the pure healing subset only.
- Include zero-to-positive healing, no-op nonpositive healing, Hit Point cap,
  Death Saving Throw reset, and positive-Hit-Point Unconscious recovery.

Acceptance:

- Rust test command chosen by Task 1 passes.
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### Task 6 - QNTR-C06-RUST-PILOT-DRY-RUN-REVIEW

Status: `blocked-on-QNTR-C03-HP-DAMAGE-RUST-PARITY-QNTR-C05-HP-RECOVERY-RUST-PARITY`

Input:

- Task 2 through Task 5 Rust pilot code and tests.
- `kernel-ir-boundaries.jsonl`.
- The two HP dry-run artifacts.

Output:

- Audit duplicated state, optional/empty distinctions, parser-vs-assertion
  boundaries, and strong connascence between QNT, TS projection owners, and
  Rust shapes.
- If clean, mark the HP Rust pilot as the current generator target in the
  program rollup. If not, append exact repair tasks before generation starts.

Acceptance:

- Review artifact records findings and every accepted/rejected item.
- `pnpm rules-kernel-coverage:check`
- Rust tests from Tasks 3 and 5 pass.
- `git diff --check`

### Task 7 - QNTR-C07-GENERATOR-SUBSET-CONTRACT

Status: `blocked-on-QNTR-C06-RUST-PILOT-DRY-RUN-REVIEW`

Input:

- Clean Task 6 review.
- `generator-readiness.jsonl` rows for
  `SHARED.HIT_POINTS.POSITIVE_DAMAGE` and
  `SHEET.HP_REST_HIT_DICE.TRANSITIONS`.
- Existing generator subset vocabulary in
  `scripts/rules-kernel-coverage-config.cjs`.

Output:

- Add a checked minimal generator contract for the HP pilot subset:
  variants, records, pure definitions, imports, integer and Boolean
  expressions, `if`, local bindings, arithmetic, comparisons, Boolean
  connectives, implication, and `all` blocks.
- Keep collections, pattern matching, mutable actions, nondeterminism, and MBT
  fixtures out of this first generator target.

Acceptance:

- Checker or self-test coverage proves the contract rejects an omitted required
  construct and an unsupported construct.
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### Task 8 - QNTR-C08-QNT-AST-SNAPSHOT-HP-DAMAGE

Status: `blocked-on-QNTR-C07-GENERATOR-SUBSET-CONTRACT`

Input:

- `packages/shared-algebras/proofs/rule-core/hit-point-damage.qnt`
- Task 7 generator subset contract.

Output:

- Capture or produce a deterministic generator-facing AST/intermediate snapshot
  for the semantic-core definitions used by the HP damage dry run.
- Exclude run blocks, MBT fixture state, and proof-only files.

Acceptance:

- Snapshot command is deterministic and checked into the repo only if it is a
  durable source artifact; otherwise the task records the command and output
  shape.
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### Task 9 - QNTR-C09-GENERATE-HP-DAMAGE-TYPES

Status: `blocked-on-QNTR-C08-QNT-AST-SNAPSHOT-HP-DAMAGE`

Input:

- Task 8 AST/intermediate snapshot.
- Task 2 manual Rust pilot types.

Output:

- Generate Rust type skeletons for `CreatureKind`, `CreatureVitals`, and
  `DamageResult`, plus narrowed constructor shells where the subset contract can
  justify them.
- Compare generated skeletons against the manual pilot and record intentional
  differences.

Acceptance:

- Generated output is deterministic.
- Rust compile command chosen by Task 1 passes.
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### Task 10 - QNTR-C10-GENERATE-HP-DAMAGE-FUNCTION

Status: `blocked-on-QNTR-C09-GENERATE-HP-DAMAGE-TYPES`

Input:

- Task 9 generated types.
- QNT definitions `nonnegative`, `clampHitPoints`,
  `absorbTemporaryHitPoints`, and `applyResolvedDamageToPositiveHitPoints`.

Output:

- Generate the HP damage pure transition body for the supported subset.
- Preserve constructor/admission boundaries from the manual pilot instead of
  letting generated code rediscover ordinary invalid input.

Acceptance:

- Generated Rust compiles and passes the Task 3 parity tests.
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### Task 11 - QNTR-C11-QNT-AST-SNAPSHOT-HP-RECOVERY

Status: `blocked-on-QNTR-C07-GENERATOR-SUBSET-CONTRACT`

Input:

- `packages/shared-algebras/proofs/rule-core/hit-point-recovery.qnt`
- Imported semantic cores named by
  `HIT_POINT_RECOVERY_RUST_DRY_RUN.md`.

Output:

- Capture or produce a deterministic generator-facing AST/intermediate snapshot
  for the pure healing subset.
- Preserve imported shared shapes instead of copying HP damage types into a
  separate recovery model.

Acceptance:

- Snapshot command is deterministic and excludes proof-only files.
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### Task 12 - QNTR-C12-GENERATE-HP-RECOVERY-TYPES

Status: `blocked-on-QNTR-C11-QNT-AST-SNAPSHOT-HP-RECOVERY`

Input:

- Task 11 AST/intermediate snapshot.
- Task 4 manual Rust pilot types.

Output:

- Generate Rust type skeletons for
  `PositiveHitPointUnconsciousRecovery`,
  `DeathSavingThrowLifecycle`, `HitPointRecoveryState`, and
  `HitPointRecoveryResult`.
- Reuse the shared HP damage vitals shape from Tasks 9 and 10.

Acceptance:

- Generated output is deterministic.
- Rust compile command chosen by Task 1 passes.
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### Task 13 - QNTR-C13-GENERATE-HP-RECOVERY-FUNCTION

Status: `blocked-on-QNTR-C12-GENERATE-HP-RECOVERY-TYPES`

Input:

- Task 12 generated types.
- QNT definitions `legalHitPointRecoveryState` and
  `applyHitPointHealing`.

Output:

- Generate the pure healing transition body.
- Preserve Character Sheet projection boundaries: generated Rust takes a
  projected recovery state and returns projected facts; it does not own sheet
  persistence.

Acceptance:

- Generated Rust compiles and passes the Task 5 parity tests.
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### Task 14 - QNTR-C14-HIT-POINT-RESTORATION-DRY-RUN

Status: `blocked-on-QNTR-C06-RUST-PILOT-DRY-RUN-REVIEW`

Input:

- Obligation: `BATTLE.SPELL.HIT_POINT_RESTORATION`
- Semantic core:
  `packages/shared-algebras/proofs/rule-core/spell-hit-point-restoration-core.qnt`
- Runtime owner:
  `packages/battle-runtime/src/battle-reducer/spells-resolve-support-effects.ts`
- Existing parity witness:
  `packages/battle-runtime/src/rule-core-spells.mbt.test.ts`
- RAW and language anchors:
  `.references/srd-5.2.1/Playing-the-Game.md#Healing`,
  relevant SRD Spell Definition sections for the healing spells admitted by
  `spell.hit-point-restoration`, and
  `UBIQUITOUS_LANGUAGE.md#Hit Points and Death` plus
  `UBIQUITOUS_LANGUAGE.md#Spellcasting`.

Output:

- Add a manual Rust dry-run artifact for spell Hit Point restoration after the
  shared HP damage/recovery pilot is reviewed.
- Map target selection, healing rolls, zero-Hit-Point recovery, and
  multi-target healing projection without duplicating BattleState or Character
  Sheet HP state.

Acceptance:

- New dry-run artifact records QNT-to-Rust type/function mapping and all
  projection boundaries.
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### Task 15 - QNTR-C15-LANE-C-CLOSEOUT

Status: `blocked-on-QNTR-C10-GENERATE-HP-DAMAGE-FUNCTION-QNTR-C13-GENERATE-HP-RECOVERY-FUNCTION-QNTR-C14-HIT-POINT-RESTORATION-DRY-RUN`

Input:

- Completed generated HP damage and recovery pilot.
- Spell Hit Point restoration dry run.
- Current `REPORT.md`, `generator-readiness.jsonl`, and
  `kernel-ir-boundaries.jsonl`.

Output:

- Close or repair the Lane C Rust generator pilot.
- If clean, choose the next generator/Rust frontier from current
  checker-owned artifacts. Candidate next frontiers are spell Hit Point
  restoration, scalar buffs, roll modifiers, or Metamagic, in that order only
  if the previous candidate is either complete or explicitly rejected with a
  concrete reason.
- If not clean, append exact repair tasks to this plan instead of ending the
  run.

Acceptance:

- Ralph has a concrete next plan or concrete repair tasks, never an empty end
  state.
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- Relevant Rust tests pass.
- `git diff --check`
