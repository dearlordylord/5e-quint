# Proposal: Superior Critical (fighter L15)

## Outcome: `structural_widening`

## Gap Summary

Superior Critical cannot be honestly encoded in the current surface vocabulary. Two gaps block encoding:

1. **No passive `ClassFeatureMechanics` family.** The only existing family is `activation`, which requires `activationCost`, `resource` (use-count), and `resetCadence`. Superior Critical has none of these — it is a permanent, always-on modifier that applies silently to every attack roll made by the fighter. Encoding it as `activation` with `activationCost: free` and a fabricated effect would produce a false trace.

2. **No v4 atom for modifying the critical hit threshold.** The feature's entire mechanic is widening the d20 range that counts as a Critical Hit from 20 to 18–20. No existing v4 effect or resolution atom covers this. TAXONOMY_atoms_graph.md §12 ("Known Remaining Weak Spots") explicitly notes `crit_window distinct from on_hit_window` as deferred at single-feat pressure (Boon of Irresistible Offense). Superior Critical and Improved Critical (fighter L3, threshold 19–20) now provide two additional pressure streams for the same concept.

## Proposed Widenings

### 1. New `ClassFeatureMechanics` family: `passive`

Always-on class features need a dedicated family with no activation infrastructure:

```typescript
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive";
  readonly effect: ClassFeaturePassiveEffect;
};

export type ClassFeatureMechanics =
  | ClassFeatureActivationMechanics
  | ClassFeaturePassiveMechanics;
```

The `ClassFeaturePassiveEffect` union would start with `ModifyCritThresholdEffect` and grow as other passive features are encoded (Improved Critical, Danger Sense, Evasion, etc.).

### 2. New surface type + atom: `modify_crit_threshold`

```typescript
export type ModifyCritThresholdEffect = {
  readonly kind: "modify_crit_threshold";
  readonly minRoll: number;   // 19 for Improved Critical (L3), 18 for Superior Critical (L15)
  readonly scope: "weapons_and_unarmed" | "all_attacks";
};
```

Tracer atom: `modify_crit_threshold` (new v4 atom, or promotion of the deferred `crit_window` concept). Maps to a passive modifier on the `attack_roll` resolution atom — the threshold below which the d20 result counts as a critical.

## Evidence

- Feature text: "Your attack rolls with weapons and Unarmed Strikes can now score a Critical Hit on a roll of 18–20 on the d20."
- Provenance: SRD 5.2.1, `Classes/Fighter#Level 15: Superior Critical`

## Related Pressure

| Unit | Threshold | Source |
|---|---|---|
| Improved Critical (fighter L3) | 19–20 | SRD 5.2.1 |
| Superior Critical (fighter L15) | 18–20 | SRD 5.2.1 |
| Boon of Irresistible Offense (feat) | 19–20 | SRD 5.2.1 |

All three require `modify_crit_threshold`. The taxonomy should promote this atom from residue to v4.
