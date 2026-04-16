# Widening Proposal — Quivering Palm (monk L17)

**Outcome:** `structural_widening`

---

## Why the unit does not fit

Quivering Palm has a **plant-and-detonate** temporal structure that no existing `ClassFeatureMechanics` family can represent. The current type is:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
```

`ClassFeatureActivationMechanics` models a single activation: `activationCost` → consumes `resource` → produces `effect`. Quivering Palm has two disjoint activations separated by up to Monk-level days:

| Phase | When | Cost | What happens |
|---|---|---|---|
| **Plant** | On Flurry of Blows hit | 4 Focus Points | Creature acquires imperceptible vibrations (persistent mark) |
| **Detonate** | Monk's later turn | Action *or* forgo one attack | CON save → 10d12 Force (fail) / half (success) |

Even if we patched every individual type variant (see below), a single `activation` record cannot capture that the two phases are temporally decoupled and can be performed by different activations.

---

## Proposed widenings

### 1. New class-feature family: `store_and_release`

A two-node family analogous to the spell-level `anchored_trigger`:

```
plant_phase:
  trigger: on_attack_hit (e.g. flurry_of_blows)
  cost: focus_points(4)
  effect: mark_creature (singleton, duration: monk_level days)

release_phase:
  trigger: explicit_activation
  cost: action | forgo_attack
  constraint: same_plane_of_existence
  effect: save_gate (CON, DC caster spell save DC)
    on_fail: damage 10d12 force
    on_success: damage 5d12 force (half)
  limit: harmless_end (free, no action)
```

The `ClassFeatureEffect` type would need a `save_gate_damage` variant to carry the release payload.

### 2. New resource variant: `focus_point_resource`

```typescript
export type FocusPointResource = {
  readonly kind: "focus_points";
  readonly cost: number;          // 4 for Quivering Palm
};
```

This references the Monk's shared Focus Point pool rather than a per-feature use_count. The pool's cap, reset cadence, and partial-refill semantics live on the pool definition (Monk's Focus feature), not here.

### 3. New `ClassFeatureActivationCost` variants

```typescript
| { readonly kind: "on_attack_hit"; readonly attackSource: "flurry_of_blows" }
| { readonly kind: "action" }
| { readonly kind: "forgo_attack" }  // gives up one attack from the Attack action
```

The plant phase needs `on_attack_hit`; the release phase needs `action` or `forgo_attack` (the feature offers both).

### 4. New `ClassFeatureEffect` variant: `save_gate_damage`

```typescript
export type SaveGateDamageEffect = {
  readonly kind: "save_gate_damage";
  readonly ability: Ability;            // "con"
  readonly dc: DcSource;                // caster_spell_save_dc
  readonly onFail: DamageEffect;        // 10d12 force
  readonly onSuccess: DamageEffect;     // half (5d12 force, or expressed as half flag)
};
```

`DamageEffect` already exists in the spell surface. Reuse it here.

---

## Secondary gaps (noted, not blocking the family design)

- **Level-scaled duration**: "a number of days equal to your Monk level" — `DurationValue` has no `monk_level` axis. A `level_scaled_days` shape would be needed.
- **Singleton mark constraint**: "You can have only one creature under the effect at a time" — no `maxTargets` or exclusivity field exists on any attachment or mark type.
- **Same-plane guard**: "you and the target must be on the same plane of existence" — this is a precondition on the release activation with no current representation.

These are real surface gaps but are secondary to the missing family. They should be addressed in the same widening pass as the `store_and_release` family.

---

## Atom inventory impact

The proposed widenings would use existing v4 atoms:

| Atom | Role |
|---|---|
| `attack_roll` | Plant trigger (Flurry of Blows hit) |
| `on_hit_window` | Gate for the plant activation |
| `mark_target` | The planted vibration mark |
| `persist` + `expire` | Duration of the mark (monk-level days) |
| `save_gate` | CON save during detonation |
| `damage` | 10d12 Force on fail / half on success |
| `use_count` | Singleton constraint (max 1) |

No new v4 atoms are required. The widening is entirely at the surface-type level and the class-feature family level.
