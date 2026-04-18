## Instant Fortress

Verdict: `structural_widening`

`Instant Fortress` does not fit the current authored surface honestly.

The existing `magic_item` kind and `activation` family are not enough, because the item's core effect is not a one-shot effect on creatures or self. It creates a persistent, damageable structure in the world, later allows reversion to statuette form, preserves structural damage across uses, and gates reversion on the structure being empty.

Why the current surface is insufficient:

- There is no persistent non-creature object / structure payload parallel to `spawned_creature`.
- `alter_item_kind` is too weak. It can describe a form change, but not a deployed fortress with AC, HP, immunities, resistances, anti-topple behavior, and state that persists across later activations.
- There is no occupancy predicate for the revert clause: "works only if the tower is empty."
- There is no object-defense grammar for "roof, door, and walls each have AC 20; HP 100; Immunity ... except siege equipment; Resistance to all other damage."

Suggested widening:

1. Add a deployable structure/object subgraph or payload family for magic items.
2. Add a `create_object` effect variant on the surface.
3. Add authored structure durability/defense fields for created objects.
4. Add an activation predicate for object occupancy / emptiness.

Source pressure:

> "cause it to grow rapidly into a square adamantine tower"

> "Repeating the command word causes the tower to revert to statuette form, which works only if the tower is empty."

> "The roof, the door, and the walls each have AC 20; HP 100; Immunity to Bludgeoning, Piercing, and Slashing damage except that which is dealt by siege equipment; and Resistance to all other damage."

Secondary notes:

- "Each creature in the area ... is pushed to an unoccupied space outside but next to the tower" looks compatible with existing forced-movement / repositioning ideas once the structure itself can be created honestly.
- "The door opens only at your command, which you can issue as a Bonus Action" likely needs a follow-on commandable-object state surface, but that is downstream of the missing persistent structure family.
