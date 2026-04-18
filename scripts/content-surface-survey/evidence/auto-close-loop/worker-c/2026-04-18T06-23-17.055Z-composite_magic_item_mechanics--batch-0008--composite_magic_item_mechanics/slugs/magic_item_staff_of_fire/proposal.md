# Staff of Fire

## Verdict

`Staff of Fire` fits the existing `magic_item` kind honestly as a `composite` item:

- a passive held-item grant for Fire resistance
- an activation part with a 10-charge pool
- charge-based spell casting for `Burning Hands`, `Fireball`, and `Wall of Fire`
- dawn recharge
- last-charge destruction

The remaining gap is narrower than the payload family: the attunement restriction is class-gated, and `MagicItemRecord` can only express `requiresAttunement: boolean`.

## Required widening

- Kind: `new_variant`
- Surface: `MagicItemRecord` attunement requirement metadata
- Proposal: replace the bare boolean with a discriminated requirement shape, for example:

```ts
type AttunementRequirement =
  | { readonly kind: "none" }
  | { readonly kind: "any" }
  | {
      readonly kind: "class_list";
      readonly classes: ReadonlyNonEmptyArray<ClassName>;
    };
```

## Why this is `surface_widening`

No new v4 atom is forced. The traced mechanics already fit existing atoms:

- `grant_resistance`
- `grant_spell_access`
- `charge`
- `duration_window`
- `item_destruction`

The missing concept is record-level metadata about who may attune to the item.

## Evidence

> Staff, Very Rare (Requires Attunement by a Druid, Sorcerer, Warlock, or Wizard)
