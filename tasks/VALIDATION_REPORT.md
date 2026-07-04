# Validation Report

## CRPI-READY-001

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`
- Driver: `packages/battle-runtime/battle-runtime-ability-check-choice-search.mbt.qnt`
- Route connector: `packages/battle-runtime/battle-runtime-ability-check-choice-search.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-ability-check-choice-search.mbt.qnt`
- `packages/battle-runtime/battle-runtime-ability-check-choice-search.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

The route replay for Search and Guidance skill-choice branches now observes the copied `qRoute` projection through `discoverBattleActs` and `resolveBattleSubject`. The accepted Guidance route derives the `battleConcentration` segment from the resolved public reducer result by checking the caster's `BattleCreatureState.concentration` transition. The runtime continues to own Search action resources, hidden-state reveal, roll-modifier active effects, and Concentration in `BattleState`/`BattleCreatureState`; table-owned target admission, vicinity, hidden candidate discovery, and roll totals remain fills.

Generated branch coverage:

| Obligation                                                                                                             | Target replay evidence                                                                                                                                                                                                                                     | Diagnostic tests | Status    |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------- |
| `packages/battle-runtime/battle-runtime-ability-check-choice-search.mbt.qnt#step:doSearchTargetChoiceOpen`             | `tasks/target-replay-evidence/CRPI-READY-001.json#driver:packages/battle-runtime/battle-runtime-ability-check-choice-search.mbt.qnt#step:doSearchTargetChoiceOpen#trace:MBT_TRACES=1 MBT_STEPS=12 action=doSearchTargetChoiceOpen`                         | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-ability-check-choice-search.mbt.qnt#step:doSearchAbilityCheckOpen`             | `tasks/target-replay-evidence/CRPI-READY-001.json#driver:packages/battle-runtime/battle-runtime-ability-check-choice-search.mbt.qnt#step:doSearchAbilityCheckOpen#trace:MBT_TRACES=1 MBT_STEPS=12 action=doSearchAbilityCheckOpen`                         | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-ability-check-choice-search.mbt.qnt#step:doSearchInvalidTargetRejected`        | `tasks/target-replay-evidence/CRPI-READY-001.json#driver:packages/battle-runtime/battle-runtime-ability-check-choice-search.mbt.qnt#step:doSearchInvalidTargetRejected#trace:MBT_TRACES=1 MBT_STEPS=12 action=doSearchInvalidTargetRejected`               | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-ability-check-choice-search.mbt.qnt#step:doSearchInvalidAbilityFillRejected`   | `tasks/target-replay-evidence/CRPI-READY-001.json#driver:packages/battle-runtime/battle-runtime-ability-check-choice-search.mbt.qnt#step:doSearchInvalidAbilityFillRejected#trace:MBT_TRACES=1 MBT_STEPS=12 action=doSearchInvalidAbilityFillRejected`     | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-ability-check-choice-search.mbt.qnt#step:doSearchFails`                        | `tasks/target-replay-evidence/CRPI-READY-001.json#driver:packages/battle-runtime/battle-runtime-ability-check-choice-search.mbt.qnt#step:doSearchFails#trace:MBT_TRACES=1 MBT_STEPS=12 action=doSearchFails`                                               | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-ability-check-choice-search.mbt.qnt#step:doSearchSucceeds`                     | `tasks/target-replay-evidence/CRPI-READY-001.json#driver:packages/battle-runtime/battle-runtime-ability-check-choice-search.mbt.qnt#step:doSearchSucceeds#trace:MBT_TRACES=1 MBT_STEPS=12 action=doSearchSucceeds`                                         | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-ability-check-choice-search.mbt.qnt#step:doGuidanceSkillChoiceOpen`            | `tasks/target-replay-evidence/CRPI-READY-001.json#driver:packages/battle-runtime/battle-runtime-ability-check-choice-search.mbt.qnt#step:doGuidanceSkillChoiceOpen#trace:MBT_TRACES=1 MBT_STEPS=12 action=doGuidanceSkillChoiceOpen`                       | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-ability-check-choice-search.mbt.qnt#step:doGuidanceInvalidAbilityFillRejected` | `tasks/target-replay-evidence/CRPI-READY-001.json#driver:packages/battle-runtime/battle-runtime-ability-check-choice-search.mbt.qnt#step:doGuidanceInvalidAbilityFillRejected#trace:MBT_TRACES=1 MBT_STEPS=12 action=doGuidanceInvalidAbilityFillRejected` | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-ability-check-choice-search.mbt.qnt#step:doGuidanceSkillAthletics`             | `tasks/target-replay-evidence/CRPI-READY-001.json#driver:packages/battle-runtime/battle-runtime-ability-check-choice-search.mbt.qnt#step:doGuidanceSkillAthletics#trace:MBT_TRACES=1 MBT_STEPS=12 action=doGuidanceSkillAthletics`                         | `_none_`         | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-001.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id: `MBT_TRACES=1 MBT_STEPS=12 action=<branchAction>`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-001/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- The three Enhance Ability route branches remain source-inventory out-of-scope for this Task 1 because Enhance Ability is level-2 spell pressure.

Verification results:

- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- `MBT_TRACES=1 MBT_STEPS=12 pnpm --filter @dnd/battle-runtime test:mbt:ability-check-choice-search` passed in 17s.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- Reviewer-loop convergence passed: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review checks found no remaining reasonable Task 1 findings after replacing the adapter-local Concentration shortcut and correcting public reducer API evidence metadata.

## CRPI-READY-002

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`
- Driver: `packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt`
- Route connector: `packages/battle-runtime/battle-runtime-chained-attack-sequence.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt`
- `packages/battle-runtime/battle-runtime-chained-attack-sequence.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

The route replay for chained spell-attack sequencing observes the copied
`qRoute` projection through public reducer route events produced from
`startBattle`, `discoverBattleActs`, and `resolveBattleSubject`. The driver no
longer supplies expected owner groups for Task 5: the start event is derived by
`battleReducerStartRouteEvent(startBattle result)`, discovery reads
`AvailableBattleAct.routeEvent`, and each fill reads
`BattleResolutionResult.routeEvents`. The runtime already owns the generic
chained spell-attack procedure through the typed action-spell subject and
BattleState reducer result: damage-type choice, per-step target history, Attack
Roll resolution, Hit Point damage, and leap continuation. Table-supplied
spell-target and leap-range facts remain fills.

Generated branch coverage:

| Obligation | Target replay evidence | Diagnostic tests | Status |
| --- | --- | --- | --- |
| `packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doChooseDamageType` | `tasks/target-replay-evidence/CRPI-READY-002.json#driver:packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doChooseDamageType#trace:MBT_TRACES=1 MBT_STEPS=8 action=doChooseDamageType damageType=fire` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doChooseFirstLeapTarget` | `tasks/target-replay-evidence/CRPI-READY-002.json#driver:packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doChooseFirstLeapTarget#trace:MBT_TRACES=1 MBT_STEPS=8 action=doChooseFirstLeapTarget slotLevel=1 damageType=fire` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doChooseInitialTarget` | `tasks/target-replay-evidence/CRPI-READY-002.json#driver:packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doChooseInitialTarget#trace:MBT_TRACES=1 MBT_STEPS=8 action=doChooseInitialTarget slotLevel=1 damageType=fire` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doResolveStep0AttackHit` | `tasks/target-replay-evidence/CRPI-READY-002.json#driver:packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doResolveStep0AttackHit#trace:MBT_TRACES=1 MBT_STEPS=8 action=doResolveStep0AttackHit slotLevel=1 damageType=fire` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doResolveStep0DamageDuplicate` | `tasks/target-replay-evidence/CRPI-READY-002.json#driver:packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doResolveStep0DamageDuplicate#trace:MBT_TRACES=1 MBT_STEPS=8 action=doResolveStep0DamageDuplicate slotLevel=1 damageType=fire` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doResolveStep0DamageNoDuplicate` | `tasks/target-replay-evidence/CRPI-READY-002.json#driver:packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doResolveStep0DamageNoDuplicate#trace:MBT_TRACES=1 MBT_STEPS=8 action=doResolveStep0DamageNoDuplicate slotLevel=1 damageType=fire` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doResolveStep1AttackHit` | `tasks/target-replay-evidence/CRPI-READY-002.json#driver:packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doResolveStep1AttackHit#trace:MBT_TRACES=1 MBT_STEPS=8 action=doResolveStep1AttackHit slotLevel=1 damageType=fire` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doResolveStep1DuplicateDamageSlot1Limit` | `tasks/target-replay-evidence/CRPI-READY-002.json#driver:packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doResolveStep1DuplicateDamageSlot1Limit#trace:MBT_TRACES=1 MBT_STEPS=8 action=doResolveStep1DuplicateDamageSlot1Limit slotLevel=1 damageType=fire` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doResolveStep1DuplicateDamageSlot2AllowsLeap` | `tasks/target-replay-evidence/CRPI-READY-002.json#driver:packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doResolveStep1DuplicateDamageSlot2AllowsLeap#trace:MBT_TRACES=1 MBT_STEPS=8 action=doResolveStep1DuplicateDamageSlot2AllowsLeap slotLevel=2 damageType=fire` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doStartCast` | `tasks/target-replay-evidence/CRPI-READY-002.json#driver:packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doStartCast#trace:MBT_TRACES=1 MBT_STEPS=8 action=doStartCast slotLevel=1` | `_none_` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-002.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id: `MBT_TRACES=1 MBT_STEPS=8 action=<branchAction>`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-002/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 5.

Verification results:

- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- `MBT_TRACES=1 MBT_STEPS=8 pnpm --filter @dnd/battle-runtime exec vitest run src/chained-attack-sequence.mbt.test.ts src/reducer-route-connectors.mbt.test.ts -t "chained"` passed in 9s.
- `node` target replay evidence schema check passed with 10 covered Task 5 obligations.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- RAW/ubiquitous-language review passed against Chromatic Orb, Attack Roll, Damage Roll, Damage Types, Spell Attack, and the project glossary terms for Attack Roll, Damage Type, Spell Attack, Spell Slot, Cast Level, Resolve, Apply, and Advance.
- `git diff --check` passed.
- Reviewer-loop convergence passed: round 2 fixed the adapter-local owner route by moving Task 5 qRoute evidence to public reducer route-event fields; no remaining reasonable Task 5 findings after RAW, ubiquitous-language/domain, architecture/connascence, and code-review passes.
