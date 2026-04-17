`Wings of Flying` fits the existing `magic_item` top-level kind, and its main payload is closest to `ActivatedAbilityMechanics` with a timed duration plus a `grant_speed` effect.

It is not honestly encodable as `clean` with the current surface because two mechanics are missing from existing surface shapes:

1. Early self-dismiss while active.
Evidence: "The wings last for 1 hour or until you end the effect early as a Magic action."

Current gap:
- `ActivatedAbilityMechanics.duration` can express a timed 1-hour window.
- `DurationEndTrigger` only models automatic event-based endings; it does not model "the bearer may spend a Magic action to end this effect early."

Narrowest fix:
- `surface_widening`: add a duration / lifecycle variant for bearer-triggered early end by activation cost, or a dedicated dismiss subgraph tied to an active effect.

2. Random-hour recharge lockout after the effect ends.
Evidence: "When the wings disappear, you can't use them again for 1d12 hours."

Current gap:
- `RestResetCadence` only supports rest-based reset, dawn reset, or never.
- The lockout starts when the active effect ends, not when the item is first activated, and the lockout duration is randomized (`1d12 hours`).

Narrowest fix:
- `surface_widening`: add an activation-resource reset / cooldown variant for "recharges after effect end" with a dice-based duration.

Omitted rider if the surface is widened later:
- "If you are aloft when the wings disappear, you fall."
- Existing precedents in this package (`fly`, `magic_item_potion_of_flying`) treat this as out-of-core / DM-agenda physics and omit it.
