# QMBT64 Recursive Unit Profile Planning Review

Date: 2026-05-07

## Decision

Do not declare the Unit profile matrix lane complete.

QMBT62 closed Fighter `Tactical Mind` as a supported executable Unit profile,
and QMBT63 selected Bard `Cutting Words` as the next narrow SRD feature
widening slice. The generated matrix still reports 32/45 supported executable
Units. The lane has explicit `needs-surface-widening` pressure for
`bard_cutting_words`, `fire_bolt`, and `thunderwave`, plus unsupported catalog
pressure that remains visible in generated matrix/report artifacts.

The `master` plan removed the class catalog planning task from the runnable
Ralph queue before this decision was applied. Preserve that queue shape and
append:

- `QMBT65 - Promote Cutting Words Ability Check Reaction Reduction`
- `QMBT66 - Recursive Unit Profile Planning Review`

## Reviewed Findings

- QMBT62 promoted `fighter_tactical_mind` as
  `unit-feature.failed-ability-check-resource-boost`, keeping the
  already-rolled failed Ability Check boundary, existing Second Wind pool,
  `1d10` boost, converted-success spend, and still-failed no-spend behavior in
  one profile.
- QMBT62 refreshed matrix artifacts to 59 installed Units, 25 stable
  executable profiles, 32/45 supported executable Unit coverage, 32/32
  deterministic admission/projection coverage, and 10/32 selected identity MBT
  coverage.
- QMBT63 selected `bard_cutting_words` as the next narrow feature-style
  widening slice. The selected boundary is the missing Ability Check branch of
  the existing `unit-feature.reaction-roll-or-damage-reduction` profile, not a
  Cutting Words-only profile or a second Bardic Inspiration pool.

## Source Check

QMBT64 did not model a new rule directly. It reviewed the RAW/source checks
already captured by QMBT62-QMBT63 and re-checked the local anchors that drive
the appended batch:

- `.references/srd-5.2.1/Classes/Fighter.md`, `Second Wind` and `Tactical
  Mind`.
- `.references/srd-5.2.1/Classes/Bard.md`, `Bardic Inspiration`, `Font of
  Inspiration`, and `Cutting Words`.
- `.references/srd-5.2.1/Playing-the-Game.md`, `D20 Tests`, `Ability Checks`,
  `Difficulty Class`, `Proficiency`, and `Reactions`.
- `.references/srd-5.2.1/Rules-Glossary.md`, `Ability Check`, `D20 Test`,
  `Difficulty Class`, `Reaction`, and `Proficiency`.
- `UBIQUITOUS_LANGUAGE.md` anchors for Ability Check, Reaction, Pool, Spend,
  Refund, Proficiency Bonus, Hit Points, Attack Roll, Damage Type, Armor Class,
  Unarmored Defense, Resistance, Temporary Hit Points, Magic Action, Weapon
  Mastery, and Mastery Property.

## Next-Batch Rationale

`QMBT65` should directly implement the QMBT63 Cutting Words decision before
broadening into another feature family. The implementation should extend the
existing reaction roll-or-damage reduction profile for the Ability Check
branch, reuse the existing Bardic Inspiration pool and die-size derivation, and
accept table/caller-supplied facts for the already-rolled successful Ability
Check. Runtime must not decide whether the check is warranted, what the DC is,
or whether a proficiency applies.

`QMBT66` remains necessary because the matrix lane is not complete and the
project needs a recurring stop to reconcile QMBT65 findings, refresh the PRD,
and append the next bounded batch rather than letting planning drift. Unlike
this QMBT64 review, QMBT66 should not default to one implementation task plus
one review task. It should append the largest coherent group whose tasks are
similar enough to run without re-planning between each item, and justify any
single-task batch as a boundary/uncertainty exception.

## QMBT65 Refinements

QMBT65 is the correct next implementation task. The review adds these
clarifications:

- Extend `unit-feature.reaction-roll-or-damage-reduction`; do not create a
  Cutting Words-only profile.
- Reuse the existing Bardic Inspiration pool and die-size derivation. Do not
  duplicate class-level resource state for the Ability Check branch.
- Keep Ability Check facts caller-supplied and already rolled. Do not model GM
  check warranting, DC derivation, skill/tool proficiency decisions, or generic
  D20 Test reaction reduction in this slice.
- Preserve existing `needs-surface-widening` rows outside the selected slice,
  including `fire_bolt` and `thunderwave`, until they become supported, closed
  by assumption, or deliberately removed as content cleanup.
- Keep class catalog backlog planning out of QMBT65 because that task was
  removed from the active Ralph queue before this review landed.

## Verification

- Active-plan consistency was checked across the Ralph task index, DAG rows,
  and task details for QMBT64-QMBT66.
- RAW/source review checked the local SRD 5.2.1 and `UBIQUITOUS_LANGUAGE.md`
  anchors listed in `Source Check`; QMBT64 did not model a new rule directly.
- PRD status notes were refreshed to reflect QMBT62-QMBT64, current matrix
  metrics, and the appended QMBT65-QMBT66 batch.
- reviewer loop round 1: removed the stale class catalog task from the appended
  batch to preserve the current active-plan queue shape, keeping QMBT65 focused
  on the already selected Cutting Words implementation.
- reviewer loop round 2: no important changes found; the batch still has one
  selected implementation task and one recursive review task. This is accepted
  for QMBT64 only because QMBT63 had already selected exactly one next slice;
  QMBT66 has a stricter obligation to mine QMBT65 findings and append a
  coherent multi-task batch where confidence permits.
- `pnpm unit-profile-coverage:check` remains the matrix gate if generated
  artifacts change; QMBT64 changed planning docs only.
- MBT not run: QMBT64 is planning-only and makes no promoted battle-runtime
  behavior change.
