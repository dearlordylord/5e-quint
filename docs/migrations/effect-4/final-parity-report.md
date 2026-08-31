# Effect 4 final parity report

This report closes the migration-specific certification interval for GitHub
issue #386. The certification branch includes the integrated Effect 4 migration
and the subsequent master-reconciliation checkpoint through `505263eb6`. The
controlled-red inventory, finite behavioral delta, public workspace gates, and
shipped process entrypoints were all checked from this branch. This report does not claim that every
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

The final [controlled-red inventory](./controlled-red-inventory.json) covers 14
typecheck owners and records zero raw and zero deduplicated diagnostics. Its
SHA-256 is
`47bcb642a9e7907630022930c73c9d75e9b4926b68e5c4a3814417417f608f72`.
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
No public mutation command remains. The final Effect 4 capture is 52,137,007
bytes with SHA-256
`bb25eae9123b6b85ce80cc49a81ec0ef4b54cad00cc223525a20b04d09953e6c`.

The reviewed [finite delta certificate](./effect4-oracle-delta-certificate.json)
classifies and lists 7,261 recursive JSON-pointer leaf identities, including
the owning classification, operation, path, and SHA-256 digest or explicit
missing tag for both sides. Its overall identity
SHA-256 is
`1fa5ab3d2e37822d76958bdd2385172b71a3a4cbee2c9482c46edf41c6d06e3c`,
and the certificate artifact SHA-256 is
`ff8304287d391f14f1634e06ffae8125007fb488913c4474da4f0f98190afbca`.

| Classification                | Identities | Added | Removed | Changed |
| ----------------------------- | ---------: | ----: | ------: | ------: |
| MCP registration contract     |      2,275 |   706 |   1,489 |      80 |
| MCP protocol entrypoints      |      2,738 |   998 |   1,584 |     156 |
| MCP authenticated projection  |      2,081 |   769 |   1,192 |     120 |
| Surface publication authority |          4 |     0 |       0 |       4 |
| Surface authored authority    |         84 |     0 |       0 |      84 |
| Persisted session codecs      |         22 |     6 |      12 |       4 |
| Raw Swarm artifact authority  |         57 |    43 |       0 |      14 |

Baseline metadata and all five reducer behavior classes have zero identities.
The verifier rejects baseline or candidate byte drift,
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
- The MCP lifecycle probe sends `SIGINT` and `SIGTERM` after receiving only the
  first chunk of a large `tools/list` response, then proves the complete body,
  parseable JSON, equal captures across both signals, clean exit, empty standard
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

### Master-reconciliation declaration certificate

The fixed Surface and Battle Runtime consumer graph now contains exactly 530
declaration files and 4,667,450 bytes. The 10 MiB byte cap is unchanged and
leaves 5,818,310 bytes of margin; the file cap is the exact reviewed count, not
a permissive growth allowance. The SHA-256 of the sorted relative-path ledger
is `fd48241ce438eb0f780a8fc8bfaf0035af6f4d0c686f2590dbe965420794083e`;
the SHA-256 of the sorted ledger that binds each relative path to its file
SHA-256 is
`b196b26a3dd9aa80064b55d867f41344f133738325c10895cc7290f406420809`.
Relative to the prior 523-file reconciliation certificate, the current graph
adds these eleven declarations:

- `packages/battle-runtime/src/battle-reducer/codec-building-blocks.d.ts`
- `packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/once-per-turn-limit-group-admission.d.ts`
- `packages/battle-runtime/src/druid-wild-shape-known-form-runtime.d.ts`
- `packages/battle-runtime/src/procedure-admission/stat-block-procedure-execution-decision.d.ts`
- `packages/battle-runtime/src/procedure-execution/stat-block-procedure-sections.d.ts`
- `packages/battle-runtime/src/stat-block-attack-damage-selection.d.ts`
- `packages/battle-runtime/src/stat-block-authored-projection.d.ts`
- `packages/battle-runtime/src/stat-block-presentation-contract.d.ts`
- `packages/surface/src/surface/generated/srd-unit-aggregate.d.ts`
- `packages/surface/src/surface/stat-block-catalog-contract.d.ts`
- `packages/surface/src/surface/stat-block-speed-readers.d.ts`

It removes four declarations: the retired
`battle-reducer/spell-procedure-profiles/usage-limit-admission.d.ts` owner and
the Surface `stat-block-catalog.d.ts`, `stat-block-catalog-core.d.ts`,
and `stat-block-catalog-data.d.ts` runtime/data owners. The lightweight Stat
Block catalog type is now owned by
[`stat-block-catalog-contract.ts`](../../../packages/surface/src/surface/stat-block-catalog-contract.ts),
so type-only consumers do not pull the runtime catalog into the public graph.
The 1,599,076-byte generated `srd-stat-block-aggregate.d.ts` and its
`stat-block-identity.d.ts` dependency are consequently absent. In contrast,
the SDK setup runtime consumes the eager canonical Unit collection, whose data
owner now imports the generated 572,677-byte `srd-unit-aggregate.d.ts`; that
single new declaration accounts for the complete growth from the reviewed
529-file graph. The focused real relocated supervisor test proves
initialization, transcript, replay, and declaration emission for this graph;
this certificate does not claim that the remaining issue #386 public gates
have run.

### Master-reconciliation authored-identity collision audit

The current static authored-identity boundary check discovers 7,328 authored
identity literals from 283 decoded Surface spell records across 817 checked
source files, with 762 excluded fixture or artifact files and 9 files admitted
through the existing narrow boundary allowlists. It exercises 620 exact
collision exemptions and authenticates 1,294 reviewed sites / 1,405
occurrences with SHA-256
`1a6b83fc6597ebcb817af5b723557f9e8e3cc219562c584de14f3e45bc4ecc02`.

The reconciliation added 79 reviewed mechanics-word collisions: 66 generic
teleportation sites, 4 Fly Speed sites, 6 illumination sites, 2 damage
Resistance sites, and 1 healing-link site. Their exemptions are bound to the
exact spell-word collision, AST role, identifier, and source path; the finite
site certificate additionally binds the normalized owning statement and
cardinality. Copying, semantically relocating between files or owning
statements, or adding an occurrence therefore fails the check. Seven reusable
execution declarations that instead used `Haste` as a name were renamed to the
generic limited-additional-Action restriction they model and were not exempted.

The one-site drift already present relative to the preceding certificate was
not `heldLightHurl`. Normalized evidence shows that one former
`storedLightEmitters` occurrence inside `battleSnapshotInvariantsHold` was
replaced by two occurrences owned by the extracted serialized-reference and
environmental-source validation functions, for a net increase of one reviewed
site. `heldLightHurl` was semantically relocated into a presentation-procedure
set owned by the existing narrow Battle presentation boundary and did not enter
collision-certificate evidence. This focused static audit is not a claim that
a final certification fixed point or the remaining public gates have
completed.

## Public verification

The public typecheck was rerun directly under its owning repository lock at
committed tip `99ee3da75`. The other public results retain their prior
certification fixed-point evidence:

- `pnpm typecheck`: passed, 14 of 14 owners in 1m0.703s.
- `pnpm test`: passed, 10 of 10 workspace tasks. Notable uncached owners were
  battle-runtime (261 files, 2,887 passed and 132 documented proof-lane skips),
  MCP (57 files, 416 passed), and app (18 files, 88 passed).
- `pnpm build`: passed; the app transformed 1,543 modules and emitted the
  production bundle. The existing large-chunk advisory remains non-fatal.
- `pnpm quality:milestone`: pending final reviewer convergence.

Apart from the current public typecheck recorded above, the
master-reconciliation checkpoint was not subjected to the other broad commands
while implementation and review lanes were active. Its focused Effect cohort,
certification typecheck, finite-oracle verification, authored-identity audit,
Opaque Oracle checks, and exact Raw Swarm consumer-distribution lifecycle tests
pass.

## Review convergence

Certification requires two complete rounds covering RAW traceability, PHB+
safety, ubiquitous-language and domain ownership, QNT/runtime parity,
architecture and connascence, and the separate Standards and Spec review axes.
Findings and their dispositions are recorded here after each fixed-point pass.

Round 1 accepted and corrected all 10 findings. The Spec axis required the
finite exact identity records, installed and shipped cohort inspection,
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
