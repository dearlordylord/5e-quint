# Robe of Stars

Outcome: `surface_widening`

## Why it does not fit cleanly

`Robe of Stars` fits the existing top-level `magic_item` kind and would naturally use `MagicItemMechanics.family = "composite"`:

- a passive save-bonus part;
- a charge-pool spellcasting part for the six stars / `Magic Missile`;
- an activation part for Astral travel.

The blockers are narrower surface gaps, not a missing top-level family.

## Required widenings

### 1. Daily recharge keyed to `dusk`

The star pool does not recharge at dawn; it recharges at dusk.

Current surface:

- `RestResetCadence.dawn`
- `RestResetCadence.elapsed_days`
- `RestResetCadence.elapsed_hours`

Needed:

- a daily fixed-time recharge variant that can name `dusk` honestly, instead of collapsing it to `dawn`.

Evidence:

> Daily at dusk, 1d6 removed stars reappear on the robe.

### 2. `transport_exile` needs return semantics

The current surface has `EffectAtom.transport_exile`, but its own comments already note that return behavior is not modeled. `Robe of Stars` needs that omitted half as part of the item's core deterministic behavior.

Needed:

- a return-capable exile shape, or
- a companion lifecycle / procedure subgraph that records:
  - entry into the Astral Plane;
  - persistence there;
  - later Magic action to return;
  - return to the prior plane at the last occupied space, or nearest unoccupied space if blocked.

Evidence:

> You remain there until you take a Magic action to return to the plane you were on.

> You reappear in the last space you occupied or, if that space is occupied, the nearest unoccupied space.

## Why I did not author `content/magic_item_robe_of_stars.dhall`

I could have forced a misleading partial encoding:

- `dawn` instead of `dusk`;
- one-way `transport_exile` with no return behavior.

That would produce a valid trace, but it would be materially false to the source text. Per the task guardrails, I stopped and reported the surface gaps instead.
