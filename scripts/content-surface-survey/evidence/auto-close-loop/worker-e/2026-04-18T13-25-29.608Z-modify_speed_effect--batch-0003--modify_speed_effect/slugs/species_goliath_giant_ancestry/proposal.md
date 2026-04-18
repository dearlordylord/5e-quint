## Verdict

`Giant Ancestry (Goliath)` does not fit the current `SpeciesTraitRecord` surface honestly.

The rule is one species trait whose core mechanic is:

- a build-time choice of exactly one ancestry benefit;
- a shared `PB`-scaled use pool with `long_rest` reset;
- where the chosen benefit can be one of several different mechanic families:
  - activated bonus-action teleport (`Cloud's Jaunt`);
  - on-hit rider (`Fire's Burn`, `Frost's Chill`, `Hill's Tumble`);
  - triggered reaction (`Stone's Endurance`, `Storm's Thunder`).

Current `SpeciesTraitMechanics` only allows:

- `passive`
- `activation`

It does not allow:

- a species-trait-level build-time `choose one` wrapper over mechanics;
- `triggered_reaction` as a species-trait family;
- `on_hit_trigger` as a species-trait family;
- a composite species trait that can contain one chosen branch while preserving the shared resource/reset header.

## Why This Is Structural

This is not just one missing atom. Several of the underlying effects already exist in the surface:

- `teleport`
- `damage`
- `modify_speed`
- `apply_condition`
- `reduce_damage_taken`

The problem is the top-level mechanics shape. The current species-trait surface cannot say:

> "Choose one of these six sub-traits at build time; the chosen branch owns the shared PB/LR resource, and that branch may be activation, reaction, or on-hit."

Encoding only one ancestry branch would be false to the unit text. Encoding all six simultaneously would also be false.

## Proposed Widenings

### 1. Species trait build-time choice over mechanics

Add a species-trait mechanics variant that can represent:

- choose one branch at build time;
- each branch has its own mechanics family;
- only the chosen branch is active at runtime.

Possible shape:

`SpeciesTraitMechanics = Passive | ActivatedAbility | TriggeredReactionAbility | OnHitTrigger | Composite | ChosenOneOf<...>`

Evidence:

> "Choose one of the following benefits... you can use the chosen benefit a number of times equal to your Proficiency Bonus"

### 2. Species traits need the same non-spell subfamilies already used elsewhere

Widen `SpeciesTraitMechanics` to admit:

- `triggered_reaction`
- `on_hit_trigger`

Evidence:

- "When you hit a target with an attack roll and deal damage to it..."
- "When you take damage, you can take a Reaction..."

## Secondary Surface Pressure If/When Family Fit Lands

If the structural widening above is added, at least one secondary shape likely follows:

- `Hill's Tumble` narrows to a `Large or smaller creature`; current target filters cover creature type, not target size.

Evidence:

> "When you hit a Large or smaller creature..."

## Worker Notes

Per protocol, I stopped before authoring `content/species_goliath_giant_ancestry.dhall` because any current JSON would be knowingly misleading. I did not run `pnpm typecheck` or the tracer, since those steps apply only after an honest authored unit exists.
