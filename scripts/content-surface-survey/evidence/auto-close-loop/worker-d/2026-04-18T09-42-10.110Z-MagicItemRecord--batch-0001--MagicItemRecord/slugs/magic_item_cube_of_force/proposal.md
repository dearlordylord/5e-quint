# Cube of Force

## Verdict

`Cube of Force` does not fit the current magic-item surface honestly. The blocker is not a missing v4 atom; it is a missing authored-shape for one item-level charge pool shared by spell options with different casting-time families.

## Why The Existing Surface Fails

The current successful charge-cast item pattern is:

- one `magic_item` record
- one mechanics component
- one `activationCost`
- one `charge_pool`
- one `resetCadence`
- one or more `grant_spell_access` effects inside that component

That works for items like `Wand of Magic Missiles`, `Staff of Healing`, and `Helm of Teleportation`, where every spell option is cast through the same activation shape.

`Cube of Force` breaks that assumption:

- the item has one shared pool: `The cube starts with 10 charges, and it regains 1d6 expended charges daily at dawn.`
- the item has multiple spell faces with different spell casting-time families
- one of those faces is `Shield`, which is a reaction spell
- the others are not all reaction spells

If I encode the whole item as one `activation` component, `Shield` is false.

If I split it into `activation` and `triggered_reaction` components, each component must currently carry its own `resource` and `resetCadence`, which would duplicate the same 10-charge pool and create an invalid representable state.

## Narrowest Honest Widening

This is a `surface_widening`, not an `atom_widening`.

The atoms already exist:

- `grant_spell_access`
- `charge`
- `action_quota`
- `reaction_quota`

What is missing is the authored subgraph / surface shape for:

- one item-level charge pool and recharge cadence
- multiple spell options
- per-option activation timing or family

Two plausible surface fixes:

1. Add a shared-resource spell-menu subgraph for magic items.
2. Move activation timing/cost from the outer component onto each spell-access option while keeping the pool on the item/component.

## Evidence

From the unit text:

> You can press one of those faces, expend the number of charges required for it, and thereby cast the spell associated with it

and the faces table includes:

- `Mage Armor`
- `Shield`
- `Tiny Hut`
- `Private Sanctum`
- `Resilient Sphere`
- `Wall of Force`

That mix forces multiple spell timing shapes under one shared resource.
