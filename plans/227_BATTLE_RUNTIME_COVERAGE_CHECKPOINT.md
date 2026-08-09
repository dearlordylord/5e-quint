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
- Git HEAD: `85869fc2f74f839a23118ad5ccdd35a7c4462dd3`
- Command: `pnpm coverage`
- Result: exit `0`
- Total wall duration: approximately 370 seconds
- Battle-runtime tests: 204/204 files passed; 2,166 tests passed and 53
  skipped (2,219 total)

| Metric     |                `927107abb` |                `85869fc2f` | Covered / total change |     Uncovered change |   Delta |
| ---------- | -------------------------: | -------------------------: | ---------------------: | -------------------: | ------: |
| Statements | 120,229 / 124,601 (96.49%) | 120,221 / 124,616 (96.47%) |                -8 / 15 | 4,372 -> 4,395 (+23) | -0.02pp |
| Branches   |   29,977 / 32,144 (93.25%) |   29,979 / 32,143 (93.26%) |                 2 / -1 |  2,167 -> 2,164 (-3) | +0.01pp |
| Functions  |       4,792 / 4,792 (100%) |       4,795 / 4,795 (100%) |                  3 / 3 |               0 -> 0 |       0 |
| Lines      | 120,229 / 124,601 (96.49%) | 120,221 / 124,616 (96.47%) |                -8 / 15 | 4,372 -> 4,395 (+23) | -0.02pp |

The statement/line percentage regressed by 0.02 percentage points. This is not
numeric progress toward 99%: the battle milestone improved correctness while
adding a net 13 production lines, and the resulting denominator and execution
changes increased uncovered statements/lines by 23.

## Remaining static 99% gaps

These are planning gaps at the current denominators. Recompute them after code
or instrumentation changes rather than treating them as a fixed work quota.

| Metric     | Covered |   Total | Covered required for 99% | Remaining gap |
| ---------- | ------: | ------: | -----------------------: | ------------: |
| Statements | 120,221 | 124,616 |                  123,370 |         3,149 |
| Branches   |  29,979 |  32,143 |                   31,822 |         1,843 |
| Functions  |   4,795 |   4,795 |                    4,748 |             0 |
| Lines      | 120,221 | 124,616 |                  123,370 |         3,149 |

## Milestone context

Since the prior authoritative checkpoint, `39fb9b632` made save-damage
application correlated and sequentially safe. Its review and regression tests
preserved earlier Warding Bond damage when a later direct target is the bond's
caster, and preserved once-per-turn spell-damage-reduction consumption. That
battle milestone improved correctness but produced a net 13-line production
increase and did not improve the statement/line percentage.

Commits `a86678455` and `85869fc2f` removed redundant real-catalog decoding and
per-test composition-graph loading from the MCP failure test, then isolated its
mocked catalog modules so they cannot leak into later MCP test files. Parallel
merge `8e4f55b7f` is part of the measured current HEAD context only; it is not
counted as issue #227 progress.

The public checkpoint records 23 more uncovered statements/lines and three
fewer uncovered branches than `927107abb`. Focused cohort uncovered counts
remain regression and navigation evidence, not a forecast of the global public
delta, because other public tests may already cover those arms. Only the full
public totals establish global movement. Continue from the current public
report, preserve behavior and Quint parity, and remeasure only after the next
coherent increment.

## Next campaign

Branches remain the limiting public metric at 93.26%, with a static 99% gap of
1,843. Select one branch-heavy checked-in battle-runtime owner from the public
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
