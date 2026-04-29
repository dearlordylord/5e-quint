# @dnd/surface

Workspace package for the content-authoring → surface → tracer flow.

Temporary system-level pipeline map:

- [plans/CONTENT_SURFACE_DATA_FLOW_TEMP.md](/workspace/typescript/dnd/plans/CONTENT_SURFACE_DATA_FLOW_TEMP.md)

## Not to be confused with `scripts/content-surface-survey/`

This package holds the **authored corpus** and the **surface types** it is authored against:

- `src/surface/types.ts` — the closed atom vocabulary. Widenings land here.
- `src/interpreter/tracer.ts` — projects authored content into a mermaid-renderable dependency graph for review.
- `content/<slug>.{dhall,json,trace.md}` — one entry per **actually-authored** unit. `.dhall` is the source-of-truth mechanics definition; `.json` is `dhall-to-json --omit-empty` output; `.trace.md` is the tracer's graph (gitignored). Roughly 130+ units currently; far smaller than the 504-unit SRD total.

The **mining / oracle pipeline** lives in `scripts/content-surface-survey/`. That directory runs a per-SRD-unit LLM sub-agent survey to propose encodings and flag widenings against this package's current surface. Its outputs are **verdicts**, not content — they live in `scripts/content-surface-survey/results-srd/<slug>/` and aggregate into `survey-results-srd.jsonl` + `REPORT_SRD.md`. Nothing under `scripts/content-surface-survey/` is shipped; it's the "what's MISSING" oracle, not the "what's SHIPPED" artifact.

One-liner: **this package holds what we've SHIPPED; `scripts/content-surface-survey/` tells us what's MISSING.** A unit typically flows: mining proposes → verdict flags a widening → we land the widening in this package's `src/surface/types.ts` → we author the unit in this package's `content/<slug>.dhall` → regression passes → we re-mine and the verdict goes `clean`.

## Goal (read this first)

This package is **where the taxonomy actually lives and evolves**. It
is the next version of the atom vocabulary that emerged from the
research in `.references/xphb-srd-pairing/` — not a re-derivation,
not an application of it, but its continuation. The research
converged on v4 of the atom inventory (`.references/xphb-srd-pairing/TAXONOMY_atoms_graph.md`)
and 18 reusable subgraphs (`.references/xphb-srd-pairing/TAXONOMY_graph_representation.md`);
this package is where the vocabulary continues to be shaped by real
authoring pressure from SRD 5.2.1 and PHB 2024 content.

The eventual destination is the **main app**: once the surface
stabilizes here, the closed vocabulary gets brought into the combat engine
via a **Quint-first approach** — i.e., the surface types drive Quint
variant generation, which drives XState machine shape, which drives
TS engine code. Nothing in this package touches that engine package today;
that integration only starts once the red/green loop in this package
has stopped producing new widenings.

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
- `packages/surface/` (this package) — **where the
  surface evolves**. It remains independent from engine packages and has no
  `@dnd/core` dependency, but it is now an active green-path input for
  character creation, battle seed composition, and stat-block catalog lookup.
  It is not a disposable prototype.

## Runtime Boundary

This package does not import from the combat engine package. Runtime packages
consume Surface through typed Unit and Stat Block catalog boundaries, then
derive their own execution state at package boundaries. Surface records remain
provenance-bearing authored content, not a projected executable IR.

Boundary invariant: Units and Stat Blocks are different authored record
families. Characters may select and reference Units during creation, but a
Character Draft or Character Sheet is not a Unit. Monsters/NPCs use
`StatBlockRecord`s; a Stat Block is not a Unit even if its actions later reuse
shared Surface sub-shapes.

## Stat Block Catalog Boundary

Monster Stat Blocks are authored Surface records, but they are not
`UnitRecord`s. Decode them as generic `StatBlockRecord`s with
`decodeStatBlockRecordSync`, then install collections through
`buildStatBlockCatalog`.

The first public collection boundary is `SrdStatBlockCollection`. It enforces
that an SRD collection contains only records whose provenance is
`srd-5.2.1`, and the catalog rejects duplicate Stat Block ids across all
installed collections. Catalog lookup returns generic `StatBlockRecord` values;
SRD is represented by the collection/provenance boundary, not by a runtime-facing
record subtype.

`srdStatBlockCollection` currently contains the first-vertical Goblin Warrior
Stat Block. Content tasks should populate that collection rather than adding
Stat Blocks to `UnitRecord` or importing a combat-engine monster catalog.

## Unit Catalog Boundary

Character-creation and equipment Units for the first vertical are installed
through `SrdUnitCollection` in `surface/unit-catalog`. Like Stat Blocks, the SRD
Unit collection admits only `srd-5.2.1` provenance and the catalog rejects
duplicate Unit ids across installed collections. Catalog lookup returns generic
`UnitRecord` values; SRD is represented by the collection/provenance boundary,
not by a runtime-facing record subtype.

`srdUnitCollection` currently contains the Orc Soldier Fighter 1 content needed
by the manifest: Fighter, Soldier, Orc, the level-1 Fighter feature grants,
Defense, Savage Attacker, Sap, Orc traits, Chain Mail, Shield, Longsword, Spear,
Flail, and Shortbow. Runtime packages may derive support gates from these
records, but the authored content remains provenance-bearing Surface data.

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
- `readOrcSpeciesCreationFacts`

For the first Fighter vertical, the RAW sources are local SRD 5.2.1 files:
`.references/srd-5.2.1/Classes/Fighter.md`,
`.references/srd-5.2.1/Character-Origins.md`, and
`.references/srd-5.2.1/Character-Creation.md`. Background records author the
SRD ability-score increase rule: three eligible abilities, either +2/+1 to two
different eligible scores or +1 to all three, capped at 20. Starting equipment
records keep authored item bundles separate from runtime projections, including
the Soldier bundle's selected Gaming Set, 20 Arrows, Healer's Kit, Quiver,
Traveler's Clothes, and GP. Item-bundle entries are `unit_ref`s only when the
referenced item is installed in the Unit collection; noncombat bundle facts that
are not Unitized yet are `draft_owned_item`s. The minimal Species record is
currently the Orc aggregate; it keeps Orc creature type, size, speed, and named
Orc trait grants together so Orc selection cannot be represented as a
mixed-species bundle of independent traits.

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

1. Reads `content/<slug>.json` — a unit authored against the closed
   atom vocabulary in `src/surface/types.ts`.
2. Walks the ADT via `src/interpreter/tracer.ts`, recording every
   surface atom referenced.
3. Renders the resulting dependency graph as mermaid via
   `src/interpreter/mermaid.ts`.
4. Prints or writes the result.

The tracer is an **interpreter over the authored ADT**. It does not
invoke the real combat engine in `packages/core/`. It proves the
surface types are expressive enough to carry the unit before we wire
a runtime projection.

## Per-unit red/green loop

See [`plans/CONTENT_SURFACE_PROTOTYPE.md`](/workspace/typescript/dnd/plans/CONTENT_SURFACE_PROTOTYPE.md)
§"Per-unit red/green loop".

Short version: encode → trace → review mermaid → **green** (next
unit) or **red** (extend `src/surface/types.ts` + tracer → re-trace).

Each red event is a surface widening. Each widening is motivated by a
specific RAW pressure case (SRD 5.2.1 clause on a specific unit). No
speculative atoms; the vocabulary grows one variant at a time.

## Relationship to the sub-agent survey corpus

`scripts/content-surface-survey/results-srd/<slug>/` contains
sub-agent analyses for ~777 SRD 5.2.1 units. The distribution of
verdicts (as last measured): ~267 `structural_widening`,
~132 `surface_widening`, ~47 `atom_widening`, ~19 `clean`,
~13 `dm_agenda`, plus `refused` / `invalid`.

Each `surface_widening` / `atom_widening` entry has a `proposal.md`
with the sub-agent's shape proposal for the needed widening. **This
is the queue for the red/green loop.** Before authoring a unit in
`content/`, consult the corresponding `results-srd/<slug>/proposal.md`.
Don't invent widenings from scratch when a proposal already exists —
evaluate, accept / refactor / reject, then author.

See `plans/CONTENT_SURFACE_DEFERRED.md` for the current queue of
deferred widenings drawn from authored units + the sub-agent corpus.

The nightly run that produced the corpus ran ~500 units; we're in
**digestion mode** now — migrating each authored unit's outcome into
the corpus as a ground-truth verdict, unifying the taxonomy, then
re-running the rest of the corpus against the unified surface
(expected: many more `clean` verdicts, many fewer widening proposals).

## Authoring format: Dhall + JSON

Units are authored in Dhall (`content/<slug>.dhall`) as the canonical
source. The compiled JSON (`content/<slug>.json`) is what the tracer
reads.

The worker and local authoring flow assume `dhall-to-json` is
installed. Compile with:

```sh
dhall-to-json --omit-empty --file content/bless.dhall --output content/bless.json
```

## Where Quint comes in (later)

**Not here, not yet.** Once this surface has stopped producing
widenings (stability signal: ~10 consecutive units author cleanly
without a new atom), the Quint-first integration begins:

1. Surface types become input to a Quint-variant generator.
2. Generated Quint variants enter `packages/core/*.qnt`.
3. `battle.qnt` / `creature.qnt` gain spec-level support for the
   new atoms.
4. MBT parity tests in `packages/core` cover the new variants.
5. XState machines in `battle-machine.ts` / `machine.ts` are updated
   to match.

None of that happens in this package. This package's job is to get
the atom vocabulary right _before_ that integration cost is paid.

## Files

- `src/surface/types.ts` — closed atom types.
- `src/interpreter/tracer.ts` — ADT walker, records nodes + edges.
- `src/interpreter/mermaid.ts` — mermaid renderer.
- `src/run.ts` — CLI entry.
- `content/<slug>.dhall` — authored source (one per unit).
- `content/<slug>.json` — compiled runtime artifact.
- `content/<slug>.trace.md` — regenerable trace output.

## Related docs

- [`plans/CONTENT_SURFACE_PROTOTYPE.md`](/workspace/typescript/dnd/plans/CONTENT_SURFACE_PROTOTYPE.md) — the red/green loop spec.
- [`plans/CONTENT_SURFACE_SURVEY.md`](/workspace/typescript/dnd/plans/CONTENT_SURFACE_SURVEY.md) — the survey pipeline that produced the sub-agent corpus.
- [`plans/CONTENT_SURFACE_DEFERRED.md`](/workspace/typescript/dnd/plans/CONTENT_SURFACE_DEFERRED.md) — queue of deferred widenings.
- [`.references/xphb-srd-pairing/INDEX.md`](/workspace/typescript/dnd/.references/xphb-srd-pairing/INDEX.md) — taxonomy research entrypoint.
- [`scripts/content-surface-survey/README.md`](/workspace/typescript/dnd/scripts/content-surface-survey/README.md) — survey generator / worker docs.
