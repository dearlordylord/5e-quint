# Executable Projection Compiler

> Archival note: this document is preserved history for baseline `39f9ab71`.
> The active Correction Application Migration deletes the projected executable
> compiler vocabulary from promoted paths; do not treat this document as current
> architecture.

Date: 2026-04-19

Task lineage:

- original task: `EPT5 - Build Surface-To-Projection Compiler`
- later simplification: remove node-graph `PEN*` indirection and unit-id keyed
  projection from the live compiler

Current state:

- [packages/core/src/projected-compiler.ts](/workspace/typescript/dnd/packages/core/src/projected-compiler.ts)
- [packages/core/src/projected-compiler.test.ts](/workspace/typescript/dnd/packages/core/src/projected-compiler.test.ts)

Superseded parts of the original EPT5 landing:

- no checked-in fixture-output compiler
- no unit-id whitelist in the live compiler
- no preserved-fact drift guard keyed to specific promoted units

Current compiler boundary:

- reduce authored surface units by supported mechanics shape
- fail closed for unsupported families, phases, effects, and resource shapes
- emit direct executable actions or persistent records
- keep concrete unit selection outside the projection core

Currently supported reduction shapes:

- activation spell:
  - one `save_gate` phase
  - fail branch `damage`
  - success branch `none`
- activation class feature:
  - one self-only `direct` phase
  - one effect: `heal_hp` or `grant_extra_action`
- ongoing-effect spell:
  - target attachment
  - one passive `modify_ac_set_base` operation

Architectural note:

The important bar is shape-driven reduction, not simply "surface data enters
core." The live compiler no longer knows `acid_splash`, `mage_armor`,
`fighter_second_wind`, or `fighter_action_surge` as semantic selectors.
Those units remain the first slice only because the surrounding bridge code
chooses to compile those authored records.

Verification:

- `pnpm --dir packages/core typecheck`
- `pnpm --dir packages/core exec vitest run src/projected-compiler.test.ts`

/simplify convergence:

- Round 1: removed unit-id dispatch and compiled by supported mechanics shape
  instead.
- Round 2: removed the stale node-graph/fixture path so the compiler emits the
  direct execution contract actually consumed by runtime.
- Result: no further important simplifications found inside the compiler
  itself. Remaining concrete-unit glue lives at the entry boundary, not in the
  projection core.
