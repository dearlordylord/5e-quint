# @dnd/prototype-content-surface

Workspace package for the content-authoring → surface → tracer flow described in `/plans/CONTENT_SURFACE_PROTOTYPE.md`.

**Isolated prototype.** Does not import from `@dnd/core` or any other workspace package. Can be deleted wholesale without affecting the rest of the repo. Typechecks uniformly with the rest of the monorepo via `turbo typecheck` at the root.

## Run

```sh
# from the repo root
pnpm install

# trace Bless → stdout
pnpm --filter @dnd/prototype-content-surface trace:bless

# trace Bless → file
pnpm --filter @dnd/prototype-content-surface exec tsx src/run.ts content/bless.json --out content/bless.trace.md

# typecheck
pnpm --filter @dnd/prototype-content-surface typecheck
```

Or from inside the package:

```sh
cd packages/prototype-content-surface
pnpm trace:bless
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

## Authoring format: Dhall + JSON

Spells are authored in Dhall (`content/<spell>.dhall`) as the canonical source. The compiled JSON (`content/<spell>.json`) is what the tracer reads.

Right now no Dhall toolchain is required — the JSON is hand-maintained. If/when `dhall-to-json` is standardized:

```sh
dhall-to-json --file content/bless.dhall --output content/bless.json
```

## Files

- `src/surface/types.ts` — closed atom types (minimum subset).
- `src/interpreter/tracer.ts` — ADT walker, records nodes + edges.
- `src/interpreter/mermaid.ts` — mermaid renderer.
- `src/run.ts` — CLI entry.
- `content/bless.dhall` — authored source for Bless.
- `content/bless.json` — compiled (hand-written).
- `content/bless.trace.md` — regenerable trace output.
