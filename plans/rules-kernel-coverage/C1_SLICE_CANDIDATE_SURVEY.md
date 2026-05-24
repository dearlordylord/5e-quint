# C1 Slice Candidate Survey

Task: `C1-SLICE-CANDIDATE-SURVEY`

Scope: survey queued Lane C composite MBT slice candidates for existing
slice-style evidence. This task does not implement a slice.

## Findings

Already have adequate focused MBT or selected-identity MBT witnesses:

| Queued task | Candidate | Existing evidence | Plan action |
| --- | --- | --- | --- |
| C2 | Direct condition lifecycle | `packages/battle-runtime/battle-runtime-direct-condition-lifecycle.mbt.qnt` plus `packages/battle-runtime/src/direct-condition-lifecycle.mbt.test.ts`; package script `test:mbt:direct-condition-lifecycle` already exists. | Remove or revise away from new slice work. |
| C3 | Save-gated condition lifecycle | `packages/battle-runtime/battle-runtime-condition-saving-throw-selected-identity.mbt.qnt` plus `packages/battle-runtime/src/condition-saving-throw-selected-identity.mbt.test.ts`. | Remove as duplicate slice work; if a script is desired, leave that to closure/script task rather than a new slice. |
| C13 | Mirror Image hit interception | `packages/battle-runtime/battle-runtime-mirror-image-hit-interception.mbt.qnt` plus `packages/battle-runtime/src/mirror-image-hit-interception.mbt.test.ts`; package script `test:mbt:mirror-image-hit-interception` already exists. | Remove or revise away from new slice work. |
| C14 | Warding Bond linked damage sharing | `packages/battle-runtime/battle-runtime-warding-bond-damage-sharing.mbt.qnt` plus `packages/battle-runtime/src/warding-bond-damage-sharing.mbt.test.ts`; package script `test:mbt:warding-bond-damage-sharing` already exists. | Remove or revise away from new slice work. |
| C15 | Sanctuary targeting interdiction | `packages/battle-runtime/battle-runtime-sanctuary-selected-identity.mbt.qnt` plus `packages/battle-runtime/src/sanctuary-selected-identity.mbt.test.ts`. | Remove as duplicate slice work; if a script is desired, leave that to closure/script task rather than a new slice. |

Still valid as composite MBT slice candidates because current evidence is QNT
proof and/or deterministic runtime-test coverage, not a dedicated
`*.mbt.qnt` + `src/*.mbt.test.ts` witness:

| Queued task | Candidate | Current evidence found |
| --- | --- | --- |
| C4 | See Invisibility observer sight | QNT owner `battle-runtime-see-invisibility.qnt`, QNT run tests, and deterministic runtime test `unit-profile-admission-see-invisibility.test.ts`. |
| C5 | Ray of Enfeeblement lifecycle | QNT ownership in save-gated spell, spell attack, timed effects, and concentration files; deterministic runtime tests in `unit-profile-admission-ray-of-enfeeblement.test.ts` and `battle-runtime-ice-knife.test.ts`. |
| C6 | Web restraint hazard | QNT owner through `battle-runtime.qnt`/ground-command tests and deterministic runtime test `unit-profile-admission-web-restraint-hazard.test.ts`. |
| C7 | Heat Metal object contact | QNT object-contact tests and deterministic runtime test `unit-profile-admission-heat-metal.test.ts`. |
| C8 | Gust of Wind line lifecycle | QNT owner/test in `battle-runtime-gust-of-wind.qnt` and deterministic runtime test `unit-profile-admission-gust-of-wind.test.ts`. |
| C9 | Antimagic Field suppression | QNT owner/test coverage and deterministic runtime test `unit-profile-admission-antimagic-field.test.ts`. |
| C10 | Spike Growth movement hazard | QNT ground-command tests and deterministic runtime test `unit-profile-admission-spike-growth-movement-hazard.test.ts`. |
| C11 | Dragon's Breath initial effect | QNT owner coverage in `battle-runtime.qnt` and deterministic runtime test `unit-profile-admission-dragons-breath.test.ts`. |
| C12 | Dragon's Breath granted action | QNT owner coverage in `battle-runtime.qnt` and deterministic runtime test `unit-profile-admission-dragons-breath.test.ts`. |

## Planning Impact

- `plans/RALPH_LANE_C_COMPOSITE_MBT_SLICES.md` now marks C2, C3, C13, C14,
  and C15 as done with existing evidence so Lane C does not queue duplicate
  slice implementation work.
- Keep C4 through C12 as valid runnable slice candidates.
- C17 should remain responsible for package-script/report closure. Existing
  focused MBT files for C3 and C15 do not currently have package scripts, while
  C2, C13, and C14 already do.
- C17 should also refresh `plans/rules-kernel-coverage/obligations.jsonl` where
  existing focused MBT source markers are not yet the row's declared
  `focused-mbt` witness. This is row/report cleanup, not new slice work.

## Verification Note

No new D&D rule semantics were modeled in this survey, so no RAW interpretation
or MBT execution was required. The survey read existing rules-kernel obligation
rows, package scripts, QNT files, and TS tests only.
