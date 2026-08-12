# Issue #227 battle-runtime coverage checkpoint

> **Continuity contract:** GitHub issue #227 owns the requirements. This file
> is a temporary current-state handoff, not a history log or second task ledger.
> Git history owns completed-milestone detail. Delete this file when #227 is
> complete.

Deleting this checkpoint does not authorize deleting or changing the approved
untracked `docs/research/` or `packages/battle-runtime/coverage_tmp*` artifacts.

## Measurement boundary

- The authoritative diagnostic is the public root `pnpm coverage` command.
- Only checked-in instrumentation, exclusions, and package summaries count.
- Focused reports help attribute a milestone but do not replace the public run.
- Direct or filtered MBT commands must follow `docs/agents/QNT-MBT.md`.
- The checked-in battle-runtime ratchets remain 97% statements, 97% lines,
  100% functions, and 94% branches; none has been lowered.

## Current authoritative baseline

- Date: 2026-08-12
- Measured code tree committed as: `ffdafbefa`
- Command: `pnpm coverage`
- Result: exit 1; Battle Runtime missed its 100% function ratchet after the
  integrated denominator change; every test completed and no resource failure occurred
- Battle-runtime: 230/230 files passed; 2,436 passed and 115 skipped
- Every executable package other than battle-runtime remains at or above 99%
  for statements, branches, functions, and lines.

| Metric     |   Covered / total | Coverage | Uncovered | Gap to 99% |
| ---------- | ----------------: | -------: | --------: | ---------: |
| Statements | 122,446 / 125,630 |   97.46% |     3,184 |      1,928 |
| Branches   |   31,363 / 33,062 |   94.86% |     1,699 |      1,369 |
| Functions  |     4,846 / 4,857 |   99.77% |        11 |          0 |
| Lines      | 122,446 / 125,630 |   97.46% |     3,184 |      1,928 |

Recompute the 99% gaps after every production-denominator change.

## Latest accepted production milestone

M36 (`ffdafbefa`) covers Reaction spell/release lifecycle behavior and replaces
the ambiguous Ready/Glyph release options with typed lane requests. Integration
at `950e75c61` also changed the measured denominator; restore the 11-function
ratchet deficit before selecting the next 50-site statement/branch milestone.

## Current campaign

- Continue coverage before starting issue #254 cyclomatic-complexity work.
- Select cohesive public scenarios with at least 50 exact, nonduplicate,
  feasible residual sites from the public-policy production report before
  editing; reject test-support and smaller audit candidates.
- Do not forge internal battle state to reach admission-proven or
  schema-impossible guards. Narrow or remove such guards only with concrete
  proof.
- Avoid owners already marked completed or rejected in
  `/tmp/dnd-work-ownership.md`; that ledger owns live parallel coordination.
- The current public gaps are 1,928 statements/lines and 1,369 branches; the
  stricter checked-in function ratchet additionally requires all 11 functions.

## Verification and completion

1. For a modeled-rule change, trace the rule to the local SRD and
   `UBIQUITOUS_LANGUAGE.md`; do not browse a substitute rules source.
2. At a reasonable milestone, run focused tests, package typecheck, formatting,
   lint, and any behavior-relevant locked MBT.
3. Require Sol self-review, then repeat independent RAW/domain,
   architecture/connascence, standards, and specification reviews until no
   reasonable findings remain.
4. Run public root `pnpm coverage` and update only this current baseline.
5. After every executable package reaches 99% on all four metrics, complete
   issue #254, run public root `pnpm quality`, record durable issue evidence,
   and delete this temporary checkpoint.
