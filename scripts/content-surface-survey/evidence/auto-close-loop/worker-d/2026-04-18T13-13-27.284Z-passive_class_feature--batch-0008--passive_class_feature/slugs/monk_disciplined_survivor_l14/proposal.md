# Disciplined Survivor (monk L14)

## Verdict

`structural_widening`

The feature does not fit the current class-feature surface honestly.

## Why It Does Not Fit

The passive half is already blocked:

- `grant_proficiency` can only target skills, weapon categories, and armor categories.
- "proficiency in all saving throws" needs a new `ProficiencyGrantSubject` variant for saving throws.

The reactive half is blocked in several independent ways:

- It is a triggered rider on **failing your own saving throw**.
- Class features can currently be `passive`, `activation`, or `composite` of passive + activation only.
- There is no honest way to encode a class feature that is both:
  - a passive proficiency grant, and
  - a triggered reaction-style reroll rider.

The spend is also modeled incorrectly by every existing resource shape:

- `ActivationResource` only models owned `use_count` or `charge_pool` resources.
- Disciplined Survivor spends from the monk's pre-existing **Focus Point** pool.
- Creating a local fake pool on this feature would duplicate state and violate the repo's no-redundant-state rule.

The reroll itself is missing from the authored surface:

- The unit says: "reroll it, and you must use the new roll."
- That is neither `modify_roll_numeric` nor `modify_roll_advantage`.
- The taxonomy already recognizes reroll pressure (`modify_roll_reroll`), but `src/surface/types.ts` and `src/interpreter/tracer.ts` do not expose it.

## Minimal Honest Widening

1. Add `ProficiencyGrantSubject.save` so passive grants can cover saving-throw proficiency.
2. Allow `CompositeClassFeatureMechanics` to include `TriggeredReactionAbilityMechanics`, not just passive + activation.
3. Add a shared-resource reference variant on `ActivationResource` so a feature can spend from an existing class pool such as Focus Points.
4. Add a `ReactionTrigger.failed_saving_throw` variant.
5. Add a reroll effect atom/variant for "reroll and must use the new roll".

## Why I Did Not Author Dhall

Any current encoding would be dishonest:

- passive-only would drop the reroll rider entirely;
- a standalone activation would lose the always-on save proficiency;
- inventing a local use-count resource would duplicate the monk's Focus Point pool;
- coercing reroll into another roll-modifier atom would produce a false trace.
