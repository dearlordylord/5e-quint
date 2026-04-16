# Proposal: Heroic Warrior (Fighter L10)

## Outcome: `structural_widening`

No content file authored. The unit cannot be honestly encoded with the current surface.

---

## The mechanic

> During combat, you can give yourself Heroic Inspiration whenever you start your turn without it.

Three components:

| Component | Description |
|---|---|
| Trigger | Automatic — fires at the start of the fighter's turn during combat |
| Condition | Guard: only fires if the fighter does not already have Heroic Inspiration |
| Effect | Grants Heroic Inspiration (meta-resource: reroll any one die) |

---

## Why the current surface cannot encode this

### 1. `ClassFeatureMechanicsHeader` requires fields that don't apply

```typescript
type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;  // N/A — not activated
  readonly resource: UseCountResource;                   // N/A — unlimited
  readonly resetCadence: RestResetCadence;               // N/A — no rest reset
};
```

Heroic Warrior has:
- **No activationCost** — the feature fires automatically, not by player choice. `{ kind: "free" }` means "activated for free", which is still activated; this feature is passive.
- **No UseCountResource** — there is no pool to track. The feature fires every turn without limit.
- **No RestResetCadence** — there is nothing to refill.

All three required fields would be fabrications.

### 2. No trigger field in any class-feature family

The existing `activation` family has no way to express "fires when a `turn_start_window` occurs, guarded by a state condition (lacks Heroic Inspiration)." The trigger is part of the mechanics shape, not expressible as an activation cost.

### 3. The effect is not in v4 taxonomy

`ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect`

Granting Heroic Inspiration is neither. The v4 atom inventory has no `grant_heroic_inspiration` or general `grant_meta_resource` atom.

---

## Required widenings

### Widening 1: New class-feature family `passive_trigger`

A `passive_trigger` family (or equivalent name) for features that:

- Auto-fire on a game window (e.g., `turn_start_window`, `turn_end_window`, `rest_window`) without explicit player activation
- Have no use-count resource — unlimited firing
- May carry a state guard (e.g., "if you lack X")

Minimal shape sketch:

```typescript
export type ClassFeaturePassiveTriggerMechanics = {
  readonly family: "passive_trigger";
  readonly triggerWindow: TurnStartWindow | TurnEndWindow | ...;
  readonly guard?: StateGuard;  // e.g., "lacks_heroic_inspiration"
  readonly effect: ClassFeatureEffect;  // widened — see below
};
```

Candidate units driving this pressure:
- **Heroic Warrior** (Fighter L10) — grants Heroic Inspiration at turn start if lacking it
- Likely: **Survivor** (Fighter L18, SRD) — regains HP at turn start if below half HP (similar pattern)
- Likely: **Feral Instinct** (Barbarian L7) — advantage on initiative (also a passive, though init-window)

### Widening 2: New effect atom `grant_heroic_inspiration`

The effect payload for Heroic Warrior. Heroic Inspiration is defined in SRD 5.2.1 Playing-the-Game as a meta-resource allowing one die reroll.

```typescript
export type GrantHeroicInspirationEffect = {
  readonly kind: "grant_heroic_inspiration";
  readonly target: "self";
};
```

This should be added to `ClassFeatureEffect` (and possibly the broader `Effect` union if spells/items can also grant it).

**v4 taxonomy impact:** `grant_heroic_inspiration` would be a new effect atom. It fits the same structural slot as `grant_proficiency` or `grant_sense` — a bounded meta-resource grant.

---

## What to keep from existing surface

- The `class_feature_root` source atom is correct.
- The `turn_start_window` window atom (already in v4) is the right trigger hook.
- The `activate` procedure atom is NOT the right hook — do not reuse it.

---

## Confidence

**High.** Every component of the feature is unambiguously outside the current surface. No creative interpretation of `activation` + `{ kind: "free" }` yields an honest trace.
