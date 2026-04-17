# Staff of the Magi

## Verdict

`Staff of the Magi` does not fit the current authored surface honestly, so no `content/magic_item_staff_of_the_magi.dhall` was written.

Outcome: `structural_widening`

## What fits already

- `MagicItemRecord` is the correct top-level kind.
- The spell table mostly fits the existing charge-cast activation pattern:
  - `charge_pool` with cap `50`
  - `grant_spell_access` entries for the listed spells and fixed-cost casts
  - `resetCadence.dawn` with regain `4d6 + 2`
- Retributive Strike is at least recognizably an activated item ability rather than DM-only agenda.

## Why it does not fit honestly

### 1. The item needs a reaction-shaped magic-item component

Current magic items can be:

- `passive`
- `activation`
- `composite` of passive + activation parts

`Staff of the Magi` has a major third component:

- passive held bonuses
- activated spellcasting / Retributive Strike
- a triggered reaction (`Spell Absorption`)

There is no honest way to encode the reaction as either a passive grant or a normal activation, so the current family shape is too small.

### 2. The passive combat package is still underspecified

The item grants all of these while used/held:

- `+2` to attack rolls made with this quarterstaff
- `+2` to damage rolls made with this quarterstaff
- `+2` to spell attack rolls
- Advantage on saving throws against spells

Current gaps:

- no item-specific weapon filter, only coarse melee/ranged filters
- no passive damage-roll bonus atom
- no `spell_attack_roll` roll kind distinct from generic `attack_roll`
- no save/advantage filter for "against spells"

The damage-roll bonus alone blocks an honest passive encoding.

### 3. Spell Absorption needs reactive charge gain and overflow handling

Spell Absorption does more than negate a spell:

- it triggers on an unnamed spell that targets only you
- it cancels the triggering spell
- it gains charges equal to the triggering spell's level
- if the new total exceeds 50, it immediately detonates as Retributive Strike

The current surface has no subgraph for:

- reaction-shaped item abilities
- charge-pool refund/gain from a reaction outcome
- overflow into a second resolution path

### 4. Retributive Strike adds more missing shape pressure

Retributive Strike needs several unsupported details:

- area originates from the item itself
- self-damage and area damage are fixed multiples of current charges
- the wielder has a 50 percent chance to avoid the blast by instant travel to a random plane

Even if the item had a reaction component, these still need widening.

### 5. Attunement restrictions are still too weak

The record only supports `requiresAttunement: boolean`, but this staff requires attunement by one of a closed class set:

- Sorcerer
- Warlock
- Wizard

That omission is not the main blocker, but it remains a real surface gap.

## Minimal widening set

1. Add a triggered-reaction component family for magic items, or widen `CompositeMagicItemMechanics` to admit a reaction-shaped part.
2. Add a reaction trigger variant for "a spell that targets only you".
3. Add a passive `modify_damage_roll` atom.
4. Widen weapon scoping so modifiers can target a specific held item / weapon identity.
5. Add a `spell_attack_roll` roll kind, or an equivalent roll filter.
6. Add a spell-source filter for saving-throw advantage/disadvantage riders.
7. Add class-restricted attunement metadata to `MagicItemRecord`.
8. Add an item-origin area variant.
9. Add multiplied charge-based amounts (`N × current charges`).
10. Add a charge-pool refund / overflow resolution shape for Spell Absorption.

## Evidence

> This staff has 50 charges and can be wielded as a magic Quarterstaff that grants a +2 bonus to attack rolls and damage rolls made with it.

> While you hold it, you gain a +2 bonus to spell attack rolls.

> While holding the staff, you have Advantage on saving throws against spells.

> you can take a Reaction when another creature casts a spell that targets only you

> the staff absorbs the magic of the spell, canceling its effect and gaining a number of charges equal to the absorbed spell's level

> if doing so brings the staff's total number of charges above 50, the staff explodes as if you activated its Retributive Strike

> an explosion that fills a 30-foot Emanation originating from itself

> you take Force damage equal to 16 times the number of charges in the staff

> On a failed save, a creature takes Force damage equal to 6 times the number of charges in the staff.
