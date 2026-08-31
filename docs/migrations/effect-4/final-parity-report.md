# Effect 4 final parity report

This report describes the reviewed Effect 4 integration line through
`ad053d7de`. The source migration, master reconciliation, finite-delta
certificates, and selected QNT-owner sweep are complete. Issue #386 remains
open until the three terminal public commands run at the final committed tip
and their receipts are posted to the issue.

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

The Effect migration was reconciled with current master at `42c838942`. The
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

The selected #381 proof sweep ran at `c4d42c94f` under the repository MBT/proof
lock. It completed all 133 selected owners with 133 passes, zero failures, and
terminal `SWEEP_PASS` after 3,141 seconds. The complete log is 26,237 bytes and
has SHA-256
`f594ab24f437fcfbf6d3d7c982726edec3ba50b89dddcbf85629bf2594b5cc6a`.

No `.qnt` file, QNT owner-role registry, or #381 generated manifest changed
between `c4d42c94f` and `ad053d7de`. The sweep therefore remains the formal-owner
receipt for the reconciled source line. Focused Battle MBT and runtime suites
remain semantic projection evidence; they are not substituted for the QNT
sweep or the terminal workspace gates.

## Shipped boundaries and review convergence

The reviewed clean-consumer evidence exercises the packaged MCP, application,
and script entrypoints, including process shutdown and output ownership. The
cohort verifier checks the independently deployed MCP graph rather than
inferring it from workspace manifests. The reconciliation also retained the
repository's authored-identity and PHB+ boundary: production execution is
driven by parsed Surface shape, typed procedure facts, and runtime state.

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
lock. Their exact commit, exit status, and result summary will be posted to
[#386](https://github.com/dearlordylord/5e-quint/issues/386). Only after those
receipts pass can #386 be closed and the separate SR-00 post-landing Cleanroom
receipt be updated.

Active Cleanroom SR-04G work is independent of this migration certification and
is intentionally unchanged by this report.

## Closure status

| #386 acceptance area                                   | Current disposition                                                                   |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Effect 3 removal and controlled-red exception closure  | Complete in source; zero-diagnostic inventory retained as historical closure evidence |
| Exact installed and shipped Effect cohort              | Complete and verifier-owned                                                           |
| Immutable oracle and finite reviewed deltas            | Complete and certificate-owned                                                        |
| Packaged/containerized lifecycle boundaries            | Complete in reviewed focused evidence; terminal quality receipt pending               |
| RAW/domain/QNT/runtime/architecture review convergence | Complete, including the 133/133 selected-owner sweep                                  |
| Public `typecheck`, `test`, and `quality:milestone`    | Pending at the final committed tip                                                    |
| Live #386 and SR-00 receipt closure                    | Pending the three terminal receipts                                                   |
