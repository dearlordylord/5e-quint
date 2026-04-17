# Proposal: `grant_spell_access.targetRestriction`

## Unit

**Ring of Water Walking** — `magic_item`, uncommon, no attunement.

SRD text: *"While wearing this ring, you cast Water Walk from it, targeting only yourself."*

## What fits

The unit encodes cleanly as a `passive` magic item with a single `grant_spell_access` grant:

```json
{
  "kind": "grant_spell_access",
  "spellId": "water_walk",
  "mode": "at_will"
}
```

Typecheck passes. Tracer runs without error. Atoms: `magic_item_root`, `grant`, `grant_spell_access`.

## The gap

Water Walk (3rd-level transmutation) normally targets **up to 10 willing creatures** within 30 feet. The ring restricts this to **the wearer only** ("targeting only yourself"). The current `grant_spell_access` atom has no field to express a target restriction:

```typescript
| {
    readonly kind: "grant_spell_access";
    readonly spellId: string;
    readonly mode: SpellAccessMode;  // no targetRestriction
  }
```

Without a restriction field, the encoded trace implies the wearer can cast Water Walk on any 10 creatures at will from the ring — which is incorrect.

## Proposed widening

Add an optional `targetRestriction` field to `grant_spell_access`:

```typescript
| {
    readonly kind: "grant_spell_access";
    readonly spellId: string;
    readonly mode: SpellAccessMode;
    readonly targetRestriction?: "self_only";  // new
  }
```

The `"self_only"` variant covers the SRD ring idiom: "you cast X from it, targeting only yourself." It constrains the spell's target selection to the item wearer at cast time.

## Prevalence

This pattern appears across multiple SRD ring items. Rings that grant spell access are often self-only: the ring grants an effect *to you* (the wearer), not to allies. The `targetRestriction: "self_only"` variant would close the gap for the whole family rather than requiring one-off workarounds.

## Classification

`surface_widening` — the `grant_spell_access` atom exists in v4 and the surface; the missing piece is a new optional variant field on that atom.
