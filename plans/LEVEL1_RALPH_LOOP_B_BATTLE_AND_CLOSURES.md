# Level 1 Ralph Loop B - Battle Claims And Runtime-Detached Closures

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
