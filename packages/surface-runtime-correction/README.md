# @dnd/surface-runtime-correction

Vertical-slice proving ground for the surface-to-runtime correction work.

Current scope:

- real `Surface` decode boundary from `@dnd/prototype-content-surface`
- authored-unit and runtime-unit libraries via Effect services
- roster reduction
- roster-to-battle projection with runtime unit ownership wrappers
- first-class battle vocabulary types for prompts and resolved actions

Out of scope in this package stage:

- prompt discovery and prompt resolution logic
- battle reducer semantics
- initiative ordering and turn advancement
- any second execution IR parallel to `Surface`

The package keeps authored identity only on `unit.id`. Runtime ownership stays in
`RuntimeUnitAccess.ownerId`; there is no duplicate `authoredUnitId` field on the
battle-facing wrapper types.

## Run

```sh
pnpm --filter @dnd/surface-runtime-correction typecheck
pnpm --filter @dnd/surface-runtime-correction test
```
