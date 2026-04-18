# Ring of Jumping

No surface or atom widening is needed for this unit.

The honest encoding is:

- `kind = "magic_item"`
- `mechanics.family = "passive"`
- `condition = { kind = "wearing_item" }`
- `grant_spell_access` for `jump`
- `targetRestriction = { kind = "self_only" }`

The blocker is procedural, not modeling-related:

- `dhall-to-json --omit-empty --file content/magic_item_ring_of_jumping.dhall` succeeded.
- `pnpm exec tsx src/run.ts content/magic_item_ring_of_jumping.json --out content/magic_item_ring_of_jumping.trace.md` succeeded.
- `pnpm typecheck` failed on a pre-existing repo error in [src/interpreter/tracer.ts](/workspace/typescript/dnd/.worktrees/auto-close-loop-worker-c/scripts/content-surface-survey/workers/1296327-magic_item_ring_of_jumping/src/interpreter/tracer.ts:3274).

Failure detail:

```text
src/interpreter/tracer.ts(3274,32): error TS2322: Type 'string[]' is not assignable to type 'string'.
```

The failing code is unrelated to `Ring of Jumping` and lies outside the task's allowed write set, so I did not modify it.
