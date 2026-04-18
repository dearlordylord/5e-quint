## Quarterstaff of the Acrobat

The current `magic_item` surface can represent the base `+2` weapon bonus, but it cannot represent this item honestly as a whole.

### Why the current surface is insufficient

1. The item's core procedure is a no-limit form toggle.
   The weapon can be changed between `quarterstaff`, `10-foot pole`, and `6-inch rod` as a Bonus Action, with no use-count or recharge cadence. The current non-spell `activation` family requires a `resource` and `resetCadence`, so an unlimited item activation has no honest encoding shape.

2. Multiple riders depend on the weapon's current form.
   `Acrobatic Assist`, `Attack Deflection`, and `Ranged Weapon` all apply only in specific forms. The current `EquipmentPredicate` can say `holding_item`, but it cannot say "holding this item while it is in quarterstaff form" or "holding this item while it is in quarterstaff or 10-foot pole form".

3. `Attack Deflection` is scoped to the triggering attack only.
   The current `modify_ac` atom is a plain AC modifier. It does not carry a reaction-scoped "against the triggering attack only" boundary for non-spell triggered reactions.

### Secondary pressure

- The dim-light rider adds atom pressure for a reusable light/illumination effect.
- The `Ranged Weapon` rider adds pressure for weapon-property mutation (`Thrown`, 30/120 range) and for the "flies back to your hand" return behavior after a ranged attack.

### Widenings forced by this unit

1. `ActivatedAbilityMechanics` / `TriggeredReactionAbilityMechanics` need an unbounded activation shape.
   Suggested direction: make `resource`/`resetCadence` optional, or add an explicit `activation resource = none` variant.

2. `EquipmentPredicate` needs item-state narrowing.
   Suggested direction: add a predicate variant that can test the held item's current `alter_item_kind` state, ideally with a closed list of allowed kinds and conjunction with `holding_item`.

3. Reaction-scoped AC needs explicit surface support.
   Suggested direction: widen `modify_ac` with a scope such as `triggering_attack_only`, or add a dedicated reaction-defense subshape.

4. Illumination needs a new effect atom if lighting is intended to be in-core.
   Suggested direction: `emit_light` / `grant_light_source` with bright/dim radii.
