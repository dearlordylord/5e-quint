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
- Git HEAD: `927107abb4d035795acff00aedad2b7c17bd8560`
- Command: `pnpm coverage`
- Result: exit `0`
- Total wall duration: approximately 554 seconds
- Battle-runtime tests: 204/204 files passed; 2,164 tests passed and 53
  skipped (2,217 total)

| Metric     |                `765158cb1` |                `927107abb` | Covered / total change |     Uncovered change |   Delta |
| ---------- | -------------------------: | -------------------------: | ---------------------: | -------------------: | ------: |
| Statements | 120,126 / 124,537 (96.45%) | 120,229 / 124,601 (96.49%) |               103 / 64 | 4,411 -> 4,372 (-39) | +0.04pp |
| Branches   |   29,995 / 32,163 (93.25%) |   29,977 / 32,144 (93.25%) |              -18 / -19 |  2,168 -> 2,167 (-1) | +0.00pp |
| Functions  |       4,796 / 4,796 (100%) |       4,792 / 4,792 (100%) |                -4 / -4 |               0 -> 0 |       0 |
| Lines      | 120,126 / 124,537 (96.45%) | 120,229 / 124,601 (96.49%) |               103 / 64 | 4,411 -> 4,372 (-39) | +0.04pp |

An intermediate public run at `7233982d4` reported 4,792 / 4,795 functions.
That was a corrected dead-function regression, not authoritative evidence; the
authoritative HEAD above restores 4,792 / 4,792 functions (100%).

## Remaining static 99% gaps

These are planning gaps at the current denominators. Recompute them after code
or instrumentation changes rather than treating them as a fixed work quota.

| Metric     | Covered |   Total | Covered required for 99% | Remaining gap |
| ---------- | ------: | ------: | -----------------------: | ------------: |
| Statements | 120,229 | 124,601 |                  123,355 |         3,126 |
| Branches   |  29,977 |  32,144 |                   31,823 |         1,846 |
| Functions  |   4,792 |   4,792 |                    4,745 |             0 |
| Lines      | 120,229 | 124,601 |                  123,355 |         3,126 |

## Milestone context

Since `765158cb1`, issue #227 added the chained zero-Hit-Point replay scenario;
made stored-glyph releases parse once into correlated execution variants and
removed the obsolete downstream guards; introduced typed Dancing Lights plans
with one route-enrichment owner; and used correctness review to fix the route
witness and the dead-function regression.

The public checkpoint records 39 fewer uncovered statements/lines and one fewer
uncovered branch. Focused cohort uncovered counts remain regression and
navigation evidence, not a forecast of the global public delta, because other
public tests may already cover those arms. Only the full public totals establish
global movement. Continue from the current public report, preserve behavior and
Quint parity, and remeasure only after the next coherent increment.

## Next campaign

Branches remain the limiting public metric at 93.25%, with a static 99% gap of
1,846. Select one branch-heavy checked-in battle-runtime owner from the public
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
