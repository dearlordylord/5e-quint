`Sovereign Glue` does not fit the current surface honestly, so no `content/magic_item_sovereign_glue.dhall` was authored.

Why it fails:

- The core mechanic is a permanent adhesive bond between two objects. The current surface has `Attachment.object`, but only for a single object, and no effect atom that creates a persistent bond between object A and object B.
- The bond has explicit break exceptions: `Universal Solvent`, `Oil of Etherealness`, or `Wish`. That is not a match for any existing effect atom such as `block_travel`, `alter_item_kind`, or `transport_exile`.
- The glue also has a delayed-set lifecycle: applying it takes a `Utilize` action, then the glue takes 1 minute to set before the permanent bond exists.

Recommended widenings:

1. `new_atom`: `bond_objects`
   - Why: the item's deterministic rules effect is neither movement control nor transformation; it creates a durable adhesive relationship between two objects.
   - Evidence: "This viscous, milky-white substance can form a permanent adhesive bond between any two objects."

2. `new_variant`: `Attachment.object_pair`
   - Why: the target is inherently binary. A single-object attachment cannot represent "between any two objects" without lying about what is attached.
   - Evidence: "between any two objects"

3. `new_variant`: persistent break conditions on the bond effect
   - Why: the created bond is not merely permanent; it is removable only by a closed list of named exceptions.
   - Evidence: "the bond it creates can be broken only by the application of Universal Solvent or Oil of Etherealness, or with a Wish spell."

Secondary unsupported details:

- The consumable stock is random on discovery: "When found, a container contains 1d6 + 1 ounces."
- The item uses area coverage accounting: "One ounce of the glue can cover a 1-foot square surface."
- Storage requirement is narrative/setup metadata: it "must be stored in a jar or flask that has been coated inside with Oil of Slipperiness."

Those are real modeling pressures, but the primary blocker is the missing bonded-object effect and paired-object target shape.
