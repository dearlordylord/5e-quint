# Carpet of Flying

Outcome: `surface_widening`

## Why it does not fit cleanly

`Carpet of Flying` is still a `magic_item`, but the current authored surface cannot represent its core mechanic honestly:

- The activation affects the carpet itself, not the bearer. `ActivationPhase.attachment` only allows `self`, `target`, `area`, or `mark`; there is no item/object attachment.
- The item has four closed size profiles with different capacities and Fly Speeds, but `MagicItemRecord` has no variant/mode surface comparable to spell mode choice or creature mode choice.
- The carpet's Fly Speed changes deterministically based on carried load, and the current surface has no thresholded load predicate for persistent item movement.

Because of those gaps, any authored JSON would have to lie by treating the carpet as:

- a self-buff on the user,
- a creature companion,
- or a single arbitrary size.

All three would misstate the rule text.

## Narrowest honest widenings

1. Add an item/object attachment variant for activation phases.
   Evidence: "You can make this carpet hover and fly ... It moves according to your directions if you are within 30 feet of it."

2. Add a closed variant/profile surface for magic items.
   Evidence: "Four sizes of Carpet of Flying exist."

3. Add a load-conditioned movement rule for items.
   Evidence: "its Fly Speed is halved if it carries more than its normal capacity."

## Why this is not `structural_widening`

The top-level unit still belongs under the existing `magic_item` kind. The failure is in missing surface variants for item-targeted movement and item profile data, not in the absence of a magic-item family altogether.

## Files intentionally not authored

Per protocol, I did not create:

- `content/magic_item_carpet_of_flying.dhall`
- `content/magic_item_carpet_of_flying.json`
- `content/magic_item_carpet_of_flying.trace.md`

Producing them would require a knowingly false encoding.
