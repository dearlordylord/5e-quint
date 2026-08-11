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
- Git HEAD: `6e4e7e7c7`
- Command: the checked-in battle-runtime Vitest coverage invocation, with one
  worker and the JSON reporter, under
  `with_resource_lock_owner scripts/with-broad-workspace-lock.sh`
- Result: exit 0
- Duration: 69.85 seconds after lock acquisition
- Battle-runtime tests: 216/216 files passed; 2,331 tests passed and 53 skipped
  (2,384 total)
- Coordination note: root confirmed the external Battle Runtime coverage lane
  was empty before this final exact run began. The run exited 0 without overlap
  or SIGKILL. The JSON report contains the same 407 production files as the
  exact M26 base at `63d3b6d52`; all checked-in production include/excludes and
  thresholds were identical, with only the reporter output path changed. The
  first audit iterations exited 75 before launch because they matched the
  resident Apalache server and their own audit shells. A later empty audit
  exposed an incorrect package-relative lock-script path and exited 127 before
  a wrapper or Vitest started. Neither setup failure is coverage evidence. The
  successful command first verified both `../../scripts` paths and an empty
  active-client audit.

| Metric     |   M26 base covered / total |  M26 final covered / total | Covered / total change |     Uncovered change | Percentage change |
| ---------- | -------------------------: | -------------------------: | ---------------------: | -------------------: | ----------------: |
| Statements | 121,224 / 124,810 (97.13%) | 121,224 / 124,795 (97.14%) |                0 / -15 | 3,586 -> 3,571 (-15) |         +0.0117pp |
| Branches   |   30,864 / 32,721 (94.32%) |   30,865 / 32,722 (94.32%) |                  1 / 1 |   1,857 -> 1,857 (0) |         +0.0002pp |
| Functions  |       4,812 / 4,812 (100%) |       4,812 / 4,812 (100%) |                  0 / 0 |               0 -> 0 |                 0 |
| Lines      | 121,224 / 124,810 (97.13%) | 121,224 / 124,795 (97.14%) |                0 / -15 | 3,586 -> 3,571 (-15) |         +0.0117pp |

The checked-in battle-runtime ratchets remain 97/97/100/94 for statements,
lines, functions, and branches. No threshold was lowered. M26 removes three
unexported targeting-kind arrays whose only consumers were same-file
`typeof ...[number]` type queries. The equivalent targeting types are now
composed directly from constrained `SpellTargetingByKind<...>` members, so the
type vocabulary remains checked against `SpellTargeting["kind"]` without
emitting dead runtime values.

This structural increment adds no test lines and changes one production file
by 8 additions and 26 deletions (net -18). In that owner, exact statements move
from 0 / 15 to 0 / 0, while its 1 / 1 branch and 1 / 1 function are unchanged.
A lightweight TypeScript transpilation audit found three emitted array
declarations and two spread references at the base, and no emitted
`SAVE_GATED_*` value after the change. Across the complete package, statements
and lines retain the same covered numerator while removing all 15 uncovered
runtime statements. Unchanged-owner V8 materialization added one covered and
one total branch, leaving the uncovered branch count unchanged. The pre-edit
budget was zero added test lines, all ratchets remain green, and functions
remain 100%.

## Remaining static 99% gaps

These are planning gaps at the current denominators. Recompute them after code
or instrumentation changes rather than treating them as a fixed work quota.

| Metric     | Covered |   Total | Covered required for 99% | Remaining gap |
| ---------- | ------: | ------: | -----------------------: | ------------: |
| Statements | 121,224 | 124,795 |                  123,548 |         2,324 |
| Branches   |  30,865 |  32,722 |                   32,395 |         1,530 |
| Functions  |   4,812 |   4,812 |                    4,764 |             0 |
| Lines      | 121,224 | 124,795 |                  123,548 |         2,324 |

## Milestone context

M26 replaces type-derivation-only save-gated targeting arrays with structural
unions of the canonical `SpellTargeting` members. Repository-wide search found
no value consumer or export for the removed arrays. The four condition-area
and seven damage-area members remain extensionally identical to the execution
schemas in `codec-building-blocks.ts`, whose profile declarations continue to
check them with `satisfies SpellProcedureDeclaration<...>`. Package typecheck,
targeted lint, formatting, the exact gate above, and the transpilation audit
were green. RAW, QNT, runtime protocol behavior, public APIs, and tests are
unchanged, so no focused test or MBT was required. Independent Standards and
separate Spec/RAW/QNT reviews found no remaining issue.

M25 delegates the spell-hosted attack profile's main- and off-hand Wild Shape
checks to the canonical held-weapon slot usability predicate. The helper first
correlates the exact slot kind and object identity, then applies the same limb
and equipment-disposition rule as the removed local calculation. Existing
public True Strike, Druid Wild Shape, duplicate-identity slot admission, and
registry tests passed 74/74 with package typecheck, lint, and formatting green.
RAW, QNT, runtime protocol behavior, and tests are unchanged, so no MBT was
required. Independent Standards and separate Spec/RAW/QNT reviews found no
remaining issue.

An initial M25 attempt marked Spiritual Weapon repeat attacks as synthesized.
The exact public run rejected it: two Antimagic Field tests proved that the
valid restoration projection reconstructs repeat execution from a live active
effect through authored admission. A canonical synthesized restoration design
would span the dynamic follow-up family, beyond this bounded owner; forging a
binding in the fixture or adding a second reconstruction path was rejected.
Commits `a06bd49db` and `622a4384e` retain the failed experiment and exact
restoration as recoverable evidence, with zero net diff.

M24 removes the obsolete authored-character admission algorithm for Dancing
Lights reposition. The cast lifecycle in `spells-active-effects.ts` remains the
canonical creator of the correlated reposition procedure, and the profile now
declares that ownership with `admission: "synthesized"`, matching other
cast-created follow-ups. The repository-wide consumer search also proved that
`characterSpellProcedureRefsForProcedure` became dead after this consolidation,
so its definition and barrel export were removed atomically. Existing public
Dancing Lights lifecycle tests continue to prove cast creation, correlated
movement, stale-subject rejection, duration, and cleanup. This is structural
only: RAW, QNT, runtime protocol behavior, and tests are unchanged.

M23 removed a duplicate Magic Weapon target-usability algorithm and delegated
to the canonical held-loadout/Wild Shape owner. Item-level Magic Weapon
validation remains existential across held occurrences. Weapon-attack override
admission and execution instead retain the exact main/off-hand slot and apply
that slot's limb and equipment-disposition facts; a usable off-hand occurrence
therefore cannot admit an unusable main occurrence with the same item identity.
An existing public Beast Spells lifecycle scenario now covers the representable
duplicate-identity case: both merged slots expose no Shillelagh act, while a
merged main slot and worn off-hand slot expose exactly one. It retains that
off-hand-bound public subject, changes to an alternate state where only the
duplicate-ID main slot is usable, and proves resolution rejects the stale
off-hand correlation. A mutation that forced execution to recheck the main slot
made this assertion fail with `resolved` instead of `unsupportedSubject`, so it
distinguishes slot-aware execution from admission-only filtering. The complete
scenario is a net 42 test lines relative to M22. Against 21 newly covered
statements, 42 / 21 = 2.00 test lines per newly covered statement, exactly at
the pre-edit ceiling; the production denominator also fell by 9 statements and
1 branch. No modeled rule changed. The public Magic Weapon, weapon-hosted route,
and Wild Shape lifecycle cohort passed 92 tests; package typecheck, targeted
lint, formatting, the 52-test Wild Shape file, and the exact gate above were
green. The mapped
`BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS` MBT passed 9/9 tests through its
public locked script (61.18-second Vitest duration; 1m38.641s wall time). Two
review rounds found no remaining RAW, domain, architecture/connascence,
standards, or issue-scope finding.

M22 covered a reduced attack-control increment after review removed direct
helper matrices and forged state witnesses. Its exact baseline at `1ce2c3590`
was 121,188 / 124,871 statements and lines, 30,821 / 32,695 branches, and
4,813 / 4,813 functions. The rejected attack-control helper matrix is not a
candidate for a later campaign.

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

Branches remain the limiting exact battle-runtime metric at 94.32%, with a
static 99% gap of 1,530. Do not retry the rejected attack-control helper matrix
or the isolated Spiritual Weapon synthesized-admission conversion.
Rerank the exact uncovered report against public lifecycle coverage before the
next increment; defensive route/profile behavior remains an independent
candidate. Admission-proven or schema-impossible guards must be narrowed or
removed with concrete proof rather than reached through forged states.

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
