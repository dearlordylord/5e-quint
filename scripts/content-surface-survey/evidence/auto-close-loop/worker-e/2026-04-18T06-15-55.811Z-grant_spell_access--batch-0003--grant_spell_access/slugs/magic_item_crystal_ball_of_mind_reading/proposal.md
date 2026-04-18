## Crystal Ball of Mind Reading

Outcome: `surface_widening`

The unit fits the existing top-level shape as a `magic_item`, likely with `composite` mechanics or a passive grant list:

- `grant_spell_access` for `scrying` with `dcOverride = { kind = "fixed", dc = 17 }`
- `grant_spell_access` for `detect_thoughts` with:
  - `dcOverride = { kind = "fixed", dc = 17 }`
  - `targetRestriction = { kind = "visible_target_within_feet", feet = 30, origin = "spell_sensor" }`

The honest encoding breaks on the final rider:

> "You don't need to concentrate on this Detect Thoughts spell to maintain it during its duration, but it ends if the Scrying spell ends."

Current surface gap:

- `grant_spell_access` can override fixed DC and targeting.
- It cannot override the granted spell's concentration model.
- It cannot express that the granted spell's lifetime is subordinated to another ongoing spell instance.

Why this is `surface_widening`, not `structural_widening`:

- The unit does not force a new `UnitRecord` kind.
- It does not force a new mechanics family.
- The missing concept is a new variant/field on an existing surface shape for granted spells.

Suggested widening:

- Add a `grant_spell_access` override for granted-spell lifecycle, e.g. a bounded `spellLifecycleOverride` shape that can express:
  - concentration suppressed for casts made through this grant
  - ends when a named sibling granted spell ends

I did not author `content/magic_item_crystal_ball_of_mind_reading.dhall` because any current encoding would be misleading: it would either omit the non-concentration/dependent-duration rider or falsely model Detect Thoughts as a normal independent concentration spell.
