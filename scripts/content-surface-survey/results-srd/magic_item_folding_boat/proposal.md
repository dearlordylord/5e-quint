## Folding Boat

`Folding Boat` fits the existing `magic_item` top-level kind, but not the current surface honestly.

### Why it does not fit cleanly

1. The transformation targets the item itself, not the wielder or another creature.
   The only authored `Attachment` variants available to activation phases are `self`, `target`, `area`, and `mark`. `Folding Boat` needs an item/object attachment so `alter_item_kind` can attach to the boat rather than to a creature.

2. The command words are reusable and do not spend charges or uses.
   Current magic-item `activation` requires an `ActivationResource` plus a `resetCadence`. That works for consumables, charge items, and limited-use items, but not for an always-available command-word item.

3. The fold-back command has a deterministic activation precondition.
   The third command word works only "if no creatures are aboard." Current activation phases have no place to encode an item-state / occupancy precondition on one branch of a mode choice.

4. The item can be destroyed when either transformed vessel is reduced to 0 Hit Points.
   Existing `ItemDestructionPolicy` variants only cover charge depletion (`last_charge_roll`, `permanent_on_empty`). `Folding Boat` needs destruction tied to the transformed form's HP reaching 0.

### Narrowest honest classification

`surface_widening`

The top-level kind (`magic_item`) and broad family (`activation`) already exist, and the core effect atom (`alter_item_kind`) already exists. The missing pieces are surface variants around attachment, activation economics, activation gating, and destruction triggers.

### Proposed widenings

1. `Attachment.item` or `Attachment.object`
   So activation phases can attach `alter_item_kind` to the item itself.

2. Resource-free magic-item activation
   A variant of activated-item mechanics that allows unlimited command-word use without inventing fake charges or use counts.

3. Optional activation/mode precondition
   Needed for branch-specific constraints like "folds back into a box if no creatures are aboard."

4. `ItemDestructionPolicy` variant keyed to transformed form HP
   Needed for "If either vessel is reduced to 0 Hit Points, the Folding Boat is destroyed."

### Evidence

- "This item also has three command words, each requiring a Magic action to use"
- "The box unfolds into a Rowboat."
- "The box unfolds into a Keelboat."
- "The Folding Boat folds back into a box if no creatures are aboard."
- "If either vessel is reduced to 0 Hit Points, the Folding Boat is destroyed."
