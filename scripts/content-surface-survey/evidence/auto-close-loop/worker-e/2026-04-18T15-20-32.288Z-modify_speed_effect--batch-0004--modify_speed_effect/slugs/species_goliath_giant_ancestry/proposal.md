# Proposal: Giant Ancestry (Goliath)

## Verdict

`Giant Ancestry` does not fit the current surface honestly. The correct classification is `structural_widening`.

I did not author `content/species_goliath_giant_ancestry.dhall` because any current encoding would misrepresent the unit.

## Why The Existing Families Fail

The top-level kind exists: `species_trait`.

The problem is the mechanics shape:

- `SpeciesTraitMechanics` currently allows only `passive | activation`.
- `Giant Ancestry` is one trait with a mandatory build-time choice among six different boons.
- Those boons are not one shared mechanics family:
  - `Cloud's Jaunt` is a bonus-action activation.
  - `Fire's Burn`, `Frost's Chill`, and `Hill's Tumble` are on-hit riders.
  - `Stone's Endurance` and `Storm's Thunder` are triggered reactions.

That means the unit cannot be represented as:

- one passive trait;
- one activation trait;
- or one homogeneous list of grants/phases.

The unit needs a way to say "pick one option at build time, and that option may itself be a different mechanics family."

## Primary Widening

Add a species-trait build-time choice wrapper, for example:

- `SpeciesTraitMechanics.build_time_choice`

This wrapper should select exactly one option at character creation and let each option carry its own mechanics family.

Without that, the surface cannot model the trait's core rule honestly:

> "Choose one of the following benefits-a supernatural boon from your ancestry"

## Secondary Widenings

If the structural choice wrapper existed, the selected options would still pressure a few narrower gaps.

### 1. Species-Trait Triggered Reactions

Two options are reaction-shaped species abilities:

- `Stone's Endurance`
- `Storm's Thunder`

Today `SpeciesTraitMechanics` does not admit a triggered-reaction family.

Needed widening:

- `SpeciesTraitMechanics.triggered_reaction`

Evidence:

> "When you take damage, you can take a Reaction..."

> "When you take damage from a creature within 60 feet of you, you can take a Reaction..."

### 2. Species-Trait On-Hit Riders

Three options are on-hit riders:

- `Fire's Burn`
- `Frost's Chill`
- `Hill's Tumble`

The current `on_hit_trigger` family is mastery-only and cannot be attached to a species trait.

Needed widening:

- `SpeciesTraitMechanics.on_hit_trigger`

Evidence:

> "When you hit a target with an attack roll and deal damage to it..."

### 3. Damage-Taken Reaction Triggers

Even if species traits could use triggered reactions, the shared `ReactionTrigger` grammar does not currently cover:

- generic `when you take damage`
- `when you take damage from a creature within N feet`

Needed widening:

- `ReactionTrigger.take_damage`

Evidence:

> "When you take damage..."

> "When you take damage from a creature within 60 feet of you..."

### 4. On-Hit Target Size Filter

`Hill's Tumble` narrows the eligible target:

> "When you hit a Large or smaller creature..."

The current on-hit trigger surface has no target-size filter.

Needed widening:

- `OnHitTrigger.target_size_filter`

## Existing Atoms That Already Fit

Several pieces are already covered once the structural gap is solved:

- `teleport` for `Cloud's Jaunt`
- `damage` for `Fire's Burn` / `Storm's Thunder`
- `modify_speed` for `Frost's Chill`
- `apply_condition` with `prone` for `Hill's Tumble`
- `reduce_damage_taken` for `Stone's Endurance`
- `UseCountCap.proficiency_bonus`
- `RestResetCadence.long_rest`

So this is not primarily an atom problem. The main issue is that one species trait needs a build-time selection across heterogeneous mechanics families.
