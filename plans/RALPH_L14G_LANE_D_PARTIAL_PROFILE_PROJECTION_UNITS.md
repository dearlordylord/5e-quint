# Ralph Lane D: Level 4 Partial Profile And Projection Units

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L14G-D01-DRUID-WILD-SHAPE-PARTIAL-PROFILE",
      "status": "ready-for-research",
      "title": "Reconcile Druid Wild Shape partial profile ownership"
    },
    {
      "number": 2,
      "id": "L14G-D02-MONK-MONKS-FOCUS-PARTIAL-PROFILE",
      "status": "ready-for-research",
      "title": "Reconcile Monk Focus partial profile ownership"
    },
    {
      "number": 3,
      "id": "L14G-D03-SORCERER-METAMAGIC-PARTIAL-PROFILE",
      "status": "ready-for-research",
      "title": "Reconcile Sorcerer Metamagic partial profile ownership"
    },
    {
      "number": 4,
      "id": "L14G-D04-ROGUE-SECOND-STORY-WORK-EVIDENCE",
      "status": "ready-for-implementation",
      "title": "Add Rogue Second-Story Work projection evidence"
    }
  ]
}
-->

## Lane Scope

This lane is the per-Unit partial-profile/projection lane for the level-4 Golden
Gate tail.

The first three Units are research tasks because their current profiles mix
supported runtime behavior with deferred owner boundaries. `rogue_second_story_work`
is implementation-ready because pre-research found the desired projection shape
already exists and the remaining work is checker-readable evidence.

## Source Artifacts

- `plans/unit-profile-coverage/L14G_06_LEVEL4_REACHABLE_UNIT_FULL_AUDIT.md`
- `plans/WILD_SHAPE_STAT_BLOCK_ACTION_PLAN.md`
- `plans/WILD_SHAPE_SENSE_LANGUAGE_PROJECTION_PLAN.md`
- `plans/LEVEL1_2_FULL_SUPPORT_BACKLOG.md`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `plans/unit-profile-coverage/unit-matrix.json`
- `packages/battle-runtime/`
- `packages/character-sheet-runtime/`
- `packages/character-battle-runtime/`
- `.references/srd-5.2.1/Classes/`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `UBIQUITOUS_LANGUAGE.md`

## Lane Rules

- Run the Ralph task-base check before research or implementation.
- Do not turn a partial-profile row into a broad `supported` label until each
  supported and deferred fact has a typed owner.
- Do not duplicate Stat Block, Speed, language, spell, Focus Point, Sorcery
  Point, jump-distance, or Metamagic procedure facts beside their source facts.
- Run MBT only for actual behavior changes, one MBT process at a time, following
  the repository MBT protocol.

## Shared Verification Requirements

- RAW and ubiquitous-language check against the task's local SRD class/rules
  anchors and `UBIQUITOUS_LANGUAGE.md`.
- Reviewer-loop convergence: RAW traceability, ubiquitous-language/domain,
  architecture/connascence, and code-review passes until no reasonable findings
  remain.

### Task 1 - L14G-D01-DRUID-WILD-SHAPE-PARTIAL-PROFILE

Status: `ready-for-research`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `druid_wild_shape`

SRD anchor: `.references/srd-5.2.1/Classes/Druid.md:95-122`;
`.references/srd-5.2.1/Rules-Glossary.md:934-960`;
`.references/srd-5.2.1/Playing-the-Game.md:390-397`

Current state:

- Surface installed.
- Unit matrix reports `profile-subset-supported`.
- Evidence exists for character creation, known forms, battle D20/form
  lifecycle, and selected identity.
- Remaining splits include Stat Block action shape, Beast Spells,
  sense/language/speech projection, and non-battle persistence boundaries.

Output:

- Reconcile the supported subset and deferred owner boundaries in checker-readable
  form.
- If implementing a narrow slice, prefer the sense/language projection split:
  derive Beast special senses from active form and retained languages/speech from
  character facts.
- Split Stat Block action or Beast Spell implementation into smaller tasks if
  research shows they are not safe here.

Acceptance:

- Generated coverage can express the Wild Shape supported subset and deferred
  owners without a prose exception.
- No Wild Shape field duplicates Stat Block senses, languages, speech, or action
  facts.

Verification:

- `pnpm unit-profile-coverage:check:self-test`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check`
- If projection changes: `pnpm --filter @dnd/battle-runtime exec vitest run src/creature-perception-communication.test.ts`
- If character-battle bridge changes: `pnpm --filter @dnd/character-battle-runtime exec vitest run src/index.test.ts`
- Focused MBT only if reducer behavior changes.
- `git diff --check`

### Task 2 - L14G-D02-MONK-MONKS-FOCUS-PARTIAL-PROFILE

Status: `ready-for-research`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `monk_monks_focus`

SRD anchor: `.references/srd-5.2.1/Classes/Monk.md:76-90`;
`.references/srd-5.2.1/Rules-Glossary.md:550-552`;
`.references/srd-5.2.1/Rules-Glossary.md:646-668`;
`.references/srd-5.2.1/Rules-Glossary.md:904-910`

Current state:

- Surface installed.
- Unit matrix reports `profile-subset-supported`.
- Evidence covers character creation, sheet resource/save DC, battle options,
  and selected identity.
- Ordinary Long/High Jump witnesses remain table/future movement-owner work.

Output:

- Reconcile the supported subset and deferred movement/table owner boundary.
- Preserve the existing battle support subset.
- Do not implement ordinary jump route or landing adjudication unless a movement
  owner is explicitly promoted.

Acceptance:

- Generated product readiness no longer describes Monk's Focus as ambiguous
  partial support.
- Focus Point and movement facts remain owned by their existing typed owners.

Verification:

- `pnpm unit-profile-coverage:check:self-test`
- `pnpm unit-profile-coverage:check`
- If sheet resources change: `pnpm --filter @dnd/character-sheet-runtime exec vitest run src/resources.test.ts`
- If battle Focus support changes: `pnpm --filter @dnd/battle-runtime exec vitest run src/unit-profile-admission-martial-action-features.test.ts src/battle-runtime-monk-focus.test.ts`
- QNT proof lane if QNT specs change.
- `git diff --check`

### Task 3 - L14G-D03-SORCERER-METAMAGIC-PARTIAL-PROFILE

Status: `ready-for-research`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `sorcerer_metamagic`

SRD anchor: `.references/srd-5.2.1/Classes/Sorcerer.md:111-117`;
`.references/srd-5.2.1/Classes/Sorcerer.md:145-213`

Current state:

- Surface installed.
- Unit matrix reports `profile-subset-supported`.
- Evidence exists for character creation/sheet bridge and several focused MBTs.
- Remaining work is per-procedure owner promotion, not one broad Metamagic patch.

Output:

- Reconcile current promoted Metamagic subsets and deferred procedure owners.
- Split concrete implementation tasks only after choosing the spell procedure
  owner that consumes each typed Metamagic fact.

Acceptance:

- Generated coverage can read the promoted subset and deferred procedure owners.
- No runtime path dispatches on Sorcerer or Metamagic authored identity.

Verification:

- `pnpm unit-profile-coverage:check:self-test`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check`
- If runtime resource behavior changes: `pnpm --filter @dnd/battle-runtime exec vitest run src/battle-runtime-metamagic-resource.test.ts`
- Focused MBT only for a promoted slice, one at a time.
- `git diff --check`

### Task 4 - L14G-D04-ROGUE-SECOND-STORY-WORK-EVIDENCE

Status: `ready-for-implementation`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `rogue_second_story_work`

SRD anchor: `.references/srd-5.2.1/Classes/Rogue.md:167-173`;
`.references/srd-5.2.1/Rules-Glossary.md:229-237`;
`.references/srd-5.2.1/Rules-Glossary.md:550-552`;
`.references/srd-5.2.1/Rules-Glossary.md:646-668`;
`.references/srd-5.2.1/Rules-Glossary.md:904-910`

Current state:

- Surface installed.
- Current matrix already shows the desired closure:
  `character-sheet.linked-speed-grant-projection` and
  `character-sheet.jump-distance-ability-substitution`.
- Evidence points at `character-sheet-runtime/src/ability-checks.test.ts`.

Output:

- Add or repair checker-readable evidence for Climb Speed equal to Speed and
  Dexterity-based jump-distance substitution.
- Keep Climb Speed linked to base Speed; do not store a stale numeric copy.

Acceptance:

- `rogue_second_story_work` is absent from owner-evidence-required diagnostics.
- Jump substitution is typed projection data, not Rogue authored-identity
  dispatch.

Verification:

- `pnpm --filter @dnd/character-sheet-runtime exec vitest run src/ability-checks.test.ts`
- `pnpm unit-profile-coverage:check:self-test`
- `pnpm unit-profile-coverage:check`
- `git diff --check`

## Verification

- Run reviewer-loop convergence after implementation or research: RAW
  traceability, ubiquitous-language/domain, architecture/connascence, and
  code-review passes; fix every reasonable finding and repeat until no
  reasonable findings remain.
- Run the commands named by each task.
