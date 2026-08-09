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

## Historical Ralph task indexes

Every checked-in `ralph-task-index` belongs to the one-off shell harness. While
its delivery is active, it is a harness input rather than a compatibility
requirement for the Ralph orchestrator. Delete it with the completed delivery
plan after durable outcomes have moved to their owners.
See the
[Dalph relocation and historical-harness boundary](../docs/tooling/ralph/README.md#historical-harness-boundary).
