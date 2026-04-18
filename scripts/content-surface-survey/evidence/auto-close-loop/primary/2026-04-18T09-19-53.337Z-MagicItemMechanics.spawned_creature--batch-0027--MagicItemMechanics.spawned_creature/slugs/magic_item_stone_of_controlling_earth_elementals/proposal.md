`Stone of Controlling Earth Elementals` mostly matches the existing `magic_item` + `spawned_creature` family:

- activated magic item
- Magic action activation
- once per dawn reset
- summons a named SRD creature
- shared initiative / immediately-after-you turn order
- bonus-action dismissal

I did not author `content/magic_item_stone_of_controlling_earth_elementals.dhall` because two existing surface shapes force invented data.

Missing surface shapes

1. Activation precondition beyond generic held/worn state

The item can be used only "while touching this 5-pound stone to the ground". Current `ActivatedAbilityHeader.condition` only admits `EquipmentPredicate`, and `EquipmentPredicate` can express things like `holding_item` or `wearing_item`, but not "item is in contact with the ground" / "grounded use".

Why this matters:

- Encoding only `holding_item` would drop a real mechanical gate.
- Omitting the condition entirely would claim the item works while merely carried or held.

Suggested widening:

- Add a new activation-condition / equipment-predicate variant for grounded item use, e.g. `item_touching_ground`.

Evidence:

> "While touching this 5-pound stone to the ground, you can take a Magic action to summon an Earth Elemental."

2. Creature-control shape requires invented command metadata

`MagicItemSpawnedCreatureMechanics` reuses `SpawnedCreaturePayload.control`, whose `CreatureControl` currently requires both:

- `commandRangeFeet: number`
- `defaultBehavior: "dodge_and_avoid" | "independent"`

The item text says only that the elemental "obeys your commands" and takes its turn immediately after you. It does not specify any command range, and it does not specify what happens in the absence of commands.

Why this matters:

- Any numeric `commandRangeFeet` would be fabricated.
- Either current `defaultBehavior` choice would also be fabricated.

Suggested widening:

- Widen `CreatureControl` so command range can be absent / unspecified.
- Widen `CreatureControl` so fallback behavior can be absent / unspecified when RAW does not define it.

Evidence:

> "The elemental appears in an unoccupied space you choose within 30 feet of yourself, obeys your commands, and takes its turn immediately after you on your Initiative count."

Why this is `surface_widening`, not `structural_widening`

- The top-level unit kind already exists: `magic_item`.
- The mechanics family already exists: `spawned_creature`.
- The missing pieces are narrower variants inside existing surface types, not a brand-new family or atom.
