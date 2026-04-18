`Folding Boat` does not fit the current authored surface honestly, so no `content/magic_item_folding_boat.dhall` was written.

Why it does not fit:

- The item's core mechanic is an at-will Magic-action activation with no use-count, charge pool, or reset cadence. Current magic-item `activation` mechanics require both `resource` and `resetCadence`, so the only way to author this today would be to invent fake charges or a fake reset.
- The existing `alter_item_kind` atom assumes the attachment identifies which item/object is changing, but the current `Attachment` surface only supports `self`, `target`, `area`, and `mark`. `Folding Boat` needs an item/object attachment so the box itself can become a rowboat, keelboat, or box again.
- The destruction rider is not depletion-based. Current `ItemDestructionPolicy` only models `none`, `last_charge_roll`, and `permanent_on_empty`, but `Folding Boat` says it is destroyed if either vessel form is reduced to 0 Hit Points.

Recommended widenings:

1. `ActivatedAbilityMechanics` / `MagicItemSpawnedCreatureMechanics` resource-free item activations
   - Kind: `new_variant`
   - Name: optional `resource` / `resetCadence` for at-will item activations, or an explicit `activation` header variant for no-resource activations
   - Justification: the command words are deterministic activations that spend only a Magic action
   - Evidence: "This item also has three command words, each requiring a Magic action to use"

2. `Attachment` item/object target
   - Kind: `new_variant`
   - Name: `Attachment.kind = "item"` or `Attachment.kind = "object"`
   - Justification: `alter_item_kind` already exists, but there is no honest way to say which item is being altered
   - Evidence: "The box unfolds into a Rowboat." / "The box unfolds into a Keelboat." / "The Folding Boat folds back into a box"

3. `ItemDestructionPolicy` tied to transformed item HP
   - Kind: `new_variant`
   - Name: destruction on transformed form reduced to `0 Hit Points`
   - Justification: this is a deterministic item-lifecycle trigger, distinct from charge depletion
   - Evidence: "If either vessel is reduced to 0 Hit Points, the Folding Boat is destroyed."

Secondary pressure not resolved here:

- The third command word is gated by a state predicate: the boat can fold back only "if no creatures are aboard." The current activation surface has no precondition/predicate field for this sort of activation gating.
- The cargo-handling text ("objects that can't fit remain outside; objects that can fit do so") is table/stateful item-container projection and should not be faked as a combat effect atom.
