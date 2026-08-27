# Opaque Oracle architecture

`@dnd/opaque-oracle` owns the language-neutral Case, Trace, and Evaluation
Batch boundary over one call-local production evaluation. It does not own a
second rules engine, a durable session, a transport envelope, or presentation
state.

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
