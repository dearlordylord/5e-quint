## Folding Boat

Outcome: `surface_widening`

I did not author `content/magic_item_folding_boat.dhall` because the current surface cannot encode the item's core mechanic honestly.

Why it does not fit cleanly:

- The item's primary effect is `alter_item_kind`, but `ActivationPhase.attachment` has no `item` or `object` target variant. Encoding the effect on `self` would be false, because the command word transforms the item, not the user.
- Magic-item `activation` currently requires a consumable `resource` plus `resetCadence`. Folding Boat's command words are unlimited; they spend a Magic action but no uses, charges, or rest-based pool.
- The third command word is conditional: the boat folds back into a box only "if no creatures are aboard." There is no activation- or phase-level predicate for item-state / occupancy gating.
- The destruction clause is deterministic and tied to vessel HP, not charge exhaustion: "If either vessel is reduced to 0 Hit Points, the Folding Boat is destroyed." `ItemDestructionPolicy` only models charge-pool exhaustion.

Suggested widenings:

1. `Attachment.item` or `Attachment.object`
   - Needed so `alter_item_kind` can attach to and modify the magic item itself.
   - Evidence:
     - "The box unfolds into a Rowboat."
     - "The box unfolds into a Keelboat."
     - "The Folding Boat folds back into a box..."

2. Resource-less item activation variant
   - Needed for activations that consume only an action economy quota and have no uses/charges/reset cadence.
   - Evidence:
     - "This item also has three command words, each requiring a Magic action to use:"

3. Activation/phase predicate for item state or occupancy
   - Needed to gate a specific command-word branch on the vessel being unoccupied.
   - Evidence:
     - "The Folding Boat folds back into a box if no creatures are aboard."

4. `ItemDestructionPolicy` variant for HP-based destruction
   - Needed for item forms that become destructible objects/vehicles with their own HP.
   - Evidence:
     - "If either vessel is reduced to 0 Hit Points, the Folding Boat is destroyed."

Notes:

- `alter_item_kind` already exists in the effect taxonomy, so this is not an atom gap.
- The box/rowboat/keelboat forms look like a surface-shape problem, not a new top-level family.
- The "objects that can/can't fit inside the box" rider is partly caller-owned inventory projection, but it does not remove the core surface gaps above.
