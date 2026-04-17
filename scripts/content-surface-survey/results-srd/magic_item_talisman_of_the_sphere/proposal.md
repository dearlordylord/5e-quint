## Talisman of the Sphere

Outcome: `structural_widening`

This item does not fit the current authored surface honestly, so no `content/magic_item_talisman_of_the_sphere.dhall` was written.

### Why it does not fit

The item has two distinct mechanics:

1. A passive rider:
   "While holding or wearing this talisman, you have Advantage on any Intelligence (Arcana) check you make to control a Sphere of Annihilation."

2. A separate activated capability:
   "when you start your turn in control of a Sphere of Annihilation, you can take a Magic action to move it 10 feet plus a number of additional feet equal to 10 times your Intelligence modifier."

Current `MagicItemMechanics` is:

- `PassiveMechanics`
- `ActivatedAbilityMechanics`

That union forces a magic item to be one or the other. This unit is both.

### Required widening

#### 1. Combined passive + activation mechanics for magic items

Classification: `structural_widening`

The item needs a shape that can carry:

- passive grants that are always on while held/worn and attuned;
- one or more activated abilities gated by turn state / control state.

Without that, the only available encodings are dishonest:

- encode only the passive half and omit the activation;
- encode only the activation and omit the passive;
- force the activation into a passive grant, which would produce a false trace.

#### 2. Object-targeted movement

Classification: `surface_widening`

Even with a combined family, the activated half still needs additional surface support:

- an object attachment target (`Attachment.object`);
- an effect for moving that object (`EffectAtom.move_object`, or equivalent).

The current attachment vocabulary only covers:

- `self`
- `target`
- `area`
- `mark`

But this rule targets a specific object:

> "move it"

The v4 taxonomy already includes `object` attachment and `move` effect language, so this looks like surface catch-up rather than a brand-new taxonomy atom.

#### 3. Distance formula from ability modifier

Classification: `surface_widening`

The movement amount is:

> "10 feet plus a number of additional feet equal to 10 times your Intelligence modifier"

Current numeric-expression support covers:

- fixed numbers;
- dice expressions;
- proficiency bonus / ability modifier deltas for roll or AC modifiers.

It does not currently express a movement distance formula of `base + multiplier × ability_modifier`.

### What *does* already fit

The passive half is expressible with current atoms:

- `magic_item`
- `passive`
- `modify_roll_advantage`
- `skillFilter = arcana`
- `on = ["ability_check"]`

But authoring only that half would be incomplete and therefore misleading for this unit.
