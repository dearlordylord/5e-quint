# Proposal: Carpet of Flying

## Verdict

`surface_widening`

The unit fits the existing top-level `magic_item` kind, and its size table could be represented with existing `MagicItemRecord.variants`. The failure is lower-level: the current surface cannot honestly model an existing item that is itself the moving subject of an activation and then obeys directional commands within a control radius.

I did not author `content/magic_item_carpet_of_flying.dhall`, because any current workaround would lie about the rule:

- encoding the carpet as `self` would attach flight to the wielder, not the carpet;
- encoding it as a spawned creature would invent a companion that the item does not create;
- encoding it as a passive speed grant would lose the Magic-action activation and 30-foot control rule.

## Missing Surface Shapes

### 1. Item/object attachment for non-spell activations

The mechanical subject is the carpet itself:

> "You can make this carpet hover and fly by taking a Magic action"

Current `ActivationPhase.attachment` only admits `self`, `target`, `area`, and `mark`, all creature-centric in practice. There is no honest way to say "apply this movement state to the magic item itself."

Needed widening:

- add an attachment variant for an existing `item` or `object`;
- make it available to non-spell activation families, not just hypothetical future spell targeting.

### 2. Commandable existing-item movement subgraph

The carpet is not just granted a fly speed. It is commanded remotely:

> "It moves according to your directions if you are within 30 feet of it."

The taxonomy already has `command_companion`, but the authored surface only exposes command semantics through spawned-creature families. Carpet of Flying needs the same kind of control loop for a pre-existing item already in play.

Needed widening:

- expose a reusable commandable-item movement shape, likely parallel to the spawned-creature `command_companion` path;
- include a control range (`within 30 feet`);
- preserve the fact that the item is the thing moving.

### 3. Load-threshold speed modifier

The carpet's speed depends on carried weight:

> "its Fly Speed is halved if it carries more than its normal capacity"

`set_speed_ratio` exists, but there is no predicate surface for load or carried-weight thresholds. Existing predicates are HP-only. Without a load predicate, the speed-halving rule cannot be represented honestly.

Needed widening:

- add a carried-load / weight-threshold predicate;
- allow that predicate to gate a speed modifier such as `set_speed_ratio 1/2`.

## What Already Fits

- `MagicItemRecord` is correct.
- `variants` are available for the four size/capacity/speed rows.
- `activationCost = { kind = "standard_action", action = "magic" }` exists.

So this is not `structural_widening`. The family exists; the missing pieces are surface-level shapes needed to target and command an existing item honestly.
