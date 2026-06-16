# L14G-08 Level-4 Feat Choice Catalog Denominator

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L14G-08-LEVEL4-FEAT-CHOICE-CATALOG-DENOMINATOR",
      "status": "ready-for-research",
      "title": "Reconcile the level-4 feat-choice catalog denominator"
    }
  ]
}
-->

Status: ready-for-research
Owner: Surface feat catalog, feat-choice/character creation owner, and Unit matrix
Depends on: L14G-06; coordinates with L14G-07 and L14G-12

## Residual

L14G-06 found SRD feat identities reachable or retained by level 4 that are not present in the current Surface/Unit denominator: Magic Initiate (Druid), Skilled, Grappler, Great Weapon Fighting, and Two-Weapon Fighting. Existing generated rows already cover Alert, Magic Initiate (Cleric), Magic Initiate (Wizard), Savage Attacker, Ability Score Improvement, Archery, and Defense.

## Source Artifacts

- `plans/unit-profile-coverage/L14G_06_LEVEL4_REACHABLE_UNIT_FULL_AUDIT.md`
- `.references/srd-5.2.1/Feats.md`
- `.references/srd-5.2.1/Character-Origins.md`
- Class Fighting Style and ASI anchors under `.references/srd-5.2.1/Classes/`
- `UBIQUITOUS_LANGUAGE.md` Ability Score Improvement, Character Sheet, Spell Access, and Weapon Mastery terms

## Expected Output

- The Surface/Unit denominator explicitly represents every SRD feat identity selectable or retained by level 4, including prerequisites and repeatability where the SRD defines them.
- Magic Initiate spell-list variants remain typed spell-access choices; do not collapse Cleric, Druid, and Wizard list provenance into one authored id.
- Feat-choice availability is represented by parsed feat facts and prerequisites, not by runtime dispatch on feat names.

## Acceptance

- Missing SRD feat identities above either have Surface content plus Unit rows or a documented typed exclusion that makes them unreachable in this repo's supported level1-4 product scope.
- Generated coverage exposes the same denominator that the character-creation feat choice UI/runtime can select from.
- No PHB+ feat ids, names, examples, or page references are introduced.

## Verification

- Read the SRD Feats and relevant class/origin anchors before implementation.
- Run reviewer-loop convergence after implementation: RAW traceability, ubiquitous-language/domain, architecture/connascence, and code-review passes; fix every reasonable finding and repeat until no reasonable findings remain.
- Run `pnpm unit-profile-coverage:check:self-test`.
- Run `pnpm unit-profile-coverage:check`.
- Run `git diff --check`.
