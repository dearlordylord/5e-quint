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
      "status": "done",
      "title": "Falling And Jump Witness Promotion"
    },
    {
      "number": 5,
      "id": "L1B-AT11",
      "status": "done",
      "title": "Area Hazard And Obscurement Witness Promotion"
    },
    {
      "number": 6,
      "id": "L1B-AT12",
      "status": "done",
      "title": "Thunderwave Witness Promotion"
    },
    {
      "number": 7,
      "id": "L1B-L1X-02",
      "status": "done",
      "title": "Disguise Self No-Matrix Decision"
    },
    {
      "number": 8,
      "id": "L1B-L1X-03",
      "status": "done",
      "title": "Druidcraft No-Matrix Decision"
    },
    {
      "number": 9,
      "id": "L1B-L1X-04",
      "status": "ready-for-research",
      "title": "Elementalism No-Matrix Decision"
    },
    {
      "number": 10,
      "id": "L1B-L1X-07",
      "status": "ready-for-research",
      "title": "Illusory Script No-Matrix Decision"
    },
    {
      "number": 11,
      "id": "L1B-L1X-10",
      "status": "ready-for-research",
      "title": "Message No-Matrix Decision"
    },
    {
      "number": 12,
      "id": "L1B-L1X-11",
      "status": "ready-for-research",
      "title": "Prestidigitation No-Matrix Decision"
    },
    {
      "number": 13,
      "id": "L1B-L1X-13",
      "status": "ready-for-research",
      "title": "Thaumaturgy Mixed Owner Decision"
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
| `AT-L1X-02`, `AT-L1X-03`, `AT-L1X-04`, `AT-L1X-07`, `AT-L1X-10`, `AT-L1X-11` utility no-matrix decisions | utility/illusion/communication spell pressures | runtime-detached, catalog-only, or future-owner decision artifacts |
| `AT-L1X-13` Thaumaturgy mixed owner decision | `thaumaturgy` pressure | Booming Voice owner decision plus utility closure recommendation |

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
| 4 | L1B-AT10 - Falling And Jump Witness Promotion | done | none | Witness checklist before promotion. |
| 5 | L1B-AT11 - Area Hazard And Obscurement Witness Promotion | done | none | Witness checklist before promotion. |
| 6 | L1B-AT12 - Thunderwave Witness Promotion | done | none | Witness checklist before promotion. |
| 7 | L1B-L1X-02 - Disguise Self No-Matrix Decision | done | none | Decision artifact only; no Unit claim without admitted UnitRecord. |
| 8 | L1B-L1X-03 - Druidcraft No-Matrix Decision | done | none | Decision artifact only; no Unit claim without admitted UnitRecord. |
| 9 | L1B-L1X-04 - Elementalism No-Matrix Decision | done | none | Decision artifact only; no Unit claim without admitted UnitRecord. |
| 10 | L1B-L1X-07 - Illusory Script No-Matrix Decision | ready-for-research | none | Decision artifact only; no Unit claim without admitted UnitRecord. |
| 11 | L1B-L1X-10 - Message No-Matrix Decision | ready-for-research | none | Runtime-detached communication decision; no battle profile. |
| 12 | L1B-L1X-11 - Prestidigitation No-Matrix Decision | ready-for-research | none | Utility/presentation decision artifact. |
| 13 | L1B-L1X-13 - Thaumaturgy Mixed Owner Decision | ready-for-research | none | Decide Booming Voice owner; utility effects likely detached. |

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

### Task 7 - L1B-L1X-02 - Disguise Self No-Matrix Decision

Status: `done`

Research `AT-L1X-02` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Unit pressure id: `disguise_self`.
- Read `.references/srd-5.2.1/Spells/Descriptions-A-D.md` around
  Disguise Self and check `UBIQUITOUS_LANGUAGE.md`.
- Confirm current generated state is missing-authored-record/not-installed and
  outside the strict denominator.
- Write `plans/unit-profile-coverage/frontier-decisions/disguise_self.md`.
- Decide `packageOwner`, `closureKind`, and follow-up implementation atoms if a
  future UI/illusion owner is justified.
- Do not add Unit claims, profiles, evidence, or runtime behavior unless a real
  authored/admitted UnitRecord path is first proposed.

Verification:

- `pnpm unit-profile-coverage:check` if coverage files are edited.

Plan Impact:

- Add follow-up implementation tasks only for durable owner gaps.

### Task 8 - L1B-L1X-03 - Druidcraft No-Matrix Decision

Status: `done`

Research `AT-L1X-03` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Unit pressure id: `druidcraft`.
- Read the local SRD Druidcraft spell text and check domain language.
- Decide whether weather, bloom, harmless sensory effects, and small
  flame-light/snuff effects are runtime-detached utility, catalog-only, or need
  a future environment owner.
- Write `plans/unit-profile-coverage/frontier-decisions/druidcraft.md`.
- Do not add claims/profiles for a missing authored Unit.

Verification:

- `pnpm unit-profile-coverage:check` if coverage files are edited.

Plan Impact:

- Add future-owner tasks only if environment persistence is genuinely needed.

### Task 9 - L1B-L1X-04 - Elementalism No-Matrix Decision

Status: `done`

Research `AT-L1X-04` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Unit pressure id: `elementalism`.
- Read the local SRD Elementalism spell text.
- Decide whether breeze, dust/sand words, embers/smoke, mist/water, and crude
  element shaping are runtime-detached utility, catalog-only, or future
  environment/object owner pressure.
- Write `plans/unit-profile-coverage/frontier-decisions/elementalism.md`.

Verification:

- `pnpm unit-profile-coverage:check` if coverage files are edited.

Plan Impact:

- Produce concrete follow-up atoms only if a real owner is selected.

### Task 10 - L1B-L1X-07 - Illusory Script No-Matrix Decision

Status: `ready-for-research`

Research `AT-L1X-07` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Unit pressure id: `illusory_script`.
- Read local SRD Illusory Script text.
- Decide document/illusion runtime-detached closure vs future document subsystem
  ownership.
- Write `plans/unit-profile-coverage/frontier-decisions/illusory_script.md`.
- Do not create battle-runtime profiles.

Verification:

- `pnpm unit-profile-coverage:check` if coverage files are edited.

Plan Impact:

- Add follow-up only for a concrete document/illusion owner.

### Task 11 - L1B-L1X-10 - Message No-Matrix Decision

Status: `ready-for-research`

Research `AT-L1X-10` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Unit pressure id: `message`.
- Read local SRD Message text.
- Decide runtime-detached communication adjudication for whisper/reply, range,
  barrier, silence, and material blocking.
- Write `plans/unit-profile-coverage/frontier-decisions/message.md`.
- Do not add a battle profile.

Verification:

- `pnpm unit-profile-coverage:check` if coverage files are edited.

Plan Impact:

- Record no follow-up unless a concrete communication subsystem owner is needed.

### Task 12 - L1B-L1X-11 - Prestidigitation No-Matrix Decision

Status: `ready-for-research`

Research `AT-L1X-11` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Unit pressure id: `prestidigitation`.
- Read local SRD Prestidigitation text.
- Decide utility/presentation/object-owner pressure for sensory, fire,
  cleaning, warming, mark, and trinket effects.
- Write `plans/unit-profile-coverage/frontier-decisions/prestidigitation.md`.

Verification:

- `pnpm unit-profile-coverage:check` if coverage files are edited.

Plan Impact:

- Add future-owner tasks only for concrete non-duplicative owner gaps.

### Task 13 - L1B-L1X-13 - Thaumaturgy Mixed Owner Decision

Status: `ready-for-research`

Research `AT-L1X-13` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Unit pressure id: `thaumaturgy`.
- Read local SRD Thaumaturgy text.
- Decide whether Booming Voice Advantage on Charisma (Intimidation) needs a
  battle/runtime Ability Check witness, Character Sheet temporary-effect owner,
  or owner-decision follow-up.
- Close the remaining utility effects only as runtime-detached utility if no
  current package consumes them.
- Write `plans/unit-profile-coverage/frontier-decisions/thaumaturgy.md`.

Verification:

- `pnpm unit-profile-coverage:check` if coverage files are edited.

Plan Impact:

- Add a concrete follow-up if Booming Voice needs runtime support.

### Task 4 - L1B-AT10 - Falling And Jump Witness Promotion

Status: `done`

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

Status: `done`

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

Status: `done`

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
