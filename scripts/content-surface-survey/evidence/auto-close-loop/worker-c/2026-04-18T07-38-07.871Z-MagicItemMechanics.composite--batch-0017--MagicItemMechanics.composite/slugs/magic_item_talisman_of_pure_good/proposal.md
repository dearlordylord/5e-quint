## Talisman of Pure Good

Outcome: `structural_widening`

The item does not fit the current `MagicItemMechanics` surface honestly.

### Blocking gap

The talisman has an always-on hazardous-contact mechanic:

> "A Fiend or an Undead that touches the talisman takes 8d6 Radiant damage and takes the damage again each time it ends its turn holding or carrying the talisman."

Current magic items can be:

- `passive` — unconditional or equipment-gated grants only
- `activation` — owner-initiated action with resource/reset
- `triggered_reaction` — reaction-shaped use
- `composite` — a combination of the above

None of those families can express an item that automatically damages a qualifying creature on:

- touch/contact with the item
- repeated end-of-turn while holding/carrying the item

without lying about it as an activation or reaction.

### Proposed widening

1. New subgraph / family capability for passive triggered item hazards

- Kind: `new_subgraph`
- Name: `passive_triggered_item_hazard`
- Why: magic items need an always-on trigger grammar, parallel to spell `ongoing_effect`, for deterministic non-owner-initiated effects tied to touching / holding / carrying / turn-end windows.
- Evidence: "A Fiend or an Undead that touches the talisman takes 8d6 Radiant damage and takes the damage again each time it ends its turn holding or carrying the talisman."

### Secondary gaps exposed by Pure Rebuke

These are real gaps too, but they are not the narrowest blocking classification.

1. Destroy / remove-target effect

- Kind: `new_atom`
- Name: `destroy_target`
- Why: the failed-save branch is not ordinary damage; the target is removed and leaves no remains.
- Evidence: "On a failed save, the target falls into the fissure and is destroyed, leaving no remains."

2. Save modifier conditioned on the target's creature type

- Kind: `new_variant`
- Name: `save_gate.targetHasTypeDisadvantage`
- Why: the item applies disadvantage to the save only if the target is a Fiend or Undead. Current `save_gate` has no target-type-conditioned save modifier hook.
- Evidence: "If the target is a Fiend or an Undead, it has Disadvantage on the save."

3. Grounded target restriction

- Kind: `new_variant`
- Name: `Granted target restriction: on_ground`
- Why: the activated effect can only target "one creature you can see on the ground within 120 feet". The current target grammar has visibility/range/type filters, but not grounded-state targeting.
- Evidence: "target one creature you can see on the ground within 120 feet of yourself"

### Notes

The Holy Symbol rider itself fits existing surface cleanly:

- passive magic item grant
- equipment gate: `holding_item` / `wearing_item`
- `modify_roll_numeric` on `spell_attack_roll` with `+2`

The widening is forced by the hazardous-contact core mechanic, so no honest partial `.dhall` was authored.
