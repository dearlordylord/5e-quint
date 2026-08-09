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
- Git HEAD: `962fa84620c1af79e94114c5bf96fd5e444f8ef4`
- Command: `pnpm coverage`
- Result: battle-runtime segment complete and green; overall workspace wrapper
  exit status unrecorded
- Total wall duration: unrecorded for this run
- Battle-runtime tests: 204/204 files passed; 2,166 tests passed and 53
  skipped (2,219 total)

| Metric     |                 `85869fc2` |                `07e9580b5` |                `962fa8462` | `07e` -> `962fa` covered / total |    Uncovered change |   Delta |
| ---------- | -------------------------: | -------------------------: | -------------------------: | -------------------------------: | ------------------: | ------: |
| Statements | 120,221 / 124,616 (96.47%) | 120,175 / 124,554 (96.48%) | 120,173 / 124,545 (96.48%) |                          -2 / -9 | 4,379 -> 4,372 (-7) | +0.00pp |
| Branches   |   29,979 / 32,143 (93.26%) |   29,966 / 32,121 (93.29%) |   29,977 / 32,131 (93.29%) |                        +11 / +10 | 2,155 -> 2,154 (-1) | +0.00pp |
| Functions  |       4,795 / 4,795 (100%) |       4,793 / 4,793 (100%) |       4,794 / 4,794 (100%) |                          +1 / +1 |              0 -> 0 |       0 |
| Lines      | 120,221 / 124,616 (96.47%) | 120,175 / 124,554 (96.48%) | 120,173 / 124,545 (96.48%) |                          -2 / -9 | 4,379 -> 4,372 (-7) | +0.00pp |

The statement/line percentage remained 96.48% and the branch percentage
remained 93.29% from the prior checkpoint; uncovered statements/lines fell by
7 and uncovered branches fell by 1. These are measured deltas from the
authoritative public run, not a forecast toward 99%. Denominator changes are
shown explicitly because production code changed between checkpoints.

## Remaining static 99% gaps

These are planning gaps at the current denominators. Recompute them after code
or instrumentation changes rather than treating them as a fixed work quota.

| Metric     | Covered |   Total | Covered required for 99% | Remaining gap |
| ---------- | ------: | ------: | -----------------------: | ------------: |
| Statements | 120,173 | 124,545 |                  123,300 |         3,127 |
| Branches   |  29,977 |  32,131 |                   31,810 |         1,833 |
| Functions  |   4,794 |   4,794 |                    4,747 |             0 |
| Lines      | 120,173 | 124,545 |                  123,300 |         3,127 |

## Milestone context

Since the prior authoritative checkpoint, `c99b55671` consolidated duplicate
object-target spell resource-spending protocols into one local closure. That
was connascence cleanup, not itself an uncovered-gap claim. Commit
`962fa8462` added admitted light-emitter projection witnesses for Sacred Weapon
and Starry Wisp, covering matching and mismatching target projections in tests;
it made no production-code change. Earlier commits `14a70bcf6` (Dancing Lights
reposition narrowing) and `07e9580b5` (light-emitter target matching) remain
part of the preceding milestone context. The public checkpoint now records 7
fewer uncovered statements/lines and 1 fewer uncovered branch than
`07e9580b5`.

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
