# Effect 3 baseline certification

Date: 2026-08-25
Baseline commit: `76d9abaf0` (`ops: add Dokku publication handoff`)
Certificate: [`effect3-behavioral-oracle.json`](./effect3-behavioral-oracle.json)

Initial certification run: 2026-08-25T22:49:47-04:00
(2026-08-26T02:49:49Z). The checkout was commit `60aa87176` before this
certification commit. Environment: Node `v24.18.0`, pnpm `10.29.3`, mise
`2026.7.11 linux-arm64`, Linux `7.0.14-orbstack-00380-ga7e0a2dc9535`.

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

| Surface             | Certificate contents                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MCP protocol        | The shipped default stdio entrypoint and shipped HTTP `public-index.ts` entrypoint without OAuth each answer the actual `tools/list` request with the 24-tool auth-disabled projection, preserving tool and security-declaration order; each also answers representative `describe_mcp_workflow` and `list_catalog_units` calls. Their responses are checked for parity. The separately named authenticated projection retains all 27 definitions and model-facing schemas. |
| Surface publication | Byte length and SHA-256 authorities for the generated aggregate and schema artifacts, plus every tracked regular file in the authored content directory used by the JSON synchronization check.                                                                                                                                                                                                                                                                             |
| Persisted sessions  | Stable guest, saved, contradictory-tenure, and malformed-operation rows decoded through the canonical persisted-session codec, including typed success/failure results.                                                                                                                                                                                                                                                                                                     |
| Reducers            | Representative shared-algebra, Character Creation discovery, Character Sheet hit-point, and condition lifecycle outcomes from their production functions.                                                                                                                                                                                                                                                                                                                   |
| Raw Swarm           | Byte authorities for tracked regular JSON, JSONL, SQLite, Markdown, and text artifacts under the Raw Swarm owner directory; ignored/generated output is excluded.                                                                                                                                                                                                                                                                                                           |

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

| Command                                                                             | Result | Evidence                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm verify:effect3-baseline`                                                      | pass   | Initial certificate bytes matched SHA-256 `d12f85a64db76226e77019b724a77f98f8df7bc8b5dfb707091beddbd803e593`; the reviewed certificate in `f0c265b4c` matched SHA-256 `dc131ce8b7e588e288d20a25881df1817552b1469b9aea1dc2b55ba3fdc6df7b`.                                                                                |
| `pnpm exec vitest run packages/mcp/src/effect3-baseline.test.ts --reporter=verbose` | pass   | Four focused reproducibility, canonicalization, dirty-generated-output, and shipped-protocol-entrypoint tests passed (47.05s on the reviewed certificate in `f0c265b4c`).                                                                                                                                                |
| `pnpm --filter @dnd/mcp typecheck`                                                  | pass   | MCP package typecheck passed (12.13s on the final run).                                                                                                                                                                                                                                                                  |
| `pnpm typecheck`                                                                    | pass   | Direct public gate: 13/13 workspace tasks succeeded; 11 were cached (44.663s).                                                                                                                                                                                                                                           |
| `pnpm test`                                                                         | pass   | Direct public gate on clean commit `c450fb9dd`: 10/10 workspace tasks succeeded; `@dnd/mcp` passed 45 files/348 tests and `@dnd/app` passed 17 files/76 tests (4m15.705s).                                                                                                                                               |
| `pnpm quality`                                                                      | fail   | Direct public gate exited 1 without 137/SIGKILL at `check:resource-lock`: `Timed out waiting for the shared-lock holder.` Earlier quality checks, including Surface publication synchronization, passed. A standalone `pnpm run check:resource-lock` immediately afterward passed; no surviving holder was discoverable. |
| `pnpm check:surface-content-publication`                                            | pass   | Direct gate decoded and synchronized 607 canonical Dhall sources with 607 generated JSON peers.                                                                                                                                                                                                                          |
| `mise exec -- pnpm raw-swarm:catalogue -- --json`                                   | pass   | Direct public Raw Swarm catalogue command exited 0 and emitted the JSON catalogue (633 output lines in this run; the command's JSON was truncated only by the terminal display).                                                                                                                                         |

## Reviewer-loop evidence

The historical review passes below cover the exact source/certificate commits
`60aa87176` (baseline hardening) and `c450fb9dd` (protocol-entrypoint
remediation, with evidence updated in `431c57457`). The post-remediation review
was completed against checkout commit `d3e06012e`; its source and certificate
content are from `f0c265b4c` and certificate SHA-256
`dc131ce8b7e588e288d20a25881df1817552b1469b9aea1dc2b55ba3fdc6df7b`.

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

Post-remediation reviewer-loop results for `d3e06012e`:

1. Standards review: no findings; the certificate remains canonical-owner
   evidence, preserves the tracked regular-file boundary, and keeps the
   replacement and normalization safeguards intact.
2. Spec review: no findings; the actual HTTP `tools/list` payload, 24-tool
   ordering/count, parity hash, and representative HTTP CallTool responses are
   persisted and asserted without changing D&D rules or authored identity.
3. RAW/PHB+ review: clean; no RAW rule behavior or PHB+ identity was added.
4. Domain-language review: clean; MCP protocol-entrypoint evidence and the
   separately named authenticated projection remain distinct contracts.
5. Architecture/connascence review: clean; the capture still reads canonical
   MCP, Surface, persistence, reducer, and Raw Swarm owners without a parallel
   registry or caller-order dependency.
6. Code/lifecycle review: no findings; protocol resources are closed and the
   focused tests, typecheck, lint, formatting, and baseline verification pass.

The reviewer loop has converged for the #368 baseline scope; no reasonable
findings remain in this reviewed source/certificate/documentation set.

The certificate is an Effect 3 behavioral oracle, not a claim that every
currently present authored record or every Raw Swarm scenario is executable.
SRD provenance and authored-identity boundaries remain unchanged.
