# Ralph Lane B: Battle Protocol Kernel

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "BPK-B01-HOLE-KIND-VOCABULARY",
      "status": "done",
      "title": "QNT hole-kind vocabulary leaf with executable two-direction join"
    },
    {
      "number": 2,
      "id": "BPK-B02-FILL-SUBJECT-VOCABULARY",
      "status": "done",
      "title": "QNT fill-kind and subject-kind vocabulary with the same join"
    },
    {
      "number": 3,
      "id": "BPK-B03-VOCABULARY-REGISTRY-CLOSEOUT",
      "status": "done",
      "title": "Obligation, roles, and generator-readiness rows for the vocabulary tier"
    },
    {
      "number": 4,
      "id": "BPK-B04-WEAPON-ATTACK-ORDERING",
      "status": "ready-for-research",
      "title": "Hole-frontier ordering slice and witness for the weapon-attack procedure shape"
    },
    {
      "number": 5,
      "id": "BPK-B05-SAVE-SPELL-ORDERING",
      "status": "blocked",
      "title": "Hole-frontier ordering slice and witness for the save-gated-spell procedure shape"
    },
    {
      "number": 6,
      "id": "BPK-B06-INTERRUPT-NESTING-RESUME",
      "status": "ready-for-research",
      "title": "Interrupt nesting and resume-with-active-effect-mutation slice and witness"
    },
    {
      "number": 7,
      "id": "BPK-B07-REPLAY-FROM-ROOT",
      "status": "blocked",
      "title": "Replay-from-root equivalence slice and witness"
    },
    {
      "number": 8,
      "id": "BPK-B08-KERNEL-REGISTRY-CLOSEOUT",
      "status": "blocked",
      "title": "Protocol-kernel registry closeout, IR-boundary evidence, and oracle disambiguation convention"
    },
    {
      "number": 9,
      "id": "BPK-B09-RECURSIVE-NEXT-SHAPES",
      "status": "blocked",
      "title": "Queue the next procedure shapes for ordering coverage if the lane drains"
    }
  ]
}
-->

This lane implements `prd/02_QNT_BATTLE_PROTOCOL_KERNEL.md`: give the battle
protocol — hole/fill/subject vocabulary, hole-frontier ordering, interrupt
nesting/resume, replay-from-root — a QNT owner. It is the missing tier for
the cleanroom Rust experiment (`plans/CLEANROOM_RUST_EXPERIMENT.md`): without
it, the copied QNT corpus underdetermines the engine.

Tasks B01–B03 are file-disjoint from Lane A and run in parallel with it.
Tasks B04+ write new witnesses and are blocked until Lane A's `PDS-A01`
(driver kit) and `PDS-A03` (witness-protocol leaf) are merged, so the new
witnesses are born in the final shape. See
`plans/RALPH_QUINT_FIRST_WAVE.md` for the matrix and the global MBT mutex.

## Context Budget

Read only these by default:

- `prd/02_QNT_BATTLE_PROTOCOL_KERNEL.md` (whole document, including its
  Context Primer reading list — it is the task's primary spec).
- `plans/rules-kernel-coverage/battle-hole-frontier.jsonl` and the rows of
  `obligations.jsonl` named by the current task.
- `scripts/rules-kernel-coverage-check.cjs`, `-config.cjs`, `-self-test.cjs`,
  `-claim-scan.cjs` when a task changes checker behavior.
- The exact QNT modules, reducer files, SRD passages, and
  `UBIQUITOUS_LANGUAGE.md` sections named by the current task.

Do not reread closed Ralph lanes. Do not touch Lane A's driver-migration
files or Lane C's package.

## Lane Rules

- Before starting each task, verify the task base:
  `git log --oneline -1 <declared-base-ref>`, `git log --oneline -1 HEAD`,
  `git merge-base --is-ancestor <declared-base-sha> HEAD`. On failure, stop
  and report.
- Family grain, not per-spell: no new per-spell kinds. Where a frontier
  `holeKind` is per-spell today, fold it or keep it with an explicit
  `followUpTaskIds` fold task named in its frontier row (prd/02
  Implementation Decisions).
- Boundary rows stay boundary: `BATTLE.PROTOCOL.MALFORMED_PAYLOAD_REJECTION`
  and `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` must not be pulled into QNT
  (ADR-0004 spatial facts stay table-owned).
- Vocabulary leaves import nothing behavioural; `battle-runtime-model.qnt`
  may import the leaves, never the reverse.
- Extend the existing reaction-window/interrupt-bridge family for B06/B07;
  no parallel reaction spec.
- If the SRD does not prescribe an ordering the runtime fixes, record the
  choice in the obligation row; if it is a RAW interpretation, stop and
  surface for `ASSUMPTIONS.md` (HITL escalation) instead of deciding
  silently.
- New QNT carries `// KERNEL-COVERAGE: qnt-owner <ID>`; new witnesses carry
  `// KERNEL-COVERAGE: parity-witness <ID>`.
- Treat battle MBT as scarce and globally mutexed (wave doc).

## Verification

Every task must include:

- Reviewer-loop convergence (RAW traceability, ubiquitous language,
  architecture/connascence, code review) until no reasonable findings remain.
- RAW/UL check: every modeled ordering/interrupt rule cites its SRD passage
  in `surfaceEvidence`; vocabulary names checked against
  `UBIQUITOUS_LANGUAGE.md`.
- `pnpm rules-kernel-coverage:check -- --write` then
  `pnpm rules-kernel-coverage:check`
- `node scripts/check-mbt-driver-closure.cjs` when witnesses change.
- Focused MBT for the task's witnesses (`MBT_TRACES=1` default plus one
  `MBT_TRACES=3` pass), with the MBT-mutex process check and the CLAUDE.md
  background/timing protocol.
- `pnpm --filter @dnd/battle-runtime test:qnt-proofs` when a `.qnt` with
  `run` blocks is added or changed.
- `git diff --check`

## DAG / Queue Order

| # | Task | Status | Depends on | Notes |
| ---: | --- | --- | --- | --- |
| 1 | BPK-B01-HOLE-KIND-VOCABULARY | ready-for-implementation-after-light-research | none | Light research: UL naming pass over the 33 semantic-frontier holeKinds; leaf layout (one module vs split). |
| 2 | BPK-B02-FILL-SUBJECT-VOCABULARY | done | BPK-B01-HOLE-KIND-VOCABULARY | Same treatment for 46 fill kinds + ~40 subjects. |
| 3 | BPK-B03-VOCABULARY-REGISTRY-CLOSEOUT | done | BPK-B02-FILL-SUBJECT-VOCABULARY | prd/02 M1 done after this. Unblocks the cleanroom-corpus value immediately. |
| 4 | BPK-B04-WEAPON-ATTACK-ORDERING | ready-for-research | BPK-B03-VOCABULARY-REGISTRY-CLOSEOUT | Cross-lane gate: unblock manually when Lane A PDS-A01 and PDS-A03 are merged. |
| 5 | BPK-B05-SAVE-SPELL-ORDERING | blocked | BPK-B04-WEAPON-ATTACK-ORDERING | Second procedure shape; reuses B04's slice skeleton. |
| 6 | BPK-B06-INTERRUPT-NESTING-RESUME | ready-for-research | BPK-B03-VOCABULARY-REGISTRY-CLOSEOUT | Cross-lane gate: unblock manually when Lane A PDS-A01 and PDS-A03 are merged; may run before/parallel to B04 in queue order if the runner supports it. |
| 7 | BPK-B07-REPLAY-FROM-ROOT | blocked | BPK-B06-INTERRUPT-NESTING-RESUME | |
| 8 | BPK-B08-KERNEL-REGISTRY-CLOSEOUT | blocked | BPK-B04-WEAPON-ATTACK-ORDERING, BPK-B05-SAVE-SPELL-ORDERING, BPK-B06-INTERRUPT-NESTING-RESUME, BPK-B07-REPLAY-FROM-ROOT | Also produces the multi-owner outcome-oracle convention consumed by PDS-A17's PRD. |
| 9 | BPK-B09-RECURSIVE-NEXT-SHAPES | blocked | BPK-B08-KERNEL-REGISTRY-CLOSEOUT | Ordering coverage for further procedure shapes (healing, command, attack-roll spell, …). |

## Task Details

### Task 1 - BPK-B01-HOLE-KIND-VOCABULARY

Status: `done` · Mode: AFK

Input: prd/02 Solution §1 and Implementation Decisions;
`battle-hole-frontier.jsonl` (75 `battle-hole-family` rows, 48 distinct
`holeKind` values, exactly one `holeKind: null` row to repair);
`battle-runtime-reaction-kinds.qnt` as the leaf pattern;
`src/battle-reducer.ts:5620` (BattleHole union);
`src/battle-reducer/hole-helpers.ts`.

Output: the hole-kind vocabulary leaf at family grain (promote
`semantic-frontier` holeKinds; `table-owned-fact` kinds stay
boundary-documented); the null-holeKind frontier row repaired; checker
extension making the join executable both directions (frontier `holeKind` →
QNT variant; QNT variant → ≥1 frontier row; null forbidden); a TS exhaustive
`Match.discriminator`-based mapping `BattleHole → hole family kind` exported
from `@dnd/battle-runtime` with a contract test tying it to the frontier
registry; checker self-test rows.

Acceptance: a deliberately mis-kinded frontier row and a deliberately
unmapped TS variant each fail the respective gate (demonstrated in the
self-test); `pnpm rules-kernel-coverage:check` green;
`pnpm --filter @dnd/battle-runtime test` green for the new mapping test;
KERNEL-COVERAGE headers present.

### Task 2 - BPK-B02-FILL-SUBJECT-VOCABULARY

Status: `done` · Mode: AFK

Input: 46 `battle-fill-kind` frontier rows; `src/battle-reducer.ts:5771`
(BattleFill union); `src/battle-subjects.ts:898` (BattleSubject, ~40
variants, schema-derived).

Output: fill-kind and subject-kind vocabulary with the same leaf + checker +
exhaustive TS mapping + contract-test treatment as B01.

Acceptance: same gate demonstrations as B01 for fills and subjects; all B01
gates still green.

### Task 3 - BPK-B03-VOCABULARY-REGISTRY-CLOSEOUT

Status: `done` · Mode: AFK

Output: obligation row(s) for the vocabulary tier (suggested
`BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY`) with SRD/UL `surfaceEvidence`;
`BATTLE.HOLE.SEMANTIC_FRONTIER_CLASSIFICATION` updated to cite the QNT owner
(convert to `covered` or rewrite its `reason` — record the choice in the
row); `qnt-owner-roles.jsonl` `semantic-core` rows;
`generator-readiness.jsonl` rows (`generation-subset-clean` with explicit
`generatorSubset`); regenerate `plans/rules-kernel-coverage/REPORT.md`.

Acceptance: claim-scan green; checker green; prd/02 M1 acceptance criteria
checked off in the task report.

### Task 4 - BPK-B04-WEAPON-ATTACK-ORDERING

Status: `ready-for-research` (cross-lane gate: PDS-A01 + PDS-A03 merged) · Mode: AFK

Input: prd/02 Solution §2; `battle-runtime-public-trace-contract.qnt` (the
narrow precedent to generalize); the weapon-attack reducer path
(`src/battle-reducer/attack-main.ts`, `attack-resolution.ts`); SRD attack
sequence passages (`Playing-the-Game.md`).

Output: a focused ordering slice owning the weapon-attack hole-frontier
order as relations over the B01 vocabulary (target choice → attack roll →
damage dice; which fill rejections are ordering errors); one focused MBT
witness (kit + witness-protocol shape) driving `resolveBattleSubject`
through a bounded fixture asserting projected frontier order; obligation row
`BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING` (weapon-attack scope noted).

Acceptance: focused MBT green; closure checker green (vocabulary leaf +
witness-protocol leaf within budget); registry checks green.

### Task 5 - BPK-B05-SAVE-SPELL-ORDERING

Status: `blocked` · Mode: AFK

Output: same slice/witness treatment for the save-gated-spell shape
(targets/area → save outcome → damage/condition choice ordering), extending
B04's slice or adding a sibling per domain fit; obligation row updated.

Acceptance: as B04.

### Task 6 - BPK-B06-INTERRUPT-NESTING-RESUME

Status: `ready-for-research` (cross-lane gate: PDS-A01 + PDS-A03 merged) · Mode: AFK

Input: prd/02 Solution §3; `battle-runtime-reaction-window.qnt`,
`battle-runtime-interrupt-bridge.qnt`, rule-core
`reactions-continuations-concentration.qnt`;
`src/battle-reducer/dispatcher.ts` (interrupt stack);
`src/battle-reducer/spell-cast-interrupt-frame.ts`.

Output: extension of the reaction/interrupt family owning nesting depth and
discipline plus decline/resume when active effects mutate between offer and
resume, at abstract procedure grain; focused MBT witness(es) driving
`resolveBattleSubject`/`resolveBattleInterrupt`; obligation row
`BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY` (nesting/resume scope).

Acceptance: as B04, plus no parallel reaction spec introduced (extension
only).

### Task 7 - BPK-B07-REPLAY-FROM-ROOT

Status: `blocked` · Mode: AFK

Output: replay-from-root equivalence owned in QNT (replaying recorded
subject+fills from the root state reproduces the resolved state) at abstract
procedure grain, with a focused witness replaying through production APIs;
the obligation row from B06 completed for replay scope.

Acceptance: as B04.

### Task 8 - BPK-B08-KERNEL-REGISTRY-CLOSEOUT

Status: `blocked` · Mode: AFK

Output: registry closeout for the kernel tier (`qnt-owner-roles.jsonl`,
`generator-readiness.jsonl`, `kernel-ir-boundaries.jsonl` `command`/`fill`
rows gaining the new QNT owners as evidence); `plans/QNT_COVERAGE_PROGRAM.md`
queue map updated; REPORT regenerated; **the multi-owner outcome-oracle
disambiguation convention** for `obligations.jsonl` rows with 2+ `qntOwners`
(explicit pointer or documented ordering rule — consumed later by the
literal-capture-gate PRD, `PDS-A17`).

Acceptance: checker + claim-scan green; prd/02 M4 acceptance criteria
checked off; disambiguation convention documented in
`plans/rules-kernel-coverage/README.md`.

### Task 9 - BPK-B09-RECURSIVE-NEXT-SHAPES

Status: `blocked` · Mode: AFK

Output: enumerate the next procedure shapes lacking ordering coverage
(healing, command, attack-roll spell, stat-block actions, …) from the
frontier registry and either append tasks to this lane or mark it drained in
`plans/RALPH_QUINT_FIRST_WAVE.md`.
