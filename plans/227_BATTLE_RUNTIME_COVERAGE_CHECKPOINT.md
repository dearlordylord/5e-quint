# Battle runtime coverage checkpoint (temporary)

Canonical authority: [GitHub issue #227](https://github.com/dearlordylord/5e-quint/issues/227)

This unindexed file is temporary continuity for the active battle-runtime
coverage campaign. It is not a specification, acceptance owner, quality
framework, or second task ledger. Delete it, or distill any still-useful
evidence into issue #227 and then delete it, when `@dnd/battle-runtime` reaches
at least 99% statements, branches, functions, and lines under the authoritative
workspace coverage universe.

## Measurement contract

- `pnpm coverage` is the existing public diagnostic command. It is allowed to
  fail while a coverage target remains unmet.
- `pnpm quality` is final acceptance. Run the public commands directly; they
  acquire the shared broad-workspace lock. Do not invoke their `:body` scripts,
  add another lock, or introduce another coverage command.
- For battle-runtime, the authoritative universe is
  `src/**/*.{ts,tsx}`. The workspace harness excludes tests, MBT tests, test
  support, QNT replay support, replay-data support, and generated files using
  its existing `COMMON_COVERAGE_EXCLUDES` list.
- Focused Vitest runs and custom reports are useful for navigation only. They
  cannot establish package totals because they may instrument a narrower
  universe. In particular, `coverage_tmp*`, `coverage_tmp2*`, and
  `coverage_tmp_milestone*` are not acceptance evidence.
- The ratchet values below are a dated snapshot of
  `scripts/workspace-quality-harness.mjs`, not another configuration owner.
  Issue #227 owns the 99% target.

## Latest authoritative evidence

On 2026-08-08, at HEAD `6ffe49e7d`, `pnpm coverage` completed every production
package and exited 0. Battle-runtime ran 203 test files: 2,123 tests passed and
53 opt-in QNT proof tests were skipped. Its authoritative summary was:

| Metric     | Covered / total   | Result | Harness ratchet | Issue target | Static-denominator gap to 99% |
| ---------- | ----------------- | -----: | --------------: | -----------: | ----------------------------: |
| Statements | 120,201 / 124,851 | 96.27% |             96% |          99% |                         3,402 |
| Branches   | 29,902 / 32,202   | 92.85% |             92% |          99% |                         1,978 |
| Functions  | 4,774 / 4,774     |   100% |            100% |          99% |                             0 |
| Lines      | 120,201 / 124,851 | 96.27% |             96% |          99% |                         3,402 |

The gap column is planning guidance only. Production edits can change the
denominators; a completed `pnpm coverage` result decides the real status.
Successful diagnostic coverage is not a substitute for `pnpm quality`.

### Workspace position

The same completed run emitted the following exact package summaries. On that
HEAD, battle-runtime was the only production package below 99% in any metric.
This is dated evidence, not a standing assumption; remeasure the whole workspace
before claiming it remains the sole remainder.

| Package                    | Statements | Branches | Functions |  Lines | Position on this run |
| -------------------------- | ---------: | -------: | --------: | -----: | -------------------- |
| app                        |     99.37% |    99.1% |    99.44% | 99.37% | Meets 99%            |
| battle-runtime             |     96.27% |   92.85% |      100% | 96.27% | Below 99%            |
| character-battle-runtime   |     99.48% |   99.08% |      100% | 99.48% | Meets 99%            |
| character-creation-runtime |     99.33% |   99.02% |      100% | 99.33% | Meets 99%            |
| character-sheet-runtime    |     99.31% |      99% |      100% | 99.31% | Meets 99%            |
| mcp                        |     99.72% |   99.11% |      100% | 99.72% | Meets 99%            |
| shared                     |     99.72% |   99.13% |      100% | 99.72% | Meets 99%            |
| shared-algebras            |     99.57% |   99.11% |      100% | 99.57% | Meets 99%            |
| surface                    |     99.55% |   99.02% |    99.79% | 99.55% | Meets 99%            |
| tactical-space             |     99.26% |   99.06% |      100% | 99.26% | Meets 99%            |

## Durable milestones worth retaining

- `ca388e320` is the correctness anchor for preserving primary-attack
  follow-ups when a damage interrupt is declined. Its QNT, unit, and MBT
  evidence should remain intact even though MBT and opt-in proof lanes are not
  part of the coverage total above.
- `152b5d745` restored coverage for legitimate save-gate area validation.
  `ffcf2affc` narrowed active-effect exclusions, and the immediately following
  Gust cleanup removed broad exclusions without turning unsupported authored
  shapes into executable behavior.
- `8a3f879ea` closed the live schema-diagnostic function gap. Do not regress the
  boundary diagnostic merely to preserve the already-complete function metric.
- `6ffe49e7d` consolidated Fire-immunity and nonflammable save-gate outcomes.
  Extend that shared outcome boundary rather than recreating parallel test
  setup when covering adjacent save-gate branches.

## Next campaign: unit-feature support profiles

Start with behaviorally meaningful branches in
`packages/battle-runtime/src/unit-feature-support.ts`, using the existing
unit-profile admission tests and fixtures. The authoritative run reports only
package totals, so it does not prove any file-level arm is uncovered. A prior
focused audit identified these stable symbols and predicate arms. Reconfirm
them with a newly generated focused diagnostic before editing, then let the
next complete `pnpm coverage` establish the result.

1. `passiveDamageResistanceProfileForUnit`: cover the independent rejection
   meanings in `unit.kind !== "species_trait" || unit.mechanics.family !==
"passive"`, zero and multiple results for
   `resistanceGrants.length !== 1`, and the present/non-`undefined`
   `sourceFilter` rejection arm. Assert `null`, not only execution counts.
2. `magicActionSaveGatedConditionProfileForUnit`: exercise both sides of
   `classLevels === undefined ? classLevel(unit.acquiredAtLevel) :
findCharacterClassLevel(classLevels, unit.className)`, including the
   `paladinLevel === undefined` and
   `paladinLevel < unit.acquiredAtLevel` rejections.
3. `parseSelfBonusActionHealingUnitFeatureProfile`: independently omit
   `effect.amount.base.flat` and `effect.amount.perLevel.flat`; the expected
   projection arms are `flatBase: ... ?? 0` and
   `flatPerLevel: ... ?? 0`, both yielding zero without changing the dice
   projection.
4. `parseOngoingFeatureLifecycle`: cover absent versus present
   `earlyEndConditions ?? []` and `earlyEndArmorCategories ?? []` on supported
   lifecycle variants, plus the typed `null` result when either parser rejects
   a supplied value.
5. `parseOngoingFeatureEffects` and
   `parseOngoingFeatureUnitFeatureProfile`: cover no weapon filter versus
   `effect.weaponFilter?.kind === "weapon_category"`, and the empty
   roll/damage/resistance result that delegates to
   `parseSpellBenefitActivationProjectionEffects(effects)`. Keep unsupported
   structured-input rejection exclusions narrow; do not manufacture invalid
   runtime states solely to move a percentage.

## Checkpoint update and acceptance procedure

1. Confirm each proposed assertion traces to the relevant local SRD passage
   and uses `UBIQUITOUS_LANGUAGE.md` terminology. If RAW is silent or
   ambiguous, stop and use the repository's assumptions owner rather than
   encoding an interpretation in a coverage test.
2. Add the smallest behavior assertion through the existing typed parser or
   profile boundary. Do not duplicate production facts in test registries or
   weaken invalid-state modeling for reachability.
3. Run the existing public `pnpm coverage`. Record the date, exact
   battle-runtime counts and percentages, complete-command exit status, and
   any failure that stopped later packages. Never promote a focused report to
   the table above.
4. Run RAW traceability, ubiquitous-language/domain, architecture and
   connascence, and code-review passes. Fix every reasonable finding, reject
   only with a concrete reason, and repeat until no reasonable findings remain.
5. Run the existing public `pnpm quality` as final acceptance. Update this file
   only with completed evidence; do not add scripts, coverage configuration,
   JSON ledgers, framework code, or an index link.

## Cleanup

At 99% for every battle-runtime metric, put any durable final evidence on issue
#227 and delete this checkpoint. This file does not authorize deleting or
overwriting untracked research/docs or
`packages/battle-runtime/coverage_tmp*`,
`packages/battle-runtime/coverage_tmp2*`, or
`packages/battle-runtime/coverage_tmp_milestone*` artifacts.
