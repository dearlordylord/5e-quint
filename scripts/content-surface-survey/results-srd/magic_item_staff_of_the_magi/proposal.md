# Staff of the Magi

Outcome: `structural_widening`

## Why it does not fit honestly

`MagicItemRecord.mechanics` currently allows exactly one family:

- `passive`
- `activation`

`Staff of the Magi` requires all of these simultaneously:

- passive held bonuses:
  - `+2` to attack rolls with the staff
  - `+2` to damage rolls with the staff
  - `+2` to spell attack rolls
  - Advantage on saving throws against spells
- charge-based spell activation from a spell table
- a triggered reaction:
  - absorb a spell that targets only you
  - cancel the spell
  - gain charges equal to the absorbed spell's level
  - if the pool would exceed 50, branch into Retributive Strike
- a separate activated destruction ability:
  - Magic action to break the staff
  - item destruction
  - area explosion
  - self-avoidance branch with 50% chance to travel to a random plane
  - damage for self and others keyed to current stored charges

That is not a missing field on one existing family. It is a missing way to compose multiple item sub-abilities under one magic item.

## Required widenings

### 1. Composite magic-item mechanics

Add a way for one `MagicItemRecord` to carry multiple sub-abilities, for example:

- passive grants
- activated spellcasting
- triggered reaction
- activated destruction mode

Evidence:

> "While you hold it, you gain a +2 bonus to spell attack rolls."

> "While holding the staff, you can cast one of the spells on the following table from it..."

> "you can take a Reaction when another creature casts a spell that targets only you"

> "You can take a Magic action to break the staff..."

### 2. Triggered reaction support for magic items

The current triggered-reaction family is spell-only. `Staff of the Magi` needs the same trigger grammar on an item ability.

Evidence:

> "you can take a Reaction when another creature casts a spell that targets only you"

### 3. Charge gain / overflow branching

The surface supports:

- fixed charge pools
- spending charges to cast
- dawn recharge
- last-charge destruction checks

It does not support:

- gaining charges from another event's parameter
- deriving the gain from the absorbed spell's level
- branching on pool overflow into another effect path

Evidence:

> "gaining a number of charges equal to the absorbed spell's level. However, if doing so brings the staff's total number of charges above 50, the staff explodes..."

### 4. Damage-roll bonus atom

There is no current passive atom for "bonus to damage rolls made with this weapon." `modify_roll_numeric` covers attack rolls, saving throws, ability checks, initiative, and death saves, but not damage rolls.

Evidence:

> "grants a +2 bonus to attack rolls and damage rolls made with it"

## Secondary pressure

`Retributive Strike` adds further surface pressure even after the structural issue:

- damage keyed to current remaining charges in the item, not to a fixed dice expression
- 50% random-plane self-avoidance branch
- item destruction as part of an activated ability, not merely on last-charge depletion

These are real modeling concerns, but the first honest classification remains `structural_widening` because the item cannot even be placed into a truthful top-level mechanics family today.
