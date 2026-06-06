# Ralph Lane: L3 Today Ultra-Golden Cleanup

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L3TODAY-01-DIAGNOSTIC-ROW-TRANSPARENCY",
      "status": "ready-for-implementation-after-light-research",
      "title": "Make current level-3 diagnostic non-green rows scanner-visible"
    },
    {
      "number": 2,
      "id": "L3TODAY-02-ACID-ARROW-RAW-DECISION-PACKET",
      "status": "ready-for-research",
      "title": "Prepare Acid Arrow RAW reconciliation decision packet"
    },
    {
      "number": 3,
      "id": "L3TODAY-03-ACID-ARROW-SURFACE-SHAPE",
      "status": "blocked",
      "title": "Repair Acid Arrow Surface damage shape after RAW decision"
    },
    {
      "number": 4,
      "id": "L3TODAY-04-ACID-ARROW-RUNTIME-TRACER-BULLET",
      "status": "blocked",
      "title": "Promote Acid Arrow delayed damage runtime tracer bullet"
    },
    {
      "number": 5,
      "id": "L3TODAY-05-WIZARD-EVOCATION-SAVANT-LEVEL3-TRIGGER",
      "status": "ready-for-research",
      "title": "Resolve Wizard Evocation Savant level-3 new-slot trigger"
    },
    {
      "number": 6,
      "id": "L3TODAY-06-WIZARD-EVOCATION-SAVANT-LEVEL3-IMPLEMENTATION",
      "status": "blocked",
      "title": "Implement level-3 Evocation Savant spellbook grant if RAW applies"
    },
    {
      "number": 7,
      "id": "L3TODAY-07-WILD-SHAPE-BEAST-SPELLS-SPLIT",
      "status": "ready-for-implementation-after-light-research",
      "title": "Split Beast Spells out of level-3 Wild Shape residuals"
    },
    {
      "number": 8,
      "id": "L3TODAY-08-WILD-SHAPE-STAT-BLOCK-ACTION-INVENTORY",
      "status": "ready-for-research",
      "title": "Inventory remaining Wild Shape Stat Block action pressure"
    },
    {
      "number": 9,
      "id": "L3TODAY-09-WILD-SHAPE-FIRST-STAT-BLOCK-ACTION-SLICE",
      "status": "blocked",
      "title": "Promote first remaining Wild Shape Stat Block action slice"
    },
    {
      "number": 10,
      "id": "L3TODAY-10-WILD-SHAPE-SENSE-LANGUAGE-PROJECTION",
      "status": "ready-for-research",
      "title": "Close or promote Wild Shape sense and language projection"
    },
    {
      "number": 11,
      "id": "L3TODAY-11-METAMAGIC-POST-TASK22-ACCOUNTING",
      "status": "ready-for-implementation-after-light-research",
      "title": "Consolidate Metamagic after task 22 landed"
    },
    {
      "number": 12,
      "id": "L3TODAY-12-METAMAGIC-REMAINING-QUICKENED-INVENTORY",
      "status": "blocked",
      "title": "Inventory remaining Quickened action-spell procedures"
    },
    {
      "number": 13,
      "id": "L3TODAY-13-METAMAGIC-NEXT-QUICKENED-SLICE",
      "status": "blocked",
      "title": "Promote next Quickened procedure tracer bullet"
    },
    {
      "number": 14,
      "id": "L3TODAY-14-ULTRA-GOLDEN-CONSOLIDATION",
      "status": "blocked",
      "title": "Regenerate and summarize level-3 ultra-golden cleanup"
    }
  ]
}
-->

## Objective

Level 3 strict full-support is already green on `master`:

- `plans/unit-profile-coverage/LEVEL1_3_FULL_SUPPORT.md` reports
  `Full-support claim: pass`.
- Strict target closure is `197/197`.
- Selected identity readiness is `167/167`.
- SRD-authored product readiness is `79/79`.

This batch is therefore not a strict level-3 unblocker. It is an ultra-golden
cleanup batch: reduce the remaining diagnostic product-readiness pressure,
make residual accounting scanner-visible, and convert the remaining
follow-up-split rows into either promoted tracer bullets or precise owner
decision boundaries.

## Declared Base And Task-Base Check

Declared Base SHA:

```text
170409c02b062a931dcd0af0cd5a7f57019109d7
```

Before each task, log:

```sh
git rev-parse HEAD
git merge-base --is-ancestor 170409c02b062a931dcd0af0cd5a7f57019109d7 HEAD
```

If the ancestor check fails, stop and report the branch-base mismatch. Do not
repair branch state by rebasing against `master`.

## Current Accounting

Use these source artifacts before choosing work:

- `plans/unit-profile-coverage/LEVEL1_3_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/level1-3-full-support.json`
- `plans/unit-profile-coverage/UNIT_REPORT.md`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/task-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`

Current generated facts:

- Diagnostic product readiness is `604/607`.
- Diagnostic non-green counts are `battle-runtime-required: 1`,
  `owner-evidence-required: 1`, and `partial-battle-runtime: 1`.
- Strict follow-up-split Units are `acid_arrow`, `druid_wild_shape`,
  `sorcerer_metamagic`, and `wizard_evocation_savant`.
- `sorcerer_metamagic` prior Ralph task 22 is merged into this base. Do not
  duplicate task 22; use the current generated residuals for follow-up work.

## DAG / Queue Order

| Order | Task | Status | Depends On | Notes |
|---:|---|---|---|---|
| 1 | L3TODAY-01-DIAGNOSTIC-ROW-TRANSPARENCY | ready-for-implementation-after-light-research | none | Make the three current diagnostic non-green rows explicit and keep the stale diagnostic audit from drifting again. |
| 2 | L3TODAY-02-ACID-ARROW-RAW-DECISION-PACKET | ready-for-research | none | RAW/ASSUMPTIONS decision packet only; do not invent the decision if local RAW remains contradictory. |
| 3 | L3TODAY-03-ACID-ARROW-SURFACE-SHAPE | blocked | L3TODAY-02-ACID-ARROW-RAW-DECISION-PACKET | Runnable only if Task 2 records an owner-approved or locally unambiguous damage timing decision. |
| 4 | L3TODAY-04-ACID-ARROW-RUNTIME-TRACER-BULLET | blocked | L3TODAY-03-ACID-ARROW-SURFACE-SHAPE | Full QNT/TS/MBT tracer bullet for the approved Surface shape. |
| 5 | L3TODAY-05-WIZARD-EVOCATION-SAVANT-LEVEL3-TRIGGER | ready-for-research | none | Decide whether the level-3 subclass acquisition also triggers the new Wizard Spell Slot level grant. |
| 6 | L3TODAY-06-WIZARD-EVOCATION-SAVANT-LEVEL3-IMPLEMENTATION | blocked | L3TODAY-05-WIZARD-EVOCATION-SAVANT-LEVEL3-TRIGGER | Runnable only if Task 5 decides the trigger applies at Wizard level 3. |
| 7 | L3TODAY-07-WILD-SHAPE-BEAST-SPELLS-SPLIT | ready-for-implementation-after-light-research | none | Beast Spells is Druid level 18 pressure; ensure it cannot keep level-3 Wild Shape blocked. |
| 8 | L3TODAY-08-WILD-SHAPE-STAT-BLOCK-ACTION-INVENTORY | ready-for-research | none | Inventory the remaining level-3-reachable Beast-form Stat Block action pressure. |
| 9 | L3TODAY-09-WILD-SHAPE-FIRST-STAT-BLOCK-ACTION-SLICE | blocked | L3TODAY-08-WILD-SHAPE-STAT-BLOCK-ACTION-INVENTORY | Promote the first inventory item only if it is level-3-reachable and battle-owned. |
| 10 | L3TODAY-10-WILD-SHAPE-SENSE-LANGUAGE-PROJECTION | ready-for-research | none | Determine whether prior work already closed this or whether a shared projection tracer bullet remains. |
| 11 | L3TODAY-11-METAMAGIC-POST-TASK22-ACCOUNTING | ready-for-implementation-after-light-research | none | Regenerate accounting after task 22 and remove stale residual wording. |
| 12 | L3TODAY-12-METAMAGIC-REMAINING-QUICKENED-INVENTORY | blocked | L3TODAY-11-METAMAGIC-POST-TASK22-ACCOUNTING | Recompute remaining Quickened procedures after task 22. |
| 13 | L3TODAY-13-METAMAGIC-NEXT-QUICKENED-SLICE | blocked | L3TODAY-12-METAMAGIC-REMAINING-QUICKENED-INVENTORY | Promote one selected next Quickened tracer bullet. |
| 14 | L3TODAY-14-ULTRA-GOLDEN-CONSOLIDATION | blocked | Tasks 1, 2, 5, 7, 8, 10 and any implemented dependent task | Regenerate ledgers, update this plan, and summarize remaining level-3 ultra-golden pressure. |

## Task Details

### Task 1 - L3TODAY-01-DIAGNOSTIC-ROW-TRANSPARENCY

Make current diagnostic non-green rows scanner-visible. Prefer extending the
existing generated report or a small JSON artifact over maintaining another
hand-written table. Then update or retire stale text in
`LEVEL1_3_DIAGNOSTIC_READINESS_AUDIT.md` so it no longer claims the old
`18 + 11` diagnostic row inventory as current.

Acceptance:

- The current `battle-runtime-required`, `owner-evidence-required`, and
  `partial-battle-runtime` rows can be found without manually reading stale
  audit prose.
- `pnpm unit-profile-coverage:check:self-test` and
  `pnpm unit-profile-coverage:check` pass.

### Task 2 - L3TODAY-02-ACID-ARROW-RAW-DECISION-PACKET

Read local SRD 5.2.1 Acid Arrow text and existing
`ACID_ARROW_RAW_CORPUS_RECONCILIATION.md`. Produce one of:

- an owner-ready `ASSUMPTIONS.md` patch if the repo already has enough local
  authority to make the initial/later/miss/slot-scaling decision; or
- a sharper blocker document with the exact owner question and no runtime or
  Surface implementation changes.

Acceptance:

- No runtime behavior is implemented without the RAW decision.
- The packet states whether Tasks 3 and 4 are runnable or still blocked.
- The local RAW citation is included.

### Task 3 - L3TODAY-03-ACID-ARROW-SURFACE-SHAPE

After Task 2 unblocks it, repair Acid Arrow's Surface spell shape so the
approved damage timing, miss branch, delayed damage, and slot scaling are
lossless facts.

Acceptance:

- No derived miss damage is stored as an independent approximation.
- Surface schema/parser tests cover the new shape.
- Unit-profile coverage remains valid.

### Task 4 - L3TODAY-04-ACID-ARROW-RUNTIME-TRACER-BULLET

Promote Acid Arrow vertically: QNT obligation/witness, TS admission and reducer
behavior, runtime tests, and MBT/selected identity evidence as appropriate.

Acceptance:

- The real reducer path can execute the approved hit, miss, delayed target-turn
  damage, slot scaling, resource spending, and cleanup behavior.
- The supported Unit claim and evidence rows point at production code.

### Task 5 - L3TODAY-05-WIZARD-EVOCATION-SAVANT-LEVEL3-TRIGGER

Read Wizard Evocation Savant RAW and existing Character Creation spellbook
learning tests. Decide whether subclass acquisition at Wizard level 3 also
counts as gaining access to a new Wizard Spell Slot level for the one-spell
Evocation grant.

Acceptance:

- If the answer is "yes", Task 6 is unblocked and the expected level-3 choice
  shape is described.
- If the answer is "no" or owner-dependent, record the decision boundary so
  level-3 accounting cannot drift back into `later-level-only` ambiguity.

### Task 6 - L3TODAY-06-WIZARD-EVOCATION-SAVANT-LEVEL3-IMPLEMENTATION

If Task 5 says the trigger applies at level 3, implement the acquisition-time
spellbook choice in Character Creation without duplicating spellbook state or
dispatching on protected authored identity outside catalog/selection
boundaries.

Acceptance:

- Character Creation discovers and finalizes the extra Evocation spellbook
  choice from typed spell access, spell school, and spell level facts.
- Deterministic admission/projection and selected-identity evidence are
  scanner-visible.

### Task 7 - L3TODAY-07-WILD-SHAPE-BEAST-SPELLS-SPLIT

Beast Spells is a Druid level 18 feature. Split that residual out of level-3
Wild Shape accounting with `later-level-only` `firstTriggerCharacterLevel: 18`
or an equivalent precise closure. Do not hide level-3-reachable Stat Block
action pressure under this closure.

Acceptance:

- Wild Shape residual text no longer makes Beast Spells look level-3-reachable.
- The scope-aware later-level accounting self-test still passes.

### Task 8 - L3TODAY-08-WILD-SHAPE-STAT-BLOCK-ACTION-INVENTORY

Inventory the remaining Wild Shape Stat Block action pressure for selected
known Beast forms reachable by level-3 Wild Shape. Classify each branch as
already promoted, battle-owned future work, table/prose-only, or later-level.

Acceptance:

- The inventory names concrete runtime shapes, not authored Beast identities as
  reducer dispatch keys.
- Task 9 is unblocked only if there is a small battle-owned branch suitable for
  one tracer bullet.

### Task 9 - L3TODAY-09-WILD-SHAPE-FIRST-STAT-BLOCK-ACTION-SLICE

Promote one small battle-owned Stat Block action branch from Task 8 through
QNT, TS reducer code, runtime tests, and evidence. If Task 8 finds no such
branch, close this task with the precise non-runnable reason.

Acceptance:

- No generic Stat Block special-action architecture is invented for one Beast.
- Any supported behavior is reachable through the real battle reducer path.

### Task 10 - L3TODAY-10-WILD-SHAPE-SENSE-LANGUAGE-PROJECTION

Review the merged Wild Shape perception/communication work against the current
residual text. Either close the residual as already covered, or create the
small shared projection needed for active-form senses, retained languages, and
speech blockers.

Acceptance:

- No duplicate language or sense state is added to battle state.
- Any projection derives from selected active form facts and retained Character
  Sheet facts.

### Task 11 - L3TODAY-11-METAMAGIC-POST-TASK22-ACCOUNTING

Metamagic task 22 is merged into the declared base. Regenerate unit-profile and
rules-kernel coverage and update `sorcerer_metamagic` residual text so it
reflects task 22.

Acceptance:

- Task 22 is not duplicated.
- Remaining Metamagic residuals are current and scanner-visible.

### Task 12 - L3TODAY-12-METAMAGIC-REMAINING-QUICKENED-INVENTORY

After Task 11, recompute which Quickened action-time Spell Invocation
procedures are still unsupported and which are small enough for one tracer
bullet.

Acceptance:

- Inventory is procedure-shape based, not spell-name dispatch based.
- Task 13 is unblocked only for one concrete next procedure slice.

### Task 13 - L3TODAY-13-METAMAGIC-NEXT-QUICKENED-SLICE

Promote one next Quickened procedure from Task 12 through QNT, TS runtime,
focused tests, and evidence.

Acceptance:

- Shared Font of Magic point-pool spending remains the resource source.
- The same-turn level-1-plus spell lock is preserved for slot, free-cast, and
  cantrip paths that need it.

### Task 14 - L3TODAY-14-ULTRA-GOLDEN-CONSOLIDATION

Regenerate reports, update this plan statuses, and summarize what remains for
level-3 ultra-golden cleanup.

Acceptance:

- `pnpm unit-profile-coverage:check:self-test`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check:self-test`
- `pnpm rules-kernel-coverage:check`
- Reviewer-loop convergence: run RAW, ubiquitous-language, architecture/domain,
  and code-review passes after implementation; fix every reasonable finding or
  document a concrete rejection reason, and repeat until no reasonable findings
  remain.
- RAW/ubiquitous-language check: before implementing any rule, read the
  relevant SRD passage in `.references/srd-5.2.1/` and check
  `UBIQUITOUS_LANGUAGE.md`; cite the local RAW path in the task result.

## Verification

Every implementation task in this plan must finish with:

- Reviewer-loop convergence: run RAW, ubiquitous-language, architecture/domain,
  and code-review passes after implementation; fix every reasonable finding,
  explicitly reject only findings with a concrete reason, and repeat until no
  reasonable findings remain.
- RAW/ubiquitous-language check: before implementing any rule, read the
  relevant SRD passage in `.references/srd-5.2.1/` and check
  `UBIQUITOUS_LANGUAGE.md`. Task results must cite the local RAW path for every
  modeled rule.
- Generated accounting checks:
  `pnpm unit-profile-coverage:check:self-test`,
  `pnpm unit-profile-coverage:check`,
  `pnpm rules-kernel-coverage:check:self-test`, and
  `pnpm rules-kernel-coverage:check`.

Do not run battle MBT for exploratory accounting. Use source reads, focused
unit tests, and generated coverage checks first. If a completed task changes
battle-runtime behavior and needs integrated MBT, use the repository MBT
protocol: one MBT at a time, wrapped with the shared lock, for example
`mkdir -p .ralph && flock .ralph/mbt-global.lock -c '<MBT command>'`.

This plan intentionally has several blocked tasks. Ralph must not auto-run
dependent implementation tasks until the preceding decision or inventory task
has explicitly changed their status or produced the required unblocker.
