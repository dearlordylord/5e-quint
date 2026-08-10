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
- Git HEAD: `27d66ecc55bbed920ad1be0e2e434cf926c0781d`
- Command: `pnpm coverage`
- Result: exit 0; all workspace coverage packages complete and green
- Total wall duration: approximately 306 seconds
- Battle-runtime tests: 208/208 files passed; 2,227 tests passed and 53
  skipped (2,280 total)

| Metric     |                `83f3b531d` |                `eecbac3e5` |                `27d66ecc5` | `eecb` -> `27d6` covered / total |     Uncovered change |   Delta |
| ---------- | -------------------------: | -------------------------: | -------------------------: | -------------------------------: | -------------------: | ------: |
| Statements | 120,561 / 124,841 (96.57%) | 120,609 / 124,841 (96.61%) | 120,658 / 124,841 (96.64%) |                           49 / 0 | 4,232 -> 4,183 (-49) | +0.03pp |
| Branches   |   30,192 / 32,284 (93.52%) |   30,221 / 32,300 (93.56%) |   30,247 / 32,314 (93.60%) |                          26 / 14 | 2,079 -> 2,067 (-12) | +0.04pp |
| Functions  |       4,817 / 4,817 (100%) |       4,817 / 4,817 (100%) |       4,817 / 4,817 (100%) |                            0 / 0 |               0 -> 0 |       0 |
| Lines      | 120,561 / 124,841 (96.57%) | 120,609 / 124,841 (96.61%) | 120,658 / 124,841 (96.64%) |                           49 / 0 | 4,232 -> 4,183 (-49) | +0.03pp |

The Vitest statement/line percentage rose to 96.64% and branches rose to
93.60%; uncovered statements/lines fell by 49 and uncovered branches by 12.
These are measured deltas from the authoritative public run, not a forecast
toward 99%. Denominator changes are shown explicitly because production code
changed between checkpoints. The 93% branch ratchet and all other ratchets
were preserved; no threshold was lowered. Every other
executable package in this root run met all 99% metric thresholds;
battle-runtime is the only remaining package below acceptance.

## Remaining static 99% gaps

These are planning gaps at the current denominators. Recompute them after code
or instrumentation changes rather than treating them as a fixed work quota.

| Metric     | Covered |   Total | Covered required for 99% | Remaining gap |
| ---------- | ------: | ------: | -----------------------: | ------------: |
| Statements | 120,658 | 124,841 |                  123,593 |         2,935 |
| Branches   |  30,247 |  32,314 |                   31,991 |         1,744 |
| Functions  |   4,817 |   4,817 |                    4,769 |             0 |
| Lines      | 120,658 | 124,841 |                  123,593 |         2,935 |

## Milestone context

Since the prior authoritative checkpoint, `830270105` added a cohesive
reaction/interruption lifecycle cohort covering stale and active checkpoint
admission, multiple responders, handled and pending spell windows, multi-event
after-damage continuation, and triggered reaction-spell damage penalties and
Concentration saves. Luna completed two review rounds. Root review then removed
`Map` insertion-order coupling, tied the synthetic penalty to its concentrating
damager, and asserted the reduced damage amount and exact HP in `27d66ecc5`.
Focused tests, package typecheck, two Luna review rounds, and the repeated
independent root review all converged cleanly before the public run.

Focused cohort uncovered counts remain regression and navigation evidence, not
a forecast of the global public delta, because other public tests may already
cover those arms. Only the full public totals establish global movement.
Continue from the current public report, preserve behavior and Quint parity,
and remeasure only after the next coherent increment.

## Next campaign

Branches remain the limiting public metric at 93.60%, with a static 99% gap of
1,744. Clone the public harness arguments for a fresh package-local diagnostic,
select a different branch-heavy owner or cohesive subsystem from the completed
save-gate, active-effect-ledger, persistent-spatial, ongoing-feature admission,
act-composition, attack-projection, attack-pipeline, and spell-damage-fill
campaigns, plus character battle resources and the Chained Spell resolver.
Audit its uncovered alternatives for schema-impossible or duplicated logic,
cover only behaviorally reachable alternatives with focused tests, and then
remeasure with the public root diagnostic.

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
