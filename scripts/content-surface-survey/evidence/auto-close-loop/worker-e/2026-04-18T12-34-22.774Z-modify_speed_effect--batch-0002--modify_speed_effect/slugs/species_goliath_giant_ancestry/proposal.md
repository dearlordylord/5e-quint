`Giant Ancestry (Goliath)` does not fit the current `species_trait` surface honestly.

Why it fails:

- The unit's primary mechanic is a build-time choice among six ancestry boons.
- Those boons are not all the same mechanics family.
- `SpeciesTraitMechanics` currently allows only `passive | activation`.

Family breakdown of the six choices:

- `Cloud's Jaunt` fits `activation` today: bonus action teleport, PB uses, long-rest reset.
- `Fire's Burn` is an on-hit rider.
- `Frost's Chill` is an on-hit rider with a bundled speed debuff.
- `Hill's Tumble` is an on-hit rider with a target-size gate.
- `Stone's Endurance` is a triggered reaction.
- `Storm's Thunder` is a triggered reaction.

Why this is `structural_widening` rather than a smaller gap:

- The existing top-level kind `species_trait` exists.
- The problem is not one missing atom inside a valid family.
- The problem is that the authored unit is one record whose core rule is “choose one benefit,” but the available choices span multiple mechanics families and the surface has no honest top-level wrapper for that.

Minimum honest widening:

- Add a species-trait-level choice/composite shape that can select exactly one branch at build time from heterogeneous mechanics families.
- Allow species traits to reuse `TriggeredReactionAbilityMechanics`.
- Allow species traits to reuse an on-hit-trigger family, or generalize the existing mastery on-hit rider family so non-mastery units can consume resources and reset cadence.

Why no placeholder content file was written:

- Encoding only one boon would change the meaning of the unit.
- Encoding all six as simultaneous grants would also be false.
- Encoding reaction or on-hit branches as plain `activation` would produce a misleading trace.
