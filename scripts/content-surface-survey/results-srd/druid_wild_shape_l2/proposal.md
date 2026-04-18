# Proposal: Wild Shape (Druid L2) — Surface Widenings

**Unit slug:** `druid_wild_shape_l2`  
**Outcome:** `surface_widening`  
**Structural family:** `activation` (class_feature) — correct  
**Core atom:** `transform_target` on `self` attachment — correct

Wild Shape fits the `activation` mechanics family cleanly: Bonus Action cost, `use_count` resource (2 uses at L2), `partial_short_full_long` reset cadence, and a `direct` phase with `self` attachment. The core effect is `transform_target`. Six surface variants are missing.

---

## Gap 1 — `PolymorphRetainedField` missing three values

### Missing values

- `"class_features"` — explicit in RAW
- `"feats"` — explicit in RAW
- `"saving_throw_proficiencies"` — distinct from the existing `"skill_proficiencies"`; RAW calls both out separately

### RAW evidence

> "you retain your creature type; Hit Points; Hit Point Dice; Intelligence, Wisdom, and Charisma scores; **class features**; languages; and **feats**. You also retain your **skill and saving throw proficiencies** and use your Proficiency Bonus for them"

### Proposed addition

```typescript
export type PolymorphRetainedField =
  | "alignment"
  | "personality"
  | "creature_type"
  | "hit_points"
  | "hit_point_dice"
  | "intelligence"
  | "wisdom"
  | "charisma"
  | "skill_proficiencies"
  | "saving_throw_proficiencies"  // NEW
  | "languages"
  | "class_features"              // NEW
  | "feats";                      // NEW
```

---

## Gap 2 — `PolymorphRevertTrigger` missing two variants

### Missing variants

1. `{ kind: "incapacitated_condition" }` — form ends immediately on gaining the Incapacitated condition
2. `{ kind: "caster_uses_feature_again" }` (or `"caster_reactivates"`) — form ends automatically when the druid next uses Wild Shape

### RAW evidence

> "You stay in that form for a number of hours equal to half your Druid level or until you **use Wild Shape again**, **have the Incapacitated condition**, or die."

### Notes on existing triggers

- `dismissed_by_caster` captures the voluntary early Bonus Action exit ("You can also leave the form early as a Bonus Action"), but does not capture the automatic re-activation revert — those are different triggers.
- `zero_hp` is close to "die" but not identical (death vs. 0 HP in 5e). For modeling purposes `zero_hp` is an acceptable proxy for "or die", but the two condition-based triggers have no existing analogue.

### Proposed addition

```typescript
export type PolymorphRevertTrigger =
  | { readonly kind: "zero_hp" }
  | { readonly kind: "spell_ends" }
  | { readonly kind: "temp_hp_depleted" }
  | { readonly kind: "dismissed_by_caster" }
  | { readonly kind: "incapacitated_condition" }    // NEW
  | { readonly kind: "caster_uses_feature_again" }; // NEW
```

---

## Gap 3 — `PolymorphActionRestriction` wrong semantics

The existing `"no_speech_no_spells"` restriction (used by Polymorph) is incorrect on both axes for Wild Shape:

| Axis | Polymorph | Wild Shape |
|---|---|---|
| Speech | Forbidden ("can't speak") | **Retained** ("you retain ... your ability to speak") |
| Spellcasting | Forbidden | **Forbidden** ("You can't cast spells") |
| Concentration | Broken | **Retained** ("shape-shifting doesn't break your Concentration") |

### RAW evidence

> "You can't cast spells, **but shape-shifting doesn't break your Concentration** or otherwise interfere with a spell you've already cast."

### Proposed addition

```typescript
export type PolymorphActionRestriction =
  | "no_speech_no_spells"               // existing — Polymorph
  | "no_new_spells_keep_concentration"; // NEW — Wild Shape
```

The new variant means: no new spell casts, but existing concentrations persist and the caster retains the ability to speak.

---

## Gap 4 — `PolymorphFormSource` missing known-forms-roster variant

Wild Shape uses a **player-curated roster of known forms** (4 at L2, 6 at L4, 8 at L8), not an open "pick any Beast up to CR X". The roster is chosen at character creation / updated on long rests. The active enforcement at use time is "you may only pick a form you know."

Additionally, the CR cap scales with druid class level:

| Druid Level | Max CR | Fly Speed |
|---|---|---|
| 2 | 1/4 | No |
| 4 | 1/2 | No |
| 8 | 1 | Yes |

The existing `crBound` options are `target_cr_or_level`, `caster_level`, and `fixed`. None support class-level-tiered bounds.

### RAW evidence

> "You know four Beast forms for this feature, chosen from among Beast stat blocks that have a maximum Challenge Rating of **1/4** [...] Whenever you finish a Long Rest, you can replace one of your known forms with another eligible form."
> "When you reach certain Druid levels, your number of known forms and the maximum Challenge Rating for those forms increases, as shown in the Beast Shapes table."

### Proposed additions

```typescript
export type PolymorphFormSource =
  | {
      readonly kind: "catalog_ref";
      readonly creatureType: CreatureType;
      readonly crBound:
        | { readonly kind: "target_cr_or_level" }
        | { readonly kind: "caster_level" }
        | { readonly kind: "fixed"; readonly cr: number }
        | {                                          // NEW
            readonly kind: "class_level_tiers";
            readonly axis: "class";
            readonly tiers: ReadonlyNonEmptyArray<{
              readonly atLevel: number;
              readonly cr: number;
              readonly flySpeedAllowed?: boolean;
            }>;
          };
    }
  | { readonly kind: "known_forms_roster" }; // NEW — player-curated set
```

The `known_forms_roster` variant carries no inline data — the roster is player-owned character-sheet state managed outside the content surface.

---

## Gap 5 — `DurationValue.amount` has no level-scaling

Wild Shape lasts "a number of hours equal to **half your Druid level**". `DurationValue.amount` is a bare `number`; there is no class-level axis for scaling the duration. The existing `upcastTiers` field is spell-slot-specific.

### RAW evidence

> "You stay in that form for a number of hours equal to half your Druid level"

### Proposed addition

Either extend `DurationValue` to accept a `LinearPerLevel<number>` amount, or add a `class_scaled` variant:

```typescript
export type DurationValue = {
  readonly unit: "round" | "minute" | "hour" | "day";
  readonly amount: number | LinearPerLevel<number>; // WIDENED: number → number | LinearPerLevel<number>
  readonly upcastTiers?: ReadonlyNonEmptyArray<DurationUpcastTier>;
};
```

With this, Wild Shape's duration encodes as:
```typescript
{
  kind: "timed",
  value: {
    unit: "hour",
    amount: {
      kind: "linear_per_level",
      axis: "class",
      base: 1,        // half of L2 = 1
      perLevel: 0.5,  // but perLevel must be integer... needs rounding semantics
      startingAtLevel: 2
    }
  }
}
```

A cleaner alternative: use `ThresholdTiers<number>` (which already exists) for the amount, letting authors express the tier table exactly rather than needing fractional per-level math:

```typescript
readonly amount: number | ThresholdTiers<number>;
```

---

## Not a gap: Temp HP = Druid Level

Wild Shape grants "Temporary Hit Points equal to your Druid level." This is **encodable** without a widening by using a separate `grant_temp_hp` effect atom alongside `transform_target` in the same `direct` phase:

```typescript
{
  kind: "grant_temp_hp",
  amount: {
    kind: "linear_per_level",
    axis: "class",
    base: { dice: 2, dieSize: 1 },   // 2 flat at L2 (2 × d1)
    perLevel: { flat: 1 },           // +1 per level above L2
    startingAtLevel: 2
  }
}
```

The `tempHpFromForm: true` flag on `transform_target` is not used — that flag means "temp HP = new form's max HP", which is the Polymorph idiom. Wild Shape's temp HP is character-level-derived, not form-derived. The two effects compose honestly as siblings in the phase's `effects` array.

---

## Summary

| Gap | Kind | Blocking? |
|---|---|---|
| PolymorphRetainedField missing class_features, feats, saving_throw_proficiencies | new_variant | Yes |
| PolymorphRevertTrigger missing incapacitated_condition, caster_uses_feature_again | new_variant | Yes |
| PolymorphActionRestriction: no_new_spells_keep_concentration | new_variant | Yes |
| PolymorphFormSource: known_forms_roster + class_level_tiers crBound | new_variant | Yes |
| DurationValue.amount: level-scaling support | new_variant | Yes |
| Temp HP = druid level | — | Not blocking (grant_temp_hp suffices) |

All five blocking gaps are missing variants of existing surface types. No new v4 taxonomy atom is required.
