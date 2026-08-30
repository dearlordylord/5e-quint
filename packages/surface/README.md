# @dnd/surface

Workspace package for authored D&D content records, provenance-bearing Surface
schemas, catalogs, and review traces.

## Authoring Evidence Boundary

This package holds the **authored corpus** and the **surface types** it is
authored against:

- `src/surface/types.ts` — the closed atom vocabulary. Widenings land here.
- `src/interpreter/tracer.ts` — projects authored content into a mermaid-renderable dependency graph for review.
- `content/<slug>.{dhall,json,trace.md}` — one entry per **actually-authored** content record. `.dhall` is the source-of-truth mechanics definition; `.json` is `dhall-to-json --omit-empty` output consumed by package code; `.trace.md` is generated from that JSON for review. Unit records and monster Stat Block records are separate record families; Stat Block traces render with a distinct root style so they are not read as Units.

Private mining inputs, Mechanical Correspondence, and non-public review evidence
live in the independent Private Authoring Repository. They are pre-publication
evidence, not package inputs. This package must compile, test, and run without a
private checkout or revision.

Only approved authored source records cross into this repository. Public JSON,
traces, catalogs, and manifests are derived from those public sources.

## RAW locator and publication prose boundary

Canonical Unit and Stat Block records own typed authored mechanics plus their
`provenance.section` locator. Unit records do not store a second top-level
rules description. For SRD publication, the generator resolves that canonical
locator against `.references/srd-5.2.1/` and adds `rulesExcerpt` as an exact,
derived presentation projection. A missing, empty, or alias-only locator makes
publication generation fail.

`rulesExcerpt` is intentionally absent from canonical Dhall and content JSON.
It is readable publication output, not authored mechanics or runtime input;
reducers must continue to consume typed Surface facts. Nested prose remains
part of canonical records where the expression is itself authored input or
where an existing typed migration has not yet replaced prose-sensitive support
code.

Standalone Stat Block records preserve every Save modifier printed by their
source in `savingThrowModifiers`, including values equal to the corresponding
ability modifier. The field remains optional because a source may omit a Saves
section; a source that prints a six-ability Save table must retain all six
entries rather than treating the table as a derived shorthand.

A restricted Stat Block spell reference owns a
`StatBlockSpellInvocationRestriction`: its exact `authoredExpression` remains at
the authored/presentation boundary, while its non-empty `deltas` carry the
closed semantic vocabulary. Delta payloads use domain values rather than prose,
and one reference cannot repeat a delta kind. An absent restriction means an
unrestricted reference; there is no second empty-list spelling. Consumers must
select the reference at an identity-retaining boundary, then pass only its
narrowed deltas to semantic admission or execution.

## Goal (read this first)

This package is **where the taxonomy actually lives and evolves**. It is the
authored-content and provenance boundary for the promoted runtime path. The
vocabulary evolves from public SRD requirements and approved typed authoring
pressure without retaining private authored identity or correspondence.

Runtime packages consume this package through typed authored-record boundaries.
They derive execution state at their own package boundaries; Surface remains the
authored content layer, not a runtime reducer and not projected executable IR.
Formal runtime models may use Surface-authored records as input, but integration
belongs in the consuming runtime package, not in this package.

Repository separation:

- `.references/` owns approved public reference inputs; it is not runtime data.
- `packages/surface/` owns public authored records, schemas, provenance-bearing
  collections, and derived public projections.
- The Private Authoring Repository owns private structured input,
  correspondence, and review evidence; it is not a dependency of either public
  boundary.

## Runtime Boundary

This package does not import from the combat engine package. Runtime packages
consume Surface through typed authored-record boundaries, then derive their own
execution state at package boundaries. Surface records remain
provenance-bearing authored content, not a projected executable IR.

The portable publication boundary is `surface/portable-surface`. Its
`decodePortableSrdSurface` entrypoint accepts the JSON publication aggregate,
validates every member, rejects duplicate authored identities and missing
authored dependencies, and returns either the complete published Surface or a
non-empty issue list. A rejected aggregate never exposes a partial Surface.
The self-contained language-neutral cases in
`portable-cases/srd-surface-cases.json` are also checked by an independent
Draft 2020-12 validator. Regenerate them with
`pnpm generate:surface-portable-cases` after publication changes.
This boundary changes no D&D rules; it only validates the already-authored
publication contract.

The standalone SRD Stat Block evidence contract is exported from
`surface/stat-block-parity-observation`. The parity reader derives one report
containing source discovery, coverage, provenance, and publication-peer facts.
`surface/stat-block-scoped-fidelity` consumes that already-derived report with
RAW and authored projection outcomes; it does not rediscover the corpus or
restate parity issues. Its reconciliation continues across joinable identities,
using only identity- or anchor-specific missing, duplicate, divergent, and
malformed parity evidence to suppress an impossible mechanics comparison.
Parity and scoped-fidelity results therefore remain distinct facts for the
final diagnostic boundary.

The `surface/catalog-install` boundary composes that portable decode with
context-independent Static Mechanics Admission in one atomic operation.
`installSrdSurface` and `installSrdSurfaceText` keep decoded canonical content
call-local, invoke distinct Unit and Stat Block admission functions, and
accumulate their typed issues with record roots and mechanics paths. A rejected
result exposes only its non-empty issue collection; an accepted result exposes
the separate Unit and Stat Block catalogs. No receipt, support-status record,
or diagnostic-path state is stored or returned as installed state. A mechanics
admission function must explicitly return `admitted`; a valid record with no
matching executable procedure returns a typed `no_admitted_procedure` issue.
Portable decoding may retain typed `textOnly` mechanics in canonical content;
whether a profile admits that content for execution remains the supplied
admission function's decision.
Mechanics paths use the closed domain-role vocabulary in
`surface/mechanics-graph-path`. Profiles can narrow that vocabulary, while the
installer requires every path to be a structured Unit or Stat Block path and
keeps it correlated with the matching authored-record root. Arbitrary strings,
presentation fields, and cross-family paths are not accepted.

Detailed record-family rules live next to the code that owns them. For monster
Stat Block lookup/provenance mechanics, see `src/surface/stat-block-catalog.ts`.

`buildStatBlockCatalog` admits only validated `SrdStatBlockCollection` values
and returns an `SrdStatBlockCatalog`. Its lookup methods retain the SRD record
type, so a production consumer cannot widen the installed collection into a
mixed-provenance catalog while continuing to present it as the SRD catalog.

## Why Surface Is Not Runtime Code

Surface is the authored rules vocabulary, not a reducer and not executable IR.
That split exists so the repo can encode rules content once, with provenance,
then let each runtime project the authored record into its own execution facts.

Surface must describe the rule in reusable domain language. Runtime packages may
decide whether they support a shape, and they own replay, state transitions,
holes, and parity tests. They must not recover missing rule facts from a concrete
Unit id, Spell id, feature name, or authored slug.

If a runtime needs a fact to execute a rule, that fact belongs either in the
authored Surface record or in table/runtime input. It must not be hidden in a
runtime branch such as "if this is Fireball, do Fireball things."

## Unit Catalog Boundary

SRD Units are installed through `SrdUnitCollection` in `surface/unit-catalog`.
Like Stat Blocks, the SRD Unit collection admits only `srd-5.2.1` provenance and
the catalog rejects duplicate Unit ids across installed collections. Catalog
lookup returns generic `UnitRecord` values; SRD is represented by the
collection/provenance boundary, not by a runtime-facing record subtype.

Runtime packages may narrow catalog records through package-private support
gates, but authored content remains provenance-bearing Surface data.

Schema string roles distinguish nondependency Authored References from Authored
Dependencies at the field that owns the relation. Spell-list, presentation, and
predicate references may name records outside a bounded published slice and
remain exact-source diagnostics. A dependency names mechanics that the referring
record needs; when that record is present in `srdSurface`, the target must also
be present in the same Unit/Stat Block collection. The corpus audit reads the
generated publication membership and rejects a published dependency graph that
is missing either the target record or its admission.

## Character-Creation Records

Class, Background, and Species aggregates are authored `UnitRecord` variants
when they carry character-creation legality facts. Decode them through the
normal Unit boundary or the specific helpers:

- `decodeClassRecordSync`
- `decodeBackgroundRecordSync`
- `decodeSpeciesRecordSync`

Use `surface/character-creation-readers` to read structural creation facts:

- `readClassCreationFacts`
- `readBackgroundCreationFacts`
- `readSpeciesCreationFacts`

Character-creation records author SRD legality facts, not runtime projections.
Examples include class creation facts, background ability-score increase rules,
starting equipment bundles, and species aggregate facts. Item-bundle entries are
`unit_ref`s only when the referenced item is installed in the Unit collection;
noncombat bundle facts that are not Unitized yet are `draft_owned_item`s.

Authored Unit ids name the rules object, not the grant occurrence. Do not encode
trailing level text such as `_l1` or `_l4` in a `class_feature` Unit id when
`class.featureGrants[].level` and `class_feature.acquiredAtLevel` already
represent that level. Keep level or occurrence text in the id only when it
distinguishes a domain object that would otherwise collide, such as repeated
grants modeled as separate authored Units. `Ability Score Improvement` is a
repeated class feature, so its level text is occurrence identity when the
occurrence is authored as its own Unit.

Runtime choice keys are slot names, not authored Unit ids. A Unit-backed choice
source is identified by the source Unit id plus the choice key; the key should
name the fillable slot or choice family from the player's perspective. Reuse a
choice key across source Units only when the slot semantics are the same; split
keys when cardinality, eligibility, timing, or projection differs.

Spellcasting creation facts stay inside the class record when they are class
legality facts. A class `spellcasting` aggregate keeps Spell Access and runtime
projection separate: known cantrips, prepared Spell Access, Spell Slot or Pact
Slot projection, spellcasting ability, replacement timing/cardinality, and
allowed focuses are distinct fields. Wizard keeps spellbook Spell Access
separate from prepared Spell Access chosen from that spellbook. Bard, Cleric,
Druid, Paladin, Ranger, and Sorcerer use list-prepared Spell Access from their
class spell lists. Warlock uses the shared Pact Magic shape with Pact Slots that
recover on a Short or Long Rest. The decode boundary rejects prepared spells
that are absent from the Wizard spellbook, above available Spell Slot levels,
above a Warlock's Pact Slot level, duplicated, or paired with a class-mismatched
spellcasting ability/focus/source/replacement rule.

Runtime packages may narrow these records through package-private support gates,
but `@dnd/surface` exports only structural readers. Do not export `Supported*`
gates or re-author SRD legality tables outside authored Surface records.

## Run

```sh
# from the repo root
pnpm install

# trace one unit → file
pnpm --filter @dnd/surface exec tsx src/run.ts content/bless.json --out content/bless.trace.md

# typecheck
pnpm --filter @dnd/surface typecheck
```

Or from inside the package:

```sh
cd packages/surface
pnpm exec tsx src/run.ts content/bless.json --out content/bless.trace.md
pnpm typecheck
```

## What it does

1. Reads `content/<slug>.json` — an authored content record encoded against the closed
   atom vocabulary in `src/surface/types.ts`.
2. Walks the ADT via `src/interpreter/tracer.ts`, recording every
   surface atom referenced.
3. Renders the resulting dependency graph as mermaid via
   `src/interpreter/mermaid.ts`.
4. Prints or writes the result.

The tracer is an **interpreter over the authored ADT**. It does not invoke a
runtime package. It proves the surface types are expressive enough to carry the
authored record before runtime integration consumes it.

## Authoring Loop

Authoring is evidence-driven: encode one record, regenerate its trace, review
the graph, and widen Surface only when a concrete SRD pressure case requires it.
No speculative atoms; the vocabulary grows one variant at a time.

## No Authored Names In Surface Taxonomy

Surface discriminators name reusable rules concepts, never individual authored
content. A `kind`, `family`, schema/type name, helper function name, or support
profile name must not contain a Unit name, Spell name, feature name, magic item
name, class-specific feature slug, or authored id.

Bad:

```ts
export const FireballMechanicsSchema = Schema.Struct({
  family: Schema.Literal("fireball_area_damage"),
});

export function parseFireballProfile(unit: UnitRecord) {
  // ...
}
```

Good:

```ts
export const AreaDamageSaveMechanicsSchema = Schema.Struct({
  family: Schema.Literal("area_damage_save"),
  area: AreaShapeSchema,
  save: SavingThrowSchema,
  damage: DamageAmountSchema,
});
```

Concrete authored ids may appear only as data in fields whose domain is
explicitly "reference another authored record" (`spellId`, `unitId`,
`resourceUnitId`, etc.). Such references are allowed only when the source rule
actually names that other content.

When an SRD rule necessarily references another SRD-authored record, use the SRD
id as data and add a nearby comment citing the RAW line that requires the
cross-record reference. When a licensed/private source requires such a reference,
do not copy the protected name into this repository; use the established
mushroom/fungi synthetic name policy and comment that the masked reference is
required by the source rule.

SRD mechanic terms may appear as-is when authored Surface is projecting that SRD
mechanic and the term is not being used as reusable taxonomy. For example,
Deflect Attacks may author that its redirect damage uses the Martial Arts die,
but the battle-runtime support profile must project executable facts such as
the concrete die size, resource spend, saving throw DC formula, target gate, and
inherited damage type before reducers consume it.

## Relationship to private authoring evidence

Private survey proposals and verdicts may inform pre-publication review, but
they are not Surface inputs or rules authority. A widening enters this package
only as a typed public schema change backed by public-source tests and the
applicable RAW trace. Public authoring and verification must remain complete
when the Private Authoring Repository is unavailable.

As authored records land in this package, their outcomes should be reflected
back into the survey corpus as ground-truth verdicts before the corpus is used
for further widening work.

## Authoring format: Dhall + JSON

Authored content records are written in Dhall (`content/<slug>.dhall`)
as the canonical source. The compiled JSON (`content/<slug>.json`) is
the generated artifact that package code imports and the tracer reads.
Do not hand-author or manually patch content JSON except as part of
debugging a Dhall compile problem; make the source change in Dhall,
regenerate JSON, then regenerate the trace.

The worker and local authoring flow require the `dhall-to-json` version pinned
in `dhall-json-toolchain.json`. The root publication check rejects any other
version because generated JSON is compared byte-for-byte. Compile with:

```sh
dhall-to-json --omit-empty --file content/bless.dhall --output content/bless.json
```

The root publication check discovers every direct `content/*.dhall` record
source (excluding underscore-prefixed Dhall helpers), regenerates a temporary
JSON peer, compares it byte-for-byte with the committed peer, and strictly
decodes both generated and committed records through the Effect Surface
schemas. It reports missing, orphaned, drifted, compile-failing, and
decode-failing peers together:

```sh
pnpm check:surface-content-publication
```

Generated JSON remains an output of Dhall; it is never the discovery authority.

Generate the review trace from the compiled JSON:

```sh
pnpm --filter @dnd/surface exec tsx src/run.ts content/bless.json --out content/bless.trace.md
```

Trace files are intentionally regenerable and ignored by Git. They are still
part of the local review loop: a new or changed authored content record should
have a fresh trace inspected before the JSON is treated as catalog-ready.

## Runtime Integration

Surface records are consumed by runtime packages through catalog/readers and
package-specific projection code. Current active consumers include
`@dnd/character-creation-runtime`, `@dnd/battle-runtime`, and the MCP Surface
runtime composition path. Future Quint or generator integrations must preserve
the same ownership boundary: Surface owns authored records and provenance;
runtime packages own executable semantics and parity tests.

## Files

- `src/surface/types.ts` — closed atom types.
- `src/interpreter/tracer.ts` — ADT walker, records nodes + edges.
- `src/interpreter/mermaid.ts` — mermaid renderer.
- `src/run.ts` — CLI entry.
- `content/<slug>.dhall` — authored source.
- `content/<slug>.json` — compiled authored JSON consumed by package code.
- `content/<slug>.trace.md` — regenerable trace output.

## Related docs

- [`docs/mushroom-playbook/AUTHORING.md`](../../docs/mushroom-playbook/AUTHORING.md) — public/private authoring and publication boundary.
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — system ownership and runtime boundaries.
