# Level 1 Execution Frontier A - Spatial Area Closure

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L1XA-PRECHECK",
      "status": "done",
      "title": "Spatial Area Frontier Precheck"
    },
    {
      "number": 2,
      "id": "L1XA-FAERIE-FIRE-CLOSURE",
      "status": "ready-for-research",
      "title": "Faerie Fire Runtime Boundary Closure"
    },
    {
      "number": 3,
      "id": "L1XA-FOG-CLOUD-CLOSURE",
      "status": "ready-for-research",
      "title": "Fog Cloud Runtime Boundary Closure"
    },
    {
      "number": 4,
      "id": "L1XA-GREASE-CLOSURE",
      "status": "ready-for-research",
      "title": "Grease Runtime Boundary Closure"
    },
    {
      "number": 5,
      "id": "L1XA-THUNDERWAVE-CLOSURE",
      "status": "ready-for-research",
      "title": "Thunderwave Runtime Boundary Closure"
    },
    {
      "number": 6,
      "id": "L1XA-STRICT-CLOSURE-AUDIT",
      "status": "ready-for-research",
      "title": "Spatial Area Strict Closure Audit"
    }
  ]
}
-->

This lane owns the strict level-1 open-profile-accounting rows whose remaining
frontier is spatial area, zone, forced-position, or presentation derivation:
`faerie_fire`, `fog_cloud`, `grease`, and `thunderwave`.

The expected outcome is not broad map automation. Each task must either promote
the existing executable profile to a full supported-profile claim because all
remaining mechanics are typed table/presentation witnesses, or preserve an
explicit typed closure that removes the Unit from strict open-profile-accounting.

Do not edit `plans/ACTIVE_PLAN.md`. Companion/familiar behavior is out of
scope. D owns `hunters_mark` and `ranger_favored_enemy`; do not touch those
Units here. Execution Frontier B owns `feather_fall`, `jump`, and `light`.
I/J/K are mining/readiness lanes and must not be used as runtime shortcuts.

## Worktree Safety Prefix

Every Ralph prompt for this loop must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`. You are not alone in the codebase:
> do not revert edits made by others, and adapt your implementation around
> existing changes. Do not edit `plans/ACTIVE_PLAN.md`.

## Review Loop

Use implementer, reviewer, handback until `accept`, then decider. Reviewers
should reject broad geometry/pathfinding/light-rendering implementation, stale
support claims without executable evidence, duplicate state, and changes that
steal D, B, I, J, or K ownership.

## Owned Surface

Primary write scope:

- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/unit-evidence.jsonl` only if evidence must be
  corrected for the assigned Unit;
- generated reports under `plans/unit-profile-coverage/`;
- `packages/battle-runtime/src/level1-spatial-witness-selected-identity.mbt.test.ts`
  only for focused evidence correction, not for broad new behavior;
- `packages/battle-runtime/battle-runtime.qnt` and runtime reducer files only
  if a task proves a missing runtime-owned SRD mechanic from local RAW.

## Verification

Every task runs:

- relevant focused tests if runtime or evidence code changes;
- `pnpm unit-profile-coverage:check --write`;
- `pnpm unit-profile-coverage:check`;
- `git diff --check`;
- reviewer-loop convergence with RAW, ubiquitous-language, architecture, and
  code-review passes.

## Task Table

| Order | Task | Status | Blocks On | Output |
| ---: | --- | --- | --- | --- |
| 1 | L1XA-PRECHECK - Spatial Area Frontier Precheck | done | none | decision artifact listing current claims/evidence and confirming A/B/D/K ownership split |
| 2 | L1XA-FAERIE-FIRE-CLOSURE - Faerie Fire Runtime Boundary Closure | ready-for-research | 1 | `faerie_fire` removed from strict open-profile-accounting or blocked with exact missing runtime mechanic |
| 3 | L1XA-FOG-CLOUD-CLOSURE - Fog Cloud Runtime Boundary Closure | ready-for-research | 1 | `fog_cloud` removed from strict open-profile-accounting or blocked with exact missing runtime mechanic |
| 4 | L1XA-GREASE-CLOSURE - Grease Runtime Boundary Closure | ready-for-research | 1 | `grease` removed from strict open-profile-accounting or blocked with exact missing runtime mechanic |
| 5 | L1XA-THUNDERWAVE-CLOSURE - Thunderwave Runtime Boundary Closure | ready-for-research | 1 | `thunderwave` removed from strict open-profile-accounting or blocked with exact missing runtime mechanic |
| 6 | L1XA-STRICT-CLOSURE-AUDIT - Spatial Area Strict Closure Audit | ready-for-research | 2-5 | generated strict report proves the four A-owned rows are no longer open |

### Task 1 - L1XA-PRECHECK - Spatial Area Frontier Precheck

Status: `done`

Inputs:

- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/UNIT_REPORT.md`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `packages/battle-runtime/src/level1-spatial-witness-selected-identity.mbt.test.ts`

Outputs:

- create `plans/unit-profile-coverage/L1XA_SPATIAL_AREA_FRONTIER_PRECHECK.md`;
- confirm current strict status for `faerie_fire`, `fog_cloud`, `grease`, and
  `thunderwave`;
- confirm D owns only `hunters_mark` and `ranger_favored_enemy` among remaining
  strict open rows, and B owns `feather_fall`, `jump`, and `light`;
- no runtime behavior changes.

Verification: `pnpm unit-profile-coverage:check`, `git diff --check`.

### Task 2 - L1XA-FAERIE-FIRE-CLOSURE - Faerie Fire Runtime Boundary Closure

Status: `ready-for-research`

Inputs:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md` Faerie Fire
- `.references/srd-5.2.1/Playing-the-Game.md` Vision and Light
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `packages/battle-runtime/src/level1-spatial-witness-selected-identity.mbt.test.ts`
- `packages/surface/content/faerie_fire.json`

Outputs:

- close `faerie_fire` by making the runtime-owned outline, save, Invisible
  denial, object outline, attack Advantage, and Dim Light emitter mechanics
  executable/supported while leaving color rendering and automatic
  line-of-sight/map derivation as typed table/presentation witnesses;
- update generated reports so `faerie_fire` leaves strict
  open-profile-accounting;
- if this cannot be closed in one session, add a precise blocker describing the
  missing runtime-owned mechanic and do not broaden the task.

### Task 3 - L1XA-FOG-CLOUD-CLOSURE - Fog Cloud Runtime Boundary Closure

Status: `ready-for-research`

Inputs:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md` Fog Cloud
- `.references/srd-5.2.1/Playing-the-Game.md` Vision and Light
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `packages/battle-runtime/src/level1-spatial-witness-selected-identity.mbt.test.ts`
- `packages/surface/content/fog_cloud.json`

Outputs:

- close `fog_cloud` by making the runtime-owned fog area identity, Concentration
  lifecycle, Heavily Obscured projection, slot radius scaling, duration cleanup,
  and table-supplied strong-wind cleanup executable/supported;
- keep automatic area membership, line of sight, illumination, pathfinding,
  wind derivation, and grid geometry runtime-detached;
- update generated reports so `fog_cloud` leaves strict open-profile-accounting.

### Task 4 - L1XA-GREASE-CLOSURE - Grease Runtime Boundary Closure

Status: `ready-for-research`

Inputs:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md` Grease
- `.references/srd-5.2.1/Rules-Glossary.md` Prone and Difficult Terrain
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `packages/battle-runtime/src/level1-spatial-witness-selected-identity.mbt.test.ts`
- `packages/surface/content/grease.json`

Outputs:

- close `grease` by making the runtime-owned ground hazard lifecycle, on-cast
  save, failed-save Prone application, table-triggered enter/end-turn saves,
  and caller-supplied Difficult Terrain movement cost executable/supported;
- keep automatic area membership, pathfinding, and grid geometry derivation
  runtime-detached;
- update generated reports so `grease` leaves strict open-profile-accounting.

### Task 5 - L1XA-THUNDERWAVE-CLOSURE - Thunderwave Runtime Boundary Closure

Status: `ready-for-research`

Inputs:

- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md` Thunderwave
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `packages/battle-runtime/src/level1-spatial-witness-selected-identity.mbt.test.ts`
- `packages/surface/content/thunderwave.json`

Outputs:

- close `thunderwave` by making the runtime-owned self-origin Cube save,
  Thunder damage, half-on-save, failed-save push consumption from typed
  legal-destination or blocked-push facts, unsecured-object push disposition,
  and 300-foot boom evidence executable/supported;
- keep push geometry, collision/pathfinding, final-position derivation, broad
  object inventory simulation, and sound propagation simulation
  runtime-detached;
- update generated reports so `thunderwave` leaves strict
  open-profile-accounting.

### Task 6 - L1XA-STRICT-CLOSURE-AUDIT - Spatial Area Strict Closure Audit

Status: `ready-for-research`

Inputs:

- generated reports after Tasks 2-5
- `plans/unit-profile-coverage/L1XA_SPATIAL_AREA_FRONTIER_PRECHECK.md`

Outputs:

- create `plans/unit-profile-coverage/L1XA_SPATIAL_AREA_STRICT_CLOSURE_AUDIT.md`;
- prove `faerie_fire`, `fog_cloud`, `grease`, and `thunderwave` are no longer
  strict open-profile-accounting rows;
- if any row remains open, append a small follow-up task proposal with exact
  missing inputs/outputs instead of broadening this lane.

