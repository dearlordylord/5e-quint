# Cloak of Arachnida

Outcome: `atom_widening`

The unit mostly fits the existing `magic_item` surface as `composite`:

- passive worn Poison resistance;
- passive worn Climb Speed equal to walk Speed;
- activated worn `Web` cast with fixed DC 13;
- `grant_spell_access.areaOverride` already covers the doubled-area rider honestly.

The remaining blocker is the passive **Spider Walk** text:

> "You can't be caught in webs of any sort and can move through webs as if they were Difficult Terrain."

That rider is not representable with an existing surface variant or a v4 atom:

- `grant_condition_immunity` would overgrant, because the cloak does not make the wearer immune to all sources of `restrained` or similar conditions.
- existing movement atoms (`grant_speed`, `modify_speed`, `set_speed`, `set_speed_ratio`) do not express a terrain- or hazard-specific bypass.
- the current surface has no atom for web-specific entrapment immunity or web-specific movement-cost override.

Proposed widening:

1. New atom: `ignore_hindering_surface`
   - Scope: named ongoing surface / hazard kinds such as `web`
   - Semantics: the bearer ignores that surface's movement restriction and entrapment effect.
   - Evidence: the cloak says the wearer "can't be caught in webs of any sort and can move through webs as if they were Difficult Terrain."

Secondary note:

- The once-per-dawn `Web` cast fits via the existing activation shell (`use_count` + `dawn` reset) wrapped around a `grant_spell_access` direct phase. The tracer will label the inner access mode as `at_will`; the actual once-per-dawn cadence is enforced by the enclosing activation resource, not by a new spell-access mode.
