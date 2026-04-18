`Censer of Controlling Air Elementals` is a `magic_item`, and its overall mechanic is closest to the existing magic-item `spawned_creature` family. The blocker is not the family itself; it is the summon payload shape.

The current `MagicItemSpawnedCreatureMechanics` surface requires an inline `SpawnedCreaturePayload.statBlock`. This item does not ship an inline stat block. Its deterministic mechanical text instead points at an existing named monster, `Air Elemental`, then layers item-specific control and lifecycle rules on top:

- summon the named creature into an unoccupied space as close to the censer as possible;
- it understands your languages;
- it obeys your commands;
- it takes its turn immediately after you on your Initiative count;
- it disappears after 1 hour, when it dies, or when you dismiss it as a Bonus Action;
- the item resets at the next dawn.

That means the honest widening is a summon payload that can reference a catalog creature stat block instead of requiring an inline one.

Suggested widening:

- New surface variant on the existing magic-item summon family:
  - `statBlockSource: { kind: "catalog_ref", monsterId: "air_elemental" }`
  - or a parallel `MagicItemCatalogSpawnedCreatureMechanics` family if the project wants to keep inline-vs-catalog summon payloads distinct.

Why this is `surface_widening`, not `structural_widening`:

- `magic_item` already exists.
- summon-style magic-item mechanics already exist via `MagicItemSpawnedCreatureMechanics`.
- the missing piece is a specific payload shape for external named monster stat blocks.

Why this is not `atom_widening`:

- the needed atoms already exist in v4 and in the tracer path: `activate`, `create_companion`, `command_companion`, `companion`, `bonus_action_quota`, `duration_window`, and `charge`/`use_count`-style reset resources.
- the problem is that the authored surface cannot point those atoms at a catalog monster honestly.
