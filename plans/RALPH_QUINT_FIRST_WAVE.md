# Ralph Quint-First Wave: Lane Map And Parallelism

Date: 2026-06-10

Status: prepared, not launched. Lanes are written; no Ralph runner has been
started for them.

This wave turns the 2026-06-10 architecture-review PRDs into three Ralph
lanes. Source documents:

- `prd/03_MBT_PARITY_DRIVER_KIT.md` and `prd/04_TYPED_WITNESS_PROTOCOL.md`
  → `plans/RALPH_LANE_PARITY_DRIVER_SEAM.md` (Lane A, ids `PDS-A*`)
- `prd/02_QNT_BATTLE_PROTOCOL_KERNEL.md`
  → `plans/RALPH_LANE_BATTLE_PROTOCOL_KERNEL.md` (Lane B, ids `BPK-B*`)
- `plans/LARGE_FILE_DOMAIN_SPLIT_PLAN.md` §7 (Character Sheet Runtime,
  refreshed 2026-06-10)
  → `plans/RALPH_LANE_CHARACTER_SHEET_SPLIT.md` (Lane C, ids `SHEETS-C*`)

Deferred, deliberately not a lane yet:
`plans/RESEARCH_witness_literal_capture_gate.md` becomes a PRD only at
`PDS-A17` (after the typed-witness shape exists).

## Why The PRDs Map To Lanes This Way

`prd/03` and `prd/04` are two halves of one seam (the witness↔driver parity
contract) and edit the same `packages/battle-runtime/src/*.mbt.test.ts`
files, so they must be serial — one lane. `prd/02` is file-disjoint from them
until its witness milestones, so it is its own lane with two explicit
cross-lane gates. The character-sheet split touches a different package
entirely and is gated only on landing the in-flight `packages/mcp`
working-tree changes.

## Parallelism Matrix

| | Lane A (PDS) | Lane B (BPK) | Lane C (SHEETS) |
| --- | --- | --- | --- |
| **Files** | battle-runtime `src/*.mbt.test.ts`, new kit module, new witness-protocol leaf, existing `*.mbt.qnt` | new QNT vocabulary leaves + protocol slices (new files), `scripts/rules-kernel-coverage-*.cjs`, new TS hole-family mapping, `plans/rules-kernel-coverage/*.jsonl`, new `*.mbt.qnt` witnesses (new files) | `packages/character-sheet-runtime/src/**` only |
| **vs Lane A** | — | disjoint: B creates new files; B's witnesses are written post-`PDS-A03` shape and never touch A's migration set | disjoint packages |
| **vs Lane B** | see left | — | disjoint packages |
| **Start condition** | immediately | immediately (B01–B03); B04+ blocked on `PDS-A01` + `PDS-A03` | immediately (mcp-WIP gate cleared 2026-06-10) |

All three lanes may run concurrently subject to the gates below.

## Cross-Lane Gates

1. `BPK-B04`/`BPK-B06` (first protocol witnesses) are blocked until
   `PDS-A01` (driver kit exists, proven on a pilot) and `PDS-A03`
   (witness-protocol leaf exists, proven on a pilot pair) are merged.
   Rationale: every witness/driver pair written before that shape exists
   costs ~650 lines in the old shape and becomes migration backlog.
2. `PDS-A17` (literal-capture-gate PRD) is blocked on `PDS-A10` and is
   scoped to single-`qntOwners` obligations; multi-owner disambiguation is
   produced by `BPK-B08` and widens that PRD later.
3. `SHEETS-C01`'s external gate is **cleared (2026-06-10)**. The
   `packages/mcp` WIP split per the landability assessment: the 2-line
   `mcp-acceptance-scenarios.ts` repair landed on master (`633213b18`;
   master's default mcp test lane was red without it — PR #6 carries the
   identical lines and will merge cleanly), and the session-store
   observability work (`changes` stream, `McpSessionStoreService`, Layer —
   not PR #6's content) moved to its own worktree/branch until its consumer
   exists, minus which it should also be trimmed of consumer-less exports
   before landing.

## Global Resource Constraints (apply across lanes)

- **MBT is a global mutex.** One MBT run at a time across ALL lanes (CLAUDE.md
  "MBT runs are expensive"). Before any MBT run:
  `ps aux | grep vitest | grep -v grep` and
  `ps aux | grep quint_evaluator | grep -v grep`; kill zombie evaluators with
  `killall -9 quint_evaluator`. If another lane's MBT is running, wait.
  Lane C's package tests include its 11 quint-connect MBT drivers — they
  count against the mutex too.
- **Registry writes:** only Lane B writes
  `plans/rules-kernel-coverage/*.jsonl` in this wave. If a future task in
  another lane must touch them, land Lane B's open registry task first.
- **Ralph task-base check:** every task in every lane starts with the
  declared-base check (`git log --oneline -1 <declared-base-ref>`,
  `git log --oneline -1 HEAD`,
  `git merge-base --is-ancestor <declared-base-sha> HEAD`); on failure the
  task stops and reports — branch repair belongs to the runner/decider.

## Suggested Runner Start Order

1. Start Lane A and Lane B together. Lane B will drain B01–B03 and then sit
   blocked at B04 until A merges A01+A03 — that is expected, not a stall.
2. Lane C may start immediately as well (its external gate cleared
   2026-06-10); remember the cross-lane MBT mutex.
3. Single-runner fallback (one lane at a time): A01→A03, then B01→B03, then
   alternate A batches with B04–B07, then C, then closeouts.
