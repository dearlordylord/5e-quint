# Validation Report

## CRPI-READY-006

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`
- Driver: `packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt`
- Route connector: `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt`
- `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-reducer-route.qnt`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Classes/Sorcerer.md`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Quickened Spell route replay now observes the copied `qRoute` projection
through public battle reducer route events for all eleven in-scope source branch
obligations. Successful restoration, save-gated, direct-condition,
roll-modifier, and after-Magic-action-spent branches collect route events from
`battleReducerStartRouteEvent`, `AvailableBattleAct.routeEvents`, and
`BattleResolutionResult.routeEvents`. Resource, known-option,
unsupported-second-option, and one-option-per-spell failures emit
`metamagicSpellGovernor` route events from invalid `resolveBattleSubject`
results. The prior level-1-plus spell lock emits
`metamagicBonusActionCastingTime` with `battleTurnBoundary` ownership from the
same public reducer surface. The synthetic Quickened Ray of Frost route
assertion remains diagnostic only because it is not a source branch in the
Quickened governor QNT driver.

The runtime does not add a parallel Quickened Spell ledger: action and Bonus
Action availability remain `BattleState.currentTurnResources`, Sorcery Point
spend remains character point-pool resource state, Spell Slot spend remains
character spellcasting resource state, selected Metamagic identity remains a
catalog/selection/admission boundary, and spell target/Attack/damage progress
remains the existing hole frontier.

Generated branch coverage:

| Obligation | Target replay evidence | Diagnostic tests | Status |
| --- | --- | --- | --- |
| `packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doResolveQuickenedRestoration` | `tasks/target-replay-evidence/CRPI-READY-006.json#driver:packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doResolveQuickenedRestoration#trace:MBT_TRACES=1 MBT_STEPS=4 action=doResolveQuickenedRestoration qRoute=quickened-restoration-public-route` | `packages/battle-runtime/src/quickened-spell-governor.mbt.test.ts#observes copied quickened successful branch qRoutes through public reducer entrypoints` | `covered` |
| `packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doResolveQuickenedSaveGatedCondition` | `tasks/target-replay-evidence/CRPI-READY-006.json#driver:packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doResolveQuickenedSaveGatedCondition#trace:MBT_TRACES=1 MBT_STEPS=4 action=doResolveQuickenedSaveGatedCondition qRoute=quickened-save-gated-active-effect-public-route` | `packages/battle-runtime/src/quickened-spell-governor.mbt.test.ts#observes copied quickened successful branch qRoutes through public reducer entrypoints` | `covered` |
| `packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doResolveQuickenedSaveGatedConditionImmunity` | `tasks/target-replay-evidence/CRPI-READY-006.json#driver:packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doResolveQuickenedSaveGatedConditionImmunity#trace:MBT_TRACES=1 MBT_STEPS=4 action=doResolveQuickenedSaveGatedConditionImmunity qRoute=quickened-save-gated-active-effect-public-route` | `packages/battle-runtime/src/quickened-spell-governor.mbt.test.ts#observes copied quickened successful branch qRoutes through public reducer entrypoints` | `covered` |
| `packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doResolveQuickenedDirectCondition` | `tasks/target-replay-evidence/CRPI-READY-006.json#driver:packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doResolveQuickenedDirectCondition#trace:MBT_TRACES=1 MBT_STEPS=4 action=doResolveQuickenedDirectCondition qRoute=quickened-target-list-active-effect-public-route` | `packages/battle-runtime/src/quickened-spell-governor.mbt.test.ts#observes copied quickened successful branch qRoutes through public reducer entrypoints` | `covered` |
| `packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doResolveQuickenedRollModifier` | `tasks/target-replay-evidence/CRPI-READY-006.json#driver:packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doResolveQuickenedRollModifier#trace:MBT_TRACES=1 MBT_STEPS=4 action=doResolveQuickenedRollModifier qRoute=quickened-target-list-active-effect-public-route` | `packages/battle-runtime/src/quickened-spell-governor.mbt.test.ts#observes copied quickened successful branch qRoutes through public reducer entrypoints` | `covered` |
| `packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doResolveQuickenedAfterMagicActionSpent` | `tasks/target-replay-evidence/CRPI-READY-006.json#driver:packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doResolveQuickenedAfterMagicActionSpent#trace:MBT_TRACES=1 MBT_STEPS=4 action=doResolveQuickenedAfterMagicActionSpent qRoute=quickened-restoration-public-route` | `packages/battle-runtime/src/quickened-spell-governor.mbt.test.ts#observes copied quickened successful branch qRoutes through public reducer entrypoints` | `covered` |
| `packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doRejectUnaffordable` | `tasks/target-replay-evidence/CRPI-READY-006.json#driver:packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doRejectUnaffordable#trace:MBT_TRACES=1 MBT_STEPS=4 action=doRejectUnaffordable qRoute=quickened-resource-governor-public-route` | `packages/battle-runtime/src/quickened-spell-governor.mbt.test.ts#observes copied quickened rejection qRoutes through public reducer entrypoints` | `covered` |
| `packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doRejectUnknownOption` | `tasks/target-replay-evidence/CRPI-READY-006.json#driver:packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doRejectUnknownOption#trace:MBT_TRACES=1 MBT_STEPS=4 action=doRejectUnknownOption qRoute=quickened-resource-governor-public-route` | `packages/battle-runtime/src/quickened-spell-governor.mbt.test.ts#observes copied quickened rejection qRoutes through public reducer entrypoints` | `covered` |
| `packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doRejectUnsupportedSecondOption` | `tasks/target-replay-evidence/CRPI-READY-006.json#driver:packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doRejectUnsupportedSecondOption#trace:MBT_TRACES=1 MBT_STEPS=4 action=doRejectUnsupportedSecondOption qRoute=quickened-resource-governor-public-route` | `packages/battle-runtime/src/quickened-spell-governor.mbt.test.ts#observes copied quickened rejection qRoutes through public reducer entrypoints` | `covered` |
| `packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doRejectOnePerSpell` | `tasks/target-replay-evidence/CRPI-READY-006.json#driver:packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doRejectOnePerSpell#trace:MBT_TRACES=1 MBT_STEPS=4 action=doRejectOnePerSpell qRoute=quickened-resource-governor-public-route` | `packages/battle-runtime/src/quickened-spell-governor.mbt.test.ts#observes copied quickened rejection qRoutes through public reducer entrypoints` | `covered` |
| `packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doRejectPriorLevelOnePlusSpell` | `tasks/target-replay-evidence/CRPI-READY-006.json#driver:packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doRejectPriorLevelOnePlusSpell#trace:MBT_TRACES=1 MBT_STEPS=4 action=doRejectPriorLevelOnePlusSpell qRoute=quickened-prior-level-one-plus-public-route` | `packages/battle-runtime/src/quickened-spell-governor.mbt.test.ts#observes copied quickened rejection qRoutes through public reducer entrypoints` | `covered` |
Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-006.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id: `MBT_TRACES=1 MBT_STEPS=4 action=<branchAction> qRoute=<public-route>`
- Public route assertions:
  - `packages/battle-runtime/src/quickened-spell-governor.mbt.test.ts#observes copied quickened successful branch qRoutes through public reducer entrypoints`
  - `packages/battle-runtime/src/quickened-spell-governor.mbt.test.ts#observes copied quickened rejection qRoutes through public reducer entrypoints`
  - `packages/battle-runtime/src/quickened-spell-governor.mbt.test.ts#observes the copied quickened qRoute through public reducer entrypoints`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-006/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 31.

Verification results:

- Base check passed: `ralph/crpi-ready-006-quickened-spell-route/integration`
  and `HEAD` were both `c1f46103d Mark Ralph task 29 done`, and
  `git merge-base --is-ancestor c1f46103da66de824e19e6991f876c6e4e160d13 HEAD`
  exited 0.
- `pnpm --filter @dnd/battle-runtime exec vitest run src/quickened-spell-governor.mbt.test.ts -t "observes.*quickened"` passed.
- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- Before MBT, `ps aux | grep vitest | grep -v grep` and
  `ps aux | grep quint_evaluator | grep -v grep` found no active runner or
  evaluator process.
- `cd packages/battle-runtime && START=$(date +%s); MBT_TRACES=1 MBT_STEPS=4 pnpm exec vitest run src/quickened-spell-governor.mbt.test.ts src/reducer-route-connectors.mbt.test.ts -t "Quickened Spell governor|quickened qRoute|Metamagic governor" 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 9 tests and 33 skipped; final timed run `TOTAL: 7s`.
- `pnpm cleanroom-branch-coverage:check -- --target-replay-evidence tasks/target-replay-evidence/CRPI-READY-006.json` was not a Task 31-scoped validator: direct evidence mode requires the full source inventory, so it exited nonzero on unrelated missing target replay evidence across the corpus; filtered output showed no CRPI-READY-006 / Quickened missing-evidence diagnostics.
- `pnpm cleanroom-branch-coverage:check` passed.
- `git diff --check` passed.
- RAW/ubiquitous-language review passed against Sorcerer Metamagic and
  Quickened Spell, Sorcery Points, Spell Slots, Casting Time, the one Spell
  Slot per turn rule, and UBIQUITOUS_LANGUAGE.md terms for Magic Action, Bonus
  Action, Spell Slot, Pool, Spend, Lock, Spell Invocation, and Spell Effect.
- Reviewer-loop convergence passed: round 1 fixed public start-route
  observation and rejection branch route ownership; round 2 removed overclaimed
  target replay evidence; round 3 added successful branch public qRoute
  evidence for all remaining Quickened obligations and found no remaining
  reasonable RAW/domain, architecture/connascence, or code-review findings.

## CRP07-DSR-01

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`
- Driver: `packages/battle-runtime/battle-runtime-magic-missile.mbt.qnt`
- Route connector: `packages/battle-runtime/battle-runtime-magic-missile.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-magic-missile.mbt.qnt`
- `packages/battle-runtime/battle-runtime-magic-missile.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-reducer-spine-contract.mbt.qnt`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Magic Missile route replay now observes the copied `qRoute` projection through
public battle reducer route events. Spell-slot repeated-damage allocation acts
emit `slotSpell` discovery events from `AvailableBattleAct.routeEvents`; target
allocation and rolled damage fills emit `slotSpell` resolution events from
`BattleResolutionResult.routeEvents`. The runtime does not add a parallel
Magic Missile ledger: action availability remains `BattleState.currentTurnResources`,
Spell Slot spend remains character spellcasting resource state, target Hit
Points and zero-HP lifecycle remain `BattleCreatureState` facts, and spell
target/damage progress remains the existing hole frontier.

Generated branch coverage:

| Obligation | Target replay evidence | Diagnostic tests | Status |
| --- | --- | --- | --- |
| `packages/battle-runtime/battle-runtime-magic-missile.mbt.qnt#step:doFillMagicMissileAllocation` | `tasks/target-replay-evidence/CRP07-DSR-01.json#driver:packages/battle-runtime/battle-runtime-magic-missile.mbt.qnt#step:doFillMagicMissileAllocation#trace:MBT_TRACES=1 MBT_STEPS=2 action=doFillMagicMissileAllocation` | `packages/battle-runtime/src/magic-missile-allocation.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Magic Missile through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-magic-missile.mbt.qnt#step:doFillMagicMissileDamage` | `tasks/target-replay-evidence/CRP07-DSR-01.json#driver:packages/battle-runtime/battle-runtime-magic-missile.mbt.qnt#step:doFillMagicMissileDamage#trace:MBT_TRACES=1 MBT_STEPS=2 action=doFillMagicMissileDamage dartRollTotal=3` | `packages/battle-runtime/src/magic-missile-allocation.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Magic Missile through the shared reducer surface` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRP07-DSR-01.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id: `MBT_TRACES=1 MBT_STEPS=2 action=<branchAction>`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRP07-DSR-01/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 29.

Verification results:

- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- Initial focused MBT was delayed because `ps aux | grep vitest | grep -v grep`
  reported an existing `RUN_QNT_PROOFS=1 vitest run src/battle-runtime-qnt-proofs.test.ts`
  process, and the repo requires one MBT/Vitest runner at a time.
- After the actual Vitest process exited, `MBT_TRACES=1 MBT_STEPS=2 pnpm --filter @dnd/battle-runtime exec vitest run src/magic-missile-allocation.mbt.test.ts src/reducer-route-connectors.mbt.test.ts -t "Magic Missile"` passed with 2 tests; final timed run `TOTAL: 7s`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `pnpm cleanroom-branch-coverage:check -- --target-replay-evidence tasks/target-replay-evidence/CRP07-DSR-01.json` was not a Task 29-scoped validator: it failed because the direct evidence mode requires the full source inventory, so it reported unrelated missing target replay evidence across the corpus.
- `git diff --check` passed.
- RAW/ubiquitous-language review passed against Spell Slots, Hit Points,
  Dropping to 0 Hit Points, Rules Glossary Hit Points, UBIQUITOUS_LANGUAGE.md
  Action Lifecycle, Hit Points and Death, and Spell Slot terms.
- Reviewer-loop convergence passed: round 1 found and fixed adapter-local
  Magic Missile qRoute construction by moving discovery and resolution route
  evidence to public reducer route events; round 2 found no remaining
  reasonable RAW/domain, architecture/connascence, or code-review findings.

## CRPI-READY-005

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`
- Driver: `packages/battle-runtime/battle-runtime-interrupt-stack-resume.mbt.qnt`
- Route connector: `packages/battle-runtime/battle-runtime-interrupt-stack-resume.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-interrupt-stack-resume.mbt.qnt`
- `packages/battle-runtime/battle-runtime-interrupt-stack-resume.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-reducer-route.qnt`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Interrupt-stack resume route replay now observes the copied `qRoute`
projection through public battle reducer route events. Attack-hit and
save-failed interrupt windows are emitted from `BattleResolutionResult.routeEvents`
on `resolveBattleSubject`; interrupt decisions are emitted from
`BattleResolutionResult.routeEvents` on `resolveBattleInterrupt`; Shield-style
active-effect ownership is emitted only when the interrupt resolution adds an
Armor Class effect compared with the pre-interrupt state; replayed procedure
suffixes are emitted from the public `resolveBattleSubject` path after public
`resolveBattleInterrupt` decline calls create the
`BattleState.interruptStack` replay-continuation frame. The runtime does not
add a parallel interrupt ledger: interrupt frames and continuation holes remain
`BattleState.interruptStack` plus the existing hole frontier, Reaction
availability remains `BattleCreatureState.reactionAvailable`, spell slot spend
remains character spellcasting state, active effects remain
`BattleCreatureState.activeEffects`, and Hit Points remain `BattleCreatureState.hp`.

Generated branch coverage:

| Obligation | Target replay evidence | Diagnostic tests | Status |
| --- | --- | --- | --- |
| `packages/battle-runtime/battle-runtime-interrupt-stack-resume.mbt.qnt#step:doNestedDeclineResumesOuterInterrupt` | `tasks/target-replay-evidence/CRPI-READY-005.json#driver:packages/battle-runtime/battle-runtime-interrupt-stack-resume.mbt.qnt#step:doNestedDeclineResumesOuterInterrupt#trace:MBT_TRACES=1 MBT_STEPS=1 action=doNestedDeclineResumesOuterInterrupt` | `packages/battle-runtime/src/interrupt-stack-resume.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes interrupt stack resume through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-interrupt-stack-resume.mbt.qnt#step:doShieldMutationResumesInterruptedAttack` | `tasks/target-replay-evidence/CRPI-READY-005.json#driver:packages/battle-runtime/battle-runtime-interrupt-stack-resume.mbt.qnt#step:doShieldMutationResumesInterruptedAttack#trace:MBT_TRACES=1 MBT_STEPS=1 action=doShieldMutationResumesInterruptedAttack` | `packages/battle-runtime/src/interrupt-stack-resume.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes interrupt stack resume through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-interrupt-stack-resume.mbt.qnt#step:doReplayRecordedProcedureFromRoot` | `tasks/target-replay-evidence/CRPI-READY-005.json#driver:packages/battle-runtime/battle-runtime-interrupt-stack-resume.mbt.qnt#step:doReplayRecordedProcedureFromRoot#trace:MBT_TRACES=1 MBT_STEPS=1 action=doReplayRecordedProcedureFromRoot` | `packages/battle-runtime/src/interrupt-stack-resume.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes interrupt stack resume through the shared reducer surface` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-005.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id: `MBT_TRACES=1 MBT_STEPS=1 action=<branchAction>`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-005/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 22.

Verification results:

- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- First focused MBT attempt `MBT_TRACES=1 MBT_STEPS=1 pnpm --filter @dnd/battle-runtime exec vitest run src/interrupt-stack-resume.mbt.test.ts src/reducer-route-connectors.mbt.test.ts -t "interrupt stack resume"` failed because released readied save-gated spell resolution was still classified as adapter-local interrupt discovery instead of the public `saveGatedSpell` route subject.
- `MBT_TRACES=1 MBT_STEPS=1 pnpm --filter @dnd/battle-runtime exec vitest run src/interrupt-stack-resume.mbt.test.ts src/reducer-route-connectors.mbt.test.ts -t "interrupt stack resume"` passed after classifying release-readied save-gated procedure shape through existing `BattleState.readiedSpells`; final timed run `TOTAL: 5s`.
- Revision round 2 fixed the missing `savingThrowOutcome` route-fill mapping, restricted `weaponAttack` route suffix events to resolved replay-continuation state, removed the replay adapter's internal `replayContinuationFrame` construction, and regenerated the focused target replay; `MBT_TRACES=1 MBT_STEPS=1 pnpm --filter @dnd/battle-runtime exec vitest run src/interrupt-stack-resume.mbt.test.ts src/reducer-route-connectors.mbt.test.ts -t "interrupt stack resume"` passed with 3 tests; final timed run `TOTAL: 6s`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- RAW/ubiquitous-language review passed against Playing the Game Reactions, Rules Glossary Reaction and Ready Action, Spells/Gaining-and-Casting Reaction and Bonus Action Triggers, and UBIQUITOUS_LANGUAGE.md Offer/Decline/Advance, Reaction, Spell Effect, Readied Spell Response, and Spell Slot.
- Reviewer-loop convergence passed: round 1 found and fixed the readied-spell route classification mismatch; round 2 tightened Shield-style route ownership to compare pre/post active-effect state and kept save-gated spell routing to the interrupt-opening case; revision round 2 addressed all reviewer findings and found no remaining reasonable RAW/domain, architecture/connascence, or code-review findings before broad verification.

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
`AvailableBattleAct.routeEvents`, and each fill reads
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

## CRPI-READY-004

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`
- Driver: `packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt`
- Route connector: `packages/battle-runtime/battle-runtime-eldritch-blast.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt`
- `packages/battle-runtime/battle-runtime-eldritch-blast.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

The route replay for independent spell Attack sequences now observes the copied
`qRoute` projection through public reducer route events produced from
`startBattle`, `discoverBattleActs`, and `resolveBattleSubject`. Eldritch Blast
target admission, per-beam Attack Roll resolution, Hit Point damage, sequence
continuation, and stale-subject rejection route through the shared reducer
surface. The runtime does not add a parallel beam ledger: sequence progress
remains the typed action-spell subject plus ordered fills and reducer hole
frontier, creature Hit Points remain `BattleCreatureState.hp`, and object target
identity, Armor Class, range, and Hit Point facts remain table-supplied
object-target boundary fills. Discovery now exposes `AvailableBattleAct.routeEvents`
so a single public act can report both action-economy and object-target-boundary
route events without adapter-local route construction.

Generated branch coverage:

| Obligation | Target replay evidence | Diagnostic tests | Status |
| --- | --- | --- | --- |
| `packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt#step:doFillFirstAttackHit` | `tasks/target-replay-evidence/CRPI-READY-004.json#driver:packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt#step:doFillFirstAttackHit#trace:MBT_TRACES=1 MBT_STEPS=4 action=doFillFirstAttackHit` | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes independent spell Attack sequences through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt#step:doFillFirstAttackMiss` | `tasks/target-replay-evidence/CRPI-READY-004.json#driver:packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt#step:doFillFirstAttackMiss#trace:MBT_TRACES=1 MBT_STEPS=4 action=doFillFirstAttackMiss` | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes independent spell Attack sequences through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt#step:doFillFirstDamageLow` | `tasks/target-replay-evidence/CRPI-READY-004.json#driver:packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt#step:doFillFirstDamageLow#trace:MBT_TRACES=1 MBT_STEPS=4 action=doFillFirstDamageLow` | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes independent spell Attack sequences through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt#step:doFillSecondAttackHit` | `tasks/target-replay-evidence/CRPI-READY-004.json#driver:packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt#step:doFillSecondAttackHit#trace:MBT_TRACES=1 MBT_STEPS=4 action=doFillSecondAttackHit` | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes independent spell Attack sequences through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt#step:doFillSecondAttackMiss` | `tasks/target-replay-evidence/CRPI-READY-004.json#driver:packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt#step:doFillSecondAttackMiss#trace:MBT_TRACES=1 MBT_STEPS=4 action=doFillSecondAttackMiss` | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes independent spell Attack sequences through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt#step:doFillSecondDamageLow` | `tasks/target-replay-evidence/CRPI-READY-004.json#driver:packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt#step:doFillSecondDamageLow#trace:MBT_TRACES=1 MBT_STEPS=4 action=doFillSecondDamageLow` | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes independent spell Attack sequences through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt#step:doFillTwoCreatureTargets` | `tasks/target-replay-evidence/CRPI-READY-004.json#driver:packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt#step:doFillTwoCreatureTargets#trace:MBT_TRACES=1 MBT_STEPS=4 action=doFillTwoCreatureTargets` | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes independent spell Attack sequences through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt#step:doRejectStaleAfterResolved` | `tasks/target-replay-evidence/CRPI-READY-004.json#driver:packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt#step:doRejectStaleAfterResolved#trace:MBT_TRACES=1 MBT_STEPS=4 action=doRejectStaleAfterResolved` | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes independent spell Attack sequences through the shared reducer surface` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-004.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id: `MBT_TRACES=1 MBT_STEPS=4 action=<branchAction>`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-004/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 15.

Verification results:

- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- `MBT_TRACES=1 MBT_STEPS=4 pnpm --filter @dnd/battle-runtime exec vitest run src/reducer-route-connectors.mbt.test.ts -t "independent spell Attack"` passed in 7s.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- RAW/ubiquitous-language review passed against Eldritch Blast, Attack Rolls, Making an Attack, Damage Rolls, Breaking Objects, Target, and the project glossary terms for Spell Invocation, Spell Attack, Table Decision, Attack Roll, Damage, Resolve, Apply, and Advance.
- Reviewer-loop convergence passed: round 2 moved Eldritch Blast qRoute discovery to public `AvailableBattleAct.routeEvents`, kept object target facts at the table boundary, and found no remaining reasonable Task 15 findings after RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review checks.

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

The route replay for Concentration break teardown now observes the copied `qRoute` projection through public battle reducer routes. Concentration spell cast discovery and voluntary End Concentration discovery are emitted from `AvailableBattleAct.routeEvents`; cleanup and save-resolution owner events are emitted from `BattleResolutionResult.routeEvents`. The runtime does not add a parallel Concentration or active-effect ledger: the concentrating source remains `BattleCreatureState.concentration`, Spell Effect instances remain `BattleCreatureState.activeEffects`, and malformed or stale `endConcentration` subjects are rejected.

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
- Reviewer-loop convergence round 2 addressed review findings by moving discovery qRoute evidence to `AvailableBattleAct.routeEvents`, rejecting stale/filled End Concentration subjects, adding focused regression tests, and rerunning RAW/domain, architecture/connascence, code-review, and focused MBT checks.

## CRP07-DSR-04

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`
- Driver: `packages/battle-runtime/battle-runtime-death-saving-throw.mbt.qnt`
- Route connector: `packages/battle-runtime/battle-runtime-death-saving-throw.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-death-saving-throw.mbt.qnt`
- `packages/battle-runtime/battle-runtime-death-saving-throw.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-hit-points.qnt`
- `packages/shared-algebras/proofs/rule-core/zero-hit-point-lifecycle.qnt`
- `/workspace/typescript/dnd-cleanroom-jul2/tasks/BLOCKERS.md#T036`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Death Saving Throw route replay now observes the copied `qRoute` projection through public battle reducer route events. The route driver records start-battle evidence from `battleReducerStartRouteEvent(startBattle result)` and death-save discovery, fill, and wrong-actor rejection evidence from `BattleResolutionResult.routeEvents` on the public `resolveBattleSubject` End Turn path. The runtime does not add adapter-owned death-save state: Hit Points, Unconscious, Stable, Dead, death-save counters, current actor, and turn advancement remain owned by `BattleState`/`BattleCreatureState`; the adapter records only the copied sampled `roll` witness in target replay evidence.

Generated branch coverage:

| Obligation | Target replay evidence | Diagnostic tests | Status |
| --- | --- | --- | --- |
| `packages/battle-runtime/battle-runtime-death-saving-throw.mbt.qnt#step:doDiscoverEndTurnDeathSavingThrow` | `tasks/target-replay-evidence/CRP07-DSR-04.json#driver:packages/battle-runtime/battle-runtime-death-saving-throw.mbt.qnt#step:doDiscoverEndTurnDeathSavingThrow#trace:MBT_TRACES=1 MBT_STEPS=3 action=doDiscoverEndTurnDeathSavingThrow` | `packages/battle-runtime/src/death-saving-throw.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Death Saving Throw through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-death-saving-throw.mbt.qnt#step:doFillDeathSavingThrow` | `tasks/target-replay-evidence/CRP07-DSR-04.json#driver:packages/battle-runtime/battle-runtime-death-saving-throw.mbt.qnt#step:doFillDeathSavingThrow#trace:MBT_TRACES=1 MBT_STEPS=3 action=doFillDeathSavingThrow roll=1`; `roll=5`; `roll=10`; `roll=20` | `packages/battle-runtime/src/death-saving-throw.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Death Saving Throw through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-death-saving-throw.mbt.qnt#step:doRejectWrongActorEndTurnAfterResolved` | `tasks/target-replay-evidence/CRP07-DSR-04.json#driver:packages/battle-runtime/battle-runtime-death-saving-throw.mbt.qnt#step:doRejectWrongActorEndTurnAfterResolved#trace:MBT_TRACES=1 MBT_STEPS=3 action=doRejectWrongActorEndTurnAfterResolved roll=20` | `packages/battle-runtime/src/death-saving-throw.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Death Saving Throw through the shared reducer surface` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRP07-DSR-04.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id: `MBT_TRACES=1 MBT_STEPS=3 action=<branchAction>`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRP07-DSR-04/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 12.

Verification results:

- `pnpm --filter @dnd/battle-runtime typecheck` passed before and after the adapter-boundary follow-up.
- `MBT_TRACES=1 MBT_STEPS=3 pnpm --filter @dnd/battle-runtime exec vitest run src/death-saving-throw.mbt.test.ts src/reducer-route-connectors.mbt.test.ts -t "Death Saving Throw"` passed in 7s after the adapter-boundary follow-up.
- `pnpm cleanroom-branch-coverage:check` passed after the adapter-boundary follow-up with 738 obligations and 24 sampled inputs.
- `git diff --check` passed after the adapter-boundary follow-up.
- RAW/ubiquitous-language review passed against Rules Glossary Death Saving Throw, Playing the Game Death Saving Throws and Dropping to 0 Hit Points, and UBIQUITOUS_LANGUAGE.md Hit Points and Death.
- Reviewer-loop convergence passed: round 2 tightened the replay adapter so the End Turn subject comes from public `discoverBattleActs`; architecture/connascence review found death-save route subject/fill/hole/owner string coupling localized in the reducer route vocabulary and mapper, while production death-save state remains the existing BattleState-owned lifecycle.

## CRP07-DSR-03

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`
- Driver: `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt`
- Route connector: `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt`
- `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.qnt`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

The route replay for Hit Point restoration ordering now observes the copied
`qRoute` projection through public battle reducer route events. Spell healing
target choice/list discovery and feature healing-pool discovery are emitted
from `AvailableBattleAct.routeEvents`; target/list fills, premature healing
rolls, final healing rolls, and feature healing-pool distribution are emitted
from `BattleResolutionResult.routeEvents`. The runtime does not add a parallel
healing HP ledger: restored HP remains `BattleCreatureState.hp`, zero-HP
condition and death-save cleanup remain `BattleCreatureState.zeroHpLifecycle`
plus condition lifecycle, and healing target/distribution progress remains the
existing subject hole frontier.

Generated branch coverage:

| Obligation | Target replay evidence | Diagnostic tests | Status |
| --- | --- | --- | --- |
| `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doDiscoverFeatureHealingPool` | `tasks/target-replay-evidence/CRP07-DSR-03.json#driver:packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doDiscoverFeatureHealingPool#trace:MBT_TRACES=1 MBT_STEPS=4 action=doDiscoverFeatureHealingPool` | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Hit Point restoration through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doDiscoverSingleTargetSpellHealing` | `tasks/target-replay-evidence/CRP07-DSR-03.json#driver:packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doDiscoverSingleTargetSpellHealing#trace:MBT_TRACES=1 MBT_STEPS=4 action=doDiscoverSingleTargetSpellHealing` | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Hit Point restoration through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doDiscoverTargetListSpellHealing` | `tasks/target-replay-evidence/CRP07-DSR-03.json#driver:packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doDiscoverTargetListSpellHealing#trace:MBT_TRACES=1 MBT_STEPS=4 action=doDiscoverTargetListSpellHealing` | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Hit Point restoration through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doFillFeatureHealingDistribution` | `tasks/target-replay-evidence/CRP07-DSR-03.json#driver:packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doFillFeatureHealingDistribution#trace:MBT_TRACES=1 MBT_STEPS=4 action=doFillFeatureHealingDistribution` | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Hit Point restoration through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doFillSpellHealingRoll` | `tasks/target-replay-evidence/CRP07-DSR-03.json#driver:packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doFillSpellHealingRoll#trace:MBT_TRACES=1 MBT_STEPS=4 action=doFillSpellHealingRoll` | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Hit Point restoration through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doFillSpellHealingTargetChoice` | `tasks/target-replay-evidence/CRP07-DSR-03.json#driver:packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doFillSpellHealingTargetChoice#trace:MBT_TRACES=1 MBT_STEPS=4 action=doFillSpellHealingTargetChoice` | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Hit Point restoration through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doFillSpellHealingTargetList` | `tasks/target-replay-evidence/CRP07-DSR-03.json#driver:packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doFillSpellHealingTargetList#trace:MBT_TRACES=1 MBT_STEPS=4 action=doFillSpellHealingTargetList` | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Hit Point restoration through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doSubmitHealingRollBeforeTargetChoice` | `tasks/target-replay-evidence/CRP07-DSR-03.json#driver:packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doSubmitHealingRollBeforeTargetChoice#trace:MBT_TRACES=1 MBT_STEPS=4 action=doSubmitHealingRollBeforeTargetChoice` | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Hit Point restoration through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doSubmitHealingRollBeforeTargetList` | `tasks/target-replay-evidence/CRP07-DSR-03.json#driver:packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doSubmitHealingRollBeforeTargetList#trace:MBT_TRACES=1 MBT_STEPS=4 action=doSubmitHealingRollBeforeTargetList` | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Hit Point restoration through the shared reducer surface` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRP07-DSR-03.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id: `MBT_TRACES=1 MBT_STEPS=4 action=<branchAction>`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRP07-DSR-03/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 21.

Verification results:

- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- First focused MBT attempt `MBT_TRACES=1 MBT_STEPS=4 pnpm --filter @dnd/battle-runtime exec vitest run src/hit-point-restoration-ordering.mbt.test.ts src/reducer-route-connectors.mbt.test.ts -t "Hit Point restoration"` failed because discovery qRoute evidence was still adapter-local for Hit Point restoration.
- `MBT_TRACES=1 MBT_STEPS=4 pnpm --filter @dnd/battle-runtime exec vitest run src/hit-point-restoration-ordering.mbt.test.ts src/reducer-route-connectors.mbt.test.ts -t "Hit Point restoration"` passed after moving discovery and resolution qRoute evidence to public reducer route events; final timed run `TOTAL: 9s`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- RAW/ubiquitous-language review passed against Playing the Game Healing and Dropping to 0 Hit Points, Rules Glossary Hit Points and Healing, and UBIQUITOUS_LANGUAGE.md Hit Points and Death.
- Reviewer-loop convergence passed: round 1 found and fixed the adapter-local qRoute shortcut by adding Hit Point restoration to the public reducer route vocabulary; round 2 found no remaining reasonable RAW/domain, architecture/connascence, or code-review findings.
