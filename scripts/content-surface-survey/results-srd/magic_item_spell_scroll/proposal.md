# Spell Scroll proposal

## Verdict

`structural_widening`

## Why the current surface cannot encode it honestly

`Spell Scroll` is not just a `magic_item` with `grant_spell_access`.

What the current surface can do:

- fixed named spell grants on an item (`grant_spell_access`)
- scalar activation resources (`use_count`, `charge_pool`)
- simple destruction policies tied to pool exhaustion

What `Spell Scroll` requires instead:

- an item that stores one arbitrary embedded spell payload
- activation that delegates to that stored spell's own casting-time and resolution
- suppression of Material components for that delegated cast
- reader-state gates:
  - spell must be on the reader's spell list
  - if over the reader's normal spell level, require an ability check using the reader's spellcasting ability
  - DC is derived from the embedded spell's level
- destruction only after a completed cast, or after the failed overlevel check
- no destruction if the casting is interrupted
- item rarity/save DC/attack bonus derived from the embedded spell level

That is a different top-level mechanics shape from the current fixed-phase `activation` family. Forcing this into `grant_spell_access` would lie in multiple ways:

- it would pretend the item grants a statically known spell
- it would lose the “normal casting time of the embedded spell” rule
- it would lose the contingent reader-capability check
- it would mis-model destruction timing

## Narrowest honest widening

### 1. New subgraph: `stored_spell_scroll_payload`

The item should be able to attach to or store a spell payload record, then release or cast that payload later.

Pressure text:

> "A Spell Scroll bears the words of a single spell..."

> "Casting the spell by reading the scroll requires the spell's normal casting time."

### 2. New mechanics variant: `MagicItemMechanics.embedded_spell_scroll`

This variant would represent a generic scroll item whose embedded spell is item-instance data, not authored as a fixed `spellId` on the item type.

Pressure text:

> "The level of the spell on the scroll determines the spell's saving throw DC and attack bonus, as well as the scroll's rarity..."

### 3. New gated cast variant: `embedded_spell_cast_gate`

This gate must branch on reader eligibility and spell level relative to reader capability.

Pressure text:

> "If the spell is on your spell list, you can read the scroll and cast its spell without Material components. Otherwise, the scroll is unintelligible."

> "If the spell is on your spell list but of a higher level than you can normally cast, you make an ability check using your spellcasting ability... The DC equals 10 plus the spell's level."

## Notes on secondary details

- The “copy into a spellbook” rider is separate from the core use path and would likely need its own noncombat/item-utility branch if this package ever chooses to model it.
- The table-driven save DC and attack bonus are additional evidence that the scroll is parameterized by embedded spell level, not a single authored spell grant.
