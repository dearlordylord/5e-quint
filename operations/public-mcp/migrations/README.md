# Format-five offline conversion

This release-specific kit materializes saved games with their exact original
source implementation, then validates and saves continuations with the target
implementation. It is separate from serving initialization. It never opens the
historical repository constructor, rewrites history, supplies missing choices,
or restores a database automatically.

Prepare on an isolated platform-local checkout with frozen dependencies already
installed. Never install over a shared host/container checkout; follow the
[distribution guidance](../../../scripts/distribution/README.md#shared-hostcontainer-checkouts).
The historical checkout must be clean and disposable: preparation applies only
the frozen owner instrumentation patch and copies the two capture modules into
it. The target checkout must also be clean and committed. Its full HEAD becomes
the explicit target release in `prepared.json`.

```sh
node operations/public-mcp/migrations/prepare.mjs \
  /isolated/original-source /private/frozen-source-manifest.json /private/prepared-kit
```

The source manifest contains the exact supported full `sourceRelease`,
`patch: {path, sha256}`, `sourceFiles: [{path, sha256}]` for every patched
file, and `captureModules: {repositoryPath: sha256}` for
`packages/mcp/src/play-session-continuation.ts` and `continuation-graph.ts`.
Patch paths must be the runtime-owned capture hooks. Preparation checks the
full original commit, every patch preimage, the patch itself and copied modules.
The checked-in `source-23b919207.json` and `source-c9cef525.json` manifests
share `source-hooks.patch`. Their `captureRevision` identifies the committed
capture-module bytes; the prepared kit's `targetRelease` identifies the serving
release being validated. Capture hooks expose existing owner facts and leave
original constructors and gameplay handlers unchanged. Target restoration,
scope validation and descriptor modules are not injected into original source.
The prepared record hashes both separately bundled source and target modules.
A source pin is admitted only after its real prepared exporter has passed the
MCP/SQLite recovery cases; listing a pin alone is not qualification.

The source exporter disables admin publication explicitly. At capture only, it
removes the original character origin's duplicate display name after checking
equality with that session's canonical character context. A mismatch or missing
context stops conversion. Projected origins, creatures, combatant maps and
states preserve sharing across captured sessions. The original replayed state
is never modified.

Stop admission and all writers before conversion. On the deployment host, the
state directory must be exclusively owned by the deployment and mounted at its
exact configured path. This adapter stops every running Docker container using
that mount, including scaled and one-off processes, waits for graceful shutdown
without a kill timeout, and verifies none remain. Host processes must not open
that database; stop any separately managed writer before this operation.

```sh
operations/public-mcp/migrations/stop-and-convert.sh \
  /var/lib/dnd-oracle/production /private/prepared-kit \
  SOURCE_FULL_COMMIT TARGET_FULL_COMMIT /private/absent-backup.sqlite /private/absent-report.jsonl
```

For Dokku, run the same adapter on its host against
`/var/lib/dokku/data/storage/APP`; the existing Dokku deployment adapter reads
the recovery record there. Prepare the source bundle separately, with its exact
release dependencies, before this maintenance window. No compiler or historical
source reader belongs in the serving image. This is a source-checkout operation,
not a new image build or publication workflow.

The adapter creates one private `migration-admission-closed` recovery record
before stopping writers. Existing release history cannot record a conversion
that has not passed target smoke. A failed or interrupted attempt keeps this
record blocked and writers stopped. Successful conversion permits only its
exact target release. Deployment failure keeps admission closed and prevents
old-code fallback; successful target smoke and release promotion clear the
record. Compose and Dokku deployment operations hold the same state-directory
conversion lock throughout release and smoke.

The importable `convertPlaySessionDatabase` operation in `convert.mjs` accepts
`databasePath`, absent `backupPath`, absent private `reportPath`, `kitDirectory`,
and explicit `sourceRelease`/`targetRelease`. Recovery tests use this same
operation and real prepared bundles after closing the original application.
Standalone callers own the same stopped-writer precondition as the adapter.

Recovery tests separately build `test-support/mcp-fixture.mjs` with
`test-support/build-mcp-fixture.mjs CLEAN_RELEASE_CHECKOUT FULL_RELEASE_COMMIT ABSENT_OUTPUT_DIRECTORY`.
Build the original fixture before preparation changes its checkout. Build the
same entry against the committed target for continuation checks. The builder
resolves all MCP implementation and fixture-helper imports against the selected
clean release and records its bundle hash and input closure. The fixture creates a fresh database through original MCP, closes it,
and can continue a separate control copy through original MCP. It is never
imported by the source materializer or serving application.

The live connection obtains `BEGIN IMMEDIATE` before a separate readonly
connection takes a consistent backup. Source materialization reads bounded
keyset pages from that backup. The latest decoder validates ownership and
continuation state before each write. Only `format_version` and the appended
`continuation_json TEXT NOT NULL` column change. Original IDs, revisions,
tenure, seed, random profiles, timestamps, history JSON and other tables remain
intact. Any failed row rolls the entire live transaction back; the backup and
bounded-per-record private investigation report remain. Missing historical
qualification is unknown; it must never become an empty enemy set or an
invented player choice.

The result measures main/WAL/SHM/journal files before conversion, after commit
or rollback, and after closing. `inTransactionObservedMax` records each file's
largest observed size after each attempted row and before commit or rollback,
including transaction failures. These samples can miss growth between sampling
points. The per-file maxima need not occur together and are not an operating
system peak or a peak total footprint. The result also records backup files,
private report and separate bundle sizes, and complete serialized
snapshot/history bytes. These are actual file and encoding costs, with no
invented disk cap. Preserve the full result beside the private report. No partial
conversion counts as successful verification.

Recovery is ad hoc. Inspect the actual database and report, identify its format,
and approve concrete repair or source/target decisions before changing the
recovery record. Never delete saves or automatically restore the backup after
players have made progress. No generic player migration workflow is provided.
