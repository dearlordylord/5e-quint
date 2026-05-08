# QMBT66 Recursive Unit Profile Planning Review

Date: 2026-05-07

## Decision

Do not declare the Unit profile matrix lane complete.

QMBT65 closed Bard `Cutting Words` as a supported
`unit-feature.reaction-roll-or-damage-reduction` Unit with the successful
Ability Check branch promoted through caller-supplied already-rolled facts. The
matrix still reports 33/45 supported executable Units, and the runtime now has
several explicit TODOs documenting SRD-specific mechanic derivations that should
move out of generic reducers before the next widening family grows the same
pattern.

Append the next coherent batch as projection cleanup for already-supported SRD
profiles:

- `QMBT67 - Project Bardic Inspiration Reaction Reduction Facts`
- `QMBT68 - Project Monk Deflect Attacks Redirect Facts`
- `QMBT69 - Recursive Unit Profile Planning Review`

This is a multi-task batch because QMBT65 confirmed the same class-specific
formula smell across multiple supported profiles: the reducers are executing
correct SRD behavior, but they still derive Bardic Inspiration die sizes, Focus
Point costs, Martial Arts die sizes, and Monk Focus save DCs from class identity.
Those are runtime projection facts, not generic reducer formulas.

## Reviewed Findings

- QMBT65 reused the existing reaction roll-or-damage reduction profile and the
  existing Bardic Inspiration pool. That avoided duplicated state, but it also
  showed that the reducer still derives Bardic Inspiration die scaling instead
  of receiving an executable reduction-die fact from the supported profile
  projection.
- QMBT65 preserved caller-supplied Ability Check facts. The same boundary
  should stay intact while the reaction reducer stops knowing the Bard-specific
  die table.
- Existing Deflect Attacks support has the same projection shape problem:
  reducer-side Focus Point display text, Monk Focus save DC derivation, and
  Martial Arts die derivation are currently tolerated SRD mechanic exceptions
  under `packages/surface/README.md`, but the README says those should
  eventually become generic executable facts.
- This review does not select a new unsupported Unit family yet. AC formulas,
  healing/resource pools, resistance traits, Breath Weapon, Weapon Mastery, and
  spell/magic-item intake remain distinct lanes. Projection cleanup should make
  the next widening slice less likely to add another reducer-local class formula.

## Source Check

QMBT66 does not model a new rule directly. It reviewed the QMBT65 RAW/source
checks and re-checked the local anchors for the projection cleanup batch:

- `.references/srd-5.2.1/Classes/Bard.md`, `Bardic Inspiration`, `Font of
  Inspiration`, and `Cutting Words`: the Bardic Inspiration pool, level-scaled
  Bardic die, Reaction spend, and reduction branches are SRD facts that the
  projection may carry as executable data.
- `.references/srd-5.2.1/Classes/Monk.md`, `Monk's Focus`, `Martial Arts`, and
  `Deflect Attacks`: Focus Point cost, Short/Long Rest recovery, Monk Focus save
  DC, Martial Arts die size, redirect target gate, Dexterity save, and same-type
  redirected damage are SRD facts that the projection may carry as executable
  data.
- `.references/srd-5.2.1/Playing-the-Game.md`, `D20 Tests`, `Ability Checks`,
  `Difficulty Class`, `Reactions`, `Damage Rolls`, and `Saving Throws`.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Armor Class`, `Difficulty Class`,
  `Reaction`, and `Saving Throw`.
- `UBIQUITOUS_LANGUAGE.md` anchors for Ability Check, Attack Roll, Damage Roll,
  Saving Throw, Difficulty Class, Reaction, Pool, Spend, Armor Class, Unarmored
  Defense, Weapon Mastery, and Mastery Property.

## Next-Batch Rationale

`QMBT67` should project Bardic Inspiration reaction-reduction facts before the
reaction reducer executes them. Keep authored SRD ids and mechanic names in
authored content, provenance comments, and projection tests where they are the
source facts. The reducer should consume generic reduction resource cost and die
expression facts for Cutting Words attack-roll, Ability Check, and damage-roll
reduction branches without deriving Bard class level thresholds.

`QMBT68` should apply the same projection discipline to Monk Deflect Attacks.
The reducer should consume generic resource-spend, redirect save DC, redirect
damage dice expression, damage ability modifier, and inherited damage-type facts
instead of deriving Focus Point, Martial Arts die, or Monk Focus save DC facts
from class identity. It should preserve the existing supported
`unit-feature.attack-damage-reduction-zero-damage-redirect` behavior.

`QMBT69` is required because the Unit profile matrix lane remains open. It
should review QMBT67-QMBT68 findings, refresh the PRD, and then choose the next
coherent widening or cleanup batch. AC/base-formula work is a strong candidate
after projection cleanup because Barbarian and Monk Unarmored Defense have been
repeatedly deferred for one-formula-at-a-time semantics, but QMBT69 should use
the refreshed evidence rather than pre-committing that choice here.

## Verification

- Active-plan consistency was checked across the Ralph task index, DAG rows,
  and task details for QMBT66-QMBT69.
- RAW/source review checked the local SRD 5.2.1 and
  `UBIQUITOUS_LANGUAGE.md` anchors listed in `Source Check`; QMBT66 did not
  model a new rule directly.
- PRD status notes were refreshed to reflect QMBT66 and the appended
  projection-cleanup batch.
- `/simplify` round 1: kept the next batch on projection cleanup rather than
  mixing it with AC formulas, healing pools, resistance traits, Breath Weapon,
  Weapon Mastery, spells, magic items, or content cleanup.
- `/simplify` round 2: split the projection cleanup by existing supported
  profile family: Bardic Inspiration reaction reductions first, Monk Deflect
  Attacks redirect facts second, then a recursive review. This preserves a
  repeatable pattern without forcing one task to touch every SRD mechanic TODO
  in the reducers.
- `pnpm unit-profile-coverage:check` remains the matrix gate if generated
  artifacts change; QMBT66 changed planning docs only.
- MBT not run: QMBT66 is planning-only and makes no promoted battle-runtime
  behavior change.
