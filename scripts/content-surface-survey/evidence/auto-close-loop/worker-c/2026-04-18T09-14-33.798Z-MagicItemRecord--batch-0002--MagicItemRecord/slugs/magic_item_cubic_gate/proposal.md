Cubic Gate fits the existing `magic_item` record kind and the activated magic-item family at a high level:

- `charge_pool` with cap 3
- `dawn` recharge with `1d3`
- `standard_action` / `magic`
- direct `grant_spell_access` effects for `gate` and `plane_shift`

The blocker is the keyed-side destination binding.

RAW does not grant unrestricted casts of those spells. Each activation is constrained by the cube face pressed:

- "The six sides of the cube are each keyed to a different plane of existence"
- "Gate. Pressing one side of the cube, you cast Gate, opening a portal to the plane of existence keyed to that side."
- "Plane Shift. Pressing one side of the cube twice, you cast Plane Shift, transporting the targets to the plane of existence keyed to that side."

The current `grant_spell_access` surface can override:

- save DC
- area
- target restriction

It cannot override or constrain a granted spell's destination parameter.

That makes `Cubic Gate` a `surface_widening`, not a structural problem:

- the top-level family already exists;
- the relevant v4 atom already exists (`grant_spell_access`);
- the missing piece is a new surface variant on granted-spell overrides.

Suggested widening:

- Add a granted-spell destination override / restriction field on `grant_spell_access`, analogous to `dcOverride`, `areaOverride`, and `targetRestriction`.
- The minimal honest shape for this unit is a keyed planar destination constraint, such as "destination is the plane keyed to the chosen item face".

Without that field, encoding the item as plain `grant_spell_access` would falsely imply the wielder can cast unrestricted `Gate` and `Plane Shift` rather than the cube's keyed-plane versions.
