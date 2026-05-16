# Level 1 Ralph Loop B - Battle Claims And Runtime-Detached Closures

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L1B-AT01",
      "status": "done",
      "title": "Hunter's Mark And Favored Enemy Claim Cleanup"
    },
    {
      "number": 2,
      "id": "L1B-AT02",
      "status": "done",
      "title": "Runtime-Detached And Character-Fact Split Claims"
    },
    {
      "number": 3,
      "id": "L1B-AT09",
      "status": "done",
      "title": "Light And Outline Witness Promotion"
    },
    {
      "number": 4,
      "id": "L1B-AT10",
      "status": "ready-for-implementation-after-light-research",
      "title": "Falling And Jump Witness Promotion"
    },
    {
      "number": 5,
      "id": "L1B-AT11",
      "status": "ready-for-implementation-after-light-research",
      "title": "Area Hazard And Obscurement Witness Promotion"
    },
    {
      "number": 6,
      "id": "L1B-AT12",
      "status": "ready-for-implementation-after-light-research",
      "title": "Thunderwave Witness Promotion"
    }
  ]
}
-->

Umbrella source plan: `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

This loop owns the battle-backed Unit claim cleanup, table-supplied runtime
witness promotions, and runtime-detached closure claims. It starts after Loop A
lands `AT-L1-13`.

Separate active lane: selected identity MBT. Master currently includes committed
selected-MBT evidence for Weapon Mastery properties, reaction/interruption Units,
and condition-save/repeat-save Units. This loop should not add or rewrite
`selected-identity-mbt` evidence unless explicitly retasked; its work is claim
and closure accounting for the listed strict level-1 Units.

## Worktree Safety Prefix

Every Ralph prompt for this loop must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`. You are not alone in the codebase:
> do not revert edits made by others, and adapt your implementation around
> existing changes. Do not edit `plans/ACTIVE_PLAN.md`.

## Owned Tasks

| Task | Unit ids | Ownership |
| --- | --- | --- |
| `AT-L1-01` Hunter's Mark / Favored Enemy cleanup | `hunters_mark`, `ranger_favored_enemy` | stale claim cleanup, SRDINV87C refs, deterministic Ranger identity evidence |
| `AT-L1-02` Runtime-detached and character-fact split claims | `alarm`, `comprehend_languages`, `identify`, `silent_image`, `speak_with_animals`, `detect_evil_and_good`, `detect_magic`, `detect_poison_and_disease`, `druid_druidic`, `minor_illusion`, `rogue_thieves_cant`, `charm_person` | explicit unsupported closures, Druidic/Thieves' Cant character-fact split |
| `AT-L1-09` Light/outline witness promotion | `faerie_fire`, `light` | light/outline witness-boundary claim promotion |
| `AT-L1-10` Falling/jump witness promotion | `feather_fall`, `jump` | falling, landing, legal destination, jump witness-boundary claim promotion |
| `AT-L1-11` Area hazard/obscurement witness promotion | `fog_cloud`, `grease` | area, wind, movement-cost witness-boundary claim promotion |
| `AT-L1-12` Thunderwave witness promotion | `thunderwave` | push, object disposition, audible-boom witness-boundary claim promotion |

## Scope

For `AT-L1-01`:

- make `hunters_mark` include Wisdom (Perception or Survival) Advantage to find
  the marked target;
- remove stale Hunter's Mark finding-Advantage deferred mechanics from
  `hunters_mark` and `ranger_favored_enemy`;
- keep `ranger_favored_enemy` subset-supported only for later-level free-cast
  scaling;
- update SRDINV87C task/profile refs and deterministic identity evidence.

For `AT-L1-02`:

- add explicit `unsupported-profile` claims for `alarm`,
  `comprehend_languages`, `identify`, `silent_image`, and `speak_with_animals`;
- use `outside-runtime-presentation-exploration` closure unless the checker
  vocabulary is deliberately renamed in the same branch;
- split `druid_druidic` so Druidic known-language and always-prepared
  Speak with Animals Spell Access are CharacterBuild/Character Creation facts,
  while hidden-message adjudication stays runtime-detached;
- split `rogue_thieves_cant` so Thieves' Cant plus the extra language choice are
  CharacterBuild/Character Creation facts, while communication adjudication stays
  runtime-detached;
- keep `charm_person` battle Charmed behavior supported and close only
  Friendly/social aftermath as runtime-detached.

For `AT-L1-09` through `AT-L1-12`:

- preserve existing profile ids;
- include a per-residual checklist proving every remaining fact is either an
  existing typed table-supplied runtime witness with owner/test evidence or
  runtime-detached table adjudication/presentation;
- promote a Unit to `supported-profile` only when that checklist passes;
- do not add geometry, pathfinding, line-of-sight, object-inventory, sound
  propagation, light propagation, elevation, collision, or final-position
  derivation reducers.

## Primary Files

- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/task-claims.jsonl` when task/profile refs need
  cleanup
- `plans/unit-profile-coverage/profiles.jsonl` when source-boundary wording is
  stale
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `packages/battle-runtime/src/index.test.ts` only if deterministic marker
  evidence is missing

## Coordination Rules

- Own only the Unit ids listed in this file.
- Generated coverage artifacts are Loop A owned. This loop may run
  `pnpm unit-profile-coverage:check --write` for verification, but should not
  commit generated report refreshes unless Loop A explicitly asks for them.
- Preserve existing `selected-identity-mbt` rows in `unit-evidence.jsonl` if this
  loop edits nearby evidence. Do not replace selected-MBT evidence with
  deterministic admission/projection evidence or closure evidence.
- Do not add battle-runtime profiles for runtime-detached rows.
- Do not close `druid_druidic` or `rogue_thieves_cant` as pure
  runtime-detached adjudication.
- Do not run MBT for claim/profile accounting.

## Verification

- Read cited local RAW and `UBIQUITOUS_LANGUAGE.md` before changing
  claim/profile text.
- Run `pnpm unit-profile-coverage:check --write`.
- Run `pnpm unit-profile-coverage:check`.
- Run `pnpm --filter @dnd/battle-runtime test` only if runtime/test marker files
  are touched beyond comments.
- Run `/simplify` to convergence, minimum two rounds.

## DAG / Queue Order

| # | Task | Status | Depends on | Notes |
| ---: | --- | --- | --- | --- |
| 1 | L1B-AT01 - Hunter's Mark And Favored Enemy Claim Cleanup | done | none | Removes stale runtime-behavior residual before Ranger strict closure. |
| 2 | L1B-AT02 - Runtime-Detached And Character-Fact Split Claims | done | none | Closure claims and Druidic/Thieves' Cant split. |
| 3 | L1B-AT09 - Light And Outline Witness Promotion | done | none | Witness checklist before promotion. |
| 4 | L1B-AT10 - Falling And Jump Witness Promotion | ready-for-implementation-after-light-research | none | Witness checklist before promotion. |
| 5 | L1B-AT11 - Area Hazard And Obscurement Witness Promotion | ready-for-implementation-after-light-research | none | Witness checklist before promotion. |
| 6 | L1B-AT12 - Thunderwave Witness Promotion | ready-for-implementation-after-light-research | none | Witness checklist before promotion. |

## Task Details

### Task 1 - L1B-AT01 - Hunter's Mark And Favored Enemy Claim Cleanup

Status: `done`

Implement `AT-L1-01` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Own only `hunters_mark` and `ranger_favored_enemy`.
- Make `hunters_mark` `supported-profile` and include Wisdom (Perception or
  Survival) Advantage to find the marked target.
- Remove stale Hunter's Mark finding-Advantage deferred mechanics from both
  `hunters_mark` and `ranger_favored_enemy`.
- Keep `ranger_favored_enemy` subset-supported only for later-level Favored
  Enemy free-cast count scaling.
- Update SRDINV87C task/profile refs and deterministic
  `ranger_favored_enemy` identity evidence.

Primary files:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/task-claims.jsonl`
- `plans/unit-profile-coverage/profiles.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `packages/battle-runtime/src/index.test.ts` only if deterministic marker
  evidence is missing

Verification:

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `pnpm --filter @dnd/battle-runtime test` only if runtime/test marker files are
  touched beyond comments
- `/simplify` convergence, minimum two rounds

Plan Impact:

- If Ranger still has non-later-level residuals after cleanup, update this plan
  with a concrete follow-up instead of closing it in prose.

### Task 2 - L1B-AT02 - Runtime-Detached And Character-Fact Split Claims

Status: `done`

Implement `AT-L1-02` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Add explicit `unsupported-profile` claims for `alarm`,
  `comprehend_languages`, `identify`, `silent_image`, and
  `speak_with_animals`.
- Use `outside-runtime-presentation-exploration` closure unless the checker
  vocabulary is deliberately renamed in the same branch.
- Align existing installed closure wording if needed.
- Split `druid_druidic`: Druidic known-language and always-prepared
  Speak with Animals Spell Access are CharacterBuild/Character Creation facts;
  hidden-message adjudication is runtime-detached.
- Split `rogue_thieves_cant`: Thieves' Cant plus the extra language choice are
  CharacterBuild/Character Creation facts; communication adjudication is
  runtime-detached.
- Keep `charm_person` subset-supported for battle Charmed behavior and close
  only Friendly/social aftermath as runtime-detached.

Primary files:

- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl` if character-fact evidence is
  missing

Verification:

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `/simplify` convergence, minimum two rounds

Plan Impact:

- Do not close `druid_druidic` or `rogue_thieves_cant` as pure
  runtime-detached adjudication. Add a follow-up if character-fact evidence is
  absent.

### Task 3 - L1B-AT09 - Light And Outline Witness Promotion

Status: `done`

Implement `AT-L1-09` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Own only `faerie_fire` and `light`.
- Preserve existing profile ids.
- Replace deferred spatial/presentation wording with explicit
  table-supplied-runtime-witness support boundary.
- Include a residual checklist proving each remaining fact is either an existing
  typed table-supplied runtime witness with owner/test evidence or
  runtime-detached table adjudication/presentation.
- Promote a Unit to `supported-profile` only when the checklist passes.

Verification:

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `/simplify` convergence, minimum two rounds

Plan Impact:

- If the checklist fails, keep the Unit subset-supported and add a concrete
  follow-up implementation task.

### Task 4 - L1B-AT10 - Falling And Jump Witness Promotion

Status: `ready-for-implementation-after-light-research`

Implement `AT-L1-10` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Own only `feather_fall` and `jump`.
- Preserve existing profile ids.
- Express falling, landing, legal destination, Difficult Terrain landing, and
  jump path facts as table-supplied runtime witnesses where appropriate.
- Include the same residual checklist required by Task 3.
- Do not add elevation, pathfinding, collision, or final-position derivation.

Verification:

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `/simplify` convergence, minimum two rounds

Plan Impact:

- If the checklist fails, keep the Unit subset-supported and add a concrete
  follow-up implementation task.

### Task 5 - L1B-AT11 - Area Hazard And Obscurement Witness Promotion

Status: `ready-for-implementation-after-light-research`

Implement `AT-L1-11` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Own only `fog_cloud` and `grease`.
- Preserve existing profile ids.
- Express area membership, wind, movement-cost, and grid/path facts as
  table-supplied runtime witnesses when consumed by the claim, or
  runtime-detached table adjudication/presentation when no runtime procedure
  consumes them.
- Include the same residual checklist required by Task 3.
- Do not add automatic area membership, wind derivation, line-of-sight, or
  pathfinding.

Verification:

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `/simplify` convergence, minimum two rounds

Plan Impact:

- If the checklist fails, keep the Unit subset-supported and add a concrete
  follow-up implementation task.

### Task 6 - L1B-AT12 - Thunderwave Witness Promotion

Status: `ready-for-implementation-after-light-research`

Implement `AT-L1-12` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Own only `thunderwave`.
- Preserve existing profile id.
- Express push destination/blockage, object disposition, and audible-boom facts
  as table-supplied runtime witnesses when consumed by the claim, or
  runtime-detached table adjudication/presentation when no runtime procedure
  consumes them.
- Include the same residual checklist required by Task 3.
- Do not add push geometry, object inventory simulation, or sound propagation.

Verification:

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `/simplify` convergence, minimum two rounds

Plan Impact:

- If the checklist fails, keep the Unit subset-supported and add a concrete
  follow-up implementation task.
