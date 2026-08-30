# Cleanroom Source-Readiness Subgraph Refresh

Research date: **2026-08-30**

Audited `master`: **`f6606edda6559bb154c9d0f4f6886faf1ab7885d`**

Repository: [dearlordylord/5e-quint](https://github.com/dearlordylord/5e-quint)

## Question and scope

This report refreshes the informal **“our subgraph”**: the source-owned work
that must converge before a genuine Cleanroom Acceptance Run can begin. The run
itself, [#39](https://github.com/dearlordylord/5e-quint/issues/39), is excluded.

The requested tickets are #52, #464–#478, #117, #118, #29, #31, #34, #40,
#35, and #36. The audit also follows live native relationships far enough to
make that graph truthful: the open catalog reconstruction, the #31 children and
their direct blockers, the Surface publication-store chain, and the terminal
Dirty-Cleanroom Rehearsal (#37) and Source Readiness ticket (#38).

The ordering of evidence is deliberate:

1. the checked-out `master` code and generated artifacts;
2. open integration branches and commits that have not reached `master`;
3. live GitHub issue/sub-issue/dependency state;
4. ticket prose and historical cleanroom artifacts.

This report did not mutate source or branch state. During the research window,
the integration owner reconciled four stale Opaque Oracle aggregates in the
tracker: #63, #61, #32, and #33 were closed against integrated commit
`f3a200a13693d6c08026398433dd706779e52647`, closed-child evidence, and the
quality/reviewer receipts described in their closing comments. Those completed
tracker actions are recorded below rather than repeated as recommendations.

## Executive judgment

The purpose and overall decomposition remain sound, but **the currently shown
critical path is not executable from `master` as written**.

Three corrections dominate every scheduling decision:

1. **Converge the real implementation baselines first.** Current `master`
   publishes 399 Units and 21 Stat Blocks. The #52 family claims a 434-Unit,
   330-Stat-Block, 226-spell baseline that exists in the still-open
   [#479](https://github.com/dearlordylord/5e-quint/issues/479) reconstruction
   and [PR #480](https://github.com/dearlordylord/5e-quint/pull/480), not on
   `master`. Moreover, `master` lacks the catalog-install and Unit/Stat Block
   admission sources that closed #51/#53 introduced on that line. PR #480 is
   mergeable but currently `UNSTABLE` at head
   `110282172a69d433d46e183f0a921c05afbe577b`. At 13:09 UTC,
   character-creation QNT had passed while the remaining QNT lanes, Raw Swarm,
   and workspace quality were in progress. An earlier head failed the shared
   workspace-coverage gate, so this reconstruction has not yet converged green.
2. **Converge Effect 4 before starting the QNT-closure verticals.** The closed
   migration prerequisites referenced by #389–#408 are not on this `master`.
   They are being certified by open
   [#386](https://github.com/dearlordylord/5e-quint/issues/386) on
   `work/effect4-certification-gh386`. That line still has the old 399/21
   Surface denominator and therefore must itself be reconciled with PR #480.
3. **Make Source Readiness, not Harness assembly, the terminal node.**
   [#38](https://github.com/dearlordylord/5e-quint/issues/38) is the source-owned
   all-or-nothing gate and belongs in our subgraph. Its independent publication
   prerequisite is #99 -> #409 -> #410. Its current additional blocker #37 is a
   bounded Dirty-Cleanroom Rehearsal used to expose and repair declared-input
   defects before the exact-revision gate. The rehearsal remains diagnostic and
   cannot itself establish Source Readiness.

No requested ticket is already achieved on current `master` except the large
implementation portion of #40. Several results exist on pending branches, but
they are **merge/reconciliation work**, not grounds for closing tickets against
`master`.

## Corrected “our subgraph”

The honest graph is currently:

```text
integration convergence
  #479 / PR #480 catalog + admission reconstruction ─┐
  #386 Effect 4 certification                         ├─ exact common base
                                                     ┘

#52 Unit Static Mechanics Admission
  #464 character-definition roots
  #465 equipment
    #476 typed mastery references -> #478 weapon admission/handoff
    #477 armor/shield sheet projection ───────────────┘
  #466 feature/mastery
    #469 creation   #470 sheet   #471 battle   #472 handoff
  #467 spells
    #473 sheet      #474 battle  #475 handoff
  all four role parents -> #468 -> close #52

#52 + closed #53 -> #117 -> #118 -> #29

#29 -> #31
  #389 protocol seed
    -> #390 creation, #391 battle spine, #392 sheet
    -> #393 handoff
    -> #394..#406 domain verticals
       with #103/#105, #119, #381, #407/#408 as live prerequisites
    -> #211 terminal proof lane -> close #31

#29 + #31 -> #34 Core ────────────┐
#29 + #31 -> #40 Oracle audit ────┼-> #35 Rust Adapter -> #36 Harness
                                  ┘

#45 Surface publication parent
  closed #98 -> #99 -> #409 -> #410 ───────────────┐
#36 -> #37 Dirty-Cleanroom Rehearsal ───────────────┼-> #38 Source Readiness
                                                    ┘

#39 Cleanroom Acceptance Run: intentionally excluded
```

This is a dependency graph, not a prescription to serialize all implementation.
After the common integration base exists, owner-local #52 leaves can run in
parallel. The #31 verticals can prepare infrastructure before #29, but their
denominator and completion claim must be recalibrated against the generated
Slice.

## Current system evidence

### The checked-out source denominator is not the ticket denominator

The canonical publication is assembled from the Unit and Stat Block
collections in
[`surface-catalog.ts`](../../packages/surface/src/surface/surface-catalog.ts#L6-L11).
On the audited SHA, direct `jq` inspection of
[`srd-surface.json`](../../packages/surface/publication/srd-surface.json) gives:

| Revision                      | Units | Stat Blocks | Spells | Weapons |
| ----------------------------- | ----: | ----------: | -----: | ------: |
| audited `master` `f6606edda`  |   399 |          21 |    191 |       9 |
| #52 archived base `a0721b7c5` |   434 |         330 |    226 |       9 |
| PR #480 head `110282172`      |   434 |         330 |    226 |       9 |

The current checked-in support report independently names 399/399 as its final
Unit denominator
([`LEVEL1_9_FULL_SUPPORT.md`](../../plans/unit-profile-coverage/LEVEL1_9_FULL_SUPPORT.md#L14-L28)).
That is useful lower-layer evidence but is not Static Mechanics Admission; the
report itself warns that its accounting views do not substitute for other
claims (lines 28–34).

At current `master`, these expected sources are absent:

```text
packages/surface/src/surface/catalog-install.ts
packages/battle-runtime/src/unit-mechanics-admission.ts
packages/battle-runtime/src/stat-block-mechanics-admission.ts
```

They are present on the #479/PR #480 reconstruction line. Therefore “#51 and
#53 are closed” is tracker history, not proof that their implementation is
present in the audited source state.

### Current runtime still re-recognizes authored records

The core design problem behind #464–#478 and #117/#118 is observable in current
code:

- `parseSupportedUnitFeatureProfile` accepts an authored Unit and returns either
  one broad union member or `null`, selecting among a long sequence of parsers
  ([`unit-feature-support.ts`](../../packages/battle-runtime/src/unit-feature-support.ts#L5945-L6002)).
- Character-to-Battle handoff calls that parser again to recognize Wild Shape
  resources
  ([`index.ts`](../../packages/character-battle-runtime/src/index.ts#L1681-L1687),
  [`index.ts`](../../packages/character-battle-runtime/src/index.ts#L2011-L2038)).
- Battle creature initialization again calls the parser over raw Units and
  silently omits `null` results
  ([`battle-creature-init.ts`](../../packages/character-battle-runtime/src/battle-creature-init.ts#L1032-L1060)).
- Character Sheet modules still accept whole `SpellRecord` values and perform
  local family recognition; representative examples are
  [`prepared-spell-cast.ts`](../../packages/character-sheet-runtime/src/prepared-spell-cast.ts)
  and
  [`spell-invocation.ts`](../../packages/character-sheet-runtime/src/spell-invocation.ts).

These are decisive evidence that parse-once owner projections, proof-bearing
bindings, and dynamic availability remain fresh work. They also explain why a
nonempty Battle support profile cannot serve as the complete Unit denominator.

### QNT breadth exists, but Cleanroom Conformance Closure does not

The current repository has extensive QNT/proof/MBT infrastructure. Public
scripts check QNT inventory, proof closure, proof harness behavior, lane
separation, and the full proof command
([`package.json`](../../package.json#L26-L40)). The current rules-kernel report
contains 147 obligations, with 139 covered and two still needing QNT owners
([`REPORT.md`](../../plans/rules-kernel-coverage/REPORT.md#L7-L29)). Those two
are precisely Insect Plague and Cloudkill
([`REPORT.md`](../../plans/rules-kernel-coverage/REPORT.md#L33-L41)).

What is absent is the #31 relation that derives the eligible denominator from
the generated Slice and proves, role by role, that every runtime-bearing QNT
lane reached its production reducer with decisive observations. A repository
search finds “Conformance Closure” only in the cleanroom glossary, not an
executable closure owner. The existing scripts are necessary inputs, not the
#31 result.

The pending Effect 4 certification branch changes the two area-hazard rows to
covered and contains focused QNT/MBT implementations. Thus #407/#408 should be
integrated and audited from that branch, not independently reimplemented.

### The Opaque Oracle implementation is substantially complete

The package already defines its conformance purpose, source-free role, and
authority boundary
([`README.md`](../../packages/opaque-oracle/README.md#L3-L30)). It builds a
level-one/two workflow projection while retaining all Stat Blocks and closing
mechanics dependencies
([`oracle-startup-catalog.ts`](../../packages/opaque-oracle/src/oracle-startup-catalog.ts#L212-L269)).
Its distribution identity binds the executable, schemas, and projection
([`oracle-distribution.ts`](../../packages/opaque-oracle/src/oracle-distribution.ts#L44-L68),
[`oracle-distribution.ts`](../../packages/opaque-oracle/src/oracle-distribution.ts#L158-L181)).
Network-denied clean-distribution testing is present
([`oracle-distribution.test.ts`](../../packages/opaque-oracle/src/oracle-distribution.test.ts#L123-L155)).
The full quality command runs Oracle schema, corpus, distribution, and
provenance gates
([`package.json`](../../package.json#L61-L74)).

Accordingly, #40 is not a greenfield packaging task. Its valid remaining work is
to replace/reconcile the startup input with the finalized #29 Slice, calibrate
against #31, and rerun the exact source-free distribution audit. Rebuilding the
CLI/HTTP/evaluator stack would duplicate closed #93–#66 work.

### Core, Adapter, Harness, and Source Readiness are not present

The glossary gives distinct roles to Source Readiness, Core, Adapter, Harness,
and Oracle
([`CONTEXT.md`](../cleanroom/CONTEXT.md#L19-L53)). Current root scripts contain
no Core builder, Rust Adapter smoke test, Harness assembler, or atomic
Source-Readiness command; the available cleanroom script is provenance-only
([`package.json`](../../package.json#L19-L24)). Therefore #34, #35, #36, and
#38 remain real deliverables.

Historical generator/readiness plans must not be revived as delivery
scaffolding. Their current owner explicitly says the old A/B queues are parked,
not active, and must be reopened only through tracker-authoritative bounded
issues
([`QNT_GENERATOR_READINESS_BACKLOG.md`](../../plans/QNT_GENERATOR_READINESS_BACKLOG.md#L1-L18)).

## Ticket-by-ticket dispositions

Disposition meanings:

- **fresh** — outcome and boundary still match current architecture;
- **merge/reconcile** — substantive work exists off-master and should be
  integrated/audited rather than restarted;
- **body/dependency correction** — intent remains useful but live scheduling
  metadata or prose is false;
- **close after merge** — evidence appears complete on a pending line, but not
  on current master;
- **not achieved** — no current source artifact satisfies the outcome.

### Static Mechanics Admission and binding

| Ticket                                                       | Disposition                                 | Evidence and required correction                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------ | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#52](https://github.com/dearlordylord/5e-quint/issues/52)   | Fresh outcome; dependency correction        | Keep as the Unit aggregate. Its 434-root evidence is false on current master and its closed prerequisites are absent there. Add #479/integration convergence as a blocker and regenerate every denominator after PR #480 + #386 reconciliation. Do not close.                      |
| [#464](https://github.com/dearlordylord/5e-quint/issues/464) | Fresh; merge/reconcile paused WIP           | The branch has a large character-definition projection/migration, but its latest handoff is paused on the archived `a0721b7c5` base. Rebase/review after convergence; assignment is preservation bookkeeping, not active ownership.                                                |
| [#465](https://github.com/dearlordylord/5e-quint/issues/465) | Fresh reconciliation parent                 | The owner split (#476/#477/#478) correctly replaces a rejected sheet-local aggregate. Recompute the exact 13-root result after convergence. Keep non-runnable.                                                                                                                     |
| [#466](https://github.com/dearlordylord/5e-quint/issues/466) | Fresh reconciliation parent                 | Owner-local creation/sheet/battle/handoff projections fit package direction and current repeated parsing. Its 158-root counts are revision evidence, not invariants. Keep non-runnable and recalculate.                                                                            |
| [#467](https://github.com/dearlordylord/5e-quint/issues/467) | Fresh reconciliation parent                 | The split is supported by current whole-`SpellRecord` consumers. Its 226-spell baseline exists only off-master. Keep; recalculate after convergence.                                                                                                                               |
| [#468](https://github.com/dearlordylord/5e-quint/issues/468) | Fresh terminal composer                     | Remains the correct single atomic composition/binding point. It must use the converged denominator and cannot begin from current master.                                                                                                                                           |
| [#469](https://github.com/dearlordylord/5e-quint/issues/469) | Fresh; preserved research only              | Assignment/comment history does not show an integrated implementation. Resume from a converged base; do not count as in progress.                                                                                                                                                  |
| [#470](https://github.com/dearlordylord/5e-quint/issues/470) | Fresh, not achieved                         | Current sheet code still parses raw feature/spell records. Runnable only after baseline convergence; no extra leaf is yet justified.                                                                                                                                               |
| [#471](https://github.com/dearlordylord/5e-quint/issues/471) | Fresh; rejected exploration exists          | The branch contains useful projection work but is explicitly preserved after rejection. Re-research and selectively rebuild/reconcile; do not cherry-pick its aggregate installer.                                                                                                 |
| [#472](https://github.com/dearlordylord/5e-quint/issues/472) | Fresh, not achieved                         | Repeated parsing at handoff is directly visible in current code. Keep as a separate workflow join rather than merging into sibling runtime owners.                                                                                                                                 |
| [#473](https://github.com/dearlordylord/5e-quint/issues/473) | Fresh, not achieved                         | Current Character Sheet spell consumers demonstrate the owner-local problem. Exact 31 partial-root evidence must be regenerated.                                                                                                                                                   |
| [#474](https://github.com/dearlordylord/5e-quint/issues/474) | Fresh, not achieved                         | Existing Battle profile modules are the correct owners; this should migrate them, not add another registry. Recompute 98/23 evidence.                                                                                                                                              |
| [#475](https://github.com/dearlordylord/5e-quint/issues/475) | Fresh, not achieved                         | Keep as the sheet/Battle spell composition seam. It should not be merged into #473 or #474 because sibling package ownership is real.                                                                                                                                              |
| [#476](https://github.com/dearlordylord/5e-quint/issues/476) | Fresh; merge/reconcile paused WIP           | Current published weapon mastery remains a bare string. The branch changes canonical source records and codecs to typed Unit references but is paused on the old base. Rebase and review rather than restart.                                                                      |
| [#477](https://github.com/dearlordylord/5e-quint/issues/477) | Fresh, not achieved                         | The four-root armor/shield sheet projection is a bounded owner leaf. Keep separate from Battle weapon admission.                                                                                                                                                                   |
| [#478](https://github.com/dearlordylord/5e-quint/issues/478) | Fresh, correctly blocked                    | The six-resolved/three-rejected result depends on #476. Keep the edge and rederive it after catalog convergence.                                                                                                                                                                   |
| [#117](https://github.com/dearlordylord/5e-quint/issues/117) | Fresh intent; body corrected; preserved WIP | Its body was corrected during this audit to make it non-runnable while native blockers remain and to record `cf7ef462f` as a selective-reuse handoff. After #52, audit rather than blindly cherry-pick the candidate; assignment still denotes preservation, not active ownership. |
| [#118](https://github.com/dearlordylord/5e-quint/issues/118) | Fresh intent; body corrected                | Its body was corrected during this audit to make it non-runnable while #117 is open while preserving the `discoverBattleActs` direction and the distinct unsupported-vs-currently-unavailable outcome.                                                                             |
| [#29](https://github.com/dearlordylord/5e-quint/issues/29)   | Fresh, not achieved                         | No generated Cleanroom Mechanics Slice exists. The ticket correctly owns membership and graph closure; none of #52’s diagnostics may become an allowlist. Mark it blocked/not-runnable while #118 is open.                                                                         |

No additional admission leaf is justified before the converged denominator is
rerun. The missing work is already partitioned by actual owner; adding another
registry/manifest leaf now would encode uncertainty as architecture.

### Executable QNT Conformance Closure

[#31](https://github.com/dearlordylord/5e-quint/issues/31) is **fresh and not
achieved**. Its body correctly distinguishes semantic core, proof, driver,
bridge, route, fixture, and selected-identity evidence. Its 21 live subissues
are part of our subgraph because they are the actual implementation graph, not
incidental tracker detail.

| Ticket(s)                                                                                                                                                                                | Disposition                                               | Current evidence / correction                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#389](https://github.com/dearlordylord/5e-quint/issues/389)                                                                                                                             | Fresh first vertical                                      | Derive the executable protocol from existing owners. Although its only native blocker #374 is closed, that code is not on current master. Gate practical start on #386/common-base convergence.                                                       |
| [#390](https://github.com/dearlordylord/5e-quint/issues/390), [#391](https://github.com/dearlordylord/5e-quint/issues/391), [#392](https://github.com/dearlordylord/5e-quint/issues/392) | Fresh verticals                                           | Creation, Battle spine, and Sheet remain distinct reducer contexts. They follow #389 and must be calibrated to #29 before claiming completion.                                                                                                        |
| [#393](https://github.com/dearlordylord/5e-quint/issues/393)                                                                                                                             | Fresh, dependency audit needed                            | Its closed #382 prerequisite remains natively “blocked by” open #381. Resolve that contradictory dependency/closure metadata before relying on #382 as proof.                                                                                         |
| [#394](https://github.com/dearlordylord/5e-quint/issues/394)–[#399](https://github.com/dearlordylord/5e-quint/issues/399)                                                                | Fresh capability verticals                                | The separation by attack/equipment, movement/interrupt, and feature families matches current rule-core ownership. No merge is recommended. Each completion denominator must derive from #29, not its issue title.                                     |
| [#400](https://github.com/dearlordylord/5e-quint/issues/400)–[#406](https://github.com/dearlordylord/5e-quint/issues/406)                                                                | Fresh spell/effect verticals                              | Keep the domain decomposition. Their live blockers #103/#105, #119, and #381 are genuine prerequisites and were missing from the informal short graph.                                                                                                |
| [#407](https://github.com/dearlordylord/5e-quint/issues/407), [#408](https://github.com/dearlordylord/5e-quint/issues/408)                                                               | Implemented on pending #386 line; close after merge/audit | Current master still reports both as `needs-qnt-owner`, but `work/effect4-certification-gh386` contains focused QNT/MBT owners and marks them covered. Do not duplicate. Integrate, rerun registry/proof gates on the converged revision, then close. |
| [#211](https://github.com/dearlordylord/5e-quint/issues/211)                                                                                                                             | Fresh terminal gate                                       | Dynamic proof-module enumeration is correct. It must run after all context children and #29 against one exact revision; a prior broad proof pass is not a receipt.                                                                                    |

Direct open prerequisites that must be visible in our subgraph are:

- [#381](https://github.com/dearlordylord/5e-quint/issues/381), persistent
  spells/active effects, currently part of Effect 4 integration;
- [#102](https://github.com/dearlordylord/5e-quint/issues/102), the synthetic
  spell-attack interruption vertical, which blocks both
  [#103](https://github.com/dearlordylord/5e-quint/issues/103) and
  [#56](https://github.com/dearlordylord/5e-quint/issues/56);
- [#103](https://github.com/dearlordylord/5e-quint/issues/103), the complete
  attack-burst interruption trace required by #401;
- [#105](https://github.com/dearlordylord/5e-quint/issues/105), the independent
  save-gated damage interruption trace required by #401;
- [#56](https://github.com/dearlordylord/5e-quint/issues/56), the synthetic
  Shield interruption/resume vertical, which blocks
  [#119](https://github.com/dearlordylord/5e-quint/issues/119);
- [#119](https://github.com/dearlordylord/5e-quint/issues/119), the repeated
  Magic Missile/Shield allocation parity owner required by #406.

The Effect 4 certification line already contains generic interruption, Shield,
attack-burst, save-damage, and Magic Missile QNT/runtime owners. That is
substantial overlap, but it is not yet proof that the exact synthetic,
connector-backed observations in #102/#103/#105/#56/#119 are satisfied. After
#386 merges, re-audit these five tickets against the integrated lanes and
either close with exact evidence or retain only the smallest missing vertical;
do not create parallel interruption models preemptively.

The #389–#408 bodies say their expected sets derive from #29, yet most do not
have a native #29 blocker. That can be intentional if they build reusable lane
infrastructure early. Clarify all bodies consistently:

> Implementation may proceed against current executable owners, but the ticket
> cannot close until its expected set is regenerated and passes against #29.

Adding #29 as a blocker to every vertical would prevent useful parallel work;
adding this explicit completion condition is the smaller correction.

### Delivery artifacts

| Ticket                                                     | Disposition                                                      | Evidence and required correction                                                                                                                                                                                                                       |
| ---------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [#34](https://github.com/dearlordylord/5e-quint/issues/34) | Fresh, not achieved                                              | No Core artifact builder/index exists. Keep blocked by #29/#31; do not prebuild against unstable inputs.                                                                                                                                               |
| [#40](https://github.com/dearlordylord/5e-quint/issues/40) | Mostly achieved implementation; body corrected; fresh final join | Its body was corrected during this audit to be non-runnable behind #29/#31, preserve the `f3a200a13` implementation, and limit the residue to Slice input reconciliation, QNT calibration, and exact distribution re-audit. Do not rebuild the Oracle. |
| [#35](https://github.com/dearlordylord/5e-quint/issues/35) | Fresh, not achieved                                              | No minimal Rust Adapter exists. Exactly one native property-test example remains a useful anti-framework constraint. Keep blocked by #34/#40.                                                                                                          |
| [#36](https://github.com/dearlordylord/5e-quint/issues/36) | Fresh, not achieved                                              | No Harness assembler/discovery contract exists. Keep after Core, Adapter, and Oracle stabilization.                                                                                                                                                    |

Do not merge #34, #35, and #36. Their distinct language-neutral corpus,
language integration, and deployment-instruction roles are domain distinctions,
not project-management ceremony.

### Terminal Source Readiness and publication integrity

| Ticket                                                       | Disposition                              | Recommendation                                                                                                                                                                                                     |
| ------------------------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [#45](https://github.com/dearlordylord/5e-quint/issues/45)   | Fresh non-runnable publication parent    | Keep as the strict SRD Surface publication outcome. Its remaining store/lease/CLI descendants are the actual open work; do not infer completion from the already-generated schema/catalog artifacts.               |
| [#98](https://github.com/dearlordylord/5e-quint/issues/98)   | Achieved closed artifact prerequisite    | Retain as historical evidence for the generated strict aggregate/schema pair. It enables #99 but does not satisfy the missing atomic publication-store operation.                                                  |
| [#99](https://github.com/dearlordylord/5e-quint/issues/99)   | Fresh direct prerequisite                | Implement the typed two-slot Surface publication store; it is unblocked because #98 is closed.                                                                                                                     |
| [#409](https://github.com/dearlordylord/5e-quint/issues/409) | Fresh, correctly blocked                 | Continue the same operation into live cross-process lease/recovery. Do not merge with #99: the fake/store algorithm and live process boundary have materially different risks.                                     |
| [#410](https://github.com/dearlordylord/5e-quint/issues/410) | Fresh contract leaf                      | Route every public CLI path through the sole store operation and remove bypasses. It correctly blocks Source Readiness.                                                                                            |
| [#37](https://github.com/dearlordylord/5e-quint/issues/37)   | Fresh required diagnostic                | Run after #36 to expose and repair declared-input, assembly, and instruction defects before the exact-revision gate. Its evidence is deliberately non-authoritative and must not be presented as Source Readiness. |
| [#38](https://github.com/dearlordylord/5e-quint/issues/38)   | Fresh terminal node; add to our subgraph | This is the atomic exact-revision Source Readiness gate. Keep both live blockers: #37 supplies the required pre-gate diagnostic/repair cycle, while #410 supplies publication integrity.                           |

The glossary defines Source Readiness as one coherent source state with a
complete Harness and all source-owned gates passing, and explicitly says a
Dirty-Cleanroom Rehearsal does not establish it
([`CONTEXT.md`](../cleanroom/CONTEXT.md#L19-L20)). Thus #37 is a required
repair-producing predecessor whose evidence remains non-authoritative; #38 is
the authoritative exact-revision gate. The acceptance run remains outside this
report.

## Tracker reconciliation actions and remaining corrections

Completed during this research window:

- Closed stale Opaque Oracle aggregates
  [#63](https://github.com/dearlordylord/5e-quint/issues/63),
  [#61](https://github.com/dearlordylord/5e-quint/issues/61),
  [#32](https://github.com/dearlordylord/5e-quint/issues/32), and
  [#33](https://github.com/dearlordylord/5e-quint/issues/33) against
  integrated commit `f3a200a13693d6c08026398433dd706779e52647`, their closed
  native children, the exact-revision `pnpm quality:milestone` receipt, and
  converged independent reviews. This makes #40's remaining work accurately a
  final #29/#31 calibration and source-free audit, not untracked construction.
- Rewrote #117 and #118 to be non-runnable while their native blockers remain.
  #117 now records the preserved `cf7ef462f` selective-reuse handoff; #118
  preserves the `discoverBattleActs` direction.
- Rewrote #40 to be non-runnable behind #29/#31, record the integrated
  `f3a200a13` implementation that must be preserved, and narrow its residue to
  Slice input reconciliation, QNT calibration, and exact distribution re-audit.

Remaining corrections after integration ownership confirms them:

1. Add #479/PR #480 and #386 convergence to the effective frontier. Until both
   land together, remove `ready-for-agent` from or add an explicit blocker to
   #464 and #469–#478. The current assignments on #464/#469/#471/#476/#117
   should be described as preserved handoffs, not active claims.
2. Update every #52-family baseline comment/body from “current” to
   “measured at revision …”; regenerate counts on the converged base before
   implementation acceptance.
3. Mark #29, #34, #35, #36, and #211 non-runnable while their native
   blockers are open. `ready-for-agent` currently communicates scope, not
   readiness, and contradicts the repository’s frontier semantics.
4. Clarify #389–#408 that early lane construction is allowed but closure must
   be regenerated against #29. Resolve #382’s closed-while-blocked-by-#381
   contradiction before #393.
5. After #386/common-base integration, verify the Insect Plague/Cloudkill
   registry and focused lanes. If green, close #407/#408 without duplicate
   implementation.
6. Add #37 and #38 as the terminal diagnostic and exact-revision tickets in our
   subgraph. Retain both paths into #38: #36 -> #37 and #99 -> #409 -> #410.

## Efficient execution order

1. **Integration convergence:** finish PR #480 quality/review; finish #386;
   merge/reconcile both into one clean base; rerun publication counts,
   admission diagnostics, rules-kernel registry, and the public milestone.
2. **Repair tracker truth:** apply the body/dependency/assignment corrections
   above using the converged SHA as evidence.
3. **Parallel Static Admission owners:** run #464, #469, #470, #471, #473,
   #474, #476, #477, plus handoff work where upstream projections are stable.
   Then #472/#475/#478, reconcile #465/#466/#467, and compose #468/#52.
4. **Binding and Slice:** #117 -> #118 -> #29.
5. **QNT closure:** build #389 protocol infrastructure as soon as the common
   Effect 4 base exists; run verticals in their native dependency order, but
   close/recalibrate them only against #29. Finish with #211 and close #31.
6. **Parallel artifact join:** #34 and the residual #40 work in parallel; then
   #35 and #36.
7. **Independent publication integrity:** #99 -> #409 -> #410 can proceed in
   parallel with the semantic chain after integration convergence.
8. **Terminal diagnostics and exact-revision gate:** run #37 after #36, repair
   every declared-input or assembly defect it exposes, then run #38 with #410
   complete. Stop before #39.

## Reproducible evidence commands

The principal read-only commands used were:

```sh
git rev-parse HEAD
jq -r '.units | group_by(.kind)[] | [.[0].kind,length] | @tsv' \
  packages/surface/publication/srd-surface.json
git show <revision>:packages/surface/publication/srd-surface.json | jq ...
gh issue view <number> --json number,title,state,url,body,labels,assignees,comments,updatedAt
gh api --paginate repos/dearlordylord/5e-quint/issues/<number>/sub_issues
gh api --paginate repos/dearlordylord/5e-quint/issues/<number>/dependencies/blocked_by
gh pr view 480 --json state,headRefOid,mergeable,mergeStateStatus,statusCheckRollup
rg -n 'Conformance Closure|parseSupportedUnitFeatureProfile|SpellRecord' packages scripts plans
```

All GitHub claims in this report were re-read from the first-party API on the
research date. Branch evidence is intentionally labeled pending until it is
part of `master`; tickets are not treated as the final truth.
