# Proposal: Conjure Elemental — structural_widening

## Summary

Conjure Elemental cannot be honestly encoded in the current surface. The spell's core mechanic is a **stationary conjured spirit entity** that persistently occupies a location and independently opens save-gate windows when creatures move nearby. No existing payload family models this shape. The nearest family, `anchored_trigger`, terminates at `AnchoredSignal` (audible/mental notifications) rather than a combat-effect pipeline. Beyond the structural gap, four additional surface widenings are required to express the spell's effects.

---

## Primary gap: missing conjured-spirit family

The spell creates a Large intangible spirit at a point in range. The spirit:
- persists for concentration up to 10 minutes
- occupies a location (a space on the grid)
- triggers independently: "whenever a creature enters the spirit's space or starts its turn within 5 feet"
- has runtime state: tracks whether any creature is currently Restrained by it

None of the four spell families capture this:

| Family | Why it fails |
|---|---|
| `activation` | One-shot; no persistent entity placed at a location |
| `ongoing_effect` | Attaches to targets (via `roll_modifier` or `damage_on_hit`); no location entity or entry trigger |
| `triggered_reaction` | Caster reacts to an event; no persistent zone |
| `anchored_trigger` | Closest: plants something at a location, but emits only `AnchoredSignal` — not damage or conditions |

The needed family would model: **cast → create spirit entity at location → spirit autonomously opens save-gate windows on creature entry/turn-start → gated on spirit's current condition-occupancy state**.

A candidate name: `conjured_spirit` or, more generically, `persistent_zone_entity`. This would be a new top-level `SpellMechanics` family with its own mechanics header covering:
- the spirit's attachment (location at range point)
- the per-creature-per-turn trigger condition (enter space OR start turn within N feet)
- the conditional trigger guard (only when spirit has 0 Restrained targets)
- the on-fail branch (damage + apply_condition)
- the repeat-save loop (each turn of a Restrained target)
- the on-success branch of the repeat save (remove_condition)

---

## Secondary gaps (all required before honest encoding)

### 1. `Condition: "restrained"`

`Condition` is currently closed at `"prone"`. The spell applies and removes the Restrained condition. This widening would also unlock encoding of other Restrained-applying spells (Ensnaring Strike, Grasping Vine, Evard's Black Tentacles, etc.).

```typescript
export type Condition = "prone" | "restrained";
```

### 2. `Effect: apply_condition`

The `Effect` union (`DamageEffect | NoneEffect`) has no way to express condition application. The on-fail save branch here deals damage AND applies Restrained — two effects on one branch. This requires either a compound effect or an `apply_condition` variant. The v4 atom `apply_condition` already exists.

```typescript
export type ApplyConditionEffect = {
  readonly kind: "apply_condition";
  readonly condition: Condition;
};
export type Effect = DamageEffect | NoneEffect | ApplyConditionEffect;
```

### 3. `Effect: remove_condition`

The on-success branch of the repeat save removes Restrained. `remove_condition` is in v4 but not in the `Effect` union.

```typescript
export type RemoveConditionEffect = {
  readonly kind: "remove_condition";
  readonly condition: Condition;
};
```

### 4. `ActivationPhase: repeat_save`

The v4 resolution atom `repeat_save` has no corresponding `ActivationPhase` variant. The Restrained target repeats the DEX save at the start of each of its turns. This requires a new phase kind:

```typescript
| {
    readonly kind: "repeat_save";
    readonly trigger: RepeatSaveTrigger;  // e.g. { kind: "start_of_restrained_target_turn" }
    readonly ability: Ability;
    readonly dc: DcSource;
    readonly onFail: Effect;
    readonly onSuccess: Effect;
  }
```

`RepeatSaveTrigger` would be a new closed enum (narrow starting shape: `start_of_restrained_target_turn`).

### 5. Conditional trigger guard: `condition_occupancy_check`

The save window only opens "if the spirit has no creature Restrained." This is a runtime guard keyed on the spirit's current state — zero attached creatures currently hold the Restrained condition. No existing surface shape models a trigger conditional on runtime condition-occupancy of the caster's effect. A new trigger guard type would be needed:

```typescript
export type TriggerGuard =
  | { readonly kind: "no_restrained_targets" };
```

This guard would sit on the per-creature trigger, preventing the window from opening when the spirit already has a Restrained creature.

---

## Cast-time parameter (not a widening)

The element choice (air=Lightning, earth=Thunder, fire=Fire, water=Cold) is a cast-time selection of damage type. The `DamageType` union already covers all four values. This is an authoring-time parameter (`damageType: DamageType`), not a structural gap.

## Slot scaling (not a widening)

+1d8 per slot level above 5 maps cleanly to `linear_per_level` with `axis: "slot"`. No widening needed once the structural family exists.

---

## Atom inventory check

| Needed atom | In v4? | In types.ts? |
|---|---|---|
| `apply_condition` | yes | no (only mastery `save_gate` result, not general Effect) |
| `remove_condition` | yes | no |
| `repeat_save` | yes | no (resolution atom only, no ActivationPhase variant) |
| `create_companion` / spirit entity | v4 has `create_companion` | no |
| `condition_occupancy_check` guard | no | no |

The conditional trigger guard is a genuine new atom (not in v4), which would normally push this toward `atom_widening`. However, the primary blocker is the absence of a family that can even host these atoms — making `structural_widening` the correct classification.
