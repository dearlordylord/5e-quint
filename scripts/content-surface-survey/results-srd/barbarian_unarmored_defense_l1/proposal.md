# Proposal: Widen `modify_ac_set_base` to support multiple ability modifiers

## Unit

**Barbarian Unarmored Defense (L1)** — `class_feature`, `srd-5.2.1`

> While you aren't wearing any armor, your base Armor Class equals 10 plus your Dexterity and Constitution modifiers. You can use a Shield and still gain this benefit.

## Classification: `surface_widening`

## What fits

- `class_feature` UnitRecord kind ✓
- `passive` mechanics family ✓
- `unarmored` EquipmentPredicate ✓ — exactly the right gate
- `modify_ac_set_base` EffectAtom kind ✓ — semantically correct (set the base AC formula)

## What doesn't fit

`ModifyAcSetBaseEffect` currently has the shape:

```typescript
export type ModifyAcSetBaseEffect = {
  readonly kind: "modify_ac_set_base";
  readonly const: number;
  readonly abilityMod: Ability;  // <-- exactly one ability
};
```

Barbarian Unarmored Defense requires `10 + DEX mod + CON mod` — two additive ability modifiers. The current shape can express `10 + DEX` or `10 + CON` but not their sum. Any encoding that picks just one modifier is a dishonest trace that omits a mechanical term from the AC formula.

## Proposed widening

Widen `abilityMod` to a non-empty array:

```typescript
export type ModifyAcSetBaseEffect = {
  readonly kind: "modify_ac_set_base";
  readonly const: number;
  readonly abilityMods: ReadonlyNonEmptyArray<Ability>;  // 1..N ability modifiers summed
};
```

Single-modifier uses (Mage Armor: `10 + DEX`) become a singleton array. Existing content would need a migration from `abilityMod` to `abilityMods`.

Alternatively, add an optional second field:

```typescript
export type ModifyAcSetBaseEffect = {
  readonly kind: "modify_ac_set_base";
  readonly const: number;
  readonly abilityMod: Ability;
  readonly secondAbilityMod?: Ability;
};
```

The array form is more general and avoids an awkward `secondAbilityMod` field name.

## Encoding that would result after widening

```dhall
{ kind = "class_feature"
, id = "barbarian_unarmored_defense_l1"
, name = "Unarmored Defense"
, className = "barbarian"
, acquiredAtLevel = 1
, provenance = { kind = "srd-5.2.1", section = "Classes/Barbarian#Unarmored Defense" }
, description = "While you aren't wearing any armor, your base Armor Class equals 10 plus your Dexterity and Constitution modifiers. You can use a Shield and still gain this benefit."
, mechanics =
    { family = "passive"
    , condition = { kind = "unarmored" }
    , grants =
        [ { kind = "modify_ac_set_base"
          , const = 10
          , abilityMods = [ "dex", "con" ]
          }
        ]
    }
}
```

## Coverage of the full mechanic

| Clause | Surface coverage |
|---|---|
| "While you aren't wearing any armor" | `condition: { kind: "unarmored" }` ✓ |
| "base Armor Class equals 10 + DEX + CON" | `modify_ac_set_base` with two mods — **blocked by current single-mod shape** |
| "You can use a Shield and still gain this benefit" | Implicit in RAW AC calculation; no atom needed |

## Related pressure

**Monk Unarmored Defense** (L1): `10 + DEX + WIS`. Same shape, different second ability. A single widening of `modify_ac_set_base` covers both classes.

## v4 taxonomy impact

No new v4 atom or relation is needed. The `modify_ac` atom family already exists in the taxonomy. This is a TS surface gap only — the TS type needs to accept multiple ability modifiers where the atom semantics already permit it.
