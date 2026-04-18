`Wand of Fear` mostly fits the existing `magic_item` `activation` family: charge pool, held-item gate, fixed DC override, area override for the granted `Fear`, dawn recharge, and last-charge destruction are all already supported.

The remaining gap is the wand's restricted `Command` cast:

> `Command ("flee" or "grovel" only)`

Current `grant_spell_access` can override a granted spell's DC, area, target restriction, and duration, but it cannot narrow a granted spell to only a subset of its allowed cast-time options or authored modes. Encoding unrestricted `Command` would overstate the item's capability, so the authored file omits that spell entirely and models only the `Fear` grant.

Recommended widening: add a new grant-side restriction on `grant_spell_access` for narrowing a granted spell's option space, for example a field shaped like `grantedSpellOptionRestriction` / `GrantedSpellOptionRestriction`. This is a `surface_widening`, not a new atom: the underlying mechanics are still `grant_spell_access`; the surface just needs one more override kind parallel to `dcOverride`, `areaOverride`, and `targetRestriction`.
