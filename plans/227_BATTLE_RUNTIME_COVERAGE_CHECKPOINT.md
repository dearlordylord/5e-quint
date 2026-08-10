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
- Git HEAD: `27e6c76f5838968fbe8382982dc5de45b622db8b`
- Command: `pnpm coverage`
- Result: exit 0; all workspace coverage packages complete and green
- Total wall duration: approximately 309 seconds
- Battle-runtime tests: 204/204 files passed; 2,175 tests passed and 53
  skipped (2,228 total)

| Metric     |                `51c201581` |                `8d879df10` |                `27e6c76f5` | `8d8` -> `27e` covered / total |     Uncovered change |   Delta |
| ---------- | -------------------------: | -------------------------: | -------------------------: | -----------------------------: | -------------------: | ------: |
| Statements | 120,172 / 124,529 (96.50%) | 120,472 / 124,876 (96.47%) | 120,487 / 124,878 (96.48%) |                       +15 / +2 | 4,404 -> 4,391 (-13) | +0.01pp |
| Branches   |   29,981 / 32,135 (93.29%) |   30,020 / 32,181 (93.28%) |   30,035 / 32,192 (93.29%) |                      +15 / +11 |  2,161 -> 2,157 (-4) | +0.01pp |
| Functions  |       4,794 / 4,794 (100%) |       4,811 / 4,811 (100%) |       4,819 / 4,819 (100%) |                        +8 / +8 |               0 -> 0 |       0 |
| Lines      | 120,172 / 124,529 (96.50%) | 120,472 / 124,876 (96.47%) | 120,487 / 124,878 (96.48%) |                       +15 / +2 | 4,404 -> 4,391 (-13) | +0.01pp |

The Vitest statement/line percentage rose to 96.48% and branches rose to
93.29%; uncovered statements/lines fell by 13 and uncovered branches by 4.
These are measured deltas from the authoritative public run, not a forecast
toward 99%. Denominator changes are shown explicitly because production code
changed between checkpoints. The branch ratchet rose from 92% to 93%; the
other ratchets were preserved and no threshold was lowered. Every other
executable package in this root run met all 99% metric thresholds;
battle-runtime is the only remaining package below acceptance.

## Remaining static 99% gaps

These are planning gaps at the current denominators. Recompute them after code
or instrumentation changes rather than treating them as a fixed work quota.

| Metric     | Covered |   Total | Covered required for 99% | Remaining gap |
| ---------- | ------: | ------: | -----------------------: | ------------: |
| Statements | 120,487 | 124,878 |                  123,630 |         3,143 |
| Branches   |  30,035 |  32,192 |                   31,871 |         1,836 |
| Functions  |   4,819 |   4,819 |                    4,771 |             0 |
| Lines      | 120,487 | 124,878 |                  123,630 |         3,143 |

## Milestone context

Since the prior authoritative checkpoint, `27e6c76f5` centralized caster-owned
active-effect writes and duplicate-free per-turn marker updates across
Moonbeam, Web, Sleet Storm, Insect Plague, and Cloudkill. It added a validated
Moonbeam marker-replay idempotence witness and raised the battle-runtime branch
ratchet from 92% to 93%. Focused lifecycle tests, package typecheck, the
Moonbeam/Web/Sleet Storm MBT lanes, Luna self-review, and an independent root
review all converged cleanly before the public run. The authoritative totals
above confirm numeric progress in both limiting metrics.

Focused cohort uncovered counts remain regression and navigation evidence, not
a forecast of the global public delta, because other public tests may already
cover those arms. Only the full public totals establish global movement.
Continue from the current public report, preserve behavior and Quint parity,
and remeasure only after the next coherent increment.

## Next campaign

Branches remain the limiting public metric at 93.29%, with a static 99% gap of
1,836. Clone the public harness arguments for a fresh package-local diagnostic,
select a different branch-heavy owner or cohesive subsystem from the completed
active-effect ledger campaign, audit its uncovered alternatives for
schema-impossible or duplicated logic, cover only behaviorally reachable
alternatives with focused tests, and then remeasure with the public root
diagnostic.

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
