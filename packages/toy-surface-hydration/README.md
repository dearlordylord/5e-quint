# @dnd/toy-surface-hydration

Toy end-to-end package for the manual surface diagram.

It uses:

- the real content surface vocabulary from `@dnd/prototype-content-surface`
- a tiny real authored corpus
- the canonical Effect Schema decoder exported by `@dnd/prototype-content-surface`
- Effect-style service injection for:
  - validated surface-unit library
  - hydrated runtime-unit library
- toy reducers for:
  - creature roster state
  - roster-to-battle projection
  - battle state

The package is intentionally small. Its job is to make the vertical honest:

`Authored JSON -> validated runtime typed value -> reducers -> new state`

It is not a second combat engine and it does not import from `@dnd/core`.

## Domain boundary

The toy package uses repo language, not placeholder gamey shortcuts:

- `Creature`
- `Character Sheet`
- `Stat Block`

It deliberately avoids contradictory states such as a hero-tagged monster.

## Authored units used

- `cure_wounds`
- `fireball`
- `fighter_action_surge_l2`

## Dependency injection

What is injected:

- the validated authored-unit library
- the hydrated runtime-unit library

What stays pure:

- single-unit hydration from real surface record to toy runtime unit
- roster reduction
- roster-to-battle projection once runtime units are provided
- battle reduction

## Run

```sh
pnpm --filter @dnd/toy-surface-hydration typecheck
pnpm --filter @dnd/toy-surface-hydration test
```
