# Ralph Lane: Level 4 Progression Delta Audit

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L14G-02-LEVEL4-PROGRESSION-DELTA-AUDIT",
      "status": "done",
      "title": "Audit level-4 class-table progression deltas"
    }
  ]
}
-->

## Lane Scope

This is one parallel Ralph lane for the level 1-4 ultra-golden effort. It owns
the research artifact that compares SRD class table facts at level 3 and level
4. It should not implement runtime behavior directly.

The output must distinguish table-owned progression facts from authored Unit
identity. Runtime behavior must not dispatch on class, feature, or spell names.

## Source Artifacts

- `.references/srd-5.2.1/Classes/`
- `UBIQUITOUS_LANGUAGE.md`
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `plans/unit-profile-coverage/LEVEL1_4_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/rules-kernel-coverage/REPORT.md`
- `plans/rules-kernel-coverage/profile-obligations.jsonl`

## Lane Rules

- Run the Ralph task-base check before research.
- Use local SRD only for RAW meaning.
- Keep the audit artifact source-backed: cite local SRD file paths and line
  numbers where practical.
- Do not add implementation tasks unless they name a concrete owner and
  evidence target.

### Task 1 - L14G-02-LEVEL4-PROGRESSION-DELTA-AUDIT

Status: `done`

Expected size: about one focused day.

Output:

- Extract each class table's level-3 to level-4 progression deltas across all
  12 SRD classes.
- Cover prepared spell counts, cantrip counts, spell-slot counts, Pact Magic
  counts, Weapon Mastery counts, class resources, and any other table-owned
  deltas present in the local SRD tables.
- Map each delta to an existing character-creation, Character Sheet, battle
  handoff, or rules-kernel owner when one exists.
- Write a durable audit artifact under `plans/unit-profile-coverage/`.
- Add concrete follow-up tasks only for uncovered deltas that need future work.

Acceptance:

- The audit names source facts and owners, not authored identity as runtime
  dispatch.
- Covered deltas point to existing generic owners where possible.
- Uncovered deltas are split into Ralph-sized follow-up tasks with owner,
  expected artifact, and verification target.
- No generated coverage artifact is hand-edited.

Verification:

- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

Plan Impact:

- Update this file and `plans/ACTIVE_PLAN.md` if new follow-up tasks are
  discovered.
- If no implementation follow-up is needed, mark the task done and explain the
  closure in the audit artifact.

Result:

- Audit artifact: `plans/unit-profile-coverage/L14G_02_LEVEL4_PROGRESSION_DELTA_AUDIT.md`.
- New follow-up tasks discovered: none.
- Existing follow-up owners remain unchanged: `L14G-01` for missing Fighter,
  Paladin, and Warlock ASI source/catalog records; `L14G-03` for Monk Slow
  Fall triage.
