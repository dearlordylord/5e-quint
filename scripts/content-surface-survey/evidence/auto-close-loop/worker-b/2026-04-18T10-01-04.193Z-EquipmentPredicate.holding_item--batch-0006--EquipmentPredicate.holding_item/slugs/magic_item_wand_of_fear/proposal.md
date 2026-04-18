# Wand of Fear

Outcome: `surface_widening`

The item's overall shape fits the current `magic_item` + `activation` surface honestly: charge pool, fixed-DC granted spells, dawn recharge, held-item gate, and last-charge destruction all round-trip.

The remaining gap is spell-specific restriction on a granted spell:

- Missing surface shape: a `grant_spell_access` override that narrows a granted spell's allowed mode / option set.
- Why it is needed: the wand does not grant unrestricted `Command`; it grants only the `"flee"` or `"grovel"` branches.
- Evidence: `Command ("flee" or "grovel" only)`.

Current authored subset:

- Encoded: `Command` at fixed DC 15 for 1 charge.
- Encoded: `Fear` at fixed DC 15, forced to a 60-foot cone, for 3 charges.
- Encoded: 7-charge pool, `1d6 + 1` dawn recharge, last-charge destruction on `1` on `d20`.
- Omitted: the `Command` branch restriction.
