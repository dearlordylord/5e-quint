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
- Git HEAD: `765158cb126b3f1a3be28e8926927ba64388814f`
- Command: `pnpm coverage`
- Result: exit `0`
- Total wall duration: 386 seconds
- Battle-runtime tests: 204/204 files passed; 2,163 tests passed and 53
  skipped (2,216 total)

| Metric     |                `d63d8ec1a` |                `765158cb1` | Covered / total change |     Uncovered change |   Delta |
| ---------- | -------------------------: | -------------------------: | ---------------------: | -------------------: | ------: |
| Statements | 120,166 / 124,610 (96.43%) | 120,126 / 124,537 (96.45%) |              -40 / -73 | 4,444 -> 4,411 (-33) | +0.02pp |
| Branches   |   30,011 / 32,189 (93.23%) |   29,995 / 32,163 (93.25%) |              -16 / -26 | 2,178 -> 2,168 (-10) | +0.02pp |
| Functions  |       4,795 / 4,795 (100%) |       4,796 / 4,796 (100%) |                  1 / 1 |               0 -> 0 |       0 |
| Lines      | 120,166 / 124,610 (96.43%) | 120,126 / 124,537 (96.45%) |              -40 / -73 | 4,444 -> 4,411 (-33) | +0.02pp |

## Remaining static 99% gaps

These are planning gaps at the current denominators. Recompute them after code
or instrumentation changes rather than treating them as a fixed work quota.

| Metric     | Covered |   Total | Covered required for 99% | Remaining gap |
| ---------- | ------: | ------: | -----------------------: | ------------: |
| Statements | 120,126 | 124,537 |                  123,292 |         3,166 |
| Branches   |  29,995 |  32,163 |                   31,842 |         1,847 |
| Functions  |   4,796 |   4,796 |                    4,749 |             0 |
| Lines      | 120,126 | 124,537 |                  123,292 |         3,166 |

## Milestone context

Since `d63d8ec1a`, issue #227 made `battleSubjectKey` family matching exhaustive,
replaced weak object-contact penalty parsing with typed projections, and made
reaction-attack damage resolution one typed transaction while correcting its
reaction/Concentration QNT parity.

The public checkpoint records 33 fewer uncovered statements/lines and 10 fewer
uncovered branches. Focused cohort uncovered counts are regression and
navigation evidence, not a forecast of the global public delta, because other
public tests may already cover those arms. Only the full public totals establish
global movement. Continue from the current public report, preserve behavior and
Quint parity, and remeasure only after the next coherent increment.

## Next campaign

Branches remain the limiting public metric at 93.25%, with a static 99% gap of
1,847. Select one branch-heavy checked-in battle-runtime owner from the public
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
