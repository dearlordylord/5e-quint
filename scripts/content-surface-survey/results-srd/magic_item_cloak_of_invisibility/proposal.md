Cloak of Invisibility is a near-fit for `MagicItemRecord` with `mechanics.family = "activation"`:

- `charge_pool` resource with cap 3
- `resetCadence.dawn` with regain `1d3`
- `activationCost = { kind = "standard_action", action = "magic" }`
- direct self-target phase applying `invisible`
- timed duration of 1 hour

The blocker is the item's early-end grammar. The current surface can express early end for attack rolls, dealing damage, casting spells, and a few spell-specific cases, but not either of this item's core termination clauses:

- "The effect ends early if you pull the hood down (no action required)"
- "The effect ends early if you ... cease wearing the cloak."

Those are both deterministic, non-DM mechanics, so this is not `dm_agenda`. They do not require a new top-level family either; they require widening an existing surface enum.

Suggested surface widening:

1. Add a new `DurationEndTrigger` variant for manually ending an item-granted effect without spending an action.
   - Candidate shape: `{ readonly kind: "target_ends_effect_no_action" }`
   - Evidence: "The effect ends early if you pull the hood down (no action required)"

2. Add a new `DurationEndTrigger` variant for losing the required wear/hold state of the granting item.
   - Candidate shape: `{ readonly kind: "target_ceases_wearing_granting_item" }`
   - Evidence: "The effect ends early if you ... cease wearing the cloak."

Why `surface_widening` rather than `atom_widening`:

- The lifecycle concern already exists in v4 (`expire`).
- The missing piece is a new variant inside the existing `DurationEndTrigger` surface type, not a new taxonomy atom or relation.

I did not author `content/magic_item_cloak_of_invisibility.dhall` because any current encoding would silently omit one or both early-end clauses and produce a misleading trace.
