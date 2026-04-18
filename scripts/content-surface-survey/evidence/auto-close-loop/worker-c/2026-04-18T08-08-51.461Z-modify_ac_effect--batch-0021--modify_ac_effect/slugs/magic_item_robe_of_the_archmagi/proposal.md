## Robe of the Archmagi

This item fits the existing `magic_item` + `passive` family, but two
specific surface gaps prevent a full honest encoding.

### Required widenings

1. New `EquipmentPredicate` conjunction form

- Why: the robe's AC formula applies only while two predicates are true
  at once: the item is being worn, and the wearer is not wearing armor.
- Pressure text: "You gain these benefits while wearing the robe."
- Pressure text: "If you aren't wearing armor, your base Armor Class is
  15 plus your Dexterity modifier."
- Why existing shapes do not work:
  - `wearing_item` is too broad; it would still grant the AC formula
    while the wearer also has armor on.
  - `unarmored` is too broad; it would grant the AC formula even when
    the robe is not being worn.
  - splitting into separate passive parts does not solve this because
    the AC clause still needs both predicates simultaneously.

Suggested direction:

```ts
type EquipmentPredicate =
  | ...
  | {
      readonly kind: "all_of";
      readonly predicates: ReadonlyNonEmptyArray<EquipmentPredicate>;
    };
```

2. New save-source filter on `modify_roll_advantage`

- Why: the item grants Advantage only on saving throws caused by spells
  or other magical effects, not on saving throws generally.
- Pressure text: "You have Advantage on saving throws against spells and
  other magical effects."
- Why existing shapes do not work:
  - `modify_roll_advantage` on `saving_throw` over-applies to every save.
  - `saveAbilityFilter` narrows by ability, not by source/cause.
  - `attackerTypeFilter` is irrelevant because magical effects are not a
    creature-type property.

Suggested direction:

```ts
{
  readonly kind: "modify_roll_advantage";
  readonly mode: "advantage" | "disadvantage";
  readonly on: ReadonlyNonEmptyArray<RollKind>;
  readonly saveSourceFilter?: ReadonlyNonEmptyArray<"spell" | "magical_effect">;
}
```

### Authored subset

The current authored subset includes only the representable War Mage
benefit:

- `modify_save_dc` +2
- `modify_roll_numeric` +2 on `spell_attack_roll`

I did not force either omitted clause into a broader shape because that
would produce a misleading trace.
