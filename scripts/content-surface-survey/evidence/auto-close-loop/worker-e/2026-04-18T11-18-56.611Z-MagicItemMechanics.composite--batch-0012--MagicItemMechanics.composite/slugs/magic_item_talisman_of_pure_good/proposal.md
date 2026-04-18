## Talisman of Pure Good

Outcome: `atom_widening`

I did not author `content/magic_item_talisman_of_pure_good.dhall` because the item does not fit the current surface honestly.

### Why it does not fit

The top-level kind is not the issue. This is still a `magic_item`, and its overall structure could have been a composite of:

- a passive held/worn bonus,
- an activated charge-based power,
- a passive harmful-contact rider.

The blocker is the activated power's primary outcome:

> On a failed save, the target falls into the fissure and is destroyed, leaving no remains.

There is no honest effect atom for outright destruction of a creature. The existing atoms do not match:

- `damage` is not enough; the item does not deal damage on the failed-save branch.
- `transport_exile` is not enough; the text does not relocate the creature to a destination, it destroys it.
- `apply_condition` is not enough; no condition stands in for annihilation.

That forces an atom-level widening.

### Additional surface gaps

Even with a destruction atom, the unit still pressures several surface variants:

1. Passive touch / possession trigger

> A Fiend or an Undead that touches the talisman takes 8d6 Radiant damage and takes the damage again each time it ends its turn holding or carrying the talisman.

`PassiveOperation` only supports elapsed-time cadence. This item needs an item-centric trigger for:

- touching the item;
- ending a turn while holding or carrying the item.

2. Wear-or-hold gating

> You gain a +2 bonus to spell attack rolls while you wear or hold it.

> While wearing or holding the talisman, you can take a Magic action...

`EquipmentPredicate` has `all_of` but no OR-form like `wearing_item OR holding_item`.

3. Target-type-conditioned save disadvantage

> If the target is a Fiend or an Undead, it has Disadvantage on the save.

`save_gate` can express the save itself, but not a conditional modifier on that save keyed to the target's creature type.

### Not the blocker

These parts would otherwise fit or be close:

- attunement restriction by class list (`cleric`, `paladin`);
- charge pool (`7 charges`);
- fixed-DC activation (`DC 20`);
- deterministic destruction on last charge (`permanent_on_empty`);
- passive `modify_roll_numeric` on `spell_attack_roll` for the +2 bonus.

`Holy Symbol` utility is not the main reason this item fails. The failure is the missing deterministic destruction effect plus the secondary trigger/predicate gaps above.
