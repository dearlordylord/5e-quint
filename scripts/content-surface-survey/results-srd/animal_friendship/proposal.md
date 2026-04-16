# Widening Proposal: Animal Friendship

**Unit:** Animal Friendship (spell, SRD 5.2.1)  
**Outcome:** `surface_widening`  
**Confidence:** high

---

## Why the unit doesn't fit

Animal Friendship is a Level 1 Enchantment spell with the following mechanical skeleton:

- Casting time: Action
- Range: 30 ft (point)
- Duration: 24 hours (timed, with an early-termination trigger)
- Target: one Beast (slot-scaling: +1 Beast per slot above 1)
- Resolution: Wisdom saving throw
- On fail: apply Charmed condition for the duration
- Spell ends early if the caster or an ally deals damage to the target

The `activation` family with a `save_gate` phase is the right structural fit. The slot-scaling target count maps directly to the `choose_up_to` + `SlotScaling<number>` pattern already used by Bless. Everything in the header is expressible.

The spell breaks on two surface type gaps:

### 1. `Effect` type has no `apply_condition` variant (blocker)

```typescript
export type Effect = DamageEffect | NoneEffect;
```

The `save_gate` phase's `onFail`/`onSuccess` fields are `Effect`. Animal Friendship's only outcome is applying the Charmed condition — there is no damage, no `none`. There is no honest way to represent the rule without adding `apply_condition` to the `Effect` union.

The `apply_condition` atom already exists in the v4 taxonomy (§9 Effect Atoms). This is a surface gap, not a taxonomy gap.

**Proposed addition:**

```typescript
export type ApplyConditionEffect = {
  readonly kind: "apply_condition";
  readonly condition: Condition;
};

export type Effect = DamageEffect | NoneEffect | ApplyConditionEffect;
```

### 2. `Condition` type is too narrow (blocker)

```typescript
export type Condition = "prone";
```

Animal Friendship requires `"charmed"`. All standard SRD 5.2.1 conditions will be needed as the survey progresses. The single-member union was bootstrapped for Topple; it must grow to cover the full set.

**Proposed expansion (minimum for this unit):**

```typescript
export type Condition =
  | "charmed"
  | "frightened"
  | "incapacitated"
  | "paralyzed"
  | "poisoned"
  | "prone"
  | "restrained"
  | "stunned";
```

(Only `"charmed"` is strictly required for this spell; expanding the full standard set is recommended to avoid repeated one-at-a-time widenings as other spells land.)

### 3. `Duration` has no conditional-break variant (secondary gap)

```typescript
export type Duration =
  | { readonly kind: "instantaneous" }
  | { readonly kind: "concentration"; readonly upTo: DurationValue }
  | { readonly kind: "timed"; readonly value: DurationValue };
```

Animal Friendship has a 24-hour timed duration **plus** an early-termination trigger: the spell ends if the caster or any ally deals damage to the target. The `self_break` lifecycle atom exists in v4 but the `Duration` surface type cannot express conditional expiry alongside a timed baseline.

This is a secondary gap — the `timed` variant can encode the spell partially (duration is faithfully represented), but the damage-break clause is dropped silently. Encoding it properly requires a `Duration` variant that carries optional break conditions:

```typescript
| {
    readonly kind: "timed";
    readonly value: DurationValue;
    readonly breakOn?: ReadonlyArray<DurationBreakCondition>;
  }
```

Where `DurationBreakCondition` would be a closed enum including at minimum:

```typescript
export type DurationBreakCondition =
  | { readonly kind: "caster_or_ally_damages_target" };
```

### 4. Target attachment lacks creature-type filter (minor gap)

The `target` attachment has no creature-type predicate. The spell is restricted to Beasts. This is an authoring-fidelity gap — if the engine enforces eligibility separately from the content surface, this may be acceptable to omit, but it means the authored record cannot express the eligibility restriction:

```typescript
export type Attachment =
  | ...
  | {
      readonly kind: "target";
      readonly selection: TargetSelection;
      readonly creatureTypes?: ReadonlyArray<CreatureType>;  // new optional filter
    }
```

---

## Encoding once widened

With `apply_condition` added to `Effect`, `"charmed"` added to `Condition`, and the damage-break clause either omitted or expressible, the encoding is:

```
family: activation
castingTime: action
range: point 30ft
duration: timed 24h  (+ breakOn: caster_or_ally_damages_target once expressible)
phases:
  - kind: save_gate
    attachment: target (choose_up_to: 1 + 1/slot above 1)
    ability: wis
    dc: caster_spell_save_dc
    onFail: { kind: apply_condition, condition: charmed }
    onSuccess: { kind: none }
```

No new v4 atoms required. No new spell family required. Both `apply_condition` and `self_break` are already in the v4 taxonomy (§9 and §6 respectively). This is a clean two-variant surface widening.

---

## Priority

**High.** The `apply_condition` + `Condition` gap will recur for every enchantment, hold, fear, and paralysis spell in the survey. The `Condition` type growing from `"prone"` to the standard SRD set unblocks a large class of spells simultaneously. Recommend widening both before re-encoding this unit.
