## Sovereign Glue

Outcome: `atom_widening`

### Why it does not fit cleanly

`magic_item` with `activation` is the right top-level shape in broad terms:

- activation cost: `standard_action` with `action = "utilize"`
- consumable stock: ounce-based pool with no recharge
- delayed resolution: glue sets after 1 minute

The blocker is the effect itself. The current surface can:

- target objects
- represent timed or permanent durations
- alter item kind
- grant spell access

It cannot represent **joining two objects into one bonded state** with explicit break exceptions.

### Forced widening

#### 1. New atom: `bond_objects`

Needed semantics:

- selects two objects
- creates a persistent bond between them
- optional setup delay (`1 minute to set`)
- optional break exceptions / counters

Evidence:

> "This viscous, milky-white substance can form a permanent adhesive bond between any two objects."

> "Applying an ounce of Sovereign Glue takes a Utilize action, and the applied glue takes 1 minute to set."

> "Once it has done so, the bond it creates can be broken only by the application of Universal Solvent or Oil of Etherealness, or with a Wish spell."

This is not `alter_item_kind`, not `transport_exile`, not `block_travel`, and not a caller-owned DM-agenda clause. It is a concrete mechanical state change the current atom set cannot express.

#### 2. Secondary surface gap: random initial stock

If the bond atom existed, the item would still pressure activation-resource capacity:

> "When found, a container contains 1d6 + 1 ounces."

Current `ActivationResource` caps are fixed or progression-derived. They do not admit a random initial found amount for consumable inventory.

### Why I did not author a placeholder

Any authored JSON would have to lie about the core mechanic by pretending the glue:

- casts a spell,
- transforms an object,
- applies an unrelated passive grant, or
- destroys an item on use.

That would produce a misleading trace, so I wrote only the widening report.
