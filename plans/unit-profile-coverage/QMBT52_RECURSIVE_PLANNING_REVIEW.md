# QMBT52 Recursive Unit Profile Planning Review

Date: 2026-05-07

## Decision

Do not declare the Unit profile matrix lane complete.

QMBT47 closed Orc Relentless Endurance as a supported executable Unit profile,
QMBT48 selected Orc Adrenaline Rush as the next narrow SRD feature widening
slice, QMBT49 extracted shared Speed and Movement cost algebras, QMBT50 removed
duplicated Archery and Extra Attack support-profile payload facts, and QMBT51
structured promoted spell invocation identity and resource access. The
generated matrix still reports 28/45 supported executable Units, so the next
batch should implement Adrenaline Rush, re-open feature-slice selection against
the refreshed matrix, and then run another recursive review.

Append:

- `QMBT53 - Promote Adrenaline Rush Bonus Action Dash Temporary Hit Points`
- `QMBT54 - Select Next SRD Feature Widening Slice After Adrenaline Rush`
- `QMBT55 - Recursive Unit Profile Planning Review`

## Reviewed Findings

- QMBT47 promoted `orc_relentless_endurance` as
  `unit-feature.zero-hit-point-replacement`, using the existing
  zero-Hit-Point lifecycle, authored `triggered_replacement` mechanics shape
  parsing, deterministic admission evidence, focused runtime parity, and
  refreshed matrix artifacts.
- QMBT48 selected `orc_adrenaline_rush` as a Bonus Action Dash coupled
  Temporary Hit Point Unit-feature slice. The selected boundary intentionally
  keeps Dash, Temporary Hit Points, Proficiency Bonus uses, and Short/Long Rest
  refresh as one executable profile rather than independent markers that could
  diverge.
- QMBT49 extracted shared Speed capacity and Movement cost algebras into
  `@dnd/shared-algebras` and refactored promoted Roving/Fast Movement
  behavior to use those algebras while keeping battle legality and spatial
  facts local.
- QMBT50 structured Archery and level-5 Extra Attack support-profile payloads
  so reducer behavior reads parsed `+2` and `additionalAttacks: 1` facts
  instead of reconstructing them from marker presence.
- QMBT51 replaced encoded spell act identity with structured spell invocation
  refs, cast/Ready subject modes, branded `SpellId`, and constrained
  access/resource/procedure-shaped supported invocations for the current
  prepared Spell Slot, Shield, and class cantrip lanes.
- The current generated matrix reports 59 installed Units, 21 stable
  executable profiles, 28/45 supported executable Unit coverage, 28/28
  deterministic admission/projection coverage, and 10/28 selected identity MBT
  coverage.

## Source Check

QMBT52 did not model a new rule directly. It reviewed the RAW/source checks
already captured by QMBT47-QMBT51 and re-checked the local anchors that drive
the appended batch:

- `.references/srd-5.2.1/Character-Origins.md`, Orc `Adrenaline Rush` and
  `Relentless Endurance`.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Dash [Action]`, `Speed`,
  `Changes to Your Speeds`, `Temporary Hit Points`, `Proficiency Bonus`,
  `Short Rest`, and `Long Rest`.
- `.references/srd-5.2.1/Playing-the-Game.md`, `Temporary Hit Points`, `Damage
  and Healing`, `Dropping to 0 Hit Points`, `Healing`, and action timing
  anchors relevant to Dash and Bonus Action routing.
- QMBT49 anchors for Speed capacity and Movement cost: `Difficult Terrain`,
  `Climbing`, `Climb Speed`, `Swimming`, `Swim Speed`, and
  `Movement and Position`.
- QMBT50 anchors for Archery and Extra Attack payload facts.
- QMBT51 anchors for Spell Access, Spell Invocation, Spell Slots, cantrips,
  Casting Time, Bonus Action, Reaction, Ready spell, and spell ownership
  terminology.
- `UBIQUITOUS_LANGUAGE.md` anchors for Action, Bonus Action, Movement, Speed,
  Dash, Temporary Hit Points, Hit Points, Healing, Pool, Quota, Spend, Short
  Rest, Long Rest, Spell Definition, Spell Access, Spell Invocation, Spell
  Effect, and the candidate boundaries that QMBT48 deferred.

## Next-Batch Rationale

`QMBT53` should directly implement the QMBT48 decision before broadening into
another feature family. Adrenaline Rush is installed SRD species-trait pressure
with one authored `activation` mechanics shape. The implementation should
reuse the existing Dash and Bonus Action runtime boundary, shared Speed and
Movement algebras from QMBT49, and the existing Temporary Hit Point
keep-or-replace rule rather than creating a parallel movement or Hit Point
state.

`QMBT54` should run after QMBT53 refreshes the matrix because Adrenaline Rush
will change species-trait, Bonus Action movement, Temporary Hit Point, and
resource-pool pressure. Candidate lanes remain distinct: Temporary Hit Point
features, healing pools, AC base formulas, resistance traits, attack
replacement, Weapon Mastery properties, spells, and magic items should not be
mixed into the Adrenaline Rush implementation slice.

`QMBT55` remains necessary because the matrix lane is not complete and the
project needs a recurring stop to reconcile findings, update the PRD, and
append the next bounded batch rather than letting planning drift.

## Verification

- Active-plan consistency was checked across the Ralph task index, DAG rows,
  and task details for QMBT52-QMBT55.
- RAW/source review checked the local SRD 5.2.1 and `UBIQUITOUS_LANGUAGE.md`
  anchors listed in `Source Check`; QMBT52 did not model a new rule directly.
- PRD status notes were refreshed to reflect QMBT47-QMBT52, current matrix
  metrics, and the appended QMBT53-QMBT55 batch.
- reviewer loop round 1: kept the appended batch tied to the already selected
  Adrenaline Rush implementation before another feature selection task.
- reviewer loop round 2: no important changes found; the batch still has one
  implementation task, one post-implementation feature selection task, and one
  recursive review.
- `pnpm unit-profile-coverage:check` remains the matrix gate if generated
  artifacts change; QMBT52 changed planning docs only.
- MBT not run: QMBT52 is planning-only and makes no promoted battle-runtime
  behavior change.
