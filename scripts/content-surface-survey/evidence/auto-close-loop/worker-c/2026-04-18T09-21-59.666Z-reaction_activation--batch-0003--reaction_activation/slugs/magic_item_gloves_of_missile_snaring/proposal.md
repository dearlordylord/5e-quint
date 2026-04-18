`Gloves of Missile Snaring` mostly fits the existing `magic_item` + `triggered_reaction` surface, but not honestly enough to author a `.dhall` record yet.

The reaction shell is already present:

- `MagicItemRecord` exists.
- `TriggeredReactionAbilityMechanics` exists.
- `ReactionTrigger.hit_by_attack_roll` exists.
- The trigger narrowing `"Ranged or Thrown weapon"` can be expressed as `any_of`:
  - `hit_by_attack_roll` with `weaponFilter = { kind = "weapon_category", category = "ranged" }`
  - `hit_by_attack_roll` with `weaponFilter = { kind = "weapon_property", property = "thrown" }`
- `reduce_damage_taken` already exists as an effect atom.

The blocker is the reduction amount:

- RAW: "reduce the damage by 1d10 plus your Dexterity modifier"
- `reduce_damage_taken.amount` is a `DiceAmount`.
- `DiceAmount.fixed` only allows `DiceExpr`, and `DiceExpr` only supports:
  - dice
  - flat
  - `spellcastingMod`
- There is no way to say "add Dexterity modifier" for a non-spell item reaction.

This is a `surface_widening`, not an `atom_widening`:

- The item does not need a new family.
- The item does not need a new effect atom for the main mechanic.
- It needs a new variant or field on the existing amount grammar so fixed dice expressions can add a named ability modifier.

Suggested widening:

- Add an ability-modifier addend to fixed amount expressions used by `DiceAmount`.
- One plausible shape:

```ts
type DiceExpr = {
  readonly dice: number;
  readonly dieSize: number;
  readonly flat?: number;
  readonly spellcastingMod?: true;
  readonly abilityMod?: Ability;
};
```

or, if the repo wants to keep spellcasting-specific and named-ability addends disjoint:

```ts
type DiceExpr =
  | {
      readonly dice: number;
      readonly dieSize: number;
      readonly flat?: number;
      readonly spellcastingMod?: true;
    }
  | {
      readonly dice: number;
      readonly dieSize: number;
      readonly flat?: number;
      readonly abilityMod: Ability;
    };
```

There is a second surface gap on the activation gate:

- RAW: "if you have a free hand"
- Current item conditions can express wearing / holding / wielding / armor state, but not an empty-hand requirement.
- That points to a second `surface_widening`, likely a new `EquipmentPredicate.free_hand` or equivalent activation precondition.

Secondary omitted rider:

- RAW: "If you reduce the damage to 0, you can catch the ammunition or weapon if it is small enough for you to hold in that hand."
- I did not treat this as the primary blocker because the unit already fails on the main reduction payload.
- This rider is not representable in the current authored surface either. It likely needs either:
  - a new item/object transfer effect atom, or
  - explicit caller-owned handling if inventory capture is intentionally outside core mechanics.

Because the main reduction amount cannot be authored honestly today, no `content/magic_item_gloves_of_missile_snaring.dhall` was written.
