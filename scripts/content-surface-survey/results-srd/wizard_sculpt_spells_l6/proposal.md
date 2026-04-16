# Proposal: Sculpt Spells (wizard L6) — surface_widening

## Unit

- **Slug**: `wizard_sculpt_spells_l6`
- **Kind**: `class_feature`, wizard, acquired at level 6
- **Source**: SRD 5.2.1, Classes/Wizard#Level 6: Sculpt Spells

## Source Text

> When you cast an Evocation spell that affects other creatures that you can see, you can choose a number of them equal to 1 plus the spell's level. The chosen creatures automatically succeed on their saving throws against the spell, and they take no damage if they would normally take half damage on a successful save.

## Why It Does Not Fit

### Blocker 1: `ClassFeatureEffect` has no exemption/save-auto-success variant

`ClassFeatureEffect` is `GrantExtraActionEffect | HealHpEffect`. Neither covers the Sculpt Spells effect, which is:

- Choose up to (1 + spell level) creatures visible to the caster
- Those creatures **automatically succeed** on their saving throws against the spell
- They take **no damage** if they would normally take half on success

This is a spell-resolution exemption effect — mechanically distinct from granting an extra action or healing HP. A new variant is needed, e.g.:

```typescript
export type SpellExemptionEffect = {
  readonly kind: "exempt_from_spell";
  readonly maxTargets: { readonly kind: "one_plus_spell_level" };
  readonly exemptions: ReadonlyArray<"auto_succeed_save" | "no_half_damage">;
};
```

The count formula `1 + spell's level` is itself a new scaling shape: it depends on the level of the *specific spell being cast*, not character level, class level, or slot level. This is a new axis if it needs to be expressed generically.

### Blocker 2: `UseCountResource` has no unlimited/passive option

`ClassFeatureMechanicsHeader` requires:

```typescript
readonly resource: UseCountResource;
```

`UseCountResource` requires a `cap: UseCountCap` which is either `{ kind: "fixed" }` or `ThresholdTiers<number>`. There is no "passive" or "unlimited" option.

Sculpt Spells has no per-rest use limit. The SRD text states no restriction on how many times it may be used per rest. Forcing it into a fixed-cap resource would be dishonest.

Proposed extension:

```typescript
export type UseCountCap =
  | { readonly kind: "fixed"; readonly uses: number }
  | ThresholdTiers<number>
  | { readonly kind: "unlimited" };  // new: passive/always-available
```

Or, alternatively, make `resource` optional in `ClassFeatureMechanicsHeader` (with absence meaning "no expendable pool"):

```typescript
type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource?: UseCountResource;  // optional
  readonly resetCadence?: RestResetCadence;
};
```

### Observation: activation family is a poor semantic fit

Sculpt Spells does not have an independent activation. It is a passive modifier that fires as part of casting an evocation spell. The `activation` family implies:

- a discrete activation event (the wizard decides to use Action Surge, Second Wind, etc.)
- a separate `activationCost` (action, bonus action, or free)
- an expendable `resource` pool that depletes and resets on rest

None of these apply to Sculpt Spells. A new family could be introduced:

```typescript
export type ClassFeatureSpellCastModifierMechanics = {
  readonly family: "spell_cast_modifier";
  readonly trigger: SpellCastTrigger;   // e.g. { kind: "cast_evocation" }
  readonly effect: SpellCastModifierEffect;
};
```

This would also serve future features like Empowered Evocation (wizard L10), which similarly modifies spell damage at cast time without an independent activation or use pool.

## Proposed Widenings

| Kind | Name | Justification |
|---|---|---|
| `new_variant` | `ClassFeatureEffect::exempt_from_spell` (or `grant_save_auto_success`) | No current variant covers save-auto-success + no-half-damage for chosen targets |
| `new_variant` | `UseCountCap::unlimited` (or optional `resource` on header) | No current option for a passive class feature with no per-rest limit |
| `new_subgraph` | `passive_spell_cast_modifier` family | The `activation` family semantics (discrete activation, resource pool) don't apply to passive spell-cast modifiers |

## v4 Atom Coverage

The spell-exemption effect maps loosely to `modify_roll_substitute` (substitute a save result with automatic success), but:
- There is no current surface variant to carry this into `ClassFeatureEffect`
- The count formula `1 + spell level` uses the level of the spell being cast — a new axis not present in `LevelAxis`

The v4 atom `modify_roll_substitute` is the closest existing atom, but the surface type gap is the primary blocker.

## Outcome

`surface_widening` — The `class_feature` kind and `activation` family exist, but:
1. `ClassFeatureEffect` is missing a spell-exemption/save-auto-success variant
2. `UseCountResource` / `ClassFeatureMechanicsHeader` cannot represent unlimited/passive features

No `.dhall`, `.json`, or `.trace.md` authored.
