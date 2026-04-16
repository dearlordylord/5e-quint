# Proposal: Surface Widenings for Animate Objects

**Unit:** Animate Objects (5th-level Transmutation, concentration 1 min)
**Outcome:** `surface_widening`

## Summary

Animate Objects is a **summoning spell** — it animates nonmagical objects into Constructs that the caster commands while concentration holds. The structural family `ongoing_effect` is the correct home (concentration duration, persistent attached state). All required v4 atoms (`create_companion`, `command_companion`) exist in the taxonomy. The blockers are four surface gaps in `types.ts`.

---

## Gap 1 — Missing `OngoingOperation` variant: creature summoning

**SRD text:**
> "Each target animates, sprouts legs, and becomes a Construct that uses the Animated Object stat block; this creature is under your control until the spell ends or until it is reduced to 0 Hit Points."

**Current surface:** `OngoingOperation = RollModifierOperation | DamageOnHitOperation`

Neither variant can express "create N Construct creatures from objects." The v4 atom `create_companion` covers this concept but is not wired into `OngoingOperation`.

**Proposed widening:**
```typescript
export type SummonCreaturesOperation = {
  readonly kind: "summon_creatures";
  readonly statBlock: string;          // e.g. "animated_object"
  readonly countCap: CountCap;         // see Gap 3 below
  readonly creatureType: "construct";
  readonly alliesTo: "caster_and_allies";
  readonly initiative: "share_caster"; // "In combat, it shares your Initiative count"
  readonly defaultAction: StandardActionKind; // "dodge" when no command given
};
```

---

## Gap 2 — Missing `OngoingOperation` variant: companion command channel

**SRD text:**
> "Until the spell ends, you can take a Bonus Action to mentally command any creature you made with this spell if the creature is within 500 feet of you."

**Current surface:** No `OngoingOperation` variant for command-channel mechanics.

The v4 atom `command_companion` covers this but is absent from `types.ts`. This could be folded into the `SummonCreaturesOperation` as a `commandCost` field, or modeled as a second `OngoingOperation` variant.

**Proposed approach (folded into summon variant):**
```typescript
export type SummonCreaturesOperation = {
  // ...fields from Gap 1...
  readonly commandCost: { readonly kind: "bonus_action"; readonly rangeFeet: number };
};
```

---

## Gap 3 — Missing `LevelAxis` variant: ability modifier

**SRD text:**
> "The maximum number of objects is equal to your spellcasting ability modifier."

**Current surface:**
```typescript
export type LevelAxis =
  | "character" | "class" | "slot" | "subclass" | "proficiency_bonus";
```

The count cap here is a **runtime value** (caster's spellcasting ability modifier), not a level or PB. None of the existing axes can express it. A new axis or a new `CountCap` union member is required.

**Proposed widening (new axis):**
```typescript
export type LevelAxis =
  | "character" | "class" | "slot" | "subclass" | "proficiency_bonus"
  | "spellcasting_ability_modifier";   // new
```

Or, if the ability modifier cap is better modeled as a distinct cap type rather than a scaling axis:
```typescript
export type CountCap =
  | { readonly kind: "fixed"; readonly max: number }
  | { readonly kind: "spellcasting_ability_modifier" };  // new
```

---

## Gap 4 — Missing scaling shape: per-size-class slot delta

**SRD text:**
> "The creature's Slam damage increases by 1d4 (Medium or smaller), 1d6 (Large), or 1d12 (Huge) for each spell slot level above 5."

**Current surface:** `DiceAmount` variants are `fixed | threshold_tiers | linear_per_level`. All express a single damage value scaling with level.

Animate Objects' higher-level scaling is **conditional on the animated object's size category** — effectively a separate linear_per_level with a different `perLevel` expression for each size class. No current `DiceAmount` shape can express this.

**Proposed widening:**
```typescript
export type SizeClassSlotScaling = {
  readonly kind: "per_size_class_slot";
  readonly baseSlotLevel: number;
  readonly perSlotAboveBase: ReadonlyArray<{
    readonly sizeClass: "tiny_to_medium" | "large" | "huge";
    readonly delta: DiceExprDelta;
  }>;
};
```

This would be a new variant on `DiceAmount` or a dedicated type on the `SummonCreaturesOperation`.

---

## What Does Not Need Widening

- **`SpellRecord` kind** — fits ✓
- **`ongoing_effect` family** — correct structural home ✓ (concentration, persists while active, caster-bound)
- **`CastingTime { kind: "action" }`** — fits ✓
- **`Range { kind: "point", feet: 120 }`** — fits ✓
- **`Duration { kind: "concentration", upTo: { unit: "minute", amount: 1 } }`** — fits ✓
- **`Components { v: true, s: true, m: false }`** — fits ✓ (no material component)
- **`SpellLevel 5`** — fits ✓
- **`SpellSchool "transmutation"`** — fits ✓
- **v4 atoms `create_companion`, `command_companion`** — both present in v4 taxonomy; surface just hasn't exposed them ✓

---

## Classification: `surface_widening`

All four gaps are missing variants of existing surface types — not missing top-level families, not missing v4 atoms. The narrowest honest classification is `surface_widening`.
