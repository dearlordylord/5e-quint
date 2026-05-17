# QMBT36 Recursive Unit Profile Planning Review

Date: 2026-05-07

## Decision

Do not declare the Unit profile matrix lane complete.

QMBT34 and QMBT35 closed the planned Mass Cure Wounds implementation and Extra
Attack feature-slice selection. The generated matrix still reports 22/40
supported executable Units, so the next batch should implement the selected
Extra Attack sequencing slice, then re-open feature-slice selection against the
remaining SRD pressure.

Append:

- `QMBT37 - Promote Level 5 Extra Attack Sequencing`
- `QMBT38 - Select Next SRD Feature Widening Slice After Extra Attack`
- `QMBT39 - Recursive Unit Profile Planning Review`

## Reviewed Findings

- QMBT34 promoted `mass_cure_wounds` as `spell.hit-point-restoration`,
  including point-origin 30-foot-radius Sphere target selection, up to six
  creature targets, Magic Action casting, minimum level-5 Spell Slot spend,
  slot scaling, deterministic admission/projection evidence, focused spell
  runtime parity, and refreshed matrix artifacts.
- QMBT35 selected level-5 `fighter_extra_attack`, `paladin_extra_attack`, and
  `ranger_extra_attack` as the next bounded SRD feature widening slice. The
  selected profile is `unit-feature.attack-action-attack-count-scaling` for the
  authored passive `scale_attack_count` / `additional: 1` shape.
- The current generated matrix reports 54 installed Units, 17 stable
  executable profiles, 22/40 supported executable Unit coverage, 22/22
  deterministic admission/projection coverage, and 10/22 selected identity MBT
  coverage.

## Source Check

QMBT36 did not model a new rule directly. It reviewed the RAW/source checks
already captured by the two completed predecessor tasks:

- QMBT34 checked local SRD Mass Cure Wounds, Area of Effect, Sphere, Target,
  Spell Definition, Spell Access, Spell Invocation, Spell Effect, Casting Time,
  Spell Slots, and Hit Points anchors.
- QMBT35 checked local SRD Fighter, Paladin, and Ranger Extra Attack passages,
  Attack action, movement between attacks, turn action/movement rules, and
  multiclass Extra Attack non-stacking.
- QMBT35 also checked `UBIQUITOUS_LANGUAGE.md` anchors for Multiattack,
  Speed/Movement, Unarmored Defense/Armor Class, Hit Points/Temporary Hit
  Points, Pool/Quota/Spend, Resistance/Damage Type, and Weapon Mastery terms.

## Next-Batch Rationale

`QMBT37` should directly implement the QMBT35 decision before broadening into
another feature family. Extra Attack is a class-feature modifier to the ordinary
Attack action, not Stat Block Multiattack, a Bonus Action attack, two-weapon
fighting, Nick, Cleave, or Dragonborn Breath Weapon attack replacement. The
implementation task should keep the public profile named for attack-count
scaling and use production support projection from the authored mechanics
shape rather than authored-id dispatch.

`QMBT38` should run after QMBT37 refreshes the matrix because Extra Attack will
change the unsupported/widening pressure denominator and may clarify which
remaining SRD feature boundary is narrowest. Candidate lanes remain
domain-distinct: speed projection, AC base calculation alternatives, healing or
Temporary Hit Point resources, resistance traits, Weapon Mastery properties,
and area/attack replacement traits should not be mixed into one slice.

## Verification

- Active-plan consistency was checked across the Ralph task index, DAG rows,
  and task details for QMBT36-QMBT39.
- `pnpm unit-profile-coverage:check` passed.
- reviewer loop round 1: kept the appended batch tied to the already selected
  Extra Attack implementation before any further feature selection.
- reviewer loop round 2: no important changes found; the batch still has one
  implementation task, one post-implementation feature selection task, and one
  recursive review.
- MBT not run: QMBT36 is planning-only and makes no promoted battle-runtime
  behavior change.
