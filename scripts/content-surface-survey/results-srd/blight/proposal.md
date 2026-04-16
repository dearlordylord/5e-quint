# Proposal: Blight surface widening

**Unit:** Blight (spell, level 4, necromancy)
**Outcome:** `surface_widening`
**Blocking issue:** `Effect.half_of_fail_damage` — same gap as Fireball

---

## 1. `Effect.half_of_fail_damage` (BLOCKING)

### What the spell says

> "taking 8d8 Necrotic damage on a failed save or **half as much damage on a successful one**"
> "The damage increases by 1d8 for each spell slot level above 4."

### Why it can't be expressed

The `Effect` type for spell `ActivationPhase` is:

```typescript
export type Effect = DamageEffect | NoneEffect;
```

`DamageEffect` carries an absolute `DiceAmount`. There is no variant expressing "half the onFail amount." This matters most with slot scaling:

| Slot level | onFail | onSuccess (correct) | onSuccess (hardcoded) |
|---|---|---|---|
| 4 | 8d8 | 4d8 | 4d8 ✓ |
| 5 | 9d8 | 4.5d8 | 4d8 ✗ or 5d8 ✗ |
| 6 | 10d8 | 5d8 | 5d8 ✓ (by coincidence) |
| 7 | 11d8 | 5.5d8 | 5d8 ✗ or 6d8 ✗ |

Hardcoding the success branch produces a trace that misrepresents the scaling relationship. The correct semantic is "half the rolled fail-damage result," which is a relative quantity, not a fixed dice expression.

### Proposed addition

```typescript
export type HalfOfFailDamageEffect = {
  readonly kind: "half_of_fail_damage";
  // No additional fields. Semantics: the damage dealt equals
  // floor(onFail roll / 2), matching the SRD "half as much damage"
  // convention for saving throws. Applicable only when paired with
  // a DamageEffect onFail in the same save_gate phase.
};

export type Effect = DamageEffect | NoneEffect | HalfOfFailDamageEffect;
```

This is a minimal, zero-field addition. The tracer would emit:

```
save_gate → branches_on_save → damage (8d8 necrotic) [on fail]
save_gate → branches_on_save → half_of_fail_damage [on success]
```

### Scope

This same gap blocks Fireball, Lightning Bolt, Cone of Cold, and any other AoE/targeted spell with the "save for half" pattern — the most common damage spell pattern in D&D 5e. A single variant addition unblocks the entire family.

---

## 2. `save_gate.creature_type_auto_fail` (secondary, non-blocking)

### What the spell says

> "A Plant creature automatically fails the save."

### Why it can't be expressed

The `ActivationPhase` save_gate has no field for creature-type-based automatic outcomes. The save gate always proceeds to a full saving throw for all targets.

### Proposed addition

```typescript
// In ActivationPhase save_gate variant:
readonly autoFail?: ReadonlyArray<CreatureType>;
```

where `CreatureType` would be a closed enum of SRD creature types (plant, undead, fiend, etc.). This is a common pattern in necromancy spells (Animate Dead, Create Undead) and area control spells.

---

## 3. Alternative object targeting (out-of-core, noted for completeness)

### What the spell says

> "Alternatively, target a nonmagical plant that isn't a creature, such as a tree or shrub. It doesn't make a save; it simply withers and dies."

### Assessment

This mode targets an **object** (not a creature), produces no mechanical resolution (no save, no HP loss, no condition), and results in a world-state change ("withers and dies"). This is legitimately out-of-core under the repo's `ARCHITECTURE.md` boundary — environmental/narrative outcomes are caller-owned.

If environmental targeting is ever modeled, this would require:
- An `object` attachment variant for spell records (analogous to the `object` atom in v4 taxonomy)
- A `destroy` or `wither` effect atom (not in v4 inventory)

Not proposed as a widening for this pass; noted for future tracking.

---

## Summary

Once `Effect.half_of_fail_damage` is added (Widening 1), Blight encodes cleanly as:

```
activation / save_gate
  ability: con
  dc: caster_spell_save_dc
  attachment: target / one / 30 ft
  onFail: damage — 8d8 necrotic, linear_per_level slot +1d8 from L5
  onSuccess: half_of_fail_damage
```

The Plant auto-fail (Widening 2) can be added incrementally on the same pass without blocking the core trace.
