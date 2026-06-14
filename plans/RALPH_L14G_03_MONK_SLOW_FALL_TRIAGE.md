# Ralph Lane: Monk Slow Fall Triage

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L14G-03-MONK-SLOW-FALL-TRIAGE",
      "status": "ready-for-research",
      "title": "Classify or promote Monk Slow Fall"
    }
  ]
}
-->

## Lane Scope

This is one parallel Ralph lane for the level 1-4 ultra-golden effort. It owns
the RAW/domain decision for `monk_slow_fall`, which is currently generated as a
missing no-matrix level-4 class-feature row.

The lane may produce a boundary closure decision or a future implementation
plan. It should not silently implement a battle-runtime reaction without first
identifying the QNT, runtime, and parity owners.

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

Status: `ready-for-research`

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

- Update this file and `plans/ACTIVE_PLAN.md` with either a closure result or
  concrete implementation follow-up.
