# QMBT46 Recursive Unit Profile Planning Review

Date: 2026-05-07

## Decision

Do not declare the Unit profile matrix lane complete.

QMBT44 closed Ranger Roving as a supported executable Unit profile and QMBT45
selected Orc Relentless Endurance as the next narrow SRD feature widening
slice. The generated matrix still reports 27/45 supported executable Units, so
the next batch should implement Relentless Endurance, re-open feature-slice
selection against the refreshed matrix, and then run another recursive review.

Append:

- `QMBT47 - Promote Relentless Endurance Zero-Hit-Point Replacement`
- `QMBT48 - Select Next SRD Feature Widening Slice After Relentless Endurance`
- `QMBT49 - Recursive Unit Profile Planning Review`

## Reviewed Findings

- QMBT44 promoted `ranger_roving` as
  `unit-feature.passive-speed-kind-grants`, including QNT profile coverage,
  authored mechanics shape parsing, Climb Speed and Swim Speed movement and
  Dash behavior, deterministic admission/projection evidence, focused runtime
  parity, and refreshed matrix artifacts.
- QMBT45 selected `orc_relentless_endurance` as
  `unit-feature.zero-hit-point-replacement`. The selected boundary uses the
  existing zero-Hit-Point lifecycle and authored `triggered_replacement`
  mechanics shape rather than an authored-id registry or parallel
  death-prevention state.
- The current generated matrix reports 59 installed Units, 20 stable executable
  profiles, 27/45 supported executable Unit coverage, 27/27 deterministic
  admission/projection coverage, and 10/27 selected identity replay coverage.

## Source Check

QMBT46 did not model a new rule directly. It reviewed the RAW/source checks
already captured by QMBT44-QMBT45 and re-checked the local anchors that drive
the appended batch:

- `.references/srd-5.2.1/Classes/Ranger.md`, `Level 6: Roving`.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Speed`, `Changes to Your
  Speeds`, `Dash [Action]`, `Climb Speed`, and `Swim Speed`.
- `.references/srd-5.2.1/Character-Origins.md`, Orc `Relentless Endurance`.
- `.references/srd-5.2.1/Playing-the-Game.md`, `Damage and Healing`,
  `Dropping to 0 Hit Points`, `Instant Death`, `Falling Unconscious`, `Death
  Saving Throws`, `Healing`, and `Temporary Hit Points`.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Hit Points`, `Death Saving
  Throw`, `Healing`, `Long Rest`, `Stable`, and `Temporary Hit Points`.
- Additional candidate anchors checked by QMBT45: Barbarian and Monk
  `Unarmored Defense`, Paladin `Lay On Hands`, Ranger `Tireless`, Orc
  `Adrenaline Rush`, Dragonborn `Breath Weapon` and `Damage Resistance`, Dwarf
  `Dwarven Resilience`, and `Equipment.md` `Mastery Properties`.
- `UBIQUITOUS_LANGUAGE.md` anchors for Speed, Movement, Dash, Climb Speed,
  Swim Speed, Hit Points, Hit Point Maximum, Instant Death, Death Saving Throw,
  Unconscious, Stable, Healing, Temporary Hit Points, Pool, Quota, Spend, Long
  Rest, Armor Class, Unarmored Defense, Resistance, Damage Type, Weapon
  Mastery, Mastery Property, Cleave, Sap, and Topple.

## Next-Batch Rationale

`QMBT47` should directly implement the QMBT45 decision before broadening into
another feature family. Relentless Endurance is installed SRD Unit pressure with
one authored `triggered_replacement` mechanics shape. The implementation should
thread the optional replacement through the existing damage/drop-to-zero
boundary so current Hit Points, death-save state, killed-outright facts, and
Long Rest recharge remain single-source runtime facts.

`QMBT48` should run after QMBT47 refreshes the matrix because zero-Hit-Point
replacement will change species-trait and death-lifecycle pressure. Candidate
lanes remain distinct: AC base formulas, healing pools, Temporary Hit Points,
resistance traits, attack replacement, Weapon Mastery properties, spells, and
magic items should not be mixed into the Relentless Endurance implementation
slice.

`QMBT49` remains necessary because the matrix lane is not complete and the
project needs a recurring stop to reconcile findings, update the PRD, and
append the next bounded batch rather than letting planning drift.

## Verification

- Active-plan consistency was checked across the Ralph task index, DAG rows,
  and task details for QMBT46-QMBT49.
- reviewer loop round 1: kept the appended batch tied to the already selected
  Relentless Endurance implementation before another feature selection task.
- reviewer loop round 2: no important changes found; the batch still has one
  implementation task, one post-implementation feature selection task, and one
  recursive review.
- `pnpm unit-profile-coverage:check` remains the matrix gate if generated
  artifacts change; QMBT46 changed planning docs only.
- MBT not run: QMBT46 is planning-only and makes no promoted battle-runtime
  behavior change.
