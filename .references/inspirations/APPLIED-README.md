# Applied Architecture Research

This index covers the repo-applied inspiration files in this directory.

The selection criterion is not "interesting library design." It is:

- does this improve `battle.qnt` or `creature.qnt` directly?
- does this sharpen the domain language used to support the spec?
- does this simplify TS/XState/MBT support without moving authority away from Quint?

## Priority Order

Highest leverage for a better `.qnt` frontier:

1. [03-resolve-commit.md](./03-resolve-commit.md)
2. [05-condition-effects-table.md](./05-condition-effects-table.md)
3. [10-first-class-consumption.md](./10-first-class-consumption.md)
4. [11-modifier-algebra.md](./11-modifier-algebra.md)
5. [12-opportunity-attack-path-analysis.md](./12-opportunity-attack-path-analysis.md)

High leverage for TS support layers without moving authority away from Quint:

1. [02-typed-activity-lifecycle.md](./02-typed-activity-lifecycle.md)
2. [04-creature-subsystems.md](./04-creature-subsystems.md)
3. [06-stat-pipeline.md](./06-stat-pipeline.md)
4. [07-advantage-reasons.md](./07-advantage-reasons.md)
5. [08-spell-metadata-plus-delegate.md](./08-spell-metadata-plus-delegate.md)
6. [13-result-outcomes.md](./13-result-outcomes.md)
7. [15-build-map-parameterization.md](./15-build-map-parameterization.md)

Mostly confirmation of current direction:

1. [01-event-pipeline.md](./01-event-pipeline.md)
2. [09-optional-spatial-model.md](./09-optional-spatial-model.md)
3. [14-bundled-srd-data-corpus.md](./14-bundled-srd-data-corpus.md)

## Current Repo Anchors

These files are the main touchpoints referenced throughout the applied-architecture notes:

- [battle.qnt](../../battle.qnt)
- [creature.qnt](../../creature.qnt)
- [ARCHITECTURE.md](../../ARCHITECTURE.md)
- [UBIQUITOUS_LANGUAGE.md](../../UBIQUITOUS_LANGUAGE.md)
- [packages/core/src/battle-machine-helpers.ts](../../packages/core/src/battle-machine-helpers.ts)
- [packages/core/src/battle-machine-creature.ts](../../packages/core/src/battle-machine-creature.ts)
- [packages/core/src/available-actions.ts](../../packages/core/src/available-actions.ts)
- [packages/core/src/types.ts](../../packages/core/src/types.ts)
- [packages/core/src/machine-guards.ts](../../packages/core/src/machine-guards.ts)

## Reading Strategy

If the immediate goal is to improve the Quint frontier and battle-domain language:

1. Read [03-resolve-commit.md](./03-resolve-commit.md).
2. Read [05-condition-effects-table.md](./05-condition-effects-table.md).
3. Read [10-first-class-consumption.md](./10-first-class-consumption.md).
4. Read [11-modifier-algebra.md](./11-modifier-algebra.md).
5. Read [12-opportunity-attack-path-analysis.md](./12-opportunity-attack-path-analysis.md).

Those five ideas are the ones most likely to tighten the authoritative spec while simplifying the support stack around it.
