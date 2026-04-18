## Quarterstaff of the Acrobat

Outcome: `atom_widening`

I did not author `content/magic_item_quarterstaff_of_the_acrobat.dhall` because the current surface cannot encode this item honestly without collapsing its form state and weapon-profile changes into misleading passive grants.

What fits today:

- `magic_item` as the top-level kind
- composite mechanics in principle:
  - passive `+2` attack/damage with a specific held weapon
  - triggered reaction `+5 AC vs the triggering attack`, 1/short-or-long-rest
  - passive advantage on Dexterity (Acrobatics) checks

Why it still does not fit honestly:

- The item has runtime form state: rod, quarterstaff, and 10-foot pole.
- Multiple riders are conditional on the current form.
- The current surface has `alter_item_kind` as an effect atom, but activation phases cannot attach to an item/object target, only `self` / `target` / `area` / `mark`.
- `EquipmentPredicate` can say `holding_item`, but it cannot say "while this item is in quarterstaff form" or "while this item is in quarterstaff or 10-foot-pole form".
- The quarterstaff form also mutates the weapon profile by granting the Thrown property and 30/120 range, then returns to hand after the ranged attack. That is not expressible with existing atoms.

Required widenings:

1. Surface variant: item/object attachment for non-spell activations

- Needed so the bonus-action form change can target the weapon itself.
- Existing pressure point: `alter_item_kind` already assumes an item/object target.

2. Surface variant: item-form predicate

- Needed so passive and reaction parts can be gated by the current form of the same magic item.
- Example shapes:
  - `EquipmentPredicate { kind = "holding_item_in_form", forms = [...] }`
  - or a more general item-state predicate reused by future transformable items.

3. New atom: weapon-profile mutation

- Needed for "This weapon has the Thrown property with a normal range of 30 feet and a long range of 120 feet."
- This is not just narrative item-kind flavor; it changes legal attacks and range math.

4. New atom: returning-thrown-weapon rider

- Needed for "Immediately after you make a ranged attack with the weapon, it flies back to your hand."
- No current effect atom or lifecycle hook models an item returning to its bearer after an attack.

Secondary omission if the above were solved later:

- Light emission ("emit green Dim Light out to 10 feet") still lacks a dedicated surface shape. That may be caller-owned depending on how environmental light is scoped, but it is at least an additional unresolved mechanic today.

Evidence from unit text:

- "you can take a Bonus Action to alter its form, turning it into a 6-inch rod ... or a 10-foot pole, or reverting it a Quarterstaff"
- "Acrobatic Assist (Quarterstaff and 10-Foot Pole Forms Only)"
- "Attack Deflection (Quarterstaff Form Only)"
- "This weapon has the Thrown property with a normal range of 30 feet and a long range of 120 feet. Immediately after you make a ranged attack with the weapon, it flies back to your hand."
