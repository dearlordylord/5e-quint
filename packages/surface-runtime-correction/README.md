# @dnd/surface-runtime-correction

Vertical-slice proving ground for the surface-to-runtime correction work.

Current scope:

- real `Surface` decode boundary from `@dnd/prototype-content-surface`
- authored-unit and runtime-unit libraries via Effect services
- roster reduction
- roster-to-battle projection with runtime unit ownership wrappers
- battle initialization with initiative counts, stable initiative order, and explicit turn ownership
- first-class battle vocabulary types for prompts and resolved actions

Out of scope in this package stage:

- prompt discovery and prompt resolution logic
- battle reducer semantics beyond initiative-aware turn advancement
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

## Run

```sh
pnpm --filter @dnd/surface-runtime-correction typecheck
pnpm --filter @dnd/surface-runtime-correction test
```
