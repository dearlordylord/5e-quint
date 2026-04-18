`Cubic Gate` fits the existing `magic_item` + `activation` + `charge_pool` family structurally, but it does not fit the current `grant_spell_access` surface honestly.

The missing shape is a way to constrain an item-granted spell's destination to an item-local keyed plane selected at use time.

Why this is required:

- The item does not merely grant generic `Gate` or generic `Plane Shift`.
- Each activation is parameterized by the pressed cube face.
- That face determines the destination plane for the cast.
- The existing `grant_spell_access` shape can override DC, area, and target restriction, but it cannot override or bind a spell's destination parameter.

Evidence from the unit text:

- "The six sides of the cube are each keyed to a different plane of existence, one of which is the Material Plane."
- "`Gate.` Pressing one side of the cube, you cast Gate, opening a portal to the plane of existence keyed to that side."
- "`Plane Shift.` Pressing one side of the cube twice, you cast Plane Shift, transporting the targets to the plane of existence keyed to that side."

Proposed widening:

- Add a new `grant_spell_access` variant field for a spell-parameter override, specifically a destination override.
- Minimal pressure-case shape: a destination source like `item_keyed_plane`, resolved from the chosen cube face at activation time.

Why this is `surface_widening`, not `structural_widening`:

- The top-level record kind already exists: `magic_item`.
- The mechanics family already exists: activated magic item with `charge_pool` and `dawn` recharge.
- The missing piece is a new variant within an existing surface type, not a new family.

Why no partial authoring was produced:

- Encoding this as plain `grant_spell_access` for `gate` and `plane_shift` would overstate the item's effect by implying unrestricted destination choice.
- That would produce a misleading trace, which the protocol forbids.
