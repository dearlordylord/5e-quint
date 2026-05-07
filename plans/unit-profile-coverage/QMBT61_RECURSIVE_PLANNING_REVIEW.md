# QMBT61 Recursive Unit Profile Planning Review

Date: 2026-05-07

## Decision

Do not declare the Unit profile matrix lane complete.

QMBT59 closed Monk `Deflect Attacks` redirect-on-zero as a supported
executable Unit profile, and QMBT60 selected Fighter `Tactical Mind` as the
next narrow SRD feature widening slice. The generated matrix now reports 31/45
supported executable Units, so the next batch should implement Tactical Mind,
re-open feature-slice selection against the refreshed matrix, and then run
another recursive review.

Append:

- `QMBT62 - Promote Tactical Mind Failed Ability Check Second Wind Boost`
- `QMBT63 - Select Next SRD Feature Widening Slice After Tactical Mind`
- `QMBT64 - Recursive Unit Profile Planning Review`

## Reviewed Findings

- QMBT59 promoted `monk_deflect_attacks` as
  `unit-feature.attack-damage-reduction-zero-damage-redirect`, keeping the
  attack-damage Reaction boundary, pre-Resistance zero-damage gate, Focus
  Point spend, redirect target, Dexterity saving throw, redirected damage roll,
  and original damage type together in one profile.
- QMBT59 refreshed matrix artifacts to 59 installed Units, 24 stable
  executable profiles, 31/45 supported executable Unit coverage, 31/31
  deterministic admission/projection coverage, and 10/31 selected identity MBT
  coverage.
- QMBT60 selected `fighter_tactical_mind` as the next narrow feature widening
  slice. The selected boundary is the already-rolled failed ability-check
  augmentation that uses the existing Second Wind pool, adds `1d10`, spends
  the pool only when the boost turns failure into success, and leaves the pool
  unchanged when the augmented check still fails.

## Source Check

QMBT61 did not model a new rule directly. It reviewed the RAW/source checks
already captured by QMBT59-QMBT60 and re-checked the local anchors that drive
the appended batch:

- `.references/srd-5.2.1/Classes/Monk.md`, `Deflect Attacks`, `Monk's
  Focus`, and `Martial Arts`.
- `.references/srd-5.2.1/Playing-the-Game.md`, `Damage Rolls`, `Damage Types`,
  `Resistance and Vulnerability`, and saving throw anchors.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Reaction`, `Saving Throw`,
  `Damage Types`, and `Total Cover`.
- `.references/srd-5.2.1/Classes/Fighter.md`, `Second Wind` and `Tactical
  Mind`.
- `.references/srd-5.2.1/Playing-the-Game.md`, `D20 Tests`, `Ability Checks`,
  `Proficiency`, and GM/caller control over target numbers.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Ability Check`, `D20 Test`,
  `Difficulty Class`, `Short Rest`, and `Long Rest`.
- `UBIQUITOUS_LANGUAGE.md` anchors for Ability Check, D20 Test, Difficulty
  Class, Proficiency Bonus, Pool, Spend, Refund, Hit Points, Temporary Hit
  Points, Reaction, Saving Throw, Damage Type, Resistance, Armor Class,
  Unarmored Defense, Weapon Mastery, and Mastery Property.

## Next-Batch Rationale

`QMBT62` should directly implement the QMBT60 decision before broadening into
another feature family. Tactical Mind is installed SRD Fighter pressure whose
Surface mechanics already carry a specific
`failed_ability_check_second_wind_boost` shape. The implementation should add
one explicit already-rolled ability-check outcome boundary and thread the
existing `fighter_second_wind` pool through that boundary, rather than adding a
parallel Tactical Mind pool or a generic D20 Test augmentation framework.

`QMBT63` should run after QMBT62 refreshes the matrix because Tactical Mind
will change the remaining feature-lane pressure. Candidate lanes remain
distinct: ability-check Reaction reduction, healing pools, Temporary Hit Point
features, AC base formulas, resistance traits, Breath Weapon attack
replacement, Weapon Mastery properties, spells, magic items, content cleanup,
and checker metric changes should not be mixed into the Tactical Mind
implementation slice.

`QMBT64` remains necessary because the matrix lane is not complete and the
project needs a recurring stop to reconcile findings, update the PRD, and
append the next bounded batch rather than letting planning drift.

## QMBT62 Refinements

QMBT62 remains the correct next implementation task. The review adds these
clarifications:

- QMBT62 is unblocked by this review and should move to
  `ready-for-implementation-after-light-research`.
- The ability-check boundary must accept table/caller-supplied facts for the
  check already rolled: actor, relevant ability, optional skill/tool label if
  already known, original total, DC, and Tactical Mind boost roll.
- Runtime must not decide whether an ability check is called for, whether a
  proficiency applies, or what the DC is.
- The same Second Wind pool used by `fighter_second_wind` is the only resource
  state for the slice.
- The still-failed branch is a no-spend/refund of the Second Wind use, not a
  separate resource grant or action rewind.

## Verification

- Active-plan consistency was checked across the Ralph task index, DAG rows,
  and task details for QMBT61-QMBT64 in the workspace active plan.
- RAW/source review checked the local SRD 5.2.1 and
  `UBIQUITOUS_LANGUAGE.md` anchors listed in `Source Check`; QMBT61 did not
  model a new rule directly.
- PRD status notes were refreshed to reflect QMBT59-QMBT61, current matrix
  metrics, and the appended QMBT62-QMBT64 batch.
- `/simplify` round 1: kept the appended batch tied to the already selected
  Tactical Mind implementation before another feature selection task.
- `/simplify` round 2: no important changes found; the batch still has one
  implementation task, one post-implementation feature selection task, and one
  recursive review.
- `pnpm unit-profile-coverage:check` remains the matrix gate if generated
  artifacts change; QMBT61 changed planning docs only.
- MBT not run: QMBT61 is planning-only and makes no promoted battle-runtime
  behavior change.
