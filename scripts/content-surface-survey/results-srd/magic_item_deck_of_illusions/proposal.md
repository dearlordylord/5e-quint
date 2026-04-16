# Proposal: Deck of Illusions — structural_widening

## Why it does not encode

`UnitRecord` in `types.ts` is:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord`. The tracer's `traceUnit` switch is exhaustive over `"spell"`, `"class_feature"`, `"mastery"` — any other `kind` throws. No `.dhall` or `.json` was authored.

## Required widenings

### 1. `MagicItemRecord` (structural — new UnitRecord variant)

A new top-level record type is needed. Minimum shape:

```typescript
type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly attunement: false | string;        // false = no attunement; string = attunement requirement
  readonly rarity: MagicItemRarity;           // "common" | "uncommon" | "rare" | "very_rare" | "legendary"
  readonly mechanics: MagicItemMechanics;
};
```

### 2. `magic_item_activation` mechanics family (structural — new family)

Magic items do not decompose into SpellMechanics, ClassFeatureMechanics, or MasteryMechanics. A magic item activation family needs at minimum:

- **Resource**: the item's charge/card pool (see widening 5)
- **Activation cost**: a standard action kind (Magic action for this item)
- **Effect**: what fires on use

The tracer would need a `traceMagicItemUnit` path with a new `magic_item_root` source node (this atom already exists in v4 taxonomy but has no surface type or tracer handler).

### 3. `create_illusion` effect atom (atom_widening)

The deck creates an illusory creature with SRD-defined properties that make it distinct from `create_object` and `create_companion`:

- Harmless: cannot deal damage
- Passable: objects pass through it (no physical solidity)
- Identifiable: DC 15 INT (Investigation) check via Study action reveals it
- Dispellable: ends on Dispel Magic or card movement

`create_object` carries no harmless/passable/identifiable semantics. A `create_illusion` atom is needed.

### 4. Random table resolution (surface_widening — new resolution variant)

The creature created is determined by a d100 roll against a 32-entry table. No existing resolution surface covers this — it is not an attack_roll, save_gate, or ability_check. It is a random-table selection where:

- Input: draw event
- Output: one of 32 creature types (or "the card drawer")
- Randomness is DM-visible and creature-identity is the resolved value

This may warrant a new `table_roll` resolution variant, or it may be classified as caller-owned (DM rolls d100, selects creature) per ARCHITECTURE.md. If treated as caller-owned, the effect slot for creature identity would be left as an opaque `table_resolved` reference.

### 5. Per-card non-refilling resource (surface_widening — new UseCount variant)

Each of the deck's cards is individually consumed:
- No refill on rest
- Total cap is variable at acquisition (34 minus 1d20−1 missing cards)
- Individual cards track their own used state (image disappears)

The existing `UseCountResource` with `cap` handles refillable pools. A `consumable_deck` resource variant is needed where: total cards are set at item creation, each draw permanently removes one, and there is no reset cadence.

## Secondary gap (not a widening, design note)

The owner's secondary controllable-illusion action — "while within 120 feet and can see it, take a Magic action to move it within 30 feet of its card" — is an ongoing operation on the persistent illusion. This maps roughly to an `ongoing_effect` with a `post_action_window` that opens on the caster's turn, but the 120-foot range constraint on the caster is not expressible in any current attachment/operation shape. This would need design thought during the `magic_item_activation` family work.
