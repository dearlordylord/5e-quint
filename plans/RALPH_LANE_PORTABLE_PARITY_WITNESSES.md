# Ralph Lane: Portable Parity Witnesses

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    { "number": 1, "id": "PPW-T01-QNT-REGISTRY-CLOSURE", "status": "done", "title": "Close the QNT registry: bind unbound modules, checker-enforce classification" },
    { "number": 2, "id": "PPW-T02-ACID-ARROW-TIMING-FOCUSED-MBT", "status": "ready-for-implementation", "title": "Add Acid Arrow attack-timing focused MBT" },
    { "number": 3, "id": "PPW-T03-AFTER-HIT-RIDERS-FOCUSED-MBT", "status": "ready-for-implementation", "title": "Add after-hit damage riders focused MBT (moved from QNTD-B06)" },
    { "number": 4, "id": "PPW-T04-WEAPON-HOSTED-ATTACK-FOCUSED-MBT", "status": "ready-for-implementation", "title": "Add weapon-hosted attack and riders focused MBT (moved from QNTD-B07)" },
    { "number": 5, "id": "PPW-T05-SUBTLE-METAMAGIC-FOCUSED-MBT", "status": "ready-for-implementation", "title": "Add Subtle Spell component-suppression focused MBT" },
    { "number": 6, "id": "PPW-T06-HOLE-VOCABULARY-WITNESS-POLICY", "status": "ready-for-research", "title": "Decide the witness shape for the hole-family vocabulary obligation" },
    { "number": 7, "id": "PPW-T07-WEAPON-MASTERY-ADVANCEMENT-FOCUSED-MBT", "status": "ready-for-implementation", "title": "Add Weapon Mastery class-level advancement focused MBT (creation)" },
    { "number": 8, "id": "PPW-T08-WEAPON-MASTERY-RESELECTION-FOCUSED-MBT", "status": "blocked", "title": "Add Weapon Mastery Long Rest reselection focused MBT (sheet)" },
    { "number": 9, "id": "PPW-T09-COMMAND-OPTION-FOCUSED-MBT", "status": "blocked", "title": "Add Command option and next-turn focused MBT (moved from QNTD-B08)" },
    { "number": 10, "id": "PPW-T10-ABILITY-CHECK-SEARCH-FOCUSED-MBT", "status": "blocked", "title": "Add Ability Check choice and Search holes focused MBT (moved from QNTD-B09)" },
    { "number": 11, "id": "PPW-T11-SHOVE-WITNESS-POLICY", "status": "blocked", "title": "Decide whether Shove deterministic replay needs focused MBT (moved from QNTD-B10)" },
    { "number": 12, "id": "PPW-T12-CONCENTRATION-BREAK-SEAM", "status": "ready-for-implementation", "title": "Witness the Concentration-break teardown composition seam" },
    { "number": 13, "id": "PPW-T13-TURN-BOUNDARY-LIFECYCLE-SEAM", "status": "ready-for-implementation", "title": "Witness the turn-boundary effect-lifecycle ordering composition seam" },
    { "number": 14, "id": "PPW-T14-ZERO-HP-MID-RESOLUTION-SEAM", "status": "blocked", "title": "Witness the zero-Hit-Point mid-resolution composition seam" },
    { "number": 15, "id": "PPW-T15-LANE-CLOSEOUT", "status": "blocked", "title": "Close out witness-portability artifacts and program rollup" },
    { "number": 16, "id": "PPW-T16-RECURSIVE-NEXT-BATCH", "status": "blocked", "title": "Plan the next portable-witness batch if this lane drains" }
  ]
}
-->

## Why this lane

The QNT corpus is the implementation authority for future sibling-language
harnesses (ADR-0001: each language target is an independent MBT harness against
the same Quint source). The 2026-06-11 readiness sweep measured the current
witness portability of the 111 covered obligations:

- 83 have a `focused-mbt` witness — generative, replayable by any language
  harness;
- 21 have only `deterministic-qnt-replay` — QNT-sourced and portable, but not
  generative;
- 7 have only TS-side witnesses (`runtime-test`/`contract-test`) — a non-TS
  port gets no executable guidance for them.

The same sweep found the composition tier (cross-slice sequencing) witnessed at
five seams (hole/fill frontier ordering, interrupt-stack resume/replay, chained
attack sequences, area/zone trigger timing, reaction offer/decline/resume) and
unwitnessed at three (Concentration break teardown, turn-boundary effect
lifecycle ordering, zero-Hit-Point mid-resolution teardown). It also found two
behavioural QNT modules with no `qnt-owner-roles.jsonl` row and no obligation
binding at all (`battle-runtime-turn-advancement.qnt`,
`battle-runtime-weapon-hit-turn-effects.qnt`): the "no slice forgotten" gate
does not currently see QNT files that no obligation references.

This lane closes those three gaps. It subsumes the remaining queue of
`plans/RALPH_LANE_B_QNT_DEEPENING.md` (QNTD-B06–B10 moved here as PPW-T03,
PPW-T04, PPW-T09, PPW-T10, PPW-T11; lane B's index marks them `deferred` with a
redirect note). Owner scope decision 2026-06-11: three seam drivers plus the
registry fix; a heavy computed-oracle integration lane (importing the full
reducer closure) is **deferred** unless the seam drivers prove insufficient.

Non-goal, by standing decision: combination-exhaustive composition coverage.
ADR-0001 keeps the whole-battle cross-product permanently out of scope;
composition coverage here means **every named seam witnessed by one bounded
protocol driver**, never every combination.

## Context Budget

Read only these by default:

- `plans/QNT_COVERAGE_PROGRAM.md`
- `plans/rules-kernel-coverage/README.md`
- `plans/rules-kernel-coverage/COMPOSITE_SLICE_CANDIDATES.md` (for the moved
  QCP-CS task inputs)
- The relevant rows in `plans/rules-kernel-coverage/obligations.jsonl`,
  `generator-readiness.jsonl`, and `qnt-owner-roles.jsonl`
- The exact QNT owners, TS owners, parity witnesses, SRD passages, and
  `UBIQUITOUS_LANGUAGE.md` sections named by the current task
- For seam tasks: `docs/adr/0001-forest-of-qnt-slices.md` (decision,
  consequences, and the typed witness protocol addendum) and the template pair
  `packages/battle-runtime/battle-runtime-interrupt-stack-resume.mbt.qnt` +
  `packages/battle-runtime/src/interrupt-stack-resume.mbt.test.ts`

Do not reread closed Ralph lanes or deleted historical plans.

## Lane Rules

- Before starting each task, verify the task base:
  `git log --oneline -1 <declared-base-ref>`, `git log --oneline -1 HEAD`, and
  `git merge-base --is-ancestor <declared-base-sha> HEAD`. On mismatch, stop
  and report; branch repair is owner-owned.
- For modeled rules, read the named SRD passages under
  `.references/srd-5.2.1/` and check the named `UBIQUITOUS_LANGUAGE.md`
  sections before editing. Proposed obligation ids and driver names must be
  confirmed against ubiquitous language during implementation.
- Do not add production reducer behavior that diverges from the authoritative
  QNT model. If behavior changes, update the QNT owner first.
- **Seam tasks witness existing composition, they do not invent it.** If a seam
  task discovers that the production reducer's composition diverges from RAW,
  or that the behavior to witness does not exist in the reducer, the task must
  stop and record an owner-decision blocker (`Blocker Type: owner-decision`)
  instead of changing reducer semantics inside this lane.
- Do not add parallel generated state. Future generator/Rust artifacts project
  from the runtime owners recorded in `kernel-ir-boundaries.jsonl`.
- Do not dispatch production runtime behavior on authored Unit or Spell
  identity. SRD identity may appear in content, tests, and selected-identity
  evidence only.
- New `.mbt.qnt` drivers import leaves only; verify with
  `scripts/check-mbt-driver-closure.cjs` (transitive closure ≤ 8 files; shrink
  the allowlist, never grow it). Use the typed witness protocol leaf
  (`battle-runtime-witness-protocol.qnt`) and the picks decision rule from the
  ADR-0001 addendum: picks for input sampling, separate actions for procedure
  paths, literal outcome facts; import a rule module only as a genuine
  computed oracle and only within the closure budget.
- Add the `qnt-owner-roles.jsonl` row in the same commit as any new QNT owner,
  and the `test:mbt:<slice-name>` package script in the same commit as a new
  slice.
- Keep focused MBT slices bounded. If a slice exceeds the local semantic-core
  size budget or starts mixing unrelated lifecycle invariants, split the task
  before claiming the witness.
- Treat battle MBT as scarce. One MBT consumer at a time; reproduce failures
  with the reported `QUINT_SEED` before fixing; use source reading and focused
  deterministic tests for exploration.

## Verification

Every task must run the narrowest relevant checks and include:

- RAW/ubiquitous-language check against the SRD and language anchors named by
  the task.
- Reviewer-loop convergence: RAW traceability, ubiquitous-language/domain
  language, architecture/connascence, and code review. Fix every reasonable
  finding; reject only with a concrete recorded reason; repeat until no
  reasonable findings remain.
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
another MBT run. Run MBT with the repo timing/background protocol from
`CLAUDE.md`.

## DAG / Queue Order

| # | Task | Status | Depends on | Notes |
| ---: | --- | --- | --- | --- |
| 1 | PPW-T01-QNT-REGISTRY-CLOSURE | done | none | Grounds the seam tasks; checker change. |
| 2 | PPW-T02-ACID-ARROW-TIMING-FOCUSED-MBT | ready-for-implementation | none | Independent witness promotion. |
| 3 | PPW-T03-AFTER-HIT-RIDERS-FOCUSED-MBT | ready-for-implementation | none | Moved from QNTD-B06 / QCP-CS4. |
| 4 | PPW-T04-WEAPON-HOSTED-ATTACK-FOCUSED-MBT | ready-for-implementation | none | Moved from QNTD-B07 / QCP-CS5. |
| 5 | PPW-T05-SUBTLE-METAMAGIC-FOCUSED-MBT | ready-for-implementation | none | Independent witness promotion. |
| 6 | PPW-T06-HOLE-VOCABULARY-WITNESS-POLICY | ready-for-research | none | Policy decision; may be a recorded no-op. |
| 7 | PPW-T07-WEAPON-MASTERY-ADVANCEMENT-FOCUSED-MBT | ready-for-implementation | none | Creation runtime; shares semantic core with T08. |
| 8 | PPW-T08-WEAPON-MASTERY-RESELECTION-FOCUSED-MBT | blocked | PPW-T07-WEAPON-MASTERY-ADVANCEMENT-FOCUSED-MBT | Sheet runtime; reuses T07 driver patterns. |
| 9 | PPW-T09-COMMAND-OPTION-FOCUSED-MBT | blocked | PPW-T02-ACID-ARROW-TIMING-FOCUSED-MBT, PPW-T03-AFTER-HIT-RIDERS-FOCUSED-MBT, PPW-T04-WEAPON-HOSTED-ATTACK-FOCUSED-MBT, PPW-T05-SUBTLE-METAMAGIC-FOCUSED-MBT, PPW-T06-HOLE-VOCABULARY-WITNESS-POLICY, PPW-T07-WEAPON-MASTERY-ADVANCEMENT-FOCUSED-MBT, PPW-T08-WEAPON-MASTERY-RESELECTION-FOCUSED-MBT | Moved from QNTD-B08 / QCP-CS6; after runtime-test rows drain. |
| 10 | PPW-T10-ABILITY-CHECK-SEARCH-FOCUSED-MBT | blocked | PPW-T02-ACID-ARROW-TIMING-FOCUSED-MBT, PPW-T03-AFTER-HIT-RIDERS-FOCUSED-MBT, PPW-T04-WEAPON-HOSTED-ATTACK-FOCUSED-MBT, PPW-T05-SUBTLE-METAMAGIC-FOCUSED-MBT, PPW-T06-HOLE-VOCABULARY-WITNESS-POLICY, PPW-T07-WEAPON-MASTERY-ADVANCEMENT-FOCUSED-MBT, PPW-T08-WEAPON-MASTERY-RESELECTION-FOCUSED-MBT | Moved from QNTD-B09 / QCP-CS7. |
| 11 | PPW-T11-SHOVE-WITNESS-POLICY | blocked | PPW-T09-COMMAND-OPTION-FOCUSED-MBT, PPW-T10-ABILITY-CHECK-SEARCH-FOCUSED-MBT | Moved from QNTD-B10 / QCP-CS8. |
| 12 | PPW-T12-CONCENTRATION-BREAK-SEAM | ready-for-implementation | PPW-T01-QNT-REGISTRY-CLOSURE | Highest-value composition seam. |
| 13 | PPW-T13-TURN-BOUNDARY-LIFECYCLE-SEAM | ready-for-implementation | PPW-T01-QNT-REGISTRY-CLOSURE | Uses the modules T01 binds. |
| 14 | PPW-T14-ZERO-HP-MID-RESOLUTION-SEAM | blocked | PPW-T01-QNT-REGISTRY-CLOSURE, PPW-T12-CONCENTRATION-BREAK-SEAM | Reuses T12 teardown facts. |
| 15 | PPW-T15-LANE-CLOSEOUT | blocked | PPW-T01-QNT-REGISTRY-CLOSURE, PPW-T02-ACID-ARROW-TIMING-FOCUSED-MBT, PPW-T03-AFTER-HIT-RIDERS-FOCUSED-MBT, PPW-T04-WEAPON-HOSTED-ATTACK-FOCUSED-MBT, PPW-T05-SUBTLE-METAMAGIC-FOCUSED-MBT, PPW-T06-HOLE-VOCABULARY-WITNESS-POLICY, PPW-T07-WEAPON-MASTERY-ADVANCEMENT-FOCUSED-MBT, PPW-T08-WEAPON-MASTERY-RESELECTION-FOCUSED-MBT, PPW-T09-COMMAND-OPTION-FOCUSED-MBT, PPW-T10-ABILITY-CHECK-SEARCH-FOCUSED-MBT, PPW-T11-SHOVE-WITNESS-POLICY, PPW-T12-CONCENTRATION-BREAK-SEAM, PPW-T13-TURN-BOUNDARY-LIFECYCLE-SEAM, PPW-T14-ZERO-HP-MID-RESOLUTION-SEAM | Full gates, rollup, pointer verification. |
| 16 | PPW-T16-RECURSIVE-NEXT-BATCH | blocked | PPW-T15-LANE-CLOSEOUT | Recursive tail. |

## Task Details

### Task 1 - PPW-T01-QNT-REGISTRY-CLOSURE - Close the QNT registry

Status: `done`

Input:

- `plans/rules-kernel-coverage/qnt-owner-roles.jsonl` (193 rows today)
- `scripts/rules-kernel-coverage-check.cjs`
- The two known unbound behavioural modules:
  `packages/battle-runtime/battle-runtime-turn-advancement.qnt` and
  `packages/battle-runtime/battle-runtime-weapon-hit-turn-effects.qnt`
- Full `packages/**/*.qnt` inventory (exclude `.mbt.qnt` drivers and
  `*-tests.qnt`)

Output:

- Inventory every `.qnt` file with no `qnt-owner-roles.jsonl` row.
- Bind the behavioural ones to obligations (existing or new) with owner-role
  rows; at minimum the two named modules. If binding either module requires a
  new obligation, prefer attaching it to the T13 seam obligation rather than
  inventing a standalone row, and record the choice.
- Classify every remaining unbound file into explicit checker-owned exempt
  categories (leaf type/tag vocabulary, witness-protocol leaves, proof-only
  examples, retired-test companions). Categories live in checker-owned data,
  not prose.
- Extend `rules-kernel-coverage-check.cjs`: every `.qnt` file must be either
  role-rowed or matched by an exempt category; CI red otherwise. A future
  behavioural QNT file can no longer land unregistered.

Acceptance:

- Checker green including the new rule; no behavioural `.qnt` unbound.
- `pnpm rules-kernel-coverage:check -- --write` then
  `pnpm rules-kernel-coverage:check`
- `git diff --check`

### Task 2 - PPW-T02-ACID-ARROW-TIMING-FOCUSED-MBT - Acid Arrow attack timing

Status: `ready-for-implementation`

Input:

- Obligation: `BATTLE.SPELL.ACID_ARROW_ATTACK_TIMING` (kind
  `active-effect-lifecycle`; witness today: runtime-test only)
- QNT owner: `packages/battle-runtime/battle-runtime-acid-arrow.qnt`
- Runtime owners: `battle-reducer.ts`, `active-effect/types.ts`,
  `spell-procedure-profiles/spell-attack-damage.ts`,
  `spells-profiles-attack-damage.ts`, `spells-resolve.ts`,
  `spells-active-effects.ts`, `turn-end-movement.ts`
- SRD: the Acid Arrow spell entry under `.references/srd-5.2.1/Spells/`

Output:

- Focused MBT pair (`.mbt.qnt` + parity test) covering attack-roll hit with
  immediate and end-of-next-turn damage, miss with half initial damage and no
  delayed damage, and delayed-damage cleanup timing.
- Package script and obligation witness-list update.

Acceptance:

- Focused MBT green; checker write+check green; `git diff --check`.

### Task 3 - PPW-T03-AFTER-HIT-RIDERS-FOCUSED-MBT - After-hit damage riders

Status: `ready-for-implementation`

Moved verbatim from `QNTD-B06-AFTER-HIT-RIDERS-FOCUSED-MBT`.

Input: `QCP-CS4` from `COMPOSITE_SLICE_CANDIDATES.md`; obligation
`BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS` (witness today: three runtime-tests).

Output:

- Focused MBT pair for `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS`.
- Keep the first slice bounded to activation, Spell Slot or free-cast spend,
  immediate hit payloads, Concentration ownership, and cleanup.
- If timed start-turn damage or escape checks push the slice over budget,
  split them into a follow-up task before claiming the witness.
- Package script and obligation witness-list update.

Acceptance: focused MBT green; checker write+check green; `git diff --check`.

### Task 4 - PPW-T04-WEAPON-HOSTED-ATTACK-FOCUSED-MBT - Weapon-hosted attack and riders

Status: `ready-for-implementation`

Moved verbatim from `QNTD-B07-WEAPON-HOSTED-ATTACK-FOCUSED-MBT`.

Input: `QCP-CS5` from `COMPOSITE_SLICE_CANDIDATES.md`; obligation
`BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS` (witness today: runtime-tests).

Output:

- Focused MBT pair covering spellcasting-ability attack and damage
  replacement, weapon damage-type choice, held-weapon override, weapon-hit
  rider application, and timed cleanup.
- Package script and obligation witness-list update.

Acceptance: focused MBT green; checker write+check green; `git diff --check`.

### Task 5 - PPW-T05-SUBTLE-METAMAGIC-FOCUSED-MBT - Subtle Spell component suppression

Status: `ready-for-implementation`

Input:

- Obligation: `BATTLE.FEATURE.METAMAGIC_SUBTLE_COMPONENT_SUPPRESSION` (kind
  `resource-sequencing`; witness today: runtime-test only)
- QNT owners: `rule-core/unit-feature-metamagic-option-fact-core.qnt`,
  `rule-core/unit-feature-metamagic-spell-modification-admission-core.qnt`,
  `packages/battle-runtime/battle-runtime-metamagic.qnt`
- Runtime owners: `battle-reducer/metamagic.ts`,
  `battle-reducer/metamagic-support.ts`
- SRD: Sorcerer Metamagic (Subtle Spell) in `.references/srd-5.2.1/Classes/`

Output:

- Focused MBT pair covering Subtle Spell admission, Sorcery Point spend,
  Verbal/Somatic component suppression facts, and rejection without state
  change (e.g. insufficient Sorcery Points).
- Package script and obligation witness-list update.

Acceptance: focused MBT green; checker write+check green; `git diff --check`.

### Task 6 - PPW-T06-HOLE-VOCABULARY-WITNESS-POLICY - Hole-family vocabulary witness shape

Status: `ready-for-research`

Input:

- Obligation: `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` (kind `hole-frontier`;
  witness today: contract-test)
- QNT owners: `battle-runtime-hole-kinds.qnt`, `battle-runtime-fill-kinds.qnt`,
  `battle-runtime-subject-kinds.qnt`
- Runtime owners: `battle-reducer/hole-helpers.ts`,
  `battle-protocol-kinds.ts`
- Witness-kind vocabulary in `plans/unit-profile-coverage/ULTRA_GOLDEN_GATE.md`
  (contract-test is defined for exactly this: registry joins and protocol
  vocabulary mappings where the executable obligation is the join itself)

Output:

- Decide whether contract-test remains the correct witness shape for this
  vocabulary obligation, or whether any part of it is reducer-semantic and
  needs a focused driver. The default expectation is that contract-test is
  correct and each future language target re-validates the join with its own
  contract test (this is what QCP Task 7's per-language parity markers will
  enforce); in that case record the policy decision with a concrete reason in
  the obligation row or program rollup and change no witness.

Acceptance:

- Policy decision recorded with a concrete reason, or focused MBT green.
- Checker write+check green; `git diff --check`.

### Task 7 - PPW-T07-WEAPON-MASTERY-ADVANCEMENT-FOCUSED-MBT - Weapon Mastery advancement (creation)

Status: `ready-for-implementation`

Input:

- Obligation: `CREATION.WEAPON_MASTERY.CLASS_LEVEL_ADVANCEMENT` (kind
  `state-transition`; witness today: runtime-test only)
- QNT owner (shared with T08):
  `packages/shared-algebras/proofs/rule-core/weapon-mastery-reselection.qnt`
- Runtime owner:
  `packages/character-creation-runtime/src/character-build-advancement.ts`
- SRD: Weapon Mastery property and the class Weapon Mastery features in
  `.references/srd-5.2.1/` (Equipment + Classes)

Output:

- Focused MBT pair covering mastery-count change on class-level advancement,
  selection legality against the class's allowed count, and rejection without
  state change for over-count or duplicate selections.
- Package script and obligation witness-list update.

Acceptance: focused MBT green; checker write+check green; `git diff --check`.

### Task 8 - PPW-T08-WEAPON-MASTERY-RESELECTION-FOCUSED-MBT - Weapon Mastery reselection (sheet)

Status: `ready-for-implementation`

Input:

- Obligation: `SHEET.WEAPON_MASTERY.CLASS_LEVEL_RESELECTION` (kind
  `state-transition`; witness today: runtime-test only)
- QNT owner: same semantic core as T07
  (`rule-core/weapon-mastery-reselection.qnt`)
- Runtime owner: `packages/character-sheet-runtime/src/rests.ts`
- T07's driver as the pattern template

Output:

- Focused MBT pair covering Long Rest weapon-mastery reselection: changed
  selection accepted within the allowed count, unchanged selection preserved,
  and rejection without state change for illegal reselection.
- Package script and obligation witness-list update.

Acceptance: focused MBT green; checker write+check green; `git diff --check`.

### Task 9 - PPW-T09-COMMAND-OPTION-FOCUSED-MBT - Command option and next turn

Status: `blocked` (after PPW-T02..T08 drain)

Moved verbatim from `QNTD-B08-COMMAND-OPTION-FOCUSED-MBT`.

Input: `QCP-CS6` from `COMPOSITE_SLICE_CANDIDATES.md`; obligation
`BATTLE.COMMAND.OPTION_AND_NEXT_TURN` (witness today: deterministic replay).

Output:

- Dedicated focused MBT pair covering failed-save pending effect recording,
  Grovel, Drop, Halt, Approach, Flee, accepted/rejected movement fills,
  end-turn cleanup, and Opportunity Attack continuation where the reducer owns
  continuation. Route choice and object inventory stay table-owned facts.
- Package script and obligation witness-list update.

Acceptance: focused MBT green; checker write+check green; `git diff --check`.

### Task 10 - PPW-T10-ABILITY-CHECK-SEARCH-FOCUSED-MBT - Ability Check choice and Search holes

Status: `blocked` (after PPW-T02..T08 drain)

Moved verbatim from `QNTD-B09-ABILITY-CHECK-SEARCH-FOCUSED-MBT`.

Input: `QCP-CS7` from `COMPOSITE_SLICE_CANDIDATES.md`; obligation
`BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES`.

Output:

- Dedicated focused MBT pair covering Search success/failure against admitted
  hidden targets, Ability Check fill legality, spell-selected Skill or Ability
  choices, and stored roll-mode projection.
- Package script and obligation witness-list update.

Acceptance: focused MBT green; checker write+check green; `git diff --check`.

### Task 11 - PPW-T11-SHOVE-WITNESS-POLICY - Shove witness policy

Status: `blocked` (after PPW-T09, PPW-T10)

Moved verbatim from `QNTD-B10-SHOVE-WITNESS-POLICY`.

Input: `QCP-CS8` from `COMPOSITE_SLICE_CANDIDATES.md`; obligation
`BATTLE.SHOVE.OUTCOME_AND_PUSH_BOUNDARY`.

Output:

- Decide whether the existing deterministic replay remains sufficient. If yes,
  record the no-op policy decision with a concrete reason. If focused MBT is
  required, add the MBT pair, package script, and obligation witness update
  covering save pass/fail, Prone, accepted push, blocked push, invalid push
  distance, and Attack resource spending.

Acceptance: policy recorded or focused MBT green; checker write+check green;
`git diff --check`.

### Task 12 - PPW-T12-CONCENTRATION-BREAK-SEAM - Concentration-break teardown seam

Status: `ready-for-implementation`

Input:

- Semantic core: `packages/battle-runtime/battle-runtime-concentration.qnt`
  (role: semantic-core)
- Runtime owners: the damage-apply pipeline
  (`battle-reducer/damage-apply.ts`, `attack-damage-apply.ts`) and ongoing
  effect owners (`battle-reducer/spells-active-effects.ts`,
  `ongoing-feature-helpers.ts`)
- Template pair: `battle-runtime-interrupt-stack-resume.mbt.qnt` +
  `src/interrupt-stack-resume.mbt.test.ts`;
  `battle-runtime-witness-protocol.qnt`
- SRD: Concentration in `.references/srd-5.2.1/Rules-Glossary.md` and the
  Concentration passages in `Playing-the-Game.md`; `UBIQUITOUS_LANGUAGE.md`
  Concentration entries

Output:

- New composition-kind obligation (proposed id
  `BATTLE.PROTOCOL.CONCENTRATION_BREAK_TEARDOWN`; confirm naming against
  ubiquitous language) with surface evidence, owner-role row, and
  generator-readiness row.
- Bounded protocol driver + parity test for the cross-slice story: damage to a
  concentrating combatant (picked amount) → Constitution Saving Throw against
  DC 10 or half damage, whichever is higher (picked die result) → on failure
  Concentration ends → the concentrated spell's ongoing active effects are
  torn down before the next command is offered. Include the voluntary-end path
  and the casting-a-second-Concentration-spell replacement path. Incapacitated
  and death triggers stay out of this slice (T14 owns the death path); record
  the boundary in the driver header.
- The driver asserts teardown and ordering facts as literals with picks per
  the ADR-0001 addendum; it imports leaves only (the concentration semantic
  core is admissible solely if the transitive closure stays within the
  checker budget).
- If the reducer's current composition diverges from RAW at this seam, stop
  and record an owner-decision blocker; do not change reducer semantics here.

Acceptance:

- Focused MBT green under the MBT mutex protocol; closure checker green;
  checker write+check green; `git diff --check`.

### Task 13 - PPW-T13-TURN-BOUNDARY-LIFECYCLE-SEAM - Turn-boundary effect lifecycle ordering

Status: `ready-for-implementation`

Input:

- QNT modules bound by T01: `battle-runtime-turn-advancement.qnt`,
  `battle-runtime-weapon-hit-turn-effects.qnt`; plus
  `battle-runtime-feature-turn-end-effects.qnt`
- Runtime owners: `battle-reducer/turn-end-movement.ts`,
  `spells-active-effects.ts`, `ongoing-feature-helpers.ts`
- Existing deterministic witness for `BATTLE.COMMAND.OPTION_AND_NEXT_TURN`
- SRD: turn structure and "until the start/end of your next turn" duration
  language in `.references/srd-5.2.1/Playing-the-Game.md` and
  `Rules-Glossary.md`

Output:

- New composition-kind obligation (proposed id
  `BATTLE.PROTOCOL.TURN_BOUNDARY_EFFECT_LIFECYCLE`; confirm naming) with
  owner-role and generator-readiness rows.
- Bounded protocol driver + parity test where at least two timed effects with
  different boundary semantics (start-of-turn tick, end-of-turn expiry,
  until-next-turn duration) coexist on one combatant pair, asserting which
  effects fire/expire at which boundary and in what order, across at least two
  turn advancements. Scope documented in the driver header; bounded fixture
  world; never claim exhaustiveness.
- If no current reducer ordering exists to witness, stop and record an
  owner-decision blocker.

Acceptance: focused MBT green under the mutex protocol; closure checker green;
checker write+check green; `git diff --check`.

### Task 14 - PPW-T14-ZERO-HP-MID-RESOLUTION-SEAM - Zero-Hit-Point mid-resolution seam

Status: `blocked` (after PPW-T01, PPW-T12)

Input:

- T12's obligation, driver, and teardown facts
- Death lifecycle slice: `BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE` owners
  and `src/death-saving-throw.mbt.test.ts`
- Damage pipeline runtime owners as in T12
- SRD: dropping to 0 Hit Points, Unconscious, and the
  Concentration-ends-on-Incapacitated chain in
  `.references/srd-5.2.1/Playing-the-Game.md` and `Rules-Glossary.md`

Output:

- New composition-kind obligation (proposed id
  `BATTLE.PROTOCOL.ZERO_HIT_POINT_MID_RESOLUTION`; confirm naming) with
  owner-role and generator-readiness rows.
- Bounded protocol driver + parity test for: a multi-target resolution drops a
  concentrating combatant to 0 Hit Points partway through → Unconscious /
  Incapacitated facts apply → their Concentration ends and dependent effects
  tear down → the remainder of the same resolution proceeds against the
  post-teardown state. Assert the ordering facts.
- If the reducer does not currently sequence teardown inside a multi-target
  resolution, stop and record an owner-decision blocker with the observed
  ordering; do not change reducer semantics here.

Acceptance: focused MBT green under the mutex protocol; closure checker green;
checker write+check green; `git diff --check`.

### Task 15 - PPW-T15-LANE-CLOSEOUT - Closeout

Status: `blocked` (after T01–T14)

Input: results of all prior tasks.

Output:

- Refresh generated rules-kernel coverage artifacts; confirm the witness
  accounting moved: target is zero covered obligations with only TS-side
  witnesses (or each remaining one carries a recorded policy decision from T06
  or T11), and the three seam obligations covered with focused MBT.
- Update `plans/QNT_COVERAGE_PROGRAM.md` rollup and verify
  `plans/RALPH_LANE_B_QNT_DEEPENING.md` carries the redirect note and final
  `deferred` statuses; no stale "next runnable lane" pointers anywhere.
- Record the deferred heavy computed-oracle integration lane as a parked
  decision (deferred unless seam drivers prove insufficient), in the program
  rollup, not as a runnable queue.
- Record any new Rust/generator follow-up only as runnable task ids.

Acceptance:

- Program rollup points at current source-of-truth artifacts with no stale
  lane or blocker claims; checker write+check green; `git diff --check`.

### Task 16 - PPW-T16-RECURSIVE-NEXT-BATCH - Recursive tail

Status: `blocked` (after PPW-T15)

Input: generated reports and lane closeout.

Output:

- If this lane closes, create the next coherent portable-witness or Rust-lane
  plan with 10–20 atomic tasks (candidates: the 21 deterministic-replay-only
  obligations not upgraded here; cleanroom corpus pin/refresh; the Rust
  quint-connect parity lane from `plans/QNT_GENERATOR_READINESS_BACKLOG.md`
  O2).
- If it does not close, append exact repair tasks here instead of ending the
  run.

Acceptance: Ralph has a concrete next plan or concrete repair tasks, never an
empty end state.
