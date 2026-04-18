## Wand of Fear

Outcome: `surface_widening`

The unit fits the existing top-level shape honestly as a `magic_item` with `activation` mechanics:

- held-item activation gate via `condition = { kind = "holding_item" }`
- `charge_pool` resource with cap 7
- `dawn` recharge with `1d6 + 1`
- `grant_spell_access` for the spell casts
- fixed item save DC 15 via `dcOverride`
- `last_charge_roll` destruction

I did **not** author `content/magic_item_wand_of_fear.dhall` because the current `grant_spell_access` surface cannot represent two restrictions that are part of the item's core deterministic payload.

### Missing surface shapes

1. Restricted spell-option payload on granted `Command`

The wand does not grant unrestricted `command`; it grants only a narrowed command vocabulary:

> `Command` ("flee" or "grovel" only)

Current `grant_spell_access` can name the spell, casting mode, DC override, and target restriction, but it cannot restrict spell-internal cast-time options for a granted spell. Encoding plain `spellId = "command"` would be knowingly false.

Suggested widening:

- add a `grant_spell_access` option-restriction field for narrowing an existing spell's cast-time choices
- example shape: a spell-specific override or a generic closed-choice restriction attached to the grant

2. Granted-spell area/header override on `Fear`

The wand's `Fear` entry is not the ordinary authored spell header:

> `Fear` (60-foot Cone)

Current `grant_spell_access` cannot override a granted spell's range/area header. The existing surface only supports `dcOverride` and target restriction. Encoding plain `spellId = "fear"` would inherit the base authored spell instead of the item's 60-foot-cone version.

Suggested widening:

- add a grant-level spell-parameter override for fixed header changes on a granted spell
- minimally, this needs to cover area/range overrides without redefining the entire spell record

### Why this is `surface_widening`, not `structural_widening`

The unit still belongs in the existing `MagicItemRecord` + `ActivatedAbilityMechanics` family. No new top-level family is needed; the surface is just missing variants/fields on the existing granted-spell shape.
