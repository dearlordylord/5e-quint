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
- Git HEAD: `405dba830ff3f61c5a62749b5da73fdc1868d7bf`
- Command: `pnpm coverage`
- Result: exit 0; all workspace coverage packages complete and green
- Total wall duration: approximately 327 seconds
- Battle-runtime tests: 207/207 files passed; 2,203 tests passed and 53
  skipped (2,256 total)

| Metric     |                `a716a9a56` |                `bb4ec0eb5` |                `405dba830` | `bb4e` -> `405d` covered / total |     Uncovered change |   Delta |
| ---------- | -------------------------: | -------------------------: | -------------------------: | -------------------------------: | -------------------: | ------: |
| Statements | 120,498 / 124,843 (96.51%) | 120,513 / 124,843 (96.53%) | 120,524 / 124,841 (96.54%) |                          11 / -2 | 4,330 -> 4,317 (-13) | +0.01pp |
| Branches   |   30,100 / 32,224 (93.40%) |   30,133 / 32,248 (93.44%) |   30,146 / 32,253 (93.46%) |                           13 / 5 |  2,115 -> 2,107 (-8) | +0.02pp |
| Functions  |       4,817 / 4,817 (100%) |       4,817 / 4,817 (100%) |       4,817 / 4,817 (100%) |                            0 / 0 |               0 -> 0 |       0 |
| Lines      | 120,498 / 124,843 (96.51%) | 120,513 / 124,843 (96.53%) | 120,524 / 124,841 (96.54%) |                          11 / -2 | 4,330 -> 4,317 (-13) | +0.01pp |

The Vitest statement/line percentage rose to 96.54% and branches rose to
93.46%; uncovered statements/lines fell by 13 and uncovered branches by 8.
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
| Statements | 120,524 | 124,841 |                  123,593 |         3,069 |
| Branches   |  30,146 |  32,253 |                   31,931 |         1,785 |
| Functions  |   4,817 |   4,817 |                    4,769 |             0 |
| Lines      | 120,524 | 124,841 |                  123,593 |         3,069 |

## Milestone context

Since the prior authoritative checkpoint, `40ed09221` added focused witnesses
for repeated damage allocation, multi-component save damage, attack-burst save
ability projection, precomputed and unresolved source-side damage penalties,
unresolved target resistance, and Save Damage Replacement filtering. Luna
rejected an already-covered object-contact hypothesis after measurement, then
completed two review rounds and corrected an implausible penalty roll. Root
review found that the object-damage helper's optional damage type and `force`
fallback admitted a state no production caller can create. `405dba830` made the
known spell damage type required and removed two tests that had cemented that
impossible fallback. Focused tests, package typecheck, Luna's review loop, and
the repeated independent root review all converged cleanly before the public
run.

Focused cohort uncovered counts remain regression and navigation evidence, not
a forecast of the global public delta, because other public tests may already
cover those arms. Only the full public totals establish global movement.
Continue from the current public report, preserve behavior and Quint parity,
and remeasure only after the next coherent increment.

## Next campaign

Branches remain the limiting public metric at 93.46%, with a static 99% gap of
1,785. Clone the public harness arguments for a fresh package-local diagnostic,
select a different branch-heavy owner or cohesive subsystem from the completed
save-gate, active-effect-ledger, persistent-spatial, ongoing-feature admission,
act-composition, attack-projection, attack-pipeline, and spell-damage-fill
campaigns. Audit its uncovered alternatives for schema-impossible or duplicated
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
