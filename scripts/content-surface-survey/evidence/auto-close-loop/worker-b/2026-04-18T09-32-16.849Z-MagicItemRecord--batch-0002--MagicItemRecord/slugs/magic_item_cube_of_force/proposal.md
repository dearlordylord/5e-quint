# Cube of Force

## Verdict

`Cube of Force` forces a `structural_widening`.

The existing magic-item surface can already encode:

- a passive item that grants spell access with no tracked shared pool;
- an activated item with a charge pool and one item-wide activation cost;
- a triggered-reaction item with its own resource and reset cadence;
- a composite item made from those parts.

What it cannot encode honestly is **one shared charge pool that supports both ordinary casts and a reaction spell**.

## Why The Existing Families Fail

The item text says:

> "You can press one of those faces, expend the number of charges required for it, and thereby cast the spell associated with it (save DC 17), as shown in the Cube of Force Faces table."

The table includes:

- `Mage Armor`
- `Shield`
- `Tiny Hut`
- `Private Sanctum`
- `Resilient Sphere`
- `Wall of Force`

That means one shared 10-charge pool grants access to spells with different casting-time shapes, including `Shield`, which is reaction-shaped.

### False encoding if forced into current `activation`

If encoded as a single `magic_item` `activation` family:

- the item would need one `activationCost` for the whole family;
- any honest choice of `action`, `bonus_action`, or `free` would misrepresent `Shield`;
- a trace would wrongly show `Shield` as part of an action-shaped item activation.

### False encoding if split into current `composite`

If encoded as a `composite` with:

- one `activation` part for the non-reaction spells, and
- one `triggered_reaction` part for `Shield`,

then both parts would need their own `resource` and `resetCadence` fields. That would duplicate the same 10-charge pool and 1d6-at-dawn recharge across parts, which is mechanically false.

## Narrowest Honest Widening

Add a new mechanics shape or shared-resource subgraph for:

- one item-owned `charge_pool`;
- one shared `resetCadence`;
- multiple granted spells with their own native casting-time behavior;
- optional fixed `dcOverride` per granted spell or per pool.

Conceptually this is a **shared charge-backed spell-access pool** rather than a single action activation or a second independent reaction item.

## Why This Is Structural, Not Atom

No new effect atom is forced here. The pressure is at the **family/subgraph level**:

- `grant_spell_access`
- `charge`
- `reaction_window`
- existing spell mechanics

all already exist.

The missing piece is the ability to bind them together under one shared item resource without forcing one fake activation cost or duplicating the pool across composite parts.
