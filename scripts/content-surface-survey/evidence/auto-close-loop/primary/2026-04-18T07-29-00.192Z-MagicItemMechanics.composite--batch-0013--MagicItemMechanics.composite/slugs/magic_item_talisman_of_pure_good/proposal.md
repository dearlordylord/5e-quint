## Talisman of Pure Good

Outcome: `structural_widening`

### Why it does not fit honestly

The item does not fit the current `MagicItemMechanics` families without lying about at least two separate rules.

First, the talisman is not just a passive bearer bonus plus an activated ability. It also has an automatic harmful rider that triggers when a Fiend or Undead touches the item, and then repeats when that creature ends its turn holding or carrying it. The current magic-item surface supports:

- `passive` bearer grants
- `activation`
- `triggered_reaction`
- `composite` over those families

It does not support a non-activated ongoing hazard or contact-triggered item effect.

Second, `Pure Rebuke` needs a failed-save outcome that destroys the target outright. That is not an existing `EffectAtom`.

### Specific gaps

1. `automatic_item_hazard` subgraph

Needed for:

- touch-triggered damage from the item itself
- repeated end-of-turn damage while the target keeps holding/carrying it

RAW pressure:

> A Fiend or an Undead that touches the talisman takes 8d6 Radiant damage and takes the damage again each time it ends its turn holding or carrying the talisman.

2. `equipment_predicate_any_of` surface variant

Needed because the item uses the disjunction "wear or hold it" for both the passive spell-attack bonus and the activation gate. Current `EquipmentPredicate` only models one predicate at a time.

RAW pressure:

> You gain a +2 bonus to spell attack rolls while you wear or hold it.

> While wearing or holding the talisman, you can take a Magic action...

3. `save_gate_target_type_disadvantage` surface variant

Needed because the save modifier is conditional on target creature type before the save resolves.

RAW pressure:

> If the target is a Fiend or an Undead, it has Disadvantage on the save.

4. `destroy_target` atom

Needed because the failed-save outcome is not damage, exile, or a condition. The target is destroyed outright and leaves no remains.

RAW pressure:

> On a failed save, the target falls into the fissure and is destroyed, leaving no remains.

### What does fit

One part of the item does fit existing surface vocabulary:

- the passive `+2` bonus to `spell_attack_roll`

But encoding only that slice would produce a misleading trace for the full item, so I did not author a placeholder content record.
