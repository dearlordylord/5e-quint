# Widening Proposal — Candle of Invocation

**Outcome:** `structural_widening`  
**Confidence:** high

---

## Why encoding is blocked

`UnitRecord` in `src/surface/types.ts` is:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord`. The tracer's `traceUnit` switch is exhaustive over `"spell" | "class_feature" | "mastery"` — it throws on any other kind. The v4 taxonomy lists `magic_item_root` as a source atom, but no corresponding surface type or tracer branch exists.

No `.dhall` or `.json` content file was authored. A fake encoding is not possible without misrepresenting the unit kind entirely.

---

## Gap 1 (structural): MagicItemRecord + magic_item mechanics family

A new top-level record type is needed:

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly rarity: MagicItemRarity;         // common | uncommon | rare | very_rare | legendary | artifact
  readonly mechanics: MagicItemMechanics;
};
```

At minimum one mechanics family is needed to cover items that activate when used and persist while conditions are met — a candidate working name is `"persistent_aura"` (for items like the Candle that emit a sustained field while active).

`UnitRecord` must be widened to include `MagicItemRecord`, and `traceUnit` must add a `case "magic_item":` branch.

---

## Gap 2 (surface widening): `RollKind` missing `ability_check`

The candle grants Advantage on **D20 Tests**, which SRD 5.2.1 defines as attack rolls, saving throws, *and* ability checks. `RollKind` is currently:

```typescript
export type RollKind = "attack_roll" | "saving_throw";
```

A third variant `"ability_check"` is needed. This is a narrow surface widening — it does not require a new atom (v4 `modify_roll_advantage` already exists).

**Evidence:** "you have Advantage on D20 Tests"

---

## Gap 3 (surface widening): Consumable burn-time resource

The candle tracks remaining burn time: 4 hours total, deducted in 1-minute increments, resumable if snuffed. This is mechanically distinct from:

- `use_count` — discrete integer quota  
- `charge` — discrete rechargeable quota

A continuous-time consumable resource needs a new surface variant, tentatively:

```typescript
export type BurnTimeResource = {
  readonly kind: "burn_time";
  readonly totalMinutes: number;           // 240 for Candle of Invocation
  readonly granularityMinutes: number;     // 1
};
```

The candle's "destroyed on exhaustion" behavior needs a `complete` or `destroy_on_exhaust` lifecycle edge.

**Evidence:** "After burning for 4 hours, the candle is destroyed. You can snuff it out early for use at a later time. Deduct the time it burned in increments of 1 minute from its total burn time."

---

## Gap 4 (atom widening): `waive_spell_slot_cost` effect

The candle's primary ongoing effect for spellcasters is not granting spell access — Clerics and Druids already have their prepared spells. It waives the spell slot cost for level 1 spells specifically. No v4 effect atom covers this:

- `grant_spell_access` — grants spells the creature doesn't have
- `grant_proficiency` — wrong category
- Nothing in the v4 effect list represents "remove resource cost for spell casting"

A new effect atom `waive_spell_slot_cost` (or `reduce_spell_slot_cost`) is needed with parameters for the maximum spell level affected and optionally the class restriction.

**Evidence:** "a Cleric or Druid in the light can cast level 1 spells they have prepared without expending spell slots."

---

## Gap 5 (dm_agenda): Gate alternative use

The one-time Gate use creates a portal to an Outer Plane "chosen by the GM or determined by rolling on the following table." The destination is DM-adjudicated; the random table is a DM tool, not a deterministic mechanical resolution. Per `ARCHITECTURE.md`, DM agenda belongs outside the core mechanics graph.

If this mode is encoded at all, it should be flagged with a `dm_agenda` signal rather than a closed destination type.

**Evidence:** "The portal created by the spell links to a particular Outer Plane chosen by the GM or determined by rolling on the following table."

---

## Recommended widening order

1. **MagicItemRecord + family** — structural prerequisite; nothing else matters without it.  
2. **`RollKind: "ability_check"`** — narrow, non-breaking addition; needed for D20 Test scope.  
3. **`BurnTimeResource`** — new resource variant; blocked by step 1.  
4. **`waive_spell_slot_cost` atom** — new v4 atom; can be designed once step 1 is underway.  
5. **Gate dm_agenda handling** — design alongside any `MagicItemMechanics` alternative-use subgraph.
