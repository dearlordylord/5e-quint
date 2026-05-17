# QMBT55 Recursive Unit Profile Planning Review

Date: 2026-05-07

## Decision

Do not declare the Unit profile matrix lane complete.

QMBT53 closed Orc Adrenaline Rush as a supported executable Unit profile, and
QMBT54 selected Boon of Combat Prowess `Peerless Aim` as the next narrow SRD
feature widening slice. The generated matrix still reports 29/45 supported
executable Units, so the next batch should implement Peerless Aim, re-open
feature-slice selection against the refreshed matrix, and then run another
recursive review.

Append:

- `QMBT56 - Promote Boon of Combat Prowess Peerless Aim Miss-to-Hit Replacement`
- `QMBT57 - Select Next SRD Feature Widening Slice After Combat Prowess`
- `QMBT58 - Recursive Unit Profile Planning Review`

## Reviewed Findings

- QMBT53 promoted `orc_adrenaline_rush` as
  `unit-feature.bonus-action-dash-temporary-hit-points`, keeping Bonus Action
  Dash, Proficiency Bonus Temporary Hit Points, Proficiency Bonus use pool, and
  Short or Long Rest refresh coupled in one supported profile rather than
  separate markers.
- QMBT53 refreshed matrix artifacts to 59 installed Units, 22 stable
  executable profiles, 29/45 supported executable Unit coverage, 29/29
  deterministic admission/projection coverage, and 10/29 selected identity MBT
  coverage.
- QMBT54 selected `feat_boon_of_combat_prowess` as a narrow attack-roll
  miss-to-hit replacement slice. The decision keeps Peerless Aim distinct from
  ability-check augmentation, Reaction roll reduction, damage-roll reduction,
  Weapon Mastery riders, spells, magic items, healing pools, Temporary Hit
  Point features, AC base formulas, and resistance traits.

## Source Check

QMBT55 did not model a new rule directly. It reviewed the RAW/source checks
already captured by QMBT53-QMBT54 and re-checked the local anchors that drive
the appended batch:

- `.references/srd-5.2.1/Character-Origins.md`, Orc `Adrenaline Rush`.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Dash [Action]`, `Speed`,
  `Temporary Hit Points`, `Proficiency Bonus`, `Short Rest`, and `Long Rest`.
- `.references/srd-5.2.1/Playing-the-Game.md`, `Temporary Hit Points`,
  `Damage and Healing`, action timing, Bonus Action routing, Movement, and
  Speed anchors relevant to Adrenaline Rush.
- `.references/srd-5.2.1/Feats.md`, `Boon of Combat Prowess` and `Peerless
  Aim`.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Attack Roll`, `D20 Test`,
  `Armor Class`, `Damage Roll`, and `Reaction`.
- `.references/srd-5.2.1/Playing-the-Game.md`, `D20 Tests`, `Attack Rolls`,
  `Armor Class`, `Reactions`, the Attack action, and `Damage Rolls`.
- `UBIQUITOUS_LANGUAGE.md` anchors for Action, Bonus Action, Movement, Speed,
  Dash, Temporary Hit Points, Hit Points, Healing, Pool, Quota, Spend, Short
  Rest, Long Rest, Attack Roll, Armor Class, Critical Hit, Damage Roll, D20
  Test, Ability Check, Reaction, Weapon Mastery, and Mastery Property.

## Next-Batch Rationale

`QMBT56` should directly implement the QMBT54 decision before broadening into
another feature family. Peerless Aim is installed SRD feat pressure with one
authored battle-relevant benefit: when the creature misses with an attack roll,
it can hit instead, and the benefit resets at the start of the creature's next
turn. The implementation should use the existing attack-roll outcome boundary
so the miss-to-hit replacement feeds the same downstream hit path as an
ordinary hit without duplicating attack result state.

`QMBT57` should run after QMBT56 refreshes the matrix because Peerless Aim will
change attack-outcome replacement pressure and may alter the remaining
feature-lane priorities. Candidate lanes remain distinct: ability-check
resource augmentation, Reaction roll reduction, redirect-on-zero damage
features, healing pools, Temporary Hit Point features, AC base formulas,
resistance traits, Breath Weapon attack replacement, Weapon Mastery
properties, spells, and magic items should not be mixed into the Combat
Prowess implementation slice.

`QMBT58` remains necessary because the matrix lane is not complete and the
project needs a recurring stop to reconcile findings, update the PRD, and
append the next bounded batch rather than letting planning drift.

## Verification

- Active-plan consistency was checked across the Ralph task index, DAG rows,
  and task details for QMBT55-QMBT58.
- RAW/source review checked the local SRD 5.2.1 and `UBIQUITOUS_LANGUAGE.md`
  anchors listed in `Source Check`; QMBT55 did not model a new rule directly.
- PRD status notes were refreshed to reflect QMBT53-QMBT55, current matrix
  metrics, and the appended QMBT56-QMBT58 batch.
- reviewer loop round 1: kept the appended batch tied to the already selected
  Peerless Aim implementation before another feature selection task.
- reviewer loop round 2: no important changes found; the batch still has one
  implementation task, one post-implementation feature selection task, and one
  recursive review.
- `pnpm unit-profile-coverage:check` remains the matrix gate if generated
  artifacts change; QMBT55 changed planning docs only.
- MBT not run: QMBT55 is planning-only and makes no promoted battle-runtime
  behavior change.
