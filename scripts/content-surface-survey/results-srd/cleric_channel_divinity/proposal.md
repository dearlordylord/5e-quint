# Proposal: Channel Divinity — structural_widening

## Unit

- **Slug**: `cleric_channel_divinity`
- **Kind**: `class_feature` (Cleric, level 2)
- **Outcome**: `structural_widening`

## What the SRD says

Channel Divinity (SRD 5.2.1, Classes/Cleric#Channel Divinity) is an activated class feature with a shared use pool. The Cleric activates it by **choosing** one of N sub-effect procedures at the time of use. The two base options are:

- **Divine Spark** (Magic action, 30 ft, single target): Roll 1d8 + WIS mod, then choose to either heal the target or impose a Con save — on fail, target takes Necrotic or Radiant damage (caster's choice) equal to the roll; on success, half damage. Scales to 2d8 at level 7, 3d8 at level 13, 4d8 at level 18.
- **Turn Undead** (Magic action, 30 ft): Each Undead of the caster's choice within 30 ft makes a Wis save. On fail: Frightened + Incapacitated for 1 minute, and the creature tries to move away on its turns. Ends early if the creature takes damage, the caster becomes Incapacitated, or the caster dies.

**Resource**: Starts at 2 uses; partial-short / full-long reset (one use on short rest, all on long rest). Additional uses from the Cleric Features table at higher levels.

## Why the existing surface cannot encode this honestly

### Gap 1 — No "activated choice" family (structural_widening)

The defining mechanic of Channel Divinity is **"activate one of N distinct sub-effect procedures, all consuming from a shared resource pool."** This pattern has no existing family:

| Family | Why it doesn't fit |
|---|---|
| `activation` (ActivatedAbilityMechanics) | Has `phases[]` — a linear sequence. No top-level branch selecting which set of phases to execute. |
| `composite` (CompositeClassFeatureMechanics) | Means "simultaneous parts," not "mutually exclusive choice at activation time." |
| `passive` | Channel Divinity is not always-on. |
| spell `activation` with `CastTimeEffectModeChoice` | Only available within a `direct` phase, and options can only contain `EffectAtom[]`, not full `ActivationPhase` subgraphs. |

The needed shape is roughly: an activated ability header (cost, resource, reset) + a cast-time choice node routing to one of N `ActivationPhase` sequences. This could be expressed as a new `activation_choice` family or as a widening of `ActivatedAbilityMechanics` to support a top-level `mode?: ActivatedModeChoice` field analogous to `direct.mode` in spells, but with `options[].phases: ActivationPhase[]` instead of `options[].effects: EffectAtom[]`.

### Gap 2 — CastTimeEffectModeChoice cannot branch into save_gate (surface_widening)

Even if we tried to encode Channel Divinity as a single `activation` with a `direct` phase carrying a `CastTimeEffectModeChoice`, it would fail for Divine Spark. The caster's at-use choice between "heal" and "save-gated damage" means one branch must be a `save_gate` phase — not a bundle of `EffectAtom`s. `CastTimeEffectModeChoice.options[].effects` is `ReadonlyNonEmptyArray<EffectAtom>`; an `ActivationPhase` cannot appear there.

Minimum widening: allow `options[].phases?: ReadonlyNonEmptyArray<ActivationPhase>` as an alternative to `options[].effects`.

### Gap 3 — Missing DurationEndTrigger variants (surface_widening)

Turn Undead's 1-minute duration ends early on three conditions:
1. "if it takes any damage" → `target_takes_damage` ✓ exists
2. "if you have the Incapacitated condition" → `caster_becomes_incapacitated` ✗ missing
3. "or if you die" → `caster_dies` ✗ missing

All existing `DurationEndTrigger` variants are target-side events. These two are caster-side state changes. Minimum widening: add two new variants to `DurationEndTrigger`.

### Out of scope (DM agenda)

The Turn Undead failure behavior "tries to move as far away from you as it can on its turns" is creature AI / movement decision — DM agenda. This is correctly omitted regardless of any surface gaps.

## What does fit

- **Scaling**: Divine Spark's 1d8 → 4d8 threshold-tier scaling by class level fits `threshold_tiers` on axis `"class"`.
- **Damage type choice**: Necrotic or Radiant → `CastTimeChoice<DamageType>` ✓
- **Ability modifier in dice**: 1d8 + WIS mod → `DiceExpr { abilityModifier: "wis" }` ✓
- **Turn Undead area**: emanation 30 ft with `TargetTypeFilter: ["undead"]` ✓
- **Composite condition**: Frightened + Incapacitated simultaneously → `apply_condition` with `ReadonlyNonEmptyArray<Condition>` ✓
- **Reset cadence**: `partial_short_full_long` with `shortRestRefill: 1` ✓
- **Save DC**: "the DC equals the spell save DC from this class's Spellcasting feature" → `caster_spell_save_dc` ✓

## Proposed widenings ranked by priority

1. **`activation_choice` family (or `ActivatedAbilityMechanics` mode widening)** — blocks the entire unit. Required to express any multi-option activated class feature with a shared pool.
2. **`CastTimeEffectModeChoice` phase-level branches** — blocks Divine Spark's heal/damage choice. Required if branches differ at resolution structure level.
3. **`DurationEndTrigger.caster_becomes_incapacitated` and `.caster_dies`** — blocks Turn Undead's early-end spec. Minor surface addition, high recurrence expected (caster-state ends are a common SRD pattern).
