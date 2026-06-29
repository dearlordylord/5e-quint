# SQNT-07A Concentration-Backed Area Hazard Route Facts

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "SQNT07A-CONCENTRATION-AREA-HAZARD-ROUTE-FACTS",
      "status": "ready-for-implementation",
      "title": "Expose concentration-backed area hazard admission and cleanup as generic spatial route facts"
    }
  ]
}
-->

## Purpose

Close the source-QNT side of blocker
`FRESH-RR-SQNT07A-concentration-backed-area-hazards-blocked`.

The current generic spatial route substrate covers non-Concentration area hazard
admission, projection, movement-damage trigger, and duration cleanup. It also
has separate concentration teardown route evidence. It lacks a generic spatial
route witness that a specific area hazard occurrence is concentration-backed and
that concentration teardown removes the area hazard projection.

## Global Rules

- Base SHA: `e9f75e22a10891cd438fb06f6ea1ca666f79aaeb`.
- Before editing, log `HEAD` and run:
  `git merge-base --is-ancestor e9f75e22a10891cd438fb06f6ea1ca666f79aaeb HEAD`.
  Stop if it fails.
- Read RAW before modeling:
  `.references/srd-5.2.1/Rules-Glossary.md` for Concentration, Area of Effect,
  Total Cover, and Difficult Terrain; spell descriptions for Spike Growth,
  Sleet Storm, and Web-like hazards; `UBIQUITOUS_LANGUAGE.md`; and
  `ARCHITECTURE.md` spatial/table ownership.
- Use QNT/RAW/domain guidance as authority. Do not infer behavior from
  TypeScript runtime implementation.
- Keep route facts domain-shaped and shape-based. Do not branch on spell names,
  ids, slugs, catalog identity, or fixture names in production semantics.
- Keep route drivers leaf-like. Do not import `battle-runtime-model.qnt` or a
  behavioral barrel.
- If a required fact cannot be stated from QNT/RAW/domain guidance, record a
  concrete blocker instead of guessing.

## Task 1

### Goal

Add a generic concentration-backed area hazard route substrate.

The source-QNT route evidence should express:

- area hazard admission;
- concentration-backed effect ownership for that hazard occurrence;
- area shape/table geometry witness;
- difficult-terrain hazard projection;
- concentration-break cleanup that removes concentration state, area hazard
  projection, and active effect state.

### Expected Source Shape

Admission facts should include the existing domain facts where possible:

```qnt
RouteSpatialEffectBattleEffect({ effect: AreaHazardEffectAdmitted })
RouteSpatialEffectBattleEffect({ effect: ConcentrationBackedEffect })
RouteSpatialEffectGeometry({ geometry: AreaShapeWitness })
RouteSpatialEffectHazard({ hazard: DifficultTerrainProjection })
```

Admission route should compose the existing route families where possible:

```qnt
areaAdmissionRoute
concentrationRoute
hazardProjectionRoute
```

Cleanup route should include:

```qnt
resolveRouteWithoutFill(noHoles, BattleConcentrationOwner)
resolveRouteWithoutFill(noHoles, BattleAreaHazardOwner)
resolveRouteWithoutFill(noHoles, BattleActiveEffectOwner)
```

Add a domain-named cleanup fact such as `ConcentrationBreakCleanup`; do not reuse
`DurationCleanup` for concentration break. Record cleanup facts for concentration
cleanup, area hazard cleanup, and active effect cleanup owners.

Separate adjacent Sleet Storm "failed save breaks target concentration" if it
appears; that is not the same fact as caster concentration backing an area
hazard occurrence.

### Likely Files

- `packages/battle-runtime/battle-runtime-spatial-effect-route-facts.qnt`
- `packages/battle-runtime/battle-runtime-spatial-effects.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json` only if the
  repo's existing generated/check workflow expects the inventory to be refreshed
  with the new source-QNT facts.

Avoid selected spell driver edits unless a focused parity bridge needs a name
alignment. Do not count selected Spike Growth, Sleet Storm, or Web-like rows as
accepted until cleanroom replay accepts the new generic route branch.

### Verification

Run focused checks first:

```sh
pnpm --filter @dnd/battle-runtime exec vitest run \
  src/reducer-route-connectors.mbt.test.ts \
  src/spike-growth-movement-hazard.mbt.test.ts
```

If the implementation intentionally touches selected spatial/control drivers,
also run the focused selected-driver MBT test for that file.

Then run repository checks:

```sh
pnpm check:mbt-driver-closure
pnpm rules-kernel-coverage:check
pnpm cleanroom-branch-coverage:check
git diff --check
```

For any MBT run, follow the repository MBT protocol from `AGENTS.md`: one MBT
run at a time, reproduce seeded failures with `QUINT_SEED`, and avoid MBT for
exploration.

### Done Means

- Concentration-backed area hazard facts are inferable from focused QNT, not
  selected spell identity.
- Duration cleanup and concentration-break cleanup are distinct domain facts.
- Area membership, pathfinding, and geometry stay table-supplied witnesses.
- Verification passes or any failure is recorded with a concrete blocker.
- The final response names changed files, checks run, and any remaining blocker.
