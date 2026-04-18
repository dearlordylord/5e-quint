# Proposal: Censer of Controlling Air Elementals

## Verdict

`surface_widening`

The item fits the existing `magic_item` `spawned_creature` family in broad shape:

- activated magic item
- `standard_action` with action `magic`
- once per reset resource
- `dawn` reset cadence
- summoned companion that acts immediately after the wielder

The current surface still cannot encode this unit honestly without either duplicating monster data or changing a printed rule.

## Why It Stops

### 1. Named-monster summon needs a catalog reference

The current `MagicItemSpawnedCreatureMechanics` requires:

- `statBlock: CreatureStatBlock`

That works for inline summoned-creature payloads like `Find Steed` or `Summon Dragon`, where the spell itself ships the companion stat block.

This item does not do that. It summons a named published monster:

> While gently swinging this censer, you can take a Magic action to summon an Air Elemental.

An honest encoding should point at the Air Elemental stat block, not copy it into the item record.

Why copying is the wrong move here:

- it duplicates monster data that belongs in the monster layer
- it forces the item file to restate monster mechanics unrelated to the item itself
- the current inline `CreatureStatBlock` still cannot faithfully carry several Air Elemental details anyway, including recharge behavior on `Whirlwind` and its mixed resistance profile

The narrow widening is a new spawned-creature stat-block source variant, for example a catalog reference.

### 2. Manual dismissal cost is too narrow

The item says:

> The elemental disappears after 1 hour, when it dies, or when you dismiss it as a Bonus Action.

Current dismissal support only allows:

- `manualDismiss = "magic_action"`
- `manualDismiss = "never"`

So the item's early-end rider cannot be represented honestly. This is not a new family; it is a missing variant on an existing dismissal field.

## Suggested Widenings

### `spawned_creature` catalog-ref stat block source

Suggested shape direction:

```ts
type SpawnedCreaturePayload =
  | {
      statBlock: CreatureStatBlock
      ...
    }
  | {
      statBlockSource: {
        kind: "catalog_ref"
        monsterId: string
      }
      ...
    }
```

Why this is the right boundary:

- preserves provenance: the item summons `Air Elemental`; the monster data stays with the monster catalog
- avoids redundant state
- lets the summon family reuse existing monster definitions instead of re-authoring them inside every item/spell that names a monster

### `CreatureDismissal.manualDismiss = "bonus_action"`

Suggested shape direction:

```ts
type CreatureDismissal = {
  ...
  manualDismiss?: "magic_action" | "bonus_action" | "never"
}
```

This is sufficient for the item's printed early-end rule.

## Why This Is Not Structural

This is not a missing top-level kind or family.

The repo already has:

- `MagicItemRecord`
- `MagicItemSpawnedCreatureMechanics`
- `ClassFeatureActivationCost.standard_action`
- `RestResetCadence.dawn`

So the item's overall shape is already present. The failure is narrower: existing fields are too restrictive for a named-monster summon and Bonus Action dismissal.
