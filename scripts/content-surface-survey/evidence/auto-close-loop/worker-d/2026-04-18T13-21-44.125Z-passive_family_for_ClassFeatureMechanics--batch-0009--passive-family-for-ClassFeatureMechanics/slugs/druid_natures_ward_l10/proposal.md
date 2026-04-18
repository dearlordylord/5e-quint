# Nature's Ward (druid L10)

## Verdict

`surface_widening`

## Why it does not fit cleanly

The top-level shape fits an existing unit family:

- `kind = "class_feature"`
- mechanics family = `passive`

One half of the feature is already representable:

- `grant_condition_immunity` for `poisoned`

The other half is not honestly representable with the current surface:

- the granted resistance is not fixed;
- it is not a one-time build choice;
- it is not a cast-time choice;
- it is derived from another feature's **current** state: the druid's current land choice in Circle Spells.

`DamageTypeRef` only allows:

- a fixed `DamageType`, or
- a `CastTimeChoice<DamageType>`

Using either would misstate the rule. The resistance changes when the current land choice changes.

## Narrowest widening

Add a new `DamageTypeRef` variant, or equivalent effect-local variant on `grant_resistance`, that means:

- derive the damage type from the owner's current Circle Spells land choice using the closed Nature's Ward table.

Example shape sketch:

```ts
{
  kind: "current_land_choice_resistance",
  sourceFeature: "circle_spells",
  mapping: {
    arid: "fire",
    polar: "cold",
    temperate: "lightning",
    tropical: "poison"
  }
}
```

This is a surface widening, not an atom widening:

- the effect atom remains `grant_resistance`
- the family remains `passive`
- the missing piece is the payload shape for a runtime-projected damage type

## Evidence

> "You are immune to the Poisoned condition, and you have Resistance to a damage type associated with your current land choice in the Circle Spells feature, as shown in the Nature's Ward table."
