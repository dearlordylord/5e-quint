# Proposal: Weapon Mastery (barbarian L1) — structural_widening

## Unit

- **Slug**: `barbarian_weapon_mastery_l1`
- **Kind**: `class_feature` / Barbarian L1
- **SRD section**: Classes/Barbarian#Level 1: Weapon Mastery

## Why it does not fit

The current `ClassFeatureMechanics` type has exactly one family:

```typescript
export type ClassFeatureActivationMechanics = ClassFeatureMechanicsHeader & {
  readonly family: "activation";
  readonly effect: ClassFeatureEffect;
};
```

The `ClassFeatureMechanicsHeader` mandates `activationCost`, `resource`, and `resetCadence`. Weapon Mastery has none of these: it is **always-on** from the moment it is gained at level 1. There is no action or bonus action to spend, no use-count to track, no rest to wait for before using it again. Encoding this as `activation` would require inventing fake values (e.g. `activationCost: { kind: "free" }`, `resource: { kind: "use_count", cap: { kind: "fixed", uses: 99 } }`) that have no basis in the SRD text. That is a knowingly false trace.

Additionally, the current `ClassFeatureEffect` union (`GrantExtraActionEffect | HealHpEffect`) contains nothing that models "the bearer may use mastery properties of N chosen weapon types."

## Required widenings

### 1. New family: `passive_grant`

A second `ClassFeatureMechanics` variant for features that are permanently granted at acquisition and require no activation:

```typescript
export type ClassFeaturePassiveGrantMechanics = {
  readonly family: "passive_grant";
  readonly effect: ClassFeatureEffect;  // extended — see below
};
```

No `activationCost`, `resource`, or `resetCadence` in the header. The feature is simply always available.

**Breadth**: The same family is needed for Fighter L1 Weapon Mastery, Paladin L1 Weapon Mastery, Ranger L1 Weapon Mastery, and Rogue L1 Weapon Mastery — all share the identical structural shape. This single addition unblocks at least five units.

### 2. New effect variant: `grant_mastery_access`

```typescript
export type GrantMasteryAccessEffect = {
  readonly kind: "grant_mastery_access";
  // Number of weapon types accessible; scales with class level.
  readonly count: UseCountCap | ThresholdTiers<number>;
  // Restriction on eligible weapons (e.g. "Simple or Martial Melee").
  readonly weaponCategory: WeaponCategoryRestriction;
  // Optional: mechanism for replacing one choice per rest.
  readonly swapCadence?: RestKind;
};
```

`ClassFeatureEffect` becomes `GrantExtraActionEffect | HealHpEffect | GrantMasteryAccessEffect`.

### 3. New surface type: `WeaponCategoryRestriction`

The feature restricts access to "Simple or Martial Melee weapons." No existing type encodes weapon category or attack mode. A minimal closed type:

```typescript
export type WeaponKind = "simple" | "martial";
export type WeaponAttackMode = "melee" | "ranged" | "either";

export type WeaponCategoryRestriction = {
  readonly kinds: ReadonlyArray<WeaponKind>;   // e.g. ["simple", "martial"]
  readonly attackMode: WeaponAttackMode;        // "melee"
};
```

This makes "Simple or Martial Melee only" unambiguous and unrepresentable as a mixed-provenance state.

### 4. Count scaling via `ThresholdTiers<number>`

The Barbarian Features table shows the mastery weapon count grows at specific levels. The existing `ThresholdTiers<number>` with `axis: "class"` can represent this without new surface types, but the `count` field in `GrantMasteryAccessEffect` needs to accept it.

## Authoring sketch (not executable — for reviewer)

```dhall
{ kind = "class_feature"
, id = "barbarian_weapon_mastery_l1"
, name = "Weapon Mastery"
, className = "barbarian"
, acquiredAtLevel = 1
, provenance = { kind = "srd-5.2.1", section = "Classes/Barbarian#Level 1: Weapon Mastery" }
, description = "..."
, mechanics =
    { family = "passive_grant"
    , effect =
        { kind = "grant_mastery_access"
        , count =
            { kind = "threshold_tiers"
            , axis = "class"
            , base = 2
            , tiers = [ ... per Barbarian Features table ... ]
            }
        , weaponCategory = { kinds = [ "simple", "martial" ], attackMode = "melee" }
        , swapCadence = Some "long"
        }
    }
}
```

## Tracer impact

The `class_feature_root → passive_grant` subgraph would follow a similar shape to `activation` but without the quota/resource/rest-window cluster:

```
class_feature_root --roots--> [no procedure node needed, or a 'grant' procedure atom]
                   --grants--> grant_mastery_access
                                 --modifies(?)--> scale_numeric_bonus [axis=class, for count]
```

The v4 atom `grant_proficiency` is the closest existing atom; `grant_mastery_access` is a narrower sibling that specifically refers to weapon mastery property access (distinct from proficiency bonus on attack rolls).

## Confidence

**High.** The structural mismatch is unambiguous: `activation` is the wrong family. The same pattern recurs across four other classes; the proposed widening is minimal and reusable.
