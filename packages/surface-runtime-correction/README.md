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

Out of scope in this package stage:

- Quint parity, Quint MBT, and core integration follow-up
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

This package is deliberately TS-first only for pattern discovery. Quint parity
is still required next: the landed TS shapes are the input to the follow-up
Quint spec and MBT bridge work, after which Quint resumes semantic leadership
for the slice.

## Run

```sh
pnpm --filter @dnd/surface-runtime-correction typecheck
pnpm --filter @dnd/surface-runtime-correction test
```
