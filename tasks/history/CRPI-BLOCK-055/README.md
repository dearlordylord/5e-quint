# CRPI-BLOCK-055 History

Task 103 accepted the Character Sheet Weapon Mastery selected-reference route replay through public target entrypoints.

- Selected weapon refs are observed through `characterSheetWeaponMasterySelectedReferenceProjection`.
- Long Rest reselection acceptance and rejection are observed through `completeLongRestWeaponMasteryReselectionWithRoute`, which delegates to `completeLongRest`.
- Evidence is recorded in `tasks/target-replay-evidence/CRPI-BLOCK-055.json`.
- No durable CharacterSheet Weapon Mastery state fields were added; selected refs remain `CharacterBuild.features` selected-class-choice facts, and eligibility/count facts are derived from Surface Weapon Mastery profiles.
- Revision round 2 narrowed `completeLongRestWeaponMasteryReselectionWithRoute`: unrelated `completeLongRest` failures now return `route: "none"` with empty `qRoute`; only Weapon Mastery reselection failures emit the selected-reference projection-choice route.
