# Proposal: Surface Widenings for Foresight

## Unit

**Foresight** — 9th-level divination spell (SRD 5.2.1). 1-minute cast, Touch, V/S/M, 8-hour timed (not concentration).

> "For the duration, the target has Advantage on D20 Tests, and other creatures have Disadvantage on attack rolls against it."

## Outcome

`surface_widening` — The spell's header (casting time, range, duration, components, school, level) maps cleanly to the existing surface. The blocking gaps are entirely in `OngoingOperation`.

## What Fits

| Field | Surface type | Status |
|---|---|---|
| Level 9 | `SpellLevel` | ✓ |
| School: divination | `SpellSchool` | ✓ |
| Casting time: 1 minute | `CastingTime { kind: "minutes", amount: 1, ritual: false }` | ✓ |
| Range: Touch | `Range { kind: "touch" }` | ✓ |
| Components: V, S, M | `Components` | ✓ |
| Duration: 8 hours | `Duration { kind: "timed", value: { unit: "hour", amount: 8 } }` | ✓ |
| Family: ongoing_effect | `OngoingEffectMechanics` | ✓ |
| Attachment: one target | `Attachment { kind: "target", selection: { mode: "one" } }` | ✓ |

## What Is Missing

### 1. `ModifyRollAdvantageOperation` — new variant in `OngoingOperation`

`OngoingOperation = RollModifierOperation | DamageOnHitOperation`

`RollModifierOperation` applies a numeric `DiceDelta` to rolls (Bless pattern). It cannot express advantage/disadvantage. The v4 atom `modify_roll_advantage` exists and is already used by masteries via `ModifyRollAdvantageRider`, but that type is mastery-specific and not surfaced in `OngoingOperation`.

**Proposed shape** (mirrors `ModifyRollAdvantageRider` minus expiry, since the spell's duration handles lifetime):

```typescript
export type ModifyRollAdvantageOperation = {
  readonly kind: "roll_advantage";
  readonly mode: "advantage" | "disadvantage";
  readonly on: ReadonlyArray<RollKind>;
};
```

### 2. `"ability_check"` in `RollKind`

`RollKind = "attack_roll" | "saving_throw"`

Foresight grants advantage on **D20 Tests**, which in SRD 5.2.1 is the umbrella term for attack rolls, saving throws, and ability checks. `"ability_check"` is absent from `RollKind`, making it impossible to faithfully encode the full scope of the advantage.

**Proposed addition:**

```typescript
export type RollKind = "attack_roll" | "saving_throw" | "ability_check";
```

### 3. Incoming roll modifier scope — new `OngoingOperation` variant

Foresight's second effect — "other creatures have Disadvantage on attack rolls against it" — modifies rolls made **by other creatures targeting the affected creature**, not rolls made by the affected creature itself. No current operation variant has an "incoming" or "against_target" scope. All existing modifiers act on rolls made by the attachment target or caster.

This is mechanically distinct from granting the target advantage: the subject of the disadvantaged roll is a third party (the attacker), and the activation condition is "someone targets this creature."

**Proposed shape:**

```typescript
export type IncomingRollModifierOperation = {
  readonly kind: "incoming_roll_modifier";
  readonly mode: "advantage" | "disadvantage";
  readonly on: ReadonlyArray<"attack_roll">;  // only attack rolls are "incoming" in current pressure
};
```

The v4 atom `modify_roll_advantage` covers this semantically; what is missing is the surface-level type to express who is rolling and in which direction.

### 4. (Minor) Self-expiry on recast — secondary gap

"The spell ends early if you cast it again." The v4 lifecycle atom `replace_on_recast` covers this, but the `Duration` type in `types.ts` has no variant expressing recast-triggered expiry. Not the primary block, recorded for completeness.

## Recommended Widening Order

1. Add `"ability_check"` to `RollKind` — trivial, broadly useful (Bless currently also omits ability checks if SRD text implies them for other spells).
2. Add `ModifyRollAdvantageOperation` to `OngoingOperation` — unlocks several concentration buffs (Greater Invisibility, Blur, etc.) once the scope issue is also resolved.
3. Add `IncomingRollModifierOperation` to `OngoingOperation` — required for the second Foresight effect; also needed for spells like Blur ("attack rolls against you have disadvantage").
4. Add recast-expiry variant to `Duration` — lower priority, affects few spells.
