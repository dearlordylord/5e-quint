# Cleanroom Rust Ralph Lane A - Battle Attacks And Riders

Purpose: continue the cleanroom Rust port from QNT plus RAW only. This lane
owns attack-sequence and weapon/rider obligations. Do not read production
TypeScript runtime or production TypeScript tests.

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "CR-A-01-INDEPENDENT-ATTACK-SEQUENCE",
      "status": "ready-for-research",
      "title": "Implement independent spell attack sequence"
    },
    {
      "number": 2,
      "id": "CR-A-02-CHAINED-ATTACK-SEQUENCE",
      "status": "ready-for-research",
      "title": "Implement chained spell attack sequence"
    },
    {
      "number": 3,
      "id": "CR-A-03-WEAPON-HOSTED-ATTACK-RIDERS",
      "status": "ready-for-research",
      "title": "Implement weapon-hosted attack and rider projections"
    },
    {
      "number": 4,
      "id": "CR-A-04-MARKED-DAMAGE-RIDER",
      "status": "ready-for-research",
      "title": "Implement marked damage rider transfer"
    },
    {
      "number": 5,
      "id": "CR-A-05-DEEPEN-AFTER-HIT-RIDERS",
      "status": "ready-for-research",
      "title": "Deepen after-hit damage rider coverage beyond Divine Smite"
    },
    {
      "number": 6,
      "id": "CR-A-99-RECURSIVE-NEXT-TASKS",
      "status": "ready-for-research",
      "title": "Add next cleanroom Rust tasks from remaining attack/rider gaps"
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
- Treat table-owned facts as explicit Rust inputs/witnesses.
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

## Task 1 - CR-A-01-INDEPENDENT-ATTACK-SEQUENCE - Implement independent spell attack sequence

Status: `ready-for-research`.

Inputs:

- `input/packages/battle-runtime/battle-runtime-spell-attack.qnt`
- `input/packages/battle-runtime/battle-runtime-spell-invocation.qnt`
- `input/packages/shared-algebras/proofs/rule-core/spell-independent-attack-sequence-core.qnt`
- relevant SRD spell and attack-roll RAW under `input/.references/srd-5.2.1/`

Expected output:

- Rust types/functions in `engine/src/battle.rs` for independent repeated spell
  attack admission and per-target attack resolution.
- Tests in `engine/tests/battle_spell_sequences.rs`.
- Research-log entry and conservative coverage report/queue updates.

## Task 2 - CR-A-02-CHAINED-ATTACK-SEQUENCE - Implement chained spell attack sequence

Status: `ready-for-research`.

Inputs:

- `input/packages/battle-runtime/battle-runtime-chained-spell-attack.qnt`
- `input/packages/battle-runtime/battle-runtime-spell-attack.qnt`
- `input/packages/battle-runtime/battle-runtime-spell-invocation.qnt`
- `input/packages/shared-algebras/proofs/rule-core/spell-chained-attack-damage-projection-core.qnt`

Expected output:

- Rust representation for chained attack continuation, stop conditions, and
  per-link damage projection.
- Extensions to `engine/tests/battle_spell_sequences.rs`.
- Research-log entry and conservative coverage report/queue updates.

## Task 3 - CR-A-03-WEAPON-HOSTED-ATTACK-RIDERS - Implement weapon-hosted attack and rider projections

Status: `ready-for-research`.

Inputs:

- `input/packages/battle-runtime/battle-runtime-weapon-hit-spell-riders.qnt`
- `input/packages/battle-runtime/battle-runtime-weapon-attacks.qnt`
- `input/packages/battle-runtime/battle-runtime-light.qnt`
- `input/packages/battle-runtime/battle-runtime-spell-invocation.qnt`

Expected output:

- Rust projection for weapon-hosted spell attack admission and rider
  interaction.
- Tests in `engine/tests/battle_spell_riders.rs` or a focused companion test.
- Research-log entry and conservative coverage report/queue updates.

## Task 4 - CR-A-04-MARKED-DAMAGE-RIDER - Implement marked damage rider transfer

Status: `ready-for-research`.

Inputs:

- `input/packages/battle-runtime/battle-runtime-marked-riders.qnt`
- `input/packages/battle-runtime/battle-runtime-marked-spells.qnt`
- relevant SRD RAW for Hex and Hunter's Mark from `input/**`.

Expected output:

- Rust model for marked-damage rider application and transfer timing using
  explicit table/player-choice witness inputs.
- Tests in `engine/tests/battle_spell_riders.rs`.
- Research-log entry and conservative coverage report/queue updates.

## Task 5 - CR-A-05-DEEPEN-AFTER-HIT-RIDERS - Deepen after-hit damage rider coverage beyond Divine Smite

Status: `ready-for-research`.

Inputs:

- `input/packages/battle-runtime/battle-runtime-weapon-hit-spell-riders.qnt`
- SRD RAW for Ensnaring Strike, Searing Smite, Shining Smite, and related
  concentration/timed-damage rules from `input/**`.

Expected output:

- Additional after-hit rider Rust behavior where the cleanroom inputs provide
  enough source facts.
- Tests covering at least one non-Divine-Smite after-hit branch.
- Clear blocker notes for any missing source contract instead of invented rules.

## Task 6 - CR-A-99-RECURSIVE-NEXT-TASKS - Add next cleanroom Rust tasks from remaining attack/rider gaps

Status: `ready-for-research`.

Expected output:

- Inspect `tasks/CLEANROOM_VALIDATION_REPORT.md`,
  `tasks/CLEANROOM_NEXT_QUEUE.md`, and the current lane results.
- Add 5-10 new atomic ready-for-research tasks to this plan only if this lane
  is about to run out of useful attack/rider work.
- Keep new tasks concise, with explicit input files, expected Rust outputs, and
  verification commands.
