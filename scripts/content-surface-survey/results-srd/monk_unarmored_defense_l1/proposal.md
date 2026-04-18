# Proposal: surface_widening for Monk Unarmored Defense (L1)

## Unit

**Monk Unarmored Defense (L1)** — `class_feature`, `srd-5.2.1`

> While you aren't wearing armor or wielding a Shield, your base Armor Class equals 10 plus your Dexterity and Wisdom modifiers.

## Family fit

The unit is clearly `family: "passive"` with:
- An `EquipmentPredicate` condition (the "while you aren't wearing armor or wielding a Shield" gate)
- A `modify_ac_set_base`-style effect (10 + DEX + WIS)

Both the `passive` family and the `class_feature` kind exist. Neither is missing. The gaps are in the surface types used within that family.

## Gap 1: Missing `not_wielding_shield` EquipmentPredicate variant

**RAW:** "while you aren't wearing armor **or wielding a Shield**"

The condition has two requirements:
1. Not wearing armor — covered by `{ kind: "unarmored" }`
2. Not wielding a Shield — **no predicate exists**

A shield is not a weapon, so `wielding_weapon` doesn't apply. The `all_of` combinator exists but needs both parts. The `unarmored` sentinel cannot be widened to include shield-avoidance without breaking Barbarian Unarmored Defense, which reads "while you aren't wearing any armor" — no shield restriction.

### Proposed widening

Add to `NonAlwaysEquipmentPredicate`:

```typescript
| { readonly kind: "not_wielding_shield" }
```

The condition for Monk Unarmored Defense would then be:

```typescript
condition: {
  kind: "all_of",
  predicates: [
    { kind: "unarmored" },
    { kind: "not_wielding_shield" }
  ]
}
```

This widening also covers any future feature gated on not holding a shield specifically.

## Gap 2: `modify_ac_set_base` supports only one ability modifier

**RAW:** "base Armor Class equals 10 plus your **Dexterity and Wisdom** modifiers"

The current type:

```typescript
export type ModifyAcSetBaseEffect = {
  readonly kind: "modify_ac_set_base";
  readonly const: number;
  readonly abilityMod: Ability;  // singular
};
```

Monk needs 10 + DEX + WIS — two ability modifiers in the base formula.

### Why composition doesn't work

Composing `modify_ac_set_base { const: 10, abilityMod: "dex" }` plus `modify_ac { delta: +WIS mod }` is numerically equivalent but semantically incorrect. The two atoms express different things:

- `modify_ac_set_base` replaces the base AC formula entirely
- `modify_ac` adds an additive bonus on top of whatever the base is

If a spell or feature later reads or replaces the base AC (e.g., Mage Armor would say "your base AC is 13 + DEX, regardless"), the composition gives the wrong result. The monk's formula is a unified replacement of the base; the WIS bonus is not a floating addend.

### Proposed widening

Option A — add a second optional ability modifier field:

```typescript
export type ModifyAcSetBaseEffect = {
  readonly kind: "modify_ac_set_base";
  readonly const: number;
  readonly abilityMod: Ability;
  readonly abilityMod2?: Ability;  // new: second optional modifier
};
```

Option B — generalize to a list (more flexible but changes existing call sites):

```typescript
export type ModifyAcSetBaseEffect = {
  readonly kind: "modify_ac_set_base";
  readonly const: number;
  readonly abilityMods: ReadonlyNonEmptyArray<Ability>;
};
```

Option A is the minimal widening consistent with the "widen on demand" principle. Option B would unify Barbarian (CON) and Monk (DEX + WIS) cases under the same shape and eliminate the implicit "always includes DEX" assumption baked into the current single-modifier design.

**Note:** Barbarian Unarmored Defense ("10 + DEX + CON") faces the identical gap and would benefit from the same widening.

## Encoding once both gaps are filled

```dhall
{ kind = "class_feature"
, id = "monk_unarmored_defense_l1"
, name = "Unarmored Defense"
, className = "monk"
, acquiredAtLevel = 1
, provenance = { kind = "srd-5.2.1", section = "Classes/Monk#Unarmored Defense" }
, description = "While you aren't wearing armor or wielding a Shield, your base Armor Class equals 10 plus your Dexterity and Wisdom modifiers."
, mechanics =
    { family = "passive"
    , condition =
        { kind = "all_of"
        , predicates =
            [ { kind = "unarmored" }
            , { kind = "not_wielding_shield" }   -- Gap 1
            ]
        }
    , grants =
        [ { kind = "modify_ac_set_base"
          , const = 10
          , abilityMod = "dex"
          , abilityMod2 = "wis"                  -- Gap 2
          }
        ]
    }
}
```

## Classification

`surface_widening` — both missing pieces are variants of existing surface types. No new v4 atoms or mechanics families are required.
