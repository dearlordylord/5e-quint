## Surface gap

`Ammunition, +1, +2, or +3` fits the existing `magic_item` + `passive`
family for its rarity-scaled attack and damage bonuses, but it has one
additional lifecycle rule the current surface cannot encode honestly:

> "Once it hits a target, the ammunition is no longer magical."

The current surface can scope the passive bonuses to a specific item via
`weaponFilter.kind = "specific_item"` and can represent rarity-derived
numeric bonuses via `DiceDelta.kind = "magic_item_rarity_bonus"`.
What it cannot express is a passive magic-item rider that expires after a
successful hit by that specific ammunition piece while the ammunition
object itself may still physically exist.

## Proposed widening

- Kind: `new_variant`
- Name: `magic_item_hit_expiry`
- Suggested shape: a magic-item lifecycle / destruction variant that
  removes the item's magical properties after it hits a target, without
  claiming the item is physically destroyed.

## Why this is surface widening, not atom widening

The v4 taxonomy already has lifecycle and window atoms (`expire`,
`on_hit_window`). The missing piece is an authored-surface way to attach
that lifecycle to a passive magic item. No new v4 atom is required; the
surface just lacks the variant that connects existing atoms.
