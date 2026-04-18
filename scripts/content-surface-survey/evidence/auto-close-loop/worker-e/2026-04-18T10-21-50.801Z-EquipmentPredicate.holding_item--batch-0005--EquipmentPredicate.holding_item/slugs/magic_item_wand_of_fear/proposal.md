## Wand of Fear

Outcome: `surface_widening`

The unit fits the existing `magic_item` kind and the existing magic-item `activation` family:

- `condition = holding_item`
- `activationCost = action`
- `resource = charge_pool` with 7 charges
- `resetCadence = dawn` with `1d6 + 1`
- `destruction = last_charge_roll`
- spell grants via `grant_spell_access`

`Fear` itself fits honestly because `grant_spell_access` already supports:

- `dcOverride = { kind = "fixed", dc = 15 }`
- `areaOverride = { kind = "cone", lengthFeet = 60 }`

The blocker is the first table row:

> *Command* ("flee" or "grovel" only)

Current `grant_spell_access` can grant the named spell and can override DC, area, targeting, and duration, but it cannot restrict a granted spell to only a closed subset of that spell's internal cast-time options. Encoding this as plain `spellId = "command"` would be dishonest because it would falsely grant all valid `Command` options, not only `flee` and `grovel`.

### Proposed widening

Add a new variant on `grant_spell_access` for spell-specific option restrictions, for example a closed override such as:

- `spellOptionRestriction`
  - command-specific shape: `{ kind = "command_word_subset", options = ["flee", "grovel"] }`

This is a surface widening, not an atom widening:

- the top-level family already exists;
- the underlying mechanic is still `grant_spell_access`;
- no new v4 atom is forced.
