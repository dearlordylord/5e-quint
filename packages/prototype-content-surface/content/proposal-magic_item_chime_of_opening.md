# Proposal: magic_item_chime_of_opening

**Outcome:** `structural_widening`

## Why this unit cannot be encoded

The current `UnitRecord` type only covers `spell | class_feature | mastery`. The Chime of Opening is a `magic_item`, which has no corresponding record type or mechanics family in `types.ts`. Three distinct gaps block encoding:

---

## Gap 1 — Missing `MagicItemRecord` UnitRecord variant

`TAXONOMY_atoms_graph.md` v4 includes `magic_item_root` in the source-atom inventory, but `types.ts` has no `MagicItemRecord` type or `magic_item` branch in `UnitRecord`. This is a prerequisite for encoding any magic item.

**Minimum addition:**
```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly rarity: "common" | "uncommon" | "rare" | "very_rare" | "legendary" | "artifact";
  readonly mechanics: MagicItemMechanics;
};

export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord | MagicItemRecord;
```

---

## Gap 2 — Missing `spell_via_charges` MagicItemMechanics family

The Chime of Opening's core mechanic is: **spend a charge + a Magic action → cast a named spell (Knock)**. No existing mechanics family captures this:

- It is not a spell being cast by a spellcaster (no spell level, school, components, or caster's spell save DC).
- It is not a class feature activation (no class, no class level, no rest cadence).
- It is not an `ongoing_effect`, `triggered_reaction`, or `anchored_trigger`.

The pattern of "item stores a spell and releases it per charge" is a first-class magic-item mechanics shape that appears across many SRD items. A new family is needed:

**Proposed mechanics family:**
```typescript
export type SpellViaChargesMechanics = {
  readonly family: "spell_via_charges";
  readonly activationCost: { readonly kind: "magic_action" };  // or action/bonus_action
  readonly spellId: string;            // e.g. "knock"
  readonly chargesPerUse: number;      // typically 1
  readonly resource: ChargeResource;
};
```

The `spellId` reference approach avoids duplicating spell mechanics into the item — the item *delegates* to the spell's own record for resolution.

---

## Gap 3 — Missing non-rechargeable permanent-depletion charge resource

`UseCountResource` requires a `RestResetCadence`. The Chime of Opening's 10 charges are **permanently consumed** — the item cracks and becomes useless when exhausted. No `RestResetCadence` variant covers "never; item is destroyed on exhaustion."

This is structurally distinct from existing charge patterns in the v4 taxonomy (which presuppose some form of recharge). The Chime belongs to a category of **one-way consumable items** (like Potions, but multi-use).

**Proposed resource type:**
```typescript
export type ChargeResource = {
  readonly kind: "charge";
  readonly total: number;             // e.g. 10
  readonly recharge: ChargeRecharge;
};

export type ChargeRecharge =
  | { readonly kind: "daily"; readonly amount: number | "1d6+1" }  // common for wands/rods
  | { readonly kind: "none"; readonly onExhaustion: "destroyed" | "inert" };
```

The Chime uses `{ kind: "none", onExhaustion: "destroyed" }`.

---

## What does NOT require new atoms

The sound substitution — "the spell's customary knocking sound is replaced by the clear, ringing tone of the chime, audible out to 300 feet" — is **purely cosmetic/caller-owned narrative**. Per `ARCHITECTURE.md`, notification surfaces belong to the caller, not the core. This belongs in the `description` field only and requires no new atoms.

---

## Recommended widening order

1. Add `MagicItemRecord` to `UnitRecord` (unlocks all magic item encoding).
2. Add `ChargeResource` with `ChargeRecharge` (needed by most wand/staff/charged-item patterns).
3. Add `spell_via_charges` mechanics family (needed for Chime of Opening, Wand of Magic Missiles, Necklace of Fireballs, etc.).
4. Add `magic_action` to `ClassFeatureActivationCost` or introduce a unified `ItemActivationCost` (Chime uses a Magic action, which differs from a free activation).

Step 4 may be shared with future class-feature encoding that also needs a `magic_action` cost category.
