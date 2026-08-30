# Effect 4 final parity report

This is the current certification narrative for GitHub issue #386. It records
the integrated source fixed point through `15ba8ebe2`, the refreshed
certification-artifact fixed point `0cd6b8133`, and the reviewed Raw Swarm
declaration-measure fixed point `abc67795b`. It is not yet a final closure
claim: the full proof terminal result, broad workspace gates, final review
Round 2, and live GitHub closure remain pending below. The four required Battle
MBT results are recorded below.

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
`06caf573f4a04809c8f8e4ec75e7ca8166aa70b3e050ffca5e76dcabe36dc2bb`.

The v2 [finite delta certificate](./effect4-oracle-delta-certificate.json)
reviews exactly 7,246 recursive identities. Its overall identity SHA-256 is
`f580748a45802d4f0d04f621a5fad558abe85021294654e3b2d41e4390ccdc8d`;
the staged certificate is 4,656,210 bytes with SHA-256
`63eade8b0bd7bfa304d7bff83bfade023d70cc9cd1f9435d271b9bc208eed502`.

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
certificate, 7,244 exact identities are unchanged. Exactly two identities were
replaced at the existing `scripts/raw-swarm/OPERATIONS.md` artifact's
`byteLength` and `sha256` sites, and both retain the existing
`raw-swarm-effect-runtime-artifacts` reason. The per-reason identity and
operation counts in the table therefore remain unchanged.

Collection authorities are stable relative to the preceding certificate. The
baseline-to-candidate Raw Swarm authority remains the one changed collection,
from 76 to 119 artifacts. Array-authority counts are stable; the
`positional-value-sequence-v1` site set retains 101,977 sites and has current
SHA-256 `0c7bca197ab4752257da59eeef34a1532e647947497009925cd7ebbbdf56e0b7`.
The strict decoder accepts the v2 artifact. Two independent self-test
invocations passed all 15 tests. Two independent full current verifications
passed and reported the same 7,246 identities. The second
`pnpm check:effect4-oracle-delta` ran under the broad lock and completed at
2026-08-30T20:49Z with exit 0 and
`Effect 4 finite oracle delta verified (7246 reviewed identities).`

## Clean-consumer distribution

The complete focused clean-consumer smoke passed after reviewing the declaration
cap change: one test file and all five tests passed. The deterministic public
declaration graph is 523 files and 3,965,396 bytes; the 10 MiB byte cap remains
unchanged, leaving 6,520,364 bytes of margin. The run completed the deployed MCP,
container, Raw Swarm consumer, and SIGINT/SIGTERM lifecycle cases. The prior
source-map parse diagnostic did not recur.

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
formal-model scope and therefore require proof and MBT execution; the required
Battle MBTs are recorded below, while the full proof result remains unobserved.
This report does not treat parser/typecheck or registry accounting as proof.

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
  part of the unobserved full proof lane.

## Required Battle MBT evidence

The four SR-00 Battle MBT public scripts completed with exit 0 on the integrated
line:

| Public command                                                                            |             Final result |
| ----------------------------------------------------------------------------------------- | -----------------------: |
| `pnpm --filter @dnd/battle-runtime run test:mbt:condition-saving-throw-selected-identity` | 2/2 tests passed; exit 0 |
| `pnpm --filter @dnd/battle-runtime run test:mbt:turn-boundary-effect-lifecycle`           | 8/8 tests passed; exit 0 |
| `pnpm --filter @dnd/battle-runtime run test:mbt:insect-plague-area-hazard`                | 4/4 tests passed; exit 0 |
| `pnpm --filter @dnd/battle-runtime run test:mbt:cloudkill-area-hazard`                    | 6/6 tests passed; exit 0 |

The condition-saving lane passed after repairing the production Sleep lifecycle
route and updating the fixture to follow the ordered frontier protocol. One
unseeded transient `invalid` failure in its deterministic replay did not
reproduce on the diagnostic rerun; no speculative behavior or QNT change was
made for that unproven failure. The turn-boundary lane passed with an admitted
Sleep cast and the canonical initiative topology: Wizard at initiative 20 casts
on Fighter at 15, while Goblin remains at 10. Fighter becomes current after
Wizard ends the turn, and Goblin remains the next actor for the boundary cohort.
Its assertion uses the canonical
`stagedConditionRepeatSave` field.

These MBT observations do not alter the full `pnpm proof:qnt` disposition below:
its terminal result remains unobserved, the operator declined a rerun, and this
report does not call it passed.

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

The proof-lane closure checks passed. The first subsequent `pnpm proof:qnt`
attempt did not establish a proof pass: five QNT owners reported failures
before the command was manually cancelled with exit 130:

- `metamagic-options-and-quickened-restoration`;
- `restoration`;
- `scalar-buff`;
- `spatial-movement-spell`; and
- `spellcasting-and-utility-facts`.

Exit 130 is recorded only as a cancelled attempt. Neither the successful
closure checks nor partial progress in that command is proof evidence for the
integrated tree.

Commit `15ba8ebe2` repairs the shared Feather Fall trigger-witness type and the
Jump landing-fact match exposed by those failures. Under one focused MBT lock,
all five failed roots then typechecked and their 29 discovered tests passed with
exit 0. QNT inventory remained 806/806; proof closure remained within 60 files
and 12,500 lines; MBT driver closure, #381's 58-obligation manifest, 147 Rules
Kernel obligations, and 400 Units / 258 profiles also passed. An independent
RAW/domain/architecture review reported no findings.

A later public `pnpm proof:qnt` run passed its inventory and closure gates and
advanced through battle-runtime owners beyond the repaired
`metamagic-options-and-quickened-restoration` root. Its terminal exit was not
observed because the attached command session was lost. The operator directed
that the full lane not be rerun. This is an accepted execution risk, not a
complete proof-pass claim.

## Pending final evidence

The following entries stay pending until their exact results and fixed point
are recorded:

- the complete public `pnpm proof:qnt` terminal result remains unobserved by
  operator decision and is not a proof pass;
- broad `pnpm typecheck`, `pnpm test`, and production build;
- `pnpm quality:milestone`;
- final code-review Round 2, including the Spec-axis disposition after the
  commands above;
- live GitHub status and closure of #381 and #386, followed by the SR-00
  Cleanroom ledger disposition.

No previous test-file, test-count, transformed-module, build, or proof result
is reused as evidence for this integrated fixed point. Issues #381 and #386 and
SR-00 remain pending until the remaining entries above are replaced by their
observed results, the unobserved full-proof risk is explicitly dispositioned,
and the live issue chain agrees.
