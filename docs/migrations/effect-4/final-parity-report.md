# Effect 4 final parity report

This report closes the migration-specific certification interval for GitHub
issue #386. The certification branch includes the integrated Effect 4 migration
through `0d2c04d06`. The controlled-red inventory,
finite behavioral delta, public workspace gates, and shipped process entrypoints
were all checked from this branch. This report does not claim that every
product capability is complete; it certifies that remaining limitations are not
Effect 3 migration exceptions.

## Selected cohort

The repository selects Effect `4.0.0-rc.112` for `effect`,
`@effect/platform-node`, and `@effect/vitest`. The installed workspace graph and
the independently deployed MCP contain only the cohort-matched
`@effect/platform-node-shared` package in addition to those owning selections.
`@firfi/quint-connect` is `2.0.2-effect4.2`, pnpm is
`10.29.3`, the checked TypeScript compiler is `5.9.3`, and the intentionally
separate native TypeScript toolchain package is `7.0.2`.

`pnpm check:effect4-cohort:self-test` and `pnpm check:effect4-cohort` pass. The
verifier audits workspace manifests, every lockfile section, installed package
manifests, peer relationships, and the published Quint Connect cohort. The
clean-consumer deployment independently walks every deployed package manifest
and proves the shipped MCP contains exactly Effect, platform-node, and
platform-node-shared at `4.0.0-rc.112`.

## Controlled-red closure

The final [controlled-red inventory](./controlled-red-inventory.json) covers 13
typecheck owners and records zero raw and zero deduplicated diagnostics. Its
SHA-256 is
`f413b1fc2f036c652a23bf9b72954073ea21d7e05f09b640e0d3b3b77626d1e5`.
The migration-only inventory generator and its package scripts have been
removed. Any future diagnostic is therefore an ordinary blocking failure, not
an admitted migration exception.

The final cleanup scan found no Effect 3 package, root `effect/Either` import,
removed Schema compatibility API, compatibility facade, or migration-time
diagnostic suppression. Four `@ts-expect-error` directives remain only in the
compile-contract test for execution-schema decoded/encoded/context types, each
with the exact intentionally rejected type documented. Existing uses of
“legacy” name historical data or rejection fixtures rather than Effect 3 API
paths.

## Immutable oracle and finite delta

The immutable [Effect 3 behavioral oracle](./effect3-behavioral-oracle.json)
remains byte-identical: 12,997,527 bytes with SHA-256
`dc131ce8b7e588e288d20a25881df1817552b1469b9aea1dc2b55ba3fdc6df7b`.
No public mutation command remains. The final Effect 4 capture is 51,968,201
bytes with SHA-256
`b3b885fc935fccf1fe19288ab5fc6d2e3ff784c58b7a27079477267acecb36fe`.

The reviewed [finite delta certificate](./effect4-oracle-delta-certificate.json)
classifies and lists 7,338 recursive JSON-pointer leaf identities, including
the owning classification, operation, path, and SHA-256 digest or explicit
missing tag for both sides. Its overall identity
SHA-256 is
`ad92fcb2856bbe91d416aff0c4314ec3fd971e6a8667044be08ce043724427f8`,
and the certificate artifact SHA-256 is
`219b2230079265e3fd614f5e3c4b46b2ef6f30dc9c3f8c1c50a2c4b7de9cf37a`.

| Classification                | Identities | Added | Removed | Changed |
| ----------------------------- | ---------: | ----: | ------: | ------: |
| MCP registration contract     |      2,259 |   692 |   1,504 |      63 |
| MCP protocol entrypoints      |      2,728 |   992 |   1,584 |     152 |
| MCP authenticated projection  |      2,072 |   762 |   1,192 |     118 |
| Surface publication authority |          3 |     0 |       0 |       3 |
| Persisted session codecs      |         22 |     6 |      12 |       4 |
| Raw Swarm artifact authority  |        254 |    43 |       0 |     211 |

Baseline metadata, Surface content, and all five reducer behavior classes have
zero identities. The verifier rejects baseline or candidate byte drift,
non-regular baseline paths, duplicate identities, unclassified identities,
identities admitted by multiple classes, stale exact identity records, and
stale class counts or hashes. Its five negative and stable-class self-tests
pass. The certificate classifies a finite observed
delta; the focused protocol, persistence, Surface, Raw Swarm, and process tests
remain the semantic evidence.

## Shipped process evidence

`pnpm smoke:effect4-clean-consumer` passes from an isolated temporary consumer:

- MCP is produced with `pnpm --filter @dnd/mcp deploy --prod --legacy`, its
  recursive deployed dependency manifests pass the shipped-cohort check, and
  the deployed HTTP entrypoint answers real requests.
- The MCP lifecycle probe sends `SIGINT` and `SIGTERM` while a large
  `tools/list` response is incomplete, then proves complete newline framing,
  parseable JSON, deterministic bytes, expected exit status, empty standard
  error, response drain, and cleanup without sleeps.
- The application production bundle and its exact dependency-free static
  server artifact are copied to an isolated directory. The smoke reads the root
  document, starts the JavaScript entry response, then sends each of `SIGINT`
  and `SIGTERM` after receiving only the first response chunk. Both runs prove
  byte-for-byte response drain and clean exit with empty standard error.
- The same consolidated smoke runs Raw Swarm's exact public consumer and
  battle-slice lifecycle owners: seven tests covering the reviewed declaration
  distribution and both signals during an in-flight newline-framed response.

The root Dockerfile now builds the workspace app with frozen pnpm dependencies,
ships the same static server artifact on Node 22.19, runs as the non-root `node`
user, and defines a health check. No Docker, Podman, or Buildah executable is
available in the certification environment, so an OCI image build is not
claimed; the exact files and command copied by that image are the artifacts
exercised by the clean-consumer smoke.

## Public verification

The following public commands were run directly under their owning repository
locks:

- `pnpm typecheck`: passed, 13 of 13 owners.
- `pnpm test`: passed, 10 of 10 workspace tasks. Notable uncached owners were
  battle-runtime (261 files, 2,887 passed and 132 documented proof-lane skips),
  MCP (57 files, 416 passed), and app (18 files, 88 passed).
- `pnpm build`: passed; the app transformed 1,543 modules and emitted the
  production bundle. The existing large-chunk advisory remains non-fatal.
- `pnpm quality:milestone`: pending final reviewer convergence.

Focused checks also pass for the 13-owner cohort, zero-diagnostic inventory,
finite oracle and negative tests, MCP publication package, Battle timing and
typed issue projections, clean consumers, and Raw Swarm deterministic public
lane.

## Review convergence

Certification requires two complete rounds covering RAW traceability, PHB+
safety, ubiquitous-language and domain ownership, QNT/runtime parity,
architecture and connascence, and the separate Standards and Spec review axes.
Findings and their dispositions are recorded here after each fixed-point pass.

Round 1 accepted and corrected all 10 findings. The Spec axis required the
7,338 exact identity records, installed and shipped cohort inspection,
consolidated clean-consumer lifecycle coverage, current controlled-red closure
documentation, and unchanged ordinary Battle replay checkpoints. The Standards
axis required the current ledger status, accurate baseline reproduction text,
a typed oracle classification map plus exhaustive `effect/Match`, package-owned
application server documentation, and one shared Unicode code-point comparator.
Focused checks passed after each correction; no finding was waived.

Round 2 is run from the committed correction fixed point. Its final disposition
and the public milestone result are recorded before this report is finalized.

Direct local SRD 5.2.1 inspection confirmed that Searing Smite deals start-turn
damage and then requires its Constitution save; Flaming Sphere and Moonbeam
resolve damage at their triggering turn event; and a Death Saving Throw belongs
to the later zero-HP actor's start of turn. The Battle reducer delegated End
Turn from an already-damaged child state, which exposed that staged damage in
an ordinary open Death Save procedure. The replay parent now retains the
unchanged incoming checkpoint and recomputes from root, committing exactly once
after the frontier closes as the owning Battle protocol requires. No authored
identity dispatch, PHB+ content, Quint state, or assumption changed.

## Remaining non-migration limitations

- A finite hash-authenticated oracle certificate is not a proof of semantic
  equivalence; semantic claims depend on the named focused and public tests.
- The application production bundle retains its pre-existing large-chunk
  advisory.
- The certification environment cannot build an OCI image, as recorded above.
- Slow QNT proof and MBT lanes remain governed by their existing opt-in/public
  commands; no QNT model changed in #386, and the public test suite reports its
  documented proof-lane skips rather than presenting them as executed proofs.

None of these limitations requires an Effect 3 package, API, facade,
suppression, controlled-red allowance, or mutable baseline.
