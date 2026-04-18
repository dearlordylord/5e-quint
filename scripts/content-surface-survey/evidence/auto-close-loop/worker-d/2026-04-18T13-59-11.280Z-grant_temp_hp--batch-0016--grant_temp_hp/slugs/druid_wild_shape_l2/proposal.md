# Wild Shape (druid L2) surface gap

`Wild Shape` fits the existing `class_feature` + `activation` family in broad shape, but the current surface cannot encode it honestly.

## Why it is not clean

- The transform source is wrong for Wild Shape. Current `transform_target.newForm` only supports broad `catalog_ref` selection, while Wild Shape must choose from the druid's learned Beast roster for this feature.
- The duration is not representable. `ActivatedAbilityMechanics.duration` can be timed, but `DurationValue` cannot say "hours equal to half class level."
- The transform restriction is too coarse. Current `actionRestriction = "no_speech_no_spells"` would be false for Wild Shape because the druid keeps speech but loses spellcasting.
- The retained-state vocabulary is incomplete. Wild Shape keeps class features, feats, languages, and saving-throw proficiencies, which the current retained-field enum does not fully cover.
- The revert triggers are incomplete. Wild Shape ends when reused, on Incapacitated, or on death; those triggers are not all available in `PolymorphRevertTrigger`.

## Narrowest honest classification

`surface_widening`

The top-level unit kind and mechanics family already exist. The missing pieces are variants on existing shapes, mainly around `transform_target`, duration modeling, and transform-specific restrictions.

## Suggested widenings

1. Add a `PolymorphFormSource` variant for caller-owned learned-form rosters, matching the comment already present in `types.ts` about Wild Shape.
2. Widen duration modeling so class-feature durations can scale by class level, including "half class level" hour counts.
3. Add a transform action restriction that means "can't cast spells" without also suppressing speech.
4. Extend retained-field modeling for Wild Shape's preserved class features / feats / saving-throw proficiencies.
5. Extend transform revert triggers with `use_again`, `condition_active(incapacitated)`, and `death`.

## Omitted as DM agenda / narrative

- Equipment merging, falling, or being worn by the new form.
- GM permission to learn Beast forms from other sources.
- Practicality of whether a Beast form can wear a given item.
