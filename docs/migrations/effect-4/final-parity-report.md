# Effect 4 final parity report

This report preserves the historical certification evidence from both parents:
the Effect 4 integration and master-reconciliation checkpoint through
`505263eb6`, and the frozen-master checkpoint through `e936c8c1a`. Those facts
remain evidence for their named revisions only. They do not certify the current
merge tree. The merge commit, refreshed certificates and generated registries,
full proof disposition, serialized public `pnpm typecheck`, `pnpm test`, and
`pnpm quality:milestone` gates, and live GitHub closure all remain pending.

## Selected cohort and controlled-red state

The repository selects Effect `4.0.0-rc.112` for `effect`,
`@effect/platform-node`, and `@effect/vitest`. The installed workspace graph and
the independently deployed MCP contain only the cohort-matched
`@effect/platform-node-shared` package in addition to those owning selections.
`@firfi/quint-connect` is `2.0.2-effect4.2`, pnpm is
`10.29.3`, the checked TypeScript compiler is `5.9.3`, and the intentionally
separate native TypeScript toolchain package is `7.0.2`.

`pnpm check:effect4-cohort:self-test` and `pnpm check:effect4-cohort` pass. The
verifier audits workspace manifests, every lockfile section, installed package
manifests, peer relationships, and the published Quint Connect cohort. The
clean-consumer deployment independently walks every deployed package manifest
and proves the shipped MCP contains exactly Effect, platform-node, and
platform-node-shared at `4.0.0-rc.112`.

## Controlled-red closure

At the integration-parent checkpoint, the final
[controlled-red inventory](./controlled-red-inventory.json) covers 14
typecheck owners and records zero raw and zero deduplicated diagnostics. Its
SHA-256 is
`47bcb642a9e7907630022930c73c9d75e9b4926b68e5c4a3814417417f608f72`.
The migration-only inventory generator and its package scripts have been
removed. Any future diagnostic is therefore an ordinary blocking failure, not
an admitted migration exception.
At the frozen-master checkpoint, the checked-in final
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
At the integration-parent checkpoint, no public mutation command remained. Its
Effect 4 capture is 50,667,014
bytes with SHA-256
`bc95144d489f310abe399cf15524ad09a49cd69dc2d2752a9ecb55ac9c37e077`.

The reviewed [finite delta certificate](./effect4-oracle-delta-certificate.json)
classifies and lists 8,811 recursive JSON-pointer leaf identities, including
the owning classification, operation, path, and SHA-256 digest or explicit
missing tag for both sides. Its overall identity
SHA-256 is
`ba67544243e10d3d719604d27e2a125d6e6b368f5e490085b2d36e33411bd05e`,
and the certificate artifact SHA-256 is
`a6cf7ef35595314566c0e56ab568e4714b2bd5358c41b60912e66c635239f81e`.
At the frozen-master checkpoint, the Effect 4 candidate is 52,152,897 bytes
with SHA-256
`06caf573f4a04809c8f8e4ec75e7ca8166aa70b3e050ffca5e76dcabe36dc2bb`.

The v2 [finite delta certificate](./effect4-oracle-delta-certificate.json)
reviews exactly 7,246 recursive identities. Its overall identity SHA-256 is
`f580748a45802d4f0d04f621a5fad558abe85021294654e3b2d41e4390ccdc8d`;
the staged certificate is 4,656,210 bytes with SHA-256
`63eade8b0bd7bfa304d7bff83bfade023d70cc9cd1f9435d271b9bc208eed502`.

| Reviewed reason               | Identities | Added | Removed | Changed |
| ----------------------------- | ---------: | ----: | ------: | ------: |
| MCP registration contract     |      2,290 |   710 |   1,487 |      93 |
| MCP protocol entrypoints      |      3,565 | 1,060 |   1,582 |     923 |
| MCP authenticated projection  |      2,094 |   761 |   1,190 |     143 |
| Surface publication authority |          4 |     0 |       0 |       4 |
| Surface authored authority    |        773 |   651 |       0 |     122 |
| Persisted session codecs      |         22 |     6 |      12 |       4 |
| Raw Swarm artifact authority  |         63 |    43 |       0 |      20 |

Two consecutive unchanged captures before recertification were byte-identical;
each canonical evidence document was 4,420,311 bytes with SHA-256
`5dc6403c741440ac660a37ebcb53e69cc4049727c1c085bcccb4e6942a128e60`.
The prior certificate drift was confined to the byte-length and SHA-256 leaves
for tracked artifact `scripts/raw-swarm/OPERATIONS.md`, which had been edited
after the prior capture. The declaration-authority text in that tracked
artifact was finalized before this capture; the immutable baseline, identity
site membership, classification totals, collection authorities, and array
comparison authorities are unchanged.

The restored canonical Surface corpus changes the tracked authored-artifact
authority from 1,215 to 1,866 members. Its candidate membership and order
SHA-256 is
`0bb46fc07b756ede424773e1c6ae203fd8581f2624c86d7e8719ffd01429174a`.
The complete candidate traversal contains 97,808 positional-value sites with
site-set SHA-256
`818a795411b79fff4076f9e6e17341e018679ea2ae7917390930e23400cabcb3`.

Baseline metadata and all five reducer behavior classes have zero identities.
The verifier rejects baseline or candidate byte drift,
non-regular baseline paths, duplicate identities, unclassified identities,
identities admitted by multiple classes, stale exact identity records, and
stale class counts or hashes. Its five negative and stable-class self-tests
pass. The certificate classifies a finite observed
delta; the focused protocol, persistence, Surface, Raw Swarm, and process tests
remain the semantic evidence.

The frozen-master certificate recorded this separate historical distribution:

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
invocations passed all 15 tests. The final pinned current verification at
approximately 2026-08-30T22:05Z completed with exit 0, retained the candidate
byte count and SHA-256 above, and retained the same 7,246-identity SHA-256. It
reported
`Effect 4 finite oracle delta verified (7246 reviewed identities).`

## Clean-consumer distribution

The deterministic public declaration graph is 523 files and 3,969,709 bytes;
the 10 MiB byte cap remains unchanged, leaving 6,516,051 bytes of margin. The
first milestone attempt detected the 241-byte reviewed-measure drift. The
second attempt validated the updated graph and passed six of the seven combined
clean-consumer tests, including the long deployed MCP, container, Raw Swarm
consumer, and SIGINT/SIGTERM lifecycle cases. Its only failure was a 9 ms unit
assertion that duplicated the old derived margin. Commit `e936c8c1a` replaces
that duplicate literal with the canonical subtraction, and the focused test
then passed 1/1. The operator declined a third complete milestone run, so this
is focused repair evidence rather than a complete clean-consumer or quality
pass at the current fixed point.

## Registry, coverage, and formal-model scope

### Master-reconciliation declaration certificate

At the integration-parent master-reconciliation checkpoint, the fixed Surface
and Battle Runtime consumer graph contained exactly 530 declaration files and
4,667,450 bytes. The 10 MiB byte cap was unchanged and left 5,818,310 bytes of
margin; the file cap was the exact reviewed count, not
a permissive growth allowance. The SHA-256 of the sorted relative-path ledger
is `fd48241ce438eb0f780a8fc8bfaf0035af6f4d0c686f2590dbe965420794083e`;
the SHA-256 of the sorted ledger that binds each relative path to its file
SHA-256 is
`b196b26a3dd9aa80064b55d867f41344f133738325c10895cc7290f406420809`.
The comparison baseline is commit `38e79b814`, whose independently reproduced
distribution contains 523 files and 3,962,445 bytes. Its sorted POSIX
relative-path ledger (one path per line, including the final newline) has
SHA-256
`05479f0c8ae9b75bb263ca7dc10cb61ed68fef4da3ba57cd54f4603d41a55cb8`.
Relative to that pinned baseline, the current graph adds these ten
declarations:

- `packages/battle-runtime/src/battle-reducer/codec-building-blocks.d.ts`
- `packages/battle-runtime/src/druid-wild-shape-known-form-runtime.d.ts`
- `packages/battle-runtime/src/procedure-admission/stat-block-procedure-execution-decision.d.ts`
- `packages/battle-runtime/src/procedure-execution/stat-block-procedure-sections.d.ts`
- `packages/battle-runtime/src/stat-block-attack-damage-selection.d.ts`
- `packages/battle-runtime/src/stat-block-authored-projection.d.ts`
- `packages/battle-runtime/src/stat-block-presentation-contract.d.ts`
- `packages/surface/src/surface/generated/srd-unit-aggregate.d.ts`
- `packages/surface/src/surface/stat-block-catalog-contract.d.ts`
- `packages/surface/src/surface/stat-block-speed-readers.d.ts`

It removes three declarations: the Surface `stat-block-catalog.d.ts`,
`stat-block-catalog-core.d.ts`, and `stat-block-catalog-data.d.ts` runtime/data
owners. The lightweight Stat
Block catalog type is now owned by
[`stat-block-catalog-contract.ts`](../../../packages/surface/src/surface/stat-block-catalog-contract.ts),
so type-only consumers do not pull the runtime catalog into the public graph.
The 1,599,076-byte generated `srd-stat-block-aggregate.d.ts` and its
`stat-block-identity.d.ts` dependency are consequently absent. In contrast,
the SDK setup runtime consumes the eager canonical Unit collection, whose data
owner now imports the generated 572,677-byte `srd-unit-aggregate.d.ts`; that
single new declaration accounts for the complete growth from the reviewed
529-file graph. The focused real relocated supervisor test proves
initialization, transcript, replay, and declaration emission for this graph;
this certificate does not claim that the remaining issue #386 public gates
have run.

### Master-reconciliation authored-identity collision audit

The current static authored-identity boundary check discovers 7,328 authored
identity literals from 283 decoded Surface spell records across 818 checked
source files, with 762 excluded fixture or artifact files and 9 files admitted
through the existing narrow boundary allowlists. It exercises 620 exact
collision exemptions and authenticates 1,294 reviewed sites / 1,405
occurrences with SHA-256
`1a6b83fc6597ebcb817af5b723557f9e8e3cc219562c584de14f3e45bc4ecc02`.

The reconciliation added 79 reviewed mechanics-word collisions: 66 generic
teleportation sites, 4 Fly Speed sites, 6 illumination sites, 2 damage
Resistance sites, and 1 healing-link site. Their exemptions are bound to the
exact spell-word collision, AST role, identifier, and source path; the finite
site certificate additionally binds the normalized owning statement and
cardinality. Copying, semantically relocating between files or owning
statements, or adding an occurrence therefore fails the check. Seven reusable
execution declarations that instead used `Haste` as a name were renamed to the
generic limited-additional-Action restriction they model and were not exempted.

The one-site drift already present relative to the preceding certificate was
not `heldLightHurl`. Normalized evidence shows that one former
`storedLightEmitters` occurrence inside `battleSnapshotInvariantsHold` was
replaced by two occurrences owned by the extracted serialized-reference and
environmental-source validation functions, for a net increase of one reviewed
site. `heldLightHurl` was semantically relocated into a presentation-procedure
set owned by the existing narrow Battle presentation boundary and did not enter
collision-certificate evidence. This focused static audit is not a claim that
a final certification fixed point or the remaining public gates have
completed.

## Public verification

The public typecheck was rerun directly under its owning repository lock at
committed tip `99ee3da75`. The other public results retain their prior
certification fixed-point evidence:

- `pnpm typecheck`: passed, 14 of 14 owners in 1m0.703s.
- `pnpm test`: passed, 10 of 10 workspace tasks. Notable uncached owners were
  battle-runtime (261 files, 2,887 passed and 132 documented proof-lane skips),
  MCP (57 files, 416 passed), and app (18 files, 88 passed).
- `pnpm build`: passed; the app transformed 1,543 modules and emitted the
  production bundle. The existing large-chunk advisory remains non-fatal.
- `pnpm quality:milestone`: pending final reviewer convergence.

Apart from the current public typecheck recorded above, the
master-reconciliation checkpoint was not subjected to the other broad commands
while implementation and review lanes were active. Its focused Effect cohort,
certification typecheck, finite-oracle verification, authored-identity audit,
Opaque Oracle checks, and exact Raw Swarm consumer-distribution lifecycle tests
pass.
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

## Refreshed Battle MBT evidence

The four originally required SR-00 Battle MBT public scripts and the
repair-sensitive chained-attack lane completed with exit 0 at `595a3ac1c`:

| Public command                                                                            |             Final result |
| ----------------------------------------------------------------------------------------- | -----------------------: |
| `pnpm --filter @dnd/battle-runtime run test:mbt:condition-saving-throw-selected-identity` | 2/2 tests passed; exit 0 |
| `pnpm --filter @dnd/battle-runtime run test:mbt:turn-boundary-effect-lifecycle`           | 8/8 tests passed; exit 0 |
| `pnpm --filter @dnd/battle-runtime run test:mbt:chained-attack-sequence`                  | 3/3 tests passed; exit 0 |
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

Final Standards and independent RAW, domain, QNT/runtime, architecture, and
connascence reviews converged again through `36db26aeb`. The final round found
and repaired one nonempty compelled-movement helper contract and one
non-exhaustive three-variant route projection; three independent re-reviews
then reported no findings.
The final repairs closed the Hideous Laughter damage-triggered repeat-save gap
for every positive-damage owner, including redirected damage. Durable attack
continuations now admit only the exact pending repeat-save hole and leave state
unchanged for an invalid hole. Canonical occurrence identities separate damage
events across ordinary, chained, turn-boundary, and resumed procedures, and no
production caller selects `noRepeatSave`. These runtime projections align with
the existing identity-free QNT semantic core and obligation mapping, so no QNT
model change was required. Authored-identity/PHB+ safety and route/fill
partitioning also converged without findings.

Round 1 accepted and corrected all 10 findings. The Spec axis required the
finite exact identity records, installed and shipped cohort inspection,
consolidated clean-consumer lifecycle coverage, current controlled-red closure
documentation, and unchanged ordinary Battle replay checkpoints. The Standards
axis required the current ledger status, accurate baseline reproduction text,
a typed oracle classification map plus exhaustive `effect/Match`, package-owned
application server documentation, and one shared Unicode code-point comparator.
Focused checks passed after each correction; no finding was waived.
Focused integration evidence includes an exit-0 Battle Runtime typecheck, the
existing eight-file suite with 68 passing tests, the redirect-focused
three-file suite with 31 passing tests, 58 passing compelled-movement tests,
seven passing spatial-route tests, and the exact complexity baseline policy:
11/11 self-tests plus 706 recorded violations across 270 files with zero
regressions.

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
- live GitHub status and closure of #381 and #386, followed by the SR-00
  Cleanroom ledger disposition.

The milestone command was attempted twice under its public broad-lock wrapper.
Both attempts passed the Effect cohort/certification checks, all 15 Oracle
self-tests, and the pinned 7,246-identity verifier. The first stopped on the
reviewed declaration byte drift; the second stopped only on the stale derived
margin assertion described above. The command never reached a terminal pass.
At the operator's direction neither the milestone nor proof lane will be rerun
for this landing. No previous test-file, test-count, transformed-module, build,
or proof result is promoted to a current pass. Issues #381 and #386 and SR-00
therefore retain an explicit verification exception until the live issue and
ledger disposition records the operator decision.

## Merge-tree recertification sequence

After the merge commit exists and the Slow QNT/TypeScript vocabulary split has
an approved resolution, refresh commit-dependent evidence in this order:

```sh
pnpm rules-kernel-coverage:check -- --write
pnpm gh381-registry-path-manifest:write
pnpm check:complexity:prune
pnpm audit:effect4-oracle-delta > /tmp/effect4-oracle-delta-candidate.json
pnpm check:effect4-oracle-delta:self-test
pnpm check:effect4-oracle-delta
pnpm check:surface-publication-delta
pnpm typecheck
pnpm test
pnpm quality:milestone
```

The Oracle audit output is review input, not a mutation command: review and
install the resulting certificate and its verifier pin before running the two
Oracle checks. Run the three public heavy gates serially and directly; each
owns its repository lock. Replace the provisional matrix, manifest, complexity
baseline, Oracle certificate, and historical parent hashes in this report only
with artifacts and observations from that committed fixed point.
