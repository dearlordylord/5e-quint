# Ralph L1/L2 Source Harness Campaign

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L12-SH01-DENOMINATOR-FORMAT-GATE",
      "status": "done",
      "title": "Verify the L1/L2 source denominator and Ralph format"
    },
    {
      "number": 2,
      "id": "L12-SH02-LEGAL-FIXTURE-SEAM",
      "status": "done",
      "title": "Implement the legal source-side lifecycle fixture seam"
    },
    {
      "number": 3,
      "id": "L12-SH03-SEED-MIGRATION-AUDIT",
      "status": "done",
      "title": "Audit existing seed rows for legal lifecycle proof"
    },
    {
      "number": 4,
      "id": "L12-SH04-GROUPING-GENERATOR-GATE",
      "status": "done",
      "title": "Generate the L1/L2 campaign grouping gate"
    },
    {
      "number": 5,
      "id": "L12-SH05-CREATION-SDK-FIRST-SLICE",
      "status": "done",
      "title": "Add the first character-creation SDK slice"
    },
    {
      "number": 6,
      "id": "L12-SH06-BUILD-SHEET-FIRST-SLICE",
      "status": "done",
      "title": "Add the first build-to-sheet SDK slice"
    },
    {
      "number": 7,
      "id": "L12-SH07-BUILD-BATTLE-FIRST-SLICE",
      "status": "ready-for-research",
      "title": "Add the first build-to-battle SDK slice"
    },
    {
      "number": 8,
      "id": "L12-SH08-SHEET-SDK-FIRST-SLICE",
      "status": "ready-for-research",
      "title": "Add the first character-sheet SDK slice"
    },
    {
      "number": 9,
      "id": "L12-SH09-SHEET-SPELL-ACCESS-FIRST-SLICE",
      "status": "ready-for-research",
      "title": "Add the first sheet spell-access SDK slice"
    },
    {
      "number": 10,
      "id": "L12-SH10-BATTLE-FEATURE-FIRST-SLICE",
      "status": "ready-for-research",
      "title": "Add the first battle-feature SDK slice"
    },
    {
      "number": 11,
      "id": "L12-SH11-BATTLE-SPELL-FIRST-SLICE",
      "status": "ready-for-research",
      "title": "Add the first battle-spell SDK slice"
    },
    {
      "number": 12,
      "id": "L12-SH12-MULTI-OWNER-FIRST-SLICE",
      "status": "ready-for-research",
      "title": "Split the first multi-owner feature SDK slice"
    },
    {
      "number": 13,
      "id": "L12-SH13-CLOSURE-REVIEW-FIRST-FAMILY",
      "status": "ready-for-research",
      "title": "Close the first spell-effect owner review family"
    },
    {
      "number": 14,
      "id": "L12-SH14-QNT-HARNESS-PRESSURE-FIRST-WITNESS",
      "status": "ready-for-research",
      "title": "Add the first small QNT harness pressure witness"
    },
    {
      "number": 15,
      "id": "L12-SH15-NEXT-BATCH-SPLIT",
      "status": "blocked",
      "title": "Expand the next one-session task batches"
    },
    {
      "number": 16,
      "id": "L12-SH16-CLEANROOM-GATE-PLAN",
      "status": "blocked",
      "title": "Prepare the later cleanroom replay gate"
    },
    {
      "number": 17,
      "id": "L12-SH17-SEED-MIGRATE-BARBARIAN-RAGE",
      "status": "ready-for-research",
      "title": "Migrate the Barbarian Rage seed to legal source creation"
    },
    {
      "number": 18,
      "id": "L12-SH18-SEED-MIGRATE-BARDIC-INSPIRATION",
      "status": "ready-for-research",
      "title": "Migrate the Bardic Inspiration seed to legal source creation"
    },
    {
      "number": 19,
      "id": "L12-SH19-SEED-MIGRATE-FIGHTER-SECOND-WIND",
      "status": "ready-for-research",
      "title": "Migrate the Fighter Second Wind seed to legal source creation"
    },
    {
      "number": 20,
      "id": "L12-SH20-SEED-MIGRATE-MONK-MARTIAL-ARTS",
      "status": "ready-for-research",
      "title": "Migrate the Monk Martial Arts seed to legal source creation"
    },
    {
      "number": 21,
      "id": "L12-SH21-SEED-MIGRATE-ROGUE-SNEAK-ATTACK",
      "status": "ready-for-research",
      "title": "Migrate the Rogue Sneak Attack seed to legal source creation"
    },
    {
      "number": 22,
      "id": "L12-SH22-SEED-MIGRATE-SORCERER-INNATE-SORCERY",
      "status": "ready-for-research",
      "title": "Migrate the Sorcerer Innate Sorcery seed to legal source creation"
    },
    {
      "number": 23,
      "id": "L12-SH23-SEED-MIGRATE-SORCERER-BURNING-HANDS",
      "status": "ready-for-research",
      "title": "Migrate the Sorcerer Burning Hands seed to legal source creation"
    }
  ]
}
-->

## Scope

This Ralph plan turns the current narrow Fighter L1/L2 lifecycle witness into a
source-side harness campaign for whole SRD character levels 1 and 2. The output
of this plan is the runnable campaign queue. It does not ask the first task to
implement the full harness in one pass.

The source-side harness means:

- legal SRD character creation produces the `CharacterBuild`;
- `CharacterBuild` creates a fresh `CharacterSheet`;
- sheet/build facts project through character-to-battle handoff;
- battle-owned behavior resolves through focused runtime reducers;
- settlement returns accepted battle-owned deltas to the sheet when relevant;
- source evidence updates the generated SDK RAW inventory without adding
  cleanroom target edits.

This campaign is source-side first. Cleanroom replay is a later gate after the
fixture seam, source scenarios, grouping evidence, and small QNT pressure are
stable.

## Campaign Rules

- Use the local SRD 5.2.1 corpus only: `.references/srd-5.2.1/`.
- Check `UBIQUITOUS_LANGUAGE.md` before modeling or naming rule concepts.
- Do not copy PHB+ authored identity into source, tests, fixtures, docs, or
  generated artifacts.
- Do not dispatch production runtime behavior on authored identity. Runtime
  behavior must use shape, support-profile facts, typed procedure facts, and
  explicit runtime state.
- New whole-width lifecycle proof must not hand-build `CharacterBuild`. Scenario
  builders must go through `createCharacterDraft`, `discoverCreationHoles`,
  `fillCreationHoles`, and `finalizeCharacterDraft`. Direct `CharacterBuild`
  construction is legacy seed material to audit and migrate, not a pattern for
  new source harness slices.
- Do not add a production public facade for the harness unless a later task
  explicitly promotes one. Keep fixture APIs test-local or package-internal.
- Do not edit cleanroom target branches from this source-side plan.
- Do not run broad battle MBT for exploratory work. Use source reads, focused TS
  tests, and small deterministic QNT witnesses. Run battle MBT only when an
  executable behavior change requires the focused MBT lane.
- Preserve the distinction between provenance, structured input, and runtime
  projection. SRD is provenance for shipped SRD content; generated inventory is
  campaign planning evidence; source-side fixtures are runtime test inputs.
- Make invalid states unrepresentable before adding fixture or evidence data
  shapes. Do not store duplicate facts that can be derived from a canonical
  source.

## Denominator Snapshot

The frozen L1/L2 source harness denominator comes from
`plans/sdk-raw-integration/level1-5-sdk-raw-inventory.json`, filtered to
`level-1`, `level-2`, `spell-level-0`, and `spell-level-1`.

| Metric | Count |
| --- | ---: |
| L1/L2 diagnostic product-readiness rows | 400 |
| L1/L2 scenario groups | 207 |
| Existing L1/L2 seed rows | 65 |
| `sdk-scenario-needed` rows | 240 |
| `seed-scenario-present` rows | 65 |
| `explicit-closure-needed` rows | 24 |
| `closure-review-needed` rows | 71 |

Campaign assignment by lane:

| Lane | Rows | Groups | Disposition | Initial owner in this plan |
| --- | ---: | ---: | --- | --- |
| fixture/enabling | 0 | 0 | enabling work | Tasks 1-4 |
| character-creation-sdk | 14 | 14 | `sdk-scenario-needed` | Task 15 follow-ups |
| build-sheet-sdk | 100 | 12 | `sdk-scenario-needed` | Task 6, then Task 15 follow-ups |
| build-battle-sdk | 17 | 12 | `sdk-scenario-needed` | Task 7, then Task 15 follow-ups |
| character-sheet-sdk | 7 | 7 | `sdk-scenario-needed` | Task 8, then Task 15 follow-ups |
| sheet-spell-access-sdk | 7 | 7 | `sdk-scenario-needed` | Task 9, then Task 15 follow-ups |
| battle-feature-sdk | 6 | 6 | `sdk-scenario-needed` | Task 10, then Task 15 follow-ups |
| battle-spell-sdk | 83 | 32 | `sdk-scenario-needed` | Task 11, then Task 15 follow-ups |
| multi-owner-feature-sdk | 6 | 6 | `sdk-scenario-needed` | Task 12, then Task 15 follow-ups |
| seed-present | 65 | 65 | `seed-scenario-present` | Task 3 migration audit, Tasks 17-23 seed migrations, Task 5 creation-owner seed, then Task 15 follow-ups |
| explicit-closure | 24 | 24 | `explicit-closure-needed` | Task 4 grouping gate and Task 15 follow-ups |
| spell-effect-owner-review | 71 | 22 | `closure-review-needed` | Task 13, then Task 15 follow-ups |

Every L1/L2 row in the four active dispositions is assigned by the table above.
Tasks 6-14 are remaining first representative slices. The campaign now has 65
seed-present rows: 57 whole-width lifecycle seed rows, seven direct-build seed
rows needing migration, and one character-creation owner proof. Tasks 17-23
carry the row-specific direct-build migrations. Task 15 must
preserve the remaining desired work as concrete Ralph tasks in the index, DAG,
and task details.

## Source Artifacts

- `scripts/ralph-run.md`
- `scripts/ralph-run.sh`
- `plans/RALPH_*.md`
- `plans/sdk-raw-integration/level1-5-sdk-raw-inventory.json`
- `plans/sdk-raw-integration/LEVEL1_5_SDK_RAW_INVENTORY.md`
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/level1-2-full-support.json`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `plans/unit-profile-coverage/character-creation-owner-evidence.json`
- `plans/unit-profile-coverage/character-sheet-owner-evidence.json`
- `plans/rules-kernel-coverage/`
- `packages/character-battle-runtime/src/fighter-character-lifecycle-test-support.ts`
- `packages/character-battle-runtime/src/character-layer-projection-lifecycle.mbt.test.ts`
- `packages/character-battle-runtime/character-layer-projection-lifecycle.mbt.qnt`
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `packages/character-creation-runtime/src/`
- `packages/character-sheet-runtime/src/`
- `packages/battle-runtime/src/`
- `.references/srd-5.2.1/`
- `UBIQUITOUS_LANGUAGE.md`
- `ASSUMPTIONS.md`

## Task Template

Every task below inherits this template unless the task says otherwise.

Base SHA check:

- Log the task-provided base ref or Base SHA from the Ralph prompt.
- Log `HEAD`.
- Run `git merge-base --is-ancestor <Base SHA> HEAD`.
- Stop and report branch-base mismatch if the ancestor check fails. Do not
  repair branch state by rebasing against `master`.

Research required before editing:

- Read the task body and the generated Ralph task-context packet.
- Read the relevant source artifacts listed by the task.
- Read the relevant local SRD passage in `.references/srd-5.2.1/`.
- Check `UBIQUITOUS_LANGUAGE.md` for terminology before naming or modeling rule
  concepts.
- Search for existing fields or evidence rows before adding a new field or
  planning data shape.

Output:

- A narrowly scoped implementation, research artifact, or plan update matching
  the task.
- No unrelated refactors.
- No cleanroom edits unless the task is the later cleanroom gate.

Acceptance:

- The task-local acceptance criteria pass.
- The task does not double-count legacy seed rows as whole-width lifecycle proof
  unless the seed uses legal creation and real sheet/battle handoff.
- Any narrowed scope preserves excluded desired work as concrete future Ralph
  tasks.

Validation:

- Run task-local focused tests or static checks.
- Run `pnpm --filter @dnd/character-battle-runtime typecheck` when touching the
  character battle runtime package.
- Run `pnpm --filter @dnd/character-creation-runtime typecheck` when touching
  character creation runtime.
- Run `pnpm --filter @dnd/character-sheet-runtime typecheck` when touching
  character sheet runtime.
- Run `pnpm unit-profile-coverage:check` when Unit profile or evidence changes.
- Run `pnpm rules-kernel-coverage:check` when QNT owners, parity witnesses, or
  rules-kernel evidence changes.
- Run `pnpm sdk-raw-integration-inventory:check` when SDK scenario evidence or
  inventory inputs change.
- Run `git diff --check`.

Plan Impact:

- Every implementer, reviewer, and decider report must include `Plan Impact`.
- Use `none` when the task does not affect future work.
- Use `update-required` or `applied` when discoveries change task status,
  dependencies, ordering, blockers, acceptance criteria, validation, or create
  follow-up tasks.
- The decider owns plan reconciliation and must update this plan in the same
  task commit when plan impact is durable.

Reviewer-loop convergence:

- Run RAW traceability, ubiquitous-language/domain-language,
  architecture/connascence, and code-review passes after implementation.
- Fix every reasonable finding.
- Reject only findings with a concrete reason recorded in the task closeout.
- Repeat until no reasonable findings remain. A single round is acceptable only
  for trivially small changesets under about 20 lines.

## DAG / Queue Order

| # | Task | Status | Depends on | Lane | Expected output |
| ---: | --- | --- | --- | --- | --- |
| 1 | L12-SH01-DENOMINATOR-FORMAT-GATE - Verify the L1/L2 source denominator and Ralph format | done | none | fixture/enabling | Static denominator and plan-format verification, with durable corrections if inventory drifted. |
| 2 | L12-SH02-LEGAL-FIXTURE-SEAM - Implement the legal source-side lifecycle fixture seam | done | L12-SH01-DENOMINATOR-FORMAT-GATE | fixture/enabling | Shared legal fixture helpers for L1/L2 source lifecycle scenarios. |
| 3 | L12-SH03-SEED-MIGRATION-AUDIT - Audit existing seed rows for legal lifecycle proof | done | L12-SH01-DENOMINATOR-FORMAT-GATE, L12-SH02-LEGAL-FIXTURE-SEAM | seed-present | Classification of the original 64 L1/L2 seed rows and first safe migrations if small. |
| 4 | L12-SH04-GROUPING-GENERATOR-GATE - Generate the L1/L2 campaign grouping gate | done | L12-SH01-DENOMINATOR-FORMAT-GATE, L12-SH03-SEED-MIGRATION-AUDIT | fixture/enabling | Generated or checked group assignment evidence for 400 rows and 207 groups. |
| 5 | L12-SH05-CREATION-SDK-FIRST-SLICE - Add the first character-creation SDK slice | done | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH04-GROUPING-GENERATOR-GATE | character-creation-sdk | Warlock Pact Magic creation scenario group using the shared fixture seam. |
| 6 | L12-SH06-BUILD-SHEET-FIRST-SLICE - Add the first build-to-sheet SDK slice | done | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH04-GROUPING-GENERATOR-GATE | build-sheet-sdk | One class-wide build-sheet projection group. |
| 7 | L12-SH07-BUILD-BATTLE-FIRST-SLICE - Add the first build-to-battle SDK slice | ready-for-research | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH04-GROUPING-GENERATOR-GATE | build-battle-sdk | One build-battle handoff scenario group. |
| 8 | L12-SH08-SHEET-SDK-FIRST-SLICE - Add the first character-sheet SDK slice | ready-for-research | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH04-GROUPING-GENERATOR-GATE | character-sheet-sdk | One sheet-owned runtime projection scenario group. |
| 9 | L12-SH09-SHEET-SPELL-ACCESS-FIRST-SLICE - Add the first sheet spell-access SDK slice | ready-for-research | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH04-GROUPING-GENERATOR-GATE | sheet-spell-access-sdk | One spell-access scenario group from legal creation through sheet. |
| 10 | L12-SH10-BATTLE-FEATURE-FIRST-SLICE - Add the first battle-feature SDK slice | ready-for-research | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH04-GROUPING-GENERATOR-GATE | battle-feature-sdk | One battle feature scenario group from sheet to reducer behavior. |
| 11 | L12-SH11-BATTLE-SPELL-FIRST-SLICE - Add the first battle-spell SDK slice | ready-for-research | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH04-GROUPING-GENERATOR-GATE | battle-spell-sdk | One spell scenario group sharing an execution path across classes. |
| 12 | L12-SH12-MULTI-OWNER-FIRST-SLICE - Split the first multi-owner feature SDK slice | ready-for-research | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH04-GROUPING-GENERATOR-GATE | multi-owner-feature-sdk | One multi-owner group split into legal source scenario and explicit owner follow-ups. |
| 13 | L12-SH13-CLOSURE-REVIEW-FIRST-FAMILY - Close the first spell-effect owner review family | ready-for-research | L12-SH04-GROUPING-GENERATOR-GATE | closure-review | First spell-effect owner-review family classified as table-only, existing owner sufficient, or follow-up implementation. |
| 14 | L12-SH14-QNT-HARNESS-PRESSURE-FIRST-WITNESS - Add the first small QNT harness pressure witness | ready-for-research | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH04-GROUPING-GENERATOR-GATE | QNT/harness-pressure | Small deterministic source-side witness or existing obligation strengthening. |
| 15 | L12-SH15-NEXT-BATCH-SPLIT - Expand the next one-session task batches | blocked | L12-SH03-SEED-MIGRATION-AUDIT, L12-SH05-CREATION-SDK-FIRST-SLICE, L12-SH06-BUILD-SHEET-FIRST-SLICE, L12-SH07-BUILD-BATTLE-FIRST-SLICE, L12-SH08-SHEET-SDK-FIRST-SLICE, L12-SH09-SHEET-SPELL-ACCESS-FIRST-SLICE, L12-SH10-BATTLE-FEATURE-FIRST-SLICE, L12-SH11-BATTLE-SPELL-FIRST-SLICE, L12-SH12-MULTI-OWNER-FIRST-SLICE, L12-SH13-CLOSURE-REVIEW-FIRST-FAMILY, L12-SH14-QNT-HARNESS-PRESSURE-FIRST-WITNESS, L12-SH17-SEED-MIGRATE-BARBARIAN-RAGE, L12-SH18-SEED-MIGRATE-BARDIC-INSPIRATION, L12-SH19-SEED-MIGRATE-FIGHTER-SECOND-WIND, L12-SH20-SEED-MIGRATE-MONK-MARTIAL-ARTS, L12-SH21-SEED-MIGRATE-ROGUE-SNEAK-ATTACK, L12-SH22-SEED-MIGRATE-SORCERER-INNATE-SORCERY, L12-SH23-SEED-MIGRATE-SORCERER-BURNING-HANDS | planning | Add the next runnable one-session tasks for remaining L1/L2 groups after seed migrations. |
| 16 | L12-SH16-CLEANROOM-GATE-PLAN - Prepare the later cleanroom replay gate | blocked | L12-SH15-NEXT-BATCH-SPLIT | later cleanroom gate | Cleanroom replay gate plan after source-side harness stabilizes. |
| 17 | L12-SH17-SEED-MIGRATE-BARBARIAN-RAGE - Migrate the Barbarian Rage seed to legal source creation | ready-for-research | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH03-SEED-MIGRATION-AUDIT | seed-present | `barbarian_rage` seed uses legal creation and remains a real sheet/battle handoff scenario. |
| 18 | L12-SH18-SEED-MIGRATE-BARDIC-INSPIRATION - Migrate the Bardic Inspiration seed to legal source creation | ready-for-research | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH03-SEED-MIGRATION-AUDIT | seed-present | `bard_bardic_inspiration` seed uses legal creation and remains a real sheet/battle handoff scenario. |
| 19 | L12-SH19-SEED-MIGRATE-FIGHTER-SECOND-WIND - Migrate the Fighter Second Wind seed to legal source creation | ready-for-research | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH03-SEED-MIGRATION-AUDIT | seed-present | `fighter_second_wind` seed uses legal creation and remains a real sheet/battle handoff scenario. |
| 20 | L12-SH20-SEED-MIGRATE-MONK-MARTIAL-ARTS - Migrate the Monk Martial Arts seed to legal source creation | ready-for-research | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH03-SEED-MIGRATION-AUDIT | seed-present | `monk_martial_arts` seed uses legal creation and remains a real sheet/battle handoff scenario. |
| 21 | L12-SH21-SEED-MIGRATE-ROGUE-SNEAK-ATTACK - Migrate the Rogue Sneak Attack seed to legal source creation | ready-for-research | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH03-SEED-MIGRATION-AUDIT | seed-present | `rogue_sneak_attack` seed uses legal creation and remains a real sheet/battle handoff scenario. |
| 22 | L12-SH22-SEED-MIGRATE-SORCERER-INNATE-SORCERY - Migrate the Sorcerer Innate Sorcery seed to legal source creation | ready-for-research | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH03-SEED-MIGRATION-AUDIT | seed-present | `sorcerer_innate_sorcery` seed uses legal creation and remains a real sheet/battle handoff scenario. |
| 23 | L12-SH23-SEED-MIGRATE-SORCERER-BURNING-HANDS - Migrate the Sorcerer Burning Hands seed to legal source creation | ready-for-research | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH03-SEED-MIGRATION-AUDIT | seed-present | Sorcerer `burning_hands` seed uses legal creation and remains a real sheet/battle handoff scenario. |

## Task Details

### Task 1 - L12-SH01-DENOMINATOR-FORMAT-GATE

Status: `done`

Input:

- `scripts/ralph-run.md`
- `scripts/ralph-run.sh`
- `plans/RALPH_*.md`
- `plans/sdk-raw-integration/level1-5-sdk-raw-inventory.json`
- `plans/sdk-raw-integration/LEVEL1_5_SDK_RAW_INVENTORY.md`
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/level1-2-full-support.json`

Research required before editing:

- Verify Ralph plan contract: `ralph-task-index`, matching `### Task N`
  headings, runnable statuses, blocked metadata, DAG auto-unblock rules, and
  `Plan Impact` requirements.
- Recompute the L1/L2 denominator from the inventory: 400 rows, 207 scenario
  groups, current seed rows, and lane assignments.
- Confirm the denominator still contains only `sdk-scenario-needed`,
  `seed-scenario-present`, `explicit-closure-needed`, and
  `closure-review-needed`.

Output:

- Corrections to this plan if the runner contract or denominator has drifted.
- A short task closeout that records the exact inventory counts used.

Acceptance:

- The task index parses as JSON.
- Every indexed task has a matching `### Task N` heading.
- Every DAG row references an indexed task ID.
- Every task has Input, Output, Acceptance, Validation, and Plan Impact
  sections.
- No blocked task lacks `Blocker Type` and `Blocker Detail`.
- The L1/L2 denominator assignment still covers all 400 rows and all 207 groups.

Validation:

- Run the non-mutating static plan checks from this task's acceptance criteria.
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `update-required` if any count, status, dependency, or task-body requirement
  differs from the source artifacts.

### Task 2 - L12-SH02-LEGAL-FIXTURE-SEAM

Status: `done`

Input:

- `packages/character-battle-runtime/src/fighter-character-lifecycle-test-support.ts`
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `packages/character-creation-runtime/src/`
- `packages/character-sheet-runtime/src/`
- `.references/srd-5.2.1/Character-Creation.md`
- `.references/srd-5.2.1/Character-Origins.md`
- `.references/srd-5.2.1/Classes/`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read the Fighter lifecycle helper and the level-1 SDK fixtures.
- Identify existing legal draft flows and direct `CharacterBuild` constructors.
- Search for duplicate fixture state before adding helper types.
- Decide the smallest test-local fixture interface that can build legal level-1
  and level-2 SRD characters by filling discovered holes, not by constructing
  `CharacterBuild`.

Output:

- A shared source-side fixture helper for L1/L2 scenario builders.
- Helper support for draft creation, discovered-hole filling, finalization,
  sheet creation, optional battle initialization, and explicit failure summaries.
- At least one migrated or new smoke scenario that proves the seam works through
  legal creation.

Acceptance:

- New whole-width fixture code does not hand-build `CharacterBuild`.
- The helper uses `discoverCreationHoles` and fills by hole source shape where
  possible, with precise errors when a preference no longer matches available
  options.
- Optional and empty fixture inputs represent distinct domain states; no
  duplicated derived facts are stored beside source facts.
- The helper is not a production public facade.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "legal|lifecycle|Fighter"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `git diff --check`

Plan Impact:

- `update-required` if the implemented helper changes task sizing, lane
  validation commands, or the seed migration strategy.

### Task 3 - L12-SH03-SEED-MIGRATION-AUDIT

Status: `done`

Input:

- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `plans/sdk-raw-integration/level1-5-sdk-raw-inventory.json`
- `plans/sdk-raw-integration/LEVEL1_5_SDK_RAW_INVENTORY.md`
- `scripts/sdk-raw-integration-inventory.cjs`

Research required before editing:

- Enumerate the original 64 L1/L2 `seed-scenario-present` rows.
- Classify each seed as `already legal creation path`,
  `hand-built build needing migration`, `lower-level focused seed only`, or
  `should remain explicit closure`.
- Check whether each seed uses real sheet and battle handoff, not only a
  lower-level reducer setup.

Output:

- A durable seed audit artifact or generated inventory extension that records
  the classification.
- Safe migrations for only the smallest obvious subset, if they fit in one
  session; otherwise add concrete follow-up tasks in this plan.

Acceptance:

- Original 64 seed rows are not double-counted as whole-width source lifecycle
  proof unless they use legal creation and real sheet/battle handoff.
- Direct `CharacterBuild` seed helpers are identified for migration or retained
  only as legacy focused seeds with an explicit reason.
- Inventory evidence remains generated or checker-owned rather than maintained
  by ad hoc prose.

Validation:

- `pnpm sdk-raw-integration-inventory:check`
- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `git diff --check`

Plan Impact:

- `applied`; this task adds Tasks 17-23 for the seven direct-build seed rows
  discovered by the generated audit.

### Task 4 - L12-SH04-GROUPING-GENERATOR-GATE

Status: `done`

Input:

- `scripts/sdk-raw-integration-inventory.cjs`
- `plans/sdk-raw-integration/level1-5-sdk-raw-inventory.json`
- `plans/sdk-raw-integration/LEVEL1_5_SDK_RAW_INVENTORY.md`
- `plans/unit-profile-coverage/level1-2-full-support.json`
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`

Research required before editing:

- Inspect how scenario groups are generated today.
- Determine whether L1/L2 campaign assignment belongs in the existing inventory
  output, a sibling generated report, or a checker-only validation path.
- Preserve generated facts as projections from existing inventory inputs.

Output:

- A generated or checked L1/L2 campaign grouping view that records lane,
  disposition, row count, group count, and task ownership.
- A strict check that fails if any L1/L2 row in the four active dispositions is
  unassigned.

Acceptance:

- All 400 rows and 207 groups are assigned to a lane and campaign task family.
- The checker distinguishes source rows, seed rows, explicit closure rows, and
  closure-review rows.
- Mixed-provenance or mixed-license states are not representable in the new
  generated shape.

Validation:

- `pnpm sdk-raw-integration-inventory:check`
- `pnpm unit-profile-coverage:check`
- `git diff --check`

Plan Impact:

- `applied`; the generated grouping matched the initial lane table and unblocks
  Tasks 5-14 without changing their task boundaries.

### Task 5 - L12-SH05-CREATION-SDK-FIRST-SLICE

Status: `done`

Input:

- Generated L1/L2 campaign grouping from Task 4.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `.references/srd-5.2.1/Classes/Warlock.md`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Start with the `character-creation-sdk` lane. The representative first group
  should be small and creation-owned, such as the Warlock Pact Magic creation
  row if still present.
- Confirm the row is a creation/build fact, not a battle spell execution fact.

Output:

- One legal creation scenario group using the shared fixture seam.
- Inventory evidence update if the scenario satisfies the SDK source proof.

Acceptance:

- The scenario finalizes from legal draft holes and asserts the character-owned
  facts required by the source row.
- It does not assert battle behavior unless the row's owner boundary requires
  battle handoff.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Warlock|Pact Magic|creation"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `update-required` if the first creation slice reveals different sizing for
  the remaining 14 creation groups.

### Task 6 - L12-SH06-BUILD-SHEET-FIRST-SLICE

Status: `done`

Input:

- Generated L1/L2 campaign grouping from Task 4.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `.references/srd-5.2.1/Classes/Barbarian.md`
- `.references/srd-5.2.1/Equipment.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Start with one class-wide `build-sheet-sdk` group that only asserts projection
  facts, such as Barbarian armor, Hit Die, primary ability, saves,
  proficiencies, or starting equipment facts if still grouped together.
- Confirm the assertions derive from finalized build and fresh sheet, not from a
  copied fixture table.

Output:

- One class-wide build-sheet scenario group.
- Inventory evidence update for covered rows.

Acceptance:

- One task covers only one class-wide build-sheet group unless the grouping gate
  proves the projection path is identical and still one-session sized.
- Assertions use sheet/build APIs and do not duplicate labels or abbreviations
  that can be derived from Unit data.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Barbarian|sheet|build"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `update-required` if class-wide build-sheet grouping should be split or
  combined differently for remaining classes.

### Task 7 - L12-SH07-BUILD-BATTLE-FIRST-SLICE

Status: `ready-for-research`

Input:

- Generated L1/L2 campaign grouping from Task 4.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `packages/character-battle-runtime/src/index.ts`
- `.references/srd-5.2.1/Classes/Barbarian.md`
- `.references/srd-5.2.1/Equipment.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Start with one `build-battle-sdk` group, preferably a martial equipment or
  weapon mastery handoff group if still present.
- Confirm the scenario requires battle projection rather than only sheet
  projection.

Output:

- One build-to-battle handoff scenario group from legal build through fresh
  sheet into battle init.
- Inventory evidence update for covered rows.

Acceptance:

- Battle init facts are asserted from the real combatant state.
- Any battle reducer behavior asserted is owned by the relevant battle rule
  owner and has parity checked before runtime changes.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "battle|handoff|weapon"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `update-required` if handoff rows need new bridge support or split into
  battle-runtime implementation tasks.

### Task 8 - L12-SH08-SHEET-SDK-FIRST-SLICE

Status: `ready-for-research`

Input:

- Generated L1/L2 campaign grouping from Task 4.
- `packages/character-sheet-runtime/src/`
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `.references/srd-5.2.1/Classes/Barbarian.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Start with one `character-sheet-sdk` group, such as Barbarian Unarmored
  Defense if still present.
- Read existing sheet projection APIs before adding state.

Output:

- One sheet-owned runtime projection scenario from legal creation into fresh
  sheet.
- Inventory evidence update for covered rows.

Acceptance:

- Sheet-owned facts remain in sheet runtime. Do not duplicate sheet state in
  battle-only fixtures.
- If runtime support is missing, create a focused implementation follow-up
  rather than forcing assertions through an adapter.

Validation:

- `pnpm --filter @dnd/character-sheet-runtime typecheck`
- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Unarmored Defense|sheet"`
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `update-required` if sheet groups need lower-layer changes before scenario
  evidence can land.

### Task 9 - L12-SH09-SHEET-SPELL-ACCESS-FIRST-SLICE

Status: `ready-for-research`

Input:

- Generated L1/L2 campaign grouping from Task 4.
- `packages/character-creation-runtime/src/`
- `packages/character-sheet-runtime/src/`
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
- Relevant class SRD file for the selected spell-access row.
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Start with one `sheet-spell-access-sdk` group, such as Bard Spellcasting if
  still present.
- Distinguish character-owned spell access from battle-owned spell execution.

Output:

- One legal creation to sheet spell-access scenario group.
- Inventory evidence update for covered rows.

Acceptance:

- The scenario proves cantrip, prepared spell, spellbook, pact, or slot access
  facts at the owner boundary required by the row.
- It does not dispatch on authored spell identity except at allowed catalog or
  user-selection boundaries.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Spellcasting|spell access|Bard"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `update-required` if spell-access rows should be grouped by class, access
  mechanism, or spell-list shape differently than the current lane suggests.

### Task 10 - L12-SH10-BATTLE-FEATURE-FIRST-SLICE

Status: `ready-for-research`

Input:

- Generated L1/L2 campaign grouping from Task 4.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/battle-runtime/src/`
- `.references/srd-5.2.1/Classes/Barbarian.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Start with one `battle-feature-sdk` group, such as Barbarian Danger Sense if
  still present.
- Read the relevant battle-runtime support profile and QNT owner before changing
  runtime behavior.

Output:

- One battle-feature scenario group from legal sheet handoff into battle
  reducer behavior.
- Runtime/spec updates only if the source QNT owner requires them.

Acceptance:

- Scenario uses the shared legal fixture seam and real battle acts/holes/fills.
- If behavior changes, the relevant Quint slice is updated first or in the same
  task with focused parity validation.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Danger Sense|battle feature"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- If behavior changes, run the focused battle-runtime test or MBT named by the
  changed owner, following the MBT run protocol in `AGENTS.md`.
- `git diff --check`

Plan Impact:

- `update-required` if the selected feature needs runtime/QNT owner work that
  must become a separate task.

### Task 11 - L12-SH11-BATTLE-SPELL-FIRST-SLICE

Status: `ready-for-research`

Input:

- Generated L1/L2 campaign grouping from Task 4.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/battle-runtime/src/`
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md`
- `.references/srd-5.2.1/Spells/Descriptions-Q-R.md`
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Start with one `battle-spell-sdk` group that shares a spell id across classes
  and uses one execution path, such as Bane if still present.
- Split the group if it needs multiple runtime owners, new behavior, or more
  than one distinct battle procedure.

Output:

- One battle-spell scenario group from legal class spell access through battle
  execution.
- Inventory evidence update for covered rows.

Acceptance:

- The task covers one spell scenario group only.
- Assertions are procedure-shaped, not authored-identity-dispatch-shaped.
- Slot/free-cast/cantrip resource paths are tested only when relevant to the
  selected group.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Bane|spell"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- If battle-runtime behavior changes, run the focused owner test or MBT named by
  the changed procedure, following the MBT run protocol in `AGENTS.md`.
- `git diff --check`

Plan Impact:

- `update-required` if the selected spell reveals a better grouping rule for the
  remaining 31 battle-spell groups.

### Task 12 - L12-SH12-MULTI-OWNER-FIRST-SLICE

Status: `ready-for-research`

Input:

- Generated L1/L2 campaign grouping from Task 4.
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`
- `ASSUMPTIONS.md`
- Relevant class and spell SRD files for the selected multi-owner group.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/battle-runtime/src/`

Research required before editing:

- Start with one `multi-owner-feature-sdk` group, such as Druid Wild Shape if
  still present.
- Split character facts, sheet facts, battle facts, and table-detached closure
  before coding.

Output:

- One multi-owner group split into the smallest legal source scenario plus any
  explicit closure or follow-up implementation tasks.

Acceptance:

- The task does not collapse distinct owners into a single field or fixture
  record.
- Missing runtime/spec owners become concrete follow-up tasks, not `blocked`
  prose, unless they require an owner decision Ralph cannot make.

Validation:

- Focused tests for the touched owner packages.
- `pnpm unit-profile-coverage:check`
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `update-required`; this task is expected to update the future queue with
  owner-specific follow-ups if the group is not fully closed in one session.

### Task 13 - L12-SH13-CLOSURE-REVIEW-FIRST-FAMILY

Status: `ready-for-research`

Input:

- Generated L1/L2 campaign grouping from Task 4.
- `plans/sdk-raw-integration/level1-5-sdk-raw-inventory.json`
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/frontier-decisions/`
- `ASSUMPTIONS.md`
- Relevant local SRD spell files.
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Start with one small family from the 71 `spell-effect-owner-review` rows where
  the RAW owner reason is identical.
- Distinguish table-only/runtime-detached closure, existing source owner
  sufficient, and missing runtime/spec owner.

Output:

- Closure evidence for the selected family, or concrete follow-up tasks for
  missing owners.
- Inventory/profile updates if closure status changes.

Acceptance:

- The task does not use `blocked` for repo research Ralph can perform.
- Only real owner/user decisions become blocked, with `Blocker Type:
  owner-decision`.
- Closure reasons cite local SRD passages and do not silently invent mechanics.

Validation:

- `pnpm unit-profile-coverage:check`
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `update-required`; closure-review findings must update future closure tasks
  and implementation follow-ups.

### Task 14 - L12-SH14-QNT-HARNESS-PRESSURE-FIRST-WITNESS

Status: `ready-for-research`

Input:

- `packages/character-battle-runtime/character-layer-projection-lifecycle.mbt.qnt`
- `packages/character-battle-runtime/src/character-layer-projection-lifecycle.mbt.test.ts`
- `packages/character-battle-runtime/src/fighter-character-lifecycle-test-support.ts`
- Generated L1/L2 campaign grouping from Task 4.
- `scripts/check-mbt-driver-closure.cjs`
- `docs/adr/0001-forest-of-qnt-slices.md`

Research required before editing:

- Read the current deterministic lifecycle witness.
- Identify the smallest source-side harness pressure that generalizes beyond
  Fighter without importing broad behavioral QNT closures.
- Prefer a literal projection witness or strengthening an existing obligation
  over a new all-L1/L2 MBT driver.

Output:

- One small deterministic QNT witness or focused TS/QNT obligation
  strengthening.
- No broad all-L1/L2 MBT driver.

Acceptance:

- Any `*.mbt.qnt` driver imports leaf modules only and passes the MBT driver
  closure check.
- The witness adds source-side harness pressure without duplicating reducer
  logic in QNT.
- Broad battle MBT is avoided unless executable behavior changed and the
  focused owner requires it.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/character-layer-projection-lifecycle.mbt.test.ts`
- `pnpm check:mbt-driver-closure`
- `pnpm rules-kernel-coverage:check` if QNT owner/evidence markers change.
- `git diff --check`

Plan Impact:

- `update-required` if QNT pressure should be split by lane, source layer, or
  owner obligation in later tasks.

### Task 15 - L12-SH15-NEXT-BATCH-SPLIT

Status: `blocked`

Blocker Type: dependency

Blocker Detail: Waits for Tasks 3, 5-14, and 17-23 to produce fixture,
grouping, representative implementation, seed migration, closure, and QNT
evidence.

Input:

- This plan after Tasks 3, 5-14, and 17-23 land.
- Generated L1/L2 campaign grouping from Task 4.
- Seed audit output from Task 3.
- Task closeouts and plan-impact notes from Tasks 5-14 and 17-23.

Research required before editing:

- Recompute remaining uncovered L1/L2 groups by lane.
- Apply the task sizing rules:
  - one class-wide build-sheet group per task when it only asserts projection
    facts;
  - one spell scenario group per task when it shares a spell id and execution
    path across classes;
  - split spell groups by owner, runtime behavior, or battle procedure;
  - one closure-review task may cover only a small family with identical RAW
    owner reason;
  - fixture/interface work stays separate from scenario tasks;
  - QNT/harness pressure stays separate unless the witness is tiny and directly
    paired.

Output:

- Concrete new Ralph tasks for the next one-session batch.
- Updated `ralph-task-index`, DAG, and task details.
- Status and dependency updates for any tasks that should now be runnable.

Acceptance:

- Remaining desired work is represented as executable tasks, not prose.
- No task is larger than one coding-agent session.
- Every new blocked task has `Blocker Type` and `Blocker Detail`.
- Every new task has Input, Output, Acceptance, Validation, and Plan Impact
  sections.

Validation:

- Static plan consistency checks from Task 1.
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `applied`; this task exists to update the live queue.

### Task 16 - L12-SH16-CLEANROOM-GATE-PLAN

Status: `blocked`

Blocker Type: dependency

Blocker Detail: Waits for `L12-SH15-NEXT-BATCH-SPLIT` and should remain behind
source-side stabilization. If source evidence is still moving, this task should
update its dependency list rather than editing cleanroom targets.

Input:

- Source-side harness evidence after the first source batches.
- `plans/RALPH_FRESH_CLEANROOM_SOURCE_FEEDBACK.md`
- Existing cleanroom check scripts and source/cleanroom sync docs.
- Generated L1/L2 grouping and seed audit artifacts.

Research required before editing:

- Identify which source-side harness artifacts are stable enough for cleanroom
  replay.
- Determine the smallest later cleanroom gate tasks without editing cleanroom
  target code in this source-side campaign.

Output:

- A later cleanroom replay plan or concrete follow-up Ralph plan file.
- No cleanroom target implementation edits.

Acceptance:

- Cleanroom replay waits until source-side fixture, inventory, and QNT pressure
  are stable.
- The plan names exact source artifacts to replay and exact checks to run.
- Any cleanroom implementation work is represented in a separate cleanroom gate
  plan, not this source-side task queue.

Validation:

- Static plan consistency checks for any new Ralph plan.
- Existing non-mutating cleanroom scaffold/sync checks only if the task changes
  cleanroom plan artifacts.
- `git diff --check`

Plan Impact:

- `update-required` if cleanroom readiness requires additional source-side
  tasks before replay can begin.

### Task 17 - L12-SH17-SEED-MIGRATE-BARBARIAN-RAGE

Status: `ready-for-research`

Input:

- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- Generated seed audit row:
  `srd521:classes/barbarian:level-1:class-feature-grant:barbarian_rage`

Research required before editing:

- Read the Barbarian Rage SRD source anchors named by the inventory row.
- Check `UBIQUITOUS_LANGUAGE.md` for resource, resistance, and attack-damage
  terminology.
- Inspect the current direct `levelOneSingleClassBuild` setup for the
  Barbarian Rage seed.

Output:

- Replace the represented Barbarian source build with a legal creation path
  through the shared fixture seam or equivalent draft/fill/finalize helper.
- Preserve the existing real Character Sheet and battle handoff assertions.

Acceptance:

- The Barbarian Rage audit row is no longer classified as
  `hand-built build needing migration`.
- The scenario still proves Rage spending, damage bonus, and Resistance through
  sheet-to-battle projection.
- No production runtime behavior changes.

Validation:

- `pnpm sdk-raw-integration-inventory:check`
- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Barbarian Rage projects from a level-1 sheet"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `git diff --check`

Plan Impact:

- `none` unless migration reveals additional seed rows or fixture work.

### Task 18 - L12-SH18-SEED-MIGRATE-BARDIC-INSPIRATION

Status: `ready-for-research`

Input:

- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- Generated seed audit row:
  `srd521:classes/bard:level-1:class-feature-grant:bard_bardic_inspiration`

Research required before editing:

- Read the Bardic Inspiration SRD source anchors named by the inventory row.
- Check `UBIQUITOUS_LANGUAGE.md` for resource and Bonus Action terminology.
- Inspect the current direct `levelOneSingleClassBuild` setup for the Bardic
  Inspiration seed.

Output:

- Replace the represented Bard source build with a legal creation path through
  the shared fixture seam or equivalent draft/fill/finalize helper.
- Preserve the existing ally target and battle-resolution assertions.

Acceptance:

- The Bardic Inspiration audit row is no longer classified as
  `hand-built build needing migration`.
- The scenario still proves d6 die creation, Charisma-derived use spending, and
  Bonus Action spending through sheet-to-battle projection.
- No production runtime behavior changes.

Validation:

- `pnpm sdk-raw-integration-inventory:check`
- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Bardic Inspiration grants a level-1 d6 die"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `git diff --check`

Plan Impact:

- `none` unless migration reveals additional seed rows or fixture work.

### Task 19 - L12-SH19-SEED-MIGRATE-FIGHTER-SECOND-WIND

Status: `ready-for-research`

Input:

- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- Generated seed audit row:
  `srd521:classes/fighter:level-1:class-feature-grant:fighter_second_wind`

Research required before editing:

- Read the Fighter Second Wind SRD source anchors named by the inventory row.
- Check `UBIQUITOUS_LANGUAGE.md` for Hit Points, resource, and Bonus Action
  terminology.
- Inspect the current direct `levelOneSingleClassBuild` setup for the Fighter
  Second Wind seed.

Output:

- Replace the represented Fighter source build with a legal creation path
  through the shared fixture seam or equivalent draft/fill/finalize helper.
- Preserve the existing damaged-sheet setup and battle healing assertions.

Acceptance:

- The Fighter Second Wind audit row is no longer classified as
  `hand-built build needing migration`.
- The scenario still proves healing and Bonus Action use spending through
  sheet-to-battle projection.
- No production runtime behavior changes.

Validation:

- `pnpm sdk-raw-integration-inventory:check`
- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Fighter Second Wind heals through sheet projection"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `git diff --check`

Plan Impact:

- `none` unless migration reveals additional seed rows or fixture work.

### Task 20 - L12-SH20-SEED-MIGRATE-MONK-MARTIAL-ARTS

Status: `ready-for-research`

Input:

- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- Generated seed audit row:
  `srd521:classes/monk:level-1:class-feature-grant:monk_martial_arts`

Research required before editing:

- Read the Monk Martial Arts SRD source anchors named by the inventory row.
- Check `UBIQUITOUS_LANGUAGE.md` for Unarmed Strike, attack, and Bonus Action
  terminology.
- Inspect the current direct `levelOneSingleClassBuild` setup for the Monk
  Martial Arts seed.

Output:

- Replace the represented Monk source build with a legal creation path through
  the shared fixture seam or equivalent draft/fill/finalize helper.
- Preserve the existing Unarmed Strike battle assertions.

Acceptance:

- The Monk Martial Arts audit row is no longer classified as
  `hand-built build needing migration`.
- The scenario still proves the Martial Arts die and Dexterity projection for
  the Bonus Action Unarmed Strike.
- No production runtime behavior changes.

Validation:

- `pnpm sdk-raw-integration-inventory:check`
- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Monk Martial Arts projects a level-1 Bonus Action Unarmed Strike"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `git diff --check`

Plan Impact:

- `none` unless migration reveals additional seed rows or fixture work.

### Task 21 - L12-SH21-SEED-MIGRATE-ROGUE-SNEAK-ATTACK

Status: `ready-for-research`

Input:

- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- Generated seed audit row:
  `srd521:classes/rogue:level-1:class-feature-grant:rogue_sneak_attack`

Research required before editing:

- Read the Rogue Sneak Attack SRD source anchors named by the inventory row.
- Check `UBIQUITOUS_LANGUAGE.md` for Attack Damage Rider and attack-roll
  terminology.
- Inspect the current direct `levelOneSingleClassBuild` setup for the Rogue
  Sneak Attack seed.

Output:

- Replace the represented Rogue source build with a legal creation path through
  the shared fixture seam or equivalent draft/fill/finalize helper.
- Preserve the existing ally-position evidence and Dagger damage-rider
  assertions.

Acceptance:

- The Rogue Sneak Attack audit row is no longer classified as
  `hand-built build needing migration`.
- The scenario still proves the level-1 Dagger damage rider and once-per-turn
  use recording through sheet-to-battle projection.
- No production runtime behavior changes.

Validation:

- `pnpm sdk-raw-integration-inventory:check`
- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Rogue Sneak Attack projects as a level-1 Dagger damage rider"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `git diff --check`

Plan Impact:

- `none` unless migration reveals additional seed rows or fixture work.

### Task 22 - L12-SH22-SEED-MIGRATE-SORCERER-INNATE-SORCERY

Status: `ready-for-research`

Input:

- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- Generated seed audit row:
  `srd521:classes/sorcerer:level-1:class-feature-grant:sorcerer_innate_sorcery`

Research required before editing:

- Read the Sorcerer Innate Sorcery SRD source anchors named by the inventory
  row.
- Check `UBIQUITOUS_LANGUAGE.md` for spellcasting, resource, and duration
  terminology.
- Inspect the current direct `levelOneSingleClassBuild` setup for the Sorcerer
  Innate Sorcery seed.

Output:

- Replace the represented Sorcerer source build with a legal creation path
  through the shared fixture seam or equivalent draft/fill/finalize helper.
- Preserve the existing spell-bonus and Sorcerous Burst follow-on assertions.

Acceptance:

- The Sorcerer Innate Sorcery audit row is no longer classified as
  `hand-built build needing migration`.
- The scenario still proves use spending, one-minute duration, and Sorcerer
  spell-bonus projection through sheet-to-battle projection.
- No production runtime behavior changes.

Validation:

- `pnpm sdk-raw-integration-inventory:check`
- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Sorcerer Innate Sorcery spends a use"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `git diff --check`

Plan Impact:

- `none` unless migration reveals additional seed rows or fixture work.

### Task 23 - L12-SH23-SEED-MIGRATE-SORCERER-BURNING-HANDS

Status: `ready-for-research`

Input:

- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- Generated seed audit row:
  `srd521:classes/sorcerer:spell-level-1:spell-unit-pressure:sorcerer_spell_list_burning_hands`

Research required before editing:

- Read the Sorcerer Burning Hands SRD source anchors named by the inventory
  row.
- Check `UBIQUITOUS_LANGUAGE.md` for Spell Invocation, Saving Throw, and damage
  terminology.
- Inspect `levelOneSorcererBurningHandsBuild` and the existing legal Sorcerer
  spell-access helper family.

Output:

- Replace `levelOneSorcererBurningHandsBuild` as the represented source build
  with a legal Sorcerer creation path through the shared fixture seam or
  equivalent draft/fill/finalize helper.
- Preserve the existing Burning Hands battle assertions and slot-spend checks.

Acceptance:

- The Sorcerer Burning Hands audit row is no longer classified as
  `hand-built build needing migration`.
- The scenario still proves self-origin cone save-gated Fire damage and spell
  slot spending through sheet-to-battle projection.
- No production runtime behavior changes.

Validation:

- `pnpm sdk-raw-integration-inventory:check`
- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Sorcerer Burning Hands resolves from a level-1 sheet"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `git diff --check`

Plan Impact:

- `none` unless migration reveals additional seed rows or fixture work.

## Verification Matrix

| Change type | Required validation |
| --- | --- |
| Plan-only or grouping-only | Static plan checks, `pnpm sdk-raw-integration-inventory:check`, `git diff --check` |
| Character-battle source scenario | Focused `vitest run src/level1-sdk-raw-integration.test.ts -t "<scenario>"`, character-battle typecheck, inventory check |
| Character creation helper/runtime | Focused character-creation or character-battle tests, character-creation typecheck, inventory check |
| Character sheet helper/runtime | Focused character-sheet or character-battle tests, character-sheet typecheck, inventory check |
| Unit profile/evidence update | `pnpm unit-profile-coverage:check`, inventory check |
| QNT owner/parity evidence update | Focused TS/QNT test, `pnpm rules-kernel-coverage:check`, MBT driver closure check if applicable |
| Battle-runtime behavior change | Update relevant QNT owner first or with runtime change, run focused owner test/MBT following MBT protocol, then inventory/evidence checks |
| Cleanroom planning only | Static plan checks and non-mutating cleanroom checks only when plan artifacts change |

## Plan-Writing Validation

This file was written as a Ralph artifact, not as a research memo. Validate it
with non-mutating checks:

- Parse the `ralph-task-index` JSON.
- Confirm every indexed task has a matching `### Task N` heading.
- Confirm every DAG row references an indexed task.
- Confirm every task has Input, Output, Acceptance, Validation, and Plan Impact
  sections.
- Confirm no task is blocked without `Blocker Type` and `Blocker Detail`.
- Confirm the denominator table assigns all 400 L1/L2 rows:
  - 240 `sdk-scenario-needed`
  - 65 `seed-scenario-present`
  - 24 `explicit-closure-needed`
  - 71 `closure-review-needed`
- Run `git diff --check`.
