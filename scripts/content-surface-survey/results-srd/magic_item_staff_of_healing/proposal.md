# Staff of Healing

## Verdict

`Staff of Healing` fits the existing `magic_item` + `activation` family for its core mechanics:

- charge pool
- dawn recharge
- charge-based spell casting
- last-charge destruction roll

The remaining gap is narrower: the attunement clause is not just boolean. The current surface can say `requiresAttunement = true`, but it cannot represent `Requires Attunement by a Bard, Cleric, or Druid`.

## Required widening

- Kind: `new_variant`
- Surface: `MagicItemRecord.requiresAttunement`
- Proposal: replace the bare boolean with a discriminated attunement requirement shape, for example:

```ts
type AttunementRequirement =
  | { readonly kind: "none" }
  | { readonly kind: "any" }
  | {
      readonly kind: "class_list";
      readonly classes: ReadonlyNonEmptyArray<ClassName>;
    };
```

or an equivalent field on `MagicItemRecord`.

## Why this is a surface widening, not an atom widening

The missing concept is eligibility metadata on an existing top-level record, not a new v4 atom. The cast/recharge/destruction behavior already traces through existing atoms:

- `charge_pool`
- `grant_spell_access`
- `duration_window`
- `item_destruction`

## Evidence

> Staff, Rare (Requires Attunement by a Bard, Cleric, or Druid)

That restriction changes who can legally use the item, and the current `boolean` field cannot encode it.
