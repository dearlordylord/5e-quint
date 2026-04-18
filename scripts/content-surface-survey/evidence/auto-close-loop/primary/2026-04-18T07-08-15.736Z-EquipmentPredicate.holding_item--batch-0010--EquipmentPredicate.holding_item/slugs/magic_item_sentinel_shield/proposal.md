# Sentinel Shield

## Verdict

`surface_widening`

## Why It Does Not Fit Cleanly

`Sentinel Shield` is a `magic_item` with `PassiveMechanics`, and its two mechanical riders already fit existing effect atoms:

- `modify_roll_advantage` on `initiative`
- `modify_roll_advantage` on `ability_check` with `skillFilter = { kind = "fixed", skills = ["perception"] }`

The blocker is the gate:

> "While holding this Shield, you have Advantage on Initiative rolls and Wisdom (Perception) checks."

The current passive gating vocabulary in `EquipmentPredicate` can express:

- `always`
- `wearing_armor`
- `wielding_weapon`

It cannot express holding a non-weapon item, and a shield is not honestly representable as any existing variant:

- `always` is false, because the benefit is conditional on holding.
- `wearing_armor` is false, because the item is a shield, not armor in the current predicate grammar.
- `wielding_weapon` is false, because the item is not a weapon.

## Narrowest Honest Widening

Add a new `EquipmentPredicate` variant for held items, for example:

```ts
| {
    readonly kind: "holding_item";
    readonly itemKind: "shield" | ...;
  }
```

The minimal pressure here is specifically `shield`; a more general held-item predicate may be preferable if other items need the same gate.

## Why This Is Not Atom Widening

No new v4 effect atom is required. The unit's mechanics are already covered by existing atoms in the surface:

- advantage on initiative
- advantage on a filtered skill check

Only the surface shape for the passive condition is missing.
