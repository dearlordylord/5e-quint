# Proposal: surface_widening for Compulsion

## Unit

**Compulsion** — 4th-level Enchantment, Concentration up to 1 minute, Action cast, 30 ft range, V/S.

## Outcome

`surface_widening` — Four missing surface variants prevent honest encoding. No dhall/json/trace produced.

## Spell mechanics summary

**On cast (save gate, multi-target):**
Each chosen visible creature within 30 ft makes a WIS save. On failure: gains the Charmed condition for the duration.

**Per turn while concentrating (caster-activated command):**
The caster may spend a Bonus Action to designate a horizontal direction. Every Charmed creature under this spell must then use all of its movement to travel in that direction on its next turn (taking the safest route). After completing that movement, the target repeats the WIS save; a success ends the spell on that target individually.

## Gaps

### 1. `Condition` type missing `"charmed"`

```typescript
// current
export type Condition = "prone";
// needed
export type Condition = "prone" | "charmed";
```

**Evidence:** "must succeed on a Wisdom saving throw or have the Charmed condition until the spell ends."

The Charmed condition is the core status this spell inflicts. Without it the save gate result cannot be expressed. This is purely additive — no existing variant is repurposed.

---

### 2. `Effect` (spell) missing `apply_condition` variant

```typescript
// current
export type Effect = DamageEffect | NoneEffect;

// needed (minimal addition)
export type ApplyConditionEffect = {
  readonly kind: "apply_condition";
  readonly condition: Condition;
};
export type Effect = DamageEffect | NoneEffect | ApplyConditionEffect;
```

**Evidence:** Same as above — the save_gate's `onFail` branch must apply the Charmed condition.

`SaveGateRiderResult` in the mastery layer already has `apply_condition`, but it is unreachable from the spell `Effect` type. The mastery type should be unified with or derived from a shared `apply_condition` shape.

The tracer's `traceEffect` function has an exhaustive switch on `Effect`; adding this variant would require a new case that emits an `apply_condition` atom node.

---

### 3. `OngoingOperation` missing a caster-activated command variant

```typescript
// current
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;

// needed (sketch — exact shape TBD)
export type BonusActionCommandOperation = {
  readonly kind: "bonus_action_command";
  readonly command: ForceMovementCommand;  // see gap 4
  readonly afterCommand: RepeatSaveGate;   // see gap 4
};
export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | BonusActionCommandOperation;
```

**Evidence:** "For the duration, you can take a Bonus Action to designate a direction... Each Charmed target must use as much of its movement as possible to move in that direction on its next turn."

Existing `OngoingOperation` variants are **passive**: `roll_modifier` adds a die to the target's rolls; `damage_on_hit` fires when the caster hits the attachment. Neither can represent a **caster-activated** per-turn ability that triggers forced movement on all marked targets.

The v4 atom `force_move` covers the movement effect but there is no surface type to author it into.

---

### 4. Per-target repeat save to individually break concentration

**Evidence:** "After moving in this way, a target repeats the save, ending the spell on itself on a success."

This is a per-target `repeat_save` (v4 atom) that individually removes one target from the spell's scope without ending the spell for other targets. The surface has no mechanism for this. It is conceptually distinct from the spell's concentration expiry — concentration ends the spell for all targets; this repeat save ends it only for the saving target.

Required surface shape (sketch):
```typescript
export type RepeatSaveGate = {
  readonly kind: "repeat_save";
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly onSuccess: "end_effect_on_target";
};
```

---

## Recommended widening strategy

The four gaps form a coherent cluster for the "ongoing enchantment with caster-directed command and per-target break save" pattern. Compulsion, Crown of Madness, and Dominate Person share this structure. A focused widening pass should:

1. Extend `Condition` with `"charmed"` (and likely `"frightened"`, `"incapacitated"`, `"paralyzed"`, `"stunned"` — they all appear in similar spells).
2. Add `apply_condition` to the spell `Effect` union.
3. Add a `bonus_action_command` `OngoingOperation` variant with `force_move` semantics and a `repeat_save` break gate.
4. Add `repeat_save` surface shape referencing the per-target break result.

All four gaps trace to v4 atoms that already exist in the taxonomy (`apply_condition`, `force_move`, `repeat_save`, `bonus_action_quota`). No new atoms are proposed — only new surface shapes exposing existing atoms.
