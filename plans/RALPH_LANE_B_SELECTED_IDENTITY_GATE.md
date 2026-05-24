# Ralph Lane B - Selected Identity Gate

Purpose: make the Unit-profile metric harder to lie to by requiring supported
SRD Units to prove selected authored identity reaches the relevant runtime or
creation entrypoint. This lane owns metric honesty, not new spell mechanics.

Hard workload rule: this lane is underloaded if it completes before at least 15
tasks land. The recursive task must append at least 12 new atomic runnable tasks
or prove that every supported/profile-subset-supported Unit has selected
identity evidence or an explicit non-applicable classification.

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "B1-SELECTED-IDENTITY-GAP-REPORT",
      "status": "done",
      "title": "Generate selected-identity gap report"
    },
    {
      "number": 2,
      "id": "B2-EVIDENCE-SCHEMA-CHECK",
      "status": "done",
      "title": "Tighten selected-identity evidence validation"
    },
    {
      "number": 3,
      "id": "B3-HARD-GATE-SELF-TEST",
      "status": "ready-for-implementation-after-light-research",
      "title": "Add hard-gate self-test for missing identity evidence"
    },
    {
      "number": 4,
      "id": "B4-CLASS-FEATURE-IDENTITY-BATCH-1",
      "status": "ready-for-implementation-after-light-research",
      "title": "Backfill class-feature identity evidence batch 1"
    },
    {
      "number": 5,
      "id": "B5-CLASS-FEATURE-IDENTITY-BATCH-2",
      "status": "ready-for-implementation-after-light-research",
      "title": "Backfill class-feature identity evidence batch 2"
    },
    {
      "number": 6,
      "id": "B6-CLASS-FEATURE-IDENTITY-BATCH-3",
      "status": "ready-for-implementation-after-light-research",
      "title": "Backfill class-feature identity evidence batch 3"
    },
    {
      "number": 7,
      "id": "B7-FEAT-IDENTITY-BATCH",
      "status": "ready-for-implementation-after-light-research",
      "title": "Backfill feat identity evidence"
    },
    {
      "number": 8,
      "id": "B8-LEVEL1-SPELL-IDENTITY-BATCH",
      "status": "ready-for-implementation-after-light-research",
      "title": "Backfill level-1 spell identity evidence"
    },
    {
      "number": 9,
      "id": "B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH",
      "status": "ready-for-implementation-after-light-research",
      "title": "Backfill level-2 damage spell identity evidence"
    },
    {
      "number": 10,
      "id": "B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH",
      "status": "ready-for-implementation-after-light-research",
      "title": "Backfill level-2 control spell identity evidence"
    },
    {
      "number": 11,
      "id": "B11-LEVEL2-MOBILITY-SPELL-IDENTITY-BATCH",
      "status": "ready-for-implementation-after-light-research",
      "title": "Backfill level-2 mobility spell identity evidence"
    },
    {
      "number": 12,
      "id": "B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH",
      "status": "ready-for-implementation-after-light-research",
      "title": "Backfill level-2 protection spell identity evidence"
    },
    {
      "number": 13,
      "id": "B13-PROFILE-SUBSET-IDENTITY-DISPOSITIONS",
      "status": "ready-for-implementation-after-light-research",
      "title": "Classify subset-supported identity expectations"
    },
    {
      "number": 14,
      "id": "B14-FULL-SUPPORT-REPORT-PROJECTION",
      "status": "blocked",
      "title": "Project selected-identity gate into full-support reports"
    },
    {
      "number": 15,
      "id": "B15-UNIT-REPORT-HONESTY-PASS",
      "status": "blocked",
      "title": "Refresh Unit report wording and metrics"
    },
    {
      "number": 16,
      "id": "B16-MCP-SCENARIO-IDENTITY-SMOKE",
      "status": "blocked",
      "title": "Add MCP selected-identity smoke coverage"
    },
    {
      "number": 17,
      "id": "B17-END-TO-END-UNIT-VERIFICATION",
      "status": "blocked",
      "title": "Run and document lane B verification"
    },
    {
      "number": 18,
      "id": "B18-RECURSIVE-NEXT-BATCH",
      "status": "blocked",
      "title": "Mine next selected-identity batch"
    }
  ]
}
-->

Every Ralph prompt must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`.

Reviewer loop: RAW traceability, ubiquitous-language/domain-language,
architecture/connascence, and code review. Repeat until no reasonable findings
remain.

## Boundaries

Lane B owns:

- `scripts/unit-profile-coverage-*.cjs`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `plans/unit-profile-coverage/unit-matrix.json`
- `plans/unit-profile-coverage/UNIT_REPORT.md`
- focused MCP or runtime selected-identity tests when needed for evidence

Lane B must not:

- add new reducer mechanics;
- modify QNT generator-readiness status;
- use selected-identity evidence as a substitute for reusable rules-kernel MBT.

## DAG / Queue Order

| # | Task | Status | Depends | Notes |
|---:|---|---|---|---|
| 1 | B1-SELECTED-IDENTITY-GAP-REPORT - Generate selected-identity gap report | done | none | Generated matrix view `selectedIdentityReplayGaps` and `UNIT_REPORT.md` table. |
| 2 | B2-EVIDENCE-SCHEMA-CHECK - Tighten selected-identity evidence validation | done | none | Validate rows before hard gate. |
| 3 | B3-HARD-GATE-SELF-TEST - Add hard-gate self-test for missing identity evidence | ready-for-implementation-after-light-research | none | Prove checker can fail. |
| 4 | B4-CLASS-FEATURE-IDENTITY-BATCH-1 - Backfill class-feature identity evidence batch 1 | ready-for-implementation-after-light-research | none | Barbarian/Bard/Cleric/Druid. |
| 5 | B5-CLASS-FEATURE-IDENTITY-BATCH-2 - Backfill class-feature identity evidence batch 2 | ready-for-implementation-after-light-research | none | Monk/Ranger/Paladin. |
| 6 | B6-CLASS-FEATURE-IDENTITY-BATCH-3 - Backfill class-feature identity evidence batch 3 | ready-for-implementation-after-light-research | none | Sorcerer/Warlock/Wizard. |
| 7 | B7-FEAT-IDENTITY-BATCH - Backfill feat identity evidence | ready-for-implementation-after-light-research | none | Alert and Origin feat reachability. |
| 8 | B8-LEVEL1-SPELL-IDENTITY-BATCH - Backfill level-1 spell identity evidence | ready-for-implementation-after-light-research | none | Any remaining level-1 supported spell ids. |
| 9 | B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH - Backfill level-2 damage spell identity evidence | ready-for-implementation-after-light-research | none | Damage/attack spells. |
| 10 | B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH - Backfill level-2 control spell identity evidence | ready-for-implementation-after-light-research | none | Control/condition spells. |
| 11 | B11-LEVEL2-MOBILITY-SPELL-IDENTITY-BATCH - Backfill level-2 mobility spell identity evidence | ready-for-implementation-after-light-research | none | Mobility/position spells. |
| 12 | B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH - Backfill level-2 protection spell identity evidence | ready-for-implementation-after-light-research | none | Protection/restoration/buff spells. |
| 13 | B13-PROFILE-SUBSET-IDENTITY-DISPOSITIONS - Classify subset-supported identity expectations | ready-for-implementation-after-light-research | none | Explicit non-applicable rows. |
| 14 | B14-FULL-SUPPORT-REPORT-PROJECTION - Project selected-identity gate into full-support reports | blocked | B1-B13 | Report-level metric. |
| 15 | B15-UNIT-REPORT-HONESTY-PASS - Refresh Unit report wording and metrics | blocked | B14 | No inflated 100% language. |
| 16 | B16-MCP-SCENARIO-IDENTITY-SMOKE - Add MCP selected-identity smoke coverage | blocked | B14 | One narrow smoke scenario. |
| 17 | B17-END-TO-END-UNIT-VERIFICATION - Run and document lane B verification | blocked | B15,B16 | Unit coverage and typecheck. |
| 18 | B18-RECURSIVE-NEXT-BATCH - Mine next selected-identity batch | blocked | B17 | Must append >=12 tasks or prove exhaustion. |

## Task Details

### Task 1 - B1-SELECTED-IDENTITY-GAP-REPORT - Generate selected-identity gap report

Status: `done`

Output: add a generated or checker-owned view that lists supported and
profile-subset-supported Units lacking selected-identity evidence. Use it to
drive later tasks. Do not hand-maintain the list in prose.

Acceptance: `pnpm unit-profile-coverage:check -- --write` and check pass.

Result: `unit-matrix.json` owns the `selectedIdentityReplayGaps` view, and
`UNIT_REPORT.md` renders it as "Selected Identity Replay Gaps".

### Task 2 - B2-EVIDENCE-SCHEMA-CHECK - Tighten selected-identity evidence validation

Status: `done`

Output: validate selected-identity evidence rows for real Unit ids, real source
test paths, and recognized evidence tags. Missing optional fields must not have
multiple meanings.

Acceptance: checker self-test covers malformed rows.

### Task 3 - B3-HARD-GATE-SELF-TEST - Add hard-gate self-test for missing identity evidence

Status: `ready-for-implementation-after-light-research`

Output: add a self-test fixture proving the checker fails when a supported
executable Unit has neither selected-identity evidence nor an explicit
non-applicable disposition.

Acceptance: `pnpm unit-profile-coverage:check:self-test` passes.

### Task 4 - B4-CLASS-FEATURE-IDENTITY-BATCH-1 - Backfill class-feature identity evidence batch 1

Status: `ready-for-implementation-after-light-research`

Output: cover Barbarian, Bard, Cleric, and Druid supported class-feature Units
currently missing selected identity evidence. Prefer existing focused runtime
tests; add narrow tests only when no real reachability witness exists.

Acceptance: gap report count decreases and no new runtime behavior is invented.

### Task 5 - B5-CLASS-FEATURE-IDENTITY-BATCH-2 - Backfill class-feature identity evidence batch 2

Status: `ready-for-implementation-after-light-research`

Output: cover Monk, Ranger, and Paladin supported class-feature Units currently
missing selected identity evidence.

Acceptance: gap report count decreases; profile-subset rows keep explicit
subset rationale.

### Task 6 - B6-CLASS-FEATURE-IDENTITY-BATCH-3 - Backfill class-feature identity evidence batch 3

Status: `ready-for-implementation-after-light-research`

Output: cover Sorcerer, Warlock, and Wizard supported class-feature Units
currently missing selected identity evidence.

Acceptance: gap report count decreases; spell-slot/access state is not
duplicated.

### Task 7 - B7-FEAT-IDENTITY-BATCH - Backfill feat identity evidence

Status: `ready-for-implementation-after-light-research`

Output: cover Alert and SRD Origin feat reachability through catalog admission,
character creation, and any runtime handoff they already own.

Acceptance: evidence proves identity reaches the typed owner; no runtime code
branches on authored feat id for mechanics.

### Task 8 - B8-LEVEL1-SPELL-IDENTITY-BATCH - Backfill level-1 spell identity evidence

Status: `ready-for-implementation-after-light-research`

Output: cover any remaining level-1 supported spell Units in the selected
identity gap report.

Acceptance: no level-1 supported spell remains missing identity evidence.

### Task 9 - B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH - Backfill level-2 damage spell identity evidence

Status: `ready-for-implementation-after-light-research`

Output: cover level-2 damage/attack spell Units such as Acid Arrow, Flame
Blade, Flaming Sphere, Heat Metal, Scorching Ray, Shatter, Moonbeam, Spiritual
Weapon, Dragon's Breath, and Ray of Enfeeblement where missing.

Acceptance: gap report count decreases; evidence points to existing reducer or
selected-identity tests.

### Task 10 - B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH - Backfill level-2 control spell identity evidence

Status: `ready-for-implementation-after-light-research`

Output: cover level-2 control/condition spell Units such as Calm Emotions,
Darkness, Enthrall, Gust of Wind, Levitate, Spike Growth, Web, Charm Person, and
See Invisibility where missing.

Acceptance: gap report count decreases; table-owned adjudication remains
classified, not modeled as reducer state.

### Task 11 - B11-LEVEL2-MOBILITY-SPELL-IDENTITY-BATCH - Backfill level-2 mobility spell identity evidence

Status: `ready-for-implementation-after-light-research`

Output: cover supported mobility/position spell Units such as Alter Self,
Invisibility, Misty Step, Fly, and Spider Climb where missing.

Acceptance: gap report count decreases; no geometry derivation is added.

### Task 12 - B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH - Backfill level-2 protection spell identity evidence

Status: `ready-for-implementation-after-light-research`

Output: cover supported protection/restoration/buff spell Units such as Aid,
Barkskin, Blur, Enhance Ability, Enlarge/Reduce, Magic Weapon, Mirror Image,
Pass without Trace, Prayer of Healing, Warding Bond, and Continual Flame where
missing.

Acceptance: gap report count decreases; runtime-detached parts stay explicit.

### Task 13 - B13-PROFILE-SUBSET-IDENTITY-DISPOSITIONS - Classify subset-supported identity expectations

Status: `ready-for-implementation-after-light-research`

Output: for profile-subset-supported Units where selected-identity evidence is
not meaningful for the closed/outside-runtime portion, add explicit
non-applicable disposition data instead of silently counting them green.

Acceptance: full-support reports distinguish "has selected identity witness"
from "identity witness not applicable to closed portion".

### Task 14 - B14-FULL-SUPPORT-REPORT-PROJECTION - Project selected-identity gate into full-support reports

Status: `blocked`

Output: update `LEVEL1_FULL_SUPPORT.md` and `LEVEL1_2_FULL_SUPPORT.md` so their
claim gate includes selected-identity readiness as a separate layer on top of
strict runtime/profile and authored product readiness.

Acceptance: generated JSON exposes counts; prose does not flatten the layers
into a single misleading 100%.

### Task 15 - B15-UNIT-REPORT-HONESTY-PASS - Refresh Unit report wording and metrics

Status: `blocked`

Output: revise `UNIT_REPORT.md` wording so background/feat/spell/class-feature
groups are counted by Units and profile facts, not by arbitrary prose weight.

Acceptance: generated report makes denominator semantics explicit.

### Task 16 - B16-MCP-SCENARIO-IDENTITY-SMOKE - Add MCP selected-identity smoke coverage

Status: `blocked`

Output: add one focused MCP acceptance smoke that creates a supported SRD level
1-2 character and proves selected Unit identity reaches battle or sheet output.

Acceptance: MCP typecheck and focused test pass.

### Task 17 - B17-END-TO-END-UNIT-VERIFICATION - Run and document lane B verification

Status: `blocked`

Output: run unit-profile write/check, checker self-test when changed, focused
tests added by this lane, `pnpm typecheck` when TypeScript changed, and
`git diff --check`.

Acceptance: generated artifacts are fresh and this plan records only durable
findings.

### Task 18 - B18-RECURSIVE-NEXT-BATCH - Mine next selected-identity batch

Status: `blocked`

Output: append at least 12 new atomic tasks for any remaining selected-identity
or metric-honesty gaps. If fewer than 12 remain, split by Unit group only when
that produces real independent work.

Acceptance: do not mark done unless at least 12 new runnable tasks were added
or the generated gap report proves exhaustion.

## Verification

- `pnpm unit-profile-coverage:check -- --write`
- `pnpm unit-profile-coverage:check`
- `pnpm unit-profile-coverage:check:self-test` when checker code changes
- Focused tests added by the task
- `pnpm typecheck` when TypeScript changes
- `git diff --check`

## Findings

- Current generated support claims are closed for Level 1 and Level 1-2, but
  selected-identity evidence is not yet a hard denominator layer.
