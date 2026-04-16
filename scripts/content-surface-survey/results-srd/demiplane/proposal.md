# Proposal: Demiplane — structural_widening

## Unit

- **Name:** Demiplane
- **Level:** 8 conjuration
- **Duration:** 1 hour (timed, not concentration)
- **Casting time:** Action
- **Range:** 60 ft (point)
- **Components:** S

## Why it does not fit

None of the four existing `SpellMechanics` families can represent this spell honestly:

| Family | Why it fails |
|---|---|
| `ongoing_effect` | Requires an `operation` (`roll_modifier` or `damage_on_hit`). Demiplane has neither — it creates a space, not a rider on targets. |
| `activation` | For instantaneous/one-shot spells. Demiplane has a 1-hour timed duration with persistent state. |
| `triggered_reaction` | Reaction-shaped spells only. Demiplane is cast with an action. |
| `anchored_trigger` | Plants a sensor that fires on a creature-caused event (physical contact / enters area). Demiplane creates a traversable living space; the expiry behavior is cleanup, not the primary function. Using `anchored_trigger` would misrepresent the core mechanic. |

## New family required: `space_creation`

A spell that creates a persistent, traversable, caster-owned space accessible through a portal/door object. Core shape:

```
SpellMechanicsHeader + {
  family: "space_creation";
  portal: PortalCreation;         // the door object
  space: ExtradimensionalSpace;   // the attached pocket dimension
  castTimeChoice: SpaceChoice;    // new vs. connect-to-existing
  onExpiry: SpaceExpiryEffect;    // optional creature shunting
}
```

**Pressure cases** (other SRD spells that need this family):
- Mordenkainen's Magnificent Mansion (level 7, similar pocket-dimension space)
- Rope Trick (level 2, extradimensional space inside a rope)
- Leomund's Tiny Hut (level 3, dome/shelter — adjacent)

## Required widenings

### 1. New family: `space_creation`

For spells that create a persistent traversable extradimensional space via a portal. Distinct from `anchored_trigger` (event sensor) and `ongoing_effect` (rider on targets).

### 2. New atom: `create_portal`

A door/portal object with a destination (the extradimensional space). Extends the existing `create_object` v4 atom with:
- `destination` — points to the attached space
- `traversable` — bidirectional entry/exit
- `openable` — can be opened and closed

### 3. New atom: `extradimensional_space`

A caster-owned pocket dimension with physical dimensions that persists beyond individual castings. Distinct from `location` and `area` (both in-world coordinates). Carries:
- Physical dimensions
- Persistence across castings (can be reconnected later)
- Cross-caster read-access (can connect to another caster's demiplane if known)

### 4. New expiry variant: `eject_occupants`

An on-expiry effect that optionally repositions creatures inside the space to the nearest unoccupied positions outside, applying the `prone` condition. The existing `expire` lifecycle atom records when duration ends but does not model creature repositioning with condition application.

Evidence: _"Any creatures inside also remain unless they opt to be shunted through the door as it vanishes, landing with the Prone condition in the unoccupied spaces closest to the door's former space."_

### 5. New cast-time choice variant

The caster chooses at cast time: create a new demiplane, or connect the door to a prior casting's demiplane (including another caster's). The v4 `choose` procedure atom exists but there is no surface type variant in `SpellMechanics` for a cast-time choice that selects between creating vs. connecting a persistent named space.

Evidence: _"Each time you cast this spell, you can create a new demiplane or connect the shadowy door to a demiplane you created with a previous casting of this spell. Additionally, if you know the nature and contents of a demiplane created by a casting of this spell by another creature, you can connect the shadowy door to that demiplane instead."_

## Not classified as `dm_agenda`

The spell has deterministic mechanical outcomes: a door appears at a valid location, creatures can enter, the door vanishes at duration end, creatures inside are moved to specific positions. The "knowing the nature and contents" prerequisite for connecting to another caster's demiplane is a precondition on the choice, not a DM-adjudicated narrative outcome.

## Files not produced

- No `content/demiplane.dhall` — no honest encoding possible
- No `content/demiplane.json`
- No `content/demiplane.trace.md`
