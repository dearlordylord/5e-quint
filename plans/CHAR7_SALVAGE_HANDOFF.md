# CHAR7 Salvage Handoff

This note captures the reusable work preserved after the interrupted Ralph run `debug-ralph-foreground-7`.

## Status

- No `CHAR7` implementation was committed.
- The best salvage candidate is the Codex task worktree:
  - `.worktrees/ralph/debug-ralph-foreground-7/task-6/codex`
- Claude's worktree is partial and useful mainly for extra test ideas and terminology alignment:
  - `.worktrees/ralph/debug-ralph-foreground-7/task-6/claude`

## Best salvage candidate

Codex completed a coherent `CHAR7` pass and wrote a final report:

- `.ralph/runs/debug-ralph-foreground-7/task-6/codex-implementer.final.md`

Its claimed verification:

- focused `vitest` for `character-domain.test.ts` and `character-sheet-derived.test.ts` passed
- broader repo typecheck remained blocked by unrelated existing errors outside `CHAR7`

## Files worth mining from Codex

Core ownership / validation:

- `.worktrees/ralph/debug-ralph-foreground-7/task-6/codex/packages/core/src/character-domain.ts`
- `.worktrees/ralph/debug-ralph-foreground-7/task-6/codex/packages/core/src/character-build-choice-validation.ts`
- `.worktrees/ralph/debug-ralph-foreground-7/task-6/codex/packages/core/src/character-finalization-helpers.ts`
- `.worktrees/ralph/debug-ralph-foreground-7/task-6/codex/packages/core/src/character-proficiencies.ts`
- `.worktrees/ralph/debug-ralph-foreground-7/task-6/codex/packages/core/src/character-sheet-derived.ts`

Tests:

- `.worktrees/ralph/debug-ralph-foreground-7/task-6/codex/packages/core/src/character-domain.test.ts`
- `.worktrees/ralph/debug-ralph-foreground-7/task-6/codex/packages/core/src/character-sheet-derived.test.ts`

Supporting alignment:

- `.worktrees/ralph/debug-ralph-foreground-7/task-6/codex/creature.qnt`
- `.worktrees/ralph/debug-ralph-foreground-7/task-6/codex/packages/app/src/components/character-creation/CharacterCreationStepContent.tsx`
- `.worktrees/ralph/debug-ralph-foreground-7/task-6/codex/packages/app/src/components/character-creation/characterCreationPresets.ts`

## Selective ideas worth mining from Claude

- `.worktrees/ralph/debug-ralph-foreground-7/task-6/claude/packages/core/src/character-advancement.ts`
  - useful as a design reference for separating advancement helpers from the main domain file
- `.worktrees/ralph/debug-ralph-foreground-7/task-6/claude/packages/core/src/character-domain.test.ts`
  - contains additional negative and progression-oriented test ideas
- `.worktrees/ralph/debug-ralph-foreground-7/task-6/claude/UBIQUITOUS_LANGUAGE.md`
- `.worktrees/ralph/debug-ralph-foreground-7/task-6/claude/dndTest.qnt`

Claude did not finish a clean final closeout, so treat its patch as partial reference material, not as a merge candidate.

## Known noise to exclude

Do not reuse these changes from either worktree:

- `scripts/mbt-fuzz.sh`
- `scripts/mbt-fuzz-timed.sh`
- `scripts/fuzz-all.sh`
- `scripts/fuzz-overnight.sh`
- `scripts/escalate-fuzz.sh`
- `scripts/measure-tier-timing.sh`
- untracked `node_modules` directories in the task worktrees

Those script diffs are Ralph worktree guard noise, not `CHAR7` product work.

## What the next rerun should preserve

- canonical ordered advancement as the legality source
- subclass timing inside advancement, not in a side channel
- legality checks at the moment of class pickup
- explicit rejection of illegal early ASI / feat / Epic Boon timing
- one downstream derivation path from finalized sheet to projections

## What still needs scrutiny before merge

- whether the salvaged feat-choice surface is fully broad enough for SRD 5.2.1 and does not reintroduce a narrow whitelist
- whether any remaining subclass-selection side channel survives in proficiencies / derived helpers / UI plumbing
- whether the app-facing draft editor changes are minimal and consistent with the canonical advancement model

## Recommended next use

When restarting Ralph for `CHAR7`, tell the implementers and decider to inspect:

- `.ralph/runs/debug-ralph-foreground-7/task-6/codex-implementer.final.md`
- the Codex task worktree files listed above

Use Claude only as a secondary source for additional tests and wording alignment.
