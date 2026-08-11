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

- Date: 2026-08-11
- Git HEAD: `5f1b47e2d`
- Command: the checked-in battle-runtime Vitest coverage invocation, with one
  worker, under `with_resource_lock_owner scripts/with-broad-workspace-lock.sh`
- Result: exit 0
- Duration: 61.93 seconds
- Battle-runtime tests: 218/218 files passed; 2,353 tests passed and 53 skipped
  (2,406 total)

| Metric     | Pre-M25 exact covered / total | Current exact covered / total | Covered / total change |     Uncovered change | Percentage change |
| ---------- | ----------------------------: | ----------------------------: | ---------------------: | -------------------: | ----------------: |
| Statements |    121,327 / 124,892 (97.14%) |    121,480 / 125,002 (97.18%) |              153 / 110 | 3,565 -> 3,522 (-43) |           +0.04pp |
| Branches   |      30,917 / 32,751 (94.40%) |      30,949 / 32,770 (94.44%) |                32 / 19 | 1,834 -> 1,821 (-13) |           +0.04pp |
| Functions  |          4,813 / 4,813 (100%) |          4,817 / 4,817 (100%) |                  4 / 4 |               0 -> 0 |                 0 |
| Lines      |    121,327 / 124,892 (97.14%) |    121,480 / 125,002 (97.18%) |              153 / 110 | 3,565 -> 3,522 (-43) |           +0.04pp |

The checked-in battle-runtime ratchets remain 97/97/100/94 for statements,
lines, functions, and branches. No threshold was lowered. The measurement
baseline is the prior exact M24 checkpoint. M25 changed production admission
and its tests, so the table reports covered, total, and uncovered changes
separately.

## Remaining static 99% gaps

These are planning gaps at the current denominators. Recompute them after code
or instrumentation changes rather than treating them as a fixed work quota.

| Metric     | Covered |   Total | Covered required for 99% | Remaining gap |
| ---------- | ------: | ------: | -----------------------: | ------------: |
| Statements | 121,480 | 125,002 |                  123,752 |         2,272 |
| Branches   |  30,949 |  32,770 |                   32,443 |         1,494 |
| Functions  |   4,817 |   4,817 |                    4,769 |             0 |
| Lines      | 121,480 | 125,002 |                  123,752 |         2,272 |

## Milestone context

M25 converted malformed character battle initialization from assertion throws
to accumulated typed issues for duplicate resource, feature, and Weapon
Mastery identities; contradictory loadout/hand facts; and invalid zero-Hit-
Point lifecycle state. Spellcasting invocation access is now parsed once and
the admitted state is threaded into projection. Luna self-review and
independent root review decomposed every new function below the current
complexity ceiling, removed a duplicated nonempty-array helper, made the
spellcasting admission union exhaustive, and deleted the superseded invocation
admission wrapper after the first locked run exposed it as the package's sole
uncovered function. Review converged with 27 focused tests, package typecheck,
formatting, lint, complexity inspection, and the exact package gate above.
The milestone is commits `4204f0ec3` and `5f1b47e2d`.

M24 covered Ice Knife's attack-burst boundaries through public battle
procedures: Halfling natural-one rerolls, Sanctuary retargeting, Mirror Image
interception, distinct attack and burst relationship decisions, and spell-cast,
attack-hit, failed-save, and after-damage reaction windows. Luna self-review
replaced manually injected active effects with real casts. Independent root
review then corrected Sanctuary and Animal Friendship caster classes, made the
Mirror Image Wizard level-appropriate, strengthened the two damage-event
relationship oracles, and renamed the suite after its rule owner. Review
converged with eight focused tests, package typecheck, formatting, and the exact
package gate above. The milestone is commit `384dd3e6b`.

M22 hardened character resource and spellcasting admission through public
battle-start boundaries. Malformed spell-slot expenditure, feature-prepared
spell provenance, invocation access, ritual access, and source-class mismatch
now return typed battle initialization issues instead of escaping as projection
throws. Redundant post-admission resource guards were removed or narrowed to
their exact impossible assertion arms, and the internal resource-admission
projector and result type were removed from the public package surface. Luna
self-review and independent review converged after correcting one over-broad
coverage ignore and one dead type re-export. Commits `97767c00b`, `8c502e379`,
and `efb1da523` passed focused tests, package typecheck, formatting, and the
exact package coverage gate above.

M21 covered persistent spatial spell and active-effect lifecycles through
public, reachable battle scenarios: failed-save Reaction continuation for
Grease, Gust of Wind, Flaming Sphere, and Moonbeam; successful and stale Web
saves, per-turn marker reset, and stale cleanup; condition-choice rejection;
and Light projection across bright, dim, dark, wrong-object, and opaque-cover
facts. Luna implemented and self-reviewed `bac2cafe3`; independent standards
and specification review then found that several new level-2 spell scenarios
used the fixture's default level-1 Wizard. Root correction `0da412ce0` made the
Wizard casters level 3, made Moonbeam's caster a level-3 Druid, and clarified
the Light projection test name. Review reconverged with 115 focused tests,
package typecheck, formatting, four relevant MBT groups (20/20), and the exact
coverage gate above green.

The requested delegated Command end-turn replay branch was merged separately
as `08d567cb4` between the M20 and M21 measurements. Its focused Command tests
(16/16) and package typecheck passed before M21 resumed. Because it changed
production and tests inside battle-runtime, the exact M21 checkpoint reports
the combined denominator and coverage movement.

The following M20 and M19 history remains for continuity.

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

Branches remain the limiting exact battle-runtime metric at 94.40%, with a
static 99% gap of 1,507. The next coherent owner is the attack-control cohort
across attack resolution, attack-roll projection, and stat-block attacks. Its
pre-M21 residual was 172 statements and 75 branch arms; remeasure the files
before implementation, then cover only public reachable action-resource,
fill-validation, roll-mode, mastery/rider, replacement, and stat-block damage
behavior. Admission-proven or schema-impossible guards must be narrowed or
removed with concrete proof rather than reached through forged states. Run the
mapped weapon/stat-block/relationship MBTs and repeat the reviewer loop before
remeasurement. Defensive route/profile behavior remains a later independent
candidate.

A rejected M23 codec audit exposed a correctness issue worth retaining for a
later cohesive boundary tranche: the open `rolledDice` schema member can accept
a specialized hole payload and strip its selector fields during decode. A
disjoint-fallback prototype preserved specialized fields, rejected malformed
specialized payloads, and kept genuine open placeholders valid, but its focused
coverage delta was only 23 sites and the prototype was fully reverted under the
milestone threshold. A future fix must make the generic and specialized schema
shapes structurally disjoint rather than rely on union-member ordering.

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
5. After every executable package reaches the 99% coverage target, complete
   issue #254: eliminate every production cyclomatic-complexity violation above
   8 and enforce an empty/no-debt baseline.
6. Then run the public root `pnpm quality` gate, distill any durable result into
   issue #227 or its owning document, and delete only this temporary note.
   Deleting it does not authorize changing the approved untracked artifacts
   named above.
