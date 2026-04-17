## Wand of Polymorph

`Wand of Polymorph` mostly fits the existing `magic_item` + `activation` family:

- charge pool: 7 charges
- activation cost: action while holding the wand
- spell grant: cast `polymorph` by spending 1 charge
- recharge cadence: `1d6 + 1` daily at dawn
- destruction policy: last-charge `d20`, destroyed on `1`

I did **not** author a placeholder content file because one rule is not honestly representable in the current surface:

### Required surface widening

`grant_spell_access` has no way to override the spell's save DC with an item-fixed DC.

- Current shape records only `spellId` and `mode`.
- `Wand of Polymorph` says the cast is `Polymorph (save DC 15) from it`.
- Encoding this as plain `grant_spell_access { spellId = "polymorph", ... }` would silently fall back to normal spell resolution semantics and lose the fixed DC, which is a material mechanic.

Suggested widening:

- Add a fixed spell-resolution override on `grant_spell_access` or its mode, e.g. an optional item-cast rider carrying `saveDc`.

Evidence:

> "you can expend 1 charge to cast *Polymorph* (save DC 15) from it."

### Secondary surface gap

`MagicItemRecord.requiresAttunement` is only a boolean, so it cannot encode the attunement qualifier:

> "Requires Attunement by a Spellcaster"

That gap is secondary here; the fixed save DC is the blocking issue for honest authoring.
