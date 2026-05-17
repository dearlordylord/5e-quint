# QMBT43 Recursive Unit Profile Planning Review

Date: 2026-05-07

## Decision

Do not declare the Unit profile matrix lane complete.

QMBT40 closed Fast Movement as a supported executable Unit profile, QMBT41
selected Ranger Roving as the next narrow SRD feature widening slice, and
QMBT42 split Shield runtime behavior tests away from Unit profile admission
tests along RAW and ubiquitous-language boundaries. The generated matrix still
reports 26/44 supported executable Units, so the next batch should implement
Roving, re-open feature-slice selection against the refreshed matrix, and then
run another recursive review.

Append:

- `QMBT44 - Promote Roving Passive Speed Kind Grants`
- `QMBT45 - Select Next SRD Feature Widening Slice After Roving`
- `QMBT46 - Recursive Unit Profile Planning Review`

## Reviewed Findings

- QMBT40 promoted `barbarian_fast_movement` as
  `unit-feature.passive-speed-bonus`, including a QNT profile, production
  support from the authored `modify_speed` mechanics shape, effective Speed
  derivation for movement budget and Dash, deterministic admission/projection
  evidence, focused runtime parity, and refreshed matrix artifacts.
- QMBT41 selected `ranger_roving` as
  `unit-feature.passive-speed-kind-grants`. The selected boundary deliberately
  reuses Fast Movement's passive +10-foot Speed increase while not wearing
  Heavy armor, then widens only Climb Speed and Swim Speed grants equal to
  effective Speed.
- QMBT42 moved Shield runtime behavior assertions to a RAW-facing Shield
  Reaction spell test boundary, leaving Unit profile admission tests focused on
  support-profile and Spell Access projection smoke coverage.
- The current generated matrix reports 58 installed Units, 19 stable
  executable profiles, 26/44 supported executable Unit coverage, 26/26
  deterministic admission/projection coverage, and 10/26 selected identity MBT
  coverage.

## Source Check

QMBT43 did not model a new rule directly. It reviewed the RAW/source checks
already captured by the completed predecessor tasks and re-checked the local
anchors that drive the appended batch:

- `.references/srd-5.2.1/Classes/Barbarian.md`, `Level 5: Fast Movement`.
- `.references/srd-5.2.1/Classes/Ranger.md`, `Level 6: Roving`.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Speed`, `Changes to Your
  Speeds`, `Dash [Action]`, `Climb Speed`, and `Swim Speed`.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md`, `Shield`.
- `.references/srd-5.2.1/Rules-Glossary.md` and
  `.references/srd-5.2.1/Playing-the-Game.md`, `Reaction` and `Opportunity
  Attacks`.
- `UBIQUITOUS_LANGUAGE.md` anchors for Speed, Movement, Difficult Terrain,
  Action, Dash, Reaction, Opportunity Attack, Armor Class, Attack Roll, Spell
  Slot, Spell Access, Spell Invocation, Spell Effect, and Magic Action.

## Next-Batch Rationale

`QMBT44` should directly implement the QMBT41 decision before broadening into
another feature family. Roving is adjacent to Fast Movement but adds special
Speed kinds, so it should reuse the existing passive Speed-bonus projection and
then make Climb Speed and Swim Speed executable through the same effective
Speed derivation. The implementation task must not introduce per-Unit Speed
caches or an authored-id registry.

`QMBT45` should run after QMBT44 refreshes the matrix because Roving will
change movement-feature pressure and clarify whether the next narrow SRD
feature boundary should continue through movement, pivot to AC base
calculation alternatives, or select another domain. Candidate lanes remain
distinct: special Speed kinds, AC base formulas, healing pools, Temporary Hit
Points, resistance traits, attack replacement, and Weapon Mastery properties
should not be mixed into one slice.

`QMBT46` remains necessary because the matrix lane is not complete and the
project needs a recurring stop to reconcile findings, update the PRD, and
append the next bounded batch rather than letting planning drift.

## Verification

- Active-plan consistency was checked across the Ralph task index, DAG rows,
  and task details for QMBT43-QMBT46.
- reviewer loop round 1: kept the appended batch tied to the already selected
  Roving implementation before any further feature selection.
- reviewer loop round 2: no important changes found; the batch still has one
  implementation task, one post-implementation feature selection task, and one
  recursive review.
- MBT not run: QMBT43 is planning-only and makes no promoted battle-runtime
  behavior change.
