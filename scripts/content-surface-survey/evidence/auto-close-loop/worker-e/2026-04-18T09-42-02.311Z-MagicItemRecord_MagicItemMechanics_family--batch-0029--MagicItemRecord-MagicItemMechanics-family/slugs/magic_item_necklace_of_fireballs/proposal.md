## Surface widening: activation range for non-spell units

`Necklace of Fireballs` mostly fits the existing `magic_item` + `activation` surface:

- `wearing_item` gate
- `standard_action` with `action = "magic"`
- `charge_pool` with `initialCount = 1d6 + 3`
- `resetCadence = never`
- `save_gate` with fixed DC 15
- `damage.amount = resource_spent_linear` to model `8d6` plus `+1d6` per extra bead, capped at `12d6`

The blocker is **range**.

The item says:

> "You can take a Magic action to detach a bead and throw it up to 60 feet away."

`ActivatedAbilityMechanics` does not carry a `range` field, so the only honest attachment shape available for the explosion is:

- `attachment.kind = "area"`
- `origin.kind = "point_within_range"`

But in the current tracer, non-spell activations are hard-wired to `Range.self`, so the attempted trace rendered the explosion as:

- `area ... origin: point within Self`

That is a false trace. The item's deterministic mechanical payload is a ranged thrown detonation, not a self-centered point picker.

## Proposed widening

- Add a `range: Range` field to `ActivatedAbilityMechanics` (or its shared header) so non-spell activations can author `point_within_range` honestly.

Why this is a surface widening, not an atom widening:

- All needed atoms already exist in v4 and in `types.ts`: `activate`, `area`, `save_gate`, `damage`, `scale_die_count`, `charge`, `action_quota`.
- The missing piece is a **new variant/field on an existing surface family**, not a new atom.

This widening would let the necklace author as:

- non-spell activation range: `{ kind = "point", feet = 60 }`
- area origin: `{ kind = "point_within_range" }`

without changing the atom inventory.
