# Issue #227 battle-runtime coverage checkpoint

> **Continuity contract:** The canonical authority is
> [GitHub issue #227](https://github.com/dearlordylord/5e-quint/issues/227).
> This is a temporary, unindexed, issue-local continuity note. It is not a
> specification, acceptance owner, command owner, coverage framework, or second
> task ledger. Delete it when issue #227 reaches its 99% target. If final
> evidence is worth retaining, distill it into issue #227 before deleting this
> file.

Deleting this checkpoint does not authorize deleting or changing the approved
untracked `docs/research/` or `packages/battle-runtime/coverage_tmp*` artifacts.

## Measurement boundary

- The authoritative diagnostic is the public root `pnpm coverage` command.
- Only its checked-in instrumentation, exclusions, and package summaries count.
- Transient or retained custom coverage artifacts are not checkpoint authority.
- A raw `pnpm exec vitest run --coverage` diagnostic selected 349 files,
  including excluded MBT files. It was stopped and is invalid evidence.
- Per-function diagnostics must clone `coverageArguments` from
  `scripts/workspace-quality-harness.mjs`, including its MBT exclusion and
  production include/excludes, and run under the broad workspace lock.
- Distill any durable outcome into its owning documentation and delete this note
  when issue #227 reaches its 99% target.

The session log under `/tmp` is reboot-volatile and is not required to interpret
this checkpoint. The command, date, HEAD, result, duration, test counts, coverage
totals, and comparison below are the self-contained durable evidence.

## Current authoritative diagnostic

- Date: 2026-08-09
- Git HEAD: `07e9580b55dc8aa1edffae22ab7d8314184d6059`
- Command: `pnpm coverage`
- Result: exit `0`
- Total wall duration: approximately 342 seconds
- Battle-runtime tests: 204/204 files passed; 2,166 tests passed and 53
  skipped (2,219 total)

| Metric     |                 `85869fc2` |                `07e9580b5` | Covered / total change |     Uncovered change |   Delta |
| ---------- | -------------------------: | -------------------------: | ---------------------: | -------------------: | ------: |
| Statements | 120,221 / 124,616 (96.47%) | 120,175 / 124,554 (96.48%) |              -46 / -62 | 4,395 -> 4,379 (-16) | +0.01pp |
| Branches   |   29,979 / 32,143 (93.26%) |   29,966 / 32,121 (93.29%) |              -13 / -22 |  2,164 -> 2,155 (-9) | +0.03pp |
| Functions  |       4,795 / 4,795 (100%) |       4,793 / 4,793 (100%) |                -2 / -2 |               0 -> 0 |       0 |
| Lines      | 120,221 / 124,616 (96.47%) | 120,175 / 124,554 (96.48%) |              -46 / -62 | 4,395 -> 4,379 (-16) | +0.01pp |

The statement/line percentage improved by 0.01 percentage points and the branch
percentage improved by 0.03 percentage points. These are measured deltas from
the authoritative public run, not a forecast toward 99%.

## Remaining static 99% gaps

These are planning gaps at the current denominators. Recompute them after code
or instrumentation changes rather than treating them as a fixed work quota.

| Metric     | Covered |   Total | Covered required for 99% | Remaining gap |
| ---------- | ------: | ------: | -----------------------: | ------------: |
| Statements | 120,175 | 124,554 |                  123,309 |         3,134 |
| Branches   |  29,966 |  32,121 |                   31,800 |         1,834 |
| Functions  |   4,793 |   4,793 |                    4,746 |             0 |
| Lines      | 120,175 | 124,554 |                  123,309 |         3,134 |

## Milestone context

Since the prior authoritative checkpoint, `14a70bcf6` narrowed Dancing Lights
reposition plans and made correlated form/cardinality states explicit. Commit
`07e9580b5` unified duplicated light-emitter target identity matching. The
first milestone was production net -29 with focused 5/5 plus typecheck; the
second was production net -37 with focused illumination 5 files/71 tests plus
typecheck. Combined, they produced production net -66 and test net +35. The
public checkpoint records 16 fewer
uncovered statements/lines and nine fewer uncovered branches than `85869fc2`.

Focused cohort uncovered counts remain regression and navigation evidence, not a
forecast of the global public delta, because other public tests may already
cover those arms. Only the full public totals establish global movement.
Continue from the current public report, preserve behavior and Quint parity,
and remeasure only after the next coherent increment.

## Next campaign

Branches remain the limiting public metric at 93.29%, with a static 99% gap of
1,834. Select one branch-heavy checked-in battle-runtime owner from the public
report, audit its uncovered alternatives for schema-impossible or duplicated
logic, cover only behaviorally reachable alternatives with focused tests, and
then remeasure with the public root diagnostic.

## Verification and completion

1. Before changing a modeled rule, trace it to the relevant local SRD passage
   and `UBIQUITOUS_LANGUAGE.md`; after implementation, confirm that trace still
   holds.
2. Run focused tests and typechecks for the changed package. Run the relevant
   focused battle MBT only for completed behavior changes and follow the
   repository's locked MBT protocol.
3. Run RAW traceability, ubiquitous-language/domain, architecture/connascence,
   and code-review passes. Fix every reasonable finding and repeat until the
   reviewer loop converges, documenting only concretely rejected findings.
4. Run the public root `pnpm coverage` diagnostic and update this checkpoint from
   that output alone.
5. At the 99% target, run the public root `pnpm quality` gate, distill any
   durable result into issue #227 or its owning document, and delete only this
   temporary note. Deleting it does not authorize changing the approved
   untracked artifacts named above.
