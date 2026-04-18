`Tome of Clear Thought` fits the current surface without any widening.

Chosen encoding:

- `kind: "magic_item"`
- mechanics family: `activation`
- `activationCost.kind = "study"` with `hours = 48`, `withinDays = 6`
- `resource.kind = "use_count"` with one use
- `resetCadence.kind = "elapsed_days"` with `days = 36500`, `startsWhen = "resource_spent"`
- effect atom: `modify_ability_score` on `int` with `delta = +2`, `maximum = 30`

Why this was not classified `clean`:

- `dhall-to-json` succeeded.
- The tracer succeeded and produced a valid graph.
- `pnpm typecheck` failed before unit-specific validation could fully pass because of a pre-existing repository error in [src/interpreter/tracer.ts](/workspace/typescript/dnd/.worktrees/auto-close-loop/scripts/content-surface-survey/workers/1160863-magic_item_tome_of_clear_thought/src/interpreter/tracer.ts:3274).

Blocking error:

```text
src/interpreter/tracer.ts(3274,32): error TS2322: Type 'string[]' is not assignable to type 'string'.
```

This is outside the allowed write set for this task, so no code fix was applied.
