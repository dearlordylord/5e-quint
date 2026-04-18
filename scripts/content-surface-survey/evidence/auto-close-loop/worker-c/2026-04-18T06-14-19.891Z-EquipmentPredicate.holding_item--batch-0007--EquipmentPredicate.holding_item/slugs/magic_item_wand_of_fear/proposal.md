## Wand of Fear

Outcome: `surface_widening`

The item's overall chassis fits the existing magic-item surface:

- `magic_item` record
- charge-based activation pattern
- fixed `dcOverride`
- dawn recharge
- last-charge destruction

But the current `grant_spell_access` shape cannot express two item-specific restrictions honestly:

1. Restricted spell option for `Command`

The item grants `Command`, but only with `"flee"` or `"grovel"`.
Current `grant_spell_access` can name the spell and its cast mode, but it cannot narrow the spell's own internal option set.

Evidence:

> *Command* ("flee" or "grovel" only) | 1

Suggested widening:

- `new_variant`: add a spell-override field on `grant_spell_access` for restricting named spell choices, e.g. a closed override payload for spell-specific option narrowing.

2. Granted-spell attachment/range override for `Fear`

The item grants `Fear`, but specifically as `60-foot Cone`.
Current `grant_spell_access.targetRestriction` only supports `self_only` and `visible_target_within_feet`; it cannot override an area's printed shape/size.

Evidence:

> *Fear* (60-foot Cone) | 3

Suggested widening:

- `new_variant`: add a granted-spell shape override on `grant_spell_access` so an item can modify the granted spell's attachment/range/area header without inventing a fake spell id.

Why this is surface widening, not structural or atom widening:

- The magic-item family already exists.
- The relevant mechanics atoms already exist (`grant_spell_access`, `charge`, recharge cadence, destruction).
- What is missing is a more expressive variant of the existing `grant_spell_access` surface shape.
