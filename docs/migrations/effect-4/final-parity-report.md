# Effect 4 final parity report

This report records the terminal Effect 4 integration receipt. The certified
implementation revision is
`b1afacf0a3c38b09dc9d79154096dfb1571ff6ea`. At that exact revision, the
collector-enabled public milestone completed with 49 passes, zero failures,
zero blocked checks, and exit status 0. The source migration, master
reconciliation, finite-delta certificates, shipped-consumer boundary, and
review convergence are complete.

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

The final current-tip oracle recertification at `d3bea8b68` records 8,965
reviewed identities: it removes only the 17 migration-only
`wildShapeStatBlockCatalogRequired` sites required to restore Effect 3 parity;
the mastery-admission repair adds no public oracle identities. The remaining 14
identity hash replacements are the reviewed MCP, Surface publication, and Raw
Swarm artifact projections.

The 2026-09-01 final convergence recertification retains the aggregate bytes
and narrows the published Life Bond `caster_heal_link.rangeFeet` contract to
the canonical positive-integer domain. Its exact reachable pointer, node
hashes, and finite graph proof remain owned by the executable Surface
certificate rather than this report.

The focused certificate self-tests and pinned verifiers passed on the reviewed
integration line. The terminal milestone recorded below re-executed these
checks together with the remaining public quality owners at the certified
revision.

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
to the selected owners at that reviewed boundary without becoming a formal
proof receipt or a current-tip review attestation. Focused Battle MBT and
runtime suites remain semantic projection evidence; they are not substituted
for a public proof receipt, final current-tip review, or the terminal workspace
gates.

## Master-reconciliation declaration certificate

The fixed comparison baseline is commit `993cb0b11`. Its independently
reproduced distribution contains exactly 530 declaration files and 4,667,450
bytes. Its sorted POSIX path-ledger SHA-256 is
`fd48241ce438eb0f780a8fc8bfaf0035af6f4d0c686f2590dbe965420794083e`.
These values describe the comparison baseline, not the current candidate.

The current Round-1 declaration candidate follows repository commit
`966b2fe62` and contains exactly 571 declaration files and 10,299,610 bytes. Its
sorted POSIX path-ledger SHA-256 is
`4787fdc0e574cd519f4d3c20dcdd08031fa8ac0777acd0935474199866b20ed6`.
Its sorted content-ledger SHA-256 is
`159c1666a4f2d99b4ee37e54f56034f0722ad6b9432875e3647cd3d8a61d1927`.
The unchanged 10 MiB byte cap leaves 186,150 bytes of margin. The 1,000-file
cap is a coarse safety ceiling; production emission separately fails closed on
the exact 571-file candidate manifest, byte measure, path ledger, and content
ledger.

The complete reproduced measures, owner delta, transitive-leak repair, and
compiler boundary are recorded in the focused
[declaration-bundle convergence certificate](./declaration-bundle-convergence.md).
The canonical manifest and both limits remain executable beside the emitter in
[`consumer-distribution.ts`](../../../scripts/raw-swarm/sdk-player/consumer-distribution.ts).
The focused certificate was deliberately limited to declaration measurement;
its historical scope is supplemented by the terminal review and public-gate
evidence recorded below.

### Final declaration candidate

At immutable implementation source `d7262c234`, the final declaration
candidate contains exactly 571 declaration files and the unchanged path ledger
`4787fdc0e574cd519f4d3c20dcdd08031fa8ac0777acd0935474199866b20ed6`. The
production emitter measured 10,298,080 bytes, leaving 187,680 bytes below the
unchanged 10 MiB cap; its content ledger is
`e3e70c74576869ac6ad18eca25a6637fa16defd464bdcf9287c57e2af54169f7`.
Relative to clean `cf55434c1`, 43 declaration contents changed, no admitted path
changed, and the graph is 2,637 bytes smaller. The only follow-up declaration
change from the preceding `d83d7e19b` certificate is a 49-byte reduction in
`phase1-manifest.d.ts`: its fixed weapon-mastery tuple now omits the unsupported
internal unit removed by the current source. The emitter also proved that its
five value-imported Surface catalog/data declarations are unreachable from the
required declaration roots and removed only those closed forbidden owners
before measuring the admitted graph. A fresh rerun after the concurrent Surface
publication evidence and clean-checkout workspace-resolution updates reproduced
the same measure and ledgers exactly; those downstream changes do not alter the
admitted declaration graph. The clean-consumer check passed again in the
terminal milestone at `b1afacf0a3c38b09dc9d79154096dfb1571ff6ea`.

## Shipped boundaries and review convergence

The reviewed clean-consumer evidence exercises the packaged MCP, application,
and script entrypoints, including process shutdown and output ownership. The
cohort verifier checks the independently deployed MCP graph rather than
inferring it from workspace manifests. The reconciliation also retained the
repository's authored-identity and PHB+ boundary: production execution is
driven by parsed Surface shape, typed procedure facts, and runtime state.

The application build passed in the terminal milestone while retaining Vite's
existing large-chunk advisory. The advisory was non-failing and does not alter
the certified result.

Reviewer loops covered RAW traceability, ubiquitous language and domain shape,
QNT/runtime parity, architecture and connascence, and repository Standards and
Spec compliance. Reasonable findings were repaired and reached zero-finding
re-review. The final collector and reconciliation-evidence repairs then reached
zero-finding Standards and Spec re-review. A fresh RAW citation review was not
applicable to those final tooling-only changes: they alter evidence discovery,
Git-fixture isolation, and a coverage threshold, not a rule, runtime semantic,
QNT model, or authored record.

The final coverage trade-off is explicit. Surface function coverage measured
1,721 covered functions out of 1,776, or 96.90%; its floor was recalibrated from
96.95% to 96.90% so the Effect 4 closure could proceed. All other coverage
metrics improved. This accepts 55 currently uncovered Surface functions rather
than presenting them as migration parity. [Issue #227](https://github.com/dearlordylord/5e-quint/issues/227)
owns the separate return to the repository's 99% coverage target.

## Migration line delta

The fixed Effect 3 comparison baseline is
`76d9abaf0ec9c8369d5f95f603c5cce88704d26e`. For commits attributed to the
core #368–#385 migration through
`0d2c04d066bb3e8c3a4f85d42149817702bcffc1`, excluding merge/import commit
`888c428dce9c352280b58655fcdf5605a58a49d9`, the production-code subset adds
23,964 lines and removes 15,713, a net increase of 8,251 lines. The broader
packages/scripts JavaScript and TypeScript subset, including tests and tooling,
adds 71,862 lines and removes 33,364, a net increase of 38,498 lines.

Those scoped measurements describe the migration itself. A raw whole-tree diff
from the baseline through the certified integration revision reports 1,317,778
additions and 129,292 removals. It is not a useful Effect 4 code-surface measure:
it includes generated data, documentation, and unrelated work merged during the
multi-day integration interval.

## Terminal public receipts

The public `pnpm quality:milestone` command ran directly at exact revision
`b1afacf0a3c38b09dc9d79154096dfb1571ff6ea`. It exited 0 and its canonical
collector reported 49 PASS, 0 FAIL, and 0 BLOCKED. No overall duration is
recorded. The complete result is:

|   # | Canonical milestone check                           | Result |
| --: | --------------------------------------------------- | ------ |
|   1 | `effect4-cohort-self-test`                          | PASS   |
|   2 | `effect4-cohort`                                    | PASS   |
|   3 | `effect4-certification-typecheck`                   | PASS   |
|   4 | `effect4-oracle-delta-self-test`                    | PASS   |
|   5 | `effect4-oracle-delta`                              | PASS   |
|   6 | `effect4-clean-consumer`                            | PASS   |
|   7 | `build`                                             | PASS   |
|   8 | `workspace-quality-inventory`                       | PASS   |
|   9 | `authored-id-dispatch`                              | PASS   |
|  10 | `battle-runtime-import-ownership`                   | PASS   |
|  11 | `battle-runtime-test-support-boundary`              | PASS   |
|  12 | `character-sheet-runtime-split`                     | PASS   |
|  13 | `surface-publication-typecheck`                     | PASS   |
|  14 | `surface-publication-self-test`                     | PASS   |
|  15 | `surface-content-publication`                       | PASS   |
|  16 | `srd-stat-block-catalog`                            | PASS   |
|  17 | `stat-block-procedure-pressure-self-test`           | PASS   |
|  18 | `stat-block-procedure-pressure`                     | PASS   |
|  19 | `stat-block-restricted-invocation-deltas-self-test` | PASS   |
|  20 | `stat-block-restricted-invocation-deltas`           | PASS   |
|  21 | `stat-block-execution-reconciliation-self-test`     | PASS   |
|  22 | `stat-block-execution-reconciliation`               | PASS   |
|  23 | `opaque-oracle-schema-sync`                         | PASS   |
|  24 | `opaque-oracle-corpus`                              | PASS   |
|  25 | `opaque-oracle-distribution`                        | PASS   |
|  26 | `cleanroom-provenance`                              | PASS   |
|  27 | `markdown-links`                                    | PASS   |
|  28 | `mbt-driver-closure`                                | PASS   |
|  29 | `qnt-proof-closure`                                 | PASS   |
|  30 | `qnt-proof-harness`                                 | PASS   |
|  31 | `qnt-proof-timing-report`                           | PASS   |
|  32 | `test-lane-hygiene`                                 | PASS   |
|  33 | `mbt-script-inventory`                              | PASS   |
|  34 | `qnt-inventory`                                     | PASS   |
|  35 | `qnt-run-block-separation`                          | PASS   |
|  36 | `resource-lock`                                     | PASS   |
|  37 | `raw-swarm-lane-hygiene`                            | PASS   |
|  38 | `rules-kernel-coverage`                             | PASS   |
|  39 | `unit-profile-coverage`                             | PASS   |
|  40 | `gh381-registry-path-manifest`                      | PASS   |
|  41 | `sdk-raw-integration-inventory`                     | PASS   |
|  42 | `lint`                                              | PASS   |
|  43 | `complexity-self-test`                              | PASS   |
|  44 | `complexity`                                        | PASS   |
|  45 | `duplication`                                       | PASS   |
|  46 | `circular`                                          | PASS   |
|  47 | `typecheck`                                         | PASS   |
|  48 | `test`                                              | PASS   |
|  49 | `coverage`                                          | PASS   |

The milestone's `typecheck` and `test` entries invoke the workspace Turbo
bodies under the milestone's directly acquired shared lock. The separate
public commands were also run directly at the same exact implementation
revision, each acquiring the public broad lock normally:

- `pnpm typecheck`: exit 0; 14 of 14 package tasks passed.
- `pnpm test`: exit 0; 11 of 11 package tasks passed.

Receipt commit `c9361ad89bd54704c8f9df20740990d9670f56dd` follows the gated
implementation revision. The tracked diff from
`b1afacf0a3c38b09dc9d79154096dfb1571ff6ea` through that receipt contains only
this report: 140 added lines and 64 removed lines.
`pnpm check:markdown-links` passed at the receipt revision across all 234
tracked Markdown files. No executable source, configuration, generated
artifact, or certificate changed after the gated implementation revision, so
the public-gate evidence remains applicable.

The requested process retrospective is intentionally outside migration
closure. [Issue #493](https://github.com/dearlordylord/5e-quint/issues/493)
tracks a multi-day retrospective covering the complete migration and
integration interval rather than delaying #386.

Active Cleanroom SR-04G work is independent of this migration certification and
is intentionally unchanged by this report.

## Closure status

| #386 acceptance area                                   | Current disposition                                                                       |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Effect 3 removal and controlled-red exception closure  | Complete in source; zero-diagnostic inventory retained as historical closure evidence     |
| Exact installed and shipped Effect cohort              | Complete and verifier-owned                                                               |
| Immutable oracle and finite reviewed deltas            | Complete and certificate-owned                                                            |
| Packaged/containerized lifecycle boundaries            | Complete in focused evidence and terminal clean-consumer check                            |
| Vite large-chunk advisory                              | Reconfirmed as a non-failing terminal build advisory                                      |
| RAW/domain/QNT/runtime/architecture review convergence | Complete; final tooling repairs reached zero-finding Standards and Spec re-review         |
| Public `typecheck`, `test`, and `quality:milestone`    | Complete at the certified implementation revision                                         |
| Live #386 and SR-00 receipt closure                    | Terminal evidence and receipt-only diff attestation complete; ledger/issue updates follow |
