# @dnd/surface

Workspace package for authored D&D content records, provenance-bearing Surface
schemas, catalogs, and review traces.

## Not to be confused with `scripts/content-surface-survey/`

This package holds the **authored corpus** and the **surface types** it is
authored against:

- `src/surface/types.ts` — the closed atom vocabulary. Widenings land here.
- `src/interpreter/tracer.ts` — projects authored content into a mermaid-renderable dependency graph for review.
- `content/<slug>.{dhall,json,trace.md}` — one entry per **actually-authored** content record. `.dhall` is the source-of-truth mechanics definition; `.json` is `dhall-to-json --omit-empty` output consumed by package code; `.trace.md` is generated from that JSON for review. Unit records and monster Stat Block records are separate record families; Stat Block traces render with a distinct root style so they are not read as Units.

The **mining / oracle pipeline** lives in `scripts/content-surface-survey/`. That directory runs a per-SRD-unit LLM sub-agent survey to propose encodings and flag widenings against this package's current surface. Its outputs are **verdicts**, not content — they live in `scripts/content-surface-survey/results-srd/<slug>/` and aggregate into `survey-results-srd.jsonl` + `REPORT_SRD.md`. Nothing under `scripts/content-surface-survey/` is shipped; it's the "what's MISSING" oracle, not the "what's SHIPPED" artifact.

One-liner: **this package holds what we've SHIPPED; `scripts/content-surface-survey/` tells us what's MISSING.** A content record typically flows: mining proposes → verdict flags a widening → we land the widening in this package's `src/surface/types.ts` → we author the record in this package's `content/<slug>.dhall` → regression passes → we re-mine and the verdict goes `clean`.

## Goal (read this first)

This package is **where the taxonomy actually lives and evolves**. It is the
active authored-content and provenance boundary for the promoted runtime
path. The vocabulary emerged from research in `.references/xphb-srd-pairing/`
and continues to be shaped by real authoring pressure from SRD 5.2.1 and PHB
2024 content.

Runtime packages consume this package through typed authored-record boundaries.
They derive execution state at their own package boundaries; Surface remains the
authored content layer, not a runtime reducer and not projected executable IR.
Formal runtime models may use Surface-authored records as input, but integration
belongs in the consuming runtime package, not in this package.

Three-way separation:

- `.references/xphb-srd-pairing/` — **frozen input**. Taxonomy
  research at v4, validation matrices, pressure-case analyses.
  Read-only from this package's perspective.
- `.references/competitors/` + `.references/RESEARCH_*.md` —
  **neighbor research** on how other D&D open-source products
  (DnDSimulator, Py5e, ShiningSword, avrae, foundryvtt-dnd5e,
  libsrd5, pf2e's rule-elements system, etc.) tackle similar
  taxonomy problems. Fed into the pairing workspace's surface docs
  (e.g., `SURFACES_spells.md` cites `RESEARCH_foundry_effect_staging.md`
  for effect staging patterns). Read-only.
- `packages/surface/` (this package) — **where the surface evolves**. Runtime
  packages consume it through typed record/catalog boundaries.

## Runtime Boundary

This package does not import from the combat engine package. Runtime packages
consume Surface through typed authored-record boundaries, then derive their own
execution state at package boundaries. Surface records remain
provenance-bearing authored content, not a projected executable IR.

Detailed record-family rules live next to the code that owns them. For monster
Stat Block lookup/provenance mechanics, see `src/surface/stat-block-catalog.ts`.

## Unit Catalog Boundary

SRD Units are installed through `SrdUnitCollection` in `surface/unit-catalog`.
Like Stat Blocks, the SRD Unit collection admits only `srd-5.2.1` provenance and
the catalog rejects duplicate Unit ids across installed collections. Catalog
lookup returns generic `UnitRecord` values; SRD is represented by the
collection/provenance boundary, not by a runtime-facing record subtype.

Runtime packages may narrow catalog records through package-private support
gates, but authored content remains provenance-bearing Surface data.

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
legality facts. Wizard 1 uses one `spellcasting` aggregate that keeps Spell
Access and runtime projection separate: known cantrips, spellbook Spell Access,
prepared Spell Access chosen from that spellbook, level-1 Spell Slot projection,
spellcasting ability, and allowed focuses are distinct fields. The decode
boundary rejects prepared spells that are absent from the spellbook or above the
available Spell Slot levels.

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

## Relationship to the sub-agent survey corpus

`scripts/content-surface-survey/results-srd/<slug>/` contains
sub-agent analyses for SRD 5.2.1 units. The results are classified with
verdicts such as `structural_widening`, `surface_widening`,
`atom_widening`, `clean`, `dm_agenda`, `refused`, and `invalid`.

Each `surface_widening` / `atom_widening` entry has a `proposal.md`
with the sub-agent's shape proposal for the needed widening. Before authoring a
unit in `content/`, consult the corresponding `results-srd/<slug>/proposal.md`.
Don't invent widenings from scratch when a proposal already exists —
evaluate, accept / refactor / reject, then author.

See `plans/CONTENT_SURFACE_DEFERRED.md` for the current queue of
deferred widenings drawn from authored records + the sub-agent corpus.

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

The worker and local authoring flow assume `dhall-to-json` is
installed. Compile with:

```sh
dhall-to-json --omit-empty --file content/bless.dhall --output content/bless.json
```

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

- [`plans/CONTENT_SURFACE_PROTOTYPE.md`](/workspace/typescript/dnd/plans/CONTENT_SURFACE_PROTOTYPE.md) — historical authoring-loop plan.
- [`plans/CONTENT_SURFACE_SURVEY.md`](/workspace/typescript/dnd/plans/CONTENT_SURFACE_SURVEY.md) — the survey pipeline that produced the sub-agent corpus.
- [`plans/CONTENT_SURFACE_DEFERRED.md`](/workspace/typescript/dnd/plans/CONTENT_SURFACE_DEFERRED.md) — queue of deferred widenings.
- [`.references/xphb-srd-pairing/INDEX.md`](/workspace/typescript/dnd/.references/xphb-srd-pairing/INDEX.md) — taxonomy research entrypoint.
- [`scripts/content-surface-survey/README.md`](/workspace/typescript/dnd/scripts/content-surface-survey/README.md) — survey generator / worker docs.
