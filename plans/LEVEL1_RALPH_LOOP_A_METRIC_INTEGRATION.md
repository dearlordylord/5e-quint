# Level 1 Ralph Loop A - Metric And Integration

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L1A-AT13",
      "status": "done",
      "title": "Strict Level-1 Metric Infrastructure"
    },
    {
      "number": 2,
      "id": "L1A-AT14A",
      "status": "done",
      "title": "Later-Level Strict Closure Classifier For Bard And Monk"
    },
    {
      "number": 3,
      "id": "L1A-FRONTIER-DECISION-INDEX",
      "status": "done",
      "title": "Frontier Decision Artifact Index"
    },
    {
      "number": 4,
      "id": "L1A-L1Y-01",
      "status": "done",
      "title": "Class Container Profile Decision"
    },
    {
      "number": 5,
      "id": "L1A-L1Y-02",
      "status": "done",
      "title": "Core Trait Profile Decision"
    },
    {
      "number": 6,
      "id": "L1A-L1Y-03",
      "status": "done",
      "title": "Starting Equipment Profile Decision"
    },
    {
      "number": 7,
      "id": "L1A-L1Y-04",
      "status": "done",
      "title": "Multiclass Entry Trait Profile Decision"
    },
    {
      "number": 8,
      "id": "L1A-L1Y-05",
      "status": "done",
      "title": "Spell Access Profile Decision"
    },
    {
      "number": 9,
      "id": "L1A-L1Y-06",
      "status": "ready-for-research",
      "title": "Class Table Summary Closure Decision"
    },
    {
      "number": 10,
      "id": "L1A-FINAL-STRICT-INTEGRATION",
      "status": "ready-for-implementation-after-light-research",
      "title": "Final Strict Support Integration Refresh"
    }
  ]
}
-->

Umbrella source plan: `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

This loop owns the strict level-1 metric, generated strict artifacts, later-level
strict closure classification, and final integration refresh. It should start
first and finish last.

Separate active lane: selected identity MBT. Master currently includes the
selected MBT batch plan in `plans/SELECTED_IDENTITY_MBT_BATCHES.md` and committed
selected-identity evidence for Weapon Mastery properties, reaction/interruption
Units, and condition-save/repeat-save Units. That lane is not part of this
strict level-1 support split, but this loop must preserve its evidence and
generated metrics during integration.

## Worktree Safety Prefix

Every Ralph prompt for this loop must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`. You are not alone in the codebase:
> do not revert edits made by others, and adapt your implementation around
> existing changes. Do not edit `plans/ACTIVE_PLAN.md`.

## Owned Tasks

| Task | When | Ownership |
| --- | --- | --- |
| `AT-L1-13` Strict level-1 metric infrastructure | Start first, before Loops B/C implement claim work | strict report code, checker wiring, strict generated artifacts |
| `AT-L1-14` Later-level strict closure classifier | After `AT-L1-13`; Ranger part waits for Loop B `AT-L1-01` | strict report classification for later-level-only residuals |
| `AT-L1Y-01` through `AT-L1Y-06` non-executable expansion decisions | After strict report exists | row-family decision artifacts and strict-report wording recommendations |
| Final integration refresh | After Loops B/C merge | all generated coverage artifacts and final stale-check pass |

## Scope

Implement `AT-L1-13` from the umbrella plan:

- derive from `plans/unit-profile-coverage/unit-matrix.json`;
- derive from `plans/unit-profile-coverage/srd-unit-inventory.json`;
- use the strict metric shape in L1FS1;
- generate `plans/unit-profile-coverage/level1-full-support.json`;
- generate `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`;
- wire the generated files into the existing coverage check.

Then implement `AT-L1-14`:

- classify `bard_bardic_inspiration` and `monk_martial_arts` as strict
  `closed-later-level-only` when their only residuals are later-level mechanics;
- classify `ranger_favored_enemy` only after Loop B removes stale Hunter's Mark
  finding-Advantage residuals;
- do not change all-level Unit claims to `supported-profile`.

## Primary Files

- `scripts/level1-full-support-report.cjs`
- `scripts/unit-profile-coverage-check.cjs`
- `scripts/unit-profile-coverage-config.cjs`
- `plans/unit-profile-coverage/level1-full-support.json`
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`
- other generated coverage artifacts during final integration refresh

## Coordination Rules

- Loops B and C may run `pnpm unit-profile-coverage:check --write` for
  verification, but generated coverage artifacts are integration-owned here.
- Preserve existing `selected-identity-mbt` evidence rows and generated selected
  identity MBT metrics. As of this split, `UNIT_REPORT.md` reports selected
  identity MBT coverage as 28/85; do not regress it during strict-report
  integration.
- If another selected-MBT branch lands while this loop is running, rebase/merge
  before the final generated artifact refresh and keep the newer MBT evidence.
- Do not hard-code this plan's task table into the metric. Derive from matrix,
  inventory, normal claims, and closure facts.
- Do not change Unit claims, runtime behavior, or package tests in `AT-L1-13`.
- During final refresh, regenerate all coverage artifacts after B/C branches are
  merged and verify no stale artifacts remain.

## Verification

- Read cited local RAW and `UBIQUITOUS_LANGUAGE.md` before changing report text.
- Run `pnpm unit-profile-coverage:check --write`.
- Run `pnpm unit-profile-coverage:check`.
- Run targeted checker self-test if added.
- Run `/simplify` to convergence, minimum two rounds.
- Do not run MBT for this strict-support metric loop unless promoted battle
  behavior unexpectedly changes; selected identity MBT work remains in the
  separate selected-MBT lane.

## DAG / Queue Order

| # | Task | Status | Depends on | Notes |
| ---: | --- | --- | --- | --- |
| 1 | L1A-AT13 - Strict Level-1 Metric Infrastructure | done | none | Must land before Loops B/C count against strict reports. |
| 2 | L1A-AT14A - Later-Level Strict Closure Classifier For Bard And Monk | done | L1A-AT13 | Close only Bard/Monk later-level residuals; Ranger waits for Loop B `AT-L1-01`. |
| 3 | L1A-FRONTIER-DECISION-INDEX - Frontier Decision Artifact Index | done | L1A-AT13 | Create reusable decision artifact shape for `frontier-decisions/`. |
| 4 | L1A-L1Y-01 - Class Container Profile Decision | done | L1A-FRONTIER-DECISION-INDEX | Decide profile vs owner-evidence-only closure for 12 class containers. |
| 5 | L1A-L1Y-02 - Core Trait Profile Decision | done | L1A-FRONTIER-DECISION-INDEX | Decision spike for 76 core trait rows; produce follow-ups only if justified. |
| 6 | L1A-L1Y-03 - Starting Equipment Profile Decision | done | L1A-FRONTIER-DECISION-INDEX | Decide starting equipment profile vs existing source projection closure. |
| 7 | L1A-L1Y-04 - Multiclass Entry Trait Profile Decision | done | L1A-FRONTIER-DECISION-INDEX | Decide multiclass entry profile vs shared-algebra/creation owner evidence. |
| 8 | L1A-L1Y-05 - Spell Access Profile Decision | done | L1A-FRONTIER-DECISION-INDEX | Decide explicit spell-access profile vs derived CharacterBuild evidence. |
| 9 | L1A-L1Y-06 - Class Table Summary Closure Decision | ready-for-research | L1A-FRONTIER-DECISION-INDEX | Confirm source/navigation summary closure and strict-report wording. |
| 10 | L1A-FINAL-STRICT-INTEGRATION - Final Strict Support Integration Refresh | ready-for-implementation-after-light-research | B/C branches merged or explicitly skipped | Regenerate all coverage/strict artifacts after loop branches land. |

## Task Details

### Task 1 - L1A-AT13 - Strict Level-1 Metric Infrastructure

Status: `done`

Implement `AT-L1-13` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Derive strictly from `plans/unit-profile-coverage/unit-matrix.json` and
  `plans/unit-profile-coverage/srd-unit-inventory.json`.
- Add `scripts/level1-full-support-report.cjs`.
- Wire strict JSON/Markdown generation into the existing
  `unit-profile-coverage:check` pipeline.
- Generate and stale-check:
  `plans/unit-profile-coverage/level1-full-support.json` and
  `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`.
- Show strict runtime/profile support, strict target closure, product readiness,
  open frontier, and outside-denominator pressure.

Out of scope:

- Do not change Unit claims.
- Do not change runtime behavior.
- Do not run MBT unless promoted battle behavior unexpectedly changes.
- Do not regress existing selected identity MBT evidence or the current 28/85
  selected identity MBT metric.

Verification:

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- targeted checker self-test if added
- `/simplify` convergence, minimum two rounds

Plan Impact:

- Update this loop plan only when task ordering or durable scope changes.
- Keep `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md` as the umbrella source plan.

### Task 2 - L1A-AT14A - Later-Level Strict Closure Classifier For Bard And Monk

Status: `done`

Implement the Bard/Monk portion of `AT-L1-14` from
`plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Classify `profile-subset-supported` rows with only later-level residuals as
  `closed-later-level-only` in the strict level-1 report.
- Close `bard_bardic_inspiration` and `monk_martial_arts` for strict level 1
  when their only residuals are later-level mechanics.
- Leave `ranger_favored_enemy` for a later Loop A integration pass after Loop B
  removes stale Hunter's Mark finding-Advantage residuals.

Out of scope:

- Do not change Bardic Inspiration or Martial Arts all-level Unit claims to
  `supported-profile`.
- Do not implement later-level scaling.
- Do not change Ranger closure in this task.
- Do not run MBT unless promoted battle behavior unexpectedly changes.

Verification:

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `/simplify` convergence, minimum two rounds

Plan Impact:

- If the Ranger dependency becomes ready during this run, add a concrete
  follow-up task instead of silently folding it into this task.

### Task 3 - L1A-FRONTIER-DECISION-INDEX - Frontier Decision Artifact Index

Status: `done`

Create the shared artifact conventions used by `AT-L1X-*` and `AT-L1Y-*`
research tasks from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Create `plans/unit-profile-coverage/frontier-decisions/README.md` if absent.
- Define the required headings for each decision artifact:
  RAW Sources, Current Generated State, Owner Classification, Decision,
  Promotion Gate, Follow-Up Tasks, Verification.
- Do not decide any specific Unit or row family in this task.
- Do not edit Unit claims, profiles, evidence, runtime code, or generated
  coverage artifacts except the decision-artifact index.

Verification:

- `pnpm unit-profile-coverage:check`
- `/simplify` is not required unless code or generated artifacts change.

Plan Impact:

- If the artifact shape needs durable changes, update this loop plan and the
  umbrella plan consistently.

### Task 4 - L1A-L1Y-01 - Class Container Profile Decision

Status: `done`

Research `AT-L1Y-01` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Row family: `class-container`.
- Read the 12 SRD 5.2.1 class files and existing
  `character-creation-owner-evidence.json` rows.
- Decide whether class progression admission/finalization needs a first-class
  `character-creation.class-progression-container` profile or should remain
  owner-evidence-only.
- Write `plans/unit-profile-coverage/frontier-decisions/class-container.md`.
- Do not edit Unit claims/profiles unless the task proves a non-duplicative
  runtime API or finalization behavior already exists and needs explicit
  profile accounting.

Verification:

- `pnpm unit-profile-coverage:check`

Plan Impact:

- Add concrete implementation follow-ups only if the promotion gate passes.

### Task 5 - L1A-L1Y-02 - Core Trait Profile Decision

Status: `done`

Research `AT-L1Y-02` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Row family: `core-trait`; current count is 76 level-1 rows.
- Apply the promotion gate separately to armor/weapon/tool proficiencies, Hit
  Point Die, Primary Ability, Saving Throws, skills, and shared-algebra
  prerequisite facts.
- Write `plans/unit-profile-coverage/frontier-decisions/core-trait.md`.
- Produce follow-up implementation tasks only where a concrete
  CharacterBuild/parser/finalization behavior is missing or under-accounted.
- Do not add grouped profile state that duplicates already-derived facts.

Verification:

- `pnpm unit-profile-coverage:check`

Plan Impact:

- Append follow-up atoms only for durable, non-duplicative gaps.

### Task 6 - L1A-L1Y-03 - Starting Equipment Profile Decision

Status: `done`

Research `AT-L1Y-03` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Row family: `equipment-pressure`; current count is 12 level-1 rows.
- Decide whether starting equipment selection/projection needs a
  character-creation/equipment support profile or remains source-projection
  owner evidence.
- Write `plans/unit-profile-coverage/frontier-decisions/equipment-pressure.md`.
- If profiling is justified, define exact owner package, profile id, claim
  shape, deterministic evidence, and tests.

Verification:

- `pnpm unit-profile-coverage:check`

Plan Impact:

- Add implementation follow-ups only if the profile decision is positive.

### Task 7 - L1A-L1Y-04 - Multiclass Entry Trait Profile Decision

Status: `done`

Research `AT-L1Y-04` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Row family: `multiclass-entry`; current count is 12 level-1 rows.
- Check Character Creation and shared-algebra prerequisite/trait evidence.
- Decide whether multiclass entry prerequisites and proficiency grants need
  first-class support profiles or remain owner-evidence-only.
- Write `plans/unit-profile-coverage/frontier-decisions/multiclass-entry.md`.

Verification:

- `pnpm unit-profile-coverage:check`

Plan Impact:

- Split follow-up implementation by owner only if a profile is justified.

### Task 8 - L1A-L1Y-05 - Spell Access Profile Decision

Status: `done`

Research `AT-L1Y-05` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Row family: `spell-access`; current count is 7 level-1 rows.
- Decide whether class spell access/prepared-spell source facts need explicit
  character-creation profiles separate from executable spell Units.
- Avoid duplicating spell-list or prepared-spell state already represented in
  CharacterBuild.
- Write `plans/unit-profile-coverage/frontier-decisions/spell-access.md`.

Verification:

- `pnpm unit-profile-coverage:check`

Plan Impact:

- Produce profile/task/evidence shape only if it improves executable coverage
  without redundant state.

### Task 9 - L1A-L1Y-06 - Class Table Summary Closure Decision

Status: `ready-for-research`

Research `AT-L1Y-06` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Row family: `class-table-summary`; current count is 12 level-1 rows.
- Confirm class table rows are source/navigation rows, not runtime support
  pressure.
- Write `plans/unit-profile-coverage/frontier-decisions/class-table-summary.md`.
- Add strict-report wording/taxonomy recommendations if needed so these rows
  are not reopened as missing profile work.

Verification:

- `pnpm unit-profile-coverage:check`

Plan Impact:

- Do not add profiles unless a real runtime or character-creation consequence
  is not already covered by class containers, feature rows, or core traits.

### Task 10 - L1A-FINAL-STRICT-INTEGRATION - Final Strict Support Integration Refresh

Status: `ready-for-implementation-after-light-research`

Refresh strict level-1 support artifacts after Loop B and Loop C branches land,
or after the owner explicitly tells this loop to integrate a subset.

Scope:

- Merge or rebase latest `master` before starting.
- Regenerate coverage artifacts with `pnpm unit-profile-coverage:check --write`.
- Verify `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`,
  `plans/unit-profile-coverage/level1-full-support.json`,
  `plans/unit-profile-coverage/UNIT_REPORT.md`, and
  `plans/unit-profile-coverage/unit-matrix.json` agree.
- Preserve selected identity MBT evidence and companion-worktree exclusions.
- Do not implement new runtime behavior in this integration task.

Verification:

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `pnpm unit-profile-coverage:check:self-test`
- `/simplify` convergence, minimum two rounds if generated/report code changes.

Plan Impact:

- If strict support is still below 100%, list the remaining rows and map them
  back to the owning loop or a new follow-up task.
