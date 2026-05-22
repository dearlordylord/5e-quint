# Find Steed Companion Boundary Handoff

This handoff is for a dedicated worktree agent. Do not do this work in `master`
or in an existing Ralph integration/task worktree.

Before starting, run `git log --oneline -1 master` and verify your HEAD
matches. If not, run `git rebase master`.

## Goal

Resolve the current level-1-plus-level-2 strict support report row that still
lists `find_steed` as `open-runtime-behavior`.

The expected outcome is a companion-control-boundary closure unless fresh RAW,
ubiquitous-language, or architecture review proves that a smaller executable
non-companion runtime subset is actually owned by the promoted battle runtime.

Do not implement companion AI, autonomous creature behavior, mount routing,
pathfinding, independent turn behavior, or spell-name/id dispatch.

## Context

- Current report: `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`
  still lists `find_steed` in `open-runtime-behavior`.
- Previous completed attempt: commit `df814187 Close Find Steed companion
  boundary`.
- Original task: `plans/LEVEL2_FEATURE_LANE_A_SPATIAL_VISIBILITY.md`, task
  `L12G-FOLLOWUP-FIND-STEED-COMPANION-BOUNDARY`.
- Companion intake: `plans/unit-profile-coverage/L1K_COMPANION_EXCLUSION_SPELL_CANDIDATE_INTAKE.md`.
- Companion design background: `plans/DESIGN_C4a_spawned_companion.md`.
- Local RAW: `.references/srd-5.2.1/Spells/Descriptions-E-L.md`.
- Domain language: `UBIQUITOUS_LANGUAGE.md`.

The project language is: the table makes choices and supplies facts. The runtime
may consume typed facts when it has an owner for them. Companion/mount command
choice, independent behavior, and autonomous default behavior are not game AI
owned by battle runtime.

## Required Work

1. Read the local Find Steed RAW and the project ubiquitous language.
2. Compare current `master` against prior commit `df814187` and decide whether
   the prior companion-boundary closure is still valid.
3. If valid, restore or reapply the closure in the current report pipeline using
   the current artifact shapes.
4. If not valid, write a precise follow-up split that identifies the smallest
   owner needed and why the current strict metric cannot close it yet.
5. Update only the correct owner artifacts, expected to include:
   - `plans/unit-profile-coverage/unit-claims.jsonl`
   - generated strict support artifacts under `plans/unit-profile-coverage/`
   - any report script only if the current pipeline cannot represent the
     companion-control-boundary closure without it
6. Confirm `find_steed` no longer appears as `open-runtime-behavior`, or that it
   has a narrower explicit follow-up split with an owner and acceptance output.

## Acceptance

- `find_steed` is not left as an unexplained open runtime row.
- No companion AI or autonomous-control implementation is introduced.
- No runtime code dispatches on authored spell id, spell name, provenance
  section, or catalog identity.
- No duplicate state is added for facts already owned by Surface, stat blocks,
  character state, table witnesses, or future companion ownership.
- Closure language distinguishes runtime-detached table facts from battle
  runtime facts supplied through typed witnesses.
- `pnpm unit-profile-coverage:check` passes after generated artifacts are
  refreshed as needed.
- `git diff --check` passes.
- Reviewer loop converges: RAW traceability, ubiquitous-language/domain,
  architecture/connascence, and code-review passes have no reasonable findings
  remaining. Fix reasonable notes and repeat; reject only with a concrete
  reason in the task notes.

## Non-Goals

- Do not implement Otherworldly Steed stat-block execution.
- Do not add mount movement, rider relationship, item-drop, replacement,
  independent-action, or default-Dodge behavior.
- Do not model the table's or player's command choice as runtime AI.
- Do not broaden the companion boundary beyond what is needed to close the
  current strict support accounting row.
