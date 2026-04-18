`Cloak of Arachnida` mostly fits the existing magic-item surface as a composite item:

- passive part:
  - `grant_resistance` for Poison Resistance
  - `grant_speed` with linked walk speed for Spider Climb
  - `ignore_web_restrictions` for Spider Walk
- activated part:
  - magic-item `activation`
  - `use_count` = 1
  - `resetCadence.dawn`
  - `grant_spell_access` for `web`
  - `dcOverride = fixed 13`

The blocking gap is the final rider on the granted spell:

> "The web created by the spell fills twice its normal area."

Current surface status:

- `grant_spell_access.areaOverride` exists, but it only accepts an absolute `AreaShapeSpec`.
- The authored `Web` spell is a `20-foot Cube`.
- "Twice its normal area" is relative to the granted spell's printed area, not a new absolute cube side length.

Why this is a widening:

- Encoding this as a `40-foot Cube` would be false. Doubling area is not the same operation as doubling each linear dimension.
- Omitting the rider would make the activation trace misleading, because the granted spell would no longer match the item text.

Proposed surface widening:

- Add a new variant under the existing granted-spell area override surface, something like a relative area multiplier:
  - `grant_spell_access.areaOverride = { kind: "scale_from_spell_area", factor: 2 }`
- Alternatively, add a more generic relative-area modifier shape on `AreaShapeSpec` or a sibling override field that explicitly means "multiply the granted spell's authored area by N".

Classification:

- `surface_widening`

Reason:

- No new top-level family is needed.
- No new v4 atom is forced.
- The missing piece is a new variant of an existing surface hook for granted-spell area overrides.
