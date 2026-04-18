`Wand of Fear` fits the existing `magic_item` + `activation` + `charge_pool` family for its chassis, but it does not fit the current `grant_spell_access` surface honestly.

What fits already:

- `MagicItemRecord` with `rarity = "rare"` and `requiresAttunement = True`
- `ActivatedAbilityMechanics` with `activationCost = { kind = "action" }`
- `condition = { kind = "holding_item" }`
- `resource = { kind = "charge_pool", cap = { kind = "fixed", uses = 7 } }`
- `resetCadence = { kind = "dawn", regain = Some 1d6 + 1 }`
- `destruction = { kind = "last_charge_roll", die = 20, destroyOn = 1 }`
- fixed item spell save DC via `grant_spell_access.dcOverride = { kind = "fixed", dc = 15 }`

Why it stops:

1. The item grants `Command` with a narrowed option set: `"flee" or "grovel" only`.
   The current surface can grant a spell and override its DC, but it cannot constrain a granted spell's internal cast-time mode/option vocabulary.
2. The item grants `Fear` as `Fear (60-foot Cone)`.
   The authored `fear` spell in this package is a `30-foot Cone`, and the current surface has no way to override a granted spell's area shape/measurement at the grant site.

These are both surface gaps, not new taxonomy atoms. The underlying mechanics remain "grant access to a spell with item-defined casting parameters".

Suggested widening:

- Add an optional `spellOverride` field on `grant_spell_access` for item-scoped overrides of the referenced spell's printed parameters.
- The first pressured override shapes are:
  - restricted cast-time mode/options for a named spell
  - area-shape override for a granted spell

Concrete pressure from this unit:

- `Command ("flee" or "grovel" only)`
- `Fear (60-foot Cone)`
