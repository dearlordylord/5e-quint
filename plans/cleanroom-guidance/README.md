# Cleanroom Guidance Pack

This is the current source-side guidance root copied into future cleanroom
repositories as `cleanroom-input/guidance/**`.

Use this pack with the copied RAW, QNT, source branch inventory, reducer-route
inventory, domain language, and assumptions. Those files are the cleanroom
authority; production TypeScript code and previous cleanroom attempts are not
inputs.

For the level-1 through level-5 reducer-route package, the acceptance slice is
the `freshCleanroomPackageGate` record in
`cleanroom-input/branch-coverage/reducer-route-inventory.json`. A target task
is acceptable only from copied corpus evidence and harness-generated replay
evidence; dirty cleanroom ledgers, prior validation reports, adapters, and
target code are not evidence.

Core rules:

- Treat copied `.qnt` files as formal rule statements and `.mbt.qnt` files as
  conformance specifications.
- Use copied `*.route.mbt.qnt` connectors as the executable reducer-route
  contract when the selected assignment is a reducer-spine diagnostic
  assignment. For a `reducer-routed` row, target replay evidence must match the
  connector's `qRoute`; the reducer-route inventory selects and orders tasks
  and is never a substitute for route evidence.
- Use copied rule-core component connectors as the executable contract for
  `component-first` rows. Target replay evidence must match `qComponentRoute`
  rather than a driver-local helper.
- Treat `catalog-after-substrate` and `substrate-first` rows as blocked until
  their generic route substrate is executable. Selected authored identity never
  becomes production reducer dispatch.
- Keep QNT/MBT replay adapters quarantined from production modules.
- Treat forbidden source-code reads and production reducer dispatch on
  authored or fixture identity as the same cleanroom-boundary violation class.
  Production behavior routes by runtime shape, typed facts, capabilities,
  procedures, and battle-owned state; fixture identity belongs only in
  adapters, tests, evidence, catalog/selection boundaries, or documented
  support-profile admission.
- Do not dispatch production runtime behavior on authored ids, names, slugs,
  provenance headings, page references, or official catalog labels.
- Do not store derivable facts beside their owners unless the duplicate is an
  explicit executable boundary projection.
- Record missing architecture guidance as a `source-qnt-corpus` blocker instead
  of guessing.

Guidance files:

- `reducer-spine.md` defines the cleanroom reducer surface, subject/fill
  lifecycle, durable state ownership rules, adapter quarantine rules, and
  reducer-spine diagnostic constraints.
