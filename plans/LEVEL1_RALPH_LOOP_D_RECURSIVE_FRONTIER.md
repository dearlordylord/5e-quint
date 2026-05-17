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
      "status": "ready-for-implementation-after-light-research",
      "title": "Sorcerer Innate Sorcery Selected Identity Replay"
    },
    {
      "number": 6,
      "id": "L1D2-MYCELIUM-STEP",
      "status": "ready-for-implementation-after-light-research",
      "title": "Mycelium Step Selected Identity Replay"
    },
    {
      "number": 7,
      "id": "L1D2-WIZARD-ARCANE-RECOVERY",
      "status": "blocked",
      "title": "Wizard Arcane Recovery Selected Identity Replay"
    },
    {
      "number": 8,
      "id": "L1D2-FIGHTER-FIGHTING-STYLE",
      "status": "blocked",
      "title": "Fighter Fighting Style Selected Identity Replay"
    },
    {
      "number": 9,
      "id": "L1D2-CLERIC-DRUID-ORDER",
      "status": "blocked",
      "title": "Cleric And Druid Order Selected Identity Replay"
    },
    {
      "number": 10,
      "id": "L1D2-ROGUE-EXPERTISE",
      "status": "blocked",
      "title": "Rogue Expertise Selected Identity Replay"
    },
    {
      "number": 11,
      "id": "L1D2-WARLOCK-ELDRITCH-INVOCATIONS",
      "status": "blocked",
      "title": "Warlock Eldritch Invocations Selected Identity Replay"
    },
    {
      "number": 12,
      "id": "L1D2-WEAPON-MASTERY-CONTAINERS",
      "status": "blocked",
      "title": "Weapon Mastery Container Selected Identity Replays"
    },
    {
      "number": 13,
      "id": "L1D2-REPLENISH-001",
      "status": "ready-for-research",
      "title": "Recursive Frontier Replenishment 001"
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
batch. It deliberately does not steal active C/E/F/H work. It starts with
currently safe selected-identity tasks that are supported on `master`, keeps
C-dependent character/container tasks visible but blocked, and ends with a
recursive replenishment task. The replenishment task must add the next concrete
batch before marking itself done, so this lane does not naturally terminate just
because one fixed batch was exhausted.

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
3. Read active C/E/F/H plan files and `.ralph/runs/*/events.tsv` logs if those
   worktrees still exist, but do not edit their task worktrees.
4. Recompute the frontier in this order:
   - strict level-1 open-profile-accounting items not owned by active C;
   - supported-profile Units missing selected-identity MBT evidence and not
     owned by active E/F/H;
   - runtime-detached or table-owned closure gaps if the generated strict view
     has reopened them;
   - next supported-profile expansion or admission tasks only after the strict
     level-1 frontier is closed or blocked on active lane merges.
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

Avoid active Loop E buff/mark/smite spell files, Loop F spatial witness files,
Loop H special/tail files, and active Loop C character-runtime implementation
work unless the replenishment task verifies those lanes are merged and no longer
active.

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
`1e8f939c`. No C/E/F/H integration head is merged into current `master`; live
worktrees still exist for Loop C, Loop E, Loop F, and Loop H, so their ownership
remains active and unmerged.

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
- Active Loop E: `divine_favor`, `divine_smite`, `ensnaring_strike`,
  `false_life`, `heroism`, `hex`, `hunters_mark`, `longstrider`,
  `searing_smite`, `shillelagh`, `true_strike`.
- Active Loop F: `dancing_lights`, `faerie_fire`, `feather_fall`,
  `fog_cloud`, `grease`, `jump`, `light`, `produce_flame`, `thunderwave`.
- Active Loop H: `animal_friendship`, `protection_from_evil_and_good`,
  `eldritch_blast`, `mage_armor`, `sanctuary`, `mass_cure_wounds`,
  `mass_healing_word`, `fighter_tactical_mind`,
  `feat_boon_of_combat_prowess`, `orc_adrenaline_rush`,
  `paladin_extra_attack`, `ranger_extra_attack`.

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

## DAG / Queue Order

| # | Task | Status | Depends on | Notes |
| ---: | --- | --- | --- | --- |
| 1 | L1D2-FRONTIER-PRECHECK - Active Lane And Metric Reconciliation | done | none | No C/E/F/H integration head is merged into `master`; D frontier remains Tasks 2-6 plus C-blocked Tasks 7-12. |
| 2 | L1D2-BARBARIAN-UNARMORED-DEFENSE - Barbarian Unarmored Defense Selected Identity Replay | done | none | Character Sheet AC formula selected identity. |
| 3 | L1D2-MONK-UNARMORED-DEFENSE - Monk Unarmored Defense Selected Identity Replay | done | none | Distinct Monk AC formula selected identity. |
| 4 | L1D2-WIZARD-RITUAL-ADEPT - Wizard Ritual Adept Selected Identity Replay | done | none | Spellbook ritual invocation selected identity. |
| 5 | L1D2-SORCERER-INNATE-SORCERY - Sorcerer Innate Sorcery Selected Identity Replay | ready-for-implementation-after-light-research | none | Supported activation/profile identity. |
| 6 | L1D2-MYCELIUM-STEP - Mycelium Step Selected Identity Replay | ready-for-implementation-after-light-research | none | Classic non-SRD mechanics gate identity; keep out of SRD provenance. |
| 7 | L1D2-WIZARD-ARCANE-RECOVERY - Wizard Arcane Recovery Selected Identity Replay | blocked | Loop C merge evidence | Unblock only after `wizard_arcane_recovery` is supported-profile on master. |
| 8 | L1D2-FIGHTER-FIGHTING-STYLE - Fighter Fighting Style Selected Identity Replay | blocked | Loop C merge evidence | Unblock only after Fighting Style replacement/lifecycle support lands on master. |
| 9 | L1D2-CLERIC-DRUID-ORDER - Cleric And Druid Order Selected Identity Replay | blocked | Loop C merge evidence | Unblock only after Divine/Primal Order support lands on master. |
| 10 | L1D2-ROGUE-EXPERTISE - Rogue Expertise Selected Identity Replay | blocked | Loop C merge evidence | Unblock only after Rogue Expertise support lands on master. |
| 11 | L1D2-WARLOCK-ELDRITCH-INVOCATIONS - Warlock Eldritch Invocations Selected Identity Replay | blocked | Loop C merge evidence | Unblock only after invocation lifecycle support lands on master. |
| 12 | L1D2-WEAPON-MASTERY-CONTAINERS - Weapon Mastery Container Selected Identity Replays | blocked | Loop C merge evidence | Unblock only after mastery container initial-choice and Long Rest reselection support lands on master. |
| 13 | L1D2-REPLENISH-001 - Recursive Frontier Replenishment 001 | ready-for-research | none | Must append the next concrete batch plus `L1D2-REPLENISH-002` before marking done. |

## Task Details

### Task 1 - L1D2-FRONTIER-PRECHECK - Active Lane And Metric Reconciliation

Status: `done`

Reconcile this plan against current master and active C/E/F/H lanes.

Inputs:

- `plans/unit-profile-coverage/UNIT_REPORT.md`
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/unit-matrix.json`
- `plans/LEVEL1_RALPH_LOOP_C_CHARACTER_RUNTIMES.md`
- `plans/LEVEL1_RALPH_LOOP_E_BUFF_MARK_SMITE_SELECTED_IDENTITIES.md`
- `plans/LEVEL1_RALPH_LOOP_F_SPATIAL_WITNESS_SELECTED_IDENTITIES.md`
- `plans/LEVEL1_RALPH_LOOP_H_SPECIAL_AND_TAIL_SELECTED_IDENTITIES.md`

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

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `sorcerer_innate_sorcery`, binding the
authored class feature through the supported activation and spellcasting benefit
runtime profile.

RAW: `.references/srd-5.2.1/Classes/Sorcerer.md` Innate Sorcery.

### Task 6 - L1D2-MYCELIUM-STEP - Mycelium Step Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `mycelium_step`, the Classic non-SRD
mechanics fixture that is already installed and supported. Keep provenance
separate: do not represent this as an SRD Unit, and do not widen SRD claims.

Source: `plans/unit-profile-coverage/fixtures/classic-non-srd/mycelium_step.json`.

### Task 7 - L1D2-WIZARD-ARCANE-RECOVERY - Wizard Arcane Recovery Selected Identity Replay

Status: `blocked`

Blocked until `wizard_arcane_recovery` is supported-profile on master. When
unblocked, add selected identity evidence for Short Rest Spell Slot recovery and
Long Rest reset through Character Sheet state. Do not apply Arcane Recovery to
Pact Magic slots.

RAW: `.references/srd-5.2.1/Classes/Wizard.md` Arcane Recovery.

Blocker Type: dependency.

### Task 8 - L1D2-FIGHTER-FIGHTING-STYLE - Fighter Fighting Style Selected Identity Replay

Status: `blocked`

Blocked until Loop C's Fighting Style replacement/lifecycle support lands on
master. When unblocked, add selected identity evidence for
`fighter_fighting_style`, showing selection and Fighter-level replacement while
retaining one selected CharacterBuild feature ref.

RAW: `.references/srd-5.2.1/Classes/Fighter.md` Fighting Style and
`.references/srd-5.2.1/Feats.md` Fighting Style feats.

Blocker Type: dependency.

### Task 9 - L1D2-CLERIC-DRUID-ORDER - Cleric And Druid Order Selected Identity Replay

Status: `blocked`

Blocked until `cleric_divine_order` and `druid_primal_order` support lands on
master. When unblocked, add selected identity evidence for both authored class
feature option projections without duplicating child state.

RAW: `.references/srd-5.2.1/Classes/Cleric.md` Divine Order and
`.references/srd-5.2.1/Classes/Druid.md` Primal Order.

Blocker Type: dependency.

### Task 10 - L1D2-ROGUE-EXPERTISE - Rogue Expertise Selected Identity Replay

Status: `blocked`

Blocked until Rogue Expertise support lands on master. When unblocked, add
selected identity evidence for `rogue_expertise`, proving level-1 and level-6
Expertise selection over owned skills through the existing CharacterBuild
proficiency projection.

RAW: `.references/srd-5.2.1/Classes/Rogue.md` Expertise.

Blocker Type: dependency.

### Task 11 - L1D2-WARLOCK-ELDRITCH-INVOCATIONS - Warlock Eldritch Invocations Selected Identity Replay

Status: `blocked`

Blocked until Warlock Eldritch Invocation lifecycle support lands on master.
When unblocked, add selected identity evidence for level-1 selection,
later-level gains, replacement, prerequisite-retention lockout, and
duplicate-selection rejection only to the extent master support owns them.

RAW: `.references/srd-5.2.1/Classes/Warlock.md` Eldritch Invocations.

Blocker Type: dependency.

### Task 12 - L1D2-WEAPON-MASTERY-CONTAINERS - Weapon Mastery Container Selected Identity Replays

Status: `blocked`

Blocked until weapon mastery container initial-choice and Long Rest reselection
support lands on master. When unblocked, add selected identity evidence for
`fighter_weapon_mastery`, `barbarian_weapon_mastery`,
`paladin_weapon_mastery`, `ranger_weapon_mastery`, and
`rogue_weapon_mastery`. Keep each container's choice count and eligible weapon
facts distinct; selected mastery-property execution remains child Unit owned.

RAW:

- `.references/srd-5.2.1/Classes/Fighter.md` Weapon Mastery
- `.references/srd-5.2.1/Classes/Barbarian.md` Weapon Mastery
- `.references/srd-5.2.1/Classes/Paladin.md` Weapon Mastery
- `.references/srd-5.2.1/Classes/Ranger.md` Weapon Mastery
- `.references/srd-5.2.1/Classes/Rogue.md` Weapon Mastery

Blocker Type: dependency.

### Task 13 - L1D2-REPLENISH-001 - Recursive Frontier Replenishment 001

Status: `ready-for-research`

Append the next concrete D tasks and a successor replenishment task. This task
must follow the Recursive Replenishment Contract above.

Acceptance:

- refreshed coverage artifacts are committed if changed;
- this plan has at least twelve newly appended atomic tasks, or every remaining
  meaningful task if fewer than twelve exist;
- this plan has a final successor replenishment task such as
  `L1D2-REPLENISH-002`;
- the new tasks do not duplicate active C/E/F/H ownership;
- no companion/familiar task is added;
- the current task is marked `done` only after the new tasks and successor
  replenishment task are present in the task index, DAG table, and task details.
