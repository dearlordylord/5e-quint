# Plans

Plans are working documents. They do not override the owning specification,
architecture, domain glossary, executable coverage registry, or issue tracker.

## Finding Current Work

- Active local Ralph deliveries are the plans selected by tracked `.ralph/`
  entrypoints.
- Active product requirements live in the configured issue tracker and accepted
  specifications linked from those issues.
- `plans/rules-kernel-coverage/`, `plans/unit-profile-coverage/`, and
  `plans/raw-coverage/` own their respective executable registries and generated
  reports.
- Research documents provide evidence for a decision; they are not the decision
  owner unless `CONTEXT-MAP.md` explicitly says otherwise.

A filename containing `CURRENT`, `ACTIVE`, `PLAN`, or `RALPH` is not evidence
that a document is active. Follow the owner links above before loading a large
plan.

Completed, superseded, or abandoned one-off plans and delivery artifacts should
be deleted after their accepted facts have been promoted to the owning document
or executable registry. Git history is the archive; do not retain historical
copies in the working tree.

## Working-Tree Admission

A plan or delivery Markdown file belongs in the working tree only while at
least one of these is true:

- a tracked `.ralph/` entrypoint selects it;
- an open issue links it as the accepted specification;
- it is an executable registry contract or generated report owned by one of
  the coverage directories above;
- it records unresolved research needed by a named decision owner.

Delete implementation plans, closure audits, recursive planning reviews,
completed migration notes, and accepted one-off inventories in the same change
that promotes their durable facts. Task ids may remain in executable evidence;
they do not require a Markdown biography.

Reviewer-loop results are delivery evidence, not durable domain documentation.
Keep the required verification procedure in the active specification while
work is open. After convergence, retain only findings that changed an owning
document, executable registry, test, or implementation; commit and issue
history preserve the review transcript.

## Historical Ralph task indexes

Every checked-in `ralph-task-index` belongs to the one-off shell harness. While
its delivery is active, it is a harness input rather than a compatibility
requirement for the Ralph orchestrator. Delete it with the completed delivery
plan after durable outcomes have moved to their owners.
See the
[Dalph relocation and historical-harness boundary](../docs/tooling/ralph/README.md#historical-harness-boundary).
