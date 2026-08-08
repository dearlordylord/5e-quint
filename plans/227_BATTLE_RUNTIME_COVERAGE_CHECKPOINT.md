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

On 2026-08-08, at pushed HEAD `df7a0e279`, `pnpm coverage` completed every
production package and exited 0. Battle-runtime ran 203 test files. Its
authoritative summary was:

| Metric     | Covered / total       | Result |        Delta from `2c0015df5` | Harness ratchet | Issue target | Static-denominator gap to 99% |
| ---------- | --------------------- | -----: | ----------------------------: | --------------: | -----------: | ----------------------------: |
| Statements | 120,282 / 124,849     | 96.34% | +67 covered / no total change |             96% |          99% |                         3,319 |
| Branches   | 29,989 / 32,248       | 92.99% |       +46 covered / +19 total |             92% |          99% |                         1,937 |
| Functions  | fraction not retained |   100% |                 100% retained |            100% |          99% |                             0 |
| Lines      | 120,282 / 124,849     | 96.34% | +67 covered / no total change |             96% |          99% |                         3,319 |

Relative to `2c0015df5`, uncovered statements/lines fell from 4,634 to 4,567,
a reduction of 67. Covered branch arms rose by 46 while the instrumented
denominator rose by 19, so uncovered branch arms fell from 2,286 to 2,259, a
net reduction of 27.

The completed root command proves exactly 100% functions because the public
harness requires 100% and exited 0. Its covered/total function fraction was
discarded by terminal-output truncation. A separate temporary report using the
same test selection and production include/exclude universe measured
4,774 / 4,774; that fraction is navigation continuity, not a replacement for
the authoritative root transcript.

The gap column is planning guidance only. Production edits can change the
denominators; a completed `pnpm coverage` result decides the real status.
Successful diagnostic coverage is not a substitute for `pnpm quality`.

### Workspace position

The same completed run confirmed that every other production package remained
at or above 99% in every metric. On this HEAD, battle-runtime was the only
production package below 99%. This is dated evidence, not a standing
assumption; remeasure the whole workspace before claiming it remains the sole
remainder.

| Package                    | Statements | Branches | Functions |  Lines | Position on this run |
| -------------------------- | ---------: | -------: | --------: | -----: | -------------------- |
| app                        |     99.37% |   99.10% |    99.44% | 99.37% | Meets 99%            |
| battle-runtime             |     96.34% |   92.99% |      100% | 96.34% | Below 99%            |
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
- `2c0015df5` covered valid unit-feature admission and projection alternatives,
  and narrowed ongoing-effect parsing to its established class-feature source.
  Strict Surface decoding makes the attempted Abjure Foes range and mismatched
  activation/resource records unrepresentable; alternate effect-composition
  fallbacks absent from the current SRD catalog remain classified non-targets
  rather than synthetic mechanics to manufacture for coverage.
- `df7a0e279` marks two reviewed Metamagic batches: save-gate selection and
  condition outcomes, followed by typed Distant, Extended, Subtle, Transmuted,
  Twinned, Empowered, and Seeking admission, resource, and execution
  boundaries. The authoritative reduction was 67 uncovered statements/lines
  and 27 uncovered branch arms; malformed typed-hole contradictions remain
  non-targets.

## Next campaign: persistent spatial spell lifecycle

A fresh matching-universe navigation report at `df7a0e279` still ranks
`battle-reducer/spells-resolve-save-gates.ts` first, with 115 uncovered
statements and 57 branch arms, but the reviewed campaign left its remaining
gaps dominated by defensive and malformed-input paths. The next large cohesive
production-reachable seam is persistent spatial spell lifecycle:
`battle-reducer/persistent-spatial-spell-procedures.ts` has 97 uncovered
statements and 38 branch arms, and its adjacent Moonbeam, Web, and single-save
hazard bookkeeping in `battle-reducer/spells-active-effects.ts` has 12
uncovered statements and 9 branch arms. The combined navigation cluster is
therefore 109 statements and 47 branch arms. These counts are navigation only;
the next completed `pnpm coverage` remains authoritative.

1. Drive the existing admitted Grease, Web, Sleet Storm, Gust of Wind, Flaming
   Sphere, and Moonbeam subjects through discovery, fill negotiation, replay,
   and end-turn continuation rather than calling reducer helpers directly.
2. Cover the valid save-failed reaction-window branches, handled replay
   continuations, damage and Concentration hole frontiers, and end-turn
   `needsHoles` subject restoration. These are reachable through the existing
   typed runtime-command owners and already-admitted SRD profiles.
3. Cover canonical per-turn save bookkeeping for Moonbeam, Web entry/start-turn
   triggers, and single-save area hazards, including the distinct already-saved
   and newly-recorded transitions where production discovery can present them.
4. Keep caller-mutated fill geometry, missing active-effect owners, impossible
   resource races, and other immediately preceding boundary contradictions as
   non-targets. Do not bypass discovery or weaken typed fills to manufacture
   them.

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
