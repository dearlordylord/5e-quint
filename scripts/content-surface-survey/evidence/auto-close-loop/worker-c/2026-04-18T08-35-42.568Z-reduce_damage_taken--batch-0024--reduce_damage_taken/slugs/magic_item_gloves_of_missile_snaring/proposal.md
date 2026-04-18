## Gloves of Missile Snaring

Outcome: `surface_widening`

### Why the current surface is insufficient

`Gloves of Missile Snaring` is a `magic_item` with a reaction-shaped deterministic mechanic:

- trigger: being hit by an attack roll made with a ranged or thrown weapon;
- effect: reduce the incoming damage by `1d10 + Dex modifier`;
- gate: only if the wearer has a free hand.

The current surface is close, but not honest enough to author:

1. `TriggeredReactionAbilityMechanics` requires `resource` and `resetCadence`.
   The gloves do not have a per-rest use counter or charge pool. They are an at-will reaction that spends only the normal reaction quota.

2. `EquipmentPredicate` cannot express `if you have a free hand`.
   Existing predicates cover `holding_item`, `wearing_item`, `unarmored`, `wearing_armor`, and `wielding_weapon`, but not an empty-hand requirement.

### Proposed widenings

#### 1. Resource-less triggered reaction for non-spell units

Add a variant or relaxation so a magic-item `triggered_reaction` can consume only:

- `activationCost = { kind = "reaction", trigger = ... }`

without forcing:

- `resource`
- `resetCadence`

Evidence:

> "you can take a Reaction to reduce the damage by 1d10 plus your Dexterity modifier"

This is not a charge item and does not say "once per rest/day."

#### 2. `EquipmentPredicate.free_hand`

Add a predicate variant for empty-hand gating:

```ts
{ readonly kind: "free_hand" }
```

Potential future widening if needed:

```ts
{ readonly kind: "all_of"; readonly predicates: ReadonlyNonEmptyArray<EquipmentPredicate> }
```

That would let the item express both:

- wearing the gloves
- having a free hand

Evidence:

> "if you have a free hand"

### Secondary rider not reached

The catch rider was not encoded because the unit already fails honest authoring before JSON generation:

> "If you reduce the damage to 0, you can catch the ammunition or weapon if it is small enough for you to hold in that hand."

That may require a later item/object-transfer or object-catch surface, but it is secondary to the blocking reaction-shape issues above.
