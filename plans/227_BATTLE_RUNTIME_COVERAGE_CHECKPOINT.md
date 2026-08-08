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

On 2026-08-08, at HEAD `2c0015df5`, `pnpm coverage` completed every production
package and exited 0. Battle-runtime ran 203 test files: 2,129 tests passed and
53 opt-in QNT proof tests were skipped. Its authoritative summary was:

| Metric     | Covered / total   | Result |  Delta from `6ffe49e7d` | Harness ratchet | Issue target | Static-denominator gap to 99% |
| ---------- | ----------------- | -----: | ----------------------: | --------------: | -----------: | ----------------------------: |
| Statements | 120,215 / 124,849 | 96.28% |  +14 covered / -2 total |             96% |          99% |                         3,386 |
| Branches   | 29,943 / 32,229   |  92.9% | +41 covered / +27 total |             92% |          99% |                         1,964 |
| Functions  | 4,774 / 4,774     |   100% |               no change |            100% |          99% |                             0 |
| Lines      | 120,215 / 124,849 | 96.28% |  +14 covered / -2 total |             96% |          99% |                         3,386 |

Relative to that durable baseline, uncovered statements/lines fell by 16 and
uncovered branch arms fell by 14 despite the larger branch denominator.

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
| battle-runtime             |     96.28% |    92.9% |      100% | 96.28% | Below 99%            |
| character-battle-runtime   |     99.48% |   99.08% |      100% | 99.48% | Meets 99%            |
| character-creation-runtime |     99.33% |   99.02% |      100% | 99.33% | Meets 99%            |
| character-sheet-runtime    |     99.31% |      99% |      100% | 99.31% | Meets 99%            |
| mcp                        |     99.72% |    99.1% |      100% | 99.72% | Meets 99%            |
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
- `2c0015df5` covered valid unit-feature admission and projection alternatives,
  and narrowed ongoing-effect parsing to its established class-feature source.
  Strict Surface decoding makes the attempted Abjure Foes range and mismatched
  activation/resource records unrepresentable; alternate effect-composition
  fallbacks absent from the current SRD catalog remain classified non-targets
  rather than synthetic mechanics to manufacture for coverage.

## Next campaign: save-gated condition spell hole negotiation

A fresh full-universe navigation report at `2c0015df5` ranks
`battle-reducer/spells-resolve-save-gates.ts` as the largest uncovered owner
(118 statements and 59 branch arms). Its Metamagic-selection and condition-style
save-gate regions account for about 30 uncovered statements and 10 branch arms,
forming the next cohesive campaign. This custom report is navigation only; the
next completed `pnpm coverage` remains authoritative.

1. Trace missing Careful Spell and Heightened Spell selections through
   `saveMetamagicSelectionState`, `resolveAreaSaveMetamagicFills`, and the
   production candidate/fill workflow. Assert requested holes and resumed
   resolution, not helper call counts.
2. Cover valid hole negotiation in `resolveSaveGateConditionSpellAct`,
   `resolveSaveGateConditionImmunitySpellAct`, and
   `resolveSaveGateAttackRollAdvantageSpellAct`, using the existing Metamagic,
   save-condition, Calm Emotions, Faerie Fire, and hole-frontier test owners.
3. Exercise resource-spend rejection arms in those resolvers and Command only
   when a valid initialized battle state can reach them. Classify typed-hole
   contradictions and strict-decoder rejections as non-targets instead of
   bypassing admission with malformed fixtures.

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
