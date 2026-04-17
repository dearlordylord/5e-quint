# Staff of Striking

## Verdict

`Staff of Striking` does not fit the current authored surface honestly. I did not author `content/magic_item_staff_of_striking.dhall` or generate JSON/trace output.

Outcome: `structural_widening`

## Why It Fails

The current `MagicItemMechanics` union is:

- `passive`
- `activation`

`Staff of Striking` needs both at once:

- a passive weapon bonus while wielded: `+3` to attack rolls and damage rolls made with the staff
- an optional on-hit rider: after a melee hit with the staff, spend `1-3` charges to add `1d6 Force` per charge

That second part is not a normal action activation and not a passive always-on grant. It is an item-scoped on-hit rider with resource spend at the hit window.

## Required Widenings

### 1. Magic-item on-hit charge rider

Primary gap: the surface needs a way for a magic item to host an on-hit rider that can consume charges.

Evidence:

> "When you hit with a melee attack using it, you can expend up to 3 charges. For each charge you expend, the target takes an extra 1d6 Force damage."

Why current families fail:

- `passive` cannot spend charges at hit time.
- `activation` assumes an activated use with a declared activation cost, not a rider attached to a successful melee hit.
- `mastery.on_hit_trigger` exists, but it is only available under `MasteryRecord`, not `MagicItemRecord`, and it does not model charge-pool spending.

### 2. Flat bonus to weapon damage rolls made with the item

The passive bonus includes `+3` to damage rolls made with the staff.

Evidence:

> "This staff can be wielded as a magic Quarterstaff that grants a +3 bonus to attack rolls and damage rolls made with it."

Current surface limits:

- `modify_roll_numeric` can cover the attack-roll half.
- There is no honest atom for a flat modifier to weapon damage rolls made with a specific item.
- A separate `damage` atom would be false here: RAW says the item's normal damage roll is increased, not that it always adds a distinct extra damage instance.

### 3. Last-charge effect is disenchantment, not destruction

Evidence:

> "If you expend the last charge, roll 1d20. On a 1, the staff becomes a nonmagical Quarterstaff."

Current `ItemDestructionPolicy` variants:

- `none`
- `last_charge_roll`
- `permanent_on_empty`

Those cover destruction or permanent uselessness, but not "remains as mundane equipment."

## Narrowest Honest Classification

`structural_widening` is the right top-level outcome because the unit's main mechanic does not fit any existing `MagicItemMechanics` family honestly. The atom/lifecycle gaps above are real, but they are secondary to the missing family/subgraph needed to represent the item's core shape.
