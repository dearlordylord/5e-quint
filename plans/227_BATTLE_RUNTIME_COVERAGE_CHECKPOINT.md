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
- Git HEAD: `7c1e26306c3382c4122a40850e67b7fdb381db82`
- Command: `pnpm coverage`
- Result: exit 0; all workspace coverage packages complete and green
- Total wall duration: approximately 322 seconds
- Battle-runtime tests: 204/204 files passed; 2,175 tests passed and 53
  skipped (2,228 total)

| Metric     |                `8d879df10` |                `27e6c76f5` |                `7c1e26306` | `27e` -> `7c1` covered / total |    Uncovered change |   Delta |
| ---------- | -------------------------: | -------------------------: | -------------------------: | -----------------------------: | ------------------: | ------: |
| Statements | 120,472 / 124,876 (96.47%) | 120,487 / 124,878 (96.48%) | 120,483 / 124,868 (96.48%) |                       -4 / -10 | 4,391 -> 4,385 (-6) | +0.00pp |
| Branches   |   30,020 / 32,181 (93.28%) |   30,035 / 32,192 (93.29%) |   30,027 / 32,181 (93.30%) |                       -8 / -11 | 2,157 -> 2,154 (-3) | +0.01pp |
| Functions  |       4,811 / 4,811 (100%) |       4,819 / 4,819 (100%) |       4,819 / 4,819 (100%) |                          0 / 0 |              0 -> 0 |       0 |
| Lines      | 120,472 / 124,876 (96.47%) | 120,487 / 124,878 (96.48%) | 120,483 / 124,868 (96.48%) |                       -4 / -10 | 4,391 -> 4,385 (-6) | +0.00pp |

The Vitest statement/line percentage remained at 96.48% and branches rose to
93.30%; uncovered statements/lines fell by 6 and uncovered branches by 3.
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
| Statements | 120,483 | 124,868 |                  123,620 |         3,137 |
| Branches   |  30,027 |  32,181 |                   31,860 |         1,833 |
| Functions  |   4,819 |   4,819 |                    4,771 |             0 |
| Lines      | 120,487 | 124,878 |                  123,630 |         3,143 |

## Milestone context

Since the prior authoritative checkpoint, `7c1e26306` passed already-proved
`BattleCreatureState` targets into Flaming Sphere and Moonbeam damage
application and reused the admitted Web effect after marking it. This removed
impossible second lookups and their fallback branches without changing rule or
hole/fill semantics. Focused runtime tests, package typecheck, the mapped
Flaming Sphere/Moonbeam/Web MBT lanes, four Luna review rounds, and an
independent root review all converged cleanly before the public run. The
authoritative totals above confirm further numeric progress in both limiting
metrics.

Focused cohort uncovered counts remain regression and navigation evidence, not
a forecast of the global public delta, because other public tests may already
cover those arms. Only the full public totals establish global movement.
Continue from the current public report, preserve behavior and Quint parity,
and remeasure only after the next coherent increment.

## Next campaign

Branches remain the limiting public metric at 93.30%, with a static 99% gap of
1,833. Clone the public harness arguments for a fresh package-local diagnostic,
select a different branch-heavy owner or cohesive subsystem from the completed
save-gate, active-effect-ledger, and persistent-spatial campaigns, audit its
uncovered alternatives for schema-impossible or duplicated logic, cover only
behaviorally reachable alternatives with focused tests, and then remeasure with
the public root diagnostic.

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
