# Ralph Lane: Monk Slow Fall Triage

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L14G-03-MONK-SLOW-FALL-TRIAGE",
      "status": "done",
      "title": "Classify or promote Monk Slow Fall"
    },
    {
      "number": 2,
      "id": "L14G-03A-MONK-SLOW-FALL-RUNTIME",
      "status": "done",
      "title": "Promote Monk Slow Fall falling Reaction reduction"
    }
  ]
}
-->

## Lane Scope

This is one parallel Ralph lane for the level 1-4 ultra-golden effort. It owns
the RAW/domain decision for `monk_slow_fall`, which is currently generated as a
missing no-matrix level-4 class-feature row.

Task 1 produced the boundary decision in
`plans/unit-profile-coverage/L14G_03_MONK_SLOW_FALL_TRIAGE.md`: Slow Fall is a
split between table-owned falling adjudication and a promoted battle-runtime
Reaction damage-reduction slice. Task 2 is the implementation follow-up.

## Source Artifacts

- `.references/srd-5.2.1/Classes/Monk.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `UBIQUITOUS_LANGUAGE.md`
- `ASSUMPTIONS.md`
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `plans/unit-profile-coverage/LEVEL1_4_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- Existing reaction, damage-reduction, movement, and falling-related runtime or
  QNT owners found by source search.

## Lane Rules

- Run the Ralph task-base check before research.
- Read local RAW before deciding the owner boundary.
- Do not browse external rules sources.
- Do not add production behavior unless the task first updates the plan with a
  precise QNT/runtime/MBT implementation slice.

### Task 1 - L14G-03-MONK-SLOW-FALL-TRIAGE

Status: `done`

Expected size: about one focused day.

Output:

- Decide whether Slow Fall is:
  - a runtime-detached falling/table adjudication closure,
  - a promoted battle-runtime reaction plus damage-reduction slice, or
  - a split between table-owned fall adjudication and promoted damage
    reduction.
- Write the decision as a durable artifact under `plans/unit-profile-coverage/`.
- If promoted, identify the QNT owner, runtime reducer owner, support profile,
  selected-identity evidence shape, and focused parity witness target.
- If closed, add or update checker-visible Unit claim closure guidance for a
  later implementation lane.

Acceptance:

- The decision cites local RAW and `UBIQUITOUS_LANGUAGE.md`.
- The decision does not duplicate falling state across Character Sheet, battle
  runtime, and table adjudication boundaries.
- If implementation is required, the follow-up task is executable by Ralph and
  includes verification commands.

Verification:

- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

Plan Impact:

- Boundary decided as a split. The implementation follow-up is
  `L14G-03A-MONK-SLOW-FALL-RUNTIME`.

### Task 2 - L14G-03A-MONK-SLOW-FALL-RUNTIME

Status: `done`

Expected size: about one focused day.

Output:

- Author the SRD-provenance `monk_slow_fall` Surface record and class feature
  grant if still absent.
- Widen the existing `reaction_roll_or_damage_reduction` Surface and runtime
  support family with a fall-specific damage-reduction modifier; do not model
  Slow Fall as attack damage.
- Extend the `creatureFalls` interrupt and landing/fall-damage reducer path so
  a selected Monk can spend a Reaction to reduce caller-supplied fall damage by
  `5 * Monk level`.
- Keep fall distance, landing geometry, raw fall-damage derivation, and
  falling-into-liquid adjudication table/spatial-owned.
- Do not silently combine Slow Fall with the Falling hazard's separate
  falling-into-liquid Reaction check; a future generic fall owner must
  coordinate those through the same Reaction resource if both are promoted.
- Add QNT, runtime tests, selected-identity evidence, and checker-visible Unit
  support after behavior exists.

Acceptance:

- Slow Fall support dispatches by parsed support profile and selected Unit
  reference, not Monk or Slow Fall authored identity.
- No `BattleState` field duplicates table/spatial falling position, fall
  distance, or landing geometry.
- The landing/fall-damage boundary resolves reduced fall damage and
  Falling-Prone prevention together.
- `plans/unit-profile-coverage/unit-claims.jsonl` and
  `unit-evidence.jsonl` record support only after the runtime and QNT owners
  are present.

Verification:

- `pnpm --filter @dnd/battle-runtime exec vitest run src/slow-fall-reaction.test.ts src/unit-profile-admission-martial-action-features.test.ts`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

If a focused MBT driver is added, run only that file after checking for
existing `vitest` and `quint_evaluator` processes, and use the background/timing
protocol from `AGENTS.md`.

Plan Impact:

- Task accepted as implemented. No follow-up task split is required for the
  Task 2 scope.
