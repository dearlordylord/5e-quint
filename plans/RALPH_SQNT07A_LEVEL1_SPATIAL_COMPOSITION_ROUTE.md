# SQNT-07A Level 1 Spatial Composition Route

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "SQNT07A-LEVEL1-SPATIAL-COMPOSITION-ROUTE",
      "status": "ready-for-implementation",
      "title": "Connect the grouped level-1 spatial selected witness to the reducer route surface"
    }
  ]
}
-->

## Purpose

Close the remaining source-side reducer-route gap for
`packages/battle-runtime/battle-runtime-level1-spatial-witness-selected-identity.mbt.qnt`.

The focused route facts for save-gated spatial effects, reaction timing, reaction
payload taxonomy, object light riders, spatial effects, and movement
presentation now exist. This task adds the missing unit-level composition route
connector so the grouped selected witness can be treated as reducer-routed
without selected identity dispatch.

## Global Rules

- Base SHA: `294db4175272b67685e876c8fae3b2dd31764824`.
- Before editing, log `HEAD` and run:
  `git merge-base --is-ancestor 294db4175272b67685e876c8fae3b2dd31764824 HEAD`.
  Stop if it fails.
- Use QNT/RAW/domain guidance as authority. Do not infer behavior from
  TypeScript runtime implementation.
- Keep production semantics shape-based. Do not branch on spell names, ids,
  slugs, catalog identity, or fixture names.
- Keep route drivers leaf-like. Do not import `battle-runtime-model.qnt` or a
  behavioral barrel.
- If the grouped witness cannot honestly be connected through source QNT facts,
  leave the inventory row blocked with a concrete source-QNT blocker instead of
  overclaiming reducer routing.

### Task 1

### Goal

Add an executable reducer-route composition connector for the grouped level-1
spatial selected witness and retag the inventory row as reducer-routed only when
that connector exists and passes the local gates.

### Expected Source Shape

Add:

```text
packages/battle-runtime/battle-runtime-level1-spatial-witness-selected-identity.route.mbt.qnt
```

The connector should expose `qRoute: List[ReducerRouteEvent]`, import
`battle-runtime-reducer-route.qnt`, and record the shared reducer surface:

- `routeStartBattle`
- `routeDiscoverBattleActs`
- `routeResolveBattleSubject` or `routeResolveBattleSubjectWithoutFill`

Use generic subject/fill/owner vocabulary already present in the route corpus.
It may compose or mirror only the reducer-route facts needed to cover the grouped
driver's spatial, light, area hazard, movement, reaction mitigation, and
save-gated branches. Keep identity at the selected witness boundary; do not model
by spell names or fixture names in the route connector.

Update `plans/cleanroom-branch-coverage/reducer-route-inventory.json` for the
same row:

- set `"route": "reducer-routed"`;
- add `"routeConnectorPath":
  "packages/battle-runtime/battle-runtime-level1-spatial-witness-selected-identity.route.mbt.qnt"`;
- keep `routeConnectorPaths` as supporting route-fact references if useful, and
  include the reaction payload taxonomy and object-light route connectors when
  cited by the derivability facts;
- keep blockers empty only if the connector and checks pass.

Add or update a focused TypeScript MBT parity bridge only if the repository
pattern requires one for new `.route.mbt.qnt` files. Reuse existing reducer-route
bridge helpers; do not inspect or copy production runtime implementation logic.

### Likely Files

- `packages/battle-runtime/battle-runtime-level1-spatial-witness-selected-identity.route.mbt.qnt`
- `packages/battle-runtime/src/level1-spatial-witness-selected-identity-route.mbt.test.ts`
  only if required by local route-connector parity patterns
- `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts` only if the
  route connector list is manually enumerated there
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`

### Verification

Run focused checks first:

```sh
pnpm --filter @dnd/battle-runtime exec vitest run \
  src/reducer-route-connectors.mbt.test.ts \
  src/level1-spatial-witness-selected-identity.mbt.test.ts
```

Then run repository checks:

```sh
pnpm check:mbt-driver-closure
pnpm check:reducer-route-connectors
pnpm rules-kernel-coverage:check
pnpm cleanroom-branch-coverage:check
git diff --check
```

For any MBT run, follow the repository MBT protocol from `AGENTS.md`: one MBT
run at a time, reproduce seeded failures with `QUINT_SEED`, and avoid MBT for
exploration.

### Done Means

- The grouped level-1 spatial selected witness has an executable source-QNT
  reducer-route connector.
- The inventory row no longer passes only because of a blocker.
- The connector models route shapes and owners, not selected identities.
- Verification passes or any remaining failure is recorded as a precise blocker.
- The final response names changed files, checks run, and any remaining blocker.
