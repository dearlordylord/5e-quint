# Effect 3 baseline certification

Date: 2026-08-25
Baseline commit: `76d9abaf0` (`ops: add Dokku publication handoff`)
Certificate: [`effect3-behavioral-oracle.json`](./effect3-behavioral-oracle.json)

This certificate freezes the externally observable Effect 3 behavior that the
Effect 4 migration must preserve. It is generated from the repository's
canonical owners; it does not introduce a second MCP registry, Surface
catalog, persisted-session codec, reducer, or Raw Swarm evidence ledger.

## Reproduction

The deterministic command is:

```sh
pnpm verify:effect3-baseline
```

It captures the current canonical projections in memory, canonicalizes object
keys while retaining observable array order, and compares the resulting bytes
with the tracked certificate. The command never writes during verification.

To replace the certificate after a reviewed migration decision, run the
separate explicit operation:

```sh
pnpm capture:effect3-baseline -- --replace-reviewed-baseline
```

Capture refuses to overwrite an existing certificate without that flag. An
Effect 4 dependency or implementation path must not call capture implicitly;
the normal migration gate is verification against this immutable Effect 3
oracle followed by a separately reviewed delta report.

## Captured surfaces

| Surface             | Certificate contents                                                                                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MCP protocol        | All 27 registered definitions in source order, all 27 advertised definitions in wire order, every input schema, output schema, annotation, security declaration, and model-facing output projection. |
| Surface publication | Byte length and SHA-256 authorities for the generated aggregate and schema artifacts, plus every tracked regular file in the authored content directory used by the JSON synchronization check.      |
| Persisted sessions  | Stable guest, saved, contradictory-tenure, and malformed-operation rows decoded through the canonical persisted-session codec, including typed success/failure results.                              |
| Reducers            | Representative shared-algebra, Character Creation discovery, Character Sheet hit-point, and condition lifecycle outcomes from their production functions.                                            |
| Raw Swarm           | Byte authorities for tracked regular JSON, JSONL, SQLite, Markdown, and text artifacts under the Raw Swarm owner directory; ignored/generated output is excluded.                                    |

The artifact manifest records its ownership boundary explicitly: it reads the
Git tracked index, admits regular files only, stores canonical POSIX paths, and
orders them by Unicode code point. Symlinked or escaping paths are rejected.
No version-bearing MCP response field is captured. Malformed persisted
operations JSON is represented by the stable typed reason
`malformedOperationsJson`, rather than a runtime-specific parser message. A
future version normalization must name its exact path before it is allowed.

## Baseline verification matrix

The following commands record the checks run while producing this bounded
baseline. The broad workspace gates remain owned by the migration integration
work and are intentionally not folded into this certificate command.

| Command                                                                                             | Result  | Evidence                                                                                                                                     |
| --------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm verify:effect3-baseline`                                                                      | pass    | Certificate bytes matched SHA-256 `bd0355d2bf849ed6deccfcf8900c7be52e164091547b36e90bfa88fd93727d83`.                                        |
| `pnpm --filter @dnd/mcp exec vitest run src/effect3-baseline.test.ts --pool=threads --maxWorkers=1` | pass    | Four focused reproducibility, canonicalization, and ignored-output tests passed.                                                             |
| `pnpm --filter @dnd/mcp typecheck`                                                                  | pass    | MCP package typecheck passed, including the focused test.                                                                                    |
| `pnpm typecheck`                                                                                    | not run | Broad workspace gate is outside this bounded certificate task.                                                                               |
| `pnpm test`                                                                                         | not run | Broad workspace gate is outside this bounded certificate task.                                                                               |
| `pnpm quality`                                                                                      | not run | Broad workspace gate is outside this bounded certificate task.                                                                               |
| `pnpm check:surface-content-publication`                                                            | not run | The certificate records the canonical publication/content authorities; the broad synchronization check remains a migration integration gate. |
| `pnpm raw-swarm:catalogue -- --json`                                                                | not run | Raw Swarm admission is not required to capture the committed artifact authorities.                                                           |

## Reviewer-loop evidence

Two focused review passes were completed before committing:

1. RAW/PHB+, domain language, architecture, and connascence: the command adds
   no rule behavior or authored PHB+ identity; it reads MCP, Surface,
   persistence, reducer, and Raw Swarm owners directly. The fixed draft and
   session fixture identities are visibly synthetic evidence inputs.
2. Code review: the self-test runs at the MCP package boundary so workspace
   package resolution is available, the repository root is anchored to the
   script location rather than the caller's working directory, certificate
   writes are exclusive/atomic and no-follow, manifests use tracked regular
   files with POSIX code-point ordering, and certificate shape assertions use
   runtime narrowing instead of an unchecked JSON cast. The focused test also
   proves ignored Raw Swarm output does not perturb the certificate.

The certificate is an Effect 3 behavioral oracle, not a claim that every
currently present authored record or every Raw Swarm scenario is executable.
SRD provenance and authored-identity boundaries remain unchanged.
