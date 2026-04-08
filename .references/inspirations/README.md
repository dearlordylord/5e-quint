# Inspiration Workstream

This directory is the handoff packet for inspiration-driven test work.

Read these in order:

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

Important context:

- This branch started from `master`, so the broader earlier analysis notes are not present here.
- This directory is the local replacement for that missing context.
- The next session should start from [PLAN.md](./PLAN.md), then take the current recommended next step there: pick the next small inspiration scenario batch now that the rider-path convergence cleanup is done.
