# Widening Proposal: Evasion (monk L7)

**Outcome:** `structural_widening`

---

## What the rule says

> When you're subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you instead take no damage if you succeed on the saving throw and only half damage if you fail. You don't benefit from this feature if you have the Incapacitated condition.

---

## Why the unit does not fit

### Gap 1 — No passive class feature family

`ClassFeatureMechanics` has exactly one variant:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
// family: "activation"
```

The `activation` family requires:
- `activationCost` — how the player triggers the feature
- `resource: UseCountResource` — a use pool
- `resetCadence: RestResetCadence` — how that pool refills

Evasion has none of these. It is a **passive, persistent interceptor** that fires automatically every time a matching Dex half-damage save-gate targets the feature owner. There is no player trigger, no resource consumed, and no cadence to reset.

Encoding this in `activation` would require fabricating `activationCost: { kind: "free" }`, a dummy `use_count` resource, and a dummy reset cadence. All three would be lies about how the feature works. A misleading trace is worse than no trace.

**Proposed addition:** A `"passive"` (or `"passive_modifier"`) family for `ClassFeatureMechanics`. This family has no activation cost, no resource, and no reset cadence. It describes state that continuously applies to the feature owner and fires automatically when its trigger condition is met.

---

### Gap 2 — No save-outcome override effect shape

The effect of Evasion is:

> For incoming save_gates that are Dex-typed and normally deal half-damage on success / full-damage on failure, remap the outcomes to: success → 0 damage, failure → half damage.

No existing `ClassFeatureEffect` variant covers this:
- `grant_extra_action` — unrelated
- `heal_hp` — unrelated

The v4 atom `modify_roll_substitute` addresses rolling a different die, not remapping save gate outcome branches.

The v4 atom `grant_resistance` would halve incoming damage unconditionally — but Evasion's success branch gives full immunity (0 damage), not halving. Using `grant_resistance` would over-simplify and misrepresent the RAW mechanic.

**Proposed addition:** A new `ClassFeatureEffect` variant, tentatively `modify_save_outcome`, with a shape along the lines of:

```typescript
{
  kind: "modify_save_outcome";
  // The class of triggers this applies to: Dex saves that deal half on success
  triggerClass: "dex_half_damage_save";
  // Remapped outcome branches
  onSuccess: { kind: "damage_multiplier"; multiplier: 0 };   // no damage
  onFail:    { kind: "damage_multiplier"; multiplier: 0.5 }; // half damage
}
```

Whether this is modeled as a new `ClassFeatureEffect` variant, a new `v4` atom, or a `save_gate_override` surface shape is a design decision. The key constraint is that the outcome remap must be expressible at the surface level, not just in prose.

---

### Gap 3 — Condition-based feature suppression

> You don't benefit from this feature if you have the Incapacitated condition.

This is a suppression predicate: the entire feature is inactive while the Incapacitated condition is present. There is currently no surface type for attaching a condition-gated suppression to a class feature. The v4 atom `suppress` exists, but no `ClassFeatureMechanics` field references it.

This gap is narrower and will likely recur across many passive features (Danger Sense has an identical Incapacitated suppression clause). A shared `suppressedBy?: Condition[]` field on passive feature records, or a `suppress` edge in the tracer, would cover this pattern.

---

## Proposed new surface shapes (sketch)

```typescript
// New family for ClassFeatureMechanics
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive";
  readonly effect: ClassFeaturePassiveEffect;
  readonly suppressedBy?: ReadonlyArray<Condition>;
};

// New effect variant (sketch)
export type SaveOutcomeOverrideEffect = {
  readonly kind: "save_outcome_override";
  readonly triggerClass: "dex_half_damage_save"; // extend as needed
  readonly onSuccess: DamageOutcomeBranch;
  readonly onFail: DamageOutcomeBranch;
};

// New ClassFeaturePassiveEffect union
export type ClassFeaturePassiveEffect = SaveOutcomeOverrideEffect; // extend as needed

// Updated union
export type ClassFeatureMechanics =
  | ClassFeatureActivationMechanics
  | ClassFeaturePassiveMechanics;
```

---

## Pressure coverage

This gap is not unique to Evasion. The rogue's **Evasion (rogue L7)** is identical text. Multiple other passive features (Danger Sense, Uncanny Dodge, Barbarian Feral Instinct, etc.) would also require a `"passive"` family. The `activation` family alone cannot honestly represent the class feature space.
