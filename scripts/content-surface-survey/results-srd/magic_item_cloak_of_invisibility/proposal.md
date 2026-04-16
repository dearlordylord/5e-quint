# Proposal: Cloak of Invisibility — Structural Widening

## Outcome: `structural_widening`

The unit cannot be encoded. No `.dhall` or `.json` content file was produced.

---

## Primary Blocker: No `magic_item` kind in `UnitRecord`

`types.ts` defines:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord`. The unit's `kind: "magic_item"` has nowhere to go. The taxonomy (`TAXONOMY_atoms_graph.md`) names `magic_item_root` as a source atom, but the surface type layer has not been extended to match.

A new top-level record type is required:

```typescript
export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};

export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord | MagicItemRecord;
```

The `MagicItemMechanics` union is an open design question — the item's activation pattern (charge-based action with a timed condition effect) does not map to any existing family (`ongoing_effect`, `activation`, `triggered_reaction`, `anchored_trigger`, class-feature `activation`, mastery `on_hit_trigger`).

---

## Secondary Widenings (all required even after structural fix)

### 1. `Condition: "invisible"`

The current `Condition` type is `"prone"`. The Cloak applies `Invisible`, which is a named SRD condition. At minimum:

```typescript
export type Condition = "prone" | "invisible";
```

**Evidence:** "expend 1 charge to give yourself the Invisible condition for 1 hour"

---

### 2. `RestResetCadence`: dawn recharge variant

No existing reset cadence maps to "daily at dawn." All current variants are rest-keyed:

```typescript
| { readonly kind: "short_or_long_rest" }
| { readonly kind: "long_rest" }
| { readonly kind: "short_rest" }
| { readonly kind: "partial_short_full_long"; ... }
```

A new variant is needed:

```typescript
| { readonly kind: "daily_at_dawn" }
```

**Evidence:** "regains 1d3 expended charges daily at dawn"

---

### 3. Dice-based recharge amount

The recharge is `1d3` charges, not a fixed integer. All current `UseCountResource` caps and refill amounts are plain integers. A `DiceExpr`-typed recharge amount is required for this item (and will recur for many magic items with variable recharge).

**Evidence:** "regains 1d3 expended charges daily at dawn"

---

### 4. `magic_action` activation cost

The cloak is activated by taking the Magic action — one of the 12 `StandardActionKind` values. No activation cost variant for "magic_action" exists in `ClassFeatureActivationCost` (only `free` and `bonus_action`). A magic-item activation cost type would need this variant.

**Evidence:** "you can take a Magic action to pull its hood over your head and expend 1 charge"

---

### 5. Item-interaction early-end trigger

The Invisible effect ends early when the wearer pulls the hood down "no action required." This is an item-interaction voluntary dismiss trigger — distinct from concentration breaking, normal duration expiry, or spell dismissal. It has no representation in the current `Duration`, `expire`, or `dismiss` atoms as surface shapes.

**Evidence:** "The effect ends early if you pull the hood down (no action required) or cease wearing the cloak."

---

### 6. Attunement surface type (minor)

`attunement_slot` exists as an atom in the v4 taxonomy (Resource Atoms) but has no surface type in `types.ts`. For a `MagicItemRecord`, attunement would need a surface representation, likely as a boolean or a structured `AttunementRequirement` on the record header.

**Evidence:** "Wondrous Item, Legendary (Requires Attunement)"

---

## Summary

| Gap | Kind | Severity |
|-----|------|----------|
| No `MagicItemRecord` in `UnitRecord` | `structural_widening` | Blocking |
| `Condition: "invisible"` missing | `surface_widening` | Blocking |
| `RestResetCadence: "daily_at_dawn"` missing | `surface_widening` | Blocking |
| Dice-based recharge amount | `surface_widening` | Blocking |
| `magic_action` activation cost | `surface_widening` | Blocking |
| Item-interaction early-end trigger | `surface_widening` | Blocking |
| Attunement surface type | `surface_widening` | Required for honest encoding |

All six gaps must be resolved before this item can produce a clean encoding.
