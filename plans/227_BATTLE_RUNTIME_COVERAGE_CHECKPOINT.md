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
- Git HEAD: `83f3b531ddab665fb773b957fedaca43289509ea`
- Command: `pnpm coverage`
- Result: exit 0; all workspace coverage packages complete and green
- Total wall duration: approximately 301 seconds
- Battle-runtime tests: 208/208 files passed; 2,214 tests passed and 53
  skipped (2,267 total)

| Metric     |                `405dba830` |                `cee28a4ac` |                `83f3b531d` | `cee2` -> `83f3` covered / total |     Uncovered change |   Delta |
| ---------- | -------------------------: | -------------------------: | -------------------------: | -------------------------------: | -------------------: | ------: |
| Statements | 120,524 / 124,841 (96.54%) | 120,534 / 124,841 (96.55%) | 120,561 / 124,841 (96.57%) |                           27 / 0 | 4,307 -> 4,280 (-27) | +0.02pp |
| Branches   |   30,146 / 32,253 (93.46%) |   30,175 / 32,276 (93.49%) |   30,192 / 32,284 (93.52%) |                           17 / 8 |  2,101 -> 2,092 (-9) | +0.03pp |
| Functions  |       4,817 / 4,817 (100%) |       4,817 / 4,817 (100%) |       4,817 / 4,817 (100%) |                            0 / 0 |               0 -> 0 |       0 |
| Lines      | 120,524 / 124,841 (96.54%) | 120,534 / 124,841 (96.55%) | 120,561 / 124,841 (96.57%) |                           27 / 0 | 4,307 -> 4,280 (-27) | +0.02pp |

The Vitest statement/line percentage rose to 96.57% and branches rose to
93.52%; uncovered statements/lines fell by 27 and uncovered branches by 9.
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
| Statements | 120,561 | 124,841 |                  123,593 |         3,032 |
| Branches   |  30,192 |  32,284 |                   31,962 |         1,770 |
| Functions  |   4,817 |   4,817 |                    4,769 |             0 |
| Lines      | 120,561 | 124,841 |                  123,593 |         3,032 |

## Milestone context

Since the prior authoritative checkpoint, `761d4f2ab` added focused Chromatic
Orb witnesses for the D20 Test natural-one reroll lifecycle, chained replay
reaction facts and malformed relationship/sight rejection, and an active
source-side damage-roll penalty. Luna completed two review rounds with a
synthetic-only reroll capability. Root review then removed undiscovered
Slow/Sanctuary/source-penalty fills and a direct test of a malformed-fill-only
continuation predicate, corrected the original and replacement d20 totals for
the caster's +5 spell attack bonus, and completed the real discovered penalty
roll through exact target HP in `83f3b531d`. Focused tests, package typecheck,
two Luna review rounds, and the repeated independent root review all converged
cleanly before the public run.

Focused cohort uncovered counts remain regression and navigation evidence, not
a forecast of the global public delta, because other public tests may already
cover those arms. Only the full public totals establish global movement.
Continue from the current public report, preserve behavior and Quint parity,
and remeasure only after the next coherent increment.

## Next campaign

Branches remain the limiting public metric at 93.52%, with a static 99% gap of
1,770. Clone the public harness arguments for a fresh package-local diagnostic,
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
