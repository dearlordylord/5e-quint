## Frost Brand

Outcome: `structural_widening`

### Why it does not fit honestly

`Frost Brand` combines three distinct mechanics:

1. An item-scoped on-hit rider:
   - "When you hit with an attack roll using this magic weapon, the target takes an extra 1d6 Cold damage."
2. A passive held bonus:
   - "while you hold the weapon, you have Resistance to Fire damage."
3. A draw-triggered utility with its own cooldown:
   - "When you draw this weapon, you can extinguish all nonmagical flames within 30 feet of yourself. Once used, this property can't be used again for 1 hour."

The current `MagicItemMechanics` surface only allows:

- `passive`
- `activation`
- `composite` of passive/activation parts

That is not enough for Frost Brand's primary rider. The extra cold damage is neither:

- a passive always-on grant (`passive` cannot express "on hit, deal extra damage"), nor
- an activated ability (`activation` would falsely imply the wielder separately activates the damage rider).

The only existing family that matches this mechanic is `on_hit_trigger`, but that family is available only for `MasteryRecord`, not for `MagicItemRecord`.

### Narrowest honest widening

Add an item-compatible on-hit family or allow `MagicItemComponentMechanics` to include the existing `OnHitTriggerMechanics`.

Candidate shape:

- `MagicItemComponentMechanics = PassiveMechanics | ActivatedAbilityMechanics | OnHitTriggerMechanics`

This would let Frost Brand encode its weapon-hit cold-damage rider honestly without inventing a fake activation.

### Secondary gap

The draw-triggered flame suppression also lacks a matching effect atom.

Evidence:

- "When you draw this weapon, you can extinguish all nonmagical flames within 30 feet of yourself."

That pressures a new effect atom along the lines of `extinguish_nonmagical_flames` plus a trigger/cost shape for "when you draw this weapon".

### Notes on non-blocking text

- The fire resistance clause fits existing `grant_resistance`.
- The light emission clause ("sheds Bright Light in a 10-foot radius and Dim Light for an additional 10 feet" in freezing temperatures) is not the main blocker; it reads more like environmental/projection state than the unit's core combat mechanic.
