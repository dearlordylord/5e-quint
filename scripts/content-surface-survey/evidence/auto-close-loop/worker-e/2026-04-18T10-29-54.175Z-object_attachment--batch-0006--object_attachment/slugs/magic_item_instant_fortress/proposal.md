## Instant Fortress

Outcome: `surface_widening`

`Instant Fortress` fits the existing top-level `magic_item` kind, and its primary use is activation-shaped rather than a new family. The blocker is narrower: the current surface has no honest way to represent a created durable structure.

Why I did not author `content/magic_item_instant_fortress.dhall`:

- `alter_item_kind` is not enough. It can rename an item/object form, but it does not place a persistent tower into play with authored dimensions and occupancy displacement.
- The tower has object-side combat stats that matter after activation: AC, HP, immunities, resistances, and unrepaired damage persisting across shrink/grow cycles.
- Deployment pushes both creatures and unattended objects out of the footprint. The current surface can force-move creatures, but not objects displaced by created terrain/structures.
- The bonus-action door command is secondary; even before modeling that rider, the main deployment payload is missing.

Requested surface widenings:

1. `EffectAtom.create_object`
Evidence: "cause it to grow rapidly into a square adamantine tower"
Reason: the surface needs an honest effect for creating a persistent noncreature structure, not just altering an item's label.

2. `created_object_stat_block`
Evidence: "The roof, the door, and the walls each have AC 20; HP 100; Immunity to Bludgeoning, Piercing, and Slashing damage except that which is dealt by siege equipment; and Resistance to all other damage."
Reason: the created tower needs authored object durability and damage-handling semantics that survive after the activation resolves.

3. `object_displacement_on_structure_creation`
Evidence: "Each creature in the area where the tower appears is pushed to an unoccupied space outside but next to the tower. Objects in the area that aren't being worn or carried are also pushed clear of the tower."
Reason: deployment affects both creatures and unattended objects occupying the new structure's footprint.

Secondary residue not needed to classify the unit:

- A door-control rider tied to the created structure ("The door opens only at your command, which you can issue as a Bonus Action.")
- Persistent anti-tip / anti-`Knock` structure rules.

The narrowest honest classification is `surface_widening`, not `structural_widening`: the `magic_item` + activation/composite space is the right family, but it is missing the object-creation and created-structure variants needed for this item.
