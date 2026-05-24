# QNT Slice Expansion Ralph Plan

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "QNTSLICE-CANDIDATE-INVENTORY",
      "status": "done",
      "title": "Inventory Next Composite Slice Candidates"
    },
    {
      "number": 2,
      "id": "QNTSLICE-SLOT-EXPENDITURE-ATOMIC",
      "status": "done",
      "title": "Author Slot Expenditure Atomic Rule"
    },
    {
      "number": 3,
      "id": "QNTSLICE-SPELL-SAVE-GATE-ATOMIC",
      "status": "done",
      "title": "Author Spell Save Gate Atomic Rule"
    },
    {
      "number": 4,
      "id": "QNTSLICE-FIRST-COMPOSITE-AFTER-PILOT",
      "status": "done",
      "title": "Add Mirror Image Hit Interception Composite Slice"
    },
    {
      "number": 5,
      "id": "QNTSLICE-RECURSIVE-NEXT-TASKS",
      "status": "blocked",
      "title": "Mine Next Slice Tasks"
    },
    {
      "number": 6,
      "id": "QNTSLICE-FLAMING-SPHERE-HAZARD-RAM",
      "status": "done",
      "title": "Add Flaming Sphere Hazard/Ram Composite Slice"
    },
    {
      "number": 7,
      "id": "QNTSLICE-MOONBEAM-MOVABLE-ZONE",
      "status": "ready-for-research",
      "title": "Add Moonbeam Movable Zone Composite Slice"
    },
    {
      "number": 8,
      "id": "QNTSLICE-WARDING-BOND-DAMAGE-SHARING",
      "status": "ready-for-research",
      "title": "Add Warding Bond Damage Sharing Composite Slice"
    },
    {
      "number": 9,
      "id": "QNTSLICE-DIRECT-CONDITION-LIFECYCLE",
      "status": "ready-for-research",
      "title": "Add Direct Condition Lifecycle Composite Slice"
    }
  ]
}
-->

This lane adds ADR-0001 slice-shaped QNT coverage: small composite `.qnt`
files, bounded sibling `.mbt.qnt` harnesses, TypeScript mirror/parity tests,
and checker rows. It does not build a whole-battle QNT model and does not
generate Rust.

## Context Budget

Read only:

- `plans/QNT_COVERAGE_PROGRAM.md`
- `docs/adr/0001-forest-of-qnt-slices.md`
- `plans/rules-kernel-coverage/README.md`
- relevant rows in `obligations.jsonl`, `profile-obligations.jsonl`,
  `qnt-owner-roles.jsonl`, and `generator-readiness.jsonl`
- current pilot files:
  - `packages/battle-runtime/creature-attack.qnt`
  - `packages/battle-runtime/creature-attack.mbt.qnt`
  - `packages/battle-runtime/src/battle-reducer/creature-attack.ts`
  - `packages/battle-runtime/src/creature-attack.mbt.test.ts`

Do not read deleted historical Ralph lanes. Read the QNT PRD only if changing
the B/C split, checker vocabulary, or generator-readiness contract.

Every Ralph prompt must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`.

Run the reviewer loop until convergence: RAW traceability when modeled rules
change, ubiquitous-language/domain-language, architecture/connascence, and code
review. Fix every reasonable finding, reject only with a concrete reason, and
repeat until no reasonable findings remain.

## Verification

Each task must run:

- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- the new or touched slice parity test
- `git diff --check`

Keep MBT bounded. Do not run broad battle MBT unless explicitly needed after a
runtime behavior change.

### Task 1 - QNTSLICE-CANDIDATE-INVENTORY - Inventory Next Composite Slice Candidates

Status: `done`

Input:

- `plans/rules-kernel-coverage/obligations.jsonl`
- `plans/rules-kernel-coverage/profile-obligations.jsonl`
- `plans/QNT_COVERAGE_PROGRAM.md`
- creature-attack pilot files

Output:

- Add or refine 3-6 concrete composite slice tasks in this plan.
- Each candidate must name its obligation/profile rows, atomic dependencies,
  intended bounded state, TS mirror path, parity test path, and why it is not a
  whole-battle model.
- Do not implement a slice in this task unless the inventory is already
  trivially complete and the first candidate is small.

Result:

- Refined Task 4 as the first concrete post-pilot composite slice candidate.
- Added Tasks 6-9 as concrete follow-up composite slice candidates.

Acceptance:

- Later tasks are executable without broad repo survey.
- The queue remains aligned with ADR-0001.

### Task 2 - QNTSLICE-SLOT-EXPENDITURE-ATOMIC - Author Slot Expenditure Atomic Rule

Status: `done`

Input:

- existing spell slot spending reducers and tests
- relevant spell procedure obligation/profile rows
- `packages/shared-algebras/proofs/rule-core/`

Output:

- Add a pure semantic-core atomic QNT rule for spell slot expenditure if no
  equivalent already exists.
- Add a TypeScript mirror and focused unit tests.
- Add checker rows/markers required by rules-kernel coverage.

Result:

- Added `spell-slot-expenditure.qnt` as the reusable semantic-core Spell Slot
  expenditure atom.
- Added the TypeScript mirror and focused tests in `@dnd/shared-algebras`.
- Registered the QNT owner in rules-kernel coverage rows.

Acceptance:

- The atomic rule can be imported by later composite spell slices.
- No duplicate slot state is introduced.

### Task 3 - QNTSLICE-SPELL-SAVE-GATE-ATOMIC - Author Spell Save Gate Atomic Rule

Status: `done`

Input:

- existing save-gated spell reducers and tests
- relevant spell procedure obligation/profile rows
- `packages/shared-algebras/proofs/rule-core/`

Output:

- Add a pure semantic-core atomic QNT rule for spell save gating if no
  equivalent already exists.
- Add a TypeScript mirror and focused unit tests.
- Add checker rows/markers required by rules-kernel coverage.

Result:

- Added `spell-save-gate.qnt` as the reusable semantic-core spell Saving Throw
  gate atom.
- Added the TypeScript mirror and focused tests in `@dnd/shared-algebras`.
- Reused the atom from spell procedure profiles and registered the QNT owner in
  rules-kernel coverage rows.

Acceptance:

- The atomic rule can be imported by later composite spell slices.
- Save success/failure effects remain typed facts, not authored identity
  dispatch.

### Task 4 - QNTSLICE-FIRST-COMPOSITE-AFTER-PILOT - Add Mirror Image Hit Interception Composite Slice

Status: `done`

Depends on:

- Task 1.

Input:

- creature-attack pilot files
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md#Mirror Image`
- `profile-obligations.jsonl` row
  `spell.invocation-mirror-image-hit-interception`
- `obligations.jsonl` row `BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION`
- current semantic owner `packages/battle-runtime/battle-runtime-mirror-image.qnt`
- current runtime owner
  `packages/battle-runtime/src/battle-reducer/mirror-image-hit-interception.ts`

Output:

- Add `packages/battle-runtime/battle-runtime-mirror-image-hit-interception.qnt`
  and bounded sibling `.mbt.qnt`.
- Reuse or extract the TypeScript mirror in
  `packages/battle-runtime/src/battle-reducer/mirror-image-hit-interception.ts`;
  do not add a parallel mirror if the production helper already carries the
  pure decision.
- Add `packages/battle-runtime/src/mirror-image-hit-interception.mbt.test.ts`
  and `test:mbt:mirror-image-hit-interception`.
- Add or refine obligation/readiness/owner-role rows only as required for the
  new slice owner and parity witness.
- Atomic dependencies: the hit/miss result is a caller fill from
  `BATTLE.DAMAGE.ATTACK_BRANCHES`; no Spell Slot or Hit Point state is owned by
  this slice.
- Intended bounded state: one defended creature's duplicate count `0..3`,
  attacker bypass witnesses for Blinded/Blindsight/Truesight, a caller-supplied
  attack-hit fact, a bounded duplicate-roll success/failure fill, and a
  continuation flag for whether normal damage handling proceeds.
- Not a whole-battle model: the slice starts after an Attack Roll hit has been
  resolved and stops before damage application; it does not model initiative,
  Armor Class, attack dice, target selection, or Hit Point damage.

Result:

- Added a bounded Mirror Image hit-interception composite QNT slice and sibling
  MBT harness.
- Reused the production hit-interception helper as the TypeScript parity mirror
  and added the focused slice parity test/script.
- Registered the new slice owner and focused MBT parity witness in rules-kernel
  coverage rows.

Acceptance:

- The slice parity test is green.
- `pnpm rules-kernel-coverage:check` is green.

### Task 5 - QNTSLICE-RECURSIVE-NEXT-TASKS - Mine Next Slice Tasks

Status: `blocked`

Depends on:

- Task 4.
- Task 6.
- Task 7.
- Task 8.
- Task 9.

Input:

- current `obligations.jsonl`
- current `profile-obligations.jsonl`
- current `generator-readiness.jsonl`
- current slice task outcomes from Tasks 4, 6, 7, 8, and 9

Output:

- If more slice work remains, add 3-8 new atomic slice tasks to this plan.
- If no slice work remains, mark this task done with a short meaningful note.
- Keep tasks disjoint from the semantic-core extraction lane.

Acceptance:

- Ralph does not stop merely because the seed queue is exhausted.
- Added tasks remain one-coding-session sized and context-managed.

### Task 6 - QNTSLICE-FLAMING-SPHERE-HAZARD-RAM - Add Flaming Sphere Hazard/Ram Composite Slice

Status: `done`

Depends on:

- Task 1.
- Task 2.
- Task 3.

Input:

- creature-attack pilot files
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Flaming Sphere`
- `profile-obligations.jsonl` row `spell.invocation-flaming-sphere-hazard-ram`
- `obligations.jsonl` rows
  `BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE`,
  `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES`,
  `SHARED.HIT_POINTS.POSITIVE_DAMAGE`, and
  `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP`
- current semantic owner marker `packages/battle-runtime/battle-runtime.qnt`
- current pure definitions in `packages/battle-runtime/battle-runtime-ground-command.qnt`
- current runtime owners
  `packages/battle-runtime/src/battle-reducer/spells-resolve-area-effects.ts`
  and `packages/battle-runtime/src/battle-reducer/turn-end-movement.ts`

Output:

- Add `packages/battle-runtime/battle-runtime-flaming-sphere-hazard-ram.qnt`
  and bounded sibling `.mbt.qnt`.
- Extract or reuse a production TypeScript mirror at
  `packages/battle-runtime/src/battle-reducer/flaming-sphere-hazard-ram.ts`
  if the current area-effect reducer cannot expose the pure transition directly.
- Add `packages/battle-runtime/src/flaming-sphere-hazard-ram.mbt.test.ts` and
  `test:mbt:flaming-sphere-hazard-ram`.
- Atomic dependencies: Task 2 Spell Slot expenditure, Task 3 spell Saving Throw
  gate, `SHARED.HIT_POINTS.POSITIVE_DAMAGE`, and existing damage disposition
  handling for zero-Hit-Point follow-up.
- Intended bounded state: one caster with a Bonus Action and one active sphere,
  one target with bounded Hit Points, slot level `2..4`, sphere move distance
  `0..31`, a caller-supplied Dexterity Saving Throw result, bounded Fire damage
  roll, and a boolean for end-turn versus ram entrypoint.
- Not a whole-battle model: table-owned placement, pathing over barriers/pits,
  object ignition, lighting projection, initiative, and unrelated active effects
  remain fills or out of scope; the slice owns only the sphere lifecycle and
  target damage transition.

Result:

- Added a bounded Flaming Sphere hazard/ram composite QNT slice and sibling
  MBT harness.
- Extracted the production TypeScript mirror for save-adjusted Fire damage and
  ram/reposition movement admission.
- Registered the new slice owner and focused MBT parity witness in
  rules-kernel coverage rows.

Acceptance:

- The slice parity test is green.
- `pnpm rules-kernel-coverage:check` is green.

### Task 7 - QNTSLICE-MOONBEAM-MOVABLE-ZONE - Add Moonbeam Movable Zone Composite Slice

Status: `ready-for-research`

Depends on:

- Task 1.
- Task 2.
- Task 3.

Input:

- creature-attack pilot files
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md#Moonbeam`
- `profile-obligations.jsonl` row `spell.invocation-moonbeam-movable-zone`
- `obligations.jsonl` rows `BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE`,
  `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES`,
  `SHARED.HIT_POINTS.POSITIVE_DAMAGE`, and
  `BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP`
- current semantic owner marker `packages/battle-runtime/battle-runtime.qnt`
- current pure definitions in `packages/battle-runtime/battle-runtime-ground-command.qnt`
- current runtime owners
  `packages/battle-runtime/src/battle-reducer/spells-resolve-area-effects.ts`
  and `packages/battle-runtime/src/battle-reducer/turn-end-movement.ts`

Output:

- Add `packages/battle-runtime/battle-runtime-moonbeam-movable-zone.qnt` and
  bounded sibling `.mbt.qnt`.
- Extract or reuse a production TypeScript mirror at
  `packages/battle-runtime/src/battle-reducer/moonbeam-movable-zone.ts`.
- Add `packages/battle-runtime/src/moonbeam-movable-zone.mbt.test.ts` and
  `test:mbt:moonbeam-movable-zone`.
- Atomic dependencies: Task 2 Spell Slot expenditure, Task 3 spell Saving Throw
  gate, `SHARED.HIT_POINTS.POSITIVE_DAMAGE`, and existing damage disposition
  handling for zero-Hit-Point follow-up.
- Intended bounded state: one caster with a Magic Action on later turns, one
  movable Cylinder, one target with bounded Hit Points, slot level `2..4`,
  move distance `0..61`, a per-target `savedThisTurn` fact, a caller-supplied
  Constitution Saving Throw result, bounded Radiant damage roll, and a
  shape-shift suppression flag.
- Not a whole-battle model: spatial membership, target route, Cylinder point
  selection, full shape-shift catalog behavior, and broad turn order stay
  outside the slice; the slice owns save limiting, damage, reposition cost, and
  cleanup for one bounded zone.

Acceptance:

- The slice parity test is green.
- `pnpm rules-kernel-coverage:check` is green.

### Task 8 - QNTSLICE-WARDING-BOND-DAMAGE-SHARING - Add Warding Bond Damage Sharing Composite Slice

Status: `ready-for-research`

Depends on:

- Task 1.

Input:

- creature-attack pilot files
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md#Warding Bond`
- `profile-obligations.jsonl` row `spell.invocation-warding-bond-linked-effect`
- `obligations.jsonl` row `BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING`
- current semantic owner `packages/battle-runtime/battle-runtime-warding-bond.qnt`
- current runtime owners `packages/battle-runtime/src/battle-reducer/warding-bond.ts`,
  `packages/battle-runtime/src/battle-reducer/damage-apply.ts`, and
  `packages/battle-runtime/src/battle-reducer/damage-helpers.ts`

Output:

- Add `packages/battle-runtime/battle-runtime-warding-bond-damage-sharing.qnt`
  and bounded sibling `.mbt.qnt`.
- Reuse or extract the TypeScript mirror in
  `packages/battle-runtime/src/battle-reducer/warding-bond.ts`.
- Add `packages/battle-runtime/src/warding-bond-damage-sharing.mbt.test.ts`
  and `test:mbt:warding-bond-damage-sharing`.
- Atomic dependencies: `SHARED.HIT_POINTS.POSITIVE_DAMAGE`, existing damage
  adjustment facts for Resistance, and zero-Hit-Point cleanup facts already
  used by damage application.
- Intended bounded state: linked source and ward Hit Points, a bond-present
  flag, range/recast/source-zero cleanup fills, an incoming damage amount, and
  whether the source takes the same post-resistance damage.
- Not a whole-battle model: the slice does not model positioning, spell
  component ownership, target willingness, the full damage pipeline, or other
  active effects; it only verifies the linked damage and cleanup transition.

Acceptance:

- The slice parity test is green.
- `pnpm rules-kernel-coverage:check` is green.

### Task 9 - QNTSLICE-DIRECT-CONDITION-LIFECYCLE - Add Direct Condition Lifecycle Composite Slice

Status: `ready-for-research`

Depends on:

- Task 1.
- Task 2.

Input:

- creature-attack pilot files
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Invisibility`
- `profile-obligations.jsonl` row `spell.invocation-direct-condition`
- `obligations.jsonl` row `BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE`
- current semantic owners `packages/battle-runtime/battle-runtime.qnt`,
  `packages/battle-runtime/battle-runtime-sanctuary.qnt`,
  `packages/battle-runtime/battle-runtime-concentration.qnt`, and
  `packages/battle-runtime/battle-runtime-timed-effects.qnt`
- current runtime owners
  `packages/battle-runtime/src/battle-reducer/spells-resolve-support-effects.ts`,
  `packages/battle-runtime/src/battle-reducer/turn-end-movement.ts`, and
  `packages/battle-runtime/src/battle-reducer/damage-apply.ts`

Output:

- Add `packages/battle-runtime/battle-runtime-direct-condition-lifecycle.qnt`
  and bounded sibling `.mbt.qnt`.
- Extract or reuse a TypeScript mirror at
  `packages/battle-runtime/src/battle-reducer/direct-condition-lifecycle.ts`
  rather than duplicating condition projection outside the reducer.
- Add `packages/battle-runtime/src/direct-condition-lifecycle.mbt.test.ts`
  and `test:mbt:direct-condition-lifecycle`.
- Atomic dependencies: Task 2 Spell Slot expenditure plus existing
  concentration and timed-effect cleanup facts; no spell Saving Throw atomic is
  needed because the condition is applied directly after admission.
- Intended bounded state: one caster concentration slot, one target condition
  set, duration ticks `0..10`, a target action/damage/cast-cleanup fill, and
  a flag for whether the condition remains projected.
- Not a whole-battle model: target selection, stealth perception, sight-line
  adjudication, and the rest of the combat turn are outside this slice; it owns
  direct condition application, early end, concentration cleanup, and duration
  cleanup.

Acceptance:

- The slice parity test is green.
- `pnpm rules-kernel-coverage:check` is green.
