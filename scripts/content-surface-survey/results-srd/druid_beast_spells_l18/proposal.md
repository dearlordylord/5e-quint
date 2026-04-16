# Proposal: Beast Spells (druid L18)

**Outcome:** `structural_widening`

## Unit summary

> While using Wild Shape, you can cast spells in Beast form, except for any spell that has a Material component with a cost specified or that consumes its Material component.

## Why encoding was blocked

### 1. Missing family: `passive` for `ClassFeatureMechanics`

The current schema:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
```

with header:

```typescript
type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: UseCountResource;
  readonly resetCadence: RestResetCadence;
};
```

Every class feature encoding must carry `resource` (a `UseCountResource`) and `resetCadence`. Beast Spells has **neither**. It is always active whenever the druid is in Wild Shape — no activation event, no use count, no rest reset. The `activation` family is semantically for features the character *uses* (Second Wind, Action Surge, Channel Divinity). Beast Spells is a **passive capability modifier** that permanently changes what is legal during Beast form.

Forced encoding would require inventing a `use_count: { kind: "fixed", uses: 1 }` and a `resetCadence` that have no grounding in the SRD text — which the guardrails explicitly prohibit.

**Proposed addition:** A `passive` family for `ClassFeatureMechanics` (and a corresponding header with no resource/reset fields) for features that are always-on or conditionally-on without any activation mechanism. Candidate features in the same structural category: Danger Sense (barbarian L2), Evasion (rogue/monk), Reliable Talent (rogue), Elusive (rogue L18), Unarmored Defense variants.

### 2. Missing effect atom: `lift_form_restriction` / `modify_spellcasting_restriction`

Even with a `passive` family, the *effect* has no atom. The feature's mechanical payload is:

- **Grant**: druid may cast spells while in Beast form
- **Carve-out**: spells with a specified-cost M component, or a consumed M component, remain prohibited

This is not `GrantExtraActionEffect` (no extra action granted) and not `HealHpEffect` (no healing). The closest v4 effect atom is `grant_spell_access`, but that grants access to *specific named spells* — this is a blanket **permission modifier** that lifts a restriction on the caster's entire prepared spell list, conditional on form-state, with a carved-out exception.

**Proposed atom:** `lift_form_restriction` or `modify_spellcasting_restriction` — an effect that removes a prior rule-imposed restriction on spellcasting while in a specific creature form. The atom would carry:
- `form`: the target form-state (Beast, for Wild Shape)
- `exception`: a filter describing which spells remain restricted (costly M / consumed M)

The exception grammar itself is new surface vocabulary: no current `SpellMechanics.components` shape distinguishes "M with specified cost" or "M that is consumed" as a filter predicate.

## Downstream considerations

If a `passive` family is added, the tracer's `traceClassFeatureMechanics` switch will need a new branch. The family would emit a `class_feature_root → activate` or `class_feature_root → persist` node (or a new `always_on` procedure atom, depending on taxonomy decisions).

The M-component exception grammar (costly vs. consumed) is additional surface vocabulary not currently present on `Components`. It would become necessary for any future feature that distinguishes spell-component cost as a filter (e.g., Wild Magic Surge interactions, certain feat restrictions).

## Confidence

**High.** The structural mismatch is unambiguous — the mandatory header fields (`resource`, `resetCadence`) have no honest values for this feature, and the effect is not in `ClassFeatureEffect`. No interpretation of the SRD text could make this fit without fabricating resource semantics.
