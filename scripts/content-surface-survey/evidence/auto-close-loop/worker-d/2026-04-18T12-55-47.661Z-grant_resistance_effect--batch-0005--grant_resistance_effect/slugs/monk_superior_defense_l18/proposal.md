`Superior Defense` fits the existing `class_feature` record kind and the `activation` mechanics family, but it does not fit honestly with the current variants.

Why it stops short of authoring:

- The feature is only available in a specific activation window: `At the start of your turn`.
- The feature spends `3 Focus Points` from the monk's shared class pool, not from a feature-owned `use_count` or `charge_pool`.
- The duration has a condition-based early end: `until you have the Incapacitated condition`.

Why this is `surface_widening`, not `structural_widening`:

- The overall shape is still an activated class feature with a timed effect on `self`.
- The missing pieces are variants inside existing surfaces, not a missing top-level family.

Concrete widenings needed:

1. `ActivatedAbilityMechanics.activationWindow = start_of_self_turn`
   - Needed so the content can say the feature is only activatable at turn start.
   - Without this, encoding as a generic free activation would be false.

2. `ActivationResource.external_pool_spend`
   - Needed to reference an existing shared class resource instead of inventing a fake per-feature pool.
   - Sketch:
     - `kind: "external_pool_spend"`
     - `pool: "focus_points"`
     - `amount: 3`
   - This keeps resource provenance honest and avoids redundant state.

3. `DurationEndTrigger.target_has_condition`
   - Needed for `until you have the Incapacitated condition`.
   - Sketch:
     - `kind: "target_has_condition"`
     - `condition: "incapacitated"`

What already fits once those widenings exist:

- Unit kind: `class_feature`
- Mechanics family: `activation`
- Attachment: `self`
- Duration: timed `1 minute`
- The resistance body can be authored with existing atoms by granting resistance to every damage type except `force`:
  - `acid`
  - `bludgeoning`
  - `cold`
  - `fire`
  - `lightning`
  - `necrotic`
  - `piercing`
  - `poison`
  - `psychic`
  - `radiant`
  - `slashing`
  - `thunder`

Why no `content/monk_superior_defense_l18.dhall` was written:

- Any currently valid encoding would have to lie about at least one of:
  - when the feature can be activated,
  - what resource it spends,
  - when the effect ends.
