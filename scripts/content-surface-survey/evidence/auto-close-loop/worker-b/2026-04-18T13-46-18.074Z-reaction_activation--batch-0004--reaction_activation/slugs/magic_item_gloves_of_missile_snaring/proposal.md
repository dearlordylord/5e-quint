## Gloves of Missile Snaring

Outcome: `surface_widening`

### Why it does not fit cleanly

The unit's primary mechanic is a magic-item `triggered_reaction`, but the current non-spell triggered-reaction surface requires:

- `resource: ActivationResource`
- `resetCadence: RestResetCadence`

`Gloves of Missile Snaring` has no limited-use pool and no recharge cadence. It is an at-will reaction gated only by the trigger and equipment state. Encoding a fake use-count or recharge would be dishonest.

### Required widenings

1. Add an at-will / unlimited-use variant for non-spell activated and triggered-reaction abilities.

Evidence:

> "If you're hit by an attack roll made with a Ranged or Thrown weapon while wearing these gloves, you can take a Reaction to reduce the damage ..."

Why:

- The reaction consumes only the normal reaction quota.
- There is no SRD text giving uses, charges, or a reset window.

2. Add an equipment/hand-state predicate for `free hand`.

Evidence:

> "... if you have a free hand."

Why:

- `EquipmentPredicate` currently covers `wearing_item`, `holding_item`, armor state, and weapon-wielding state, but not empty-hand / free-hand gating.
- The free-hand clause is part of the activation permission, not flavor.

### Secondary omitted rider

The catch rider is not encoded here:

> "If you reduce the damage to 0, you can catch the ammunition or weapon if it is small enough for you to hold in that hand."

This looks like a further surface gap around deterministic item capture / ownership transfer on a successful defensive reaction. I am not promoting the overall outcome to `atom_widening` because the main reason the unit cannot be authored honestly is the existing triggered-reaction surface's lack of at-will support, and the catch rider is secondary.
