# Proposal: Widening for Ammunition, +1, +2, or +3

## Outcome: `structural_widening`

## Unit

**Ammunition, +1, +2, or +3** — *Weapon (Any Ammunition), Uncommon (+1), Rare (+2), or Very Rare (+3)*

> You have a bonus to attack rolls and damage rolls made with this piece of magic ammunition. The bonus is determined by the rarity of the ammunition. Once it hits a target, the ammunition is no longer magical.

## Why encoding is blocked

`UnitRecord` is:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord` type. The unit cannot be represented in any existing record shape without lying about its kind. The v4 taxonomy includes `magic_item_root` as a source atom, but no corresponding surface record or mechanics family exists.

## Required widenings (in dependency order)

### 1. `MagicItemRecord` — new top-level record kind (structural)

A `MagicItemRecord` requires at minimum:
- `kind: "magic_item"` discriminant
- `attunement: boolean` (does the item require attunement?)
- A `mechanics` field typed to a new `MagicItemMechanics` union

The simplest mechanics family for this unit would be a `passive_modifier` family that grants persistent roll modifiers while the item is equipped/loaded.

### 2. Rarity axis in `LevelAxis` — new variant (surface widening, secondary)

The +1/+2/+3 bonus is not level-scaled — it is rarity-parameterized. Three separate items (one per rarity tier) is the simplest encoding: `magic_item_ammunition_plus_1`, `magic_item_ammunition_plus_2`, `magic_item_ammunition_plus_3`. This avoids needing a new axis entirely, at the cost of three records instead of one.

Alternatively, add `"rarity"` to `LevelAxis` and use `ThresholdTiers<number>` with rarity tiers. The simpler path is three records.

### 3. On-hit consumption trigger — new variant in resource model (surface widening, secondary)

"Once it hits a target, the ammunition is no longer magical."

This is a single-use resource destroyed on the hit event — not a rest-refilled pool. `RestResetCadence` only models rest-based refills. A new consumption model is needed:

```typescript
export type ItemConsumptionTrigger =
  | { readonly kind: "on_hit" }          // destroyed when the attack hits
  | { readonly kind: "on_use" }          // destroyed when activated
  | { readonly kind: "on_fire" };        // destroyed when launched (whether hit or miss)
```

For the tracer, this maps to a `use_count` resource node with `consumes` edges from the relevant resolution window, without a `rest_window` persists_until edge.

## What does fit

Once a `MagicItemRecord` shell exists, the mechanical core is straightforward:

- Two `modify_roll_numeric` effects (attack rolls and damage rolls) — both atoms exist in v4
- A `use_count` resource (1 charge, consumed on hit) — `use_count` atom exists
- A `magic_item_root` source atom — exists in v4 taxonomy

The atoms are all present. Only the structural container is missing.
