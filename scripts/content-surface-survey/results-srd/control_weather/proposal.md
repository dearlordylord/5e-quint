# Proposal: Control Weather — Structural Widening

## Unit

**Control Weather** (level 8 transmutation, SRD 5.2.1, concentration up to 8 hours)

## Why it doesn't fit

Control Weather's core mechanic is **staged environmental state mutation**: the caster shifts one of three weather axes (precipitation, temperature, wind) by ±1 on a DM-initialized discrete table, repeatably during concentration. It has no attack rolls, saving throws, conditions, damage, healing, or creature-targeted riders.

Checking each existing family:

| Family | Why it fails |
|---|---|
| `ongoing_effect` | `OngoingOperation` is closed to `roll_modifier` and `damage_on_hit`. Weather stage mutation is neither. |
| `activation` | `ActivationPhase` is closed to `attack_roll` and `save_gate`. Control Weather has neither. |
| `triggered_reaction` | Requires Reaction casting time. Casting time is 10 minutes. |
| `anchored_trigger` | Requires an anchor point + event-triggered release. The spell grants ongoing direct control, not a stored trigger released by an external event. |

There is no honest encoding path.

## Proposed widenings

### 1. New family: `world_state_control` (structural)

A new `SpellMechanics` family is needed for spells whose primary mechanic is steering staged, enumerable world-state variables within a radius over a concentration duration.

Sketch of the new family shape:

```typescript
type WeatherAxis = "precipitation" | "temperature" | "wind";

type WorldStateAxis = {
  readonly kind: "weather_stage";
  readonly axis: WeatherAxis;
};

type WorldStateMutation = {
  readonly kind: "shift_stage";
  readonly axes: ReadonlyArray<WorldStateAxis>;
  readonly delta: -1 | 0 | 1;  // shift by one up or down
  readonly transitionDelay?: DiceExpr;  // 1d4 × 10 min
};

type WorldStateControlMechanics = SpellMechanicsHeader & {
  readonly family: "world_state_control";
  readonly area: { readonly kind: "self_radius"; readonly miles: number };
  readonly castConditions?: ReadonlyArray<CastCondition>;
  readonly terminationConditions?: ReadonlyArray<TerminationCondition>;
  readonly operation: WorldStateMutation;
};
```

This family would also cover future spells like Move Earth, Control Water (partial), and Earthquake that mutate large-scale environmental features rather than targeting creatures.

### 2. New `Range` variant: `self_radius_miles` (surface)

The existing `Range` type supports `self`, `touch`, and `point { feet }`. Control Weather's range is a 5-mile sphere centered on the caster — not a targetable point. A `self_radius` variant with a `miles` (or large-feet) dimension is needed.

```typescript
| { readonly kind: "self_radius"; readonly miles: number }
```

Evidence: *"You take control of the weather within 5 miles of you for the duration."*

### 3. New `CastCondition` / `TerminationCondition` surface types (surface)

The spell requires being outdoors at cast time and terminates early if the caster goes indoors. No existing surface type models:

- A precondition on the physical environment required for casting
- A circumstantial (non-timed, non-concentration-break) termination condition

```typescript
type CastCondition =
  | { readonly kind: "must_be_outdoors" };

type TerminationCondition =
  | { readonly kind: "caster_goes_indoors" };
```

Evidence: *"You must be outdoors to cast this spell, and it ends early if you go indoors."*

### 4. New `TransitionDelay` surface variant (surface)

After shifting a weather stage, 1d4×10 minutes pass before the new conditions take effect. This random latency between caster action and effect manifestation has no existing surface type.

Evidence: *"It takes 1d4 × 10 minutes for the new conditions to take effect."*

### 5. New v4 atom: `modify_world_state` (atom)

All existing v4 effect atoms target creatures, rolls, movement, or named spell-effects on creatures/objects. A new atom is needed for the mutation of staged environmental state variables within a large area. This would be the primary effect atom granted by the `world_state_control` family.

Evidence: *"find a current condition on the following tables and change its stage by one, up or down."*

## Classification

`structural_widening` — no existing `SpellMechanics` family can honestly represent this unit. The widening is at the family level, with secondary surface and atom widenings.

## Pressure assessment

This pattern (large-area environmental control with staged progression tables) is unlikely to be a one-off. Other pressure candidates: Control Water (four distinct modes, some analogous), Move Earth, Earthquake, Wind Walk (travel mode, no creature attack). A `world_state_control` family is not Control-Weather-specific.
