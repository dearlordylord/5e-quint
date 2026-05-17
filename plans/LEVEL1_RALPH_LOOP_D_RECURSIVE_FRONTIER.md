# Level 1 Ralph Loop D - Recursive Frontier

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L1D2-FRONTIER-PRECHECK",
      "status": "done",
      "title": "Active Lane And Metric Reconciliation"
    },
    {
      "number": 2,
      "id": "L1D2-BARBARIAN-UNARMORED-DEFENSE",
      "status": "done",
      "title": "Barbarian Unarmored Defense Selected Identity Replay"
    },
    {
      "number": 3,
      "id": "L1D2-MONK-UNARMORED-DEFENSE",
      "status": "done",
      "title": "Monk Unarmored Defense Selected Identity Replay"
    },
    {
      "number": 4,
      "id": "L1D2-WIZARD-RITUAL-ADEPT",
      "status": "done",
      "title": "Wizard Ritual Adept Selected Identity Replay"
    },
    {
      "number": 5,
      "id": "L1D2-SORCERER-INNATE-SORCERY",
      "status": "done",
      "title": "Sorcerer Innate Sorcery Selected Identity Replay"
    },
    {
      "number": 6,
      "id": "L1D2-MYCELIUM-STEP",
      "status": "done",
      "title": "Mycelium Step Selected Identity Replay"
    },
    {
      "number": 7,
      "id": "L1D2-WIZARD-ARCANE-RECOVERY",
      "status": "done",
      "title": "Wizard Arcane Recovery Selected Identity Replay"
    },
    {
      "number": 8,
      "id": "L1D2-FIGHTER-FIGHTING-STYLE",
      "status": "done",
      "title": "Fighter Fighting Style Selected Identity Replay"
    },
    {
      "number": 9,
      "id": "L1D2-CLERIC-DRUID-ORDER",
      "status": "done",
      "title": "Cleric And Druid Order Selected Identity Replay"
    },
    {
      "number": 10,
      "id": "L1D2-ROGUE-EXPERTISE",
      "status": "done",
      "title": "Rogue Expertise Selected Identity Replay"
    },
    {
      "number": 11,
      "id": "L1D2-WARLOCK-ELDRITCH-INVOCATIONS",
      "status": "done",
      "title": "Warlock Eldritch Invocations Selected Identity Replay"
    },
    {
      "number": 12,
      "id": "L1D2-WEAPON-MASTERY-CONTAINERS",
      "status": "done",
      "title": "Weapon Mastery Container Selected Identity Replays"
    },
    {
      "number": 13,
      "id": "L1D2-REPLENISH-001",
      "status": "done",
      "title": "Recursive Frontier Replenishment 001"
    },
    {
      "number": 14,
      "id": "L1D2-HUNTERS-MARK-FAVORED-ENEMY-ACCOUNTING",
      "status": "done",
      "title": "Hunter's Mark And Ranger Favored Enemy Profile Accounting Closure"
    },
    {
      "number": 15,
      "id": "L1D2-BARDIC-INSPIRATION-SCALING",
      "status": "done",
      "title": "Bardic Inspiration Die Scaling Support"
    },
    {
      "number": 16,
      "id": "L1D2-MONK-MARTIAL-ARTS-SCALING",
      "status": "done",
      "title": "Monk Martial Arts Die Scaling Support"
    },
    {
      "number": 17,
      "id": "L1D2-CHARM-PERSON-CLOSURE",
      "status": "done",
      "title": "Charm Person Social Boundary Closure"
    },
    {
      "number": 18,
      "id": "L1D2-DISGUISE-SELF-DECISION-INTEGRATION",
      "status": "done",
      "title": "Disguise Self Frontier Decision Integration"
    },
    {
      "number": 19,
      "id": "L1D2-DRUIDCRAFT-DECISION-INTEGRATION",
      "status": "done",
      "title": "Druidcraft Frontier Decision Integration"
    },
    {
      "number": 20,
      "id": "L1D2-ELEMENTALISM-DECISION-INTEGRATION",
      "status": "done",
      "title": "Elementalism Frontier Decision Integration"
    },
    {
      "number": 21,
      "id": "L1D2-ILLUSORY-SCRIPT-DECISION-INTEGRATION",
      "status": "done",
      "title": "Illusory Script Frontier Decision Integration"
    },
    {
      "number": 22,
      "id": "L1D2-MESSAGE-DECISION-INTEGRATION",
      "status": "done",
      "title": "Message Frontier Decision Integration"
    },
    {
      "number": 23,
      "id": "L1D2-PRESTIDIGITATION-DECISION-INTEGRATION",
      "status": "done",
      "title": "Prestidigitation Frontier Decision Integration"
    },
    {
      "number": 24,
      "id": "L1D2-THAUMATURGY-BOOMING-VOICE",
      "status": "ready-for-research",
      "title": "Thaumaturgy Booming Voice Ability Check Support"
    },
    {
      "number": 25,
      "id": "L1D2-UNSEEN-SERVANT-NO-MATRIX",
      "status": "ready-for-research",
      "title": "Unseen Servant No-Matrix Decision"
    },
    {
      "number": 26,
      "id": "L1D2-REPLENISH-002",
      "status": "ready-for-research",
      "title": "Recursive Frontier Replenishment 002"
    }
  ]
}
-->

Umbrella goal: reach full level-1 support with companion/familiar work excluded
to its separate worktree. Full support means:

- strict level-1 runtime/profile support is closed for installed executable
  Units;
- runtime-detached table adjudication is explicitly closed instead of modeled
  as runtime behavior;
- Character Creation and Character Sheet support count as support, not
  presentation polish;
- supported-profile selected identity/readiness evidence keeps increasing
  until the current denominator is covered;
- active companion/familiar features are not pulled into this lane.

This is the replacement D lane after the completed damage selected-identity
batch. It deliberately does not steal active non-D work, including the language
access lane for `druid_druidic` and `rogue_thieves_cant`. It started with
currently safe selected-identity tasks that were supported on `master`, kept
character/container tasks visible while blocked, and uses recursive
replenishment tasks to append the next concrete frontier. The replenishment
task must add the next concrete batch before marking itself done, so this lane
does not naturally terminate just because one fixed batch was exhausted.

Do not edit `plans/ACTIVE_PLAN.md`.

## Authority

- `@dnd/battle-runtime`, `@dnd/character-creation-runtime`, and
  `@dnd/character-sheet-runtime` are all in scope for full level-1 support.
- Read local RAW in `.references/srd-5.2.1/` and `UBIQUITOUS_LANGUAGE.md`
  before changing evidence or expectations.
- No companion feature work is in scope. `find_familiar` and companion/familiar
  runtime behavior stay excluded.
- Do not add runtime-owned map/pathfinding/light-rendering/social-knowledge
  behavior for table-owned or runtime-detached facts.
- Do not duplicate selected option state already represented in CharacterBuild,
  Character Sheet state, battle runtime state, or existing Unit evidence.

## Worktree Safety Prefix

Every Ralph prompt for this loop must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`. You are not alone in the codebase:
> do not revert edits made by others, and adapt your implementation around
> existing changes. Do not edit `plans/ACTIVE_PLAN.md`.

## Review Loop

Use implementer, reviewer, handback until `accept`, then decider. Every task
must produce review and decider artifacts. Reviewers should reject broad
behavior work hidden inside selected identity evidence tasks, duplicate
registries, and support claims that outpace executable runtime/profile support.

## Recursive Replenishment Contract

The replenishment task is part of the work, not an optional planning note.

When a `L1D2-REPLENISH-*` task runs, Ralph must:

1. First resolve any coverage-checker hard failure that prevents report refresh.
   Task 1 found `fireball` installed in the Unit catalog while the current
   `master` matrix still records it as not installed and has no profile
   disposition claim; classify or route that Unit before relying on refreshed
   frontier metrics.
2. Refresh `plans/unit-profile-coverage/UNIT_REPORT.md`,
   `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`, and
   `plans/unit-profile-coverage/unit-matrix.json` by running
   `pnpm unit-profile-coverage:check --write`.
3. Read active non-D plan files plus `.ralph/runs/*/events.tsv` logs if those
   worktrees exist, but do not edit their task worktrees. Closed top-level
   Ralph plan files may have been removed from `master`; use generated
   coverage artifacts and git history for historical context instead.
4. Recompute the frontier in this order:
   - strict level-1 open-profile-accounting items not owned by active non-D
     lanes;
   - supported-profile Units missing selected-identity MBT evidence and not
     owned by active non-D lanes;
   - runtime-detached or table-owned closure gaps if the generated strict view
     has reopened them;
   - next supported-profile expansion or admission tasks only after the strict
     level-1 frontier is closed or blocked on active lane merges.
   `druid_druidic`, `rogue_thieves_cant`, class-granted language facts, and the
   Rogue extra language choice are owned by Loop L, not by this D lane.
5. Append at least twelve concrete atomic tasks, or every remaining meaningful
   task if fewer than twelve exist. Each task must have clear inputs, outputs,
   primary files, RAW anchors, and verification.
6. Append a successor replenishment task as the final runnable task, with the
   next numeric suffix, for example `L1D2-REPLENISH-002`.
7. Keep the Ralph task index, DAG table, and task detail sections synchronized.
8. Only mark the current replenishment task `done` after the new tasks and the
   successor replenishment task are committed. If the frontier appears empty,
   add a concrete audit task that proves that state from generated artifacts and
   then add the successor replenishment task anyway.

This means the D lane should keep running while useful level-1 or immediately
adjacent support/readiness work exists.

## Owned Surface

Primary write scope for the initial batch:

- `packages/character-sheet-runtime/src/*selected-identity*.mbt.test.ts`;
- `packages/character-creation-runtime/src/*selected-identity*.mbt.test.ts`
  only after C-dependent tasks are unblocked;
- `packages/battle-runtime/src/*feature-selected-identity*.mbt.test.ts` only
  for `sorcerer_innate_sorcery` and `mycelium_step` if those are the existing
  runtime owner boundaries;
- matching package-local qnt files when needed;
- `plans/unit-profile-coverage/unit-evidence.jsonl`;
- generated reports under `plans/unit-profile-coverage/`;
- this plan file when a replenishment task appends new work.

Avoid active non-D lane files unless a replenishment task proves those lanes are
merged and no longer active. In particular, D must not touch `druid_druidic`,
`rogue_thieves_cant`, class-granted language facts, the Rogue extra language
choice, `faerie_fire`, `feather_fall`, `fog_cloud`, `grease`, `jump`, `light`,
or `thunderwave`. Loop L owns Druidic/Thieves' Cant language access. The
historical execution frontiers owned the listed spatial/movement/light rows.
D owns `hunters_mark` and `ranger_favored_enemy` among the remaining strict
open rows.

## MBT And Verification Protocol

Use focused deterministic replay tests first. Full battle-runtime MBT is
optional and must be serialized with `flock /tmp/dnd-battle-mbt.lock` if run.
Always check for existing `vitest` and `quint_evaluator` processes before MBT.
If dependency links are missing, run `CI=true pnpm install` once and do not
commit `node_modules`.

Every implementation task runs:

- relevant focused deterministic replay test;
- package typecheck for touched package when dependencies are available;
- `pnpm unit-profile-coverage:check --write`;
- `pnpm unit-profile-coverage:check`;
- `git diff --check`;
- reviewer loop convergence, minimum two rounds.

Planning/replenishment tasks run:

- `pnpm unit-profile-coverage:check --write`;
- `pnpm unit-profile-coverage:check`;
- `git diff --check`;
- reviewer loop convergence, minimum two rounds.

## Task 1 Precheck Result

Checked against `master` at `07d8df40` and D task base
`1e8f939c`. This is a historical precheck from before C/E/F/H were retired.
Current ownership is defined by the active D/I/J/K plans plus Execution
Frontiers A/B.

The current-master delta from this task base is limited to
`plans/FIREBALL_COUNTERSPELL_PROMOTION_PLAN.md` and
`plans/COUNTERSPELL_DOMAIN_DESIGN.md`. Those plan updates document a separate
Fireball/Counterspell promotion and domain-design lane. They do not change the
Unit matrix, the C/E/F/H active-lane plans, or this D lane's selected-identity
frontier. In the current `master` matrix, both `fireball` and `counterspell`
are still `not-in-unit-catalog` with no profile disposition claim.

Current supported-profile selected-identity gaps from the current `master`
matrix:

- D-owned initial batch: `barbarian_unarmored_defense`,
  `monk_unarmored_defense`, `wizard_ritual_adept`,
  `sorcerer_innate_sorcery`, `mycelium_step`.
- Historical Loop E: `divine_favor`, `divine_smite`, `ensnaring_strike`,
  `false_life`, `heroism`, `hex`, `hunters_mark`, `longstrider`,
  `searing_smite`, `shillelagh`, `true_strike`.
- Historical Loop F: `dancing_lights`, `faerie_fire`, `feather_fall`,
  `fog_cloud`, `grease`, `jump`, `light`, `produce_flame`, `thunderwave`.
- Historical Loop H: `animal_friendship`, `protection_from_evil_and_good`,
  `eldritch_blast`, `mage_armor`, `sanctuary`, `mass_cure_wounds`,
  `mass_healing_word`, `fighter_tactical_mind`,
  `feat_boon_of_combat_prowess`, `orc_adrenaline_rush`,
  `paladin_extra_attack`, `ranger_extra_attack`.

The historical Loop F strict open rows are now split out of D:
Execution Frontier A owns `faerie_fire`, `fog_cloud`, `grease`, and
`thunderwave`; Execution Frontier B owns `feather_fall`, `jump`, and `light`.

The C-dependent Units remain `unsupported-profile` on `master`:
`wizard_arcane_recovery`, `fighter_fighting_style`, `cleric_divine_order`,
`druid_primal_order`, `rogue_expertise`, `warlock_eldritch_invocations`,
`barbarian_weapon_mastery`, `fighter_weapon_mastery`,
`paladin_weapon_mastery`, `ranger_weapon_mastery`, and
`rogue_weapon_mastery`. Keep Tasks 7-12 blocked until Loop C support is merged
to `master` and refreshed reports prove the support boundary.

Task 1 verification also found that `pnpm unit-profile-coverage:check` now
fails before report generation with `Installed Unit fireball has no profile
disposition claim.` The current `master` matrix still treats `fireball` as
`not-in-unit-catalog`, while `packages/surface/src/surface/unit-catalog.ts`
imports it. Do not treat the current coverage metrics as freshly verified
until that classification gap is fixed or routed to the appropriate admission
lane.

## Task 13 Replenishment Result

Task 13 refreshed the generated coverage artifacts with
`pnpm unit-profile-coverage:check --write`; the checker passed and no generated
coverage artifact changed. The current matrix records 145 installed Units, 94
supported-profile Units, 78 selected-identity MBT Units, and a 68/93 strict
runtime/profile support count in `LEVEL1_FULL_SUPPORT.md`.

The earlier `fireball` hard failure is resolved by the current matrix:
`fireball` is installed with an `unsupported-profile` disposition for the
non-level-1 spell expansion lane. Do not promote Fireball in this D lane; the
Fireball/Counterspell promotion remains a separate plan boundary.

Loop C character-runtime support has landed in the current matrix for the
selected-identity Units that Tasks 7-12 were waiting on:
`wizard_arcane_recovery`, `fighter_fighting_style`, `cleric_divine_order`,
`druid_primal_order`, `rogue_expertise`, `warlock_eldritch_invocations`,
`paladin_weapon_mastery`, `ranger_weapon_mastery`, and
`rogue_weapon_mastery` are `supported-profile` Units without
selected-identity MBT evidence. Tasks 7-12 are therefore unblocked. Keep
`barbarian_weapon_mastery` and `fighter_weapon_mastery` out of the
selected-identity denominator until their all-level profile-subset support is
promoted or the checker explicitly counts subset selected-identity evidence.

Active non-D ownership remains excluded:

- Loop E still owns `shillelagh` and `true_strike`; its `hunters_mark`
  selected-identity task is already done, so Task 14 owns only the remaining
  open-profile-accounting closure.
- Execution Frontier A now owns `faerie_fire`, `fog_cloud`, `grease`, and
  `thunderwave`.
- Execution Frontier B now owns `feather_fall`, `jump`, and `light`.
- Loop H still owns `fighter_tactical_mind`,
  `feat_boon_of_combat_prowess`, `orc_adrenaline_rush`,
  `paladin_extra_attack`, and `ranger_extra_attack`.
- Loop C no-matrix decisions still cover `create_or_destroy_water`,
  `floating_disk`, `goodberry`, `mage_hand`, `mending`, and
  `purify_food_and_drink`.

The appended Task 14 closes the two refreshed strict open-profile-accounting
items not owned by execution frontiers A/B: `hunters_mark` and
`ranger_favored_enemy`. Tasks 15-17 are adjacent profile-expansion or closure
work from the refreshed matrix. Tasks 18-23 integrate existing frontier-decision
artifacts into the generated coverage/reporting lane without re-deciding
already closed rows. Task 24 is the concrete Thaumaturgy Booming Voice follow-up
identified by the existing Thaumaturgy decision. Task 25 is the remaining
no-matrix strict SRD pressure row in this batch that has no existing
frontier-decision artifact and is not assigned to Loop C. No companion/familiar
task was appended; `find_familiar` stays excluded.

## DAG / Queue Order

| # | Task | Status | Depends on | Notes |
| ---: | --- | --- | --- | --- |
| 1 | L1D2-FRONTIER-PRECHECK - Active Lane And Metric Reconciliation | done | none | Historical precheck before Task 13; see the Task 13 replenishment result for current unblocked statuses. |
| 2 | L1D2-BARBARIAN-UNARMORED-DEFENSE - Barbarian Unarmored Defense Selected Identity Replay | done | none | Character Sheet AC formula selected identity. |
| 3 | L1D2-MONK-UNARMORED-DEFENSE - Monk Unarmored Defense Selected Identity Replay | done | none | Distinct Monk AC formula selected identity. |
| 4 | L1D2-WIZARD-RITUAL-ADEPT - Wizard Ritual Adept Selected Identity Replay | done | none | Spellbook ritual invocation selected identity. |
| 5 | L1D2-SORCERER-INNATE-SORCERY - Sorcerer Innate Sorcery Selected Identity Replay | done | none | Supported activation/profile identity. |
| 6 | L1D2-MYCELIUM-STEP - Mycelium Step Selected Identity Replay | done | none | Classic non-SRD mechanics gate identity; keep out of SRD provenance. |
| 7 | L1D2-WIZARD-ARCANE-RECOVERY - Wizard Arcane Recovery Selected Identity Replay | done | none | Short Rest ordinary Spell Slot recovery, Long Rest reset, and Pact Slot non-application selected identity. |
| 8 | L1D2-FIGHTER-FIGHTING-STYLE - Fighter Fighting Style Selected Identity Replay | done | none | Unblocked by Task 13 refreshed matrix evidence. |
| 9 | L1D2-CLERIC-DRUID-ORDER - Cleric And Druid Order Selected Identity Replay | done | none | Unblocked by Task 13 refreshed matrix evidence. |
| 10 | L1D2-ROGUE-EXPERTISE - Rogue Expertise Selected Identity Replay | done | none | Unblocked by Task 13 refreshed matrix evidence. |
| 11 | L1D2-WARLOCK-ELDRITCH-INVOCATIONS - Warlock Eldritch Invocations Selected Identity Replay | done | none | Unblocked by Task 13 refreshed matrix evidence. |
| 12 | L1D2-WEAPON-MASTERY-CONTAINERS - Weapon Mastery Container Selected Identity Replays | done | none | Selected identity evidence landed for supported-profile container Units. |
| 13 | L1D2-REPLENISH-001 - Recursive Frontier Replenishment 001 | done | none | Appended Tasks 14-25 plus `L1D2-REPLENISH-002`; refreshed coverage artifacts were unchanged. |
| 14 | L1D2-HUNTERS-MARK-FAVORED-ENEMY-ACCOUNTING - Hunter's Mark And Ranger Favored Enemy Profile Accounting Closure | done | none | Close the two D-owned strict open-profile-accounting items not owned by execution frontiers A/B. |
| 15 | L1D2-BARDIC-INSPIRATION-SCALING - Bardic Inspiration Die Scaling Support | done | Task 14 or explicit deferral | Bardic Inspiration all-level die scaling is promoted to supported-profile with selected identity evidence. |
| 16 | L1D2-MONK-MARTIAL-ARTS-SCALING - Monk Martial Arts Die Scaling Support | done | Task 14 or explicit deferral | Adjacent profile-expansion task after the strict frontier is D-closed or active-lane-blocked. |
| 17 | L1D2-CHARM-PERSON-CLOSURE - Charm Person Social Boundary Closure | done | Task 14 or explicit deferral | Clarified supported battle subset versus runtime-detached social knowledge closure. |
| 18 | L1D2-DISGUISE-SELF-DECISION-INTEGRATION - Disguise Self Frontier Decision Integration | done | Task 14 or explicit deferral | Consume the existing decision artifact; do not reclassify the row. |
| 19 | L1D2-DRUIDCRAFT-DECISION-INTEGRATION - Druidcraft Frontier Decision Integration | done | Task 14 or explicit deferral | Consume the existing decision artifact; do not reclassify the row. |
| 20 | L1D2-ELEMENTALISM-DECISION-INTEGRATION - Elementalism Frontier Decision Integration | done | Task 14 or explicit deferral | Consume the existing decision artifact; do not reclassify the row. |
| 21 | L1D2-ILLUSORY-SCRIPT-DECISION-INTEGRATION - Illusory Script Frontier Decision Integration | done | Task 14 or explicit deferral | Consume the existing decision artifact; do not reclassify the row. |
| 22 | L1D2-MESSAGE-DECISION-INTEGRATION - Message Frontier Decision Integration | done | Task 14 or explicit deferral | Consume the existing decision artifact; do not reclassify the row. |
| 23 | L1D2-PRESTIDIGITATION-DECISION-INTEGRATION - Prestidigitation Frontier Decision Integration | done | Task 14 or explicit deferral | Consume the existing decision artifact; do not reclassify the row. |
| 24 | L1D2-THAUMATURGY-BOOMING-VOICE - Thaumaturgy Booming Voice Ability Check Support | ready-for-research | Task 14 or explicit deferral | Concrete follow-up from the Thaumaturgy decision artifact. |
| 25 | L1D2-UNSEEN-SERVANT-NO-MATRIX - Unseen Servant No-Matrix Decision | ready-for-research | Task 14 or explicit deferral | Remaining no-matrix strict SRD pressure row without an existing frontier decision artifact. |
| 26 | L1D2-REPLENISH-002 - Recursive Frontier Replenishment 002 | ready-for-research | Tasks 14-25 done or intentionally deferred | Refresh the frontier again and append the next concrete batch. |

## Task Details

### Task 1 - L1D2-FRONTIER-PRECHECK - Active Lane And Metric Reconciliation

Status: `done`

 Reconcile this plan against current master and the then-active C/E/F/H lanes.
 The C/E/F/H integration worktrees are now closed and their standalone plan
 files were removed from master; this D loop is the live recursive frontier
 lane.

Inputs:

- `plans/unit-profile-coverage/UNIT_REPORT.md`
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/unit-matrix.json`
- closed C/E/F/H lane history from the Ralph run artifacts

Outputs:

- update this plan only if master has changed enough to unblock blocked tasks,
  remove duplicate active-lane ownership, or adjust the first replenishment
  instructions;
- no behavior changes and no task worktree edits outside this D integration
  worktree.

Acceptance:

- the report clearly states which active lanes are still running;
- the current supported-profile selected-identity gaps are listed;
- tasks owned by active E/F/H remain out of this D plan until merged;
- C-dependent tasks stay blocked unless their support landed on master.

### Task 2 - L1D2-BARBARIAN-UNARMORED-DEFENSE - Barbarian Unarmored Defense Selected Identity Replay

Status: `done`

Add selected identity evidence for `barbarian_unarmored_defense`, proving the
Character Sheet Armor Class base formula is selected from the authored Unit and
projected without duplicating armor state.

RAW: `.references/srd-5.2.1/Classes/Barbarian.md` Unarmored Defense.

### Task 3 - L1D2-MONK-UNARMORED-DEFENSE - Monk Unarmored Defense Selected Identity Replay

Status: `done`

Add selected identity evidence for `monk_unarmored_defense`, proving the Monk
Armor Class base formula is selected from the authored Unit and remains
distinct from Barbarian's formula.

RAW: `.references/srd-5.2.1/Classes/Monk.md` Unarmored Defense.

### Task 4 - L1D2-WIZARD-RITUAL-ADEPT - Wizard Ritual Adept Selected Identity Replay

Status: `done`

Add selected identity evidence for `wizard_ritual_adept`, proving spellbook
ritual invocation ownership without treating prepared-only spells as eligible.

RAW: `.references/srd-5.2.1/Classes/Wizard.md` Ritual Adept.

### Task 5 - L1D2-SORCERER-INNATE-SORCERY - Sorcerer Innate Sorcery Selected Identity Replay

Status: `done`

Add selected identity evidence for `sorcerer_innate_sorcery`, binding the
authored class feature through the supported activation and spellcasting benefit
runtime profile.

RAW: `.references/srd-5.2.1/Classes/Sorcerer.md` Innate Sorcery.

### Task 6 - L1D2-MYCELIUM-STEP - Mycelium Step Selected Identity Replay

Status: `done`

Add selected identity evidence for `mycelium_step`, the Classic non-SRD
mechanics fixture that is already installed and supported. Keep provenance
separate: do not represent this as an SRD Unit, and do not widen SRD claims.

Source: `plans/unit-profile-coverage/fixtures/classic-non-srd/mycelium_step.json`.

### Task 7 - L1D2-WIZARD-ARCANE-RECOVERY - Wizard Arcane Recovery Selected Identity Replay

Status: `done`

Unblocked by Task 13 refreshed matrix evidence:
`wizard_arcane_recovery` is supported-profile and lacks selected-identity MBT.
Add selected identity evidence for Short Rest Spell Slot recovery and Long Rest
reset through Character Sheet state. Do not apply Arcane Recovery to Pact Magic
slots.

RAW: `.references/srd-5.2.1/Classes/Wizard.md` Arcane Recovery.

### Task 8 - L1D2-FIGHTER-FIGHTING-STYLE - Fighter Fighting Style Selected Identity Replay

Status: `done`

Unblocked by Task 13 refreshed matrix evidence: `fighter_fighting_style` is
supported-profile and lacks selected-identity MBT. Add selected identity
evidence showing selection and Fighter-level replacement while retaining one
selected CharacterBuild feature ref.

RAW: `.references/srd-5.2.1/Classes/Fighter.md` Fighting Style and
`.references/srd-5.2.1/Feats.md` Fighting Style feats.

### Task 9 - L1D2-CLERIC-DRUID-ORDER - Cleric And Druid Order Selected Identity Replay

Status: `done`

Unblocked by Task 13 refreshed matrix evidence: `cleric_divine_order` and
`druid_primal_order` are supported-profile Units and lack selected-identity
MBT. Add selected identity evidence for both authored class feature option
projections without duplicating child state.

RAW: `.references/srd-5.2.1/Classes/Cleric.md` Divine Order and
`.references/srd-5.2.1/Classes/Druid.md` Primal Order.

### Task 10 - L1D2-ROGUE-EXPERTISE - Rogue Expertise Selected Identity Replay

Status: `done`

Unblocked by Task 13 refreshed matrix evidence: `rogue_expertise` is
supported-profile and lacks selected-identity MBT. Add selected identity
evidence proving level-1 and level-6 Expertise selection over owned skills
through the existing CharacterBuild proficiency projection.

RAW: `.references/srd-5.2.1/Classes/Rogue.md` Expertise.

### Task 11 - L1D2-WARLOCK-ELDRITCH-INVOCATIONS - Warlock Eldritch Invocations Selected Identity Replay

Status: `done`

Unblocked by Task 13 refreshed matrix evidence:
`warlock_eldritch_invocations` is supported-profile and lacks selected-identity
MBT. Add selected identity evidence for level-1 selection, later-level gains,
replacement, prerequisite-retention lockout, and duplicate-selection rejection
only to the extent current support owns them.

RAW: `.references/srd-5.2.1/Classes/Warlock.md` Eldritch Invocations.

### Task 12 - L1D2-WEAPON-MASTERY-CONTAINERS - Weapon Mastery Container Selected Identity Replays

Status: `done`

Unblocked by Task 13 refreshed matrix evidence for the supported-profile
container Units `paladin_weapon_mastery`, `ranger_weapon_mastery`, and
`rogue_weapon_mastery`. Add selected identity evidence for those container
choices and Long Rest reselection. Keep `fighter_weapon_mastery` and
`barbarian_weapon_mastery` out of the selected-identity denominator unless this
task first promotes their all-level profile-subset support or the checker
explicitly counts subset selected-identity evidence. Keep each container's
choice count and eligible weapon facts distinct; selected mastery-property
execution remains child Unit owned.

RAW:

- `.references/srd-5.2.1/Classes/Fighter.md` Weapon Mastery
- `.references/srd-5.2.1/Classes/Barbarian.md` Weapon Mastery
- `.references/srd-5.2.1/Classes/Paladin.md` Weapon Mastery
- `.references/srd-5.2.1/Classes/Ranger.md` Weapon Mastery
- `.references/srd-5.2.1/Classes/Rogue.md` Weapon Mastery

### Task 13 - L1D2-REPLENISH-001 - Recursive Frontier Replenishment 001

Status: `done`

Append the next concrete D tasks and a successor replenishment task. This task
must follow the Recursive Replenishment Contract above.

Result:

- `pnpm unit-profile-coverage:check --write` passed with no generated coverage
  artifact changes.
- Tasks 7-12 were unblocked by refreshed supported-profile matrix evidence.
- Tasks 14-25 and successor Task 26 were appended in the task index, DAG table,
  and task details.
- No active sibling-lane ownership was duplicated, and no companion/familiar task was
  added.

Acceptance:

- refreshed coverage artifacts are committed if changed;
- this plan has at least twelve newly appended atomic tasks, or every remaining
  meaningful task if fewer than twelve exist;
- this plan has a final successor replenishment task such as
  `L1D2-REPLENISH-002`;
- the new tasks do not duplicate active sibling-lane ownership;
- no companion/familiar task is added;
- the current task is marked `done` only after the new tasks and successor
  replenishment task are present in the task index, DAG table, and task details.

### Task 14 - L1D2-HUNTERS-MARK-FAVORED-ENEMY-ACCOUNTING - Hunter's Mark And Ranger Favored Enemy Profile Accounting Closure

Status: `done`

Close the refreshed strict open-profile-accounting rows for `hunters_mark` and
`ranger_favored_enemy`. Loop E has already completed selected-identity evidence
for `hunters_mark`; this task owns only the remaining profile-accounting closure
and must not duplicate Hunter's Mark damage-rider state.

Inputs:

- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/UNIT_REPORT.md`
- `plans/unit-profile-coverage/unit-matrix.json`
- `packages/surface/content/ranger_favored_enemy.json`
- `packages/surface/content/hunters_mark.json`

Outputs:

- either promote the current level-1 supported subsets to closed
  supported-profile claims with precise runtime-detached handling for the
  Hunter's Mark finding Advantage, or preserve typed closure reasons that
  remove `hunters_mark` and `ranger_favored_enemy` from
  open-profile-accounting;
- update `plans/unit-profile-coverage/unit-evidence.jsonl` and generated
  reports if evidence or disposition changes.

Primary files:

- `packages/battle-runtime/src/*selected-identity*.mbt.test.ts` only if a
  selected identity replay is needed;
- `packages/battle-runtime/battle-runtime*.qnt` only if promoted behavior
  changes;
- `plans/unit-profile-coverage/unit-evidence.jsonl`;
- generated reports under `plans/unit-profile-coverage/`.

RAW:

- `.references/srd-5.2.1/Classes/Ranger.md` Favored Enemy
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md` Hunter's Mark

Verification:

- focused runtime or MBT replay only if runtime/profile behavior changes;
- `pnpm unit-profile-coverage:check --write`;
- `pnpm unit-profile-coverage:check`;
- `git diff --check`;
- reviewer-loop convergence with RAW, ubiquitous-language, architecture, and
  code-review passes.

### Task 15 - L1D2-BARDIC-INSPIRATION-SCALING - Bardic Inspiration Die Scaling Support

Status: `done`

Promote `bard_bardic_inspiration` beyond its current level-1-only subset by
owning the SRD Bardic Inspiration die-size scaling boundary, or record why that
all-level expansion remains intentionally out of scope.

Inputs:

- `plans/unit-profile-coverage/UNIT_REPORT.md`
- `plans/unit-profile-coverage/unit-matrix.json`
- `packages/surface/content/bard_bardic_inspiration.json`

Outputs:

- battle-runtime profile support for Bardic Inspiration die scaling across Bard
  levels, if promoted;
- selected identity evidence if `bard_bardic_inspiration` becomes
  `supported-profile`;
- generated coverage reports.

Primary files:

- `packages/battle-runtime/src/*selected-identity*.mbt.test.ts`;
- `packages/battle-runtime/src/index.ts` and matching tests if behavior changes;
- `plans/unit-profile-coverage/unit-evidence.jsonl`;
- generated reports under `plans/unit-profile-coverage/`.

RAW: `.references/srd-5.2.1/Classes/Bard.md` Bardic Inspiration.

Verification:

- focused deterministic runtime or MBT test for die scaling if behavior changes;
- `pnpm unit-profile-coverage:check --write`;
- `pnpm unit-profile-coverage:check`;
- `git diff --check`;
- reviewer-loop convergence with RAW, ubiquitous-language, architecture, and
  code-review passes.

### Task 16 - L1D2-MONK-MARTIAL-ARTS-SCALING - Monk Martial Arts Die Scaling Support

Status: `done`

Promote `monk_martial_arts` beyond its current level-1-only subset by owning
the SRD Martial Arts die-size scaling boundary, or record why that all-level
expansion remains intentionally out of scope.

Inputs:

- `plans/unit-profile-coverage/UNIT_REPORT.md`
- `plans/unit-profile-coverage/unit-matrix.json`
- `packages/surface/content/monk_martial_arts.json`

Outputs:

- battle-runtime profile support for Martial Arts die scaling across Monk
  levels, if promoted;
- selected identity evidence if `monk_martial_arts` becomes
  `supported-profile`;
- generated coverage reports.

Primary files:

- `packages/battle-runtime/src/*selected-identity*.mbt.test.ts`;
- `packages/battle-runtime/src/index.ts` and matching tests if behavior changes;
- `plans/unit-profile-coverage/unit-evidence.jsonl`;
- generated reports under `plans/unit-profile-coverage/`.

RAW: `.references/srd-5.2.1/Classes/Monk.md` Martial Arts.

Verification:

- focused deterministic runtime or MBT test for die scaling if behavior changes;
- `pnpm unit-profile-coverage:check --write`;
- `pnpm unit-profile-coverage:check`;
- `git diff --check`;
- reviewer-loop convergence with RAW, ubiquitous-language, architecture, and
  code-review passes.

### Task 17 - L1D2-CHARM-PERSON-CLOSURE - Charm Person Social Boundary Closure

Status: `done`

Clarify `charm_person` as a supported battle subset plus runtime-detached social
knowledge closure, without turning friendly disposition, social interaction, or
post-spell target knowledge into battle-runtime state.

Inputs:

- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/UNIT_REPORT.md`
- `plans/unit-profile-coverage/unit-matrix.json`
- `packages/surface/content/charm_person.json`

Outputs:

- precise profile disposition/evidence for the supported Charmed battle subset
  and the runtime-detached social/knowledge remainder;
- selected identity evidence only if the Unit becomes `supported-profile`;
- generated coverage reports.

Primary files:

- `packages/battle-runtime/src/*selected-identity*.mbt.test.ts` only if selected
  identity evidence is admitted;
- `plans/unit-profile-coverage/unit-evidence.jsonl`;
- generated reports under `plans/unit-profile-coverage/`.

RAW: `.references/srd-5.2.1/Spells/Descriptions-A-D.md` Charm Person.

Verification:

- focused deterministic runtime or MBT test only if runtime behavior changes;
- `pnpm unit-profile-coverage:check --write`;
- `pnpm unit-profile-coverage:check`;
- `git diff --check`;
- reviewer-loop convergence with RAW, ubiquitous-language, architecture, and
  code-review passes.

### Task 18 - L1D2-DISGUISE-SELF-DECISION-INTEGRATION - Disguise Self Frontier Decision Integration

Status: `done`

Integrate the existing Disguise Self frontier decision into generated coverage
surfaces so future replenishment runs preserve the already-closed no-matrix
decision instead of re-opening classification. Do not author/admit a
`disguise_self` UnitRecord and do not add a Unit claim unless a new illusion UI
owner is explicitly created first.

Inputs:

- `plans/unit-profile-coverage/frontier-decisions/disguise_self.md`
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `plans/unit-profile-coverage/unit-matrix.json`

Outputs:

- generated coverage/report text or checker metadata that points the
  `disguise_self` no-matrix row to the existing frontier decision artifact;
- no Surface UnitRecord, Unit claim, profile, or runtime behavior unless a new
  owner boundary is added by a separate future plan.

Primary files:

- `scripts/unit-profile-coverage-check.cjs` if report integration requires
  checker changes;
- `plans/unit-profile-coverage/frontier-decisions/disguise_self.md`;
- generated reports under `plans/unit-profile-coverage/`.

RAW: `.references/srd-5.2.1/Spells/Descriptions-A-D.md` Disguise Self.

Verification:

- `pnpm unit-profile-coverage:check --write`;
- `pnpm unit-profile-coverage:check`;
- `git diff --check`;
- RAW/UBIQUITOUS_LANGUAGE traceability check for the admission or closure
  decision;
- reviewer-loop convergence with RAW, ubiquitous-language, architecture/domain,
  and code-review passes;
- focused tests if runtime behavior is promoted.

### Task 19 - L1D2-DRUIDCRAFT-DECISION-INTEGRATION - Druidcraft Frontier Decision Integration

Status: `done`

Integrate the existing Druidcraft frontier decision into generated coverage
surfaces so future replenishment runs preserve the already-closed no-matrix
decision instead of re-opening classification. Do not author/admit a
`druidcraft` UnitRecord and do not add a Unit claim unless a new
environment/object owner is explicitly created first.

Inputs:

- `plans/unit-profile-coverage/frontier-decisions/druidcraft.md`
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `plans/unit-profile-coverage/unit-matrix.json`

Outputs:

- generated coverage/report text or checker metadata that points the
  `druidcraft` no-matrix row to the existing frontier decision artifact;
- no Surface UnitRecord, Unit claim, profile, or runtime behavior unless a new
  owner boundary is added by a separate future plan.

Primary files:

- `scripts/unit-profile-coverage-check.cjs` if report integration requires
  checker changes;
- `plans/unit-profile-coverage/frontier-decisions/druidcraft.md`;
- generated reports under `plans/unit-profile-coverage/`.

RAW: `.references/srd-5.2.1/Spells/Descriptions-A-D.md` Druidcraft.

Verification:

- `pnpm unit-profile-coverage:check --write`;
- `pnpm unit-profile-coverage:check`;
- `git diff --check`;
- RAW/UBIQUITOUS_LANGUAGE traceability check for the admission or closure
  decision;
- reviewer-loop convergence with RAW, ubiquitous-language, architecture/domain,
  and code-review passes;
- focused tests if runtime behavior is promoted.

### Task 20 - L1D2-ELEMENTALISM-DECISION-INTEGRATION - Elementalism Frontier Decision Integration

Status: `done`

Integrate the existing Elementalism frontier decision into generated coverage
surfaces so future replenishment runs preserve the already-closed no-matrix
decision instead of re-opening classification. Do not author/admit an
`elementalism` UnitRecord and do not add a Unit claim unless a new
environment/object owner is explicitly created first.

Inputs:

- `plans/unit-profile-coverage/frontier-decisions/elementalism.md`
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `plans/unit-profile-coverage/unit-matrix.json`

Outputs:

- generated coverage/report text or checker metadata that points the
  `elementalism` no-matrix row to the existing frontier decision artifact;
- no Surface UnitRecord, Unit claim, profile, or runtime behavior unless a new
  owner boundary is added by a separate future plan.

Primary files:

- `scripts/unit-profile-coverage-check.cjs` if report integration requires
  checker changes;
- `plans/unit-profile-coverage/frontier-decisions/elementalism.md`;
- generated reports under `plans/unit-profile-coverage/`.

RAW: `.references/srd-5.2.1/Spells/Descriptions-E-L.md` Elementalism.

Verification:

- `pnpm unit-profile-coverage:check --write`;
- `pnpm unit-profile-coverage:check`;
- `git diff --check`;
- RAW/UBIQUITOUS_LANGUAGE traceability check for the admission or closure
  decision;
- reviewer-loop convergence with RAW, ubiquitous-language, architecture/domain,
  and code-review passes;
- focused tests if runtime behavior is promoted.

### Task 21 - L1D2-ILLUSORY-SCRIPT-DECISION-INTEGRATION - Illusory Script Frontier Decision Integration

Status: `done`

Integrate the existing Illusory Script frontier decision into generated coverage
surfaces so future replenishment runs preserve the already-closed no-matrix
decision instead of re-opening classification. Do not author/admit an
`illusory_script` UnitRecord and do not add a Unit claim unless a new
document/illusion owner is explicitly created first.

Inputs:

- `plans/unit-profile-coverage/frontier-decisions/illusory_script.md`
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `plans/unit-profile-coverage/unit-matrix.json`

Outputs:

- generated coverage/report text or checker metadata that points the
  `illusory_script` no-matrix row to the existing frontier decision artifact;
- no Surface UnitRecord, Unit claim, profile, or runtime behavior unless a new
  owner boundary is added by a separate future plan.

Primary files:

- `scripts/unit-profile-coverage-check.cjs` if report integration requires
  checker changes;
- `plans/unit-profile-coverage/frontier-decisions/illusory_script.md`;
- generated reports under `plans/unit-profile-coverage/`.

RAW: `.references/srd-5.2.1/Spells/Descriptions-E-L.md` Illusory Script.

Verification:

- `pnpm unit-profile-coverage:check --write`;
- `pnpm unit-profile-coverage:check`;
- `git diff --check`;
- RAW/UBIQUITOUS_LANGUAGE traceability check for the admission or closure
  decision;
- reviewer-loop convergence with RAW, ubiquitous-language, architecture/domain,
  and code-review passes;
- focused tests if runtime behavior is promoted.

### Task 22 - L1D2-MESSAGE-DECISION-INTEGRATION - Message Frontier Decision Integration

Status: `done`

Integrate the existing Message frontier decision into generated coverage
surfaces so future replenishment runs preserve the already-closed no-matrix
decision instead of re-opening classification. Do not author/admit a `message`
UnitRecord and do not add a Unit claim unless a new communication owner is
explicitly created first.

Inputs:

- `plans/unit-profile-coverage/frontier-decisions/message.md`
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `plans/unit-profile-coverage/unit-matrix.json`

Outputs:

- generated coverage/report text or checker metadata that points the `message`
  no-matrix row to the existing frontier decision artifact;
- no Surface UnitRecord, Unit claim, profile, or runtime behavior unless a new
  owner boundary is added by a separate future plan.

Primary files:

- `scripts/unit-profile-coverage-check.cjs` if report integration requires
  checker changes;
- `plans/unit-profile-coverage/frontier-decisions/message.md`;
- generated reports under `plans/unit-profile-coverage/`.

RAW: `.references/srd-5.2.1/Spells/Descriptions-M-P.md` Message.

Verification:

- `pnpm unit-profile-coverage:check --write`;
- `pnpm unit-profile-coverage:check`;
- `git diff --check`;
- RAW/UBIQUITOUS_LANGUAGE traceability check for the admission or closure
  decision;
- reviewer-loop convergence with RAW, ubiquitous-language, architecture/domain,
  and code-review passes;
- focused tests if runtime behavior is promoted.

### Task 23 - L1D2-PRESTIDIGITATION-DECISION-INTEGRATION - Prestidigitation Frontier Decision Integration

Status: `done`

Integrate the existing Prestidigitation frontier decision into generated
coverage surfaces so future replenishment runs preserve the already-closed
no-matrix decision instead of re-opening classification. Do not author/admit a
`prestidigitation` UnitRecord and do not add a Unit claim unless a new
environment/object/presentation owner is explicitly created first.

Inputs:

- `plans/unit-profile-coverage/frontier-decisions/prestidigitation.md`
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `plans/unit-profile-coverage/unit-matrix.json`

Outputs:

- generated coverage/report text or checker metadata that points the
  `prestidigitation` no-matrix row to the existing frontier decision artifact;
- no Surface UnitRecord, Unit claim, profile, or runtime behavior unless a new
  owner boundary is added by a separate future plan.

Primary files:

- `scripts/unit-profile-coverage-check.cjs` if report integration requires
  checker changes;
- `plans/unit-profile-coverage/frontier-decisions/prestidigitation.md`;
- generated reports under `plans/unit-profile-coverage/`.

RAW: `.references/srd-5.2.1/Spells/Descriptions-M-P.md` Prestidigitation.

Verification:

- `pnpm unit-profile-coverage:check --write`;
- `pnpm unit-profile-coverage:check`;
- `git diff --check`;
- RAW/UBIQUITOUS_LANGUAGE traceability check for the admission or closure
  decision;
- reviewer-loop convergence with RAW, ubiquitous-language, architecture/domain,
  and code-review passes;
- focused tests if runtime behavior is promoted.

### Task 24 - L1D2-THAUMATURGY-BOOMING-VOICE - Thaumaturgy Booming Voice Ability Check Support

Status: `ready-for-research`

Implement the concrete Thaumaturgy follow-up identified by the existing
frontier decision: Booming Voice Advantage on Charisma (Intimidation) Ability
Checks. Preserve the decision artifact's runtime-detached closure for the other
minor-wonder effects; do not add generic appearance, flame, door/window, sound,
tremor, or standalone counter state.

Inputs:

- `plans/unit-profile-coverage/frontier-decisions/thaumaturgy.md`
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/unit-matrix.json`
- `plans/unit-profile-coverage/srd-unit-inventory.json`

Outputs:

- SRD-provenance `thaumaturgy` Surface UnitRecord admission if support is
  promoted;
- battle-runtime support for the Booming Voice self effect and caller-supplied
  Charisma (Intimidation) Ability Check or Influence witness;
- executable treatment of the three-active-1-minute-effects cap that does not
  duplicate unowned utility state;
- generated coverage reports and evidence rows.

Primary files:

- `packages/surface/content/thaumaturgy.json`;
- `packages/surface/src/surface/unit-catalog.ts`;
- `packages/battle-runtime/src/*`;
- `packages/battle-runtime/battle-runtime*.qnt`;
- `plans/unit-profile-coverage/unit-evidence.jsonl`;
- generated reports under `plans/unit-profile-coverage/`.

RAW: `.references/srd-5.2.1/Spells/Descriptions-S-Z.md` Thaumaturgy.

Verification:

- `pnpm unit-profile-coverage:check --write`;
- `pnpm unit-profile-coverage:check`;
- `git diff --check`;
- RAW/UBIQUITOUS_LANGUAGE traceability check for Booming Voice, Ability Check,
  Advantage, Spell Invocation, and Spell Effect terms;
- reviewer-loop convergence with RAW, ubiquitous-language, architecture/domain,
  and code-review passes;
- focused deterministic runtime test and package typecheck;
- package-local MBT only if promoted battle-runtime behavior changes require it.

### Task 25 - L1D2-UNSEEN-SERVANT-NO-MATRIX - Unseen Servant No-Matrix Decision

Status: `ready-for-research`

Classify the strict SRD pressure row for `unseen_servant`, which currently has
no Unit matrix row and is not owned by Loop C. Decide whether it should be an
installed Unit with a runtime-detached closure or a promoted profile.

Inputs:

- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `plans/unit-profile-coverage/unit-matrix.json`

Outputs:

- a Unit catalog admission or explicit no-admission/closure decision for
  `unseen_servant`;
- generated coverage reports.

Primary files:

- `packages/surface/content/unseen_servant.json` if admitted;
- `packages/surface/src/surface/unit-catalog.ts` if admitted;
- `plans/unit-profile-coverage/unit-evidence.jsonl`;
- generated reports under `plans/unit-profile-coverage/`.

RAW: `.references/srd-5.2.1/Spells/Descriptions-S-Z.md` Unseen Servant.

Verification:

- `pnpm unit-profile-coverage:check --write`;
- `pnpm unit-profile-coverage:check`;
- `git diff --check`;
- RAW/UBIQUITOUS_LANGUAGE traceability check for the admission or closure
  decision;
- reviewer-loop convergence with RAW, ubiquitous-language, architecture/domain,
  and code-review passes;
- focused tests if runtime behavior is promoted.

### Task 26 - L1D2-REPLENISH-002 - Recursive Frontier Replenishment 002

Status: `ready-for-research`

Append the next concrete D tasks and a successor replenishment task. This task
must follow the Recursive Replenishment Contract above after Tasks 14-25 are
done or intentionally deferred.

Acceptance:

- refreshed coverage artifacts are committed if changed;
- this plan has at least twelve newly appended atomic tasks, or every remaining
  meaningful task if fewer than twelve exist;
- this plan has a final successor replenishment task such as
  `L1D2-REPLENISH-003`;
- the new tasks do not duplicate active sibling-lane ownership;
- no companion/familiar task is added;
- the current task is marked `done` only after the new tasks and successor
  replenishment task are present in the task index, DAG table, and task details.
