# Proposal: surface_widening — Wand of Paralysis

## Unit

**Wand of Paralysis** — SRD 5.2.1 magic item, rare, attunement: spellcaster.

## Outcome

`surface_widening` — JSON typechecks, tracer completes, but the 60-foot
ray range cannot be expressed in `ActivatedAbilityMechanics`.

## What fits

All core mechanics encode cleanly into the existing surface:

| Mechanic | Surface encoding |
|---|---|
| 7-charge pool | `ActivationResource.charge_pool { cap: fixed(7) }` |
| Holding-item gate | `EquipmentPredicate.holding_item` |
| Magic action cost | `ClassFeatureActivationCost.standard_action "magic"` |
| Regains 1d6+1 at dawn | `TimeResetCadence.dawn { regain: fixed(1d6+1) }` |
| Effect window 1 min | `ActivatedAbilityHeader.duration: timed(1 minute)` |
| Con DC 15 save | `ActivationPhase.save_gate { ability: "con", dc: fixed(15) }` |
| Paralyzed on fail | `EffectAtom.apply_condition "paralyzed"` |
| Repeat save end-of-turn | `RepeatSaveSpec { cadence: "end_of_target_turn", onSuccess: "ends_on_target" }` |
| Last-charge destruction | `ItemDestructionPolicy.last_charge_roll { die: 20, destroyOn: 1 }` |

## Missing: `range` field on `ActivatedAbilityMechanics`

### SRD text

> "you can take a Magic action to expend 1 charge to cause a thin blue ray to streak from the tip **toward a creature you can see within 60 feet of yourself**"

### Problem

`ActivatedAbilityMechanics` (and its header `ActivatedAbilityHeader`) has no
`range` field. The tracer constructs a `SpellCtx` with `range: { kind: "self" }`
for all activated abilities, so the target attachment renders as:

```
att8["target | one | range Self"]
```

This is factually wrong — the wand fires at a creature up to 60 feet away, not
at self. The 60-foot constraint is authoring intent that the surface cannot
capture.

### Precedent

Two existing mechanics types already carry a `range` field for the same reason:

- `MagicItemSpawnedCreatureMechanics` — `readonly range: Range`
- `TriggeredReactionAbilityMechanics` — `readonly range: Range`

### Proposed widening

Add `range?: Range` to `ActivatedAbilityHeader` (optional to preserve
backward-compatibility with self-targeted features like Action Surge, Lay on
Hands, etc.):

```typescript
type ActivatedAbilityHeader = {
  readonly condition?: EquipmentPredicate;
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: ActivationResource;
  readonly resetCadence: ResetCadence;
  readonly duration?: Duration;
  readonly usageLimit?: UsageLimit;
  readonly range?: Range;   // NEW: explicit targeting range for ranged activations
};
```

The tracer's `traceActivatedAbility` would then use `m.range ?? { kind: "self" }`
when constructing its `SpellCtx`, exactly as `traceMagicItemSpawnedCreature`
already does for `MagicItemSpawnedCreatureMechanics`.

## Secondary: duration not traced for `ActivatedAbilityMechanics`

The `duration: { kind: "timed", value: { unit: "minute", amount: 1 } }` field
is present in the JSON and passes typecheck, but `traceActivatedAbility` does
not call `traceDuration`. The 1-minute persist/expire lifecycle nodes are absent
from the trace graph. This is a tracer gap, not a type-surface gap — no schema
change is needed, only a `traceDuration(m.duration, procId, nodes, edges, ids)`
call added to `traceActivatedAbility` when `m.duration !== undefined`.
