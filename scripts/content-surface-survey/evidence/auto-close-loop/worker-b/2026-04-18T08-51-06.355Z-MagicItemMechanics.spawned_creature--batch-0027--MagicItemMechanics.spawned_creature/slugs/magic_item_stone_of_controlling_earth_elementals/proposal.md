# Stone of Controlling Earth Elementals

## Verdict

`surface_widening`

## Why it does not fit cleanly

The unit fits the existing `magic_item` top-level kind and the existing magic-item `spawned_creature` mechanics family almost exactly:

- activation cost: `standard_action` with `action = "magic"`
- resource: `use_count` 1
- reset cadence: `dawn`
- range: 30 feet
- control: obeys commands, acts immediately after you on your Initiative count
- dismissal: disappears after 1 hour, at 0 HP, or when dismissed as a Bonus Action

The blocker is the summoned creature payload.

The text does not define a new item-specific stat block. It points at an existing named monster:

> "you can take a Magic action to summon an Earth Elemental"

Current `MagicItemSpawnedCreatureMechanics` requires an inline `statBlock: CreatureStatBlock`. That works for things like `Find Steed` or `Summon Dragon`, where the spell ships its own stat block. It is not an honest fit for an item that summons a pre-existing monster by name.

## Missing surface shape

Add a catalog-reference option for magic-item spawned creatures, parallel to existing catalog-reference patterns elsewhere in the surface:

- candidate shape: widen `SpawnedCreaturePayload` / `MagicItemSpawnedCreatureMechanics`
- from:
  `statBlock: CreatureStatBlock`
- to something like:
  `statBlock: CreatureStatBlock | { kind: "catalog_ref", monsterId: string }`

or an equivalent dedicated variant on the spawned-creature payload.

## Why this is a surface widening, not structural

- The top-level kind already exists: `magic_item`
- The mechanics family already exists: `spawned_creature`
- The missing piece is a new variant within that family so summoned companions can reference a named catalog monster instead of requiring an inline stat block

## Why I did not author a placeholder

Inlining or inventing an Earth Elemental stat block here would be misleading:

- it duplicates monster-catalog content the item text merely references
- it would blur the distinction between "summons a named existing monster" and "creates a new item-defined companion stat block"
- the task explicitly says not to force the unit into the closest valid shape when that shape is dishonest
