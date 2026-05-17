# Level 1 Execution Frontier B - Movement And Light Closure

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L1XB-PRECHECK",
      "status": "done",
      "title": "Movement Light Frontier Precheck"
    },
    {
      "number": 2,
      "id": "L1XB-FEATHER-FALL-CLOSURE",
      "status": "done",
      "title": "Feather Fall Runtime Boundary Closure"
    },
    {
      "number": 3,
      "id": "L1XB-JUMP-CLOSURE",
      "status": "done",
      "title": "Jump Runtime Boundary Closure"
    },
    {
      "number": 4,
      "id": "L1XB-LIGHT-CLOSURE",
      "status": "done",
      "title": "Light Runtime Boundary Closure"
    },
    {
      "number": 5,
      "id": "L1XB-STRICT-CLOSURE-AUDIT",
      "status": "done",
      "title": "Movement Light Strict Closure Audit"
    }
  ]
}
-->

This lane owns the strict level-1 open-profile-accounting rows whose remaining
frontier is falling, jump movement, or object light presentation:
`feather_fall`, `jump`, and `light`.

The expected outcome is to close the strict profile accounting gap without
building map/elevation/pathfinding/light-rendering automation. The runtime may
consume typed witness facts; table/presentation derivation remains outside the
runtime boundary.

Do not edit `plans/ACTIVE_PLAN.md`. Companion/familiar behavior is out of
scope. D owns `hunters_mark` and `ranger_favored_enemy`; do not touch those
Units here. Execution Frontier A owns `faerie_fire`, `fog_cloud`, `grease`, and
`thunderwave`.

## Worktree Safety Prefix

Every Ralph prompt for this loop must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`. You are not alone in the codebase:
> do not revert edits made by others, and adapt your implementation around
> existing changes. Do not edit `plans/ACTIVE_PLAN.md`.

## Review Loop

Use implementer, reviewer, handback until `accept`, then decider. Reviewers
should reject broad elevation/pathfinding/light-rendering implementation, stale
support claims without executable evidence, duplicate state, and changes that
steal D, A, I, J, or K ownership.

## Owned Surface

Primary write scope:

- `plans/unit-profile-coverage/unit-claims.jsonl`;
- `plans/unit-profile-coverage/unit-evidence.jsonl` only if evidence must be
  corrected for the assigned Unit;
- generated reports under `plans/unit-profile-coverage/`;
- `packages/battle-runtime/src/feather-fall-reaction-spell.test.ts`;
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
| 1 | L1XB-PRECHECK - Movement Light Frontier Precheck | done | none | decision artifact listing current claims/evidence and confirming A/B/D/K ownership split |
| 2 | L1XB-FEATHER-FALL-CLOSURE - Feather Fall Runtime Boundary Closure | done | 1 | `feather_fall` removed from strict open-profile-accounting or blocked with exact missing runtime mechanic |
| 3 | L1XB-JUMP-CLOSURE - Jump Runtime Boundary Closure | done | 1 | `jump` removed from strict open-profile-accounting or blocked with exact missing runtime mechanic |
| 4 | L1XB-LIGHT-CLOSURE - Light Runtime Boundary Closure | done | 1 | `light` removed from strict open-profile-accounting or blocked with exact missing runtime mechanic |
| 5 | L1XB-STRICT-CLOSURE-AUDIT - Movement Light Strict Closure Audit | done | 2-4 | generated strict report proves the three B-owned rows are no longer open |

### Task 1 - L1XB-PRECHECK - Movement Light Frontier Precheck

Status: `done`

Inputs:

- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/UNIT_REPORT.md`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `packages/battle-runtime/src/feather-fall-reaction-spell.test.ts`
- `packages/battle-runtime/src/level1-spatial-witness-selected-identity.mbt.test.ts`

Outputs:

- create `plans/unit-profile-coverage/L1XB_MOVEMENT_LIGHT_FRONTIER_PRECHECK.md`;
- confirm current strict status for `feather_fall`, `jump`, and `light`;
- confirm D owns only `hunters_mark` and `ranger_favored_enemy` among remaining
  strict open rows, and A owns `faerie_fire`, `fog_cloud`, `grease`, and
  `thunderwave`;
- no runtime behavior changes.

Verification: `pnpm unit-profile-coverage:check`, `git diff --check`.

### Task 2 - L1XB-FEATHER-FALL-CLOSURE - Feather Fall Runtime Boundary Closure

Status: `done`

Inputs:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md` Feather Fall
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `packages/battle-runtime/src/feather-fall-reaction-spell.test.ts`
- `packages/battle-runtime/src/level1-spatial-witness-selected-identity.mbt.test.ts`
- `packages/surface/content/feather_fall.json`

Outputs:

- close `feather_fall` by making the runtime-owned falling Reaction window,
  target admission, Reaction and Spell Slot spend, mitigation effect,
  descent-rate cap projection, landing cleanup, no-fall-damage outcome, and
  Falling-Prone suppression executable/supported;
- keep fall-distance derivation, map elevation, and landing geometry simulation
  runtime-detached;
- update generated reports so `feather_fall` leaves strict
  open-profile-accounting.

### Task 3 - L1XB-JUMP-CLOSURE - Jump Runtime Boundary Closure

Status: `done`

Inputs:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md` Jump
- `.references/srd-5.2.1/Rules-Glossary.md` Jumping, Long Jump, High Jump
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `packages/battle-runtime/src/level1-spatial-witness-selected-identity.mbt.test.ts`
- `packages/surface/content/jump.json`

Outputs:

- close `jump` by making the runtime-owned Bonus Action cast, touched willing
  target admission, slot-scaled target count, one-minute duration, per-target
  once-per-turn use marker, 10-foot Movement spend, up-to-30-foot jump movement
  replacement, legal landing witness, and failed Difficult Terrain landing
  Prone outcome executable/supported;
- keep jump arc, pathfinding, collision, final-position derivation, and
  Difficult Terrain landing check derivation runtime-detached;
- update generated reports so `jump` leaves strict open-profile-accounting.

### Task 4 - L1XB-LIGHT-CLOSURE - Light Runtime Boundary Closure

Status: `done`

Inputs:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md` Light
- `.references/srd-5.2.1/Playing-the-Game.md` Vision and Light
- `.references/srd-5.2.1/Rules-Glossary.md` Bright Light, Dim Light, Lightly Obscured
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `packages/battle-runtime/src/level1-spatial-witness-selected-identity.mbt.test.ts`
- `packages/surface/content/light.json`

Outputs:

- close `light` by making the runtime-owned Magic Action cantrip cast, object
  admission, worn/carried rejection, object-attached Bright/Dim Light emitter,
  duration cleanup, same-caster recast replacement, opaque-cover witness, and
  derived sight-obscurement/Darkvision consequences executable/supported;
- keep colored-light presentation, automatic line-of-sight drawing, and
  automatic map geometry/pathfinding derivation runtime-detached;
- update generated reports so `light` leaves strict open-profile-accounting.

### Task 5 - L1XB-STRICT-CLOSURE-AUDIT - Movement Light Strict Closure Audit

Status: `done`

Inputs:

- generated reports after Tasks 2-4
- `plans/unit-profile-coverage/L1XB_MOVEMENT_LIGHT_FRONTIER_PRECHECK.md`

Outputs:

- create `plans/unit-profile-coverage/L1XB_MOVEMENT_LIGHT_STRICT_CLOSURE_AUDIT.md`;
- prove `feather_fall`, `jump`, and `light` are no longer strict
  open-profile-accounting rows;
- if any row remains open, append a small follow-up task proposal with exact
  missing inputs/outputs instead of broadening this lane.
