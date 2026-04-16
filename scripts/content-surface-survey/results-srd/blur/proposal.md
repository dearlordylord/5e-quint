# Proposal: Blur encoding gap

## Unit

**Blur** — level 2 Illusion, concentration 1 min, SRD 5.2.1

## Why it doesn't fit

Blur is an `ongoing_effect` spell (self-attachment, concentration). Its mechanic is:

> For the duration, any creature has Disadvantage on attack rolls against you.

The `OngoingEffectMechanics` family requires an `operation: OngoingOperation` field, which is currently:

```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

Neither variant applies:
- `RollModifierOperation` (`kind: "roll_modifier"`) — adds a dice addend to rolls the *caster* makes (Bless, Guidance). Blur affects rolls made *against* the caster.
- `DamageOnHitOperation` (`kind: "damage_on_hit"`) — a damage rider on attack hits. Unrelated.

The v4 taxonomy has the `modify_roll_advantage` atom. The `EffectAtom` union already carries it:

```typescript
| {
    readonly kind: "modify_roll_advantage";
    readonly mode: "advantage" | "disadvantage";
    readonly on: ReadonlyArray<RollKind>;
  }
```

The gap is exclusively in `OngoingOperation` — it does not include `modify_roll_advantage`.

## Primary widening required

**Add `modify_roll_advantage` as a valid `OngoingOperation` variant.**

The minimal fix:

```typescript
export type ModifyRollAdvantageOperation = {
  readonly kind: "modify_roll_advantage";
  readonly mode: "advantage" | "disadvantage";
  readonly on: ReadonlyArray<RollKind>;
};

export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | ModifyRollAdvantageOperation;
```

This would allow Blur (and Greater Invisibility, which grants advantage to the caster's attack rolls) to be encoded in the `ongoing_effect` family.

**Alternatively**: widen `OngoingOperation` to accept any `EffectAtom` directly. This would be cleaner long-term (the artificial restriction of three variants would dissolve), but requires more tracer work.

## Secondary gap: sense-based immunity predicate

The spell text includes:

> An attacker is immune to this effect if it perceives you with Blindsight or Truesight.

This is a conditional filter on the effect's application. No current surface type has a per-effect exception keyed on sense kind. The narrowest fix would be an optional `exceptIfAttackerHasSense` field on the operation/effect:

```typescript
exceptIfAttackerHasSense?: ReadonlyArray<SenseKind>;
```

This is a secondary gap — the encoding cannot proceed at all without the primary widening. The immunity predicate is a refinement to add once the core variant exists.

## Atom inventory check

- `modify_roll_advantage` — already in v4 taxonomy (§9 Effect Atoms) ✓
- `modify_roll_advantage` — already in `EffectAtom` union in `types.ts` ✓
- `OngoingOperation` variant — **missing** (this is the gap)
- Sense-based immunity filter — not in v4 taxonomy, not in `types.ts`

## Classification

`surface_widening` — the v4 atom exists; the `EffectAtom` exists; only the `OngoingOperation` union is missing the variant.
