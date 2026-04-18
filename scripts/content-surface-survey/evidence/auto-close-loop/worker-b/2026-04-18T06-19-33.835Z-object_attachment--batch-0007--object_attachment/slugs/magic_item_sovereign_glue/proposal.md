## Sovereign Glue

Verdict: `atom_widening`

`Sovereign Glue` should not be forced into the current surface.

The top-level unit kind exists: this is still a `magic_item`, and its use is closest to the existing `activation` family. The problem is that the current surface cannot represent the item's actual mechanical payload honestly.

Primary blocker:

- The surface has no effect atom for a permanent adhesive bond between two objects.

Why this is atom-level pressure:

- The unit's core deterministic rule is not "cast a spell", "modify AC", "grant a condition", or any existing effect atom.
- Its main effect is: create a persistent bond between object A and object B.
- That bond has explicit break conditions: `Universal Solvent`, `Oil of Etherealness`, or `Wish`.

Relevant text:

> This viscous, milky-white substance can form a permanent adhesive bond between any two objects.

Secondary surface gaps:

- `Attachment` cannot target an object pair.
  The current grammar only covers `self`, `target` creature selections, `area`, and `mark`.
- The effect is delayed.
  Applying the glue is one action, but the bond only exists after 1 minute.
- The consumable inventory is rolled on discovery.
  Existing item resources support fixed caps and recharge cadences, not "this container starts with `1d6 + 1` ounces when found."

Relevant text:

> Applying an ounce of Sovereign Glue takes a Utilize action, and the applied glue takes 1 minute to set.

> When found, a container contains 1d6 + 1 ounces.

Suggested widenings:

1. New effect atom: `bond_objects`
   This should represent a persistent bond between two attached objects, with named break conditions.

2. New attachment variant: object-pair targeting
   The atom needs to know which two objects are being bonded.

3. New delayed-resolution subgraph
   The item applies now, then resolves into the persistent bond after a 1-minute setting window.

4. New activation resource cap variant for found-quantity consumables
   The ounce pool is a rolled initial stock, not a fixed SRD charge pool and not a resetting resource.

I did not author `content/magic_item_sovereign_glue.dhall`, because any currently-valid encoding would materially misstate the item's mechanics.
