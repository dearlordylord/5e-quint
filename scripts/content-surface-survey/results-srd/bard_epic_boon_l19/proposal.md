# Proposal: structural_widening — Epic Boon (bard L19)

## Unit

- Slug: `bard_epic_boon_l19`
- Kind: `class_feature` (bard, acquired at level 19)
- Source: SRD 5.2.1, Classes/Bard §Level 19: Epic Boon

## Why the unit does not fit

### 1. No honest class-feature family

The current `ClassFeatureMechanics` union has exactly one member:

```
ClassFeatureActivationMechanics (family: "activation")
  activationCost: ClassFeatureActivationCost   // "free" | "bonus_action"
  resource:       UseCountResource              // use_count with a cap
  resetCadence:   RestResetCadence             // short | long | etc.
  effect:         ClassFeatureEffect
```

Epic Boon is a **permanent, passive level-up acquisition**:

- No activation event (the feat is simply present once you reach level 19).
- No use count — you do not "spend" the feature and it cannot be exhausted.
- No reset cadence — nothing to refill; the feat is permanent.

Forcing this into `activation` would require inventing a `use_count` cap and a `resetCadence` that have no basis in the SRD text. That is a false trace.

### 2. No honest effect atom

`ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect`.

The effect here is "grant a feat" — access to an entire other `UnitRecord`. No existing effect atom in the surface types or the v4 taxonomy covers this. The closest v4 atoms are `grant_proficiency` and `grant_spell_access`, but both operate at the level of a single rule affordance, not at the level of handing the character a whole independent mechanics unit.

## Proposed widenings

### W1: New class-feature family — `passive_grant`

A second family for `ClassFeatureMechanics` that encodes permanently-acquired abilities with no runtime toggle:

```typescript
export type ClassFeaturePassiveGrantMechanics = {
  readonly family: "passive_grant";
  readonly effect: ClassFeaturePassiveEffect;
};
```

No `activationCost`, no `resource`, no `resetCadence`. The grant fires once at the level-up boundary and persists for the character's lifetime.

This family would also cover analogous passive-grant features across the SRD:
- All 12 classes have an identical Epic Boon entry at level 19.
- Other candidates: Magical Secrets (bard L10), Expertise grants (bard L2, rogue L1/L9), Weapon Mastery (fighter/barbarian/paladin/ranger/rogue L1) — all share the "you permanently gain X" structure with no activation toggle.

### W2: New effect atom — `grant_feat`

```typescript
export type GrantFeatEffect = {
  readonly kind: "grant_feat";
  readonly constraint: "epic_boon_only" | "any_qualifying" | null;
  readonly recommended?: string; // e.g. "boon_of_spell_recall"
};
```

The `constraint` field captures that Epic Boon restricts to Epic Boon feats (or any feat for which the character qualifies, depending on interpretation). The optional `recommended` field records the SRD's editorial guidance without making it a hard rule.

This atom would live in a new `ClassFeaturePassiveEffect` union alongside any other passive-grant effect kinds as they are needed.

## v4 taxonomy impact

`grant_feat` is not in the v4 effect inventory. It would be a new atom under §9 Effect Atoms. The `passive_grant` family would require no new atoms beyond the effect atom itself — it uses the existing `class_feature_root` source atom and the existing `activate`-less procedure path (the tracer would need a new branch, but no new window/resolution/lifecycle atoms are forced).

## Scope note

This widening is not bard-specific. The same structural gap applies to every class's L19 Epic Boon entry and to any other SRD feature with the "you permanently gain X" shape. Resolving it once for this unit resolves it for all analogous units.
