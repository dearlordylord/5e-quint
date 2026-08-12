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
- Measured code tree committed as: `e50f910d7`
- Command: `pnpm coverage`
- Result: exit 0 under the original package timeouts
- Battle-runtime: 230/230 files passed; 2,443 passed and 115 skipped
- Every executable package other than battle-runtime remains at or above 99%
  for statements, branches, functions, and lines.

| Metric     |   Covered / total | Coverage | Uncovered | Gap to 99% |
| ---------- | ----------------: | -------: | --------: | ---------: |
| Statements | 122,468 / 125,596 |   97.50% |     3,128 |      1,873 |
| Branches   |   31,386 / 33,085 |   94.86% |     1,699 |      1,369 |
| Functions  |     4,855 / 4,855 |  100.00% |         0 |          0 |
| Lines      | 122,468 / 125,596 |   97.50% |     3,128 |      1,873 |

Recompute the 99% gaps after every production-denominator change.

## Latest accepted production milestone

M37 (`a04f2de74`, `3a49fb52d`, `7199532a6`) restores Battle Runtime's
100% function ratchet through the public codec boundary, removes one orphan
parser, and reconciles the Ready/Goblin MCP boundary. Independent reviews
converged; temporary app timeout increases were fully restored at `e50f910d7`.

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
- The current public gaps are 1,873 statements/lines and 1,369 branches.

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
