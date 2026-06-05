# Ralph Lane: Level 3 Spell Lifecycle Tracer Bullets

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L3SPELL-01-ENHANCE-ABILITY-UPCAST-PER-TARGET",
      "status": "done",
      "title": "Promote Enhance Ability upcast per-target ability choices"
    },
    {
      "number": 2,
      "id": "L3SPELL-02-DARKNESS-OBJECT-ORIGIN-DECISION",
      "status": "done",
      "title": "Promote or close Darkness object-origin branch"
    },
    {
      "number": 3,
      "id": "L3SPELL-03-SPELL-SHAPESHIFT-TRUE-FORM-REVERSION",
      "status": "done",
      "title": "Promote spell-effect shape-shift true-form reversion owner"
    },
    {
      "number": 4,
      "id": "L3SPELL-04-STATBLOCK-SHAPECHANGER-TRUE-FORM-REVERSION",
      "status": "done",
      "title": "Promote or close stat-block shapechanger true-form reversion owner"
    },
    {
      "number": 5,
      "id": "L3SPELL-05-DISPEL-BROADER-ONGOING-EFFECTS",
      "status": "done",
      "title": "Promote broader Dispel Magic ongoing effect ending"
    },
    {
      "number": 6,
      "id": "L3SPELL-06-ANTIMAGIC-PREVENTION-BOUNDARY-SPLIT",
      "status": "ready-for-implementation-after-light-research",
      "title": "Split Antimagic Field prevention and broader suppression owners"
    },
    {
      "number": 7,
      "id": "L3SPELL-07-HYPNOTIC-PATTERN-SURFACE-ESCAPE-REPAIR",
      "status": "ready-for-implementation-after-light-research",
      "title": "Repair Hypnotic Pattern typed escape Surface shape"
    },
    {
      "number": 8,
      "id": "L3SPELL-08-HYPNOTIC-PATTERN-CONTROL-RUNTIME",
      "status": "blocked",
      "title": "Promote Hypnotic Pattern control runtime after Surface repair"
    }
  ]
}
-->

## Objective

Deepen level-3 spell lifecycle gaps that are currently explicit follow-up
splits or broader lifecycle closures. This lane is for spell/runtime lifecycle
work, not level-3 class-feature Units already assigned to other lanes.

## Declared Base And Task-Base Check

Declared Base SHA for every task in this lane:

```text
d05bfd52bf6a5964af9f2a5f88c37d5093256e06
```

Before starting each task, run and log:

```sh
git rev-parse HEAD
git merge-base --is-ancestor d05bfd52bf6a5964af9f2a5f88c37d5093256e06 HEAD
```

If the ancestor check fails, stop and report the branch-base mismatch. Do not
repair branch state by rebasing against `master`; the Ralph runner or decider
owns branch repair.

## DAG / Queue Order

| Order | Task | Status | Depends On | Notes |
|---:|---|---|---|---|
| 1 | L3SPELL-01-ENHANCE-ABILITY-UPCAST-PER-TARGET - Promote Enhance Ability upcast per-target ability choices | done | none | Independent spell-resource/targeting slice. |
| 2 | L3SPELL-02-DARKNESS-OBJECT-ORIGIN-DECISION - Promote or close Darkness object-origin branch | done | none | Closed as table/object-spatial adjudication; point-origin support remains unchanged. |
| 3 | L3SPELL-03-SPELL-SHAPESHIFT-TRUE-FORM-REVERSION - Promote spell-effect shape-shift true-form reversion owner | done | none | Spell-effect shape-shift owners are promoted through the shared reversion owner used by Moonbeam. |
| 4 | L3SPELL-04-STATBLOCK-SHAPECHANGER-TRUE-FORM-REVERSION - Promote or close stat-block shapechanger true-form reversion owner | done | none | Closed as outside promoted battle runtime because SRD Shape-Shift specials lack a structured active-form owner. |
| 5 | L3SPELL-05-DISPEL-BROADER-ONGOING-EFFECTS - Promote broader Dispel Magic ongoing effect ending | done | none | Spiritual Weapon tracked active-effect occurrences are now covered by the existing Dispel Magic ongoing-effect gate. |
| 6 | L3SPELL-06-ANTIMAGIC-PREVENTION-BOUNDARY-SPLIT - Split Antimagic Field prevention and broader suppression owners | ready-for-implementation-after-light-research | none | Independent boundary split. |
| 7 | L3SPELL-07-HYPNOTIC-PATTERN-SURFACE-ESCAPE-REPAIR - Repair Hypnotic Pattern typed escape Surface shape | ready-for-implementation-after-light-research | none | Surface repair prerequisite for Task 8. |
| 8 | L3SPELL-08-HYPNOTIC-PATTERN-CONTROL-RUNTIME - Promote Hypnotic Pattern control runtime after Surface repair | blocked | L3SPELL-07-HYPNOTIC-PATTERN-SURFACE-ESCAPE-REPAIR | Requires the typed escape Surface shape from Task 7. |

## Global Acceptance Criteria

1. Read RAW in `.references/srd-5.2.1/` and `UBIQUITOUS_LANGUAGE.md` before
   modeling.
2. If a task changes reducer behavior, add QNT/parity in the same task.
3. If a clause depends on table geometry, object presentation, social state, or
   unsupported map derivation, close it explicitly instead of inventing state.
4. Do not dispatch on spell id/name/provenance in production behavior.
5. Prefer typed procedure facts and caller-supplied witnesses over parallel
   runtime registries.

## Concurrent Ralph Constraints

Multiple Ralph lanes may run concurrently. Any MBT command must be globally
locked:

```sh
flock /workspace/typescript/dnd/.ralph/mbt-global.lock -c 'START=$(date +%s); <cmd> 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"'
```

Inside the lock, still check `vitest` and `quint_evaluator` as AGENTS requires.

## Verification

Every task must run:

```sh
git diff --check
pnpm unit-profile-coverage:check
pnpm check:mbt-driver-closure
```

When artifacts change, run the coverage write/read pair. Reducer changes need
focused runtime tests and focused QNT/MBT parity. Surface-only tasks need
Surface schema/catalog tests and must leave runtime follow-ups honest.

### Task 1 - L3SPELL-01-ENHANCE-ABILITY-UPCAST-PER-TARGET

Status: `done`

Promote the remaining Enhance Ability level-3+ upcast behavior.

Required behavior:

- spend a level-3-or-higher Spell Slot through existing spell resource owners;
- target one additional creature per slot level above 2;
- accept a separate Strength, Dexterity, Intelligence, Wisdom, or Charisma
  Ability Check Advantage choice per target;
- project each target's active effect independently without duplicating
  Concentration or target-list state.

Expected outputs:

- QNT/parity for two-target level-3 cast with distinct ability choices;
- runtime tests for target-count gate, per-target choices, and rejection of
  Constitution or shared/missing choices;
- selected-identity replay for `enhance_ability` if the existing witness does
  not already cover this promoted runtime path;
- coverage ledger updates.

### Task 2 - L3SPELL-02-DARKNESS-OBJECT-ORIGIN-DECISION

Status: `done`

Represent and promote or precisely close Darkness's object-origin branch.

Required behavior:

- read RAW for object target, not-worn-or-carried gate, Emanation origin, and
  opaque-cover blocking;
- search existing object, area, light, and opaque-cover facts before adding
  fields;
- if runtime can consume caller-supplied object-origin area facts honestly,
  promote with QNT/runtime parity;
- otherwise keep point-origin support unchanged and add a precise closure.

Expected outputs:

- either focused QNT/runtime tracer bullet or explicit closure with no reducer
  code;
- no map/object lifecycle state invented just for Darkness.

Result:

- closed the object-origin branch as table/object-spatial adjudication because
  promoted battle runtime owns point-origin magical Darkness and light-overlap
  consequences but does not own generic object position, movement, cover, area
  membership, sight-line, or map-illumination state;
- recorded the closure in `plans/unit-profile-coverage/` without reducer, QNT,
  MBT, or runtime-test changes.

### Task 3 - L3SPELL-03-SPELL-SHAPESHIFT-TRUE-FORM-REVERSION

Status: `done`

Promote spell-effect shape-shift projection and true-form reversion through the
shared shape-shifting owner used by Moonbeam.

Required behavior:

- derive replacement-form and true-form facts from one canonical active effect
  and target state;
- make Moonbeam consume shared reversion results without spell identity
  dispatch;
- avoid duplicating true-form Stat Block or character facts.

Expected outputs:

- focused spell-transformation runtime tests;
- QNT/parity for failed-save reversion and successful-save non-reversion;
- coverage updates for Moonbeam follow-up closure.

Result:

- promoted spell-effect shape-shift active effects as shared shape-shift owners;
- made Moonbeam consume shared shape-shift reversion for failed-save reversion
  and preserve spell-effect shape-shift state on successful saves without spell
  authored-identity dispatch;
- updated focused runtime tests, QNT/parity, and Moonbeam coverage artifacts.

### Task 4 - L3SPELL-04-STATBLOCK-SHAPECHANGER-TRUE-FORM-REVERSION

Status: `done`

Promote or close stat-block shapechanger active-form state as a true
shape-shift owner.

Required behavior:

- inspect SRD stat-block shapechanger facts available in the local corpus;
- if active form can be represented without duplicating true-form facts, promote
  with QNT/runtime parity;
- otherwise close with precise owner gap and no runtime metadata.

Expected outputs:

- focused stat-block runtime tests or precise closure;
- Moonbeam claim remains honest.

Result:

- inspected local SRD Moonbeam, Shape-Shifting, Truesight, and Stat Block
  shapechanger facts;
- closed stat-block Shape-Shift true-form reversion as outside promoted battle
  runtime because imp/quasit Shape-Shift is stored as prose-only Stat Block
  `actions.specials`, while battle Stat Block execution currently admits attack
  actions and rejects specials;
- recorded that a promotion would need one generic structured Stat Block
  special-action active-form owner for form choices, Speed replacement,
  equipment non-transformation, and return-to-true-form state, rather than
  Moonbeam-local metadata or stat-block authored-identity dispatch;
- updated Moonbeam coverage artifacts and added the closure note at
  `plans/unit-profile-coverage/L3SPELL-04_STATBLOCK_SHAPECHANGER_TRUE_FORM_REVERSION.md`.

### Task 5 - L3SPELL-05-DISPEL-BROADER-ONGOING-EFFECTS

Status: `done`

Promote Dispel Magic beyond tracked light and object-contact damage effects.

Required behavior:

- identify one broader ongoing Spell Effect family already represented with
  stable occurrence identity and source spell level;
- end it through the existing Dispel Magic target/effect gate;
- preserve spell-specific exceptions and table-owned target identity/range
  boundaries.

Expected outputs:

- QNT/parity for one broader occurrence family and rejection/ability-check gate;
- ledger updates without claiming all possible Dispel Magic clauses.

Result:

- promoted tracked Spiritual Weapon active-effect occurrences as the broader
  already-represented ongoing Spell Effect family for this tracer bullet;
- ended those occurrences through the existing Dispel Magic magical-effect
  target gate by stable source effect identity and source spell level,
  including higher-level spellcasting Ability Check gating;
- kept spell-specific exceptions, automatic geometry, magical-effect identity
  selection, and still-untracked creature/area/object effect families in the
  existing broader Dispel Magic follow-up.

### Task 6 - L3SPELL-06-ANTIMAGIC-PREVENTION-BOUNDARY-SPLIT

Status: `ready-for-implementation-after-light-research`

Split Antimagic Field's remaining prevention clauses by actual owner.

Required behavior:

- classify spellcasting prevention, magical targeting prevention, magic item
  suppression, area clipping, teleportation/planar blocking, portal closure,
  Dispel Magic immunity, and broader suppression;
- promote only one owner if existing runtime state makes it executable;
- otherwise create precise closure/follow-up rows.

Expected outputs:

- at least one focused promoted tracer bullet or a durable split plan with
  executable owner boundaries.

### Task 7 - L3SPELL-07-HYPNOTIC-PATTERN-SURFACE-ESCAPE-REPAIR

Status: `ready-for-implementation-after-light-research`

Repair Hypnotic Pattern Surface shape before runtime admission.

Required behavior:

- encode 30-foot Cube, sight-gated affected-creature predicate, Charmed plus
  Incapacitated plus Speed 0 failed-save bundle, target-damage early end, and
  another-creature shake-awake Action as typed facts;
- update Dhall/JSON/schema/tracer artifacts;
- do not implement runtime behavior in this task unless required by tests.

Expected outputs:

- Surface/unit catalog tests and honest runtime follow-up.

### Task 8 - L3SPELL-08-HYPNOTIC-PATTERN-CONTROL-RUNTIME

Status: `blocked`

After Task 7, promote Hypnotic Pattern runtime.

Required behavior:

- spend Magic Action and level-3-or-higher Spell Slot;
- consume caller-supplied Cube affected-creature and sight witnesses;
- resolve Wisdom saves;
- apply source-owned target effect projecting Charmed, Incapacitated, and Speed
  0;
- remove only the spell-owned target effect on damage or shake-awake Action;
- clean up on Concentration or duration end.

Expected outputs:

- QNT/runtime parity and selected-identity evidence;
- explicit table-owned closure for automatic Cube geometry and sight derivation.
