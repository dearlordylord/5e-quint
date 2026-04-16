# Proposal: structural_widening — Ability Score Improvement (druid L4)

## Unit

- **Slug:** `druid_ability_score_improvement_l4`
- **Kind:** `class_feature`
- **Source:** SRD 5.2.1, Classes/Druid#Level 4: Ability Score Improvement

## Source text

> You gain the Ability Score Improvement feat (see "Feats") or another feat of your choice for which you qualify. You gain this feature again at Druid levels 8, 12, and 16.

## Why no honest encoding exists

### The `activation` family shape is wrong

The only existing `ClassFeatureMechanics` family is `activation`, modeled by `ClassFeatureActivationMechanics`:

```typescript
type ClassFeatureActivationMechanics = ClassFeatureMechanicsHeader & {
  readonly family: "activation";
  readonly effect: ClassFeatureEffect;
};

type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: UseCountResource;
  readonly resetCadence: RestResetCadence;
};
```

Every field is wrong for ASI:

| Field | What `activation` models | What ASI is |
|---|---|---|
| `activationCost` | In-game action cost (free / bonus action) | No in-game cost — applied once at level-up |
| `resource` | Use-count pool (1 use, 2 uses, …) | No pool — permanently consumed on acquisition |
| `resetCadence` | Short rest / long rest refill | Never resets — one-time permanent grant |
| `effect` | `grant_extra_action` \| `heal_hp` | Neither — needs `grant_feat` |

### No matching `ClassFeatureEffect`

The current union is:
```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

The needed effect — "permanently grant a feat choice" — doesn't exist. `grant_extra_action` models an extra in-combat action; `heal_hp` models HP restoration. Neither is remotely related to feat advancement.

### TAXONOMY §12 acknowledgment

The v4 taxonomy explicitly defers `modify_ability_score` as out-of-scope:

> `modify_ability_score` as a runtime effect versus as pre-runtime character state (currently treated as out-of-scope).

This confirms the gap is known and intentional — the current model treats ability score advancement as pre-runtime character state, outside the core mechanics graph.

## Proposed widening

### 1. New family: `permanent_progression`

A new `ClassFeatureMechanics` family for features that apply once at level-up and permanently modify the character. Shape sketch:

```typescript
type PermanentProgressionMechanics = {
  readonly family: "permanent_progression";
  readonly effect: PermanentProgressionEffect;
  readonly recurrence?: ReadonlyArray<number>; // levels at which this feature repeats
};
```

The `recurrence` field captures the SRD note "You gain this feature again at Druid levels 8, 12, and 16."

### 2. New effect atom: `grant_feat`

A new `PermanentProgressionEffect` variant (and v4 atom) for feat grants:

```typescript
type GrantFeatEffect = {
  readonly kind: "grant_feat";
  readonly default: string;   // feat id, e.g. "ability_score_improvement"
  readonly alternatives: "any_qualifying"; // or a closed list
};
```

The tracer would emit a `grant_feat` atom with a `roots` edge from `class_feature_root`.

## Scope

This widening affects every class ASI feature in the SRD:
- Barbarian L4/8/12/16/19
- Bard L4/8/12/16/19
- Cleric L4/8/12/16/19
- Druid L4/8/12/16/19
- Fighter L4/6/8/12/14/16/19
- Monk L4/8/12/16/19
- Paladin L4/8/12/16/19
- Ranger L4/8/12/16/19
- Rogue L4/8/10/12/16/19
- Sorcerer L4/8/12/16/19
- Warlock L4/8/12/16/19
- Wizard L4/8/12/16/19

A single `permanent_progression` family + `grant_feat` atom resolves all of them uniformly.

## Classification

`structural_widening` — the shape of the existing `activation` family is categorically incompatible with permanent character advancement mechanics.
