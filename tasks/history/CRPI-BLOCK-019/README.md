# CRPI-BLOCK-019

## CRPI-BLOCK-019

Status: `pass`

- Task: 27
- Driver path: `packages/battle-runtime/battle-runtime-level2-control-spell-selected-identity.mbt.qnt`
- Accepted projection: `qRoute`
- Evidence file: `tasks/target-replay-evidence/CRPI-BLOCK-019.json`

Task 27 required target replay for the level-2 control spell selected-identity driver as a `reducer-routed` route task. The in-scope selected branches are Spike Growth movement hazard and Web restraint hazard.

Current public qRoute coverage:

- Covered: `battle-runtime-concentration-hazard-selected-route.route.mbt.qnt` selected Spike Growth and Web route branches through `packages/battle-runtime/src/level2-control-spell-selected-identity.mbt.test.ts` public reducer route replay.
- Covered: `battle-runtime-spatial-effect-route-surfaces.qnt` through the shared `spatialEffect` route event vocabulary used by the selected hazard replay.
- Covered: `battle-runtime-spatial-effects.route.mbt.qnt` through the focused reducer route connector MBT plus the Task 27 public route replay.
- Remaining required public qRoute coverage: none.

Task 27 made a focused production route-projection change in `packages/battle-runtime/src/battle-reducer/reducer-route.ts`: the existing spatial-effect route projection now admits typed Spike Growth and Web procedures, runtime movement through Spike Growth emits Movement and Hit Point route events, Web Saving Throw commands emit Saving Throw and condition lifecycle route events, and public End Concentration cleanup emits Concentration, area-hazard, and active-effect spatial cleanup events. This uses procedure shape and runtime command shape rather than authored spell identity, and it adds no durable `BattleState` field.

RAW and ubiquitous-language review checked local SRD 5.2.1 text for Spike Growth, Web, Concentration, Difficult Terrain, Saving Throws, Restrained, Lightly Obscured, Area of Effect, and related `UBIQUITOUS_LANGUAGE.md` terms for Spell Effect, Area of Effect, Concentration, Saving Throw, Movement, Difficult Terrain, Obscurement, Restrained, and Table Decision.

Verification results:

- Task-base check passed: base ref and HEAD both resolved to `b4ab336dd Mark Ralph task 26 done`; Base SHA is an ancestor of HEAD.
- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- `pnpm --filter @dnd/battle-runtime exec vitest run src/level2-control-spell-selected-identity.mbt.test.ts -t "public reducer route replay"` passed: 1 passed, 1 skipped.
- MBT preflight found no active Vitest runner and no stale `quint_evaluator`.
- `START=$(date +%s); MBT_TRACES=1 pnpm --filter @dnd/battle-runtime exec vitest run src/level2-control-spell-selected-identity.mbt.test.ts src/reducer-route-connectors.mbt.test.ts -t "(Level 2 control spell selected identity replay|public reducer route replay|routes selected concentration-backed hazards through generic spatial hazard surfaces|routes spatial effects through light, sight, hazard, and table-witness owners)" 2>&1; STATUS=$?; echo "TOTAL: $(( $(date +%s) - START ))s"; exit "$STATUS"` passed: 2 files passed; 4 tests passed, 32 skipped; TOTAL: 12s.
- `pnpm cleanroom-branch-coverage:check` passed with Task 27 evidence: 738 obligations, 24 sampled inputs.
- `git diff --check` passed.
- `pnpm quality` passed end to end; app lint reported existing warnings and exited 0; turbo typecheck completed 9 successful tasks, all from cache.

Reviewer-loop status:

- Round 1 found the selected control hazards still lacked public spatialEffect route projection for Spike Growth movement damage, Web restraint saves, and concentration-backed cleanup. The implementation extended the existing generic route projection by typed procedure and runtime command shape. No authored-identity production dispatch or duplicate state was added.
- Round 2 found no remaining RAW traceability, ubiquitous-language, architecture/connascence, or code-review findings in the Task 27 diff.
