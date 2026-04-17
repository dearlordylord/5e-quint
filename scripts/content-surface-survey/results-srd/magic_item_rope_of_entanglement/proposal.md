# Rope of Entanglement

## Verdict

`structural_widening`

The unit does not fit the current `MagicItemRecord` mechanics honestly.
The existing magic-item surface only allows:

- `passive`
- `activation`

That is enough for static grants and one-shot activations, but not for a magic item whose activation creates a persistent, destructible, independently stateful restraint object with later action/reaction windows.

## Why Existing Families Fail

The initial command is easy to model:

- Magic action
- one visible creature within 20 feet
- DC 15 Dexterity save
- on fail: `Restrained`

But that is only the entry point. The item's core mechanic continues after activation:

- the target remains restrained by this specific rope until released or escaped;
- the target can spend an action to attempt escape;
- the escape attempt is a choice between two different skill-shaped checks:
  Strength (Athletics) or Dexterity (Acrobatics), both vs fixed DC 15;
- the wielder can later release or re-coil the rope with a Bonus Action;
- if the target escapes while the wielder still holds the rope, the wielder gets a Reaction to command it back;
- the rope itself has AC, HP, damage immunities, timed regeneration, location state, and destruction at 0 HP.

That is not a one-shot activation plus a minor omitted rider. It is an activated item that creates ongoing item-owned runtime state.

## Narrowest Honest Widenings

### 1. `MagicItemMechanics.ongoing_effect`

The magic-item surface needs the same kind of persistent payload family spells already have, or an equivalent item-scoped family. The restraint is not instantaneous.

Evidence:

> The target must succeed on a DC 15 Dexterity saving throw or have the Restrained condition.

### 2. Bound-item escape loop subgraph

The surface needs a way to express that a creature affected by an item-bound restraint can later spend its own action to make a specific escape check, with success ending that item-bound condition.

Evidence:

> A target Restrained by the rope can take an action to make its choice of a DC 15 Strength (Athletics) or Dexterity (Acrobatics) check. On a successful check, the target is no longer Restrained by the rope.

Notes:

- This is not just `repeat_save`.
- It is not just `remove_condition`.
- It is not DM agenda; the check types, DC, and success effect are deterministic.

### 3. Item object state / lifecycle subgraph

The rope is not just a condition source. It is a combat object with its own stats and lifecycle.

Evidence:

> The rope has AC 20, HP 20, and Immunity to Poison and Psychic damage. It regains 1 Hit Point every 5 minutes as long as it has at least 1 Hit Point. If the rope drops to 0 Hit Points, it is destroyed.

This pressures support for:

- item-owned object stats in play;
- damage immunities on the item object;
- timed regeneration;
- destruction at 0 HP;
- stateful location/holding transitions when released, escaped from, or recoiled.

## Why I Did Not Author A Placeholder

I did not write `content/magic_item_rope_of_entanglement.dhall`.

Encoding only:

- Magic action
- Dex save
- apply `Restrained`

would produce a false trace. It would omit the mechanics that actually define how the item functions after the initial save, including the target's deterministic escape action and the rope's own runtime state.
