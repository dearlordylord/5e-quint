# Scimitar of Speed

Outcome: `atom_widening`

`Scimitar of Speed` fits the existing `magic_item` top-level kind and broadly wants the `passive` family, but it does not fit honestly today.

## Why it fails

The item has two mechanics:

1. `+2` to attack rolls and damage rolls made **with this magic weapon**.
2. One attack with it as a **Bonus Action** on each of your turns.

The first mechanic almost fits existing atoms:

- `modify_roll_numeric` can model attack-roll bonuses.
- `modify_damage_numeric` can model damage-roll bonuses.

But both only support the current `WeaponFilter` shape:

- `{ kind: "weapon_category", category: "melee" | "ranged" }`

That is too coarse. Authoring this as `melee` would incorrectly buff all melee weapons, not this scimitar alone.

The second mechanic does not fit any current atom honestly:

- `grant_extra_action` is wrong, because the item does **not** grant an additional Action.
- `activation` mechanics are wrong, because the bonus-action attack is not a separately recharging activated ability with an item resource.
- No existing atom grants a bounded weapon attack permission in the Bonus Action economy.

## Required widenings

### 1. Surface widening: specific-weapon scoping

Add a narrower filter so passive roll and damage modifiers can apply to the enclosing weapon item only.

Candidate shape:

```ts
type WeaponFilter =
  | { readonly kind: "weapon_category"; readonly category: "melee" | "ranged" }
  | { readonly kind: "specific_item"; readonly itemId: string }
```

Pressure text:

> "You gain a +2 bonus to attack rolls and damage rolls made with this magic weapon."

### 2. Atom widening: bonus-action attack permission

Add a new effect atom for the recurring permission to make one attack with the item as a Bonus Action on each of your turns.

Candidate direction:

```ts
{
  readonly kind: "grant_bonus_action_attack";
  readonly count: 1;
  readonly weaponFilter: { readonly kind: "specific_item"; readonly itemId: string };
}
```

Pressure text:

> "In addition, you can make one attack with it as a Bonus Action on each of your turns."

## Why no placeholder content file was authored

Any authored `content/magic_item_scimitar_of_speed.dhall` would have to lie in at least one of these ways:

- broaden the +2 bonus to all melee attacks/damage;
- represent the bonus-action attack as `grant_extra_action`;
- represent it as a fake activated ability with a made-up resource model.

That would produce a misleading trace, so the correct outcome is a widening proposal only.
