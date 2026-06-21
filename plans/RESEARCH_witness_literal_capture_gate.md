# Research: Witness Literal-Capture Gate

Date: 2026-06-10

Status: research only — no implementation task is open. A PRD should be
written only after the typed protocol-storage migration in
`plans/RALPH_WITNESS_PROTOCOL_STORAGE_MIGRATION.md` lands (see "When to PRD"
below).

## Problem

Per `docs/adr/0001-forest-of-qnt-slices.md`, most battle-runtime `*.mbt.qnt`
files are literal projection witnesses: they restate SRD outcomes as
hand-written literals instead of importing the rule reducer (import closure is
re-instantiated per generated trace, so imports are expensive). The literals
therefore duplicate outcomes that a rule-core or focused slice computes, and
the only sync mechanism is a comment, e.g.
`battle-runtime-death-saving-throw.mbt.qnt:9`: "If the death-save rule
changes, update the literals here." That is distant value-connascence guarded
by prose. The candidate fix: an offline gate (never in the per-trace path)
that re-derives witness literals from the owning rule module and fails on
drift.

## Measured Facts (2026-06-10, master)

- Of 106 battle-runtime `*.mbt.qnt`: **89 are fully self-contained** literal
  witnesses (import nothing); ~18 are allowlisted computed-oracle/heavy
  drivers in `scripts/check-mbt-driver-closure.cjs` (the reducer is their
  oracle — exempt by design); ~6 protocol-only obligations have no computable
  outcome. **Coverable: ~85 of 106.**
- 16 witnesses carry explicit oracle-pointer comments today.
- Oracle linkage already exists for ~80% via the registry chain:
  witness `KERNEL-COVERAGE: parity-witness <id>` → `plans/rules-kernel-coverage/obligations.jsonl`
  row → `qntOwners`. Example: the death-save witness chains to rule-core
  `zero-hit-point-lifecycle.qnt`, whose pure def
  `resolveStartTurnDeathSavingThrow(vitals, lifecycle, d20Roll)` computes
  exactly the witnessed outcomes for rolls 1/5/10/20.
- **Blocker: 30 of 114 obligations list 2+ `qntOwners`** — "which owner is
  the outcome oracle" is ambiguous for those rows.
- Mechanics probed live: `quint parse --out` yields a stable AST
  (`actionAll` → `assign` opcodes) from which per-action literal next-state
  values extract mechanically; a REPL eval against a leaf rule-core module
  costs **~0.4s** (`printf 'import …\n<expr>\n.exit\n' | quint -r <leaf>.qnt`),
  so an offline gate is cheap. Per-trace MBT cost is unaffected by design.

## Recommended Design (when built)

Of three shapes considered — (a) standalone compare script, (b) generated
`*-witness-samples-tests.qnt` proof modules, (c) hand-written sample tests —
**(b) is recommended**: a script extracts each witness's fixture and
per-action outcome literals from the parsed AST and emits a small proof module
that imports the oracle, evaluates it at the witnessed sample points, and
asserts the witness literals in `run` blocks. The existing self-discovering
proof lane (`pnpm --filter @dnd/battle-runtime test:qnt-proofs`,
`src/battle-runtime-qnt-proofs.ts`) then runs each generated module with its
per-module hard timeout; drift surfaces as a named proof failure.

Why (b): stays QNT-internal (oracle-direction rule preserved — the oracle
computes independently inside the run block; witness literals are the
assertion targets, never the oracle); reuses the bounded, attributable proof
lane instead of new CI machinery; (c) would hand-duplicate literals a third
time, which the connascence discipline forbids.

Scope rule for a first slice: **single-`qntOwner` obligations only** (~80
witnesses); multi-owner rows become explicit follow-ups.

## When To PRD (ordering gates)

1. **After the typed protocol-storage migration.** That migration changes every
   witness's AST shape (single record var, `.with(...)` updates, picks-based
   actions with conditional literals). An extractor built against the old
   parallel-vars shape is throwaway; the migrated shape is also simpler to
   extract (uniform protocol record, shared step helpers as stable anchors).
2. **Oracle disambiguation belongs to `prd/02`'s registry milestones.** When
   `prd/02` touches `obligations.jsonl`, add the outcome-oracle
   disambiguation for multi-owner rows (e.g. an explicit outcome-oracle
   pointer or a documented ordering convention). The gate then consumes that
   fact instead of inventing its own mapping.

## Do Not

- Do not build the extractor against the current 10-parallel-vars witness
  shape (see gate 1).
- Do not put capture/evaluation anywhere in the per-trace MBT path.
- Do not hand-write a third copy of witness literals as sample tests.
- Do not generate witness or oracle QNT from TypeScript results
  (oracle-direction rule, `ARCHITECTURE.md` "Quint And Parity").
