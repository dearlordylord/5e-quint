# Proposal: Divine Spark — surface_widening

## Unit

**Divine Spark** — Cleric level 2 class feature (Channel Divinity option)

SRD text:
> As a Magic action, you point your Holy Symbol at another creature you can see within 30 feet of yourself and focus divine energy at it. Roll 1d8 and add your Wisdom modifier. You either restore Hit Points to the creature equal to that total or force the creature to make a Constitution saving throw. On a failed save, the creature takes Necrotic or Radiant damage (your choice) equal to that total. On a successful save, the creature takes half as much damage (round down).
>
> You roll an additional d8 when you reach Cleric levels 7 (2d8), 13 (3d8), and 18 (4d8).

## What fits

- **Kind**: `class_feature` ✓
- **Family**: `activation` ✓ (Magic action, use_count resource, partial_short_full_long reset)
- **Damage type choice**: `CastTimeChoice<DamageType>` with options `["necrotic", "radiant"]` ✓
- **Scaling**: `DiceAmount.threshold_tiers` with `axis: "class"`, base `{ dice: 1, dieSize: 8, abilityModifier: "wis" }`, tiers at L7 (2d8), L13 (3d8), L18 (4d8) ✓
- **Save gate for damage branch**: `ActivationPhase.save_gate` (Con save, DC = caster spell save DC, onFail = damage, onSuccess = half_damage) ✓
- **Heal branch**: `ActivationPhase.direct` with `heal_hp` effect atom ✓

## Blocking gap: cast-time choice between different resolution paths

The core mechanic is a **cast-time exclusive choice** between:

1. **Heal path**: directly restore HP equal to the roll (a `direct` phase with `heal_hp`)
2. **Damage path**: force a Constitution saving throw (a `save_gate` phase with damage on fail, half on success)

The existing `CastTimeEffectModeChoice` supports choosing between bundles of `EffectAtom` per option:

```typescript
export type CastTimeEffectModeChoice = {
  readonly label: string;
  readonly options: ReadonlyNonEmptyArray<{
    readonly id: string;
    readonly displayName: string;
    readonly effects?: ReadonlyNonEmptyArray<EffectAtom>; // ← only EffectAtom
  }>;
  ...
};
```

`EffectAtom` does not include `save_gate`. A `save_gate` is an `ActivationPhase`, not an `EffectAtom`. There is no `save_gate` variant in the `EffectAtom` union. The only save gate accessible inside an `EffectAtom` context is `OngoingEffect.save_gate`, which belongs to `OngoingOperation` in ongoing spell effects — not to activated abilities.

Encoding only one branch would be dishonest. Both branches are primary mechanics, not secondary riders.

## Proposed widening

**Allow `CastTimeEffectModeChoice` options to contain activation sub-phases.**

Option A — add a `phases` field parallel to `effects` in the option record:

```typescript
export type CastTimeEffectModeChoice = {
  readonly label: string;
  readonly options: ReadonlyNonEmptyArray<{
    readonly id: string;
    readonly displayName: string;
    readonly effects?: ReadonlyNonEmptyArray<EffectAtom>;
    readonly phases?: ReadonlyNonEmptyArray<ActivationPhase>; // NEW
  }>;
  readonly allowsMidDurationSwitchAs?: "magic_action";
};
```

Option B — promote `save_gate` to an `EffectAtom` variant. This has broader applicability but collapses the distinction between activation phases and effect atoms. The surface has kept these separate for good reasons (attachment scoping, half_damage semantics, etc.).

**Option A is preferred**: it preserves the existing phase/atom distinction while allowing mode choices to branch into full resolution gates. The tracer would emit a `save_gate` resolution node under the chosen mode node.

## Secondary gap: Channel Divinity shared pool

Channel Divinity is a shared resource pool between Divine Spark and Turn Undead (and subclass options). The current surface gives each `ActivatedAbilityMechanics` its own independent `resource`. There is no way to declare that two separate `ClassFeatureRecord` entries share the same use pool.

In practice, each unit is encoded with its own local resource, which overestimates available uses when both options exist. This is a known approximation in the current surface (shared resource pools have not been pressured by any unit so far). For Divine Spark specifically:

- Uses: 2 at L2, 3 at L6, 4 at L18 (threshold_tiers on class axis) — would need to be duplicated on every Channel Divinity option record
- Reset: `partial_short_full_long` with `shortRestRefill: 1`

This secondary gap does not block encoding; it's an honest approximation limitation.

## Evidence

- Blocking: "You either restore Hit Points to the creature equal to that total **or** force the creature to make a Constitution saving throw." — the "or" is a cast-time player choice between a direct effect and a resolution gate.
- Scaling: "You roll an additional d8 when you reach Cleric levels 7 (2d8), 13 (3d8), and 18 (4d8)."
