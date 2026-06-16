# Ralph Lane D: Level 4 Partial Profile And Projection Units

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L14G-D01-DRUID-WILD-SHAPE-PARTIAL-PROFILE",
      "status": "done",
      "title": "Reconcile Druid Wild Shape partial profile ownership"
    },
    {
      "number": 2,
      "id": "L14G-D02-MONK-MONKS-FOCUS-PARTIAL-PROFILE",
      "status": "done",
      "title": "Reconcile Monk Focus partial profile ownership"
    },
    {
      "number": 3,
      "id": "L14G-D03-SORCERER-METAMAGIC-PARTIAL-PROFILE",
      "status": "done",
      "title": "Reconcile Sorcerer Metamagic partial profile ownership"
    },
    {
      "number": 4,
      "id": "L14G-D04-ROGUE-SECOND-STORY-WORK-EVIDENCE",
      "status": "done",
      "title": "Add Rogue Second-Story Work projection evidence"
    },
    {
      "number": 5,
      "id": "L14G-D05-DRUID-WILD-SHAPE-REMAINING-BATTLE-RUNTIME-SPLIT",
      "status": "done",
      "title": "Split remaining Druid Wild Shape battle runtime owners"
    },
    {
      "number": 6,
      "id": "L12G-FOLLOWUP-DRUID-WILD-SHAPE-BEAST-SPELLS-CASTING",
      "status": "done",
      "title": "Promote Wild Shape Beast Spells casting exceptions"
    },
    {
      "number": 7,
      "id": "L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-MULTI-DAMAGE",
      "status": "done",
      "title": "Promote multi-component Stat Block attack damage"
    },
    {
      "number": 8,
      "id": "L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-TRAIT-ADVANTAGE",
      "status": "done",
      "title": "Promote trait-derived Stat Block attack Advantage"
    },
    {
      "number": 9,
      "id": "L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-ATTACK-HIT-RIDERS",
      "status": "ready-for-research",
      "title": "Split Stat Block attack-hit rider execution"
    },
    {
      "number": 10,
      "id": "L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-NON-ATTACK-ACTIONS",
      "status": "ready-for-research",
      "title": "Split non-Attack Stat Block action execution"
    }
  ]
}
-->

## Lane Scope

This lane is the per-Unit partial-profile/projection lane for the level-4 Golden
Gate tail.

Task 1 closed the Wild Shape sense/language/speech projection evidence gap. Task
5 closed the remaining broad Wild Shape runtime split by separating Beast Spells
from Stat Block action-shape owners and by naming executable Stat Block follow-up
slices. Task 2 closed the Monk Focus generated-readiness ambiguity while
preserving the ordinary jump movement/table owner boundary. Task 3 closed the
Sorcerer Metamagic generated-readiness ambiguity by making the promoted runtime
subsets and procedure-specific deferred owner closures checker-readable. Task 4
closed the Rogue Second-Story Work evidence gap by making the existing
linked-Speed and jump-distance projection evidence checker-readable.

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

## Task DAG

| Task | Depends on | Unlocks |
| --- | --- | --- |
| L14G-D01-DRUID-WILD-SHAPE-PARTIAL-PROFILE | L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT | L14G-D05-DRUID-WILD-SHAPE-REMAINING-BATTLE-RUNTIME-SPLIT |
| L14G-D02-MONK-MONKS-FOCUS-PARTIAL-PROFILE | L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT | - |
| L14G-D03-SORCERER-METAMAGIC-PARTIAL-PROFILE | L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT | - |
| L14G-D04-ROGUE-SECOND-STORY-WORK-EVIDENCE | L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT | - |
| L14G-D05-DRUID-WILD-SHAPE-REMAINING-BATTLE-RUNTIME-SPLIT | L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT; L14G-D01-DRUID-WILD-SHAPE-PARTIAL-PROFILE | L12G-FOLLOWUP-DRUID-WILD-SHAPE-BEAST-SPELLS-CASTING; L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-MULTI-DAMAGE; L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-TRAIT-ADVANTAGE; L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-ATTACK-HIT-RIDERS; L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-NON-ATTACK-ACTIONS |
| L12G-FOLLOWUP-DRUID-WILD-SHAPE-BEAST-SPELLS-CASTING | L14G-D05-DRUID-WILD-SHAPE-REMAINING-BATTLE-RUNTIME-SPLIT | - |
| L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-MULTI-DAMAGE | L14G-D05-DRUID-WILD-SHAPE-REMAINING-BATTLE-RUNTIME-SPLIT | - |
| L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-TRAIT-ADVANTAGE | L14G-D05-DRUID-WILD-SHAPE-REMAINING-BATTLE-RUNTIME-SPLIT | - |
| L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-ATTACK-HIT-RIDERS | L14G-D05-DRUID-WILD-SHAPE-REMAINING-BATTLE-RUNTIME-SPLIT | - |
| L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-NON-ATTACK-ACTIONS | L14G-D05-DRUID-WILD-SHAPE-REMAINING-BATTLE-RUNTIME-SPLIT | - |

### Task 1 - L14G-D01-DRUID-WILD-SHAPE-PARTIAL-PROFILE

Status: `done`

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
- Sense/language/speech projection is checker-readable evidence: Beast-form
  special Senses and passive Perception derive from the active form, retained
  languages derive from character facts threaded through battle initialization,
  and retained speech is blocked from Incapacitated-derived condition state.
- Remaining splits include Stat Block action shape, Beast Spells, generic
  object-use execution, and non-battle persistence boundaries.

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

Status: `done`

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

Status: `done`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `sorcerer_metamagic`

SRD anchor: `.references/srd-5.2.1/Classes/Sorcerer.md:111-117`;
`.references/srd-5.2.1/Classes/Sorcerer.md:145-213`

Current state:

- Surface installed.
- Unit matrix reports `profile-subset-supported`.
- Generated inventory reports owner evidence present and accepted for the
  current promoted subset.
- Evidence exists for character creation/sheet bridge, deterministic battle
  runtime admission/projection tests for the promoted subset, and focused MBTs.
- Remaining non-promoted procedures are closed to future procedure-specific
  owners rather than one broad Metamagic patch.

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

Status: `done`

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

### Task 5 - L14G-D05-DRUID-WILD-SHAPE-REMAINING-BATTLE-RUNTIME-SPLIT

Status: `done`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT
- L14G-D01-DRUID-WILD-SHAPE-PARTIAL-PROFILE

Unit: `druid_wild_shape`

SRD anchor: `.references/srd-5.2.1/Classes/Druid.md:117-122`;
`.references/srd-5.2.1/Classes/Druid.md:160-162`;
`.references/srd-5.2.1/Rules-Glossary.md:966-976`

Current state:

- Wild Shape known-form battle support covers the promoted subset named in
  `unit-feature.druid-wild-shape-known-form`.
- Sense/language/speech projection is no longer an open split after Task 1.
- Before this split, the remaining generated follow-up was
  `L12G-FOLLOWUP-DRUID-WILD-SHAPE-SHAPE-SHIFTING-RUNTIME`: Beast Spells casting
  exceptions, unsupported Stat Block action sections, attack prose riders,
  multi-component damage, and Stat Block non-Attack actions.
- Generic object-use execution and non-battle active-form persistence remain
  separate closed owner boundaries unless their owners are explicitly promoted.

Output:

- Split the remaining Wild Shape battle runtime follow-up into concrete
  executable tasks or prove a single narrow slice is implementation-ready.
- Preserve Beast Spells and Stat Block action ownership as rule-shaped work; do
  not merge them into generic Wild Shape support metadata.
- Do not implement generic object-use execution or non-battle persistence in
  this task unless their owners are explicitly promoted first.

Acceptance:

- Stat Block action shape and Beast Spells no longer share one ambiguous broad
  follow-up when they require different owners or verification.
- Any new task IDs are reflected in the Ralph task index, DAG, and task detail
  entries with dependencies and verification.
- No runtime path dispatches on Beast or Druid authored identity.

Verification:

- RAW and ubiquitous-language check against the SRD anchors above.
- `pnpm unit-profile-coverage:check:self-test`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check`
- Focused runtime tests only for a promoted executable slice.
- Focused MBT only if reducer behavior changes, following the repo MBT protocol.
- `git diff --check`

Completion notes:

- Beast Spells is split to
  `L12G-FOLLOWUP-DRUID-WILD-SHAPE-BEAST-SPELLS-CASTING`, a spell-casting gate
  task that owns the level-18 exception to Wild Shape's pre-Beast-Spells
  no-spellcasting projection and the priced/consumed Material component
  exclusion.
- Stat Block action work is split by Surface action shape, not by Beast id:
  multi-component attack damage, trait-derived attack-roll Advantage,
  attack-hit riders, and non-Attack action sections now have separate follow-up
  owners and verification lanes.
- Generic object-use execution and non-battle active-form persistence stay
  closed to their existing owner boundaries; this task did not promote them.

### Task 6 - L12G-FOLLOWUP-DRUID-WILD-SHAPE-BEAST-SPELLS-CASTING

Status: `done`

Depends on:

- L14G-D05-DRUID-WILD-SHAPE-REMAINING-BATTLE-RUNTIME-SPLIT

Unit: `druid_wild_shape`

SRD anchor: `.references/srd-5.2.1/Classes/Druid.md:117-122`;
`.references/srd-5.2.1/Classes/Druid.md:160-162`

Current state:

- Battle runtime rejects Druid level 18+ Wild Shape initialization until Beast
  Spells is modeled.
- The promoted Wild Shape subset correctly projects no spellcasting before Beast
  Spells.
- Spell Definition component facts already distinguish priced and consumed
  Material components from focus-replaceable components in spell procedure
  owners.

Output:

- Promote a spell-casting gate that allows spell invocation while an active Wild
  Shape form is present only when the character has the Beast Spells feature and
  the chosen Spell Definition lacks a priced or consumed Material component.
- Preserve existing spell procedure ownership; Beast Spells should admit or
  reject the cast attempt, not reimplement spell effects.
- Keep the pre-Beast-Spells no-spellcasting projection as the default path for
  lower-level Druids.

Acceptance:

- The gate consumes active shape state, selected character feature facts, and
  structured Spell Component facts without dispatching on Druid or spell authored
  identity.
- Priced or consumed Material component spells remain rejected while shaped.
- Existing spell invocation owners still own targets, resources, effects,
  Concentration, and damage.

Verification:

- RAW and ubiquitous-language check against the SRD anchors above and
  `UBIQUITOUS_LANGUAGE.md` Spellcasting terms.
- Focused battle-runtime tests for level-18 shaped casting admission/rejection.
- QNT proof or focused MBT only if reducer spell-cast behavior changes.
- `pnpm unit-profile-coverage:check:self-test`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### Task 7 - L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-MULTI-DAMAGE

Status: `done`

Depends on:

- L14G-D05-DRUID-WILD-SHAPE-REMAINING-BATTLE-RUNTIME-SPLIT

Unit: `druid_wild_shape`

SRD anchor: `.references/srd-5.2.1/Rules-Glossary.md:966-976`

Current state:

- Supported Wild Shape form attacks are admitted only for executable Stat Block
  Attack shapes already understood by battle runtime.
- The Phase 2 Wild Shape action-surface inventory identified one-hit attacks
  with multiple damage components as a distinct blocked Surface shape.

Output:

- Promote multi-component Stat Block attack damage through the generic Stat
  Block attack damage owner.
- Preserve each damage component's type and amount through existing damage
  resolution instead of flattening components into one copied value.
- Update Wild Shape form admission to accept this Surface shape once the generic
  Stat Block attack owner is covered.

Acceptance:

- Runtime admission is keyed by parsed Stat Block attack damage shape, not Beast
  authored identity.
- Existing single-component attack support remains unchanged.
- Unit-profile and rules-kernel evidence point to focused tests and parity for
  the generic Stat Block attack shape.

Verification:

- RAW and ubiquitous-language check against Stat Block Attack Notation and Damage
  Notation plus `UBIQUITOUS_LANGUAGE.md` Damage terms.
- Focused battle-runtime reducer/admission tests for a synthetic or SRD Stat
  Block attack with multiple hit damage components.
- Focused QNT/MBT if damage reducer behavior changes.
- `pnpm unit-profile-coverage:check:self-test`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### Task 8 - L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-TRAIT-ADVANTAGE

Status: `done`

Depends on:

- L14G-D05-DRUID-WILD-SHAPE-REMAINING-BATTLE-RUNTIME-SPLIT

Unit: `druid_wild_shape`

SRD anchor: `.references/srd-5.2.1/Rules-Glossary.md:962-976`

Current state:

- Trait-derived attack-roll Advantage is filtered out of Wild Shape battle
  availability instead of silently admitting the attack without the trait.
- The current supported subset owns ordinary Attack Roll resolution but not
  Stat Block trait predicates.

Output:

- Promote a typed Stat Block trait-to-attack-roll-mode reader for conditional
  Advantage predicates that can be represented without table-only facts.
- Thread the trait-derived roll mode into the existing attack-roll owner for
  supported Stat Block attacks.
- Keep traits whose predicates need table-only spatial or relationship facts
  behind explicit caller witnesses.

Acceptance:

- The runtime consumes typed trait facts and caller witnesses; it does not branch
  on a Beast, trait, or Druid authored id.
- Unsupported trait predicates remain rejected or witness-required rather than
  ignored.
- Wild Shape form admission accepts the attack only when its trait-derived
  Advantage facts are represented by the new owner.

Verification:

- RAW and ubiquitous-language check against Stat Block Traits and Attack Notation
  plus `UBIQUITOUS_LANGUAGE.md` Advantage and Attack Roll terms.
- Focused battle-runtime admission/reducer tests for trait-derived Advantage and
  unsupported predicate rejection.
- Focused QNT/MBT if attack-roll reducer behavior changes.
- `pnpm unit-profile-coverage:check:self-test`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### Task 9 - L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-ATTACK-HIT-RIDERS

Status: `ready-for-research`

Depends on:

- L14G-D05-DRUID-WILD-SHAPE-REMAINING-BATTLE-RUNTIME-SPLIT

Unit: `druid_wild_shape`

SRD anchor: `.references/srd-5.2.1/Rules-Glossary.md:966-976`

Current state:

- Attack prose riders on supported-form Stat Block attacks are currently a
  blocked Surface shape.
- Existing battle runtime has typed owners for some rider destinations, such as
  conditions and movement facts, but no generic Stat Block attack-hit rider
  admission boundary for Wild Shape form attacks.

Output:

- Inventory attack-hit rider shapes reachable from eligible Wild Shape Beast
  forms and split typed vertical slices by rider destination before execution.
- Promote only riders whose target owner is already typed or is promoted in the
  same tracer bullet.
- Keep prose-only or table-adjudicated riders unpromoted with explicit closure
  reasons.

Acceptance:

- Attack-hit rider admission is by parsed rider shape and target owner, not Beast
  authored identity.
- Unsupported rider prose cannot be silently dropped while the host attack is
  admitted.
- Each promoted rider slice has focused runtime evidence and, where reducer
  behavior changes, parity evidence.

Verification:

- RAW and ubiquitous-language check against Stat Block Attack Notation and the
  rider-specific SRD destination terms.
- Focused inventory/test work for the selected rider slice.
- Focused QNT/MBT only for promoted reducer behavior.
- `pnpm unit-profile-coverage:check:self-test`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### Task 10 - L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-NON-ATTACK-ACTIONS

Status: `ready-for-research`

Depends on:

- L14G-D05-DRUID-WILD-SHAPE-REMAINING-BATTLE-RUNTIME-SPLIT

Unit: `druid_wild_shape`

SRD anchor: `.references/srd-5.2.1/Rules-Glossary.md:962-976`

Current state:

- Wild Shape battle availability filters out Stat Block action sections outside
  the currently admitted executable Attack shape.
- Existing Stat Block control owners cover action-section ordering and resources,
  but concrete non-Attack action effects require per-effect procedure owners.

Output:

- Inventory non-Attack Stat Block action sections reachable from eligible Wild
  Shape Beast forms.
- Split each executable effect shape to its generic Stat Block action procedure
  owner instead of adding Wild Shape-local execution.
- Preserve table-owned or prose-only actions as precise unpromoted closures.

Acceptance:

- Non-Attack action admission is keyed by Surface action shape and procedure
  owner, not by Beast or Druid authored identity.
- Wild Shape form admission can include a non-Attack action only after the
  action's generic procedure owner has focused evidence.
- No generic object-use execution is promoted through this task unless the
  generic object/Utilize owner is explicitly promoted.

Verification:

- RAW and ubiquitous-language check against Stat Block Actions, Bonus Actions,
  Reactions, and action lifecycle terms.
- Focused inventory and procedure tests for any selected action shape.
- Focused QNT/MBT only for promoted reducer behavior.
- `pnpm unit-profile-coverage:check:self-test`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

## Verification

- Run reviewer-loop convergence after implementation or research: RAW
  traceability, ubiquitous-language/domain, architecture/connascence, and
  code-review passes; fix every reasonable finding and repeat until no
  reasonable findings remain.
- Run the commands named by each task.
