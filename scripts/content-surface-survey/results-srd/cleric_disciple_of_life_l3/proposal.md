# Proposal: Disciple of Life (cleric L3) — structural_widening

## Unit

**Name:** Disciple of Life (cleric L3)  
**Kind:** class_feature  
**Provenance:** srd-5.2.1, Classes/Cleric#Level 3: Disciple of Life

## Rule text

> When a spell you cast with a spell slot restores Hit Points to a creature, that creature regains additional Hit Points on the turn you cast the spell. The additional Hit Points equal 2 plus the spell slot's level.

## Why encoding fails

### Gap 1 — No passive family for ClassFeatureMechanics (structural)

The surface defines exactly one class-feature mechanics family:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
// family: "activation"
```

`ClassFeatureActivationMechanics` requires three fields that Disciple of Life does not have:

| Field | Required by surface | Disciple of Life |
|---|---|---|
| `activationCost` | yes | absent — passive, no cost |
| `resource` (use_count) | yes | absent — unlimited uses |
| `resetCadence` | yes | absent — no rest reset |

Disciple of Life is an always-on passive modifier. It fires automatically on every qualifying spell cast with no player choice and no resource expenditure. There is no honest way to fill in `activationCost`, `resource`, or `resetCadence` for this feature.

### Gap 2 — No "augment spell heal" effect type (surface)

The existing `ClassFeatureEffect` union is:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

- `GrantExtraActionEffect` — grants an additional action. Inapplicable.
- `HealHpEffect` — the *feature itself* is the source of healing (Second Wind, Divine Spark). The feature rolls or delivers HP directly.

Disciple of Life does neither. It *modifies the healing output of a spell the cleric casts* — it is a rider on someone else's heal, not a standalone heal. The distinction matters:

- Second Wind: `heal_hp` effect, activation cost = free, use_count = 1/rest. The feature *is* the heal.
- Disciple of Life: the feature *augments* a Cure Wounds, Healing Word, etc. by 2 + slot_level. The heal belongs to the spell; the feature contributes a bonus.

No existing effect type captures this.

## Proposed widening

### 1. New family: `passive_trigger`

Add a second `ClassFeatureMechanics` family for class features that are always-on and fire on an external triggering condition:

```typescript
export type ClassFeaturePassiveTriggerMechanics = {
  readonly family: "passive_trigger";
  readonly trigger: ClassFeaturePassiveTrigger;
  readonly effect: ClassFeaturePassiveEffect;
};
```

Where `ClassFeaturePassiveTrigger` is a closed grammar of conditions (e.g., `spell_cast_with_slot_heals`).

### 2. New effect variant: `augment_spell_heal`

Add a new `ClassFeatureEffect` variant (or new `ClassFeaturePassiveEffect` type) for "add bonus HP to healing done by a spell cast with a slot":

```typescript
export type AugmentSpellHealEffect = {
  readonly kind: "augment_spell_heal";
  readonly bonus: LinearPerLevel<number>;  // axis: "slot", base: 2, perLevel: 1, startingAtLevel: 1
};
```

The slot-level scaling formula `2 + slot_level` is already expressible with `LinearPerLevel<number>` (axis = `"slot"`, base = 2, perLevel = 1, startingAtLevel = 1). No new scaling infrastructure is needed.

## What a clean encoding would look like

```dhall
{ kind = "class_feature"
, id = "cleric_disciple_of_life_l3"
, name = "Disciple of Life"
, className = "cleric"
, acquiredAtLevel = 3
, provenance = { kind = "srd-5.2.1", section = "Classes/Cleric#Level 3: Disciple of Life" }
, description = "When a spell you cast with a spell slot restores Hit Points to a creature..."
, mechanics =
    { family = "passive_trigger"
    , trigger = { kind = "spell_cast_with_slot_heals" }
    , effect =
        { kind = "augment_spell_heal"
        , bonus =
            { kind = "linear_per_level"
            , axis = "slot"
            , base = 2
            , perLevel = 1
            , startingAtLevel = 1
            }
        }
    }
}
```

## v4 atom impact

The passive_trigger family maps to existing v4 atoms:
- `class_feature_root` (source) — exists
- `activate` procedure — would need a passive variant, or reuse with a `passive: true` flag
- trigger condition — maps to a new `spell_cast_window` variant (already exists in v4 window atoms, but needs a healing-specific filter)
- `heal` effect atom (exists) + `scale_numeric_bonus` (exists)

The primary gap at the atom level is a *labeled subgraph shape* for "passive class feature triggered by spell cast" rather than individual atom gaps. The `augment_spell_heal` effect composes from existing `heal` + `scale_numeric_bonus`.
