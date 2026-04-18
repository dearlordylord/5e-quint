`Cubic Gate` fits the existing `magic_item` record kind and `activation` mechanics family at the top level:

- `activationCost`: `action` is the existing best match for "As a Magic action".
- `resource`: `charge_pool` with cap 3.
- `resetCadence`: `dawn` with regain `1d3`.
- The item's two outputs are still the existing `grant_spell_access` atom family: cast `gate` or cast `plane_shift`.

The blocking gap is narrower: the current `grant_spell_access` surface can only name the granted spell, its resource mode, optional DC override, and a limited target restriction. It cannot constrain or override a spell's cast-time parameters.

`Cubic Gate` needs exactly that:

- Press one side once: cast `Gate` to the plane keyed to that side.
- Press one side twice: cast `Plane Shift`, transporting targets to the plane keyed to that side.

If authored today as plain unrestricted `grant_spell_access` to `gate` and `plane_shift`, the trace would lie about the item's mechanics by implying normal spell choice over destination planes rather than the cube's keyed-side restriction.

Recommended widening:

- Add a new variant or field on `grant_spell_access` for spell-parameter overrides/restrictions supplied by the granting item.
- Minimum pressure case for this item: a closed override saying the destination plane is "the plane keyed to the chosen item side".

Why this is `surface_widening`, not `atom_widening`:

- No new v4 atom is forced. The relevant atom remains `grant_spell_access`.
- The missing concept is a new authored-surface variant for parameterizing an existing granted spell, not a new top-level family or a new taxonomy atom.
