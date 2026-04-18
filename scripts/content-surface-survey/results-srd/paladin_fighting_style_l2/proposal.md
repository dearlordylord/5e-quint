# Proposal: paladin_fighting_style_l2 — surface_widening

## Feature Summary

Paladin Level 2 — Fighting Style. The feature offers two paths:

1. **Primary**: Gain a Fighting Style feat of your choice.
2. **Alternative**: Choose "Blessed Warrior" — learn two Cleric cantrips (Charisma as spellcasting ability), with a per-level swap.

## What Encoded Cleanly

The `grant_feat { category: "fighting_style" }` part encodes cleanly as a `passive` class_feature, identical to `fighter_fighting_style_l1`. Typecheck passes; tracer emits a clean graph.

## What Was Omitted: Blessed Warrior

The Blessed Warrior option is omitted because three surface gaps prevent honest encoding.

---

### Gap 1 — No "feat-or-bundle" alternative on `grant_feat`

**Problem:** The feature presents Blessed Warrior as an explicit in-class alternative to the Fighting Style feat: *"Instead of choosing one of those feats, you can choose the option below."* This is not a feat; it is a named non-feat option defined inline in the class feature.

`grant_feat.openFallback` currently only supports `"any_qualifying_feat"`, which means "any feat the character qualifies for." There is no way to express "or alternatively, this specific non-feat bundle."

**Proposed widening:** Add a new `openFallback` variant that can reference a named inline bundle, e.g.:
```typescript
openFallback?:
  | "any_qualifying_feat"
  | { readonly kind: "inline_option"; readonly id: string; readonly effects: ReadonlyNonEmptyArray<EffectAtom> }
```

Or alternatively, a new `CastTimeEffectModeChoice`-like pattern on `grant_feat` that allows the player to pick between the feat and a bundle.

---

### Gap 2 — `grant_spell_access` lacks a `spellcastingAbility` field

**Problem:** Blessed Warrior states: *"Charisma is your spellcasting ability for them."* RAW makes this explicit because the granted cantrips come from the Cleric list — the feature must anchor them to Charisma rather than leave the ability implicit.

`grant_spell_access` has no field to override the spellcasting ability used for casts made through a specific access grant.

**Proposed widening:**
```typescript
grant_spell_access: {
  ...existing fields...
  readonly spellcastingAbility?: Ability;  // new
}
```

This is narrower than the existing `dcOverride` pattern — it only affects the ability used to compute spell attack rolls and save DCs for this specific access path.

---

### Gap 3 — No per-level swap mechanic on `grant_spell_access`

**Problem:** *"Whenever you gain a Paladin level, you can replace one of these cantrips with another Cleric cantrip."* This is a build-time swap that fires once per class level gained. No surface representation exists for "any known spell in this pool may be swapped for another from category X each time you gain a level."

This gap also exists on `fighter_fighting_style_l1` (which notes "Whenever you gain a Fighter level, you can replace the feat" without encoding it), so it is a pre-existing known gap rather than new pressure.

**Proposed widening:** A `swapOnLevelUp` field on `grant_spell_access` (or a shared `LevelUpSwap` type reusable across feat/spell access grants):
```typescript
swapOnLevelUp?: {
  readonly sourcePool: "cleric_cantrips" | ...;
  readonly count: number;  // how many may be swapped per level
}
```

---

## Classification

`surface_widening` — all needed v4 atoms (`grant_feat`, `grant_spell_access`) exist in the taxonomy. The gaps are missing variants/fields on existing surface shapes, not missing atoms.
