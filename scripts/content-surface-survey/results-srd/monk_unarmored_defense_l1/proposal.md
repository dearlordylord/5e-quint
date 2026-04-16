# Proposal: Widening for Monk Unarmored Defense (L1)

## Unit

**Name:** Unarmored Defense (Monk L1)  
**Slug:** `monk_unarmored_defense_l1`  
**Kind:** `class_feature`  
**Source:** SRD 5.2.1, Classes/Monk#Level 1: Unarmored Defense

> While you aren't wearing armor or wielding a Shield, your base Armor Class equals 10 plus your Dexterity and Wisdom modifiers.

## Why it does not fit

### 1. No passive family for class features

`ClassFeatureMechanics` currently has exactly one family: `activation`. That family requires:
- `activationCost` — how the feature is triggered (bonus action, free, etc.)
- `resource` — a `UseCountResource` (how many uses remain)
- `resetCadence` — when uses refill (rest, long rest, etc.)
- `effect` — what happens when activated

Unarmored Defense has **none of these**. It is not activated. It has no use count. It has no reset cadence. It is a persistent passive modifier that applies continuously under a condition. Encoding it as `activation` with `activationCost: free` and `resource: { cap: { kind: "fixed", uses: 1 } }` would be dishonest — it would imply the monk chooses to activate the feature once per rest, which is false.

**Required widening:** A new `ClassFeatureMechanics` family — tentatively `passive` or `inherent` — that takes only a condition predicate and an effect, with no activation/resource/reset fields.

### 2. No formula-based base AC effect

The existing effect types in `ClassFeatureEffect` are:
- `grant_extra_action` — grants an extra standard action
- `heal_hp` — restores hit points

Neither applies. The closest related atom in the surface is `modify_ac` in `ReactionEffect`, but that takes a flat integer delta (e.g., `+5` for Shield). Unarmored Defense does not modify an existing AC by a delta — it **replaces the base AC formula** with `10 + DEX mod + WIS mod`.

The distinction matters mechanically:
- A delta stacks with the base AC; a formula replacement sets it absolutely.
- The formula references two named ability modifiers, not a constant.
- Different class features use different modifiers (Barbarian uses CON + DEX; Monk uses WIS + DEX).

**Required widening:** A new `ClassFeatureEffect` variant — tentatively `set_base_ac_formula` — that takes:
- A base integer (10 for both Monk and Barbarian variants)
- A list of `Ability` references to sum as modifiers

### 3. No equipment-state condition predicate

The passive AC formula only applies "while you aren't wearing armor or wielding a Shield." This condition needs to be expressible in the surface so the engine knows when to apply it.

No existing surface type represents equipment-state predicates. `ReactionTrigger` is the closest grammar, but it covers event-driven triggers (being hit, being targeted), not persistent equipment states.

**Required widening:** A new predicate type — tentatively `EquipmentCondition` — for passive features that gate on whether the creature is wearing/not wearing armor or wielding/not wielding specific item categories. Minimum vocabulary:
- `not_wearing_armor`
- `not_wielding_shield`
- Combinable with `all_of` for conjunction

## Proposed schema sketch

```typescript
// New family
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive";
  readonly condition?: PassiveCondition;   // optional — some passives are unconditional
  readonly effect: ClassFeaturePassiveEffect;
};

// New condition predicate
export type PassiveCondition =
  | { readonly kind: "not_wearing_armor" }
  | { readonly kind: "not_wielding_shield" }
  | { readonly kind: "all_of"; readonly conditions: ReadonlyArray<PassiveCondition> };

// New passive effect (separate from ClassFeatureEffect which is activation-scoped)
export type ClassFeaturePassiveEffect =
  | { readonly kind: "set_base_ac_formula"; readonly base: number; readonly addModifiers: ReadonlyArray<Ability> }
  | /* future: grant_resistance, modify_speed, etc. */;
```

### Example encoding (sketch)

```dhall
{ kind = "class_feature"
, id = "monk_unarmored_defense_l1"
, name = "Unarmored Defense"
, className = "monk"
, acquiredAtLevel = 1
, provenance = { kind = "srd-5.2.1", section = "Classes/Monk#Level 1: Unarmored Defense" }
, description = "While you aren't wearing armor or wielding a Shield, your base Armor Class equals 10 plus your Dexterity and Wisdom modifiers."
, mechanics =
    { family = "passive"
    , condition =
        { kind = "all_of"
        , conditions =
            [ { kind = "not_wearing_armor" }
            , { kind = "not_wielding_shield" }
            ]
        }
    , effect =
        { kind = "set_base_ac_formula"
        , base = 10
        , addModifiers = [ "dex", "wis" ]
        }
    }
}
```

## Cross-unit pressure

This pattern recurs immediately:
- **Barbarian Unarmored Defense (L1):** same shape, different modifiers (`10 + DEX + CON`)
- Any future unarmored-specialist passive AC feature

Both units block on the same widening. The `passive` family and `set_base_ac_formula` effect should be designed together with both in mind to avoid a third widening pass when Barbarian is encoded.

## v4 atom impact

The tracer would need a new atom or reuse of `modify_ac` with a subkind. Per the TAXONOMY, `modify_ac` is already in the v4 effect inventory. The question is whether `set_base_ac_formula` is a variant of `modify_ac` or a distinct atom. Given that the mathematical operation is different (set vs. delta), and that the inputs differ (ability references vs. flat integer), this is more honestly a new atom — tentatively `set_base_ac` or `define_ac_formula`.
