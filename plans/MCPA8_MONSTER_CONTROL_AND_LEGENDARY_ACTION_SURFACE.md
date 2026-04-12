# MCPA8 — Monster Control And Legendary Action Surface

## Purpose

Define the honest public MCP ownership model for named monster-only ability use
and for the attack-shaped legendary-action follow-up, without adding
monster-specific adapter routes or caller-owned attack payloads.

## Non-Goal

This task does not wire the routes end to end. It settles the public boundary
so later implementation can add monster-control commands and a bounded
`BATTLE_LEGENDARY_ATTACK` slice without inventing a second monster attack
schema.

## RAW Anchors

- `.references/srd-5.2.1/Monsters/Overview.md`:
  Legendary Actions happen immediately after another creature's turn, only one
  can be taken at a time, an Incapacitated monster can't take one, and the
  monster regains all expended uses at the start of each of its turns.
- `.references/srd-5.2.1/Monsters/Overview.md`:
  `Recharge X-Y` means the monster uses that stat-block part once, then rolls
  `1d6` at the start of each of its turns to regain it on the listed range, and
  the part also recharges on a Short or Long Rest.
- `.references/srd-5.2.1/Monsters/Overview.md`:
  `Recharge after a Short or Long Rest` is also a named limited-use rule on a
  specific stat-block part.
- `.references/srd-5.2.1/Monsters/*` legendary sections:
  legendary options are named entries in the stat block and some cost more than
  one legendary-action use.

## Existing Code Findings

- `packages/core/src/monster-types.ts` already models the authored monster
  ownership we need:
  - legendary actions are named records with stable `id`, `name`, and `cost`;
  - recharge and daily abilities are named by authored IDs in stat-block-owned
    maps;
  - these are stat-block facts, not MCP-owned metadata.
- `packages/core/src/monster-catalog.ts` already projects monster resource
  state into runtime init:
  - `legendaryActions`;
  - `legendaryResistances`;
  - `rechargeAvailable`;
  - `rechargeMinRolls`.
- `creature.qnt`, `packages/core/src/machine.ts`, and
  `packages/core/src/machine-monster.ts` already own the generic spend/refresh
  semantics for:
  - `USE_LEGENDARY_ACTION`;
  - `USE_RECHARGE_ABILITY`;
  - `USE_DAILY_ABILITY`.
- `battle.qnt`, `packages/core/src/battle-machine.ts`, and
  `packages/core/src/battle-machine-actions-turn.ts` already model a
  `BATTLE_LEGENDARY_ATTACK` follow-up window, but today that event is too raw:
  it carries `monsterId` plus attack-roll/runtime fields, yet it does not carry
  a stat-block legendary-action identity or derive cost/profile from one.
- MCP currently exposes only `BATTLE_LEGENDARY_PASS` on
  `execute_control_command`. There is no public route for named legendary,
  recharge, or daily monster ability use.
- The current monster catalog proves recharge ownership via MON3, but it does
  not yet ship a stat block with legendary actions. Later implementation will
  need one legendary-capable SRD monster tracer bullet to exercise the surface
  end to end.

## Ownership Decision

### Named Monster Ability Choice Lives On `execute_control_command`

Monster-only named ability selection is a control surface, not an ordinary
player action token.

- Use the existing generic MCP tool: `execute_control_command`.
- Do not add monster-named adapter methods such as
  `use_dragon_tail_attack` or `use_fire_breath`.
- Add generic battle-scope commands keyed by actor plus authored ability ID:
  - `USE_LEGENDARY_ACTION`
  - `USE_RECHARGE_ABILITY`
  - `USE_DAILY_ABILITY`
- Public input should identify only:
  - `scope: "battle"`
  - command `type`
  - `monsterId`
  - `abilityId`
- Public input must not supply:
  - legendary cost;
  - recharge threshold;
  - daily-use count;
  - rules text;
  - attack bonus, damage, damage type, reach, or any other authored combat
    profile.

Core and battle derive legality from existing owned data:

- stat-block authored ability identity and cost;
- current resource counts / availability;
- timing window (`acting` for recharge/daily, legendary window for legendary
  actions);
- incapacitated / dead / wrong-turn guards;
- any later generic execution-kind gating.

### `BATTLE_LEGENDARY_ATTACK` Reuses The Generic Attack Boundary

Attack-shaped legendary actions must not invent a second monster attack schema.

- `BATTLE_LEGENDARY_ATTACK` should remain a battle action token resolved through
  the same bounded runtime envelope used by `BATTLE_ATTACK`.
- The only extra identity it needs beyond the settled attack boundary is the
  selected legendary-action ID so battle can derive the authored attack profile
  and spend cost from the stat block.
- It must not accept caller-supplied monster attack authoring such as:
  damage type, damage dice, crit range, reach, finesse, cost, or action name.
- The selected legendary action remains stat-block-owned; the runtime attack
  facts remain the same kind of execution-time facts already accepted for
  `BATTLE_ATTACK`.

Recommended sequence:

1. `execute_control_command` selects the named legendary action by `abilityId`.
2. Battle validates cost/timing from the monster's stat block and opens the
   correct follow-up.
3. If the selected legendary action is an attack-shaped option, the public
   follow-up is `BATTLE_LEGENDARY_ATTACK` on the existing generic attack
   boundary.
4. Non-attack legendary options stay blocked on their own generic facilities
   rather than stretching the attack slice to cover them.

### Discovery Should Stay On Generic MCP Surfaces

The app/MCP should continue to consume generic surfaces:

- `get_state` for current monster resource state and stat-block-derived menus;
- `execute_control_command` for named monster-control choices;
- `get_available_actions` / `execute_action` for ordinary battle action tokens,
  including the later `BATTLE_LEGENDARY_ATTACK` follow-up.

This keeps the public surface generic while still letting monster ability names
come from stat-block-owned data.

## Implementation Shape

### Slice 1: Named Monster-Control Commands

Add the three battle-scope control commands above and validate them against:

- known battle creature ID;
- monster creature kind;
- owned stat-block ability ID;
- enough remaining legendary uses for the selected cost;
- recharge/daily availability;
- current timing window.

### Slice 2: State Projection For Named Options

Expose enough stat-block-derived state for callers to choose a legal option
without inventing parallel metadata:

- named legendary action menu with `id`, `name`, and `cost`;
- named recharge ability menu with `id`, `name`, and current availability;
- named daily ability menu with `id`, `name`, and remaining uses.

This should project existing authored facts, not duplicate them in an
adapter-owned registry.

### Slice 3: `BATTLE_LEGENDARY_ATTACK`

Wire the attack-shaped legendary follow-up so it reuses the settled generic
attack contract plus the selected legendary-action identity. Do not widen it to
cover spell, save-only, movement, or text-only legendary options.

## Follow-Up Constraints

- The first end-to-end implementation slice needs at least one legendary-capable
  SRD monster in the catalog so the route can be exercised through core, battle,
  MCP, and tests.
- Because MON3 already proved stat-block-owned recharge projection, recharge and
  daily ability commands can land on the same generic control surface without
  adding a second ownership model.
- Non-attack legendary actions that need spellcasting, forced movement, or other
  unsupported generic facilities should remain explicit follow-up work. The
  monster-control route should select them by name, but execution should block
  honestly until the generic facility exists.

## Summary

- Named monster ability choice belongs on generic `execute_control_command`
  routes keyed by `monsterId` and stat-block `abilityId`.
- Cost, legality, recharge thresholds, and remaining uses stay core- and
  battle-owned, derived from stat-block data.
- `BATTLE_LEGENDARY_ATTACK` should reuse the existing generic attack boundary,
  not introduce a monster-specific attack payload.
- The next implementation slice should add one legendary-capable monster tracer
  bullet and then wire the control-command plus attack follow-up path.
