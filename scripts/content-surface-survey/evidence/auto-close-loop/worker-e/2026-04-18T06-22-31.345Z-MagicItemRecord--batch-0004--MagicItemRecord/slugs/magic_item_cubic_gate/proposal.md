# Cubic Gate

## Verdict

`Cubic Gate` is an existing `magic_item` + `activation` family case, not a new top-level structure. The honest blocker is narrower: the current surface cannot express that the item's spell cast is bound to the plane keyed to the cube face pressed at activation time.

Because that destination binding is core to both item actions, I did **not** author `content/magic_item_cubic_gate.dhall`. Encoding this as plain `grant_spell_access` for `gate` and `plane_shift` would incorrectly widen the item into unrestricted casts of those spells.

## What Fits Already

- `MagicItemRecord`
- `mechanics.family = "activation"`
- `activationCost = { kind = "action" }` for the Magic action
- shared `resource = { kind = "charge_pool", cap = { kind = "fixed", uses = 3 } }`
- `resetCadence = { kind = "dawn", regain = Some { kind = "fixed", expr = { dice = 1, dieSize = 3 } } }`
- multiple spell grants hanging off one shared charge pool

## Missing Surface

Proposed widening:

- New variant/field on `grant_spell_access` to bind a spell-specific destination parameter to an item-defined cast-time choice.

Suggested shape direction:

- a cast-time side choice, with each side carrying a keyed plane identifier
- a way to say the granted spell's destination plane is not freely chosen, but is set from that side choice

This is narrower than a new family. The cast/recharge shell already exists.

## Evidence

- "Pressing one side of the cube, you cast Gate, opening a portal to the plane of existence keyed to that side."
- "Pressing one side of the cube twice, you cast Plane Shift, transporting the targets to the plane of existence keyed to that side."

## Notes

The line "The other sides are linked to planes determined by the GM" is not the reason for the stop. That is setup-time GM ownership. The modeling gap is the missing deterministic linkage from the pressed side to the destination plane of the granted spell cast.
