# Effect 4 final parity report

This is the current certification narrative for GitHub issue #386. It records
the integrated source fixed point through `e936c8c1a`, including the refreshed
certification artifacts and reviewed Raw Swarm declaration measure. It is not
yet a final closure claim: the full proof terminal result, broad workspace
gates, and live GitHub closure remain pending below. The five refreshed Battle
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
The integrated Effect 4 candidate is 50,737,132 bytes with SHA-256
`c2ed219276ab4d707368727972223af30c2fa0e6b0df28f568a9def201c1ccfa`.

The v2 [finite delta certificate](./effect4-oracle-delta-certificate.json)
reviews exactly 8,946 recursive identities. Its overall identity SHA-256 is
`72c2405c4ab059ab43fc4c28525e99805f4e600d81a8beb340d4d0f8a170eecb`;
the staged certificate is 5,552,197 bytes with SHA-256
`faf9ceb428b511c30637b0f210a58cf207a73751f5a3757db911b1a687a0521c`.

| Reviewed reason               | Identities | Added | Removed | Changed |
| ----------------------------- | ---------: | ----: | ------: | ------: |
| MCP registration contract     |      2,275 |   695 |   1,502 |      78 |
| MCP protocol entrypoints      |      3,565 | 1,060 |   1,582 |     923 |
| MCP authenticated projection  |      2,094 |   761 |   1,190 |     143 |
| Persisted session codecs      |         22 |     6 |      12 |       4 |
| Raw Swarm runtime artifacts   |         61 |    43 |       0 |      18 |
| Surface publication authority |          4 |     0 |       0 |       4 |
| Surface authored authority    |        925 |   651 |       0 |     274 |

All 8,946 identities have exactly one typed reason. The refresh audit retained
6,952 exact previously reviewed sites. Its structural reason classifier had
zero unclassified current identities and zero disagreements with the reasons
on all 7,246 identities in the preceding certificate. The new Surface authored
identities are the expanded SRD Stat Block corpus and related authored records;
the MCP identities are their registration, protocol, and authenticated output
projections.

The baseline-to-candidate Surface authored collection now grows from 1,215 to
1,866 artifacts, while the Raw Swarm collection remains 76 to 119 artifacts.
The other collection memberships remain stable. The
`positional-value-sequence-v1` authority now covers 98,014 sites with SHA-256
`9db9a1ae963cccfcd6641574ba2118917ba803d872f81b1c94af5c7daaf12280`;
the four other array authorities remain unchanged. The strict decoder and
pinned verifier are rerun as part of the current Stat Block parity milestone.

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
