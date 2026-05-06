# PBA26 Research Plan - Character Sheet Session And App Migration

Task: PBA26 - Define Promoted Character Sheet Session Boundary And Migrate App

Status: researched; ready for implementation after light source checks.

## Purpose

Implement the promoted replacement for Core's `CharacterSheet` consumers and
move the app off Core APIs. `CharacterBuild` remains the durable
build/progression boundary produced by initial creation and later advancement
workflows. A promoted local `CharacterSheet` owns player-character in-play
state. MCP becomes a tool/storage adapter over local runtime packages rather
than the owner of sheet semantics.

## Research Scope

- Inventory all app imports of `@dnd/core`. PBA26 removes app Core dependency;
  old Core simulator, machine-viz, trace, and demo surfaces should be deleted or
  quarantined rather than rebuilt feature-for-feature.
- Compare Core `CharacterSheet` consumers with promoted `CharacterBuild` plus
  MCP's current `AvailableCharacterSession` behavior.
- Introduce `@dnd/character-sheet-runtime` as the local Character Sheet owner.
- Introduce `@dnd/character-battle-runtime` as the composition package for
  Character Sheet <-> battle-runtime adapters.
- Preserve ownership: character creation must not own current HP, Temporary Hit
  Points, spent resources, Hit Dice remaining, mutable in-play equipment, or
  battle state.
- Explicitly document the Character Sheet homes for temp HP, Hit Dice
  remaining, non-spell feature resource persistence, and mutable equipment, but
  do not add inert placeholder fields before a workflow projects, spends, or
  restores them.
- Fix the `finalize_character` output naming leak: the current `sheet` field is
  actually the stored `CharacterBuild`.

## Expected Implementation Direction

- Add `packages/character-sheet-runtime`.
  - Owns `CharacterSheet`.
  - Owns sheet-native constructors and transitions such as
    `createFreshCharacterSheet`.
  - Owns executable adventuring state currently persisted by MCP: current HP
    zero-HP/death-save/stable/dead lifecycle, Knock Out state, and spell slot
    expenditures when spellcasting.
  - Does not depend on `@dnd/battle-runtime`.
- Add `packages/character-battle-runtime`.
  - Depends on `@dnd/character-sheet-runtime` and `@dnd/battle-runtime`.
  - Owns `characterSheetBattleInit` and
    `applyBattleHandoffToCharacterSheet`.
  - Validates handoff identity and capacity facts against the existing sheet.
  - Keeps `@dnd/battle-runtime` unaware of Character Sheet.
- Migrate MCP's current `session-store.ts`, `session-hit-points.ts`, character
  battle init, and battle handoff mapping to those packages.
- App consumes promoted local character creation and Character Sheet runtime
  directly for local workflows; MCP remains usable as a tool/server adapter over
  the same runtime.
- Core presets/direct patches are replaced by promoted runtime workflows or
  deleted.
- During battle, active encounter state lives in battle-runtime; after battle,
  `applyBattleHandoffToCharacterSheet` settles battle-owned deltas onto the
  prior sheet. Handoff alone must not create a complete sheet.
- Level-up buttons/review flows are removed or deferred unless a promoted
  advancement API exists.

## Character Sheet State Model

`CharacterSheet` is the top-level player-character in-play owner.

- `build`: durable `CharacterBuild` facts, including class progression and
  future level-up/advancement history.
- `hitPoints`: current HP and zero-HP lifecycle. Temporary Hit Points belong
  here, but should only be added when a temp-HP grant/damage/rest workflow is
  executable.
- `hitDice`: remaining/spent Hit Dice by build-derived pool. Deferred until a
  Short/Long Rest workflow exists.
- `spellSlots`: spellcasting and Pact Magic slot expenditure state, derived
  against build capacity.
- `resources`: Unit-provided class/feature resource state. Deferred until spend
  and rest-recovery workflows persist outside battle.
- `equipment`: current carried/equipped/held state, initialized from
  `CharacterBuild.equipment` but mutable after creation. Defer mutability until
  an equipment-change workflow exists.

Do not add empty placeholder fields for unsupported sub-states. Prefer absent
modules/APIs over fields that can drift without executable transitions.

## Implementation Slices

0. Scaffold checkpoint on branch `codex/pba26-character-sheet-runtime`:
   `@dnd/character-sheet-runtime` and `@dnd/character-battle-runtime` package
   shells exist and typecheck, but no behavior has been migrated.
1. Fill `@dnd/character-sheet-runtime` by moving MCP's existing executable
   Character Sheet state there.
2. Fill `@dnd/character-battle-runtime` by moving Character Sheet battle init
   plus battle handoff settlement there.
3. Update MCP to use the two packages and fix `finalize_character` output names
   from sheet-shaped language to build/sheet language accurately.
4. Update app local character flow to finalize drafts into local
   `CharacterSheet` records.
5. Delete or quarantine old Core app surfaces and remove `@dnd/core` from app
   package metadata and path aliases.

## Verification

- RAW/UL check for Character Sheet, Hit Points, Temporary Hit Points, Death
  Saving Throws, Hit Dice, Short Rest, Long Rest, Spell Slots, and Knock Out in
  `.references/srd-5.2.1/` and `UBIQUITOUS_LANGUAGE.md`.
- `rg -n "@dnd/core/character-domain|@dnd/core" packages/app packages/mcp -S`
- Confirm `@dnd/app` package dependencies point to promoted packages needed by
  the migrated flow and no longer rely on `@dnd/core`.
- `pnpm --filter @dnd/character-sheet-runtime typecheck`
- `pnpm --filter @dnd/character-sheet-runtime test`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm --filter @dnd/character-battle-runtime test`
- `pnpm --filter @dnd/app typecheck`
- `pnpm --filter @dnd/app test`
- `pnpm --filter @dnd/mcp typecheck`
- `pnpm --filter @dnd/mcp test`
- Playwright screenshots for changed app flows.
- No battle MBT unless battle-runtime snapshot semantics change.
- `/simplify` convergence, minimum two rounds.
