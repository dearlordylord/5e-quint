# Proposal: warlock_epic_boon_l19

## Outcome: `structural_widening`

## Unit

**Epic Boon (warlock L19)** — `class_feature`, warlock, acquiredAtLevel 19.

> "You gain an Epic Boon feat (see 'Feats') or another feat of your choice for which you qualify. Boon of Fate is recommended."

## Why it does not fit

### Gap 1 — No family for permanent character-progression grants

The only existing `ClassFeatureMechanics` family is `activation`:

```typescript
export type ClassFeatureActivationMechanics = ClassFeatureMechanicsHeader & {
  readonly family: "activation";
  readonly effect: ClassFeatureEffect;
};
```

where `ClassFeatureMechanicsHeader` requires:

```typescript
type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: UseCountResource;
  readonly resetCadence: RestResetCadence;
};
```

All three fields are inapplicable to Epic Boon:

| Field | What activation requires | What Epic Boon is |
|---|---|---|
| `activationCost` | a per-use cost (free / bonus_action) | not applicable — no activation occurs |
| `resource` | a use-count pool that depletes | not applicable — acquired once, permanently |
| `resetCadence` | a rest that refills the pool | not applicable — there is no pool |

Epic Boon is a **one-time permanent acquisition** at level-up. It is not a repeatable activated feature. Forcing it into `activation` would require inventing fake values for all three header fields — a dishonest trace.

### Gap 2 — No `grant_feat` effect in `ClassFeatureEffect`

Even if a suitable family existed, `ClassFeatureEffect` has no variant for feat acquisition:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

A feat grant is a permanent character ability acquisition — categorically distinct from granting an extra action or healing HP.

## Cross-class scope

This is not a warlock-specific gap. Every class has a Level 19 Epic Boon feature with the identical mechanic:

- barbarian L19, bard L19, cleric L19, druid L19, fighter L19
- monk L19, paladin L19, ranger L19, rogue L19, sorcerer L19
- warlock L19, wizard L19

All twelve are blocked by the same structural gap. Any widening that resolves this unit resolves all twelve.

## Proposed widening

### Option A — New family: `permanent_grant`

Add a new `ClassFeatureMechanics` family for permanent level-up acquisitions:

```typescript
export type PermanentGrantMechanics = {
  readonly family: "permanent_grant";
  readonly grant: PermanentGrantEffect;
};

export type PermanentGrantEffect =
  | { readonly kind: "grant_feat"; readonly category: "epic_boon" | "general" }
  | /* ... other permanent grants as pressure warrants ... */;

export type ClassFeatureMechanics =
  | ClassFeatureActivationMechanics
  | PermanentGrantMechanics;
```

This keeps the shape honest: no activation cost, no resource, no reset cadence — because none of those concepts apply.

### Option B — Narrow `grant_feat` effect on existing activation family

Force Epic Boon into `activation` with `activationCost: { kind: "free" }`, a dummy resource, and a dummy cadence, and add `grant_feat` to `ClassFeatureEffect`. This is dishonest: the tracer would emit `activate → consumes use_count → rest_window` for a feature that has no use count and never resets. **Not recommended.**

## Recommendation

Option A (new family). The `permanent_grant` family is the honest representation. The mechanic is character-progression metadata, not a runtime-activatable feature. The tracer's graph for this family would be minimal: `class_feature_root → permanent_grant → grant_feat`. No resource or window atoms needed.

## Atoms/relations that would become reachable

- New source atom: `class_feature_root` (already exists — no change)
- New procedure atom: `permanent_grant` (or reuse `grant` from v4 procedure atoms — `grant` is already in the inventory)
- New effect variant: `grant_feat`
- Relations: `roots`, `grants` (both already exist)

If `grant` (already in v4) is used as the procedure atom rather than a new `permanent_grant`, the only new element is the `grant_feat` effect variant — reducing the widening from `structural` to `atom_widening`. However, the family shape itself still needs to be added to `ClassFeatureMechanics`, which is a surface change.
