# Proposal: Surface Widenings for Superior Defense (Monk L18)

## Unit

**Name:** Superior Defense (Monk L18)  
**Slug:** `monk_superior_defense_l18`  
**Source:** SRD 5.2.1 — Classes/Monk#Level 18: Superior Defense

**Text:**
> At the start of your turn, you can expend 3 Focus Points to bolster yourself against harm for 1 minute or until you have the Incapacitated condition. During that time, you have Resistance to all damage except Force damage.

## Outcome: `surface_widening`

The unit maps to the `class_feature` / `activation` family shape. All required v4 atoms exist
(`grant_resistance`, `persist`, `expire`, `turn_start_window`, `use_count`). The gaps are
entirely at the **surface type** layer — the typed shapes that the content author writes and
the tracer walks. No new v4 atoms are required.

---

## Required Widenings

### 1. `ClassFeatureActivationCost` — new `focus_points` variant

```
ClassFeatureActivationCost =
  | { kind: "free" }
  | { kind: "bonus_action" }
  | { kind: "focus_points"; amount: number }   // NEW
```

**Why:** Superior Defense costs 3 Focus Points — a named class-level resource shared across
all Monk features (Step of the Wind, Stunning Strike, etc.). The current cost union only
covers action-economy costs, not point-pool expenditures.

**Evidence:** "you can expend 3 Focus Points"

---

### 2. `ClassFeatureEffect` — new `grant_resistance` variant

```
GrantResistanceEffect = {
  kind: "grant_resistance";
  scope: "all" | { kind: "all_except"; exceptions: ReadonlyArray<DamageType> };
}

ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect | GrantResistanceEffect   // widened
```

**Why:** The v4 atom `grant_resistance` is already in the taxonomy. It is wired into spell
effects (e.g., Protection from Energy) but has no representation in `ClassFeatureEffect`.
Superior Defense applies a broadly scoped resistance with a single exception (Force), so the
shape also needs an "all except" scope pattern.

**Evidence:** "you have Resistance to all damage except Force damage"

---

### 3. `ClassFeatureActivationMechanics` — add `duration` field

```
export type ClassFeatureActivationMechanics = ClassFeatureMechanicsHeader & {
  readonly family: "activation";
  readonly effect: ClassFeatureEffect;
  readonly duration?: Duration;   // NEW — optional; absent = instantaneous
};
```

**Why:** Spells have a `duration` field on their mechanics header; class features do not.
Superior Defense lasts up to 1 minute, making this the first class-feature encoding that
requires a duration model. The existing `Duration` type from the spell layer can be reused
once a condition-triggered expiry variant is added (see §4).

**Evidence:** "for 1 minute or until you have the Incapacitated condition"

---

### 4. `Duration` — new `timed_or_condition` variant

```
export type Duration =
  | { kind: "instantaneous" }
  | { kind: "concentration"; upTo: DurationValue }
  | { kind: "timed"; value: DurationValue }
  | {                                            // NEW
      kind: "timed_or_condition";
      value: DurationValue;
      breakCondition: Condition;
    };
```

**Why:** Superior Defense ends at whichever comes first: the 1-minute expiry **or** the
application of the Incapacitated condition. The existing `timed` variant has no
condition-break path. This is mechanically distinct from concentration (which is broken by
damage saves and new concentration spells, not by named conditions).

**Evidence:** "for 1 minute or until you have the Incapacitated condition"

---

### 5. `Condition` — add `"incapacitated"`

```
export type Condition = "prone" | "incapacitated";   // widened
```

**Why:** The break trigger references Incapacitated by name. The current `Condition` union
only contains `"prone"` (from the Topple mastery). `"incapacitated"` must be added to use
it as a `breakCondition` in the `timed_or_condition` Duration variant above.

**Evidence:** "until you have the Incapacitated condition"

---

### 6. `ClassFeatureActivationMechanics` — add optional `activationWindow` field

```
export type ClassFeatureActivationMechanics = ClassFeatureMechanicsHeader & {
  readonly family: "activation";
  readonly effect: ClassFeatureEffect;
  readonly duration?: Duration;
  readonly activationWindow?: "turn_start" | "turn_end" | "any";   // NEW; absent = "any"
};
```

**Why:** Superior Defense can only be activated "at the start of your turn" — a hard timing
constraint. The v4 atom `turn_start_window` exists, but the class-feature surface has no
field to express when a feature may be invoked. Without this, the graph cannot emit a
`turn_start_window` edge and the timing restriction is silently lost.

**Evidence:** "At the start of your turn, you can expend 3 Focus Points"

---

### 7. Resource model — external pool reference

The current `UseCountResource` models a self-contained use_count pool owned by the feature
(e.g., Action Surge's 1 use, reset on Short/Long Rest). Superior Defense has **no** such
pool — it draws from the monk's shared Focus Point pool, which is governed by the
`monk_monks_focus_l2` feature.

Two approaches:

**Option A** — add an `external_pool` variant to `UseCountResource`:
```
export type UseCountResource =
  | { kind: "use_count"; cap: UseCountCap }
  | { kind: "external_pool"; poolId: string; cost: number }   // NEW
```

**Option B** — make `resource` optional on `ClassFeatureActivationMechanics` and
allow the activation cost to carry the full resource semantics when the cost is
`focus_points`.

Either way, a class feature that consumes from a shared class resource pool cannot be
honestly modeled with the current `{ kind: "use_count" }` shape, which implies the
feature owns and manages its own quota.

**Evidence:** "expend 3 Focus Points" (Focus Points are defined once at Level 2:
Monk's Focus and shared across all focus-costed features)

---

## Summary

| # | Kind | Target | Atom backing |
|---|------|--------|-------------|
| 1 | `new_variant` | `ClassFeatureActivationCost` | _(action economy, no new atom)_ |
| 2 | `new_variant` | `ClassFeatureEffect` | `grant_resistance` (v4 §9) |
| 3 | `new_variant` | `ClassFeatureActivationMechanics` | `persist` + `expire` (v4 §6) |
| 4 | `new_variant` | `Duration` | `expire` (v4 §6) |
| 5 | `new_variant` | `Condition` | _(primitive extension)_ |
| 6 | `new_variant` | `ClassFeatureActivationMechanics` | `turn_start_window` (v4 §4) |
| 7 | `new_variant` | `UseCountResource` | _(resource model)_ |

All v4 atoms required by this unit already exist. The widenings are purely at the surface
(authored type) layer.
