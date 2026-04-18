# Proposal: Aura Expansion (Paladin L18)

## Unit

**Name:** Aura Expansion  
**Kind:** class_feature (paladin, L18)  
**Text:** "Your Aura of Protection is now a 30-foot Emanation."

## Why it doesn't fit

The `passive` family is the correct shell. The problem is that the unit's entire mechanical content is *modifying a structural parameter (area radius) of another named class feature*. The current `EffectAtom` union has no atom that:

1. References another feature by ID, and
2. Replaces or overrides one of its geometry parameters.

The existing `modify_*` atoms (`modify_ac`, `modify_speed`, `modify_roll_numeric`, `modify_save_dc`, `modify_crit_range`, `modify_damage_numeric`, `modify_ability_score`, `modify_proficiency_bonus`, `modify_max_hp`) all act on character-sheet stats — numeric or categorical values on the creature itself. None act on another feature's authored structure.

Encoding this as, say, `modify_speed` with a creative argument would be a lie that produces a misleading trace.

## Classification

`atom_widening` — a new `EffectAtom` variant is needed. The `passive` family and v4 `grant` procedure atom are sufficient; only the leaf effect atom is missing.

## Proposed widening

### New atom: `modify_feature_area`

```typescript
| {
    readonly kind: "modify_feature_area";
    readonly featureId: string;
    readonly area: AreaShapeDescriptor;
  }
```

**Justification:** Aura Expansion is not the only SRD class feature that upgrades another feature's area — this pattern recurs (e.g., monk Ki Resonation widening, ranger Deft Explorer terrain bonuses). A `featureId`-keyed area override is the minimal honest shape. It references the feature whose area is being replaced and provides the replacement descriptor using the existing `AreaShapeDescriptor` union (emanation with `radiusFeet: 30` is already expressible there).

**Intended encoding once atom exists:**

```dhall
{ kind = "class_feature"
, id = "paladin_aura_expansion_l18"
, name = "Aura Expansion"
, className = "paladin"
, acquiredAtLevel = 18
, provenance = { kind = "srd-5.2.1", section = "Classes/Paladin#Aura Expansion" }
, description = "Your Aura of Protection is now a 30-foot Emanation."
, mechanics =
    { family = "passive"
    , grants =
        [ { kind = "modify_feature_area"
          , featureId = "paladin_aura_of_protection"
          , area = { kind = "emanation", radiusFeet = 30 }
          }
        ]
    }
}
```

## Tracer impact

The tracer's `traceEffectAtom` exhaustive switch would need a new `"modify_feature_area"` case. Suggested category: `"effect"`, atomKind: `"modify_feature_area"`. The node label could read: `modify_feature_area\npaladin_aura_of_protection → emanation 30 ft`.
