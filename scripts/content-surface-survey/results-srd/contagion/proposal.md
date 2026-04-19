# Proposal: Contagion (surface / atom widenings)

## Unit

**Contagion** — SRD 5.2.1 level-5 Necromancy spell, touch range, 7-day timed duration (non-concentration).

## Why no honest encoding exists

Three distinct gaps block an honest encoding. Each is described below.

---

## Gap 1 — Threshold-based repeat save (surface_widening)

### Current surface

`RepeatSaveSpec` supports:
```typescript
type RepeatSaveSpec = {
  readonly cadence: "end_of_target_turn" | "on_target_takes_damage";
  readonly onSuccess: "ends_on_target";
  readonly onFailAgain?: EffectAtom;
};
```

`onSuccess: "ends_on_target"` terminates the spell after **one** success. This covers Hold Person (one success ends). It does not cover Contagion.

### What Contagion needs

> "The target must repeat the saving throw at the end of each of its turns until it gets **three successes** or **failures**. If the target succeeds on **three** of these saves, the spell ends on the target. If the target fails **three** of the saves, the spell lasts for 7 days on it."

The repeat save accumulates a counter. The spell resolves in either direction only when a threshold is crossed. The binary `onSuccess: "ends_on_target"` cannot express this.

### Proposed widening

Add two optional fields to `RepeatSaveSpec`:

```typescript
type RepeatSaveSpec = {
  readonly cadence: "end_of_target_turn" | "on_target_takes_damage";
  readonly onSuccess: "ends_on_target";
  readonly onFailAgain?: EffectAtom;
  // New:
  readonly successThreshold?: number;   // How many successes before spell ends (default 1)
  readonly failureThreshold?: number;   // How many failures before spell locks in (default: unlimited)
  readonly onFailureLockIn?: EffectAtom; // Effect applied when failureThreshold is crossed
};
```

Contagion would author:
- `successThreshold: 3` (3 successes → spell ends)
- `failureThreshold: 3` (3 failures → spell locks in for 7 days; the timed duration applies)
- `onFailureLockIn: { kind: "none" }` (the duration simply runs its full 7 days)

The existing `onSuccess: "ends_on_target"` with no threshold implies threshold=1, preserving backward compatibility with Hold Person et al.

---

## Gap 2 — Condition-removal interception trigger (atom_widening)

### Current surface

`OngoingTrigger` has these variants:
- `passive`, `on_caster_attack_hit`, `on_attached_turn_start`, `on_caster_turn_start`
- `on_attached_damaged`, `on_creature_moves`, `on_creature_enters_area`
- `on_creature_ends_turn_in_area`, `on_caster_spends_action`, `on_creature_studies`

None of these fire when an *external effect tries to remove a condition from the target*.

### What Contagion needs

> "Whenever the Poisoned target receives an effect that would end the Poisoned condition, the target must succeed on a Constitution saving throw, or the Poisoned condition doesn't end on it."

This is an intercept-and-gate mechanic: an incoming effect targeting a specific condition on the attached creature triggers a save; on failure, the removal is suppressed. It is distinct from all existing triggers because:

1. It fires in response to an *incoming mechanical event* (another effect being applied), not a turn-cadence or action event.
2. It *suppresses* the triggering effect on save failure — a gating semantic not expressible via existing `OngoingEffect`.

### Proposed widening

New `OngoingTrigger` variant:

```typescript
| {
    readonly kind: "on_condition_removal_attempt";
    readonly condition: Condition; // Which condition's removal to intercept
  }
```

Paired with a new `OngoingEffect` variant or an extension to `save_gate`:

```typescript
// OngoingEffect.save_gate when triggered by on_condition_removal_attempt
// onFail: the removal is suppressed (condition stays)
// onSuccess: the removal proceeds normally
```

The tracer would emit this as a `post_action_window` (closest existing window atom) or a new `intercept_window` to make the interception semantic explicit.

---

## Gap 3 — Cast-time ability choice for save disadvantage (surface_widening)

### Current surface

`modify_roll_advantage` has:
```typescript
readonly saveAbilityFilter?: ReadonlyNonEmptyArray<Ability>;
```

This accepts only a fixed list of abilities — chosen at authoring time, not cast time.

### What Contagion needs

> "choose one ability when you cast the spell. While Poisoned, the target has Disadvantage on saving throws made with the chosen ability."

The ability is selected by the caster at cast time, not predetermined in the authored unit. This is structurally parallel to `CastTimeChoice<DamageType>` already present in the surface.

### Proposed widening

Widen `saveAbilityFilter` to accept a cast-time choice:

```typescript
readonly saveAbilityFilter?:
  | ReadonlyNonEmptyArray<Ability>
  | CastTimeChoice<Ability>;
```

Alternatively, introduce a parallel field:

```typescript
readonly saveAbilityChoice?: CastTimeChoice<Ability>;
```

The first form is preferred — it mirrors the `DamageTypeRef = DamageType | CastTimeChoice<DamageType>` pattern already used in the surface.

---

## v4 taxonomy note

Gap 2 (condition-removal intercept trigger) is a genuinely new concept not in the v4 atom inventory. Gaps 1 and 3 are surface variants of existing concepts and do not require new v4 atoms; they require widening existing surface types.

## Classification

- Primary: `atom_widening` (Gap 2 — `on_condition_removal_attempt` trigger is not in v4)
- Secondary: `surface_widening` (Gaps 1 and 3 — `RepeatSaveSpec` threshold fields and `CastTimeChoice<Ability>` on `saveAbilityFilter`)
