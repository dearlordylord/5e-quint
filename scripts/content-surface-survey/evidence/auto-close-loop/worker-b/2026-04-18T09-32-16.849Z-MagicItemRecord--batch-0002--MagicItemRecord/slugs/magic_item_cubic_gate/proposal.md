`Cubic Gate` is a real `magic_item` with an existing top-level family fit:

- `MagicItemRecord`
- `mechanics.family = "activation"`
- `activationCost = { kind = "standard_action", action = "magic" }`
- `resource = charge_pool`
- `resetCadence = dawn` with partial `1d3` recharge

The blocker is narrower than a new family. The existing surface can encode "this item lets you cast Gate / Plane Shift from charges", but it cannot encode the spell parameter that the item fixes:

- each cube face is keyed to a specific plane
- pressing a face chooses that keyed plane
- the granted cast must use that keyed plane as the destination

That is not representable with current `grant_spell_access`, which only supports:

- `spellId`
- `mode`
- optional `dcOverride`
- optional `areaOverride`
- optional `targetRestriction`

What is missing is a spell-parameter override / destination override surface for item-granted casts.

Suggested widening:

- Add a new variant or field on `grant_spell_access` for spell-specific destination overrides, with a keyed-choice source.
- Minimum pressure shape for this unit:
  - "cast Gate to the plane keyed to the chosen face"
  - "cast Plane Shift to the plane keyed to the chosen face"

Why this is `surface_widening`, not `structural_widening`:

- The unit already fits `magic_item` and `activation`.
- The atoms involved already exist conceptually (`grant_spell_access`, charge resource, dawn recharge).
- The missing piece is a variant of the existing authored surface for passing a constrained spell parameter through the item.

Why this is not `dm_agenda`:

- The GM determines which planes the non-Material faces are keyed to, but the item's core mechanic is still deterministic once those keyed planes exist.
- The authored surface still needs a way to say "destination = chosen keyed plane"; omitting that would be a false trace.
