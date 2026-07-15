# Surface Provenance and Catalog Composition Audit

Wayfinder research for [Audit Surface provenance and catalog composition
seams](https://github.com/dearlordylord/5e-quint/issues/75), investigated at
source commit `f4fd7d3b24ef683cf3e4147c109b77ea21eb001a`.

This is a public architectural audit. It does not reproduce private PHB+
identity, private corpus text, or private license terms. Private pairing
research was used only to check the direction of the existing boundaries; the
findings below are expressed entirely in repository-owned terms and public
source references.

## Scope and vocabulary

The audit answers four questions:

1. Where does the current code assume one SRD-only shipped corpus?
2. Where do `xphb`, `synthetic-test`, or related source-lane markers stand in
   for a different concept?
3. Which code can already consume a provenance-neutral catalog unchanged?
4. Which owners must change directly before a separate Mushroom-authored
   collection can compose with the SRD collection?

The following concepts are deliberately distinct:

- **provenance**: the canonical rules source a published record claims to come
  from;
- **structured input**: a private or public machine-readable source used to
  import, normalize, compare, or review a record;
- **authored collection**: the homogeneous, distributable set that owns
  published records and enforces its provenance and license/distribution
  policy;
- **fixture origin**: why a visibly synthetic record exists in a test; this is
  not published-content provenance;
- **runtime projection**: typed execution facts derived from an admitted
  Surface record; and
- **selected authored identity**: a record id retained for lookup, user choice,
  presentation, replay, or an authored dependency. It must not select runtime
  semantics.

No new domain term is introduced here. `CONTEXT-MAP.md` routes rules language to
`UBIQUITOUS_LANGUAGE.md` and architecture/provenance ownership to
`ARCHITECTURE.md` and accepted ADRs, so this wayfinder artifact remains
historical decision evidence rather than a parallel glossary or architecture
owner.

## Executive answer

The runtime-facing catalog interfaces are already mostly provenance-neutral,
but the installation path is not. `UnitRecord` and `StatBlockRecord` accept one
shared three-value provenance shape, while the only collection types and both
catalog builders accept SRD collections exclusively. The application and MCP
composition roots instantiate those builders with only the built-in SRD
collections.

A Mushroom collection therefore must change Surface directly. It cannot be
added safely through an MCP registry, an adapter catalog, a runtime-only record
type, or a parallel mechanics object. The direct seam is:

```text
collection-owned authored source/artifacts
  -> canonical Surface decode
  -> homogeneous SRD collection | homogeneous Mushroom collection
  -> one composed Unit catalog and one composed Stat Block catalog
  -> existing generic catalog consumers
  -> shape-based support profiles and runtime projection
```

The current `xphb` and synthetic markers conflate several axes:

- `xphb` is admitted as published-record provenance in Surface, used as a
  5e-tools locator in trace rendering, used as a structured-input/provider code
  in the survey queue, used as a private-output routing switch, and used on
  visibly synthetic test records;
- `synthetic-test` is admitted by the production record schema even though it
  describes fixture role rather than published provenance; and
- `classic-2024-mechanics-source-lane` creates a second runtime-admission record
  type and dispatches on its pseudo-provenance solely to carry one synthetic
  mechanics fixture through production support code.

Those markers must not become the Mushroom design. The Mushroom collection
needs its own canonical published provenance, while private structured-input
locators, destination/routing policy, and fixture origin remain separate typed
facts at their owning boundaries.

## Current inventory

At the audited commit:

- `packages/surface/content/` contains 604 Dhall files and 604 JSON files;
- the JSON corpus contains 620 recursively discovered provenance-bearing
  records, all marked `srd-5.2.1`;
- `unit-catalog.ts` has 392 static JSON imports and
  `stat-block-catalog.ts` has 5;
- the survey queue contains 886 rows routed as `srd-5.2.1` and 207 rows carrying
  one of several provider/book codes, including 69 `xphb` rows; and
- production TypeScript contains 21 direct provenance reads after excluding
  ordinary tests, MBT tests, and files named as test support. Most are catalog
  validation or presentation, but some select runtime admission behavior.

The inventory is reproducible without reading or printing private record
identity:

```sh
rg --files packages/surface/content -g '*.dhall' | wc -l
rg --files packages/surface/content -g '*.json' | wc -l
rg -c '^import .* from "../../content/.*\.json";' \
  packages/surface/src/surface/unit-catalog.ts
rg -c '^import .* from "../../content/.*\.json";' \
  packages/surface/src/surface/stat-block-catalog.ts
jq -r '.. | objects
  | select(has("provenance") and (.provenance|type=="object")
      and (.provenance.kind|type=="string"))
  | .provenance.kind' packages/surface/content/*.json | sort | uniq -c
jq -r '.source' scripts/content-surface-survey/unit-queue.jsonl \
  | sort | uniq -c
```

## Ownership map

| Boundary                    | Current owner                                        | Current assumption                                                                                    | Mushroom implication                                                                        |
| --------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Record source shape         | `@dnd/surface` Effect schemas                        | One `ProvenanceSchema` union covers published sources and test fixtures                               | Split published provenance from fixture origin; do not add another overloaded literal       |
| Canonical authored values   | `packages/surface/content/*.dhall`                   | One flat content root, with provenance repeated per record                                            | Give each distributable collection an explicit source/artifact boundary                     |
| Generated JSON              | Dhall commands and a class-only sync check           | One flat generated tree; only class records are quality-checked for source/JSON sync                  | Give SRD and Mushroom deterministic, collection-aware generation and integrity checks       |
| Installed Unit corpus       | `SrdUnitCollection` and `buildUnitCatalog`           | Every installed collection is SRD                                                                     | Accept a closed union of homogeneous collection variants                                    |
| Installed Stat Block corpus | `SrdStatBlockCollection` and `buildStatBlockCatalog` | Every installed collection is SRD                                                                     | Make the same direct change while preserving the distinct record family                     |
| Survey/import research      | `scripts/content-surface-survey/`                    | One `source` field is both provenance/routing class and structured-input provider code                | Separate claimed output provenance, structured-input locator, and destination policy        |
| Runtime admission           | package-local readers/support profiles               | Usually mechanics-shaped, with a few provenance/identity gates and one parallel non-SRD pseudo-record | Remove provenance/identity selection and admit canonical Surface shapes                     |
| Identity guard              | `check-authored-id-dispatch-boundary.cjs`            | All public authored identities live below one flat Surface content root                               | Discover identities from every public authored collection manifest/root                     |
| SRD provenance audit        | `srd521-surface-authored-corpus-audit.cjs`           | Only `srd-5.2.1` records are relevant                                                                 | Keep this SRD-specific; add collection-owned evidence rather than weakening its denominator |
| Product composition         | MCP and app composition roots                        | Install only built-in SRD collections                                                                 | Select the composed catalog once and pass it through existing generic APIs                  |

## Findings

### 1. The record schema conflates published provenance and fixture role

`ProvenanceSchema` is `{ kind, section }`, where `kind` is one of
`srd-5.2.1`, `xphb`, or `synthetic-test`
(`packages/surface/src/surface/schema-base.ts:679-682`). Both Unit metadata and
Stat Block roots embed that same shape
(`packages/surface/src/surface/schema-nonspell.ts:2289-2294`,
`packages/surface/src/surface/schema-spell.ts:5559-5566`,
`packages/surface/src/surface/schema.ts:467-474`).

That union can represent states the project says are invalid:

- a public record can claim `xphb` provenance even though PHB+ authored
  identity is forbidden in published source;
- a production-decoded record can claim `synthetic-test`, even though being a
  fixture is not a canonical published rules source; and
- `section: string` has the same meaning and required shape for every variant,
  even though an SRD passage, a future Mushroom publication location, and a
  fixture explanation are different domains.

The schema also has no collection/distribution-policy fact. The SRD kind implies
license and distribution policy only through architecture prose. A new
published corpus cannot safely be represented by adding `mushroom` beside
`xphb` while leaving all other axes implicit.

The later catalog decision should choose an exact discriminated shape, but the
invariant is already settled: published provenance variants and test-fixture
origin must not inhabit the same unqualified `kind/section` product.

### 2. The trace renderer proves `xphb` currently means structured input too

`get5etoolsSource` maps both `srd-5.2.1` and `xphb` record provenance to the
5e-tools `XPHB` source code, then builds a 5e.tools URL from the authored record
identity (`packages/surface/src/interpreter/mermaid.ts:100-170`). This is an
explicit provenance-to-structured-input projection. An SRD-authored record's
canonical source is the SRD even when a 5e-tools record helped locate or
normalize it.

The Stat Block trace has the opposite hard-coded assumption: it labels every
record's provenance section `SRD source` regardless of the provenance variant
(`packages/surface/src/interpreter/mermaid.ts:79-94`). A generic decoder plus a
source-specific renderer therefore gives contradictory meanings to the same
field.

Trace rendering should consume provenance for provenance display and a separate
optional structured-input locator for reviewer navigation. Absence of that
locator must mean no external link, not an inference from provenance.

### 3. Collection homogeneity exists, but only for SRD

`SrdUnitCollection` and `SrdStatBlockCollection` each repeat the collection
provenance and narrow every member to `srd-5.2.1`
(`packages/surface/src/surface/unit-catalog.ts:405-423`,
`packages/surface/src/surface/stat-block-catalog.ts:23-41`). The builders also
validate member provenance at runtime and return typed `mixedProvenance` issues
(`unit-catalog.ts:904-951`, `1068-1083`;
`stat-block-catalog.ts:122-172`).

This record/collection repetition is intentional executable duplication, not
redundant runtime state. ADR-0003 requires inspectable per-record provenance and
a homogeneous collection boundary
(`docs/adr/0003-monster-stat-blocks-authored-data-provenance.md:5-18`). Keep the
invariant.

The problem is the closed input type: `buildUnitCatalog` accepts only
`readonly SrdUnitCollection[]`, and `buildStatBlockCatalog` accepts only
`readonly SrdStatBlockCollection[]`. A separate Mushroom collection is
unrepresentable even though the returned lookup types are generic
`UnitRecord`/`StatBlockRecord` catalogs.

The direct Surface change is a closed union of homogeneous published
collections, accepted by the existing family-specific builders. The later
catalog-semantics ticket must decide global versus collection-qualified ids,
overlap/replacement rules, and authored dependencies. This audit does not
pre-empt those choices.

### 4. Unit and Stat Block builders duplicate a provenance algorithm

The two catalog modules separately define the SRD provenance types, type guards,
asserting decoders, collection constructors, mixed-provenance issue shapes, and
validators. Their record families must remain distinct, but their collection
integrity algorithm has name/meaning/algorithm connascence. Adding a second
collection variant independently to both files would increase the chance that
one family admits a state the other rejects.

The shared fact should be a small collection-metadata and member-provenance
invariant owned by Surface, reused by two family-specific catalogs. It must not
turn Unit and Stat Block into one mixed record family or create a parallel
registry.

Catalog diagnostics also need collection identity once more than one collection
can be installed. Current duplicate-id and reference issues name records but not
the owning collections (`unit-catalog.ts:431-464`,
`stat-block-catalog.ts:49-61`), which is sufficient only while every input has
the same SRD identity.

### 5. Installed-corpus membership is a manual, flat-tree convention

Canonical Dhall, generated JSON, authored presence, and installed membership are
different sets. Catalog membership is encoded by hundreds of static JSON imports
plus array assembly (`unit-catalog.ts:1-397`, `507-901` and
`stat-block-catalog.ts:3-9`, `108-120`). The SRD corpus audit reconstructs the
same membership by regex-reading those import statements
(`scripts/srd521-surface-authored-corpus-audit.cjs:5-16`, `76-130`).

The root quality check compiles and byte-compares only `class_*.dhall`
(`scripts/check-surface-content-json-sync.cjs:8-12`, `42-107`). The rest of the
flat corpus has no equivalent source-to-generated-artifact quality invariant.
This was also established by the earlier [Surface Decoding and Admission
Boundary Audit](../cleanroom-sdk/surface-decoding-admission-audit.md).

A Mushroom collection needs a collection-owned source/artifact manifest or
equivalent structural boundary from which generation, decoding, installation,
identity scanning, and audit membership derive. Adding another hand-maintained
import list or copying the whole Surface package into a public Mushroom tree
would preserve the existing connascence.

The exact directory/package layout belongs to the authoring-workflow decision,
but the public SRD and public Mushroom outputs must be structurally distinct.
Private structured input remains outside both public artifact roots.

### 6. The survey queue's `source` field combines three decisions

The survey queue explicitly documents `Source` as either a 5e-tools provider
code or the SRD provenance class, and says it also controls output routing
(`scripts/content-surface-survey/unit-catalog.ts:29-53`). Some SRD rows point to
5e-tools XPHB JSON as their structured-input anchor while declaring
`source: "srd-5.2.1"` (`unit-catalog.ts:67-111`, `219-252`). Non-SRD rows use
provider/book codes directly as `source` (`unit-catalog.ts:258-329`).

`worker.sh` then sends `srd-5.2.1` to public Surface paths and every other value
to the private pairing workspace (`scripts/content-surface-survey/worker.sh:52-80`).
`close-loop.ts` repeats the smaller `srd-5.2.1 | xphb` source model
(`scripts/content-surface-survey/close-loop.ts:10-23`, `145-176`).

The current routing protected the public tree, but the type lies about why a
row goes where. The Mushroom workflow needs at least three independently typed
facts:

- claimed output collection/provenance;
- structured-input locator and provider/source code; and
- private research versus public authored-artifact destination policy.

Routing public Mushroom output on a private provider code would make the
structured input look like provenance. Routing on a new overloaded
`source: mushroom` value would lose which private input was used. Both are
invalid.

### 7. Existing leak checks are SRD guards, not a Mushroom admission design

`provenance-check.sh` scans the SRD survey dataset, SRD survey results, and the
flat Surface content root for a hard-coded set of provider/source markers and
known non-SRD identities
(`scripts/content-surface-survey/provenance-check.sh:12-68`). Its positive SRD
row assertion is explicitly advisory and has no failure path
(`provenance-check.sh:70-80`). It is not part of the root `quality` script
(`package.json:4-28`).

That check is useful as a private-workflow leak tripwire, but its marker list is
about structured inputs and known closed identity, not canonical provenance. It
must not be generalized into “anything not SRD is forbidden” once public
Mushroom-authored records exist.

The SRD provenance audit is correctly SRD-specific: it filters decoded records
to `provenance.kind === "srd-5.2.1"`, resolves their sections against the local
SRD corpus, and reports their SRD collection membership
(`scripts/srd521-surface-authored-corpus-audit.cjs:76-130`, `444-509`). Preserve
that denominator. Mushroom needs its own collection-owned provenance and
generation evidence, with a shared low-level harness only where the invariants
are genuinely identical.

### 8. The authored-identity scan sees only the current flat content root

`check-authored-id-dispatch-boundary.cjs` discovers identity literals only from
`packages/surface/content/**/*.json`
(`scripts/check-authored-id-dispatch-boundary.cjs:5-10`, `257-330`). It scans
production source for comparisons, switch/match branches, membership tests, and
related dispatch patterns, with explicit boundary allowlists
(`check-authored-id-dispatch-boundary.cjs:26-74`, `654-1216`, `1559-1687`).

That is durable for the current single public content root, but a separate
Mushroom root would be invisible unless the scanner derives all public authored
roots from the same collection manifest used for installation. A second scanner
with a separately maintained Mushroom identity list would duplicate the
invariant and permit drift.

The recursive collector also treats any key ending in `Id` as authored identity
but collects top-level `name` and `provenance.section` only from the parsed file
root (`check-authored-id-dispatch-boundary.cjs:267-326`). List-valued record
files therefore receive weaker name/section coverage than singleton files. A
collection-aware rewrite should walk each decoded record, not infer record
boundaries from JSON file shape.

Private leak detection and public runtime-dispatch detection remain separate
checks: the former may use private local reference data without printing it;
the latter derives public Mushroom identities from the public authored
collection.

### 9. Test fixtures misuse both `xphb` and a parallel provenance lane

Several tests create visibly synthetic records but mark them `xphb`, often with
sections such as `structured-input-only` or `test fixture`. Examples occur in
Surface catalog tests, battle test support, character-to-battle tracer tests,
and MCP tests. Those records are not published XPHB records and do not claim
canonical PHB provenance; the marker is functioning as “not SRD” or “exercise
the other branch.”

One MBT lane uses `synthetic-test`, which at least names fixture intent, but the
literal is still part of the production `ProvenanceSchema`. Another lane goes
further: `ClassicNonSrdMechanicsUnit` is a parallel, reduced Unit-like type with
`provenance.kind === "classic-2024-mechanics-source-lane"`
(`packages/battle-runtime/src/unit-feature-support.ts:1243-1258`). The production
support parser unions it with `UnitRecord`, branches on that provenance literal,
and bypasses the remaining canonical Unit support checks
(`unit-feature-support.ts:1266-1300`, `3040-3044`). A helper reconstructs that
parallel record from a JSON fixture and throws on identity/provenance drift
(`packages/battle-runtime/src/classic-non-srd-mechanics-test-fixtures.ts:1-43`).

This is a direct violation of the desired stack ownership: the fixture exists
outside Surface, duplicates a subset of Surface mechanics, and teaches runtime
admission to dispatch on provenance. Retire the parallel type and pass visibly
synthetic records through the canonical Surface schema and ordinary mechanics
support profile. Fixture origin belongs to the test boundary and must have no
semantic branch in production admission.

### 10. A few production support gates dispatch on SRD identity/provenance

Most support-profile code reads mechanics shape and is reusable across
provenance. Two concentrated exceptions matter for Mushroom composition.

First, `supportedClassFeatureSpellFreeCastGrantsForUnit` in Surface selects from
a table containing Unit id, name, class, level, provenance section, referenced
Spell id, count, and cadence, then requires `srd-5.2.1` and exact authored
identity before returning the narrowed grants
(`packages/surface/src/surface/types.ts:1286-1341`, `1353-1418`). The output
mechanics facts are already present on the record; provenance and identity are
being used as an admission registry.

Second, battle character resources define two narrowed Spell types with exact
id, name, SRD provenance section, and mechanics checks, then use those guards to
admit feature-granted invocation modes
(`packages/battle-runtime/src/character-battle-resources.ts:137-171`,
`1076-1105`). A Mushroom-authored record with the same typed authored dependency
and procedure shape would fail solely because its identity/provenance differs.

These gates must change at their owners rather than gain Mushroom-specific
branches. When a source rule names another authored record, keep that authored
dependency as data on the source record; admit the referenced record by decoded
shape and typed procedure facts. The selected id may remain for lookup and
traceability, but provenance, name, and section must not choose executable
semantics.

### 11. Most runtime consumers need no provenance-specific rewrite

Character creation, character sheet, character-to-battle composition, and most
battle code accept the generic `UnitCatalog`, `StatBlockCatalog`, `UnitRecord`,
or `StatBlockRecord` types. The catalog APIs return generic records and runtime
packages ordinarily ignore provenance. This is the correct seam: install a
composed catalog once and thread it through existing inputs.

The product roots currently hard-code SRD installation:

- MCP builds both catalogs from only the SRD collections
  (`packages/mcp/src/composition-root.ts:1-12`, `36-64`);
- character creation in the app builds only the SRD Unit catalog
  (`packages/app/src/components/character-creation/characterCreationRuntime.ts:37-46`);
- the wizard demo builds only the SRD Unit catalog
  (`packages/app/src/battle-scene/wizard-battle-demo.ts:370-380`); and
- battle admission fixtures/coverage support build only SRD catalogs
  (`packages/battle-runtime/src/unit-profile-admission-catalog-support.ts:1-36`).

Only composition roots and product wording need to know which collections are
installed. Do not add Mushroom registries inside character creation, character
sheet, battle, MCP sessions, or React state.

MCP presentation has two SRD assumptions to revise when the product installs a
composed catalog: the Stat Block tool description says it lists SRD Stat Blocks,
and its output weakens provenance to two arbitrary strings
(`packages/mcp/src/content-tools.ts:44-60`, `101-114`, `288-309`). Unit listing
does not expose collection/provenance at all (`content-tools.ts:194-200`,
`260-285`). Exact selection/presentation behavior belongs to the composed
catalog decision, but it should derive from catalog records/collection
membership, not a second MCP classification table.

### 12. Cross-record validation is already catalog-wide, but its semantics are SRD-era

The Unit builder creates one global id map across all input collections, rejects
duplicates, then validates starting-equipment, subclass, and species-trait
references against that combined map (`unit-catalog.ts:904-943`, `953-1066`).
This is a useful starting seam for authored dependencies across collections.

It does not decide whether Mushroom ids share a global namespace, may replace an
SRD record, must qualify cross-collection references, or may reference SRD
records without copying their identity. Those are domain choices, not parser
details, and are already the question owned by [Define composed catalog and
authored-dependency semantics](https://github.com/dearlordylord/5e-quint/issues/72).

Until that decision is made, no Mushroom adapter should silently prefix ids,
rewrite references, shadow an SRD lookup, or maintain a second dependency map.

## Direct-change seams

The following changes are prerequisites for a future implementation. They are
listed by owner; this ticket does not implement them.

### Surface source and types

- Replace the overloaded three-literal provenance product with types that keep
  published provenance and fixture origin distinct.
- Add a canonical Mushroom published-provenance variant only after the
  collection's authorship/distribution contract is decided.
- Keep structured-input metadata out of published record provenance. If review
  tooling needs it, give it a separate private/review-only type and artifact.
- Keep Unit and Stat Block as distinct record families.
- Reuse one collection/member-provenance invariant across their separate
  catalogs.

### Collections and catalogs

- Add an explicit homogeneous Mushroom Unit collection and, if the product
  includes them, a homogeneous Mushroom Stat Block collection.
- Change the family-specific builders to accept the closed union of published
  collection variants while rejecting mixed member provenance/license states.
- Include owning collection identity in duplicate/reference diagnostics.
- Derive installation, identity scanning, generated-artifact auditing, and
  presentation membership from one collection-owned manifest or equivalent
  structural source of truth.
- Decide overlaps, replacement, namespace, and authored-dependency rules in the
  existing catalog-semantics ticket before choosing map keys or reference
  encodings.

### Authoring and generated artifacts

- Separate output provenance, structured-input locator, and destination policy
  in survey/import queue records and worker protocols.
- Route by explicit destination collection/distribution policy, never by the
  provider/book code of the structured input.
- Give public SRD and public Mushroom source/generated artifacts structurally
  separate roots; keep private input and diagnostics outside both.
- Make deterministic source-to-JSON pairing and decode checks collection-aware.
- Preserve the SRD-specific provenance-to-local-RAW audit rather than treating
  Mushroom as another SRD source code.

### Support and runtime

- Remove exact provenance/name/section selection from free-cast and
  feature-granted Spell admission; use authored dependencies plus parsed shape.
- Delete the parallel classic non-SRD mechanics record and provenance branch;
  use canonical synthetic Surface fixtures through normal support profiles.
- Keep selected authored ids only where lookup, user selection, replay,
  presentation, or a genuine authored dependency needs them.
- Pass the composed generic catalogs through existing runtime APIs. Do not add
  runtime-owned content registries or duplicate provenance in battle/character
  state.

### Product composition and guards

- Change MCP/app composition roots to install the selected published collection
  set once.
- Make catalog-listing outputs collection/provenance-aware through typed Surface
  facts, and remove SRD-only wording when the installed product is composed.
- Make the authored-identity dispatch scan discover every public collection and
  every decoded record container shape from the installation source of truth.
- Keep private identity-leak detection separate from public runtime-dispatch
  detection; fail closed without emitting protected identities into logs.

## What does not need to change merely for composition

- The Unit and Stat Block mechanics vocabularies do not need parallel Mushroom
  variants. Widen canonical Surface only when a concrete original record exerts
  new mechanics pressure.
- Character draft, Character Build, Character Sheet, Battle State, and MCP
  session state do not need provenance copies.
- Most runtime reducers do not need provenance branches; their generic catalog
  and record inputs are already the right boundary.
- The SRD authored collection, local RAW corpus, SRD provenance audit, and SRD
  QNT authority remain SRD-specific.
- Formal authority for non-SRD mechanics is not decided here; it belongs to
  [Define end-to-end execution and formal-parity
  scope](https://github.com/dearlordylord/5e-quint/issues/71).

## Connascence assessment

The high-risk relationships are:

| Fact that changes                     | What currently must change with it                                                         | Connascence                               | Required weakening                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------- | --------------------------------------------------------- |
| A provenance literal                  | record schema, trace links/labels, collection guards, tests, survey routing, support gates | meaning/identity, distant and high degree | split the concepts into owner-specific discriminants      |
| Installed content membership          | JSON imports, collection arrays, corpus audit regexes, identity scan roots, product roots  | name/position/meaning, distant            | derive all consumers from collection-owned membership     |
| Unit/Stat Block collection provenance | two sets of types, guards, validators, issues, and tests                                   | algorithm, duplicated                     | share the invariant while preserving family types         |
| A support-profile record relation     | authored ids/names/sections, mechanics grants, runtime guards                              | identity/meaning, high risk               | retain typed authored dependency and parse mechanics once |
| Synthetic mechanics coverage          | fixture JSON, parallel record type, provenance discriminator, bypass branches              | execution/identity, high risk             | canonical Surface fixture plus ordinary support admission |

Record-level and collection-level provenance remain intentionally connascent and
local: the collection constructor/build result enforces their agreement. That is
the strong relationship ADR-0003 requires. The changes above remove distant
copies and semantic switches without weakening the homogeneous collection
boundary.

## Inputs to downstream decisions

For [Define the private-input to public-Mushroom authoring
workflow](https://github.com/dearlordylord/5e-quint/issues/70):

- decide the explicit queue/protocol fields for output collection, private
  structured-input locator, and artifact destination;
- decide the public Mushroom source/generated root and deterministic review
  gates;
- decide how private leak checks fail without logging protected identity; and
- retire or migrate current `xphb`/fixture marker uses without treating the
  provider code as provenance.

For [Define composed catalog and authored-dependency
semantics](https://github.com/dearlordylord/5e-quint/issues/72):

- decide the closed published collection union and its collection metadata;
- decide global versus qualified ids, overlaps, replacements, and duplicate
  diagnostics;
- decide permitted cross-collection authored dependencies; and
- decide how catalog discovery/presentation exposes collection identity without
  duplicating record provenance.

For [Define end-to-end execution and formal-parity
scope](https://github.com/dearlordylord/5e-quint/issues/71):

- treat provenance-neutral shape admission as the execution seam;
- account for the existing provenance/identity support gates that must be
  removed; and
- do not infer non-SRD QNT authority from current SRD provenance or fixture
  lanes.

## Verification and review record

- **Architecture/domain pass:** checked `CONTEXT-MAP.md`, `ARCHITECTURE.md`,
  ADR-0003, `packages/surface/README.md`, `packages/mcp/README.md`, and the
  private pairing research entrypoint/foundation. The findings preserve Unit
  versus Stat Block, published provenance versus structured input, and Surface
  versus runtime projection.
- **RAW/ubiquitous-language pass:** checked `UBIQUITOUS_LANGUAGE.md` and
  `ASSUMPTIONS.md`. This audit changes no rules-facing term or mechanic and makes
  no RAW interpretation, so no SRD passage or new modeling assumption applies.
- **Code pass:** traced the schemas, both catalog builders, generated-content
  scripts, provenance guards, identity scanner, MCP/app composition roots, and
  generic runtime consumers at the source commit named above.
- **Connascence pass:** classified provenance literals, installed membership,
  duplicated collection algorithms, authored-dependency gates, and synthetic
  fixture admission in the table above.
- **Protected-identity pass:** the artifact contains no private record ids,
  names, slugs, prose, source headings, page references, or recognizable PHB+
  examples.

No implementation or rules test was run. The current code was inspected
read-only; battle MBT and QNT proof lanes are not relevant to this architecture
research ticket.

## Map impact

This audit resolves the current-seam question. It does not make the downstream
catalog, authoring-workflow, or formal-authority decisions.

No new child ticket is needed. The newly precise work is already owned by the
three named downstream tickets above. The map's fog item about migration or
retirement of `xphb` provenance markers, private research artifacts, and
generated peers can be removed: its authoring/routing part is now an explicit
input to **Define the private-input to public-Mushroom authoring workflow**, and
its collection/runtime part is an explicit input to **Define composed catalog
and authored-dependency semantics**.
