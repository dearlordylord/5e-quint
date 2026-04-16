# Proposal: Heat Metal — Surface Widenings Required

## Outcome: `surface_widening`

Heat Metal cannot be encoded honestly in the current surface. Five distinct gaps block a clean encoding. The dominant gaps are structural to the `ongoing_effect` family; the others affect shared primitive types.

---

## Gap 1 — `Attachment.object` variant (surface widening)

Heat Metal attaches to a **manufactured metal object**, not to a creature, area, or the caster. The current `Attachment` union:

```typescript
| { readonly kind: "self" }
| { readonly kind: "target"; readonly selection: TargetSelection }
| { readonly kind: "area"; ... }
| { readonly kind: "mark"; ... }
```

There is no `object` variant. The v4 taxonomy lists `object` as an attachment atom (§3 Attachment Atoms) so this is a surface-layer omission, not a taxonomy gap.

**Proposed addition:**
```typescript
| {
    readonly kind: "object";
    readonly description: string;    // e.g. "manufactured_metal_weapon_or_armor"
  }
```

Evidence: *"Choose a manufactured metal object, such as a metal weapon or a suit of Heavy or Medium metal armor, that you can see within range."*

---

## Gap 2 — `OngoingOperation.bonus_action_damage_pulse` variant (surface widening)

The two existing `OngoingOperation` kinds do not cover Heat Metal's repeated-damage mechanic:

- `roll_modifier` — passive addend to the target's own rolls; requires the target to make a roll.
- `damage_on_hit` — fires when the **caster** makes an attack-roll hit against the attachment scope.

Heat Metal's operation is: **on the initial cast AND on each subsequent turn where the caster spends a Bonus Action**, deal a fixed damage amount to any creature in contact with the object. This is an active, caster-triggered, repeatable damage pulse — distinct from both existing kinds.

**Proposed addition:**
```typescript
export type BonusActionDamagePulseOperation = {
  readonly kind: "bonus_action_damage_pulse";
  readonly damageType: DamageType;
  readonly amount: DiceAmount;
  // The pulse also fires automatically at cast time (no BA required then).
  readonly firesOnCast: boolean;
};
```

Evidence: *"Any creature in physical contact with the object takes 2d8 Fire damage when you cast the spell. Until the spell ends, you can take a Bonus Action on each of your later turns to deal this damage again if the object is within range."*

---

## Gap 3 — `OngoingEffectMechanics` single-operation limit (surface widening)

`OngoingEffectMechanics` currently holds a single `operation` field:

```typescript
export type OngoingEffectMechanics = SpellMechanicsHeader & {
  readonly family: "ongoing_effect";
  readonly attachment: Attachment;
  readonly operation: OngoingOperation;   // ← single
};
```

Heat Metal needs two co-resident operations on the same attachment:
1. The bonus-action damage pulse (Gap 2 above).
2. A **damage-triggered CON save gate**: each time the creature takes damage from the object, it must succeed a CON save or drop the object; if it doesn't drop, it has disadvantage on attacks and ability checks until the start of the caster's next turn.

These are not compositionally separable — both fire on the same damage event and share the same `object` attachment scope.

**Proposed change:**
```typescript
export type OngoingEffectMechanics = SpellMechanicsHeader & {
  readonly family: "ongoing_effect";
  readonly attachment: Attachment;
  // Changed from single field to array to support co-resident operations.
  readonly operations: ReadonlyArray<OngoingOperation>;
};
```

Evidence: *"If a creature is holding or wearing the object and takes the damage from it, the creature must succeed on a Constitution saving throw or drop the object if it can."*

---

## Gap 4 — `RollKind.ability_check` variant (surface widening)

```typescript
export type RollKind = "attack_roll" | "saving_throw";
```

The disadvantage rider from the failed save covers **both** attack rolls **and** ability checks. Ability checks are a third distinct roll kind in D&D 5e (Skill checks, tool checks, raw ability checks). Without this variant, the penalty cannot be expressed precisely — "attack_roll" alone would be a false narrowing.

**Proposed addition:**
```typescript
export type RollKind = "attack_roll" | "saving_throw" | "ability_check";
```

Evidence: *"it has Disadvantage on attack rolls and ability checks until the start of your next turn."*

---

## Gap 5 — `force_drop_object` effect atom (atom widening)

On a failed CON save the targeted creature must **drop the held/worn object** if it can. No existing v4 effect atom covers forced release of a held item:

- `force_move` — creature locomotion (push, pull, teleport); not item release.
- `apply_condition` — applies a named condition; dropping an item is not a standard condition.
- There is no `force_drop_object` or equivalent in §9 Effect Atoms.

This is a new atom: transferring a specific item from a creature's possession to the ground as a mechanical effect.

**Proposed new atom:** `force_drop_object`

Evidence: *"the creature must succeed on a Constitution saving throw or drop the object if it can."*

---

## What would fit cleanly once widenings are applied

- `SpellMechanicsHeader`: level 2, school transmutation, casting time action, range 60 ft, concentration up to 1 minute — all fit.
- Slot scaling: `DiceAmount.linear_per_level` with `axis: "slot"`, `base: { dice: 2, dieSize: 8 }`, `perLevel: { dice: 1 }`, `startingAtLevel: 2` — fits exactly.
- CON save DC: `caster_spell_save_dc` — fits.
- `modify_roll_advantage` (disadvantage, on attack_roll + ability_check) with `end_of_next_turn` expiry — fits once `ability_check` is added to `RollKind`.
