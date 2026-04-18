## Ammunition, +1, +2, or +3

Encoded payload:

- `magic_item` variant collection
- variant mechanics family: `passive`
- traced bonus atoms:
  - `modify_roll_numeric` on `attack_roll`
  - `modify_damage_numeric`
- bonus magnitude sourced from `DiceDelta.kind = "magic_item_rarity_bonus"`

What does not fit cleanly:

- The current surface has no honest lifecycle/destruction shape for ammunition that stops being magical after a successful hit but does not get destroyed and does not become unusable.

Why this is a `surface_widening`, not an `atom_widening`:

- The top-level kind and mechanics family already fit.
- The bonus math already fits existing atoms and traced cleanly.
- The missing piece is a new variant on an existing surface concept: item lifecycle / destruction / depletion semantics.

Suggested widening:

- Add a new item-lifecycle/destruction variant for "becomes nonmagical after hit" or a more general "loses_magic_on_event" shape.
- Minimal pressure-case shape:
  - event: `hit_target`
  - outcome: `becomes_nonmagical`

RAW evidence:

> "Once it hits a target, the ammunition is no longer magical."

Non-gap text intentionally omitted:

- "typically found or sold in quantities of ten or twenty pieces"
- "Ten pieces ... are equivalent in value to a potion of the same rarity"

Those lines are catalog / economy metadata, not deterministic combat-surface mechanics.
