# Potion of Gaseous Form

Verdict: `atom_widening`

The item fits the existing top-level shape `MagicItemRecord` with `mechanics.family = "activation"`:

- drink the potion once;
- gain a timed self effect for 1 hour;
- no attunement;
- single-use destruction.

I stopped before authoring because the inherited `Gaseous Form` mechanics do not fit the current surface honestly.

## Why It Does Not Fit Cleanly

The current surface can represent some parts of the spell:

- `grant_speed` for Fly Speed 10 and hover;
- `grant_resistance` for bludgeoning, piercing, and slashing;
- `grant_condition_immunity` for Prone;
- `modify_roll_advantage` on Strength, Dexterity, and Constitution saving throws.

But several core mechanics are missing:

- Early end on 0 HP is not in `DurationEndTrigger`.
- The potion-specific self-end as a `Bonus Action` is not in `DurationEndTrigger`.
- Entering/occupying another creature's space is not covered by any existing effect atom.
- Passing through narrow openings is not covered by any existing effect atom.
- Treating liquids as solid surfaces is not covered by any existing effect atom.
- The target can't attack or cast spells. v4 has `restrict_action_set`, but the TS surface does not currently expose it as a standalone `EffectAtom`.

## Narrowest Honest Classification

This is not `structural_widening`: the family exists.

This is not only `surface_widening`: at least some required movement-state mechanics are missing from the atom inventory currently realized by the prototype, not just from a single union variant.

So the narrowest honest classification is `atom_widening`.

## Evidence

From `Gaseous Form`:

> The spell ends on the target if it drops to 0 Hit Points

> While in this form, the target's only method of movement is a Fly Speed of 10 feet, and it can hover.

> The target can enter and occupy the space of another creature.

> The target can pass through narrow openings, but it treats liquids as though they were solid surfaces.

> Finally, the target can't attack or cast spells.

From `Potion of Gaseous Form`:

> When you drink this potion, you gain the effect of the Gaseous Form spell for 1 hour (no Concentration required) or until you end the effect as a Bonus Action.
