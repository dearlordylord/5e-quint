# Task 58 Dirty Target Inspection: animal_friendship

Task: `L12CEG-DU-002`

Inspection target: `/workspace/typescript/dnd-cleanroom-rust-agent-2026-jun-29`

## Target State Checked

- Target git `HEAD`: `02a1337d5e2be04307d44c63e2596f60c2104301`
- Target worktree state: dirty. `git status --short` reported modified files,
  deleted `cleanroom-input/qnt/battle-runtime/rule-core-spells.mbt.qnt`, and
  untracked scaffold/input files including `cleanroom-input/l12-cleanroom-generation/`.
- Target cleanroom manifest source commit:
  `a2e7550352cf0b288f3cbb691afc4ebc21d7faa8`
- Target `cleanroom-input/MANIFEST.md` SHA-256:
  `2d745f11af030b276a91a7f2c1546e4bebd78178235e29680dbb1ed2e14fc63b`
- Target `target-profile.json` SHA-256:
  `6d4cc6c6a4769962798133d57aff01438fb2b661941f71d1aa8a3333f4b7ecc1`
- Target profile id: `rust`

## Copied L1-2 Artifact Hashes

The latest dirty target contains the required copied L1-2 artifacts, and their
hashes match the source worktree artifacts checked for this task.

| Artifact | SHA-256 |
| --- | --- |
| `cleanroom-input/l12-cleanroom-generation/srd-l12-denominator.json` | `03330b5c49e6343949da7e2914f8762f0f909f60bae659a4e7c8cda83b7469fb` |
| `cleanroom-input/l12-cleanroom-generation/capability-fact-coverage-matrix.json` | `edddd496caf9c55cf824aaf7dbfc62b0ddddfa1de3a3821ac5b4b85ebc9df686` |
| `cleanroom-input/l12-cleanroom-generation/route-proof-inventory.json` | `674478b990c95d05405e30e950832a09037884c91c53b7b5b0af2def67f0254f` |
| `cleanroom-input/l12-cleanroom-generation/srd-row-generic-fact-map.json` | `2b5a1ef6fbac23b8b645d611c5d4ddf79a88cb33859df3ccfe096b220e746aa7` |
| `cleanroom-input/l12-cleanroom-generation/verifier-gate-spec.json` | `c2a793c90cdd101368a5114a7d9ab5e6ea6b9f90038ec69c184f7e91f8e00b1e` |

## Row Accounting Check

All Task 58 rows map to Unit `animal_friendship` in the source L1-2 accounting
artifacts. In `srd-l12-denominator.json` each row has
`cleanroomDisposition: "executable"`. In `capability-fact-coverage-matrix.json`
and `srd-row-generic-fact-map.json`, each row has profile
`spell.creature-type-protection-and-charm`.

- `srd521:classes/bard:spell-level-1:spell-unit-pressure:bard_spell_list_animal_friendship`
- `srd521:classes/druid:spell-level-1:spell-unit-pressure:druid_spell_list_animal_friendship`
- `srd521:classes/ranger:spell-level-1:spell-unit-pressure:ranger_spell_list_animal_friendship`

## Harness Check

Command run from the source worktree:

```sh
node scripts/check-cleanroom-harness.cjs --task-root /workspace/typescript/dnd-cleanroom-rust-agent-2026-jun-29
```

Result: failed.

Failure output:

```text
cleanroom harness acceptance FAILED:
  - tasks/RUN_LEDGER.json is missing.
  - tasks/START_GATE.json is missing.
  - tasks/ENGINE_DEPTH_MANIFEST.json is missing.
  - tasks/STATE_OWNER_MANIFEST.json is missing.
  - tasks/REVIEW_LOOP.json is missing.
  - tasks/DECIDER_DECISION.json is missing.
```

The target has scaffold example files such as `tasks/RUN_LEDGER.example.json`
and `tasks/TARGET_REPLAY_EVIDENCE.example.json`, but no concrete Task 58
hash-bound cleanroom run reference or compact receipt that passes
`pnpm cleanroom-harness:check`.

## Source Validation

Command run from the source worktree:

```sh
pnpm check:l12-cleanroom-generation:strict && pnpm cleanroom-scaffold:check && pnpm cleanroom-harness:check && pnpm unit-profile-coverage:check && git diff --check
```

Result: passed.

Validation output summary:

- `l12 cleanroom generation gate passed in strict acceptance mode.`
- `cleanroom scaffold renderer self-test OK.`
- `cleanroom harness self-test OK.`
- `Unit profile coverage OK: 393 Units, 257 profiles.`
- `git diff --check` produced no whitespace errors.

## RAW And Domain Check

Read for this inspection:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`, including `Animal Friendship`
- `.references/srd-5.2.1/Classes/Bard.md`
- `.references/srd-5.2.1/Classes/Druid.md`
- `.references/srd-5.2.1/Classes/Ranger.md`
- `.references/srd-5.2.1/Rules-Glossary.md`, including `Charmed` and creature types
- `UBIQUITOUS_LANGUAGE.md`, including `Saving Throw`, `Condition`, and `Charmed`

No runtime, QNT, Surface, or cleanroom target rule behavior was changed in this
source worktree.

## Blocker

Task 58 cannot be closed from the latest dirty target because the target lacks
current concrete harness acceptance artifacts and fails
`node scripts/check-cleanroom-harness.cjs --task-root /workspace/typescript/dnd-cleanroom-rust-agent-2026-jun-29`.
Per the task instructions, no older target, scaffold example, prose note, or
diagnostic source check is a substitute for a passing hash-bound cleanroom run
reference or compact receipt.

Plan Impact: update-required

- Affected task `L12CEG-DU-002`: blocked until the latest dirty target produces
  concrete Task 58 run artifacts (`RUN_LEDGER.json`, `START_GATE.json`,
  `ENGINE_DEPTH_MANIFEST.json`, `STATE_OWNER_MANIFEST.json`, `REVIEW_LOOP.json`,
  `DECIDER_DECISION.json`) and a run reference or compact receipt covering the
  listed `animal_friendship` rows.
- Affected task `L12CEG-RP-001`: blocked for source-side closure until
  `L12CEG-DU-002` is done or explicitly accepted as blocked by the decider.
- Required plan edit: mark `L12CEG-DU-002` as blocked on latest dirty target
  harness artifacts; mark `L12CEG-RP-001` as still blocked on this dirty unit
  proof task.
