# Cleanroom Rust Ralph Lane B - Areas, Lights, Movement, And Protections

Purpose: continue the cleanroom Rust port from QNT plus RAW only. This lane
owns remaining battle active effects, area/light lifecycles, and spell movement
obligations. Do not read production TypeScript runtime or production TypeScript
tests.

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "CR-B-01-CREATURE-TYPE-PROTECTION",
      "status": "ready-for-research",
      "title": "Implement creature type protection and condition prevention"
    },
    {
      "number": 2,
      "id": "CR-B-02-CONDITION-IMMUNITY-THP",
      "status": "ready-for-research",
      "title": "Implement condition immunity and turn-start temporary hit points"
    },
    {
      "number": 3,
      "id": "CR-B-03-LIGHT-EMITTERS",
      "status": "ready-for-research",
      "title": "Implement held, object, and dancing light emitter lifecycles"
    },
    {
      "number": 4,
      "id": "CR-B-04-AREA-HAZARDS",
      "status": "ready-for-research",
      "title": "Implement fog cloud, grease, and sleep area lifecycles"
    },
    {
      "number": 5,
      "id": "CR-B-05-SPELL-MOVEMENT",
      "status": "ready-for-research",
      "title": "Implement feather fall and jump movement spell lifecycles"
    },
    {
      "number": 6,
      "id": "CR-B-99-RECURSIVE-NEXT-TASKS",
      "status": "ready-for-research",
      "title": "Add next cleanroom Rust tasks from remaining area/effect gaps"
    }
  ]
}
-->

## Lane Rules

- Work only inside `experiments/cleanroom-rust-engine/**`.
- Allowed sources are `input/**`, this experiment directory, Rust tooling, and
  the task files in this directory.
- Forbidden sources are production TypeScript runtime files, production
  TypeScript tests, generated JS/checker implementation, and old Ralph task
  worktrees.
- Treat spatial facts, target validity, movement frontiers, and player choices
  as explicit Rust inputs/witnesses.
- Keep claims conservative in `tasks/CLEANROOM_VALIDATION_REPORT.md`: fixture
  or helper coverage is partial unless the full scoped obligation title is
  represented and tested.

## Verification

For every task:

- Read the relevant QNT and RAW files from `input/**`.
- Update `tasks/CLEANROOM_RESEARCH_LOG.md` with the source files read, modeled
  behavior, test evidence, and remaining gaps.
- Run:

```bash
cd experiments/cleanroom-rust-engine/engine
cargo fmt --check
cargo test
cargo clippy --all-targets -- -D warnings
```

## Task 1 - CR-B-01-CREATURE-TYPE-PROTECTION - Implement creature type protection and condition prevention

Status: `ready-for-research`.

Inputs:

- `input/packages/battle-runtime/battle-runtime-creature-type-protection.qnt`
- SRD RAW for Protection from Evil and Good and related creature type/condition
  rules from `input/**`.

Expected output:

- Rust model for creature-type protection, condition prevention, and related
  attack/condition witness facts.
- Tests in `engine/tests/battle_protection_modifiers.rs`.
- Research-log entry and conservative coverage report/queue updates.

## Task 2 - CR-B-02-CONDITION-IMMUNITY-THP - Implement condition immunity and turn-start temporary hit points

Status: `ready-for-research`.

Inputs:

- `input/packages/battle-runtime/battle-runtime-restoration-and-buffs.qnt`
- `input/packages/battle-runtime/battle-runtime-timed-effects.qnt`
- SRD RAW for Heroism, concentration, and Temporary Hit Points from `input/**`.

Expected output:

- Rust model for condition immunity, turn-start Temporary Hit Point refresh,
  and concentration cleanup where source facts are present.
- Tests in `engine/tests/battle_protection_modifiers.rs` or
  `engine/tests/battle_active_effects.rs`.
- Research-log entry and conservative coverage report/queue updates.

## Task 3 - CR-B-03-LIGHT-EMITTERS - Implement held, object, and dancing light emitter lifecycles

Status: `ready-for-research`.

Inputs:

- `input/packages/battle-runtime/battle-runtime-light.qnt`
- SRD RAW for Light, Dancing Lights, and related illumination rules from
  `input/**`.

Expected output:

- Rust light-emitter lifecycle types/functions for held light, object light,
  and dancing-light emitter cases supported by cleanroom inputs.
- Tests in `engine/tests/battle_light_area.rs`.
- Research-log entry and conservative coverage report/queue updates.

## Task 4 - CR-B-04-AREA-HAZARDS - Implement fog cloud, grease, and sleep area lifecycles

Status: `ready-for-research`.

Inputs:

- `input/packages/battle-runtime/battle-runtime-area-trigger-timing.qnt`
- `input/packages/battle-runtime/battle-runtime-sleep-hideous-laughter.qnt`
- SRD RAW for Fog Cloud, Grease, Sleep, and relevant area/timing rules from
  `input/**`.

Expected output:

- Rust area lifecycle model using explicit area and target witness inputs.
- Tests in `engine/tests/battle_light_area.rs` or
  `engine/tests/battle_active_effects.rs`.
- Research-log entry and conservative coverage report/queue updates.

## Task 5 - CR-B-05-SPELL-MOVEMENT - Implement feather fall and jump movement spell lifecycles

Status: `ready-for-research`.

Inputs:

- `input/packages/battle-runtime/battle-runtime-feather-fall.qnt`
- `input/packages/battle-runtime/battle-runtime-jump-movement.qnt`
- `input/packages/battle-runtime/battle-runtime-movement.qnt`
- movement rule-core QNT under `input/packages/shared-algebras/proofs/rule-core/`

Expected output:

- Rust model for Feather Fall mitigation and Jump movement replacement using
  explicit table-owned movement/fall witnesses.
- Tests in `engine/tests/battle_movement.rs`.
- Research-log entry and conservative coverage report/queue updates.

## Task 6 - CR-B-99-RECURSIVE-NEXT-TASKS - Add next cleanroom Rust tasks from remaining area/effect gaps

Status: `ready-for-research`.

Expected output:

- Inspect `tasks/CLEANROOM_VALIDATION_REPORT.md`,
  `tasks/CLEANROOM_NEXT_QUEUE.md`, and the current lane results.
- Add 5-10 new atomic ready-for-research tasks to this plan only if this lane
  is about to run out of useful area/effect/movement work.
- Keep new tasks concise, with explicit input files, expected Rust outputs, and
  verification commands.
