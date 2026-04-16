# Proposal: Disciplined Survivor (monk L14)

**Outcome:** `structural_widening`

## Unit text

> **Level 14: Disciplined Survivor**
>
> Your physical and mental discipline grant you proficiency in all saving throws.
>
> Additionally, whenever you make a saving throw and fail, you can expend 1 Focus Point to reroll it, and you must use the new roll.

---

## Why it doesn't fit

Disciplined Survivor has **two mechanically distinct components**, neither of which maps to any existing `ClassFeatureMechanics` family.

### Component 1 — Passive proficiency grant

> "Your physical and mental discipline grant you proficiency in all saving throws."

This is a **permanent passive feature**: it takes effect at acquisition, has no activation cost, no use count, no reset cadence, and persists for the life of the character. The single existing `ClassFeatureMechanics` family is `activation`, which mandates:
- `activationCost` (free | bonus_action)
- `resource` (use_count with a cap)
- `resetCadence` (short/long rest)
- `effect`

A passive always-on feature has none of these fields in a meaningful sense. Encoding it as `activation` with `{ kind: "free" }` cost and `{ kind: "fixed", uses: 0 }` resource would be a structural lie — the feature cannot be "used" in any sense.

Additionally, `ClassFeatureEffect` has no `grant_proficiency` variant. The v4 taxonomy includes `grant_proficiency` as an effect atom (§9 Effect Atoms), but the surface type's `ClassFeatureEffect` union is `GrantExtraActionEffect | HealHpEffect` — no mechanism exists to express a proficiency grant.

### Component 2 — Triggered optional save reroll (Focus Point cost)

> "whenever you make a saving throw and fail, you can expend 1 Focus Point to reroll it, and you must use the new roll."

This component has four structural gaps:

**A. No triggered class feature family.** The reroll window opens on a specific external event — a failed saving throw — not at player initiative. This is a `post_roll_window` (on-failure variant), not a player-initiated activation. The `activation` family can only represent features the player deliberately uses on their turn or at a moment of their choosing. There is no class-feature analog to the spell surface's `triggered_reaction` family.

**B. No Focus Point cost type.** `ClassFeatureActivationCost` has two variants: `{ kind: "free" }` and `{ kind: "bonus_action" }`. Expending 1 Focus Point from the monk's Focus Point pool is neither of these. This is a class-specific point resource (monk Focus Points are analogous to spell slots for the monk class — a metered pool). A `{ kind: "focus_point"; count: number }` cost variant (or a generic `class_point` variant) is needed.

**C. No `modify_roll_reroll` in ClassFeatureEffect.** The effect is a reroll of an already-resolved saving throw. `modify_roll_reroll` exists in the v4 atom taxonomy (§9), but is absent from `ClassFeatureEffect`. The surface type only supports `grant_extra_action` and `heal_hp` as class feature effects.

**D. Must-use constraint.** The SRD specifies "you must use the new roll" — the reroll is forced, not keep-best. The surface has no reroll shape with a `must_use_new` vs `keep_higher` distinction for class features. (The v4 taxonomy notes this as a "keep-higher vs forced-keep" variation in `modify_roll_reroll`, currently unresolved.)

---

## Proposed widenings

### W1: `passive` class feature family (structural)

A new `ClassFeatureMechanics` family for features that are always-on at acquisition:

```typescript
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive";
  readonly effect: ClassFeaturePassiveEffect;  // widens separately — see W2
};
```

Pressure from this feature and likely from many others (Unarmored Defense, Evasion, proficiency grants across all classes).

### W2: `grant_proficiency` in ClassFeatureEffect (surface variant)

A new effect variant for the passive family:

```typescript
export type GrantProficiencyEffect = {
  readonly kind: "grant_proficiency";
  readonly scope: "all_saving_throws" | ...; // extend as pressure arrives
};
```

The v4 atom `grant_proficiency` exists; the surface type just needs to wire it in.

### W3: `triggered_optional` class feature family (structural)

A new `ClassFeatureMechanics` family for features triggered by a specific game event, with optional player invocation and a resource cost:

```typescript
export type ClassFeatureTriggeredOptionalMechanics = {
  readonly family: "triggered_optional";
  readonly trigger: ClassFeatureTrigger;         // new type, see below
  readonly cost: ClassFeatureActivationCost;     // reuses existing, extended by W4
  readonly effect: ClassFeatureEffect;           // extended by W5
};

export type ClassFeatureTrigger =
  | { readonly kind: "on_failed_save" }
  | ...; // extend as needed
```

Comparable to the spell surface's `triggered_reaction` family. Monk's Stunning Strike, Deflect Attacks, and several other monk features follow similar trigger-gated patterns.

### W4: Focus Point cost variant in ClassFeatureActivationCost (surface variant)

```typescript
export type ClassFeatureActivationCost =
  | { readonly kind: "free" }
  | { readonly kind: "bonus_action" }
  | { readonly kind: "focus_point"; readonly count: number };  // new
```

The Focus Point pool is itself defined by Monk's Focus (`monk_monks_focus_l2`). The activation cost references the pool by kind; the resource node for the pool lives in the Focus feature record. This avoids duplicating the pool definition.

An alternative is a generic `{ kind: "class_point"; readonly resourceId: string; readonly count: number }` that works across monk Focus Points, Sorcery Points, etc. Either shape solves the immediate pressure; the generic form is more reusable.

### W5: `modify_roll_reroll` in ClassFeatureEffect (surface variant)

```typescript
export type RerollEffect = {
  readonly kind: "modify_roll_reroll";
  readonly on: ReadonlyArray<RollKind>;           // "saving_throw" here
  readonly keepPolicy: "must_use_new" | "keep_higher";
};
```

`on` reuses the existing `RollKind` union. `keepPolicy` captures the "must use the new roll" constraint.

---

## Filing notes

- W1 and W3 are structural — new families must be added to the `ClassFeatureMechanics` union.
- W2, W4, W5 are surface variants of existing types — union extensions, no new families needed.
- All five widenings are independent and can land in any order, but W3 is only useful once W4 and W5 exist.
- Related features that will likely need the same widenings: Monk Evasion (W1/W2 or a new passive effect), Monk Deflect Attacks (W3/W4 — triggered, reaction cost, reduce-damage effect), Monk Stunning Strike (W3/W4 — triggered on hit, Focus Point cost, apply-condition effect).
- Fighter Indomitable (`fighter_indomitable_l9`) is related but uses `activation` (player-initiated, long-rest reset, fixed uses). It does NOT need W3 because the player proactively declares it rather than being offered it on failure. Disciplined Survivor is genuinely different in shape.
