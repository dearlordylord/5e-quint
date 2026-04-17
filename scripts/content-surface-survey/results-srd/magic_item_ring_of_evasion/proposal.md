# Ring of Evasion

## Verdict

`Ring of Evasion` does not fit the current magic-item surface honestly.

The item itself is a valid `magic_item` unit kind, and two subparts already fit existing surface shapes:

- `charge_pool` with cap 3
- `dawn` partial recharge of `1d3`

The blocking problem is the item's actual use shape:

> "When you fail a Dexterity saving throw while wearing the ring, you can take a Reaction to expend 1 charge to succeed on that save instead."

That is a reactive response window keyed off a failed save, not a proactive action/bonus-action/free activation and not a passive always-on grant.

## Why It Stops

Current `MagicItemMechanics` only permits:

- `PassiveMechanics`
- `ActivatedAbilityMechanics`

`ActivatedAbilityMechanics` can consume a `reaction` quota, but it still has no trigger grammar. It represents "you activate this ability" rather than "a failure opens a response window and you may commit the reaction then."

Separately, the effect is not expressible with existing surfaced atoms:

- not `modify_roll_numeric`
- not `modify_roll_advantage`
- not `negate_named_effect`
- not `interrupt_resolution` alone

The rule replaces the outcome of the triggering failed save with success. That is a roll-substitution effect.

## Required Widenings

### 1. Add reactive mechanics for non-spell units

Recommended shape: widen `MagicItemMechanics` to also allow a triggered-reaction family, or generalize the existing `TriggeredReactionMechanics` so non-spell units can use it.

Why this is forced:

- the timing is "when you fail..."
- the player may choose whether to spend the reaction/charge
- the charge should be spent on commit, not merely because the trigger happened

### 2. Add a failed-save trigger variant

Needed trigger shape:

- failed saving throw
- narrowed to Dexterity

Why this is forced:

- current reaction triggers do not cover failed saves at all

### 3. Surface a roll-substitution effect

Needed effect shape:

- replace the triggering failed save with success

Why this is forced:

- the item does not add a bonus or advantage before the roll
- it does not instruct a reroll
- it changes the resolved outcome after failure

This matches the v4 taxonomy's `modify_roll_substitute` direction more closely than any currently surfaced atom.

## Classification

Primary outcome: `structural_widening`

Reason:

- no honest magic-item mechanics family exists for this reactive shape

Secondary surface gaps also exist:

- missing failed-save reaction trigger
- missing surfaced roll-substitution effect
