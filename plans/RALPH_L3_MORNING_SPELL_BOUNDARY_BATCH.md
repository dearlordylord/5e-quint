# Ralph Lane: L3 Morning Spell Boundary Closure

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L3MSPELL-01-ANTIMAGIC-REMAINING-BLOCKER-LEDGER",
      "status": "done",
      "title": "Close Antimagic Field remaining blocker ledger"
    },
    {
      "number": 2,
      "id": "L3MSPELL-02-DISPEL-ONGOING-EFFECT-BOUNDARY",
      "status": "ready-for-research",
      "title": "Resolve Dispel Magic ongoing effect boundary"
    },
    {
      "number": 3,
      "id": "L3MSPELL-03-CONTINUAL-FLAME-COMPONENT-BOUNDARY",
      "status": "ready-for-research",
      "title": "Resolve Continual Flame component boundary"
    },
    {
      "number": 4,
      "id": "L3MSPELL-04-CONTINUAL-FLAME-LIGHT-PROJECTION",
      "status": "blocked",
      "title": "Promote Continual Flame light projection if owned by runtime"
    },
    {
      "number": 5,
      "id": "L3MSPELL-05-ENLARGE-REDUCE-OBJECT-LIFECYCLE",
      "status": "ready-for-research",
      "title": "Resolve Enlarge Reduce object lifecycle boundary"
    },
    {
      "number": 6,
      "id": "L3MSPELL-06-LEVITATE-LOOSE-OBJECT-BOUNDARY",
      "status": "ready-for-research",
      "title": "Resolve Levitate loose object boundary"
    },
    {
      "number": 7,
      "id": "L3MSPELL-07-FIREBALL-AREA-OBJECT-CLOSURE",
      "status": "ready-for-research",
      "title": "Resolve Fireball area object closure"
    },
    {
      "number": 8,
      "id": "L3MSPELL-08-SPIKE-GROWTH-SEARCH-CLOSURE",
      "status": "ready-for-research",
      "title": "Resolve Spike Growth hidden hazard discovery closure"
    },
    {
      "number": 9,
      "id": "L3MSPELL-09-FLY-FALLING-SPATIAL-CLOSURE",
      "status": "ready-for-research",
      "title": "Resolve Fly falling and spatial closure"
    },
    {
      "number": 10,
      "id": "L3MSPELL-10-MOONBEAM-SHAPESHIFT-CLOSURE",
      "status": "ready-for-research",
      "title": "Resolve Moonbeam shapeshift trigger closure"
    },
    {
      "number": 11,
      "id": "L3MSPELL-11-SPELL-SELECTED-IDENTITY-AUDIT",
      "status": "ready-for-implementation-after-light-research",
      "title": "Audit selected-identity replay for promoted spells"
    },
    {
      "number": 12,
      "id": "L3MSPELL-12-SPELL-BOUNDARY-CONSOLIDATION",
      "status": "blocked",
      "title": "Consolidate spell boundary evidence"
    }
  ]
}
-->

## Objective

Close remaining Level 1-3 spell-boundary pressure without turning table-only
facts into fake runtime support. This lane is intentionally deep-slice oriented:
each task must either promote one executable tracer bullet through Surface,
QNT, runtime reducer reachability, MBT replay, and coverage ledgers, or record
why the spell is outside the battle reducer boundary.

## Declared Base And Task-Base Check

Declared Base SHA:

```text
9e8ea6e4db35bc2703907697f1c291643bf94e45
```

Before each task, log:

```sh
git rev-parse HEAD
git merge-base --is-ancestor 9e8ea6e4db35bc2703907697f1c291643bf94e45 HEAD
```

If the ancestor check fails, stop and report the branch-base mismatch. Do not
repair branch state by rebasing against `master`.

## DAG / Queue Order

| Order | Task | Status | Depends On | Notes |
|---:|---|---|---|---|
| 1 | L3MSPELL-01-ANTIMAGIC-REMAINING-BLOCKER-LEDGER | ready-for-research | none | Classify remaining Antimagic Field gaps as executable battle support or owner-decision blockers. |
| 2 | L3MSPELL-02-DISPEL-ONGOING-EFFECT-BOUNDARY | ready-for-research | none | Decide whether broader ongoing spell occurrence support is runtime-owned or table-owned. |
| 3 | L3MSPELL-03-CONTINUAL-FLAME-COMPONENT-BOUNDARY | ready-for-research | none | Resolve material component and inventory ownership before any runtime promotion. |
| 4 | L3MSPELL-04-CONTINUAL-FLAME-LIGHT-PROJECTION | blocked | L3MSPELL-03-CONTINUAL-FLAME-COMPONENT-BOUNDARY | Implement only if Task 3 proves a battle-reducer light projection is real. |
| 5 | L3MSPELL-05-ENLARGE-REDUCE-OBJECT-LIFECYCLE | ready-for-research | none | Split creature support from object/table lifecycle support. |
| 6 | L3MSPELL-06-LEVITATE-LOOSE-OBJECT-BOUNDARY | ready-for-research | none | Classify loose-object motion as runtime, object-system, or table narration. |
| 7 | L3MSPELL-07-FIREBALL-AREA-OBJECT-CLOSURE | ready-for-research | none | Do not add object damage unless the reducer has a reachable object boundary. |
| 8 | L3MSPELL-08-SPIKE-GROWTH-SEARCH-CLOSURE | ready-for-research | none | Resolve hidden hazard discovery without duplicating perception/search state. |
| 9 | L3MSPELL-09-FLY-FALLING-SPATIAL-CLOSURE | ready-for-research | none | Separate spell duration/drop behavior from absent spatial/falling engine facts. |
| 10 | L3MSPELL-10-MOONBEAM-SHAPESHIFT-CLOSURE | ready-for-research | none | Resolve shapechanger/shapeshift trigger ownership against current unit/profile facts. |
| 11 | L3MSPELL-11-SPELL-SELECTED-IDENTITY-AUDIT | ready-for-implementation-after-light-research | none | Confirm promoted spell profiles replay selected identity through production reducer paths. |
| 12 | L3MSPELL-12-SPELL-BOUNDARY-CONSOLIDATION | blocked | L3MSPELL-01-ANTIMAGIC-REMAINING-BLOCKER-LEDGER, L3MSPELL-02-DISPEL-ONGOING-EFFECT-BOUNDARY, L3MSPELL-04-CONTINUAL-FLAME-LIGHT-PROJECTION, L3MSPELL-05-ENLARGE-REDUCE-OBJECT-LIFECYCLE, L3MSPELL-06-LEVITATE-LOOSE-OBJECT-BOUNDARY, L3MSPELL-07-FIREBALL-AREA-OBJECT-CLOSURE, L3MSPELL-08-SPIKE-GROWTH-SEARCH-CLOSURE, L3MSPELL-09-FLY-FALLING-SPATIAL-CLOSURE, L3MSPELL-10-MOONBEAM-SHAPESHIFT-CLOSURE, L3MSPELL-11-SPELL-SELECTED-IDENTITY-AUDIT | Regenerate ledgers and record the next spell candidates after real closure. |

## Task Details

### Task 1 - L3MSPELL-01-ANTIMAGIC-REMAINING-BLOCKER-LEDGER

Read Antimagic Field RAW and current support rows, then replace any stale
remaining labels with explicit runtime-owned slices or owner-decision blockers.

### Task 2 - L3MSPELL-02-DISPEL-ONGOING-EFFECT-BOUNDARY

Decide whether broader ongoing spell effect occurrences are represented in the
real battle reducer path. If not, document the missing owner instead of adding a
table-only profile.

### Task 3 - L3MSPELL-03-CONTINUAL-FLAME-COMPONENT-BOUNDARY

Resolve whether component consumption and inventory state are within the current
runtime boundary. Do not duplicate inventory facts.

### Task 4 - L3MSPELL-04-CONTINUAL-FLAME-LIGHT-PROJECTION

Promote a light projection only if Task 3 proves it is a battle-runtime fact.
Required implementation shape is a full promoted unit tracer bullet: Surface
shape, QNT witness or obligation, production reducer reachability, MBT replay,
and coverage ledger update.

### Task 5 - L3MSPELL-05-ENLARGE-REDUCE-OBJECT-LIFECYCLE

Classify object growth, object carried/worn interactions, and creature size
support against the current reducer and object boundaries.

### Task 6 - L3MSPELL-06-LEVITATE-LOOSE-OBJECT-BOUNDARY

Classify loose-object support and avoid adding unreachable object state to the
battle reducer.

### Task 7 - L3MSPELL-07-FIREBALL-AREA-OBJECT-CLOSURE

Audit flammable object and area-effect support. Promote only if object effects
are reachable from the real reducer path.

### Task 8 - L3MSPELL-08-SPIKE-GROWTH-SEARCH-CLOSURE

Resolve hidden terrain discovery and search-state ownership using RAW and
ubiquitous language.

### Task 9 - L3MSPELL-09-FLY-FALLING-SPATIAL-CLOSURE

Resolve whether Fly needs a runtime falling/spatial slice now or an explicit
owner blocker for absent spatial mechanics.

### Task 10 - L3MSPELL-10-MOONBEAM-SHAPESHIFT-CLOSURE

Resolve Moonbeam shapechanger/shapeshift trigger support without dispatching on
authored identity.

### Task 11 - L3MSPELL-11-SPELL-SELECTED-IDENTITY-AUDIT

Audit promoted spell profiles to make sure selected identity flows through the
same production reducer path the app/MCP would reach, and that every MBT replay
is connected to that path rather than a dead test-only projection.

### Task 12 - L3MSPELL-12-SPELL-BOUNDARY-CONSOLIDATION

Regenerate profile ledgers, remove stale plan leftovers made obsolete by this
lane, and record remaining spell pressure.

## Task Rules

- `in reducer = in QNT` remains the guidance for executable battle support.
- Table-only or object-system-only decisions must not claim promoted unit tracer
  bullet status.
- Runtime promotions must be vertical and narrow. Do not start a wide spell
  subsystem refactor from this lane.
- Do not dispatch on PHB+ authored identity. Use parsed shape, typed procedure
  facts, support profiles, and explicit runtime state.
- MBT may run only after code changes are complete and only with the global
  `.ralph/mbt-global.lock`.

## Verification

- RAW/ubiquitous-language check: read the relevant spell passage in
  `.references/srd-5.2.1/Spells/` and check `UBIQUITOUS_LANGUAGE.md` before
  modeling any rule.
- Reviewer-loop convergence: run RAW, ubiquitous-language/domain,
  architecture/connascence, and code-review passes until no reasonable findings
  remain.
- Run `pnpm unit-profile-coverage:check -- --write` and
  `pnpm unit-profile-coverage:check` for profile/evidence changes.
- Run `pnpm rules-kernel-coverage:check -- --write` and
  `pnpm rules-kernel-coverage:check` when rule-core obligation evidence changes.
- Run focused runtime tests and relevant package typechecks when code changes.
- Run battle MBT only for completed battle-runtime behavior changes, one at a
  time, with the global `.ralph/mbt-global.lock`.
