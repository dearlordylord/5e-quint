# Proposal: Carpet of Flying — structural_widening

## Unit

**Carpet of Flying** — Wondrous Item, Very Rare (SRD 5.2.1)

## Why this unit does not fit

The Carpet of Flying is a **magic vehicle**: the item itself acquires fly speed and locomotion when activated. No existing mechanics family or effect atom in the current surface models this pattern.

### Gap 1 — Item-as-vehicle (structural)

`grant_speed` grants a speed mode to a **creature**. The carpet is not granting the rider a fly speed; the **carpet itself** is the flying entity and passengers ride it. The distinction matters:

- The carpet can fly without a rider aboard (it just needs the commander within 30 ft).
- The speed halving is based on total cargo weight, not on the rider's properties.
- Modeling it as "rider gains fly speed" would produce a dishonest trace — the rider's speed sheet is unchanged; the carpet's is.

The surface has no family or atom for "item acquires a movement mode and carries occupants."

### Gap 2 — Remote command radius

The carpet "moves according to your directions if you are within 30 feet of it." This is a **remote-control range** on the item's ongoing movement — distinct from the caster's own range or touch. No surface concept exists for "item obeys commands within N feet of commander."

There is no `commandRangeFeet` analog on an item activation, and `ActivatedAbilityMechanics` has no field for ongoing remote control after activation.

### Gap 3 — Weight-capacity conditional speed halving

> "A carpet can carry up to twice the weight shown on the table, but its Fly Speed is halved if it carries more than its normal capacity."

This is a **cargo-weight threshold predicate** on speed. The existing `set_speed_ratio { numerator: 1, denominator: 2 }` atom exists but has no predicate mechanism to gate it on "total load exceeds normal capacity." `EquipmentPredicate` and `OngoingPredicate` have no weight-comparison variant.

### Gap 4 — Four size variants with GM-random selection

The four size/capacity/speed variants (3×5 ft/200 lb/80 ft, 4×6 ft/400 lb/60 ft, 5×7 ft/600 lb/40 ft, 6×9 ft/800 lb/30 ft) are determined by a d100 table roll the GM makes at find time. The variant structure (`MagicItemRecord.variants`) could represent the four stat lines once the vehicle mechanic exists. The d100 randomization is DM agenda (the GM owns the roll), not core mechanics.

## What would be needed

### Option A — New `vehicle` mechanics family

```
MagicItemVehicleMechanics = ActivatedAbilityHeader & {
  family: "vehicle",
  commandRangeFeet: number,         // 30 ft for carpet
  flySpeed: number,                  // per variant
  carryCapacityPounds: number,       // per variant
  overloadSpeedMultiplier?: { numerator: number, denominator: number }, // 1/2 when overloaded
  maxOverloadPounds?: number,        // 2× capacity for carpet
}
```

This would extend `MagicItemMechanics` and require a new tracer branch.

### Option B — Atom widening within `activation` family

If the family stays `activation`, the minimum atoms needed are:
1. A new `grant_item_speed` atom (distinct from `grant_speed`) that targets the item rather than the bearer.
2. A `command_radius` field on `ActivatedAbilityMechanics` for the ongoing 30 ft control window.
3. A `weight_threshold` variant of `OngoingPredicate` or a new conditional field on `grant_item_speed`.

Option A is cleaner — the vehicle pattern recurs (Folding Boat keelboat, Apparatus of Kwalish, future airship items) and deserves a first-class family.

## Classification

**structural_widening** — no honest encoding is possible with the current families and atoms.
