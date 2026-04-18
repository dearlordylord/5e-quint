# Staff of Fire

## Verdict

`Staff of Fire` fits the existing `magic_item` kind and `composite` mechanics family honestly:

- passive part: `grant_resistance` to Fire while holding the staff
- activation part: `charge_pool` + `dawn` recharge + `grant_spell_access` for the three spells
- destruction: existing `last_charge_roll`

The remaining gap is the attunement restriction.

## Surface gap

- Classification: `surface_widening`
- Missing shape: class-restricted attunement on `MagicItemRecord`

## Why it is forced

The current record only supports:

- `requiresAttunement: boolean`

It cannot express who may attune to the item. `Staff of Fire` is not just "requires attunement"; it requires attunement by a closed class set.

## Proposed widening

- `new_variant`: add an attunement restriction field on `MagicItemRecord`, for example `attunementRestriction`
- Suggested payload shape:

```ts
type AttunementRestriction =
  | { readonly kind: "any" }
  | {
      readonly kind: "class_list";
      readonly classes: ReadonlyNonEmptyArray<ClassName>;
    };
```

This keeps the current boolean semantics representable while allowing class-gated magic items like this one to round-trip honestly.

## Evidence

> Staff, Very Rare (Requires Attunement by a Druid, Sorcerer, Warlock, or Wizard)
