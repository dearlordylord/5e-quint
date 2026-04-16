# @dnd/prototype-content-surface

Workspace package for the content-authoring → surface → tracer flow described in `/plans/CONTENT_SURFACE_PROTOTYPE.md`.

**Isolated prototype.** Does not import from `@dnd/core` or any other workspace package. Can be deleted wholesale without affecting the rest of the repo. Typechecks uniformly with the rest of the monorepo via `turbo typecheck` at the root.

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

1. Reads `content/<spell>.json` — a spell authored against the closed atom vocabulary in `src/surface/types.ts`.
2. Walks the ADT via `src/interpreter/tracer.ts`, recording every surface atom referenced.
3. Renders the resulting dependency graph as mermaid via `src/interpreter/mermaid.ts`.
4. Prints or writes the result.

The tracer is an **interpreter over the authored ADT**. It does not invoke the real combat engine in `packages/core/`. It proves the surface types are expressive enough to carry the spell before we wire a runtime projection.

## Per-spell loop

See `/plans/CONTENT_SURFACE_PROTOTYPE.md` §"Per-spell red/green loop".

Short version: encode → trace → review mermaid → green (next spell) or red (extend `src/surface/types.ts`, re-trace).

## Survey generator

If you want to populate or widen this package from the SRD/PHB survey workflow, use:

- [`scripts/content-surface-survey/README.md`](/workspace/typescript/dnd/scripts/content-surface-survey/README.md)

That pipeline:

1. selects units from the survey catalog,
2. has Codex/Claude author `content/<slug>.dhall`,
3. compiles Dhall to `content/<slug>.json`,
4. validates and traces the result,
5. promotes successful artifacts back into this package.

## Authoring format: Dhall + JSON

Spells are authored in Dhall (`content/<spell>.dhall`) as the canonical source. The compiled JSON (`content/<spell>.json`) is what the tracer reads.

The worker and local authoring flow now assume `dhall-to-json` is installed. Compile with:

```sh
dhall-to-json --file content/bless.dhall --output content/bless.json
```

## Files

- `src/surface/types.ts` — closed atom types (minimum subset).
- `src/interpreter/tracer.ts` — ADT walker, records nodes + edges.
- `src/interpreter/mermaid.ts` — mermaid renderer.
- `src/run.ts` — CLI entry.
- `content/bless.dhall` — authored source for Bless.
- `content/bless.json` — compiled runtime artifact.
- `content/bless.trace.md` — regenerable trace output.
