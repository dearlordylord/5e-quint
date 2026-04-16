# Proposal: Periapt of Wound Closure

**Outcome:** `structural_widening`

---

## Why encoding was blocked

The unit's `kind` is `magic_item`. The TypeScript surface (`types.ts`) defines:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `MagicItemRecord` — no `kind: "magic_item"` branch, no mechanics family for magic items, and no mechanism for attunement requirements. The v4 taxonomy lists `magic_item_root` as a source atom and the survey queue includes many magic-item slugs, but the schema gap means no magic item can be encoded yet.

No `.dhall`, `.json`, or `.trace.md` was written because producing a fake encoding would be worse than none.

---

## Required widenings

### 1. Structural — `MagicItemRecord` (blocks all magic items)

A new top-level record kind and mechanics family are needed. Minimum sketch:

```typescript
export type MagicItemRarity =
  | "common" | "uncommon" | "rare" | "very_rare" | "legendary" | "artifact";

export type MagicItemRecord = UnitMetadata & {
  readonly kind: "magic_item";
  readonly rarity: MagicItemRarity;
  readonly requiresAttunement: boolean;
  readonly mechanics: MagicItemMechanics;
};
```

The mechanics payload family is open — this item alone forces at least two families: a passive-always-on family and possibly a triggered-passive family. Other magic items in the queue will add more.

### 2. Atom — `modify_roll_floor` (Life Preservation)

**SRD text:** "Whenever you make a Death Saving Throw, you can change a roll of 9 or lower to a 10, turning a failed save into a successful one."

This is a floor/clamp on the raw die value before the roll's pass/fail is evaluated. It is mechanically distinct from:
- `modify_roll_numeric` — adds a fixed die delta; does not clamp
- `modify_roll_advantage` — grants advantage/disadvantage; does not change specific values
- `modify_roll_reroll` — forces a reroll; does not guarantee a minimum

A new effect atom `modify_roll_floor` is needed:

```typescript
export type ModifyRollFloorEffect = {
  readonly kind: "modify_roll_floor";
  readonly on: ReadonlyArray<RollKind>;   // or a narrower RollKindFilter
  readonly floorValue: number;
};
```

### 3. Window variant — death saving throw trigger

**SRD text:** "Whenever you make a Death Saving Throw"

Death saving throws are not saves against a caster's spell save DC — they are a fixed-DC (10) survival mechanic triggered when a creature starts its turn at 0 HP. No existing window atom or `save_gate` variant targets this event. A `death_saving_throw_window` or a new filter on `save_gate` is needed.

### 4. Atom — `hit_die_window` (Natural Healing Boost)

**SRD text:** "Whenever you roll a Hit Point Die to regain Hit Points"

This fires when a creature spends and rolls a Hit Die during a Short Rest. The existing `rest_window` fires on rest *completion*, not on the individual die-roll event within the rest. A `hit_die_window` atom is needed to scope the trigger to the specific Hit Die expenditure.

### 5. Atom — HP multiplier effect (Natural Healing Boost)

**SRD text:** "double the number of Hit Points it restores"

"Double" is a ×2 multiplier applied to the result of the Hit Die roll (die result + CON modifier). No existing effect or scaling atom models this:
- `heal` — grants a fixed HP amount; cannot express "double whatever the die shows"
- `scale_numeric_bonus` — adds a fixed bonus per level; not a multiplier
- `scale_die_count` / `scale_die_size` — changes the die pool; not a multiplier on the result

A new effect atom is needed, e.g.:

```typescript
export type ModifyHealMultiplierEffect = {
  readonly kind: "modify_heal_multiplier";
  readonly multiplier: number;   // 2 for "double"
};
```

### 6. Surface field — attunement requirement

**SRD text:** "Requires Attunement"

The v4 taxonomy has `attune` (procedure atom) and `attunement_slot` (resource atom), but the surface has no field on any record type that declares whether a magic item requires attunement. `MagicItemRecord` will need an `attunement` field (boolean or a typed variant that can express "requires attunement by a creature of a specific class/alignment").

---

## Summary table

| # | Kind | Name | Blocks |
|---|------|------|--------|
| 1 | new_subgraph | `MagicItemRecord` + payload family | All magic items |
| 2 | new_atom | `modify_roll_floor` | Life Preservation |
| 3 | new_variant | death saving throw window | Life Preservation |
| 4 | new_atom | `hit_die_window` | Natural Healing Boost |
| 5 | new_atom | `modify_heal_multiplier` | Natural Healing Boost |
| 6 | new_variant | attunement requirement field | All attuned items |

Items 2–5 are independent of each other; all are gated behind item 1. Item 6 is also gated behind item 1 and is a prerequisite for any attuned magic item.
