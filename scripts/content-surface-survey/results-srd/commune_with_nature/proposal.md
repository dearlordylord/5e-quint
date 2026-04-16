# Commune with Nature — Survey Proposal

## Outcome: `dm_agenda`

## Spell summary

- Level 5 Divination (Ritual)
- Casting time: 1 minute (optionally Ritual)
- Range: Self
- Components: V, S
- Duration: 1 minute (no concentration)
- Effect: Choose 3 categories from a closed list; learn those facts about the surrounding area (3 miles outdoors, 300 ft underground). Fails in constructed areas.

## Why dm_agenda

The entirety of Commune with Nature's mechanic is information revelation:

1. The caster selects 3 categories from the spell's closed list (settlements, portals, powerful creatures, prevalent plants/minerals/beasts, water bodies).
2. The DM conveys those facts as they pertain to the area.

There is no:
- attack roll or saving throw
- damage, heal, or condition applied
- ongoing modifier to any roll
- deterministic state change that the combat engine tracks

The 1-minute timed duration is the ritual window, not a meaningful lifecycle state for the engine. When the cast completes, the spell is over — its "effect" was the conversation between player and DM.

This is the same category as **Augury** (DM gives omen), **Commune** (DM/deity answers yes/no questions), **Legend Lore** (DM narrates lore), and **Contact Other Plane** (DM plays the entity). All of these exist to move information from DM to player, which is narrative/agenda territory per `ARCHITECTURE.md`.

## Why no structural_widening is proposed

A structural widening would be needed if we wanted to model this unit but the family was missing. The question here is whether the unit's core mechanic is in-scope for the core mechanics surface at all. It is not: the revelation content — which creature is nearby, where the settlement is, what the prevalent mineral is — is entirely DM-decided at runtime, not deterministically resolvable by the engine. No matter what new family or atom we add, the engine cannot produce the revelation; only the DM can.

Specifically:
- A `query` or `reveal_information` family would still bottom out in a DM-provided string, not a typed mechanical outcome.
- The "choose 3 from a list" UI selection is a player-facing table interaction, not a combat-mechanics atom.

## What would change this verdict

If a future revision of ARCHITECTURE.md brought "divination query results" into the core mechanics model (e.g., as a typed enumeration of world-state flags the engine tracks), then Commune with Nature could be revisited. In that world, a new spell family such as `information_query` with a `closed_choice_set` effect might make sense. Until then, this unit is legitimately out-of-scope.
