# Level 1 Ralph Loop F - Spatial Witness Selected Identities

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L1F-SPATIAL-PRECHECK",
      "status": "done",
      "title": "Post-C Spatial Witness Identity Reconciliation"
    },
    {
      "number": 2,
      "id": "L1F-DANCING-LIGHTS",
      "status": "done",
      "title": "Dancing Lights Selected Identity Replay"
    },
    {
      "number": 3,
      "id": "L1F-FAERIE-FIRE",
      "status": "done",
      "title": "Faerie Fire Selected Identity Replay"
    },
    {
      "number": 4,
      "id": "L1F-FEATHER-FALL",
      "status": "done",
      "title": "Feather Fall Selected Identity Replay"
    },
    {
      "number": 5,
      "id": "L1F-FOG-CLOUD",
      "status": "done",
      "title": "Fog Cloud Selected Identity Replay"
    },
    {
      "number": 6,
      "id": "L1F-GREASE-CAST",
      "status": "done",
      "title": "Grease Cast Hazard Selected Identity Replay"
    },
    {
      "number": 7,
      "id": "L1F-GREASE-MOVEMENT",
      "status": "ready-for-implementation-after-light-research",
      "title": "Grease Movement And Turn Trigger Selected Identity Replay"
    },
    {
      "number": 8,
      "id": "L1F-JUMP",
      "status": "ready-for-implementation-after-light-research",
      "title": "Jump Selected Identity Replay"
    },
    {
      "number": 9,
      "id": "L1F-LIGHT",
      "status": "ready-for-implementation-after-light-research",
      "title": "Light Selected Identity Replay"
    },
    {
      "number": 10,
      "id": "L1F-PRODUCE-FLAME",
      "status": "ready-for-implementation-after-light-research",
      "title": "Produce Flame Selected Identity Replay"
    },
    {
      "number": 11,
      "id": "L1F-THUNDERWAVE",
      "status": "ready-for-implementation-after-light-research",
      "title": "Thunderwave Selected Identity Replay"
    }
  ]
}
-->

This loop owns selected-identity MBT expansion for table-witness and spatial
projection Units that are already runtime-supported through caller/table facts.
It must not turn table-supplied facts into runtime-owned geometry, pathfinding,
line-of-sight, color rendering, or sound propagation.

Do not edit `plans/ACTIVE_PLAN.md`.

## Authority

- Promoted battle behavior belongs to `@dnd/battle-runtime` and
  `packages/battle-runtime/battle-runtime.qnt`.
- RAW and vocabulary checks must use local SRD 5.2.1 and
  `UBIQUITOUS_LANGUAGE.md`.
- Runtime-detached table adjudication means the table owns facts the runtime
  consumes or facts the runtime never sees. Do not collapse those two cases.
- No companion feature work is in scope.

## Worktree Safety Prefix

Every Ralph prompt for this loop must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`. You are not alone in the codebase:
> do not revert edits made by others, and adapt your implementation around
> existing changes. Do not edit `plans/ACTIVE_PLAN.md`.

## Review Loop

Use implementer, reviewer, handback until `accept`, then decider. Every task
must include review artifacts. Reject changes that replace table witnesses with
runtime-owned map automation unless the SRD and architecture docs explicitly
require that change.

## Owned Surface

Primary write scope:

- new or existing battle-runtime selected-identity test/qnt files for spatial
  and witness profiles;
- `plans/unit-profile-coverage/unit-evidence.jsonl`;
- generated reports under `plans/unit-profile-coverage/`.

Preferred new files:

- `packages/battle-runtime/src/level1-spatial-witness-selected-identity.mbt.test.ts`
- `packages/battle-runtime/battle-runtime-level1-spatial-witness-selected-identity.mbt.qnt`

Avoid Loop D direct damage files and Loop E buff/mark/smite files.

## MBT And Verification Protocol

Use deterministic replay tests first. Full MBT is optional and must be
serialized with `flock /tmp/dnd-battle-mbt.lock` if run. Always check for
existing `vitest` and `quint_evaluator` processes before MBT. If dependency
links are missing, run `CI=true pnpm install` once and keep symlinks out of
commits.

Every task runs:

- relevant focused deterministic replay test;
- `pnpm unit-profile-coverage:check --write`;
- `pnpm unit-profile-coverage:check`;
- `git diff --check`;
- reviewer loop convergence, minimum two rounds.

## Task Details

### Task 1 - L1F-SPATIAL-PRECHECK - Post-C Spatial Witness Identity Reconciliation

Status: `done`

After Loop C lands, reconcile this loop's Unit list against the refreshed strict
report and selected identity frontier. Confirm which spatial/table-witness Units
still lack selected identity MBT and record any moved Units. No behavior changes.

Result: `plans/unit-profile-coverage/L1F_SPATIAL_WITNESS_PRECHECK.md` records
that all planned Loop F Units remain installed `supported-profile` Units with
deterministic admission/projection coverage and missing selected-identity MBT;
no moved Units were found.

### Task 2 - L1F-DANCING-LIGHTS - Dancing Lights Selected Identity Replay

Status: `done`

Add selected identity evidence for `dancing_lights`, proving the authored Unit
binds through movable Dim Light support without runtime-owned map automation.

RAW: `.references/srd-5.2.1/Spells/Descriptions-A-D.md` Dancing Lights.

Result: `packages/battle-runtime/src/level1-spatial-witness-selected-identity.mbt.test.ts`
and
`packages/battle-runtime/battle-runtime-level1-spatial-witness-selected-identity.mbt.qnt`
record the selected-identity replay for Dancing Lights movable Dim Light,
source-owned light identities, Bonus Action repositioning, table-supplied
projection witnesses, sight-obscurement projection, and no runtime-owned map
automation.

### Task 3 - L1F-FAERIE-FIRE - Faerie Fire Selected Identity Replay

Status: `done`

Add selected identity evidence for `faerie_fire`, covering save-gated outline,
attack-roll Advantage, Invisible benefit denial, and Dim Light emitter projection
within the existing table-witness boundary.

RAW: `.references/srd-5.2.1/Spells/Descriptions-E-L.md` Faerie Fire.

Result: `packages/battle-runtime/src/level1-spatial-witness-selected-identity.mbt.test.ts`
and
`packages/battle-runtime/battle-runtime-level1-spatial-witness-selected-identity.mbt.qnt`
record the selected-identity replay for Faerie Fire save-gated creature outline,
object outline, attack-roll Advantage against visible outlined creatures and
objects, Invisible benefit denial, Dim Light emitter projection, and
table-supplied projection witnesses without runtime-owned map automation.

### Task 4 - L1F-FEATHER-FALL - Feather Fall Selected Identity Replay

Status: `done`

Add selected identity evidence for `feather_fall`, covering the caller-supplied
falling Reaction trigger, mitigation effect, and landing cleanup. Do not add
runtime-owned elevation or fall-distance derivation.

RAW: `.references/srd-5.2.1/Spells/Descriptions-E-L.md` Feather Fall.

### Task 5 - L1F-FOG-CLOUD - Fog Cloud Selected Identity Replay

Status: `done`

Add selected identity evidence for `fog_cloud`, proving the supported
caller-supplied fog area identity, Heavily Obscured projection, duration, and
strong-wind cleanup.

RAW: `.references/srd-5.2.1/Spells/Descriptions-E-L.md` Fog Cloud.

Result: `packages/battle-runtime/src/level1-spatial-witness-selected-identity.mbt.test.ts`
and
`packages/battle-runtime/battle-runtime-level1-spatial-witness-selected-identity.mbt.qnt`
record the selected-identity replay for Fog Cloud caller-supplied area identity,
level-one 20-foot-radius Heavily Obscured projection, one-hour Concentration
duration, level-one Spell Slot spend, and strong-wind cleanup without
runtime-owned area membership, line-of-sight, or map automation.

### Task 6 - L1F-GREASE-CAST - Grease Cast Hazard Selected Identity Replay

Status: `done`

Add selected identity evidence for `grease` cast-time ground hazard creation and
on-cast saving throw outcomes over caller-supplied affected targets.

RAW: `.references/srd-5.2.1/Spells/Descriptions-E-L.md` Grease.

Result: `packages/battle-runtime/src/level1-spatial-witness-selected-identity.mbt.test.ts`
and
`packages/battle-runtime/battle-runtime-level1-spatial-witness-selected-identity.mbt.qnt`
record the selected-identity replay for Grease caller-supplied ground-area
identity, one-minute ground-hazard duration, level-one Spell Slot spend, Magic
Action spend, cast-time affected-target saving throw membership, failed-save
Prone application, successful-save non-Prone outcome, and mismatched
affected-target rejection. Task 7 remains the executable owner for Grease
movement cost, enter-area, and end-turn trigger replay.

### Task 7 - L1F-GREASE-MOVEMENT - Grease Movement And Turn Trigger Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity replay coverage for `grease` movement cost, enter-area,
and end-turn trigger support. Use the same `selected-identity-mbt` evidence row
as Task 6 if both tasks share one owner file; do not create duplicate evidence
rows for the same owner path.

RAW: `.references/srd-5.2.1/Spells/Descriptions-E-L.md` Grease.

### Task 8 - L1F-JUMP - Jump Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `jump`, proving the supported target effect,
once-per-turn use marker, 10-foot Movement spend, and caller-supplied landing
facts without runtime-owned pathfinding.

RAW: `.references/srd-5.2.1/Spells/Descriptions-E-L.md` Jump.

### Task 9 - L1F-LIGHT - Light Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `light`, proving object admission, emitter
projection, recast replacement, duration cleanup, and opaque-cover witness use.

RAW: `.references/srd-5.2.1/Spells/Descriptions-E-L.md` Light.

### Task 10 - L1F-PRODUCE-FLAME - Produce Flame Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `produce_flame`, covering held-light emitter
projection and hurl cleanup within existing runtime support.

RAW: `.references/srd-5.2.1/Spells/Descriptions-M-P.md` Produce Flame.

### Task 11 - L1F-THUNDERWAVE - Thunderwave Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `thunderwave`, including damage save,
caller-supplied push dispositions, unsecured object facts, and audible boom
evidence. Do not implement collision/pathfinding or sound propagation.

RAW: `.references/srd-5.2.1/Spells/Descriptions-S-Z.md` Thunderwave.
