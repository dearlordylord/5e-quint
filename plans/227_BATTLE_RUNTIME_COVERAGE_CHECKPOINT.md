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
- Git HEAD: `bb4ec0eb50e1a14b782be97a1c3cfe18c836ff98`
- Command: `pnpm coverage`
- Result: exit 0; all workspace coverage packages complete and green
- Total wall duration: approximately 340 seconds
- Battle-runtime tests: 206/206 files passed; 2,195 tests passed and 53
  skipped (2,248 total)

| Metric     |                `edac64ff3` |                `a716a9a56` |                `bb4ec0eb5` | `a716` -> `bb4e` covered / total |     Uncovered change |   Delta |
| ---------- | -------------------------: | -------------------------: | -------------------------: | -------------------------------: | -------------------: | ------: |
| Statements | 120,493 / 124,843 (96.51%) | 120,498 / 124,843 (96.51%) | 120,513 / 124,843 (96.53%) |                           15 / 0 | 4,345 -> 4,330 (-15) | +0.02pp |
| Branches   |   30,097 / 32,225 (93.39%) |   30,100 / 32,224 (93.40%) |   30,133 / 32,248 (93.44%) |                          33 / 24 |  2,124 -> 2,115 (-9) | +0.04pp |
| Functions  |       4,817 / 4,817 (100%) |       4,817 / 4,817 (100%) |       4,817 / 4,817 (100%) |                            0 / 0 |               0 -> 0 |       0 |
| Lines      | 120,493 / 124,843 (96.51%) | 120,498 / 124,843 (96.51%) | 120,513 / 124,843 (96.53%) |                           15 / 0 | 4,345 -> 4,330 (-15) | +0.02pp |

The Vitest statement/line percentage rose to 96.53% and branches rose to
93.44%; uncovered statements/lines fell by 15 and uncovered branches by 9.
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
| Statements | 120,513 | 124,843 |                  123,595 |         3,082 |
| Branches   |  30,133 |  32,248 |                   31,926 |         1,793 |
| Functions  |   4,817 |   4,817 |                    4,769 |             0 |
| Lines      | 120,513 | 124,843 |                  123,595 |         3,082 |

## Milestone context

Since the prior authoritative checkpoint, `ab06f6802` added seven focused
witnesses across the generic attack pipeline: disposition validation,
zero-Hit-Point replacement guards and the public damage-at-zero lifecycle,
character/Stat Block attack projection, Light-property held/offhand projection,
attack-roll source cancellation, and action-resource preference/spend. Luna's
review replaced an absent helper with a real third combatant. Root review then
used the canonical Relentless Endurance fixture to make the zero-HP guards
observable, corrected the massive-damage threshold, asserted the resulting
death-save failure, and exercised competing action resources together in
`bb4ec0eb5`. Focused tests, package typecheck, four Luna review rounds, and the
repeated independent root review all converged cleanly before the public run.

Focused cohort uncovered counts remain regression and navigation evidence, not
a forecast of the global public delta, because other public tests may already
cover those arms. Only the full public totals establish global movement.
Continue from the current public report, preserve behavior and Quint parity,
and remeasure only after the next coherent increment.

## Next campaign

Branches remain the limiting public metric at 93.44%, with a static 99% gap of
1,793. Clone the public harness arguments for a fresh package-local diagnostic,
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
