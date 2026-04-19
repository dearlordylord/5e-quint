# Proposal: Animal Shapes surface widenings

## Summary

Animal Shapes encodes cleanly as an `ongoing_effect` spell using the `transform_target` atom and `any_number` target selection. The tracer runs without errors. Three variants of existing surface types are missing that prevent a complete honest encoding.

## Gap 1: `PolymorphRevertTrigger` — target voluntary Bonus Action revert

**Evidence:** "The transformation lasts for the duration or until the target ends it as a Bonus Action."

The target can end its own transformation by spending a Bonus Action. This is a player-owned, target-initiated revert — distinct from `spell_ends` (caster/duration), `zero_hp` (combat), `temp_hp_depleted` (polymorph-family), and `dismissed_by_caster` (caster-initiated). Without this variant, the encoded spell only reverts at the 24-hour boundary or when the target reaches 0 HP.

**Proposed widening:**
```typescript
export type PolymorphRevertTrigger =
  | { readonly kind: "zero_hp" }
  | { readonly kind: "spell_ends" }
  | { readonly kind: "temp_hp_depleted" }
  | { readonly kind: "dismissed_by_caster" }
  | { readonly kind: "target_bonus_action" };  // NEW
```

This variant covers any transform effect that a willing target can voluntarily undo by spending a Bonus Action — the same mechanism appears in Wild Shape and could appear in future polymorph variants.

## Gap 2: `PolymorphActionRestriction` — `no_spells_only` variant

**Evidence:** "the target retains its... ability to communicate... and it can't cast spells."

Animal Shapes suppresses spellcasting but explicitly preserves the target's ability to speak and be understood. The only existing `PolymorphActionRestriction` value is `"no_speech_no_spells"` (used by Polymorph, True Polymorph), which suppresses both. Using it here would produce a dishonest trace — the encoding omits `actionRestriction` entirely.

**Proposed widening:**
```typescript
export type PolymorphActionRestriction =
  | "no_speech_no_spells"   // existing (Polymorph, True Polymorph)
  | "no_spells_only";       // NEW: can communicate, cannot cast spells
```

Note: Polymorph's "can't speak" comes from the beast form's anatomy (most beasts lack humanoid vocal structure). Animal Shapes specifically overrides that by retaining the creature's ability to communicate — the distinction is RAW-relevant and worth capturing in the type.

## Gap 3: `PolymorphFormSource` — `maxSize` constraint

**Evidence:** "Each target shape-shifts into a Large or smaller Beast."

The beast selection is constrained by both CR (≤ 4) and size (Large or smaller). `PolymorphFormSource` only carries `creatureType` and `crBound`; there is no field for a maximum size ceiling.

**Proposed widening:**
```typescript
export type PolymorphFormSource = {
  readonly kind: "catalog_ref";
  readonly creatureType: CreatureType;
  readonly crBound: ...;
  readonly maxSize?: Size;  // NEW: "Large or smaller" → maxSize: "large"
};
```

## Minor approximation: `ability to communicate` → `languages`

The SRD retained-field "ability to communicate" is broader than linguistic knowledge — it includes the physical and cognitive capacity to speak and be understood. The closest available `PolymorphRetainedField` is `"languages"`. No new field is proposed (the distinction is edge-case) but it is noted for accuracy.

## Encoded shape (partial)

The encoding includes:
- `family: "ongoing_effect"` — 24-hour timed duration, no concentration
- `attachment`: `any_number` target selection
- `initialPhase`: `direct` → `transform_target` (beast CR ≤ 4, retained fields, tempHpFromForm=true)
- `operations`: `on_caster_spends_action(magic)` → `transform_target` (re-transform on later turns; tempHpFromForm omitted since THP is only granted from the first form per RAW)
- `revertTriggers`: `[spell_ends, zero_hp]` — the `target_bonus_action` trigger is missing (Gap 1 above)
- `actionRestriction`: omitted — the `no_spells_only` variant is missing (Gap 2 above)
