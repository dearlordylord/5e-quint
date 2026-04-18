# Tome of Clear Thought

No surface or atom widening is forced by this unit.

The existing authored surface already represents the mechanic honestly:

- `magic_item` record
- `activation` mechanics family
- `activationCost.kind = "study"` for the 48-hours-within-6-days gate
- `resource.kind = "use_count"` with one use
- `resetCadence.kind = "elapsed_days"` for the century recharge
- `modify_ability_score` for the permanent `+2 Intelligence` increase with `maximum = 30`

Blocker to a `clean` verdict:

- `pnpm typecheck` currently fails before this unit can be marked clean.
- The failure is unrelated to `Tome of Clear Thought` and comes from [src/interpreter/tracer.ts](/workspace/typescript/dnd/.worktrees/auto-close-loop-worker-c/scripts/content-surface-survey/workers/1246243-magic_item_tome_of_clear_thought/src/interpreter/tracer.ts:3274).
- Error:

```text
src/interpreter/tracer.ts(3274,32): error TS2322: Type 'string[]' is not assignable to type 'string'.
```

Why this is not a widening:

- The unit's JSON compiled and traced successfully.
- The failure is a pre-existing implementation bug in the package, not missing vocabulary in `types.ts` or the taxonomy.
