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
- Git HEAD: `8d879df10171de33b94f195936743d0e93747e82`
- Command: `pnpm coverage`
- Result: exit 0; all workspace coverage packages complete and green
- Total wall duration: approximately 311 seconds
- Battle-runtime tests: 204/204 files passed; 2,174 tests passed and 53
  skipped (2,227 total)

| Metric     |                `962fa8462` |                `51c201581` |                `8d879df10` | `51c` -> `8d8` covered / total |     Uncovered change |   Delta |
| ---------- | -------------------------: | -------------------------: | -------------------------: | -----------------------------: | -------------------: | ------: |
| Statements | 120,173 / 124,545 (96.48%) | 120,172 / 124,529 (96.50%) | 120,472 / 124,876 (96.47%) |                    +300 / +347 | 4,357 -> 4,404 (+47) | -0.03pp |
| Branches   |   29,977 / 32,131 (93.29%) |   29,981 / 32,135 (93.29%) |   30,020 / 32,181 (93.28%) |                      +39 / +46 |  2,154 -> 2,161 (+7) | -0.01pp |
| Functions  |       4,794 / 4,794 (100%) |       4,794 / 4,794 (100%) |       4,811 / 4,811 (100%) |                      +17 / +17 |               0 -> 0 |       0 |
| Lines      | 120,173 / 124,545 (96.48%) | 120,172 / 124,529 (96.50%) | 120,472 / 124,876 (96.47%) |                    +300 / +347 | 4,357 -> 4,404 (+47) | -0.03pp |

The Vitest statement/line percentage fell to 96.47% and branches fell to
93.28%; uncovered statements/lines increased by 47 and uncovered branches by 7. These are measured deltas from the authoritative public run, not a forecast
toward 99%. Denominator changes are shown explicitly because production code
changed between checkpoints. The existing integer ratchets were preserved and
no threshold was lowered. Every other executable package in this root run met
all 99% metric thresholds; battle-runtime is the only remaining package below
acceptance.

## Remaining static 99% gaps

These are planning gaps at the current denominators. Recompute them after code
or instrumentation changes rather than treating them as a fixed work quota.

| Metric     | Covered |   Total | Covered required for 99% | Remaining gap |
| ---------- | ------: | ------: | -----------------------: | ------------: |
| Statements | 120,472 | 124,876 |                  123,628 |         3,156 |
| Branches   |  30,020 |  32,181 |                   31,860 |         1,840 |
| Functions  |   4,811 |   4,811 |                    4,763 |             0 |
| Lines      | 120,472 | 124,876 |                  123,628 |         3,156 |

## Milestone context

Since the prior authoritative checkpoint, `4702e762f` corrected readied spell
release against object targets and consolidated the corresponding public and
MBT scenario sequence. `982115d69` narrowed validated Grease and Sleep area
outcomes, centralized nine failed-save target projections, and added successful
and mixed-target Grease appearance-save witnesses. Root review in `8d879df10`
moved that projection to one saving-throw outcome owner and reused it across
the remaining exact production copies in spell, feature, and route reducers.
The readied-object milestone received focused QNT and MBT evidence; the
save-gate milestone received the save-ordering and condition-saving-throw MBT
lanes. Both received focused tests, package typecheck, and reviewer-loop
convergence. The authoritative totals above show that the combined unmeasured
interval did not produce numeric progress toward 99% despite preserving the
configured ratchets.

Focused cohort uncovered counts remain regression and navigation evidence, not
a forecast of the global public delta, because other public tests may already
cover those arms. Only the full public totals establish global movement.
Continue from the current public report, preserve behavior and Quint parity,
and remeasure only after the next coherent increment.

## Next campaign

Branches remain the limiting public metric at 93.28%, with a static 99% gap of
1,840. Do not continue the just-measured save-gate campaign without fresh
file-level evidence: its focused diagnostic improved while the authoritative
aggregate regressed over the wider interval. Clone the public harness arguments
for a fresh package-local diagnostic, select a different branch-heavy owner or
cohesive subsystem, audit its uncovered alternatives for schema-impossible or
duplicated logic, cover only behaviorally reachable alternatives with focused
tests, and then remeasure with the public root diagnostic.

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
