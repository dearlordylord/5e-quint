# Proposal: Widening for `monk_deflect_energy_l13`

## Unit

**Deflect Energy (Monk L13)**
SRD 5.2.1 — Classes/Monk#Level 13: Deflect Energy

> You can now use your Deflect Attacks feature against attacks that deal any damage type, not just Bludgeoning, Piercing, or Slashing.

---

## Why it doesn't fit

Deflect Energy is a **permanent passive scope widener**. It has:

- No activation cost (not a Bonus Action, Free Action, or Action)
- No use count / resource pool
- No reset cadence
- No trigger event

It is always-on from the moment the monk reaches level 13. Its sole mechanical content is **removing a damage-type restriction** on the existing Deflect Attacks feature.

The current `ClassFeatureMechanics` type is:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
```

The only family is `activation`, which forces `activationCost + resource + resetCadence`. Encoding Deflect Energy with `activationCost: { kind: "free" }`, `resource: { kind: "use_count", cap: { kind: "fixed", uses: 0 } }`, etc. would be dishonest — it would imply a discrete activatable event that doesn't exist, and the tracer would emit spurious quota/resource nodes.

---

## Proposed widenings

### 1. New family: `passive_modifier` for `ClassFeatureMechanics`

A new mechanics family for class features that are always-on and modify the behavior of the owning creature without requiring activation.

```typescript
export type ClassFeaturePassiveModifierMechanics = {
  readonly family: "passive_modifier";
  readonly effect: ClassFeaturePassiveEffect;
};
```

This covers a pattern that recurs across class features (Unarmored Defense, Evasion, Uncanny Dodge) — features that don't need a use-count but do carry a deterministic mechanical effect.

### 2. New effect variant: `expand_feature_scope`

A new `ClassFeaturePassiveEffect` variant (or a new member of `ClassFeatureEffect` if the passive family reuses it) that expresses a scope expansion on another feature:

```typescript
export type ExpandFeatureScopeEffect = {
  readonly kind: "expand_feature_scope";
  readonly targetFeatureId: string;           // e.g. "monk_deflect_attacks_l3"
  readonly scope: "damage_type_filter";
  readonly from: ReadonlyArray<DamageType>;   // the old restricted set (or "physical_only")
  readonly to: "all_damage_types";            // or ReadonlyArray<DamageType>
};
```

The v4 atom inventory does not have a node kind for "lift a damage-type restriction on a named feature." The closest existing candidates (`modify_roll_numeric`, `grant_resistance`, `bypass_resistance`) all operate on combat outcomes, not on feature eligibility rules.

---

## Classification

**`structural_widening`** — No existing `UnitRecord` kind + mechanics family can honestly represent this unit. The `class_feature/activation` family would require fabricating activation machinery that the rule does not have. A new family is needed before any JSON can be authored.

---

## Atom-level pressure (secondary)

Even after the structural gap is resolved, the tracer would need a new atom to represent "feature scope expansion." The TAXONOMY_atoms_graph.md v4 has no atom for "widening the eligibility filter of a named feature." This suggests a future `expand_scope` effect atom, but it is subordinate to the structural gap — the family must exist first.
