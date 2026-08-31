# Cleanroom Source Readiness execution ledger

> **Continuity contract:** [GitHub issue #38](https://github.com/dearlordylord/5e-quint/issues/38)
> owns the terminal Source Readiness outcome, and the recursively linked issues
> own their requirements. This file is a temporary current-state execution
> index: it owns ordering, the current frontier, worktree leases, and
> exact-revision milestone receipts. It is not a second specification or
> historical journal. Delete it when #38 closes.

## Resume here

This section is the sole mutable handoff for a new session.

- Ledger state observed: 2026-08-31
- Current frontier: `SR-04`
- Active work: Paused before #474 Battle spell mechanics procedure admission
- Active owner: None while paused
- Last completed landing unit: `SR-04F` Battle feature and mastery mechanics
  projection, #471
- Last accepted milestone SHA: `d383f8a7a`
- Coordination base before `SR-00`: `51beff526`
- `SR-00` integration base: `301229532`
- Active landing unit: None
- Next action: wait for operator authorization, then start #474 from the
  ledger-receipted `master`; do not reuse the completed SR-04F worktree as the
  next landing unit
- Parallel work allowed now: `SR-09` and `SR-12` are available, subject to the
  serialized write hotspots and a current-base write-set audit
- Cleanroom Acceptance Run #39: excluded

Before acting, compare this section with current `master`, live native GitHub
dependencies, and active worktree ownership. If they disagree, current source
and generated artifacts win. Repair this section in a ledger-only commit before
claiming new implementation work.

For prior system-state evidence and ticket dispositions, consult
[`docs/research/cleanroom-source-readiness-subgraph-refresh.md`](../docs/research/cleanroom-source-readiness-subgraph-refresh.md).
Recover the canonical ticket graph by recursively following native blockers and
subissues from #38. The #368–#386 and #479 convergence sequence is the temporary
operational overlay recorded here, not a new domain dependency.

## How to update this ledger

For every implementation or gate milestone:

1. Create or resume the active landing unit's short-lived integration branch and
   worktree from the latest ledger-accepted `master`.
2. Merge each reviewed implementation-lane result into that integration branch
   as soon as it is coherent; do not wait for every sibling lane before
   integrating completed work.
3. Bring the latest `master` into the integration branch, run the checkpoint's
   composite review and gates, and merge the accepted landing unit into
   `master`.
4. Comment on the owning ticket with the exact `master` landing SHA, focused and
   composite verification, reviewer convergence, and remaining blockers. Close
   only satisfied tickets.
5. Immediately make a ledger-only follow-up commit that:
   - updates **Resume here**;
   - updates the checkpoint state below;
   - appends one receipt row;
   - records the next available checkpoint and active worktree leases.
6. Delete the completed landing unit's integration branch/worktree after the
   ledger follow-up is on `master`.
7. Do not begin newly unblocked work until that ledger follow-up lands.

The follow-up commit is necessary because a Git commit cannot contain its own
future SHA. The receipt records the preceding implementation or gate SHA, not
the ledger-only commit that describes it.

Do not copy ticket acceptance criteria into this file. Link the ticket and
record only execution state that the issue graph cannot express: checkpoint
ordering, exact base/landing SHAs, current leases, verification receipts, and
what became available.

## Checkpoint states

- `Waiting`: its start prerequisites are not yet satisfied.
- `Available`: it may be claimed from the named stable base.
- `Active`: one named owner and worktree hold its write lease.
- `Receipt pending`: implementation/gates landed, but the ticket comment and
  ledger follow-up are not both complete.
- `Complete`: the exact receipt is recorded and downstream work may rely on it.

Only one state may apply to a checkpoint. A ticket may remain open after a
checkpoint completes when later Slice-derived recalibration is part of that
ticket's acceptance.

## Stable checkpoint map

There are **20 coordination checkpoints**, `SR-00` through `SR-19`.
Checkpoints containing several tickets use master-merge landing units named
`SR-<checkpoint><letter>`, such as `SR-04A`. Each landing unit owns one
short-lived integration branch and one coherent master merge. The coordination
checkpoint becomes `Complete` only after all of its landing units and named
results are on one coherent `master` line.

| ID      | State     | Outcome / tickets                                          | Start after                  | Complete after                     |
| ------- | --------- | ---------------------------------------------------------- | ---------------------------- | ---------------------------------- |
| `SR-00` | Complete  | Land and certify the user-owned #368–#386 line             | current user session         | #386 receipt                       |
| `SR-01` | Complete  | Reconcile and land #479 / PR #480                          | `SR-00`                      | #479 receipt                       |
| `SR-02` | Complete  | Establish the exact common-base convergence receipt        | `SR-01`                      | stable common-base gate            |
| `SR-03` | Complete  | Land typed weapon-mastery references, #476                 | `SR-02`                      | #476 receipt                       |
| `SR-04` | Available | Land owner projections, #464/#469/#477/#470/#473/#471/#474 | `SR-03`                      | every named ticket receipt         |
| `SR-05` | Waiting   | Land joins/composition and close #465–#468/#52             | `SR-04`                      | #52 receipt                        |
| `SR-06` | Waiting   | Bind admitted mechanics, #117                              | `SR-05`                      | #117 receipt                       |
| `SR-07` | Waiting   | Derive dynamic availability, #118                          | `SR-06`                      | #118 receipt                       |
| `SR-08` | Waiting   | Generate the Cleanroom Mechanics Slice, #29                | `SR-07`                      | #29 receipt                        |
| `SR-09` | Available | Implement the typed two-slot publication store, #99        | `SR-03` shared-Surface lease | #99 receipt                        |
| `SR-10` | Waiting   | Add live cross-process leasing/recovery, #409              | `SR-09`                      | #409 receipt                       |
| `SR-11` | Waiting   | Route the public CLI and close #410/#45                    | `SR-10`                      | #410 and #45 receipts              |
| `SR-12` | Available | Land QNT protocol/context spine, #389–#393                 | `SR-02`                      | every named ticket receipt         |
| `SR-13` | Waiting   | Land QNT prerequisites/verticals, #394–#408                | `SR-12`; see execution order | `SR-08` plus all vertical receipts |
| `SR-14` | Waiting   | Recalibrate, run #211, and close #31                       | `SR-08`, `SR-13`             | #211 and #31 receipts              |
| `SR-15` | Waiting   | Publish Core and calibrate Oracle, #34/#40                 | `SR-08`, `SR-14`             | #34 and #40 receipts               |
| `SR-16` | Waiting   | Publish the minimal Rust Adapter, #35                      | `SR-15`                      | #35 receipt                        |
| `SR-17` | Waiting   | Assemble the Cleanroom Harness, #36                        | `SR-15`, `SR-16`             | #36 receipt                        |
| `SR-18` | Waiting   | Run and repair Dirty-Cleanroom Rehearsal, #37              | `SR-17`                      | #37 receipt                        |
| `SR-19` | Waiting   | Establish atomic Source Readiness, #38                     | `SR-11`, `SR-18`             | #38 closed                         |

## Milestone receipt ledger

Append one row per completed landing unit and one consolidating row per completed
coordination checkpoint. Ticket/slice landings inside a checkpoint first append
rows such as `SR-04A`; the final checkpoint row consolidates them after every
required unit has landed.

| Checkpoint/unit | Base SHA    | Accepted SHA | Result                                                                                                                                                                                                                                      | Verification                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Ticket evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Unlocked         |
| --------------- | ----------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `SR-00`         | `f566a5dca` | `ec966d06e`  | Operational landing complete; #386 certification remains open with an operator-accepted proof/quality exception                                                                                                                             | Final reviews converged; five public Battle MBTs passed; Oracle self-tests 15/15 and 7,246-identity verifier passed; complexity regressions zero; no terminal proof or milestone-quality pass claimed                                                                                                                                                                                                                                                                                                                                                        | [#381 closed receipt](https://github.com/dearlordylord/5e-quint/issues/381#issuecomment-5472588960); [#386 open receipt](https://github.com/dearlordylord/5e-quint/issues/386#issuecomment-5472589098)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `SR-01`          |
| `SR-01`         | `b2457bb42` | `aceda1aa5`  | Local master now contains the reviewed SR-00 line and merged #479 / PR #480 cohort without importing the four excluded deltas                                                                                                               | Standards and Spec/RAW reviews converged with no findings; Battle Runtime typecheck passed; focused transaction 19/19, projection 27/27, spellcasting allocation 40/40, Surface 27/27 plus encoded-reference 1/1; rules-kernel 162 obligations and unit-profile 435 Units/272 profiles passed; the operator-waived interrupted broad/full run was not replayed and is not claimed as passed                                                                                                                                                                  | [#479 final merge and preservation receipt](https://github.com/dearlordylord/5e-quint/issues/479#issuecomment-5470608738); [PR #480](https://github.com/dearlordylord/5e-quint/pull/480)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `SR-02`          |
| `SR-02`         | `94e28943d` | `22aa1a6f8`  | Exact common-base Surface, RAW-coverage, rules-kernel, QNT, and Static Mechanics Admission evidence converged on local master                                                                                                               | Standards and Spec/RAW reviews converged with no findings; Surface/Battle/publication typechecks passed; Surface 30/30 and admission/projection 29/29 focused tests passed; publication synchronized 932 Dhall/JSON peers and verified its 39 changed/344 added delta; RAW 23,966/23,966, rules-kernel 162, Unit profiles 435/272, and QNT inventory 833/833 passed; the operator-waived broad/full run was not replayed or claimed, and #481 owns the separate Stone Giant parity diagnostic                                                                | [#38 SR-02 receipt](https://github.com/dearlordylord/5e-quint/issues/38#issuecomment-5473537527); partial audits [#102](https://github.com/dearlordylord/5e-quint/issues/102#issuecomment-5473536917), [#103](https://github.com/dearlordylord/5e-quint/issues/103#issuecomment-5473537001), [#105](https://github.com/dearlordylord/5e-quint/issues/105#issuecomment-5473537103), [#56](https://github.com/dearlordylord/5e-quint/issues/56#issuecomment-5473537178), [#119](https://github.com/dearlordylord/5e-quint/issues/119#issuecomment-5473537264); accepted behavior retained behind #389: [#407](https://github.com/dearlordylord/5e-quint/issues/407#issuecomment-5473537344), [#408](https://github.com/dearlordylord/5e-quint/issues/408#issuecomment-5473537423) | `SR-03`, `SR-12` |
| `SR-03`         | `18673a70c` | `1520c58f3`  | Typed weapon-to-mastery authored references landed across Surface content, publication, catalog diagnostics, and narrowed runtime admission                                                                                                 | Standards and Spec/RAW/architecture reviews converged locally with no findings; changed-file lint and diff checks passed; Surface and Battle typechecks passed; focused Surface 336/336, Battle 6/6, and Character 4/4 tests passed; publication synchronized 932 Dhall/JSON peers; authored-id dispatch remained baseline-red with the same 130 production violations; no broad/full or QNT/MBT pass claimed                                                                                                                                                | [#476 closed receipt](https://github.com/dearlordylord/5e-quint/issues/476#issuecomment-5474179379)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `SR-04`, `SR-09` |
| `SR-04A`        | `c2218a8cd` | `65bbb45b8`  | Context-independent Character Definition projection and graph admission landed for class, subclass, background, and species roots                                                                                                           | Two local RAW/domain/architecture/standards reviews converged; Surface and Character Creation Runtime typechecks passed; focused final suite 140/140 passed; changed-file formatting and lint passed; authored-id dispatch remained baseline-red with the same 130 production violations and collision evidence; no broad/full or QNT/MBT pass claimed                                                                                                                                                                                                       | [#464 closed receipt](https://github.com/dearlordylord/5e-quint/issues/464#issuecomment-5474448769)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | #469             |
| `SR-04B`        | `2b5989812` | `4314430dd`  | Source-free Character Creation feature/trait projection landed across discovery, finalization, advancement, and specialized partial-root consumers, with exact mechanics-path dispositions for the seven partial roots                      | Two local RAW/domain/architecture/connascence/standards reviews converged; Surface typecheck and 622/622 tests passed; Character Creation Runtime typecheck and 507 passed/2 skipped tests passed; Unit-profile coverage passed for 435 Units/272 profiles; changed-file formatting, lint, and diff checks passed; authored-id dispatch remained baseline-red with the unchanged 130 production violations and collision evidence; no broad/full or QNT/MBT pass claimed                                                                                     | [#469 closed receipt](https://github.com/dearlordylord/5e-quint/issues/469#issuecomment-5474879699)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | #477             |
| `SR-04C`        | `0a12f771e` | `1f356613e`  | Character Sheet now owns one source-free static projection for the three armor roots and one Shield root, and Armor Class loadout consumption uses the narrowed correlated facts                                                            | Two local RAW/domain/architecture/connascence/standards reviews converged; Character Sheet and Surface typechecks passed; focused Character Sheet 23/23 and Surface 188/188 tests passed; focused projection/Armor Class coverage reached 94.24% statements with the new projection fully covered; split ownership and Unit-profile 435/272 checks passed; formatting, lint, and diff checks passed; authored-id dispatch remained at the unchanged known baseline; the unrelated full sheet sample was 491/492 and no broad/full or QNT/MBT pass is claimed | [#477 closed receipt](https://github.com/dearlordylord/5e-quint/issues/477#issuecomment-5475159645)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | #470             |
| `SR-04D`        | `37119f6f4` | `e210067de`  | Character Sheet now owns one source-free static projection for class-feature, feat, and species-trait roots; current production consumers use its narrowed facts, with exact mechanics-path dispositions for the six partial roots          | Two local RAW/domain/architecture/connascence/standards/spec reviews converged; Character Sheet and Surface typechecks passed; focused Character Sheet 295/295 and Surface 188/188 tests passed; split ownership and Unit-profile 435/272 checks passed; changed-file formatting, lint, isolated complexity, and diff checks passed; authored-id dispatch and workspace complexity remained at their known integration baselines; the operator-waived broad/full run was not replayed and no QNT/MBT pass is claimed                                         | [#470 closed receipt](https://github.com/dearlordylord/5e-quint/issues/470#issuecomment-5475779117)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | #473             |
| `SR-04E`        | `e210067de` | `11d7dfc22`  | Character Sheet now owns one root-record-identity-free spell admission projection; current production consumers use projected facts, with exact mechanics-path dispositions for all 31 partial roots                                        | Standards and Spec/RAW/domain/architecture/connascence reviews converged with no findings; Character Sheet and Surface typechecks passed; projection 77/77, focused Character Sheet 198/198, and Surface familiar-form 4/4 tests passed; split ownership and Unit-profile 435/272 checks passed; formatting, lint, and diff checks passed; authored-id dispatch remained at the identical 130-violation fixed-base baseline; the wider non-MBT sample retained its known unrelated 507/508 schema failure and no broad/full or QNT/MBT pass is claimed       | [#473 closed receipt](https://github.com/dearlordylord/5e-quint/issues/473#issuecomment-5477996798)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | #471             |
| `SR-04F`        | `11d7dfc22` | `d383f8a7a`  | Battle now owns focused source-free procedure admission for the canonical feature, species-trait, mastery, Indomitable, Wild Shape, and Monk Focus roots; migrated Battle consumers carry admitted facts with exact nine-root path evidence | RAW/domain/architecture/connascence/Standards/Spec reviews converged with no findings; Battle and Surface typechecks passed; final admission/evidence 79/79, Monk/Open Hand/Stunning Strike 45/45, tracer regression 1/1, resource-boundary 43/43, and broader boundary/profile 139/139 tests passed; Battle import ownership and Unit-profile 435/272 checks passed; authored-id self-test passed while the full check retained the confirmed 130-violation fixed-base certificate mismatch; no broad/full or QNT/MBT pass is claimed                       | [#471 closed receipt](https://github.com/dearlordylord/5e-quint/issues/471#issuecomment-5480739757)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | #474             |

## Active landing table

This table prevents worktrees from silently drifting or sharing write ownership.
Clear a row only after its landing is recorded on the ticket or the work is
explicitly abandoned.

| Checkpoint/unit | Ticket/slice | Owner | Worktree/branch | Base SHA | Write lease | State |
| --------------- | ------------ | ----- | --------------- | -------- | ----------- | ----- |

## Landing discipline

- Create one short-lived integration branch/worktree for the active landing
  unit from the latest ledger-accepted green `master`. Use a name such as
  `integration/cleanroom-sr-04a`.
- Branch implementation worktrees from that exact landing-unit base, never from
  another implementation worktree.
- Use at most three implementation worktrees plus the landing unit's one
  integration/review worktree.
- Give every lane one ticket or one independently useful slice and a declared
  package/file write lease.
- Merge a coherent lane result into the integration branch as soon as its
  focused review converges. The integration branch must merge into `master`
  before its landing unit crosses a second calendar day. If it cannot, stop and
  redefine smaller production-consumed landing units from current `master`.
- Before composite review, merge the latest `master` into the integration
  branch and re-run affected focused checks. Do not perform the final gate on a
  stale base.
- Run focused typecheck/tests and applicable focused QNT/MBT gates under the
  repository lock protocol. Only one worktree runs broad or MBT-heavy gates at
  a time.
- Complete RAW traceability where rules change, ubiquitous-language/domain,
  architecture/connascence, and standards/specification reviewer loops. Fix
  reasonable findings and repeat until converged.
- Merge the landing unit into `master` immediately after the composite receipt
  is green. Later landing units start from that new `master`; still-active lanes
  for the same unit synchronize through its integration branch before making
  completion claims.
- Reserve `pnpm quality:milestone` for `SR-02`, `SR-05`, `SR-14`, `SR-17`, and
  `SR-19`, plus any earlier checkpoint whose cross-package risk justifies it.

## Serialized write hotspots

Only the landing/review worktree may regenerate shared artifacts after the
canonical owner lands. Never grant these files to concurrent lanes without a
current-base write-set audit proving disjoint ownership:

- Surface schema and publication files;
- package entrypoints and barrel exports;
- root/package manifests and `pnpm-lock.yaml`;
- rules-kernel/QNT inventories and generated reports;
- Character-to-Battle handoff composition;
- global quality and complexity baselines.

`SR-03` receives the first post-convergence shared-Surface lease. `SR-09` may
develop in parallel only if its write set is proven disjoint; otherwise it
starts from the accepted `SR-03` SHA. Publication regeneration and `SR-09`–
`SR-11` finalization alternate through the landing coordinator.

## Integration and review loop

Every master-merge landing unit follows the same loop:

```text
accepted master SHA
  -> landing-unit integration worktree
       -> implementation worktrees with disjoint leases
       -> focused tests and lane review
       -> merge completed lanes into integration
       -> synchronize latest master
       -> regenerate shared projections once
       -> composite RAW/domain/architecture/standards reviews
       -> focused join gates and named milestone gate
  -> merge landing unit into master
  -> ticket evidence
  -> ledger-only receipt commit on master
  -> delete landing-unit branches/worktrees
```

The integration branch is coordination state, not an alternate product line.
No subsequent checkpoint branches from it before it lands on `master`. If a
coordination checkpoint contains more than one same-day master merge, allocate
lettered landing units and a fresh integration branch for each one.

## Checkpoint execution notes

### `SR-00`–`SR-02`: convergence

- `SR-00` is exclusively owned by the user's #368–#386 session. Do not copy or
  duplicate its work.
- `SR-01` starts from the exact #386 landing. Treat #479/PR #480 as evidence and
  selectively reusable commits. Resolve its quality failure rather than
  bypassing it.
- If #479 cannot become green in one session, split reconstruction into
  independently coherent landings; do not create another long-lived aggregate
  integration line.
- `SR-02` regenerates Surface publication/reports, reruns Static Mechanics
  Admission diagnostics, audits rules-kernel/QNT inventory and #407/#408, then
  runs the stable quality/reviewer gate on one exact SHA.
- At `SR-02`, audit #102/#103/#105/#56/#119 against landed #386 behavior. Close
  satisfied tickets with exact evidence instead of duplicating them.

### `SR-03`–`SR-05`: Static Mechanics Admission

- `SR-03` owns the canonical Surface schema/reference change in #476. If needed,
  slice it into: typed schema plus one production consumer; authored corpus and
  regenerated publication; remaining consumers and old-path deletion.
- After `SR-03`, `SR-04` runs three serial-per-package trains in parallel:
  - Creation: #464, then #469;
  - Character Sheet: #477, then #470, then #473;
  - Battle: #471, then #474.
- #464 may land as: projection plus a production discovery consumer;
  finalization/selection consumers; repeated-recognition deletion and exact
  admission closure.
- `SR-05` serializes #478, #472, and #475 through the Character-to-Battle
  handoff owner unless a current-base audit proves disjoint files. Then
  reconcile #465/#466/#467, land #468, regenerate the exact denominator, and
  close #52.

### `SR-06`–`SR-08`: binding and Slice

These are serial because each changes the next contract. Each ticket lands
separately.

Before #117, confirm that closed #53's required implementation is present on the
accepted common base; a closed tracker state alone is not implementation
evidence.

- #117: binding result plus one consumer; remaining selection consumers;
  identity-based rebinding deletion.
- #118: unsupported-versus-currently-unavailable result and discovery;
  production route consumers; superseded discovery deletion.
- #29: generator over admitted bindings; deterministic dependency closure and
  artifact; public gate and handwritten-inventory deletion.

Historical #117 work is selective-reuse evidence only. Do not cherry-pick its
aggregate blindly.

### `SR-09`–`SR-11`: publication integrity

#98 is already closed. Land #99, then #409, then #410 separately with black-box
receipts. After #410, close parent #45 only if its full remaining outcome is
true. This train may advance beside admission/QNT work subject to the shared
Surface lease.

### `SR-12`–`SR-14`: executable QNT conformance

- `SR-12`: land #389 first; then #390/#391/#392 in parallel; then #393. Resolve
  #382's closed-while-blocked-by-#381 metadata using `SR-00` evidence.
- `SR-13` suggested waves:
  - #394/#395/#396;
  - #397/#398/#399;
  - #401/#402/#405;
  - #400 after #396/#401, #403 after #402, #404 after audited #407/#408;
  - #406 after #394/#395/#400/#403/#404/#405 and #119.
- Before #401/#406, implement only interruption work still missing after the
  `SR-02` audit: #102 first; #103 and #56 in parallel; #105 independently; #119
  after #56.
- QNT work may land before #29, but a vertical that derives its completion set
  from the Slice remains open until `SR-08` recalibration.
- Split large verticals only at executable seams: semantic core consumed by one
  real path; driver/bridge; production route and decisive observation. Do not
  retain model-only branches or let lanes edit shared QNT inventories.
- `SR-14`: regenerate every eligible set from #29, land only necessary
  recalibrations, run #211's dynamic terminal proof lane, close #31, and run the
  stable quality/reviewer gate.

### `SR-15`–`SR-17`: delivery artifacts

- In `SR-15`, #34 and residual #40 run in parallel and land separately. #40
  preserves the existing Oracle and changes only Slice input, QNT calibration,
  and source-free distribution evidence.
- #34 may split into: schema/index with one consumed corpus entry; deterministic
  builder and complete corpus; portable validation and obsolete-path deletion.
- `SR-16` lands the minimal Rust Adapter and its one native property-test
  example.
- `SR-17` lands deterministic Harness assembly, declared-input validation, and
  clean-directory discovery. If split, every landing must have its own usable
  black-box consumer.

### `SR-18`–`SR-19`: diagnostic repair and exact readiness

- `SR-18` runs Dirty-Cleanroom Rehearsal against the exact Harness Candidate
  SHA. Each defect becomes one bounded owner repair that lands directly into
  `master`; never accumulate repairs on a rehearsal branch. Rehearsal evidence
  remains diagnostic.
- `SR-19` selects one immutable `master` SHA and runs #38's complete source gate
  and two-round reviewer loop. Every fix lands normally and restarts the full
  gate on the new SHA. Close #38 only against the final coherent state.
- Stop before #39.

## Parallel shape

```text
SR-00 -> SR-01 -> SR-02
                    |
           +--------+--------+
           |                 |
           v                 v
        SR-03              SR-12 -> SR-13 implementation
           |                             |
       +---+---+                         |
       |       |                         |
       v       v                         |
    SR-04    SR-09                       |
       |       |                         |
    SR-05    SR-10                       |
       |       |                         |
    SR-06    SR-11                       |
       |                                 |
    SR-07                               |
       |                                 |
    SR-08 -------------------------------+
       |
    SR-13 complete -> SR-14 -> SR-15 -> SR-16 -> SR-17 -> SR-18 --+
    SR-11 -------------------------------------------------------+-> SR-19
```

## Receipt format

Use this exact compact shape in the ledger row and link fuller ticket evidence:

```text
Checkpoint/unit: SR-__
Base: <master SHA>
Accepted: <landed implementation/gate SHA>
Result: <one concrete executable outcome>
Verification: <exact focused commands>; <milestone gate when applicable>
Reviews: RAW <result>; domain <result>; architecture/connascence <result>; standards/spec <result>
Tickets: <closed/kept-open with links>
Unlocked: <checkpoint ids>
```

## Deletion rule

Delete this file in the same change that closes #38 or promotes any still-useful
operational rule to its true owner. Git and issue history retain completed
receipts; do not archive this ledger as Cleanroom documentation.
