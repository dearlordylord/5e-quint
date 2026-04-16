# Proposal: ranger_relentless_hunter_l13

## Unit

**Name:** Relentless Hunter (Ranger L13)
**Kind:** class_feature
**Source:** SRD 5.2.1, Classes/Ranger — Level 13: Relentless Hunter
**Text:** "Taking damage can't break your Concentration on *Hunter's Mark*."

## Why It Doesn't Fit

### Gap 1 — No passive class-feature family (structural_widening)

The only `ClassFeatureMechanics` family is `activation`, which requires:

- `activationCost` — not applicable; the feature is always-on.
- `resource` — a `use_count` with a cap; this feature has no uses to spend.
- `resetCadence` — a rest cadence; there is nothing to reset.

Relentless Hunter is permanently active from level 13. There is no player action, no resource to consume, and no rest that restores anything. Encoding it as `activation` with `{ kind: "free" }` cost and a fabricated `{ kind: "fixed", uses: 1 }` resource would misrepresent the rule's structure and produce a misleading trace.

### Gap 2 — No effect atom for "suppress concentration break for named spell" (atom_widening)

Even if a `passive` family were added, the required effect concept is absent from v4:

- `suppress` (v4 §2 Procedure Atoms) — a procedure, not an effect; expresses cancelling another feature's output, not intercepting a damage-triggered save requirement.
- `concentrate` (v4 §6 Lifecycle Atoms) — tracks that concentration is maintained; does not expose a hook for blocking the saving throw check.
- `negate_named_effect` (v4 §9 Effect Atoms) — negates spell effects by name; does not address the concentration-save trigger fired by incoming damage.

The missing concept: an effect that permanently prevents damage events from opening the concentration-save window, scoped to a specific named spell.

## Proposed Widenings

### W1: `passive` family for `ClassFeatureMechanics`

A new mechanics family for always-on class features with no activation cost, no use-count resource, and no rest cadence.

```typescript
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive";
  readonly effect: ClassFeaturePassiveEffect;
};

export type ClassFeatureMechanics =
  | ClassFeatureActivationMechanics
  | ClassFeaturePassiveMechanics;
```

The tracer would need a new `traceClassFeaturePassive` branch in `traceClassFeatureMechanics`.

### W2: `suppress_concentration_break` effect atom (atom_widening)

New effect atom — goes into v4 §9 Effect Atoms:

```typescript
export type SuppressConcentrationBreakEffect = {
  readonly kind: "suppress_concentration_break";
  readonly scope:
    | { readonly kind: "named_spell"; readonly spellId: string }
    | { readonly kind: "any" };
};
```

For Relentless Hunter: `scope = { kind: "named_spell", spellId: "hunters_mark" }`.

Graph shape: `class_feature_root → passive_activate → suppress_concentration_break → attaches_to self`.

## Classification

**`structural_widening`** — the missing `passive` family is the blocking structural gap. The missing atom is a secondary gap that would need to be resolved alongside the family addition.
