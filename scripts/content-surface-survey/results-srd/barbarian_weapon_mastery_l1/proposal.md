# Proposal: Weapon Mastery (Barbarian L1)

**Outcome**: `atom_widening`  
**Unit**: `barbarian_weapon_mastery_l1` — `class_feature`, Barbarian L1  
**SRD section**: Classes/Barbarian#Weapon Mastery

---

## What the feature does

The feature grants three things:

1. **Mastery access (count-based)**: The barbarian may use the mastery property of N chosen weapon kinds (Simple or Martial Melee). N starts at 2 at L1 and grows per the Barbarian Features table.
2. **Rest-reconfigurable choice**: After each Long Rest the barbarian may swap one of the chosen weapon kinds for a different one.
3. **Level scaling**: The count N scales up at higher Barbarian levels (per a class table, not inlined in the source text).

---

## Why it does not fit the current surface

### Gap 1 — Missing atom: `grant_mastery_access`

The `passive` family (always-on grants) is structurally correct for this feature. The blocker is that no `EffectAtom` variant expresses "you may use the mastery property of weapons of kind X."

- `grant_proficiency` covers attack/damage eligibility for weapon categories — not mastery-property eligibility. Proficiency and mastery are mechanically distinct in SRD 5.2.1.
- Mastery properties are already modeled as `MasteryRecord` units in the system. This feature acts as a per-character "enabler" that licenses the barbarian to apply those records when they wield qualifying weapons.
- No existing atom covers this link.

**Proposed atom**:
```typescript
| {
    readonly kind: "grant_mastery_access";
    readonly count: number | ThresholdTiers<number>; // scales at higher levels
    readonly weaponKind: "simple_melee" | "martial_melee" | "simple_or_martial_melee";
    // 'choice' — player picks which N weapon kinds at level-up
  }
```

The atom would be carried in `PassiveMechanics.grants`. The tracer would emit it as a `grant` procedure → `grant_mastery_access` effect, matching the existing passive pattern.

### Gap 2 — Missing mechanism: rest-reconfigurable passive choice

The Long Rest swap ("change one of those weapon choices") is a rest-triggered partial rebuild of a passive grant parameter. The current surface models rest-triggered resource refills (`ResetCadence`) and rest-triggered full resets, but has no mechanism for reassigning one element of a multi-valued passive grant while leaving the others intact.

This is a new surface variant (not a new v4 atom in the taxonomy sense), but it would need to be expressed somewhere — possibly on `grant_mastery_access` itself:

```typescript
readonly reconfigureOnRest?: {
  readonly restKind: RestKind;   // "long"
  readonly countReplaceable: number; // 1 — can swap this many per rest
};
```

### Gap 3 — Level-scaled count (dependent on Gap 1)

The Barbarian Features table specifies that N grows at certain class levels (e.g., 2 → 3 → 4). `ThresholdTiers<number>` already exists in the surface and would express this correctly once `grant_mastery_access` exists.

---

## Encoding sketch (pending atom addition)

```dhall
{ kind = "class_feature"
, id = "barbarian_weapon_mastery_l1"
, name = "Weapon Mastery"
, className = "barbarian"
, acquiredAtLevel = 1
, provenance = { kind = "srd-5.2.1", section = "Classes/Barbarian#Weapon Mastery" }
, description = "..."
, mechanics =
    { family = "passive"
    , grants =
        [ { kind = "grant_mastery_access"   -- BLOCKED: atom not yet in surface
          , count =
              { kind = "threshold_tiers"
              , axis = "class"
              , base = 2
              , tiers = [ ... ]   -- per Barbarian Features table
              }
          , weaponKind = "simple_or_martial_melee"
          , reconfigureOnRest = { restKind = "long", countReplaceable = 1 }
          }
        ]
    }
}
```

---

## Classification

| Gap | Classification |
|-----|---------------|
| Missing `grant_mastery_access` atom | `atom_widening` — the concept is absent from the v4 taxonomy |
| Rest-reconfigurable choice mechanism | `surface_widening` — a new variant on an existing surface pattern |
| Level-scaled count | No widening needed once the atom exists (`ThresholdTiers<number>` already present) |

Primary classification: **`atom_widening`** (the atom gap blocks encoding entirely).
