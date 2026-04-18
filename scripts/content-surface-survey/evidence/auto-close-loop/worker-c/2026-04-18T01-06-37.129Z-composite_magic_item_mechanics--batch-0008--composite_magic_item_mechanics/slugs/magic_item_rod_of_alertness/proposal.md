# Proposal: `magic_item_rod_of_alertness`

Outcome: `structural_widening`

## Why it does not fit today

`Rod of Alertness` is one item with two simultaneous mechanics families:

1. Passive held-item grants:
   - advantage on Wisdom (Perception) checks
   - advantage on Initiative rolls
   - access to four spells while holding the rod
2. A separate activated property:
   - as a Magic action, plant the rod
   - create a 10-minute protective bright-light aura
   - while creatures are in that bright light, you and allies gain +1 AC, +1 saving throws, and can sense Invisible creatures there
   - the effect ends early if someone pulls the rod from the ground
   - usable once per dawn

Current `MagicItemMechanics` is a closed union:

- `PassiveMechanics`
- `ActivatedAbilityMechanics`

That means a magic item can be passive **or** activated, but not both at once. Encoding only the held benefits would drop the planted aura. Encoding only the planted aura would drop the always-on holding benefits and spell access. That is a missing composition shape, not just a missing atom.

## Pressure points from the text

- "While holding the rod, you have Advantage on Wisdom (Perception) checks and on Initiative rolls."
- "While holding the rod, you can cast the following spells from it"
- "As a Magic action, you can plant the haft end of the rod in the ground"
- "While in that Bright Light, you and your allies gain a +1 bonus to Armor Class and saving throws and can sense the location of any Invisible creature that is also in the Bright Light."
- "The rod's head stops glowing and the effect ends after 10 minutes or when a creature takes a Magic action to pull the rod from the ground."
- "Once used, this property can't be used again until the next dawn."

## Narrowest honest widening

### 1. New composition shape for magic items

The item needs a way to carry both passive grants and an activated property in one authored record.

Suggested direction:

- `MagicItemMechanics = PassiveMechanics | ActivatedAbilityMechanics | CompositeMagicItemMechanics`
- where `CompositeMagicItemMechanics` can contain:
  - passive grants/properties that apply while the item is held or worn
  - one or more activated properties with their own resource/reset/duration rules

This is why the verdict is `structural_widening`.

### 2. Held-item gating

The passive half is specifically "while holding the rod", not merely attuned and not merely always on.

Current `EquipmentPredicate` can express:

- `always`
- `wearing_armor`
- `wielding_weapon`

It cannot express holding a magic item. A narrow surface widening would be:

- `EquipmentPredicate.holding_item`

or an equivalent item-state predicate.

### 3. Planted-item / anchored aura semantics

The activated property is not a self-buff and not a normal target spell. It creates an anchored area around the planted rod and ends early when a creature takes a Magic action to remove that anchor.

Current non-spell activation phases do not have an honest way to express:

- attachment to a planted item/location rather than self/target/area from the user
- early termination by "someone takes a Magic action to pull the rod from the ground"

This could be handled either by:

- widening activated-item phases to support anchored attachments / dismiss actions, or
- letting magic items reuse an anchored-trigger / anchored-area style subgraph for persistent planted effects.

### 4. Invisible-location sensing in an area

The aura grants: "can sense the location of any Invisible creature that is also in the Bright Light."

Existing options are not a clean fit:

- `grant_sense` is self-targeted and names a fixed sense kind
- `see_invisibility` is currently approximated elsewhere via `grant_sense`

This aura is narrower and area-gated: it reveals location only for Invisible creatures that are inside the rod's bright-light zone. That likely needs either:

- a narrower sense variant / projection for "sense invisible location", or
- an area-scoped visibility/detection effect

This is secondary to the structural blocker above.

## Why this is `structural_widening`, not only `surface_widening`

Even if the surface gained:

- `EquipmentPredicate.holding_item`
- an initiative-specific roll modifier
- a better invisible-sensing atom

the item would still not fit honestly because one `MagicItemRecord` cannot currently carry both:

- passive held benefits and spell access
- a separate activated, once-per-dawn planted aura

That missing multi-property composition is the first blocker.
