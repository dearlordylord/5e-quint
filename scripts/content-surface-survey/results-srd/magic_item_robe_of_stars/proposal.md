`Robe of Stars` does not fit the current surface honestly.

Primary blocker: structural

The item combines:

- a passive worn benefit: `+1` to saving throws while worn;
- an activated star-charge cast: expend 1 of 6 stars to cast level 5 `Magic Missile`;
- a separate activated plane-travel ability: enter the Astral Plane, then later spend another Magic action to return.

`MagicItemMechanics` currently allows exactly one family:

- `PassiveMechanics`, or
- `ActivatedAbilityMechanics`

That means the authored surface cannot represent a single magic item that has both always-on grants and one or more activated abilities. Encoding only one slice would be dishonest.

Secondary gaps

1. `RestResetCadence` is missing a non-dawn daily recharge variant.

The robe says: "Daily at dusk, 1d6 removed stars reappear on the robe."

Current surface only has:

- rest-based resets,
- `dawn`,
- `never`.

So even if mixed passive+activation were representable, the recharge timing would still need a surface widening.

2. The Astral Plane transit/return loop is missing from the current effect surface.

The robe says:

- "you can take a Magic action to enter the Astral Plane..."
- "You remain there until you take a Magic action to return to the plane you were on."
- "You reappear in the last space you occupied or, if that space is occupied, the nearest unoccupied space."

The current surface has `teleport` for same-plane repositioning, but no authored effect for cross-plane exile/return with remembered origin space. The taxonomy mentions `transport_exile`, but `src/surface/types.ts` does not expose it, and the tracer does not handle it.

Recommended widenings

- Structural: allow a magic item to carry a bundle of mechanics streams, at minimum `passive` plus one or more `activation` entries.
- Surface: add a daily recharge cadence variant for `dusk`.
- Atom/surface: add a cross-plane transport/return effect or subgraph that preserves the previous plane/location and supports return-to-last-space-or-nearest-unoccupied-space semantics.
