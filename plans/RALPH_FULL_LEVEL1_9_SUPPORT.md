# Ralph Full Level 1-9 Implementation Convergence Queue

> **Historical execution artifact:** the `ralph-run.sh` command and task index
> below document the one-off shell harness. They are not input formats or
> compatibility requirements for the new Ralph orchestrator.

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    { "number": 1, "id": "L19A-01-BASELINE-ACCOUNTING-SNAPSHOT", "status": "already-applied", "title": "Preserve the level-1-9 accounting baseline without treating it as feature completion" },
    { "number": 2, "id": "L19A-02-LEVEL9-INVENTORY-PLUMBING", "status": "already-applied", "title": "Keep generated level-9 and spell-level-5 inventory plumbing" },
    { "number": 3, "id": "L19A-03-LEVEL19-REPORT-PLUMBING", "status": "already-applied", "title": "Keep generated level-1-9 full-support and mining-audit reports" },
    { "number": 4, "id": "L19A-04-NONVACUOUS-SCOPE-CHECKS", "status": "already-applied", "title": "Keep non-vacuity checks for level-9 and spell-level-5 scope" },
    { "number": 5, "id": "L19A-05-ULTRA-GOLDEN-SCOPE-WIRING", "status": "already-applied", "title": "Keep level-1-9 ultra-golden scope wiring as baseline scope plumbing" },
    { "number": 6, "id": "L19A-06-STRICT-DISPOSITION-GATE", "status": "already-applied", "title": "Make final level-1-9 support fail on unsupported, catalog-only, future-owner, or audit-reuse closure" },
    { "number": 7, "id": "L19B-01-LEVEL9-FEATURE-DHALL-GRANTS", "status": "already-applied", "title": "Author missing level-9 class feature Surface records and class grants" },
    { "number": 8, "id": "L19B-02-MISSING-L5-SPELL-DHALL-BATCH", "status": "already-applied", "title": "Author the twenty-four missing SRD spell-level-5 Surface records" },
    { "number": 9, "id": "L19B-03-MASS-CURE-WOUNDS-ACCESS-ADMISSION", "status": "already-applied", "title": "Verify Mass Cure Wounds definition, access, and supported invocation evidence" },
    { "number": 10, "id": "L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS", "status": "already-applied", "title": "Implement level-9 character progression and Character Sheet facts" },
    { "number": 11, "id": "L19C-02-RANGER-EXPERTISE-GENERIC-OWNER", "status": "already-applied", "title": "Admit Ranger Expertise through the generic Expertise owner" },
    { "number": 12, "id": "L19C-03-LEVEL9-SPELL-ACCESS", "status": "already-applied", "title": "Implement level-9 spell access for full casters, Warlock, Paladin, and Ranger" },
    { "number": 13, "id": "L19C-04-CONTACT-PATRON-SHEET-SESSION", "status": "already-applied", "title": "Implement Warlock Contact Patron sheet resource and nonbattle session support" },
    { "number": 14, "id": "L19D-01-BRUTAL-STRIKE-RECKLESS-DAMAGE", "status": "already-applied", "title": "Promote Brutal Strike Reckless Attack opt-out and extra damage" },
    { "number": 15, "id": "L19D-02-BRUTAL-STRIKE-FORCEFUL-BLOW", "status": "already-applied", "title": "Promote Forceful Blow push and Barbarian movement" },
    { "number": 16, "id": "L19D-03-BRUTAL-STRIKE-HAMSTRING", "status": "already-applied", "title": "Promote Hamstring Blow speed reduction" },
    { "number": 17, "id": "L19D-04-FIGHTER-INDOMITABLE", "status": "already-applied", "title": "Promote Fighter Indomitable failed-save reroll support" },
    { "number": 18, "id": "L19D-05-FIGHTER-TACTICAL-MASTER", "status": "already-applied", "title": "Promote Fighter Tactical Master mastery replacement support" },
    { "number": 19, "id": "L19D-06-PALADIN-ABJURE-FOES", "status": "already-applied", "title": "Promote Paladin Abjure Foes Channel Divinity support" },
    { "number": 20, "id": "L19D-07-MONK-ACROBATIC-MOVEMENT", "status": "already-applied", "title": "Promote Monk Acrobatic Movement support" },
    { "number": 21, "id": "L19D-08-ROGUE-SUPREME-SNEAK", "status": "already-applied", "title": "Promote Rogue Supreme Sneak Cunning Strike and Hide interaction support" },
    { "number": 22, "id": "L19E-01-L5-AREA-SAVE-DAMAGE", "status": "already-applied", "title": "Promote level-5 area save-damage spell profiles" },
    { "number": 23, "id": "L19E-02-L5-SAVE-CONDITION-CONTROL", "status": "already-applied", "title": "Promote level-5 save-gated condition and control spell profiles" },
    { "number": 24, "id": "L19E-03-L5-ACTIVE-AREA-HAZARD", "status": "already-applied", "title": "Promote level-5 active area hazard spell profiles" },
    { "number": 25, "id": "L19E-04-L5-BARRIER-WALL", "status": "already-applied", "title": "Promote level-5 barrier and wall spell profiles" },
    { "number": 26, "id": "L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE", "status": "already-applied", "title": "Promote level-5 summoned and object lifecycle spell profiles" },
    { "number": 27, "id": "L19E-06-L5-RESTORATION-DEATH", "status": "already-applied", "title": "Promote level-5 restoration and death-state spell profiles" },
    { "number": 28, "id": "L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION", "status": "already-applied", "title": "Promote level-5 divination, social, and exploration spell profiles" },
    { "number": 29, "id": "L19E-08-L5-TELEPORT-TRAVEL", "status": "already-applied", "title": "Promote level-5 teleport and travel spell profiles" },
    { "number": 30, "id": "L19F-01-RULES-KERNEL-CLEANROOM-EVIDENCE", "status": "already-applied", "title": "Add rules-kernel and cleanroom evidence for every promoted level-1-9 behavior" },
    { "number": 31, "id": "L19F-02-MCP-LEVEL9-SHEET-SCENARIO", "status": "already-applied", "title": "Add executable level-9 character creation and sheet MCP scenario evidence" },
    { "number": 32, "id": "L19F-03-MCP-LEVEL9-BATTLE-HANDOFF", "status": "already-applied", "title": "Add executable level-9 battle handoff MCP scenario evidence" },
    { "number": 33, "id": "L19F-04-MCP-NONBATTLE-CONTACT-PATRON", "status": "already-applied", "title": "Add executable nonbattle MCP scenario evidence for Contact Patron or equivalent level-5 support" },
    { "number": 34, "id": "L19F-05-FOCUSED-QNT-MBT-CLOSURE", "status": "already-applied", "title": "Run focused QNT, proof, runtime, and MBT checks for promoted behavior" },
    { "number": 35, "id": "L19F-06-REVIEWER-LOOP-CONVERGENCE", "status": "already-applied", "title": "Run RAW, ubiquitous-language, architecture, connascence, and code-review convergence" },
    { "number": 36, "id": "L19F-07-RALPH-PLAN-CONSISTENCY", "status": "already-applied", "title": "Final-only, post-implementation plan consistency check" },
    { "number": 37, "id": "L19A-07-STRICT-ARTIFACT-REFRESH", "status": "already-applied", "title": "Regenerate level-1-9 artifacts under the strict full-support semantics" },
    { "number": 38, "id": "L19F-08-FINAL-SERIALIZED-QUALITY-GATE", "status": "already-applied", "title": "Run the final serialized quality gate for true level-9 full support" }
  ]
}
-->

## Execution Mandate

This plan is a full implementation plan. Its purpose is to close every strict
level-1-9 product-support blocker through real owner changes and verification,
not to produce more planning artifacts. Planning work is allowed only as a
temporary unblocker for the next implementation slice.

## Final Convergence Result

Status: implementation converged.

As of the final verification pass for this queue,
`plans/unit-profile-coverage/level1-9-full-support.json` reports:

- `claimGate.status`: `pass`
- `claimGate.strictFinalSupportBlockerCount`: `0`
- `claimGate.selectedIdentityBlockerCount`: `0`
- `claimGate.authoredReadinessBlockerCount`: `0`
- `claimGate.strictTargetOpenCount`: `0`

`plans/unit-profile-coverage/ultra-golden-gate.json` also reports:

- `status`: `pass`
- `blockedScopeIds`: `[]`
- `level-1-9` MCP scenario evidence: `4/4` required flows covered

The level-1-9 MCP rows are backed by the executable
`create-level-nine-ranger-expertise-and-battle-handoff` scenario in
`packages/mcp/src/mcp-level-nine-scenario.test.ts`; they are not
`scopeAuditDecisions` or reused lower-level audit evidence.

The remaining task entries are marked `already-applied` because their named
Surface, Character Creation, Character Sheet/session, battle runtime/QNT,
MCP/session, rules-kernel, cleanroom, and evidence outputs have landed and the
final serialized gate passed. Future agents should not restart this plan as a
planning task unless a new generated report regresses the gate.

Final gate commands run for this convergence:

- `pnpm unit-profile-coverage:check:self-test`
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check:self-test`
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `pnpm cleanroom-branch-coverage:check`
- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`
- focused package typechecks for Surface, Character Creation Runtime,
  Character Sheet Runtime, Battle Runtime, Character Battle Runtime, and MCP
- focused package runtime tests for Surface, Character Creation Runtime,
  Character Sheet Runtime, Battle Runtime, and Character Battle Runtime
- `pnpm --filter @dnd/battle-runtime test:qnt-proofs`
- `git diff --check`

Fresh-agent start rule: after reading this file, do not stop with a summary,
rewrite, lane refresh, or improved checklist. Read the current strict blocker
report, implement the smallest runnable blocker in its real owner, run the
focused verification for that owner, regenerate the strict artifacts, and repeat
until the final serialized gate passes or a concrete repository blocker prevents
safe implementation.

This file is deliberately not a request to "finish the plan document." It is a
work queue for finishing the product support itself. A Ralph agent that opens
this file must treat the Markdown as instructions for implementation, then make
the next product change that reduces strict level-1-9 blockers. Updating this
file can clarify the queue, but it is not the deliverable.

If the user says "implement this plan", the next action is implementation, not
plan maintenance. The agent must pick a strict support blocker from the current
generated report and change the owning product artifact unless one of these is
true:

- all strict blockers are already closed and only final verification remains;
- the generated report cannot identify blockers because the checker is broken;
- a branch-base, RAW-corpus, toolchain, or merge-conflict condition prevents
  safe implementation.

Plan-file edits, lane-file edits, blocker audits, task decomposition, and report
refreshes are preparatory only. They are permitted in the same run only when the
agent immediately continues into a product owner change or when the user's
latest request explicitly asks for plan-file maintenance.

Default Ralph behavior for this file:

1. Read the current strict blocker list.
2. Pick the smallest runnable implementation blocker.
3. Change the owning artifact: Surface/Dhall, Character Creation, Character
   Sheet/session code, battle runtime/QNT/rule-core, MCP/session scenario,
   rules-kernel/cleanroom evidence, or coverage evidence derived from those
   owner changes.
4. Run the focused verification named by the task.
5. Regenerate strict support artifacts and confirm blocker count decreases, or
   record an enforced product rejection.
6. Continue to the next blocker until the final serialized gate passes.

Stopping after a plan rewrite, lane refresh, blocker audit, decomposition pass,
or report regeneration is a failed run for this plan unless the user explicitly
asked for planning-only plan maintenance in that exact run. A task-local time
limit is not a success state; report it as incomplete with the next executable
implementation blocker named.

## Anti-Planning Regression Rules

These rules exist because this plan can otherwise be mistaken for a planning
task. They are binding on every future Ralph run:

- "Implement the plan" means change product owners and verification artifacts,
  not improve this Markdown.
- The first runnable task must be selected from the current strict blocker list,
  not from whichever task body is easiest to edit.
- Plan consistency, lane regeneration, report refreshes, and decomposition are
  support activities. They are not user-visible progress unless followed in the
  same run by a Surface, Character Creation, Character Sheet/session, battle
  runtime/QNT/rule-core, MCP/session, rules-kernel, cleanroom, or evidence
  change tied to a blocker.
- A Ralph run may end after planning-only work only when the latest user request
  explicitly asked for planning-only maintenance, as in "update the plan text."
- A final response for an implementation run must list the blockers closed,
  owner artifacts changed, focused checks run, and the remaining strict blocker
  count. If no blocker was closed, the response must say the run is incomplete
  and name the next executable implementation blocker.
- Do not mark a task `already-applied` or `done` because an audit row exists.
  The task is complete only after the named playable/runtime/session/evidence
  behavior exists and its focused verification passed.
- If an agent spends significant time reading, auditing, or splitting tasks, it
  must reserve the rest of the run for the smallest implementation slice. Do not
  stop at a better checklist.

## Scope

This is an implementation convergence plan, not a planning-document rewrite.
Running this plan means implementing the remaining `todo` tasks, updating the
owning code/spec/content/evidence artifacts, and iterating until the final
serialized quality gate passes. Intermediate planning, task splitting, and lane
dispatch are allowed only when they directly unblock the next implementation
change; they are not a stopping point and must not be reported as completion.

FULL level 1-9 support means playable, product-complete support for every SRD
Unit reachable by character level 9, including every in-scope level-9 class
feature and every spell-level-5 Unit reachable by a level-9 full caster or
Warlock. A row is complete only when it is supported, profile-subset-supported
with a completed runnable subset and explicit residual product decision, or
explicitly rejected by a concrete product decision recorded in this plan and
enforced by the checker.

The following states are useful during implementation but do not satisfy final
level-1-9 support for in-scope content:

- `unsupported-profile`
- `catalog-only/dead-for-now`
- `future-owner`
- `missing-authored-record`
- `missing-authored-runtime-closed`
- `class-progression-follow-up-required`
- MCP `reuse-existing-evidence` or audit-only closure

Non-battle rules still need implemented support at the correct owner: Surface,
Character Creation, Character Sheet, Spell Access, MCP/session tooling,
rules-kernel, cleanroom branch evidence, or table-facing API. "Not battle
runtime" is a routing decision, not a completion state.

Prominent baseline note: the already-applied level-1-9 inventory, report,
non-vacuity, and ultra-golden plumbing is accounting infrastructure only. The
current generated `level1-9-full-support` pass is not the product-complete
success condition for this plan.

Completion note: this plan is not complete while any in-scope implementation
task remains `todo`, while `level1-9-full-support.json` has
`claimGate.status != "pass"`, while strict final-support blockers remain, or
while `ultra-golden-gate.json` reports the `level-1-9` scope as blocked.

## Implementation Convergence Invariant

Every Ralph run against this file must make or verify product implementation
progress. A run may start with discovery, decomposition, or a plan-file repair,
but it must continue into the first runnable owner change unless no runnable
owner change exists in the checkout. Owner changes are Dhall/JSON Surface
content, Character Creation or Character Sheet code, battle runtime/QNT or
rule-core code, MCP/session scenarios, rules-kernel or cleanroom evidence, or
generated coverage artifacts derived from those changes.

This plan must not be executed as a documentation cleanup task. The Markdown is
only the queue and acceptance contract for the implementation. If an agent
updates this file, regenerates lane files, or refreshes reports, it must then
continue into the next runnable implementation slice in the same run unless the
repository is blocked by an explicit branch-base, RAW-corpus, toolchain, or
merge-conflict condition. Running out of task-local time after planning work is
not convergence and must be reported as an incomplete run, not as progress.

Planning-only output is a failed run for this plan. The only acceptable final
states for a Ralph run are:

- one or more strict blockers closed by implemented owner artifacts, focused
  verification, and regenerated evidence;
- a branch-base, RAW-corpus, or repository-state blocker that prevents safe
  implementation and is reported with exact evidence;
- the full final gate passed with zero strict level-1-9 blockers.

If the agent discovers that the plan itself is unclear, it may repair the
minimum necessary text and then must immediately return to implementation unless
the user's latest request was explicitly limited to plan-file maintenance.

If a task needs more decomposition, split only the smallest next executable
slice, then implement that slice before stopping. Do not add "future owner",
"unsupported profile", audit-reuse, catalog-only, or lane-refresh language as a
substitute for implemented support.

## Execution Contract

This file is an implementation queue. Updating Markdown, splitting lanes, or
refreshing reports is only progress when it directly precedes code/spec/content
changes that close strict support blockers.

Runnable-task selection order:

1. First, run or read the generated strict support report.
2. If strict blockers remain, choose the smallest blocker whose owner is
   Surface/Dhall, Character Creation, Character Sheet/session, battle
   runtime/QNT/rule-core, MCP/session tooling, rules-kernel, cleanroom, or
   coverage evidence derived from those owner changes.
3. Do not choose `L19F-07-RALPH-PLAN-CONSISTENCY`,
   `L19A-07-STRICT-ARTIFACT-REFRESH`, or lane-file refresh work while any
   implementation blocker is still runnable.
4. After closing a blocker, regenerate strict artifacts and either close the
   next blocker or report the next executable blocker as incomplete work.

Agents running this plan must always continue from the first unblocked
implementation task they can complete in the current checkout. A response that
only rewrites, reorganizes, or summarizes this plan is incomplete unless the
user explicitly asked for planning-only plan maintenance.

Minimum useful run rule: after any discovery or decomposition, pick the smallest
strict blocker that can be closed in one session and implement it end to end:
owner artifact, focused test, evidence row, and regenerated strict gate. If the
smallest runnable blocker is still too large, split only that blocker into the
next executable owner slice and implement that slice immediately. Do not stop
after creating subtasks.

Each completed task must leave behind all three of these:

- changed owner artifacts: Dhall/JSON Surface content, TypeScript runtime,
  Character Sheet/session code, QNT/rule-core specs, MCP scenarios, or evidence
  rows named by the task;
- verification output from the focused checks named by the task;
- regenerated strict gate artifacts showing the blocker count decreased or a
  documented product rejection enforced by the checker.

If a task exposes missing decomposition, split it only enough to make the next
implementation step runnable, then execute that step. Do not end a Ralph run at
the decomposition boundary while a runnable implementation step remains.

Run this as a standalone Ralph plan:

```bash
scripts/ralph-run.sh plans/RALPH_FULL_LEVEL1_9_SUPPORT.md
```

## Ralph Task-Base Check

Every Ralph task must run the task-base check before research or edits:

1. Log the task-provided Base SHA or Base ref.
2. Log `HEAD`.
3. Run `git merge-base --is-ancestor <Base SHA> HEAD`.
4. Stop and report a branch-base mismatch if the ancestor check fails. Do not
   rebase or repair branch state inside the task.

## Source Artifacts

- `scripts/unit-profile-coverage-check.cjs`
- `scripts/unit-profile-coverage-config.cjs`
- `scripts/unit-profile-coverage-self-test.cjs`
- `scripts/srd-unit-inventory.cjs`
- `scripts/level1-full-support-report.cjs`
- `scripts/ultra-golden-gate.cjs`
- `plans/unit-profile-coverage/level1-9-full-support.json`
- `plans/unit-profile-coverage/LEVEL1_9_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/level1-9-mining-audit.json`
- `plans/unit-profile-coverage/LEVEL1_9_MINING_AUDIT.md`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `plans/unit-profile-coverage/character-creation-owner-evidence.json`
- `plans/unit-profile-coverage/character-sheet-owner-evidence.json`
- `plans/unit-profile-coverage/shared-algebra-owner-evidence.json`
- `plans/unit-profile-coverage/mcp-scenario-evidence.json`
- `plans/rules-kernel-coverage/profile-obligations.jsonl`
- `plans/cleanroom-branch-coverage/REPORT.md`
- `packages/surface/content/*.dhall`
- `packages/character-creation-runtime/src/`
- `packages/character-sheet/`
- `packages/battle-runtime/*.qnt`
- `packages/battle-runtime/src/*.test.ts`
- `packages/battle-runtime/src/*.mbt.test.ts`
- `packages/mcp/test-support/mcp-acceptance-scenarios.ts`
- `packages/mcp/src/mcp-scenario-evidence.test.ts`
- `.references/srd-5.2.1/`
- `UBIQUITOUS_LANGUAGE.md`
- `ASSUMPTIONS.md`

## Lane Rules

- Use pnpm only. Never use npm.
- Read the relevant local SRD 5.2.1 passage and `UBIQUITOUS_LANGUAGE.md`
  before modeling any rule.
- Preserve provenance, structured input, and runtime projection as separate
  facts.
- Dhall is authored source for Surface content. JSON, catalog reports, coverage
  reports, and MCP evidence are generated or derived projections.
- Keep Spell Definition, Spell Access, Spell Invocation, Spell Effect, and
  nonbattle session execution distinct.
- Runtime behavior must not dispatch on authored identity, class name, spell
  name, provenance section, or catalog slug.
- Do not add duplicate state. Before adding fields, search Quint, runtime,
  Surface, MCP, and UI layers for an existing fact.
- Runtime promotions must be rule-core/QNT-first, then TypeScript runtime,
  then evidence rows.
- MBT is scarce. Run focused MBT only after runtime/QNT changes are complete,
  one MBT process at a time, with the repo MBT observation protocol.

## Parallel Lanes

Parallel lanes are execution lanes. They exist to let independent Surface,
Character Sheet, runtime/QNT, spell, MCP/evidence, and review work proceed
concurrently. Creating or editing lane files does not satisfy the lane; a lane
is done only when its task outputs are implemented and its verification passes.

- Lane A, Coverage gates: preserve accounting baseline, then rewrite strict
  final gate semantics.
- Lane B, Surface/Dhall: author missing class feature and spell definitions.
- Lane C, Character creation/sheet: implement progression, spell access,
  selected options, and nonbattle feature state.
- Lane D, Class runtime/QNT: promote level-9 battle features.
- Lane E, Spell-level-5 support: promote runtime or nonbattle support by
  durable owner, not authored spell identity.
- Lane F, Evidence and final gates: MCP scenarios, rules-kernel/cleanroom rows,
  reviewer convergence, and serialized quality gates.

Lane slice files are generated dispatch views of the graph below. The canonical
task bodies remain in this file; lane files must keep the same task IDs,
dependencies, outputs, and final-gate semantics:

- `plans/RALPH_FULL_LEVEL1_9_LANE_A_COVERAGE_GATES.md`
- `plans/RALPH_FULL_LEVEL1_9_LANE_B_SURFACE_DHALL.md`
- `plans/RALPH_FULL_LEVEL1_9_LANE_C_RUNTIME_QNT_FEATURES.md`
- `plans/RALPH_FULL_LEVEL1_9_LANE_D_SPELL_FRONTIER.md`
- `plans/RALPH_FULL_LEVEL1_9_LANE_E_MCP_CLEANROOM.md`
- `plans/RALPH_FULL_LEVEL1_9_LANE_F_REVIEW_QUALITY.md`

## DAG / Queue Order

| # | Lane | Task | Status | Depends on | Artifact or evidence rows |
| --: | --- | --- | --- | --- | --- |
| 1 | A | L19A-01-BASELINE-ACCOUNTING-SNAPSHOT | already-applied | none | `LEVEL1_9_BASELINE_2026-07-08.md` |
| 2 | A | L19A-02-LEVEL9-INVENTORY-PLUMBING | already-applied | L19A-01-BASELINE-ACCOUNTING-SNAPSHOT | `srd-unit-inventory.json`, `level1-9-mining-audit.json` |
| 3 | A | L19A-03-LEVEL19-REPORT-PLUMBING | already-applied | L19A-02-LEVEL9-INVENTORY-PLUMBING | `level1-9-full-support.json`, `LEVEL1_9_FULL_SUPPORT.md` |
| 4 | A | L19A-04-NONVACUOUS-SCOPE-CHECKS | already-applied | L19A-03-LEVEL19-REPORT-PLUMBING | checker self-tests for `level-9` and `spell-level-5` |
| 5 | A | L19A-05-ULTRA-GOLDEN-SCOPE-WIRING | already-applied | L19A-03-LEVEL19-REPORT-PLUMBING | `ultra-golden-gate.json` `level-1-9` scope |
| 6 | A | L19A-06-STRICT-DISPOSITION-GATE | already-applied | L19A-04-NONVACUOUS-SCOPE-CHECKS, L19A-05-ULTRA-GOLDEN-SCOPE-WIRING | strict blocker rows for unsupported/catalog/future-owner/audit-reuse |
| 7 | B | L19B-01-LEVEL9-FEATURE-DHALL-GRANTS | already-applied | L19A-06-STRICT-DISPOSITION-GATE | level-9 class feature Surface rows and grants |
| 8 | B | L19B-02-MISSING-L5-SPELL-DHALL-BATCH | already-applied | L19A-06-STRICT-DISPOSITION-GATE | 24 missing spell definition rows |
| 9 | B | L19B-03-MASS-CURE-WOUNDS-ACCESS-ADMISSION | already-applied | L19A-06-STRICT-DISPOSITION-GATE | `mass_cure_wounds` Bard/Cleric/Druid access rows |
| 10 | C | L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS | already-applied | L19A-06-STRICT-DISPOSITION-GATE | class table, PB, multiclass slots, resource deltas |
| 11 | C | L19C-02-RANGER-EXPERTISE-GENERIC-OWNER | already-applied | L19B-01-LEVEL9-FEATURE-DHALL-GRANTS, L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS | `ranger_expertise` owner evidence |
| 12 | C | L19C-03-LEVEL9-SPELL-ACCESS | already-applied | L19B-02-MISSING-L5-SPELL-DHALL-BATCH, L19B-03-MASS-CURE-WOUNDS-ACCESS-ADMISSION, L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS | level-5 full-caster/Warlock and half-caster spell-access rows |
| 13 | C | L19C-04-CONTACT-PATRON-SHEET-SESSION | already-applied | L19B-02-MISSING-L5-SPELL-DHALL-BATCH, L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS, L19C-03-LEVEL9-SPELL-ACCESS | Applied: `warlock_contact_patron` and Contact Patron `contact_other_plane` session rows |
| 14 | D | L19D-01-BRUTAL-STRIKE-RECKLESS-DAMAGE | already-applied | L19B-01-LEVEL9-FEATURE-DHALL-GRANTS, L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS | `barbarian_brutal_strike` damage subset |
| 15 | D | L19D-02-BRUTAL-STRIKE-FORCEFUL-BLOW | already-applied | L19D-01-BRUTAL-STRIKE-RECKLESS-DAMAGE | `barbarian_brutal_strike` Forceful Blow subset |
| 16 | D | L19D-03-BRUTAL-STRIKE-HAMSTRING | already-applied | L19D-01-BRUTAL-STRIKE-RECKLESS-DAMAGE | `barbarian_brutal_strike` Hamstring subset |
| 17 | D | L19D-04-FIGHTER-INDOMITABLE | already-applied | L19B-01-LEVEL9-FEATURE-DHALL-GRANTS, L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS | `fighter_indomitable` rows |
| 18 | D | L19D-05-FIGHTER-TACTICAL-MASTER | already-applied | L19B-01-LEVEL9-FEATURE-DHALL-GRANTS, L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS | `fighter_tactical_master` rows |
| 19 | D | L19D-06-PALADIN-ABJURE-FOES | already-applied | L19B-01-LEVEL9-FEATURE-DHALL-GRANTS, L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS | `paladin_abjure_foes` rows |
| 20 | D | L19D-07-MONK-ACROBATIC-MOVEMENT | already-applied | L19B-01-LEVEL9-FEATURE-DHALL-GRANTS, L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS | `monk_acrobatic_movement` rows |
| 21 | D | L19D-08-ROGUE-SUPREME-SNEAK | already-applied | L19B-01-LEVEL9-FEATURE-DHALL-GRANTS, L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS | `rogue_supreme_sneak` rows |
| 22 | E | L19E-01-L5-AREA-SAVE-DAMAGE | already-applied | L19B-02-MISSING-L5-SPELL-DHALL-BATCH, L19C-03-LEVEL9-SPELL-ACCESS | area save-damage spell-level-5 rows |
| 23 | E | L19E-02-L5-SAVE-CONDITION-CONTROL | already-applied | L19B-02-MISSING-L5-SPELL-DHALL-BATCH, L19C-03-LEVEL9-SPELL-ACCESS | save-gated control spell-level-5 rows |
| 24 | E | L19E-03-L5-ACTIVE-AREA-HAZARD | already-applied | L19B-02-MISSING-L5-SPELL-DHALL-BATCH, L19C-03-LEVEL9-SPELL-ACCESS | active hazard spell-level-5 rows |
| 25 | E | L19E-04-L5-BARRIER-WALL | already-applied | L19B-02-MISSING-L5-SPELL-DHALL-BATCH, L19C-03-LEVEL9-SPELL-ACCESS | barrier/wall spell-level-5 rows |
| 26 | E | L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE | already-applied | L19B-02-MISSING-L5-SPELL-DHALL-BATCH, L19C-03-LEVEL9-SPELL-ACCESS | summoned/object spell-level-5 rows |
| 27 | E | L19E-06-L5-RESTORATION-DEATH | already-applied | L19B-02-MISSING-L5-SPELL-DHALL-BATCH, L19C-03-LEVEL9-SPELL-ACCESS | restoration/death spell-level-5 rows |
| 28 | E | L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION | already-applied | L19B-02-MISSING-L5-SPELL-DHALL-BATCH, L19C-03-LEVEL9-SPELL-ACCESS, L19C-04-CONTACT-PATRON-SHEET-SESSION | divination/social/exploration spell-level-5 rows |
| 29 | E | L19E-08-L5-TELEPORT-TRAVEL | already-applied | L19B-02-MISSING-L5-SPELL-DHALL-BATCH, L19C-03-LEVEL9-SPELL-ACCESS | teleport/travel spell-level-5 rows |
| 30 | F | L19F-01-RULES-KERNEL-CLEANROOM-EVIDENCE | already-applied | L19C-02-RANGER-EXPERTISE-GENERIC-OWNER, L19C-03-LEVEL9-SPELL-ACCESS, L19C-04-CONTACT-PATRON-SHEET-SESSION, L19D-01-BRUTAL-STRIKE-RECKLESS-DAMAGE, L19D-02-BRUTAL-STRIKE-FORCEFUL-BLOW, L19D-03-BRUTAL-STRIKE-HAMSTRING, L19D-04-FIGHTER-INDOMITABLE, L19D-05-FIGHTER-TACTICAL-MASTER, L19D-06-PALADIN-ABJURE-FOES, L19D-07-MONK-ACROBATIC-MOVEMENT, L19D-08-ROGUE-SUPREME-SNEAK, L19E-01-L5-AREA-SAVE-DAMAGE, L19E-02-L5-SAVE-CONDITION-CONTROL, L19E-03-L5-ACTIVE-AREA-HAZARD, L19E-04-L5-BARRIER-WALL, L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE, L19E-06-L5-RESTORATION-DEATH, L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION, L19E-08-L5-TELEPORT-TRAVEL | rules-kernel and cleanroom evidence rows |
| 31 | F | L19F-02-MCP-LEVEL9-SHEET-SCENARIO | already-applied | L19C-02-RANGER-EXPERTISE-GENERIC-OWNER, L19C-03-LEVEL9-SPELL-ACCESS, L19C-04-CONTACT-PATRON-SHEET-SESSION | `mcp-scenario-evidence.json` `level-1-9` sheet row |
| 32 | F | L19F-03-MCP-LEVEL9-BATTLE-HANDOFF | already-applied | L19D-01-BRUTAL-STRIKE-RECKLESS-DAMAGE, L19D-02-BRUTAL-STRIKE-FORCEFUL-BLOW, L19D-03-BRUTAL-STRIKE-HAMSTRING, L19D-04-FIGHTER-INDOMITABLE, L19D-05-FIGHTER-TACTICAL-MASTER, L19D-06-PALADIN-ABJURE-FOES, L19D-07-MONK-ACROBATIC-MOVEMENT, L19D-08-ROGUE-SUPREME-SNEAK, L19E-01-L5-AREA-SAVE-DAMAGE, L19E-02-L5-SAVE-CONDITION-CONTROL, L19E-03-L5-ACTIVE-AREA-HAZARD, L19E-04-L5-BARRIER-WALL, L19F-02-MCP-LEVEL9-SHEET-SCENARIO | `mcp-scenario-evidence.json` battle handoff row |
| 33 | F | L19F-04-MCP-NONBATTLE-CONTACT-PATRON | already-applied | L19C-04-CONTACT-PATRON-SHEET-SESSION, L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION, L19F-02-MCP-LEVEL9-SHEET-SCENARIO | `mcp-scenario-evidence.json` nonbattle row |
| 34 | F | L19F-05-FOCUSED-QNT-MBT-CLOSURE | already-applied | L19D-01-BRUTAL-STRIKE-RECKLESS-DAMAGE, L19D-02-BRUTAL-STRIKE-FORCEFUL-BLOW, L19D-03-BRUTAL-STRIKE-HAMSTRING, L19D-04-FIGHTER-INDOMITABLE, L19D-05-FIGHTER-TACTICAL-MASTER, L19D-06-PALADIN-ABJURE-FOES, L19D-07-MONK-ACROBATIC-MOVEMENT, L19D-08-ROGUE-SUPREME-SNEAK, L19E-01-L5-AREA-SAVE-DAMAGE, L19E-02-L5-SAVE-CONDITION-CONTROL, L19E-03-L5-ACTIVE-AREA-HAZARD, L19E-04-L5-BARRIER-WALL, L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE, L19E-06-L5-RESTORATION-DEATH, L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION, L19E-08-L5-TELEPORT-TRAVEL | focused QNT/MBT evidence |
| 35 | F | L19F-06-REVIEWER-LOOP-CONVERGENCE | already-applied | L19B-01-LEVEL9-FEATURE-DHALL-GRANTS, L19B-02-MISSING-L5-SPELL-DHALL-BATCH, L19B-03-MASS-CURE-WOUNDS-ACCESS-ADMISSION, L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS, L19C-02-RANGER-EXPERTISE-GENERIC-OWNER, L19C-03-LEVEL9-SPELL-ACCESS, L19C-04-CONTACT-PATRON-SHEET-SESSION, L19D-01-BRUTAL-STRIKE-RECKLESS-DAMAGE, L19D-02-BRUTAL-STRIKE-FORCEFUL-BLOW, L19D-03-BRUTAL-STRIKE-HAMSTRING, L19D-04-FIGHTER-INDOMITABLE, L19D-05-FIGHTER-TACTICAL-MASTER, L19D-06-PALADIN-ABJURE-FOES, L19D-07-MONK-ACROBATIC-MOVEMENT, L19D-08-ROGUE-SUPREME-SNEAK, L19E-01-L5-AREA-SAVE-DAMAGE, L19E-02-L5-SAVE-CONDITION-CONTROL, L19E-03-L5-ACTIVE-AREA-HAZARD, L19E-04-L5-BARRIER-WALL, L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE, L19E-06-L5-RESTORATION-DEATH, L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION, L19E-08-L5-TELEPORT-TRAVEL, L19F-01-RULES-KERNEL-CLEANROOM-EVIDENCE, L19F-02-MCP-LEVEL9-SHEET-SCENARIO, L19F-03-MCP-LEVEL9-BATTLE-HANDOFF, L19F-04-MCP-NONBATTLE-CONTACT-PATRON, L19F-05-FOCUSED-QNT-MBT-CLOSURE | reviewer findings and fixes |
| 36 | F | L19F-07-RALPH-PLAN-CONSISTENCY | already-applied | L19F-06-REVIEWER-LOOP-CONVERGENCE | final-only plan graph consistency evidence |
| 37 | A | L19A-07-STRICT-ARTIFACT-REFRESH | already-applied | L19F-01-RULES-KERNEL-CLEANROOM-EVIDENCE, L19F-02-MCP-LEVEL9-SHEET-SCENARIO, L19F-03-MCP-LEVEL9-BATTLE-HANDOFF, L19F-04-MCP-NONBATTLE-CONTACT-PATRON, L19F-05-FOCUSED-QNT-MBT-CLOSURE, L19F-06-REVIEWER-LOOP-CONVERGENCE, L19F-07-RALPH-PLAN-CONSISTENCY | regenerated strict level-1-9 artifacts |
| 38 | F | L19F-08-FINAL-SERIALIZED-QUALITY-GATE | already-applied | L19A-07-STRICT-ARTIFACT-REFRESH | final command transcript |

## Shared Verification

Verification is convergence-oriented. If a command or generated artifact
reports a real blocker, the next action is to return to the owning implementation
lane, fix the product behavior or evidence row, regenerate artifacts, and rerun
the affected checks. Do not close this plan by saying the blocker list is now
visible.

Every implementation task must include:

- RAW/ubiquitous-language check: cite local `.references/srd-5.2.1/` files and
  `UBIQUITOUS_LANGUAGE.md` concepts for every modeled rule.
- Reviewer-loop convergence: run RAW traceability, ubiquitous-language/domain,
  architecture/connascence, and code-review passes. Fix every reasonable
  finding, explicitly reject only with a concrete reason, and repeat until no
  reasonable findings remain.
- Generated artifact discipline: when checker, evidence, or report files
  change, run `pnpm unit-profile-coverage:check --write`, then rerun
  `pnpm unit-profile-coverage:check`.
- MBT discipline: for runtime/QNT changes, run the focused MBT file named by
  the task only after implementation, with one MBT run at a time and the
  mandatory timing/progress wrapper.

The final implementation gate is:

```bash
pnpm unit-profile-coverage:check:self-test
pnpm unit-profile-coverage:check --write
pnpm unit-profile-coverage:check
pnpm rules-kernel-coverage:check:self-test
pnpm rules-kernel-coverage:check
pnpm cleanroom-branch-coverage:check
pnpm --filter @dnd/mcp test:mcp-scenario-evidence
pnpm --filter @dnd/surface exec tsc --noEmit --pretty false
pnpm --filter @dnd/character-creation-runtime test
pnpm --filter @dnd/character-sheet test
pnpm --filter @dnd/battle-runtime test
pnpm --filter @dnd/mcp test
git diff --check
```

Add focused QNT proof and MBT commands for each promoted runtime behavior.

The final `level1-9-full-support.json` must have `claimGate.status` equal to
`pass`, `claimGate.strictFinalSupportBlockerCount` equal to `0`, and no selected
identity or SRD-authored readiness blockers. The final `ultra-golden-gate.json`
must report `level-1-9` as `pass`; MCP scenario evidence must contain executable
`level-1-9` rows, not only `scopeAuditDecisions`.

## Task Details

### Task 1 - L19A-01-BASELINE-ACCOUNTING-SNAPSHOT

Status: `already-applied`

Depends on: none

Inputs:

- `plans/unit-profile-coverage/LEVEL1_9_BASELINE_2026-07-08.md`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `.references/srd-5.2.1/Classes/`
- `.references/srd-5.2.1/Character-Creation.md`
- `UBIQUITOUS_LANGUAGE.md`

Current state:

- The baseline note records that pre-plan inventory had zero `level-9` rows and
  zero `spell-level-5` rows.
- This is only a starting snapshot. It is not feature completion.

Output:

- Preserve the baseline note as historical accounting evidence.
- Expected generated artifacts or evidence rows changed: none unless correcting
  factual mistakes in the note.

Completion / Success Criteria:

- The baseline remains readable and clearly labels absent pre-plan level-9
  scope.

Acceptance:

- No task may cite this baseline as evidence that a level-9 feature or
  spell-level-5 invocation is supported.

Forbidden Shortcuts:

- Do not backdate feature support into the baseline.
- Do not delete the baseline just because strict semantics supersede it.

Verification:

- Read the baseline note and confirm its source anchors still exist.
- RAW/ubiquitous-language check: no new rule modeling in this task.

Plan Impact:

- If baseline facts are wrong, correct the note and update this plan's Current
  state section before running implementation tasks.

### Task 2 - L19A-02-LEVEL9-INVENTORY-PLUMBING

Status: `already-applied`

Depends on: `L19A-01-BASELINE-ACCOUNTING-SNAPSHOT`

Inputs:

- `scripts/srd-unit-inventory.cjs`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `plans/unit-profile-coverage/level1-9-mining-audit.json`
- `.references/srd-5.2.1/Classes/`
- `.references/srd-5.2.1/Spells/`

Current state:

- Generated inventory now includes `level-9` and `spell-level-5` rows.
- The generated mining audit reports 21 `level-9` rows and 88
  `spell-level-5` class-list rows.
- This denominator is useful but currently permits non-final closure states.

Output:

- Preserve level-9 and spell-level-5 denominator generation.
- Expected generated artifacts or evidence rows changed: none unless strict
  gate work exposes row-shape bugs in `srd-unit-inventory.json`.

Completion / Success Criteria:

- Level-9 class-table, class-feature, full-caster spell-level-5, Warlock
  spell-level-5, and Paladin/Ranger spell-level-3 reachability remain present.

Acceptance:

- Inventory rows remain generated from local SRD sources, not hand-authored.

Forbidden Shortcuts:

- Do not remove difficult rows from the denominator to pass strict gates.
- Do not conflate class-list access rows with executable spell invocation.

Verification:

- `pnpm unit-profile-coverage:check`
- RAW check against local SRD class tables and spell lists.

Plan Impact:

- If inventory row counts change, update the DAG and affected task bodies with
  the generated truth before closing rows.

### Task 3 - L19A-03-LEVEL19-REPORT-PLUMBING

Status: `already-applied`

Depends on: `L19A-02-LEVEL9-INVENTORY-PLUMBING`

Inputs:

- `scripts/level1-full-support-report.cjs`
- `scripts/unit-profile-coverage-config.cjs`
- `plans/unit-profile-coverage/level1-9-full-support.json`
- `plans/unit-profile-coverage/LEVEL1_9_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/level1-9-mining-audit.json`
- `plans/unit-profile-coverage/LEVEL1_9_MINING_AUDIT.md`

Current state:

- Level-1-9 report and mining-audit artifacts exist.
- The current report can say "pass" while leaving unsupported, catalog-only,
  future-owner, and audit-reuse work unresolved. That pass is obsolete for this
  plan.

Output:

- Preserve report plumbing as the baseline serialization path.
- Expected generated artifacts or evidence rows changed later:
  `level1-9-full-support.json`, `LEVEL1_9_FULL_SUPPORT.md`,
  `level1-9-mining-audit.json`, and `LEVEL1_9_MINING_AUDIT.md`.

Completion / Success Criteria:

- The report code remains the single generated projection for level-1-9 support.

Acceptance:

- Later strict-gate tasks strengthen this report instead of adding a parallel
  report.

Forbidden Shortcuts:

- Do not create a second "true full support" JSON file beside the generated
  report.
- Do not treat diagnostic product readiness as final gate semantics.

Verification:

- `pnpm unit-profile-coverage:check`
- Inspect the report to confirm it includes level-9 and spell-level-5 scope.

Plan Impact:

- Task 6 must modify this plumbing in place so existing artifacts become strict.

### Task 4 - L19A-04-NONVACUOUS-SCOPE-CHECKS

Status: `already-applied`

Depends on: `L19A-03-LEVEL19-REPORT-PLUMBING`

Inputs:

- `scripts/unit-profile-coverage-self-test.cjs`
- `scripts/unit-profile-coverage-check.cjs`
- `scripts/level1-full-support-report.cjs`

Current state:

- Self-tests guard against empty level-9 and spell-level-5 scope.
- The checks do not yet make unsupported-profile, catalog-only, future-owner, or
  MCP audit reuse fail final support.

Output:

- Preserve non-vacuity tests as baseline checks.
- Expected generated artifacts or evidence rows changed later: checker
  self-test fixtures and strict blocker rows.

Completion / Success Criteria:

- Empty level-9 or spell-level-5 reports cannot pass.

Acceptance:

- Non-vacuity remains separate from true support semantics.

Forbidden Shortcuts:

- Do not call non-vacuous scope "done support."
- Do not move strict blockers into prose warnings.

Verification:

- `pnpm unit-profile-coverage:check:self-test`
- `pnpm unit-profile-coverage:check`

Plan Impact:

- Task 6 extends these checks to final disposition states.

### Task 5 - L19A-05-ULTRA-GOLDEN-SCOPE-WIRING

Status: `already-applied`

Depends on: `L19A-03-LEVEL19-REPORT-PLUMBING`

Inputs:

- `scripts/ultra-golden-gate.cjs`
- `plans/unit-profile-coverage/ultra-golden-gate.json`
- `plans/unit-profile-coverage/ULTRA_GOLDEN_GATE.md`

Current state:

- The ultra-golden gate has level-1-9 scope wiring.
- This scope wiring is not final support unless strict level-1-9 support and
  real MCP evidence converge.

Output:

- Preserve level-1-9 scope in the aggregate gate.
- Expected generated artifacts or evidence rows changed later:
  `ultra-golden-gate.json` and `ULTRA_GOLDEN_GATE.md`.

Completion / Success Criteria:

- Ultra-golden sees level-1-9 as a real scope and cannot silently omit it.

Acceptance:

- Ultra-golden must consume the stricter level-1-9 result after Task 6.

Forbidden Shortcuts:

- Do not weaken earlier level scopes while adding level-1-9.
- Do not satisfy MCP evidence by carrying level-1-8 rows forward.

Verification:

- `pnpm unit-profile-coverage:check`
- Inspect `ultra-golden-gate.json` for `level-1-9`.

Plan Impact:

- Task 37 refreshes this artifact after all feature and evidence work lands.

### Task 6 - L19A-06-STRICT-DISPOSITION-GATE

Status: `already-applied`

Depends on: `L19A-04-NONVACUOUS-SCOPE-CHECKS`, `L19A-05-ULTRA-GOLDEN-SCOPE-WIRING`

Inputs:

- `scripts/unit-profile-coverage-check.cjs`
- `scripts/unit-profile-coverage-self-test.cjs`
- `scripts/level1-full-support-report.cjs`
- `plans/unit-profile-coverage/level1-9-full-support.json`
- `plans/unit-profile-coverage/mcp-scenario-evidence.json`

Current state:

- Level-1-9 reports now expose strict final-support blockers for level-9 and
  spell-level-5 rows that remain unsupported, catalog-only, missing-authored,
  future-owner, or closed by audit-only evidence.
- The ultra-golden level-1-9 support-completeness layer consumes those blocker
  counts, and MCP `level-1-9` audit reuse is rejected by the evidence checker.
- The current strict artifacts intentionally block because feature, spell, and
  MCP scenario implementation lanes still have unresolved rows.

Output:

- Strict final gate logic that fails every in-scope level-9 and spell-level-5
  row still in non-final states.
- Self-tests for missing authored Surface record, missing class grant/catalog
  admission, `unsupported-profile`, `catalog-only/dead-for-now`, future-owner
  prose, and MCP audit reuse.
- Expected generated artifacts or evidence rows changed:
  `level1-9-full-support.json`, `LEVEL1_9_FULL_SUPPORT.md`,
  `mcp-scenario-evidence.json`, checker self-test fixtures.

Completion / Success Criteria:

- A level-1-9 pass requires supported/profile-subset-supported executable
  support, a completed runnable subset, or an explicit product rejection
  recorded in this plan and represented in checker data.
- Product rejections are rare, named, source-backed, and cannot be expressed as
  future-owner text.

Acceptance:

- Injecting any forbidden final state into a level-9 or spell-level-5 row makes
  `pnpm unit-profile-coverage:check:self-test` fail.
- Reusing earlier MCP audit evidence without a real `level-1-9` scenario makes
  the MCP evidence gate fail.

Forbidden Shortcuts:

- Do not add a status enum that has no checker consequence.
- Do not hide rows by moving them outside the denominator.
- Do not treat "not battle runtime" as a final disposition.

Verification:

- RAW/ubiquitous-language check for terminology in new statuses.
- `pnpm unit-profile-coverage:check:self-test`
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`

Plan Impact:

- All implementation tasks close rows to the strict semantics introduced here;
  do not weaken this gate to make later lanes pass.

### Task 7 - L19B-01-LEVEL9-FEATURE-DHALL-GRANTS

Status: `already-applied`

Depends on: `L19A-06-STRICT-DISPOSITION-GATE`

Inputs:

- `packages/surface/content/*.dhall`
- `packages/surface/src/surface/unit-catalog.ts`
- `.references/srd-5.2.1/Classes/Barbarian.md`
- `.references/srd-5.2.1/Classes/Fighter.md`
- `.references/srd-5.2.1/Classes/Monk.md`
- `.references/srd-5.2.1/Classes/Paladin.md`
- `.references/srd-5.2.1/Classes/Ranger.md`
- `.references/srd-5.2.1/Classes/Rogue.md`
- `.references/srd-5.2.1/Classes/Warlock.md`
- `UBIQUITOUS_LANGUAGE.md`

Current state:

- Several level-9 class feature rows are admitted or closed through generated
  accounting rather than complete authored Surface records and class grants.

Output:

- Dhall source and class grants for `barbarian_brutal_strike`,
  `fighter_indomitable`, `fighter_tactical_master`,
  `monk_acrobatic_movement`, `paladin_abjure_foes`, `ranger_expertise`,
  `rogue_supreme_sneak`, and any missing `warlock_contact_patron` grant facts.
- Expected generated artifacts or evidence rows changed:
  `unit-claims.jsonl`, `unit-matrix.json`, `level1-9-full-support.json`,
  `LEVEL1_9_FULL_SUPPORT.md`, Surface generated content.

Completion / Success Criteria:

- Every in-scope level-9 feature has an SRD-provenance authored Surface record
  and a class grant at the correct class level.

Acceptance:

- Class grants and standalone Unit records cannot drift: catalog tests fail if
  either side is missing.
- No runtime behavior is claimed by Dhall admission alone.

Forbidden Shortcuts:

- Do not manually edit generated JSON to create a Surface row.
- Do not use PHB+ authored identity.
- Do not dispatch on authored feature id in runtime code.

Verification:

- RAW check against each cited class feature passage.
- `pnpm --filter @dnd/surface exec tsc --noEmit --pretty false`
- `pnpm --filter @dnd/surface exec vitest run src/surface/unit-catalog.test.ts`
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`

Plan Impact:

- The downstream class-feature tasks depend on these authored records but must still implement their
  owning runtime or sheet behavior.

### Task 8 - L19B-02-MISSING-L5-SPELL-DHALL-BATCH

Status: `already-applied`

Depends on: `L19A-06-STRICT-DISPOSITION-GATE`

Inputs:

- `packages/surface/content/*.dhall`
- `.references/srd-5.2.1/Spells/`
- `plans/unit-profile-coverage/LEVEL1_9_MINING_AUDIT.md`
- `UBIQUITOUS_LANGUAGE.md`

Current state:

- The mining audit reports missing authored records for 24 spell-level-5 SRD
  identities.

Output:

- SRD-provenance Dhall Spell Definition records for:
  `arcane_hand`, `awaken`, `commune`, `commune_with_nature`,
  `conjure_elemental`, `contact_other_plane`, `contagion`, `creation`,
  `dispel_evil_and_good`, `dream`, `greater_restoration`, `hallow`,
  `legend_lore`, `mislead`, `modify_memory`, `passwall`, `planar_binding`,
  `raise_dead`, `reincarnate`, `scrying`, `seeming`, `telepathic_bond`,
  `teleportation_circle`, and `tree_stride`.
- Expected generated artifacts or evidence rows changed:
  Surface generated content, `unit-claims.jsonl`, `unit-matrix.json`,
  `level1-9-mining-audit.json`, `LEVEL1_9_MINING_AUDIT.md`.

Completion / Success Criteria:

- Missing authored record is eliminated for all 24 named spell identities.
- Each record preserves definition/access/invocation separation.

Acceptance:

- Spell Definition admission does not claim battle runtime, session, or MCP
  execution support.
- Mixed-provenance spell collections remain unrepresentable.

Forbidden Shortcuts:

- Do not copy PHB+ identity, examples, prose, page references, or headings.
- Do not source provenance from 5e-tools.
- Do not author spell-specific runtime branches.

Verification:

- RAW check against local SRD spell files.
- `pnpm --filter @dnd/surface exec tsc --noEmit --pretty false`
- `pnpm --filter @dnd/surface exec vitest run src/surface/unit-catalog.test.ts`
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`

Plan Impact:

- The downstream spell-owner tasks consume these definitions and must add support at runtime,
  Character Sheet/session, MCP, or table-facing owners.

### Task 9 - L19B-03-MASS-CURE-WOUNDS-ACCESS-ADMISSION

Status: `already-applied`

Depends on: `L19A-06-STRICT-DISPOSITION-GATE`

Inputs:

- Existing `mass_cure_wounds` Surface record and generated catalog rows.
- `.references/srd-5.2.1/Classes/Bard.md`
- `.references/srd-5.2.1/Classes/Cleric.md`
- `.references/srd-5.2.1/Classes/Druid.md`
- `.references/srd-5.2.1/Spells/`

Current state:

- `mass_cure_wounds` appears supported, but strict level-1-9 needs explicit
  Bard, Cleric, and Druid access verification.

Output:

- Verified or repaired Spell Access rows for Bard, Cleric, and Druid.
- Evidence that the existing invocation profile remains supported.
- Expected generated artifacts or evidence rows changed:
  `unit-evidence.jsonl`, `unit-claims.jsonl`,
  `character-sheet-owner-evidence.json`, `shared-algebra-owner-evidence.json`.

Completion / Success Criteria:

- `mass_cure_wounds` has definition, class access, invocation, and effect
  evidence in level-1-9 strict scope.

Acceptance:

- Access rows do not duplicate invocation evidence.
- Existing runtime support is reused only if the focused evidence row names the
  level-5 spell path.

Forbidden Shortcuts:

- Do not infer Bard/Cleric/Druid access from a single installed spell record.
- Do not add redundant class-list state if Surface already owns it.

Verification:

- RAW check against spell list sources.
- Focused Surface/catalog and spell-access tests.
- Focused battle-runtime test for existing Mass Cure Wounds support if touched.
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`

Plan Impact:

- Closes the one existing supported level-5 spell path before grouped spell
  owner tasks handle the rest.

### Task 10 - L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS

Status: `already-applied`

Depends on: `L19A-06-STRICT-DISPOSITION-GATE`

Inputs:

- `.references/srd-5.2.1/Character-Creation.md`
- `.references/srd-5.2.1/Classes/`
- `packages/character-creation-runtime/src/`
- `packages/character-sheet/`
- `plans/unit-profile-coverage/character-sheet-owner-evidence.json`

Current state:

- Level-9 class table rows and numeric deltas are visible in generated reports
  but not necessarily product-complete sheet facts.

Output:

- Character Sheet and creation support for total-character-level Proficiency
  Bonus +4, multiclass spellcaster level 9 slots `4/3/3/3/1`, class-level
  prepared-spell counts, Pact Slot level 5, Focus 9, Sneak Attack `5d6`, Martial
  Arts `1d8`, Rage Damage +3, and other generated level-9 deltas.
- Expected generated artifacts or evidence rows changed:
  `character-sheet-owner-evidence.json`,
  `character-creation-owner-evidence.json`, `unit-evidence.jsonl`,
  class-table rows in `level1-9-full-support.json`.

Completion / Success Criteria:

- Character level, class level, multiclass spellcaster level, Pact Magic, and
  spell preparation are represented as distinct facts.

Acceptance:

- A multiclass level 9 character does not accidentally gain single-class level-9
  features.
- Slot progression never grants prepared spell access by itself.

Forbidden Shortcuts:

- Do not duplicate prepared spell access beside slot progression.
- Do not represent unknown, omitted, and empty spell access with one field.

Verification:

- RAW/ubiquitous-language review for level, slot, and preparation terms.
- Focused character creation and Character Sheet tests.
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`

Plan Impact:

- All class feature, spell access, and MCP sheet scenario tasks depend on these
  progression facts.

### Task 11 - L19C-02-RANGER-EXPERTISE-GENERIC-OWNER

Status: `already-applied`

Depends on: `L19B-01-LEVEL9-FEATURE-DHALL-GRANTS`, `L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS`

Inputs:

- `.references/srd-5.2.1/Classes/Ranger.md`
- Existing generic Expertise Surface and character creation owner.
- `packages/character-creation-runtime/src/*expertise*.test.ts`
- `packages/surface/content/class_ranger.dhall`

Current state:

- Ranger Expertise is admitted through the same generic owner used by
  Bard/Rogue Expertise, not a Ranger-specific branch.
- The implemented slice also installed the Ranger level-8 ASI grant and level-9
  Ranger spell access needed for the runnable level-9 character creation path.

Output:

- `ranger_expertise` Surface grant and owner evidence for selecting two skill
  proficiencies that do not already have Expertise.
- Expected generated artifacts or evidence rows changed:
  `character-creation-owner-evidence.json`, `unit-evidence.jsonl`,
  `unit-claims.jsonl`, `level1-9-full-support.json`.
- Applied artifacts:
  `packages/surface/content/ranger_expertise.dhall`,
  `packages/surface/content/ranger_expertise.json`,
  `packages/surface/content/ranger_ability_score_improvement_l8.dhall`,
  `packages/surface/content/ranger_ability_score_improvement_l8.json`,
  `packages/surface/content/class_ranger.dhall`,
  `packages/surface/src/surface/unit-catalog.ts`,
  `packages/surface/src/surface/schema-nonspell.ts`,
  `packages/character-creation-runtime/src/discovery.ts`,
  `packages/character-creation-runtime/src/support-gates.ts`,
  `packages/character-creation-runtime/src/ranger-expertise-level9.test.ts`,
  `plans/unit-profile-coverage/unit-claims.jsonl`, and
  `plans/unit-profile-coverage/unit-evidence.jsonl`.

Completion / Success Criteria:

- Ranger Expertise closes as supported through the generic Expertise shape.
- `ranger_expertise` has deterministic admission and selected-identity replay
  evidence rows.

Acceptance:

- Runtime receives only derived d20 modifiers through existing sheet/state
  paths.
- No authored class identity dispatch exists in Expertise handling.

Forbidden Shortcuts:

- Do not close Ranger Expertise with the level-2 Deft Explorer record.
- Do not duplicate Expertise state outside selected skill facts.

Verification:

- RAW check against Ranger Expertise text.
- Focused character creation Expertise tests.
- `pnpm --filter @dnd/surface exec vitest run src/surface/unit-catalog.test.ts`
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- Applied verification:
  `pnpm --filter @dnd/surface exec vitest run src/surface/unit-catalog.test.ts src/surface/character-creation-records.test.ts`,
  `pnpm --filter @dnd/surface exec tsc --noEmit --pretty false`,
  `pnpm check:surface-class-json-sync`,
  `pnpm --filter @dnd/character-creation-runtime exec vitest run src/ranger-expertise-level9.test.ts`,
  `pnpm --filter @dnd/character-creation-runtime exec vitest run src/index.test.ts -t "Ranger"`,
  `pnpm --filter @dnd/character-creation-runtime exec vitest run src/bard-expertise.test.ts src/rogue-expertise-level6.test.ts src/ranger-expertise-level9.test.ts`,
  `pnpm --filter @dnd/character-creation-runtime exec tsc --noEmit --pretty false`,
  `pnpm unit-profile-coverage:check --write`, and
  `pnpm unit-profile-coverage:check`.

Plan Impact:

- Provides one class-feature evidence row for the level-9 MCP sheet scenario.

### Task 12 - L19C-03-LEVEL9-SPELL-ACCESS

Status: `already-applied`

Depends on: `L19B-02-MISSING-L5-SPELL-DHALL-BATCH`, `L19B-03-MASS-CURE-WOUNDS-ACCESS-ADMISSION`, `L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS`

Inputs:

- `.references/srd-5.2.1/Classes/Bard.md`
- `.references/srd-5.2.1/Classes/Cleric.md`
- `.references/srd-5.2.1/Classes/Druid.md`
- `.references/srd-5.2.1/Classes/Paladin.md`
- `.references/srd-5.2.1/Classes/Ranger.md`
- `.references/srd-5.2.1/Classes/Sorcerer.md`
- `.references/srd-5.2.1/Classes/Warlock.md`
- `.references/srd-5.2.1/Classes/Wizard.md`
- Character Sheet spell preparation/access code.

Current state:

- Spell-level-5 class-list rows and Paladin/Ranger spell-level-3 reachability
  are generated but must become playable spell access.

Output:

- Character Sheet spell-access support for full-caster and Warlock level-5
  spell access at class level 9, plus Paladin/Ranger spell-level-3 access.
- Expected generated artifacts or evidence rows changed:
  `character-sheet-owner-evidence.json`, `unit-evidence.jsonl`,
  `level1-9-full-support.json`, `level1-9-mining-audit.json`.

Completion / Success Criteria:

- Every generated class-list row has a corresponding selectable/preparable
  sheet path or an explicit product rejection.

Acceptance:

- Spell Access does not claim Spell Invocation or Spell Effect support.
- Warlock Pact Magic remains distinct from ordinary slot progression.

Forbidden Shortcuts:

- Do not infer access from spell definition presence alone.
- Do not duplicate class lists in a second registry.

Verification:

- RAW check against class spell lists and spellcasting class features.
- Focused Character Sheet spell-access tests.
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`

Plan Impact:

- Spell-level-5 runtime and nonbattle tasks can only close rows whose access
  facts are playable.

### Task 13 - L19C-04-CONTACT-PATRON-SHEET-SESSION

Status: `already-applied`

Depends on: `L19B-02-MISSING-L5-SPELL-DHALL-BATCH`, `L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS`, `L19C-03-LEVEL9-SPELL-ACCESS`

Inputs:

- `.references/srd-5.2.1/Classes/Warlock.md`
- `.references/srd-5.2.1/Spells/Contact-Other-Plane.md`
- Warlock Character Sheet and MCP/session code.

Current state:

- Applied: `warlock_contact_patron` is authored, installed on the Warlock class
  table, and supported through Character Sheet/session runtime rather than
  battle runtime.
- Applied: `contact_other_plane` is authored as a level-5 spell and admitted for
  the completed Contact Patron subset. Ordinary non-Contact-Patron casting
  remains a separate level-5 divination/session task rather than a hidden
  final-success shortcut.

Output:

- Applied: Always-prepared Contact Other Plane for eligible Warlocks.
- Applied: No-slot Long Rest resource tracking for Contact Patron.
- Applied: Automatic save success for patron contact.
- Applied: Character Sheet/session support for making the contact and returning
  a typed table-facing outcome.
- Applied generated artifacts and evidence rows:
  `plans/unit-profile-coverage/unit-evidence.jsonl`,
  `plans/unit-profile-coverage/unit-claims.jsonl`,
  `plans/unit-profile-coverage/profiles.jsonl`,
  `plans/unit-profile-coverage/task-claims.jsonl`,
  `plans/unit-profile-coverage/level1-9-full-support.json`,
  `plans/unit-profile-coverage/LEVEL1_9_FULL_SUPPORT.md`,
  `warlock_contact_patron` and `contact_other_plane` rows.

Completion / Success Criteria:

- Applied: Contact Patron is playable through Character Sheet/session tooling
  without needing battle runtime.

Acceptance:

- Applied: The feature owns the no-slot Long Rest use; the spell definition owns
  Contact Other Plane; the session path owns the nonbattle question/answer
  execution.

Forbidden Shortcuts:

- Do not close this as future-owner text.
- Do not special-case the Warlock by authored spell identity in generic spell
  invocation reducers.

Verification:

- Applied: RAW check against
  `.references/srd-5.2.1/Classes/Warlock.md` and Contact Other Plane spell text
  in `.references/srd-5.2.1/Spells/Descriptions-A-D.md`, plus
  `UBIQUITOUS_LANGUAGE.md`.
- Applied: `pnpm --filter @dnd/character-sheet-runtime exec tsc --noEmit --pretty false`
- Applied: `pnpm --filter @dnd/character-sheet-runtime exec vitest run src/contact-patron.test.ts src/class-feature-spells.test.ts src/resources.test.ts`
- Applied: `pnpm --filter @dnd/surface exec tsc --noEmit --pretty false`
- Applied: `pnpm --filter @dnd/surface exec vitest run src/surface/unit-catalog.test.ts src/surface/character-creation-records.test.ts`
- Applied: `pnpm unit-profile-coverage:check --write`
- Applied: `pnpm unit-profile-coverage:check`

Plan Impact:

- Feeds the required nonbattle MCP scenario.

### Task 14 - L19D-01-BRUTAL-STRIKE-RECKLESS-DAMAGE

Status: `already-applied`

Depends on: `L19B-01-LEVEL9-FEATURE-DHALL-GRANTS`, `L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS`

Inputs:

- `.references/srd-5.2.1/Classes/Barbarian.md`
- `packages/shared-algebras/proofs/rule-core/`
- `packages/battle-runtime/*.qnt`
- `packages/battle-runtime/src/`

Current state:

- Brutal Strike is admitted as `unit-feature.brutal-strike` and covered by focused battle-runtime tests for the Reckless Attack opt-out and same-type damage rider.

Output:

- Rule-core/QNT and runtime support for choosing to forgo Reckless Attack's
  Advantage on the next Strength-based attack roll in exchange for Brutal Strike
  extra damage on hit.
- Expected generated artifacts or evidence rows changed:
  `shared-algebra-owner-evidence.json`, `unit-evidence.jsonl`,
  `rules-kernel/profile-obligations.jsonl`, `barbarian_brutal_strike` rows.

Completion / Success Criteria:

- The opt-out, hit gate, extra damage, and no-authored-identity reducer path are
  modeled and tested.

Acceptance:

- Reckless Attack and Brutal Strike facts change together through typed state,
  not caller memory.

Forbidden Shortcuts:

- Do not implement damage as a Barbarian-id branch in generic attack reducers.
- Do not duplicate attack advantage state.

Verification:

- RAW/ubiquitous-language check for Reckless Attack, Advantage, attack roll, and
  damage.
- Focused QNT tests and TypeScript runtime tests.
- Focused MBT only after implementation, with repo MBT protocol.
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`

Plan Impact:

- Tasks 15 and 16 build on this Brutal Strike admission shape.

### Task 15 - L19D-02-BRUTAL-STRIKE-FORCEFUL-BLOW

Status: `already-applied`

Depends on: `L19D-01-BRUTAL-STRIKE-RECKLESS-DAMAGE`

Inputs:

- `.references/srd-5.2.1/Classes/Barbarian.md`
- Existing movement, forced movement, and attack-result owners.
- Brutal Strike QNT/runtime state from Task 14.

Current state:

- Forceful Blow is covered by the `unit-feature.brutal-strike` runtime path: it emits the typed push outcome and spends up to half Speed as no-Opportunity-Attack movement. Concrete map destination and route derivation remain table/spatial witnesses.

Output:

- QNT/runtime support for Forceful Blow push and allowed Barbarian movement
  after the push, consuming table/spatial witnesses as needed.
- Expected generated artifacts or evidence rows changed:
  `shared-algebra-owner-evidence.json`, `unit-evidence.jsonl`,
  `barbarian_brutal_strike` profile-subset rows.

Completion / Success Criteria:

- Push distance, target eligibility, movement permission, and turn timing are
  represented with typed facts.

Acceptance:

- Table/spatial state remains owned by movement/map witnesses.

Forbidden Shortcuts:

- Do not add Barbarian-specific position state.
- Do not assume a push route without a movement/spatial witness.

Verification:

- RAW check against Forceful Blow text.
- Focused QNT/runtime tests.
- Focused MBT if the battle reducer route changes.
- `pnpm unit-profile-coverage:check`

Plan Impact:

- Completes one required Brutal Strike option subset.

### Task 16 - L19D-03-BRUTAL-STRIKE-HAMSTRING

Status: `already-applied`

Depends on: `L19D-01-BRUTAL-STRIKE-RECKLESS-DAMAGE`

Inputs:

- `.references/srd-5.2.1/Classes/Barbarian.md`
- Existing Speed modifier and condition/effect duration owners.
- Brutal Strike QNT/runtime state from Task 14.

Current state:

- Hamstring Blow is covered by the `unit-feature.brutal-strike` runtime path as a most-recent-only target Speed delta expiring at the start of the Barbarian's next turn.

Output:

- QNT/runtime support for applying and expiring Hamstring Blow speed reduction.
- Expected generated artifacts or evidence rows changed:
  `shared-algebra-owner-evidence.json`, `unit-evidence.jsonl`,
  `barbarian_brutal_strike` profile-subset rows.

Completion / Success Criteria:

- Speed reduction amount, target, timing, and cleanup are executable.

Acceptance:

- Speed projection uses the existing movement/speed owner.

Forbidden Shortcuts:

- Do not encode speed reduction as a condition name if the domain fact is not a
  condition.
- Do not store derived movement labels beside canonical speed modifiers.

Verification:

- RAW check against Hamstring Blow text.
- Focused QNT/runtime tests.
- Focused MBT if reducer behavior changes.
- `pnpm unit-profile-coverage:check`

Plan Impact:

- Completes the second required Brutal Strike option subset.

### Task 17 - L19D-04-FIGHTER-INDOMITABLE

Status: `already-applied`

Depends on: `L19B-01-LEVEL9-FEATURE-DHALL-GRANTS`, `L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS`

Inputs:

- `.references/srd-5.2.1/Classes/Fighter.md`
- Saving Throw, d20 roll, and Long Rest resource owners.
- `packages/shared-algebras/proofs/rule-core/`
- `packages/battle-runtime/`

Current state:

- Fighter Indomitable is not complete as a failed-Saving-Throw reroll feature.

Output:

- Failed Saving Throw reroll support, Fighter-level bonus, Long Rest resource,
  and "must use the new roll" behavior.
- Expected generated artifacts or evidence rows changed:
  `shared-algebra-owner-evidence.json`, `character-sheet-owner-evidence.json`,
  `unit-evidence.jsonl`, `fighter_indomitable` rows.

Completion / Success Criteria:

- Reroll eligibility, resource spend, Fighter level bonus, and new-roll
  replacement are represented in rule-core/QNT and runtime.

Acceptance:

- The failed save fact flows through a narrowed type; downstream code does not
  re-check a weaker generic roll.

Forbidden Shortcuts:

- Do not use a throwing helper for ordinary missing failed-save context.
- Do not make reroll optional after the new roll is known.

Verification:

- RAW/ubiquitous-language check for Saving Throw, Long Rest, and reroll.
- Focused QNT/runtime tests.
- Focused MBT if reducer behavior changes.
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`

Plan Impact:

- Supplies a strong candidate for the required MCP battle handoff scenario.

### Task 18 - L19D-05-FIGHTER-TACTICAL-MASTER

Status: `already-applied`

Depends on: `L19B-01-LEVEL9-FEATURE-DHALL-GRANTS`, `L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS`

Inputs:

- `.references/srd-5.2.1/Classes/Fighter.md`
- Existing weapon mastery, weapon attack, Push, Sap, and Slow owners.

Current state:

- Tactical Master is not promoted as a mastery replacement feature.

Output:

- QNT/runtime support for replacing an eligible weapon attack's mastery
  property with Push, Sap, or Slow.
- Expected generated artifacts or evidence rows changed:
  `shared-algebra-owner-evidence.json`, `unit-evidence.jsonl`,
  `fighter_tactical_master` rows.

Completion / Success Criteria:

- Eligibility, replacement choice, and attack-time effect routing are typed and
  tested.

Acceptance:

- Weapon mastery replacement uses existing mastery facts; it does not add a
  parallel weapon registry.

Forbidden Shortcuts:

- Do not branch on Fighter authored identity inside mastery reducers.
- Do not hand-write a union type that duplicates a constant array of options.

Verification:

- RAW check against Tactical Master text.
- Focused QNT/runtime tests for Push, Sap, and Slow replacement.
- Focused MBT if attack reducer behavior changes.
- `pnpm unit-profile-coverage:check`

Plan Impact:

- Supplies another candidate for MCP battle handoff.

### Task 19 - L19D-06-PALADIN-ABJURE-FOES

Status: `already-applied`

Depends on: `L19B-01-LEVEL9-FEATURE-DHALL-GRANTS`, `L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS`

Inputs:

- `.references/srd-5.2.1/Classes/Paladin.md`
- Channel Divinity, Magic Action, Wisdom save, Frightened condition, damage
  cleanup, duration, and target-turn action restriction owners.

Current state:

- Abjure Foes is not complete as a Channel Divinity Magic Action feature.

Output:

- QNT/runtime support for Channel Divinity spend, target selection, Wisdom save,
  Frightened application, damage-ending, duration, and target-turn action
  restriction.
- Expected generated artifacts or evidence rows changed:
  `shared-algebra-owner-evidence.json`, `character-sheet-owner-evidence.json`,
  `unit-evidence.jsonl`, `paladin_abjure_foes` rows.

Completion / Success Criteria:

- Every battle-relevant rule element has a typed owner or explicit table witness
  and is tested.

Acceptance:

- Frightened lifecycle and action restrictions reuse existing condition/action
  owners.

Forbidden Shortcuts:

- Do not model Channel Divinity as a spell slot.
- Do not store duplicate duration state beside the active effect owner.

Verification:

- RAW/ubiquitous-language check.
- Focused QNT/runtime tests.
- Focused MBT if reducer behavior changes.
- `pnpm unit-profile-coverage:check`

Plan Impact:

- Closes one major level-9 subclass feature row.

### Task 20 - L19D-07-MONK-ACROBATIC-MOVEMENT

Status: `already-applied`

Depends on: `L19B-01-LEVEL9-FEATURE-DHALL-GRANTS`, `L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS`

Inputs:

- `.references/srd-5.2.1/Classes/Monk.md`
- Armor/Shield equipment facts, movement owner, falling/turn-boundary owner,
  and table/spatial witnesses.

Current state:

- Acrobatic Movement is not complete. It needs armor/Shield-gated vertical and
  liquid movement with turn-boundary falling semantics.

Output:

- Character Sheet and runtime/table-facing support for armor/Shield-gated
  movement over vertical surfaces and liquids during the turn, including fall
  semantics when movement ends.
- Expected generated artifacts or evidence rows changed:
  `character-sheet-owner-evidence.json`, `unit-evidence.jsonl`,
  `monk_acrobatic_movement` rows.

Completion / Success Criteria:

- Equipment gate, movement surface kind, turn boundary, and falling behavior are
  explicit typed facts.

Acceptance:

- Map geometry and surface membership remain table/spatial facts, not Monk
  feature-local state.

Forbidden Shortcuts:

- Do not close as outside battle runtime without table-facing movement support.
- Do not duplicate armor/Shield equipment state.

Verification:

- RAW/ubiquitous-language check for movement and falling terms.
- Focused Character Sheet/runtime movement tests.
- Focused QNT/MBT only if battle reducer behavior changes.
- `pnpm unit-profile-coverage:check`

Plan Impact:

- Closes the Monk level-9 feature without inventing map ownership.

### Task 21 - L19D-08-ROGUE-SUPREME-SNEAK

Status: `already-applied`

Depends on: `L19B-01-LEVEL9-FEATURE-DHALL-GRANTS`, `L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS`

Inputs:

- `.references/srd-5.2.1/Classes/Rogue.md`
- Cunning Strike dice-cost owner, Hide/Invisible condition lifecycle, cover and
  discovery witnesses.

Current state:

- Supreme Sneak cannot close as future Hide ownership. It needs executable
  support or an explicit product rejection.

Output:

- Support for Supreme Sneak as a Cunning Strike dice cost plus Hide Invisible
  end suppression with a cover witness.
- Expected generated artifacts or evidence rows changed:
  `shared-algebra-owner-evidence.json`, `unit-evidence.jsonl`,
  `rogue_supreme_sneak` rows.

Completion / Success Criteria:

- Dice cost, Hide action result, Invisible continuation, cover witness, and end
  suppression are executable.

Acceptance:

- Hide and Invisible lifecycle facts are reused; Supreme Sneak does not add a
  second hidden/visibility state.

Forbidden Shortcuts:

- Do not close with "future Hide owner" text.
- Do not treat cover as a boolean stored on the Rogue.

Verification:

- RAW/ubiquitous-language check for Hide, Invisible, Cunning Strike, and cover.
- Focused QNT/runtime tests.
- Focused MBT if reducer behavior changes.
- `pnpm unit-profile-coverage:check`

Plan Impact:

- Closes the Rogue level-9 feature row under strict semantics.

### Task 22 - L19E-01-L5-AREA-SAVE-DAMAGE

Status: `already-applied`

Depends on: `L19B-02-MISSING-L5-SPELL-DHALL-BATCH`, `L19C-03-LEVEL9-SPELL-ACCESS`

Inputs:

- Spell-level-5 rows in `LEVEL1_9_MINING_AUDIT.md`.
- Existing area save-damage rule-core/QNT/runtime owners.
- Local SRD spell texts for area damage spells.

Current state:

- Some level-5 damage spells are missing authored records, catalog admission, or
  runtime support despite fitting existing area save-damage owners.

Output:

- Battle runtime support or profile-subset support for level-5 area save-damage
  spells such as `cone_of_cold`, `flame_strike`, and any generated peers that
  fit the same typed owner.
- Expected generated artifacts or evidence rows changed:
  `shared-algebra-owner-evidence.json`, `unit-evidence.jsonl`,
  `rules-kernel/profile-obligations.jsonl`, relevant spell rows.

Completion / Success Criteria:

- Area shape, save ability, damage type, half-damage rule, slot scaling, and
  table/spatial membership witness are covered.

Acceptance:

- The owner is area-save-damage, not spell-id-specific.

Forbidden Shortcuts:

- Do not reimplement area membership in spell reducers.
- Do not branch on spell names to choose save/damage behavior.

Verification:

- RAW check for each admitted spell.
- Focused QNT/runtime tests and focused MBT if reducer behavior changes.
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`

Plan Impact:

- Closes the battle-runtime damage subset of the spell-level-5 frontier.

### Task 23 - L19E-02-L5-SAVE-CONDITION-CONTROL

Status: `already-applied`

Depends on: `L19B-02-MISSING-L5-SPELL-DHALL-BATCH`, `L19C-03-LEVEL9-SPELL-ACCESS`

Inputs:

- Local SRD texts for `hold_monster`, `dominate_person`, `contagion`,
  `dispel_evil_and_good`, `geas`, `modify_memory`, and generated peers.
- Existing condition, control, charm/frighten, and repeat-save owners.

Current state:

- Save-gated condition/control level-5 spells are mostly unsupported or closed
  outside strict completion.

Output:

- Battle runtime or session/table-facing support by durable owner for
  save-gated conditions, control, repeat saves, awareness, and cleanup.
- Expected generated artifacts or evidence rows changed:
  `shared-algebra-owner-evidence.json`, `unit-evidence.jsonl`,
  `rules-kernel/profile-obligations.jsonl`, affected spell rows.

Completion / Success Criteria:

- Each promoted branch names whether support is battle runtime or nonbattle
  session/table execution and provides matching evidence.

Acceptance:

- Conditions reuse existing lifecycle owners.
- Social or memory adjudication is session-owned when battle runtime lacks the
  domain state.

Forbidden Shortcuts:

- Do not encode mental-control behavior as a spell-id branch.
- Do not treat session-only support as battle runtime evidence.

Verification:

- RAW/ubiquitous-language check.
- Focused runtime/session tests by owner.
- Focused QNT/MBT for battle-owned behavior only.
- `pnpm unit-profile-coverage:check`

Plan Impact:

- Closes or explicitly product-rejects every generated L5 save-control row.

### Task 24 - L19E-03-L5-ACTIVE-AREA-HAZARD

Status: `already-applied`

Depends on: `L19B-02-MISSING-L5-SPELL-DHALL-BATCH`, `L19C-03-LEVEL9-SPELL-ACCESS`

Inputs:

- Local SRD texts for `cloudkill`, `insect_plague`, `hallow`, and generated
  active area hazard peers.
- Existing active effect, concentration, terrain, and table/spatial owners.

Current state:

- Active hazard spells need occurrence identity, duration, membership triggers,
  movement/terrain witnesses, and cleanup.

Output:

- Runtime/table-facing support for active area hazard lifecycle, trigger timing,
  damage/control effects, and cleanup.
- Expected generated artifacts or evidence rows changed:
  `shared-algebra-owner-evidence.json`, `unit-evidence.jsonl`,
  affected spell rows.

Completion / Success Criteria:

- Each hazard has an active occurrence, owner, duration, and trigger protocol
  without duplicating map state.

Acceptance:

- Table/spatial membership remains caller-supplied or owned by the map layer.

Forbidden Shortcuts:

- Do not represent active area hazards as one-shot area damage.
- Do not add map geometry fields to spell state.

Verification:

- RAW check for every admitted hazard.
- Focused QNT/runtime tests for battle-owned triggers.
- Session/table-facing tests where support is nonbattle.
- `pnpm unit-profile-coverage:check`

Plan Impact:

- Closes the active hazard slice of spell-level-5 support.

### Task 25 - L19E-04-L5-BARRIER-WALL

Status: `already-applied`

Depends on: `L19B-02-MISSING-L5-SPELL-DHALL-BATCH`, `L19C-03-LEVEL9-SPELL-ACCESS`

Inputs:

- Local SRD texts for `wall_of_force`, `wall_of_stone`, `antilife_shell`,
  `passwall`, and generated barrier peers.
- Existing wall, barrier, cover, crossing, and table/spatial owners.

Current state:

- Barrier and wall spells cannot close as catalog-only or future-owner rows.

Output:

- Support for barrier/wall lifecycle, crossing restrictions, cover/blocking,
  damage or destruction, and table-facing placement witnesses.
- Expected generated artifacts or evidence rows changed:
  `shared-algebra-owner-evidence.json`, `unit-evidence.jsonl`,
  affected spell rows.

Completion / Success Criteria:

- Every supported subset has a runnable owner and explicit residuals.

Acceptance:

- Spatial geometry remains table-owned; reducers consume typed placement and
  crossing witnesses.

Forbidden Shortcuts:

- Do not implement a separate geometry model inside spell runtime.
- Do not close passwall-style travel with a wall-of-force-only owner.

Verification:

- RAW/ubiquitous-language check.
- Focused runtime/table-facing tests.
- Focused QNT/MBT for battle-owned barrier behavior.
- `pnpm unit-profile-coverage:check`

Plan Impact:

- Closes the level-5 barrier/wall support lane.

### Task 26 - L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE

Status: `already-applied`

Depends on: `L19B-02-MISSING-L5-SPELL-DHALL-BATCH`, `L19C-03-LEVEL9-SPELL-ACCESS`

Inputs:

- Local SRD texts for `animate_objects`, `arcane_hand`,
  `conjure_elemental`, `planar_binding`, `creation`, and generated peers.
- Existing companion, object, active effect, command, and stat-block owners.

Current state:

- Summoned/object lifecycle spells are unsupported or future-owner rows.

Output:

- Support by durable owner for object creation/animation, summoned creature or
  hand occurrence identity, command protocol, stat projections, duration, and
  cleanup.
- Expected generated artifacts or evidence rows changed:
  `shared-algebra-owner-evidence.json`, `unit-evidence.jsonl`,
  `rules-kernel/profile-obligations.jsonl`, affected spell rows.

Completion / Success Criteria:

- Each supported subset has stable occurrence identity and command/control
  semantics without authored spell dispatch.

Acceptance:

- Companion and object lifecycle facts are shared owners, not per-spell copies.

Forbidden Shortcuts:

- Do not add spell-specific creature state where Stat Block or companion owners
  already exist.
- Do not model object identity as a display label.

Verification:

- RAW check for each admitted spell.
- Focused QNT/runtime tests for battle-owned lifecycle.
- Session/table-facing tests for nonbattle object creation.
- `pnpm unit-profile-coverage:check`

Plan Impact:

- Closes the summoned/object level-5 frontier.

### Task 27 - L19E-06-L5-RESTORATION-DEATH

Status: `already-applied`

Depends on: `L19B-02-MISSING-L5-SPELL-DHALL-BATCH`, `L19C-03-LEVEL9-SPELL-ACCESS`

Inputs:

- Local SRD texts for `greater_restoration`, `raise_dead`, `reincarnate`,
  and generated peers.
- Existing condition, exhaustion, death, resurrection, and session/equipment
  owners.

Current state:

- Restoration and death-state spells need Character Sheet/session support, not
  battle-runtime-only closure.

Output:

- Support for removing named effects, restoring death-state characters, costly
  component/session requirements, and resulting character sheet changes.
- Expected generated artifacts or evidence rows changed:
  `character-sheet-owner-evidence.json`, `mcp-scenario-evidence.json` where
  used, `unit-evidence.jsonl`, affected spell rows.

Completion / Success Criteria:

- Every supported restoration/death spell has a playable sheet/session path.

Acceptance:

- Ordinary invalid targets or missing component/session facts are typed
  failures, not assertions.

Forbidden Shortcuts:

- Do not put resurrection state into battle runtime unless battle owns the
  entire death lifecycle involved.
- Do not duplicate condition state outside the condition owner.

Verification:

- RAW/ubiquitous-language check.
- Focused Character Sheet/session tests.
- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence` if MCP evidence changes.
- `pnpm unit-profile-coverage:check`

Plan Impact:

- Closes level-5 restoration/death rows through the correct owner.

### Task 28 - L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION

Status: `already-applied`

Depends on: `L19B-02-MISSING-L5-SPELL-DHALL-BATCH`, `L19C-03-LEVEL9-SPELL-ACCESS`, `L19C-04-CONTACT-PATRON-SHEET-SESSION`

Inputs:

- Local SRD texts for `commune`, `commune_with_nature`,
  `contact_other_plane`, `dream`, `legend_lore`, `scrying`, `seeming`,
  `telepathic_bond`, `awaken`, and generated peers.
- MCP/session tooling and table-facing APIs.

Current state:

- Divination, social, and exploration spells are often closed as outside battle
  runtime. Final support needs executable nonbattle/session paths or explicit
  product decisions.

Output:

- MCP/session/table-facing support for question/answer, knowledge reveal,
  remote communication, social transformation, illusion presentation, and
  exploration facts as applicable.
- Expected generated artifacts or evidence rows changed:
  `mcp-scenario-evidence.json`, `character-sheet-owner-evidence.json`,
  `unit-evidence.jsonl`, affected spell rows.

Completion / Success Criteria:

- Every row in this owner group is playable through nonbattle tooling or has an
  explicit product rejection in this plan and checker data.

Acceptance:

- Battle runtime is not used for facts it does not own.
- Session evidence is executable, not audit reuse.

Forbidden Shortcuts:

- Do not close these rows with future-owner prose.
- Do not make GM answers deterministic rules facts unless SRD requires them.

Verification:

- RAW/ubiquitous-language check.
- Focused MCP/session tests.
- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`
- `pnpm unit-profile-coverage:check`

Plan Impact:

- Provides the preferred nonbattle MCP scenario path.

### Task 29 - L19E-08-L5-TELEPORT-TRAVEL

Status: `already-applied`

Depends on: `L19B-02-MISSING-L5-SPELL-DHALL-BATCH`, `L19C-03-LEVEL9-SPELL-ACCESS`

Inputs:

- Local SRD texts for `teleportation_circle`, `tree_stride`, `passwall`, and
  generated travel peers.
- Table/spatial, travel, destination, and session owners.

Current state:

- Teleport/travel rows need table-facing support rather than battle-only
  omission.

Output:

- Session/table-facing support for destination selection, route legality,
  travel occurrence, arrival result, and sheet/session evidence.
- Expected generated artifacts or evidence rows changed:
  `mcp-scenario-evidence.json` if scenario-backed, `unit-evidence.jsonl`,
  affected spell rows.

Completion / Success Criteria:

- Every teleport/travel row has a runnable owner or explicit product rejection.

Acceptance:

- Map coordinates and destination interpretation remain table/session facts.

Forbidden Shortcuts:

- Do not fake teleport support by only spending a spell slot.
- Do not store duplicate map positions in spell state.

Verification:

- RAW check against local spell text.
- Focused session/table-facing tests.
- `pnpm unit-profile-coverage:check`

Plan Impact:

- Completes the last grouped spell-level-5 support owner lane.

### Task 30 - L19F-01-RULES-KERNEL-CLEANROOM-EVIDENCE

Status: `already-applied`

Depends on: `L19C-02-RANGER-EXPERTISE-GENERIC-OWNER`, `L19C-03-LEVEL9-SPELL-ACCESS`, `L19C-04-CONTACT-PATRON-SHEET-SESSION`, `L19D-01-BRUTAL-STRIKE-RECKLESS-DAMAGE`, `L19D-02-BRUTAL-STRIKE-FORCEFUL-BLOW`, `L19D-03-BRUTAL-STRIKE-HAMSTRING`, `L19D-04-FIGHTER-INDOMITABLE`, `L19D-05-FIGHTER-TACTICAL-MASTER`, `L19D-06-PALADIN-ABJURE-FOES`, `L19D-07-MONK-ACROBATIC-MOVEMENT`, `L19D-08-ROGUE-SUPREME-SNEAK`, `L19E-01-L5-AREA-SAVE-DAMAGE`, `L19E-02-L5-SAVE-CONDITION-CONTROL`, `L19E-03-L5-ACTIVE-AREA-HAZARD`, `L19E-04-L5-BARRIER-WALL`, `L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE`, `L19E-06-L5-RESTORATION-DEATH`, `L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION`, `L19E-08-L5-TELEPORT-TRAVEL`

Inputs:

- `plans/rules-kernel-coverage/profile-obligations.jsonl`
- `plans/cleanroom-branch-coverage/REPORT.md`
- `plans/unit-profile-coverage/shared-algebra-owner-evidence.json`
- All promoted class feature and spell owner evidence.

Current state:

- Existing rules-kernel and cleanroom gates do not yet cover all promoted
  level-9 and spell-level-5 behavior.

Output:

- Rules-kernel obligations and cleanroom branch evidence for every promoted
  runtime or nonbattle owner that requires them.
- Expected generated artifacts or evidence rows changed:
  `profile-obligations.jsonl`, cleanroom reports, `shared-algebra-owner-evidence.json`.

Completion / Success Criteria:

- No promoted supported row lacks rules-kernel/cleanroom evidence when that
  layer owns or observes the behavior.

Acceptance:

- Evidence rows name the owner and behavior shape, not authored identity alone.

Forbidden Shortcuts:

- Do not reuse an older branch sample for a new level-9 or L5 behavior.
- Do not add rules-kernel labels without testable obligations.

Verification:

- `pnpm rules-kernel-coverage:check:self-test`
- `pnpm rules-kernel-coverage:check`
- `pnpm cleanroom-branch-coverage:check`
- `pnpm unit-profile-coverage:check`

Plan Impact:

- Required before regenerated strict artifacts can pass.

### Task 31 - L19F-02-MCP-LEVEL9-SHEET-SCENARIO

Status: `already-applied`

Depends on: `L19C-02-RANGER-EXPERTISE-GENERIC-OWNER`, `L19C-03-LEVEL9-SPELL-ACCESS`, `L19C-04-CONTACT-PATRON-SHEET-SESSION`

Inputs:

- `packages/mcp/test-support/mcp-acceptance-scenarios.ts`
- `packages/mcp/src/mcp-scenario-evidence.test.ts`
- `plans/unit-profile-coverage/mcp-scenario-evidence.json`

Current state:

- MCP evidence does not yet contain a real level-1-9 character creation/sheet
  scenario using returned draft revisions and option ids.

Output:

- Executable MCP scenario that creates or advances a level-9 character, uses
  returned draft revision ids and option ids, and verifies Character Sheet
  progression/spell-access facts.
- Expected generated artifacts or evidence rows changed:
  `mcp-scenario-evidence.json` with a real `level-1-9` sheet evidence row.

Completion / Success Criteria:

- Scenario evidence is generated from test execution, not hand-authored audit
  reuse.

Acceptance:

- The scenario covers at least one new level-9 class feature access path and one
  level-5 spell access path.

Forbidden Shortcuts:

- Do not hard-code option ids that the MCP flow did not return.
- Do not satisfy level-1-9 by referencing level-1-8 or level-6 evidence.

Verification:

- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`

Plan Impact:

- Required final MCP evidence row for level-1-9 sheet support.

### Task 32 - L19F-03-MCP-LEVEL9-BATTLE-HANDOFF

Status: `already-applied`

Depends on: `L19D-01-BRUTAL-STRIKE-RECKLESS-DAMAGE`, `L19D-02-BRUTAL-STRIKE-FORCEFUL-BLOW`, `L19D-03-BRUTAL-STRIKE-HAMSTRING`, `L19D-04-FIGHTER-INDOMITABLE`, `L19D-05-FIGHTER-TACTICAL-MASTER`, `L19D-06-PALADIN-ABJURE-FOES`, `L19D-07-MONK-ACROBATIC-MOVEMENT`, `L19D-08-ROGUE-SUPREME-SNEAK`, `L19E-01-L5-AREA-SAVE-DAMAGE`, `L19E-02-L5-SAVE-CONDITION-CONTROL`, `L19E-03-L5-ACTIVE-AREA-HAZARD`, `L19E-04-L5-BARRIER-WALL`, `L19F-02-MCP-LEVEL9-SHEET-SCENARIO`

Inputs:

- MCP battle handoff scenarios.
- Newly promoted level-9 class feature and spell-level-5 battle paths.
- `plans/unit-profile-coverage/mcp-scenario-evidence.json`

Current state:

- MCP evidence does not exercise a new level-9 class feature and a level-5 spell
  through returned battle holes.

Output:

- Executable MCP battle handoff scenario that reaches battle state and exercises
  at least one new level-9 class feature and one level-5 spell path through
  returned battle holes.
- Expected generated artifacts or evidence rows changed:
  `mcp-scenario-evidence.json` with a real `level-1-9` battle handoff row.

Completion / Success Criteria:

- The scenario proves Character Sheet to battle handoff for newly promoted
  behavior.

Acceptance:

- Returned battle holes, participant ids, and action ids are consumed from the
  MCP flow.

Forbidden Shortcuts:

- Do not mock the handoff after the character sheet step.
- Do not use a preexisting level-1-8 battle path as the sole evidence.

Verification:

- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`
- Focused battle runtime tests for the scenario behavior.
- `pnpm unit-profile-coverage:check`

Plan Impact:

- Required final MCP evidence row for level-1-9 battle support.

### Task 33 - L19F-04-MCP-NONBATTLE-CONTACT-PATRON

Status: `already-applied`

Depends on: `L19C-04-CONTACT-PATRON-SHEET-SESSION`, `L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION`, `L19F-02-MCP-LEVEL9-SHEET-SCENARIO`

Inputs:

- Contact Patron/session support from Task 13 or another completed nonbattle
  level-5 spell owner if Contact Patron is replaced by explicit product
  decision.
- MCP scenario registry and evidence tests.

Current state:

- There is no executable level-1-9 nonbattle MCP scenario for Contact Patron or
  an equivalent level-5 nonbattle spell.

Output:

- Executable nonbattle MCP scenario for Contact Patron, or another level-5
  nonbattle spell only if this plan is amended with the product reason.
- Expected generated artifacts or evidence rows changed:
  `mcp-scenario-evidence.json` with a real `level-1-9` nonbattle row.

Completion / Success Criteria:

- The scenario exercises session support, consumes returned identifiers, and
  records level-1-9 evidence.

Acceptance:

- The row is not `scopeAuditDecisions` only.

Forbidden Shortcuts:

- Do not reuse earlier audit evidence.
- Do not mark nonbattle support complete by spending a spell slot only.

Verification:

- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`

Plan Impact:

- Required final MCP evidence row for level-1-9 nonbattle support.

### Task 34 - L19F-05-FOCUSED-QNT-MBT-CLOSURE

Status: `already-applied`

Depends on: `L19D-01-BRUTAL-STRIKE-RECKLESS-DAMAGE`, `L19D-02-BRUTAL-STRIKE-FORCEFUL-BLOW`, `L19D-03-BRUTAL-STRIKE-HAMSTRING`, `L19D-04-FIGHTER-INDOMITABLE`, `L19D-05-FIGHTER-TACTICAL-MASTER`, `L19D-06-PALADIN-ABJURE-FOES`, `L19D-07-MONK-ACROBATIC-MOVEMENT`, `L19D-08-ROGUE-SUPREME-SNEAK`, `L19E-01-L5-AREA-SAVE-DAMAGE`, `L19E-02-L5-SAVE-CONDITION-CONTROL`, `L19E-03-L5-ACTIVE-AREA-HAZARD`, `L19E-04-L5-BARRIER-WALL`, `L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE`, `L19E-06-L5-RESTORATION-DEATH`, `L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION`, `L19E-08-L5-TELEPORT-TRAVEL`

Inputs:

- Focused QNT slices and MBT files touched by the class-runtime and spell-runtime tasks.
- Repo MBT protocol in `AGENTS.md`.

Current state:

- Promoted behavior will need focused proof and parity validation after
  implementation.

Output:

- A task-local verification log listing every focused QNT, proof, runtime, and
  MBT command run for promoted behavior.
- Expected generated artifacts or evidence rows changed:
  no generated coverage rows unless tests discover missing evidence.

Completion / Success Criteria:

- Every promoted battle-runtime behavior has focused QNT/runtime validation and
  focused MBT where parity behavior changed.

Acceptance:

- MBT failures are reproduced with `QUINT_SEED` before diagnosis.
- Only one MBT process runs at a time and zombie evaluators are checked.

Forbidden Shortcuts:

- Do not run broad MBT for exploration.
- Do not dismiss nondeterministic MBT failures as flaky.

Verification:

- Focused commands named by implementation tasks.
- `pnpm --filter @dnd/battle-runtime test:qnt-proofs` before merging proof/spec
  changes.
- `ps aux | grep vitest` and `ps aux | grep quint_evaluator | grep -v grep`
  checks before MBT runs.

Plan Impact:

- Blocks final artifact refresh until runtime parity evidence is complete.

### Task 35 - L19F-06-REVIEWER-LOOP-CONVERGENCE

Status: `already-applied`

Depends on: `L19B-01-LEVEL9-FEATURE-DHALL-GRANTS`, `L19B-02-MISSING-L5-SPELL-DHALL-BATCH`, `L19B-03-MASS-CURE-WOUNDS-ACCESS-ADMISSION`, `L19C-01-LEVEL9-PROGRESSION-SHEET-FACTS`, `L19C-02-RANGER-EXPERTISE-GENERIC-OWNER`, `L19C-03-LEVEL9-SPELL-ACCESS`, `L19C-04-CONTACT-PATRON-SHEET-SESSION`, `L19D-01-BRUTAL-STRIKE-RECKLESS-DAMAGE`, `L19D-02-BRUTAL-STRIKE-FORCEFUL-BLOW`, `L19D-03-BRUTAL-STRIKE-HAMSTRING`, `L19D-04-FIGHTER-INDOMITABLE`, `L19D-05-FIGHTER-TACTICAL-MASTER`, `L19D-06-PALADIN-ABJURE-FOES`, `L19D-07-MONK-ACROBATIC-MOVEMENT`, `L19D-08-ROGUE-SUPREME-SNEAK`, `L19E-01-L5-AREA-SAVE-DAMAGE`, `L19E-02-L5-SAVE-CONDITION-CONTROL`, `L19E-03-L5-ACTIVE-AREA-HAZARD`, `L19E-04-L5-BARRIER-WALL`, `L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE`, `L19E-06-L5-RESTORATION-DEATH`, `L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION`, `L19E-08-L5-TELEPORT-TRAVEL`, `L19F-01-RULES-KERNEL-CLEANROOM-EVIDENCE`, `L19F-02-MCP-LEVEL9-SHEET-SCENARIO`, `L19F-03-MCP-LEVEL9-BATTLE-HANDOFF`, `L19F-04-MCP-NONBATTLE-CONTACT-PATRON`, `L19F-05-FOCUSED-QNT-MBT-CLOSURE`

Inputs:

- Full changeset from the Surface, sheet, runtime, spell, MCP, and focused verification tasks.
- `.claude/review-rules.md`
- `.references/srd-5.2.1/`
- `UBIQUITOUS_LANGUAGE.md`
- `ASSUMPTIONS.md`

Current state:

- Significant feature and evidence work must converge through project review
  loops before final success.

Output:

- Reviewer-loop findings and fixes for RAW traceability,
  ubiquitous-language/domain language, architecture/no-duplicate-state,
  connascence, and code review.
- Expected generated artifacts or evidence rows changed: any artifact required
  by fixes.

Completion / Success Criteria:

- No reasonable findings remain. Rejected findings have concrete reasons.

Acceptance:

- At least two rounds run unless the final changeset is trivially small.

Forbidden Shortcuts:

- Do not stop after one round when real findings remain.
- Do not replace executable invariants with comments.

Verification:

- Reviewer loop logs.
- Focused tests for every fix.
- `git diff --check`

Plan Impact:

- Any real finding creates follow-up fixes before Task 37 can run.

### Task 36 - L19F-07-RALPH-PLAN-CONSISTENCY

Status: `already-applied`

Depends on: `L19F-06-REVIEWER-LOOP-CONVERGENCE`

Inputs:

- `plans/RALPH_FULL_LEVEL1_9_SUPPORT.md`
- Any regenerated lane files, if reintroduced.

Current state:

- Lane files exist as dispatch views, while this plan remains the canonical
  graph.
- Plan consistency is not a product-support task and is not eligible as the
  next Ralph task while any strict support blocker remains runnable.
- This task cannot complete the plan unless every implementation lane has
  already converged and strict gates pass.
- This task is a final hygiene check only. If any strict blocker remains open,
  the correct action is to return to the owning implementation lane, not to keep
  polishing the plan graph.

Output:

- Plan-file validation evidence.
- Expected generated artifacts or evidence rows changed: none.

Completion / Success Criteria:

- Before this task starts, `level1-9-full-support.json` shows
  `claimGate.strictFinalSupportBlockerCount` equal to `0` or the immediately
  preceding strict report refresh shows zero remaining final blockers.
- Task index, DAG rows, and task headings are synchronized.
- No orphan dependencies exist.
- Every task has Status, Depends on, Inputs, Current state, Output,
  Completion / Success Criteria, Acceptance, Forbidden Shortcuts, Verification,
  and Plan Impact sections.
- Lane files are absent or regenerated from the final graph.
- The Scope, Implementation Convergence Invariant, Execution Contract, and lane
  files all say that planning-only work is not completion.

Acceptance:

- A simple parser can extract every task id from the JSON index, DAG, and
  headings with no mismatches.

Forbidden Shortcuts:

- Do not select this task as a normal implementation task.
- Do not leave stale lane files with old completion semantics.
- Do not update the JSON index without updating task bodies.
- Do not mark this task complete as a substitute for closing implementation
  blockers.
- Do not run this task as the main work of a Ralph session while a code,
  Surface, QNT, MCP, or evidence blocker is still runnable.

Verification:

- Local structural script or one-off Node validation.
- Manual read of Scope and Shared Verification sections.
- `git diff --check`

Plan Impact:

- Fix this plan before final quality gates if any mismatch is found, then return
  immediately to implementation unless the strict final support blocker count is
  already zero.

### Task 37 - L19A-07-STRICT-ARTIFACT-REFRESH

Status: `already-applied`

Depends on: `L19F-01-RULES-KERNEL-CLEANROOM-EVIDENCE`, `L19F-02-MCP-LEVEL9-SHEET-SCENARIO`, `L19F-03-MCP-LEVEL9-BATTLE-HANDOFF`, `L19F-04-MCP-NONBATTLE-CONTACT-PATRON`, `L19F-05-FOCUSED-QNT-MBT-CLOSURE`, `L19F-06-REVIEWER-LOOP-CONVERGENCE`, `L19F-07-RALPH-PLAN-CONSISTENCY`

Inputs:

- All strict gate, implementation, evidence, and reviewer-loop outputs.
- `scripts/unit-profile-coverage-check.cjs`
- `scripts/ultra-golden-gate.cjs`

Current state:

- Level-1-9 artifacts must be regenerated after strict semantics and support
  work land.

Output:

- Final strict generated artifacts:
  `level1-9-full-support.json`, `LEVEL1_9_FULL_SUPPORT.md`,
  `level1-9-mining-audit.json`, `LEVEL1_9_MINING_AUDIT.md`,
  `ultra-golden-gate.json`, and `ULTRA_GOLDEN_GATE.md`.

Completion / Success Criteria:

- No in-scope level-9 or spell-level-5 row remains in a forbidden final state.

Acceptance:

- `mcp-scenario-evidence.json` contains real `level-1-9` evidence rows, not
  only `scopeAuditDecisions`.
- Final gate fails if any row regresses to unsupported/catalog/future-owner
  closure.

Forbidden Shortcuts:

- Do not hand-edit generated artifacts.
- Do not remove rows from scope to make the gate pass.

Verification:

- `pnpm unit-profile-coverage:check:self-test`
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check:self-test`
- `pnpm rules-kernel-coverage:check`
- `pnpm cleanroom-branch-coverage:check`
- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`

Plan Impact:

- If strict artifacts fail, return to the owning lane and fix the row; do not
  weaken Task 6.

### Task 38 - L19F-08-FINAL-SERIALIZED-QUALITY-GATE

Status: `already-applied`

Depends on: `L19A-07-STRICT-ARTIFACT-REFRESH`

Inputs:

- Final generated artifacts and implementation changes from all lanes.

Current state:

- Final quality gate must run after all row support, evidence, review, and
  artifact refresh work.
- The plan is not complete merely because this task exists or because earlier
  planning/checker tasks have run. It is complete only after all implementation
  lanes converge and this task's final gate passes.

Output:

- Final serialized command transcript and any required last-mile fixes.
- Expected generated artifacts or evidence rows changed: none unless a command
  finds a real issue.

Completion / Success Criteria:

- Every final gate command passes.
- `plans/unit-profile-coverage/level1-9-full-support.json` has
  `claimGate.status` equal to `pass`.
- `plans/unit-profile-coverage/ultra-golden-gate.json` reports the `level-1-9`
  scope as `pass`.
- No `todo` task remains for in-scope Surface, Character Sheet, runtime/QNT,
  spell, MCP, rules-kernel, cleanroom, or review evidence needed by level-1-9.

Acceptance:

- The final report shows true level-1-9 product-complete support under this
  plan's Scope definition.

Forbidden Shortcuts:

- Do not skip expensive focused MBT/QNT required by changed runtime behavior.
- Do not merge with dirty generated artifacts after `--write`.

Verification:

- `pnpm unit-profile-coverage:check:self-test`
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check:self-test`
- `pnpm rules-kernel-coverage:check`
- `pnpm cleanroom-branch-coverage:check`
- `pnpm --filter @dnd/mcp test:mcp-scenario-evidence`
- Focused package typechecks/tests for Surface, character creation/sheet,
  battle runtime, and MCP.
- Focused QNT/MBT for every promoted runtime behavior, using the repo MBT
  protocol.
- `git diff --check`

Plan Impact:

- If any command fails, fix the owning task output and rerun the affected gate
  sequence before declaring level-1-9 full support.
- If this task is reached while strict blockers remain, do not summarize the
  blockers as the result; return to the implementation task that owns each
  blocker and continue.
