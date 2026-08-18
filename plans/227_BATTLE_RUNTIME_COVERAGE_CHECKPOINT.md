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
- The checked-in battle-runtime ratchets remain 97.9% statements, 97.9% lines,
  100% functions, and 95.6% branches; none has been lowered.

## Current authoritative baseline

- Date: 2026-08-17
- Measured battle-runtime production tree committed as: `f630a3669`
- Command: `pnpm coverage`
- Result: exit 0 under the original package timeouts
- Battle-runtime: 247/247 files passed; 2,665 passed / 129 skipped
- Every executable package other than battle-runtime remains at or above 99%
  for statements, branches, functions, and lines.

| Metric     |   Covered / total | Coverage | Uncovered | Gap to 99% |
| ---------- | ----------------: | -------: | --------: | ---------: |
| Statements | 126,807 / 129,352 |   98.03% |     2,545 |      1,252 |
| Branches   |   32,621 / 34,076 |   95.73% |     1,455 |      1,115 |
| Functions  |     5,087 / 5,087 |  100.00% |         0 |          0 |
| Lines      | 126,807 / 129,352 |   98.03% |     2,545 |      1,252 |

Recompute the 99% gaps after every production-denominator change.

## Current campaign

- Coverage work is active after the stored Ice Knife release milestone at
  `f630a3669`; finish it before resuming issue #254 complexity work.
- Select cohesive 150–300-counter domain slices from the public-policy
  production report; use at most two implementation lanes at once.
- Do not forge internal battle state to reach admission-proven or
  schema-impossible guards. Narrow or remove such guards only with concrete
  proof.
- The current public gaps are 1,252 statements/lines and 1,115 branches.

## Verification and completion

1. For a modeled-rule change, trace the rule to the local SRD and
   `UBIQUITOUS_LANGUAGE.md`; do not browse a substitute rules source.
2. At a reasonable milestone, run focused tests, package typecheck, formatting,
   lint, and any behavior-relevant locked MBT.
3. Require Luna self-review, then repeat independent RAW/domain,
   architecture/connascence, standards, and specification reviews until no
   reasonable findings remain.
4. Run public root `pnpm coverage` and update only this current baseline.
5. After every executable package reaches 99% on all four metrics, complete
   issue #254, run public root `pnpm quality`, record durable issue evidence,
   and delete this temporary checkpoint.
