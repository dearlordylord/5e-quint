# Proposal: Necklace of Fireballs — structural_widening

## Outcome

`structural_widening` — no honest encoding is possible. The unit cannot be written as a `.dhall` or `.json` because `kind: "magic_item"` does not exist in `UnitRecord`.

---

## Gap 1 (blocking): Missing `MagicItemRecord` and `MagicItemMechanics` family

`UnitRecord` is currently:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

The v4 taxonomy lists `magic_item_root` as a source atom (§1), but `types.ts` has no `MagicItemRecord`, no `MagicItemMechanics`, and no tracer branch for `kind: "magic_item"`. Every magic item in the corpus is blocked at this level.

**Minimum required additions:**

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};
```

`MagicItemMechanics` needs at least one family. For the Necklace, the natural family would be something like `charge_activation` — an item that holds a finite pool of charges consumed on activation.

---

## Gap 2: Charge resource with random starting count

The necklace starts with **1d6+3 beads** — a random starting count set when the item is created/found. This is not expressible by any current `UseCountCap`:

```typescript
export type UseCountCap =
  | { readonly kind: "fixed"; readonly uses: number }
  | ThresholdTiers<number>;
```

A new cap variant is needed:

```typescript
| { readonly kind: "rolled"; readonly expr: DiceExpr }
// e.g. { kind: "rolled", expr: { dice: 1, dieSize: 6, flat: 3 } }
```

This represents "the pool size is determined by rolling on item creation."

---

## Gap 3: Multi-charge consumption with per-charge damage scaling

The necklace allows throwing multiple beads simultaneously:

> "increase the damage of the Fireball by 1d6 for each bead after the first (maximum 12d6)"

This requires a scaling axis tied to **charges consumed in a single activation** — not slot level, not class level, not character level. The base damage is 8d6 (level 3 Fireball) and each additional bead adds 1d6 (capped at 12d6 total, i.e. 4 additional beads maximum).

No existing `LevelAxis` or `DiceAmount` shape covers this. A new axis or a new activation-time parameter is needed. Suggested name: `charges_consumed` axis, or a dedicated `per_extra_charge` field on a charge-activation operation.

---

## What would fit cleanly once gaps are addressed

Once `MagicItemRecord` and a charge resource with dice-roll init exist, the **single-bead** activation maps cleanly to atoms already in the vocabulary:

| Mechanic | Atom / shape |
|---|---|
| Magic action cost | `action_quota` |
| Bead pool | `charge` resource with rolled cap |
| Throw up to 60 ft | `range: { kind: "point", feet: 60 }` |
| Detonates as Fireball | `save_gate` (DEX save, DC 15) + `area` (sphere r=20 ft) |
| Fire damage (8d6 base) | `damage` effect, `fixed` DiceAmount |
| Bead consumed | `consumes` → `charge` |

The multi-bead damage scaling (Gap 3) is a secondary widening on top of the structural gap; single-bead encoding would be clean.

---

## Classification

- **Gap 1** = `structural_widening` (missing top-level kind and mechanics family)
- **Gap 2** = `surface_widening` (new variant of `UseCountCap`)
- **Gap 3** = `surface_widening` (new `LevelAxis` value or new scaling operation variant)
