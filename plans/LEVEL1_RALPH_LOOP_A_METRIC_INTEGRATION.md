# Level 1 Ralph Loop A - Metric And Integration

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
