# Apparatus of the Crab

## Verdict

`structural_widening`

The item does not honestly fit any existing `MagicItemMechanics` family.

## Why It Does Not Fit

The current surface can encode:

- passive grants while worn/held
- bounded activations with a resource + reset cadence
- trigger-bound reactions
- summoned companions

`Apparatus of the Crab` is none of those. Its core mechanic is a persistent operated vehicle:

- it is a `Large object` with its own AC, HP, movement modes, and damage immunities
- creatures enter a sealed compartment and pilot it from inside
- operation is a repeatable `Utilize` action, not a limited-use activation
- each turn can change up to two lever states, and the resulting effect depends on the current apparatus configuration
- multiple levers change persistent state rather than applying one-shot effects

That forces a new family or subgraph instead of a widened atom inside an existing family.

## Concrete Gaps

### 1. No honest top-level family for a crewed vehicle

Evidence:

> "To be used as a vehicle, the apparatus requires one pilot."

> "A creature in the compartment can take a Utilize action to move as many as two of the apparatus's levers up or down."

Why this matters:

- `activation` is wrong because current activations spend a declared resource and resolve phases immediately.
- `passive` is wrong because the item is not just an always-on grant.
- `spawned_creature` is wrong because the apparatus is not a creature companion that receives commands through `CreatureControl`.

Recommended widening:

- Add a new mechanics family, e.g. `operated_vehicle`, with:
- object/vehicle stat block
- operator / crew capacity
- repeatable action-costed controls
- internal state slots for levers / extended parts / shutters / hatch state

### 2. No repeatable non-resource operation family for magic items

Evidence:

> "A creature in the compartment can take a Utilize action..."

Why this matters:

- every existing activated magic-item family requires `resource` + `resetCadence`
- the apparatus is operated at will, round after round, with no charges or per-rest use count

This is a surface-level family gap, but it is tied to the larger vehicle-shape problem above.

### 3. No object/vehicle stat-block payload

Evidence:

> "The Apparatus of the Crab is a Large object with the following statistics: AC 20; HP 200; Speed 30 ft., Swim 30 ft. (or 0 ft. if the legs aren't extended); Immunity to Poison and Psychic damage."

Why this matters:

- current inline stat blocks are creature-oriented (`CreatureStatBlock`)
- the apparatus needs object/vehicle identity and rules, not creature typing / ability scores / monster action lists

Recommended widening:

- add an object/vehicle stat block payload rather than coercing this into `spawned_creature`

## Secondary Missing Mechanics

Even after adding a vehicle family, this item still pressures several additional shapes:

- persistent part-state toggles:
  - legs extended / retracted
  - shutters open / closed
  - claws extended / retracted
  - hatch open / closed and sealed
- vehicle locomotion verbs:
  - move forward / backward
  - turn clockwise / counterclockwise
  - sink / rise in liquid
- onboard environmental state:
  - airtight / watertight compartment
  - shared air supply measured in hours
- environment-triggered damage:
  - pressure damage below 900 feet each minute
- light emission:
  - bright light 30 ft, dim light for 30 ft more
- object-mounted attack options:
  - claw attack for damage
  - claw grapple on hit

Those are real gaps, but they come after the primary structural issue.

## Why This Is Not `dm_agenda`

The item's mechanics are deterministic. The blocker is not adjudication; it is missing structure in the authored surface.

## Recommendation

Do not author `content/magic_item_apparatus_of_the_crab.dhall`.

The next honest step is a new `operated_vehicle` / `crewed_object` family rather than a placeholder `activation` or `composite` item that would misrepresent the rule.
