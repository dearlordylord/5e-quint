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
- Git HEAD: `67d41be161d0d14551a0d1c023bc99447ef5892e`
- Command: `pnpm coverage`
- Result: exit 0; all workspace coverage packages complete and green
- Total wall duration: approximately 311 seconds
- Battle-runtime tests: 212/212 files passed; 2,260 tests passed and 53
  skipped (2,313 total)

| Metric     |                `02141cc63` |                `6ffe81bd4` |                `67d41be16` | `6ffe` -> `67d4` covered / total |     Uncovered change |   Delta |
| ---------- | -------------------------: | -------------------------: | -------------------------: | -------------------------------: | -------------------: | ------: |
| Statements | 120,755 / 124,830 (96.73%) | 120,763 / 124,805 (96.76%) | 120,761 / 124,749 (96.80%) |                         -2 / -56 | 4,042 -> 3,988 (-54) | +0.04pp |
| Branches   |   30,380 / 32,406 (93.74%) |   30,408 / 32,421 (93.79%) |   30,449 / 32,440 (93.86%) |                          41 / 19 | 2,013 -> 1,991 (-22) | +0.07pp |
| Functions  |       4,813 / 4,813 (100%) |       4,813 / 4,813 (100%) |       4,813 / 4,813 (100%) |                            0 / 0 |               0 -> 0 |       0 |
| Lines      | 120,755 / 124,830 (96.73%) | 120,763 / 124,805 (96.76%) | 120,761 / 124,749 (96.80%) |                         -2 / -56 | 4,042 -> 3,988 (-54) | +0.04pp |

The Vitest statement/line percentage rose to 96.80% and branches rose to
93.86%; uncovered statements/lines fell by 54 and uncovered branches by 22.
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
| Statements | 120,761 | 124,749 |                  123,502 |         2,741 |
| Branches   |  30,449 |  32,440 |                   32,116 |         1,667 |
| Functions  |   4,813 |   4,813 |                    4,765 |             0 |
| Lines      | 120,761 | 124,749 |                  123,502 |         2,741 |

## Milestone context

Since the prior authoritative checkpoint, `0e49a94a5` audited the cohesive
interrupt-stack, readied-release, and reaction-continuation boundary. It added
public workflows for Cunning Strike continuations, stale Movement and Jump
subjects, readied creature targets, reaction modifiers, and falling-reaction
facts; narrowed character spell procedure input; removed impossible branches;
and repaired the stale synthetic reaction MBT weapon fixture. Luna completed
two review rounds. Root review kept reachable success paths instrumented,
restored reachable missing-target continuation arms, reunited production and
MBT readied-target classification, and removed an admission-impossible helper
scenario in `67d41be16`. Six focused MBT lanes, 102 repeated focused runtime
tests, package typecheck, formatting, Luna's reviews, and repeated independent
root review converged before the public run. The reaction-casting-time MBT's
three fixture failures reproduce unchanged at the exact parent checkpoint and
are not attributable to this milestone.

Focused cohort uncovered counts remain regression and navigation evidence, not
a forecast of the global public delta, because other public tests may already
cover those arms. Only the full public totals establish global movement.
Continue from the current public report, preserve behavior and Quint parity,
and remeasure only after the next coherent increment.

## Next campaign

Branches remain the limiting public metric at 93.86%, with a static 99% gap of
1,667. Clone the public harness arguments for a fresh package-local diagnostic,
select a different branch-heavy owner or cohesive subsystem from the completed
save-gate, active-effect-ledger, persistent-spatial, ongoing-feature admission,
act-composition, attack-projection, attack-pipeline, and spell-damage-fill
campaigns, plus character battle resources, the Chained Spell resolver, and
the damage/condition lifecycle, battle lifecycle route, spell damage lifecycle
invariant, and interrupt/readied/reaction continuation cohorts.
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
