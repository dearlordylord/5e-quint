# Proposal: Amulet of the Planes — structural_widening

## Outcome

`structural_widening` — the unit cannot be encoded because `magic_item` is not a valid `UnitRecord` kind. No `MagicItemRecord` type exists in `types.ts`. No Dhall, JSON, or trace was produced.

---

## Gap 1 (primary blocker): No `magic_item` kind in `UnitRecord`

`UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord`

A new top-level record type is required:

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};

export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord | MagicItemRecord;
```

At minimum one mechanics family is needed to unblock this unit. The Amulet is activated by a Magic action, which suggests a family analogous to `ClassFeatureActivationMechanics` but for items — call it `activated_item`. The tracer would also need a new `traceMagicItemUnit` branch.

---

## Gap 2: `ability_check` resolution not in surface types

The amulet's activation gating is:

> "make a DC 15 Intelligence (Arcana) check"

This is an **ability check**, not a saving throw and not an attack roll. v4 lists `ability_check` as a resolution atom, but no surface `ActivationPhase` variant exists for it. Existing variants are `attack_roll` and `save_gate`.

Required new surface variant (within item mechanics or shared):

```typescript
| {
    readonly kind: "ability_check";
    readonly ability: Ability;
    readonly skill?: string;          // e.g. "arcana" — or keep as free text
    readonly dc: number;              // fixed DC (15), not caster-derived
    readonly onSuccess: Effect;
    readonly onFailure: Effect;
  }
```

Note the DC is a fixed integer, not derived from a caster stat. `DcSource` would need a new variant:

```typescript
| { readonly kind: "fixed"; readonly dc: number }
```

---

## Gap 3: Random-table destination in `transport_exile`

On a failed check, the unit transports the caster and all creatures/objects within 15 feet to a **random destination** determined by:

1. Roll 1d100 → select a destination tier (01–60, 61–70, 71–80, 81–90, 91–00)
2. Within each tier, roll a second die (1d6 or 1d8) to select a specific plane

v4 has `transport_exile` as an effect atom. The current `Effect` union (`DamageEffect | NoneEffect`) has no `transport_exile` variant and no model for random-table destination selection.

This would require:

```typescript
export type TransportExileEffect = {
  readonly kind: "transport_exile";
  readonly destination: TransportDestination;
};

export type TransportDestination =
  | { readonly kind: "named_location"; readonly description: string }  // on-success Plane Shift path
  | { readonly kind: "random_table"; readonly tableId: string };       // on-failure path
```

The `random_table` variant is a structural gap — the surface has no concept of a random outcome table with nested sub-rolls. The full table (1d100 → 1d6/1d8 → named plane) is pure random narrative; encoding the table entries themselves would need a separate table registry, which is outside the current surface scope.

**Classification for Gap 3**: `surface_widening` (new variant of `Effect` + `TransportDestination`) plus a deferred question of whether random-table contents belong in the surface at all or are caller-owned narrative (ARCHITECTURE.md concern).

---

## Summary of widenings in priority order

| # | Kind | Name | Blocks encoding? |
|---|------|------|-----------------|
| 1 | `new_subgraph` | `MagicItemRecord` + `magic_item` family | Yes — primary blocker |
| 2 | `new_variant` | `attunement_slot` in surface resource types | Yes — item identity |
| 3 | `new_variant` | `ability_check` resolution phase | Yes — activation gate |
| 4 | `new_variant` | `transport_exile` effect + random-table destination | Yes — failure path |

All four must be addressed before this item can produce a clean trace.
