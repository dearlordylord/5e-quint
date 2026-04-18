## Surface gap: passive item loses magic on hit

`Ammunition, +1, +2, or +3` fits the existing `magic_item` + `passive` family for its rarity-scaled attack and damage bonuses. The remaining mismatch is lifecycle text:

> "Once it hits a target, the ammunition is no longer magical."

The current surface can model:

- passive item bonuses (`PassiveMechanics`)
- item-scoped attack/damage filters (`WeaponFilter.specific_item`)
- deterministic destruction on pool exhaustion (`permanent_on_empty`)
- last-charge destruction rolls (`last_charge_roll`)

It cannot model a passive item becoming nonmagical when a particular combat event happens.

### Proposed widening

- Kind: `new_variant`
- Name: `ItemDestructionPolicy.on_hit_becomes_nonmagical`

Suggested shape:

```ts
| {
    readonly kind: "on_hit_becomes_nonmagical";
  }
```

Why this is the narrowest honest widening:

- the unit already fits `MagicItemRecord`
- the bonus atoms already exist (`modify_roll_numeric`, `modify_damage_numeric`)
- the missing concept is not a new payload family or new effect atom
- the missing concept is a new lifecycle/destruction trigger on an existing surface type

Until that exists, the current authored subset can only encode the bonus rider and must omit the per-hit loss of magic.
