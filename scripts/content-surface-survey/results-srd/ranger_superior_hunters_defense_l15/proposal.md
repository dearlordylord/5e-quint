# Proposal: surface_widening — ranger_superior_hunters_defense_l15

## Unit

**Name:** Superior Hunter's Defense (Ranger L15)  
**Source:** SRD 5.2.1, Classes/Ranger — Level 15: Superior Hunter's Defense  

> When you take damage, you can take a Reaction to give yourself Resistance to that damage and any other damage of the same type until the end of the current turn.

## Outcome: `surface_widening`

The unit's kind (`class_feature`) and family (`activation`) both exist. The gaps are all missing variants within existing surface types. No new v4 atoms are required.

---

## Gap 1: `ClassFeatureActivationCost` needs a `reaction` variant

**Current type:**
```typescript
export type ClassFeatureActivationCost =
  | { readonly kind: "free" }
  | { readonly kind: "bonus_action" };
```

**What is needed:**
```typescript
| {
    readonly kind: "reaction";
    readonly trigger: { readonly kind: "takes_damage" };
  }
```

The feature's cost is a Reaction that fires in response to taking damage, not a free or bonus-action activation. The trigger grammar is analogous to `CastingTime { kind: "reaction", trigger: ReactionTrigger }` already used for spells.

---

## Gap 2: `ClassFeatureMechanicsHeader` — no path for "no use-count pool"

**Current type:**
```typescript
type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: UseCountResource;   // required
  readonly resetCadence: RestResetCadence;
};
```

Superior Hunter's Defense has no rest-refilling use-count pool. The Reaction itself is the limiting resource, governed by action economy (once per round). The required `resource: UseCountResource` field has no valid value to place here.

**Options:**
1. Make `resource` optional in `ClassFeatureMechanicsHeader` for reaction-based features.
2. Add a `UseCountResource` variant `{ kind: "reaction_quota" }` to signal that the limit is action-economy, not a pool.

Either approach unlocks honest encoding for this pattern and other reaction-class-features (Uncanny Dodge, Deflect Attacks, etc.).

---

## Gap 3: `ClassFeatureEffect` needs a `grant_resistance` variant

**Current type:**
```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

**What is needed:**
```typescript
| {
    readonly kind: "grant_resistance";
    readonly damageType: DamageType | "triggering_event";
    readonly target: "self";
    readonly duration: { readonly kind: "until_end_of_turn" };
  }
```

`grant_resistance` exists in the v4 atom taxonomy (§9 Effect Atoms) but has no `ClassFeatureEffect` variant in `types.ts`. The atom is already present; the surface simply needs to expose it.

---

## Gap 4: `grant_resistance` needs a `triggering_event` damage-type reference

The resistance applies to *the damage type of the event that triggered the feature* — not a statically declared `DamageType`. The SRD says "Resistance to **that damage** and any other damage of the same type," where "that damage" resolves at runtime from the trigger event.

No surface type currently supports this pattern. A new `"triggering_event"` sentinel in the `damageType` field of `grant_resistance` would express: "apply resistance to whichever damage type caused the reaction window to open."

This is a narrow, single-variant extension. It is not a new atom — the atom is still `grant_resistance`; only the parameterization mode is new.

---

## v4 Atom Coverage

All atoms needed to trace this unit already exist in v4:

| Atom | Category | Already in v4? |
|---|---|---|
| `reaction_window` | window | yes |
| `reaction_quota` | resource | yes |
| `grant_resistance` | effect | yes |
| `turn_end_window` | window | yes |

No new atoms are needed. The widening is entirely at the `types.ts` surface layer.

---

## Comparison to Existing Patterns

| Feature | Activation cost | Resource | Effect |
|---|---|---|---|
| Action Surge | `free` | `use_count` fixed 1 | `grant_extra_action` |
| Second Wind | `bonus_action` | `use_count` tiered | `heal_hp` |
| **Superior Hunter's Defense** | **`reaction` (damage trigger)** | **none (reaction quota)** | **`grant_resistance` (event-typed)** |

The surface can handle the first two rows today. The third row forces all four gaps above.
