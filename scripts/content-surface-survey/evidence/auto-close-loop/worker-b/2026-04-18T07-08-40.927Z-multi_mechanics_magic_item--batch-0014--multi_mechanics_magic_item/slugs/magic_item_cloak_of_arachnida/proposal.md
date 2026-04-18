`Cloak of Arachnida` fits the existing `magic_item` top-level kind and `composite` mechanics family, but it does not fit cleanly.

Authored subset:
- `Poison Resistance` as `grant_resistance`
- `Spider Climb` as `grant_speed` with `feet = walk_speed`
- `Web` as a once-per-dawn activation with fixed `dcOverride = 13`

Omitted mechanics:
- `Spider Walk`: "You can't be caught in webs of any sort and can move through webs as if they were Difficult Terrain."
- `Web` rider: "The web created by the spell fills twice its normal area."

Required widenings:

1. `new_atom`: `ignore_web_entrapment`
Evidence: "You can't be caught in webs of any sort"
Why: this is not honest as blanket `grant_condition_immunity` because the immunity is scoped to web-caused capture, not all sources of `restrained` or similar movement-locking effects.

2. `new_atom`: `ignore_specific_terrain_cost`
Evidence: "can move through webs as if they were Difficult Terrain"
Why: the surface has no deterministic way to express hazard- or terrain-specific movement-cost reductions. This is not DM agenda; it is a reusable movement rule.

3. `new_variant`: `grant_spell_access.areaOverride = { kind: "relative_area_multiplier", factor: 2 }`
Evidence: "The web created by the spell fills twice its normal area."
Why: existing `areaOverride?: AreaShapeSpec` only supports absolute replacement geometry. That would force a guessed concrete size, which is less honest than preserving the printed relative modifier.

Notes:
- I left the unsupported mechanics out of the authored Dhall on purpose rather than encoding them falsely.
- The once-per-dawn reset is authored as an explicit `1d1` refill on a 1-use counter so the current tracer can render it; mechanically this is equivalent to "regain the use at dawn."
