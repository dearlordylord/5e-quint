# Proposal: Fighting Style (fighter L1)

## Outcome

`structural_widening` — no honest class-feature mechanics family exists.

## Why the unit doesn't fit

The only current `ClassFeatureMechanics` family is `activation`, whose header
(`ClassFeatureMechanicsHeader`) requires three fields:

| Field | What it means | What Fighting Style needs |
|---|---|---|
| `activationCost` | action economy cost to trigger | **nothing** — no activation |
| `resource` | use-count pool | **nothing** — no pool |
| `resetCadence` | short/long rest refill schedule | **nothing** — no reset |

Fighting Style grants a feat permanently at level 1. It is never "activated" in the
game-mechanics sense. Encoding it with `activationCost: free`, a dummy `resource`, and
a dummy `resetCadence` would produce a trace asserting the feature has a use-count and
a rest window — both false.

`ClassFeatureEffect` also has no variant for granting access to a feat category:
only `GrantExtraActionEffect | HealHpEffect` exist.

## Proposed widenings

### 1. New family: `passive_grant`

```typescript
export type ClassFeaturePassiveGrantMechanics = {
  readonly family: "passive_grant";
  readonly effect: ClassFeaturePassiveEffect;
};
```

For class features that are permanent, non-activated benefits acquired at a given
level. Other candidates for this family: Expertise (double proficiency bonus),
Thieves' Cant (language grant), Druidic (language grant), many species traits.

### 2. New effect variant: `grant_feat_choice`

```typescript
export type GrantFeatChoiceEffect = {
  readonly kind: "grant_feat_choice";
  readonly category: string;          // e.g. "fighting_style"
  readonly replaceableOnLevelUp: boolean;
};
```

The `category` identifies the closed set of feats the player may choose from.
`replaceableOnLevelUp` captures the swap rule.

This effect maps to the v4 `choose` procedure atom (player selects one feat from
the category at acquisition) and eventually to whatever atoms the chosen feat
carries (e.g. Defense → `modify_ac`, Archery → `modify_roll_numeric`).

### 3. The individual Fighting Style feats carry the actual atoms

The class feature itself is a feat-access grant; the mechanical atoms live in the
individual feat records (Defense, Archery, Great Weapon Fighting, Two-Weapon
Fighting). Those feats are encoded separately as `FeatRecord` (or a future
`feat_root` unit kind not yet in the surface).

## Tracer impact

With `passive_grant` + `grant_feat_choice`, a minimal trace would look like:

```
class_feature_root → passive_grant → choose → grant_feat_choice
                                               (category: fighting_style,
                                                replaceableOnLevelUp: true)
```

The `choose` atom (v4 procedure, already in taxonomy) represents the player
selecting which feat to instantiate. The `grant_feat_choice` effect node records
the category boundary and the replacement rule.

## Evidence from source text

- **Feat grant:** "gain a Fighting Style feat of your choice (see 'Feats')"
- **Replacement rule:** "Whenever you gain a Fighter level, you can replace the feat
  you chose with a different Fighting Style feat."
