# SQNT-07A Jump Landing Route Facts

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "SQNT07A-JUMP-LANDING-ROUTE-FACTS",
      "status": "done",
      "title": "Expose jump landing legality and failed landing Prone as generic movement-presentation route facts"
    }
  ]
}
-->

## Purpose

Close the source-QNT side of blocker
`FRESH-RR-SQNT07A-jump-landing-legality-and-failed-landing-prone-blocked`.

The cleanroom target already has copied route facts for jump movement budget,
distance, path witness, and landing presentation. It lacks generic reducer-route
facts for landing legality and failed Difficult Terrain landing Prone. Add those
facts in source QNT without encoding selected spell identity, runtime-owned
geometry, or pathfinding.

## Global Rules

- Base SHA: `e9f75e22a10891cd438fb06f6ea1ca666f79aaeb`.
- Before editing, log `HEAD` and run:
  `git merge-base --is-ancestor e9f75e22a10891cd438fb06f6ea1ca666f79aaeb HEAD`.
  Stop if it fails.
- Read RAW before modeling:
  `.references/srd-5.2.1/Spells/Descriptions-E-L.md` for Jump,
  `.references/srd-5.2.1/Rules-Glossary.md` for jumping and Prone,
  `UBIQUITOUS_LANGUAGE.md`, and `ARCHITECTURE.md` spatial/table ownership.
- Use QNT/RAW/domain guidance as authority. Do not infer behavior from
  TypeScript runtime implementation.
- Keep route facts domain-shaped and shape-based. Do not branch on spell names,
  ids, slugs, catalog identity, or fixture names in production semantics.
- Keep route drivers leaf-like. Do not import `battle-runtime-model.qnt` or a
  behavioral barrel.
- If a required fact cannot be stated from QNT/RAW/domain guidance, record a
  concrete blocker instead of guessing.

### Task 1

### Goal

Add generic movement-presentation route facts for:

- legal landing accepted with no check;
- legal Difficult Terrain landing accepted after passed Acrobatics;
- legal Difficult Terrain landing accepted after failed Acrobatics and applying
  Prone;
- illegal landing rejected with no movement-spend/effect-use consequence.

Represent this as a mutually exclusive union, not separate booleans that can
contradict each other.

### Expected Source Shape

Add or equivalent-domain-name:

```qnt
type MovementReplacementLandingOutcomeFact =
  | LandingAcceptedNoCheck
  | LandingAcceptedDifficultTerrainAcrobaticsPassed
  | LandingAcceptedDifficultTerrainAcrobaticsFailedProne
  | LandingRejectedIllegal
```

Add a route wrapper such as:

```qnt
type MovementPresentationRouteFact =
  ...
  | RouteMovementPresentationLandingOutcome({
      outcome: MovementReplacementLandingOutcomeFact,
    })
```

Route failed Difficult Terrain landing Prone through a battle-owned condition
lifecycle owner. Keep landing legality and the Acrobatics result table-supplied
witness facts; do not add geometry/pathfinding ownership to the reducer.

### Likely Files

- `packages/battle-runtime/battle-runtime-movement-presentation-route-facts.qnt`
- `packages/battle-runtime/battle-runtime-movement-presentation.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json` only if the
  repo's existing generated/check workflow expects the inventory to be refreshed
  with the new source-QNT facts.

Avoid editing selected identity witnesses unless a focused parity bridge needs a
name alignment. Do not duplicate semantics into
`battle-runtime-level1-spatial-witness-selected-identity.mbt.qnt`.

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
pnpm rules-kernel-coverage:check
pnpm cleanroom-branch-coverage:check
git diff --check
```

For any MBT run, follow the repository MBT protocol from `AGENTS.md`: one MBT
run at a time, reproduce seeded failures with `QUINT_SEED`, and avoid MBT for
exploration.

### Done Means

- Landing outcome facts are inferable from focused QNT, not selected identity.
- The route connector exposes the failed-landing Prone consequence through an
  appropriate battle-owned route owner.
- Illegal landing is a rejection/presentation fact and does not imply movement
  spend or effect use.
- Verification passes or any failure is recorded with a concrete blocker.
- The final response names changed files, checks run, and any remaining blocker.
