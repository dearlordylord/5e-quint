# Proposal: Channel Divinity (Cleric L2)

**Outcome**: `structural_widening`  
**Slug**: `cleric_channel_divinity`

---

## Why this unit cannot be encoded honestly

Channel Divinity has three independent blocking gaps. No honest encoding is possible until all three are resolved.

---

## Gap 1 (Structural): Shared resource pool across composite activation options

### The rule

Channel Divinity is a single class feature with a **shared use-count pool** (2 uses at L2, scaling with Cleric level). The caster chooses *which* Channel Divinity effect to create each time they spend one of those uses. Divine Spark and Turn Undead draw from the same pool.

### Why the surface can't express this

`CompositeClassFeatureMechanics` exists:

```typescript
export type CompositeClassFeatureMechanics = {
  readonly family: "composite";
  readonly parts: ReadonlyNonEmptyArray<ClassFeatureComponentMechanics>;
};
```

But each `ActivatedAbilityMechanics` part carries its own **independent** `resource` and `resetCadence`. There is no mechanism to say "these two activation options share one pool." Encoding both as separate parts would give them each their own independent 2-use counter — that misrepresents RAW and lets the caster use Divine Spark twice *and* Turn Undead twice instead of 2 total.

### Proposed widening

A new subgraph concept: **named shared resource pool** referenced by id across activation options within a composite. Analogous to how spell slots are shared across all spells — a named `ChannelDivinityPool` resource is consumed by whichever option fires. The composite wrapper owns the pool; each part references it by name.

This affects many other class features: Bardic Inspiration sub-options, Ki points (Monk), Superiority Dice (Fighter), Wild Shape (Druid), Sorcery Points — all are "shared pool, choose which sub-ability to spend on" patterns.

---

## Gap 2 (Structural): Activation-time choice between a direct EffectAtom and a save_gate ActivationPhase

### The rule (Divine Spark)

> "You either restore Hit Points to the creature equal to that total **or** force the creature to make a Constitution saving throw."

At activation time the caster makes a binary choice:
- **Branch A (heal)**: direct `heal_hp` application — an `EffectAtom`
- **Branch B (damage)**: `save_gate` resolution — an `ActivationPhase` kind

### Why the surface can't express this

`CastTimeEffectModeChoice` exists and handles cast-time branching (Alter Self):

```typescript
export type CastTimeEffectModeChoice = {
  readonly label: string;
  readonly options: ReadonlyNonEmptyArray<{
    readonly id: string;
    readonly displayName: string;
    readonly effects?: ReadonlyNonEmptyArray<EffectAtom>;  // only EffectAtom[]
  }>;
  readonly allowsMidDurationSwitchAs?: "magic_action";
};
```

The options only accept `EffectAtom[]`. But Branch B (damage) is a `save_gate` — that is an `ActivationPhase` kind, not an `EffectAtom`. `save_gate` only appears in `ActivationPhase` and `OngoingEffect`; it is not in the `EffectAtom` union.

The `direct` phase also can't branch: phases always execute in sequence; there's no "if player chose heal, skip save_gate phase" conditional.

### Proposed widening

Either:

1. Widen `CastTimeEffectModeChoice` so that an option can carry a full `ActivationPhase` (or a sequence of phases) instead of only `EffectAtom[]`. This gives each mode branch its own resolution graph.

2. Or introduce a new `conditional_choice` ActivationPhase kind where each branch is an independent sub-phase sequence selected at cast time.

Option (1) is narrower and reuses existing concepts. Option (2) is more general but risks complexity.

Secondary note: Divine Spark's damage type ("Necrotic or Radiant, your choice") maps cleanly to `CastTimeChoice<DamageType>` which already exists — that part is not a gap.

---

## Gap 3 (Surface widening): Missing DurationEndTrigger variants for caster state

### The rule (Turn Undead)

> "This effect ends early on the creature if it takes any damage, **if you have the Incapacitated condition, or if you die.**"

### Why the surface can't express this

`DurationEndTrigger` is a closed union with target-state and caster-action variants:

```typescript
export type DurationEndTrigger =
  | { readonly kind: "target_makes_attack_roll" }
  | { readonly kind: "target_deals_damage" }
  | { readonly kind: "target_casts_spell" }
  | { readonly kind: "target_dons_armor" }
  | { readonly kind: "target_damaged_by_caster_or_ally" }
  | { readonly kind: "target_takes_damage" }       // ← covers the damage clause
  | { readonly kind: "caster_recasts_spell" };
```

`target_takes_damage` covers the first clause. But there are no variants for:
- Caster gains a condition (`caster_has_condition`)
- Caster dies (`caster_dies`)

### Proposed widening

Add two new `DurationEndTrigger` variants:

```typescript
| { readonly kind: "caster_has_condition"; readonly condition: Condition }
| { readonly kind: "caster_dies" }
```

These patterns recur across the SRD (many concentration spells end if the caster dies; some enchantments end if the caster is Incapacitated). The gap is narrow and the fix is additive.

---

## Secondary observations (not blocking, noted for completeness)

- **Turn Undead "tries to move as far away from you"**: This behavior is fully implied by the Frightened condition (SRD: "can't willingly move closer to the source of its fear"). No new atom is needed; it's DM agenda derived from the condition.
- **Use-count scaling**: The Channel Divinity uses column (2 at L2, more at higher levels) maps to `ThresholdTiers<number>` with `axis: "class"`. This already exists; once Gap 1 is resolved, the scaling is encodeable.
- **Divine Spark damage scaling** (1d8 at L2 → 4d8 at L18): Maps to `DiceAmount.threshold_tiers` with class axis. Already supported; not a gap.
