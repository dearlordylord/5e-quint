# Proposal: structural_widening — Carpet of Flying

## Outcome

`structural_widening` — the unit cannot be encoded. No `MagicItemRecord` exists in `UnitRecord`.

## Primary blocking gap

`types.ts` defines:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

The v4 taxonomy includes `magic_item_root` as a source atom and the pipeline manifest tags this unit as `kind: magic_item`, but there is no `MagicItemRecord` in the union, no `MagicItemMechanics` type, and no payload family for magic items. This is the single blocker — everything else is secondary.

## Secondary gaps (would be needed after the primary is resolved)

### 1. Magic-action activation cost

The carpet is activated by a **Magic action** (`StandardActionKind = "magic"`). The class-feature activation cost surface only models `"free"` and `"bonus_action"`. A third variant is needed:

```typescript
| { readonly kind: "magic_action" }
```

This would wire to the `action_quota` resource atom (same as the spell `action` casting time), but the semantic meaning — consuming the Magic action specifically — is distinct from a free or bonus-action activation.

### 2. GM-table size variant

The carpet exists in 4 size variants (3×5 ft, 4×6 ft, 5×7 ft, 6×9 ft) with different Fly Speeds and carry capacities. The specific variant is chosen by the GM or determined by a 1d100 roll at the time the item is found. No encoding exists for item-level stat variants. This is not a scaling axis (`character`/`class`/`slot`/`proficiency_bonus`) — it is a one-time, GM-adjudicated selection at acquisition time.

A possible surface shape would be something like:

```typescript
type ItemVariant<T> = {
  readonly kind: "gm_table";
  readonly rollDie: number;          // 100
  readonly variants: ReadonlyArray<{
    readonly rollRange: [number, number];
    readonly value: T;
  }>;
};
```

This is new enough to warrant careful design before adding — it is the first item in the survey to require variant-at-acquisition-time encoding.

### 3. Load-conditional speed modifier

> "A carpet can carry up to twice the weight shown on the table, but its Fly Speed is halved if it carries more than its normal capacity."

No conditional modifier shape exists that predicates a speed change on carried weight vs. a capacity threshold. The `modify_speed` v4 atom exists but has no conditional/predicated variant in the surface types. The needed shape is something like:

```typescript
type ConditionalSpeedModifier = {
  readonly kind: "conditional";
  readonly condition: { readonly kind: "carrying_above_capacity" };
  readonly effect: { readonly kind: "halve_speed"; readonly speedKind: "fly" };
};
```

## What v4 atoms would be used if the surface were widened

Once the record type and mechanics header exist, the tracer would emit:

- `magic_item_root` (source)
- `activate` (procedure, triggered by magic action)
- `action_quota` (resource, consumed by magic action)
- `grant_hover` (effect — the carpet hovers/flies)
- `modify_speed` (effect — grants the Fly Speed value)
- Possibly a `persist` + `expire` chain if duration needs modelling (the carpet's flight appears permanent while active, with no stated duration limit)

All of these atoms already exist in v4. The surface widening needed is purely in the record/mechanics type layer, not in the atom inventory.

## Recommendation

Add `MagicItemRecord` to `UnitRecord` before encoding any magic items. The Carpet of Flying is a useful pressure test for the first magic item mechanics family because it combines:
- A non-spell, non-class-feature activation pattern
- GM-table variant selection at acquisition
- A conditional speed modifier

A simpler magic item (e.g. a passive always-on bonus like Cloak of Protection's +1 AC/saves) would be an easier first encoding, but the Carpet of Flying exposes the full scope of what the magic item surface needs to support.
