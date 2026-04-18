# Proposal: Wand of Lightning Bolts

## Verdict

This unit fits the existing `magic_item` + `activation` family honestly.
The only missing surface shape is the stronger attunement qualifier.

## Needed widening

- `MagicItemRecord` needs a way to encode attunement eligibility more precisely than `requiresAttunement: boolean`.
  Evidence: "Requires Attunement by a Spellcaster"

## Why this is `surface_widening`, not `structural_widening`

The item's core mechanics already map cleanly to existing surface shapes:

- `condition = { kind = "holding_item" }`
- `resource = { kind = "charge_pool", cap = 7 }`
- `grant_spell_access` with `mode = charge_cast` for `lightning_bolt`
- `dcOverride = { kind = "fixed", dc = 15 }`
- `resetCadence = dawn` with `1d6 + 1` recharge
- `destruction = last_charge_roll`

No new payload family or atom is forced. The gap is a missing variant on the
existing magic-item eligibility surface.
