# Staff of the Magi

Outcome: `structural_widening`

## Why it does not fit honestly

The current surface can represent several isolated slices of this item:

- passive held bonuses:
  - `+2` to attack rolls with the staff
  - `+2` to damage rolls with the staff
  - `+2` to spell attack rolls
  - Advantage on saving throws against spells
- charge-based spell access from a table
- an activated destructive effect

But `Staff of the Magi` is not just a bag of unrelated parts. Its spell table, Spell Absorption reaction, and Retributive Strike all share one live 50-charge pool, and the reaction is not authorable as a magic-item-triggered procedure today.

The current magic-item surface has `composite`, but its components are still limited to `passive | activation`. That is not enough for this item.

## Blocking gaps

### 1. Reaction-shaped magic-item component

The item needs a component equivalent to spell-side `triggered_reaction`, not just `activationCost = reaction`.

Why: the mechanic is defined by an explicit trigger, and that trigger carries context used by the effect.

Evidence:

> "you can take a Reaction when another creature casts a spell that targets only you"

### 2. Shared charge pool across item components

The item has one 50-charge pool, but three distinct sub-abilities touch it:

- spellcasting spends charges
- Spell Absorption gains charges
- Retributive Strike reads current charges for damage

Current composite item parts do not share a single resource state across components.

Evidence:

> "This staff has 50 charges"

> "gaining a number of charges equal to the absorbed spell's level"

> "damage equal to 16 times the number of charges in the staff"

### 3. Charge gain from trigger context, with overflow branch

Existing support covers:

- spending charges to cast
- dawn recharge
- last-charge destruction checks

It does not cover:

- gaining charges from the triggering spell's level
- checking whether the gain would overflow the cap
- branching from that overflow into Retributive Strike

Evidence:

> "the staff absorbs the magic of the spell, canceling its effect and gaining a number of charges equal to the absorbed spell's level. However, if doing so brings the staff's total number of charges above 50, the staff explodes as if you activated its Retributive Strike"

### 4. Damage amount derived from current charge pool

`Retributive Strike` damage is not fixed dice, slot scaling, or spent-resource amount. It is a multiplier over the item's current stored charges.

Evidence:

> "you take Force damage equal to 16 times the number of charges in the staff"

> "On a failed save, a creature takes Force damage equal to 6 times the number of charges in the staff"

## Secondary pressure

- The self-avoidance clause adds a probabilistic branch:
  - "You have a 50 percent chance to instantly travel to a random plane of existence, avoiding the explosion."
- The attunement requirement is class-restricted:
  - "Requires Attunement by a Sorcerer, Warlock, or Wizard"

These are real gaps, but the first honest classification is still `structural_widening` because the item cannot yet be expressed as a truthful top-level mechanics composition.
