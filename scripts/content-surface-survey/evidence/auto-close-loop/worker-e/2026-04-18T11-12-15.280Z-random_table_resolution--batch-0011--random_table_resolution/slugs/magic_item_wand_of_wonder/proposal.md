# Proposal: Wand of Wonder

`Wand of Wonder` should stop before authoring. Its top-level shell fits the current surface as a `magic_item` with:

- `activation` mechanics
- `charge_pool` resource (`7` charges)
- `dawn` recharge (`1d6 + 1`)
- `last_charge_roll` destruction
- a top-level `random_table`

That is not enough to encode the item honestly. Several table outcomes need missing atoms or missing variants of existing surface types.

## Classification

Outcome: `atom_widening`

Reason: at least one required mechanic is missing from the v4/surface atom inventory, so producing a partial content file would create a misleading trace.

## Required widenings

### 1. New effect atom for obscured areas

Two branches create persistent obscured areas:

- `36–40`: heavy rain in a cylinder, "the area of effect is Lightly Obscured"
- `41–45`: oversized butterflies, "the area of effect is Heavily Obscured"

The current surface has no honest atom for "this area becomes lightly/heavily obscured for N time". This is not narrative residue; it is a real mechanical state affecting perception and targeting.

Suggested widening:

- new atom such as `apply_obscurement`
- payload shape: obscuration level + attached area + duration owned by the host branch

## Surface variants also needed

### 2. Spell-access range override

The wand can cast existing spells with modified range:

> "If a spell's maximum range is normally less than 120 feet, it becomes 120 feet when cast from the wand."

`grant_spell_access` currently supports:

- `dcOverride`
- `areaOverride`
- `targetRestriction`
- `durationOverride`

It does not support `rangeOverride`.

### 3. Spell-access origin override

The wand's defining mechanic is remote-origin casting:

> "That location becomes the point of origin of a spell or other magical effect..."

This is stronger than the current `targetRestriction.origin` hook. It needs to change where the spell originates, including area spells and lines. It also pressures directional line semantics for:

- `26–30`: *Gust of Wind*
- `46–50`: *Lightning Bolt*

Both say the line extends from the wielder to the chosen point.

### 4. Nearest-creature targeting from a chosen point

Several branches choose:

- "the creature closest to the chosen point of origin"

Current `TargetSelection` cannot express "nearest qualifying creature to a resolved point".

### 5. Uncontrolled summoned creature

`56–60` summons a rhinoceros, elephant, or rat that:

> "isn't under your control, acts as it normally would"

Current spawned-creature mechanics assume a `CreatureControl` record with a command interface. This branch needs a control mode that explicitly represents no command authority.

## Additional unresolved pressure

These are real gaps too, but the atom widening above is already sufficient to block authoring:

- object-target exile to the Ethereal Plane:
  - `65–68` targets an object, not a creature or area
  - current `Attachment` has no object variant in the shipped TS surface
- equal-split line damage:
  - `88–92` divides total gem damage equally among all creatures in the line
  - current damage modeling has no "split total among affected creatures" primitive
- specific random polymorph roster:
  - `93–97` polymorphs into Black Bear / Giant Wasp / Frog
  - current `transform_target.newForm` models creature-type + CR bounds, not a closed random roster of exact forms
- one-time delayed repeat save:
  - `98–00` repeats only at the end of the target's next turn
  - current `RepeatSaveSpec` is open-ended cadence, not "exactly one later save"

## Why no placeholder content file was authored

The missing pieces are not secondary polish. They are central to the item's table:

- remote-origin spell casting
- obscured-area creation
- nearest-creature resolution
- uncontrolled summoning

Authoring only the charge pool and random table shell would imply the surface can express the mechanics when it currently cannot. That would produce a false positive trace, so no `content/magic_item_wand_of_wonder.dhall` or derived JSON was written.
