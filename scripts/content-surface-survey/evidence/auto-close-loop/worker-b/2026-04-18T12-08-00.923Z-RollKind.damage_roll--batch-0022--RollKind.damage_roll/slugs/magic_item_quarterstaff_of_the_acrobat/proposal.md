Quarterstaff of the Acrobat does not fit the current authored surface honestly, so no `content/magic_item_quarterstaff_of_the_acrobat.dhall` was authored.

Why it fails:

1. `atom_widening`: light emission / extinguish is missing.
Evidence: "you can cause it to emit green Dim Light out to 10 feet ... or you can extinguish the light"

The current surface has no effect atom for an item or creature emitting light. Existing precedent in this workspace already treats `emit_light` / `grant_light_emission` as missing atom pressure.

2. `surface_widening`: item-form state cannot gate mechanics.
Evidence:
- "you can take a Bonus Action to alter its form, turning it into a 6-inch rod ... or a 10-foot pole, or reverting it a Quarterstaff"
- "Acrobatic Assist (Quarterstaff and 10-Foot Pole Forms Only)"
- "Attack Deflection (Quarterstaff Form Only)"
- "Ranged Weapon (Quarterstaff Form Only)"

Although `alter_item_kind` exists as an effect atom, the current authored surface has no honest way to:
- target the item itself from this activation family;
- persist the chosen form as item state;
- gate passive or reaction parts on that current form.

Without that state, encoding Acrobatic Assist or Attack Deflection would overstate them as always-on while holding the item, which is false.

3. Additional unresolved pressure: quarterstaff-form ranged/return rider.
Evidence: "This weapon has the Thrown property with a normal range of 30 feet and a long range of 120 feet. Immediately after you make a ranged attack with the weapon, it flies back to your hand."

The current surface also lacks an honest way to grant a weapon's Thrown profile / attack range as a form-dependent passive, and the return-to-hand rider is not modeled.

What does fit in isolation:

- passive `modify_roll_numeric` +2 attack rolls with the specific item;
- passive `modify_damage_numeric` +2 damage rolls with the specific item;
- a once-per-short-or-long-rest triggered-reaction `modify_ac` +5 against the triggering attack.

Those pieces are still not enough for an honest whole-item encoding because the missing form-state and light-emission mechanics are central to the item's real behavior.
