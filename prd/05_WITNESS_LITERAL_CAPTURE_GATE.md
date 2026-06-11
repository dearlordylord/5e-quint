# PRD: Witness Literal-Capture Gate

Date: 2026-06-11

Status: Draft

Owner: battle-runtime QNT architecture

Origin: `plans/RESEARCH_witness_literal_capture_gate.md`, written after
`prd/04_TYPED_WITNESS_PROTOCOL.md` M1 landed and the battle-runtime witness
corpus adopted the typed `WitnessProtocol[h]` record. Companion PRDs:
`prd/03_MBT_PARITY_DRIVER_KIT.md` and
`prd/04_TYPED_WITNESS_PROTOCOL.md` shaped the witness/driver seam this gate
consumes; `prd/02_QNT_BATTLE_PROTOCOL_KERNEL.md` and Lane B task
`BPK-B08-KERNEL-REGISTRY-CLOSEOUT` own multi-owner outcome-oracle
disambiguation.

## Context Primer For A Fresh Agent

Read before writing anything:

1. `CLAUDE.md` - "MBT driver closure discipline", "QNT proof lane", "Quint
   gotchas", "Connascence discipline", and "SRD feature parity".
2. `ARCHITECTURE.md` - "Quint And Parity": QNT expected state literals must
   not be generated from TypeScript runtime results.
3. `docs/adr/0001-forest-of-qnt-slices.md` - especially literal projection
   witnesses, import-closure cost, and the typed witness-protocol addendum.
4. `prd/04_TYPED_WITNESS_PROTOCOL.md` closeout and
   `packages/battle-runtime/README.md` witness-authoring section for the
   post-protocol record shape.
5. One small literal witness end to end:
   `packages/battle-runtime/battle-runtime-death-saving-throw.mbt.qnt` and
   `packages/battle-runtime/src/death-saving-throw.mbt.test.ts`.
6. `packages/battle-runtime/src/battle-runtime-qnt-proofs.ts` and
   `packages/battle-runtime/src/battle-runtime-qnt-proofs.test.ts` for the
   self-discovering, per-module-timeout proof lane.
7. `plans/rules-kernel-coverage/README.md` "Outcome Oracle
   Disambiguation", `obligations.jsonl`, `qnt-owner-roles.jsonl`, and
   `generator-readiness.jsonl`.

Repo ground rules: pnpm only; do not run MBT exploratorily; generated QNT must
derive from existing QNT witness literals and QNT owner evaluation, never from
TypeScript runtime output; any sampled rule edge must remain traceable to SRD
text and `UBIQUITOUS_LANGUAGE.md` vocabulary.

## Problem Statement

Literal projection witnesses are the right per-trace shape for deterministic
battle-runtime scenarios: they keep simulated `*.mbt.qnt` files leaf-only, so
trace generation avoids re-instantiating a large behavioural import closure.
That design follows ADR-0001, but it leaves a value-connascence problem. A
literal witness states expected outcomes by hand while the owning QNT rule
module computes the same rule outcome elsewhere. Today the sync mechanism is
review discipline and comments such as the death-saving-throw witness note:
"If the death-save rule changes, update the literals here."

The typed witness protocol reduced frame noise and made the replay protocol
machine-readable, but it did not remove that duplicated rule outcome. The
repo needs an offline gate that asks, for each eligible literal witness sample:
"When the owning QNT rule module evaluates the same sample point, does it
produce the literal facts the witness asserts?"

This must not change the MBT trace path. Importing the rule owner into a
simulated witness would undo the performance reason literal witnesses exist.
The comparison belongs in the opt-in proof lane, where each proof module is
attributed, bounded by a hard timeout, and run consciously.

Measured facts from the research note and this worktree:

- Research baseline (2026-06-10): 106 battle-runtime `*.mbt.qnt` witnesses;
  89 were self-contained literal witnesses; about 18 were intentionally heavy
  computed-oracle drivers; about 6 protocol-only obligations had no computable
  outcome; coverable first-slice estimate was about 85 witnesses.
- Post typed-witness closeout (2026-06-11): 112 battle-runtime witnesses,
  19,868 witness lines, and zero mutable legacy protocol vars matching
  `qLastResult`, `qLastInvalidReason`, `qHoles`, or `qLastHoles`.
- The post-protocol corpus still has scenario projection labels in about 60
  files. Those labels are domain projection facts, not the old mutable
  protocol state; an extractor must treat them as witness-owned literals only
  when their action/state shape is mechanically understood.
- The registry now documents outcome-oracle disambiguation for multi-owner
  rows, but the first implementation slice remains single-`qntOwners`
  obligations. Multi-owner rows are a later milestone that must consume the
  Lane B convention rather than inventing a second mapping.

## Solution

Build an offline **witness literal-capture gate** that generates small QNT
proof modules from existing literal witnesses. The generator extracts the
sample fixture and per-action literal next-state facts from the post-PRD/04
witness AST, imports the selected QNT oracle, evaluates that oracle at the
same sample points, and emits `run test_*` assertions comparing oracle-derived
facts with the witness literals.

Recommended generated module shape:

- one generated proof module per eligible witness, named like
  `battle-runtime-<witness>-witness-samples-tests.qnt`;
- generated modules live in `packages/battle-runtime/` so the existing
  `test:qnt-proofs` lane discovers them by `run test_*` content;
- each module imports the QNT owner needed to compute the sampled outcome and
  any leaf vocabulary required to build the sample input;
- each `run` block names the witness action/sample edge it checks and asserts
  literal equality between oracle evaluation and the witness outcome facts;
- a deterministic check mode regenerates the modules and fails on drift, so
  committed generated output cannot become stale silently.

The first implementation slice is deliberately conservative:

- include only covered battle-runtime obligations with exactly one
  `qntOwners` path;
- include only parity witnesses whose `qntSpecPath` is a battle-runtime
  `*.mbt.qnt` literal witness using the typed `WitnessProtocol[h]` shape;
- exclude computed-oracle witnesses, protocol-only witnesses, selected
  identity rows whose QNT owner does not compute the sampled outcome, and any
  witness action whose AST shape is not mechanically extractable;
- fail closed with a typed skip/report reason instead of guessing.

The future multi-owner milestone may use the `plans/rules-kernel-coverage`
Outcome Oracle Disambiguation convention from BPK-B08:

1. If the selected parity witness declares `qntSpecPath`, that witness spec is
   the oracle for the captured trace.
2. Otherwise, use the first in-scope `generator-readiness.jsonl`
   `semanticCore` path.
3. Otherwise, use the first `obligations.jsonl` `qntOwners` path whose
   `qnt-owner-roles.jsonl` role is `semantic-core`.

That convention is not part of the first slice's eligibility rule. It is
recorded here so the later multi-owner task has one registry source of truth.
For this gate, the resolved path must still be an executable outcome oracle
for the sampled facts. If the convention resolves to the same literal witness
whose assertions are being checked, or to a proof/fixture that cannot compute
the sampled outcome independently, the row remains ineligible until the
registry is split or given a focused computable owner.

## User Stories

1. As a QNT witness maintainer, I want literal witnesses checked against their
   owning QNT rule modules, so that rule-owner changes cannot leave stale
   witness literals behind.
2. As a reviewer, I want generated proof modules instead of hand-written sample
   tests, so that literal outcomes are not copied a third time.
3. As an MBT maintainer, I want the capture check outside the per-trace path,
   so that literal witnesses stay fast and leaf-only.
4. As a registry maintainer, I want the gate to consume `obligations.jsonl`
   and role/readiness metadata, so that outcome-oracle selection is not a
   filename heuristic.
5. As a future Rust-harness author, I want QNT-to-QNT drift caught before
   cross-language replay, so that the copied witness corpus remains a reliable
   specification input.

## Implementation Decisions

- Generated proof modules are the chosen shape. A standalone TypeScript
  compare script would create separate CI behavior and weaker QNT-local
  diagnostics; hand-written sample tests would duplicate literals again.
- The generator may parse QNT with `quint parse --out` or an equivalent stable
  AST interface. It must not parse witness facts with ad hoc line splitting
  except for coarse candidate discovery.
- The generator reads QNT witnesses, QNT owners, and registry metadata. It
  never reads TypeScript reducer output as expected state.
- Generated files should carry a header naming the source witness, obligation
  id, chosen QNT oracle, and generation command. The header is provenance for
  the generated artifact, not a second registry.
- Check mode is required. It should regenerate to a temporary location or
  compare deterministic output in place and fail with a concise diff.
- The proof lane remains opt-in:
  `pnpm --filter @dnd/battle-runtime test:qnt-proofs`. Do not fold generated
  proof modules into the default `pnpm test` lane.
- The generator must emit no proof for ineligible witnesses. It reports the
  reason using a closed set such as `multi-qnt-owner`, `computed-oracle`,
  `protocol-only`, `missing-oracle`, or `unsupported-witness-ast`.
- Eligibility is derived from the existing registry and witness headers. Do
  not add a parallel manifest of supported witness ids unless it is generated
  from those sources.
- For sampled inputs carried through Quint picks, the generated proof must
  preserve the same sampled set from the witness. It must not widen samples or
  claim new coverage.

## Task Gates

These gates come directly from the research note and are acceptance blockers
for any implementation task spawned from this PRD:

- Do not build against the pre-PRD/04 parallel-var witness shape.
- Do not put literal capture, owner evaluation, or generated proof imports in
  the per-trace MBT path.
- Do not hand-write a third copy of witness literals as sample tests.
- Do not generate witness or oracle QNT from TypeScript runtime results.
- Do not include multi-`qntOwners` obligations in the first implementation
  slice.
- Do not guess an oracle when registry metadata is missing or ambiguous.
- Do not grow the MBT driver closure allowlist; generated proof modules are
  proof-lane artifacts, not simulated MBT drivers.

## Milestones

- **M1 - eligibility inventory and generator tracer.** Add the generator in
  report-only mode. It walks battle-runtime obligations, identifies
  single-`qntOwners` literal-witness candidates, reports excluded witnesses
  with typed reasons, and proves extraction on 2-3 small witnesses including
  death-saving-throw. No broad corpus generation until the report is reviewed.
- **M2 - generated proof modules for the first single-owner batch.** Emit and
  commit `*-witness-samples-tests.qnt` modules for the accepted M1 batch.
  Add a deterministic `--check` path and wire it into the package quality lane
  or the narrow battle-runtime verification lane chosen by the implementer.
- **M3 - single-owner drain.** Extend generation to all mechanically
  extractable single-`qntOwners` battle-runtime literal witnesses. Report the
  remaining excluded set and classify whether each exclusion is a real
  computed-oracle/protocol-only case or an extractor limitation.
- **M4 - multi-owner follow-up.** After M3 and owner review, consume the
  BPK-B08 outcome-oracle disambiguation convention for multi-owner rows. Any
  row still lacking one computable outcome oracle distinct from the captured
  literal source must be split, given a focused witness, or left out with a
  registry-visible reason.

## Testing Decisions

- Generator unit tests use small checked-in QNT fixtures for AST extraction:
  typed `qState` record initialization, `.with(...)` updates, `WitnessProtocol`
  result extraction, and picks-conditioned literals.
- Registry selection tests cover single-owner admission, multi-owner first
  slice rejection, computed-oracle rejection, and typed skip reasons.
- Generated proof modules are validated by
  `pnpm --filter @dnd/battle-runtime test:qnt-proofs`, not by MBT. The proof
  lane already discovers `run test_*` modules and hard-kills per-module
  runaways.
- If a generated proof imports a large owner and times out, treat it as a
  named proof-lane finding. Do not move that import into the MBT witness to
  make the proof cheaper.
- No focused MBT rerun is required for generator-only changes unless a
  witness or driver changes. If a task edits any `*.mbt.qnt` witness, run the
  paired focused MBT using the repo MBT protocol.

## Acceptance Criteria

- Report-only mode lists every battle-runtime parity witness considered,
  whether it is admitted, and the typed reason if it is excluded.
- First-slice generated modules cover only single-`qntOwners` obligations and
  name the obligation id, source witness, and QNT oracle in their generated
  header.
- Generated modules contain `run test_*` blocks and are discovered by
  `discoverProofModuleNames()`.
- `pnpm --filter @dnd/battle-runtime test:qnt-proofs` runs the generated
  modules and fails on literal/oracle drift with the generated module name in
  the failure.
- A deterministic generator check fails if committed generated modules are
  stale.
- No generated proof derives expected QNT facts from TypeScript output.
- No simulated `*.mbt.qnt` witness imports a behavioural owner because of this
  gate; `scripts/check-mbt-driver-closure.cjs` remains green without allowlist
  growth.

## Verification

1. Reviewer-loop convergence: run RAW traceability, ubiquitous-language/domain,
   architecture/connascence, and code-review passes after implementation;
   repeat until no reasonable findings remain. Reject findings only with a
   concrete written reason.
2. RAW/UL check: for each admitted witness sample, confirm the witness already
   cites or clearly traces to the SRD rule edge it samples, and check wording
   against `UBIQUITOUS_LANGUAGE.md`. This PRD models no new D&D rule; future
   implementation must verify the sampled witness facts, not invent new
   mechanics.
3. Oracle-direction audit: generated QNT assertions may come from witness QNT
   literals and QNT owner evaluation only. They must not consume TypeScript
   runtime state, TypeScript reducer results, or generated TS snapshots.
4. Connascence audit: the generator should weaken distant value-connascence
   between witness literals and QNT owners into a checked artifact. Confirm no
   new hand-maintained manifest or third literal copy recreates the same
   coupling.
5. Proof-lane audit: run the generated modules through
   `pnpm --filter @dnd/battle-runtime test:qnt-proofs`; if any module times
   out, record the owner import closure and either narrow eligibility or split
   the proof module rather than moving work into MBT.

## Out of Scope

- Changing witness semantics, driver assertions, or runtime reducer behavior.
- Converting computed-oracle drivers into literal witnesses.
- Adding new QNT coverage or new rules-kernel obligations.
- Multi-owner capture in the first implementation slice.
- Changing `@firfi/quint-connect`.
- Running capture in the MBT trace generator.
- Witnesses outside `packages/battle-runtime`.

## Further Notes

This PRD is intentionally a gate PRD, not an implementation patch. It accepts
the ADR-0001 tradeoff: literal projection witnesses stay fast because they do
not import behavioural owners per trace. The new work is an offline proof-lane
backstop that catches drift between those literals and their QNT outcome
oracles.

The first implementation task should report both coverage and exclusions:
how many witnesses were admitted, how many were rejected because they are
multi-owner rows, how many are computed-oracle/protocol-only by design, and
how many are blocked only by extractor support. That report is the input for
deciding whether M3 should broaden the extractor or whether M4 should consume
the BPK-B08 multi-owner convention next.
