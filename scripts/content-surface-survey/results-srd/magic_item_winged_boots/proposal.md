# Winged Boots

## Verdict

`surface_widening`

The unit fits the existing top-level shape:

- `MagicItemRecord`
- `mechanics.family = "activation"`
- `resource.kind = "charge_pool"` with cap 4
- `resetCadence.kind = "dawn"` with `1d4` regain
- `activationCost.kind = "action"`
- timed duration `1 hour`
- direct self-targeted `grant_speed` for `fly 30 ft`

That part is straightforward.

## Blocking gap

The current surface cannot represent the expiry rider:

> If you are flying when the duration expires, you descend at a rate of 30 feet per round until you land.

This is not just flavor and it is not the same as the looser Potion of Flying wording. Winged Boots specifies a deterministic descent rate, so dropping it would remove a real mechanic.

## Why this is `surface_widening`

This does not force a new top-level unit kind or mechanics family. The gap is narrower:

- the surface has no place to attach an effect to `Duration` expiry; and
- the authored `EffectAtom` union lacks an expiry-linked fall/descent effect, even though v4 taxonomy already anticipates this space via `fall_on_end`.

So the honest classification is a surface reshape/widening, not a structural change.

## Proposed shape

Add an expiry-linked subgraph along these lines:

- `expire --grants--> fall_on_end` or `expire --grants--> descend_on_end`
- effect parameters should at least carry `rateFeetPerRound`
- the effect should be gated to the attached creature and only matter if it is still airborne when the duration ends

One plausible authored-surface direction:

- widen `Duration.timed` / `Duration.concentration` with an optional `onExpire: EffectAtom`
- add `EffectAtom.fall_on_end` or `EffectAtom.descend_on_end`

For Winged Boots specifically, the payload would need:

- `rateFeetPerRound = 30`
- destination semantics equivalent to “until you land”

## Authoring decision

I did not create `content/magic_item_winged_boots.dhall` or derived artifacts. The current surface can encode the activation that grants flight, but not the mandatory expiry consequence, and a partial trace would be misleading.
