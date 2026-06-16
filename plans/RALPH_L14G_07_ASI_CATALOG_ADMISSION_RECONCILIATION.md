# L14G-07 ASI Catalog Admission Reconciliation

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L14G-07-ASI-CATALOG-ADMISSION-RECONCILIATION",
      "status": "ready-for-implementation",
      "title": "Reconcile level-4 ASI catalog admission"
    }
  ]
}
-->

Status: ready-for-implementation
Owner: Surface class records, Unit catalog/admission, and coverage checker
Depends on: L14G-06

## Residual

L14G-06 found that all twelve SRD class records have level-4 Ability Score Improvement pressure, but the Unit catalog installs only Fighter, Paladin, Warlock, and Wizard class-specific ASI rows. Barbarian, Bard, Cleric, Druid, Monk, Ranger, Rogue, and Sorcerer ASI rows are authored pressure but not installed.

## Source Artifacts

- `plans/unit-profile-coverage/L14G_06_LEVEL4_REACHABLE_UNIT_FULL_AUDIT.md`
- `plans/unit-profile-coverage/level1-4-full-support.json`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `.references/srd-5.2.1/Classes/*.md` level-4 Ability Score Improvement anchors
- `.references/srd-5.2.1/Feats.md` Ability Score Improvement
- `UBIQUITOUS_LANGUAGE.md` Ability Score Improvement and Character Sheet terms

## Expected Output

- All twelve class-specific level-4 ASI Unit identities are either installed as selection-grant containers or the duplicated class-specific identities are removed in favor of one canonical domain shape.
- The generated level1-4 coverage artifacts no longer report class-specific ASI records as authored pressure but not installed.
- No per-class duplicate battle behavior is introduced; selected feat/projection rows own executable behavior.

## Acceptance

- Invalid state is unrepresentable: the catalog cannot simultaneously expose an authored class-specific ASI row and omit its Unit admission without a typed reason.
- The checker derives ASI closure from catalog/progression facts, not from a prose allowlist.
- SRD identity only is used; no PHB+ feat identity is introduced.

## Verification

- Read the relevant SRD ASI and class table anchors before implementation.
- Run reviewer-loop convergence after implementation: RAW traceability, ubiquitous-language/domain, architecture/connascence, and code-review passes; fix every reasonable finding and repeat until no reasonable findings remain.
- Run `pnpm unit-profile-coverage:check:self-test`.
- Run `pnpm unit-profile-coverage:check`.
- Run `git diff --check`.
