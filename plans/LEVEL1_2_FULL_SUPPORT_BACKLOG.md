# Level 1-2 Full Support Backlog

This is the single active planning artifact for SRD level 1 plus level 2 full
support closure. Historical Ralph lanes for level-2 runtime expansion and
background catalog admission were deleted after their useful work landed.

Generated reports remain the measurement source of truth:

- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/level1-full-support.json`
- `plans/unit-profile-coverage/level1-2-full-support.json`

## Current Claim State

The strict runtime/profile target and SRD-authored full-support claim gate are
closed:

- Level 1 strict target closure: `94/94 (100%)`.
- Level 1-2 strict target closure: `171/171 (100%)`.
- Level 1 rules-kernel joins: `58/58 (100%)`.
- Level 1-2 rules-kernel joins: `90/90 (100%)`.
- Level 1 authored product readiness: `58/58 (100%)`.
- Level 1-2 authored product readiness: `76/76 (100%)`.
- Full-support claim gate: pass for both generated reports.

## Active Backlog

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L12FS-MAGIC-INITIATE-ORIGIN-FEATS",
      "status": "done",
      "title": "Resolve SRD Magic Initiate Origin Feat References"
    },
    {
      "number": 2,
      "id": "L12FS-ALERT-ORIGIN-FEAT-CATALOG",
      "status": "done",
      "title": "Resolve Alert Origin Feat Catalog Identity"
    },
    {
      "number": 3,
      "id": "L12FS-WARLOCK-PACT-MAGIC-RETAINED-GRANT",
      "status": "done",
      "title": "Resolve Warlock Pact Magic Level-1 Feature Grant"
    },
    {
      "number": 4,
      "id": "L12FS-FULL-SUPPORT-GATE-REFRESH",
      "status": "done",
      "title": "Refresh Level 1 And Level 1-2 Full-Support Gate"
    },
    {
      "number": 5,
      "id": "L12FS-METRIC-REGRESSION-GATE",
      "status": "ready-for-research",
      "title": "Add Full-Support Metric Regression Gate"
    },
    {
      "number": 6,
      "id": "L12FS-RECURSIVE-NEXT-TASKS",
      "status": "ready-for-research",
      "title": "Mine Remaining Level 1-2 Product Readiness Tasks"
    },
    {
      "number": 7,
      "id": "L12G-FOLLOWUP-ALERT-INITIATIVE-RUNTIME",
      "status": "ready-for-research",
      "title": "Alert Initiative Runtime Support"
    }
  ]
}
-->

Every Ralph prompt for this backlog must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`.

Ralph must run the reviewer loop until convergence: RAW traceability,
ubiquitous-language/domain-language, architecture/connascence, and code review.
Fix every reasonable finding, reject only with a concrete reason, and repeat
until no reasonable findings remain.

### Task 1 - L12FS-MAGIC-INITIATE-ORIGIN-FEATS - Resolve SRD Magic Initiate Origin Feat References

Status: `done`

Input:

- `.references/srd-5.2.1/Character-Origins.md`
- `.references/srd-5.2.1/Feats.md`
- `packages/surface/content/background_acolyte.json`
- `packages/surface/content/background_sage.json`
- Current Surface feat schema, Unit catalog wiring, character-creation
  finalization, and Unit profile coverage artifacts.

Output:

- Resolve both blocker rows:
  - `background_acolyte -> feat_magic_initiate_cleric`
  - `background_sage -> feat_magic_initiate_wizard`
- Prefer one domain model for Magic Initiate with typed spell-list choice or
  list specialization if that is the real Surface shape. Do not duplicate rule
  semantics just because the two background refs have different ids.
- Preserve authored SRD identity only at Surface/catalog/selection boundaries.
  Runtime code must use typed facts, support profiles, and spell-access
  procedure shapes rather than branching on feat names or ids.
- Add or update focused Surface, character-creation, and coverage tests.

Acceptance:

- The two Magic Initiate background origin feat refs resolve through the Unit
  catalog.
- Character finalization retains the selected background/feat facts without
  duplicating spell-access state.
- `pnpm unit-profile-coverage:check -- --write` and
  `pnpm unit-profile-coverage:check` pass.

### Task 2 - L12FS-ALERT-ORIGIN-FEAT-CATALOG - Resolve Alert Origin Feat Catalog Identity

Status: `done`

Input:

- `.references/srd-5.2.1/Character-Origins.md`
- `.references/srd-5.2.1/Feats.md`
- `packages/surface/content/background_criminal.json`
- `packages/surface/content/alert.json`
- Any duplicate Alert/feat Alert records or catalog rows.

Output:

- Resolve the blocker row:
  - `background_criminal -> alert`
- Remove the duplicate/not-installed catalog state. The Unit catalog should have
  exactly one canonical SRD Alert feat identity reachable by the Criminal
  background origin feat ref.
- If Alert has battle-runtime-relevant initiative or turn-order behavior that
  is not yet executable, split that behavior as a precise follow-up rather than
  blocking the authored product readiness ref.

Acceptance:

- Criminal's origin feat ref resolves through the Unit catalog.
- Duplicate Alert catalog rows are eliminated or made unrepresentable.
- Coverage artifacts report no `alert` authored-readiness blocker.

### Task 3 - L12FS-WARLOCK-PACT-MAGIC-RETAINED-GRANT - Resolve Warlock Pact Magic Level-1 Feature Grant

Status: `done`

Input:

- `.references/srd-5.2.1/Classes/Warlock.md`
- Current Warlock Surface class record and feature grants.
- Current spellcasting/pact-slot Character Sheet and Character Battle handoff
  owners.

Output:

- Resolve the blocker row:
  - `class_warlock -> warlock_pact_magic`
- Add or repair the retained level-1 Pact Magic feature Unit so Warlock's class
  feature grants resolve through the Unit catalog.
- Keep slot capacity, pact slot recovery, prepared/known spell access, and
  battle handoff facts single-source. Do not add parallel spell-slot or
  spell-access state if the Character Sheet owner already derives it.

Acceptance:

- Warlock level-1 feature grants resolve through the Unit catalog.
- Focused character creation/sheet tests cover the retained Pact Magic fact or
  prove it is already covered by existing tests.
- Coverage artifacts report no `warlock_pact_magic` authored-readiness blocker.

### Task 4 - L12FS-FULL-SUPPORT-GATE-REFRESH - Refresh Level 1 And Level 1-2 Full-Support Gate

Status: `done`

Depends on:

- Task 2.
- Task 3.

Input:

- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/level1-full-support.json`
- `plans/unit-profile-coverage/level1-2-full-support.json`

Output:

- Regenerate coverage artifacts after the three blockers are closed.
- Confirm both full-support claim gates are unblocked.
- If the checker still reports `battle-runtime-required`,
  `owner-evidence-required`, or `partial-battle-runtime` product-readiness rows
  that are not represented in the markdown claim gate, fix the checker/report
  shape before claiming 100%.

Acceptance:

- Level 1 authored product readiness is `58/58 (100%)`.
- Level 1-2 authored product readiness is `76/76 (100%)`.
- Full-support claim gate is unblocked for both reports.
- Rules-kernel joins remain green.

### Task 5 - L12FS-METRIC-REGRESSION-GATE - Add Full-Support Metric Regression Gate

Status: `ready-for-research`

Depends on:

- Task 4.

Input:

- `scripts/unit-profile-coverage-check.cjs`
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`
- current unit-profile coverage tests or checker fixtures

Output:

- Add or tighten focused checker coverage so a future report cannot claim full
  level support while SRD authored product readiness is blocked.
- Keep strict runtime/profile support and authored product readiness as separate
  layers; do not collapse them into one weighted percentage.
- If the checker already has this regression coverage, document the evidence in
  this task and mark it done without adding redundant tests.

Acceptance:

- A missing background origin feat, duplicated catalog identity, or missing
  retained class grant would fail the full-support claim gate in generated
  reports.
- `pnpm unit-profile-coverage:check` is green.

### Task 6 - L12FS-RECURSIVE-NEXT-TASKS - Mine Remaining Level 1-2 Product Readiness Tasks

Status: `ready-for-research`

Input:

- current `plans/unit-profile-coverage/level1-full-support.json`
- current `plans/unit-profile-coverage/level1-2-full-support.json`
- current `plans/unit-profile-coverage/unit-matrix.json`
- current `plans/unit-profile-coverage/unit-claims.jsonl`

Output:

- If level 1 or level 1-2 full-support claim gates are still blocked, add 3-8
  new atomic tasks to this plan with precise inputs, outputs, and acceptance.
- If both gates are unblocked and checker regression coverage is adequate, mark
  this task done with a short closeout note.
- Do not expand into level 3 or PHB+ unless the owner explicitly reopens that
  scope.

Acceptance:

- Ralph does not stop with hidden level 1/2 product-readiness blockers.
- New tasks are one-coding-session sized and do not duplicate QNT/MBT lanes.

### Task 7 - L12G-FOLLOWUP-ALERT-INITIATIVE-RUNTIME - Alert Initiative Runtime Support

Status: `ready-for-research`

This task is not a dependency of the level 1-2 authored product-readiness gate.
Alert is installed as the canonical SRD Origin feat identity for Criminal, but
its Initiative benefits remain an explicit runtime follow-up.

Input:

- `.references/srd-5.2.1/Feats.md`
- `UBIQUITOUS_LANGUAGE.md`
- `packages/surface/content/alert.json`
- Current battle-runtime Initiative setup, turn-order, and Character Battle
  admission owners.

Output:

- Promote Alert without authored-identity dispatch by projecting its typed
  Initiative roll Proficiency Bonus and the immediately-after-Initiative
  willing-ally Initiative Swap gate.
- Update the authoritative promoted Quint/runtime model before runtime behavior
  changes if Initiative setup or turn-order semantics change.
- Keep Proficiency Bonus, Initiative order, ally willingness, and Incapacitated
  state single-source; do not add duplicate runtime state beside existing
  character sheet or battle state facts.
- Regenerate Unit profile coverage artifacts so Alert moves from
  `unsupported-profile` to a supported or profile-subset-supported claim.

Acceptance:

- Focused runtime tests cover the Alert Initiative roll bonus and swap legality.
- Relevant promoted Quint/runtime parity verification passes if battle behavior
  changes.
- Coverage artifacts no longer report Alert as an unsupported profile.

## Follow-Up Splits Not Blocking The Current Claim Gate

The level 1-2 report still records six `blocked-follow-up-split` rows:

- `acid_arrow`
- `darkness`
- `druid_wild_shape`
- `enhance_ability`
- `moonbeam`
- `sorcerer_metamagic`

Under the current metric, these rows are closed for strict target closure
because the unresolved pieces are either later-level, split from a supported
subset, or outside the current battle-runtime claim. Do not start these from
this backlog unless the owner explicitly strengthens the metric to require
zero `blocked-follow-up-split` rows.

## Verification

Each implementation task must run:

- RAW/ubiquitous-language check against the cited local SRD files and
  `UBIQUITOUS_LANGUAGE.md`.
- Focused package tests for any changed Surface, character-creation,
  character-sheet, character-battle, or battle-runtime behavior.
- `pnpm unit-profile-coverage:check -- --write`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check` if any supported runtime profile,
  rules-kernel obligation, or parity owner changes.
- `git diff --check`
- Reviewer-loop convergence.
