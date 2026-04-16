# Proposal: Widenings Required for `paladin_aura_of_devotion_l7`

## Outcome: `structural_widening`

Aura of Devotion cannot be encoded with the current surface. Four gaps block honest encoding.

---

## Gap 1 (Structural): No passive class feature family

**The core problem.** The only `ClassFeatureMechanics` family is `"activation"`, which models features a player actively uses on their turn. Its header unconditionally requires:

```typescript
activationCost: ClassFeatureActivationCost   // e.g. "free" | "bonus_action"
resource: UseCountResource                   // a finite use pool
resetCadence: RestResetCadence               // how the pool refills
```

Aura of Devotion has none of these. It is *always on* while the paladin is conscious. There is no activation, no quota consumed, no finite pool, and nothing to refill. Forcing `activationCost: { kind: "free" }` and a dummy `use_count` would produce a provably false trace — the tracer would emit `use_count` and `rest_window` nodes for resources that do not exist in the rule.

**Proposed fix:** A new `"passive_aura"` family (or `"always_on"`) for `ClassFeatureMechanics`:

```typescript
export type ClassFeaturePassiveAuraMechanics = {
  readonly family: "passive_aura";
  readonly scope: AuraScope;           // spatial extent (see Gap 4)
  readonly effect: ClassFeatureEffect; // what the aura grants
};
```

Pressure cases beyond Aura of Devotion: Aura of Protection (L6), Aura of Courage (L10), Aura Expansion (L18), and most paladin subclass auras follow the same passive-always-on shape.

---

## Gap 2 (Atom): No `grant_condition_immunity` atom

v4 effect atoms for immunity/resistance:
- `grant_resistance` — reduces damage of a given type by half
- `remove_condition` — removes an already-applied condition

Neither covers *granting immunity to a condition*. Immunity in D&D 5e means the condition **cannot be applied** at all — it is a pre-application gate, not a post-application removal, and not reducible to resistance.

The second sentence of the rule ("If a Charmed ally enters the aura, that condition has no effect on that ally while there") confirms this is an active suppression of an already-applied condition as well — a dual role (prevention + suppression) that neither `grant_resistance` nor `remove_condition` honestly covers as a unified atom.

**Proposed atom:**
```
grant_condition_immunity
  - category: effect
  - parameters: condition (e.g. "charmed"), scope (see Gap 4)
  - semantics: while the effect persists, the named condition cannot be applied
    to creatures in scope; if already applied, it has no effect on them
```

---

## Gap 3 (Surface): No condition immunity variant in `ClassFeatureEffect`

`ClassFeatureEffect` is currently:
```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

Even if Gap 1 and Gap 2 were resolved, the surface type would need a new variant:

```typescript
export type GrantConditionImmunityEffect = {
  readonly kind: "grant_condition_immunity";
  readonly condition: Condition;       // widen Condition beyond "prone"
  readonly target: "self_and_allies_in_aura" | "self" | "allies_in_aura";
};
```

Note: `Condition` is currently typed as `"prone"` only (used in mastery context). This would need to be widened to include at least `"charmed"`.

---

## Gap 4 (Surface/Structural): No spatial scope for class features

The immunity applies to creatures **within the Aura of Protection** — a 10 ft radius zone centered on the paladin (expanding to 30 ft at L18 via Aura Expansion). The current class feature surface has no attachment or spatial scope concept whatsoever.

A new scope type is needed:

```typescript
export type AuraScope = {
  readonly kind: "aura_of_protection";  // references the paladin's L6 aura
  // OR generalize:
  readonly kind: "radius_of_self";
  readonly feet: number;                // 10 at L6, 30 at L18
};
```

The radius is defined by Aura of Protection (L6) and expanded by Aura Expansion (L18), so Aura of Devotion semantically *inherits* the spatial scope from another feature. This cross-feature dependency is novel — the current surface has no mechanism to express "this feature's area is defined by another feature".

---

## Summary Table

| Gap | Classification | Blocker |
|-----|---------------|---------|
| No passive/always-on class feature family | `structural_widening` | `ClassFeatureMechanics` only has `"activation"` |
| No `grant_condition_immunity` atom | `atom_widening` | v4 has `grant_resistance` (damage) and `remove_condition`, not condition immunity |
| No condition immunity `ClassFeatureEffect` variant | `surface_widening` | `ClassFeatureEffect = GrantExtraActionEffect \| HealHpEffect` only |
| No spatial scope / aura attachment for class features | `structural_widening` | `ClassFeatureMechanicsHeader` has no attachment concept |

Primary classification is `structural_widening` — the unit's shape does not fit any existing payload family.
