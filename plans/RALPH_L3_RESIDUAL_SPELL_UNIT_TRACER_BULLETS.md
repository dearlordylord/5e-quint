# Ralph Lane: Level 3 Residual Spell And Unit Tracer Bullets

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L3RES-01-RECONCILE-MERGED-CLASS-FEATURE-EVIDENCE",
      "status": "done",
      "title": "Reconcile merged class-feature tracer bullet evidence"
    },
    {
      "number": 2,
      "id": "L3RES-02-DRUID-LANDS-AID-SCALING",
      "status": "ready-for-implementation-after-light-research",
      "title": "Promote Druid Land's Aid level scaling"
    },
    {
      "number": 3,
      "id": "L3RES-03-PALADIN-SACRED-WEAPON-RESIDUAL-AUDIT",
      "status": "done",
      "title": "Audit and close or promote Sacred Weapon residual runtime"
    },
    {
      "number": 4,
      "id": "L3RES-04-ACID-ARROW-RAW-RECONCILIATION",
      "status": "ready-for-implementation-after-light-research",
      "title": "Resolve Acid Arrow RAW corpus contradiction"
    },
    {
      "number": 5,
      "id": "L3RES-05-ACID-ARROW-SURFACE-DAMAGE-SHAPE",
      "status": "blocked",
      "title": "Repair Acid Arrow Surface damage shape"
    },
    {
      "number": 6,
      "id": "L3RES-06-ACID-ARROW-DELAYED-RUNTIME",
      "status": "blocked",
      "title": "Promote Acid Arrow delayed runtime"
    },
    {
      "number": 7,
      "id": "L3RES-07-WILD-SHAPE-RETAINED-STATISTICS-SPLIT",
      "status": "ready-for-implementation-after-light-research",
      "title": "Split Wild Shape retained statistics follow-up"
    },
    {
      "number": 8,
      "id": "L3RES-08-RESIDUAL-LEDGER-CONSOLIDATION",
      "status": "blocked",
      "title": "Consolidate residual level-3 golden evidence"
    }
  ]
}
-->

## Objective

Keep grinding toward the level-3 ultra-golden gate without duplicating the
currently running Metamagic and spell-lifecycle lanes. This lane owns residual
Level 1-3 Unit/profile blockers that are either stale after already-merged
class-feature work or independent enough to promote vertically through Surface,
QNT, runtime, focused tests, and coverage ledgers.

## Declared Base And Task-Base Check

Declared Base SHA for every task in this lane:

```text
32e9414f8063c6ff2f9b08c4dda5fdb2b56b24d4
```

Before starting each task, run and log:

```sh
git rev-parse HEAD
git merge-base --is-ancestor 32e9414f8063c6ff2f9b08c4dda5fdb2b56b24d4 HEAD
```

If the ancestor check fails, stop and report the branch-base mismatch. Do not
repair branch state by rebasing against `master`; the Ralph runner or decider
owns branch repair.

## DAG / Queue Order

| Order | Task | Status | Depends On | Notes |
|---:|---|---|---|---|
| 1 | L3RES-01-RECONCILE-MERGED-CLASS-FEATURE-EVIDENCE - Reconcile merged class-feature tracer bullet evidence | done | none | Evidence-only cleanup for class-feature runtime work already merged. |
| 2 | L3RES-02-DRUID-LANDS-AID-SCALING - Promote Druid Land's Aid level scaling | ready-for-implementation-after-light-research | none | Independent runtime/spec scaling slice after level-3 Land's Aid runtime exists. |
| 3 | L3RES-03-PALADIN-SACRED-WEAPON-RESIDUAL-AUDIT - Audit and close or promote Sacred Weapon residual runtime | done | none | Closed by the merged evidence reconciliation: Sacred Weapon residual runtime evidence is already covered. |
| 4 | L3RES-04-ACID-ARROW-RAW-RECONCILIATION - Resolve Acid Arrow RAW corpus contradiction | ready-for-implementation-after-light-research | none | RAW/ASSUMPTIONS boundary task; must not invent damage semantics. |
| 5 | L3RES-05-ACID-ARROW-SURFACE-DAMAGE-SHAPE - Repair Acid Arrow Surface damage shape | blocked | L3RES-04-ACID-ARROW-RAW-RECONCILIATION | Run only after Task 4 records an executable RAW decision. |
| 6 | L3RES-06-ACID-ARROW-DELAYED-RUNTIME - Promote Acid Arrow delayed runtime | blocked | L3RES-04-ACID-ARROW-RAW-RECONCILIATION, L3RES-05-ACID-ARROW-SURFACE-DAMAGE-SHAPE | Runtime only after RAW and Surface shape are settled. |
| 7 | L3RES-07-WILD-SHAPE-RETAINED-STATISTICS-SPLIT - Split Wild Shape retained statistics follow-up | ready-for-implementation-after-light-research | none | Prefer precise split/closure unless an existing owner makes a small executable slice obvious. |
| 8 | L3RES-08-RESIDUAL-LEDGER-CONSOLIDATION - Consolidate residual level-3 golden evidence | blocked | L3RES-01-RECONCILE-MERGED-CLASS-FEATURE-EVIDENCE, L3RES-02-DRUID-LANDS-AID-SCALING, L3RES-03-PALADIN-SACRED-WEAPON-RESIDUAL-AUDIT, L3RES-04-ACID-ARROW-RAW-RECONCILIATION, L3RES-07-WILD-SHAPE-RETAINED-STATISTICS-SPLIT | Consolidation only after the independent residual slices close. |

## Global Acceptance Criteria

1. Read the relevant SRD 5.2.1 text in `.references/srd-5.2.1/` and
   `UBIQUITOUS_LANGUAGE.md` before modeling any rule.
2. If a Unit/profile is in the battle reducer, the same task must keep the
   promoted tracer bullet intact: Surface/support profile, QNT owner or witness,
   runtime reducer path reachable from production battle reducer code, focused
   runtime tests, MBT where the existing profile uses MBT, and coverage ledgers.
3. If the evidence already exists, update only the ledgers and reports that
   still claim a blocker. Do not rewrite working reducer/QNT code.
4. Do not dispatch on authored ids/names/provenance in production runtime
   behavior. Use typed procedure/profile facts and explicit runtime state.
5. If RAW or local corpus text is contradictory, stop at a precise closure or
   ASSUMPTIONS-ready note. Do not silently choose a mechanic.
6. Do not duplicate Spell Slot, Channel Divinity, Wild Shape, selected-option,
   active-effect, or damage state.

## Concurrent Ralph Constraints

Multiple Ralph lanes may run concurrently. Any MBT command must be globally
locked:

```sh
flock /workspace/typescript/dnd/.ralph/mbt-global.lock -c 'START=$(date +%s); <cmd> 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"'
```

Inside the lock, still run the AGENTS precheck for `vitest` and
`quint_evaluator`.

## Verification

Every task must run:

```sh
git diff --check
pnpm unit-profile-coverage:check
pnpm rules-kernel-coverage:check
pnpm check:mbt-driver-closure
```

When ledgers or generated coverage artifacts change, run the write/read pair for
both coverage systems:

```sh
pnpm unit-profile-coverage:check -- --write
pnpm unit-profile-coverage:check
pnpm rules-kernel-coverage:check -- --write
pnpm rules-kernel-coverage:check
```

Reducer behavior changes require focused runtime tests and focused QNT/MBT
parity for the promoted profile. Reviewer-loop convergence is required: RAW,
ubiquitous-language/domain, architecture/connascence, and code-review passes
must repeat until no reasonable findings remain.

### Task 1 - L3RES-01-RECONCILE-MERGED-CLASS-FEATURE-EVIDENCE

Status: `done`

Reconcile stale Level 1-3 blocker rows for class-feature runtime work already
merged through the promoted-unit and class-feature lanes.

Scope:

- inspect `cleric_preserve_life`, `druid_lands_aid`,
  `monk_open_hand_technique`, `ranger_hunters_prey`,
  `wizard_potent_cantrip`, and `paladin_sacred_weapon`;
- for each Unit, confirm whether the merged production reducer path, QNT owner,
  focused runtime test, and selected-identity/MBT witness exist;
- update Unit/profile/task ledgers only for behavior that is already truly
  covered and reachable from production reducer code;
- leave any real residual behavior as a precise follow-up with owner and reason.

Expected outputs:

- no reducer or QNT changes unless the audit finds an obviously missing owner
  marker needed for an already-covered path;
- generated coverage artifacts no longer list stale blockers for already-closed
  promoted tracer bullets;
- remaining blockers are specific and not duplicated across old follow-up ids.

### Task 2 - L3RES-02-DRUID-LANDS-AID-SCALING

Status: `ready-for-implementation-after-light-research`

Promote Land's Aid Druid level 10 and 14 damage/healing dice scaling now that
the level-3 runtime owner exists.

Required behavior:

- derive 2d6/3d6/4d6 damage and healing dice from existing Druid level/profile
  facts without duplicating Wild Shape or class level state;
- preserve the existing Magic Action, Wild Shape resource spend, area witness,
  Constitution save, half-damage-on-success, and one healing target behavior;
- reject unsupported or inconsistent scaling fills.

Expected outputs:

- Surface/support-profile projection updated if the current shape cannot express
  the thresholds;
- package-local QNT witness/proof and focused runtime tests for level 3, 10, and
  14 thresholds;
- selected-identity/MBT witness if the existing Land's Aid replay does not cover
  the scaled path;
- coverage ledger updates.

### Task 3 - L3RES-03-PALADIN-SACRED-WEAPON-RESIDUAL-AUDIT

Status: `done`

Closure:

- Task 1 evidence reconciliation confirmed the remaining Sacred Weapon runtime
  row was stale: activation, retained active weapon binding, attack-roll bonus,
  normal-or-Radiant damage choice, light projection, dismissal/not-carried
  cleanup, duration cleanup, QNT ownership, focused tests, and selected-identity
  evidence are already represented in the ledgers.

Audit the merged Sacred Weapon activation/runtime work against the remaining
follow-up row and either close the stale row or promote the missing residual
behavior.

Required behavior:

- confirm activation, active attack-roll bonus, normal-or-Radiant damage choice,
  light emission, dismissal/not-carried cleanup, duration cleanup, and retained
  active weapon binding;
- if all are covered, update evidence ledgers only;
- if one narrow runtime gap remains, implement that single gap with QNT/runtime
  parity and focused tests.

Expected outputs:

- supported-profile claim remains honest;
- no duplicate active weapon binding or light state;
- stale follow-up row removed only when the production reducer path is covered.

### Task 4 - L3RES-04-ACID-ARROW-RAW-RECONCILIATION

Status: `ready-for-implementation-after-light-research`

Resolve the local SRD Acid Arrow damage contradiction without inventing
mechanics.

Required behavior:

- read the local SRD 5.2.1 spell text and any local conversion/reference notes;
- determine whether the contradiction is a local corpus issue, an already
  documented assumption, or still unresolved;
- if unresolved, record a precise blocked disposition and do not model Acid
  Arrow runtime;
- if the repo already contains an owner-approved decision, update the follow-up
  rows so Tasks 5 and 6 become runnable.

Expected outputs:

- either an ASSUMPTIONS-ready note/closure with no runtime behavior, or a
  documented executable RAW decision that unblocks Surface/runtime work;
- no battle reducer logic in this task.

### Task 5 - L3RES-05-ACID-ARROW-SURFACE-DAMAGE-SHAPE

Status: `blocked`

Repair Acid Arrow's Surface damage shape after Task 4 establishes executable RAW
semantics.

Required behavior:

- model hit, miss, delayed end-of-target-next-turn damage, and slot scaling as
  one coherent typed spell procedure shape;
- do not store miss damage as an unrelated fixed approximation;
- add schema/catalog tests and deterministic projection evidence.

Expected outputs:

- Surface content and parser/projection support;
- coverage updates that keep runtime blocked until Task 6 lands.

### Task 6 - L3RES-06-ACID-ARROW-DELAYED-RUNTIME

Status: `blocked`

Promote Acid Arrow runtime after RAW and Surface shape are settled.

Required behavior:

- spend Magic Action and a level-2-or-higher Spell Slot;
- resolve ranged Spell Attack hit/miss;
- apply only approved immediate hit/miss damage;
- store approved delayed Acid damage for the end of the target's next turn;
- apply slot scaling and cleanup without duplicating active-effect state.

Expected outputs:

- package-local QNT witness/proof, focused runtime tests, and focused MBT if the
  profile uses MBT;
- production reducer path reachable through supported spell invocation
  discovery/resolution;
- coverage ledgers updated from unsupported/blocked to precise support.

### Task 7 - L3RES-07-WILD-SHAPE-RETAINED-STATISTICS-SPLIT

Status: `ready-for-implementation-after-light-research`

Split the remaining Wild Shape retained-statistics blocker into executable
owners or precise closures.

Required behavior:

- read RAW for Wild Shape retained/replaced statistics, senses, speech,
  equipment, anatomy, and active-form duration;
- inspect existing shape-shift, character-sheet, character-battle, and battle
  runtime owners before adding any state;
- promote only a narrow executable owner if existing canonical facts make it
  representable without duplication;
- otherwise replace the broad blocker with smaller owner-specific follow-ups or
  closures.

Expected outputs:

- no speculative state fields;
- smaller follow-up rows with owner, reason, and required output;
- if one executable owner is promoted, include QNT/runtime parity and focused
  tests for that owner.

### Task 8 - L3RES-08-RESIDUAL-LEDGER-CONSOLIDATION

Status: `blocked`

Consolidate the residual lane after the independent tasks close.

Required behavior:

- remove stale follow-ups only when covered by production reducer/runtime code
  and QNT/test evidence;
- keep true residuals visible in `LEVEL1_3_FULL_SUPPORT.md`,
  `UNIT_REPORT.md`, and task claims;
- re-run both coverage generators and gates.
