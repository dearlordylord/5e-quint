# Quarterstaff of the Acrobat

## Verdict

`atom_widening`

I did not author `content/magic_item_quarterstaff_of_the_acrobat.dhall` because any current JSON would be misleading.

## Why It Does Not Fit Cleanly

The top-level shape is not the problem. This is still an honest `magic_item` with a composite of:

- a passive held-item bonus (`+2` attack and damage with the weapon),
- a passive skill rider (Advantage on Dex (Acrobatics) checks),
- an activated form-change ability,
- a triggered reaction (`+5 AC` against the triggering attack, 1/rest),
- and a weapon-profile rider in one form.

The failure is lower-level:

- Several properties depend on the weapon's current form, but `EquipmentPredicate` can only express coarse states like `holding_item`, `wearing_item`, and `wielding_weapon`.
- The dim-light toggle has no existing authored atom.
- The quarterstaff-form ranged mode needs weapon-profile mutation the current surface does not express.
- The automatic return-to-hand rider after a ranged attack has no existing atom.

## Specific Gaps

### 1. Form-scoped item predicates

The unit needs a way to say “while holding this item **and it is currently in form X**”.

Evidence:

- `Acrobatic Assist (Quarterstaff and 10-Foot Pole Forms Only).`
- `Attack Deflection (Quarterstaff Form Only).`
- `Ranged Weapon (Quarterstaff Form Only).`

The current surface can express `holding_item`, but not `holding_item where item form = quarterstaff` or `... = 10-foot pole`.

Recommended widening:

- Add an `EquipmentPredicate.item_form`-style variant, or equivalent item-state predicate tied to `alter_item_kind`.

### 2. Light emission

Evidence:

- `you can cause it to emit green Dim Light out to 10 feet ... or you can extinguish the light`

This is deterministic and stateful, but there is no current effect atom for emitting or suppressing a light radius.

Recommended widening:

- Add an `emit_light` atom with at least radius and light grade (`dim` / `bright`) fields.

### 3. Weapon profile mutation

Evidence:

- `This weapon has the Thrown property with a normal range of 30 feet and a long range of 120 feet.`

The existing surface can filter bonuses by weapon or item, but it cannot change an item's weapon properties or its range profile.

Recommended widening:

- Add a `modify_weapon_profile` atom or equivalent closed surface that can add `Thrown` and set range bands for the item.

### 4. Return to hand after ranged attack

Evidence:

- `Immediately after you make a ranged attack with the weapon, it flies back to your hand.`

This is neither teleporting the creature nor altering item kind. It is a deterministic post-attack item-return behavior.

Recommended widening:

- Add a `return_item_after_attack` atom or subgraph for post-attack item repositioning to the wielder.

## Notes On Near-Fits

The following portions already resemble existing shapes:

- `+2 bonus to attack rolls` with a `specific_item` weapon filter.
- `+2 bonus to damage rolls` with `modify_damage_numeric`.
- `Advantage on Dexterity (Acrobatics) checks` with `modify_roll_advantage` plus `skillFilter = acrobatics`.
- `Attack Deflection` as a triggered reaction using `modify_ac`, `hit_by_attack_roll`, `reaction`, `use_count`, and `short_or_long_rest`.
- Form-changing itself via `alter_item_kind`.

Those are not sufficient to encode the full unit honestly because the current surface cannot bind them to the item's active form, and the ranged/light riders remain unmodeled.
