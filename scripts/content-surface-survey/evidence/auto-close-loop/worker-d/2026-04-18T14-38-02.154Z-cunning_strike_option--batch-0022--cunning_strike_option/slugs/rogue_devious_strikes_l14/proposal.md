## Devious Strikes (rogue L14)

Outcome: `structural_widening`

This unit does not fit the current `ClassFeatureRecord.mechanics` surface honestly.

Why it does not fit:

- The feature is not a standalone activated ability and not a passive always-on grant.
- It adds new rider options to an existing `Cunning Strike` / `Sneak Attack` hit-resolution flow.
- The current class-feature surface only supports:
  - `passive`
  - `activation`
  - `composite` of passive + activation
- There is no class-feature equivalent of the existing `on_hit_trigger` family used by masteries and some magic items.
- There is also no way to model the rider cost as "sacrifice N Sneak Attack d6" from an already-resolving damage instance.

Specific missing pieces:

1. Structural widening: class-feature on-hit rider family

- Needed shape: a class-feature mechanics family that attaches to a qualifying Sneak Attack hit and opens a choice among rider options.
- Existing nearest shape:
  - `MasteryMechanics.on_hit_trigger`
  - but `ClassFeatureMechanics` cannot use it.
- Evidence:
  - "The following effects are now among your Cunning Strike options."
  - "Daze (Cost: 2d6)."
  - "Knock Out (Cost: 6d6)."
  - "Obscure (Cost: 3d6)."

2. Surface widening: cost paid from Sneak Attack dice

- Needed shape: a resource/cost variant tied to reducing the current Sneak Attack damage pool by a chosen number of d6.
- This is not a normal `use_count`, `charge_pool`, action cost, or spell slot.
- Evidence:
  - "Daze (Cost: 2d6)."
  - "Knock Out (Cost: 6d6)."
  - "Obscure (Cost: 3d6)."

3. Atom widening: Daze rider effect

- `Daze` is not honestly representable with existing effect atoms.
- The current surface has `restrict_action_set`, but that excludes named actions entirely; it does not express "on its next turn, it can do only one of: move, take an action, or take a Bonus Action."
- This is a turn-economy limiter, not an action-set exclusion.
- Evidence:
  - "on its next turn, it can do only one of the following: move or take an action or a Bonus Action."

What already fits once the family exists:

- `Knock Out` could reuse:
  - `save_gate`
  - `apply_condition` with `unconscious`
  - timed duration `1 minute`
  - early end on `target_takes_damage`
  - `repeatSave` at `end_of_target_turn`
- `Obscure` could reuse:
  - `save_gate`
  - `apply_condition` with `blinded`
  - timed duration until end of next turn

Recommended direction:

- Add a class-feature mechanics family analogous to `on_hit_trigger`, scoped to Sneak Attack / Cunning Strike resolution.
- Add a cost model for spending/reducing Sneak Attack dice from the current hit.
- Add a new atom for the Daze economy lock, likely a turn-budget restriction rather than a generic action exclusion.
