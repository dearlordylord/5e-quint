# D&D harness performance and workflow churn

Investigation: 2026-09-06. Repository snapshot:
`dd1350f81b72111d4a58fd8b8d28dbf4346db4ea`.

This is a research report, not new agent instructions or an implementation.
The receipt-only lane and fixed stage count described in this historical report
were retired; the current workflow always runs the canonical quality plan.
The strongest wins are to consolidate duplicate test execution and prevent
receipt-only changes from restarting expensive qualification. A single
publication-verifier suite is the next measured optimisation target.

## Measured baseline

Two successful hosted Quality jobs provide completed stage timings:

| Stage                | Current snapshot, September 3 | Receipt revision, September 2 |
| -------------------- | ----------------------------: | ----------------------------: |
| Ordinary tests       |       1,265.728 s / 21.10 min |       1,254.451 s / 20.91 min |
| Coverage tests       |       1,911.368 s / 31.86 min |       1,874.808 s / 31.25 min |
| Deployment lifecycle |         635.342 s / 10.59 min |         615.631 s / 10.26 min |
| Typecheck            |                     107.383 s |                      97.954 s |
| Lint                 |                      87.883 s |                      85.095 s |
| All 49 stages        |   **4,528.035 s / 75.47 min** |   **4,431.921 s / 73.87 min** |

Sources: [current-snapshot job](https://github.com/dearlordylord/5e-quint/actions/runs/33707350146/job/100499236130)
at `dd1350f81`, and [receipt-revision job](https://github.com/dearlordylord/5e-quint/actions/runs/33679161851/job/100411371190)
at `539a2e185`. Both report all 49 stages PASS. Their ordinary-test summaries
each report 11 successful tasks and zero cached tasks. These are two observations
on different revisions, not a controlled before/after experiment.

The three largest stages consume **84.20%** of the current stage total.
Stage totals exclude runner provisioning and queue time. The current job's
start-to-completion duration is 76 min 11 s; the receipt job's is 74 min 40 s.
The [collector](../../scripts/workspace-quality-harness.mjs#L327) prints each
outcome twice, immediately and in its final summary; the table deduplicates by
stage ID rather than adding both copies.

## Ranked optimisation wins

### 1. Execute production test assertions once in the milestone

**Evidence:** the [milestone plan](../../scripts/quality-milestone-plan.cjs#L114)
runs ordinary workspace tests and then coverage. The
[coverage owner](../../scripts/workspace-quality-harness.mjs#L593) starts Vitest
again for every production package. All eleven production packages have a
`vitest run` test script, five with an explicit MBT exclusion; coverage also
excludes MBT. The three prototype packages have no test script at this snapshot.
App's [two commands](../../packages/app/package.json#L16) literally differ by
`--coverage`. The successful current CI log reports matching ordinary/coverage
test totals for each of the eleven production packages.

**Change:** make coverage the milestone's production-test execution. Keep the
ordinary `pnpm test` command for focused development. Derive the milestone's
test ownership from existing package policy and manifests, and enforce that
every workspace test is either executed under coverage or has an explicit
remaining lane. Do not silently lose tests when a future prototype adds a test
script. Preserve coverage floors, exclusions, setup, environments, and assertions.

**Size of opportunity:** the repeated ordinary stage costs **20.91–21.10 minutes**
in these runs. Removing it would subtract about **28%** of measured stage time;
simple subtraction puts the current total near **54.37 minutes**. This is a
candidate saving, not a measured post-change result. Matching counts support
overlap but do not prove identity equality: implementation must compare collected
file/test identities and effective configuration. Check whether any accepted
obligation specifically requires both instrumented and uninstrumented execution.

**Validation:** compare inventories, run the affected coverage lanes, exercise
the inventory guard with an uncovered package/test, then run one stable complete
milestone. The coverage owner presently stops after a failing package, and the
ordinary Turbo command does not enable continuation after failure. Collecting
independent-package failures would be a separate diagnostic improvement, not an
existing guarantee that consolidation must preserve.

### 2. Stop receipt-only commits from restarting full qualification

**Evidence:** [Quality](../../.github/workflows/quality.yml#L3) runs on every
master push and PR update, with cancellation of earlier work on the same
branch/PR. Between certified implementation `b1afacf0a` and `539a2e185`, six
commits change only three Markdown files: the Effect controlled-red ledger,
final parity report, and Cleanroom readiness ledger. Reproduce with:

```sh
git log --oneline b1afacf0a..539a2e185
git diff --stat b1afacf0a 539a2e185
git diff --name-only b1afacf0a 539a2e185
```

The [implementation's hosted job](https://github.com/dearlordylord/5e-quint/actions/runs/33671882663)
started at 19:13:02 UTC and ended cancelled at 20:09:36: **56 min 34 s** occupied
job time. Its log retains 48 PASS stages totaling 2,652.064 seconds and an
unfinished coverage stage. It is not a passing full gate. Three subsequent
receipt-revision workflow runs also ended cancelled
([one](https://github.com/dearlordylord/5e-quint/actions/runs/33677575412),
[two](https://github.com/dearlordylord/5e-quint/actions/runs/33678681883),
[three](https://github.com/dearlordylord/5e-quint/actions/runs/33678899149)).
The [eventual successful receipt run](https://github.com/dearlordylord/5e-quint/actions/runs/33679161851)
then recorded a **73.87-minute** stage total. The successful
implementation receipt also exists locally in the
[immutable #386 receipt](https://github.com/dearlordylord/5e-quint/issues/386#issuecomment-5515847382).
Hosted cancellation does not negate that separate local evidence.

**Change:** initially batch receipt corrections before pushing; this needs no
new CI classification machinery. Then add a narrowly defined receipt-only
classification within the existing Quality workflow: run relevant document,
link, provenance, and certificate checks, while preserving a visible successful
required check. Default unknown changes to the full gate. Do not broadly skip
`docs/**`: certificates, imported fixtures, and executable acceptance material
can live there. Inspect readers and negative controls for each admitted receipt
path. A source change combined with a receipt change still requires full quality.

**Size of opportunity:** avoid replaying a roughly **74–75-minute gate** for a
qualified receipt-only update and avoid cancellations of useful qualification.
This is larger per event than launcher optimisation. Savings depend on how often
such updates occur; the cancelled time is not automatically all recoverable.

**Validation:** test exact receipt-only changes, mixed changes, certificate
changes, renames/deletions, and unknown paths; verify required-check behavior
and preserve the implementation SHA in the receipt. This changes qualification
policy and must explicitly update its owning workflow/instructions when adopted.

### 3. Optimise the publication-verifier suite, preserving its mutation checks

**Evidence:** current CI's
[`publication-delta-verifier.test.ts`](../../packages/surface/src/surface/publication-delta-verifier.test.ts)
executes 48 tests in **474.961 seconds ordinarily** and **733.568 seconds under
coverage**: **20.14 minutes** across both executions. The coverage execution is
about 80% of Surface's 916.37-second Vitest duration and 16.20% of all milestone
stage time. The fixture helper at lines 41–79 copies the complete candidate
artifacts and invokes the verifier for mutations. The verifier
[reads baseline artifacts](../../packages/surface/src/surface/publication-delta-verifier-core.ts#L2887)
per invocation and [constructs two fresh AJV compilers](../../packages/surface/src/surface/publication-delta-verifier-core.ts#L2719)
whenever verification reaches schema cross-validation.

**Change:** the supplementary profile below points first to graph comparison and
its allocating string comparator. Optimise that local operation before adding
schema caches. For subsequent preparation reuse, reuse only demonstrably
unchanged preparation, such as an immutable baseline or compiled schema keyed
by its exact content and compiler options. Keep changed-candidate authentication,
fresh reads, invalid-schema diagnostics, graph comparison, and every mutation
assertion. A path-keyed cache would be incorrect because tests deliberately
change bytes at the same path. A smaller synthetic fixture may suit some
algorithm tests, but cannot replace the actual publication parity checks.

**Size of opportunity:** **12.23 minutes remains in coverage after win 1**.
That is the suite's cost ceiling, not a promise that all of it is avoidable.
Compilation is a source-confirmed repeated operation; the supplementary profile
finds it smaller than graph comparison on one valid candidate. Do not add the
ordinary 7.92 minutes again to win 1.

**Validation:** alternating baseline/candidate runs with identical suite
inventory, changed bytes at a reused path, baseline/candidate mutations,
unreadable history, invalid certificates, and unchanged rejection outcomes.
Keep a fresh-process end-to-end verification.

### 4. Bound repeat review to the change that invalidated it

**Evidence:** the [standing instructions](../../CLAUDE.md#L148) require repeated
RAW/domain/architecture/code review until no reasonable findings remain.
The [immutable #386 receipt](https://github.com/dearlordylord/5e-quint/issues/386#issuecomment-5515847382)
records two complete independent review rounds; one found only stale chronology
in the report. Following that documentation correction, both rounds reported
post-fix review across every axis. No executable source, model, certificate,
authored record, or generated artifact changed in that correction.

The [Cleanroom landing loop](../../plans/CLEANROOM_SOURCE_READINESS_LEDGER.md#L201)
also places integration, composite review, gates, ticket evidence, and a
ledger-only follow-up on each landing unit's critical path. Its
[receipt rule](../../plans/CLEANROOM_SOURCE_READINESS_LEDGER.md#L44) explicitly
blocks newly unblocked work until that follow-up lands. However, it already
[reserves broad milestones](../../plans/CLEANROOM_SOURCE_READINESS_LEDGER.md#L180)
for named checkpoints; it does not require full quality at every leaf.

**Change:** retain one complete review of a stable landing candidate and review
repairs against affected behavior and invariants. Reopen a settled axis on a
demonstrated defect or changed input, rather than because a receipt changed.
Keep broader review where the accepted contract explicitly requires it, such
as [SR-19](../../plans/CLEANROOM_SOURCE_READINESS_LEDGER.md#L328), until that
contract is deliberately changed. Preserve the existing ledger, exact SHA
receipts, shared-artifact ownership, and recovery guarantees; no new tracking
system is needed. Batch coherent independently useful work rather than treating
every reviewer observation as another separately integrated milestone.

**Size of opportunity:** repeated full review demonstrably occurred; no reliable
review-time saving is available. The earlier Dalph sidecar's session counts are
historical context, not a fresh transcript census by this audit. The migration
really covered a large implementation campaign; removing ceremony cannot make
that intrinsic work disappear.

**Validation:** on the next bounded milestone, record review reopenings and their
invalidating facts in its existing ticket. A documentation correction should
receive evidence review; a runtime repair must still receive appropriate domain,
RAW, architecture, and code review. Record escaped defects as well as time saved.

## Lower-priority work and improvements already present

- **Deployment-lifecycle phase timing:** it costs 10.59 minutes, but
  [child output is captured](../../scripts/deployment-lifecycle-smoke.ts#L85)
  and the current log does not explain that total. Instrument its existing
  phases before proposing caching or deleting isolation checks. The standalone
  wrapper now builds once, while the milestone body consumes its existing build
  prerequisite.
- **Compiler/cache work:** CI caches pnpm dependencies but does not configure
  persistent Turbo task-cache restoration. Both sampled runs have zero cached
  test/typecheck/build tasks. Dependency installation caching and execution
  caching are different. Audit root configuration, source imports, history,
  toolchain and environment inputs before relying on reusable task evidence.
  Consolidating test execution has a clearer immediate benefit than a new cache.
- **Quint launcher overhead:** the proof harness still launches `pnpm exec quint`;
  direct pinned-CLI launch is worth a bounded paired experiment, but its time
  fraction is unmeasured here. Do not import Dalph's 5.1% result as a D&D estimate.
- **Failure collection already shipped:** the milestone collector runs independent
  stages after ordinary failures and blocks dependent ones; it stops scheduling
  after exit 137/SIGKILL. Recommending a new top-level collector would repeat work.
  Coverage's package loop remains fail-fast, as noted in win 1.
- **Heavy lanes already separated:** [QNT proofs](../../.github/workflows/qnt-proofs.yml#L36)
  use four battle shards plus shared-algebra and character-creation lanes.
  [Raw Swarm](../../scripts/raw-swarm/README.md#execution-lanes) has its own
  deterministic workflow. The 75-minute Quality measurement does not include
  those workflows' runtime. Preserve shared local resource locks; increasing
  concurrency blindly would not address duplicate work or review churn.

## Recommended execution order

1. Consolidate milestone tests into coverage with inventory equivalence enforced.
2. Batch receipt pushes immediately; implement narrow receipt classification as
   a separate policy change with explicit input and required-check tests.
3. Optimise the publication verifier's allocating comparator, then assess
   remaining graph/preparation costs using the supplementary profile below.
4. Narrow repeat-review invalidation in the existing owning instructions.

For each implementation, review the affected harness, domain/authority boundary,
and acceptance evidence; fix reasonable findings and review the affected delta
until converged. Run the final expensive gate only on the stable candidate.
Compare the same runner class and preserve assertions, coverage thresholds,
formal scope, security boundaries, and process cleanup. The savings above overlap
and must not be summed as independent improvements.

## Reproduction and limits

Only research documentation was written. No runtime/harness policy, tests,
coverage thresholds, or instructions were modified; no full local gate or live
model campaign was launched. A supplementary single-call diagnostic profile is
reported below, including its unsuccessful supervisor exit. Existing unrelated
untracked files were left alone.

Primary evidence is local source/Git plus read-only GitHub job metadata and log
archives. `gh run view --log` returned empty output despite exit zero; the audit
instead downloaded archives through `gh api .../actions/runs/<id>/logs` and read
the `0_Resource-bounded workspace quality.txt` member. Retained local extracted
logs are `/tmp/dnd-harness-audit-quality-{current,docs,cancelled}.txt`.
The current decoded-text SHA-256 is
`bdb0fcd4c67a94c98a1c9c5b94ee7e7a4d9149b80a6f1fae4a63e2f727ebdd51`;
the receipt-revision decoded-text SHA-256 is
`992a572b40d1dc8458f3c2637c9735b5062962f63d63a8e0340ac7a0e80a227e`.
These temporary files are local evidence, not durable repository dependencies;
the linked hosted runs identify their source.

To reproduce stage accounting, extract matches of
`\bPASS ([\d.]+)s ([a-z0-9-]+)` and retain one duration per stage ID.
Confirm 49 successful stages before summing. Use job start/completion timestamps
separately for job occupancy. Cancelled jobs are never counted as full passes.

The supplied reference was
`/workspace/typescript/dalph-worktrees/workflow-churn-audit/research/workflow-churn-audit.md`,
including its sibling `workflow-churn-dnd-comparison.md`. This report independently
checks the current source, historical Git delta, migration receipt and completed
CI logs; it does not independently reparse the multi-day session transcripts,
measure provider costs, or claim a post-intervention speedup.

Validation: independent evidence review completed; its arithmetic correction and
Turbo failure-continuation correction were incorporated. Report formatting and
all 19 local link targets were checked. No runtime verification is claimed for
this documentation-only investigation.

## Supplementary preimplementation analysis

The user requested further analysis before implementation. This follow-up keeps
the same source revision and narrows the outstanding design work. No optimisation
has been implemented.

### Test consolidation: selection matches, timing contracts differ

The successful current CI log contains **550 package-qualified test-file rows**
in each lane. Every sorted file identity and declared per-file test count matches
exactly. This is stronger evidence than matching package totals, but the reporter
does not print every individual test title, so it is not an independent comparison
of all runtime test IDs.

Source inspection found the same package configurations, plugins, worker counts,
isolation settings and environments in both lanes; no pretest/posttest hooks;
and no tracked source branches on the searched coverage markers
(`__coverage__`, `NODE_V8_COVERAGE`, `VITEST_COVERAGE`, `coverage.enabled`).
The important differences and implementation requirements are:

- **Timeouts:** the coverage owner supplies the shared 300,000 ms timeout to
  ten libraries. Ordinary execution gets that value from the App and MCP
  configurations only; nine other packages retain runner defaults or per-test
  overrides. Removing ordinary execution therefore removes an additional stricter
  timeout check. Preserve the existing coverage timeout and explicitly acknowledge
  this change, or make the policy consistent through its existing owner. Do not
  describe the effective configurations as identical. Sources:
  [coverage arguments](../../scripts/workspace-quality-harness.mjs#L593),
  [timeout constant](../../scripts/shared-host-test-policy.mjs),
  [App config](../../packages/app/vitest.config.ts),
  [MCP config](../../packages/mcp/vitest.config.ts).
- **Environment:** ordinary tests go through Turbo, whereas direct coverage
  inherits its parent environment. Proof tests read `RUN_QNT_PROOFS` and
  `RUN_QNT_INDUCTIVE_PROOFS`; do not let an inherited opt-in turn the ordinary
  coverage lane into heavy proof execution. This is an existing direct-coverage
  exposure, not a regression introduced by removing ordinary tests. Preserve
  the separate [proof-lane contract](../agents/QNT-MBT.md#qnt-proof-lane).
- **Ownership:** extend the [existing inventory](../../scripts/workspace-quality-harness.mjs#L211)
  to catch custom test commands, filters/config selectors, hooks, and future
  prototype tests. Invoking the canonical package test script with coverage
  arguments is preferable if it preserves the current effective configuration;
  otherwise explicitly reject unsupported script shapes. Preserve the earlier
  build stage and update the milestone's existing 49-stage self-test.

The ~21-minute opportunity remains supported. The patch can be small, but it
needs these explicit contracts rather than deleting one array entry blindly.

### Verifier profile: graph comparison precedes compilation as a target

A temporary driver imported the unchanged verifier, started the Node inspector
profiler after module import, and invoked production verification once. The call
returned `verified`, zero issues, after **35.323 seconds**. The inspector window
was 35.498 seconds, with 13,538 samples. This was a contended local host and a
profiled, uninstrumented valid-candidate call, not the hosted coverage suite.
Sample time includes scheduling and native/GC effects; it is not CPU accounting
or a controlled speed measurement.

| Disjoint sampled stack category                     | Sample-weighted time |  Share |
| --------------------------------------------------- | -------------------: | -----: |
| Schema graph comparison                             |             17.833 s | 50.24% |
| Schema compilation                                  |              5.315 s | 14.97% |
| Aggregate cross-validation                          |              4.783 s | 13.47% |
| Aggregate snapshot comparison                       |              0.791 s |  2.23% |
| Baseline artifact reads                             |              0.245 s |  0.69% |
| Other frames, GC, native work, and remaining phases |              6.531 s | 18.40% |

Within those categories, `compareCodePointStrings` accounts inclusively for
10.327 sample-weighted seconds (**29.09%** of the window); this overlaps the
table and must not be added to it. The
[comparator](../../packages/surface/src/surface/publication-delta-verifier-core.ts#L445)
materializes both complete strings as code-point arrays on every comparison,
even when the first character differs. The
[graph algorithm](../../packages/surface/src/surface/publication-delta-verifier-core.ts#L1816)
repeatedly sorts object entries and graph signatures using it.

**Implementation direction:** first replace eager array allocation with a local
comparison that walks code points only until they differ, optionally taking an
equal-string fast path. Preserve Unicode code-point ordering, including astral
characters, lone surrogates, empty strings and prefixes. JavaScript's default
string ordering is UTF-16 code-unit ordering and is not an equivalent substitute.
Use the existing comparator as a test oracle for generated strings, then compare
publication root digests and all mutation outcomes. No schema cache or change to
graph equivalence is required for this first experiment. If further work is
needed, investigate repeated invariant key sorting/reference resolution before
rewriting graph stabilization. The profile does not establish a suite speedup.

Profile evidence: `/tmp/dnd-publication-verifier.cpuprofile`, SHA-256
`0425f4d0e0b11280df25d8781e3f2408305e5dfbbfc3236802abd296bcfd9299`.
Aggregate by following each sampled node's parent chain and weighting by
`timeDeltas`; table categories select, in order, `compareSchemaGraphDelta`,
`compileSchemaPair`, `validateAggregatePair`, `compareAggregateSnapshots`,
`readBaselineArtifact`, or the remaining frames. They are mutually exclusive.
The driver is `/tmp/dnd-publication-profile.mjs`. Neither is a production asset.

**Unsuccessful process-lifecycle outcome:** despite the returned result, the
public lock-wrapped command exited **137**, after the supervisor reported that
it could not prove the owned process tree had settled. The exact invocation was:

```sh
. scripts/resource-lock-owner.sh && \
  with_resource_lock_owner scripts/with-broad-workspace-lock.sh \
  node --import /workspace/typescript/dnd/node_modules/tsx/dist/loader.mjs \
  /tmp/dnd-publication-profile.mjs
```

Verification stopped; no repeat run was launched. Recorded process IDs were
Node `1179670` and its supervisor parent `1179662`. Both were absent during the
emergency inspection; the process scan found no surviving matching driver or
supervisor, so no process was killed. Host available memory was about 48,670 MiB;
load averages were 23.35/25.19/19.49. Readable cgroup data showed `memory.max=max`,
`memory.current=3889180672`, `memory.peak=54122352640`, and `memory.events`
`oom=0`, `oom_kill=2`, unchanged at a later read. There was no pre-run OOM counter
sample, so those cumulative kills cannot be attributed to this command.
The [supervisor](../../scripts/raw-swarm/process-supervisor.c#L1168) can return
137 after cleanup escalation even without an OOM kill. The precise lifecycle
cause is unresolved; investigate that before repeating this diagnostic driver.
The retained profile is an observation, not a successful verification receipt.

### Receipt CI: a classifier is only one part of the design

The proposed light path needs more than a filename allowlist:

1. **Keep actual Markdown consumers.** Both
   [kernel coverage](../../scripts/rules-kernel-coverage-claim-scan.cjs) and
   [unit-profile coverage](../../scripts/unit-profile-coverage-claim-scan.cjs)
   scan Markdown recursively; test-lane hygiene also scans `plans/**/*.md`.
   A receipt lane must retain `rules-kernel-coverage:check`,
   `unit-profile-coverage:check`, `check:test-lane-hygiene`, and
   `check:markdown-links`. Reuse their existing grammars. Link checking does not
   establish receipt truth, external run success, or anchor validity; the
   Cleanroom provenance check does not certify arbitrary report prose.
2. **Change cancellation ownership.** Current workflow-level concurrency cancels
   previous work before in-job classification runs. Place classification outside
   the heavy job's cancellation scope and manage heavy/light jobs separately.
   Test an arriving receipt update while implementation qualification is running.
3. **Require qualified source evidence.** A receipt-only last commit can follow
   a failed or cancelled source run. Classify the complete delta from a known
   successful full-quality ancestor, including workflow/toolchain inputs; for
   PRs inspect the complete candidate delta, not just the last push. Missing,
   ambiguous, divergent or unqualified evidence must fall back to full quality.
   Never emit a green receipt result that implies unverified source passed.
4. **Do not exempt the whole readiness ledger.** It contains review/gate policy
   as well as receipts. Start with explicitly bounded evidence updates; route
   changes to operational rules, certificates, generated data, modes, renamed
   paths, classifier code and workflows to the full lane. Preserve SR-19's
   explicit exact-candidate qualification contract.

Read-only hosted settings inspection found no classic required-status-check
protection (`Branch not protected`, HTTP 404). The visible active repository
[ruleset](https://github.com/dearlordylord/5e-quint/rules/17034019) contains deletion
and non-fast-forward restrictions, with no required-status-check rule. Thus no
required Quality context was found in these inspected settings. Preserve the
visible Quality result anyway; future protection should not depend on a skipped
or missing job. This does not waive the repository's documented gates.

Remaining policy choices are whether local-only qualification can authorize a
hosted light lane, how pending qualification is handled, and the admitted ledger
sections. Conservative first implementation: require completed hosted ancestor
evidence, fall back to full qualification when uncertain, and exclude ledger
policy edits. Batching receipt pushes remains the immediate low-cost action.

### Deployment lifecycle: hidden repeated compilation deserves measurement

At the historical snapshot, source tracing expanded the 635-second stage into
MCP deployment/HTTP lifecycle checks, separate SIGINT and SIGTERM probes,
application build/copy/lifecycle checks, and a nested Vitest invocation of
distribution and script tests. The current extraction keeps only the deployed
MCP and application lifecycle checks; distribution remains an ordinary owner.

The [consumer-distribution suite](../../scripts/raw-swarm/sdk-player/consumer-distribution.test.ts)
constructs five distributions: one direct call and four CLI calls. Each
[builder invocation](../../scripts/raw-swarm/sdk-player/consumer-distribution.ts)
emits declarations and produces two runtime bundles. The suite already uses
copies of prepared distributions in some scenarios. Measuring preparation costs
could justify preparing immutable artifacts once and copying them to fresh test
directories while retaining direct-builder and CLI construction tests. Do not
share mutable sessions, output destinations, compiler inputs or evidence.

No unconditional multi-minute sleep explains the historical stage; observed
timers are readiness polling and failure deadlines. Continue measuring deploy,
HTTP readiness, signal probes, app copy, and cleanup separately. Build timing is
owned by the canonical prerequisite rather than repeated inside the lifecycle
body.

### Readiness after this analysis

- **Test consolidation:** ready for a bounded implementation after explicitly
  handling timeout and environment contracts; evidence supports ~21 minutes of
  repeated work.
- **Verifier comparator:** ready for a narrow correctness-preserving experiment;
  profiling now supports choosing it before a schema cache. Resolve the failed
  profiling process lifecycle before repeating that particular driver.
- **Receipt CI:** reader analysis is complete enough to design the patch, but
  source-qualification, cancellation and ledger-policy decisions remain material.
- **Consumer fixture reuse:** source-confirmed repeated preparation, still missing
  phase measurements. Instrument before restructuring the suite.

All supplementary research notes were reviewed against source and existing logs.
The profile is deliberately qualified by its unsuccessful command exit; no
new passing runtime or full-gate receipt is claimed.
