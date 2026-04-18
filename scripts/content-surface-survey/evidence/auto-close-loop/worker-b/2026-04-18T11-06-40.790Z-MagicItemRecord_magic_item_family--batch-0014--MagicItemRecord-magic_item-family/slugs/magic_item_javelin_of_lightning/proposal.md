# Javelin of Lightning

## Verdict

`Javelin of Lightning` does not fit the current authored surface honestly enough to author a `content/magic_item_javelin_of_lightning.dhall` file.

The top-level kind and family do exist:

- `magic_item`
- composite mechanics with passive + activation parts
- activated part could use `activationCost = { kind = "replace_attack" }`
- fixed-DC line save with half damage on success
- dawn reset cadence

The blocker is not structure. It is missing effect vocabulary.

## Missing mechanics

### 1. Damage-type substitution on weapon hit

RAW:

> Each time you make an attack roll with this magic weapon and hit, you can have it deal Lightning damage instead of Piercing damage.

Why this is a gap:

- This is not extra damage.
- This is not a bonus to a damage roll.
- This is not spell access.
- This is not an activation with a separate resource cadence.

The current surface can modify damage numerically, but it cannot say "the hit's damage type becomes X instead of Y" for a specific weapon.

Needed widening:

- `new_atom`: `modify_damage_type`

Suggested shape:

```ts
{
  readonly kind: "modify_damage_type";
  readonly from?: DamageType;
  readonly to: DamageTypeRef;
  readonly weaponFilter?: WeaponFilter;
}
```

Why `from?` should be optional:

- Some future units may say damage becomes Lightning without naming the original type.
- This unit does name the original type, so `from: "piercing"` is useful here.

### 2. Return the thrown item to the wielder's hand

RAW:

> Immediately after dealing this damage, the weapon reappears in your hand.

Why this is a gap:

- This is deterministic item relocation.
- `teleport` is creature-targeted and not an honest fit.
- `transport_exile` is about leaving the play space, not item recovery.
- There is no item-return effect in the current effect union.

Needed widening:

- `new_atom`: `return_item_to_hand`

Suggested shape:

```ts
{
  readonly kind: "return_item_to_hand";
  readonly itemId?: string;
}
```

`itemId` can stay optional because some future surfaces may resolve the relevant item from the enclosing magic-item source node.

## What already fits

If the missing atoms existed, the `Lightning Bolt` property would fit as:

- `magic_item`
- `mechanics.family = "composite"`
- passive part for the on-hit damage-type substitution
- activation part for the bolt use:
  - `activationCost = { kind = "replace_attack" }`
  - `resource = use_count(1)`
  - `resetCadence = dawn`
  - one `save_gate` phase
  - `attachment = area`
  - `shape = line 120 ft x 5 ft`
  - `origin = self`
  - `ability = "dex"`
  - `dc = fixed 13`
  - `onFail = damage 4d6 lightning`
  - `onSuccess = half_damage`
  - follow-up `return_item_to_hand`

## Classification

Outcome: `atom_widening`

Reason:

- The families and record kind already exist.
- The required missing concepts are effect-level mechanics, not a missing top-level payload family.
