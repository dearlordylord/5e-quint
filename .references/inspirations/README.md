# Inspiration Workstream

This directory contains two workstreams: inspiration-driven testing and competitor architecture research.

## Competitor Architecture Research

Start here for the competitive landscape:

1. [COMPARISON.md](./COMPARISON.md) — Full cross-engine comparison with tables, pattern analysis, and comparison with our project
2. [METHODOLOGY.md](./METHODOLOGY.md) — Analysis rubric and discovery methodology

Per-engine deep dives (in tier order):

- [ARCHITECTURE-dnd_engine.md](./ARCHITECTURE-dnd_engine.md) — Entity-Component-Event, 4-channel modifier algebra (Tier A)
- [ARCHITECTURE-foundryvtt-dnd5e.md](./ARCHITECTURE-foundryvtt-dnd5e.md) — Document-DataModel-Activity on Foundry (Tier A)
- [ARCHITECTURE-natural_20.md](./ARCHITECTURE-natural_20.md) — Resolve-then-Commit with YAML content (Tier A)
- [ARCHITECTURE-opencombatengine.md](./ARCHITECTURE-opencombatengine.md) — Interface-segregated composition (Tier A)
- [ARCHITECTURE-avrae.md](./ARCHITECTURE-avrae.md) — Discord bot, automation tree (Tier A, newly discovered)
- [ARCHITECTURE-rpg-toolkit.md](./ARCHITECTURE-rpg-toolkit.md) — Go, typed event system (Tier B+, newly discovered)
- [ARCHITECTURE-ShiningSword.md](./ARCHITECTURE-ShiningSword.md) — F#, functional combat (Tier B, newly discovered)
- [ARCHITECTURE-libsrd5.md](./ARCHITECTURE-libsrd5.md) — Mutable OOP with enum effects (Tier B)
- [ARCHITECTURE-dnd-5e-core.md](./ARCHITECTURE-dnd-5e-core.md) — Mutable-dataclass CRUD (Tier B)
- [ARCHITECTURE-Py5e.md](./ARCHITECTURE-Py5e.md) — Minimal baseline (Tier C)

### Scenario Mining

- [SCENARIO-MINING.md](./SCENARIO-MINING.md) — Consolidated findings: 30 medium/high priority mechanical interactions mined from competitor test suites

## Inspiration-Driven Testing

Read these for the testing workstream:

1. [PLAN.md](./PLAN.md)
2. [ARCHITECTURE.md](../../ARCHITECTURE.md)
3. [UBIQUITOUS_LANGUAGE.md](../../UBIQUITOUS_LANGUAGE.md)
4. [ASSUMPTIONS.md](../../ASSUMPTIONS.md)
5. [battle/DOMAIN.md](../../battle/DOMAIN.md)
6. [battle/REQUIREMENTS.md](../../battle/REQUIREMENTS.md)

Primary rules references:

- [.references/srd-5.2.1/Playing-the-Game.md](../srd-5.2.1/Playing-the-Game.md)
- [.references/srd-5.2.1/Rules-Glossary.md](../srd-5.2.1/Rules-Glossary.md)
- [.references/srd-5.2.1/Spells/Descriptions-Q-R.md](../srd-5.2.1/Spells/Descriptions-Q-R.md)
- [.references/srd-5.2.1/Spells/Descriptions-S-Z.md](../srd-5.2.1/Spells/Descriptions-S-Z.md)

Current implementation artifacts from this worktree:

- [inspiration-scenarios.test.ts](../../packages/core/src/inspiration-scenarios.test.ts)
- [inspiration-battle-scenarios.test.ts](../../packages/core/src/inspiration-battle-scenarios.test.ts)
- [battle.qnt](../../battle.qnt)
- [battle-machine.mbt.test.ts](../../packages/core/src/battle-machine.mbt.test.ts)
- [battle-projection.mbt.test.ts](../../packages/core/src/battle-projection.mbt.test.ts)
- [types.ts](../../packages/core/src/types.ts)
- [machine-types.ts](../../packages/core/src/machine-types.ts)
- [machine.ts](../../packages/core/src/machine.ts)
- [machine-startturn.ts](../../packages/core/src/machine-startturn.ts)
- [machine-endturn.ts](../../packages/core/src/machine-endturn.ts)
