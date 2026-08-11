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
- Git HEAD: `4eeecad28`
- Command: `pnpm coverage`
- Result: exit 0; all workspace coverage packages complete and green
- Total wall duration: approximately 329 seconds
- Battle-runtime tests: 214/214 files passed; 2,292 tests passed and 53
  skipped (2,345 total)

| Metric     |                `67d41be16` |                `5cf7f45c6` |                `4eeecad28` | `5cf7` -> `4eee` covered / total |     Uncovered change |   Delta |
| ---------- | -------------------------: | -------------------------: | -------------------------: | -------------------------------: | -------------------: | ------: |
| Statements | 120,761 / 124,749 (96.80%) | 120,910 / 124,749 (96.92%) | 120,978 / 124,745 (96.98%) |                          68 / -4 | 3,839 -> 3,767 (-72) | +0.06pp |
| Branches   |   30,449 / 32,440 (93.86%) |   30,708 / 32,624 (94.12%) |   30,757 / 32,651 (94.19%) |                          49 / 27 | 1,916 -> 1,894 (-22) | +0.07pp |
| Functions  |       4,813 / 4,813 (100%) |       4,813 / 4,813 (100%) |       4,813 / 4,813 (100%) |                            0 / 0 |               0 -> 0 |       0 |
| Lines      | 120,761 / 124,749 (96.80%) | 120,910 / 124,749 (96.92%) | 120,978 / 124,745 (96.98%) |                          68 / -4 | 3,839 -> 3,767 (-72) | +0.06pp |

The Vitest statement/line percentage rose to 96.98% and branches rose to
94.19%; uncovered statements/lines fell by 72 and uncovered branches by 22.
These are measured deltas from the authoritative public run, not a forecast
toward 99%. Denominator changes are shown explicitly because production code
changed between checkpoints. The 93% branch ratchet and all other ratchets
were preserved; no threshold was lowered. Every other
executable package in this root run met all 99% metric thresholds;
battle-runtime is the only remaining package below acceptance.

## Current exact battle-runtime diagnostic

This package-local milestone measurement clones the checked-in battle-runtime
arguments and thresholds from `scripts/workspace-quality-harness.mjs` and ran
under the broad workspace lock. It is exact package evidence, but it does not
replace the public root diagnostic above or establish the state of other
packages.

- Date: 2026-08-10
- Measured working tree committed as: `40ca17067` (on top of Luna milestone
  `569fdf65b`)
- Command: the checked-in battle-runtime Vitest coverage invocation, with one
  worker, under `with_resource_lock_owner scripts/with-broad-workspace-lock.sh`
- Result: exit 0
- Duration: 134.93 seconds
- Battle-runtime tests: 214/214 files passed; 2,307 tests passed and 53 skipped
  (2,360 total)

| Metric     | M19 public covered / total |  M20 exact covered / total | Covered / total change |     Uncovered change | Percentage change |
| ---------- | -------------------------: | -------------------------: | ---------------------: | -------------------: | ----------------: |
| Statements | 120,978 / 124,745 (96.98%) | 121,132 / 124,872 (97.00%) |              154 / 127 | 3,767 -> 3,740 (-27) |           +0.02pp |
| Branches   |   30,757 / 32,651 (94.19%) |   30,758 / 32,658 (94.18%) |                  1 / 7 |  1,894 -> 1,900 (+6) |           -0.01pp |
| Functions  |       4,813 / 4,813 (100%) |       4,813 / 4,813 (100%) |                  0 / 0 |               0 -> 0 |                 0 |
| Lines      | 120,978 / 124,745 (96.98%) | 121,132 / 124,872 (97.00%) |              154 / 127 | 3,767 -> 3,740 (-27) |           +0.02pp |

The checked-in battle-runtime ratchets rose from 96/96/100/93 to
97/97/100/94 for statements, lines, functions, and branches. No threshold was
lowered. The branch denominator grew as behaviorally reachable validation
alternatives were restored to honest instrumentation, so its small percentage
decrease is retained rather than hidden.

## Remaining static 99% gaps

These are planning gaps at the current denominators. Recompute them after code
or instrumentation changes rather than treating them as a fixed work quota.

| Metric     | Covered |   Total | Covered required for 99% | Remaining gap |
| ---------- | ------: | ------: | -----------------------: | ------------: |
| Statements | 121,132 | 124,872 |                  123,624 |         2,492 |
| Branches   |  30,758 |  32,658 |                   32,332 |         1,574 |
| Functions  |   4,813 |   4,813 |                    4,765 |             0 |
| Lines      | 121,132 | 124,872 |                  123,624 |         2,492 |

## Milestone context

M20 covered reachable save-gate validation and attack-resolution behavior,
including malformed but type-valid Thunderwave fills, spell and feature
admission paths, and save/attack interactions. Luna completed implementation,
focused verification, required MBTs, the exact package gate, and self-review in
`569fdf65b`. Independent standards and specification reviews then converged.
Root corrections in `40ca17067` removed inaccurate coverage suppressions from
reachable invalid-input paths, deleted two redundant Thunderwave guards whose
states are unrepresentable, narrowed the Brutal Strike helper protocol, and
made spell/feature test actors and state reachable under their real class,
level, spellcasting, and concentration requirements. The correction gate
included 245 focused tests, package typecheck, formatting, and the exact
coverage result above.

The following M19 history remains for continuity with the last public root
diagnostic.

Since the prior authoritative checkpoint, `450850a90` covered the cohesive Unit
Feature action dispatch and discovery owner: Rage-aware enemy saving-throw
relationships for Breath Weapon, Land's Aid, and Abjure Foes; valid unrelated
resource-map alternatives; active Wild Shape and off-hand Sacred Weapon
projection; dice-expression labels; Abjure Foes restriction/effect lifecycle;
and stale or empty area-action alternatives. Production now accepts an already
admitted Character actor for healing-pool sizing and threads one non-null spell
save DifficultyClass witness through discovery/resolution instead of repeating
impossible actor/DC guards. No modeled rule changed.

An earlier spell-release candidate was rejected after the public run showed
only 21 fewer uncovered statements and 8 fewer uncovered branches; `dca1cf8c4`
restored its three files exactly to M18 content. For the replacement campaign,
Luna used full-suite rather than selected-cohort measurement, completed two
self-review passes, and captured green exits for the Dragon Breath, feature
save/reaction, and Wild Shape lifecycle MBTs. Independent root review removed
forged same-turn Steady Aim and turn-resource witnesses, converted Abjure Foes
effect replacement into a real later-turn second use, and replaced a Fighter 1
Action Surge resource with its valid Second Wind resource in `4eeecad28`.
Repeated review then converged with 153 focused tests, package typecheck, lint,
formatting, and the public coverage run green.

Focused cohort uncovered counts remain regression and navigation evidence, not
a forecast of the global public delta, because other public tests may already
cover those arms. Only the full public totals establish global movement.
Continue from the current public report, preserve behavior and Quint parity,
and remeasure only after the next coherent increment.

## Next campaign

Branches remain the limiting exact battle-runtime metric at 94.18%, with a
static 99% gap of 1,574. The next coherent owner is the persistent spatial spell
and active-effect lifecycle cohort: Grease, Web, Gust of Wind, Flaming Sphere,
Moonbeam, their save/reaction/end-turn/concentration paths, and active-effect
projection, replacement, reset, light, and held-object behavior. Audit
uncovered alternatives for schema-impossible or duplicated logic, cover only
behaviorally reachable alternatives with focused tests, run the relevant MBTs,
and repeat the review loop before remeasurement. Attack resolution and
defensive route/profile cohorts remain later independent candidates.

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
