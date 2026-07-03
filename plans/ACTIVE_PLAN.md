# Active Plan: L5 Extension And L6 Horizontal Slice

This is a coordination rollup, not a Ralph launch queue. Do not run Ralph
against `plans/ACTIVE_PLAN.md`. Launch Ralph from
`plans/RALPH_L5_EXTENSION_L6_HORIZONTAL_SLICE.md`.

## Current State

The active work is the combined Ralph queue for:

- the unfinished level-5 ultra-golden MCP extension;
- the level-6 full SRD horizontal slice;
- the level-6 ultra-golden MCP extension.

The prior level-5 full SRD launch queue is complete and has been removed from
the active tree. Its durable accounting inputs remain in
`plans/unit-profile-coverage/L5_FULL_SRD_REACHABLE_UNIT_ACCOUNTING.md` and
`plans/unit-profile-coverage/L5_PROGRESSION_DELTA_AUDIT.md`.

The current Ralph launch source is
`plans/RALPH_L5_EXTENSION_L6_HORIZONTAL_SLICE.md`.

## Source Of Truth

Read these before starting or reviewing this queue:

- `plans/RALPH_L5_EXTENSION_L6_HORIZONTAL_SLICE.md`
- `plans/unit-profile-coverage/L5_FULL_SRD_REACHABLE_UNIT_ACCOUNTING.md`
- `plans/unit-profile-coverage/L5_PROGRESSION_DELTA_AUDIT.md`
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

The active Ralph queue is task-shaped from the current generated accounting and
SDK inventory, not from older L5 implementation lanes:

| Lane | Rows | Work |
| --- | ---: | --- |
| Level-5 ultra-golden | 10 | Prove level-1-5 support report plumbing, non-MCP reconciliation, and MCP scenario evidence. |
| Level-6 full SRD | 17 | Preserve existing seeds, close table/progression rows, resolve L6 feature owners, and refresh accounting. |
| Level-6 ultra-golden | 10 | Add level-1-6 report plumbing, ultra-golden scope, MCP scenario evidence, and final generated refresh. |

## Verification

- RAW and ubiquitous-language check: before changing or closing a row, read the
  listed local SRD anchors and `UBIQUITOUS_LANGUAGE.md`.
- Progression check: before closing class-table summaries or resource/slot
  deltas, read the relevant progression/mining audit and preserve generic-owner
  decisions.
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
