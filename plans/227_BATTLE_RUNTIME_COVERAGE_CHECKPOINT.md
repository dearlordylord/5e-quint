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
- Git HEAD: `246e7bc38e054d3acd28cb125392e88df40d5ceb`
- Command: `pnpm coverage`
- Result: exit `0`
- Observed test-execution span: approximately 303 seconds
- Battle-runtime tests: 204 files passed; 2,162 tests passed and 53 skipped

| Metric     |                `9ac5cc080` |                `246e7bc38` | Covered / total change |     Uncovered change |
| ---------- | -------------------------: | -------------------------: | ---------------------: | -------------------: |
| Statements | 120,140 / 124,654 (96.37%) | 120,176 / 124,647 (96.41%) |               +36 / -7 | 4,514 -> 4,471 (-43) |
| Branches   |   30,004 / 32,230 (93.09%) |   30,046 / 32,247 (93.17%) |              +42 / +17 | 2,226 -> 2,201 (-25) |
| Functions  |       4,782 / 4,782 (100%) |       4,783 / 4,783 (100%) |                +1 / +1 |               0 -> 0 |
| Lines      | 120,140 / 124,654 (96.37%) | 120,176 / 124,647 (96.41%) |               +36 / -7 | 4,514 -> 4,471 (-43) |

Every other package remained at or above 99% on every metric. The lowest
observed non-battle-runtime results were 99.26% statements/lines, 99.00%
branches, and 99.44% functions.

## Remaining static 99% gaps

These are planning gaps at the current denominators. Recompute them after code
or instrumentation changes rather than treating them as a fixed work quota.

| Metric     | Covered |   Total | Covered required for 99% | Remaining gap |
| ---------- | ------: | ------: | -----------------------: | ------------: |
| Statements | 120,176 | 124,647 |                  123,401 |         3,225 |
| Branches   |  30,046 |  32,247 |                   31,925 |         1,879 |
| Functions  |   4,783 |   4,783 |                    4,736 |             0 |
| Lines      | 120,176 | 124,647 |                  123,401 |         3,225 |

## Milestone context

Since `9ac5cc080`, issue #227 work concentrated unit-feature admission around
decoded Surface shapes and precise private projections. The increment covered
resistance, self-healing defaults, Abjure level handling, ongoing lifecycle,
weapon filters, resource pools, Wild Shape known-form admission, and
Defense/Archery fixed-dice admission without retaining coverage-only public APIs,
parallel registries, or throwing authored-data accessors.

The public checkpoint records a net reduction of 43 uncovered statements/lines
and 25 uncovered branches. Continue from the current public report, preserve
behavior and Quint parity, and remeasure only after the next coherent increment.

## Next campaign

Branches remain the limiting public metric at 93.17%, with a static 99% gap of
1,879. Select one branch-heavy checked-in battle-runtime owner from the public
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
