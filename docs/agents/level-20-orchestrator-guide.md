# Level 20 Factory Orchestrator Guide

Use this guide for one bounded factory pilot, then for later SRD frontiers. The
[preparation guideline](level-20-workflow-preparation.md) owns the goal and
checkpoint scope; the [mining research](../research/level-20-mining-automation.md)
owns the Survey contract. Existing issues/specifications and the [RAW](../../plans/raw-coverage/README.md)
and [Unit profile](../../plans/unit-profile-coverage/README.md) coverage owners
hold delivery claims. This guide is an agent procedure, not a runner, status
ledger, or new acceptance gate.

## Run record and scheduling

Keep one short, disposable run record with links to the accepted scope/spec and
canonical work items; pinned base and candidate revisions; checkpoint target;
each item's phase, dependencies, owner, and write set; ready and active
assignments; evidence links; open findings and earliest invalidated phase; and
the applicable verification result. Reference issue and coverage statuses rather
than copying them. An evidence claim needs local RAW/code anchors and an owner;
the orchestrator checks the anchors before moving the item. Missing, conflicting,
truncated, or unreadable source evidence is **unresolved**.

Allow at most **three active child agents in the entire descendant tree**, with
**one implementer** at a time. Give a child permission to spawn only from a slot
already allocated to that assignment. Dispatch dependency-ready items with
disjoint write sets. Serialize shared artifact generation, integration, and
heavy verification under the [repository lock policy](../../AGENTS.md#verification-and-review).
After two returned implementation attempts on one assignment, split,
reclassify, or redesign it; do not accept an open finding to meet the limit.

Each assignment names one production behavior or one review question, its RAW
spans, owning files and exclusive write set, base revision and dependencies,
positive and rejection witnesses, affected QNT/parity owners, focused commands,
expected evidence, and the trigger that would reopen owner design. Split work
when another independent lifecycle, owner choice, or dependency appears. Reuse
an owner only when Surface shape, production ownership, state lifetime, support
admission, and verification witnesses all still fit.

## Route one work item

| Phase               | Advance only with                                                                                                                                                                   | Return on finding                                                                                                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Survey              | Regenerated source-checked inventory/audit; agent review of omissions, choices, replacements, spell access, multiclass and cross-chapter links; RAW anchors for the chosen frontier | Missing or ambiguous source stays in Survey or targeted research. Follow the local-corpus stop rule in [AGENTS.md](../../AGENTS.md#rules-and-formal-models).                                       |
| Classify            | Each behavior has source span, owner, reason, and an explicit `reuse`, `new/changed owner`, or `unresolved` decision                                                                | Unresolved evidence returns to Survey; a changed owner, lifecycle, sequencing, support gate, or state shape goes to owner design.                                                                  |
| Owner design        | Reviewed owner/state contract and one production vertical planned with focused witnesses                                                                                            | Architecture or ownership finding returns to owner design.                                                                                                                                         |
| Production vertical | One usable cross-package behavior, focused checks, and working-architecture review                                                                                                  | Source/scope → Survey; classification → Classify; ownership/lifecycle → Owner design; slice behavior → Production vertical.                                                                        |
| Expansion           | Coherent records for a settled procedure, focused checks, and converged review                                                                                                      | Return to the earliest invalidated phase above; a batch-only defect returns to Expansion.                                                                                                          |
| Integration         | All checkpoint dependencies closed in their owning artifacts; integrated revision reviewed; existing acceptance and full milestone result attached                                  | Candidate regression → earliest affected phase; demonstrated base failure → acceptance blocked with its failure owner; environment/resource failure → recover under repository policy, then rerun. |

Classify a reused owner directly into Expansion; a new or changed owner must
pass Owner design and exactly one Production vertical before expansion. Review
changed RAW traceability, domain language, architecture/connascence, and code
quality using [review rules](../../.claude/review-rules.md). Record findings with
file/line evidence, fix them, recheck the affected delta and invariant, and
expand review only if a boundary changed. Continue until no reasonable findings
remain; reject a finding only with a concrete reason. An inventory row or a
focused pass never establishes runtime support or integrated acceptance.

## Pilot run

1. Pin a base revision and run `pnpm quality:milestone` there. Save the command,
   revision, complete result/log, and failure owner for each failure. A prior
   candidate log is not a comparable baseline.
2. Choose one source-backed unresolved behavior inside a supported creation
   frontier. Reuse an owner only when its contract fits; otherwise route through
   Owner design and one Production vertical. Scope it to creation or
   advancement, durable projection, and a battle consequence if applicable.
   Specify a positive witness, a rejection witness,
   and one interaction witness in its accepted work item. Pin the RAW spans,
   dependency/owner links, base revision, and intended candidate revision.
3. Run Survey and Classify, then assign the one implementation slice. Review its
   focused evidence. Exercise and record one real reviewer return to the
   earliest invalidated phase, or a labelled disposable evidence exercise;
   never insert a production defect for the exercise. Record the route taken.
4. Integrate the reviewed slice on a pinned candidate. Run its existing focused
   gates and acceptance contracts, then `pnpm quality:milestone` once the
   revision is stable. Compare failure signatures against the pinned base. A
   changed candidate needs a fresh full milestone; a focused pass cannot replace
   it. Follow [coverage diagnosis](../../AGENTS.md#verification-and-review) or
   [QNT/MBT policy](QNT-MBT.md) when applicable.
5. Revise this guide for any routing ambiguity found. The **pilot** proves the
   assignment, return, review, and integration procedure. It is **not** a
   level-12, level-16, or level-20 product checkpoint. Call the factory ready to
   repeat only when the route was exercised, review converged, and all required
   acceptance passes on the candidate. A demonstrated base failure leaves
   acceptance blocked until its owning work resolves it and a fresh milestone
   passes.
