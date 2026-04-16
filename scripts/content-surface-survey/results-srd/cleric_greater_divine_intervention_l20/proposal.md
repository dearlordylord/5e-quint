# Proposal: Greater Divine Intervention (Cleric L20)

**Outcome:** `structural_widening`

## Source text

> When you use your Divine Intervention feature, you can choose *Wish* when you select a spell. If you do so, you can't use Divine Intervention again until you finish 2d4 Long Rests.

## Why it does not fit

Greater Divine Intervention is not a standalone activated class feature. It is a **conditional augmentation** to Divine Intervention (cleric L10): it adds one new option (Wish) that becomes available whenever the parent feature is invoked, and it imposes a heavier reset penalty when that option is taken.

The current `ClassFeatureMechanics` discriminated union has exactly one family, `activation`, which requires:
- an independent `activationCost` — does not exist here (the "cost" is subsumed by using Divine Intervention);
- its own `UseCountResource` + `RestResetCadence` — the resource is shared with Divine Intervention; the penalty reset (`2d4 Long Rests`) is conditional and rolled;
- a `ClassFeatureEffect` on activation — the effect is granting spell access to Wish, which has no variant.

Encoding this as an `activation` family record would require fabricating an independent activation that the SRD does not describe.

---

## Widening 1 — New subgraph: `feature_upgrade`

**Kind:** `new_subgraph`

A family for class features that augment an already-modeled feature rather than activating independently. The key distinguishing shape:

- references the `id` of a parent `ClassFeatureRecord` being extended;
- adds new `choices` or `options` injected into the parent feature's invocation flow;
- may specify a conditional `resetCadence` that overrides the parent's cadence when the new option is taken.

Example shape sketch:

```typescript
export type ClassFeatureUpgradeMechanics = {
  readonly family: "feature_upgrade";
  readonly upgrades: string; // id of the parent ClassFeatureRecord
  readonly additionalOptions: ReadonlyArray<FeatureOption>;
};
```

Evidence: *"When you use your Divine Intervention feature, you can choose Wish when you select a spell."*

---

## Widening 2 — New variant: `RestResetCadence { kind: "rolled_long_rests" }`

**Kind:** `new_variant`

The penalty cooldown is `2d4 Long Rests` — a dice expression that resolves to a random integer count of long rests required before the feature is available again. No existing `RestResetCadence` variant covers this.

Proposed addition:

```typescript
| {
    readonly kind: "rolled_long_rests";
    readonly expr: DiceExpr;
  }
```

Evidence: *"you can't use Divine Intervention again until you finish 2d4 Long Rests"*

---

## Widening 3 — New variant: `ClassFeatureEffect { kind: "grant_spell_access" }`

**Kind:** `new_variant`

The option injected into Divine Intervention grants the ability to cast Wish (a named spell) via that feature's invocation path. The v4 atom `grant_spell_access` exists in the taxonomy but is absent from the `ClassFeatureEffect` surface union, which currently contains only `grant_extra_action` and `heal_hp`.

Proposed addition:

```typescript
export type GrantSpellAccessEffect = {
  readonly kind: "grant_spell_access";
  readonly spellId: string;
};
```

Evidence: *"you can choose Wish when you select a spell"*

---

## Summary table

| # | Kind | Name | Blocking? |
|---|------|------|-----------|
| 1 | `new_subgraph` | `feature_upgrade` family | Yes — primary structural blocker |
| 2 | `new_variant` | `RestResetCadence: rolled_long_rests` | Yes — no surface slot for 2d4 LR reset |
| 3 | `new_variant` | `ClassFeatureEffect: grant_spell_access` | Yes — no surface slot for spell-access effect |

All three gaps must be closed before this unit can be honestly encoded.
