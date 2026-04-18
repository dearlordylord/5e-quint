# Wand of Wonder

Outcome: `atom_widening`

## Why it does not fit cleanly

The outer container fits the existing `magic_item` activation shell:

- rare magic item
- requires attunement
- `activationCost = action`
- `resource = charge_pool` with 7 charges
- `resetCadence = dawn` with `1d6 + 1`
- `destruction = last_charge_roll`

That is not the hard part. The blocker is the payload.

`Wand of Wonder` does not grant a stable spell list like `Wand of Magic Missiles` or `Staff of Healing`. Each activation resolves by rolling on a mandatory random table and then applying one of many heterogeneous outcomes:

- cast one of several spells from a chosen point
- self-stun
- self-damage
- obscuring weather / butterflies in an area
- enlarge / shrink
- uncontrolled summoned creature
- object exile to the Ethereal Plane
- blinded burst with repeat save
- polymorph into one of several catalog forms
- staged restrained -> petrified progression

The current surface has no honest way to say "roll on this table, then execute the matching branch."

## Required widening

### 1. Random table resolution

Need a new subgraph for random outcome selection, something like `random_table_resolution`.

Why:

- `choose` is player choice, not die-driven randomness.
- Ordered `phases` are sequencing, not branch selection.
- Encoding one branch and omitting the rest would misrepresent the unit.

Evidence:

> That location becomes the point of origin of a spell or other magical effect determined by rolling on the Wand of Wonder Effects table.

### 2. Immediate embedded spell cast with item overrides

Several rows cast a spell right now, but not in the same shape as `grant_spell_access`.

Needed capabilities:

- immediate cast during the activation
- chosen point of origin
- fixed save DC 15
- override spell max range to 120 feet when lower

Evidence:

> You cast a spell originating from the chosen point.

> Spells cast from the wand have a save DC of 15.

> If a spell's maximum range is normally less than 120 feet, it becomes 120 feet when cast from the wand.

### 3. Area obscuration effect

Two rows create temporary obscured areas:

- Lightly Obscured
- Heavily Obscured

That is not representable with the current `EffectAtom` union.

Evidence:

> During that time, the area of effect is Lightly Obscured.

> ...the area of effect is Heavily Obscured.

## Secondary unsupported pressure

Even after the table/subgraph widening, several rows would still need more modeling work:

- uncontrolled temporary creature appearance
- object exile to the Ethereal Plane
- GM-random subject selection when an effect has multiple possible subjects
- polymorph into a rolled catalog form
- restrained-then-petrified staged progression

Those are not the first blocker, but they confirm that a placeholder encoding would be misleading.
