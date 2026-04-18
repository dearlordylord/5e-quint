# Wand of Wonder

Outcome: `atom_widening`

## Why I did not author the unit

The outer shell fits the existing `magic_item` activation family:

- `kind = "magic_item"`
- rare, requires attunement
- `condition = holding_item`
- `activationCost = action`
- `resource = charge_pool` with 7 charges
- `resetCadence = dawn` with `1d6 + 1`
- `destruction = last_charge_roll`
- the current surface already has `ActivationPhase.random_table`

That is not the blocker. The blocker is that several table branches still cannot be represented honestly once the random outcome is chosen.

## Required widening

### 1. Immediate embedded spell cast with item overrides

Multiple rows say the wand immediately casts an existing spell from the rolled branch:

- Darkness / Faerie Fire / Fireball / Slow / Stinking Cloud
- Gust of Wind
- Lightning Bolt
- Enlarge/Reduce
- Invisibility
- Polymorph

Those are not persistent spell-access grants. They are immediate casts nested inside the item activation, and they carry item-specific overrides:

- fixed save DC 15
- point of origin = the chosen point
- spell max range becomes 120 feet when normally shorter
- some branches further rewrite geometry, like a Line extending from you to the chosen point

The current surface has `grant_spell_access`, but that is the wrong mechanic. It grants the ability to cast later; it does not perform a cast now inside a random-table branch.

Evidence:

> You cast a spell originating from the chosen point.

> Spells cast from the wand have a save DC of 15.

> If a spell's maximum range is normally less than 120 feet, it becomes 120 feet when cast from the wand.

### 2. Area obscuration effect

Two rows create temporary environmental obscuration:

- heavy rain for 1 minute: area is Lightly Obscured
- butterflies for 10 minutes: area is Heavily Obscured

That is not a condition on creatures and not a targeting block. It is an area-state effect the current `EffectAtom` union does not have.

Evidence:

> During that time, the area of effect is Lightly Obscured.

> ...the area of effect is Heavily Obscured.

### 3. Object attachment for object-target exile

One row targets an object near the chosen point and exiles it to the Ethereal Plane. The authored surface has attachments for self, target creature, area, and mark, but not a general object attachment for activation content.

Evidence:

> An object of the GM's choice disappears into the Ethereal Plane. The object must be neither worn nor carried, within 120 feet of the chosen point of origin, and no larger than 10 feet in any dimension.

## Secondary unsupported pressure

Even after the widenings above, the table still applies pressure in a few other places:

- uncontrolled temporary creature appearance: "isn't under your control, acts as it normally would"
- GM-random subject selection: "If an effect has multiple possible subjects, the GM determines randomly which among them are affected"
- mixed narrative/environmental branches like overgrown grass and leaves growing from a creature

Those are not the first blockers, but they confirm that a placeholder encoding would be misleading.

## Verdict

`Wand of Wonder` is not a structural failure anymore because `random_table` already exists on the current surface. The honest classification is still `atom_widening`, because the unit requires at least one genuinely new effect atom (`obscure_area`) and additional surface variants to model the spell-cast and object-target branches.
