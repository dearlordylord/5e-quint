# @dnd/prototype-content-surface

Workspace package for the content-authoring → surface → tracer flow.

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
stabilizes here, the closed vocabulary gets brought into `packages/core`
via a **Quint-first approach** — i.e., the surface types drive Quint
variant generation, which drives XState machine shape, which drives
TS engine code. Nothing in this package touches `@dnd/core` today;
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
- `packages/prototype-content-surface/` (this package) — **where the
  surface evolves**. Greenfield, no `@dnd/*` deps, deletable wholesale
  without breaking the monorepo. This is the tail of the research
  work, not a downstream consumer.

## Isolated prototype

Does not import from `@dnd/core` or any other workspace package. Can
be deleted wholesale without affecting the rest of the repo.
Typechecks uniformly with the rest of the monorepo via
`turbo typecheck` at the root.

## Run

```sh
# from the repo root
pnpm install

# trace one unit → file
pnpm --filter @dnd/prototype-content-surface exec tsx src/run.ts content/bless.json --out content/bless.trace.md

# typecheck
pnpm --filter @dnd/prototype-content-surface typecheck
```

Or from inside the package:

```sh
cd packages/prototype-content-surface
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
the atom vocabulary right *before* that integration cost is paid.

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
