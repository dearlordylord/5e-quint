# Proposal: Widenings for Improved Critical (fighter L3)

## Unit

**Name:** Improved Critical (fighter L3)  
**Slug:** `fighter_improved_critical_l3`  
**Kind:** `class_feature`  
**Source text:**

> Your attack rolls with weapons and Unarmed Strikes can score a Critical Hit on a roll of 19 or 20 on the d20.

## Why it does not fit the current surface

### Problem 1 — No passive family in `ClassFeatureMechanics`

The type `ClassFeatureMechanics` has exactly one family: `ClassFeatureActivationMechanics` (family `"activation"`). That family requires:

- `activationCost` — how the player spends a resource to trigger the feature
- `resource` — a use-count pool tracking uses expended
- `resetCadence` — when the pool refills

Improved Critical has **none of these**. It is permanently active from level 3 onward, requires no action, costs nothing, and tracks no uses. Encoding it as `activation` with `activationCost: free` would still demand a fabricated `resource` and `resetCadence` with no basis in the SRD text. The CLAUDE.md guardrail: *"a misleading trace is worse than no trace."*

**Required widening:** A new `ClassFeatureMechanics` family — tentatively `passive` or `always_on_modifier` — that has no activation, no resource, and no reset. It would carry only an effect describing the permanent modification.

### Problem 2 — No atom for critical-hit threshold modification

Even if a passive family existed, no `ClassFeatureEffect` or v4 atom encodes "the critical hit threshold changes from 20 to 19-20."

The closest existing atoms:

| Atom | What it does | Why it fails |
|---|---|---|
| `modify_roll_numeric` | Adds ±N to a die roll | Modifies the roll value; does not change what threshold counts as a crit |
| `modify_roll_substitute` | Replaces a roll value | Substitutes one value for another; does not model a range expansion |
| `modify_roll_advantage` | Grants advantage/disadvantage | Changes how many dice are rolled, not the crit threshold |

None model "the crit window expands from {20} to {19, 20}."

The v4 taxonomy residue (section 12) explicitly notes:

> `crit_window` distinct from `on_hit_window` — single-feat pressure

This confirms the crit domain is a known gap. Improved Critical and Superior Critical (fighter L15, which extends to 18-20) are both pressure points for this exact atom.

**Required widening:** A new atom — tentatively `modify_crit_range` — in the effect category, representing an expansion (or shift) of the d20 threshold that triggers a Critical Hit on an attack roll.

## Proposed shape sketch

```typescript
// New passive family for class features
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive_modifier";
  readonly effect: ClassFeaturePassiveEffect;
};

// New passive effect union (extend as pressure accumulates)
export type ClassFeaturePassiveEffect = ModifyCritRangeEffect; // | ...

// New atom: expand the crit range on attack rolls
export type ModifyCritRangeEffect = {
  readonly kind: "modify_crit_range";
  // The new minimum d20 value that counts as a crit
  // (default is 20; Improved Critical sets this to 19; Superior Critical to 18)
  readonly minCritRoll: number;
};
```

The tracer would need a matching `passive_modifier` branch in `traceClassFeatureMechanics` and a `modify_crit_range` case in a new `traceClassFeaturePassiveEffect` helper.

## Relation to v4 taxonomy residue

The deferred `crit_window` atom (residue section 12) is adjacent but distinct from what is needed here:

- `crit_window` — an **event window** that opens *when* a critical hit occurs (needed by Boon of Irresistible Offense's Overwhelming Strike, which fires additional effects on a crit)
- `modify_crit_range` — an **effect atom** that *changes what threshold constitutes a crit* (needed by Improved Critical, Superior Critical)

Both are in the same domain but serve different subgraph positions. This proposal is for `modify_crit_range` only; `crit_window` remains deferred.

## Classification

`atom_widening` — a new effect atom (`modify_crit_range`) is required, plus a new surface family (`passive_modifier` for `ClassFeatureMechanics`). The primary blocker is the missing atom; the family gap compounds it.
