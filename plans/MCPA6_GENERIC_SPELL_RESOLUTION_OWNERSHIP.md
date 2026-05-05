# MCPA6 — Generic Spell Resolution Ownership

## Purpose

Define the honest public ownership model for generic spell resolution so MCP
does not expose raw `BattleEvent` spell payloads that already bundle battle- and
spell-owned facts.

## Non-Goal

This task does not wire spell actions end to end. It settles ownership so later
implementation can add bounded public battle spell tokens without turning
`record_table_event` into a raw spell-event passthrough.

## RAW Anchors

- `Counterspell` in `.references/srd-5.2.1/Spells/Descriptions-A-D.md`:
  resolves as a Reaction while another creature is casting a spell and can
  cause that spell to dissipate with no effect and no spell-slot spend.
- `Concentration` in `.references/srd-5.2.1/Rules-Glossary.md`:
  ends when another concentration effect starts, when the caster takes damage
  and fails the Constitution save, or when the caster becomes Incapacitated or
  dies.
- `Bless` and `Hold Person` in
  `.references/srd-5.2.1/Spells/Descriptions-A-D.md` and
  `.references/srd-5.2.1/Spells/Descriptions-E-L.md`:
  concentration spell effects and durations are authored by the spell, not by
  caller-supplied MCP payloads.
- `Burning Hands` and `Fireball` in
  `.references/srd-5.2.1/Spells/Descriptions-A-D.md` and
  `.references/srd-5.2.1/Spells/Descriptions-E-L.md`:
  area spells force one save per creature in the area, with damage/effect text
  authored by the spell.
- `Playing-the-Game.md`:
  when one damaging effect forces two or more targets to make saving throws at
  the same time, the damage is rolled once for all targets.
- monster `Legendary Resistance` entries in
  `.references/srd-5.2.1/Monsters/*`:
  a failed saving throw can open a target-owned reaction window that changes the
  outcome to success.

## Existing Code Findings

- `battle.qnt` and the TypeScript battle machine already model generic spells as
  multi-phase transactions rather than one-shot events:
  - `PISpellCast` / `BATTLE_RESOLVE_COUNTERSPELL`
  - `PISaveFailed` and `PISaveFailedAoE`
  - `ADRResolvingAoE` / `BATTLE_RESOLVE_AOE_TARGET`
  - concentration start, break, and propagation in battle-owned state
- The current internal events are not safe public contracts:
  - `BATTLE_CAST_SAVE_SPELL` asks the caller for spell-authored facts like save
    DC, damage, condition, save ability, and half-on-success behavior.
  - `BATTLE_CAST_CONCENTRATION_SPELL` asks the caller for spell-authored facts
    like duration and on-fail condition.
  - `BATTLE_CAST_AOE` asks the caller for spell-authored AoE effect data and
    then enters a battle-owned per-target loop.
- The repo already has the right lower-layer ownership seed:
  `features/spell-available-actions.ts` derives modeled spell metadata and
  battle-ready payloads from the SRD spell registry. That should remain the
  single source of truth for generic spell-authored payloads.
- `record_table_event` is intentionally for DM/table/world facts. Spell casting
  by an acting creature is not a table/world fact; it is a battle action with
  action-economy spend, component checks, counterspell timing, and follow-up
  resolution.

## Ownership Decision

Generic spell casting should surface as battle-scoped action tokens in
`get_available_actions`, not as raw `record_table_event` spell commands.

### Public Boundary

- Public MCP/app input should identify:
  - the acting creature;
  - the modeled spell;
  - the chosen slot level;
  - spell-specific targeting choices that are not already battle-owned.
- Public MCP/app input should not supply:
  - spell-authored save DC, duration, damage, condition, or half-on-success
    semantics;
  - counterspell eligibility;
  - save-failed reaction eligibility;
  - concentration propagation behavior;
  - per-target AoE continuation state.

### Core-Owned Spell Payload

- `features/spell-available-actions.ts` or its successor owns the spell-authored
  payload:
  - base spell level;
  - casting-time class (`action`, `bonus action`, `reaction` where supported);
  - component requirements;
  - concentration flag and duration;
  - save ability;
  - damage/effect payload;
  - upcast behavior.
- Future spell-action tokens should reuse that projection path instead of
  accepting parallel MCP-owned payload shapes.

### Battle-Owned Resolution

- Battle owns the full spell transaction once the cast begins:
  - action / bonus action / reaction spend;
  - slot spend or refund;
  - component legality;
  - `Counterspell` offer window;
  - save-failed reaction windows such as `Legendary Resistance`;
  - concentration lock start, break, and effect cleanup;
  - AoE iteration state and return-to-active-turn sequencing.
- Public runtime should supply only the facts that are genuinely external to the
  engine at execution time, such as rolled saves or externally computed area
  membership when geometry is not core-owned.

## Window Ownership

### Counterspell

- Owner: battle reaction window only.
- Public surface: the existing reaction token (`CAST_COUNTERSPELL`) remains the
  model. Generic spell-cast tokens must open that same window rather than
  embedding counterspell choices into the cast command.
- Caller-supplied spell payload must never decide whether Counterspell is legal
  or what gets refunded.

### Save-Failed Reactions

- Owner: battle after the save outcome is known.
- Public surface: the existing failed-save reaction token pattern remains the
  model. Save-spell and AoE spell tokens may produce that window; they do not
  inline `Legendary Resistance` or similar reactions into the original cast
  payload.

### Concentration

- Owner: battle state.
- Public surface:
  - casting a concentration spell is a battle spell-action token;
  - voluntarily ending concentration can remain a narrow semantic table event
    (`BREAK_CONCENTRATION`) because it records an external table fact;
  - damage-driven concentration checks remain part of damage resolution, not a
    separate generic spell MCP command.

### AoE Per-Target Loop

- Owner: battle state.
- Public surface: one cast token starts the spell; MCP must not send a second
  spell-cast command for each target in the area.
- If geometry remains external, the boundary should accept event-scoped included
  target facts after the table applies AoE origin, shape, Total Cover, and any
  ongoing-area trigger rules, or one runtime bundle of target save results keyed
  to a battle-owned target set. It should not move loop ownership into MCP.

## Recommended Follow-Up Slice Shape

- Slice 1: add a battle-scoped save-spell token family backed by spell-registry
  payloads, reusing the existing counterspell and save-failed windows.
- Slice 2: add a concentration-spell token family backed by the same spell
  payload owner, keeping concentration state wholly battle-owned.
- Slice 3: add an AoE spell token family that accepts only bounded event-scoped
  included-target/runtime-save inputs while battle owns the per-target loop.

These should stay separate tasks because AoE targeting ownership and generic
concentration follow-through widen the blast radius beyond single-target save
spells.

## Summary

- Generic spell casts are battle actions, not table events.
- Spell-authored payloads belong to the spell registry / battle payload builder,
  not MCP callers.
- Counterspell, save-failed reactions, concentration, and AoE iteration are all
  battle-owned resolution windows.
- External runtime should provide only genuinely external execution facts, not
  a second spell rules model.
