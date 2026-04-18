`Wand of Fear` is not a clean encode on the current surface.

What fits already:

- `MagicItemRecord` with `mechanics.family = "activation"`
- `condition = { kind = "holding_item" }`
- `activationCost = { kind = "standard_action", action = "magic" }`
- `resource = { kind = "charge_pool", cap = { kind = "fixed", uses = 7 } }`
- `resetCadence = { kind = "dawn", regain = 1d6 + 1 }`
- `destruction = { kind = "last_charge_roll", die = 20, destroyOn = 1 }`
- `Fear` is representable as `grant_spell_access` with:
  - `spellId = "fear"`
  - `mode = charge_cast` costing 3 charges at level 3
  - `dcOverride = { kind = "fixed", dc = 15 }`
  - `areaOverride = { kind = "cone", lengthFeet = 60 }`

Blocker:

- The wand can cast `Command`, but only with the commands `"flee"` or `"grovel"`.
- `grant_spell_access` can currently override DC, area, target restriction, and duration, but it cannot restrict the legal mode/option space of the granted spell.
- Encoding `Command` without that restriction would be false, because it would imply access to the full spell instead of the wand's narrowed version.

Classification: `surface_widening`

Why this is surface widening rather than atom or structural widening:

- The top-level kind and mechanics family already exist and fit honestly.
- No new v4 atom is forced; this is a missing variant/field on the existing spell-grant surface.

Suggested widening:

- Add a new `grant_spell_access` restriction field for bounded spell-option narrowing, e.g. a spell-specific closed restriction such as:
  - `spellOptionRestriction = { kind: "command_words", allowed: ["flee", "grovel"] }`

Evidence from unit text:

> `Command` ("flee" or "grovel" only)
