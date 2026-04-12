# MCP Event Surface Audit

## Status

This file is the durable MCP event-surface backlog reference.

- Keep it lean and forward-looking.
- Do not use raw event-count coverage as a completion metric.
- For every deferred item, keep one clear owning surface and one clear blocker list.

The exhaustive per-event inventory work is complete and no longer lives here. This file keeps only the findings that still matter for future MCP work.

## Purpose

The audit question is:

- "For each core event we may want publicly callable, which MCP surface owns it, and what specifically still blocks it?"

Not all core events should become `get_available_actions` tokens. Some belong on `execute_control_command`, some on `record_table_event`, and many should remain internal `action_resolution`, `domain_trigger`, or `bookkeeping`.

## Current MCP Surfaces

Current MCP tools are:

- `get_state`
- `get_available_actions`
- `execute_action`
- `preview_action`
- `execute_control_command`
- `record_table_event`

Current intentionally public routes:

- `get_available_actions` / `execute_action`: ordinary creature and battle suggested actions, plus a few lifecycle actions that carry user choices or runtime-owned resolution (`SHORT_REST`, `START_TURN`, `ENTER_COMBAT`, `EXIT_COMBAT`).
- `execute_control_command`: battle/session/turn control that should not mix into ordinary player suggestions.
- `record_table_event`: DM/table/world facts with warning-aware semantics.

Current intentionally hidden routes:

- `action_resolution`: low-level reaction, dice, and branch-resolution events emitted after a public action or table event.
- `domain_trigger`: internal semantic triggers that open pending windows for later public actions.
- `bookkeeping`: internal state accounting behind higher-level semantics.

## Durable Findings

These ownership findings should remain stable unless the architecture changes.

### 1. Raw exposure is the wrong metric

Some public tokens wrap lower-level runtime events, and some public-worthy events belong on `record_table_event` or `execute_control_command` rather than `get_available_actions`.

### 2. Do not add a geometry owner to core or MCP

- `BATTLE_HELP_ATTACK` and `BATTLE_MOVE` are valid future public surfaces.
- They must run over explicit caller/session spatial facts.
- Core and MCP should not grow a grid engine, pathfinder, or persistent geometry subsystem.

### 3. Attack-shaped actions need a strict runtime boundary

`BATTLE_ATTACK` is the template for future attack-shaped public surfaces.

- Battle owns attacker state, resource spend, weapon/profile derivation, crit derivation, Sneak Attack legality/state, and damage aggregation semantics.
- Caller/runtime must provide only the explicit battle-external facts needed to resolve the attack honestly.
- Do not expose arbitrary caller-supplied attack payload fields such as damage type, weapon properties, finesse, or other battle-owned derived facts.

This same boundary will be reused by:

- `BATTLE_OFF_HAND_ATTACK`
- `BATTLE_LEGENDARY_ATTACK`
- any future movement OA or other attack-shaped reaction flow

### 4. Creature attack riders are battle-owned windows

The remaining attack riders do not belong on creature MCP surfaces.

- `USE_BRUTAL_STRIKE` is a pre-roll declaration window.
- `STUNNING_STRIKE`, `USE_ELDRITCH_SMITE`, and `USE_DIVINE_SMITE_FREE` are post-hit rider windows.
- `USE_CUNNING_STRIKE` is a post-hit rider-choice window with effect-resolution follow-through.

These stay blocked until battle owns the relevant hit qualification, target identity, timing window, save/size/runtime facts, and rider-specific spend logic.

### 5. Generic spell table events are blocked by multi-phase resolution

Do not expose raw generic spell events until the full reaction/resolution flow has an honest owner.

- `BATTLE_CAST_SAVE_SPELL`
- `BATTLE_CAST_CONCENTRATION_SPELL`
- `BATTLE_CAST_AOE`

These are blocked because they can open counterspell windows, save-failed reaction windows, per-target AoE loops, or other follow-up MCP interaction. Prefer modeled spell actions with battle-owned payloads.

### 6. Raw effect payloads are not safe public schemas

Do not expose generic raw effect insertion/removal payloads.

- `ADD_EFFECT`
- `REMOVE_EFFECT`

These remain blocked until effect provenance, duration, hooks, granted facts, and valid payload shape are owned by narrow semantic commands rather than arbitrary MCP input.

### 7. Max-HP change events need provenance ownership

- `REDUCE_MAX_HP`
- `RESTORE_MAX_HP`

These are blocked because the raw amount-only events lose rule-source semantics and source-specific caps/restoration behavior.

### 8. Failed-save / failed-check semantic commands are the correct public trigger surface

Raw trigger events stay internal.

- `TRIGGER_INDOMITABLE` is opened via semantic `RECORD_FAILED_SAVING_THROW`.
- `TRIGGER_TACTICAL_MIND` is opened via semantic `RECORD_FAILED_ABILITY_CHECK`.

Apply the same pattern elsewhere when a public trigger is needed: expose the semantic table fact, not the raw `TRIGGER_*` event.

## Current Public Coverage That Matters To Deferred Work

These already-landed slices are relevant because future items build on their ownership decisions.

- Battle spatial slices already wired: `BATTLE_HIDE`, `BATTLE_SEARCH`, `BATTLE_ESCAPE_GRAPPLE`, `BATTLE_RELEASE_GRAPPLE`
- Battle feature slices already wired: `BATTLE_ACTION_SURGE`, `BATTLE_ENTER_RAGE`, `BATTLE_DECLARE_RECKLESS`
- Creature class slices already wired: `USE_MAGICAL_CUNNING`, `USE_INNATE_SORCERY`, `ENTER_WILD_SHAPE`, `EXIT_WILD_SHAPE`, `USE_WILD_RESURGENCE_SLOT`
- Semantic trigger table events already wired: `RECORD_FAILED_SAVING_THROW`, `RECORD_FAILED_ABILITY_CHECK`
- Table-event wrap is intentionally narrow: no arbitrary raw `DndEvent` or `BattleEvent` payload passthrough

## Deferred Queue

These are the public-facing items that still matter. Keep this table current.

| Item | Intended MCP surface | Current blocker(s) | Notes |
| --- | --- | --- | --- |
| `BATTLE_ATTACK` | `get_available_actions` | Finalize and wire the strict `battleAttack` token/runtime contract. Runtime still must carry explicit target AC, distance/visibility, adjacency, and hit-reaction candidate facts without MCP fabricating battle state. | First safe slice is active-creature main-hand weapon attack only. Battle owns crit derivation and damage semantics. |
| `BATTLE_OFF_HAND_ATTACK` | `get_available_actions` | Depends on finalized `BATTLE_ATTACK` boundary. Also needs Light-property pairing and ability-modifier handling for extra attack damage. | Reuse the same target/roll/session-fact contract as `BATTLE_ATTACK`. |
| `BATTLE_LEGENDARY_ATTACK` | `get_available_actions` or future monster-control route | Depends on finalized `BATTLE_ATTACK` boundary and on stat-block-owned legendary-action option payload/name/cost derivation. | Do not accept arbitrary caller-supplied monster attack payloads. |
| `BATTLE_HELP_ATTACK` | `get_available_actions` | Needs a bounded token contract over explicit caller/session spatial facts only. | Required public holes are `allyId`, `targetId`, and helper-within-5-feet-of-target fact. No geometry owner in core/MCP. |
| `BATTLE_MOVE` | `get_available_actions` | Needs a bounded token contract over explicit caller/session path, threat, provocation, and reach-exit facts. | No geometry owner in core/MCP. Opportunity-attack legality still depends on caller/session-owned reach-exit facts. |
| `BATTLE_GRAPPLE` | `get_available_actions` | Public contract still needs `targetId` plus resolved save outcome wiring. | Size ownership is already solved in battle state. |
| `USE_BRUTAL_STRIKE` | battle-driven rider window | Needs battle-owned chosen-attack window, legality, and effect follow-through. | Pre-roll declaration rider. |
| `STUNNING_STRIKE` | battle-driven rider window | Needs battle-owned post-hit qualification, target identity, focus spend, and target save result handling. | Post-hit rider. |
| `USE_CUNNING_STRIKE` | battle-driven rider window | Needs battle-owned Sneak Attack legality, rider-choice window, scaling, size/save follow-through. | Post-hit / pre-Sneak-Attack-damage rider-choice window. |
| `USE_ELDRITCH_SMITE` | battle-driven rider window | Needs battle-owned pact-weapon hit qualification, slot spend, target identity, and target-size handling for optional `Prone`. | Post-hit rider. |
| `USE_DIVINE_SMITE_FREE` | battle-driven rider window | Needs battle-owned melee/unarmed hit qualification, target identity, timing, free-use flag, and target creature-type handling. | Post-hit rider. |
| `BATTLE_CAST_SAVE_SPELL` | future semantic spell action or future `record_table_event` route | Blocked on multi-phase reaction resolution and spell payload ownership. | Do not expose raw generic event while it can open counterspell and save-failed reaction windows. |
| `BATTLE_CAST_CONCENTRATION_SPELL` | future semantic spell action or future `record_table_event` route | Blocked on counterspell resolution ownership and spell payload validation. | Raw `SpellId`/duration/condition payload is not a stable public contract. |
| `BATTLE_CAST_AOE` | future semantic spell action or future `record_table_event` route | Blocked on counterspell resolution plus per-target AoE iteration ownership. | Do not expose raw AoE event until the per-target loop has an honest owner. |
| `REDUCE_MAX_HP` | future `record_table_event` route | Needs source/provenance ownership for max-HP reduction semantics and caps. | Raw amount-only command is not sufficient. |
| `RESTORE_MAX_HP` | future `record_table_event` route | Needs source/provenance ownership for restoration semantics and scope. | Prefer semantic spell/rest routes until provenance is owned. |
| `ADD_EFFECT` | future semantic spell/effect route | Raw effect payload is too internal and unconstrained for MCP. | Add only through narrow semantic commands. |
| `REMOVE_EFFECT` | future semantic spell/effect route | Removal by internal effect identity is not yet a stable public contract. | Prefer source-owned parent semantics such as concentration break, expiry, or spell-specific removal. |
| `DROP_PRONE` | future movement or `record_table_event` route | Blocked on session/position ownership because prone/standing interacts with movement-budget semantics. | Keep aligned with future movement ownership. |
| `SUFFOCATE` | future `record_table_event` route | Needs explicit suffocation-progress ownership, not the current terminal shortcut event. | Current raw event is not the right public hazard shape. |
| `APPLY_STARVATION` | future `record_table_event` route | Needs owned malnutrition progression semantics. | Current raw event does not capture the SRD process. |
| `APPLY_DEHYDRATION` | future `record_table_event` route | Needs owned dehydration progression semantics by creature size and recovery/removal behavior. | Current raw event is too narrow. |
| `USE_LEGENDARY_ACTION` | future `execute_control_command` route | Needs stat-block-owned action-name legality and cost projection. | Monster-control route, not ordinary player suggestion route. |
| `USE_RECHARGE_ABILITY` | future `execute_control_command` route | Needs stat-block-owned recharge ability projection and legality. | Monster-control route. |
| `USE_DAILY_ABILITY` | future `execute_control_command` route | Needs stat-block-owned daily-ability projection and legality. | Monster-control route. |

## Intentionally Internal

These are not backlog items unless the product surface changes.

- Raw reaction-resolution events already wrapped by public reaction tokens
- Raw `TRIGGER_*` events that should remain behind semantic commands
- Creature and battle bookkeeping events such as action-economy spend markers
- Standalone concentration/death-save runtime rolls that belong to turn/damage resolution rather than direct MCP commands

## Maintenance Rule

When updating this file:

- remove completed items from the deferred queue unless their findings still block another item;
- keep blocker text specific enough that the next coding task can start from it directly;
- prefer one row per future public item over exhaustive source-type inventories;
- if a blocker is resolved, replace it with the next real blocker rather than preserving stale history.
