# Active Plan: Level 5 Full SRD Completion

This is a coordination rollup, not a Ralph launch queue. Do not run Ralph
against `plans/ACTIVE_PLAN.md` for this effort. Launch task-by-task from
`plans/RALPH_L5_FULL_SRD_COMPLETION.md`.

## Current State

The active work is the character-level-5 full SRD completion queue. The
pre-work audit is complete and recorded in
`plans/unit-profile-coverage/L5_FULL_SRD_REACHABLE_UNIT_ACCOUNTING.md` and
`plans/unit-profile-coverage/L5_PROGRESSION_DELTA_AUDIT.md`.

The level-5 frontier is SRD-only and row-grained:

- 28 character-level rows.
- 110 spell-level-3 class-list rows.
- 138 total level-5 completion rows.

Level-5 progression deltas are closed through generic owners: Proficiency
Bonus, Spell Access, Spell Slots, Pact Magic, Weapon Mastery, feature resources,
and character-battle handoff are not new per-class runtime tasks.

The only launch source for Ralph is
`plans/RALPH_L5_FULL_SRD_COMPLETION.md`. It contains a 57-task queue covering
seed verification, explicit class-table closure, per-spell SDK scenarios,
per-Unit owner reviews, future-owner-before-SDK closures, unresolved spell-owner
reviews, two artifact-reconciliation closures inside the future-owner lane, and
a final generated-refresh task.

The earlier level-1-4 and L5 lane files were removed from the active tree; they
are historical records in git history, not active launch sources.

## Source Of Truth

Read these before starting work in this queue:

- `plans/unit-profile-coverage/L5_FULL_SRD_REACHABLE_UNIT_ACCOUNTING.md`
- `plans/unit-profile-coverage/L5_PROGRESSION_DELTA_AUDIT.md`
- `plans/RALPH_L5_FULL_SRD_COMPLETION.md`
- `plans/unit-profile-coverage/level1-7-mining-audit.json`
- `plans/unit-profile-coverage/LEVEL1_7_MINING_AUDIT.md`
- `plans/sdk-raw-integration/level1-5-sdk-raw-inventory.json`
- `plans/sdk-raw-integration/LEVEL1_5_SDK_RAW_INVENTORY.md`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `plans/unit-profile-coverage/unit-matrix.json`
- `.references/srd-5.2.1/Classes/`
- `.references/srd-5.2.1/Spells/`
- `UBIQUITOUS_LANGUAGE.md`
- `ASSUMPTIONS.md`

## Work Shape

The Ralph queue is task-shaped from the current SDK inventory, not from the
older L5 implementation lanes:

| Lane | Rows | Work |
| --- | ---: | --- |
| Existing SDK seeds | 6 | Verify current seed scenario evidence remains discoverable. |
| Explicit class-table closure | 12 | Close level-5 class-table summary rows as SDK-scope table-only rows after citing the progression-delta audit. |
| Battle spell SDK scenarios | 35 | Add SDK RAW scenarios or class-access assertions for supported spell Units. |
| Owner review for supported feature rows | 6 | Decide SDK scenario vs explicit SDK closure per Unit. |
| Feature owner review | 2 | Resolve Sear Undead and Tactical Shift owner boundaries. |
| Future owner before SDK | 43 | Preserve future-owner closures until durable owners exist. |
| Artifact reconciliation inside future-owner lane | 4 | Reconcile `gaseous_form` and `phantom_steed` mining-vs-SDK disposition text before treating the future-owner closures as durable. |
| Spell-effect owner review | 36 | Resolve owner boundaries for twelve spell identities. |

## Verification

- RAW and ubiquitous-language check: before changing or closing a row, read the
  listed local SRD anchors and `UBIQUITOUS_LANGUAGE.md`.
- Progression check: before closing class-table summaries or resource/slot
  deltas, read `plans/unit-profile-coverage/L5_PROGRESSION_DELTA_AUDIT.md` and
  preserve its generic-owner decisions.
- Reviewer-loop convergence: run RAW traceability, ubiquitous-language/domain,
  architecture/connascence, and code-review passes until no reasonable findings
  remain.
- Plan/checker commands:
  `pnpm unit-profile-coverage:check:self-test`,
  `pnpm unit-profile-coverage:check`,
  `pnpm rules-kernel-coverage:check:self-test`,
  `pnpm rules-kernel-coverage:check`,
  `pnpm sdk-raw-integration-inventory:check`,
  `pnpm cleanroom-branch-coverage:check`,
  `git diff --check`.
- Do not run MBT for this pre-work.
