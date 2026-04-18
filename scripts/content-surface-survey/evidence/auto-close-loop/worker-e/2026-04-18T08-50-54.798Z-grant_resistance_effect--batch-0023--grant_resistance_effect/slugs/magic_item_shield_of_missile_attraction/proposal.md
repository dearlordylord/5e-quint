## Shield of Missile Attraction

The item fits the existing `magic_item` + passive family for its held-shield resistance:

- `condition = holding_item`
- `grant_resistance` with `sourceFilter = { kind = "attack", weaponFilter = { kind = "weapon_category", category = "ranged" } }`

The curse does not fit the current surface honestly.

Missing shape:

- `atom_widening`
- Proposed atom: `retarget_incoming_attack`

Why it is forced:

- The curse is not damage prevention, resistance, or a targeting block.
- It changes the defender of an already-targeted ranged-weapon attack.
- The current surface has no effect atom, ongoing operation, or triggered-reaction path that can say "this attack now targets a different creature."

Evidence:

> Whenever an attack with a Ranged weapon targets a creature within 10 feet of you, the curse causes you to become the target instead.

Notes:

- The authored subset captures only the passive resistance.
- The curse is deterministic core mechanics, not DM agenda, so the gap is a real atom widening rather than a caller-owned omission.
