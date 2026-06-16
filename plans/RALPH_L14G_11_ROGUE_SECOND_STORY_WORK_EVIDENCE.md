# L14G-11 Rogue Second-Story Work Evidence

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L14G-11-ROGUE-SECOND-STORY-WORK-EVIDENCE",
      "status": "ready-for-implementation",
      "title": "Add Rogue Second-Story Work owner evidence"
    }
  ]
}
-->

Status: ready-for-implementation
Owner: Character-sheet Speed and jump projection evidence
Depends on: L14G-06

## Residual

L14G-06 found Rogue Second-Story Work as a level-3 diagnostic residual. The row needs checker-readable owner evidence for Climb Speed equal to Speed and for using Dexterity in jump-distance calculations.

## Source Artifacts

- `plans/unit-profile-coverage/L14G_06_LEVEL4_REACHABLE_UNIT_FULL_AUDIT.md`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `.references/srd-5.2.1/Classes/Rogue.md`
- Movement and jumping rules under `.references/srd-5.2.1/Playing-the-Game.md` and/or `.references/srd-5.2.1/Rules-Glossary.md`
- `UBIQUITOUS_LANGUAGE.md` Character Sheet and Ability Check terms

## Expected Output

- Checker-readable evidence identifies the owner that derives Climb Speed from existing Speed.
- Jump-distance ability substitution is modeled as a projection from the relevant ability fact, not as duplicated jump-distance state.
- The product-readiness checker can close `rogue_second_story_work` without a prose exception.

## Acceptance

- `rogue_second_story_work` no longer appears as owner-evidence-required after coverage regeneration.
- Changing base Speed cannot leave a stale Climb Speed copy behind.
- Jump substitution is represented by typed rule/projection facts rather than name-based dispatch on the Rogue feature.

## Verification

- Read the relevant SRD Rogue and movement/jumping anchors before implementation.
- Run reviewer-loop convergence after implementation: RAW traceability, ubiquitous-language/domain, architecture/connascence, and code-review passes; fix every reasonable finding and repeat until no reasonable findings remain.
- Run `pnpm unit-profile-coverage:check:self-test`.
- Run `pnpm unit-profile-coverage:check`.
- Run `git diff --check`.
