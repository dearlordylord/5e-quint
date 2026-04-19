# Proposal: Monk Unarmored Defense (L1)

## Outcome: `surface_widening`

## SRD Text

> While you aren't wearing armor or wielding a Shield, your base Armor Class equals 10 plus your Dexterity and Wisdom modifiers.

---

## What fits

**Kind and family**: `class_feature` / `passive` — correct. This is an always-on grant active while an equipment precondition holds.

**Equipment predicate**: The condition "not wearing armor AND not wielding a Shield" maps precisely to the existing `all_of` composition:

```dhall
condition =
  { kind = "all_of"
  , predicates =
      [ { kind = "not_wearing_armor"
        , categories = [ "light", "medium", "heavy" ]
        }
      , { kind = "not_wielding_shield" }
      ]
  }
```

Both `not_wearing_armor` and `not_wielding_shield` are live variants on `NonAlwaysEquipmentPredicate`, and the tracer handles `all_of` by emitting a `requires` edge for each predicate.

---

## What does not fit

**Atom**: `modify_ac_set_base`

The formula `10 + Dex mod + Wis mod` is a base-AC replacement — not an additive bonus to existing AC. The correct atom is `modify_ac_set_base`, which already serves Mage Armor (`13 + Dex`) and Robe of the Archmagi (set base formula while unarmored).

Current shape:

```typescript
export type ModifyAcSetBaseEffect = {
  readonly kind: "modify_ac_set_base";
  readonly const: number;
  readonly abilityMod: Ability;   // ← only one ability modifier
};
```

Monk requires **two** ability modifiers: `const = 10`, `abilityMod = "dex"`, plus `"wis"`. There is no honest workaround:

- Splitting into `modify_ac_set_base` (one mod) + `modify_ac` (second mod) misrepresents the formula as a set-then-add operation rather than a unified base replacement.
- The SRD explicitly states the entire formula is what "your base Armor Class equals" — the two modifiers are not separable layers; they are both inputs to the base.

---

## Proposed widening

**Add an optional `secondAbilityMod` field to `ModifyAcSetBaseEffect`:**

```typescript
export type ModifyAcSetBaseEffect = {
  readonly kind: "modify_ac_set_base";
  readonly const: number;
  readonly abilityMod: Ability;
  readonly secondAbilityMod?: Ability;  // NEW: for dual-modifier base formulas
};
```

All existing callers remain valid (field is optional). The tracer label would extend to `set base = 10 + DEX mod + WIS mod` when `secondAbilityMod` is present.

**This also unblocks**: Barbarian Unarmored Defense (`10 + Dex + Con`) — identical surface pressure, same proposed fix.

---

## Classification

`surface_widening` — the atom kind (`modify_ac_set_base`) exists in both the v4 taxonomy and `types.ts`; only the shape needs a new optional field. No new atom concept is required.
