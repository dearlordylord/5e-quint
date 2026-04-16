# Proposal: Widenings for Foe Slayer (ranger L20)

## Unit

- **Slug:** `ranger_foe_slayer_l20`
- **Kind:** `class_feature` / ranger / level 20
- **SRD text:** "The damage die of your *Hunter's Mark* is a d10 rather than a d6."

## Outcome

`structural_widening`

## Analysis

Foe Slayer is a passive, permanent character milestone. It is not activated — it simply makes Hunter's Mark use a d10 instead of a d6 for its damage die. There is no action cost, no resource, and no reset cadence.

### Gap 1: No passive-modifier family in ClassFeatureMechanics

The current `ClassFeatureMechanics` type has exactly one variant:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
```

`ClassFeatureActivationMechanics` requires `activationCost`, `resource` (a `UseCountResource`), `resetCadence`, and `effect`. For Foe Slayer, none of these fields have honest values:

| Field | Required? | For Foe Slayer |
|---|---|---|
| `activationCost` | yes | N/A — never activated |
| `resource` | yes | N/A — no use count |
| `resetCadence` | yes | N/A — no reset (permanent) |
| `effect` | yes | No valid variant exists |

A new family is needed. Tentative name: `"permanent_upgrade"` or `"passive_modifier"`. Shape sketch:

```typescript
export type ClassFeaturePassiveModifierMechanics = {
  readonly family: "passive_modifier";
  readonly effect: ClassFeaturePassiveEffect;
};
```

Where `ClassFeaturePassiveEffect` includes the cross-unit override described below.

### Gap 2: No cross-unit property override in ClassFeatureEffect

Even if the passive family existed, `ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect` has no variant that can express: "change the `dieSize` of the damage rider in `hunter's_mark` from 6 to 10."

This requires two new concepts:
1. A **cross-unit reference** — the feature names another unit by id.
2. A **property override** — it declares what changes in that unit's mechanical parameters.

Tentative shape:

```typescript
export type OverrideSpellDieSize = {
  readonly kind: "override_spell_die_size";
  readonly spellId: string;           // "hunters_mark"
  readonly dieSize: number;            // 10
};
```

This is not simply a `scale_die_size` scaling node (which models level-based growth) — it is a categorical replacement of the base die at a fixed class level. The distinction matters: `scale_die_size` implies a dynamic axis (character level, slot level, etc.); Foe Slayer is a static override that applies unconditionally once the ranger reaches level 20.

## Classification rationale

- **Not `surface_widening`** — the missing piece is not a new variant of an existing surface shape (e.g., a new `CastingTime` kind). The entire mechanics family is absent.
- **Not `atom_widening`** — `scale_die_size` already exists in v4. The gap is in the surface type structure and cross-unit reference capability, not in the atom inventory.
- **`structural_widening`** — the unit's shape (passive cross-unit die-size override) does not fit any existing `UnitRecord` kind + mechanics family combination.

## Recommended next steps

1. Add a `"passive_modifier"` family to `ClassFeatureMechanics`.
2. Add `ClassFeaturePassiveEffect` union that starts with `OverrideSpellDieSize`.
3. Model the cross-unit reference idiom carefully — decide whether references are by id string or by a richer typed pointer that the tracer can validate.
4. Re-encode Foe Slayer after the surface widens.

## Related pressure

Other level-capstone features that are always-on upgrades to earlier features (rather than new activatable abilities) will hit this same gap. Foe Slayer is likely the first of several such units in the full class roster.
