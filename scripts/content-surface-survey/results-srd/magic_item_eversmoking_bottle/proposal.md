## Eversmoking Bottle

Outcome: `surface_widening`

### Why it does not fit honestly

The closest existing top-level shape is `MagicItemRecord` with `mechanics.family = "activation"`, but the current activation surface cannot express the item's actual state machine:

- reusable toggle, not a consumable activation:
  `As a Magic action, you can open or close this bottle.`
- indefinite open-state persistence:
  the smoke persists while the bottle remains open, not for a fixed timed or concentration duration.
- item-centered area anchor:
  `forming a cloud that fills a 60-foot Emanation originating from the bottle`
- elapsed-time area growth:
  `Each minute the bottle remains open, the size of the Emanation increases by 10 feet until it reaches its maximum size of 120 feet.`
- close-state transition into a lingering detached cloud:
  `Closing the bottle causes the cloud to become fixed in place until it disperses after 10 minutes.`

Any authored `content/magic_item_eversmoking_bottle.dhall` under the current surface would have to lie about one or more of:

- the lack of charges / use-count limits
- the origin of the area
- the timed radius growth
- the transition from bottle-following emanation to fixed lingering cloud

That would produce a misleading trace, so no content artifact was authored.

### Proposed widenings

1. `resource-less_magic_item_activation` (`new_variant`)

The activation family should admit reusable item activations with no `use_count` or `charge_pool`.

Evidence:
`As a Magic action, you can open or close this bottle.`

2. `manual_toggle_duration_for_item_effects` (`new_variant`)

The duration grammar needs an item-owned active state that persists until the user toggles it off, rather than only instantaneous, timed, concentration, or permanent spell-like windows.

Evidence:
`Each minute the bottle remains open...`

3. `area_origin_on_item_object` (`new_variant`)

Area attachments need an origin anchored to the activating item/object.

Evidence:
`...a 60-foot Emanation originating from the bottle.`

4. `expanding_area_then_lingering_fixed_cloud` (`new_subgraph`)

This item needs a stateful area lifecycle:

- open: emanation from bottle
- each minute: radius +10 feet, capped at 120
- close: cloud stops following the bottle and becomes fixed
- fixed cloud expires after 10 minutes

That is more than a single missing enum case; it is a composed transition pattern.

Evidence:
`Closing the bottle causes the cloud to become fixed in place until it disperses after 10 minutes.`

### Non-blocking notes

- Per existing package precedent in `content/cloudkill.dhall`, `Heavily Obscured` is treated as caller-owned visibility rather than a core effect atom.
- `A strong wind ... disperses the cloud after 1 minute` is similarly caller-resolved environment/geometry pressure, not the primary reason this item fails to fit.
