# Proposal: Natural Recovery (Druid L6) — surface_widening

## Unit

- **Slug:** `druid_natural_recovery_l6`
- **Kind:** `class_feature` / `ClassFeatureActivationMechanics`
- **Source:** SRD 5.2.1 — Classes/Druid, Level 6: Natural Recovery

## Why it does not fit

Natural Recovery has two independent sub-features. Neither maps to any existing `ClassFeatureEffect` variant, and the compound structure exceeds what `ClassFeatureActivationMechanics` can express.

---

### Sub-feature 1 — Free Spell Cast (Long Rest reset)

> "You can cast one of the level 1+ spells that you have prepared from your Circle Spells feature without expending a spell slot, and you must finish a Long Rest before you do so again."

**Gap:** No `ClassFeatureEffect` variant for "cast a prepared spell without consuming a slot." The closest atom in v4 is `grant_spell_access`, but that covers unlocking access to spells, not bypassing the slot cost at cast time. The v4 procedure atom `refund` exists but is not surfaced in `ClassFeatureEffect`, and it operates on already-expended slots, not pre-empting consumption.

**Proposed new variant:**
```typescript
export type FreeSpellCastEffect = {
  readonly kind: "free_spell_cast";
  // The source restriction ("from Circle Spells") is a preparation-list
  // filter, not a core mechanic; encode as a note or a closed filter enum
  // if needed.
  readonly minSpellLevel: SpellLevel;  // 1 for "level 1+"
};
```

---

### Sub-feature 2 — Spell Slot Recovery (Short Rest trigger, Long Rest reset)

> "when you finish a Short Rest, you can choose expended spell slots to recover. The spell slots can have a combined level that is equal to or less than half your Druid level (round up), and none of them can be level 6+. … Once you recover spell slots with this feature, you can't do so again until you finish a Long Rest."

**Gap 1 — missing effect type:** No `ClassFeatureEffect` variant for "recover expended spell slots up to a combined level budget." This pattern also appears in Wizard Arcane Recovery (L1) and Warlock Magical Cunning (L2).

**Proposed new variant:**
```typescript
export type RecoverSpellSlotsEffect = {
  readonly kind: "recover_spell_slots";
  // Combined level budget — scales with class level (druid: ceil(level/2))
  readonly combinedLevelBudget: DiceAmount | LinearPerLevel<number> | ThresholdTiers<number>;
  // Individual slot level ceiling (null = no ceiling)
  readonly maxSlotLevel: SpellLevel | null;  // 5 for "none can be level 6+"
};
```

**Gap 2 — missing activation cost trigger:** The activation for this sub-feature fires when you *finish a Short Rest*, not via a turn-order cost. The existing `ClassFeatureActivationCost` union (`free` | `bonus_action`) has no rest-event trigger mode.

**Proposed new variant:**
```typescript
// Extend ClassFeatureActivationCost
| { readonly kind: "short_rest_completion" }
```

Alternatively, this sub-feature may be better modeled as a `rest_window`-triggered activation rather than a cost — the player *may* choose to invoke it during a short rest. The `rest_window` atom already exists in v4; the surface needs a way to attach a class feature's activation to that window rather than to an action/bonus-action cost.

---

### Compound structure

The two sub-features are fully independent: separate use-count (×1 each), separate activation triggers (free at will vs. on-short-rest), same reset cadence (Long Rest). The current:

```typescript
export type ClassFeatureActivationMechanics = ClassFeatureMechanicsHeader & {
  readonly family: "activation";
  readonly effect: ClassFeatureEffect;  // ← single effect
};
```

cannot express two activations. A minimal widening: allow an array of independent activations, or a new `compound_activation` family:

```typescript
export type ClassFeatureCompoundMechanics = {
  readonly family: "compound_activation";
  readonly parts: ReadonlyArray<ClassFeatureActivationMechanics>;
};
```

This pattern would also serve Wizard Arcane Recovery, Warlock Magical Cunning, and any other feature that bundles multiple independent mechanics under one record.

---

## Atom inventory check

All required v4 atoms for the graph already exist:
- `use_count`, `rest_window`, `activate`, `class_feature_root` — present
- `refund` (v4 procedure) — present but not yet surfaced as a `ClassFeatureEffect`

The missing pieces are entirely in the **surface type layer** (`ClassFeatureEffect` variants and `ClassFeatureActivationCost` variants), not in the v4 taxonomy itself. This confirms `surface_widening` over `atom_widening`.

---

## Comparable units needing the same widening

- `wizard_arcane_recovery_l1` — same slot-recovery pattern, same combined-level budget shape
- `warlock_magical_cunning_l2` — similar slot-recovery semantics

Encoding any of these three units will require the same `RecoverSpellSlotsEffect` variant and the short-rest activation trigger.
