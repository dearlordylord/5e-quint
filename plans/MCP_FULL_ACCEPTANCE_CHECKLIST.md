# MCP Full Acceptance Checklist

Date: 2026-04-30

Scope: verify the currently implemented `plans/ACTIVE_PLAN.md` surface through
the promoted MCP server path. This checklist ignores the review book and covers
the runnable character-creation, battle, handoff, width, and guardrail features
implemented so far.

## Server And Process Hygiene

- [x] No stale DND MCP server process is running before the acceptance run.
- [x] The promoted stdio MCP server starts through `@dnd/mcp`.
- [x] Tool listing exposes the promoted character and battle tools.
- [x] The started MCP server is closed after the run.
- [x] No stale DND MCP server process remains after the run.

## Tool Contract

- [x] Character tools are registered: `create_character_draft`,
  `discover_creation_holes`, `fill_creation_holes`, `finalize_character`,
  `list_characters`.
- [x] Battle tools are registered: `select_stat_block`, `start_battle`,
  `read_battle_state`, `discover_battle_acts`, `fill_battle_hole`,
  `resolve_battle_act`, `end_turn`, `end_battle`.
- [x] `start_battle` exposes one non-empty `characters` array input.
- [x] `start_battle` does not expose `characterCombatantId`.
- [x] `start_battle` does not expose `additionalCharacters`.
- [x] `start_battle` rejects an empty `characters` array.

## Green Vertical: Orc Soldier Fighter 1 Vs Goblin Warrior

- [x] Create an Orc Soldier Fighter draft through MCP.
- [x] Discover the initial creation holes.
- [x] Fill primary class, background, species, ability scores, languages, and
  alignment.
- [x] Discover advancement, class, background, equipment, and loadout choices.
- [x] Fill Fighter 1 advancement.
- [x] Fill Fighter skills, Fighting Style, Weapon Mastery, class equipment,
  Soldier ability increase, tool, and equipment choices.
- [x] Fill purchased equipment.
- [x] Fill loadout.
- [x] Finalize the Character Build and store it as an available character.
- [x] List the finalized character with current and maximum HP.
- [x] Select the Goblin Warrior Stat Block.
- [x] Start battle with caller-supplied Initiative for character and Stat Block.
- [x] Read battle state and snapshot with Initiative order.
- [x] Discover Fighter Attack and End Turn.
- [x] Fill Fighter Longsword target and verify pending fill state.
- [x] Verify pending fills block `end_turn`.
- [x] Verify pending fills block `end_battle`.
- [x] Fill Fighter Longsword attack roll and damage.
- [x] Verify Goblin Warrior HP is reduced.
- [x] End the Fighter turn.
- [x] Discover Goblin Warrior Scimitar, Shortbow, and End Turn.
- [x] Fill Goblin Warrior Scimitar target, attack roll, and damage.
- [x] Verify Fighter HP is reduced.
- [x] End battle.
- [x] List characters and verify the Fighter is available with updated HP.
- [x] Verify Goblin Warrior is not listed as a character.

## Width Vertical: Fighter 2 And Wizard 1 Vs Skeleton

- [x] Create and finalize an Orc Soldier Fighter 2 through MCP.
- [x] Create and finalize an Orc Soldier Wizard 1 through MCP.
- [x] Verify Wizard 1 cantrips, prepared spells, and Spell Slot capacity.
- [x] Select the Skeleton Stat Block.
- [x] Verify Skeleton Bludgeoning vulnerability and Poison immunity facts.
- [x] Start battle with Fighter, Wizard, and Skeleton Initiative.
- [x] Verify battle order and combatant origins.
- [x] Discover Fighter 2 Attack, Action Surge, and End Turn.
- [x] Resolve Fighter Flail damage and verify Bludgeoning vulnerability.
- [x] Resolve Action Surge through `resolve_battle_act`.
- [x] Verify Action Surge resource expenditure.
- [x] Resolve the extra Fighter attack.
- [x] End the Fighter turn.
- [x] Discover Wizard Magic Missile and Ray of Frost.
- [x] Resolve Ray of Frost as a cantrip and verify Spell Slots are not spent.
- [x] End the Wizard turn.
- [x] Discover Skeleton Shortsword attack.
- [x] Resolve Skeleton Shortsword damage against the Fighter.
- [x] Advance turns back to the Wizard.
- [x] Resolve Magic Missile and verify one level-1 Spell Slot is spent.
- [x] Verify Skeleton HP reaches 0.
- [x] End battle.
- [x] List characters and verify Fighter HP handoff.
- [x] List characters and verify Wizard HP and Spell Slot expenditure handoff.

## Verification Commands

- [x] Stdio MCP client acceptance script passes.
- [x] `pnpm --filter @dnd/mcp test` passes.
- [x] `pnpm --filter @dnd/mcp typecheck` passes.
- [x] `pnpm --filter @dnd/mcp lint` passes.
- [x] `pnpm --filter @dnd/mcp circular` passes.
