# Opaque Oracle architecture

This package implements the Cleanroom
[`Opaque Oracle`](../../docs/cleanroom/CONTEXT.md#opaque-oracle) role: it exposes
calibrated observations of the main production workflow to independent Target
SDK conformance tests without exposing source or becoming a Target runtime
dependency. It owns the production-side observation boundary, not Target-side
comparison, discrepancy reporting, or a conformance verdict. RAW and calibrated
QNT remain rules authority.

`@dnd/opaque-oracle` owns the language-neutral Case, Trace, and Evaluation
Batch boundary over one call-local production evaluation. It also owns one
source-free application distribution and its thin executable adapters. It does
not own a second rules engine, a durable session, or presentation state.

## Boundary pipeline

Inputs cross one explicit pipeline:

1. the raw JSON scanner rejects duplicate member names and hostile input with
   typed issues before parsing;
2. the structural Document schemas admit the JSON shape and are the source for
   the published Draft 2020-12 artifacts;
3. semantic admission checks runtime correlations that ordinary JSON Schema
   cannot express, including ownership and checkpoint/frontier relationships;
4. evaluation calls the existing Character Creation, Character Sheet, and
   Battle owners and projects their facts into the Trace.

The `publication/` directory is owned by this package. Generation and sync
checking use the canonical Document JSON Schemas exported by
`oracle-document.ts`; no parallel publication schema graph or validation
registry exists. The three committed artifacts have stable root `$id` values,
compact JSON encoding, and a final newline.

Standard Draft 2020-12 cannot observe duplicate raw JSON member names and does
not encode arbitrary cross-record correlations. Those are deliberately
preparse and semantic-admission responsibilities rather than claims made by
the published schemas.

## Application composition and distribution

`oracle-startup-catalog.ts` derives the level-one/two workflow projection from
the canonical SRD Surface aggregate. `oracle-catalog-services.ts` builds the
Unit and Stat Block lookup services from one decoded projection. The
`OracleApplication` in `oracle-distribution.ts` is the single immutable
composition value: its identity, parsed projection, and evaluator services are
created together, and its operation creates all mutable evaluation state inside
each Case call. The builder is the only source-side staging step: it writes the
exact projection bytes, while the executable reads only its beside-executable
assets and rebuilds services from those bytes.

The evaluator imports the Character Sheet and Character Battle source-free
construction subpaths. Those contracts require the Stat Block catalog rebuilt
from the startup projection; they do not traverse either package root's bundled
canonical-catalog defaults.

`scripts/build-distribution.ts` emits one flat, deterministic distribution
root containing the bundled `oracle.mjs`, the three canonical publication
schemas, `oracle-startup-surface.json`, and narrow `oracle-identity.json`
metadata. `computeOracleDistributionId` hashes named, length-framed executable,
schema, and projection bytes; identity metadata is excluded from that preimage.
Loading recomputes the digest, requires the canonical schema bytes and strict
projection bytes, and rejects tampering before evaluation. The checker also
rejects source files, maps, symlinks, workspace links, repository paths, and
unresolved non-builtin imports.

`oracle-main.ts` is the one executable root and delegates process edges to
`oracle-bootstrap.ts`. Its exhaustive commands are `identity`, persistent
UTF-8/LF-framed `stream`, and loopback-only `serve`. Both evaluation adapters
delegate raw input to the shared batch operation and buffer one response before
writing it. Decode/domain rejection is response data; a stream evaluator defect
aborts without a partial response, while an HTTP evaluator defect produces one
atomic transport 500 and leaves the listener available for later requests.
The HTTP adapter owns only request framing, route/status mapping, and listener
lifecycle. Startup loads one immutable `OracleApplication`; it does not create
a second composition, evaluator, catalog, asset, or distribution manifest.

## Corpus publication

The Effect CLI in `scripts/oracle-evaluation-cli.ts` is the only filesystem
composition boundary for the committed evaluation corpus. Its production
composition root builds the SRD Unit and Stat Block catalogs once and passes
the resulting `OracleEvaluationServices` to the core source-batch builder.
The command handlers receive `FileSystem`, `Path`, and `Terminal` services;
Node-specific layers are installed only by the executable bootstrap.

`generate` and `check` are read-only: generation validates its stdout artifact
before display, while checking additionally requires the committed bytes to
equal the deterministic source artifact. `write` validates first, recursively
creates the target directory, and then uses a same-directory temporary file
and rename. Resource cleanup runs on both successful and failed writes, so a
failed temporary write or rename cannot replace the committed target.

Schema snapshots are checked through the shared
`oracle-publication-validation.ts` helper. Each of the three committed bytes
is compared with `ORACLE_PUBLICATION_ARTIFACTS`, parsed independently, and
compiled independently with Draft 2020-12 Ajv before corpus values are
validated. This keeps the Node schema-sync script and injected-FileSystem CLI
on one publication-byte policy.

## Identity and presentation

Trace execution facts exclude session/frame bookkeeping, transport state,
unstable messages, labels, caches, and presentation-only fields. The Trace
does embed the production `CharacterBuildFact`. Consequently an authored
starting item can retain its selected `itemName`: this is the existing
selected-build authored-identity boundary permitted by the repository
authoring policy, not an Oracle-generated display label or a presentation
registry. No PHB+ identity or source crosswalk is introduced by this package.

Creation progression and Battle frontiers are evidence snapshots at this
boundary. Structural phase order and locally provable ownership/integrity
invariants are admitted; transition correlations requiring omitted fills,
catalog context, or a live session remain production-evaluator concerns and
are not falsely represented as portable JSON Schema guarantees.
