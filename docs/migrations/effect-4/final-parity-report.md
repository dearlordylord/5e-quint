# Effect 4 final parity report

This report describes the reviewed Effect 4 integration line through
`ad053d7de`. The source migration, master reconciliation, finite-delta
certificates, and supplementary observed QNT-owner sweep are recorded. Issue
#386 remains open until the terminal public commands, receipt update, and
post-gate tracked-document attestation described below are complete.

## Selected cohort and controlled-red closure

The repository selects Effect `4.0.0-rc.112` for `effect`,
`@effect/platform-node`, and `@effect/vitest`. The installed and shipped graphs
contain the cohort-matched `@effect/platform-node-shared`; Quint Connect is
`2.0.2-effect4.2`. The cohort verifier owns the complete manifest, lockfile,
installed-package, peer, and clean-consumer graph checks.

The final [controlled-red inventory](./controlled-red-inventory.json) covers
all 14 TypeScript owners with zero diagnostics. Its migration-only generator
and mutation scripts are retired. A future diagnostic is an ordinary blocking
failure, not an admitted migration exception. The historical cutover and
package-lane observations remain in the
[controlled-red ledger](./controlled-red-ledger.md); they are not current
waivers.

## Reviewed reconciliation

The Effect migration was reconciled with current master at `83b69ec9e`. The
reviewed stat-block integration was then reconciled at `7be12837c`, its
complexity settlement landed at `2ca8e4ccb`, and current master was reconciled
again at `075da3fd9`. The reconciliation retained one canonical runtime catalog,
the type-only declaration contract needed by consumers, narrowed execution
admission facts, and typed runtime failure paths. It did not add an Effect 3
facade, duplicate conversion seam, diagnostic suppression, or migration
exception.

Standards and Spec/RAW review converged on the reconciliation changes. The
already-reviewed SR-04F business behavior was not reopened as new migration
logic; review covered the reconciliation boundary and its repairs. The Effect
oracle certificate was refreshed at `c55072db9`, and the Surface publication
certificate was refreshed at `1c1d6692d` with its explanatory document made
certificate-owned at `ad053d7de`.

## Immutable oracle and reviewed finite deltas

The immutable Effect 3 baseline remains
[`effect3-behavioral-oracle.json`](./effect3-behavioral-oracle.json). The exact
candidate digest, identity set, classifications, collection authorities,
operation counts, and aggregate hashes are owned only by the reviewed
[`effect4-oracle-delta-certificate.json`](./effect4-oracle-delta-certificate.json).
The verifier rejects baseline or candidate drift, malformed paths, duplicate,
unclassified, multiply classified, or stale identities, and stale aggregate
evidence.

Surface publication parity is independently owned by the reviewed
[`surface-publication-delta-certificate.json`](./surface-publication-delta-certificate.json)
and its [review rationale](./surface-publication-delta.md). Those artifacts own
their dynamic membership, record-delta, schema, and digest evidence; this
report deliberately does not restate those values.

The focused certificate self-tests and pinned verifiers passed on the reviewed
integration line. The terminal quality receipt is still required because it
re-executes these checks together with the remaining public quality owners at
the final committed tip.

## QNT and runtime parity

The supplementary [selected #381 owner-sweep log](./evidence/dnd-gh381-qnt-sweep-c4d42c94f.log)
was observed at `c4d42c94f`. It records repository-lock acquisition, all 133
selected owners with 133 `OWNER_PASS` markers, zero recorded owner failures,
and terminal `SWEEP_PASS` after 3,141 seconds. The tracked log is 26,237 bytes
and has SHA-256
`f594ab24f437fcfbf6d3d7c982726edec3ba50b89dddcbf85629bf2594b5cc6a`.

The log does not retain the exact Quint mode invoked for each owner or the
outer wrapper's process exit status. It is therefore a supplementary observed
owner sweep, not a `pnpm proof:qnt` receipt and not evidence that the public
proof lane passed.

No `.qnt` file, QNT owner-role registry, or #381 generated manifest changed
between `c4d42c94f` and `ad053d7de`. The observation therefore remains relevant
to the unchanged selected owners without becoming a formal proof receipt.
Focused Battle MBT and runtime suites remain semantic projection evidence;
they are not substituted for a public proof receipt or the terminal workspace
gates.

## Master-reconciliation declaration certificate

At the current reconciliation through `ad053d7de`, the fixed Surface and Battle
Runtime consumer graph contains exactly 530 declaration files and 4,667,450
bytes. The 10 MiB byte cap is unchanged and leaves 5,818,310 bytes of margin;
the file cap is the exact reviewed count, not a permissive growth allowance.
The SHA-256 of the sorted relative-path ledger is
`fd48241ce438eb0f780a8fc8bfaf0035af6f4d0c686f2590dbe965420794083e`.
The SHA-256 of the sorted ledger that binds every relative path to its file
SHA-256 is
`b196b26a3dd9aa80064b55d867f41344f133738325c10895cc7290f406420809`.

The pinned comparison baseline is commit `38e79b814`. Its independently
reproduced distribution contains 523 files and 3,962,445 bytes. Its sorted
POSIX relative-path ledger, one path per line including the final newline, has
SHA-256
`05479f0c8ae9b75bb263ca7dc10cb61ed68fef4da3ba57cd54f4603d41a55cb8`.
Relative to that baseline, the current graph adds these ten declarations:

- `packages/battle-runtime/src/battle-reducer/codec-building-blocks.d.ts`
- `packages/battle-runtime/src/druid-wild-shape-known-form-runtime.d.ts`
- `packages/battle-runtime/src/procedure-admission/stat-block-procedure-execution-decision.d.ts`
- `packages/battle-runtime/src/procedure-execution/stat-block-procedure-sections.d.ts`
- `packages/battle-runtime/src/stat-block-attack-damage-selection.d.ts`
- `packages/battle-runtime/src/stat-block-authored-projection.d.ts`
- `packages/battle-runtime/src/stat-block-presentation-contract.d.ts`
- `packages/surface/src/surface/generated/srd-unit-aggregate.d.ts`
- `packages/surface/src/surface/stat-block-catalog-contract.d.ts`
- `packages/surface/src/surface/stat-block-speed-readers.d.ts`

It removes the three Surface runtime/data declarations
`stat-block-catalog.d.ts`, `stat-block-catalog-core.d.ts`, and
`stat-block-catalog-data.d.ts`. The lightweight Stat Block catalog type is
owned by
[`stat-block-catalog-contract.ts`](../../../packages/surface/src/surface/stat-block-catalog-contract.ts),
so type-only consumers do not pull the runtime catalog into the public graph.
The generated 1,599,076-byte `srd-stat-block-aggregate.d.ts` and its
`stat-block-identity.d.ts` dependency are consequently absent.

The SDK setup runtime instead consumes the eager canonical Unit collection,
whose data owner imports the generated 572,677-byte
`srd-unit-aggregate.d.ts`. That declaration accounts for the complete growth
from the reviewed 529-file graph immediately preceding the final reconciliation.
The focused relocated-supervisor test proves initialization, transcript,
replay, and declaration emission for this graph. The canonical measure and
limits remain executable beside the emitter in
[`consumer-distribution.ts`](../../../scripts/raw-swarm/sdk-player/consumer-distribution.ts);
this certificate does not claim that the pending #386 terminal public gates
have run.

## Shipped boundaries and review convergence

The reviewed clean-consumer evidence exercises the packaged MCP, application,
and script entrypoints, including process shutdown and output ownership. The
cohort verifier checks the independently deployed MCP graph rather than
inferring it from workspace manifests. The reconciliation also retained the
repository's authored-identity and PHB+ boundary: production execution is
driven by parsed Surface shape, typed procedure facts, and runtime state.

The latest recorded focused application build passed while retaining Vite's
existing large-chunk advisory. Its current disposition remains pending until
the terminal milestone build reconfirms it at the gated commit; the advisory
must be recorded in the terminal receipt even if it remains a non-failing
warning.

Reviewer loops covered RAW traceability, ubiquitous language and domain shape,
QNT/runtime parity, architecture and connascence, and repository Standards and
Spec compliance. Reasonable findings were repaired and the reconciliation and
certificate refreshes reached zero-finding re-review.

## Terminal public receipts

The following commands have not yet been run at the final committed tip and
are not claimed as passes here:

```sh
pnpm typecheck
pnpm test
pnpm quality:milestone
```

They must run serially and directly so each command owns the shared repository
lock. Their exact commit, exit status, and result summary will be recorded only
in this report and posted to
[#386](https://github.com/dearlordylord/5e-quint/issues/386); the controlled-red
ledger links here instead of duplicating the receipts.

Recording those results creates a tracked documentation commit after the first
three gates. Before closure, a post-first-gates attestation must identify the
gated commit and receipt commit, prove their tracked diff contains only this
report, and pass `pnpm check:markdown-links` at the receipt commit. If any
executable source, configuration, generated artifact, certificate, or other
tracked file changed after the gated commit, the three public gates must be
rerun at the new source tip. Only after the terminal receipts and this
tracked-document attestation pass can #386 be closed and the separate SR-00
post-landing Cleanroom receipt be updated.

Active Cleanroom SR-04G work is independent of this migration certification and
is intentionally unchanged by this report.

## Closure status

| #386 acceptance area                                   | Current disposition                                                                   |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Effect 3 removal and controlled-red exception closure  | Complete in source; zero-diagnostic inventory retained as historical closure evidence |
| Exact installed and shipped Effect cohort              | Complete and verifier-owned                                                           |
| Immutable oracle and finite reviewed deltas            | Complete and certificate-owned                                                        |
| Packaged/containerized lifecycle boundaries            | Complete in reviewed focused evidence; terminal quality receipt pending               |
| Vite large-chunk advisory                              | Pending terminal milestone-build reconfirmation and receipt                           |
| RAW/domain/QNT/runtime/architecture review convergence | Complete; supplementary selected-owner observation retained above                     |
| Public `typecheck`, `test`, and `quality:milestone`    | Pending at the final committed tip                                                    |
| Live #386 and SR-00 receipt closure                    | Pending terminal receipts and post-gate tracked-document attestation                  |
