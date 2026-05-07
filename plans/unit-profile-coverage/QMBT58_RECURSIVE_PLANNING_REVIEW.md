# QMBT58 Recursive Unit Profile Planning Review

Date: 2026-05-07

## Decision

Do not declare the Unit profile matrix lane complete.

QMBT56 closed Boon of Combat Prowess `Peerless Aim` as a supported executable
Unit profile, and QMBT57 selected Monk `Deflect Attacks` redirect-on-zero as
the next narrow SRD feature widening slice. The generated matrix now reports
30/45 supported executable Units, so the next batch should implement the
Deflect Attacks redirect, re-open feature-slice selection against the refreshed
matrix, and then run another recursive review.

Append:

- `QMBT59 - Promote Deflect Attacks Zero-Damage Redirect`
- `QMBT60 - Select Next SRD Feature Widening Slice After Deflect Attacks`
- `QMBT61 - Recursive Unit Profile Planning Review`

## Reviewed Findings

- QMBT56 promoted `feat_boon_of_combat_prowess` as
  `unit-feature.attack-roll-miss-to-hit-replacement`, keeping the attack-roll
  miss trigger, optional hit replacement, once-per-turn use, and start-turn
  reset together in one profile instead of creating a generic d20 replacement
  family.
- QMBT56 refreshed matrix artifacts to 59 installed Units, 23 stable
  executable profiles, 30/45 supported executable Unit coverage, 30/30
  deterministic admission/projection coverage, and 10/30 selected identity MBT
  coverage.
- QMBT57 selected `monk_deflect_attacks` as the next narrow feature widening
  slice. The selected boundary is the redirect-on-zero follow-up after the
  already modeled attack-damage Reaction reduction reduces damage to 0, with
  Focus Point spend, redirect target choice, Dexterity saving throw, and
  same-type redirected damage kept together.

## Source Check

QMBT58 did not model a new rule directly. It reviewed the RAW/source checks
already captured by QMBT56-QMBT57 and re-checked the local anchors that drive
the appended batch:

- `.references/srd-5.2.1/Feats.md`, `Boon of Combat Prowess` and `Peerless
  Aim`.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Attack Roll`, `D20 Test`,
  `Armor Class`, `Damage Roll`, and `Reaction`.
- `.references/srd-5.2.1/Playing-the-Game.md`, `D20 Tests`, `Attack Rolls`,
  `Armor Class`, `Reactions`, the Attack action, and `Damage Rolls`.
- `.references/srd-5.2.1/Classes/Monk.md`, `Deflect Attacks`, `Monk's
  Focus`, and `Martial Arts`.
- `.references/srd-5.2.1/Playing-the-Game.md`, `Damage Rolls`, `Damage Types`,
  `Resistance and Vulnerability`, and saving throw anchors.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Reaction`, `Saving Throw`,
  `Damage Types`, and `Total Cover`.
- `UBIQUITOUS_LANGUAGE.md` anchors for Reaction, Attack Roll, Damage Type,
  Resistance, Saving Throw, Pool, Quota, Spend, Hit Points, Temporary Hit
  Points, Armor Class, Unarmored Defense, Ability Check, Weapon Mastery, and
  Mastery Property.

## Next-Batch Rationale

`QMBT59` should directly implement the QMBT57 decision before broadening into
another feature family. Deflect Attacks is installed SRD Monk pressure whose
ordinary attack-damage Reaction reduction is already partially promoted; the
remaining unsupported gap is the follow-up that becomes available only when
that reduction makes the damage 0. The implementation should execute through
the existing attack-damage Reaction boundary so the Reaction spend, damage
ordering, Focus Point spend, redirect target selection, Dexterity saving throw,
and same-type redirected damage remain one coherent profile.

`QMBT60` should run after QMBT59 refreshes the matrix because Deflect Attacks
will change the remaining feature-lane pressure. Candidate lanes remain
distinct: ability-check resource augmentation, ability-check Reaction
reduction, healing pools, Temporary Hit Point features, AC base formulas,
resistance traits, Breath Weapon attack replacement, Weapon Mastery
properties, spells, and magic items should not be mixed into the Deflect
Attacks implementation slice.

`QMBT61` remains necessary because the matrix lane is not complete and the
project needs a recurring stop to reconcile findings, update the PRD, and
append the next bounded batch rather than letting planning drift.

## Verification

- Active-plan consistency was checked across the Ralph task index, DAG rows,
  and task details for QMBT58-QMBT61.
- RAW/source review checked the local SRD 5.2.1 and `UBIQUITOUS_LANGUAGE.md`
  anchors listed in `Source Check`; QMBT58 did not model a new rule directly.
- PRD status notes were refreshed to reflect QMBT56-QMBT58, current matrix
  metrics, and the appended QMBT59-QMBT61 batch.
- `/simplify` round 1: kept the appended batch tied to the already selected
  Deflect Attacks implementation before another feature selection task.
- `/simplify` round 2: no important changes found; the batch still has one
  implementation task, one post-implementation feature selection task, and one
  recursive review.
- `pnpm unit-profile-coverage:check` remains the matrix gate if generated
  artifacts change; QMBT58 changed planning docs only.
- MBT not run: QMBT58 is planning-only and makes no promoted battle-runtime
  behavior change.
