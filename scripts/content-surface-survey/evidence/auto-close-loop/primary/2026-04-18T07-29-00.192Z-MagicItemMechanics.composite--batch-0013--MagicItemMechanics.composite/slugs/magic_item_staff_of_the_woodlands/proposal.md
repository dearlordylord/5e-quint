# Staff of the Woodlands

## Verdict

`surface_widening`

The unit fits the existing `magic_item` top-level kind and `composite` mechanics family in principle:

- passive held bonuses (`+2` weapon attack rolls, `+2` weapon damage rolls, `+2` spell attack rolls while holding),
- charge-based spellcasting with dawn recharge,
- attunement restricted to a class list.

I did not author `content/magic_item_staff_of_the_woodlands.dhall` because two unsupported mechanics are too substantial to omit honestly.

## Missing surface shapes

### 1. `Attachment.object`

The current activation surface has `Attachment.self | target | area | mark`, but no way to direct an effect at the item/object being transformed.

That blocks honest use of the already-existing `alter_item_kind` effect atom for Tree Form.

Evidence:

> "You can take a Magic action to plant one end of the staff in earth in an unoccupied space and expend 1 charge to transform the staff into a healthy tree."

### 2. `ItemDestructionPolicy.last_charge_roll_nonmagical`

The item does not get destroyed on a failed last-charge roll. It remains in play as a mundane Quarterstaff.

Current `ItemDestructionPolicy` variants are:

- `none`
- `last_charge_roll` (destroyed)
- `permanent_on_empty`

None of those match "loses its properties and becomes nonmagical".

Evidence:

> "If you expend the last charge, roll 1d20. On a 1, the staff loses its properties and becomes a nonmagical Quarterstaff."

### 3. `EffectAtom.fall_on_end`

Reverting the tree back into a staff causes creatures in the tree to fall. That is a deterministic rider tied to the revert event.

The taxonomy includes `fall_on_end`, but the current authored surface in `types.ts` does not expose it.

Evidence:

> "Any creature in the tree falls when the tree reverts to a staff."

## What already fits

If the missing shapes above existed, the rest of the item could encode cleanly with existing surface pieces:

- `MagicItemRecord.requiresAttunement = true`
- `attunementRestriction = { kind = "class_list", classes = ["druid"] }`
- passive held-item grants:
  - `modify_roll_numeric` on `attack_roll` with `weaponFilter.specific_item`
  - `modify_damage_numeric` with `weaponFilter.specific_item`
  - `modify_roll_numeric` on `spell_attack_roll`
- activation charge pool for the spell table via repeated `grant_spell_access`
- `resetCadence = dawn` with `1d6`

## Why I stopped

This is not a missing top-level family. It is an existing family blocked by missing variants inside the current surface. A partial encoding that dropped Tree Form or mis-modeled the last-charge clause as destruction would produce a misleading trace, so I left the content files unwritten.
