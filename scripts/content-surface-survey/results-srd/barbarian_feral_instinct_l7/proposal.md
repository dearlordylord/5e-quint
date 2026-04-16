# Proposal: Feral Instinct (Barbarian L7) — structural_widening

## Unit

**Feral Instinct** (Barbarian L7, SRD 5.2.1 §Classes/Barbarian#Level 7: Feral Instinct)

> Your instincts are so honed that you have Advantage on Initiative rolls.

## Why it doesn't fit

### Gap 1 — No `passive` family for `ClassFeatureMechanics` (structural)

The only existing `ClassFeatureMechanics` family is `activation`, whose header requires:

```typescript
type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: UseCountResource;
  readonly resetCadence: RestResetCadence;
};
```

Feral Instinct has none of these properties. It is a **permanent passive rider** — always on, not activated, not expended, never refilled. Coercing it into `activation` with a fictional `activationCost: { kind: "free" }` and a fictional `use_count` would produce a false trace: the tracer would emit `activate`, `use_count`, and `rest_window` nodes that have no basis in the SRD text.

**Required widening:** A new `passive` family (or equivalent `always_on` family) for `ClassFeatureMechanics` with no mandatory activation header. Shape sketch:

```typescript
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive";
  readonly effect: ClassFeaturePassiveEffect;
};
```

### Gap 2 — `"initiative"` missing from `RollKind` (surface)

Even with a `passive` family, the effect would need to encode "Advantage on Initiative rolls." The closest existing effect atom is `modify_roll_advantage` (used in mastery Sap), which operates on `ReadonlyArray<RollKind>`. `RollKind` is currently:

```typescript
export type RollKind = "attack_roll" | "saving_throw";
```

Initiative in SRD 5.2.1 is a Dexterity check made at the start of combat — distinct from attack rolls and saving throws. It is not representable by either existing variant.

**Required widening:** Add `"initiative"` to `RollKind` (or introduce a parallel `"initiative"` category that the passive effect can reference). The v4 atom `initiative_window` already exists, which confirms the taxonomy anticipates initiative as a distinct event.

### Effect atom availability

`modify_roll_advantage` exists in v4 and would serve the passive advantage effect once the family and roll-kind gaps are resolved. No new v4 atom is needed for the effect itself. The existing `initiative_window` atom maps cleanly to the window at which initiative is rolled.

## Proposed subgraph (if widening lands)

```
class_feature_root
  └─roots─> passive_effect
                └─grants─> modify_roll_advantage
                               └─on: initiative
                               └─mode: advantage
                               └─(permanent — no expiresOn)
```

Note: the `expiresOn` field on `ModifyRollAdvantageRider` is mastery-specific (it encodes rider expiry like "before your next turn"). A passive class feature has no expiry; the new effect type for the passive family should omit this field or make it optional.

## Classification

- **Primary:** `structural_widening` — no `passive` family exists in `ClassFeatureMechanics`
- **Secondary:** `surface_widening` — `"initiative"` absent from `RollKind`
- **No atom gap** — `modify_roll_advantage` and `initiative_window` already exist in v4
