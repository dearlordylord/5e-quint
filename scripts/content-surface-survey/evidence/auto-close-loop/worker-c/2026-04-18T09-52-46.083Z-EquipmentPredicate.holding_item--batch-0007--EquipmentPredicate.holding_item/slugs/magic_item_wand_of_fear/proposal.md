## Wand of Fear

This item fits the existing `magic_item` + `activation` family in shape:

- held-item activation
- shared `charge_pool`
- dawn recharge
- fixed-DC spellcasting
- last-charge destruction roll

The existing surface already covers most of the item honestly:

- `ActivationResource.charge_pool` for 7 charges
- `RestResetCadence.dawn` with `1d6 + 1`
- `grant_spell_access.dcOverride = { kind = "fixed", dc = 15 }`
- `ItemDestructionPolicy.last_charge_roll`
- `grant_spell_access.areaOverride` for `Fear (60-foot Cone)`

## Required widening

1. New `grant_spell_access` variant field for spell-option restriction

- Why: the item does not grant unrestricted `Command`; it grants only a constrained use of that spell.
- Pressure text: `*Command* ("flee" or "grovel" only)`
- Why existing surface shapes do not work:
  - plain `grant_spell_access` would falsely imply access to all normal `Command` options
  - `targetRestriction` is about who/where the spell can target, not which command words are legal
  - `dcOverride` and `areaOverride` do not constrain spell payload choices

Suggested direction:

```ts
readonly spellOptionRestriction?:
  | {
      readonly kind: "command_word_subset";
      readonly allowed: ReadonlyNonEmptyArray<string>;
    };
```

This keeps the widening narrow and attached to the grant itself, which is where the item-specific cast restriction lives.

## Why I did not author content

Authoring a `.dhall` file would require one of two dishonest choices:

- omit the `Command` row entirely, which under-represents the item
- encode unrestricted `Command`, which overstates the wand's power

Because the missing piece is a variant on an existing surface type, this is `surface_widening`, not `structural_widening`.
