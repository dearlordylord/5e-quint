# Proposal: Level-gated grants in PassiveMechanics

**Unit:** Fiend Spells (warlock L3)  
**Outcome:** `surface_widening`

## What encodes cleanly

The four L3 spells — Burning Hands, Command, Scorching Ray, Suggestion — encode as `grant_spell_access` atoms with `mode = "prepared"` in a `passive` mechanics family. Typecheck passes, tracer emits a clean graph.

## What doesn't fit

The Fiend Spells feature is a single SRD class feature (`acquiredAtLevel = 3`) whose spell table has four level-gated tiers:

| Warlock Level | Spells |
|---|---|
| 3 | Burning Hands, Command, Scorching Ray, Suggestion |
| 5 | Fireball, Stinking Cloud |
| 7 | Fire Shield, Wall of Fire |
| 9 | Geas, Insect Plague |

The L5/L7/L9 tiers cannot be encoded because `PassiveMechanics.grants` is a flat `ReadonlyArray<EffectAtom>` with no per-grant class-level predicate. All atoms in `grants` apply unconditionally while the feature is in effect. There is no existing `EquipmentPredicate` or other gate that expresses "this grant activates only when warlock level ≥ N".

## Proposed widening

**`new_variant`**: A class-level predicate for individual grants (or a tiered grant list).

Two candidate shapes:

### Option A — per-grant `requiresClassLevel` field on `grant_spell_access`

Add an optional `requiresClassLevel?: number` to the `grant_spell_access` atom. Applies only when `mode = "prepared"` (or similar class-feature-granted modes). Simple, low-blast-radius, directly addresses the pressure case.

```typescript
| {
    readonly kind: "grant_spell_access";
    readonly spellId: string;
    readonly mode: SpellAccessMode;
    readonly requiresClassLevel?: number;  // NEW: grant activates at this class level
    // ... existing optional fields
  }
```

### Option B — `ThresholdTiers`-shaped grants list

Extend `PassiveMechanics` with a `tieredGrants` field parallel to `grants`:

```typescript
export type TieredGrantTier = {
  readonly atClassLevel: number;
  readonly grants: ReadonlyNonEmptyArray<EffectAtom>;
};

// In PassiveMechanics:
readonly tieredGrants?: ReadonlyNonEmptyArray<TieredGrantTier>;
```

This is more general (any effect atom can be level-gated, not just spell access), but adds more schema surface.

## Recommendation

Option A is narrower and directly addresses the SRD pressure. The 5e 2024 subclass spell-list pattern (Fiend Spells, Devotion Spells, Draconic Spells, etc.) is common — ~10 subclasses each have a 4-tier table — so this will recur heavily.

Option B is more correct architecturally if any non-spell-access atom ever needs a class-level gate (e.g., a passive resistance that unlocks at subclass level 6).

## SRD evidence

RAW text: "when you reach a Warlock level specified in the Fiend Spells table, you thereafter always have the listed spells prepared." — Classes/Warlock#Level 3: Fiend Spells

The "when you reach" clause is the explicit per-tier level gate that forces this widening.
