## Gloves of Missile Snaring

This unit fits the existing top-level `magic_item` kind and would naturally use the `activation` family with `activationCost = { kind = "reaction", trigger = ... }`.

It does **not** fit honestly in the current surface because the primary mechanic is missing:

- The gloves reduce incoming weapon-hit damage by `1d10 + Dex modifier`.
- There is no existing `EffectAtom` for "reduce damage taken by N" or "negate some/all of the triggering hit's damage".

That is an `atom_widening`, not just a family issue.

### Missing pieces

1. `reduce_damage_taken` effect atom

Why it is needed:

- The item's core mechanic is a reactive subtraction from the damage of the triggering hit.
- Existing atoms do not model this honestly:
  - `grant_resistance` is persistent half damage, not one-shot numeric reduction.
  - `modify_ac` changes hit resolution, but the gloves trigger **after** you are hit.
  - `heal_hp` is wrong because damage prevention is not post-hit healing.

Suggested shape:

```ts
{
  kind: "reduce_damage_taken";
  amount: DiceAmount | {
    kind: "composite_bonus";
    parts: ReadonlyNonEmptyArray<
      DiceAmount | { kind: "ability_modifier"; ability: Ability }
    >;
  };
  appliesTo?: {
    kind: "triggering_hit";
  };
}
```

Evidence:

> "If you're hit by an attack roll made with a Ranged or Thrown weapon ... you can take a Reaction to reduce the damage by 1d10 plus your Dexterity modifier"

2. Trigger filter widening for `Thrown weapon`

Why it is needed:

- `ReactionTrigger.hit_by_attack_roll.weaponFilter` reuses `WeaponFilter`.
- The current `WeaponFilter` supports only `weapon_category: "melee" | "ranged"` or `specific_item`.
- The item text needs `Ranged or Thrown weapon`, and `thrown` is not representable by the current filter.

Suggested surface widening:

- Add a new `WeaponFilter` variant for thrown weapons, or
- Add a closed trigger-side variant specifically for "ranged_or_thrown_weapon".

Evidence:

> "hit by an attack roll made with a Ranged or Thrown weapon"

3. Secondary catch rider

The follow-up rider is also not representable today:

> "If you reduce the damage to 0, you can catch the ammunition or weapon if it is small enough for you to hold in that hand."

This pressures an item/object transfer or catch effect tied to the triggering projectile/weapon plus predicates for:

- `damage reduced to 0`
- `free hand`
- `small enough to hold`

That rider is secondary, but it should be recorded rather than silently dropped.
