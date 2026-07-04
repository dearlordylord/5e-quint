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

## CRPI-READY-003

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`
- Driver: `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt`
- Route connector: `packages/battle-runtime/battle-runtime-command-ordering.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt`
- `packages/battle-runtime/battle-runtime-command-ordering.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

The route replay for Command ordering now observes the copied `qRoute` projection through public reducer route events produced from `startBattle`, `discoverBattleActs`, and `resolveBattleSubject`. Command casting, option ordering, Saving Throw ordering, pending next-turn Command effects, Grovel Prone application, Drop held-object boundary facts, Halt turn-resource suppression, Approach/Flee Movement spending, Flee partial-movement rejection, and Flee Opportunity Attack interrupt windows route through the shared reducer surface. The runtime does not add a parallel Command ledger: Command option state remains the existing `commandPending` active effect, Prone remains condition lifecycle state, Movement remains `BattleCreatureState.movementSpentFeet`, Halt remains `BattleState.currentTurnResources.commandHalt`, and Opportunity Attack windows remain `BattleState.interruptStack`. Held-object inventory and route geometry remain boundary fills.

Generated branch coverage:

| Obligation | Target replay evidence | Diagnostic tests | Status |
| --- | --- | --- | --- |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doApproachMovementContinues` | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doApproachMovementContinues#trace:MBT_TRACES=1 MBT_STEPS=5 action=doApproachMovementContinues` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doApproachNoMovement` | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doApproachNoMovement#trace:MBT_TRACES=1 MBT_STEPS=5 action=doApproachNoMovement` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doDiscoverCommand` | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doDiscoverCommand#trace:MBT_TRACES=1 MBT_STEPS=5 action=doDiscoverCommand` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doDropNeedsHeldObjectFacts` | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doDropNeedsHeldObjectFacts#trace:MBT_TRACES=1 MBT_STEPS=5 action=doDropNeedsHeldObjectFacts` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFillApproachMovementContinues` | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFillApproachMovementContinues#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFillApproachMovementContinues` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFillApproachMovementWithinFive` | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFillApproachMovementWithinFive#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFillApproachMovementWithinFive` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFillDropHeldObjectFacts` | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFillDropHeldObjectFacts#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFillDropHeldObjectFacts` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFillFailedGrovelSavingThrow` | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFillFailedGrovelSavingThrow#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFillFailedGrovelSavingThrow` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFillFleeMovement` | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFillFleeMovement#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFillFleeMovement` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFillGrovelOption` | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFillGrovelOption#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFillGrovelOption` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFillTargetList` | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFillTargetList#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFillTargetList` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFleeMovement` | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFleeMovement#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFleeMovement` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFleeNoMovement` | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFleeNoMovement#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFleeNoMovement` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFleeOpportunityAttack` | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFleeOpportunityAttack#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFleeOpportunityAttack` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFollowGrovel` | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFollowGrovel#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFollowGrovel` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doHaltSuppresses` | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doHaltSuppresses#trace:MBT_TRACES=1 MBT_STEPS=5 action=doHaltSuppresses` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doRejectFleePartialMovement` | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doRejectFleePartialMovement#trace:MBT_TRACES=1 MBT_STEPS=5 action=doRejectFleePartialMovement` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doSubmitOptionBeforeTargetList` | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doSubmitOptionBeforeTargetList#trace:MBT_TRACES=1 MBT_STEPS=5 action=doSubmitOptionBeforeTargetList` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doSubmitSavingThrowBeforeOption` | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doSubmitSavingThrowBeforeOption#trace:MBT_TRACES=1 MBT_STEPS=5 action=doSubmitSavingThrowBeforeOption` | `_none_` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-003.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id: `MBT_TRACES=1 MBT_STEPS=5 action=<branchAction>`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-003/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 7.

Verification results:

- `pnpm --filter @dnd/battle-runtime exec vitest run src/unit-profile-admission-command-control-options.test.ts` passed with 7 tests.
- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- `MBT_TRACES=1 MBT_STEPS=5 pnpm --filter @dnd/battle-runtime exec vitest run src/command-ordering.mbt.test.ts src/reducer-route-connectors.mbt.test.ts -t "Command"` passed in 9s.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- RAW/ubiquitous-language review passed against Command, Movement and Position, Prone, Reaction, Opportunity Attacks, and the project glossary terms for Spell Invocation, Spell Effect, Movement, Reaction, Condition, and Boundary Crossing.
- Reviewer-loop convergence passed: round 2 gated invalid Command route evidence to fill-order invalids and added regression coverage for stale/wrong-actor Command subjects under Halt; no remaining reasonable Task 7 findings after RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review checks.

## CRP07-DSR-05

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`
- Driver: `packages/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt`
- Route connector: `packages/battle-runtime/battle-runtime-concentration-break-teardown.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt`
- `packages/battle-runtime/battle-runtime-concentration-break-teardown.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

The route replay for Concentration break teardown now observes the copied `qRoute` projection through public battle reducer routes. Concentration spell cast discovery and voluntary End Concentration discovery are emitted from `AvailableBattleAct.routeEvent`; cleanup and save-resolution owner events are emitted from `BattleResolutionResult.routeEvents`. The runtime does not add a parallel Concentration or active-effect ledger: the concentrating source remains `BattleCreatureState.concentration`, Spell Effect instances remain `BattleCreatureState.activeEffects`, and malformed or stale `endConcentration` subjects are rejected.

Generated branch coverage:

| Obligation | Target replay evidence | Diagnostic tests | Status |
| --- | --- | --- | --- |
| `packages/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt#step:doCastConcentrationSpell` | `tasks/target-replay-evidence/CRP07-DSR-05.json#driver:packages/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt#step:doCastConcentrationSpell#trace:MBT_TRACES=1 MBT_STEPS=3 action=doCastConcentrationSpell` | `packages/battle-runtime/src/concentration-break-teardown.mbt.test.ts#public discovered acts/stale filled subjects`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Concentration cleanup ordering deterministically` | `covered` |
| `packages/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt#step:doDamageRequestsConcentrationSave` | `tasks/target-replay-evidence/CRP07-DSR-05.json#driver:packages/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt#step:doDamageRequestsConcentrationSave#trace:MBT_TRACES=1 MBT_STEPS=3 action=doDamageRequestsConcentrationSave damageDiePip=4` | `packages/battle-runtime/src/concentration-break-teardown.mbt.test.ts#public discovered acts/stale filled subjects`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Concentration cleanup ordering deterministically` | `covered` |
| `packages/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt#step:doFailConcentrationSave` | `tasks/target-replay-evidence/CRP07-DSR-05.json#driver:packages/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt#step:doFailConcentrationSave#trace:MBT_TRACES=1 MBT_STEPS=3 action=doFailConcentrationSave damageDiePip=4 saveRollTotal=9` | `packages/battle-runtime/src/concentration-break-teardown.mbt.test.ts#public discovered acts/stale filled subjects`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Concentration cleanup ordering deterministically` | `covered` |
| `packages/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt#step:doVoluntaryEndConcentration` | `tasks/target-replay-evidence/CRP07-DSR-05.json#driver:packages/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt#step:doVoluntaryEndConcentration#trace:MBT_TRACES=1 MBT_STEPS=3 action=doVoluntaryEndConcentration` | `packages/battle-runtime/src/concentration-break-teardown.mbt.test.ts#public discovered acts/stale filled subjects`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Concentration cleanup ordering deterministically` | `covered` |
| `packages/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt#step:doCastReplacementConcentrationSpell` | `tasks/target-replay-evidence/CRP07-DSR-05.json#driver:packages/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt#step:doCastReplacementConcentrationSpell#trace:MBT_TRACES=1 MBT_STEPS=3 action=doCastReplacementConcentrationSpell` | `packages/battle-runtime/src/concentration-break-teardown.mbt.test.ts#public discovered acts/stale filled subjects`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Concentration cleanup ordering deterministically` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRP07-DSR-05.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id: `MBT_TRACES=1 MBT_STEPS=3 action=<branchAction>`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRP07-DSR-05/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 8.

Verification results:

- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- `pnpm --filter @dnd/battle-runtime exec vitest run src/concentration-break-teardown.mbt.test.ts -t "public discovered acts|stale and filled"` passed with 2 tests.
- `pnpm --filter @dnd/battle-runtime exec vitest run src/reducer-route-connectors.mbt.test.ts -t "routes Concentration cleanup ordering deterministically"` passed with 1 test.
- `pnpm --filter @dnd/battle-runtime exec quint typecheck battle-runtime-concentration-break-teardown.route.mbt.qnt` passed.
- `MBT_TRACES=1 MBT_STEPS=3 pnpm --filter @dnd/battle-runtime exec vitest run src/concentration-break-teardown.mbt.test.ts src/reducer-route-connectors.mbt.test.ts -t "Concentration"` passed in 13s.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- RAW/ubiquitous-language review passed against Rules Glossary Concentration and UBIQUITOUS_LANGUAGE.md Spellcasting terms.
- Reviewer-loop convergence round 2 addressed review findings by moving discovery qRoute evidence to `AvailableBattleAct.routeEvent`, rejecting stale/filled End Concentration subjects, adding focused regression tests, and rerunning RAW/domain, architecture/connascence, code-review, and focused MBT checks.
