## Robe of the Archmagi

Outcome: `surface_widening`

The unit fits the existing `magic_item` kind and `composite` passive-mechanics family honestly.

Encoded subset:

- unarmored worn AC formula: base AC `15 + Dex mod`
- worn `+2` spell save DC
- worn `+2` spell attack rolls

Omitted rider:

- **Magic Resistance.** "You have Advantage on saving throws against spells and other magical effects."

Why this is a surface widening, not an atom widening:

- The underlying mechanic is still existing v4 `modify_roll_advantage`.
- The missing piece is a way to narrow saving-throw advantage by the **source/cause** of the save rather than by save ability.
- Current surface support only narrows saving throws by `saveAbilityFilter`, which would be false here because the robe applies to any save ability as long as the save is caused by a spell or other magical effect.

Suggested widening:

- Add a new `modify_roll_advantage` field for saving-throw cause/source, such as a `saveSourceFilter`.
- Minimum pressure case for this unit: a value representing `spells_and_magical_effects`.

Evidence:

> "You have Advantage on saving throws against spells and other magical effects."

Notes:

- The authored subset typechecked and traced cleanly.
- The tracer renders `modify_ac_set_base` under the emitted atom kind `modify_ac`, which is consistent with the current tracer implementation.
