# Widening Proposal: Prayer of Healing

**Outcome:** `atom_widening`

## Unit

- **Name:** Prayer of Healing
- **Level:** 2 — Abjuration
- **Casting time:** 10 minutes
- **Range:** 30 ft (point)
- **Components:** V
- **Duration:** Instantaneous
- **Targets:** Up to 5 creatures of choice

## Why it doesn't fit

Prayer of Healing is an instantaneous multi-target healing spell with no attack roll and no saving throw. It grants two effects to each target: direct HP restoration and short-rest benefits. It also imposes a per-target once-per-long-rest reuse restriction on the recipient side.

Four independent gaps block honest encoding.

---

## Gap 1 — Missing `ActivationPhase` variant: `direct_apply`

**Classification:** surface_widening

`ActivationPhase` is currently:
```typescript
| { kind: "attack_roll"; ... }
| { kind: "save_gate"; ... }
```

Neither applies to Prayer of Healing. The spell selects targets and applies effects directly — no roll, no save. A third variant is needed:

```typescript
| {
    readonly kind: "direct_apply";
    readonly attachment: Attachment;
    readonly effect: Effect;   // or ReadonlyArray<Effect> if multi-effect
  }
```

This covers all "choose targets, apply unconditionally" instantaneous spells (Cure Wounds, Healing Word, Mass Cure Wounds, Prayer of Healing, etc.).

---

## Gap 2 — Missing `Effect` variant: `heal_hp`

**Classification:** surface_widening

The spell-context `Effect` type is `DamageEffect | NoneEffect`. Prayer of Healing heals HP. The v4 atom `heal` exists in the taxonomy and is used by `HealHpEffect` in class features — but it is not wired into the spell `Effect` type.

Needed addition to `Effect`:
```typescript
export type HealEffect = {
  readonly kind: "heal_hp";
  readonly amount: DiceAmount;
};

export type Effect = DamageEffect | NoneEffect | HealEffect;
```

The slot-scaling (+1d8 per slot above 2) is expressible with the existing `linear_per_level` `DiceAmount` shape on axis `slot`. No new scaling atom is required for this part.

---

## Gap 3 — Missing v4 atom: `grant_short_rest_benefits`

**Classification:** atom_widening

Each target "gains the benefits of a Short Rest." This means:

- The target may spend any number of its Hit Dice to recover HP (as during a normal Short Rest).
- The target regains any class resources that recharge on a Short Rest (Channel Divinity, Bardic Inspiration, Second Wind, etc.).

This is mechanically consequential — it invokes the runtime's short-rest recovery procedure on the target creature, not just a fixed HP delta. It is NOT reducible to an additional fixed heal amount.

No v4 atom covers this. The closest existing atom is `heal`, but that only captures HP delta. `grant_short_rest_benefits` needs to be a new effect atom.

Proposed atom:
- **Name:** `grant_short_rest_benefits`
- **Category:** effect
- **Semantics:** trigger the short-rest recovery procedure on the attached creature (spend Hit Dice, recover short-rest class resources)

This is the primary reason the overall classification is `atom_widening` rather than `surface_widening`.

---

## Gap 4 — Missing surface concept: per-target long-rest reuse restriction

**Classification:** surface_widening

"A creature can't be affected by this spell again until that creature finishes a Long Rest."

The current surface only models caster-side resource consumption (`use_count` reset by rest cadence). This restriction lives on the **recipient**: the engine must record a per-creature "affected-by-prayer-of-healing" flag and suppress repeat application until the target's Long Rest.

This is distinct from the caster consuming a spell slot. The caster could legally recast the spell at different targets; the restriction is per-target, not per-cast.

A new surface construct is needed. One approach: a `TargetReuseLimiter` on `Attachment` or on the phase, specifying a `once_per_long_rest` flag keyed to the **target** creature's rest cadence.

---

## Summary of proposed additions

| # | Kind | Name | Tier |
|---|------|------|------|
| 1 | new_variant | `ActivationPhase.direct_apply` | surface_widening |
| 2 | new_variant | `Effect.heal_hp` | surface_widening |
| 3 | new_atom | `grant_short_rest_benefits` | **atom_widening** |
| 4 | new_variant | per-target long-rest reuse limiter | surface_widening |

Gaps 1, 2, and 4 together would be sufficient to encode the HP-healing part honestly. Gap 3 (Short Rest benefits) is the remaining atom-level blocker and determines the overall classification.
