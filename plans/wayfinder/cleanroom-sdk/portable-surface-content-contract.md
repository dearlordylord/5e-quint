# Portable Surface Content Contract

Wayfinder decision for [Define the portable Surface content
contract](https://github.com/dearlordylord/5e-quint/issues/18), investigated at
source commit `6eba6154a8a00f047d9783cd881262592dc87329`.

## Decision

The **Portable Surface Contract** is a strict, language-neutral catalog-load
boundary for the generated Cleanroom projection of the canonical SRD corpus. A
Target SDK accepts one generated Cleanroom Surface catalog document into its
typed catalog, or rejects the document with a non-empty collection of typed
content issues. Acceptance is atomic: no partial catalog survives a rejected
load.

The contract consists of:

1. one generated Cleanroom catalog JSON document containing named Unit and Stat
   Block collections of complete record-rooted mechanics graphs;
2. one generated JSON Schema Draft 2020-12 compound schema for that document;
3. source-owned valid and invalid conformance cases with expected, unordered
   typed issue facts; and
4. a source-side publication check that regenerates every authored JSON value
   from canonical Dhall, strictly decodes it, builds the catalog, regenerates
   the aggregate catalog and schema, and compares generated artifacts directly
   with the committed outputs.

The Target contract does **not** include a hash protocol, release-compatibility
protocol, integrity manifest, per-record file inventory, Dhall interpreter, or
third-party/PHB+ catalog installation. A cleanroom is one coherent source
snapshot. “Stale generated artifact” means a committed generated value no
longer equals what its canonical source produces; the source-side publication
check detects that state by regeneration and direct comparison before the
cleanroom is constructed.

The Portable Surface Contract stops at decoded catalog integrity. The separate
Static Mechanics Admission decision defines both the source-side executable
projection that determines supplied membership and the Target admission step
that begins from the decoded Cleanroom catalog. Dynamic availability depends on
actor/session/battle state. Neither mechanics support nor availability belongs
in Surface structural issues or member metadata.

## Why this boundary

The current source has five different facts that can drift:

- canonical Dhall files;
- generated source-peer JSON files;
- the Effect Schema decoder;
- manually imported Unit and Stat Block collection membership; and
- runtime support recognition.

The audit found 604 Dhall and 604 JSON files, but the sets differ:
`_types.dhall` has no JSON peer and `magic_item_staff_of_charming.json` has no
Dhall peer. The current sync check selects only twelve `class_*.dhall` files
(`scripts/check-surface-content-json-sync.cjs:11`, `64-66`), while Unit and Stat
Block membership are independently assembled in TypeScript
(`packages/surface/src/surface/unit-catalog.ts:507-902` and
`packages/surface/src/surface/stat-block-catalog.ts:108-120`). Equal directory
counts therefore do not establish pairing, shipment, or installed membership.

One aggregate catalog document removes per-record membership from the Target
protocol. Per-source Dhall and JSON remain useful source-authoring artifacts,
but a Target receives one catalog-shaped Cleanroom projection, not a directory
whose meaning it must reconstruct. The aggregate keeps Units and Stat Blocks as
named record families rather than conflating them into one union.

Conceptually, the successful decoded value has this shape:

```json
{
  "kind": "srd-5.2.1-surface-catalog",
  "units": [],
  "statBlocks": []
}
```

The literal catalog kind fixes the collection provenance boundary. Each member
retains its authored provenance for inspectability, as ADR-0003 already permits,
and the decoder requires every member to carry SRD 5.2.1 provenance. There is no
second optional collection-provenance field that could disagree with the kind.
The production document has non-empty collections; the empty arrays above only
show field shape.

This ticket does not freeze the illustrative file name or JSON property casing.
It does freeze the domain shape: one tagged SRD catalog, with distinct Unit and
Stat Block collections, from which a provenance-correct decoded type follows.

## Structural authority and generation

Effect Schema remains the source-side structural authority. The package already
describes its helpers as the handwritten decode boundary
(`packages/surface/src/surface/schema.ts:454-456`) and derives Surface types from
it. A second handwritten portable schema would create distant algorithmic
connascence. The JSON Schema must therefore be generated from the encoded side
of the authoritative Effect schema and committed as a cleanroom artifact.

The generated schema uses
[JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12). It is a
compound schema document with closed objects throughout. Unknown properties are
rejected; they are never stripped. This requires repairing the current Effect
boundary, where `strictStruct` opts into excess-property rejection but ordinary
`Schema.Struct` strips excess properties
(`packages/surface/src/surface/schema-helpers.ts:8-13`), including the current
top-level Stat Block record (`packages/surface/src/surface/schema.ts:467-474`).
The aggregate schema is SRD-specialized: its member provenance is the literal
`srd-5.2.1`, even though the broader source-side record schema currently admits
other provenance for tests and research (`packages/surface/src/surface/schema-base.ts:679-682`).

Effect 3.21 can generate Draft 2020-12 JSON Schema, but the current Surface AST
is not generation-ready. These read-only probes fail on recursive schemas that
lack identifier annotations:

```sh
pnpm --filter @dnd/surface exec tsx -e '
  import { JSONSchema } from "effect"
  import { UnitRecordSchema, StatBlockRecordSchema } from "./src/surface/schema.ts"
  console.log(JSONSchema.make(UnitRecordSchema, { target: "jsonSchema2020-12" }))
  console.log(JSONSchema.make(StatBlockRecordSchema, { target: "jsonSchema2020-12" }))
'
```

The first missing identifiers occur at Unit casting-time trigger recursion and
Stat Block on-hit recursion. Source repair must add the source-owned identifiers
or JSON Schema annotations needed for generation. It must not copy the schema
into a parallel handwritten file.

JSON Schema covers JSON shape, literal vocabularies, cardinalities, numeric and
string refinements, discriminated variants, and cross-field constraints it can
express. Whole-catalog identity, provenance homogeneity, and cross-record
references remain catalog rules. They are exercised by portable conformance
cases and implemented at the same atomic catalog-load boundary; they are not
misrepresented as JSON Schema capabilities.

## Dhall's role

Dhall remains the canonical source-authoring language. It has enforceable
source-side value: expressions type-check, imports can be integrity-pinned, and
`dhall-to-json --omit-empty` deterministically projects the authored value into
the runtime JSON representation. The package already declares this authoring
flow (`packages/surface/README.md:249-263`).

Dhall is not a second portable Surface schema and is not required at the Target
catalog boundary. `_types.dhall` uses broad discriminants and optional fields so
heterogeneous authoring lists type-check; the authoritative closed vocabulary
is the Effect decoder. Dhall-to-JSON also erases distinctions that are not in
JSON. For example, these different Dhall values have different semantic hashes
but both compile to JSON `1`:

```dhall
< A : Natural | B : Natural >.A 1
< A : Natural | B : Natural >.B 1
```

The behavior is part of Dhall's documented
[JSON conversion](https://docs.dhall-lang.org/tutorials/Getting-started_Generate-JSON-or-YAML.html),
while Dhall's
[semantic integrity checks](https://docs.dhall-lang.org/tutorials/Language-Tour.html)
identify normalized Dhall expressions. Consequently, a Dhall semantic hash does
not establish which JSON projection was shipped. Only rerunning the selected
projection and comparing its output establishes the source/generated
relationship this repository cares about.

Dhall files may physically accompany a cleanroom snapshot because they are
already part of the rules corpus. Their presence or absence has no consequence
for Target Surface acceptance, and a Target does not regenerate JSON.

## Source publication contract

The source-side publication command is the sole owner of generated-artifact
freshness. It must fail closed and report all independently discoverable issues.
One invocation performs these steps in order:

1. Discover every canonical Dhall source by the source-owned content
   convention, excluding authoring helpers by shape/location rather than by an
   ever-growing filename allowlist.
2. Require exactly one generated JSON peer for every canonical
   source and reject generated JSON with no canonical source.
3. Run the repository-selected `dhall-to-json --omit-empty` invocation for every canonical
   source into temporary output and compare the generated bytes directly with
   the committed source-peer JSON. This extends the current implementation,
   which already uses `Buffer.equals` rather than hashes
   (`scripts/check-surface-content-json-sync.cjs:42-60`, `71-108`).
4. Strictly decode every generated source artifact through the authoritative
   Effect schema with all-error reporting. A source artifact contributes either
   one record or an explicitly typed non-empty record collection; it is not an
   untyped JSON container. Unknown properties are errors.
5. Flatten and partition the complete decoded record set by its Unit or Stat Block family,
   then build the SRD collections while collecting all duplicate-id,
   provenance, and reference issues.
6. Derive complete record-rooted mechanics graphs through the source-side
   executable-mechanics projection, applying the Source Execution Horizon to
   progression-governed roots, then generate the one Cleanroom aggregate from
   those graphs. A root with any represented mechanic lacking production
   TypeScript reducer execution is excluded or the source is repaired; nested
   mechanics are never deleted to make a partial record. The publication
   command closes the projection under required catalog references and reruns
   collection integrity over the projected catalog. Production TypeScript
   installs this generated aggregate instead of retaining hand-maintained JSON
   imports, collection arrays, or a support manifest.
7. Generate the Draft 2020-12 compound schema from the Effect schema, validate
   the schema against its meta-schema, and compare it directly with the
   committed portable schema.
8. Run every portable valid and invalid case through both the TypeScript
   catalog boundary and a standards-conforming JSON Schema validator. Require
   the normalized observable outcomes to agree.
9. Compare the generated aggregate catalog directly with the committed
   cleanroom catalog document.

Steps that depend on earlier success may stop—for example, no catalog can be
generated from structurally undecodable records. Independent records and
independent catalog issues are accumulated. Publication writes no artifact on a
failed run.

The check eliminates the current distant membership interpretations. Every
canonical record flows through regeneration, strict decoding, catalog checks,
and the source executable-mechanics projection; generated JSON without a source
is rejected, and production installs only the derived aggregate. A record can
be absent from the Target package only because its complete mechanics graph
does not meet the source-derived Cleanroom boundary, never because a second
filesystem scan, import list, or handwritten support inventory omitted it.

## Target acceptance contract

A conforming Target SDK exposes an observable catalog-load operation over the
supplied aggregate JSON document. It may choose its own modules and native
types, but the operation behaves as one of two states:

- **accepted** — the complete document has become a typed, provenance-correct
  SRD catalog suitable for the separately decided mechanics-admission workflow;
  or
- **rejected** — no catalog was installed and a non-empty collection of typed
  Surface content issues is returned.

The operation must:

1. reject invalid JSON and duplicate object member names;
2. validate against the supplied Draft 2020-12 schema with unknown properties
   rejected;
3. enforce Unit and Stat Block identity, SRD provenance, and cross-record
   reference invariants;
4. collect independent issues rather than fail on the first bad record;
5. preserve authored identity and provenance on success; and
6. feed the exact accepted catalog into the Target SDK's real installation
   path. Running a detached validator while production code loads content some
   other way is not conformance.

The exact generated Cleanroom aggregate is the positive corpus. The complete
canonical SRD catalog remains source-side publication input and is not supplied
to Targets. This decision does not require a general third-party installation
API. Future PHB+ content is official closed-licensed content, not a widening of
the SRD catalog: it must enter through a separately named licensed/private
collection and distribution boundary. No real PHB+ authored identity, prose,
fixture, or generated artifact belongs in this contract. Synthetic mechanics
fixtures elsewhere remain test pressure, not PHB+ content.

## Typed issue algebra

The portable algebra fixes semantic variants and useful payload facts, not a
particular language's error class hierarchy or spelling convention. The final
source implementation derives its issue-code arrays/types and fixture
expectations from one definition; the variants below are that definition in
language-neutral domain terms, not a second status ledger.

### Document issues

- **Invalid JSON** identifies a document that cannot be parsed. A native parser
  should retain its source location and diagnostic, but conformance does not
  compare parser-specific coordinates or prose.
- **Duplicate object member** carries the JSON Pointer to the containing object
  and the repeated member name.

### Shape issues

- **Unknown property** carries the property instance JSON Pointer and the schema
  location that closed the object. It is distinguished because silently
  dropping new mechanics is specifically forbidden.
- **Schema constraint** carries the failing instance JSON Pointer and absolute
  schema location or schema JSON Pointer.

The JSON Schema specification standardizes validation locations but not human
message wording. See its
[output-format requirements](https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-01#name-output-formatting).
Therefore prose messages, validator-specific branch traces, and issue ordering
are non-normative.

### Catalog issues

Catalog issues use a **record reference** payload that is exactly one of Unit
identity or Stat Block identity. The required variants are:

- **Duplicate record identity** carries the record family, duplicated id, and
  the two-or-more occurrence JSON Pointers.
- **Member provenance mismatch** carries the member record reference, member
  JSON Pointer, and actual provenance. Expected provenance is fixed by the SRD
  catalog kind rather than repeated in every issue.
- **Unknown Unit reference** carries the referring Unit id, reference JSON
  Pointer, and absent referenced Unit id.
- **Invalid subclass choice reference** carries the class Unit id, reference
  pointer, referenced Unit id, expected class name, and an actual-value union:
  either a non-subclass Unit kind or a subclass with a different class name.
- **Invalid species trait reference** carries the species Unit id, reference
  pointer, referenced Unit id, expected species, and an actual-value union:
  either a non-species-trait Unit kind or a species trait for a different
  species.

These are already modeled in
`UnitCatalogBuildIssue` (`packages/surface/src/surface/unit-catalog.ts:431-463`)
and `StatBlockCatalogBuildIssue`
(`packages/surface/src/surface/stat-block-catalog.ts:49-60`). Source repair may
use idiomatic names in TypeScript, but it must preserve these distinct recovery
facts and add a typed variant for any currently omitted cross-record invariant
required by the complete catalog. It must not collapse catalog failures into
one schema issue.

Every issue carries the catalog/record identity and JSON Pointer relevant to a
caller fixing the supplied document. The rejected result carries a non-empty
collection by type. Fixture comparison is unordered and checks the required
typed facts; it does not compare rendered strings.

## Portable conformance cases

Cases are source-owned JSON inputs plus expected accepted/rejected typed facts.
They are small enough to diagnose one boundary while collectively covering:

- the exact supplied Cleanroom aggregate accepted as a whole;
- every top-level Unit and Stat Block variant represented by the supplied
  corpus;
- missing required fields, wrong primitive types, invalid literals, invalid
  numbers/cardinalities, and malformed discriminated variants;
- unknown properties at the catalog, record, and nested-mechanics levels;
- duplicate JSON member names before ordinary JSON object construction;
- duplicate Unit and Stat Block identities;
- non-SRD provenance inside the SRD catalog;
- unknown and wrong-kind cross-record references; and
- multiple independent invalid records producing multiple issues without a
  partial installed catalog.

Real SRD identity may appear because the SRD is redistributable. Structural and
catalog mutations use SRD records when SRD provenance must remain valid.
Visibly synthetic identity appears only in a case whose expected rejection
includes non-SRD provenance; a synthetic record never claims SRD provenance.
No fixture uses PHB+ identity or recognizable closed-licensed catalog content.

Fixtures specify behavior the schema format cannot express, especially
catalog-wide uniqueness and reference relationships. They are not examples
only: both the source publication lane and every Target conformance lane execute
them. Removing a fixture removes a named contract check.

## Explicit non-goals and rejected alternatives

### No hashes, release ids, or integrity manifest

A hash is a content fingerprint. It detects a difference only when a trusted
expected fingerprint exists separately. This workflow starts from one coherent
cleanroom snapshot and does not require compatibility or authenticity between
independently distributed releases. Adding digests, versions, or a manifest
would create bookkeeping without a needed observable behavior.

Generated-artifact drift is instead executable source behavior: rerun the
generator and compare actual output. Cleanroom harness and documentation that
currently imply hash/release coordination should be simplified in follow-up
work rather than preserved as accidental architecture.

### No per-record Target inventory

Hundreds of files plus an inventory would make paths, entries, and imported
membership change together. One aggregate catalog makes the collection the
input and leaves source-peer files at their authoring boundary.

### No handwritten portable schema

Handwriting JSON Schema beside Effect Schema duplicates the closed vocabulary
and every refinement. Generation plus dual-boundary conformance cases keeps one
structural authority and makes unsupported generator constructs fail during
source publication.

### No Dhall validation in Targets

Requiring every Target to run Dhall would recheck source authoring without
proving that production loaded the emitted JSON. Dhall remains canonical and is
checked exhaustively before packaging; Target acceptance begins from the
supplied aggregate JSON.

### No Static Mechanics Admission status in Surface

The complete canonical source catalog can contain records that do not enter the
Cleanroom projection. The supplied aggregate is derived from source executable
behavior, and each Target independently admits it with typed mechanics issues.
Adding `supported` metadata to Surface records would duplicate that executable
boundary and allow it to drift.

### No Opaque Oracle in this contract

An **Opaque Oracle** is a promising conformance-only boundary through which
property-based tests can query the calibrated production TypeScript
implementation without exposing its source to Target implementers. It must be
designed separately: the Target remains standalone, RAW/QNT retain authority,
and the oracle must call production boundaries rather than become a shadow
implementation. This ticket records the term but does not make Target Surface
acceptance depend on an oracle.

## Source-readiness consequences

The Portable Surface Contract is ready to enter the Cleanroom Core only after
source implementation establishes all of the following:

- every canonical Dhall source has exactly one generated JSON peer and every
  generated peer has a canonical source;
- the full generated set strictly decodes with no unknown-property stripping;
- supplied Unit and Stat Block membership derives once from complete
  source-executable record-rooted mechanics graphs into the generated Cleanroom
  aggregate catalog;
- the aggregate catalog makes mixed provenance unrepresentable after decode
  and passes all collection/reference checks;
- Draft 2020-12 schema generation succeeds from Effect Schema and the committed
  artifact is in sync;
- valid/invalid cases agree between the TypeScript boundary and an independent
  JSON Schema implementation; and
- the root quality lane runs the complete publication check, replacing the
  class-only sync gate without an allowlist or baseline.

This is source repair and future implementation work. The present wayfinder
ticket decides the contract; it does not alter executable Surface behavior.

## Map impact

This decision clears the portable Surface validation fog from the Cleanroom SDK
map. Its original full-canonical-catalog Target membership statement is revised
by [Static Mechanics Admission and Dynamic
Availability](./static-mechanics-admission-and-dynamic-availability.md): the
complete catalog is source publication input, while Targets receive its derived
Cleanroom projection. Cleanroom composition and Target Language Adapter
packaging remain owned by [Define the Cleanroom Core and Target Language Adapter
boundary](https://github.com/dearlordylord/5e-quint/issues/20).

Two follow-ups surface from the grilling:

1. define the Opaque Oracle protocol and its role in property-based differential
   conformance without exposing source code or displacing QNT; and
2. simplify cleanroom harness/docs that assume hashes, releases, manifests, or
   cross-snapshot coordination, while implementing the full-corpus source
   publication check decided here.

Neither follow-up changes this contract's Target acceptance boundary.
