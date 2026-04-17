`Sun Blade` does not fit the current authored surface honestly, so no `content/magic_item_sun_blade.dhall` was written.

Why it fails:

- The item is not purely `passive`: its core state is whether the radiant blade is currently manifested.
- It is not an honest `activation` either: the current activation family requires a resource + reset cadence, but the blade manifest/dismiss toggle and light-radius adjustment are repeatable, no-depletion actions.
- The existing `MagicItemMechanics = PassiveMechanics | ActivatedAbilityMechanics` union cannot express one item that both:
  - has repeatable state-changing activations; and
  - grants passive weapon modifications only while that state is active.

Forced widenings:

1. `new_subgraph`: `manifested_item_mode`
   - Justification: the item has a persistent on/off state that gates its mechanical grants.
   - Evidence: "While grasping the hilt, you can take a Bonus Action to cause a blade of pure radiance to spring into existence or make the blade disappear. While the blade exists, this magic weapon functions as a Longsword with the Finesse property."

2. `new_variant`: composable magic-item mechanics (`passive` + repeatable activation without resource)
   - Justification: current magic items must be either passive or resource-spending activation, but `Sun Blade` is both.
   - Evidence: "While the blade persists, you can take a Magic action to expand or reduce its radius..."

3. `new_atom`: `emit_light`
   - Justification: the item deterministically emits Bright Light / Dim Light, and the light is explicitly sunlight with adjustable radii.
   - Evidence: "The sword's luminous blade emits Bright Light in a 15-foot radius and Dim Light for an additional 15 feet. The light is sunlight."

4. `new_atom`: `weapon_on_hit_bonus_damage_vs_creature_type`
   - Justification: the item adds conditional extra damage only when this weapon hits a target of a named creature type.
   - Evidence: "When you hit an Undead with it, that target takes an extra 1d8 Radiant damage."

Additional surface gaps exposed by the same unit:

- weapon damage-roll bonus scoped to one weapon ("+2 bonus to ... damage rolls made with this weapon")
- weapon damage-type replacement ("deals Radiant damage instead of Slashing damage")
- weapon profile override / granted property ("functions as a Longsword with the Finesse property")
- proficiency grant keyed off weapon categories ("If you are proficient with Longswords or Shortswords, you are proficient with the Sun Blade")

Those are real gaps, but the structural family mismatch above is already sufficient to block honest authoring.
