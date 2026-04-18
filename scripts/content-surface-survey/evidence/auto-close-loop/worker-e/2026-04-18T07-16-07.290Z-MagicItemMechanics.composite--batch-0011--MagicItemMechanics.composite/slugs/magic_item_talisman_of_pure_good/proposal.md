# Talisman of Pure Good

## Verdict

`structural_widening`

The item does not fit honestly in the current magic-item surface, so no `content/magic_item_talisman_of_pure_good.dhall` was authored.

## Why It Doesn't Fit

The blocking mechanic is the talisman's passive hazard:

> A Fiend or an Undead that touches the talisman takes 8d6 Radiant damage and takes the damage again each time it ends its turn holding or carrying the talisman.

Current `MagicItemComponentMechanics` only allows:

- `passive`
- `activation`
- `triggered_reaction`

This hazard is none of those. It is a persistent triggered effect with:

- an entry trigger: touching the item
- a recurring trigger: end of turn while holding or carrying it
- a target-side creature-type condition: Fiend or Undead only

That forces a new magic-item component family or a shared non-spell ongoing/triggered-hazard family.

## Secondary Gaps

Even if the passive hazard family existed, `Pure Rebuke` still needs additional widening:

- `destroy_target` atom
  - Evidence: "On a failed save, the target falls into the fissure and is destroyed, leaving no remains."
  - Existing atoms cover damage, conditions, exile, and transformations, but not deterministic creature destruction.

- save-gate target-type disadvantage
  - Evidence: "If the target is a Fiend or an Undead, it has Disadvantage on the save."
  - Existing filters cover target eligibility and attacker-side roll modifiers, not conditional disadvantage on the target's save inside a `save_gate`.

- grounded target restriction
  - Evidence: "target one creature you can see on the ground within 120 feet of yourself"
  - Current target grammar has range and type filters, but no grounded / airborne positional restriction.

- spell-attack-only roll modifier
  - Evidence: "You gain a +2 bonus to spell attack rolls while you wear or hold it."
  - Current `modify_roll_numeric` scoping only offers generic `attack_roll`, which would incorrectly also apply to weapon attacks.

## What Would Otherwise Fit

These parts already fit the current surface:

- magic item kind
- `requiresAttunement = true`
- attunement restriction `class_list = ["cleric", "paladin"]`
- activation with `charge_pool`
- `standard_action` with `magic`
- fixed DC 20 save gate
- success rider `4d6 psychic`
- last-charge deterministic destruction via `permanent_on_empty`

I did not author a partial placeholder because omitting the contact hazard and failed-save destruction would misrepresent the item's core mechanics.
