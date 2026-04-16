# Proposal: Widening for Precise Hunter (ranger L17)

## Unit

> **Level 17: Precise Hunter**
> You have Advantage on attack rolls against the creature currently marked by your *Hunter's Mark*.

## Outcome: `structural_widening`

The unit cannot be encoded honestly in the current surface. Three gaps must be closed.

---

## Gap 1 — Missing class-feature family: `passive`

**Problem:** `ClassFeatureMechanics = ClassFeatureActivationMechanics`. The only family is `activation`, which mandates `activationCost + resource (use_count) + resetCadence`. Precise Hunter has none of these: it is always-on, requires no action to trigger, has no charges, and has no rest-based reset. Encoding it as `activation` with `free` cost and a fake `use_count: { kind: "fixed", uses: 999 }` would produce a dishonest trace.

**Proposed widening:** Add a `passive` (or `conditional_modifier`) family to `ClassFeatureMechanics`:

```typescript
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive";
  readonly effect: ClassFeaturePassiveEffect;
};

export type ClassFeatureMechanics =
  | ClassFeatureActivationMechanics
  | ClassFeaturePassiveMechanics;
```

This family covers always-on, non-activated class features that permanently modify combat behavior while a prerequisite condition holds. Additional examples that would benefit: Barbarian Danger Sense (always-on DEX save Advantage), Rogue Uncanny Dodge (always-on reaction halving), etc.

---

## Gap 2 — Missing effect in `ClassFeatureEffect`: mark-scoped `modify_roll_advantage`

**Problem:** `ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect`. Neither variant can represent "Advantage on attack rolls against the marked target." The v4 atom `modify_roll_advantage` exists and is used in `MasteryEffect`, but it is not available in the class-feature effect vocabulary.

**Proposed widening:** Add a `modify_roll_advantage` variant to `ClassFeatureEffect` (or to a new `ClassFeaturePassiveEffect`):

```typescript
export type ModifyRollAdvantageEffect = {
  readonly kind: "modify_roll_advantage";
  readonly mode: "advantage" | "disadvantage";
  readonly on: ReadonlyArray<RollKind>;
  readonly scope: AttackRollScope;
};
```

Where `AttackRollScope` distinguishes "all attack rolls" from "attack rolls against a specific attachment."

---

## Gap 3 — Missing scope variant: `mark-scoped` attack roll modifier

**Problem:** The advantage is not unconditional — it applies specifically to attack rolls *against the creature currently marked by Hunter's Mark*. No existing attachment or scope type on a class-feature effect can express "the target must be carrying a specific mark."

**Proposed widening:** A `mark_scoped` scope variant for `ModifyRollAdvantageEffect`:

```typescript
export type AttackRollScope =
  | { readonly kind: "all" }
  | { readonly kind: "marked_target"; readonly markSpellId: string };
```

This would allow authoring the scope as `{ kind: "marked_target", markSpellId: "hunters_mark" }`, which correctly captures the dependency on the active Hunter's Mark attachment.

---

## Tracer impact

Once the three gaps are closed, the expected trace subgraph for Precise Hunter would be:

```
class_feature_root
  └─ roots ──► (no activate node — passive family)
                └─ grants ──► modify_roll_advantage
                               └─ on: [attack_roll]
                               └─ mode: advantage
                               └─ scope: marked_target (hunters_mark)
```

No `action_quota`, no `use_count`, no `rest_window` — the trace would honestly reflect a passive always-on modifier scoped to the Hunter's Mark attachment.

---

## Classification rationale

`structural_widening` (not `surface_widening`) because the primary blocker is the absence of a `passive` family. Even a surface fix to add `modify_roll_advantage` to `ClassFeatureEffect` would not be usable without the family change — the `activation` family would still mandate resource/reset fields that the rule does not have.
