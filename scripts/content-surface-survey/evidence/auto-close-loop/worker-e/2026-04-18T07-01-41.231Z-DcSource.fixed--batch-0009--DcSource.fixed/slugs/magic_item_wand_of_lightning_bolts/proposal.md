## Wand of Lightning Bolts

The item's cast/recharge/destruction mechanics fit the current `magic_item` + `activation` surface cleanly:

- `condition = { kind = "holding_item" }`
- `resource = { kind = "charge_pool", cap = { kind = "fixed", uses = 7 } }`
- `grant_spell_access` with `mode = charge_cast` for `lightning_bolt` at levels 3-5
- `dcOverride = { kind = "fixed", dc = 15 }`
- `resetCadence = { kind = "dawn", regain = 1d6 + 1 }`
- `destruction = { kind = "last_charge_roll", die = 20, destroyOn = 1 }`

## Surface gap

The record cannot express the attunement eligibility clause.

- Missing shape: a `MagicItemRecord` attunement restriction / eligibility field
- Classification: `surface_widening`

Suggested direction:

- Add an optional record-level field for attunement eligibility, such as a closed predicate that can express cases like `by a spellcaster` and class lists (`by a Bard, Cleric, or Druid`).

Evidence:

> *Wand, Rare (Requires Attunement by a Spellcaster)*

Without that field, the item can only be authored as `requiresAttunement = true`, which loses who is allowed to attune.
