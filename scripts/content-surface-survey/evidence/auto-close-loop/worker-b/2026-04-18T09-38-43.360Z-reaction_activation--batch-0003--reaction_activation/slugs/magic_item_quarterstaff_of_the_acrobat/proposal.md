## Quarterstaff of the Acrobat

Outcome: `atom_widening`

The current surface can encode the held-item +2 attack/damage bonus and the once-per-rest reaction AC boost honestly. It cannot encode the rest of the item without either inventing unsupported atoms or lying about what is being targeted.

### Missing surface / atom pressure

1. `emit_light` or equivalent light-emission effect atom

- Why: the item can be toggled to emit green Dim Light out to 10 feet, or extinguished.
- Evidence: "While holding this weapon, you can cause it to emit green Dim Light out to 10 feet ... or you can extinguish the light as a Bonus Action."
- Classification: `new_atom`
- Notes: this is not DM agenda; it is a deterministic mechanical state change with an explicit radius and toggle action.

2. `Attachment.item` or `Attachment.object` for non-creature item-targeted activations

- Why: `alter_item_kind` already exists as an effect atom, but there is no authored-surface attachment that lets an activation target the held weapon itself.
- Evidence: "While holding this weapon, you can take a Bonus Action to alter its form, turning it into a 6-inch rod ... or a 10-foot pole, or reverting it a Quarterstaff."
- Classification: `new_variant`
- Notes: this is a surface gap, not a new v4 atom. The existing atom cannot be used honestly because current `Attachment` only admits `self`, `target`, `area`, and `mark`.

3. Weapon-profile / thrown-return rider

- Why: the item grants the Thrown property with specific ranges only in quarterstaff form, and after a ranged attack it returns to your hand.
- Evidence: "This weapon has the Thrown property with a normal range of 30 feet and a long range of 120 feet. Immediately after you make a ranged attack with the weapon, it flies back to your hand."
- Classification: `new_atom`
- Notes: this is more than `alter_item_kind`. It changes the weapon's attack profile and adds a deterministic post-attack return behavior. The current surface has no atom for granting weapon properties/ranges or for return-to-hand after use.

### Secondary consequence

`Acrobatic Assist` depends on the missing form-state surface above. The advantage itself fits (`modify_roll_advantage` on `ability_check` with `skillFilter = acrobatics`), but not the restriction to "Quarterstaff and 10-Foot Pole Forms Only" without honest item-form state.
