# Effect 4 final parity report

This is the current certification narrative for GitHub issue #386. It records
the integrated source fixed point through `b8ef76bec` and the refreshed
certificate fixed point `0cd6b8133`. It is not yet a final closure claim: the
proof and MBT lanes, clean-consumer smoke, broad workspace gates, final review
Round 2, and live GitHub closure remain pending below.

## Selected cohort and controlled-red state

The repository selects Effect `4.0.0-rc.112` for `effect`,
`@effect/platform-node`, and `@effect/vitest`. The checked-in final
[controlled-red inventory](./controlled-red-inventory.json) covers 13
typecheck owners with zero recorded diagnostics and has SHA-256
`347dde4c3f6ed0a2c0f674fd0c2dce8edfacbc3135ebc7f7b0ee7c29c008c036`.
The migration-only inventory generator is retired; a new diagnostic is an
ordinary blocking failure, not an admitted migration exception.

The focused Effect cohort self-test, cohort check, certification typecheck,
and oracle-delta self-test have passed on the integrated line. The current
broad `pnpm typecheck` result is deliberately not inferred from the stored
zero-diagnostic inventory; it remains a pending final gate.

## Immutable oracle and finite reviewed delta

The immutable [Effect 3 behavioral oracle](./effect3-behavioral-oracle.json)
remains 12,997,527 bytes with SHA-256
`dc131ce8b7e588e288d20a25881df1817552b1469b9aea1dc2b55ba3fdc6df7b`.
The integrated Effect 4 candidate is 52,152,897 bytes with SHA-256
`927e9388977ac9781b6c7ace99760fdd43a2bf48fa49bb95381584fecc30c78f`.

The v2 [finite delta certificate](./effect4-oracle-delta-certificate.json)
reviews exactly 7,246 recursive identities. Its overall identity SHA-256 is
`a4e65823e86ec520354bdc2f212f1d0cf7af780fb5a610197e0d15ae1a559bd7`;
the committed certificate is 4,656,476 bytes with SHA-256
`2ca55425776b8b574ff88e57e5ceddcbcd349b652c2873c28619745332a645f6`.

| Reviewed reason               | Identities | Added | Removed | Changed |
| ----------------------------- | ---------: | ----: | ------: | ------: |
| MCP registration contract     |      2,260 |   691 |   1,504 |      65 |
| MCP protocol entrypoints      |      2,738 |   998 |   1,584 |     156 |
| MCP authenticated projection  |      2,081 |   769 |   1,192 |     120 |
| Persisted session codecs      |         22 |     6 |      12 |       4 |
| Raw Swarm runtime artifacts   |         57 |    43 |       0 |      14 |
| Surface publication authority |          4 |     0 |       0 |       4 |
| Surface authored authority    |         84 |     0 |       0 |      84 |

All 7,246 identities have exactly one typed reason. Relative to the preceding
certificate, 6,885 identities are byte-for-byte unchanged, 217 changed at an
existing site, 144 sites were added, and 128 sites were removed. The resulting
361 added and 345 removed exact identities are entirely explained by the
integrated MCP registered, authenticated, stdio, and HTTP schema projections.
Surface and Raw Swarm identities were already represented by their existing
reviewed reasons rather than being hidden in MCP churn.

Collection authorities are stable relative to the preceding certificate. The
baseline-to-candidate Raw Swarm authority remains the one changed collection,
from 76 to 119 artifacts. Array-authority counts are stable; the
`positional-value-sequence-v1` site set retains 101,977 sites and has current
SHA-256 `0c7bca197ab4752257da59eeef34a1532e647947497009925cd7ebbbdf56e0b7`.
The strict decoder accepts the v2 artifact, all 15 oracle self-tests pass, and
two independent current captures verified the same 7,246 identities.

## Registry, coverage, and formal-model scope

The deterministically generated
[#381 registry-path manifest](./gh381-registry-path-manifest.json) selects 58
obligations and has artifact SHA-256
`998be34b672077873b47937ae532d781d144e5dfdec6329af38eae16c096e01b`.
Its resolved QNT accounting is 84 semantic cores, 4 bridges, 3 MBT fixtures,
61 proof-only owners, and zero unregistered owners. The focused public coverage
checks account for 147 Rules Kernel obligations and 400 Units / 258 profiles.

The integrated change is not a QNT-neutral migration. Against the certification
integration fixed point `301229532`, 101 `.qnt` files changed, with 4,523
insertions and 848 deletions. Those changes add or rename generic rule cores,
runtime bridges, fixtures, and ownership annotations. They are substantial
formal-model scope and therefore require the pending proof and MBT execution;
this report does not treat parser/typecheck or registry accounting as proof.

Two review-raised rule dispositions are explicit:

- Temporary Hit Points are not automatically maximized when a creature that
  already has a pool receives a new pool. The integrated runtime exposes one
  `temporaryHitPointChoice` frontier with the domain choices `keepExisting`
  and `replaceWithGranted`, binds it to the exact start-turn occurrence, and
  has a direct keep/replace regression. The QNT protocol kind is registered,
  but no final proof result is claimed here.
- Assumption A51 supplies Hypnotic Pattern's otherwise unspecified physical
  shake reachability as an exact caller-owned actor/target witness, without
  inventing a distance. Runtime decoding rejects the retired adjacency fact.
  The QNT owner now models action availability, an eligible other actor, the
  physical-reachability witness, and affected-creature self-shake rejection;
  its focused tests cover reachable, unreachable, unavailable, ineligible,
  damage-ended, and self-shake cases. Execution of that QNT evidence remains
  part of the pending proof/MBT lanes.

## Review convergence

The Standards axis has converged at `b8ef76bec`. The final correction moved
persistent-area usage-limit admission to one shared typed owner, removing the
last duplicated algorithm identified by review. The reviewed tree otherwise
converged on authored-identity/PHB+ safety, invalid-state ownership, Effect 4
boundaries, architecture, and connascence.

Spec certification is still partial. The refreshed Oracle, #381 manifest,
coverage authorities, Temporary Hit Point disposition, A51 reachability model,
and substantial QNT scope are now represented accurately. The remaining Spec
blockers are evidence and closure work, not waived requirements.

The proof-lane closure checks passed. The subsequent `pnpm proof:qnt` attempt
did not establish a proof pass: five QNT owners reported failures before the
command was manually cancelled with exit 130:

- `metamagic-options-and-quickened-restoration`;
- `restoration`;
- `scalar-buff`;
- `spatial-movement-spell`; and
- `spellcasting-and-utility-facts`.

Exit 130 is recorded only as a cancelled attempt. Neither the successful
closure checks nor partial progress in that command is proof evidence for the
integrated tree.

## Pending final evidence

The following entries stay pending until their exact results and fixed point
are recorded:

- a complete passing QNT proof lane, including resolution of the five failed
  owners listed above, and the required Battle MBT lanes;
- `pnpm smoke:effect4-clean-consumer`;
- broad `pnpm typecheck`, `pnpm test`, and production build;
- `pnpm quality:milestone`;
- final code-review Round 2, including the Spec-axis disposition after the
  commands above;
- live GitHub status and closure of #381 and #386, followed by the SR-00
  Cleanroom ledger disposition.

No previous test-file, test-count, transformed-module, build, or proof result
is reused as evidence for this integrated fixed point. Issues #381 and #386 and
SR-00 remain pending until every entry above is replaced by its observed result
and the live issue chain agrees.
