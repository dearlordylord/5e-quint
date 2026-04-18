`Rod of Alertness` does not fit the current magic-item mechanics surface honestly.

The item has three distinct components:

1. A held-item passive rider:
`While holding the rod, you have Advantage on Wisdom (Perception) checks and on Initiative rolls.`

2. A held-item passive spell-access bundle:
`While holding the rod, you can cast ... Detect Evil and Good, Detect Magic, Detect Poison and Disease, See Invisibility.`

3. A timed planted aura:
`As a Magic action, you can plant the haft end of the rod in the ground... While in that Bright Light, you and your allies gain a +1 bonus to Armor Class and saving throws and can sense the location of any Invisible creature that is also in the Bright Light.`

The first two components fit existing `magic_item` + `passive` / `composite` shapes. The third does not.

Why the aura does not fit:

- It is not a one-shot `activation`. The effect persists for 10 minutes.
- It is not representable as current magic-item `passive`, because it is created by an activation and then applies conditionally within an area.
- `MagicItemComponentMechanics` does not admit an `ongoing_effect` family, only `passive`, `activation`, and `triggered_reaction`.

This forces a structural widening:

- Add a generic non-spell ongoing component for magic items, or
- widen `MagicItemComponentMechanics` to include an `ongoing_effect`-style family.

Secondary pressure, if the family were widened:

- The aura keys off presence in Bright Light and ally membership. Current area attachment shapes do not express `you and your allies in the area` directly.
- `can sense the location of any Invisible creature that is also in the Bright Light` is narrower than the existing `grant_sense` examples and is coupled to the aura area rather than a general self-sense grant.
- `the effect ends ... when a creature takes a Magic action to pull the rod from the ground` suggests an early-end trigger tied to an object interaction with the planted item, which the current non-spell activation surface does not model.

Because the missing family fit is primary, this unit is classified as `structural_widening` rather than forcing a misleading placeholder encoding.
