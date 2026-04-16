# Proposal: surface_widening for Ensnaring Strike

## Unit

- **Name**: Ensnaring Strike
- **Slug**: `ensnaring_strike`
- **Kind**: spell
- **Level**: 1 (Conjuration)
- **Source**: SRD 5.2.1

## Why it does not fit

Ensnaring Strike has two hard blockers and three secondary gaps. No honest JSON can be authored.

---

## Hard blocker 1 — `apply_condition` not a valid spell `Effect`

The save_gate phase in `ActivationMechanics` has:

```typescript
onFail: Effect
onSuccess: Effect
// Effect = DamageEffect | NoneEffect
```

Ensnaring Strike's onFail is "target has the Restrained condition until the spell ends." This is not damage — it is a condition. The `apply_condition` effect exists in v4's atom inventory and in the mastery surface (`SaveGateRiderResult`), but it is absent from the spell `Effect` type.

**Proposed widening**: Add `ApplyConditionEffect` to the spell `Effect` union:

```typescript
export type ApplyConditionEffect = {
  readonly kind: "apply_condition";
  readonly condition: Condition;
};

export type Effect = DamageEffect | NoneEffect | ApplyConditionEffect;
```

The `Condition` type currently only contains `"prone"` (mastery-sourced). Ensnaring Strike requires `"restrained"`. That is a separate, trivial widen of the `Condition` enum.

---

## Hard blocker 2 — No `OngoingOperation` for periodic per-turn damage

```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

Ensnaring Strike deals 1d6 Piercing damage **at the start of each of the target's turns** while it has the Restrained condition. This is not:
- `roll_modifier` — it is not a modifier applied to a rolled attack/save.
- `damage_on_hit` — it is not a rider on an attack-roll hit.

The v4 taxonomy has `turn_start_window` and `damage` atoms. The composition needed is:
  `concentrate → [while condition held] → target's turn_start_window → damage`

**Proposed widening**: Add a `PeriodicDamageOperation` variant:

```typescript
export type PeriodicDamageOperation = {
  readonly kind: "periodic_damage";
  readonly trigger: { readonly kind: "turn_start"; readonly whose: "target" };
  readonly whileConditionHeld?: Condition;
  readonly damageType: DamageType;
  readonly amount: DiceAmount;
};

export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | PeriodicDamageOperation;
```

This same shape would encode other "damage at start of turn" spells (Witch Bolt post-hit, ongoing poison effects, etc.).

---

## Secondary gap 1 — `CastingTime.bonus_action` has no precondition field

The actual casting time is:

> 1 Bonus Action, which you take immediately after hitting a creature with a weapon

Current surface:

```typescript
| { readonly kind: "bonus_action" }
```

Smite-family spells (Thunderous Smite, Wrathful Smite, Shining Smite, Ensnaring Strike) all share this "bonus action immediately after a weapon hit" grammar. Reactions already have a `trigger` field; bonus_action needs an analogous optional precondition.

**Proposed widening**:

```typescript
| {
    readonly kind: "bonus_action";
    readonly trigger?: BonusActionTrigger;
  }

export type BonusActionTrigger =
  | { readonly kind: "immediately_after_weapon_hit" };
```

---

## Secondary gap 2 — Ability-check escape dismissal

> The target or a creature within reach of it can take an action to make a Strength (Athletics) check against your spell save DC. On a success, the spell ends.

No surface shape models "creature uses its action + ability check against DC → spell ends." The `ability_check` atom exists in v4 but there is no composition for a player-driven dismissal check. This would need a new optional field on concentration/timed spells:

```typescript
export type EscapeCheck = {
  readonly kind: "ability_check";
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly actors: ReadonlyArray<"target" | "creature_within_reach">;
};
```

This same shape would apply to Grapple/Restrained escape rules more broadly.

---

## Secondary gap 3 — Size-conditional advantage on the initial save

> A Large or larger creature has Advantage on this save.

No mechanism exists for a size-gated advantage modifier on a `save_gate`. This is a narrow secondary mechanic. It could be expressed via a future `save_gate` modifier field, but no proposal is made here — low pressure from a single spell.

---

## What would be expressible if gaps 1–2 were filled

Once `ApplyConditionEffect` and `PeriodicDamageOperation` exist, Ensnaring Strike could be expressed as a two-part ongoing spell:

1. **Activation phase** (save_gate): STR save → on fail: `apply_condition restrained`; on success: `none` (spell ends).
2. **Ongoing operation** (periodic_damage): while target has Restrained, 1d6 piercing at start of its turn, scaling +1d6/slot above 1.

The `activation` and `ongoing_effect` families cannot be combined in a single record today — that would also need a structural look, or a new `activation_then_ongoing` family.

---

## Classification

`surface_widening` — all missing pieces are new variants of existing surface types. No new v4 atom is needed. The atom inventory (`apply_condition`, `turn_start_window`, `damage`, `save_gate`) already covers this spell; the gaps are in how the TypeScript surface type wires those atoms together.
