# Competitor Workstream

This directory is the handoff packet for competitor-driven test work.

Read these in order:

1. [PLAN.md](/workspace/typescript/dnd-competitor-tests-batch-1/.references/competitors/PLAN.md)
2. [ARCHITECTURE.md](/workspace/typescript/dnd-competitor-tests-batch-1/ARCHITECTURE.md)
3. [UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd-competitor-tests-batch-1/UBIQUITOUS_LANGUAGE.md)
4. [ASSUMPTIONS.md](/workspace/typescript/dnd-competitor-tests-batch-1/ASSUMPTIONS.md)
5. [battle/DOMAIN.md](/workspace/typescript/dnd-competitor-tests-batch-1/battle/DOMAIN.md)
6. [battle/REQUIREMENTS.md](/workspace/typescript/dnd-competitor-tests-batch-1/battle/REQUIREMENTS.md)

Primary source-of-truth rules references:

- [.references/srd-5.2.1/Playing-the-Game.md](/workspace/typescript/dnd-competitor-tests-batch-1/.references/srd-5.2.1/Playing-the-Game.md)
- [.references/srd-5.2.1/Rules-Glossary.md](/workspace/typescript/dnd-competitor-tests-batch-1/.references/srd-5.2.1/Rules-Glossary.md)
- [.references/srd-5.2.1/Spells/Descriptions-Q-R.md](/workspace/typescript/dnd-competitor-tests-batch-1/.references/srd-5.2.1/Spells/Descriptions-Q-R.md)
- [.references/srd-5.2.1/Spells/Descriptions-S-Z.md](/workspace/typescript/dnd-competitor-tests-batch-1/.references/srd-5.2.1/Spells/Descriptions-S-Z.md)

Current implementation artifacts from this worktree:

- [packages/core/src/competitor-scenarios.test.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/competitor-scenarios.test.ts)
- [packages/core/src/competitor-battle-scenarios.test.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/competitor-battle-scenarios.test.ts)
- [battle.qnt](/workspace/typescript/dnd-competitor-tests-batch-1/battle.qnt)
- [packages/core/src/battle-machine.mbt.test.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/battle-machine.mbt.test.ts)
- [packages/core/src/battle-projection.mbt.test.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/battle-projection.mbt.test.ts)
- [packages/core/src/types.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/types.ts)
- [packages/core/src/machine-types.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/machine-types.ts)
- [packages/core/src/machine.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/machine.ts)
- [packages/core/src/machine-startturn.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/machine-startturn.ts)
- [packages/core/src/machine-endturn.ts](/workspace/typescript/dnd-competitor-tests-batch-1/packages/core/src/machine-endturn.ts)

Important context:

- This branch started from `master`, so the broader research notes from the earlier competitor-analysis branch are not present here.
- This directory is the local replacement for that missing context.
- The next session should start from [PLAN.md](/workspace/typescript/dnd-competitor-tests-batch-1/.references/competitors/PLAN.md), then take the current recommended next step there: pick the next small competitor scenario batch now that the rider-path convergence cleanup is done.
