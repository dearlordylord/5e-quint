## Rod of Alertness

Outcome: `surface_widening`

The item's held benefits fit the current `magic_item` + `passive` surface:

- Advantage on Initiative rolls.
- Advantage on Wisdom (Perception) checks.
- At-will `grant_spell_access` for `detect_evil_and_good`, `detect_magic`, `detect_poison_and_disease`, and `see_invisibility` while holding the rod.

The blocker is **Protective Aura**.

### Why the current surface is insufficient

`ActivatedAbilityMechanics` can model a timed effect, but the existing attachment grammar cannot honestly express a **stationary aura anchored to the planted rod**:

- The rod is planted in the ground.
- The bright-light area persists at that planted location.
- The effect ends when a creature later takes a Magic action to pull the rod free.

Current `Attachment` / `AreaOrigin` options only support:

- `self`
- `target`
- `area` from `self`, `point_within_range`, or `on_primary_target`

None of those mean "persistent area centered on the activated item's planted location." Modeling the aura as centered on the wielder would be false once the wielder moves away from the planted rod.

### Additional surface pressure inside the aura

The aura also says:

> "While in that Bright Light, you and your allies gain a +1 bonus to Armor Class and saving throws and can sense the location of any Invisible creature that is also in the Bright Light."

The +1 AC / saves portion would fit once the stationary aura can be attached honestly.

The invisible-creature clause also pressures the current `grant_sense` surface. Existing `grant_sense` only carries:

- `sense`
- `rangeFeet`

This rider is narrower:

- only while inside the aura's Bright Light
- only for creatures with the Invisible condition
- only for such creatures that are also inside that Bright Light

That looks like a new variant/qualifier on the existing sense surface, not a brand-new top-level atom.

### Proposed widenings

1. `Attachment` / `AreaOrigin` widening for planted-item anchored areas.
   - Example shape: a non-spell persistent area whose center is the activated item's planted location.
   - This would let timed item auras stay where the item was planted instead of following the bearer.

2. `DurationEndTrigger` or activation-lifecycle widening for manual pickup termination.
   - Example shape: "ends when a creature takes a Magic action to remove the planted item."

3. `grant_sense` qualifier widening for condition- and area-scoped detection.
   - Example shape: sense location of creatures matching a condition filter within the attached aura.
