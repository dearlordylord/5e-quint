# Proposal: counterspell — slot-refund field on `negate_triggering_spell`

## Unit

Counterspell (SRD 5.2.1, Level 3 Abjuration, `triggered_reaction` family)

## What fits cleanly

The encoding uses:

- `triggered_reaction` family with `interruptsTrigger: true`
- `creature_casts_spell` reaction trigger scoped to V/S/M components
- `save_gate` phase: Con save vs caster spell save DC
- `autoSuccessIfCasterSlotGte: "triggering_spell_level"` for the upcast auto-success path
- `negate_triggering_spell` on failed save (spell dissipates with no effect)
- `onSuccess: { kind: "none" }` (spell proceeds normally on successful save)

All of these typecheck and trace without error.

## Gap: slot refund on successful counterspell

SRD text:

> "If that spell was cast with a spell slot, the slot isn't expended."

When Counterspell negates the triggering spell, the countered caster's spell slot is **refunded**. The current `negate_triggering_spell` atom has no field for this:

```typescript
| {
    readonly kind: "negate_triggering_spell";
    readonly maxSpellLevel?: number;
  }
```

A game engine tracking resource pools needs this flag to know whether to return the slot to the countered caster's pool. Without it, the surface leaves the slot-refund behavior as implicit/undocumented.

## Proposed widening

Add an optional field to `negate_triggering_spell`:

```typescript
| {
    readonly kind: "negate_triggering_spell";
    readonly maxSpellLevel?: number;
    readonly refundTargetSlot?: true;   // NEW: slot is returned to the countered caster
  }
```

Counterspell then encodes `onFail: { kind: "negate_triggering_spell", refundTargetSlot: true }`.

The v4 taxonomy already has `refund` as a Procedure Atom (§2), confirming this semantic is in-scope for core mechanics. Expressing it as a field on `negate_triggering_spell` rather than a separate procedure keeps the tracer subgraph compact for this common pattern. Future units that negate spells without refunding the slot (e.g. Ioun Stone of Absorption, which consumes the spell energy) would omit the field.

## Classification

`surface_widening` — all v4 atoms used exist in the taxonomy; only a new optional field on an existing surface type is needed.
