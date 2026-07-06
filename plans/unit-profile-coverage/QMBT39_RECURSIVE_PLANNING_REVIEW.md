# QMBT39 Recursive Unit Profile Planning Review

Date: 2026-05-07

## Decision

Do not declare the Unit profile matrix lane complete.

QMBT37 closed the selected level-5 Extra Attack implementation slice, and
QMBT38 selected `barbarian_fast_movement` as the next bounded SRD feature
widening slice. The generated matrix still reports 25/43 supported executable
Units, so the next batch should implement Fast Movement, re-open feature-slice
selection against the refreshed matrix, and then run another recursive review.

Append:

- `QMBT40 - Promote Fast Movement Passive Speed Bonus`
- `QMBT41 - Select Next SRD Feature Widening Slice After Fast Movement`
- `QMBT42 - Recursive Unit Profile Planning Review`

## Reviewed Findings

- QMBT37 promoted level-5 Fighter, Paladin, and Ranger Extra Attack as
  `unit-feature.attack-action-attack-count-scaling`, including authored
  `scale_attack_count` / `additional: 1` support projection, one extra
  ordinary attack slot inside the Attack action, Movement between attack slots,
  End Turn cleanup for unspent attack slots, deterministic admission evidence,
  focused runtime parity, and refreshed matrix artifacts.
- QMBT38 selected `barbarian_fast_movement` as the next bounded SRD feature
  slice. The selected profile is `unit-feature.passive-speed-bonus`: a
  +10-foot Speed increase while not wearing Heavy armor, with movement budget
  and Dash derived from effective Speed.
- The current generated matrix reports 57 installed Units, 18 stable
  executable profiles, 25/43 supported executable Unit coverage, 25/25
  deterministic admission/projection coverage, and 10/25 selected identity replay
  coverage.

## Source Check

QMBT39 did not model a new rule directly. It reviewed the RAW/source checks
already captured by the two completed predecessor tasks:

- QMBT37 used QMBT35/QMBT36's local SRD checks for Fighter, Paladin, and Ranger
  Extra Attack, Attack action sequencing, movement between attacks, turn
  action/movement rules, and multiclass Extra Attack non-stacking.
- QMBT38 checked local SRD Barbarian Fast Movement, Speed, Dash, and Changes to
  Your Speeds passages, plus candidate boundaries for Roving, Unarmored
  Defense, Lay On Hands, Tireless, Adrenaline Rush, Dragonborn traits,
  resistance traits, and Weapon Mastery properties.
- QMBT38 also checked `UBIQUITOUS_LANGUAGE.md` anchors for Speed, Movement,
  Action, Dash, Unarmored Defense, Armor Class, Hit Points, Temporary Hit
  Points, Pool, Quota, Spend, Resistance, Damage Type, Weapon Mastery, Mastery
  Property, Cleave, and Topple.

## Next-Batch Rationale

`QMBT40` should directly implement the QMBT38 decision before broadening into
another feature family. Fast Movement is a passive class-feature Speed increase
conditioned on not wearing Heavy armor. The implementation task should keep
Speed capacity distinct from movement spent, feed effective Speed into turn
movement budget and Dash derivation, and use production support projection from
the authored mechanics shape rather than authored-id dispatch.

`QMBT41` should run after QMBT40 refreshes the matrix because Fast Movement
will change feature pressure and clarify whether the next narrow SRD feature
boundary should continue into Roving special Speed kinds or pivot to another
domain. Candidate lanes remain distinct: special Speed kinds, AC base
calculation alternatives, healing or Temporary Hit Point resources, resistance
traits, attack replacement, and Weapon Mastery properties should not be mixed
into one slice.

## Verification

- Active-plan consistency was checked across the Ralph task index, DAG rows,
  and task details for QMBT39-QMBT42.
- `pnpm unit-profile-coverage:check` passed.
- reviewer loop round 1: kept the appended batch tied to the already selected
  Fast Movement implementation before any further feature selection.
- reviewer loop round 2: no important changes found; the batch still has one
  implementation task, one post-implementation feature selection task, and one
  recursive review.
- MBT not run: QMBT39 is planning-only and makes no promoted battle-runtime
  behavior change.
