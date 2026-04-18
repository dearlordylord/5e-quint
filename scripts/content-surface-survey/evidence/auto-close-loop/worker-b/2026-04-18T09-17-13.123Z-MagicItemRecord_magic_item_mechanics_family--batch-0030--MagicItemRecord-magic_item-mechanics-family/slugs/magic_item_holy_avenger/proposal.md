## Holy Avenger

Outcome: `structural_widening`

### Why I did not author a content record

Holy Avenger is not just a passive numeric item.

It combines three different mechanics:

- a passive held-weapon bonus: `+3` to attack rolls and damage rolls made with this weapon;
- a passive on-hit rider: extra `2d10 Radiant` damage, but only when the weapon hits a `Fiend` or `Undead`;
- a passive aura: while held and drawn, the weapon projects an emanation from the bearer that grants allies advantage on saving throws against spells and other magical effects, with a larger radius at Paladin level 17+.

The current `magic_item` surface can honestly encode the first bullet, but not the second and third together.

### Primary structural gap

`MagicItemComponentMechanics` does not include any passive on-hit family.

Current options are:

- `passive`
- `activation`
- `triggered_reaction`
- `spawned_creature`

The Fiend/Undead rider is not:

- a passive always-on sheet modifier;
- an activation;
- a reaction;
- a summon.

It is a persistent `on_hit_trigger` attached to the weapon. Without a magic-item analogue of the mastery/on-hit shape, any authored record would have to either drop the rider or misstate it as a flat damage bonus.

Evidence:

> "When you hit a Fiend or an Undead with it, that creature takes an extra 2d10 Radiant damage."

### Second structural gap

The aura is a passive non-spell area attachment.

Spell families can encode area attachments and emanations. `PassiveMechanics` for non-spell units cannot. It only grants always-on effects and elapsed-time passive operations; it has no attachment-bearing aura form.

Holy Avenger needs a passive component that can say:

- attachment: emanation from self
- scope: self and friendly creatures in area
- granted rider: advantage on some saving throws

Evidence:

> "While you hold the drawn weapon, it creates a 10-foot Emanation originating from you. You and all creatures Friendly to you in the Emanation have Advantage on saving throws..."

### Surface widenings that would still be needed

Even after the structural gaps above are addressed, two narrower surface widenings remain:

1. `modify_roll_advantage.sourceFilter`

The aura does not grant advantage on all saving throws. It only applies against spells and other magical effects.

Evidence:

> "...have Advantage on saving throws against spells and other magical effects."

This is the same narrowing gap already exposed by items like `Spellguard Shield` and `Robe of the Archmagi`.

2. `area_shape_scaling_by_named_class_level`

The emanation radius is `10 ft`, but becomes `30 ft` at `Paladin 17+`.

Evidence:

> "If you have 17 or more levels in the Paladin class, the size of the Emanation increases to 30 feet."

The current surface has scaling primitives, but not for a non-spell area attachment keyed to a named class-level threshold in a magic-item passive aura.

### Why this is `structural_widening`, not just `surface_widening`

If the only gap were the magical-source save filter, this would be `surface_widening`.

It is `structural_widening` because there is no honest family today for:

- a magic-item persistent on-hit rider, and
- a magic-item passive area aura.

Those are family-shape problems, not just missing fields on an otherwise-fitting record.
