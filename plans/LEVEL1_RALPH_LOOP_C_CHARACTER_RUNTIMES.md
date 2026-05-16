# Level 1 Ralph Loop C - Character Runtime Support

Umbrella source plan: `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

This loop owns Character Creation and Character Sheet support accounting for the
strict level-1 frontier. It starts after Loop A lands `AT-L1-13`. Internally,
`AT-L1-03S` must land before the Unit-specific Character Creation tasks.

Separate active lane: selected identity MBT. Master currently includes committed
selected-MBT evidence for `mastery_cleave`, `mastery_sap`, and `mastery_topple`.
Those are selected mastery-property Unit identities, not the class Weapon
Mastery container Units owned by `AT-L1-04`.

## Worktree Safety Prefix

Every Ralph prompt for this loop must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`. You are not alone in the codebase:
> do not revert edits made by others, and adapt your implementation around
> existing changes. Do not edit `plans/ACTIVE_PLAN.md`.

## Owned Tasks

| Task | Unit ids | Ownership |
| --- | --- | --- |
| `AT-L1-03S` Character Creation support scaffold | shared scaffold only | shared Character Creation profile ids, owner markers, runtime-test markers, task claims |
| `AT-L1-03` Fighter Fighting Style profile | `fighter_fighting_style` | level-1 Fighting Style choice evidence; all-level lifecycle guard |
| `AT-L1-04` Weapon Mastery character/rest profile | `barbarian_weapon_mastery`, `fighter_weapon_mastery`, `paladin_weapon_mastery`, `ranger_weapon_mastery`, `rogue_weapon_mastery` | initial choice plus Long Rest reselection support |
| `AT-L1-05` Warlock Eldritch Invocations profile | `warlock_eldritch_invocations` | level-1 invocation choice evidence; all-level lifecycle guard |
| `AT-L1-06` Cleric/Druid order profile | `cleric_divine_order`, `druid_primal_order` | Divine/Primal Order option projection |
| `AT-L1-07` Rogue Expertise profile | `rogue_expertise` | level-1 two-skill Expertise choice evidence; level 6 lifecycle guard |
| `AT-L1-08` Wizard Arcane Recovery profile | `wizard_arcane_recovery` | Character Sheet Short Rest Spell Slot recovery profile |

## Internal Order

1. Implement `AT-L1-03S`.
2. Then implement `AT-L1-03`, `AT-L1-05`, `AT-L1-06`, and `AT-L1-07`.
3. Implement `AT-L1-08` at any point after Loop A `AT-L1-13`.
4. Implement `AT-L1-04` after `AT-L1-03S`; include or cite Character Sheet/rest
   support for Long Rest weapon-choice reselection before promoting Weapon
   Mastery containers.

## Scope

For `AT-L1-03S`:

- add or reuse these profile ids:
  - `character-creation.class-feature-feat-choice`
  - `character-creation.weapon-mastery-choice`
  - `character-creation.eldritch-invocation-choice`
  - `character-creation.class-feature-option-projection`
  - `character-creation.skill-expertise-choice`
- add Character Creation runtime/test owner markers if absent;
- add shared completed-runtime-parity task claims;
- do not edit individual Unit claims in the scaffold task.

For Unit-specific Character Creation tasks:

- reuse the scaffold profile ids;
- add deterministic Unit identity evidence;
- convert all-level Unit claims to `supported-profile` only when every RAW
  lifecycle mechanic is owned;
- otherwise keep the all-level claim `profile-subset-supported` and let the
  strict level-1 report close only the level-1 slice.

Lifecycle gates:

- `fighter_fighting_style` needs advancement/replacement ownership before
  all-level support.
- Weapon Mastery containers need initial choice and Long Rest reselection support
  before all-level support.
- The existing selected identity MBT evidence for `mastery_cleave`,
  `mastery_sap`, and `mastery_topple` may be cited as child mastery-property
  execution evidence, but it does not satisfy the container Long Rest
  reselection gate and should not be recreated here.
- `warlock_eldritch_invocations` needs replacement/gain and prerequisite
  retention ownership before all-level support.
- `rogue_expertise` needs the Rogue level 6 additional Expertise grant owned
  before all-level support.

For `AT-L1-08`:

- add `character-sheet.short-rest-spell-slot-recovery`;
- add Character Sheet runtime/test owner markers;
- convert `wizard_arcane_recovery` to `supported-profile`;
- add deterministic identity evidence;
- do not add Pact Slot recovery under Arcane Recovery.

## Primary Files

- `plans/unit-profile-coverage/profiles.jsonl`
- `plans/unit-profile-coverage/task-claims.jsonl`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `packages/character-creation-runtime/src/index.ts`
- `packages/character-creation-runtime/src/index.test.ts`
- `packages/character-sheet-runtime/src/index.ts`
- `packages/character-sheet-runtime/src/index.test.ts`

## Coordination Rules

- Own only the Unit ids listed in this file.
- Generated coverage artifacts are Loop A owned. This loop may run
  `pnpm unit-profile-coverage:check --write` for verification, but should not
  commit generated report refreshes unless Loop A explicitly asks for them.
- Preserve existing `selected-identity-mbt` evidence rows when editing
  `unit-evidence.jsonl`. Do not turn this character-runtime loop into a selected
  identity MBT batch.
- Do not add battle-runtime reducer work.
- Do not duplicate selected-option state already represented in CharacterBuild,
  Character Creation selections, or Character Sheet projection.
- Keep selected feats, mastery Units, invocation options, and sheet projections
  as owners of child executable behavior.

## Verification

- Read cited local RAW and `UBIQUITOUS_LANGUAGE.md` before changing
  claim/profile text.
- Run `pnpm unit-profile-coverage:check --write`.
- Run `pnpm unit-profile-coverage:check`.
- Run `pnpm --filter @dnd/character-creation-runtime test` if Character Creation
  runtime/test marker files are touched beyond comments.
- Run `pnpm --filter @dnd/character-sheet-runtime test` if Character Sheet
  runtime/test marker files are touched beyond comments.
- Run `/simplify` to convergence, minimum two rounds.
- Do not run MBT unless promoted battle behavior unexpectedly changes; selected
  identity MBT work remains in the separate selected-MBT lane.
