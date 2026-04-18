# Carpet of Flying

## Verdict

`surface_widening`

The existing `magic_item` kind and activated-item family are close, but the current authored surface cannot represent this item honestly without pretending the carpet is a creature or that the effect applies to the wielder instead of the carpet.

## Why It Doesn't Fit Cleanly

The deterministic core mechanic is:

- spend a `Magic` action to activate the carpet;
- the carpet itself becomes a flying, hovering object;
- it then keeps moving according to the controller's directions;
- that control only works while the controller is within 30 feet;
- the carpet's fly speed depends on which size variant it is and is halved when carried load exceeds normal capacity.

Current gaps:

- No activation-phase attachment for the item/object itself. `Attachment` only supports `self`, `target`, `area`, and `mark`, while the non-spell companion path is creature-only.
- No honest non-creature control/movement subgraph. `command_companion` is explicitly for creature summons; using it for a carpet would produce a misleading trace.
- No item/object speed payload with load-threshold halving. Existing speed atoms are creature-facing and do not encode “normal capacity vs double capacity halves speed.”

## What *Does* Fit

The four published size lines do not force a new top-level family. They can be modeled as four `MagicItemVariant` entries:

- 3 × 5, capacity 200 lb, fly 80 ft
- 4 × 6, capacity 400 lb, fly 60 ft
- 5 × 7, capacity 600 lb, fly 40 ft
- 6 × 9, capacity 800 lb, fly 30 ft

The random table is GM-side selection for which variant exists, so it does not itself force a widening.

## Narrowest Honest Widening

1. Add an `Attachment.item` (or equivalent object/item self-target) so an activation can attach to the carpet itself.
2. Add a non-creature controlled-movement surface for persistent commanded items/objects.
3. Add an item/object load-sensitive speed modifier, or widen speed semantics so attached items/objects can carry capacity thresholds that modify movement.

## Evidence

> You can make this carpet hover and fly by taking a Magic action and using the carpet's command word.

> It moves according to your directions if you are within 30 feet of it.

> A carpet can carry up to twice the weight shown on the table, but its Fly Speed is halved if it carries more than its normal capacity.
