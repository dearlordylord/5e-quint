# Proposal: Bag of Beans — structural_widening

## Unit

**Bag of Beans** — Wondrous Item, Rare (SRD 5.2.1, Magic-Items/Items-A-H.md)

## Why this unit cannot be encoded

### Primary blocker: `magic_item` kind does not exist in `UnitRecord`

`types.ts` defines:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord`. The v4 taxonomy lists `magic_item_root` as a source atom, but the type system has no corresponding record kind, mechanics family, or tracer branch. Every magic item fails at this level before any atom-level question can be asked.

### Secondary blocker: consumable inventory resource has no type

The bag contains **3d4 beans found randomly**, each one physically consumed on use. The bag becomes nonmagical when empty. This is not:

- `use_count` — use_count has a `cap` (fixed or tiered) and a `resetCadence`. Beans have no cap schedule and do not reset; they deplete permanently.
- `spell_slot` — no level axis.

The v4 taxonomy lists `charge` as a resource atom but it is absent from `types.ts`. A `charge` variant would need to encode: initial count is random (3d4), each use consumes one charge permanently, no refill mechanic, item becomes nonmagical at zero.

### Tertiary blocker: planted-bean effect is DM agenda

The plant-a-bean mechanic dispatches to a 1d100 table of 20 wildly heterogeneous outcomes:

| Range | Nature |
|---|---|
| 01 | Toadstools; odd roll → DC 15 Con save, 5d6 Poison + Poisoned; even roll → 5d6 Temp HP |
| 02–10 | Geyser (GM's choice of substance) |
| 11–20 | Treant (alignment per any die roll) |
| 21–30 | Animate statue, verbal threats, knows where you are on same plane |
| 31–40 | Campfire with green flames, 24 hours |
| 41–50 | Three Shrieker Fungi |
| 51–60 | 1d4+4 toads → GM-choice monster on touch |
| 61–70 | Hungry Bulette, attacks |
| 71–80 | Fruit tree (1d10+20 fruit, 1d8 are random potions) |
| 81–90 | Nest of eggs: DC 20 Con save, success → +1 lowest ability score permanently; fail → 10d6 Force |
| 91–95 | Pyramid + burial chamber, GM-choice undead and treasure |
| 96–00 | Giant beanstalk, GM-chosen height and destination |

The outcomes include: companion creation (Treant, Bulette), permanent ability score modification, architectural creation, narrative/social effects (statue directing NPCs), GM-determined content (substance, monster type, treasure, destination plane). This is not a deterministic mechanical resolution. Even if a `magic_item` family existed, this sub-mechanic would be classified `dm_agenda`.

### What could encode cleanly (if the structural gap were closed)

The **dump-beans explosion** is the only deterministic mechanical mode:

- Area attachment: 10-ft sphere centered on dumped beans
- Save gate: DC 15 Dexterity
- On fail: 5d4 Force damage
- On success: half damage (2d4+half rounding, or explicit half)
- All dumped beans destroyed (charge depletion)

This sub-mechanic maps to `activation` → `save_gate` phase with an `area` attachment, once a `magic_item` family and a `charge` resource variant exist.

## Required widenings

1. **`MagicItemRecord` + magic item mechanics family** — structural addition. At minimum needs: `id`, `name`, `provenance`, `description`, `kind: "magic_item"`, and a `mechanics` field with at least one family (analogous to `SpellMechanics` or `ClassFeatureMechanics`). Tracer needs a `traceMagicItemUnit` branch.

2. **`charge` resource variant in `types.ts`** — surface widening. Shape: initial count (fixed or rolled), permanent-depletion model, optional becomes-nonmagical-at-zero flag. Distinct from `use_count` by the absence of a reset cadence.

3. **`random_table_dispatch` mechanic** — if magic items are to encode random-table effects at all, a new subgraph is needed. Likely better classified as dm_agenda permanently: the table outcomes are GM-determined narrative/environmental effects that belong to the caller, not the core mechanic engine.
