# Issue #65 pre-research: extend the packaged Oracle with loopback HTTP

> **Research evidence, not architecture or acceptance authority.** Stable
> structure belongs in [`ARCHITECTURE.md`](../../ARCHITECTURE.md) and the
> package architecture. The live issues own acceptance. This note records an
> implementation reading of those owners and may be deleted after the facts it
> discovers are promoted.

Research refreshed: 2026-08-28. Source checkout:
`5ba5487249eb347fe94160045f58a372803056b5`, plus the current uncommitted #64
review remediation in this worktree.

## Executive finding

Issue [#65](https://github.com/dearlordylord/5e-quint/issues/65) now has the
required #64 foundation. It should add a `serve` command and one thin HTTP
adapter to the existing executable, not build another application or
distribution. The shared application already owns the immutable
`DistributionId`, strict startup projection, catalog services, and raw-JSON
batch operation. HTTP should load that same value once, route request-local
bytes to `application.evaluateJson`, and retain only listener lifecycle state.

The decisive shape is:

```text
dist/oracle.mjs
  identity -----------+
  stream -------------+--> load and verify one OracleApplication
  serve (#65) --------+        |-- identity / DistributionId
                                |-- strict startup projection
                                |-- immutable Unit/Stat Block services
                                `-- raw JSON -> shared OracleBatchResponse
```

The current uncommitted #64 remediation does **not** change the HTTP seam. It
splits Surface catalog data from catalog core, makes the canonical Surface an
explicit build-time input, prevents canonical catalog source/data from entering
the executable bundle, and strengthens accumulated catalog failures. The
runtime `OracleApplication`, `evaluateJson`, process bootstrap, response
algebra, and distribution layout are unchanged.

## Live issue and dependency status

- #65 is open, unassigned, has no comments, is a child of #33, and is natively
  blocked by open #64. Its only direct blocker is #64
  ([#65](https://github.com/dearlordylord/5e-quint/issues/65)).
- #64 is open and implements the one packaged executable/bootstrap that #65
  must extend. Its live direct blocker remains open #95 even though the #95
  implementation commits are in this branch
  ([#64](https://github.com/dearlordylord/5e-quint/issues/64),
  [#95](https://github.com/dearlordylord/5e-quint/issues/95)).
- #66 is open, unassigned, and natively blocked by #65. It will run one
  parameterized black-box suite through the packaged CLI and HTTP entrypoints,
  so #65 tests must exercise the packaged program rather than only an internal
  request handler
  ([#66](https://github.com/dearlordylord/5e-quint/issues/66)).

No issue-tracker mutation is needed during this pre-research. After #64 is
closed, GitHub's native edge will unblock #65. The implementation agent should
claim #65 before changing it. Closing or commenting on #64/#95 is outside this
note's ownership.

## What #64 now supplies

The earlier version of this note said these capabilities were missing. Those
statements are stale:

- `oracle-main.ts` is the single bundled entry and `runOracleProcess` is the
  one process bootstrap. The exhaustive mode set currently contains
  `identity` and `stream`
  ([entry](../../packages/opaque-oracle/src/oracle-main.ts),
  [bootstrap](../../packages/opaque-oracle/src/oracle-bootstrap.ts#L16)).
- `OracleApplication` is already the one immutable composition value. It owns
  the parsed projection, catalog services, identity, and `evaluateJson`
  operation, and is built only after distribution bytes are verified
  ([application type](../../packages/opaque-oracle/src/oracle-distribution.ts#L55),
  [composition](../../packages/opaque-oracle/src/oracle-distribution.ts#L167),
  [load](../../packages/opaque-oracle/src/oracle-distribution.ts#L240)).
- `evaluateOracleBatchJson` already decodes the original JSON text before any
  evaluation, returns decode rejection as typed response data, and leaves an
  evaluator defect in the Effect defect channel
  ([operation](../../packages/opaque-oracle/src/oracle-batch-operation.ts#L39)).
- `OracleBatchResponse` already has exactly the shared `evaluated` and
  `decodeRejected` variants. `OracleIdentityResponse` and their compact schema
  encoders already exist
  ([process contract](../../packages/opaque-oracle/src/oracle-process-contract.ts#L10)).
- `DistributionId` is already `sha256:` plus 64 lowercase hexadecimal digits.
  The build hashes named, length-framed executable, schema, and projection
  bytes; identity metadata is excluded, and runtime load recomputes the digest
  ([digest](../../packages/opaque-oracle/src/oracle-distribution.ts#L123),
  [builder](../../packages/opaque-oracle/scripts/build-distribution.ts#L48)).
- The flat distribution and checker already enforce the one-root layout:
  `oracle.mjs`, three schemas, `oracle-startup-surface.json`, and
  `oracle-identity.json`, with no source, maps, symlinks, workspace imports, or
  repository path dependency
  ([distribution files](../../packages/opaque-oracle/src/oracle-distribution.ts#L40),
  [checker](../../packages/opaque-oracle/scripts/check-distribution.ts#L39)).
- The existing black-box test already builds twice, stages the exact
  distribution, runs it from an unrelated directory, compares direct/batch/
  singleton evaluation, checks A/B/A isolation and malformed input, and uses a
  test-only entry bundle for later-Case defects
  ([black-box owner](../../packages/opaque-oracle/src/oracle-distribution.test.ts#L115)).

The package and root architecture now explicitly reserve future HTTP as
another adapter over this composition
([package architecture](../../packages/opaque-oracle/ARCHITECTURE.md#application-composition-and-distribution),
[main architecture](../../ARCHITECTURE.md#package-ownership)).

## Exact HTTP contract

The live #65 acceptance is concise. The promoted #12 specification requires
equivalent CLI/HTTP batches, deterministic/stateless evaluation, typed domain
failures, and atomic defect behavior
([accepted specification](https://github.com/dearlordylord/5e-quint/issues/12)).
The closed Case/Trace decision supplies the concrete route/status mapping and
media type
([decision record](https://github.com/dearlordylord/5e-quint/blob/e0bd11af0/plans/wayfinder/cleanroom-sdk/oracle-case-trace-algebra.md#L713-L760)).

### Binding, launch, and shutdown

- Extend the existing command parser with
  `serve --host 127.0.0.1 --port <port>`. Represent it as a discriminated
  command value, not a mode literal plus unrelated optional fields.
- The host type has one permitted value, `127.0.0.1`. Do not accept
  `localhost`, `0.0.0.0`, `::`, interface names, or arbitrary strings. A
  numeric loopback address makes remote binding and DNS-dependent resolution
  unrepresentable.
- Parse the port once into a branded integer in the Node TCP range. Permit port
  `0` for collision-free test/consumer launch, then discover the actual port
  from the listening server address. Node documents both port-zero assignment
  and the post-listen `server.address()` result
  ([Node `server.listen`](https://nodejs.org/api/net.html#serverlisten),
  [Node `server.address`](https://nodejs.org/api/net.html#serveraddress)).
- Publish exactly one compact, schema-encoded LF-terminated readiness value on
  stdout after `listen` succeeds, containing the actual loopback endpoint. Do
  not call a bound-but-not-listening server ready, and do not encode diagnostic
  prose as discovery data. Identity remains discoverable from the HTTP identity
  route rather than being duplicated as mutable launch state. This readiness
  shape is the narrow implementation inference from #65's typed-launch
  requirement and port-zero discovery; the accepted decision does not prescribe
  its field names.
- Own the lifecycle as one operation: bind, publish readiness, serve, await
  `SIGINT`/`SIGTERM`, close, and await close completion. Listen/address/
  readiness-write/shutdown failures are typed process/lifecycle failures,
  reported only to stderr, and produce a nonzero exit. A successful signal-
  driven close exits zero. Node's close operation waits for active connections
  before its callback completes
  ([Node `server.close`](https://nodejs.org/api/http.html#serverclosecallback)).
- The server object may retain only listener/lifecycle state. Request bodies,
  decoded batches, Cases, Traces, and reducer sessions are request-local and
  discarded after the response.

The typed API should make lifecycle ordering explicit. Prefer a single
`runOracleHttpService` bracket or a `listenOracleHttpServer` result that returns
an `OracleListeningServer` with `close`; do not expose one weak object on which
callers can close before listen or listen twice.

### Routes, status, and bodies

The decided Oracle routes are:

| Request                                                          | Status and body                                                            |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `GET /oracle/identity`                                           | `200` plus the existing `OracleIdentityResponse`                           |
| `POST /oracle/evaluations`, decoded batch                        | `200` plus the existing `OracleEvaluatedResponse`                          |
| `POST /oracle/evaluations`, structural/semantic decode rejection | `400` plus the existing `OracleDecodeRejectedResponse`                     |
| `POST /oracle/evaluations`, unexpected application defect        | `500` plus exactly `{ "tag": "defect", "distributionId": DistributionId }` |

Every contract response uses `application/json; charset=utf-8`. The POST body
is one batch object, not NDJSON. A valid Case whose production workflow returns
a domain/workflow rejection is still an **evaluated Trace** and therefore HTTP
200; only boundary decoding is HTTP 400. A defect is transport failure and must
not be added to `OracleBatchResponse`, `OracleTrace`, or the decode-issue union.

The adapter must collect one bounded request body, decode UTF-8 fatally, and
pass the untouched decoded text to `application.evaluateJson`. Invalid UTF-8
maps to the existing `invalidJson` decode-rejected value. The stream adapter
currently owns a private fatal decoder, so #65 should move that small byte-to-
JSON-text policy to one transport-neutral owner rather than duplicate it. HTTP
must await the complete Effect result and compact encoding before sending
headers or body, so a later-Case defect can return only the exact 500 envelope
and never a Trace prefix. That per-request 500 does not terminate the persistent
listener; a later independent request must still be evaluable.

Unknown routes, wrong methods, unsupported media types, and oversized bodies
are transport issues, not Oracle domain variants. The accepted decision leaves
their exact policy to HTTP deployment; for #65, use the conventional closed
mapping 404, 405, 415, and 413 respectively, with exhaustive matching and a
named finite byte limit. They must not enter the shared batch response schema.
Socket/request-stream failure after a response can no longer be written should
close that response rather than invent a contract value.

### Identity

Both routes use the already loaded `OracleApplication`. The identity route
encodes `application.identity`; evaluation responses and the 500 defect
envelope reference `application.distributionId`. No route rereads metadata,
recomputes the digest, builds catalogs, or creates a second identity object.

Adding HTTP changes `oracle.mjs`, so the existing build naturally computes a
new `DistributionId`. That is correct: executable bytes are part of the digest.
Do not add a server id, protocol version, endpoint hash, HTTP manifest, or
additional distribution asset.

## Files and APIs #65 should extend

1. `packages/opaque-oracle/src/oracle-process-contract.ts`
   - Add only the transport-level defect envelope and typed listening/readiness
     schema/encoder needed by the public process protocol.
   - Keep `OracleBatchResponse` unchanged.
2. `packages/opaque-oracle/src/oracle-batch-operation.ts`
   - Give the existing injectable operation type a transport-neutral name if
     needed so stream and HTTP can share the same defect-test seam.
   - Colocate or directly share the fatal UTF-8-to-raw-JSON policy currently
     private to `oracle-stream.ts`; do not duplicate invalid-UTF-8 mapping.
3. `packages/opaque-oracle/src/oracle-http.ts` (new)
   - Own loopback binding types, request-body collection, route/status mapping,
     atomic response writing, and typed listen/close lifecycle.
   - Depend on an `OracleApplication`/shared evaluator supplied by bootstrap;
     never load distribution assets or construct catalogs here.
4. `packages/opaque-oracle/src/oracle-bootstrap.ts`
   - Replace the current literal-only parse result with an exhaustive command
     union for `identity`, `stream`, and `serve`.
   - Load `OracleApplication` once, then dispatch. Thread the same injectable
     batch evaluator to stream and HTTP so the existing defect entrypoint can
     prove both surfaces without a production defect trigger.
5. `packages/opaque-oracle/src/index.ts`
   - Export only the HTTP/process contract types with real consumers.
6. `packages/opaque-oracle/src/oracle-distribution.test.ts`
   - Extend the existing clean-directory packaged harness; do not create a
     second HTTP-only builder or distribution fixture.
7. `packages/opaque-oracle/README.md`,
   `packages/opaque-oracle/ARCHITECTURE.md`, and the existing root
   `ARCHITECTURE.md` ownership entry
   - Promote the stable third mode, loopback lifecycle ownership, and exact
     route/status boundary without duplicating acceptance text.

`oracle-main.ts`, `scripts/build-distribution.ts`, distribution filenames,
startup projection, catalog-service composition, and publication schemas need
no parallel counterpart. The builder may need no code change at all because it
already bundles the single entry and hashes its emitted bytes. The checker
should continue requiring the exact same flat file set.

Do not import or wrap `@dnd/mcp`'s HTTP server. It owns MCP sessions,
authorization, presentation, and public-service concerns. The Opaque Oracle
needs a small package-local adapter over its own application operation, not an
adapter registry or cross-package server abstraction.

## Verification plan

Focused tests should establish:

- command parsing accepts the two named serve flags without depending on their
  position and rejects every non-loopback host, invalid port, missing or
  duplicate flag, and extra argument;
- typed bind failure, readiness publication, port-zero discovery, SIGINT and
  SIGTERM shutdown, close completion, and repeated clean launch;
- exact routes, methods, `Content-Type`, compact response bodies, 404/405/413/
  415 transport classification, fatal UTF-8 handling, and bounded body reads;
- singleton, ordered multi-Case batch, direct-evaluator equality,
  singleton-decomposition, malformed/duplicate/empty batch decoding,
  workflow/domain rejection as a 200 evaluated Trace, A/B/A repetition, and
  multiple sequential requests in one server process;
- the test-only later-Case defect returns exactly one 500 defect envelope with
  no `traces` or partial body, and a later request in the same server process
  still evaluates normally;
- packaged `identity`, `stream`, and `serve` all report the same
  `DistributionId` from a staged exact distribution and unrelated cwd;
- the HTTP test network guard permits only loopback and proves no external DNS
  or connection dependency; and
- the packaged HTTP harness uses an asynchronous child process so it can read
  readiness, make requests, signal shutdown, and await the final exit; the
  current synchronous CLI helper cannot drive that lifecycle; and
- a double build remains byte-identical, the file set remains unchanged, the
  checker remains green, and canonical Surface catalog source/data do not enter
  the executable.

Run the package's focused `typecheck`, `test`, `build`,
`check-distribution`, `check:schema-sync`, and `check:corpus` scripts through
pnpm. Then run the public root `pnpm typecheck` and `pnpm test` gates. After
review convergence at a stable integration revision, reserve
`pnpm quality:milestone` for the broad milestone gate as required by the
replacement repository instructions.

This ticket changes transport and process lifecycle, not D&D rule semantics;
no SRD lookup or QNT/MBT run is required unless implementation changes the
shared evaluator, startup-selection semantics, or a mapped runtime owner.
Reviewer loops must still repeat RAW/PHB+ safety, ubiquitous/domain language,
architecture/connascence, and code/spec review until no reasonable findings
remain. In particular, review the HTTP result algebra for invalid states,
transport-owned domain meaning, duplicated identity, caller-ordered lifecycle,
unbounded body state, and any second composition/distribution root.

## #64 remediation impact

The current uncommitted review fixes require no new #65 architecture. They do
make two checks non-negotiable for #65:

1. `serve` must consume only the decoded staged projection and core catalog
   builders already inside `OracleApplication`; importing canonical Surface
   data from the HTTP module would undo the bundle-boundary repair.
2. The HTTP addition must leave the exact distribution asset set unchanged and
   preserve the metafile/source-marker checks that prove catalog authoring data
   is build-time-only.

The only existing seam worth reshaping during #65 is the test evaluator type:
it is currently named `OracleStreamEvaluator` in the stream module even though
the injected value is the shared raw-batch operation. Rename or relocate that
type once and thread it to both adapters. This is a domain-name correction, not
a second evaluator or an adapter around #64.
