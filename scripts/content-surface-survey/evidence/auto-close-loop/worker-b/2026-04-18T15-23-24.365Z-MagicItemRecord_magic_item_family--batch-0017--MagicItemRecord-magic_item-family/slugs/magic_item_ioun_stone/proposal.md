## Verdict

`Ioun Stone` is a `structural_widening`.

I did not author `content/magic_item_ioun_stone.dhall` because the current surface cannot represent the collection honestly. Some variants fit existing passive or triggered-reaction mechanics, but the unit as published includes shared collection-level behavior and at least one variant whose core workflow is missing.

## What Fits Today

These variants mostly fit existing atoms if considered in isolation:

- `Agility`, `Fortitude`, `Insight`, `Intellect`, `Leadership`, `Strength`: `modify_ability_score`
- `Awareness`: `modify_roll_advantage` on `initiative` and `ability_check` with `skillFilter = perception`
- `Mastery`: `modify_proficiency_bonus`
- `Protection`: `modify_ac`
- `Regeneration`: passive `operations` with hourly cadence and HP-threshold predicate
- `Absorption`, `Greater Absorption`: close to `triggered_reaction` with `creature_casts_spell` + `negate_triggering_spell`

## Blocking Gaps

### 1. Shared orbiting wrapper is more than `wearing_item`

The collection text defines a shared lifecycle/state machine for every variant:

- Magic action to start orbiting
- up to three stones can orbit at once
- Utilize action to seize and stow orbiting stones
- attunement ending while orbiting makes the stone fall

Current `MagicItemRecord` variants can hold independent mechanics, but there is no honest way to attach this shared orbiting-state wrapper once at the collection boundary. Encoding each variant as a plain passive `wearing_item` item would erase the activation/stow/fall behavior and the three-stone limit.

Needed widening:

- `new_subgraph`: `orbiting_ioun_state`

### 2. `Reserve` needs a stored-spell reservoir workflow

`Reserve` is the hardest blocker. It requires:

- arbitrary spells of levels 1-4 being cast into the stone by any creature
- the incoming spell having no effect except storage
- capacity tracked by total stored spell levels up to 4
- later casting of any stored spell by the wearer
- replay using the original caster's slot level, spell save DC, spell attack bonus, and spellcasting ability
- removal of the spell from storage after use

This is not a fixed `grant_spell_access` list and not a simple charge pool. It needs a new stored-payload family or subgraph.

Needed widening:

- `new_subgraph`: `stored_spell_reservoir`

Evidence:

> This vibrant purple prism stores spells cast into it, holding them until you use them.

## Secondary Gaps

### Absorption / Greater Absorption need trigger-derived pool spend

The cancel reaction mostly fits the current triggered-reaction surface, but the lifetime burn-out condition is keyed to total canceled spell levels, not number of uses.

Needed widening:

- `new_variant`: `trigger_level_resource_spend`

Evidence:

> Once the stone has canceled 20 levels of spells, it burns out, turns dull gray, and loses its magic.

### Sustenance needs a new atom

There is no current atom for removing food/drink needs.

Needed widening:

- `new_atom`: `suppress_basic_needs`

Evidence:

> You don't need to eat or drink while this clear spindle orbits your head.

## Why I Stopped

The protocol says to stop before authoring placeholder JSON when no honest family fit exists. `Reserve` alone forces that stop, and the shared orbiting wrapper means even the otherwise-simple variants would be incomplete if encoded as ordinary passive items.
