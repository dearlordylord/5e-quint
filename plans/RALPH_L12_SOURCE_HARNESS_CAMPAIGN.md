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
      "status": "done",
      "title": "Add the first build-to-battle SDK slice"
    },
    {
      "number": 8,
      "id": "L12-SH08-SHEET-SDK-FIRST-SLICE",
      "status": "done",
      "title": "Add the first character-sheet SDK slice"
    },
    {
      "number": 9,
      "id": "L12-SH09-SHEET-SPELL-ACCESS-FIRST-SLICE",
      "status": "done",
      "title": "Add the first sheet spell-access SDK slice"
    },
    {
      "number": 10,
      "id": "L12-SH10-BATTLE-FEATURE-FIRST-SLICE",
      "status": "done",
      "title": "Add the first battle-feature SDK slice"
    },
    {
      "number": 11,
      "id": "L12-SH11-BATTLE-SPELL-FIRST-SLICE",
      "status": "done",
      "title": "Add the first battle-spell SDK slice"
    },
    {
      "number": 12,
      "id": "L12-SH12-MULTI-OWNER-FIRST-SLICE",
      "status": "done",
      "title": "Split the first multi-owner feature SDK slice"
    },
    {
      "number": 13,
      "id": "L12-SH13-CLOSURE-REVIEW-FIRST-FAMILY",
      "status": "done",
      "title": "Close the first spell-effect owner review family"
    },
    {
      "number": 14,
      "id": "L12-SH14-QNT-HARNESS-PRESSURE-FIRST-WITNESS",
      "status": "done",
      "title": "Add the first small QNT harness pressure witness"
    },
    {
      "number": 15,
      "id": "L12-SH15-NEXT-BATCH-SPLIT",
      "status": "done",
      "title": "Expand the next one-session task batches"
    },
    {
      "number": 16,
      "id": "L12-SH16-CLEANROOM-GATE-PLAN",
      "status": "done",
      "title": "Prepare the later cleanroom replay gate"
    },
    {
      "number": 17,
      "id": "L12-SH17-SEED-MIGRATE-BARBARIAN-RAGE",
      "status": "done",
      "title": "Migrate the Barbarian Rage seed to legal source creation"
    },
    {
      "number": 18,
      "id": "L12-SH18-SEED-MIGRATE-BARDIC-INSPIRATION",
      "status": "done",
      "title": "Migrate the Bardic Inspiration seed to legal source creation"
    },
    {
      "number": 19,
      "id": "L12-SH19-SEED-MIGRATE-FIGHTER-SECOND-WIND",
      "status": "done",
      "title": "Migrate the Fighter Second Wind seed to legal source creation"
    },
    {
      "number": 20,
      "id": "L12-SH20-SEED-MIGRATE-MONK-MARTIAL-ARTS",
      "status": "done",
      "title": "Migrate the Monk Martial Arts seed to legal source creation"
    },
    {
      "number": 21,
      "id": "L12-SH21-SEED-MIGRATE-ROGUE-SNEAK-ATTACK",
      "status": "done",
      "title": "Migrate the Rogue Sneak Attack seed to legal source creation"
    },
    {
      "number": 22,
      "id": "L12-SH22-SEED-MIGRATE-SORCERER-INNATE-SORCERY",
      "status": "done",
      "title": "Migrate the Sorcerer Innate Sorcery seed to legal source creation"
    },
    {
      "number": 23,
      "id": "L12-SH23-SEED-MIGRATE-SORCERER-BURNING-HANDS",
      "status": "done",
      "title": "Migrate the Sorcerer Burning Hands seed to legal source creation"
    },
    {
      "number": 24,
      "id": "L12-SH24-BUILD-SHEET-BARD",
      "status": "done",
      "title": "Add the Bard build-sheet SDK group"
    },
    {
      "number": 25,
      "id": "L12-SH25-BUILD-SHEET-CLERIC",
      "status": "done",
      "title": "Add the Cleric build-sheet SDK group"
    },
    {
      "number": 26,
      "id": "L12-SH26-BUILD-SHEET-DRUID",
      "status": "done",
      "title": "Add the Druid build-sheet SDK group"
    },
    {
      "number": 27,
      "id": "L12-SH27-BUILD-BATTLE-BARD",
      "status": "done",
      "title": "Add the Bard build-battle SDK group"
    },
    {
      "number": 28,
      "id": "L12-SH28-BUILD-BATTLE-CLERIC",
      "status": "done",
      "title": "Add the Cleric build-battle SDK group"
    },
    {
      "number": 29,
      "id": "L12-SH29-CREATION-CLERIC-DIVINE-ORDER",
      "status": "done",
      "title": "Add the Cleric Divine Order creation SDK group"
    },
    {
      "number": 30,
      "id": "L12-SH30-CREATION-DRUID-DRUIDIC",
      "status": "done",
      "title": "Add the Druidic creation SDK group"
    },
    {
      "number": 31,
      "id": "L12-SH31-SPELL-ACCESS-CLERIC",
      "status": "done",
      "title": "Add the Cleric sheet spell-access SDK group"
    },
    {
      "number": 32,
      "id": "L12-SH32-SHEET-MONK-UNARMORED-DEFENSE",
      "status": "done",
      "title": "Add the Monk Unarmored Defense sheet SDK group"
    },
    {
      "number": 33,
      "id": "L12-SH33-BATTLE-FEATURE-RECKLESS-ATTACK",
      "status": "done",
      "title": "Add the Barbarian Reckless Attack battle-feature SDK group"
    },
    {
      "number": 34,
      "id": "L12-SH34-BATTLE-SPELL-CHARM-PERSON",
      "status": "done",
      "title": "Add the Charm Person battle-spell SDK group"
    },
    {
      "number": 35,
      "id": "L12-SH35-BATTLE-SPELL-COLOR-SPRAY",
      "status": "done",
      "title": "Add the Color Spray battle-spell SDK group"
    },
    {
      "number": 36,
      "id": "L12-SH36-MULTI-OWNER-DRUID-WILD-SHAPE",
      "status": "done",
      "title": "Split the Druid Wild Shape multi-owner SDK group"
    },
    {
      "number": 37,
      "id": "L12-SH37-CLASS-TABLE-LEVEL1-CLOSURE",
      "status": "done",
      "title": "Close the level-1 class table summary family"
    },
    {
      "number": 38,
      "id": "L12-SH38-CLOSURE-ALARM",
      "status": "done",
      "title": "Close the Alarm spell-effect owner review group"
    },
    {
      "number": 39,
      "id": "L12-SH39-SEED-PRESENT-AUDIT-FIRST-BATCH",
      "status": "done",
      "title": "Audit the first seed-present source regression batch"
    },
    {
      "number": 40,
      "id": "L12-SH40-REMAINING-BATCH-SPLIT",
      "status": "done",
      "title": "Split the remaining L1/L2 source harness groups"
    },
    {
      "number": 41,
      "id": "L12-SH41-WILD-SHAPE-FORM-ACTION-SHAPES",
      "status": "blocked",
      "title": "Split remaining Wild Shape form Stat Block action shapes"
    },
    {
      "number": 42,
      "id": "L12-SH42-WILD-SHAPE-OBJECT-UTILIZE-TABLE",
      "status": "blocked",
      "title": "Split Wild Shape generic object and table-placement owners"
    },
    {
      "number": 43,
      "id": "L12-SH43-WILD-SHAPE-ACTIVE-FORM-PERSISTENCE-A27",
      "status": "blocked",
      "title": "Decide Wild Shape active-form persistence past battle handoff"
    },
    {
      "number": 44,
      "id": "L12-SH44-BUILD-SHEET-FIGHTER",
      "status": "done",
      "title": "Add the Fighter build-sheet SDK group"
    },
    {
      "number": 45,
      "id": "L12-SH45-BUILD-SHEET-MONK",
      "status": "done",
      "title": "Add the Monk build-sheet SDK group"
    },
    {
      "number": 46,
      "id": "L12-SH46-BUILD-BATTLE-DRUID",
      "status": "done",
      "title": "Add the Druid build-battle SDK group"
    },
    {
      "number": 47,
      "id": "L12-SH47-BUILD-BATTLE-FIGHTER",
      "status": "done",
      "title": "Add the Fighter build-battle SDK group"
    },
    {
      "number": 48,
      "id": "L12-SH48-CREATION-DRUID-PRIMAL-ORDER",
      "status": "done",
      "title": "Add the Druid Primal Order creation SDK group"
    },
    {
      "number": 49,
      "id": "L12-SH49-CREATION-FIGHTER-FIGHTING-STYLE",
      "status": "done",
      "title": "Add the Fighter Fighting Style creation SDK group"
    },
    {
      "number": 50,
      "id": "L12-SH50-SPELL-ACCESS-DRUID",
      "status": "done",
      "title": "Add the Druid sheet spell-access SDK group"
    },
    {
      "number": 51,
      "id": "L12-SH51-SPELL-ACCESS-PALADIN",
      "status": "done",
      "title": "Add the Paladin sheet spell-access SDK group"
    },
    {
      "number": 52,
      "id": "L12-SH52-SHEET-PALADIN-LAY-ON-HANDS",
      "status": "done",
      "title": "Add the Paladin Lay On Hands sheet SDK group"
    },
    {
      "number": 53,
      "id": "L12-SH53-SHEET-WIZARD-ARCANE-RECOVERY",
      "status": "done",
      "title": "Add the Wizard Arcane Recovery sheet SDK group"
    },
    {
      "number": 54,
      "id": "L12-SH54-BATTLE-FEATURE-FIGHTER-ACTION-SURGE",
      "status": "done",
      "title": "Add the Fighter Action Surge battle-feature SDK group"
    },
    {
      "number": 55,
      "id": "L12-SH55-BATTLE-FEATURE-ROGUE-CUNNING-ACTION",
      "status": "done",
      "title": "Add the Rogue Cunning Action battle-feature SDK group"
    },
    {
      "number": 56,
      "id": "L12-SH56-BATTLE-SPELL-COMMAND",
      "status": "done",
      "title": "Add the Command battle-spell SDK group"
    },
    {
      "number": 57,
      "id": "L12-SH57-BATTLE-SPELL-ENTANGLE",
      "status": "done",
      "title": "Add the Entangle battle-spell SDK group"
    },
    {
      "number": 58,
      "id": "L12-SH58-CLOSURE-COMPREHEND-LANGUAGES",
      "status": "done",
      "title": "Close the Comprehend Languages spell-effect owner review group"
    },
    {
      "number": 59,
      "id": "L12-SH59-CLASS-TABLE-LEVEL2-CLOSURE",
      "status": "done",
      "title": "Close the level-2 class table summary family"
    },
    {
      "number": 60,
      "id": "L12-SH60-REMAINING-BATCH-SPLIT-2",
      "status": "done",
      "title": "Split the next remaining L1/L2 source harness groups"
    },
    {
      "number": 61,
      "id": "L12-SH61-SECOND-STORY-WORK-OWNER-EVIDENCE",
      "status": "done",
      "title": "Reconcile Rogue Second-Story Work owner evidence"
    },
    {
      "number": 62,
      "id": "L12-SH62-GASEOUS-FORM-MIST-CLOUD-STATE",
      "status": "done",
      "title": "Promote Gaseous Form mist-cloud state admission"
    },
    {
      "number": 63,
      "id": "L12-SH63-GASEOUS-FORM-MOVEMENT-PASSIVES",
      "status": "done",
      "title": "Promote Gaseous Form movement and passive projections"
    },
    {
      "number": 64,
      "id": "L12-SH64-GASEOUS-FORM-RESTRICTIONS-CLEANUP",
      "status": "done",
      "title": "Promote Gaseous Form restrictions and cleanup"
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

The original Task 1 L1/L2 source harness baseline came from
`plans/sdk-raw-integration/level1-5-sdk-raw-inventory.json`, filtered to
`level-1`, `level-2`, `spell-level-0`, and `spell-level-1`. These baseline
counts are preserved for campaign history; they are not the current generated
grouping after Tasks 1-60.

| Metric | Count |
| --- | ---: |
| L1/L2 diagnostic product-readiness rows | 400 |
| L1/L2 scenario groups | 210 |
| Existing L1/L2 seed rows | 80 |
| `sdk-scenario-needed` rows | 225 |
| `seed-scenario-present` rows | 80 |
| `explicit-closure-needed` rows | 24 |
| `closure-review-needed` rows | 69 |
| `table-only-closure-needed` rows | 2 |

Post-Task-60, the current generated L1/L2 grouping still assigns all 400 rows,
but several rows have moved into seed or explicit-closure-present families as
source evidence landed:

| Current generated family | Rows | Groups | Disposition |
| --- | ---: | ---: | --- |
| source-row | 154 | 67 | `sdk-scenario-needed` |
| seed-row | 151 | 99 | `seed-scenario-present` |
| closed-explicit-closure-row | 24 | 24 | `explicit-closure-present` |
| explicit-closure-row | 0 | 0 | `explicit-closure-needed` |
| closure-review-row | 67 | 20 | `closure-review-needed` |
| table-only-closure-row | 4 | 2 | `table-only-closure-needed` |

Original campaign assignment by lane:

| Lane | Rows | Groups | Disposition | Initial owner in this plan |
| --- | ---: | ---: | --- | --- |
| fixture/enabling | 0 | 0 | enabling work | Tasks 1-4 |
| character-creation-sdk | 14 | 14 | `sdk-scenario-needed` | Task 5, Tasks 29-30, then Task 40 follow-ups |
| build-sheet-sdk | 93 | 12 | `sdk-scenario-needed` | Task 6, Tasks 24-26, then Task 40 follow-ups |
| build-battle-sdk | 15 | 11 | `sdk-scenario-needed` | Task 7, Tasks 27-28, then Task 40 follow-ups |
| character-sheet-sdk | 6 | 6 | `sdk-scenario-needed` | Task 8, Task 32, then Task 40 follow-ups |
| sheet-spell-access-sdk | 6 | 6 | `sdk-scenario-needed` | Task 9, Task 31, then Task 40 follow-ups |
| battle-feature-sdk | 5 | 5 | `sdk-scenario-needed` | Task 10, Task 33, then Task 40 follow-ups |
| battle-spell-sdk | 80 | 31 | `sdk-scenario-needed` | Task 11, Tasks 34-35, then Task 40 follow-ups |
| multi-owner-feature-sdk | 6 | 6 | `sdk-scenario-needed` | Task 12, Task 36, then Task 40 follow-ups |
| seed-present | 80 | 73 | `seed-scenario-present` | Task 3 migration audit, Tasks 17-23 seed migrations, Task 39, then Task 40 follow-ups |
| explicit-closure | 24 | 24 | `explicit-closure-needed` | Task 4 grouping gate, Task 37, then Task 40 follow-ups |
| spell-effect-owner-review | 69 | 21 | `closure-review-needed` | Task 13, Task 38, then Task 40 follow-ups |
| table-only-closure | 2 | 1 | `table-only-closure-needed` | Task 13 and Task 40 follow-ups |

Every original L1/L2 row in the five active baseline dispositions is assigned
by the table above.
After Tasks 5-14 and 17-23, the generated grouping has 80 seed-present rows
across 73 groups. Task 15 expands the first runnable follow-up batch as Tasks
24-39. Task 40 recomputed the post-Task-39 inventory and found 112 remaining
needed L1/L2 groups: 78 source-scenario groups, 20 spell-effect owner-review
groups, 12 explicit level-2 table-closure groups, and 2 table-only closure
groups. Tasks 44-59 were the next runnable one-session batch. Task 60
recomputed the current generated artifacts, found no remaining L1/L2
owner-evidence or runtime-required rows, and moved the next visible source-side
owner-evidence work into level-3 Tasks 61-64.

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
| 4 | L12-SH04-GROUPING-GENERATOR-GATE - Generate the L1/L2 campaign grouping gate | done | L12-SH01-DENOMINATOR-FORMAT-GATE, L12-SH03-SEED-MIGRATION-AUDIT | fixture/enabling | Generated or checked group assignment evidence for 400 rows and current generated groups. |
| 5 | L12-SH05-CREATION-SDK-FIRST-SLICE - Add the first character-creation SDK slice | done | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH04-GROUPING-GENERATOR-GATE | character-creation-sdk | Warlock Pact Magic creation scenario group using the shared fixture seam. |
| 6 | L12-SH06-BUILD-SHEET-FIRST-SLICE - Add the first build-to-sheet SDK slice | done | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH04-GROUPING-GENERATOR-GATE | build-sheet-sdk | One class-wide build-sheet projection group. |
| 7 | L12-SH07-BUILD-BATTLE-FIRST-SLICE - Add the first build-to-battle SDK slice | done | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH04-GROUPING-GENERATOR-GATE | build-battle-sdk | One build-battle handoff scenario group. |
| 8 | L12-SH08-SHEET-SDK-FIRST-SLICE - Add the first character-sheet SDK slice | done | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH04-GROUPING-GENERATOR-GATE | character-sheet-sdk | One sheet-owned runtime projection scenario group. |
| 9 | L12-SH09-SHEET-SPELL-ACCESS-FIRST-SLICE - Add the first sheet spell-access SDK slice | done | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH04-GROUPING-GENERATOR-GATE | sheet-spell-access-sdk | One spell-access scenario group from legal creation through sheet. |
| 10 | L12-SH10-BATTLE-FEATURE-FIRST-SLICE - Add the first battle-feature SDK slice | done | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH04-GROUPING-GENERATOR-GATE | battle-feature-sdk | One battle feature scenario group from sheet to reducer behavior. |
| 11 | L12-SH11-BATTLE-SPELL-FIRST-SLICE - Add the first battle-spell SDK slice | done | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH04-GROUPING-GENERATOR-GATE | battle-spell-sdk | One spell scenario group sharing an execution path across classes. |
| 12 | L12-SH12-MULTI-OWNER-FIRST-SLICE - Split the first multi-owner feature SDK slice | done | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH04-GROUPING-GENERATOR-GATE | multi-owner-feature-sdk | One multi-owner group split into legal source scenario and explicit owner follow-ups. |
| 13 | L12-SH13-CLOSURE-REVIEW-FIRST-FAMILY - Close the first spell-effect owner review family | done | L12-SH04-GROUPING-GENERATOR-GATE | closure-review | Goodberry spell-list pressure family classified as table-only inventory/survival closure. |
| 14 | L12-SH14-QNT-HARNESS-PRESSURE-FIRST-WITNESS - Add the first small QNT harness pressure witness | done | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH04-GROUPING-GENERATOR-GATE | QNT/harness-pressure | Small deterministic source-side witness or existing obligation strengthening. |
| 15 | L12-SH15-NEXT-BATCH-SPLIT - Expand the next one-session task batches | done | L12-SH03-SEED-MIGRATION-AUDIT, L12-SH05-CREATION-SDK-FIRST-SLICE, L12-SH06-BUILD-SHEET-FIRST-SLICE, L12-SH07-BUILD-BATTLE-FIRST-SLICE, L12-SH08-SHEET-SDK-FIRST-SLICE, L12-SH09-SHEET-SPELL-ACCESS-FIRST-SLICE, L12-SH10-BATTLE-FEATURE-FIRST-SLICE, L12-SH11-BATTLE-SPELL-FIRST-SLICE, L12-SH12-MULTI-OWNER-FIRST-SLICE, L12-SH13-CLOSURE-REVIEW-FIRST-FAMILY, L12-SH14-QNT-HARNESS-PRESSURE-FIRST-WITNESS, L12-SH17-SEED-MIGRATE-BARBARIAN-RAGE, L12-SH18-SEED-MIGRATE-BARDIC-INSPIRATION, L12-SH19-SEED-MIGRATE-FIGHTER-SECOND-WIND, L12-SH20-SEED-MIGRATE-MONK-MARTIAL-ARTS, L12-SH21-SEED-MIGRATE-ROGUE-SNEAK-ATTACK, L12-SH22-SEED-MIGRATE-SORCERER-INNATE-SORCERY, L12-SH23-SEED-MIGRATE-SORCERER-BURNING-HANDS | planning | Added Tasks 24-39 as the next runnable batch and Task 40 as the remaining-group splitter. |
| 16 | L12-SH16-CLEANROOM-GATE-PLAN - Prepare the later cleanroom replay gate | done | L12-SH61-SECOND-STORY-WORK-OWNER-EVIDENCE, L12-SH62-GASEOUS-FORM-MIST-CLOUD-STATE, L12-SH63-GASEOUS-FORM-MOVEMENT-PASSIVES, L12-SH64-GASEOUS-FORM-RESTRICTIONS-CLEANUP | later cleanroom gate | Created `plans/RALPH_CLEANROOM_REPLAY_GATE.md` as the separate cleanroom replay plan. |
| 17 | L12-SH17-SEED-MIGRATE-BARBARIAN-RAGE - Migrate the Barbarian Rage seed to legal source creation | done | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH03-SEED-MIGRATION-AUDIT | seed-present | `barbarian_rage` seed uses legal creation and remains a real sheet/battle handoff scenario. |
| 18 | L12-SH18-SEED-MIGRATE-BARDIC-INSPIRATION - Migrate the Bardic Inspiration seed to legal source creation | done | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH03-SEED-MIGRATION-AUDIT | seed-present | `bard_bardic_inspiration` seed uses legal creation and remains a real sheet/battle handoff scenario. |
| 19 | L12-SH19-SEED-MIGRATE-FIGHTER-SECOND-WIND - Migrate the Fighter Second Wind seed to legal source creation | done | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH03-SEED-MIGRATION-AUDIT | seed-present | `fighter_second_wind` seed uses legal creation and remains a real sheet/battle handoff scenario. |
| 20 | L12-SH20-SEED-MIGRATE-MONK-MARTIAL-ARTS - Migrate the Monk Martial Arts seed to legal source creation | done | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH03-SEED-MIGRATION-AUDIT | seed-present | `monk_martial_arts` seed uses legal creation and remains a real sheet/battle handoff scenario. |
| 21 | L12-SH21-SEED-MIGRATE-ROGUE-SNEAK-ATTACK - Migrate the Rogue Sneak Attack seed to legal source creation | done | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH03-SEED-MIGRATION-AUDIT | seed-present | `rogue_sneak_attack` seed uses legal creation and remains a real sheet/battle handoff scenario. |
| 22 | L12-SH22-SEED-MIGRATE-SORCERER-INNATE-SORCERY - Migrate the Sorcerer Innate Sorcery seed to legal source creation | done | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH03-SEED-MIGRATION-AUDIT | seed-present | `sorcerer_innate_sorcery` seed uses legal creation and remains a real sheet/battle handoff scenario. |
| 23 | L12-SH23-SEED-MIGRATE-SORCERER-BURNING-HANDS - Migrate the Sorcerer Burning Hands seed to legal source creation | done | L12-SH02-LEGAL-FIXTURE-SEAM, L12-SH03-SEED-MIGRATION-AUDIT | seed-present | Sorcerer `burning_hands` seed uses legal creation and remains a real sheet/battle handoff scenario. |
| 24 | L12-SH24-BUILD-SHEET-BARD - Add the Bard build-sheet SDK group | done | L12-SH06-BUILD-SHEET-FIRST-SLICE, L12-SH15-NEXT-BATCH-SPLIT | build-sheet-sdk | Bard class container, core traits, proficiencies, and multiclass entry traits prove through legal build-to-sheet projection. |
| 25 | L12-SH25-BUILD-SHEET-CLERIC - Add the Cleric build-sheet SDK group | done | L12-SH06-BUILD-SHEET-FIRST-SLICE, L12-SH15-NEXT-BATCH-SPLIT | build-sheet-sdk | Cleric class container, core traits, proficiencies, and multiclass entry traits prove through legal build-to-sheet projection. |
| 26 | L12-SH26-BUILD-SHEET-DRUID - Add the Druid build-sheet SDK group | done | L12-SH06-BUILD-SHEET-FIRST-SLICE, L12-SH15-NEXT-BATCH-SPLIT | build-sheet-sdk | Druid class container, core traits, proficiencies, and multiclass entry traits prove through legal build-to-sheet projection. |
| 27 | L12-SH27-BUILD-BATTLE-BARD - Add the Bard build-battle SDK group | done | L12-SH07-BUILD-BATTLE-FIRST-SLICE, L12-SH15-NEXT-BATCH-SPLIT | build-battle-sdk | Bard starting equipment proves through legal build, fresh sheet, and battle combatant projection. |
| 28 | L12-SH28-BUILD-BATTLE-CLERIC - Add the Cleric build-battle SDK group | done | L12-SH07-BUILD-BATTLE-FIRST-SLICE, L12-SH15-NEXT-BATCH-SPLIT | build-battle-sdk | Cleric starting equipment proves through legal build, fresh sheet, and battle combatant projection. |
| 29 | L12-SH29-CREATION-CLERIC-DIVINE-ORDER - Add the Cleric Divine Order creation SDK group | done | L12-SH05-CREATION-SDK-FIRST-SLICE, L12-SH15-NEXT-BATCH-SPLIT | character-creation-sdk | Cleric Divine Order selection proves through legal draft holes and finalized build facts. |
| 30 | L12-SH30-CREATION-DRUID-DRUIDIC - Add the Druidic creation SDK group | done | L12-SH05-CREATION-SDK-FIRST-SLICE, L12-SH15-NEXT-BATCH-SPLIT | character-creation-sdk | Druidic language and always-prepared spell access prove through legal draft holes and finalized build facts. |
| 31 | L12-SH31-SPELL-ACCESS-CLERIC - Add the Cleric sheet spell-access SDK group | done | L12-SH09-SHEET-SPELL-ACCESS-FIRST-SLICE, L12-SH15-NEXT-BATCH-SPLIT | sheet-spell-access-sdk | Cleric Spellcasting projects known/prepared/list/slot facts from legal creation to sheet. |
| 32 | L12-SH32-SHEET-MONK-UNARMORED-DEFENSE - Add the Monk Unarmored Defense sheet SDK group | done | L12-SH08-SHEET-SDK-FIRST-SLICE, L12-SH15-NEXT-BATCH-SPLIT | character-sheet-sdk | Monk Unarmored Defense projects Armor Class from legal creation and a fresh sheet. |
| 33 | L12-SH33-BATTLE-FEATURE-RECKLESS-ATTACK - Add the Barbarian Reckless Attack battle-feature SDK group | done | L12-SH10-BATTLE-FEATURE-FIRST-SLICE, L12-SH15-NEXT-BATCH-SPLIT | battle-feature-sdk | Barbarian Reckless Attack resolves from legal sheet-to-battle handoff through focused battle behavior. |
| 34 | L12-SH34-BATTLE-SPELL-CHARM-PERSON - Add the Charm Person battle-spell SDK group | done | L12-SH11-BATTLE-SPELL-FIRST-SLICE, L12-SH15-NEXT-BATCH-SPLIT | battle-spell-sdk | Charm Person resolves once through battle behavior and preserves class spell-access evidence for five access rows. |
| 35 | L12-SH35-BATTLE-SPELL-COLOR-SPRAY - Add the Color Spray battle-spell SDK group | done | L12-SH11-BATTLE-SPELL-FIRST-SLICE, L12-SH15-NEXT-BATCH-SPLIT | battle-spell-sdk | Color Spray resolves once through battle behavior and preserves class spell-access evidence for three access rows. |
| 36 | L12-SH36-MULTI-OWNER-DRUID-WILD-SHAPE - Split the Druid Wild Shape multi-owner SDK group | done | L12-SH12-MULTI-OWNER-FIRST-SLICE, L12-SH15-NEXT-BATCH-SPLIT | multi-owner-feature-sdk | Druid Wild Shape is split into legal source scenario evidence and explicit owner follow-ups. |
| 37 | L12-SH37-CLASS-TABLE-LEVEL1-CLOSURE - Close the level-1 class table summary family | done | L12-SH13-CLOSURE-REVIEW-FIRST-FAMILY, L12-SH15-NEXT-BATCH-SPLIT | explicit-closure | Level-1 class table summary rows receive explicit non-runtime/table-summary closure evidence. |
| 38 | L12-SH38-CLOSURE-ALARM - Close the Alarm spell-effect owner review group | done | L12-SH13-CLOSURE-REVIEW-FIRST-FAMILY, L12-SH15-NEXT-BATCH-SPLIT | spell-effect-owner-review | Alarm spell-list pressure rows receive closure evidence or concrete future owner tasks. |
| 39 | L12-SH39-SEED-PRESENT-AUDIT-FIRST-BATCH - Audit the first seed-present source regression batch | done | L12-SH03-SEED-MIGRATION-AUDIT, L12-SH17-SEED-MIGRATE-BARBARIAN-RAGE, L12-SH18-SEED-MIGRATE-BARDIC-INSPIRATION, L12-SH19-SEED-MIGRATE-FIGHTER-SECOND-WIND, L12-SH20-SEED-MIGRATE-MONK-MARTIAL-ARTS, L12-SH21-SEED-MIGRATE-ROGUE-SNEAK-ATTACK, L12-SH22-SEED-MIGRATE-SORCERER-INNATE-SORCERY, L12-SH23-SEED-MIGRATE-SORCERER-BURNING-HANDS, L12-SH15-NEXT-BATCH-SPLIT | seed-present | First migrated seed-present batch is checked for legal creation, real sheet/battle handoff, and row-specific assertion gaps. |
| 40 | L12-SH40-REMAINING-BATCH-SPLIT - Split the remaining L1/L2 source harness groups | done | L12-SH24-BUILD-SHEET-BARD, L12-SH25-BUILD-SHEET-CLERIC, L12-SH26-BUILD-SHEET-DRUID, L12-SH27-BUILD-BATTLE-BARD, L12-SH28-BUILD-BATTLE-CLERIC, L12-SH29-CREATION-CLERIC-DIVINE-ORDER, L12-SH30-CREATION-DRUID-DRUIDIC, L12-SH31-SPELL-ACCESS-CLERIC, L12-SH32-SHEET-MONK-UNARMORED-DEFENSE, L12-SH33-BATTLE-FEATURE-RECKLESS-ATTACK, L12-SH34-BATTLE-SPELL-CHARM-PERSON, L12-SH35-BATTLE-SPELL-COLOR-SPRAY, L12-SH36-MULTI-OWNER-DRUID-WILD-SHAPE, L12-SH37-CLASS-TABLE-LEVEL1-CLOSURE, L12-SH38-CLOSURE-ALARM, L12-SH39-SEED-PRESENT-AUDIT-FIRST-BATCH | planning | Recomputed 112 remaining needed L1/L2 groups and added Tasks 44-59 plus the next split gate. |
| 41 | L12-SH41-WILD-SHAPE-FORM-ACTION-SHAPES - Split remaining Wild Shape form Stat Block action shapes | blocked | none | generic-stat-block-action-procedure | No current SRD 5.2.1 eligible Wild Shape Beast form exposes reachable non-attack action sections; keep future non-attack action shapes closed until a concrete form or generic Stat Block action owner demands them. |
| 42 | L12-SH42-WILD-SHAPE-OBJECT-UTILIZE-TABLE - Split Wild Shape generic object and table-placement owners | blocked | none | generic-object-utilize-table-placement | Generic object-use, object retrieval, Utilize, and dropped-object table-placement work needs a concrete consumer or owner-design decision before implementation. |
| 43 | L12-SH43-WILD-SHAPE-ACTIVE-FORM-PERSISTENCE-A27 - Decide Wild Shape active-form persistence past battle handoff | blocked | none | session-active-effect-persistence-owner-decision | Cross-session active Wild Shape persistence remains closed by ASSUMPTIONS.md A27 until the session active-effect persistence owner is decided. |
| 44 | L12-SH44-BUILD-SHEET-FIGHTER - Add the Fighter build-sheet SDK group | done | L12-SH06-BUILD-SHEET-FIRST-SLICE, L12-SH40-REMAINING-BATCH-SPLIT | build-sheet-sdk | Fighter class container, core traits, proficiencies, and multiclass entry traits prove through legal build-to-sheet projection. |
| 45 | L12-SH45-BUILD-SHEET-MONK - Add the Monk build-sheet SDK group | done | L12-SH06-BUILD-SHEET-FIRST-SLICE, L12-SH40-REMAINING-BATCH-SPLIT | build-sheet-sdk | Monk class container, core traits, proficiencies, tool choice, and multiclass entry traits prove through legal build-to-sheet projection. |
| 46 | L12-SH46-BUILD-BATTLE-DRUID - Add the Druid build-battle SDK group | done | L12-SH07-BUILD-BATTLE-FIRST-SLICE, L12-SH40-REMAINING-BATCH-SPLIT | build-battle-sdk | Druid starting equipment proves through legal build, fresh sheet, and battle combatant projection. |
| 47 | L12-SH47-BUILD-BATTLE-FIGHTER - Add the Fighter build-battle SDK group | done | L12-SH07-BUILD-BATTLE-FIRST-SLICE, L12-SH40-REMAINING-BATCH-SPLIT | build-battle-sdk | Fighter starting equipment and Weapon Mastery prove through legal build, fresh sheet, and battle combatant projection. |
| 48 | L12-SH48-CREATION-DRUID-PRIMAL-ORDER - Add the Druid Primal Order creation SDK group | done | L12-SH05-CREATION-SDK-FIRST-SLICE, L12-SH40-REMAINING-BATCH-SPLIT | character-creation-sdk | Druid Primal Order selection proves through legal draft holes and finalized build facts. |
| 49 | L12-SH49-CREATION-FIGHTER-FIGHTING-STYLE - Add the Fighter Fighting Style creation SDK group | done | L12-SH05-CREATION-SDK-FIRST-SLICE, L12-SH40-REMAINING-BATCH-SPLIT | character-creation-sdk | Fighter Fighting Style selection proves through legal draft holes and finalized build facts. |
| 50 | L12-SH50-SPELL-ACCESS-DRUID - Add the Druid sheet spell-access SDK group | done | L12-SH09-SHEET-SPELL-ACCESS-FIRST-SLICE, L12-SH40-REMAINING-BATCH-SPLIT | sheet-spell-access-sdk | Druid Spellcasting projects known/prepared/list/slot facts from legal creation to sheet. |
| 51 | L12-SH51-SPELL-ACCESS-PALADIN - Add the Paladin sheet spell-access SDK group | done | L12-SH09-SHEET-SPELL-ACCESS-FIRST-SLICE, L12-SH40-REMAINING-BATCH-SPLIT | sheet-spell-access-sdk | Paladin Spellcasting projects prepared/list/slot facts from legal creation to sheet. |
| 52 | L12-SH52-SHEET-PALADIN-LAY-ON-HANDS - Add the Paladin Lay On Hands sheet SDK group | done | L12-SH08-SHEET-SDK-FIRST-SLICE, L12-SH40-REMAINING-BATCH-SPLIT | character-sheet-sdk | Paladin Lay On Hands projects the sheet-owned healing pool from legal creation and a fresh sheet. |
| 53 | L12-SH53-SHEET-WIZARD-ARCANE-RECOVERY - Add the Wizard Arcane Recovery sheet SDK group | done | L12-SH08-SHEET-SDK-FIRST-SLICE, L12-SH40-REMAINING-BATCH-SPLIT | character-sheet-sdk | Wizard Arcane Recovery projects the sheet-owned recovery fact from legal creation and a fresh sheet. |
| 54 | L12-SH54-BATTLE-FEATURE-FIGHTER-ACTION-SURGE - Add the Fighter Action Surge battle-feature SDK group | done | L12-SH10-BATTLE-FEATURE-FIRST-SLICE, L12-SH40-REMAINING-BATCH-SPLIT | battle-feature-sdk | Fighter Action Surge resolves from legal sheet-to-battle handoff through focused battle behavior. |
| 55 | L12-SH55-BATTLE-FEATURE-ROGUE-CUNNING-ACTION - Add the Rogue Cunning Action battle-feature SDK group | done | L12-SH10-BATTLE-FEATURE-FIRST-SLICE, L12-SH40-REMAINING-BATCH-SPLIT | battle-feature-sdk | Rogue Cunning Action resolves from legal sheet-to-battle handoff through focused battle behavior. |
| 56 | L12-SH56-BATTLE-SPELL-COMMAND - Add the Command battle-spell SDK group | done | L12-SH11-BATTLE-SPELL-FIRST-SLICE, L12-SH40-REMAINING-BATCH-SPLIT | battle-spell-sdk | Command resolves once through battle behavior and preserves class spell-access evidence for three access rows. |
| 57 | L12-SH57-BATTLE-SPELL-ENTANGLE - Add the Entangle battle-spell SDK group | done | L12-SH11-BATTLE-SPELL-FIRST-SLICE, L12-SH40-REMAINING-BATCH-SPLIT | battle-spell-sdk | Entangle resolves once through battle behavior and preserves class spell-access evidence for two access rows. |
| 58 | L12-SH58-CLOSURE-COMPREHEND-LANGUAGES - Close the Comprehend Languages spell-effect owner review group | done | L12-SH13-CLOSURE-REVIEW-FIRST-FAMILY, L12-SH40-REMAINING-BATCH-SPLIT | spell-effect-owner-review | Comprehend Languages spell-list pressure rows receive closure evidence or concrete future owner tasks. |
| 59 | L12-SH59-CLASS-TABLE-LEVEL2-CLOSURE - Close the level-2 class table summary family | done | L12-SH37-CLASS-TABLE-LEVEL1-CLOSURE, L12-SH40-REMAINING-BATCH-SPLIT | explicit-closure | Level-2 class table summary rows receive explicit non-runtime/table-summary closure evidence. |
| 60 | L12-SH60-REMAINING-BATCH-SPLIT-2 - Split the next remaining L1/L2 source harness groups | done | L12-SH44-BUILD-SHEET-FIGHTER, L12-SH45-BUILD-SHEET-MONK, L12-SH46-BUILD-BATTLE-DRUID, L12-SH47-BUILD-BATTLE-FIGHTER, L12-SH48-CREATION-DRUID-PRIMAL-ORDER, L12-SH49-CREATION-FIGHTER-FIGHTING-STYLE, L12-SH50-SPELL-ACCESS-DRUID, L12-SH51-SPELL-ACCESS-PALADIN, L12-SH52-SHEET-PALADIN-LAY-ON-HANDS, L12-SH53-SHEET-WIZARD-ARCANE-RECOVERY, L12-SH54-BATTLE-FEATURE-FIGHTER-ACTION-SURGE, L12-SH55-BATTLE-FEATURE-ROGUE-CUNNING-ACTION, L12-SH56-BATTLE-SPELL-COMMAND, L12-SH57-BATTLE-SPELL-ENTANGLE, L12-SH58-CLOSURE-COMPREHEND-LANGUAGES, L12-SH59-CLASS-TABLE-LEVEL2-CLOSURE | planning | Recomputed current inventory: no L1/L2 owner-evidence or runtime-required rows remain; added level-3 follow-up Tasks 61-64. |
| 61 | L12-SH61-SECOND-STORY-WORK-OWNER-EVIDENCE - Reconcile Rogue Second-Story Work owner evidence | done | L12-SH60-REMAINING-BATCH-SPLIT-2 | unit-profile/evidence | Reconcile Rogue Second-Story Work's supported character-sheet profile with the SDK inventory owner-evidence row. |
| 62 | L12-SH62-GASEOUS-FORM-MIST-CLOUD-STATE - Promote Gaseous Form mist-cloud state admission | done | L12-SH60-REMAINING-BATCH-SPLIT-2 | battle-runtime/spell-effect-owner | Add the typed mist-cloud form active-effect admission and lifecycle skeleton without authored-identity dispatch. |
| 63 | L12-SH63-GASEOUS-FORM-MOVEMENT-PASSIVES - Promote Gaseous Form movement and passive projections | done | L12-SH62-GASEOUS-FORM-MIST-CLOUD-STATE | battle-runtime/spell-effect-owner | Project mist-cloud movement replacement, Dash budget, Resistance, Prone Immunity, and Saving Throw Advantage from the admitted active effect. |
| 64 | L12-SH64-GASEOUS-FORM-RESTRICTIONS-CLEANUP - Promote Gaseous Form restrictions and cleanup | done | L12-SH63-GASEOUS-FORM-MOVEMENT-PASSIVES | battle-runtime/spell-effect-owner | Add mist-cloud action/object/speech restrictions, self-ending, zero-Hit-Point and spell-end cleanup, and table/spatial witness handling. |

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
- Recompute the L1/L2 denominator from the inventory: 400 rows, current
  generated scenario groups, current seed rows, and lane assignments.
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
- The L1/L2 denominator assignment still covers all 400 rows and all current
  generated groups.

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

- All 400 rows and all current generated groups are assigned to a lane and
  campaign task family.
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

Status: `done`

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

Status: `done`

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

Status: `done`

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

Status: `done`

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

Status: `done`

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

Status: `done`

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

Status: `done`

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
- Goodberry's two spell-list pressure rows are recorded as
  `table-only-closure-needed` inventory/survival closure; remaining
  `spell-effect-owner-review` scope is 69 rows across 21 groups.

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

Status: `done`

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

Status: `done`

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

- `applied`; Tasks 24-39 are the next runnable one-session batch. Task 40 is
  blocked on that batch and owns the next remaining-group split.

### Task 16 - L12-SH16-CLEANROOM-GATE-PLAN

Status: `done`

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

- `applied`; created `plans/RALPH_CLEANROOM_REPLAY_GATE.md` as the separate
  cleanroom replay plan. Source readiness drift is carried by
  `CRG-01-SOURCE-READINESS-FREEZE` before package refresh; no additional
  source campaign task is required here.

### Task 17 - L12-SH17-SEED-MIGRATE-BARBARIAN-RAGE

Status: `done`

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

Status: `done`

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

Status: `done`

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

Status: `done`

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

Status: `done`

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

Status: `done`

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

Status: `done`

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

### Task 24 - L12-SH24-BUILD-SHEET-BARD

Status: `done`

Input:

- Generated group `l15-sdk-raw-03:build-sheet-sdk:bard`.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `.references/srd-5.2.1/Classes/Bard.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read the Bard level-1 class traits and multiclass entry rows in the local SRD.
- Check terminology for CharacterBuild, Character Sheet, proficiency, and
  multiclass entry.
- Inspect the Barbarian build-sheet first slice and reuse the legal fixture seam
  without adding duplicate derived sheet state.

Output:

- One Bard build-sheet scenario group from legal creation to a fresh sheet.
- Inventory evidence for Bard class container, core traits, proficiencies, and
  multiclass entry traits.

Acceptance:

- The task covers only the Bard build-sheet group.
- The scenario finalizes through legal draft holes, not direct `CharacterBuild`
  construction.
- Assertions derive sheet facts from the finalized build and fresh sheet rather
  than storing duplicate expected state.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Bard"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `none` unless Bard exposes a build-sheet fixture gap that changes the
  remaining class-wide task shape.

### Task 25 - L12-SH25-BUILD-SHEET-CLERIC

Status: `done`

Input:

- Generated group `l15-sdk-raw-03:build-sheet-sdk:cleric`.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `.references/srd-5.2.1/Classes/Cleric.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read the Cleric level-1 class traits and multiclass entry rows in the local
  SRD.
- Check terminology for CharacterBuild, Character Sheet, proficiency, and
  multiclass entry.
- Inspect the existing build-sheet helper patterns before adding assertions.
- Complete any post-purchase loadout holes required by the legal draft
  finalization path before finalizing the build.

Output:

- One Cleric build-sheet scenario group from legal creation to a fresh sheet.
- Inventory evidence for Cleric class container, core traits, proficiencies, and
  multiclass entry traits.

Acceptance:

- The task covers only the Cleric build-sheet group.
- The scenario finalizes through legal draft holes.
- No spell execution assertions are added; spell access remains in the
  sheet-spell-access lane.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Cleric.*build-sheet|Cleric multiclass build-sheet"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `none` unless Cleric exposes a build-sheet fixture gap that changes the
  remaining class-wide task shape.

### Task 26 - L12-SH26-BUILD-SHEET-DRUID

Status: `done`

Input:

- Generated group `l15-sdk-raw-03:build-sheet-sdk:druid`.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `.references/srd-5.2.1/Classes/Druid.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read the Druid level-1 class traits and multiclass entry rows in the local SRD.
- Check terminology for CharacterBuild, Character Sheet, proficiency, and
  multiclass entry.
- Inspect the existing build-sheet helper patterns before adding assertions.
- Complete any post-purchase loadout holes required by the legal draft
  finalization path before finalizing the build.

Output:

- One Druid build-sheet scenario group from legal creation to a fresh sheet.
- Inventory evidence for Druid class container, core traits, proficiencies, and
  multiclass entry traits.

Acceptance:

- The task covers only the Druid build-sheet group.
- The scenario finalizes through legal draft holes.
- Druidic and Primal Order creation facts remain in their own creation groups.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Druid.*build-sheet|Druid multiclass build-sheet"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `none` unless Druid exposes a build-sheet fixture gap that changes the
  remaining class-wide task shape.

### Task 27 - L12-SH27-BUILD-BATTLE-BARD

Status: `done`

Input:

- Generated group `l15-sdk-raw-03:build-battle-sdk:bard`.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `.references/srd-5.2.1/Classes/Bard.md`
- `.references/srd-5.2.1/Equipment.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read Bard starting equipment and the relevant Equipment rules in the local SRD.
- Check terminology for equipment, Armor Class, attack, damage, and handoff.
- Inspect the Barbarian build-battle first slice and reuse the projection path.

Output:

- One Bard build-battle scenario group from legal creation through fresh sheet to
  battle combatant.
- Inventory evidence for Bard Starting Equipment battle projection.

Acceptance:

- The task covers only the Bard build-battle group.
- Assertions prove user-reachable equipment or combatant projection facts.
- No spell or feature behavior is added in this task.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Bard"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `none` unless Bard exposes a shared build-battle projection gap.

### Task 28 - L12-SH28-BUILD-BATTLE-CLERIC

Status: `done`

Input:

- Generated group `l15-sdk-raw-03:build-battle-sdk:cleric`.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `.references/srd-5.2.1/Classes/Cleric.md`
- `.references/srd-5.2.1/Equipment.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read Cleric starting equipment and the relevant Equipment rules in the local
  SRD.
- Check terminology for equipment, Armor Class, attack, damage, and handoff.
- Inspect the existing build-battle helper patterns before adding assertions.

Output:

- One Cleric build-battle scenario group from legal creation through fresh sheet
  to battle combatant.
- Inventory evidence for Cleric Starting Equipment battle projection.

Acceptance:

- The task covers only the Cleric build-battle group.
- Assertions prove user-reachable equipment or combatant projection facts.
- No spell or Channel Divinity behavior is added in this task.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Cleric"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `none` unless Cleric exposes a shared build-battle projection gap.

### Task 29 - L12-SH29-CREATION-CLERIC-DIVINE-ORDER

Status: `done`

Input:

- Generated group `l15-sdk-raw-03:character-creation-sdk:cleric-divine-order`.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `.references/srd-5.2.1/Classes/Cleric.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read the Cleric Divine Order source text in the local SRD.
- Check terminology for creation choice, class feature, and finalized build
  facts.
- Inspect the Warlock Pact Magic creation slice for the legal draft-hole flow.

Output:

- One legal creation scenario for Cleric Divine Order.
- Inventory evidence for the selected finalized-build facts and any sheet facts
  owned by the creation boundary.

Acceptance:

- The task covers only the Cleric Divine Order creation group.
- The choice is made through discovered creation holes.
- No battle behavior is asserted unless the SRD-owned output already projects
  through the selected source facts.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Divine Order|Cleric"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `none` unless Divine Order reveals a missing creation-hole owner.

### Task 30 - L12-SH30-CREATION-DRUID-DRUIDIC

Status: `done`

Input:

- Generated group `l15-sdk-raw-03:character-creation-sdk:druid-druidic`.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `.references/srd-5.2.1/Classes/Druid.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read the Druidic source text in the local SRD.
- Check terminology for languages, always-prepared spell access, and
  runtime-detached table adjudication.
- Inspect the creation slice patterns and existing spell-access evidence.

Output:

- One legal creation scenario for Druidic source facts.
- Inventory evidence for Druidic language and always-prepared Speak with Animals
  access, with table adjudication kept out of battle behavior.

Acceptance:

- The task covers only the Druidic creation group.
- The scenario finalizes through legal draft holes.
- Hidden-message discovery and deciphering are not modeled as battle runtime
  behavior.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Druidic|Druid"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `none` unless Druidic reveals a missing creation or spell-access owner.

### Task 31 - L12-SH31-SPELL-ACCESS-CLERIC

Status: `done`

Input:

- Generated group `l15-sdk-raw-03:sheet-spell-access-sdk:cleric:spell-access`.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `.references/srd-5.2.1/Classes/Cleric.md`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read Cleric Spellcasting and the local spell preparation/slot text.
- Check terminology for prepared spells, Spell Slots, and spell list access.
- Inspect the Bard spell-access first slice before adding assertions.

Output:

- One Cleric sheet spell-access scenario from legal creation to a fresh sheet.
- Inventory evidence for known/prepared/list/slot facts.

Acceptance:

- The task covers only the Cleric spell-access group.
- Spell execution remains in spell scenario groups.
- Assertions use sheet-projected facts, not authored identity dispatch in runtime
  behavior.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Cleric.*Spellcasting|Spellcasting.*Cleric"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `none` unless Cleric spell access changes the remaining class spell-access
  task shape.

### Task 32 - L12-SH32-SHEET-MONK-UNARMORED-DEFENSE

Status: `done`

Input:

- Generated group `l15-sdk-raw-03:character-sheet-sdk:monk-unarmored-defense`.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `.references/srd-5.2.1/Classes/Monk.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read Monk Unarmored Defense in the local SRD.
- Check terminology for Armor Class, Ability Score modifier, and Character
  Sheet projection.
- Inspect the Barbarian Unarmored Defense sheet slice before adding assertions.

Output:

- One Monk Unarmored Defense sheet scenario from legal creation to fresh sheet.
- Inventory evidence for the sheet-owned Armor Class projection.

Acceptance:

- The task covers only the Monk Unarmored Defense sheet group.
- The Armor Class fact is derived from canonical sheet ability and equipment
  state.
- No battle reducer behavior is added unless the existing projection already
  exposes it.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Monk Unarmored Defense|Unarmored Defense"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `none` unless Monk exposes a shared unarmored-defense projection gap.

### Task 33 - L12-SH33-BATTLE-FEATURE-RECKLESS-ATTACK

Status: `done`

Input:

- Generated group `l15-sdk-raw-04:battle-feature-sdk:barbarian-reckless-attack`.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `packages/battle-runtime/src/`
- `.references/srd-5.2.1/Classes/Barbarian.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read Barbarian Reckless Attack in the local SRD.
- Check terminology for Attack Roll Advantage and incoming attack-roll effects.
- Inspect the Danger Sense battle-feature first slice and relevant battle-runtime
  owner before editing.

Output:

- One Barbarian Reckless Attack source-side battle-feature scenario.
- Runtime, QNT, or evidence updates only if the existing battle owner is missing
  the required typed behavior.

Acceptance:

- The scenario starts from legal level-2 creation and real sheet-to-battle
  projection.
- Runtime behavior does not dispatch on authored identity.
- If behavior changes, the relevant Quint owner and focused validation are
  updated with the runtime change.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Reckless Attack|Barbarian"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- Relevant focused battle-runtime test or MBT only if executable battle behavior
  changes.
- `git diff --check`

Plan Impact:

- `update-required` if Reckless Attack needs a new shared battle owner or QNT
  parity task before SDK evidence can land.

### Task 34 - L12-SH34-BATTLE-SPELL-CHARM-PERSON

Status: `done`

Input:

- Generated group `l15-sdk-raw-03:battle-spell-sdk:charm-person`.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `packages/battle-runtime/src/`
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read Charm Person and spellcasting rules in the local SRD.
- Check terminology for Spell Invocation, Saving Throw, Charmed, and
  Concentration/duration if applicable.
- Confirm whether the existing battle spell owner already supports the typed
  condition effect.

Output:

- One Charm Person spell scenario group covering the five access rows through
  legal class spell access and battle resolution.
- Runtime/QNT/evidence updates only for missing typed behavior needed by the
  selected execution path.

Acceptance:

- The task covers only the Charm Person spell group.
- One execution path proves the spell behavior; class-specific rows are covered
  by explicit access assertions rather than duplicate behavior tests.
- Runtime behavior uses typed spell/effect facts, not spell id/name dispatch.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Charm Person"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- Relevant focused battle-runtime test or MBT only if executable battle behavior
  changes.
- `git diff --check`

Plan Impact:

- `update-required` if Charm Person must split by owner or exposes a reusable
  condition-spell owner gap.

### Task 35 - L12-SH35-BATTLE-SPELL-COLOR-SPRAY

Status: `done`

Input:

- Generated group `l15-sdk-raw-03:battle-spell-sdk:color-spray`.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `packages/battle-runtime/src/`
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read Color Spray and spellcasting rules in the local SRD.
- Check terminology for Cone, Saving Throw, Blinded, and spell effect duration.
- Confirm whether the existing battle spell owner already supports the typed
  area condition effect.

Output:

- One Color Spray spell scenario group covering the three access rows through
  legal class spell access and battle resolution.
- Runtime/QNT/evidence updates only for missing typed behavior needed by the
  selected execution path.

Acceptance:

- The task covers only the Color Spray spell group.
- One execution path proves the spell behavior; class-specific rows are covered
  by explicit access assertions rather than duplicate behavior tests.
- Runtime behavior uses typed spell/effect facts, not spell id/name dispatch.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Color Spray"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- Relevant focused battle-runtime test or MBT only if executable battle behavior
  changes.
- `git diff --check`

Plan Impact:

- `update-required` if Color Spray must split by owner or exposes a reusable
  area-condition spell owner gap.

### Task 36 - L12-SH36-MULTI-OWNER-DRUID-WILD-SHAPE

Status: `done`

Input:

- Generated group `l15-sdk-raw-04:multi-owner-feature-sdk:druid-wild-shape`.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `packages/battle-runtime/src/`
- `.references/srd-5.2.1/Classes/Druid.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read Druid Wild Shape in the local SRD.
- Check terminology for Bonus Action, form, stat block, resource, and
  sheet-to-battle projection.
- Split source proof, runtime behavior, stat-block ownership, and table/spatial
  boundaries before implementing.

Output:

- The smallest legal source scenario for the Druid Wild Shape group that can land
  in one session.
- Concrete follow-up tasks for any runtime, stat-block, or table/spatial owner
  work not closed in this task.

Acceptance:

- The task does not attempt to implement the whole Wild Shape owner surface in
  one pass.
- Any unsupported owner boundary is preserved as a concrete task, not a prose
  caveat.
- Runtime behavior does not dispatch on Druid Wild Shape authored identity.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Wild Shape|Druid"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- `pnpm unit-profile-coverage:check` if Unit evidence changes.
- Relevant focused battle-runtime test or MBT only if executable battle behavior
  changes.
- `git diff --check`

Plan Impact:

- `applied`; this task adds the source scenario and preserves remaining Wild
  Shape owner work as Tasks 41-43.

### Task 37 - L12-SH37-CLASS-TABLE-LEVEL1-CLOSURE

Status: `done`

Input:

- Generated groups `l15-sdk-raw-03:explicit-closure:*:class-table-summary:*`.
- `.references/srd-5.2.1/Classes/`
- `plans/sdk-raw-integration/level1-5-sdk-raw-inventory.json`
- `plans/sdk-raw-integration/LEVEL1_5_SDK_RAW_INVENTORY.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read the level-1 class tables in the local SRD.
- Confirm every selected row has the same non-runtime table-summary owner reason.
- Inspect existing generated closure evidence before adding any new evidence
  shape.

Output:

- Explicit closure evidence for the level-1 class table summary family.
- Inventory/report updates if the generated disposition changes.

Acceptance:

- The task covers only the level-1 class table summary closure family.
- Closure reasons cite local SRD anchors and do not mark table summaries as
  executable runtime behavior.
- No generated evidence duplicates facts that can be projected from existing
  inventory rows.

Validation:

- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `update-required` if the same closure can safely cover level-2 table summaries
  or if any class table row needs a separate owner.

### Task 38 - L12-SH38-CLOSURE-ALARM

Status: `done`

Input:

- Generated group `l15-sdk-raw-03:spell-effect-owner-review:alarm`.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read Alarm and spellcasting rules in the local SRD.
- Check terminology for ward, area, mental alarm, audible alarm, and table
  adjudication.
- Determine whether Alarm is runtime-detached closure, existing source owner
  sufficient, or missing a future owner.

Output:

- Closure evidence for Alarm, or concrete follow-up owner task(s) if Alarm needs
  future runtime/spec support.
- Inventory/profile updates if closure status changes.

Acceptance:

- The task covers only the Alarm closure-review group.
- Closure reasons cite local SRD passages.
- Only real owner/user decisions become blocked; Ralph-performable research
  remains runnable.

Validation:

- `pnpm unit-profile-coverage:check`
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `update-required` if Alarm reveals a reusable ward/notification closure family
  or a missing runtime owner task.

### Task 39 - L12-SH39-SEED-PRESENT-AUDIT-FIRST-BATCH

Status: `done`

Input:

- Generated seed audit rows for the migrated class-feature seeds from Tasks
  17-22 and the Sorcerer Burning Hands seed from Task 23.
- `plans/sdk-raw-integration/level1-5-sdk-raw-inventory.json`
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- Relevant local SRD class and spell files for the selected seed rows.
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Re-read the selected seed audit rows and confirm their current classification.
- Confirm each selected seed still uses legal creation plus real sheet/battle
  handoff.
- Check whether row-specific assertions are missing after the migrations.

Output:

- A first seed-present audit batch that either records no action needed or adds
  focused assertion/evidence updates for the migrated seeds.
- Follow-up tasks for any seed-present groups that are too broad for this batch.

Acceptance:

- The task covers only the migrated first-batch seed rows named in the Input.
- Existing seed rows are not double-counted as whole-width lifecycle proof unless
  they use legal creation and real handoff.
- Any assertion gap is fixed only in the touched seed scenario, not by broad
  inventory relabeling.

Validation:

- `pnpm sdk-raw-integration-inventory:check`
- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `git diff --check`

Plan Impact:

- `update-required` if the migrated seed batch reveals more seed migrations,
  unsupported fixture paths, or a need to split seed-present audits differently.

### Task 40 - L12-SH40-REMAINING-BATCH-SPLIT

Status: `done`

Input:

- This plan after Tasks 24-39 land.
- Generated L1/L2 campaign grouping after the next batch.
- Task closeouts and plan-impact notes from Tasks 24-39.
- `plans/sdk-raw-integration/level1-5-sdk-raw-inventory.json`
- `plans/sdk-raw-integration/LEVEL1_5_SDK_RAW_INVENTORY.md`

Research required before editing:

- Recompute remaining uncovered L1/L2 groups by lane.
- Apply the same Task 15 sizing rules: one class group, one spell execution
  group, one small identical closure family, or one owner split per task.
- Check whether Task 16 should remain blocked behind further source-side work.

Output:

- Concrete Ralph tasks for the following one-session batch.
- Updated `ralph-task-index`, DAG, and task details.
- Status and dependency updates for tasks that become runnable.

Acceptance:

- Remaining desired work is represented as executable tasks or blocked tasks
  with precise blockers.
- No new task is larger than one coding-agent session.
- Every new blocked task has `Blocker Type` and `Blocker Detail`.
- Every new task has Input, Output, Acceptance, Validation, and Plan Impact
  sections.

Validation:

- Static plan consistency checks from Task 1.
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `applied`; post-Task-39 inventory has 112 remaining needed L1/L2 groups
  across source scenario, closure-review, explicit-closure, and table-only
  lanes. Tasks 44-59 are the next runnable one-session batch. Task 60 is the
  next remaining-group split gate. Task 16 remains gated on further source-side
  stabilization.

### Task 41 - L12-SH41-WILD-SHAPE-FORM-ACTION-SHAPES

Status: `blocked`

Blocker Type: source-content-absent

Blocker Detail: The current SRD 5.2.1 eligible Wild Shape Beast form catalog has
no reachable non-Attack action sections. Keep future Multiattack, save-gated
actions, support/action options/specials, Bonus Actions, Reactions, and
Legendary Actions closed until a concrete form or generic Stat Block action
owner needs executable support.

Input:

- Druid Wild Shape source scenario and inventory follow-up facts from Task 36.
- `packages/surface/content/druid_wild_shape.json`
- `packages/battle-runtime/src/`
- `.references/srd-5.2.1/Classes/Druid.md`
- SRD Stat Block action sections for eligible Beast forms.

Research required before editing:

- Split remaining form action sections by Surface action shape: Multiattack,
  save-gated actions, support/action options/specials, Bonus Actions, Reactions,
  and Legendary Actions.
- Confirm which shapes are generic Stat Block procedure owners rather than
  Wild Shape-local behavior.

Output:

- One-session task split for the next generic Stat Block action owner slice, or
  a precise blocked owner decision if Task 40 finds no implementation-ready
  slice.

Acceptance:

- Runtime behavior does not branch on Beast, attack, Druid, or Wild Shape
  authored identity.
- Unsupported action shapes remain closed by typed Surface shape, not by prose
  caveat.

Validation:

- Task 40 static plan checks.
- `pnpm sdk-raw-integration-inventory:check`
- Relevant focused battle-runtime test or MBT only if executable battle behavior
  changes in the later owner task.
- `git diff --check`

Plan Impact:

- `update-required` when a concrete eligible form or generic Stat Block action
  owner makes this runnable.

### Task 42 - L12-SH42-WILD-SHAPE-OBJECT-UTILIZE-TABLE

Status: `blocked`

Blocker Type: owner-design-required

Blocker Detail: Generic object-use, object retrieval, Utilize, and dropped-object
table-placement behavior needs a concrete generic owner or consumer before
implementation. Current Wild Shape support already stores the form-limb witness
needed by future consumers.

Input:

- Druid Wild Shape source scenario and inventory follow-up facts from Task 36.
- `packages/battle-runtime/src/`
- Object-use and dropped-object boundaries referenced by Wild Shape equipment
  disposition.
- `.references/srd-5.2.1/Classes/Druid.md`

Research required before editing:

- Separate Wild Shape equipment disposition from generic carried-object
  inventory, dropped-object table placement, object retrieval, and Utilize or
  object-use consumers.
- Confirm future consumers use the stored form-limb witness instead of deriving
  object handling from Beast authored identity.

Output:

- One-session task split for the next generic object/Utilize/table-placement
  owner slice, or a precise blocked owner decision if Task 40 finds no
  implementation-ready slice.

Acceptance:

- No duplicate Wild Shape-local object state is introduced.
- Generic object-use and table-placement ownership remains visible as executable
  work.

Validation:

- Task 40 static plan checks.
- `pnpm sdk-raw-integration-inventory:check`
- Relevant focused battle-runtime test or MBT only if executable battle behavior
  changes in the later owner task.
- `git diff --check`

Plan Impact:

- `update-required` when a generic object/Utilize/table-placement owner or
  consumer is selected.

### Task 43 - L12-SH43-WILD-SHAPE-ACTIVE-FORM-PERSISTENCE-A27

Status: `blocked`

Blocker Type: owner-decision-required

Blocker Detail: ASSUMPTIONS.md A27 keeps active Wild Shape persistence across
non-battle time closed until a session active-effect persistence owner is
decided.

Input:

- Druid Wild Shape source scenario and active-form handoff closure from Task 36.
- `ASSUMPTIONS.md` A27.
- Character Sheet battle settlement and session active-effect persistence
  boundaries.
- `.references/srd-5.2.1/Classes/Druid.md`

Research required before editing:

- Revisit A27 before supporting active Wild Shape persistence across non-battle
  time.
- Identify the owner for selected form identity, remaining duration, and
  cross-session active-effect persistence if the closure is lifted.

Output:

- A routed owner-decision task or one-session implementation task for
  cross-session active-form persistence.

Acceptance:

- Current active-form Character Sheet handoff closure remains explicit until the
  persistence owner exists.
- Any future persistence shape keeps selected form identity and remaining
  duration coherent without duplicating battle active-effect state.

Validation:

- Task 40 static plan checks.
- `pnpm sdk-raw-integration-inventory:check`
- Relevant focused character-sheet or battle-runtime test only if a later task
  changes executable persistence behavior.
- `git diff --check`

Plan Impact:

- `update-required` when A27 is revised or a session active-effect persistence
  owner is selected.

### Task 44 - L12-SH44-BUILD-SHEET-FIGHTER

Status: `done`

Input:

- Generated group `l15-sdk-raw-03:build-sheet-sdk:fighter`.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `.references/srd-5.2.1/Classes/Fighter.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read Fighter level-1 class traits and multiclass entry rows in the local SRD.
- Check terminology for CharacterBuild, Character Sheet, proficiency, Weapon
  Mastery, Fighting Style, and multiclass entry.
- Inspect existing build-sheet class groups and reuse the legal fixture seam.

Output:

- One Fighter build-sheet scenario group from legal creation to a fresh sheet.
- Inventory evidence for Fighter class container, core traits, proficiencies,
  Weapon Mastery source facts, and multiclass entry traits.

Acceptance:

- The task covers only the Fighter build-sheet group.
- The scenario finalizes through legal draft holes.
- Fighting Style choice behavior remains in the Fighter creation group unless
  already projected as a build/sheet source fact.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Fighter.*build-sheet|Fighter multiclass build-sheet"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `none` unless Fighter exposes a build-sheet fixture gap that changes remaining
  class-wide task shape.

### Task 45 - L12-SH45-BUILD-SHEET-MONK

Status: `done`

Input:

- Generated group `l15-sdk-raw-03:build-sheet-sdk:monk`.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `.references/srd-5.2.1/Classes/Monk.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read Monk level-1 class traits and multiclass entry rows in the local SRD.
- Check terminology for CharacterBuild, Character Sheet, proficiency, tool
  proficiency, and multiclass entry.
- Inspect existing build-sheet class groups before adding assertions.

Output:

- One Monk build-sheet scenario group from legal creation to a fresh sheet.
- Inventory evidence for Monk class container, core traits, proficiencies, tool
  choice, and multiclass entry traits.

Acceptance:

- The task covers only the Monk build-sheet group.
- The scenario finalizes through legal draft holes.
- Unarmored Defense and Martial Arts behavior remains in their focused groups.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Monk.*build-sheet|Monk multiclass build-sheet"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `none` unless Monk exposes a build-sheet fixture gap that changes remaining
  class-wide task shape.

### Task 46 - L12-SH46-BUILD-BATTLE-DRUID

Status: `done`

Input:

- Generated group `l15-sdk-raw-03:build-battle-sdk:druid`.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `.references/srd-5.2.1/Classes/Druid.md`
- `.references/srd-5.2.1/Equipment.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read Druid starting equipment and relevant Equipment rules in the local SRD.
- Check terminology for equipment, Armor Class, attack, damage, and handoff.
- Reuse the existing build-battle projection path without adding spell or Wild
  Shape behavior.

Output:

- One Druid build-battle scenario group from legal creation through fresh sheet
  to battle combatant.
- Inventory evidence for Druid Starting Equipment battle projection.

Acceptance:

- The task covers only the Druid build-battle group.
- Assertions prove user-reachable equipment or combatant projection facts.
- Spell execution and Wild Shape remain in their own groups.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Druid.*build-battle|Druid Starting Equipment"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `none` unless Druid exposes a shared build-battle projection gap.

### Task 47 - L12-SH47-BUILD-BATTLE-FIGHTER

Status: `done`

Input:

- Generated group `l15-sdk-raw-03:build-battle-sdk:fighter`.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `.references/srd-5.2.1/Classes/Fighter.md`
- `.references/srd-5.2.1/Equipment.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read Fighter starting equipment, Weapon Mastery, and relevant Equipment rules
  in the local SRD.
- Check terminology for equipment, Weapon Mastery, attack, damage, and handoff.
- Inspect the Barbarian build-battle group before adding assertions.

Output:

- One Fighter build-battle scenario group from legal creation through fresh sheet
  to battle combatant.
- Inventory evidence for Fighter Starting Equipment and Weapon Mastery battle
  projection.

Acceptance:

- The task covers only the Fighter build-battle group.
- Assertions prove user-reachable equipment or combatant projection facts.
- Action Surge and Fighting Style remain in their own groups.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Fighter.*build-battle|Fighter Starting Equipment|Fighter Weapon Mastery"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `none` unless Fighter exposes a shared build-battle projection gap.

### Task 48 - L12-SH48-CREATION-DRUID-PRIMAL-ORDER

Status: `done`

Input:

- Generated group `l15-sdk-raw-03:character-creation-sdk:druid-primal-order`.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `.references/srd-5.2.1/Classes/Druid.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read Druid Primal Order source text in the local SRD.
- Check terminology for creation choice, class feature, and finalized build
  facts.
- Inspect existing creation group patterns before adding assertions.

Output:

- One legal creation scenario for Druid Primal Order.
- Inventory evidence for the selected finalized-build facts and any sheet facts
  owned by the creation boundary.

Acceptance:

- The task covers only the Druid Primal Order creation group.
- The choice is made through discovered creation holes.
- Druidic, Spellcasting, and Wild Shape remain in their own groups.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Primal Order|Druid"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `none` unless Primal Order reveals a missing creation-hole owner.

### Task 49 - L12-SH49-CREATION-FIGHTER-FIGHTING-STYLE

Status: `done`

Input:

- Generated group `l15-sdk-raw-03:character-creation-sdk:fighter-fighting-style`.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `.references/srd-5.2.1/Classes/Fighter.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read Fighter Fighting Style source text in the local SRD.
- Check terminology for creation choice, feat, class feature, and finalized build
  facts.
- Inspect existing creation group patterns before adding assertions.

Output:

- One legal creation scenario for Fighter Fighting Style.
- Inventory evidence for the selected finalized-build facts and any sheet facts
  owned by the creation boundary.

Acceptance:

- The task covers only the Fighter Fighting Style creation group.
- The choice is made through discovered creation holes.
- Battle behavior for the selected fighting style is not added unless already
  owned by existing typed runtime facts.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Fighting Style|Fighter"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `none` unless Fighting Style reveals a missing creation-hole owner.

### Task 50 - L12-SH50-SPELL-ACCESS-DRUID

Status: `done`

Input:

- Generated group `l15-sdk-raw-03:sheet-spell-access-sdk:druid:spell-access`.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `.references/srd-5.2.1/Classes/Druid.md`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read Druid Spellcasting and local spell preparation/slot text.
- Check terminology for prepared spells, Spell Slots, and spell list access.
- Inspect Bard and Cleric spell-access groups before adding assertions.

Output:

- One Druid sheet spell-access scenario from legal creation to a fresh sheet.
- Inventory evidence for known/prepared/list/slot facts.

Acceptance:

- The task covers only the Druid spell-access group.
- Spell execution remains in spell scenario groups.
- Druidic always-prepared access remains covered by the Druidic creation group.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Druid.*Spellcasting|Spellcasting.*Druid"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `none` unless Druid spell access changes remaining class spell-access task
  shape.

### Task 51 - L12-SH51-SPELL-ACCESS-PALADIN

Status: `done`

Input:

- Generated group `l15-sdk-raw-03:sheet-spell-access-sdk:paladin:spell-access`.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `.references/srd-5.2.1/Classes/Paladin.md`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read Paladin Spellcasting and local spell preparation/slot text.
- Check terminology for prepared spells, Spell Slots, and spell list access.
- Inspect existing spell-access groups before adding assertions.

Output:

- One Paladin sheet spell-access scenario from legal creation to a fresh sheet.
- Inventory evidence for prepared/list/slot facts.

Acceptance:

- The task covers only the Paladin spell-access group.
- Spell execution and Paladin's Smite remain in their own groups.
- Assertions use sheet-projected facts, not authored identity dispatch in runtime
  behavior.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Paladin.*Spellcasting|Spellcasting.*Paladin"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `none` unless Paladin spell access changes remaining class spell-access task
  shape.

### Task 52 - L12-SH52-SHEET-PALADIN-LAY-ON-HANDS

Status: `done`

Input:

- Generated group `l15-sdk-raw-03:character-sheet-sdk:paladin-lay-on-hands`.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `.references/srd-5.2.1/Classes/Paladin.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read Paladin Lay On Hands in the local SRD.
- Check terminology for healing pool, Magic Action, Hit Points, and Character
  Sheet projection.
- Confirm whether this task can assert sheet-owned pool facts without adding
  battle healing behavior.

Output:

- One Paladin Lay On Hands sheet scenario from legal creation to fresh sheet.
- Inventory evidence for the sheet-owned Lay On Hands pool projection.

Acceptance:

- The task covers only the Paladin Lay On Hands sheet group.
- Healing execution remains out of scope unless the existing runtime already owns
  the typed behavior.
- No duplicate pool state is stored beside the canonical sheet fact.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Lay On Hands|Paladin"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `update-required` if Lay On Hands needs a separate battle healing owner before
  SDK evidence can land.

### Task 53 - L12-SH53-SHEET-WIZARD-ARCANE-RECOVERY

Status: `done`

Input:

- Generated group `l15-sdk-raw-03:character-sheet-sdk:wizard-arcane-recovery`.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `.references/srd-5.2.1/Classes/Wizard.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read Wizard Arcane Recovery in the local SRD.
- Check terminology for Short Rest, Spell Slot restoration, and Character Sheet
  projection.
- Inspect existing sheet-owned resource projection patterns.

Output:

- One Wizard Arcane Recovery sheet scenario from legal creation to fresh sheet.
- Inventory evidence for the sheet-owned Arcane Recovery projection.

Acceptance:

- The task covers only the Wizard Arcane Recovery sheet group.
- Short Rest execution is not added unless already owned by existing typed sheet
  runtime facts.
- Spellbook and Ritual Adept remain in their own groups.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Arcane Recovery|Wizard"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `update-required` if Arcane Recovery needs a separate rest/recovery owner
  before SDK evidence can land.

### Task 54 - L12-SH54-BATTLE-FEATURE-FIGHTER-ACTION-SURGE

Status: `done`

Input:

- Generated group `l15-sdk-raw-04:battle-feature-sdk:fighter-action-surge`.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `packages/battle-runtime/src/`
- `.references/srd-5.2.1/Classes/Fighter.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read Fighter Action Surge in the local SRD.
- Check terminology for additional action, resource spending, and turn action
  economy.
- Inspect relevant battle-runtime owner before editing.

Output:

- One Fighter Action Surge source-side battle-feature scenario.
- Runtime, QNT, or evidence updates only if existing battle owners are missing
  the required typed behavior.

Acceptance:

- The scenario starts from legal level-2 creation and real sheet-to-battle
  projection.
- Runtime behavior does not dispatch on authored identity.
- If behavior changes, the relevant Quint owner and focused validation are
  updated with the runtime change.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Action Surge|Fighter"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- Relevant focused battle-runtime test or MBT only if executable battle behavior
  changes.
- `git diff --check`

Plan Impact:

- `update-required` if Action Surge needs a new shared action-economy owner or
  QNT parity task before SDK evidence can land.

### Task 55 - L12-SH55-BATTLE-FEATURE-ROGUE-CUNNING-ACTION

Status: `done`

Input:

- Generated group `l15-sdk-raw-04:battle-feature-sdk:rogue-cunning-action`.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `packages/battle-runtime/src/`
- `.references/srd-5.2.1/Classes/Rogue.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read Rogue Cunning Action in the local SRD.
- Check terminology for Bonus Action, Dash, Disengage, and Hide.
- Inspect relevant battle-runtime owner before editing.

Output:

- One Rogue Cunning Action source-side battle-feature scenario.
- Runtime, QNT, or evidence updates only if existing battle owners are missing
  the required typed behavior.

Acceptance:

- The scenario starts from legal level-2 creation and real sheet-to-battle
  projection.
- Runtime behavior does not dispatch on authored identity.
- Hide/discovery behavior is split if it exceeds one session or belongs to a
  separate owner.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Cunning Action|Rogue"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- Relevant focused battle-runtime test or MBT only if executable battle behavior
  changes.
- `git diff --check`

Plan Impact:

- `update-required` if Cunning Action needs a new shared Bonus Action or Hide
  owner before SDK evidence can land.

### Task 56 - L12-SH56-BATTLE-SPELL-COMMAND

Status: `done`

Input:

- Generated group `l15-sdk-raw-03:battle-spell-sdk:command`.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `packages/battle-runtime/src/`
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read Command and spellcasting rules in the local SRD.
- Check terminology for spell commands, Saving Throw, and target action on next
  turn.
- Confirm whether existing battle spell owners support the selected typed
  command effect.

Output:

- One Command spell scenario group covering the three access rows through legal
  class spell access and battle resolution.
- Runtime/QNT/evidence updates only for missing typed behavior needed by the
  selected execution path.

Acceptance:

- The task covers only the Command spell group.
- One execution path proves spell behavior; class-specific rows are covered by
  explicit access assertions.
- Runtime behavior uses typed spell/effect facts, not spell id/name dispatch.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Command"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- Relevant focused battle-runtime test or MBT only if executable battle behavior
  changes.
- `git diff --check`

Plan Impact:

- `update-required` if Command must split by owner or exposes a reusable
  forced-action spell owner gap.

### Task 57 - L12-SH57-BATTLE-SPELL-ENTANGLE

Status: `done`

Input:

- Generated group `l15-sdk-raw-03:battle-spell-sdk:entangle`.
- `packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts`
- `packages/character-battle-runtime/src/sdk-integration-test-support.ts`
- `packages/battle-runtime/src/`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read Entangle and spellcasting rules in the local SRD.
- Check terminology for Concentration, area, Saving Throw, Restrained, and
  difficult terrain if applicable.
- Confirm whether existing battle spell owners support the selected typed area
  condition effect.

Output:

- One Entangle spell scenario group covering the two access rows through legal
  class spell access and battle resolution.
- Runtime/QNT/evidence updates only for missing typed behavior needed by the
  selected execution path.

Acceptance:

- The task covers only the Entangle spell group.
- One execution path proves spell behavior; class-specific rows are covered by
  explicit access assertions.
- Runtime behavior uses typed spell/effect facts, not spell id/name dispatch.

Validation:

- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/level1-sdk-raw-integration.test.ts -t "Entangle"`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm sdk-raw-integration-inventory:check`
- Relevant focused battle-runtime test or MBT only if executable battle behavior
  changes.
- `git diff --check`

Plan Impact:

- `update-required` if Entangle must split by owner or exposes a reusable
  area-control spell owner gap.

### Task 58 - L12-SH58-CLOSURE-COMPREHEND-LANGUAGES

Status: `done`

Input:

- Generated group `l15-sdk-raw-03:spell-effect-owner-review:comprehend-languages`.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read Comprehend Languages and spellcasting rules in the local SRD.
- Check terminology for language understanding, literal meaning, and table
  adjudication.
- Determine whether Comprehend Languages is runtime-detached closure, existing
  source owner sufficient, or missing a future owner.

Output:

- Closure evidence for Comprehend Languages, or concrete follow-up owner task(s)
  if it needs future runtime/spec support.
- Inventory/profile updates if closure status changes.

Acceptance:

- The task covers only the Comprehend Languages closure-review group.
- Closure reasons cite local SRD passages.
- Only real owner/user decisions become blocked; Ralph-performable research
  remains runnable.

Validation:

- `pnpm unit-profile-coverage:check`
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `update-required` if Comprehend Languages reveals a reusable language/reading
  closure family or a missing runtime owner task.

### Task 59 - L12-SH59-CLASS-TABLE-LEVEL2-CLOSURE

Status: `done`

Input:

- Generated groups `l15-sdk-raw-04:explicit-closure:*:class-table-summary:*`.
- `.references/srd-5.2.1/Classes/`
- `plans/sdk-raw-integration/level1-5-sdk-raw-inventory.json`
- `plans/sdk-raw-integration/LEVEL1_5_SDK_RAW_INVENTORY.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read the level-2 class tables in the local SRD.
- Confirm every selected row has the same non-runtime table-summary owner
  reason.
- Inspect Task 37 closure evidence before adding any new evidence shape.

Output:

- Explicit closure evidence for the level-2 class table summary family.
- Inventory/report updates if the generated disposition changes.

Acceptance:

- The task covers only the level-2 class table summary closure family.
- Closure reasons cite local SRD anchors and do not mark table summaries as
  executable runtime behavior.
- No generated evidence duplicates facts that can be projected from existing
  inventory rows.

Validation:

- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `update-required` if any level-2 class table row needs a separate owner.

### Task 60 - L12-SH60-REMAINING-BATCH-SPLIT-2

Status: `done`

Input:

- This plan after Tasks 44-59 land.
- Generated L1/L2 campaign grouping after the next batch.
- Task closeouts and plan-impact notes from Tasks 44-59.
- `plans/sdk-raw-integration/level1-5-sdk-raw-inventory.json`
- `plans/sdk-raw-integration/LEVEL1_5_SDK_RAW_INVENTORY.md`

Research required before editing:

- Recompute remaining uncovered L1/L2 groups by lane.
- Apply the Task 15 sizing rules: one class group, one spell execution group,
  one small identical closure family, or one owner split per task.
- Check whether Task 16 should remain blocked behind further source-side work.

Output:

- Concrete Ralph tasks for the following one-session batch.
- Updated `ralph-task-index`, DAG, and task details.
- Status and dependency updates for tasks that become runnable.
- Task 60 found no remaining L1/L2 rows with `owner-evidence-required`,
  `battle-runtime-required`, or executable follow-up final dispositions. The
  next visible source-side owner-evidence work is level-3 Rogue Second-Story
  Work plus Gaseous Form's level-3 spell rows, now split into Tasks 61-64.

Acceptance:

- Remaining desired work is represented as executable tasks or blocked tasks
  with precise blockers.
- No new task is larger than one coding-agent session.
- Every new blocked task has `Blocker Type` and `Blocker Detail`.
- Every new task has Input, Output, Acceptance, Validation, and Plan Impact
  sections.

Validation:

- Static plan consistency checks from Task 1.
- `pnpm sdk-raw-integration-inventory:check`
- `git diff --check`

Plan Impact:

- `applied`; current L1/L2 battle-readiness rows are complete, Task 16 remains
  gated on level-3 source-side stabilization, and Tasks 61-64 are the next
  concrete owner-evidence follow-ups.

### Task 61 - L12-SH61-SECOND-STORY-WORK-OWNER-EVIDENCE

Status: `done`

Input:

- `plans/sdk-raw-integration/level1-5-sdk-raw-inventory.json`
- `plans/sdk-raw-integration/LEVEL1_5_SDK_RAW_INVENTORY.md`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `plans/unit-profile-coverage/unit-matrix.json`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `packages/character-sheet-runtime/src/ability-checks.test.ts`
- `.references/srd-5.2.1/Classes/Rogue.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read Rogue Second-Story Work in the local SRD and the Movement, Speed, Long
  Jump, High Jump, Ability, and Ability Check glossary entries.
- Inspect the existing Second-Story Work character-sheet tests and unit-profile
  claim before adding any new evidence.
- Search for existing linked-Speed and jump-distance ability-substitution facts
  before changing a data shape.

Output:

- Reconciled owner evidence for `rogue_second_story_work` so the SDK inventory
  no longer reports `catalog-installed-owner-evidence-required` for the level-3
  row when the existing supported character-sheet profile and deterministic
  projection evidence are sufficient.
- Focused character-sheet evidence update only if the existing test/evidence
  reference is stale.

Acceptance:

- The task does not add duplicated Climb Speed or jump-distance values beside
  canonical Speed and Ability Score facts.
- The supported profile remains character-sheet-owned and does not introduce
  battle-runtime authored-identity dispatch.
- If the existing evidence is stale, the fix points to an actual test name
  symbol used by `test()` or `it()`.

Validation:

- `pnpm unit-profile-coverage:check`
- `pnpm sdk-raw-integration-inventory:check`
- Focused character-sheet test only if evidence or runtime changes:
  `pnpm --filter @dnd/character-sheet-runtime exec vitest run src/ability-checks.test.ts -t "Second-Story Work"`
- `pnpm --filter @dnd/character-sheet-runtime typecheck` if character-sheet
  runtime or tests change.
- `git diff --check`

Plan Impact:

- `none` unless reconciliation shows the generated SDK inventory cannot consume
  existing supported-profile evidence without a script/schema change.

### Task 62 - L12-SH62-GASEOUS-FORM-MIST-CLOUD-STATE

Status: `done`

Input:

- Current Gaseous Form rows in
  `plans/sdk-raw-integration/level1-5-sdk-raw-inventory.json`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `packages/surface/content/gaseous_form.json`
- `packages/battle-runtime/src/`
- `packages/shared-algebras/proofs/rule-core/`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read Gaseous Form and spellcasting duration/Concentration rules in the local
  SRD.
- Check terminology for Magic Action, Concentration, Speed, Fly Speed, hover,
  Resistance, Immunity, Saving Throw, Hit Points, and spell end.
- Inspect existing active Spell Effect state, self-transformation, movement, and
  spell-end cleanup owners before adding a mist-cloud effect type.

Output:

- A typed mist-cloud form active-effect admission and lifecycle skeleton derived
  from Surface procedure facts, not from spell id, spell name, or provenance.
- Initial deterministic admission/projection evidence for the Gaseous Form Unit
  profile subset covered by this slice.
- Focused runtime and Quint owner updates for active-effect creation,
  Concentration ownership, duration, target association, and spell-end identity.

Acceptance:

- The active-effect state makes mismatched source spell, target, duration, and
  cleanup ownership unrepresentable at the boundary where the runtime consumes
  it.
- No movement replacement, passive defensive projections, action restrictions,
  or table/spatial witnesses are silently claimed in this task; those remain in
  Tasks 63-64.
- Runtime support is admitted by typed Surface/effect shape rather than Gaseous
  Form authored identity.

Validation:

- Focused battle-runtime tests for mist-cloud active-effect admission.
- Relevant focused QNT owner test or proof if the owner changes.
- `pnpm rules-kernel-coverage:check`
- `pnpm unit-profile-coverage:check`
- `pnpm sdk-raw-integration-inventory:check`
- Battle MBT only if the changed owner already has a focused MBT lane and the
  executable behavior change requires it; follow the MBT protocol in
  `AGENTS.md`.
- `git diff --check`

Plan Impact:

- `update-required` if the active-effect owner must be split further before
  movement/passive projections can consume it.

### Task 63 - L12-SH63-GASEOUS-FORM-MOVEMENT-PASSIVES

Status: `done`

Input:

- Output from `L12-SH62-GASEOUS-FORM-MIST-CLOUD-STATE`
- `packages/battle-runtime/src/`
- `packages/shared-algebras/proofs/rule-core/`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read the Gaseous Form movement and defensive-passive paragraphs in the local
  SRD.
- Inspect existing effective movement, Dash budget, Resistance, condition
  Immunity, and Saving Throw roll-mode projection owners.
- Search for existing active-effect passive projection state before adding any
  field.

Output:

- Mist-cloud movement replacement: the target's only movement method becomes a
  10-foot Fly Speed with hover, including effective movement and Dash budget
  projections.
- Passive projections for Bludgeoning, Piercing, and Slashing Resistance, Prone
  Immunity, and Strength, Dexterity, and Constitution Saving Throw Advantage.
- Focused runtime and parity evidence for those projections.

Acceptance:

- Movement replacement is derived from the active effect and does not duplicate
  base Speed facts.
- Passive projections remain generic effect projections and do not branch on
  spell id, name, class spell list, or provenance.
- Table/spatial occupancy, narrow-opening passage, liquid treatment, action
  restrictions, and cleanup remain out of scope for this task.

Validation:

- Focused battle-runtime tests for movement and passive projections.
- Relevant focused QNT owner test or proof if the owner changes.
- `pnpm rules-kernel-coverage:check`
- `pnpm unit-profile-coverage:check`
- `pnpm sdk-raw-integration-inventory:check`
- Battle MBT only if required by a changed focused owner; follow the MBT
  protocol in `AGENTS.md`.
- `git diff --check`

Plan Impact:

- `update-required` if movement replacement or passive projection ownership must
  split into separate runtime/QNT owners.

### Task 64 - L12-SH64-GASEOUS-FORM-RESTRICTIONS-CLEANUP

Status: `done`

Input:

- Output from `L12-SH62-GASEOUS-FORM-MIST-CLOUD-STATE`
- Output from `L12-SH63-GASEOUS-FORM-MOVEMENT-PASSIVES`
- `packages/battle-runtime/src/`
- `packages/shared-algebras/proofs/rule-core/`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
- `UBIQUITOUS_LANGUAGE.md`

Research required before editing:

- Read Gaseous Form restrictions, zero-Hit-Point ending, and self-ending text in
  the local SRD.
- Inspect existing action discovery, spellcasting interdiction, object
  interaction, zero-Hit-Point cleanup, and spell-end cleanup owners.
- Identify which creature-space occupancy, narrow-opening passage, and liquid
  treatment facts must remain caller/table-spatial witnesses.

Output:

- Mist-cloud restrictions for talking, object manipulation/drop/use/interaction,
  attacks, and spellcasting.
- Magic-action self-ending, zero-Hit-Point ending, and normal spell-end cleanup
  for the active mist-cloud form.
- Explicit caller/table-spatial witness handling or closure for occupying
  another creature's space, passing narrow openings, and treating liquids as
  solid surfaces.
- Final Gaseous Form supported-profile or profile-subset-supported claim and SDK
  inventory evidence for Sorcerer, Warlock, and Wizard spell-list rows.

Acceptance:

- Restrictions and cleanup are driven by typed active-effect state and existing
  action/object/spell cleanup owners, not authored Gaseous Form identity.
- Table/spatial facts are consumed as witnesses or explicitly closed; the
  runtime does not invent duplicate map, liquid, opening, or creature-space
  state.
- The three Gaseous Form spell-list rows converge to accepted evidence or carry
  a precise remaining blocker.

Validation:

- Focused battle-runtime tests for restrictions, self-ending, zero-Hit-Point
  ending, and spell-end cleanup.
- Relevant focused QNT owner test or proof if the owner changes.
- `pnpm rules-kernel-coverage:check`
- `pnpm unit-profile-coverage:check`
- `pnpm sdk-raw-integration-inventory:check`
- Battle MBT only if required by a changed focused owner; follow the MBT
  protocol in `AGENTS.md`.
- `git diff --check`

Plan Impact:

- `update-required` if table/spatial witnesses expose a missing shared
  occupancy, narrow-passage, or liquid-surface owner that must become a separate
  task.

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
- Confirm the post-Task-60 generated grouping assigns all 400 L1/L2 rows:
  - 154 `sdk-scenario-needed`
  - 151 `seed-scenario-present`
  - 24 `explicit-closure-present`
  - 0 `explicit-closure-needed`
  - 67 `closure-review-needed`
  - 4 `table-only-closure-needed`
- Run `git diff --check`.
