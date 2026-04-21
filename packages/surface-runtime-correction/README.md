# @dnd/surface-runtime-correction

Vertical-slice proving ground for the surface-to-runtime correction work.

Current scope:

- real `Surface` decode boundary from `@dnd/prototype-content-surface`
- authored-unit and runtime-unit libraries via Effect services
- roster reduction
- roster-to-battle projection with runtime unit ownership wrappers
- battle initialization with initiative counts, stable initiative order, and explicit turn ownership
- first-class battle vocabulary types for prompts, complete prompt answers, and resolved actions
- prompt discovery derived from battle state
- prompt resolution that either returns a resolved action or opens a new prompt
- deterministic end-to-end slice coverage for `attack`, `endTurn`, `cure_wounds`, `fireball`, and `fighter_action_surge_l2`
- correction-slice MBT parity coverage against the frozen Quint correction slice

Out of scope in this package stage:

- core integration follow-up
- mechanics outside the currently-landed correction slice
- any second execution IR parallel to `Surface`

The package keeps authored identity only on `unit.id`. Runtime ownership stays in
`RuntimeUnitAccess.ownerId`; there is no duplicate `authoredUnitId` field on the
battle-facing wrapper types.

Initiative follows the SRD combat shape in `.references/srd-5.2.1/Playing-the-Game.md`:
initiative counts are supplied per combatant, initiative order is ranked from
highest to lowest and stays stable across rounds. Only tied cohorts require
table-supplied ordering input; non-tied combatants are not repeated in battle
init input. The resulting battle state makes turn ownership explicit with
`turnActorId`, `round`, and `turnNumber`, while keeping the ordering layer easy
to extend for later mid-battle participant insertion.

The current prompt lifecycle is explicit:

- `discoverAvailableBattlePrompt(state)` derives the prompt currently visible to the table/frontend
- `BattlePromptAnswer` values are complete answers only; partially-filled answers are intentionally unrepresentable
- answering a prompt can either produce a `resolvedAction` immediately or produce an `openedPrompt` when resolution creates a new required input step

That distinction matters for this slice:

- `chooseAction -> endTurn` resolves immediately
- `chooseAction -> attack` opens `chooseAttackTarget`
- `chooseAction -> fireball` opens `chooseAreaEffect`
- `chooseAction -> cure_wounds` opens `chooseSingleTargetUnit`

The TS-first discovery phase is now frozen into the matching Quint slice in:

- [surfaceRuntimeCorrection.qnt](/workspace/typescript/dnd/surfaceRuntimeCorrection.qnt:1)
- [surfaceRuntimeCorrectionTest.qnt](/workspace/typescript/dnd/surfaceRuntimeCorrectionTest.qnt:1)
- [QUINT_MAPPING.md](/workspace/typescript/dnd/packages/surface-runtime-correction/QUINT_MAPPING.md:1)

The correction slice now includes a dedicated MBT bridge. It replays the
frozen prompt/action flow against
[surfaceRuntimeCorrectionMbt.qnt](/workspace/typescript/dnd/surfaceRuntimeCorrectionMbt.qnt:1)
using one opening-turn init and one later cleric-turn init, so the default file
run reaches both the wizard opening slice and the later `cure_wounds`
follow-up prompt. It compares:

- initiative-owned battle state
- derived prompt discovery
- open-prompt ownership
- whether a complete answer produced a `resolvedAction` or an `openedPrompt`

The next follow-up is integrating the proven slice back into `core`.

## Run

```sh
pnpm --filter @dnd/surface-runtime-correction typecheck
pnpm --filter @dnd/surface-runtime-correction test
MBT_TRACES=1 MBT_MAX_SAMPLES=1 pnpm --filter @dnd/surface-runtime-correction exec vitest run src/surface-runtime-correction.mbt.test.ts
pnpm exec quint typecheck surfaceRuntimeCorrectionTest.qnt
pnpm exec quint test surfaceRuntimeCorrectionTest.qnt
```
