## Cloak of Arachnida

Outcome: `surface_widening`

The unit fits the existing `magic_item` record and `composite` mechanics family honestly:

- passive worn benefits:
  - `grant_resistance` to Poison
  - `grant_speed` climb equal to walk speed
  - `ignore_web_restrictions`
- activated once-per-dawn item spellcast:
  - `grant_spell_access` for `web`
  - fixed `dcOverride` 13

The remaining gap is the granted-spell rider:

> "The web created by the spell fills twice its normal area."

`grant_spell_access.areaOverride` can only replace the spell's area with a concrete `AreaShapeSpec`. It cannot express a relative modifier against the granted spell's own authored area, such as "twice its normal area". Picking a concrete larger cube here would be dishonest because the source text does not specify a new fixed geometry, only a multiplier.

Proposed widening:

- `new_variant`: relative granted-spell area override
  - Sketch: extend `grant_spell_access.areaOverride` to admit a relative form such as `{ kind: "scale_relative_to_spell", multiplier: 2 }`
  - Why: this preserves provenance on the underlying spell (`web`) while honestly expressing item-specific area inflation without restating or guessing a fixed replacement footprint.
