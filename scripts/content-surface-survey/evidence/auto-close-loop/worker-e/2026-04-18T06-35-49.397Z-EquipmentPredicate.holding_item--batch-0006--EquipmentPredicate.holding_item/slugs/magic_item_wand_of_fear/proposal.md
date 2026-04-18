# Wand of Fear

## Verdict

`surface_widening`

The existing `magic_item` + `activation` + `charge_pool` family is the right top-level fit for this unit:

- attuned magic item
- fixed-size charge pool (`7`)
- dawn recharge (`1d6 + 1`)
- last-charge destruction roll (`d20`, destroyed on `1`)
- granted spell access with fixed save DC (`15`)

I did **not** author `content/magic_item_wand_of_fear.dhall` because the current granted-spell surface cannot encode the item's spell-specific overrides honestly.

## Blocking Gap

The current `grant_spell_access` atom can express:

- `spellId`
- cast mode (`charge_cast`, etc.)
- `dcOverride`
- `targetRestriction`

It cannot express **payload overrides on the granted spell itself**.

`Wand of Fear` needs exactly that:

- `Command` is not granted in its normal form; the item only allows the `"flee"` or `"grovel"` commands.
- `Fear` is not cast in its normal authored form; the item casts `Fear` as a **60-foot Cone**, while the current authored `fear` spell is a **30-foot Cone**.

Encoding either spell without those overrides would produce a false trace.

## Proposed Widening

Add a new `grant_spell_access` variant or subrecord for **spell-parameter overrides**, for example a shape in the spirit of:

```ts
grant_spell_access: {
  spellId: string
  mode: SpellAccessMode
  dcOverride?: DcSource
  targetRestriction?: GrantedSpellTargetRestriction
  spellParameterOverride?: ...
}
```

That override needs to cover at least:

- restricted cast-time option sets for a granted spell
- overridden area/range headers for a granted spell

## Evidence

From the unit text:

> `Command` ("flee" or "grovel" only)

> `Fear` (60-foot Cone)
