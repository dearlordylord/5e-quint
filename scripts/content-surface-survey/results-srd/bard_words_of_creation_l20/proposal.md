# Proposal: Words of Creation (bard L20)

## Outcome: `structural_widening`

## Why it doesn't fit

Words of Creation has two mechanics:

1. **Always-prepared grant** — the bard permanently has *Power Word Heal* and *Power Word Kill* prepared.
2. **Cast-time secondary target** — when casting either spell, the bard may target a second creature within 10 feet of the first.

Both are **passive and permanent**. There is no activation, no use count, and no reset cadence.

The only current `ClassFeatureMechanics` family is `activation`, whose header unconditionally requires:

```typescript
type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;   // not applicable
  readonly resource: UseCountResource;                    // not applicable — no resource
  readonly resetCadence: RestResetCadence;               // not applicable — no reset
};
```

Encoding Words of Creation under `activation` with fabricated `use_count` / `resetCadence` values would produce a false trace — the tracer would emit `use_count`, `rest_window`, and `activate` nodes that have no basis in the rule text. That violates the project's honesty guardrail.

## Proposed widenings

### 1. New class feature family: `passive_modifier` (structural)

A second top-level family for class features that grant permanent, always-on modifications:

```typescript
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive_modifier";
  readonly effects: ReadonlyArray<ClassFeaturePassiveEffect>;
};
```

No activation cost, resource, or reset cadence fields — those concepts don't exist for passive features.

Pressure cases: Words of Creation (bard L20), Jack of All Trades (bard L2, adds half PB to non-proficient checks), various passive proficiency/sense grants across classes.

### 2. New `ClassFeatureEffect` variant: `grant_spell_access` (surface)

The v4 taxonomy already lists `grant_spell_access` as an effect atom. It needs to be added to the TypeScript surface as a `ClassFeatureEffect` variant:

```typescript
export type GrantSpellAccessEffect = {
  readonly kind: "grant_spell_access";
  readonly spellIds: ReadonlyArray<string>;
  readonly alwaysPrepared: true;
};
```

Pressure: Words of Creation (always-prepared PWH + PWK), Life Domain Spells (always-prepared domain spells), Magical Discoveries, and many subclass "bonus spells" patterns.

### 3. New atom or surface variant: secondary-target-adjacent modifier (atom)

"When you cast either spell, you can target a second creature with it if that creature is within 10 feet of the first target."

This is a permanent, feature-granted modification of specific named spells' targeting. It differs from:

- **slot-based `scale_target_count`** — that scales within the spell's own upcast rules; this is a class feature adding a target option on top of the base spell definition
- **`choose_up_to` selection** — that is part of the spell's own attachment grammar; this is a rider from outside the spell

A new surface type is needed, tentatively:

```typescript
export type ModifyNamedSpellTargetingEffect = {
  readonly kind: "modify_named_spell_targeting";
  readonly spellIds: ReadonlyArray<string>;
  readonly additionalTargets: number;
  readonly constraint: { readonly kind: "within_feet_of_primary"; readonly feet: number };
};
```

This would map to a new v4 atom (`modify_named_spell_targeting` or similar), or could be expressed as a composition of existing atoms if the taxonomy team determines that `scale_target_count` + a new `named_spell_scope` qualifier covers it.

## Summary

| Gap | Kind | Blocking |
|-----|------|---------|
| No passive class feature family | `structural_widening` | Yes — cannot author any record |
| `ClassFeatureEffect` missing `grant_spell_access` | `surface_widening` | Yes — needed inside passive family |
| No atom for feature-granted adjacent secondary target | `atom_widening` | Yes — needed inside passive family |

All three gaps must be resolved before this unit can be cleanly encoded.
