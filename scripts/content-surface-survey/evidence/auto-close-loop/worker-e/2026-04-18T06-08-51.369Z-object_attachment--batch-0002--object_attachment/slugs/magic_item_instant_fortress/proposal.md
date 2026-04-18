# Instant Fortress

## Verdict

`Instant Fortress` does not fit the current authored surface honestly, so no `content/magic_item_instant_fortress.dhall` was written.

Outcome: `atom_widening`

## Why It Fails

The item is not just a passive grant and not a spell-access wrapper. Its core mechanic is:

- an item activation with no charge pool, no use count, and no reset cadence;
- deployment of a persistent tower-sized world object from the item;
- forced displacement of creatures and unattended objects from the occupied area;
- reversible return to item form gated on the tower being empty;
- damage persistence across forms.

The current surface cannot express that combination honestly.

## Missing Surface / Atom Pressure

### 1. Unlimited reusable item activation

`ActivatedAbilityMechanics` requires:

- `resource`
- `resetCadence`

That works for charges and per-rest uses, but not for an item that can be activated freely every time its state allows it.

Pressure text:

> As a Magic action, you can place this 1-inch adamantine statuette on the ground and, using a command word, cause it to grow rapidly into a square adamantine tower.

and

> Repeating the command word causes the tower to revert to statuette form, which works only if the tower is empty.

This needs either:

- an at-will / no-resource activation variant, or
- optional `resource` / `resetCadence` on activated item mechanics.

That part is a `surface_widening`.

### 2. Deployed structure creation

The v4 taxonomy includes `create_object`, but `src/surface/types.ts` does not surface it in `EffectAtom`, and the tracer does not handle it.

Pressure text:

> ...cause it to grow rapidly into a square adamantine tower.

`alter_item_kind` is not enough here. This is not merely a cosmetic or local kind swap; the item becomes a large persistent structure with area occupancy and structural state.

That part is an `atom_widening`.

### 3. Deploy / occupy / push / revert subgraph

The deployment is coupled to area-resolution behavior and later reversal:

> Each creature in the area where the tower appears is pushed to an unoccupied space outside but next to the tower. Objects in the area that aren't being worn or carried are also pushed clear of the tower.

and

> Repeating the command word causes the tower to revert to statuette form, which works only if the tower is empty.

and

> Shrinking the tower back down to statuette form doesn't repair damage to the tower.

This is not well represented by any current single atom or existing activation subgraph. It wants an explicit deployed-object lifecycle:

- create/deploy structure
- occupy area
- displace creatures / unattended objects
- gate reversion on emptiness
- preserve structure HP across form changes

## Not Modeled Here

These details are also outside the current honest fit, though they are secondary once deployment already fails:

- command-only door opening as a Bonus Action;
- structure-part stat lines (roof / door / walls with AC, HP, immunities, resistances);
- immunity to `Knock` and similar magic;
- repair only via `Wish`.

## Recommended Direction

Minimum honest widening for this unit:

1. Add an at-will activation path for magic items.
2. Surface a `create_object` effect atom and tracer support.
3. Add a deployed-structure lifecycle / subgraph that can:
   - occupy an area,
   - displace occupants,
   - revert back to item form under conditions,
   - retain structural damage across forms.
