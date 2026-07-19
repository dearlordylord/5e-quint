# Bounded Ralph Leaf and Non-Convergence Contract

> **Historical decision record:** the body below is retained in its original
> shell-delivery terms. It is evidence, not a Ralph orchestrator contract. The
> coherent-leaf and non-convergence outcomes were subsequently accepted by the
> [tooling architecture decision](https://github.com/dearlordylord/dalph/issues/19).
> Its plan index, labels, claim representation, run directory, launcher
> mechanics, and ten-round default did not transfer; current tracker, recovery,
> and policy semantics belong to [Dalph issues #13](https://github.com/dearlordylord/dalph/issues/13),
> [#15](https://github.com/dearlordylord/dalph/issues/15), and
> [#12](https://github.com/dearlordylord/dalph/issues/12), under the
> [historical-harness boundary](../../../docs/tooling/ralph/README.md#historical-harness-boundary).

## Decision scope

This is a delivery-execution decision for the Cleanroom Ralph queue. It does
not add or alter product requirements. Product behavior and acceptance remain
owned by [Specification: Language-neutral Cleanroom SDK readiness and
acceptance](https://github.com/dearlordylord/5e-quint/issues/12) and the
canonical implementation issues that project that specification into runnable
work.

## Terms

**Ralph leaf** means one runnable canonical issue that delivers one coherent
capability or tracer bullet from a declared clean Base SHA. It may cross every
repository layer needed for that outcome. It is not a file, package, language,
test-layer, or review-round slice.

**Handback** means another implement/review round on the same leaf, Base SHA,
worktree, and WIP lineage because every remaining actionable finding belongs
to the leaf's one outcome.

**Non-convergent leaf** means a runnable issue whose implementation has not
received an `accept` verdict by the configured implementation-round safety cap,
or whose review exposes independently acceptable outcomes that violate the
one-leaf contract before the cap.

**Safety-cap disposition** means quarantine and redesign, never acceptance,
automatic retry, branch integration, or evidence that the task was merely
unlucky.

## Executable preflight

A canonical issue may carry `ready-for-agent` and appear as a runnable Ralph
task only when all of the following are true:

1. **One named outcome.** Its body states one observable capability or tracer-
   bullet outcome. Every implementation acceptance item is necessary to that
   outcome. If any subset could be accepted, integrated, or depended on while
   another subset remained unfinished, those subsets are separate leaves.
2. **Vertical coherence.** The outcome crosses the required owners together
   (for example Surface, runtime, QNT, tests, or CLI) instead of assigning one
   owner or test layer as a leaf. Cross-layer work is allowed; independently
   useful outcomes are not bundled.
3. **Closed decision surface.** Product semantics, domain terms, and relevant
   RAW or assumption owners are already decided. The issue contains no owner
   question, alternative design choice, or exploratory acceptance clause.
4. **Reviewer-visible authority.** The issue links the accepted specification
   in its parent/acceptance context and links any non-runnable outcome parent.
   It states verification against the repository's RAW, domain-language,
   architecture/connascence, and code-review gates without copying the owning
   specification's requirements into the Ralph plan.
5. **Declared execution boundary.** The leaf has a clean Base SHA, native
   blocker edges, a complete predecessor set in the Ralph task index, and no
   hidden caller sequence or parallel status ledger. The GitHub graph and Ralph
   dependencies must agree before launch.
6. **Component-level WIP decision.** If rejected work exists, each coherent
   component the leaf might consume is classified `reusable unchanged`,
   `reference or correct`, or `unsafe; discard`, with its evidence path. An
   entire rejected branch is never the reuse unit.
7. **Bounded verification.** The issue names focused evidence for its outcome
   and the required converging reviewer loop. It does not make an unrelated
   broad workspace repair or an unbounded proof/search part of acceptance.
8. **Launchable state.** The issue is open, unblocked, has no active Ralph
   claim, is labelled `ready-for-agent`, is present exactly once in the task
   index, and has no runnable child that owns part of its implementation scope.
   A failed preflight removes `ready-for-agent`; a non-runnable parent may
   remain open for outcome history and child grouping but must not appear in the
   runnable task index.

Preflight is pass/fail, not a score. In particular, a small file count cannot
rescue two independent outcomes, and a large cross-layer diff does not by
itself split one coherent tracer bullet.

The preflight report makes the bound measurable by recording exactly one named
outcome, one accepted-specification link, one declared Base SHA at claim time,
zero unresolved decisions, zero independently acceptable acceptance subsets,
zero missing or extra dependency edges, one disposition for every candidate
WIP component, and a finite list of focused verification commands. Any
different count fails preflight; the report is run-local evidence rather than a
second requirements store.

## Review handback rule

After each implementation round, the independent reviewer returns `accept`,
`accept-with-fixes`, or `reject`.

- `accept` ends the handback loop and permits the normal decider/integration
  path.
- `accept-with-fixes` or `reject` receives another handback only when every
  actionable finding is a correction to the same named outcome, can be made on
  the declared Base/WIP lineage, and adds no independently acceptable product
  outcome, prerequisite, owner decision, or unbounded verification lane.
- Repeated findings are still handback findings while they meet that test; the
  runner does not silently waive them. However, the task is reclassified before
  the cap when a review proves that the body bundles independently acceptable
  outcomes, depends on an undecided contract, requires a new prerequisite, or
  cannot execute within the repository's resource bounds.

The reviewer reports which acceptance item each finding blocks and whether the
finding stays within the named outcome. The implementer reports the disposition
of every prior finding. This makes scope drift and persistent findings visible
without inventing a numeric quality score.

## Ten-round safety-cap rule

Ten implement/review rounds is the default maximum and may be replaced only by
an explicitly configured positive limit. If the last allowed review is not
`accept`, the runner must stop before decider integration and classify the leaf
as non-convergent.

The disposition is mandatory:

1. do not merge, commit to the acceptance branch, close the canonical issue,
   release it as completed, or launch a dependent task;
2. remove `ready-for-agent` and remove the issue from the runnable Ralph task
   index (or replace its row with complete child leaves in the same plan
   reconciliation);
3. retain the failed outcome issue as a non-runnable parent when it remains a
   useful product/result grouping boundary;
4. preserve its claim, run directory, Base SHA, worktree, branch, and review
   evidence as quarantined inputs until reconciliation records child-level WIP
   dispositions; and
5. route it to delivery redesign. Fresh replacement leaves start from their own
   declared clean Base SHA and selectively port only components explicitly
   accepted by their WIP decision.

Increasing the cap does not make an oversized issue conformant. A later run may
override the default only before launch, for a positive finite value, and the
same terminal rule applies at that value.

## Evidence retained at non-convergence

The redesign input must retain or point to:

- canonical issue, accepted-specification link, native parents/children and
  blockers;
- declared base ref and Base SHA, `HEAD`, and successful ancestry check;
- run id, owner token/claim state, launcher worktree, output branch, and exact
  final worktree status;
- every implementer prompt/final/log/exit, full and filtered diff, reviewer
  prompt/report/log/exit, handback event, and the final non-accept verdict;
- commands and focused verification results, including seeds and resource-
  emergency evidence when applicable;
- the last independent review as the minimum correction ledger; and
- a coherent-component WIP matrix saying `reusable unchanged`, `reference or
correct`, or `unsafe; discard`, with reasons. Passing tests alone never
  upgrade a component to `reusable unchanged`.

The run artifacts are evidence, not requirements and not an alternate status
ledger.

## Evidence from the four rejected leaves

| Failed outcome                                                                                                           | Why the old issue violated the bounded contract                                                                                                                                                                                                                                       | Redesign boundary exposed by review                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Define the strict Oracle Case and Trace algebra](https://github.com/dearlordylord/5e-quint/issues/61)                   | One issue combined owner-derived projections, strict portable schema equivalence, lifecycle invariants, canonical equality/uniqueness, and an Effect CLI fixture generator. Several pieces could be accepted and depended on independently.                                           | Separate algebra/projection ownership, portable-schema lifecycle constraints, and fixture-generation delivery as coherent dependent capabilities rather than package/file slices. |
| [Audit redistributable cleanroom rules, identity, and licensing](https://github.com/dearlordylord/5e-quint/issues/43)    | Recursive schema-role proof, decoded-value evidence traversal, immutable corpus context, mutation checks, prose-anchor extraction, and report/CLI fail-closedness formed multiple independently reviewable outcomes; recursive path flattening also caused measured memory explosion. | Separate the schema-owned role model and traversal kernel from corpus evidence/audit publication while preserving one provenance/licensing outcome per child.                     |
| [Publish the strict SRD Surface aggregate and Draft 2020-12 schema](https://github.com/dearlordylord/5e-quint/issues/45) | Aggregate/schema semantics and publication were coupled to a second, substantial process-lock, reader-visibility, reclamation, ownership, interruption, and live-CLI capability.                                                                                                      | Separate portable aggregate/schema production from one atomic publication-store capability, each vertical through its own focused evidence.                                       |
| [Capture interrupted-procedure facts in QNT and production state](https://github.com/dearlordylord/5e-quint/issues/55)   | Frame algebra, invocation/checkpoint selection, exact production frame shapes, structural replay equality, QNT continuation products, and broad RAW ownership were bundled.                                                                                                           | Split by executable procedure capability/tracer bullet, with each child carrying its QNT-to-production state path and exact RAW/unchanged-semantics evidence.                     |

These are sizing findings only. They do not decide replacement issue titles,
dependencies, or component reuse; the corresponding Wayfinder investigations
own those decisions.

## Documentation ownership check

No D&D rule, Cleanroom product behavior, main-application architecture, or
modeling assumption is decided here. The tooling terms in this historical body
are not D&D or Cleanroom language; canonical terminology now belongs to the
[Dalph tooling context](https://github.com/dearlordylord/dalph/blob/master/docs/CONTEXT.md).
