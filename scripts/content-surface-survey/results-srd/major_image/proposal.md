# Proposal: Major Image — surface_widening

## Unit

Major Image — SRD 5.2.1, Level 3 Illusion spell.

## Status after Apr 18 widening

Three of four distinct mechanics now encode cleanly:

| Mechanic | Encoding | Status |
|---|---|---|
| Persistent multi-sensory illusion (visual/sound/smell/temperature) | `passive` → `create_illusion { maxSize: "gargantuan", channels: [...] }` | ✅ clean |
| Caster spends Magic action to reposition illusion within range | `on_caster_spends_action { cost: standard_action "magic" }` → `reposition_attachment` | ✅ clean |
| Creature Study action: Int (Investigation) vs spell save DC → disbelief | `on_creature_studies` → `ability_check_gate { ability: int, dc: caster_spell_save_dc, onPass: none }` | ✅ clean |
| Slot 4+ upcast: removes concentration, lasts until dispelled | — | ❌ surface_widening |

## Remaining gap: duration-kind upcast

**SRD text:** *"Using a Higher-Level Spell Slot (4+): The spell lasts until dispelled, without requiring Concentration."*

At base level the spell is `concentration, up to 10 minutes`. At slot 4+ it becomes `permanent { endsOn: ["dispel"] }` — the duration KIND changes, not merely the amount.

**Current surface:** `DurationUpcastTier` only allows changing the numeric `amount` within the same duration family:

```typescript
export type DurationUpcastTier = {
  readonly atSlot: number;
  readonly amount: number;
};
```

This can express "1 hour at slot 3, 8 hours at slot 5" (Hunter's Mark) but cannot express "concentration at slot 3, permanent at slot 4" because the shape of the Duration discriminant would need to change.

## Proposed widening

Add a `DurationKindUpcastTier` variant alongside `DurationUpcastTier`:

```typescript
export type DurationKindUpcastTier = {
  readonly atSlot: number;
  readonly kind: Duration; // full Duration replacement at this slot
};
```

Then extend `DurationValue` or `Duration` to accept an optional array of kind-upgrade tiers:

```typescript
// Option A — on the concentration variant:
{ readonly kind: "concentration";
  readonly upTo: DurationValue;
  readonly earlyEnd?: ReadonlyNonEmptyArray<DurationEndTrigger>;
  readonly permanentIfMaintainedFull?: true;
  readonly upgradesTo?: ReadonlyNonEmptyArray<DurationKindUpcastTier>; // NEW
}
```

**Usage (Major Image):**

```typescript
duration: {
  kind: "concentration",
  upTo: { unit: "minute", amount: 10 },
  upgradesTo: [
    { atSlot: 4, kind: { kind: "permanent", endsOn: ["dispel"] } }
  ]
}
```

## Other spells with this pattern

- **Silent Image** (L1 → L3 slot is same, but similar illusion family; no upcast in RAW)
- **Phantasmal Force** (similar investigate-disbelief; no duration-kind upcast)
- **Minor Illusion** (cantrip, no slots)
- Future: any spell that "lasts until dispelled at higher level" without the SRD's `permanentIfMaintainedFull` pattern (which requires concentration for the full window)

## Confidence

High — the three encoded mechanics round-trip cleanly through typecheck and tracer. The gap is precisely scoped to one missing `DurationUpcastTier` variant.
