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

- mechanics outside the currently-landed correction slice
- any second execution IR parallel to `Surface`

This package already fed one bounded `core` integration on the slotless
`acid_splash` prepared-spell path. The remaining follow-up is to replace that
temporary core bridge with direct correction-pattern code rather than letting
the older projected-execution structure survive as the steady-state shape.

The package keeps authored identity only on `unit.id`. Battle/source projection
identity lives in `RuntimeUnitAccess.battleSourceRef`, and concrete runtime
access identity lives in `RuntimeUnitAccess.accessId`; there is no duplicate
`authoredUnitId` field on the battle-facing wrapper types.

Initiative follows the SRD combat shape in `.references/srd-5.2.1/Playing-the-Game.md`:
initiative counts are supplied per combatant, initiative order is ranked from
highest to lowest and stays stable across rounds. Only tied cohorts require
table-supplied ordering input; non-tied combatants are not repeated in battle
init input. The resulting battle state stores one ordered `turnOrder`
participant list; current turn ownership is derived from `turnOrder[0]`, while
`round` and `turnNumber` remain first-class battle facts.

The current prompt lifecycle is explicit:

- `discoverAvailableBattlePrompt(state)` derives the prompt currently visible to the table/frontend
- `BattlePromptAnswer` values are complete answers only; partially-filled answers are intentionally unrepresentable
- answering a prompt can either produce a `resolvedAction` immediately or produce an `openedPrompt` when resolution creates a new required input step

That distinction matters for this slice:

- `chooseAction -> endTurn` resolves immediately
- `chooseAction -> attack` opens `chooseAttackTarget`
- `chooseAction -> fireball` opens `chooseAreaEffect`
- `chooseAction -> cure_wounds` opens `chooseSingleTargetUnit`

Parity notes:

- TS and Quint now share the same participant-owned battle state shape: `turnOrder`, `round`, `turnNumber`, action-economy counters, and open-prompt ownership
- current turn ownership is derived from `turnOrder[0]`; there is no separate nullable turn-actor field in either layer
- TS keeps nested prompt payload records for `targeting`, `save`, and `effect`, while Quint flattens those fields into prompt variants because the variant tag already fixes the prompt kind
- TS `openPrompt` uses `null | { tag: ... }`; Quint uses explicit variants for the same ownership boundary
- TS runtime helpers interpret authored `Surface` units structurally through `SurfaceUnitInterpretation`; Quint mirrors the same semantic categories as `SupportedBattleUnit`

The TS-first discovery phase is now frozen into the matching Quint slice in:

- [surfaceRuntimeCorrection.qnt](/workspace/typescript/dnd/surfaceRuntimeCorrection.qnt:1)
- [surfaceRuntimeCorrectionTest.qnt](/workspace/typescript/dnd/surfaceRuntimeCorrectionTest.qnt:1)

The correction slice now includes a dedicated MBT bridge. It replays the
frozen prompt/action flow against
[surfaceRuntimeCorrectionMbt.qnt](/workspace/typescript/dnd/surfaceRuntimeCorrectionMbt.qnt:1)
using one opening-turn init and one later cleric-turn init, so the default file
run reaches both the wizard opening slice and the later `cure_wounds`
follow-up prompt. It compares:

- participant-owned battle state
- derived prompt discovery
- open-prompt ownership
- whether a complete answer produced a `resolvedAction` or an `openedPrompt`

The next follow-up is finishing the core migration by removing the temporary
projected-execution bridge from the bounded migrated path.

## Run

```sh
pnpm --filter @dnd/surface-runtime-correction typecheck
pnpm --filter @dnd/surface-runtime-correction test
MBT_TRACES=1 MBT_MAX_SAMPLES=1 pnpm --filter @dnd/surface-runtime-correction exec vitest run src/surface-runtime-correction.mbt.test.ts
pnpm exec quint typecheck surfaceRuntimeCorrectionTest.qnt
pnpm exec quint test surfaceRuntimeCorrectionTest.qnt
```
