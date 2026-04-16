# Proposal: Horn of Valhalla — Widening Requirements

**Unit slug:** `magic_item_horn_of_valhalla`
**Outcome:** `structural_widening`

---

## Summary

The Horn of Valhalla cannot be encoded in the current content surface. The primary blocker is that `magic_item` is not a valid `UnitRecord` kind in `types.ts`. The `UnitRecord` union covers only `spell`, `class_feature`, and `mastery`. While the v4 atom taxonomy (`TAXONOMY_atoms_graph.md`) lists `magic_item_root` as a source atom, no corresponding TypeScript record type or mechanics family exists.

Four secondary gaps would also require widening even after the top-level kind is resolved.

---

## Gap 1 — Structural: `MagicItemRecord` kind missing from `UnitRecord`

**Classification:** `structural_widening`

`UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord` — exhaustive. The tracer's top-level switch throws on any unknown `unit.kind`. A `magic_item` JSON would fail typecheck at the `UnitRecord` boundary before reaching the tracer.

**Required addition:**
```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly mechanics: MagicItemMechanics;
};

export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord | MagicItemRecord;
```

A corresponding `MagicItemMechanics` union and at least one mechanics family must be defined. The Horn fits an `activation` family (Magic action → summon) with a fixed-recharge use-count resource.

---

## Gap 2 — Surface: `RestResetCadence` missing `days_N` variant

**Classification:** `surface_widening`

The horn recharges after 7 days — not on a short rest or long rest. `RestResetCadence` currently supports:
- `short_or_long_rest`
- `long_rest`
- `short_rest`
- `partial_short_full_long`

A calendar-day recharge is structurally distinct. Many magic items (wands, rods, item powers) use this cadence.

**Required addition:**
```typescript
| { readonly kind: "days"; readonly count: number }
```

Evidence: *"Once you use the horn, it can't be used again until 7 days have passed."*

---

## Gap 3 — Surface: `create_companion` effect not in TypeScript surface

**Classification:** `surface_widening` (the atom exists in v4 taxonomy but not in `types.ts`)

The horn's primary effect is summoning N warrior spirits using the Berserker stat block. The v4 atom inventory lists `create_companion`, but the TypeScript surface has no corresponding effect variant. The current `ClassFeatureEffect` union has only `GrantExtraActionEffect | HealHpEffect`.

A magic item mechanics family would need a `create_companion` effect shape, including:
- Stat block reference (e.g., `"berserker"`)
- Count (fixed or tiered)
- Duration (1 hour or until 0 HP)
- Condition immunities granted to summoned creatures

Evidence: *"Each spirit uses the Berserker stat block and returns to Ysgard after 1 hour or when it drops to 0 Hit Points. The spirits look like living, breathing warriors, and they have Immunity to the Charmed and Frightened conditions."*

---

## Gap 4 — Surface: variant-by-type subconfigurations

**Classification:** `surface_widening`

The Horn of Valhalla is a single item with four named subtypes, each with a different spirit count and a different use requirement:

| Type   | Spirits | Requirement |
|--------|---------|-------------|
| Silver | 2       | None |
| Brass  | 3       | Proficiency with all Simple weapons |
| Bronze | 4       | Training with all Medium armor |
| Iron   | 5       | Proficiency with all Martial weapons |

No existing surface mechanism supports a single item record with indexed variant configurations. The surface would need either:
- A `variants` field listing named configurations, or
- A separate record-per-variant approach (four separate `MagicItemRecord` entries sharing a family)

The single-item-four-variants pattern appears in many SRD magic items (e.g., Crystal Ball variants, Ioun Stone variants) and warrants a general design decision.

Evidence: *"Four types of Horn of Valhalla are known to exist, each made of a different metal."*

---

## Gap 5 — Surface: item use requirement (proficiency/training prerequisite)

**Classification:** `surface_widening`

Three of the four horn variants require the user to meet a proficiency or training condition before friendly spirits are summoned. If the condition is not met, the spirits turn hostile. There is no existing mechanism for encoding item use prerequisites.

This is a deterministic mechanic (not DM adjudication): meeting the requirement is a character-state fact that affects which branch of the effect fires.

**Possible shape:**
```typescript
export type ItemUseRequirement =
  | { readonly kind: "none" }
  | { readonly kind: "proficiency_with"; readonly weaponCategory: "simple" | "martial" | "all" }
  | { readonly kind: "training_with"; readonly armorCategory: "light" | "medium" | "heavy" | "all" };
```

And a consequence branch:
```typescript
readonly onRequirementNotMet: "hostile_companions" | "no_effect" | "backlash_damage"
```

Evidence: *"If you blow the horn without meeting its requirement, the summoned spirits attack you."*

---

## Design recommendation

The Horn of Valhalla is a high-value pressure case for the `magic_item` kind because it exercises five distinct gaps simultaneously. All five are genuine widening needs (not edge cases) that will recur across the ~300 SRD magic items:

- 7-day recharge is common to most "X charges, regain Y on dawn" items
- `create_companion` is used by all summoning items (Efreeti Bottle, Figurine of Wondrous Power, etc.)
- Variant-by-type is used by Crystal Ball, Ioun Stone, Potion of Giant Strength, etc.
- Proficiency prerequisites appear on several items

Resolve Gap 1 (the `MagicItemRecord` kind) first — it gates everything else.
