# PBA26 Research Plan - Character Sheet Session And App Migration

Task: PBA26 - Define Promoted Character Sheet Session Boundary And Migrate App

Status: draft research plan.

## Purpose

Decide the promoted replacement for Core's `CharacterSheet` consumers and move
the app off Core character-creation APIs. The promoted runtime currently
finalizes `CharacterBuild`; MCP owns durable session state such as current HP,
zero-HP lifecycle, and spell-slot expenditures. Current research points to
`CharacterBuild + CharacterSession` or an MCP read model as the promoted
in-play boundary, not a new character-creation-owned `CharacterSheet`.

## Research Scope

- Inventory app imports of `@dnd/core/character-domain.ts` and any Core battle
  projection imports used by UI workflows.
- Compare Core `CharacterSheet` consumers with promoted `CharacterBuild` plus
  MCP `AvailableCharacterSession`.
- Decide whether to:
  - keep `CharacterBuild + CharacterSession` as the promoted in-play sheet;
  - introduce a new explicit package-owned `CharacterSheet` type; or
  - expose a read-model from MCP for UI use.
- Preserve ownership: character creation must not own current HP, spent
  resources, or battle state; MCP/session or a future adventuring package owns
  in-play state.
- Explicitly decide temp HP, Hit Dice remaining, and non-spell feature resource
  persistence. Current MCP session persists HP and spell-slot expenditures, but
  not temp HP, Hit Dice remaining, or non-spell resource uses such as Second
  Wind, Action Surge, or Rage.
- Fix the `finalize_character` output naming leak: the current `sheet` field is
  actually the stored `CharacterBuild`.

## Expected Implementation Direction

- App consumes promoted creation holes/fills and promoted session/list outputs.
- Core presets/direct patches are replaced by runtime/MCP workflows or deleted.
- Character Build remains build-only unless an explicit owner decision creates
  a separate promoted Character Sheet read model.
- Prefer `list_characters` or a new MCP read model as the UI's durable
  character-session surface. During battle, active HP/resources live in battle
  state; the app should not duplicate session and battle facts in React state.
- Level-up buttons/review flows are removed or deferred unless a promoted
  advancement API exists.

## Verification

- `rg -n "@dnd/core/character-domain|@dnd/core" packages/app packages/mcp -S`
- Confirm `@dnd/app` package dependencies point to promoted packages needed by
  the migrated flow and no longer rely on `@dnd/core`.
- `pnpm --filter @dnd/app typecheck`
- `pnpm --filter @dnd/app test`
- `pnpm --filter @dnd/mcp typecheck`
- `pnpm --filter @dnd/mcp test`
- Playwright screenshots for changed app flows.
- No battle MBT unless battle-runtime snapshot semantics change.
- `/simplify` convergence, minimum two rounds.
