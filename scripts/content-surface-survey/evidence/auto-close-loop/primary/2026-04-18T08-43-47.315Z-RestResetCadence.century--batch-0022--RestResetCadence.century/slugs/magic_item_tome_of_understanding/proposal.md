# Tome of Understanding

No content-surface widening is forced by this unit.

`Tome of Understanding` fits the existing authored surface honestly as:

- `MagicItemRecord`
- mechanics family `activation`
- activation cost `{ kind = "study", hours = 48, withinDays = 6 }`
- resource `{ kind = "use_count", cap = fixed 1 }`
- reset cadence `{ kind = "elapsed_days", days = 36500, startsWhen = "resource_spent" }`
- direct effect `{ kind = "modify_ability_score", ability = "wis", delta = +2, maximum = 30 }`

Observed blocker:

- `pnpm typecheck` fails before this worker can report `clean`.
- Failure is pre-existing and outside the allowed edit set:
  - [src/interpreter/tracer.ts](/workspace/typescript/dnd/.worktrees/auto-close-loop/scripts/content-surface-survey/workers/1187476-magic_item_tome_of_understanding/src/interpreter/tracer.ts:3274)
  - `traceEquipmentPredicate(...)` returns `string[]`, but `traceMagicItemSpawnedCreature(...)` stores it in `predId` and pushes it where a single `string` is expected.

Why this is not a widening:

- The unit authored, compiled, and traced successfully.
- The tracer output uses existing atoms only: `magic_item_root`, `activate`, `duration_window`, `use_count`, `self`, `direct_apply`, `modify_ability_score`.
- No new atom, relation, or top-level family is required by the item text.
