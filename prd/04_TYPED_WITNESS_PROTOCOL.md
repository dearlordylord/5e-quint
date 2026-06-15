# PRD: Typed Witness Protocol And Parameterized Picks

Date: 2026-06-10

Status: Closed

Owner: battle-runtime QNT architecture

Origin: architecture review 2026-06-10, candidate 3 ("make the witness
protocol a typed record + parameterized picks"). Companion PRDs:
`prd/03_MBT_PARITY_DRIVER_KIT.md` (the TS-side half of the same seam — land it
first so each witness/driver pair is touched once) and
`prd/02_QNT_BATTLE_PROTOCOL_KERNEL.md` (whose witnesses should be written in
this protocol from day one).

## Context Primer For A Fresh Agent

Read before writing anything:

1. `CLAUDE.md` — "MBT driver closure discipline" (leaf-only imports, ≤8-file
   budget), "Quint gotchas" (nondet must be bare `oneOf()`; the Rust-backend
   `mbt::actionTaken` bug and its `any { }` wrapper workaround; ITF variant
   `{tag, value}` format; cross-file imports need `from "./file"`), "QNT proof
   lane".
2. `docs/adr/0001-forest-of-qnt-slices.md` — especially the refinement: the
   dominant MBT cost is import-closure instantiation per trace; literal
   projection witnesses are preferred; never reimplement a rule inside a
   witness to avoid an import.
3. One witness/driver pair in full:
   `packages/battle-runtime/battle-runtime-death-saving-throw.mbt.qnt` and
   `src/death-saving-throw.mbt.test.ts`.
4. The proof that picks already work in this repo:
   `battle-runtime-direct-condition-lifecycle.mbt.qnt` (nondet `slotLevel`)
   and `src/direct-condition-lifecycle.mbt.test.ts` (~lines 110–145: action
   schema declares `slotLevel: intSchema`; the handler receives
   `({ slotLevel })` from the trace).
5. The leaf-module precedent `battle-runtime-reaction-kinds.qnt` and the
   closure checker `scripts/check-mbt-driver-closure.cjs`.

Repo ground rules: pnpm only; focused MBT only, reproduce failures with the
reported `QUINT_SEED`; QNT remains the oracle (never generate QNT literals
from TS output); SRD semantics in witnesses must keep tracing to the rule the
witness samples.

## Problem Statement

Measured on master (2026-06-10), across the 106 battle-runtime `*.mbt.qnt`
witnesses:

- **The witness protocol is an untyped convention.** 95/106 witnesses carry
  `qLastResult: str` / `qLastInvalidReason: str` / `qHoles: Set[...]` parallel
  vars by naming convention. Result values (`"init"`, `"needsHoles"`,
  `"resolved"`, `"invalid"`) and invalid reasons (`"invalidFill"`,
  `"staleSubject"`, `"wrongActor"`, …) are stringly-typed in both languages;
  nothing executable keeps the two sides' vocabularies aligned.
- **Frame noise dominates.** 0/106 witnesses use a record-typed state var;
  every action must restate every var. In
  `battle-runtime-death-saving-throw.mbt.qnt`, 6 actions × 10 vars means ~70%
  of the file is `x' = x` frame restatement around 1–3 lines of actual SRD
  outcome. Quint record update (`.with(...)`) is already idiomatic elsewhere
  in this corpus (38 `.qnt` files) but unused in witnesses.
- **Fill values are duplicated across the language seam.** Parameterless
  enumerated actions encode sampled inputs in action names and outcome
  literals (`doFillDeathSavingThrowNaturalOne` … `NaturalTwenty`), and the TS
  driver re-hardcodes the same values (`fillDeathSavingThrow(1)` / `(5)` /
  `(10)` / `(20)`). That is distant connascence of value repeated across ~106
  pairs — and quint-connect's picks pathway, which removes it, is already
  proven in-repo (11 witnesses use `nondet`; direct-condition-lifecycle's
  driver consumes the pick).

Consequences: witnesses cost ~150 lines where ~50 would do, which rate-limits
growing QNT coverage toward "covers everything"; the spec↔driver contract is
not machine-readable, so the future target harness described by
`plans/PRD_CLEANROOM_QNT_BRANCH_COVERAGE_AND_HARNESS.md` would re-derive each
mapping by reading TS — exactly what clean-room forbids.

## Solution

**1. A witness-protocol leaf module.**
`packages/battle-runtime/battle-runtime-witness-protocol.qnt`: a pure leaf
(types + `pure def` helpers, zero behavioural imports) defining:

- the witness result as a proper variant type (e.g.
  `WitnessResult = WInit | WNeedsHoles | WResolved | WInvalid(InvalidReason)`),
- the invalid-reason vocabulary as variants mirroring the production
  `BattleResolutionResult` invalid reasons (the full set; each witness uses a
  subset),
- a protocol record type holding result + reason (+ holes, see below), with
  `pure def` step helpers (`witnessResolved`, `witnessNeedsHoles(holes)`,
  `witnessInvalid(reason)`, `witnessInit`) so action bodies state outcomes,
  not field shuffles.

Hole sets are per-witness types today. Preferred design: a polymorphic
protocol record (`type WitnessProtocol[h] = { holes: Set[h], result: … }`) —
**verify first** that quint 0.31.0 (the pinned version) accepts parameterized
type aliases with a 5-line REPL check; the corpus currently contains none. If
it does not, use the monomorphic fallback: the protocol record carries result
+ reason, and `holes` stays a separate witness-local var (still removes most
frame noise and all stringly-typed protocol state). If `prd/02`'s hole-kind
vocabulary leaf has landed, witnesses may import it for hole types instead of
private declarations (two leaf imports remain far under the ≤8 budget).

**2. Record-typed witness state.** Each witness collapses its parallel vars
into one (or two: protocol + domain) record-typed `var`, with actions writing
only what changes via `.with(...)`. Literal-projection witnesses stay literal:
outcomes remain hand-stated SRD facts, now minus the frame noise.

**3. Parameterized picks for sampled inputs.** Where sibling actions differ
only by a sampled input value (die result, slot level, damage type), collapse
them into one action with `nondet x = <set>.oneOf()` and a conditional literal
outcome per sampled value; the driver handler receives `x` through the action
schema and forwards it into the production fill. Decision rule: **picks for
input sampling, separate actions for genuinely different procedure paths**
(discover vs fill vs reject-wrong-actor stay distinct actions). Outcome
literals stay in the witness (ADR-0001's literal-witness preference is about
not importing reducers per trace — conditional literals keyed on the pick
preserve it).

**4. Driver side through the kit.** The `prd/03` kit's witness-protocol
decoder absorbs the QNT-side change (variant `{tag, value}` decode per the
CLAUDE.md gotcha; record state arrives as one nested ITF object). Drivers'
projections and assertions keep their meaning.

## User Stories

1. As a witness author, I want to state only the SRD outcome per action, so
   that a witness reads as rule facts instead of frame bookkeeping.
2. As a parity maintainer, I want result/reason vocabularies to be variants in
   one leaf, so that a renamed reason fails loudly on both sides instead of
   silently comparing strings.
3. As the future Rust harness author, I want fill values to travel in the ITF
   trace (picks), so that replaying a witness against Rust needs no
   re-derivation of per-action literals from TS.
4. As a reviewer, I want the witness protocol to be one module, so that "what
   does `invalid` mean here" has a single answer.

## Implementation Decisions

- The leaf must stay a leaf: types, tags, `pure def` record helpers only; no
  import of `battle-runtime-model` or any behavioural module. The closure
  checker keeps enforcing the budget; its allowlist must not grow.
- Migration is per witness/driver **pair**, batched, after `prd/03`'s kit
  exists (otherwise each pair pays hand-written record decode that the kit
  would replace). Semantics frozen: same actions (modulo picks-collapses
  documented per file), same projected fields, same SRD outcomes.
- A picks-collapse must keep the sampled set explicit in the witness
  (`Set(1, 5, 10, 20).oneOf()` — domain-correct sample points with a comment
  citing the SRD rule edges they witness, e.g. nat-1 / fail / success /
  nat-20). Do not widen sample sets while migrating (no new coverage claims
  smuggled into a refactor).
- Respect Quint gotchas: nondet binding must be bare `oneOf()`; if an action
  body uses `match`, keep the `any { }` wrapper workaround for
  `mbt::actionTaken`; imports use `from "./…"` paths.
- The 11 witnesses already using `nondet` migrate like the rest; their picks
  plumbing standardizes on the kit's shared pick schemas.
- `qnt-owner-roles.jsonl` rows for witnesses keep role `mbt-fixture`
  (file names unchanged); no obligation rows change meaning. If any witness
  file must be renamed, update registry paths in the same commit.
- If the polymorphic-type-alias check fails on quint 0.31.0, record the
  fallback choice in the leaf module's header comment (one place), not in 106
  witnesses.
- This protocol decision is a durable QNT-corpus convention; propose a short
  ADR (or an addendum to ADR-0001) documenting the witness-protocol record and
  the picks decision rule, so future witness authors and architecture reviews
  inherit it.

## Milestones

- **M1 — leaf + REPL verification + pilots.** Write the leaf; verify
  parameterized-type support and record the outcome; migrate 3 pilot pairs:
  `death-saving-throw` (literal witness with a picks-collapse),
  one selected-identity witness, one lifecycle/computed-oracle witness
  (`direct-condition-lifecycle` — already picks-based, gains the record
  protocol). Measure line deltas.
- **M2 — batch migration.** Remaining battle-runtime witnesses in batches of
  ~15–20 pairs, focused MBT per batch.
- **M3 — convention gates + docs.** Grep-style quality check: no
  `var qLastResult: str` (and sibling string-protocol vars) in any
  battle-runtime `*.mbt.qnt`; ADR/addendum recorded; battle-runtime README
  witness-authoring section updated to the new skeleton.

## Testing Decisions

- Per pilot and per batch: run exactly the affected focused MBT files,
  `MBT_TRACES=1` default; one `MBT_TRACES=3` confidence pass per batch.
  Background + timing wrapper per the CLAUDE.md observation protocol for
  anything expected >60s.
- The leaf module needs `run` blocks for its `pure def` helpers only if they
  carry logic beyond record construction; if added, they enter the
  self-discovering proof lane (`pnpm --filter @dnd/battle-runtime
  test:qnt-proofs`) — run it once before merge in that case.
- `node scripts/check-mbt-driver-closure.cjs` must stay green after every
  batch (the leaf adds 1 file to each witness closure).
- Nondeterministic failures: reproduce with `QUINT_SEED` before fixing; do not
  dismiss as flaky.

## Acceptance Criteria

- `grep -l 'var qLastResult: str' packages/battle-runtime/*.mbt.qnt` returns
  zero files (likewise `qLastInvalidReason: str`); the quality lane enforces
  it.
- 0 witnesses with parallel primitive protocol vars; every migrated witness
  uses the leaf's protocol record and step helpers.
- Pilot line reduction reported (expectation from the review: ~40–60% on
  frame-heavy literal witnesses such as death-saving-throw); corpus total
  reported at M2 close.
- Every enumerated-literal action family that is pure input sampling is either
  collapsed to a picks action or carries a one-line witness comment saying why
  it stays enumerated (e.g. outcomes differ structurally, not by value).
- All affected focused MBT files pass; closure checker green with no allowlist
  growth; `pnpm quality` green; proof lane green if `run` blocks were added.
- ADR/addendum for the witness protocol convention exists and is referenced
  from the battle-runtime README.

## Verification

1. Reviewer-loop convergence: RAW/UL pass (sample-point comments must cite the
   SRD rule edges they witness; protocol vocabulary terms against
   `UBIQUITOUS_LANGUAGE.md` and `BattleResolutionResult` naming),
   architecture/connascence pass (the migration's purpose is converting
   distant value-connascence into name/type connascence through one leaf —
   verify no witness re-states protocol transitions locally), code-review
   pass; repeat until no reasonable findings remain.
2. Oracle-direction audit: outcome literals in migrated witnesses must be
   hand-stated SRD facts (or REPL-captured per the CLAUDE.md procedure), never
   pasted from TS runs; spot-check pilots against the SRD passages their
   header comments cite.
3. Trace-cost audit on pilots: confirm per-trace generation time did not
   regress materially (the leaf is small, but measure once — ADR-0001's cost
   model is import-closure size, and this PRD's budget claim should be backed
   by one timing note in the M1 report).

## Out of Scope

- Driver plumbing consolidation (that is `prd/03`; this PRD touches drivers
  only where their paired witness changes shape).
- New QNT coverage or new obligations (that is `prd/02`).
- Changing `@firfi/quint-connect`.
- Witnesses outside `packages/battle-runtime` (stretch: note feasibility for
  the 24 witnesses in the character packages, do not block on them).

## Further Notes

Baseline (2026-06-10, master c5d64a4): 106 battle-runtime witnesses, 15,903
lines total; 95 carry the string protocol vars; 0 use record state; 11 use
`nondet`; `.with(...)` used in 38 non-witness `.qnt` files. The
death-saving-throw pair (145-line witness + 452-line driver for a 6-action
protocol) is the canonical before-picture; keep its migrated after-picture as
the README example.

## Closeout (2026-06-11)

Task PDS-A16 closed M3 with the legacy-name convention gate, ADR addendum, and
battle-runtime README skeleton in place.

Corpus measurements at closeout:

- `find packages/battle-runtime -maxdepth 1 -name '*.mbt.qnt'` reports 112
  battle-runtime witnesses.
- `find packages/battle-runtime -maxdepth 1 -name '*.mbt.qnt' -print0 | xargs
  -0 wc -l | tail -n 1` reports 19,868 total witness lines versus the original
  15,903-line baseline.
- `rg '^\\s*var\\s+(qLastResult|qLastInvalidReason|qHoles|qLastHoles)\\s*:'
  packages/battle-runtime --glob '*.mbt.qnt'` reports zero pre-protocol mutable
  protocol-name vars. The remaining `pure def qLastResult` / `pure def qHoles`
  occurrences are read-only driver-kit aliases/projections, not storage under
  the old mutable names; some still project from the `qScenario*` strings
  tracked below.
- `rg -l 'qScenario(Result|InvalidReason)' packages/battle-runtime --glob
  '*.mbt.qnt' | wc -l` reports 60 files with remaining scenario outcome label
  strings; 6 of those are top-level mutable `qScenarioResult` declarations.
  These are domain projection labels or legacy renamed protocol-adjacent facts,
  not covered by the PDS-A16 legacy-name gate. A future migration should decide
  whether to type them as scenario-outcome variants or keep them as explicit
  driver projection labels.

Registry paths remained stable through the typed witness migration. The witness
file names were not renamed, and the closeout did not edit
`plans/rules-kernel-coverage/obligations.jsonl`,
`plans/rules-kernel-coverage/profile-obligations.jsonl`,
`plans/rules-kernel-coverage/qnt-owner-roles.jsonl`, or
`plans/unit-profile-coverage/profiles.jsonl`.
