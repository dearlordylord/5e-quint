`Rod of Alertness` does not fit the current magic-item families honestly.

The held parts fit:
- `Alertness` matches `PassiveMechanics` with `condition = { kind = "holding_item" }` plus two `modify_roll_advantage` grants.
- `Spells` matches held spell access via `grant_spell_access`.

The blocker is `Protective Aura`.

Why this is a structural widening:
- The current `MagicItemComponentMechanics` union is only `PassiveMechanics | ActivatedAbilityMechanics`.
- `ActivatedAbilityMechanics` can spend a cost, consume a resource, and run one-shot `phases`.
- The aura is not one-shot. It is a planted, persistent, location-anchored field that lasts for 10 minutes, can end early when the rod is removed, and continuously affects creatures in the bright-light area.
- Encoding that as a direct phase with an `area` attachment would be false: that would look like an instantaneous area application, not an ongoing aura that keeps applying while creatures are in the light.

Pressure from the text:
- "As a Magic action, you can plant the haft end of the rod in the ground"
- "While in that Bright Light, you and your allies gain a +1 bonus to Armor Class and saving throws"
- "The rod's head stops glowing and the effect ends after 10 minutes or when a creature takes a Magic action to pull the rod from the ground"

Needed widening:
- Add a non-spell persistent aura subgraph for magic items, or widen magic-item components so a non-spell analogue of `ongoing_effect` is expressible.
- Add a non-spell location/object anchor for activated effects, since the aura is centered on the planted rod rather than the wielder.
- Add an early-end/removal hook tied to the anchor being pulled from the ground.

Secondary gap:
- "can sense the location of any Invisible creature that is also in the Bright Light" is narrower than the existing broad `grant_sense` patterns. Current senses do not express area-scoped invisible-location sensing conditioned on both creatures being inside the aura.

Because of that structural blocker, no `content/magic_item_rod_of_alertness.dhall` was authored.
