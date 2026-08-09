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
- Distill any durable outcome into its owning documentation and delete this note
  when issue #227 reaches its 99% target.

The session log under `/tmp` is reboot-volatile and is not required to interpret
this checkpoint. The command, date, HEAD, result, duration, test counts, coverage
totals, and comparison below are the self-contained durable evidence.

## Current authoritative diagnostic

- Date: 2026-08-09
- Git HEAD: `3badb984d1457a1828e7aa7d246e0bf2db717edb`
- Command: `pnpm coverage`
- Result: exit `0`
- Total wall duration: 307 seconds
- Battle-runtime tests: 204/204 files passed; 2,163 tests passed and 53
  skipped (2,216 total)

| Metric     |                `246e7bc38` |                `3badb984d` | Covered / total change |     Uncovered change |   Delta |
| ---------- | -------------------------: | -------------------------: | ---------------------: | -------------------: | ------: |
| Statements | 120,176 / 124,647 (96.41%) | 120,226 / 124,676 (96.43%) |              +50 / +29 | 4,471 -> 4,450 (-21) | +0.02pp |
| Branches   |   30,046 / 32,247 (93.17%) |   30,028 / 32,213 (93.21%) |              -18 / -34 | 2,201 -> 2,185 (-16) | +0.04pp |
| Functions  |       4,783 / 4,783 (100%) |       4,795 / 4,795 (100%) |              +12 / +12 |               0 -> 0 |       0 |
| Lines      | 120,176 / 124,647 (96.41%) | 120,226 / 124,676 (96.43%) |              +50 / +29 | 4,471 -> 4,450 (-21) | +0.02pp |

## Remaining static 99% gaps

These are planning gaps at the current denominators. Recompute them after code
or instrumentation changes rather than treating them as a fixed work quota.

| Metric     | Covered |   Total | Covered required for 99% | Remaining gap |
| ---------- | ------: | ------: | -----------------------: | ------------: |
| Statements | 120,226 | 124,676 |                  123,430 |         3,204 |
| Branches   |  30,028 |  32,213 |                   31,891 |         1,863 |
| Functions  |   4,795 |   4,795 |                    4,748 |             0 |
| Lines      | 120,226 | 124,676 |                  123,430 |         3,204 |

## Milestone context

Since `246e7bc38`, issue #227 localized three branch-heavy protocols: persistent
area saves now preserve procedure correlation, Hideous Laughter repeat saves
share one lifecycle owner, and additional weapon attacks carry correlated
decision, roll, damage, and resource-use families. A provenance audit confirmed
the Hunter's Prey material is canonical SRD 5.2.1 content, resolving the
authored-identity concern without reclassification.

The public checkpoint records 21 fewer uncovered statements/lines and 16 fewer
uncovered branches. Continue from the current public report, preserve behavior
and Quint parity, and remeasure only after the next coherent increment.

## Next campaign

Branches remain the limiting public metric at 93.21%, with a static 99% gap of
1,863. Select one branch-heavy checked-in battle-runtime owner from the public
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
