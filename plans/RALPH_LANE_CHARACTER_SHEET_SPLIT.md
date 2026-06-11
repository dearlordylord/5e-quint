# Ralph Lane C: Character Sheet Runtime Split

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "SHEETS-C01-TYPES-AND-IDS",
      "status": "done",
      "title": "Extract sheet-types and branded ids behind the unchanged barrel"
    },
    {
      "number": 2,
      "id": "SHEETS-C02-STATELESS-QUERIES",
      "status": "done",
      "title": "Extract hit-points, armor-class, and ability-checks query domains"
    },
    {
      "number": 3,
      "id": "SHEETS-C03-RESOURCES-HEALING",
      "status": "done",
      "title": "Extract resources (with Monk folds) and healing-rest-benefit"
    },
    {
      "number": 4,
      "id": "SHEETS-C04-SPELL-SLOTS-INVOCATION",
      "status": "done",
      "title": "Extract spell-slots (with Font of Magic) and spell-invocation"
    },
    {
      "number": 5,
      "id": "SHEETS-C05-FEATURE-DOMAINS",
      "status": "done",
      "title": "Extract druid-features and class-feature-spells"
    },
    {
      "number": 6,
      "id": "SHEETS-C06-LIFECYCLE-PARSING",
      "status": "done",
      "title": "Extract sheet-lifecycle and the internal stored-sheet parser"
    },
    {
      "number": 7,
      "id": "SHEETS-C07-RESTS",
      "status": "done",
      "title": "Extract rests (with weapon-mastery reselection)"
    },
    {
      "number": 8,
      "id": "SHEETS-C08-TIME-PASSAGE-AND-AUDIT",
      "status": "blocked",
      "title": "Extract time-passage, finalize the barrel, add the split audit, close out §7"
    },
    {
      "number": 9,
      "id": "SHEETS-C09-TEST-REORG",
      "status": "blocked",
      "title": "Reorganize the monolithic index.test.ts along the new module seams (optional follow-up)"
    }
  ]
}
-->

This lane executes `plans/LARGE_FILE_DOMAIN_SPLIT_PLAN.md` §7 "Character
Sheet Runtime" as **refreshed 2026-06-10** — that section is the spec
(module list with folds, migration order, risks); this lane only sequences
it into atomic tasks. Target: split
`packages/character-sheet-runtime/src/index.ts` (7,929 lines, 143 exports)
into ~14 domain modules behind an unchanged re-export barrel.

**External gate: cleared 2026-06-10.** The lane was initially blocked on
uncommitted `packages/mcp` session-store WIP in the working tree. The 2-line
`mcp-acceptance-scenarios.ts` repair landed on master as `633213b18` (master's
default mcp test lane was red without it), and the session-store
observability work moved to its own worktree/branch pending its consumer
(see the 2026-06-10 landability assessment). `git status` is clean of
`packages/mcp`; C01 is `ready-for-implementation-after-light-research`. This lane never touches
`packages/mcp`; the gate was repo hygiene, not a file dependency.

Wave coordination and the global MBT mutex: `plans/RALPH_QUINT_FIRST_WAVE.md`.
The package's 11 `*.mbt.test.ts` drivers are quint-connect MBT — package
test runs count against the cross-lane MBT mutex.

## Context Budget

Read only these by default:

- `plans/LARGE_FILE_DOMAIN_SPLIT_PLAN.md` — §7 (the spec) and "Split
  Principles".
- `packages/character-sheet-runtime/src/index.ts` — only the line regions the
  current task moves.
- The package's `package.json`, and `src/index.test.ts` only when a task's
  module needs its tests located.
- Precedent for the audit task: `scripts/audit-battle-reducer-split.mjs`.

Do not read battle-runtime drivers/witnesses or `packages/mcp` — other lanes
own them.

## Lane Rules

- Before starting each task, verify the task base:
  `git log --oneline -1 <declared-base-ref>`, `git log --oneline -1 HEAD`,
  `git merge-base --is-ancestor <declared-base-sha> HEAD`. On failure, stop
  and report.
- The public API is frozen: every task ends with `src/index.ts` re-exporting
  the identical 143-symbol surface. Consumers
  (`@dnd/character-battle-runtime`, `@dnd/mcp`) and the package's 11 MBT
  drivers import via the barrel and must pass unmodified.
- Move-only refactor: no behavior change, no signature change, no renamed
  exports. If a move exposes a latent bug, fix it in its own commit with the
  failing-then-passing test as evidence.
- All input/output types stay in `sheet-types.ts`; function modules use
  `import type` (split-plan risk 1: type-only circular imports). Run
  typecheck after every extraction.
- Module names are domain-named per the split plan; no `helpers`, `utils`,
  or contrast names. The two internal modules (`stored-sheet-parser`,
  shared helpers if needed) stay unexported.
- `timePassed` is accepted as one deep time-domain module; do not force-split
  it (split-plan risk 2).
- Preserve `KERNEL-COVERAGE`, `UNIT-PROFILE-COVERAGE`, and
  `UNIT-IDENTITY-EVIDENCE` marker comments; move each with the code that owns
  it.

## Verification

Every task must include:

- Reviewer-loop convergence (domain language, architecture/connascence, code
  review) until no reasonable findings remain. RAW re-reading is not required
  for pure moves; any task that touches rule meaning has exceeded its scope.
- Package typecheck (`pnpm --filter @dnd/character-sheet-runtime exec tsc
  --noEmit`, or the package's own script if one exists).
- `pnpm --filter @dnd/character-sheet-runtime test` — full package suite
  including the 11 MBT drivers, after the MBT-mutex process check
  (`ps aux | grep vitest | grep -v grep`;
  `ps aux | grep quint_evaluator | grep -v grep`).
- Barrel-surface check: the exported symbol list of `src/index.ts` is
  identical before/after (C08 turns this into an executable audit script;
  earlier tasks may diff `pnpm exec tsc --noEmit` declarations or a sorted
  export-name grep).
- `git diff --check`

## DAG / Queue Order

| # | Task | Status | Depends on | Notes |
| ---: | --- | --- | --- | --- |
| 1 | SHEETS-C01-TYPES-AND-IDS | ready-for-implementation-after-light-research | none | External mcp-WIP gate cleared 2026-06-10 (see header). |
| 2 | SHEETS-C02-STATELESS-QUERIES | ready-for-research | SHEETS-C01-TYPES-AND-IDS | Lowest-risk extractions; witnesses: hit-point-maximum, armor-class, ability-check. |
| 3 | SHEETS-C03-RESOURCES-HEALING | ready-for-research | SHEETS-C02-STATELESS-QUERIES | Monk's Focus / Uncanny Metabolism fold into resources. |
| 4 | SHEETS-C04-SPELL-SLOTS-INVOCATION | done | SHEETS-C03-RESOURCES-HEALING | Font of Magic folds into spell-slots. |
| 5 | SHEETS-C05-FEATURE-DOMAINS | done | SHEETS-C04-SPELL-SLOTS-INVOCATION | Druid + class-feature prepared spells. |
| 6 | SHEETS-C06-LIFECYCLE-PARSING | done | SHEETS-C05-FEATURE-DOMAINS | Largest internal move (~2,400-line parser layer). |
| 7 | SHEETS-C07-RESTS | ready-for-research | SHEETS-C06-LIFECYCLE-PARSING | Rest state machine consumes the spell-slots interface; weapon-mastery reselection folds in. |
| 8 | SHEETS-C08-TIME-PASSAGE-AND-AUDIT | blocked | SHEETS-C07-RESTS | Final move + executable split audit + §7 status note. |
| 9 | SHEETS-C09-TEST-REORG | blocked | SHEETS-C08-TIME-PASSAGE-AND-AUDIT | Optional follow-up; can be deferred indefinitely. |

## Task Details

### Task 1 - SHEETS-C01-TYPES-AND-IDS

Status: `done` · Mode: AFK

Output: `sheet-types.ts` (exported domain types, constants) and the branded
`CharacterSheetId` + resource unit-id support sets (per §7, either inside
`sheet-types.ts` or a sibling — follow §7), with `src/index.ts` rewired as a
barrel for the moved symbols.

Acceptance: typecheck green; full package tests green; barrel surface
identical; no behavioural diff (moves only).

### Task 2 - SHEETS-C02-STATELESS-QUERIES

Status: `done` · Mode: AFK

Output: `hit-points.ts`, `armor-class.ts`, `ability-checks.ts` extracted per
§7 cluster ranges.

Acceptance: standard verification; the three matching MBT drivers
(`hit-point-maximum`, `armor-class-base-selected-identity`,
`ability-check-proficiency-bonus`) pass unmodified.

### Task 3 - SHEETS-C03-RESOURCES-HEALING

Status: `done` · Mode: AFK

Output: `resources.ts` (capacity/spending, including the Monk's Focus and
Uncanny Metabolism folds §7 prescribes) and `healing-rest-benefit.ts`
(Lay On Hands, Spell Rest Benefit).

Acceptance: standard verification; `spell-rest-benefit-application` and
`healing-resource-selected-identity` drivers pass unmodified.

### Task 4 - SHEETS-C04-SPELL-SLOTS-INVOCATION

Status: `done` · Mode: AFK

Output: `spell-slots.ts` (slot/created-slot/pact state machine including the
Font of Magic conversion fold) and `spell-invocation.ts` (invocation, ritual
access, Book of Shadows).

Acceptance: standard verification; `spell-slots-pact-slots` and
`spellbook-ritual-selected-identity` drivers pass unmodified.

### Task 5 - SHEETS-C05-FEATURE-DOMAINS

Status: `done` · Mode: AFK

Output: `druid-features.ts` (Wild Shape known forms, Circle of the Land) and
`class-feature-spells.ts` (prepared-spell projection), consolidating the
three scattered Druid regions §7 identifies.

Acceptance: standard verification; `class-feature-selected-identity` driver
passes unmodified.

### Task 6 - SHEETS-C06-LIFECYCLE-PARSING

Status: `done` · Mode: AFK

Output: `sheet-lifecycle.ts` (`createFreshCharacterSheet` + init helpers,
`parseCharacterSheet` dispatcher) and the internal `stored-sheet-parser.ts`
(the ~2,400-line `parse*`/type-guard layer; unexported), plus the shared
internal helpers module only if 3+ domains genuinely need it (deletion test —
do not create a grab-bag).

Acceptance: standard verification; parser layer has no exported symbols;
typecheck proves no type-only cycles.

### Task 7 - SHEETS-C07-RESTS

Status: `done` · Mode: AFK

Output: `rests.ts` — Short/Long Rest state machines, Hit Dice, Arcane
Recovery, post-Long-Rest weapon-mastery reselection fold — consuming the
`spell-slots.ts` and `resources.ts` interfaces.

Acceptance: standard verification; `hp-rest-hit-dice` and
`arcane-recovery-selected-identity` and
`weapon-mastery-containers-selected-identity` drivers pass unmodified.

### Task 8 - SHEETS-C08-TIME-PASSAGE-AND-AUDIT

Status: `blocked` · Mode: AFK

Output: `time-passage.ts` (the `timePassed` omnibus, moved whole with a
header comment naming it the time-domain state machine per §7 risk note);
final `src/index.ts` reduced to the barrel; an executable split audit
(precedent `scripts/audit-battle-reducer-split.mjs`: every pre-split export
exists post-split with the same module-resolved identity); a closing status
note on §7 in `plans/LARGE_FILE_DOMAIN_SPLIT_PLAN.md`.

Acceptance: audit script green and wired into the package or repo quality
lane; full package suite green; consumer packages
(`pnpm --filter @dnd/character-battle-runtime test`,
`pnpm --filter @dnd/mcp test`) green; barrel surface byte-identical to the
pre-split export list.

### Task 9 - SHEETS-C09-TEST-REORG

Status: `blocked` · Mode: AFK

Output: split the 5,039-line `index.test.ts` along the new module seams
(per-domain test files), no assertion changes; delete the monolith when
empty.

Acceptance: identical test count before/after
(`pnpm --filter @dnd/character-sheet-runtime test` reports the same number
of tests); standard verification.
