## Rod of Alertness

Outcome: `structural_widening`

`Rod of Alertness` does not fit the current surface honestly as a full unit.

What fits today:

- `Alertness` fits an attunement-gated `magic_item` passive part with `condition = holding_item` and two `modify_roll_advantage` grants:
  - Advantage on `initiative`
  - Advantage on Wisdom (`perception`) ability checks
- `Spells` fits a passive held-item part with four `grant_spell_access` grants:
  - `detect_evil_and_good`
  - `detect_magic`
  - `detect_poison_and_disease`
  - `see_invisibility`

What does not fit honestly:

- `Protective Aura` is not a one-shot self effect. It is a planted, location-anchored, timed aura emitted by the rod after a Magic action.
- Current `MagicItemComponentMechanics` has no magic-item analogue of spell `ongoing_effect` or location-anchored persistence. `activation` can carry a duration, but its tracer context hardcodes range as `self`, so an area authored there would be source-centered rather than anchored to the planted rod.
- The aura also has a deterministic dismissal clause that the current duration / lifecycle surface cannot express for magic items:
  - "the effect ends ... when a creature takes a Magic action to pull the rod from the ground"
- The light emission itself is mechanical and not representable:
  - "the rod's head sheds Bright Light in a 60-foot radius and Dim Light for an additional 60 feet"
- The invisible-creature rider is also missing from the atom vocabulary:
  - "can sense the location of any Invisible creature that is also in the Bright Light"
  - Existing `grant_sense` is a personal sense grant like Darkvision / Truesight, not an area-limited "reveal invisible creature locations in this lit zone" effect.

Recommended widenings:

1. New subgraph / family for magic-item anchored ongoing effects.
   - Needed to model: activate item, plant it at a location, persist an aura anchored to that planted item/location for a duration, and dismiss it via a later action.
   - Evidence: "As a Magic action, you can plant the haft end of the rod in the ground..."

2. New lifecycle / duration-end variant for item dismissal by later action.
   - Needed to model: a creature can spend a Magic action to end the aura by pulling up the rod.
   - Evidence: "the effect ends ... when a creature takes a Magic action to pull the rod from the ground"

3. New effect atom for emitted light geometry, or another explicit surface for bright/dim light.
   - Needed to model: bright and dim light radii.
   - Evidence: "sheds Bright Light in a 60-foot radius and Dim Light for an additional 60 feet"

4. New atom for area-limited invisible-creature location sensing.
   - Needed to model: creatures in the aura can sense invisible creatures in the bright-light zone without granting general truesight.
   - Evidence: "can sense the location of any Invisible creature that is also in the Bright Light"

Why this is `structural_widening`, not just `surface_widening`:

- The unit already has a valid top-level `magic_item` kind and can use `composite`.
- The failure is that one major item property requires a missing mechanics family / subgraph for magic-item anchored ongoing auras. A new field on an existing atom is not sufficient by itself.
