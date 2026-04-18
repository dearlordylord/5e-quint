## Crystal Ball of Mind Reading

This item fits the existing `magic_item` kind and `passive` mechanics family in broad shape:

- attunement-gated magic item
- passive grant of spell access while the item is being used
- fixed save DC on item-granted spells
- remote targeting from an existing spell sensor

The blocker is narrower than a new family or new atom: the current `grant_spell_access` shape cannot express the modified lifecycle on the granted `Detect Thoughts`.

### Required widening

1. New `grant_spell_access` duration/lifecycle override

- Why: the item changes how the granted spell is maintained and what ends it.
- Pressure text:
  - "You don't need to concentrate on this Detect Thoughts spell to maintain it during its duration"
  - "but it ends if the Scrying spell ends."
- Why existing surface shapes do not work:
  - `grant_spell_access` can already express the spell id, fixed DC, and target restriction from the spell sensor.
  - It cannot override the granted spell's normal duration semantics.
  - It cannot link one granted spell's lifetime to another ongoing spell cast through the same item.

Suggested direction:

```ts
type GrantedSpellDurationOverride =
  | { readonly kind: "ignore_concentration_use_spell_duration" }
  | {
      readonly kind: "ignore_concentration_until_linked_spell_ends";
      readonly spellId: string;
    };
```

or equivalently as two optional fields on `grant_spell_access`:

```ts
readonly concentrationOverride?: "not_required";
readonly endsWhenGrantedSpellEnds?: string;
```

The important requirement is that the override scope only the casts made through this item grant, not the base spell record globally.

### Secondary pressure

The activation gate is phrased as "while touching this crystal orb". The current `EquipmentPredicate` vocabulary has `holding_item` and `wearing_item`, but not a generic touch/contact gate. For this specific item, `holding_item` is probably close operationally, so I am not classifying this as the primary blocker.
