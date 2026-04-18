# Proposal: Divine Smite — surface_widening

## Summary

Divine Smite cannot be encoded honestly in the current surface. It belongs to the `activation` family but requires three new surface variants to represent its mechanics faithfully. A `.dhall` file was not produced.

## Blocker 1 — `CastingTime.bonus_action_post_hit`

**SRD text:** "1 Bonus Action, which you take immediately after hitting a target with a Melee weapon or an Unarmed Strike"

The existing `CastingTime` union has:

```typescript
| { readonly kind: "bonus_action" }
```

The post-hit condition is load-bearing: it means the spell can only fire after a successful melee attack has resolved in the same turn. This is distinct from an unconditioned bonus action (e.g. Hunter's Mark, Second Wind). Without encoding this constraint the graph would misrepresent when the spell is legally castable.

**Proposed variant:**

```typescript
| {
    readonly kind: "bonus_action_post_hit";
    readonly weaponKinds: ReadonlyArray<"melee_weapon" | "unarmed_strike">;
  }
```

This is also the casting-time shape shared by all paladin smite spells (Searing Smite, Thunderous Smite, Wrathful Smite, Blinding Smite, Staggering Smite).

## Blocker 2 — `ActivationPhase.direct_damage`

**SRD text:** "The target takes an extra 2d8 Radiant damage from the attack."

The current `ActivationPhase` union is:

```typescript
export type ActivationPhase =
  | { readonly kind: "attack_roll"; ... }
  | { readonly kind: "save_gate"; ... };
```

Divine Smite does not make an attack roll (one already happened), and it does not request a saving throw. Using either existing kind would be false. The effect is unconditional damage delivery to the target once the spell is cast.

**Proposed variant:**

```typescript
| {
    readonly kind: "direct_damage";
    readonly attachment: Attachment;
    readonly onCast: Effect;
  }
```

`onCast` holds the damage expression. No resolution step precedes it — the spell's cast is the resolution.

## Blocker 3 — Creature-type conditional damage

**SRD text:** "The damage increases by 1d8 if the target is a Fiend or an Undead."

No existing `DiceAmount` or `Effect` shape supports a predicated bonus keyed on target creature type. The current `DiceAmount` variants — `fixed`, `threshold_tiers`, `linear_per_level` — all scale by level/slot, never by target property.

**Proposed addition:**

Option A — a new `DiceAmount` variant:

```typescript
| {
    readonly kind: "conditional_bonus";
    readonly base: DiceExpr;
    readonly bonus: DiceExpr;
    readonly condition: { readonly kind: "target_creature_type"; readonly types: ReadonlyArray<string> };
  }
```

Option B — a new `Effect` variant `conditional_damage` that carries a base expression plus a predicated rider. This composes with slot scaling if the slot scaling wraps the outer expression.

Either option requires adding creature type as a surface-level concept (currently absent from the type vocabulary).

## What encodes cleanly

The slot scaling (`+1d8 per spell slot level above 1`) fits `linear_per_level` with `axis: "slot"`, `base: { dice: 2, dieSize: 8 }`, `perLevel: { dice: 1, dieSize: 8 }`, `startingAtLevel: 1`. This is the only piece of the spell that fits the current surface unchanged.

## Widening scope

All paladin smite spells share the same structural shape:

| Field | Shared value |
|---|---|
| Casting time | Bonus action immediately after melee hit |
| Duration | Instantaneous |
| Delivery | Direct damage to the already-hit target |
| Scaling | +Nd8 per slot level above base |

Searing Smite additionally involves an ongoing DOT (fire damage on subsequent turns via CON save), which would require further surface work. But the three widenings above are sufficient to encode the base smite pattern (Divine Smite, Thunderous Smite, Wrathful Smite). Blinding/Staggering Smite add condition riders that map onto the existing `apply_condition` effect atom once the delivery phase is in place.
