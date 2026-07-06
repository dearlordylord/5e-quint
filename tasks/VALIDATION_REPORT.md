# Validation Report

## CRPI-BLOCK-055

Status: `pass`

- Task: 103
- Driver path: `packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt`
- Route connector path: `packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.route.mbt.qnt`
- Route class: `reducer-routed`
- Accepted projection: `qRoute`
- Evidence file: `tasks/target-replay-evidence/CRPI-BLOCK-055.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt`
- `packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.route.mbt.qnt`
- `packages/character-sheet-runtime/src/weapon-mastery-containers-selected-identity.mbt.test.ts`
- `packages/character-sheet-runtime/src/reducer-route-connectors.mbt.test.ts`
- `packages/character-sheet-runtime/src/weapon-mastery.ts`
- `packages/character-sheet-runtime/src/rests.ts`
- `packages/character-sheet-runtime/src/sheet-types.ts`
- `packages/character-sheet-runtime/src/index.ts`
- `scripts/audit-character-sheet-runtime-split.mjs`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Equipment.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `.references/srd-5.2.1/Classes/Paladin.md`
- `.references/srd-5.2.1/Classes/Ranger.md`
- `.references/srd-5.2.1/Classes/Rogue.md`
- `.references/srd-5.2.1/Classes/Fighter.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Task 103 accepts the Character Sheet Weapon Mastery selected-reference route
through public target entrypoints. `characterSheetWeaponMasterySelectedReferenceProjection`
derives selected weapon refs from existing `CharacterBuild.features` selected
class choices and derives choice count, Long Rest change count, and eligible
weapon refs from Surface Weapon Mastery profile facts. `completeLongRestWeaponMasteryReselectionWithRoute`
wraps the existing `completeLongRest` reducer path to expose accepted and
rejected Long Rest reselection `qRoute` evidence. In revision round 2, the
wrapper was narrowed so only failures proven by the Weapon Mastery reselection
precheck emit selected-reference projection-choice evidence; unrelated
`completeLongRest` failures return `route: "none"` with empty `qRoute`. No
durable Weapon Mastery sheet state, eligibility cache, or mastery-property
behavior was added.

Generated branch coverage:

| Obligation | Evidence | Sampled inputs | Status |
| --- | --- | --- | --- |
| `packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt#step:doSelectPaladinWeaponMastery` | `tasks/target-replay-evidence/CRPI-BLOCK-055.json#driver:packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt#step:doSelectPaladinWeaponMastery#trace:public-route=characterSheetWeaponMasterySelectedReferenceProjection action=doSelectPaladinWeaponMastery qRoute=weapon-mastery-selected-identity-public-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt#step:doReselectPaladinWeaponMasteryOnLongRest` | `tasks/target-replay-evidence/CRPI-BLOCK-055.json#driver:packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt#step:doReselectPaladinWeaponMasteryOnLongRest#trace:public-route=completeLongRestWeaponMasteryReselectionWithRoute action=doReselectPaladinWeaponMasteryOnLongRest qRoute=weapon-mastery-selected-identity-public-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt#step:doSelectRangerWeaponMastery` | `tasks/target-replay-evidence/CRPI-BLOCK-055.json#driver:packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt#step:doSelectRangerWeaponMastery#trace:public-route=characterSheetWeaponMasterySelectedReferenceProjection action=doSelectRangerWeaponMastery qRoute=weapon-mastery-selected-identity-public-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt#step:doReselectRangerWeaponMasteryOnLongRest` | `tasks/target-replay-evidence/CRPI-BLOCK-055.json#driver:packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt#step:doReselectRangerWeaponMasteryOnLongRest#trace:public-route=completeLongRestWeaponMasteryReselectionWithRoute action=doReselectRangerWeaponMasteryOnLongRest qRoute=weapon-mastery-selected-identity-public-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt#step:doSelectRogueWeaponMastery` | `tasks/target-replay-evidence/CRPI-BLOCK-055.json#driver:packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt#step:doSelectRogueWeaponMastery#trace:public-route=characterSheetWeaponMasterySelectedReferenceProjection action=doSelectRogueWeaponMastery qRoute=weapon-mastery-selected-identity-public-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt#step:doReselectRogueWeaponMasteryOnLongRest` | `tasks/target-replay-evidence/CRPI-BLOCK-055.json#driver:packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt#step:doReselectRogueWeaponMasteryOnLongRest#trace:public-route=completeLongRestWeaponMasteryReselectionWithRoute action=doReselectRogueWeaponMasteryOnLongRest qRoute=weapon-mastery-selected-identity-public-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt#step:doAcceptOneChangeWeaponMasteryReselection` | `tasks/target-replay-evidence/CRPI-BLOCK-055.json#driver:packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt#step:doAcceptOneChangeWeaponMasteryReselection#trace:public-route=completeLongRestWeaponMasteryReselectionWithRoute action=doAcceptOneChangeWeaponMasteryReselection qRoute=weapon-mastery-selected-identity-public-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt#step:doRejectTooManyChangesWeaponMasteryReselection` | `tasks/target-replay-evidence/CRPI-BLOCK-055.json#driver:packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt#step:doRejectTooManyChangesWeaponMasteryReselection#trace:public-route=completeLongRestWeaponMasteryReselectionWithRoute action=doRejectTooManyChangesWeaponMasteryReselection qRoute=weapon-mastery-selected-identity-public-route` | `_none_` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-BLOCK-055.json`
- Reproduction trace family: `public-route=<entrypoint> qRoute=weapon-mastery-selected-identity-public-route`
- The copied connector projection source is `packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.route.mbt.qnt#qRoute`; observed projection sources are `packages/character-sheet-runtime/src/weapon-mastery.ts#characterSheetWeaponMasterySelectedReferenceProjection` and `packages/character-sheet-runtime/src/rests.ts#completeLongRestWeaponMasteryReselectionWithRoute`.

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-BLOCK-055/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 103.

RAW and ubiquitous-language review:

- SRD 5.2.1 `Equipment.md#Weapon Mastery` defines mastery properties as weapon facts usable only when a feature unlocks them.
- SRD 5.2.1 `Classes/Paladin.md#Level 1: Weapon Mastery`, `Classes/Ranger.md#Level 1: Weapon Mastery`, and `Classes/Rogue.md#Level 1: Weapon Mastery` define two proficient weapon choices and changing chosen weapon kinds after finishing a Long Rest.
- SRD 5.2.1 `Classes/Fighter.md#Level 1: Weapon Mastery` defines the one-choice Long Rest change limit used for accepted one-change and rejected too-many-changes semantic branches.
- SRD 5.2.1 `Rules-Glossary.md#Long Rest` defines Long Rest completion as the reset/change boundary for special features.
- `UBIQUITOUS_LANGUAGE.md` defines Weapon Mastery and Mastery Property, preserving the task boundary: selected references and reselection are modeled here, not mastery-property combat behavior.

Verification results:

- Base check passed: declared base ref `ralph/cleanroom-character-sheet-route-lane-20260705T2045Z/integration` and `HEAD` both resolved to `b1f06fd6b Mark Ralph task 102 done`; Base SHA `b1f06fd6b495f65ff7c6f53232a91c2d36148747` is an ancestor of `HEAD`.
- Focused typecheck passed: `pnpm --filter @dnd/character-sheet-runtime typecheck`.
- Split-audit passed: `pnpm check:character-sheet-runtime-split`.
- Initial focused replay found the copied route connector missing the BuildProjectionOwner facts event for selected-reference projection; the connector was updated to distinguish selection projection from Long Rest reselection.
- Focused replay passed: `START=$(date +%s); ( MBT_TRACES=1 MBT_STEPS=1 pnpm --filter @dnd/character-sheet-runtime exec vitest run src/weapon-mastery-containers-selected-identity.mbt.test.ts src/reducer-route-connectors.mbt.test.ts -t "Weapon Mastery container|routes Weapon Mastery" ) 2>&1 & pid=$!; wait "$pid"; status=$?; echo "TOTAL: $(( $(date +%s) - START ))s"; exit "$status"` passed with 6 tests and 9 skipped route tests; final timed run `TOTAL: 15s`.
- Revision round 2 focused rest regression passed: `pnpm --filter @dnd/character-sheet-runtime exec vitest run src/rests.test.ts -t "Weapon Mastery Long Rest route wrapper leaves unrelated Long Rest failures unrouted|rejects Weapon Mastery Long Rest reselection"` passed with 2 tests and 20 skipped.
- Revision round 2 focused replay passed: `START=$(date +%s); ( MBT_TRACES=1 MBT_STEPS=1 pnpm --filter @dnd/character-sheet-runtime exec vitest run src/weapon-mastery-containers-selected-identity.mbt.test.ts src/reducer-route-connectors.mbt.test.ts -t "Weapon Mastery container|routes Weapon Mastery" ) 2>&1 & pid=$!; wait "$pid"; status=$?; echo "TOTAL: $(( $(date +%s) - START ))s"; exit "$status"` passed with 6 tests and 9 skipped route tests; timed run `TOTAL: 14s`.
- Final broad verification and JSON validation are recorded in `tasks/RUN_LEDGER.json`.
- Reviewer-loop convergence passed: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review checks found no remaining reasonable Task 103 findings after moving observed Weapon Mastery `qRoute` events into public projection/rest route entrypoints, narrowing unrelated Long Rest failures to no-route results, and recording split-audit export ownership.

## CRPI-BLOCK-053

Status: `pass`

- Task: 99
- Driver path: `packages/character-sheet-runtime/character-sheet-hit-point-maximum.mbt.qnt`
- Route connector path: `packages/character-sheet-runtime/character-sheet-hit-point-maximum.route.mbt.qnt`
- Route class: `reducer-routed`
- Accepted projection: `qRoute`
- Evidence file: `tasks/target-replay-evidence/CRPI-BLOCK-053.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/character-sheet-runtime/character-sheet-hit-point-maximum.mbt.qnt`
- `packages/character-sheet-runtime/character-sheet-hit-point-maximum.route.mbt.qnt`
- `packages/character-sheet-runtime/src/hit-point-maximum.mbt.test.ts`
- `packages/character-sheet-runtime/src/reducer-route-connectors.mbt.test.ts`
- `packages/character-sheet-runtime/src/hit-points.ts`
- `packages/character-sheet-runtime/src/sheet-types.ts`
- `packages/character-sheet-runtime/src/index.ts`
- `scripts/audit-character-sheet-runtime-split.mjs`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Character-Creation.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `.references/srd-5.2.1/Classes/Sorcerer.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Hit Point Maximum route replay is accepted through the public Character Sheet
projection entrypoint. `characterSheetHitPointMaximumProjection` derives normal
Hit Point Maximum from existing `CharacterBuild` progression, Constitution, and
typed feature facts; applies the existing `CharacterSheet.hitPointMaximumReduction`
field for effective maximum; and returns the copied Hit Point projection plus
build arithmetic-input `qRoute` events. No parallel normal-maximum,
effective-maximum, or maximum-reduction ledger was introduced.

Generated branch coverage:

| Obligation | Evidence | Sampled inputs | Status |
| --- | --- | --- | --- |
| `packages/character-sheet-runtime/character-sheet-hit-point-maximum.mbt.qnt#step:doProjectFighterLevelOne` | `tasks/target-replay-evidence/CRPI-BLOCK-053.json#driver:packages/character-sheet-runtime/character-sheet-hit-point-maximum.mbt.qnt#step:doProjectFighterLevelOne#trace:public-route=characterSheetHitPointMaximumProjection action=doProjectFighterLevelOne qRoute=hit-point-maximum-public-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-hit-point-maximum.mbt.qnt#step:doProjectFighterLevelTwo` | `tasks/target-replay-evidence/CRPI-BLOCK-053.json#driver:packages/character-sheet-runtime/character-sheet-hit-point-maximum.mbt.qnt#step:doProjectFighterLevelTwo#trace:public-route=characterSheetHitPointMaximumProjection action=doProjectFighterLevelTwo qRoute=hit-point-maximum-public-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-hit-point-maximum.mbt.qnt#step:doProjectWizardFighterMulticlass` | `tasks/target-replay-evidence/CRPI-BLOCK-053.json#driver:packages/character-sheet-runtime/character-sheet-hit-point-maximum.mbt.qnt#step:doProjectWizardFighterMulticlass#trace:public-route=characterSheetHitPointMaximumProjection action=doProjectWizardFighterMulticlass qRoute=hit-point-maximum-public-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-hit-point-maximum.mbt.qnt#step:doProjectMinimumHigherLevelGain` | `tasks/target-replay-evidence/CRPI-BLOCK-053.json#driver:packages/character-sheet-runtime/character-sheet-hit-point-maximum.mbt.qnt#step:doProjectMinimumHigherLevelGain#trace:public-route=characterSheetHitPointMaximumProjection action=doProjectMinimumHigherLevelGain qRoute=hit-point-maximum-public-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-hit-point-maximum.mbt.qnt#step:doProjectSorcererDraconicResilience` | `tasks/target-replay-evidence/CRPI-BLOCK-053.json#driver:packages/character-sheet-runtime/character-sheet-hit-point-maximum.mbt.qnt#step:doProjectSorcererDraconicResilience#trace:public-route=characterSheetHitPointMaximumProjection action=doProjectSorcererDraconicResilience qRoute=hit-point-maximum-public-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-hit-point-maximum.mbt.qnt#step:doProjectReducedEffectiveMaximum` | `tasks/target-replay-evidence/CRPI-BLOCK-053.json#driver:packages/character-sheet-runtime/character-sheet-hit-point-maximum.mbt.qnt#step:doProjectReducedEffectiveMaximum#trace:public-route=characterSheetHitPointMaximumProjection action=doProjectReducedEffectiveMaximum qRoute=hit-point-maximum-public-route` | `_none_` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-BLOCK-053.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id pattern: `public-route=characterSheetHitPointMaximumProjection action=<branchAction> qRoute=hit-point-maximum-public-route`
- The copied connector projection source is `packages/character-sheet-runtime/character-sheet-hit-point-maximum.route.mbt.qnt#qRoute`; the observed projection source is the public Character Sheet projection entrypoint `packages/character-sheet-runtime/src/hit-points.ts#characterSheetHitPointMaximumProjection`.

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-BLOCK-053/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 99.

RAW and ubiquitous-language review:

- SRD 5.2.1 `Character-Creation.md#Fill In Numbers` defines class and Constitution determining level 1 Hit Point maximum and recording Hit Points and Hit Point Dice on the Character Sheet.
- SRD 5.2.1 `Character-Creation.md#Gaining a Level` defines adding a Hit Die, Constitution modifier, and minimum 1 higher-level gain; it also defines Constitution modifier changes updating Hit Point maximum for each level.
- SRD 5.2.1 `Character-Creation.md#Hit Points and Hit Point Dice` defines multiclass Hit Points using after-level-1 class rules for later classes.
- SRD 5.2.1 `Playing-the-Game.md#Damage and Healing` defines current Hit Points bounded by Hit Point maximum and death when Hit Point maximum reaches 0 after maximum-reducing effects.
- SRD 5.2.1 `Rules-Glossary.md#Long Rest` defines reduced Hit Point maximum returning to normal on Long Rest, matching maximum reduction as sheet Hit Point state rather than normal maximum arithmetic.
- SRD 5.2.1 `Classes/Sorcerer.md#Level 3: Draconic Resilience` defines the Draconic Sorcery Hit Point maximum increase.
- `UBIQUITOUS_LANGUAGE.md` defines Hit Points, Hit Point Maximum, Temporary Hit Points, and Hit Die vocabulary used by this owner.

Verification results:

- Base check passed: declared base ref `ralph/cleanroom-character-sheet-route-lane-20260705T2045Z/integration` resolved to `2898b5e18 Merge Ralph task 98`; `HEAD` resolved to `6af572627 Mark Ralph task 98 done`; Base SHA `6af5726278a0d9813b8ac9483425382b774fb31b` is an ancestor of `HEAD`, so the task worktree remains based on the declared Base SHA even though the integration ref has advanced.
- RAW/ubiquitous-language review passed against SRD 5.2.1 Character Creation, Damage and Healing, Long Rest, Draconic Resilience, and `UBIQUITOUS_LANGUAGE.md`.
- Focused typecheck passed: `pnpm --filter @dnd/character-sheet-runtime typecheck`.
- Focused replay passed: `START=$(date +%s); ( MBT_TRACES=1 MBT_STEPS=6 pnpm --filter @dnd/character-sheet-runtime exec vitest run src/hit-point-maximum.mbt.test.ts src/reducer-route-connectors.mbt.test.ts -t "Hit Point maximum|routes Hit Point Maximum" ) 2>&1 & pid=$!; wait "$pid"; status=$?; echo "TOTAL: $(( $(date +%s) - START ))s"; exit "$status"` passed with 2 tests and 9 skipped in `TOTAL: 5s`.
- Final broad verification and JSON validation are recorded in `tasks/RUN_LEDGER.json`.
- Reviewer-loop convergence passed: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review checks found no remaining reasonable Task 99 findings after moving observed Hit Point Maximum `qRoute` events into the public `characterSheetHitPointMaximumProjection` entrypoint and recording split-audit export ownership.

## CRPI-BLOCK-052

Status: `pass`

- Task: 98
- Driver path: `packages/character-sheet-runtime/character-sheet-healing-resource-selected-identity.mbt.qnt`
- Route connector path: `packages/character-sheet-runtime/character-sheet-healing-resource-selected-identity.route.mbt.qnt`
- Route class: `reducer-routed`
- Accepted projection: `qRoute`
- Evidence file: `tasks/target-replay-evidence/CRPI-BLOCK-052.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/character-sheet-runtime/character-sheet-healing-resource-selected-identity.mbt.qnt`
- `packages/character-sheet-runtime/character-sheet-healing-resource-selected-identity.route.mbt.qnt`
- `packages/character-sheet-runtime/src/healing-resource-selected-identity.mbt.test.ts`
- `packages/character-sheet-runtime/src/reducer-route-connectors.mbt.test.ts`
- `packages/character-sheet-runtime/src/healing-rest-benefit.ts`
- `packages/character-sheet-runtime/src/sheet-types.ts`
- `packages/character-sheet-runtime/src/index.ts`
- `scripts/audit-character-sheet-runtime-split.mjs`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Classes/Paladin.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Lay On Hands healing-resource selected-identity route replay is accepted through
the public Character Sheet reducer route entrypoint. `applyLayOnHandsWithRoute`
delegates to the existing `applyLayOnHands` path, which spends the Lay On Hands
pool from `CharacterSheet.resourceExpenditures`, restores target Hit Points
through the Hit Point owner, and removes Poisoned from the existing
`CharacterSheet.conditions` list. The route result then returns the copied
feature-resource spend, Hit Point projection, and feature-resource spend fact
`qRoute` events. No parallel healing-resource, Hit Point, or condition-removal
ledger was introduced.

Generated branch coverage:

| Obligation | Evidence | Sampled inputs | Status |
| --- | --- | --- | --- |
| `packages/character-sheet-runtime/character-sheet-healing-resource-selected-identity.mbt.qnt#step:doLayOnHandsRestoreHpAndRemovePoisoned` | `tasks/target-replay-evidence/CRPI-BLOCK-052.json#driver:packages/character-sheet-runtime/character-sheet-healing-resource-selected-identity.mbt.qnt#step:doLayOnHandsRestoreHpAndRemovePoisoned#trace:public-route=applyLayOnHandsWithRoute action=doLayOnHandsRestoreHpAndRemovePoisoned qRoute=healing-resource-selected-identity-public-route` | `_none_` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-BLOCK-052.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id pattern: `public-route=applyLayOnHandsWithRoute action=doLayOnHandsRestoreHpAndRemovePoisoned qRoute=healing-resource-selected-identity-public-route`
- The copied connector projection source is `packages/character-sheet-runtime/character-sheet-healing-resource-selected-identity.route.mbt.qnt#qRoute`; the observed projection source is the public Character Sheet reducer route entrypoint `packages/character-sheet-runtime/src/healing-rest-benefit.ts#applyLayOnHandsWithRoute`.

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-BLOCK-052/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 98.

RAW and ubiquitous-language review:

- SRD 5.2.1 `Classes/Paladin.md#Level 1: Lay On Hands` defines the healing pool, pool spend to restore Hit Points, and 5-point spend to remove Poisoned without also restoring those points as Hit Points.
- SRD 5.2.1 `Playing-the-Game.md#Damage and Healing` defines restored Hit Points increasing current Hit Points without exceeding the Hit Point maximum.
- SRD 5.2.1 `Rules-Glossary.md#Poisoned [Condition]` defines Poisoned as a condition.
- `UBIQUITOUS_LANGUAGE.md` defines Pool, Spend, Hit Points, and Condition vocabulary used by this owner.

Verification results:

- Base check passed: declared base ref `ralph/cleanroom-character-sheet-route-lane-20260705T2045Z/integration` resolved to `25bc6f1b0 Mark Ralph task 97 done`; `HEAD` resolved to `25bc6f1b0 Mark Ralph task 97 done`; Base SHA `25bc6f1b0f3c0edfb18521c0e64d88ad24d421ff` is an ancestor of `HEAD`.
- RAW/ubiquitous-language review passed against SRD 5.2.1 Paladin Lay On Hands, Damage and Healing, Poisoned, and `UBIQUITOUS_LANGUAGE.md`.
- Focused typecheck passed: `pnpm --filter @dnd/character-sheet-runtime exec tsc --noEmit`.
- Focused replay command and final broad verification are recorded in `tasks/RUN_LEDGER.json`.
- Reviewer-loop convergence passed: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review checks found no remaining reasonable Task 98 findings after moving observed Lay On Hands `qRoute` events into the public `applyLayOnHandsWithRoute` entrypoint and recording split-audit export ownership.

## CRPI-BLOCK-051

Status: `pass`

- Task: 97
- Driver path: `packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.mbt.qnt`
- Route connector path: `packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.route.mbt.qnt`
- Route class: `reducer-routed`
- Accepted projection: `qRoute`
- Evidence file: `tasks/target-replay-evidence/CRPI-BLOCK-051.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.mbt.qnt`
- `packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.route.mbt.qnt`
- `packages/character-sheet-runtime/src/class-feature-selected-identity.mbt.test.ts`
- `packages/character-sheet-runtime/src/reducer-route-connectors.mbt.test.ts`
- `packages/character-sheet-runtime/src/class-feature-spells.ts`
- `packages/character-sheet-runtime/src/sheet-types.ts`
- `packages/character-sheet-runtime/src/index.ts`
- `scripts/audit-character-sheet-runtime-split.mjs`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Character-Creation.md`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
- `.references/srd-5.2.1/Classes/Bard.md`
- `.references/srd-5.2.1/Classes/Cleric.md`
- `.references/srd-5.2.1/Classes/Druid.md`
- `.references/srd-5.2.1/Classes/Paladin.md`
- `.references/srd-5.2.1/Classes/Ranger.md`
- `.references/srd-5.2.1/Classes/Sorcerer.md`
- `.references/srd-5.2.1/Classes/Warlock.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Class-feature selected-identity route replay is accepted through the public Character Sheet
projection-with-route entrypoint. `characterSheetClassFeatureSelectedReferenceProjection`
derives retained class-feature Unit ids and selected subclass/class-choice Unit ids from
existing `CharacterSheet.build` facts, then returns the selected-reference retention plus
selected-reference build-projection `qRoute` copied by the route connector. The Druid Circle
of the Land branch creates a sheet with the existing `CharacterSheet.druidCircleLand` fact
and reads that sheet-owned fact before projection. Selected identity remains retained
reference evidence; Ability Check and spell-access semantics remain derived by the existing
public projection functions.

Generated branch coverage:

| Obligation | Evidence | Sampled inputs | Status |
| --- | --- | --- | --- |
| `packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.mbt.qnt#step:doProjectBardJackOfAllTrades` | `tasks/target-replay-evidence/CRPI-BLOCK-051.json#driver:packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.mbt.qnt#step:doProjectBardJackOfAllTrades#trace:public-route=characterSheetClassFeatureSelectedReferenceProjection action=doProjectBardJackOfAllTrades qRoute=class-feature-selected-identity-public-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.mbt.qnt#step:doProjectClericLifeDomainSpells` | `tasks/target-replay-evidence/CRPI-BLOCK-051.json#driver:packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.mbt.qnt#step:doProjectClericLifeDomainSpells#trace:public-route=characterSheetClassFeatureSelectedReferenceProjection action=doProjectClericLifeDomainSpells qRoute=class-feature-selected-identity-public-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.mbt.qnt#step:doProjectDruidCircleLandSpells` | `tasks/target-replay-evidence/CRPI-BLOCK-051.json#driver:packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.mbt.qnt#step:doProjectDruidCircleLandSpells#trace:public-route=characterSheetClassFeatureSelectedReferenceProjection action=doProjectDruidCircleLandSpells qRoute=class-feature-selected-identity-public-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.mbt.qnt#step:doProjectPaladinOathDevotionSpells` | `tasks/target-replay-evidence/CRPI-BLOCK-051.json#driver:packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.mbt.qnt#step:doProjectPaladinOathDevotionSpells#trace:public-route=characterSheetClassFeatureSelectedReferenceProjection action=doProjectPaladinOathDevotionSpells qRoute=class-feature-selected-identity-public-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.mbt.qnt#step:doProjectPaladinsSmite` | `tasks/target-replay-evidence/CRPI-BLOCK-051.json#driver:packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.mbt.qnt#step:doProjectPaladinsSmite#trace:public-route=characterSheetClassFeatureSelectedReferenceProjection action=doProjectPaladinsSmite qRoute=class-feature-selected-identity-public-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.mbt.qnt#step:doProjectRangerFavoredEnemy` | `tasks/target-replay-evidence/CRPI-BLOCK-051.json#driver:packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.mbt.qnt#step:doProjectRangerFavoredEnemy#trace:public-route=characterSheetClassFeatureSelectedReferenceProjection action=doProjectRangerFavoredEnemy qRoute=class-feature-selected-identity-public-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.mbt.qnt#step:doProjectSorcererDraconicSpells` | `tasks/target-replay-evidence/CRPI-BLOCK-051.json#driver:packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.mbt.qnt#step:doProjectSorcererDraconicSpells#trace:public-route=characterSheetClassFeatureSelectedReferenceProjection action=doProjectSorcererDraconicSpells qRoute=class-feature-selected-identity-public-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.mbt.qnt#step:doProjectWarlockFiendSpells` | `tasks/target-replay-evidence/CRPI-BLOCK-051.json#driver:packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.mbt.qnt#step:doProjectWarlockFiendSpells#trace:public-route=characterSheetClassFeatureSelectedReferenceProjection action=doProjectWarlockFiendSpells qRoute=class-feature-selected-identity-public-route` | `_none_` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-BLOCK-051.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id pattern: `public-route=characterSheetClassFeatureSelectedReferenceProjection action=<branchAction> qRoute=class-feature-selected-identity-public-route`
- The copied connector projection source is `packages/character-sheet-runtime/character-sheet-class-feature-selected-identity.route.mbt.qnt#qRoute`; the observed projection source is the public Character Sheet projection-with-route entrypoint `packages/character-sheet-runtime/src/class-feature-spells.ts#characterSheetClassFeatureSelectedReferenceProjection`.

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-BLOCK-051/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 97.

RAW and ubiquitous-language review:

- SRD 5.2.1 `Character-Creation.md#Record Class Features` defines recording class features and making feature choices on the Character Sheet.
- SRD 5.2.1 `Spells/Gaining-and-Casting.md#Always-Prepared Spells` defines feature-granted always-prepared Spell Access.
- SRD 5.2.1 class passages for Bard, Cleric, Druid, Paladin, Ranger, Sorcerer, and Warlock define the in-scope class-feature and subclass Spell Access / class-feature facts.
- SRD 5.2.1 `Classes/Druid.md#Level 3: Circle of the Land Spells` defines choosing land after a Long Rest and having listed spells prepared for Druid level and lower.
- `UBIQUITOUS_LANGUAGE.md` defines Character Sheet, Class, Spell Access, and class-feature vocabulary used by this owner.

Verification results:

- Base check passed: declared base ref `ralph/cleanroom-character-sheet-route-lane-20260705T2045Z/integration` initially resolved to `d86cb814a Mark Ralph task 96 done`; `HEAD` resolved to `d86cb814a Mark Ralph task 96 done`; Base SHA `d86cb814ad82069a5d945265c6c0dcd9a72d1e71` is an ancestor of `HEAD`.
- RAW/ubiquitous-language review passed against SRD 5.2.1 Character Creation, spell access, in-scope class passages, Druid Circle of the Land, and `UBIQUITOUS_LANGUAGE.md`.
- Focused typecheck passed: `pnpm --filter @dnd/character-sheet-runtime typecheck`.
- Focused replay passed: `START=$(date +%s); ( MBT_TRACES=1 MBT_STEPS=1 pnpm --filter @dnd/character-sheet-runtime exec vitest run src/class-feature-selected-identity.mbt.test.ts src/reducer-route-connectors.mbt.test.ts -t "class-feature selected identity|routes in-scope class-feature" ) 2>&1 & pid=$!; wait "$pid"; status=$?; echo "TOTAL: $(( $(date +%s) - START ))s"; exit "$status"` passed with 4 tests and 9 skipped in `TOTAL: 9s`.
- JSON validation passed for `tasks/target-replay-evidence/CRPI-BLOCK-051.json`, `tasks/RUN_LEDGER.json`, `tasks/ENGINE_DEPTH_MANIFEST.json`, and `tasks/STATE_OWNER_MANIFEST.json`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `pnpm check:character-sheet-runtime-split` passed after recording ownership for the class-feature selected-reference projection exports.
- Requested broad verification passed: `pnpm quality`. App lint emitted 61 warnings and exited 0; all quality gates and typecheck passed.
- `git diff --check` passed.
- Reviewer-loop convergence passed: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review checks found no remaining reasonable Task 97 findings after moving observed class-feature selected-reference `qRoute` events into the public projection-with-route entrypoint and recording split-audit export ownership.

## CRPI-BLOCK-050

Status: `pass`

- Task: 96
- Driver path: `packages/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.mbt.qnt`
- Route connector path: `packages/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.route.mbt.qnt`
- Route class: `reducer-routed`
- Accepted projection: `qRoute`
- Evidence file: `tasks/target-replay-evidence/CRPI-BLOCK-050.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`

Allowed inputs used:

- `packages/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.mbt.qnt`
- `packages/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.route.mbt.qnt`
- `packages/character-sheet-runtime/src/armor-class-base-selected-identity.mbt.test.ts`
- `packages/character-sheet-runtime/src/reducer-route-connectors.mbt.test.ts`
- `packages/character-sheet-runtime/src/armor-class.test.ts`
- `packages/character-sheet-runtime/src/test-support.ts`
- `packages/character-sheet-runtime/src/armor-class.ts`
- `packages/character-sheet-runtime/src/sheet-types.ts`
- `packages/character-sheet-runtime/src/index.ts`
- `scripts/audit-character-sheet-runtime-split.mjs`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Character-Creation.md`
- `.references/srd-5.2.1/Equipment.md`
- `.references/srd-5.2.1/Classes/Barbarian.md`
- `.references/srd-5.2.1/Classes/Monk.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Armor Class base selected-identity route replay is accepted through the public
Character Sheet projection-with-route entrypoint. `characterSheetArmorClassProjection`
derives semantic Armor Class state through `characterSheetArmorClassState`,
returns the current Armor Class, and exposes the public selected-reference
retention plus Armor Class build-projection `qRoute` events. The route harness
now calls that public projection for selected Barbarian Unarmored Defense,
Barbarian Unarmored Defense with Shield, selected Monk Unarmored Defense, Light
Armor, Medium Armor with Dexterity cap, and Heavy Armor with Shield. Selected
identity remains retained reference evidence; production behavior derives from
CharacterBuild progression, equipment loadout, ability scores, armor training,
and typed Surface armor / class-feature mechanics.

Generated branch coverage:

| Obligation | Evidence | Sampled inputs | Status |
| --- | --- | --- | --- |
| `packages/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.mbt.qnt#step:doProjectHeavyArmorWithShield` | `tasks/target-replay-evidence/CRPI-BLOCK-050.json#driver:packages/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.mbt.qnt#step:doProjectHeavyArmorWithShield#trace:public-route=characterSheetArmorClassProjection action=doProjectHeavyArmorWithShield qRoute=armor-class-base-selected-identity-public-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.mbt.qnt#step:doProjectLightArmor` | `tasks/target-replay-evidence/CRPI-BLOCK-050.json#driver:packages/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.mbt.qnt#step:doProjectLightArmor#trace:public-route=characterSheetArmorClassProjection action=doProjectLightArmor qRoute=armor-class-base-selected-identity-public-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.mbt.qnt#step:doProjectMediumArmorDexCap` | `tasks/target-replay-evidence/CRPI-BLOCK-050.json#driver:packages/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.mbt.qnt#step:doProjectMediumArmorDexCap#trace:public-route=characterSheetArmorClassProjection action=doProjectMediumArmorDexCap qRoute=armor-class-base-selected-identity-public-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.mbt.qnt#step:doSelectBarbarianUnarmoredDefense` | `tasks/target-replay-evidence/CRPI-BLOCK-050.json#driver:packages/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.mbt.qnt#step:doSelectBarbarianUnarmoredDefense#trace:public-route=characterSheetArmorClassProjection action=doSelectBarbarianUnarmoredDefense qRoute=armor-class-base-selected-identity-public-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.mbt.qnt#step:doSelectBarbarianUnarmoredDefenseWithShield` | `tasks/target-replay-evidence/CRPI-BLOCK-050.json#driver:packages/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.mbt.qnt#step:doSelectBarbarianUnarmoredDefenseWithShield#trace:public-route=characterSheetArmorClassProjection action=doSelectBarbarianUnarmoredDefenseWithShield qRoute=armor-class-base-selected-identity-public-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.mbt.qnt#step:doSelectMonkUnarmoredDefense` | `tasks/target-replay-evidence/CRPI-BLOCK-050.json#driver:packages/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.mbt.qnt#step:doSelectMonkUnarmoredDefense#trace:public-route=characterSheetArmorClassProjection action=doSelectMonkUnarmoredDefense qRoute=armor-class-base-selected-identity-public-route` | `_none_` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-BLOCK-050.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id pattern: `public-route=characterSheetArmorClassProjection action=<branchAction> qRoute=armor-class-base-selected-identity-public-route`
- The copied connector projection source is `packages/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.route.mbt.qnt#qRoute`; the observed projection source is the public Character Sheet projection-with-route entrypoint `packages/character-sheet-runtime/src/armor-class.ts#characterSheetArmorClassProjection`, which returns selected-reference retention and Armor Class projection `qRoute` after deriving the semantic projection through `packages/character-sheet-runtime/src/armor-class.ts#characterSheetArmorClassState`.

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-BLOCK-050/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 96.

RAW and ubiquitous-language review:

- SRD 5.2.1 `Playing-the-Game.md#Armor Class` defines Armor Class as the combat target number appearing on character sheets and stat blocks.
- SRD 5.2.1 `Character-Creation.md#Armor Class` defines default unarmored Armor Class, Equipment-derived Armor Class, class-feature alternatives, and the one-base-calculation-at-a-time multiclass rule.
- SRD 5.2.1 `Equipment.md#Armor Class (AC)` and `#Shield` define armor base AC formulas and the trained Shield benefit.
- SRD 5.2.1 `Classes/Barbarian.md#Level 1: Unarmored Defense` and `Classes/Monk.md#Level 1: Unarmored Defense` define the class-feature base Armor Class formulas and Shield interaction.
- `UBIQUITOUS_LANGUAGE.md` defines Armor Class, Armor Category, Unarmored Defense, and Character Sheet terms used by this owner.

Verification results:

- Base check passed: declared base ref `ralph/cleanroom-character-sheet-route-lane-20260705T2045Z/integration` resolved to `ccdc8a46f Mark Ralph task 95 done`; `HEAD` resolved to `ccdc8a46f Mark Ralph task 95 done`; Base SHA `ccdc8a46fcd4d04bfdf888faf602f524528cbc35` is an ancestor of `HEAD`.
- RAW/ubiquitous-language review passed against SRD 5.2.1 Armor Class, equipment Armor Class and Shield, Barbarian and Monk Unarmored Defense, and `UBIQUITOUS_LANGUAGE.md`.
- Focused typecheck passed: `pnpm --filter @dnd/character-sheet-runtime typecheck`.
- Focused replay passed: `START=$(date +%s); ( MBT_TRACES=1 MBT_STEPS=1 pnpm --filter @dnd/character-sheet-runtime exec vitest run src/armor-class.test.ts src/armor-class-base-selected-identity.mbt.test.ts src/reducer-route-connectors.mbt.test.ts -t "Armor Class|routes Armor Class" ) 2>&1 & pid=$!; wait "$pid"; status=$?; echo "TOTAL: $(( $(date +%s) - START ))s"; exit "$status"` passed with 10 tests and 12 skipped in `TOTAL: 4s`.
- JSON validation passed for `tasks/target-replay-evidence/CRPI-BLOCK-050.json`, `tasks/ENGINE_DEPTH_MANIFEST.json`, and `tasks/STATE_OWNER_MANIFEST.json`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- First `pnpm quality` run found the Task 96 export surface was missing from `scripts/audit-character-sheet-runtime-split.mjs`; after adding the three export ownership records, `pnpm check:character-sheet-runtime-split` passed.
- Requested broad verification passed: `pnpm quality`. App lint emitted 61 warnings and exited 0; all quality gates and typecheck passed.
- `git diff --check` passed.
- Reviewer-loop convergence passed: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review checks found no remaining reasonable Task 96 findings after moving observed Armor Class `qRoute` events into the public projection-with-route entrypoint and recording the split-audit export ownership.

## CRPI-BLOCK-049

Status: `pass`

- Task: 95
- Driver path: `packages/character-sheet-runtime/character-sheet-arcane-recovery-selected-identity.mbt.qnt`
- Route connector path: `packages/character-sheet-runtime/character-sheet-arcane-recovery-selected-identity.route.mbt.qnt`
- Route class: `reducer-routed`
- Accepted projection: `qRoute`
- Evidence file: `tasks/target-replay-evidence/CRPI-BLOCK-049.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`

Allowed inputs used:

- `packages/character-sheet-runtime/character-sheet-arcane-recovery-selected-identity.mbt.qnt`
- `packages/character-sheet-runtime/character-sheet-arcane-recovery-selected-identity.route.mbt.qnt`
- `packages/character-sheet-runtime/src/arcane-recovery-selected-identity.mbt.test.ts`
- `packages/character-sheet-runtime/src/reducer-route-connectors.mbt.test.ts`
- `packages/character-sheet-runtime/src/rests.test.ts`
- `packages/character-sheet-runtime/src/test-support.ts`
- `packages/character-sheet-runtime/src/rests.ts`
- `packages/character-sheet-runtime/src/healing-rest-benefit.ts`
- `packages/character-sheet-runtime/src/sheet-types.ts`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Classes/Wizard.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Arcane Recovery selected-identity route replay is accepted through public
Character Sheet rest-with-route entrypoints. `completeShortRestArcaneRecoveryWithRoute`
uses the same Short Rest benefit pipeline as the existing reducer and consumes
the Arcane Recovery typed owner classification before returning a copied
`qRoute` projection. Feature-use lockout failures route to Feature Resource,
ordinary refund failures route to Spell Slot, and only pact-slot-shaped
shortages route to Pact Slot. `completeLongRestArcaneRecoveryResetWithRoute`
calls the existing Long Rest reducer and returns the reset `qRoute` projection
only when the starting sheet proves an Arcane Recovery spell-resource reset
occurred; unrelated successful Long Rests return a no-route result.
The ordinary Spell Slot over-refund boundary now treats a build-known but
unexpended ordinary slot as "more Spell Slots than are expended" rather than an
unknown slot level.

Generated branch coverage:

| Obligation | Evidence | Sampled inputs | Status |
| --- | --- | --- | --- |
| `packages/character-sheet-runtime/character-sheet-arcane-recovery-selected-identity.mbt.qnt#step:doRecoverSecondLevelSpellSlot` | `tasks/target-replay-evidence/CRPI-BLOCK-049.json#driver:packages/character-sheet-runtime/character-sheet-arcane-recovery-selected-identity.mbt.qnt#step:doRecoverSecondLevelSpellSlot#trace:public-route=characterSheetArcaneRecovery action=doRecoverSecondLevelSpellSlot qRoute=arcane-recovery-selected-identity-public-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-arcane-recovery-selected-identity.mbt.qnt#step:doRejectPactSlotArcaneRecovery` | `tasks/target-replay-evidence/CRPI-BLOCK-049.json#driver:packages/character-sheet-runtime/character-sheet-arcane-recovery-selected-identity.mbt.qnt#step:doRejectPactSlotArcaneRecovery#trace:public-route=characterSheetArcaneRecovery action=doRejectPactSlotArcaneRecovery qRoute=arcane-recovery-selected-identity-public-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-arcane-recovery-selected-identity.mbt.qnt#step:doResetArcaneRecoveryOnLongRest` | `tasks/target-replay-evidence/CRPI-BLOCK-049.json#driver:packages/character-sheet-runtime/character-sheet-arcane-recovery-selected-identity.mbt.qnt#step:doResetArcaneRecoveryOnLongRest#trace:public-route=characterSheetArcaneRecovery action=doResetArcaneRecoveryOnLongRest qRoute=arcane-recovery-selected-identity-public-route` | `_none_` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-BLOCK-049.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id pattern: `public-route=characterSheetArcaneRecovery action=<branchAction> qRoute=arcane-recovery-selected-identity-public-route`
- The copied connector projection source is `packages/character-sheet-runtime/character-sheet-arcane-recovery-selected-identity.route.mbt.qnt#qRoute`; the observed projection source is the public Character Sheet rest-with-route entrypoints `packages/character-sheet-runtime/src/rests.ts#completeShortRestArcaneRecoveryWithRoute` and `packages/character-sheet-runtime/src/rests.ts#completeLongRestArcaneRecoveryResetWithRoute`.

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-BLOCK-049/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 95.

RAW and ubiquitous-language review:

- SRD 5.2.1 `Classes/Wizard.md#Level 1: Arcane Recovery` defines recovering expended Spell Slots after a Short Rest, the half-Wizard-level rounded-up combined-level cap, the level 6+ exclusion, and Long Rest reset.
- SRD 5.2.1 `Rules-Glossary.md#Short Rest` and `#Long Rest` define the rest completion boundaries and special-feature recharge hooks.
- `UBIQUITOUS_LANGUAGE.md` defines Pool, Refund, Short Rest, Long Rest, Spell Slot, Pact Slot, and Character Sheet owner vocabulary used by this route.

Verification results:

- Base check passed: declared base ref `ralph/cleanroom-character-sheet-route-lane-20260705T2045Z/integration` resolved to `cbd50121f Mark Ralph task 94 done`; `HEAD` resolved to `cbd50121f Mark Ralph task 94 done`; Base SHA `cbd50121fdb591220bd3a097f418864357fa3ec3` is an ancestor of `HEAD`.
- RAW/ubiquitous-language review passed against SRD 5.2.1 Wizard Arcane Recovery, Short Rest, Long Rest, and `UBIQUITOUS_LANGUAGE.md`.
- Focused route regression tests passed: `pnpm --filter @dnd/character-sheet-runtime exec vitest run src/rests.test.ts` passed with 21 tests.
- Focused MBT replay passed: `START=$(date +%s); ( MBT_TRACES=1 MBT_STEPS=1 pnpm --filter @dnd/character-sheet-runtime exec vitest run src/arcane-recovery-selected-identity.mbt.test.ts src/reducer-route-connectors.mbt.test.ts -t "Arcane Recovery|routes in-scope Arcane Recovery" ) 2>&1 & pid=$!; wait "$pid"; status=$?; echo "TOTAL: $(( $(date +%s) - START ))s"; exit "$status"` passed with 3 tests in `TOTAL: 4s`.
- `pnpm --filter @dnd/character-sheet-runtime typecheck` passed.
- `pnpm cleanroom-branch-coverage:check`, `git diff --check`, and `pnpm quality` are recorded in the run ledger for this task.
- Reviewer-loop convergence passed: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review checks found no remaining reasonable Task 95 findings after the over-refund boundary fix, public route projection update, and revision-round 3 owner-boundary tightening.

## CRPI-BLOCK-048

Status: `pass`

- Task: 94
- Driver path: `packages/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.mbt.qnt`
- Route connector path: `packages/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.route.mbt.qnt`
- Route class: `reducer-routed`
- Accepted projection: `qRoute`
- Evidence file: `tasks/target-replay-evidence/CRPI-BLOCK-048.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`

Allowed inputs used:

- `packages/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.mbt.qnt`
- `packages/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.route.mbt.qnt`
- `packages/character-sheet-runtime/src/reducer-route-connectors.mbt.test.ts`
- `packages/character-sheet-runtime/src/ability-checks.ts`
- `packages/character-sheet-runtime/src/sheet-types.ts`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `.references/srd-5.2.1/Classes/Bard.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Ability Check Proficiency Bonus route replay is accepted through the public
Character Sheet projection-with-route entrypoint. The route harness now calls
`characterSheetAbilityCheckProficiencyBonusProjection`, which derives the
semantic projection through `characterSheetAbilityCheckProficiencyBonus` and
returns the public `qRoute` event for Jack of All Trades, rounded
half-Proficiency-Bonus, skill proficiency, Expertise, the typed
other-Proficiency-Bonus exclusion, and missing Jack of All Trades feature cases.
Production behavior continues to derive from `CharacterBuild` progression,
proficiency choices, feature grants, total level, and typed other-bonus facts;
no sheet-local proficiency, Expertise, Jack of All Trades, level, or Proficiency
Bonus ledger was added.

Generated branch coverage:

| Obligation | Evidence | Sampled inputs | Status |
| --- | --- | --- | --- |
| `packages/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.mbt.qnt#step:doProjectExpertise` | `tasks/target-replay-evidence/CRPI-BLOCK-048.json#driver:packages/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.mbt.qnt#step:doProjectExpertise#trace:reducer-route=SheetAbilityCheckProjectionRouteSubject action=doProjectExpertise qRoute=character-sheet-ability-check-proficiency-bonus-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.mbt.qnt#step:doProjectJackOfAllTradesLevelTwo` | `tasks/target-replay-evidence/CRPI-BLOCK-048.json#driver:packages/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.mbt.qnt#step:doProjectJackOfAllTradesLevelTwo#trace:reducer-route=SheetAbilityCheckProjectionRouteSubject action=doProjectJackOfAllTradesLevelTwo qRoute=character-sheet-ability-check-proficiency-bonus-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.mbt.qnt#step:doProjectJackOfAllTradesRoundedDown` | `tasks/target-replay-evidence/CRPI-BLOCK-048.json#driver:packages/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.mbt.qnt#step:doProjectJackOfAllTradesRoundedDown#trace:reducer-route=SheetAbilityCheckProjectionRouteSubject action=doProjectJackOfAllTradesRoundedDown qRoute=character-sheet-ability-check-proficiency-bonus-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.mbt.qnt#step:doProjectSkillProficiency` | `tasks/target-replay-evidence/CRPI-BLOCK-048.json#driver:packages/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.mbt.qnt#step:doProjectSkillProficiency#trace:reducer-route=SheetAbilityCheckProjectionRouteSubject action=doProjectSkillProficiency qRoute=character-sheet-ability-check-proficiency-bonus-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.mbt.qnt#step:doRejectMissingBardLevelTwo` | `tasks/target-replay-evidence/CRPI-BLOCK-048.json#driver:packages/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.mbt.qnt#step:doRejectMissingBardLevelTwo#trace:reducer-route=SheetAbilityCheckProjectionRouteSubject action=doRejectMissingBardLevelTwo qRoute=character-sheet-ability-check-proficiency-bonus-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.mbt.qnt#step:doRejectOtherProficiencyBonus` | `tasks/target-replay-evidence/CRPI-BLOCK-048.json#driver:packages/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.mbt.qnt#step:doRejectOtherProficiencyBonus#trace:reducer-route=SheetAbilityCheckProjectionRouteSubject action=doRejectOtherProficiencyBonus qRoute=character-sheet-ability-check-proficiency-bonus-route` | `_none_` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-BLOCK-048.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id pattern: `reducer-route=SheetAbilityCheckProjectionRouteSubject action=<branchAction> qRoute=character-sheet-ability-check-proficiency-bonus-route`
- The copied connector projection source is `packages/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.route.mbt.qnt#qRoute`; the observed projection source is the public Character Sheet projection-with-route entrypoint `packages/character-sheet-runtime/src/ability-checks.ts#characterSheetAbilityCheckProficiencyBonusProjection`, which returns the Ability Check Proficiency Bonus `qRoute` event after deriving the semantic projection through `packages/character-sheet-runtime/src/ability-checks.ts#characterSheetAbilityCheckProficiencyBonus`.

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-BLOCK-048/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 94.

RAW and ubiquitous-language review:

- SRD 5.2.1 `Playing-the-Game.md#Ability Checks` and `#Proficiency Bonus` define adding Proficiency Bonus to relevant ability checks and limiting duplicate/multiplied Proficiency Bonus application.
- SRD 5.2.1 `Playing-the-Game.md#Skill Proficiencies` and `Rules-Glossary.md#Skill` define skill proficiency as a specialization that adds Proficiency Bonus to related ability checks.
- SRD 5.2.1 `Rules-Glossary.md#Expertise` defines doubled Proficiency Bonus for a proficient skill check unless doubled by another feature.
- SRD 5.2.1 `Classes/Bard.md#Level 2: Jack of All Trades` defines half Proficiency Bonus, rounded down, for ability checks using skill proficiencies the character lacks and that do not otherwise use Proficiency Bonus.
- `UBIQUITOUS_LANGUAGE.md` defines Ability Check, Proficiency Bonus, Expertise, Skill, and Character Sheet terms used by the owner.

Verification results:

- Base check passed: declared base ref `master` resolved to `7aa3d93d5 Unblock character sheet route replay tasks`; `HEAD` resolved to `7aa3d93d5 Unblock character sheet route replay tasks`; Base SHA `7aa3d93d5d2f5ace00e7b2abbd5e4c19337cee34` is an ancestor of `HEAD`.
- RAW/ubiquitous-language review passed against SRD 5.2.1 Ability Checks, Proficiency Bonus, Skill Proficiencies, Expertise, Bard Jack of All Trades, and `UBIQUITOUS_LANGUAGE.md`.
- Target replay evidence artifact for CRPI-BLOCK-048 covers 6 Ability Check Proficiency Bonus `qRoute` obligations and records the public Character Sheet projection-with-route entrypoint path that returns the observed route event.
- JSON validation passed for `tasks/target-replay-evidence/CRPI-BLOCK-048.json`, `tasks/ENGINE_DEPTH_MANIFEST.json`, and `tasks/STATE_OWNER_MANIFEST.json`.
- Scoped target evidence validation passed: `node scoped validateTargetReplayEvidence for CRPI-BLOCK-048 Ability Check Proficiency Bonus driver` covered 6 Task 94 obligations.
- Focused MBT replay passed after the public projection-with-route update: `START=$(date +%s); ( pnpm --filter @dnd/character-sheet-runtime exec vitest run src/ability-check-proficiency-bonus.mbt.test.ts src/reducer-route-connectors.mbt.test.ts -t "Ability Check Proficiency Bonus|Ability Check" ) 2>&1 & pid=$!; wait "$pid"; status=$?; echo "TOTAL: $(( $(date +%s) - START ))s"; exit "$status"` passed with 2 tests in `TOTAL: 5s`.
- `pnpm --filter @dnd/character-sheet-runtime typecheck` passed after adding `characterSheetAbilityCheckProficiencyBonusProjection`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- Requested broad verification passed: `pnpm quality`. App lint emitted 61 warnings and exited 0; all quality gates and typecheck passed.
- Reviewer-loop convergence passed: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review checks found no remaining reasonable Task 94 findings after moving the observed Ability Check `qRoute` event into the public projection-with-route entrypoint.

## CRPI-BLOCK-031

Status: `pass`

- Task: 59
- Driver path: `packages/battle-runtime/battle-runtime-stat-block-size-gated-condition-rider.mbt.qnt`
- Route connector path: `packages/battle-runtime/battle-runtime-stat-block-size-gated-condition-rider.route.mbt.qnt`
- Route class: `reducer-routed`
- Accepted projection: `qRoute`
- Evidence file: `tasks/target-replay-evidence/CRPI-BLOCK-031.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-stat-block-size-gated-condition-rider.mbt.qnt`
- `packages/battle-runtime/battle-runtime-stat-block-size-gated-condition-rider.route.mbt.qnt`
- `packages/battle-runtime/src/stat-block-size-gated-condition-rider.mbt.test.ts`
- `packages/battle-runtime/src/battle-reducer/actions.ts`
- `packages/battle-runtime/src/battle-reducer/attack-main.ts`
- `packages/battle-runtime/src/battle-reducer/statblock-attacks.ts`
- `packages/battle-runtime/src/battle-reducer/statblock-attack-hit-condition-riders.ts`
- `packages/battle-runtime/src/battle-reducer/damage-apply.ts`
- `packages/battle-runtime/src/statblock-attack-hit-condition-support.ts`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `.references/srd-5.2.1/Monsters/Overview.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Stat Block size-gated condition rider route replay is accepted through the
existing public battle reducer route for `StatBlockActionRouteSubject`. The
target harness records copied connector `qRoute` events from
`startBattleRight` and `resolveBattleSubject` while resolving target choice, hit
attack roll, Prone condition-rider lifecycle, rolled damage dice, and target
Hit Point updates. Production behavior reuses existing Stat Block action
dispatch, target-selection, condition-lifecycle, creature-state input facts,
and Hit Point owners; no alternate target Size, immunity, condition, damage, or
HP ledger was added.

Generated branch coverage:

| Obligation | Evidence | Sampled inputs | Status |
| --- | --- | --- | --- |
| `packages/battle-runtime/battle-runtime-stat-block-size-gated-condition-rider.mbt.qnt#step:doFillHitAttackRoll` | `tasks/target-replay-evidence/CRPI-BLOCK-031.json#driver:packages/battle-runtime/battle-runtime-stat-block-size-gated-condition-rider.mbt.qnt#step:doFillHitAttackRoll#trace:reducer-route=StatBlockActionRouteSubject action=doFillHitAttackRoll target=mediumOrSmaller qRoute=stat-block-size-gated-condition-rider-route` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-stat-block-size-gated-condition-rider.mbt.qnt#step:doFillTargetChoice` | `tasks/target-replay-evidence/CRPI-BLOCK-031.json#driver:packages/battle-runtime/battle-runtime-stat-block-size-gated-condition-rider.mbt.qnt#step:doFillTargetChoice#trace:reducer-route=StatBlockActionRouteSubject action=doFillTargetChoice target=mediumOrSmaller qRoute=stat-block-size-gated-condition-rider-route` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-stat-block-size-gated-condition-rider.mbt.qnt#step:doResolveDamage` | `tasks/target-replay-evidence/CRPI-BLOCK-031.json#driver:packages/battle-runtime/battle-runtime-stat-block-size-gated-condition-rider.mbt.qnt#step:doResolveDamage#trace:reducer-route=StatBlockActionRouteSubject action=doResolveDamage target=mediumOrSmaller qRoute=stat-block-size-gated-condition-rider-route` | `_none_` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-BLOCK-031.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id pattern: `reducer-route=StatBlockActionRouteSubject action=<branchAction> target=<targetSizeGate> qRoute=stat-block-size-gated-condition-rider-route`
- The copied connector projection source is `packages/battle-runtime/battle-runtime-stat-block-size-gated-condition-rider.route.mbt.qnt#qRoute`; the observed projection source is the target route driver `packages/battle-runtime/src/stat-block-size-gated-condition-rider.mbt.test.ts#createSizeGatedConditionRiderRouteDriver`, which calls `resolveBattleSubject` through the public battle reducer surface.

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-BLOCK-031/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 59.

RAW and ubiquitous-language review:

- SRD 5.2.1 `Playing-the-Game.md#Attack Rolls` defines attack-roll resolution after target choice.
- SRD 5.2.1 `Playing-the-Game.md#Creature Size` and `Rules-Glossary.md#Size` define creature Size as a creature combat fact.
- SRD 5.2.1 `Rules-Glossary.md#Prone [Condition]` defines Prone as a condition on a creature.
- SRD 5.2.1 `Playing-the-Game.md#Damage Rolls` and `#Hit Points` define damage reducing a creature's Hit Points after damage is determined.
- SRD 5.2.1 `Rules-Glossary.md#Stat Block` and `Monsters/Overview.md#Parts of a Stat Block` define monster Actions, Attack Notation, Damage Notation, Multiattack, and Recharge notation.
- `UBIQUITOUS_LANGUAGE.md` defines Creature, Attack Roll, Damage, Hit Points, Stat Block, Multiattack, Recharge, and Condition terms used by the route owners.

Verification results:

- Base check passed: declared base ref `master` resolved to `831184e64 Merge Ralph task 58`; `HEAD` resolved to `d2a5f13f2 Mark Ralph task 58 done`; Base SHA `d2a5f13f219e20a540396278a75bcb1d37dad799` is an ancestor of `HEAD`.
- RAW/ubiquitous-language review passed against SRD 5.2.1 attack, damage, Hit Points, Creature Size, Prone, Stat Block, Attack Notation, Damage Notation, Multiattack, Recharge, and `UBIQUITOUS_LANGUAGE.md`.
- Target replay evidence artifact for CRPI-BLOCK-031 covers 3 route-required Stat Block size-gated condition rider `qRoute` obligations and records public reducer route owners for target selection, condition lifecycle, and HP updates.
- JSON validation passed for `tasks/target-replay-evidence/CRPI-BLOCK-031.json`, `tasks/ENGINE_DEPTH_MANIFEST.json`, and `tasks/STATE_OWNER_MANIFEST.json`.
- Scoped target evidence validation passed: `node scoped validateTargetReplayEvidence for CRPI-BLOCK-031 stat-block size-gated condition rider driver` covered 3 Task 59 obligations.
- Focused MBT replay passed: `START=$(date +%s); ( cd packages/battle-runtime && MBT_TRACES=1 MBT_STEPS=3 pnpm exec vitest run src/stat-block-size-gated-condition-rider.mbt.test.ts ) 2>&1 & pid=$!; wait "$pid"; status=$?; echo "TOTAL: $(( $(date +%s) - START ))s"; exit "$status"` passed with 6 tests in `TOTAL: 16s`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- Requested broad verification passed: `pnpm quality`. App lint emitted 61 warnings and exited 0; all quality gates and typecheck passed.
- Reviewer-loop convergence passed: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review checks found no remaining reasonable Task 59 findings before broad verification.

## CRPI-BLOCK-030

Status: `pass`

- Task: 58
- Driver path: `packages/battle-runtime/battle-runtime-stat-block-multi-damage.mbt.qnt`
- Route connector path: `packages/battle-runtime/battle-runtime-stat-block-multi-damage.route.mbt.qnt`
- Route class: `reducer-routed`
- Accepted projection: `qRoute`
- Evidence file: `tasks/target-replay-evidence/CRPI-BLOCK-030.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-stat-block-multi-damage.mbt.qnt`
- `packages/battle-runtime/battle-runtime-stat-block-multi-damage.route.mbt.qnt`
- `packages/battle-runtime/src/stat-block-multi-damage.mbt.test.ts`
- `packages/battle-runtime/src/battle-reducer/actions.ts`
- `packages/battle-runtime/src/battle-reducer/attack-main.ts`
- `packages/battle-runtime/src/battle-reducer/damage-apply.ts`
- `packages/battle-runtime/src/battle-reducer/statblock-attacks.ts`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `.references/srd-5.2.1/Monsters/Overview.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Stat Block multi-damage route replay is accepted through the existing public
battle reducer route for `StatBlockActionRouteSubject`. The target harness
records copied connector `qRoute` events from `startBattleRight`,
`discoverBattleActs`, and `resolveBattleSubject` while resolving target choice, hit attack roll, rolled
damage dice, static damage notation, and target Hit Point updates. Production
behavior reuses existing Stat Block action dispatch, target-selection,
attack-roll, and Hit Point owners; no alternate damage accumulator or HP ledger
was added.

Generated branch coverage:

| Obligation | Evidence | Sampled inputs | Status |
| --- | --- | --- | --- |
| `packages/battle-runtime/battle-runtime-stat-block-multi-damage.mbt.qnt#step:doFillHitAttackRoll` | `tasks/target-replay-evidence/CRPI-BLOCK-030.json#driver:packages/battle-runtime/battle-runtime-stat-block-multi-damage.mbt.qnt#step:doFillHitAttackRoll#trace:reducer-route=StatBlockActionRouteSubject action=doFillHitAttackRoll mode=rolled qRoute=stat-block-multi-damage-route` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-stat-block-multi-damage.mbt.qnt#step:doFillTargetChoice` | `tasks/target-replay-evidence/CRPI-BLOCK-030.json#driver:packages/battle-runtime/battle-runtime-stat-block-multi-damage.mbt.qnt#step:doFillTargetChoice#trace:reducer-route=StatBlockActionRouteSubject action=doFillTargetChoice mode=rolled qRoute=stat-block-multi-damage-route` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-stat-block-multi-damage.mbt.qnt#step:doResolveRolledDamage` | `tasks/target-replay-evidence/CRPI-BLOCK-030.json#driver:packages/battle-runtime/battle-runtime-stat-block-multi-damage.mbt.qnt#step:doResolveRolledDamage#trace:reducer-route=StatBlockActionRouteSubject action=doResolveRolledDamage mode=rolled qRoute=stat-block-multi-damage-route` | `_none_` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-BLOCK-030.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id pattern: `reducer-route=StatBlockActionRouteSubject action=<branchAction> mode=<rolled|static> qRoute=stat-block-multi-damage-route`
- The copied connector projection source is `packages/battle-runtime/battle-runtime-stat-block-multi-damage.route.mbt.qnt#qRoute`; the observed projection source is the target route driver `packages/battle-runtime/src/stat-block-multi-damage.mbt.test.ts#createStatBlockMultiDamageRouteDriver`, which calls `discoverBattleActs` before `resolveBattleSubject`.

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-BLOCK-030/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 58.

RAW and ubiquitous-language review:

- SRD 5.2.1 `Playing-the-Game.md#Attack Rolls` defines attack-roll resolution after the attack procedure chooses a target.
- SRD 5.2.1 `Playing-the-Game.md#Damage Rolls` and `#Hit Points` define damage reducing a creature's Hit Points after damage is determined.
- SRD 5.2.1 `Rules-Glossary.md#Stat Block` and `Monsters/Overview.md#Parts of a Stat Block` define monster Actions, Attack Notation, Damage Notation, Multiattack, and Recharge notation.
- `UBIQUITOUS_LANGUAGE.md` defines Creature, Attack Roll, Damage, Hit Points, Stat Block, Multiattack, Recharge, and Condition terms used by the route owners.

Verification results:

- Base check passed: required base ref `ralph/cleanroom-stat-block-route-lane-20260705T1152Z/integration` resolved to `846a9df52 Mark Ralph task 57 done`; `HEAD` resolved to `846a9df52 Mark Ralph task 57 done`; Base SHA `846a9df52073aa9ca974a265bd03a4402aca1604` is an ancestor of `HEAD`.
- RAW/ubiquitous-language review passed against SRD 5.2.1 attack, damage, Hit Points, Stat Block, Attack Notation, Damage Notation, Multiattack, Recharge, and `UBIQUITOUS_LANGUAGE.md`.
- Target replay evidence artifact for CRPI-BLOCK-030 covers 3 route-required Stat Block multi-damage `qRoute` obligations and records both rolled and static `doFillHitAttackRoll` paths.
- JSON validation passed for `tasks/target-replay-evidence/CRPI-BLOCK-030.json`, `tasks/ENGINE_DEPTH_MANIFEST.json`, and `tasks/STATE_OWNER_MANIFEST.json`.
- Focused MBT replay passed: `START=$(date +%s); ( cd packages/battle-runtime && MBT_TRACES=1 MBT_STEPS=3 pnpm exec vitest run src/stat-block-multi-damage.mbt.test.ts ) 2>&1 & pid=$!; wait "$pid"; status=$?; echo "TOTAL: $(( $(date +%s) - START ))s"; exit "$status"` passed with 4 tests in `TOTAL: 12s`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- Requested broad verification passed: `pnpm quality`. App lint emitted 61 warnings and exited 0; all quality gates and typecheck passed.
- Reviewer-loop convergence passed: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review checks found no remaining reasonable Task 58 findings before broad verification.

## CRPI-BLOCK-029

Status: `pass`

- Task: 57
- Driver path: `packages/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt`
- Route connector path: `packages/battle-runtime/battle-runtime-stat-block-action-ordering.route.mbt.qnt`
- Route class: `reducer-routed`
- Accepted projection: `qRoute`
- Evidence file: `tasks/target-replay-evidence/CRPI-BLOCK-029.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`

Durable ownership:

BattleState owns Stat Block action dispatch, target-selection frontier,
attack-roll progression, Hit Point damage, and hole-frontier stale/rejection
state through `BattleStatBlockActionOwner`, `BattleTargetSelectionOwner`,
`BattleAttackRollOwner`, `BattleHitPointOwner`, and `BattleHoleFrontierOwner`.
`RuleCoreStatBlockControlOwner` owns reusable Multiattack dispatch control
facts. Authored Stat Block identity and attack notation stay catalog/source
facts, not reducer dispatch keys.

Target replay:

The copied connector projection `qRoute` is observed from
`packages/battle-runtime/battle-runtime-stat-block-action-ordering.route.mbt.qnt`
through the target driver in
`packages/battle-runtime/src/stat-block-action-ordering.mbt.test.ts`. Runtime
route projection is produced from public battle reducer entrypoints:
`startBattleRight`, `discoverBattleActs`, and `resolveBattleSubject`.
The route-event source is the existing `ReducerRouteEvent` vocabulary emitted
by `createStatBlockActionOrderingRouteDriver`; the replay does not use
adapter-local expected routes, fixture labels, branch names, connector
filenames, or authored monster identity as production behavior.

Generated branch coverage:

| Obligation | Evidence | Sampled inputs | Status |
| --- | --- | --- | --- |
| `packages/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt#step:doDiscoverRolledActionAttackControl` | `tasks/target-replay-evidence/CRPI-BLOCK-029.json#driver:packages/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt#step:doDiscoverRolledActionAttackControl#trace:reducer-route=StatBlockActionRouteSubject action=doDiscoverRolledActionAttackControl qRoute=stat-block-action-ordering-route` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt#step:doDiscoverStaticActionAttackControl` | `tasks/target-replay-evidence/CRPI-BLOCK-029.json#driver:packages/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt#step:doDiscoverStaticActionAttackControl#trace:reducer-route=StatBlockActionRouteSubject action=doDiscoverStaticActionAttackControl qRoute=stat-block-action-ordering-route` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt#step:doFillAttackRollMiss` | `tasks/target-replay-evidence/CRPI-BLOCK-029.json#driver:packages/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt#step:doFillAttackRollMiss#trace:reducer-route=StatBlockActionRouteSubject action=doFillAttackRollMiss qRoute=stat-block-action-ordering-route` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt#step:doFillDamageDice` | `tasks/target-replay-evidence/CRPI-BLOCK-029.json#driver:packages/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt#step:doFillDamageDice#trace:reducer-route=StatBlockActionRouteSubject action=doFillDamageDice qRoute=stat-block-action-ordering-route` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt#step:doFillRechargeRoll` | `tasks/target-replay-evidence/CRPI-BLOCK-029.json#driver:packages/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt#step:doFillRechargeRoll#trace:reducer-route=StatBlockActionRouteSubject action=doFillRechargeRoll qRoute=stat-block-action-ordering-route` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt#step:doFillRolledAttackRollHit` | `tasks/target-replay-evidence/CRPI-BLOCK-029.json#driver:packages/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt#step:doFillRolledAttackRollHit#trace:reducer-route=StatBlockActionRouteSubject action=doFillRolledAttackRollHit qRoute=stat-block-action-ordering-route` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt#step:doFillStaticAttackRollHit` | `tasks/target-replay-evidence/CRPI-BLOCK-029.json#driver:packages/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt#step:doFillStaticAttackRollHit#trace:reducer-route=StatBlockActionRouteSubject action=doFillStaticAttackRollHit qRoute=stat-block-action-ordering-route` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt#step:doFillTargetChoice` | `tasks/target-replay-evidence/CRPI-BLOCK-029.json#driver:packages/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt#step:doFillTargetChoice#trace:reducer-route=StatBlockActionRouteSubject action=doFillTargetChoice qRoute=stat-block-action-ordering-route` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt#step:doRejectAttackRollBeforeTargetChoice` | `tasks/target-replay-evidence/CRPI-BLOCK-029.json#driver:packages/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt#step:doRejectAttackRollBeforeTargetChoice#trace:reducer-route=StatBlockActionRouteSubject action=doRejectAttackRollBeforeTargetChoice qRoute=stat-block-action-ordering-route` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt#step:doRejectDamageBeforeAttackRoll` | `tasks/target-replay-evidence/CRPI-BLOCK-029.json#driver:packages/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt#step:doRejectDamageBeforeAttackRoll#trace:reducer-route=StatBlockActionRouteSubject action=doRejectDamageBeforeAttackRoll qRoute=stat-block-action-ordering-route` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt#step:doSpendRechargeGatedRolledAttack` | `tasks/target-replay-evidence/CRPI-BLOCK-029.json#driver:packages/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt#step:doSpendRechargeGatedRolledAttack#trace:reducer-route=StatBlockActionRouteSubject action=doSpendRechargeGatedRolledAttack qRoute=stat-block-action-ordering-route` | `_none_` | `covered` |
| `packages/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt#step:doStartMultiattackControl` | `tasks/target-replay-evidence/CRPI-BLOCK-029.json#driver:packages/battle-runtime/battle-runtime-stat-block-action-ordering.mbt.qnt#step:doStartMultiattackControl#trace:reducer-route=StatBlockActionRouteSubject action=doStartMultiattackControl qRoute=stat-block-action-ordering-route` | `_none_` | `covered` |

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-BLOCK-029/`
- Run ledger: `tasks/RUN_LEDGER.json`

RAW and ubiquitous-language review:

- SRD 5.2.1 `Playing-the-Game.md#Making an Attack` and `#Attack Rolls` define target choice before attack roll and hit resolution.
- SRD 5.2.1 `Playing-the-Game.md#Damage Rolls` and `#Hit Points` define damage reducing Hit Points after damage is determined.
- SRD 5.2.1 `Rules-Glossary.md#Stat Block` and `Monsters/Overview.md#Parts of a Stat Block` define monster Actions, Attack Notation, Damage Notation, Multiattack, and Recharge notation.
- `UBIQUITOUS_LANGUAGE.md` defines Creature, Attack Roll, Damage, Hit Points, Stat Block, Multiattack, Recharge, and Condition terms used by the route owners.

Verification results:

- Base check passed: `master` resolved to `6c18388a4 Unblock stat block route replay tasks`; `HEAD` resolved to `6c18388a4 Unblock stat block route replay tasks`; Base SHA `6c18388a45b92b5903027b9ed44d7efe4bf498e1` is an ancestor of `HEAD`.
- RAW/ubiquitous-language review passed against SRD 5.2.1 attack, damage, Hit Points, Stat Block, Attack Notation, Damage Notation, Multiattack, Recharge, and `UBIQUITOUS_LANGUAGE.md`.
- Target replay evidence artifact for CRPI-BLOCK-029 covers 12 route-required Stat Block action-ordering `qRoute` obligations.
- JSON validation passed for `tasks/target-replay-evidence/CRPI-BLOCK-029.json`, `tasks/ENGINE_DEPTH_MANIFEST.json`, and `tasks/STATE_OWNER_MANIFEST.json`.
- Focused MBT replay passed: `START=$(date +%s); ( cd packages/battle-runtime && MBT_TRACES=1 MBT_STEPS=4 pnpm exec vitest run src/stat-block-action-ordering.mbt.test.ts ) 2>&1 & pid=$!; wait "$pid"; status=$?; echo "TOTAL: $(( $(date +%s) - START ))s"; exit "$status"` passed with 6 tests in `TOTAL: 12s`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- Requested broad verification passed: `pnpm quality`. App lint emitted 61 warnings and exited 0; all quality gates and typecheck passed.
- Reviewer-loop convergence passed: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review checks found no remaining reasonable Task 57 findings after verification.

## CRPI-READY-034

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`
- Driver path: `packages/battle-runtime/rule-core-stat-block-controls.mbt.qnt`
- Component connector path: `packages/battle-runtime/rule-core-stat-block-controls.mbt.qnt`
- Route class: `component-first`
- Durable owner: `RuleCoreStatBlockControlOwner`
- Accepted projection: `qComponentRoute`
- Status: `accepted`
- Evidence file: `tasks/target-replay-evidence/CRPI-READY-034.json`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/battle-runtime/rule-core-stat-block-controls.mbt.qnt`
- `packages/battle-runtime/rule-core-component-route.qnt`
- `packages/battle-runtime/src/rule-core-stat-block-controls.mbt.test.ts`
- `packages/battle-runtime/src/rule-core-component-route.ts`
- `packages/battle-runtime/src/battle-reducer/actions.ts`
- `packages/battle-runtime/src/battle-reducer/movement.ts`
- `packages/battle-runtime/src/battle-reducer/turn-end.ts`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

The component-first replay for rule-core Stat Block controls now has accepted
target evidence for the copied `qComponentRoute` projection. The target harness
records the reusable component route sequence parse input, admit input, call
`RuleCoreStatBlockControlOwner`, and project result before downstream battle
action, attack, and Stat Block routes consume this owner.

Runtime projections are produced through public battle-runtime Stat Block
Multiattack, movement, attack dispatch, action rejection, and End Turn
entrypoints via `resolveBattleSubject`, then compared to the copied component
connector route. No production reducer state was added: Multiattack dispatch
resources, action availability, bonus-action availability, movement
spent/remaining, target-choice holes, attack-roll holes, and reducer result
state remain on existing battle state fields and public reducer protocols.

Generated branch coverage:

| Obligation | Evidence | Harness | Status |
| --- | --- | --- | --- |
| `packages/battle-runtime/rule-core-stat-block-controls.mbt.qnt#step:doEndTurnClosesDispatches` | `tasks/target-replay-evidence/CRPI-READY-034.json#driver:packages/battle-runtime/rule-core-stat-block-controls.mbt.qnt#step:doEndTurnClosesDispatches#trace:component-route=RuleCoreStatBlockControlOwner action=doEndTurnClosesDispatches qComponentRoute=stat-block-control-component-route` | `packages/battle-runtime/src/rule-core-stat-block-controls.mbt.test.ts#replays QCORE11 Multiattack dispatch parity through battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-stat-block-controls.mbt.qnt#step:doMoveDuringDispatch` | `tasks/target-replay-evidence/CRPI-READY-034.json#driver:packages/battle-runtime/rule-core-stat-block-controls.mbt.qnt#step:doMoveDuringDispatch#trace:component-route=RuleCoreStatBlockControlOwner action=doMoveDuringDispatch qComponentRoute=stat-block-control-component-route` | `packages/battle-runtime/src/rule-core-stat-block-controls.mbt.test.ts#replays QCORE11 Multiattack dispatch parity through battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-stat-block-controls.mbt.qnt#step:doRejectBonusActionDuringDispatch` | `tasks/target-replay-evidence/CRPI-READY-034.json#driver:packages/battle-runtime/rule-core-stat-block-controls.mbt.qnt#step:doRejectBonusActionDuringDispatch#trace:component-route=RuleCoreStatBlockControlOwner action=doRejectBonusActionDuringDispatch qComponentRoute=stat-block-control-component-route` | `packages/battle-runtime/src/rule-core-stat-block-controls.mbt.test.ts#replays QCORE11 Multiattack dispatch parity through battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-stat-block-controls.mbt.qnt#step:doRejectOrdinaryActionDuringDispatch` | `tasks/target-replay-evidence/CRPI-READY-034.json#driver:packages/battle-runtime/rule-core-stat-block-controls.mbt.qnt#step:doRejectOrdinaryActionDuringDispatch#trace:component-route=RuleCoreStatBlockControlOwner action=doRejectOrdinaryActionDuringDispatch qComponentRoute=stat-block-control-component-route` | `packages/battle-runtime/src/rule-core-stat-block-controls.mbt.test.ts#replays QCORE11 Multiattack dispatch parity through battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-stat-block-controls.mbt.qnt#step:doResolvePrimaryDispatch` | `tasks/target-replay-evidence/CRPI-READY-034.json#driver:packages/battle-runtime/rule-core-stat-block-controls.mbt.qnt#step:doResolvePrimaryDispatch#trace:component-route=RuleCoreStatBlockControlOwner action=doResolvePrimaryDispatch qComponentRoute=stat-block-control-component-route` | `packages/battle-runtime/src/rule-core-stat-block-controls.mbt.test.ts#replays QCORE11 Multiattack dispatch parity through battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-stat-block-controls.mbt.qnt#step:doResolveSecondaryDispatch` | `tasks/target-replay-evidence/CRPI-READY-034.json#driver:packages/battle-runtime/rule-core-stat-block-controls.mbt.qnt#step:doResolveSecondaryDispatch#trace:component-route=RuleCoreStatBlockControlOwner action=doResolveSecondaryDispatch qComponentRoute=stat-block-control-component-route` | `packages/battle-runtime/src/rule-core-stat-block-controls.mbt.test.ts#replays QCORE11 Multiattack dispatch parity through battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-stat-block-controls.mbt.qnt#step:doStartMultiattack` | `tasks/target-replay-evidence/CRPI-READY-034.json#driver:packages/battle-runtime/rule-core-stat-block-controls.mbt.qnt#step:doStartMultiattack#trace:component-route=RuleCoreStatBlockControlOwner action=doStartMultiattack qComponentRoute=stat-block-control-component-route` | `packages/battle-runtime/src/rule-core-stat-block-controls.mbt.test.ts#replays QCORE11 Multiattack dispatch parity through battle-runtime reducers` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-034.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id pattern: `component-route=RuleCoreStatBlockControlOwner action=<branchAction> qComponentRoute=stat-block-control-component-route`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-034/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 77.

RAW / ubiquitous-language trace:

- SRD 5.2.1 Rules Glossary: Stat Block is the rules record for a monster's statistics, including Actions and Bonus Actions.
- SRD 5.2.1 Rules Glossary and local SRD monster entries: Multiattack is a Stat Block action entry that makes multiple named attacks as one Stat Block action.
- SRD 5.2.1 Rules Glossary: Attack action rules, target choice, attack roll, and damage sequencing define the ordinary attack-control path reused by Stat Block attacks.
- `UBIQUITOUS_LANGUAGE.md`: Stat Block is monster-authored, Character Sheet is PC-derived, and Multiattack is a Stat Block entry defining what constitutes the monster's Attack action rather than a separate extra action.

Verification results:

- Base check passed: required round-2 base ref `ralph/cleanroom-reducer-full-lane-20260705-restart3/integration` resolved to `52407cf56 Mark Task 75 spell replay done`; reviewer-feedback audit ref `codex/cleanroom-reducer-full-lane-20260705-restart2` resolved to `5a3fb5554 Merge Ralph task 100 status`; `HEAD` resolved to `52407cf56 Mark Task 75 spell replay done`; `git merge-base --is-ancestor 52407cf5632e9272a6f97a2d8c604f9dee6d3374 HEAD` passed, so the Task Base SHA remains an ancestor of `HEAD`.
- RAW/ubiquitous-language review passed against SRD 5.2.1 Rules Glossary Stat Block, Attack [Action], Creature, Monster, local SRD Multiattack examples, and `UBIQUITOUS_LANGUAGE.md`.
- Target replay evidence artifact for CRPI-READY-034 covers 7 route-required rule-core Stat Block control `qComponentRoute` obligations.
- JSON validation passed: `jq empty tasks/target-replay-evidence/CRPI-READY-034.json tasks/ENGINE_DEPTH_MANIFEST.json tasks/STATE_OWNER_MANIFEST.json`.
- Scoped target evidence validation passed: `node scoped validateTargetReplayEvidence for CRPI-READY-034 stat-block-control driver` covered 7 Task 77 obligations.
- Pre-MBT process check found no actual Vitest or `quint_evaluator` worker process.
- Focused MBT replay passed: `START=$(date +%s); ( cd packages/battle-runtime && MBT_TRACES=1 MBT_STEPS=6 pnpm exec vitest run src/rule-core-stat-block-controls.mbt.test.ts ) 2>&1 & pid=$!; wait "$pid"; status=$?; echo "TOTAL: $(( $(date +%s) - START ))s"; exit "$status"` passed with 1 test in `TOTAL: 16s`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- Requested broad verification passed: `flock /tmp/dnd-mbt-qnt.lock pnpm quality`.
- Reviewer-loop convergence passed: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review checks found no remaining reasonable Task 77 findings before verification.

## CRP06-SRO-01

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`
- Driver: `packages/character-battle-runtime/character-battle-settlement.mbt.qnt`
- Route connector: `packages/character-battle-runtime/character-battle-settlement.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`
- Acceptance status: `accepted`

Allowed inputs used:

- `packages/character-battle-runtime/character-battle-settlement.mbt.qnt`
- `packages/character-battle-runtime/character-battle-settlement.route.mbt.qnt`
- `packages/character-battle-runtime/character-battle-reducer-route.qnt`
- `packages/character-battle-runtime/src/character-battle-settlement.mbt.test.ts`
- `packages/character-battle-runtime/src/reducer-route-connectors.mbt.test.ts`
- `packages/character-battle-runtime/src/character-battle-route.ts`
- `packages/character-battle-runtime/README.md`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
- `.references/srd-5.2.1/Classes/Warlock.md`
- `.references/srd-5.2.1/Classes/Sorcerer.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Character-battle runtime now exposes production route replay for battle-to-sheet
settlement through `characterBattleSettlementRouteStep`, so the copied
settlement connector is compared against package route vocabulary instead of
test-local duplicate route builders. The semantic settlement replay observes
accepted Hit Points, Temporary Hit Points, Poisoned, Prone, ordinary Spell Slot
expenditure, spent Hit Dice preservation, rest-feature-use preservation, pure
Pact Slot expenditure, feature-resource expenditure, accepted zero-HP Stable
lifecycle, and the named settlement rejections. The route replay records
`RouteSettleBattleToCharacterSheet`,
`RouteRecordCharacterBattleHandoffFacts`, source-exact Spell Slot and Pact Slot
deltas, feature-resource delta, zero-HP Stable lifecycle, settlement-conflict,
identity-match, and hit-point-projection route families.

Mixed ordinary Spell Slot plus Pact Slot settlement and source-ambiguous
ordinary-vs-created Spell Slot settlement reject with settlement-conflict
evidence. Settlement writes fresh sheet play state only after identity,
maximum-HP, active Wild Shape, active battle-state, and in-progress Stable
recovery gates pass.

Generated branch and route coverage:

| Obligation | Evidence | Harness | Status |
| --- | --- | --- | --- |
| `doSettleHitPointsConditionsSlotsAndPreservedSheetState` | `tasks/target-replay-evidence/CRP06-SRO-01.json#driver:packages/character-battle-runtime/character-battle-settlement.mbt.qnt#step:doSettleHitPointsConditionsSlotsAndPreservedSheetState#trace:semantic-qState action=doSettleHitPointsConditionsSlotsAndPreservedSheetState` and `#trace:settlement-qRoute action=doSettleHitPointsConditionsSlotsAndPreservedSheetState` | `packages/character-battle-runtime/src/character-battle-settlement.mbt.test.ts`, `packages/character-battle-runtime/src/reducer-route-connectors.mbt.test.ts` | `covered` |
| `doSettlePurePactMagicSlotExpenditure` | `tasks/target-replay-evidence/CRP06-SRO-01.json#driver:packages/character-battle-runtime/character-battle-settlement.mbt.qnt#step:doSettlePurePactMagicSlotExpenditure#trace:semantic-qState action=doSettlePurePactMagicSlotExpenditure` and `#trace:settlement-qRoute action=doSettlePurePactMagicSlotExpenditure` | same | `covered` |
| `doRejectMixedSpellAndPactSlotSettlement` | `tasks/target-replay-evidence/CRP06-SRO-01.json#driver:packages/character-battle-runtime/character-battle-settlement.mbt.qnt#step:doRejectMixedSpellAndPactSlotSettlement#trace:semantic-qState action=doRejectMixedSpellAndPactSlotSettlement` and `#trace:settlement-qRoute action=doRejectMixedSpellAndPactSlotSettlement` | same | `covered` |
| `doSettleFeatureResourceExpenditure` | `tasks/target-replay-evidence/CRP06-SRO-01.json#driver:packages/character-battle-runtime/character-battle-settlement.mbt.qnt#step:doSettleFeatureResourceExpenditure#trace:semantic-qState action=doSettleFeatureResourceExpenditure` and `#trace:settlement-qRoute action=doSettleFeatureResourceExpenditure` | same | `covered` |
| `doRejectAmbiguousCreatedSpellSlotSource` | `tasks/target-replay-evidence/CRP06-SRO-01.json#driver:packages/character-battle-runtime/character-battle-settlement.mbt.qnt#step:doRejectAmbiguousCreatedSpellSlotSource#trace:semantic-qState action=doRejectAmbiguousCreatedSpellSlotSource` and `#trace:settlement-qRoute action=doRejectAmbiguousCreatedSpellSlotSource` | same | `covered` |
| `doRejectMismatchedCharacterIdentity` | `tasks/target-replay-evidence/CRP06-SRO-01.json#driver:packages/character-battle-runtime/character-battle-settlement.mbt.qnt#step:doRejectMismatchedCharacterIdentity#trace:semantic-qState action=doRejectMismatchedCharacterIdentity` and `#trace:settlement-qRoute action=doRejectMismatchedCharacterIdentity` | same | `covered` |
| `doRejectMaximumHpDrift` | `tasks/target-replay-evidence/CRP06-SRO-01.json#driver:packages/character-battle-runtime/character-battle-settlement.mbt.qnt#step:doRejectMaximumHpDrift#trace:semantic-qState action=doRejectMaximumHpDrift` and `#trace:settlement-qRoute action=doRejectMaximumHpDrift` | same | `covered` |
| `doRejectActiveWildShapeHandoff` | `tasks/target-replay-evidence/CRP06-SRO-01.json#driver:packages/character-battle-runtime/character-battle-settlement.mbt.qnt#step:doRejectActiveWildShapeHandoff#trace:semantic-qState action=doRejectActiveWildShapeHandoff` and `#trace:settlement-qRoute action=doRejectActiveWildShapeHandoff` | same | `covered` |
| `doRejectActiveBattleStateHandoff` | `tasks/target-replay-evidence/CRP06-SRO-01.json#driver:packages/character-battle-runtime/character-battle-settlement.mbt.qnt#step:doRejectActiveBattleStateHandoff#trace:semantic-qState action=doRejectActiveBattleStateHandoff` and `#trace:settlement-qRoute action=doRejectActiveBattleStateHandoff` | same | `covered` |
| `doRejectStableRecoveryProgressHandoff` | `tasks/target-replay-evidence/CRP06-SRO-01.json#driver:packages/character-battle-runtime/character-battle-settlement.mbt.qnt#step:doRejectStableRecoveryProgressHandoff#trace:semantic-qState action=doRejectStableRecoveryProgressHandoff` and `#trace:settlement-qRoute action=doRejectStableRecoveryProgressHandoff` | same | `covered` |
| `doSettleZeroHpStableLifecycle` | `tasks/target-replay-evidence/CRP06-SRO-01.json#driver:packages/character-battle-runtime/character-battle-settlement.mbt.qnt#step:doSettleZeroHpStableLifecycle#trace:semantic-qState action=doSettleZeroHpStableLifecycle` and `#trace:settlement-qRoute action=doSettleZeroHpStableLifecycle` | same | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRP06-SRO-01.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`

Harness artifacts:

- Immutable history: `tasks/history/CRP06-SRO-01/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 81.

Verification results:

- Base check passed: `git log --oneline -1 ralph/cleanroom-character-battle-lane-20260705/integration` and `git log --oneline -1 HEAD` both resolved to `e1def5288 Accept Ralph task 80 sheet-derived battle acts`; `git merge-base --is-ancestor e1def5288e7eddc8d88adcec562bdfe873e6dce9 HEAD` passed.
- RAW/ubiquitous-language review passed against Hit Points, Temporary Hit Points, Stabilizing a Character, Stable, Spell Slots, Warlock Pact Magic, Sorcerer Font of Magic, `UBIQUITOUS_LANGUAGE.md`, and `packages/character-battle-runtime/README.md#Battle handoff settlement`.
- Focused MBT replay passed under the timed protocol with no pre-existing vitest or quint evaluator process: `flock /tmp/dnd-mbt-qnt.lock env MBT_TRACES=1 pnpm --filter @dnd/character-battle-runtime exec vitest run src/character-battle-settlement.mbt.test.ts src/reducer-route-connectors.mbt.test.ts -t "settlement"` passed with 3 tests and 5 skipped after the route-action cleanup; final timed run `TOTAL: 26s`.
- `pnpm --filter @dnd/character-battle-runtime typecheck` passed.
- `node scripts/cleanroom-branch-coverage-check.cjs` passed with 738 obligations and 24 sampled inputs.
- `node -e "JSON.parse(...)"` for `tasks/target-replay-evidence/CRP06-SRO-01.json` and `tasks/RUN_LEDGER.json` passed.
- `git diff --check` passed.
- `flock /tmp/dnd-mbt-qnt.lock pnpm quality` was diagnostic: it passed the Task 81-owned gates through cleanroom coverage and later lint/circular checks, then failed at repo-wide `turbo typecheck` on the known off-surface baseline error `packages/character-creation-runtime/src/index.test.ts(10401,5): Type 'string' is not assignable to type '"species_gnome_gnomish_lineage"'`.
- Reviewer-loop convergence passed: round 1 moved settlement route action ordering to the exported production `CHARACTER_BATTLE_SETTLEMENT_ROUTE_ACTIONS` list so the connector test no longer owns a second order list; round 2 found no remaining reasonable RAW, ubiquitous-language/domain, architecture/connascence, or code-review issues for Task 81.

Plan Impact:

- Status: `none`
- Affected task: Task 81 / `CRP06-SRO-01` is unblocked by accepted semantic and route replay evidence.
- Required plan edits: none.

## CRPI-READY-032

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`
- Driver path: `packages/battle-runtime/rule-core-shove-outcome.mbt.qnt`
- Component connector path: `packages/battle-runtime/rule-core-shove-outcome.mbt.qnt`
- Route class: `component-first`
- Durable owner: `RuleCoreShoveOutcomeOwner`
- Accepted projection: `qComponentRoute`
- Status: `accepted`
- Evidence file: `tasks/target-replay-evidence/CRPI-READY-032.json`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/battle-runtime/rule-core-shove-outcome.mbt.qnt`
- `packages/battle-runtime/rule-core-component-route.qnt`
- `packages/battle-runtime/src/rule-core-shove-outcome.mbt.test.ts`
- `packages/battle-runtime/src/rule-core-component-route.ts`
- `packages/battle-runtime/src/battle-reducer/attack-resolution.ts`
- `packages/battle-runtime/src/battle-runtime-test-support.ts`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

The component-first replay for rule-core Shove outcome now has accepted target
evidence for the copied `qComponentRoute` projection. The target harness records
the reusable component route sequence parse input, admit input, call
`RuleCoreShoveOutcomeOwner`, and project result before downstream battle action and feature
routes consume this owner.

Runtime projections are produced through public battle-runtime Shove subject
resolution via `resolveBattleSubject`, then compared to the copied component
connector route. No production reducer state was added: action-resource spend,
Prone condition application, accepted push disposition, blocked push disposition,
and invalid push-distance rejection remain on existing battle state fields and
public reducer result protocols.

Generated branch coverage:

| Obligation | Evidence | Harness | Status |
| --- | --- | --- | --- |
| `packages/battle-runtime/rule-core-shove-outcome.mbt.qnt#step:doInvalidPushDistance` | `tasks/target-replay-evidence/CRPI-READY-032.json#driver:packages/battle-runtime/rule-core-shove-outcome.mbt.qnt#step:doInvalidPushDistance#trace:component-route=RuleCoreShoveOutcomeOwner action=doInvalidPushDistance qComponentRoute=shove-outcome-component-route` | `packages/battle-runtime/src/rule-core-shove-outcome.mbt.test.ts#replays Shove Prone and push dispositions against battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-shove-outcome.mbt.qnt#step:doSaveFailsProne` | `tasks/target-replay-evidence/CRPI-READY-032.json#driver:packages/battle-runtime/rule-core-shove-outcome.mbt.qnt#step:doSaveFailsProne#trace:component-route=RuleCoreShoveOutcomeOwner action=doSaveFailsProne qComponentRoute=shove-outcome-component-route` | `packages/battle-runtime/src/rule-core-shove-outcome.mbt.test.ts#replays Shove Prone and push dispositions against battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-shove-outcome.mbt.qnt#step:doSaveFailsPush` | `tasks/target-replay-evidence/CRPI-READY-032.json#driver:packages/battle-runtime/rule-core-shove-outcome.mbt.qnt#step:doSaveFailsPush#trace:component-route=RuleCoreShoveOutcomeOwner action=doSaveFailsPush qComponentRoute=shove-outcome-component-route` | `packages/battle-runtime/src/rule-core-shove-outcome.mbt.test.ts#replays Shove Prone and push dispositions against battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-shove-outcome.mbt.qnt#step:doSaveFailsPushBlocked` | `tasks/target-replay-evidence/CRPI-READY-032.json#driver:packages/battle-runtime/rule-core-shove-outcome.mbt.qnt#step:doSaveFailsPushBlocked#trace:component-route=RuleCoreShoveOutcomeOwner action=doSaveFailsPushBlocked qComponentRoute=shove-outcome-component-route` | `packages/battle-runtime/src/rule-core-shove-outcome.mbt.test.ts#replays Shove Prone and push dispositions against battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-shove-outcome.mbt.qnt#step:doSaveFailsPushNoLegalDestination` | `tasks/target-replay-evidence/CRPI-READY-032.json#driver:packages/battle-runtime/rule-core-shove-outcome.mbt.qnt#step:doSaveFailsPushNoLegalDestination#trace:component-route=RuleCoreShoveOutcomeOwner action=doSaveFailsPushNoLegalDestination qComponentRoute=shove-outcome-component-route` | `packages/battle-runtime/src/rule-core-shove-outcome.mbt.test.ts#replays Shove Prone and push dispositions against battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-shove-outcome.mbt.qnt#step:doSaveSucceeds` | `tasks/target-replay-evidence/CRPI-READY-032.json#driver:packages/battle-runtime/rule-core-shove-outcome.mbt.qnt#step:doSaveSucceeds#trace:component-route=RuleCoreShoveOutcomeOwner action=doSaveSucceeds qComponentRoute=shove-outcome-component-route` | `packages/battle-runtime/src/rule-core-shove-outcome.mbt.test.ts#replays Shove Prone and push dispositions against battle-runtime reducers` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-032.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id pattern: `component-route=RuleCoreShoveOutcomeOwner action=<branchAction> qComponentRoute=shove-outcome-component-route`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-032/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 74.

RAW / ubiquitous-language trace:

- SRD 5.2.1 Rules Glossary: Unarmed Strike can damage, grapple, or shove a target within 5 feet.
- SRD 5.2.1 Rules Glossary: Shove requires a target-chosen Strength or Dexterity saving throw; on failure the target is either pushed 5 feet away or gains the Prone condition.
- SRD 5.2.1 Rules Glossary: Shove DC is 8 plus Strength modifier and Proficiency Bonus, and is possible only against a target no more than one size larger.
- SRD 5.2.1 Rules Glossary: Prone restricts movement to crawling or standing by spending half Speed and affects attack rolls.
- `UBIQUITOUS_LANGUAGE.md`: Shove is an Unarmed Strike option distinct from the Push mastery property; failure either knocks the target Prone or pushes it 5 feet.

Verification results:

- Base check passed: declared base ref `codex/cleanroom-reducer-full-lane-20260705-restart2` resolved to `5a3fb5554 Merge Ralph task 100 status`; `HEAD` resolved to `162b0b108 Mark Ralph task 73 done`; `git merge-base --is-ancestor 162b0b10817e406ef742d66b24f73a32b9cb85c7 HEAD` passed, so the Task Base SHA remains an ancestor of `HEAD`.
- RAW/ubiquitous-language review passed against SRD 5.2.1 Rules Glossary Unarmed Strike and Prone plus `UBIQUITOUS_LANGUAGE.md` Shove, Grapple, Unarmed Strike, and Push distinction.
- JSON validation passed: `jq empty tasks/target-replay-evidence/CRPI-READY-032.json tasks/ENGINE_DEPTH_MANIFEST.json tasks/STATE_OWNER_MANIFEST.json tasks/RUN_LEDGER.json`.
- Pre-MBT process check found no actual Vitest or `quint_evaluator` worker process; it only matched a Ralph monitor command text.
- Focused MBT replay passed: `START=$(date +%s); cd packages/battle-runtime && MBT_TRACES=1 MBT_STEPS=6 pnpm exec vitest run src/rule-core-shove-outcome.mbt.test.ts 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 1 test in `TOTAL: 9s`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs after a first parallel attempt exited 143 without diagnostics.
- Scoped target evidence validation passed: `node scoped validateTargetReplayEvidence for CRPI-READY-032 shove outcome driver` covered 6 Task 74 obligations.
- `git diff --check` passed.
- Requested broad verification passed: `flock /tmp/dnd-mbt-qnt.lock pnpm quality`.
- Reviewer-loop convergence passed: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review checks found no remaining reasonable Task 74 findings.

## CRP05-SBE-02

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`
- Driver: `packages/character-battle-runtime/character-session-sheet-derived-battle-acts.mbt.qnt`
- Route connector: `packages/character-battle-runtime/character-session-sheet-derived-battle-acts.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`
- Acceptance status: `accepted`

Allowed inputs used:

- `packages/character-battle-runtime/character-session-sheet-derived-battle-acts.mbt.qnt`
- `packages/character-battle-runtime/character-session-sheet-derived-battle-acts.route.mbt.qnt`
- `packages/character-battle-runtime/src/character-session-sheet-derived-battle-acts.mbt.test.ts`
- `packages/character-battle-runtime/src/reducer-route-connectors.mbt.test.ts`
- `packages/character-battle-runtime/src/character-battle-route.ts`
- `packages/character-battle-runtime/README.md`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Equipment.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Character-battle runtime now exposes accepted semantic replay for sheet-derived
weapon and resource-backed spell battle acts, missing prerequisite rejection,
early/stale spell fill rejection, accepted spell-slot expenditure, exhausted-slot
rediscovery rejection, and source-exact spell-slot settlement. The route replay
records connector-action `qRoute` for sheet projection, encounter composition,
subject availability, runtime entry, battle settlement, resource projection, and
`sourceExactSpellSlotDelta` through production route vocabulary in
`character-battle-route.ts`.

No production runtime semantics dispatch on authored identity. The test fixture
uses public entrypoints to create a synthetic character sheet/build, project it
into BattleState, discover acts from sheet-owned equipment and prepared spell
facts, resolve the spell invocation through battle-owned holes/fills, and settle
the exact level-1 spell-slot expenditure back to the Character Sheet. Spell-slot
counts are not duplicated in route state; the route records ownership and source
exactness while the runtime state remains authoritative.

Revision-round-3 correction:

- Semantic branch evidence remains on `packages/character-battle-runtime/character-session-sheet-derived-battle-acts.mbt.qnt` actions and is now generated by three normal `step` replays with fixed seeds: `1` for the happy path, `3` for missing selected spell, and `6` for missing wielded weapon.
- Route evidence now uses connector actions from `packages/character-battle-runtime/character-session-sheet-derived-battle-acts.route.mbt.qnt`:
  `doEnterSheetDerivedSessionBattle` and `doSettleSheetDerivedSpellSlot`.
- Rejection semantic branches no longer claim settlement route events or
  `sourceExactSpellSlotDelta`; that fact appears only on the settlement route
  connector trace.

Revision-round-4 cleanup:

- Removed the unused full-route `characterSessionSheetDerivedBattleActsRoute`
  convenience helper/export; the current route connector consumes the live
  `characterSessionSheetDerivedBattleActsRouteStep` API.
- Removed the duplicated `SheetDerivedSession.target` helper field while keeping
  the target combatant existence assertion in `startSheetDerivedSession`.

Generated semantic branch coverage:

| Obligation | Evidence | Harness | Status |
| --- | --- | --- | --- |
| `packages/character-battle-runtime/character-session-sheet-derived-battle-acts.mbt.qnt#step:doAcceptSpellInvocationAndSpendOneSlot` | `tasks/target-replay-evidence/CRP05-SBE-02.json#driver:packages/character-battle-runtime/character-session-sheet-derived-battle-acts.mbt.qnt#step:doAcceptSpellInvocationAndSpendOneSlot#trace:semantic-qState seed=1 action=doAcceptSpellInvocationAndSpendOneSlot` | `packages/character-battle-runtime/src/character-session-sheet-derived-battle-acts.mbt.test.ts` | `covered` |
| `packages/character-battle-runtime/character-session-sheet-derived-battle-acts.mbt.qnt#step:doProjectResourceBackedSpellAttackCapability` | `tasks/target-replay-evidence/CRP05-SBE-02.json#driver:packages/character-battle-runtime/character-session-sheet-derived-battle-acts.mbt.qnt#step:doProjectResourceBackedSpellAttackCapability#trace:semantic-qState seed=1 action=doProjectResourceBackedSpellAttackCapability` | `packages/character-battle-runtime/src/character-session-sheet-derived-battle-acts.mbt.test.ts` | `covered` |
| `packages/character-battle-runtime/character-session-sheet-derived-battle-acts.mbt.qnt#step:doProjectWeaponAttackCapability` | `tasks/target-replay-evidence/CRP05-SBE-02.json#driver:packages/character-battle-runtime/character-session-sheet-derived-battle-acts.mbt.qnt#step:doProjectWeaponAttackCapability#trace:semantic-qState seed=1 action=doProjectWeaponAttackCapability` | `packages/character-battle-runtime/src/character-session-sheet-derived-battle-acts.mbt.test.ts` | `covered` |
| `packages/character-battle-runtime/character-session-sheet-derived-battle-acts.mbt.qnt#step:doRejectEarlySpellFillWithoutSpend` | `tasks/target-replay-evidence/CRP05-SBE-02.json#driver:packages/character-battle-runtime/character-session-sheet-derived-battle-acts.mbt.qnt#step:doRejectEarlySpellFillWithoutSpend#trace:semantic-qState seed=1 action=doRejectEarlySpellFillWithoutSpend` | `packages/character-battle-runtime/src/character-session-sheet-derived-battle-acts.mbt.test.ts` | `covered` |
| `packages/character-battle-runtime/character-session-sheet-derived-battle-acts.mbt.qnt#step:doRejectExhaustedSlotRediscovery` | `tasks/target-replay-evidence/CRP05-SBE-02.json#driver:packages/character-battle-runtime/character-session-sheet-derived-battle-acts.mbt.qnt#step:doRejectExhaustedSlotRediscovery#trace:semantic-qState seed=1 action=doRejectExhaustedSlotRediscovery` | `packages/character-battle-runtime/src/character-session-sheet-derived-battle-acts.mbt.test.ts` | `covered` |
| `packages/character-battle-runtime/character-session-sheet-derived-battle-acts.mbt.qnt#step:doRejectMissingSelectedSpellAttackCapability` | `tasks/target-replay-evidence/CRP05-SBE-02.json#driver:packages/character-battle-runtime/character-session-sheet-derived-battle-acts.mbt.qnt#step:doRejectMissingSelectedSpellAttackCapability#trace:semantic-qState seed=3 action=doRejectMissingSelectedSpellAttackCapability` | `packages/character-battle-runtime/src/character-session-sheet-derived-battle-acts.mbt.test.ts` | `covered` |
| `packages/character-battle-runtime/character-session-sheet-derived-battle-acts.mbt.qnt#step:doRejectMissingWieldedWeaponCapability` | `tasks/target-replay-evidence/CRP05-SBE-02.json#driver:packages/character-battle-runtime/character-session-sheet-derived-battle-acts.mbt.qnt#step:doRejectMissingWieldedWeaponCapability#trace:semantic-qState seed=6 action=doRejectMissingWieldedWeaponCapability` | `packages/character-battle-runtime/src/character-session-sheet-derived-battle-acts.mbt.test.ts` | `covered` |
| `packages/character-battle-runtime/character-session-sheet-derived-battle-acts.mbt.qnt#step:doRejectStaleOpenActionAfterInvocation` | `tasks/target-replay-evidence/CRP05-SBE-02.json#driver:packages/character-battle-runtime/character-session-sheet-derived-battle-acts.mbt.qnt#step:doRejectStaleOpenActionAfterInvocation#trace:semantic-qState seed=1 action=doRejectStaleOpenActionAfterInvocation` | `packages/character-battle-runtime/src/character-session-sheet-derived-battle-acts.mbt.test.ts` | `covered` |
| `packages/character-battle-runtime/character-session-sheet-derived-battle-acts.mbt.qnt#step:doRejectStaleSpellFillWithoutSecondSpend` | `tasks/target-replay-evidence/CRP05-SBE-02.json#driver:packages/character-battle-runtime/character-session-sheet-derived-battle-acts.mbt.qnt#step:doRejectStaleSpellFillWithoutSecondSpend#trace:semantic-qState seed=1 action=doRejectStaleSpellFillWithoutSecondSpend` | `packages/character-battle-runtime/src/character-session-sheet-derived-battle-acts.mbt.test.ts` | `covered` |
| `packages/character-battle-runtime/character-session-sheet-derived-battle-acts.mbt.qnt#step:doSettleSpellSlotExpenditure` | `tasks/target-replay-evidence/CRP05-SBE-02.json#driver:packages/character-battle-runtime/character-session-sheet-derived-battle-acts.mbt.qnt#step:doSettleSpellSlotExpenditure#trace:semantic-qState seed=1 action=doSettleSpellSlotExpenditure` | `packages/character-battle-runtime/src/character-session-sheet-derived-battle-acts.mbt.test.ts` | `covered` |

Generated route connector coverage:

| Connector action | Evidence | Harness | Status |
| --- | --- | --- | --- |
| `packages/character-battle-runtime/character-session-sheet-derived-battle-acts.route.mbt.qnt#step:doEnterSheetDerivedSessionBattle` | `tasks/target-replay-evidence/CRP05-SBE-02.json#driver:packages/character-battle-runtime/character-session-sheet-derived-battle-acts.route.mbt.qnt#step:doEnterSheetDerivedSessionBattle#trace:sheet-derived-qRoute action=doEnterSheetDerivedSessionBattle` | `packages/character-battle-runtime/src/reducer-route-connectors.mbt.test.ts` | `covered` |
| `packages/character-battle-runtime/character-session-sheet-derived-battle-acts.route.mbt.qnt#step:doSettleSheetDerivedSpellSlot` | `tasks/target-replay-evidence/CRP05-SBE-02.json#driver:packages/character-battle-runtime/character-session-sheet-derived-battle-acts.route.mbt.qnt#step:doSettleSheetDerivedSpellSlot#trace:sheet-derived-qRoute action=doSettleSheetDerivedSpellSlot` | `packages/character-battle-runtime/src/reducer-route-connectors.mbt.test.ts` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRP05-SBE-02.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id patterns: `semantic-qState seed=<seed> action=<branchAction>`,
  `sheet-derived-qRoute action=<connectorAction>`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRP05-SBE-02/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 80.

Verification results:

- Base check passed: `git log --oneline -1 ralph/cleanroom-character-battle-lane-20260705/integration` and `git log --oneline -1 HEAD` both resolved to `59d4f3732 Mark Ralph task 78 done`; `git merge-base --is-ancestor 59d4f37325ba82390470a247e15cdc5123dc7a96 HEAD` passed.
- RAW/ubiquitous-language review passed against Weapons, The Order of Combat, Initiative, Attack, Attack Roll, Magic Action, Spell Slots, spell attack rolls, and `UBIQUITOUS_LANGUAGE.md`.
- Revision-round-2 static review addressed route-action misattribution, rejection-route settlement overclaiming, and stale ledger hash.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs after the checker/evidence correction.
- `node scripts/cleanroom-branch-coverage-check.cjs --self-test` passed.
- Focused MBT replay passed under the required timed/background protocol with no pre-existing vitest or quint evaluator process: `pnpm --filter @dnd/character-battle-runtime exec vitest run src/character-session-sheet-derived-battle-acts.mbt.test.ts src/reducer-route-connectors.mbt.test.ts -t "sheet-derived"` passed with 5 tests and 5 skipped; final timed run `TOTAL: 11s`. The semantic harness used normal `step` runs with seeds `1`, `6`, and `3` to observe the happy path, missing wielded weapon, and missing selected spell branches respectively.
- `pnpm --filter @dnd/character-battle-runtime typecheck` passed.
- `pnpm check:mbt-script-inventory` passed.
- `git diff --check` passed.
- Revision-round-4 cleanup verification passed: `pnpm --filter @dnd/character-battle-runtime typecheck`, `pnpm cleanroom-branch-coverage:check`, and `git diff --check`.
- `flock /tmp/dnd-mbt-qnt.lock pnpm quality` was diagnostic only; it passed through Task 80-owned gates including MBT inventory, route connector checks, and cleanroom branch coverage, then failed at repo-wide `turbo typecheck` because `packages/character-creation-runtime/src/index.test.ts(10401,5)` has an off-surface baseline type error: `Type 'string' is not assignable to type '"species_gnome_gnomish_lineage"'`.
- Reviewer-loop convergence passed: round 3 split semantic evidence into branch-specific seeded normal `step` replays so every claimed initial branch is observed by the public MBT target entrypoint; round 4 removed the unused route convenience export and duplicated test-helper target state; no remaining reasonable Task 80 findings were found after rerun.

Plan Impact:

- Status: `update-required`
- Affected task: Task 80 / `CRP05-SBE-02` is unblocked by accepted semantic and route replay evidence.
- Required plan edits: mark Task 80 / `CRP05-SBE-02` accepted and record `packages/character-battle-runtime/character-session-sheet-derived-battle-acts.route.mbt.qnt` as accepted route evidence.

## CRPI-READY-031

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`
- Driver path: `packages/battle-runtime/rule-core-reactions.mbt.qnt`
- Component connector path: `packages/battle-runtime/rule-core-reactions.mbt.qnt`
- Route class: `component-first`
- Durable owner: `RuleCoreReactionContinuationConcentrationOwner`
- Accepted projection: `qComponentRoute`
- Status: `accepted`
- Evidence file: `tasks/target-replay-evidence/CRPI-READY-031.json`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/battle-runtime/rule-core-reactions.mbt.qnt`
- `packages/battle-runtime/rule-core-component-route.qnt`
- `packages/battle-runtime/src/rule-core-reactions.mbt.test.ts`
- `packages/battle-runtime/src/rule-core-component-route.ts`
- `packages/battle-runtime/src/battle-reducer/dispatcher.ts`
- `packages/battle-runtime/src/battle-reducer/attack-resolution.ts`
- `packages/battle-runtime/src/battle-reducer/readied-release.ts`
- `packages/battle-runtime/src/battle-reducer/damage-apply.ts`
- `packages/battle-runtime/src/battle-reducer/domain-helpers.ts`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

The component-first replay for rule-core Reaction, continuation, Readied Movement,
and Concentration now has accepted target evidence for the copied
`qComponentRoute` projection. The target harness records the reusable component
route sequence parse input, admit input, call `RuleCoreReactionContinuationConcentrationOwner`, and project
result before downstream battle spell-effect and feature routes consume this
owner.

Runtime projections are produced through public battle-runtime Reaction, Ready,
Readied Movement, interrupt, and Concentration damage entrypoints via
`resolveBattleSubject`, `resolveBattleInterrupt`, and
`resolveBattleConcentrationDamage`, then compared to the copied component
connector route. No production reducer state was added: reaction availability,
pending interrupt stack, readied responses, movement spend, concentration, and
save DC projection remain on existing battle state fields and helper APIs.

Generated branch coverage:

| Obligation | Evidence | Harness | Status |
| --- | --- | --- | --- |
| `packages/battle-runtime/rule-core-reactions.mbt.qnt#step:doBreakReactorConcentrationAfterLargeDamage` | `tasks/target-replay-evidence/CRPI-READY-031.json#driver:packages/battle-runtime/rule-core-reactions.mbt.qnt#step:doBreakReactorConcentrationAfterLargeDamage#trace:component-route=RuleCoreReactionContinuationConcentrationOwner action=doBreakReactorConcentrationAfterLargeDamage qComponentRoute=reaction-continuation-concentration-component-route` | `packages/battle-runtime/src/rule-core-reactions.mbt.test.ts#replays QCORE8 Reaction, continuation, Readied Movement, and Concentration parity` | `covered` |
| `packages/battle-runtime/rule-core-reactions.mbt.qnt#step:doDeclineOpportunityAttack` | `tasks/target-replay-evidence/CRPI-READY-031.json#driver:packages/battle-runtime/rule-core-reactions.mbt.qnt#step:doDeclineOpportunityAttack#trace:component-route=RuleCoreReactionContinuationConcentrationOwner action=doDeclineOpportunityAttack qComponentRoute=reaction-continuation-concentration-component-route` | `packages/battle-runtime/src/rule-core-reactions.mbt.test.ts#replays QCORE8 Reaction, continuation, Readied Movement, and Concentration parity` | `covered` |
| `packages/battle-runtime/rule-core-reactions.mbt.qnt#step:doDeclineReadiedMovement` | `tasks/target-replay-evidence/CRPI-READY-031.json#driver:packages/battle-runtime/rule-core-reactions.mbt.qnt#step:doDeclineReadiedMovement#trace:component-route=RuleCoreReactionContinuationConcentrationOwner action=doDeclineReadiedMovement qComponentRoute=reaction-continuation-concentration-component-route` | `packages/battle-runtime/src/rule-core-reactions.mbt.test.ts#replays QCORE8 Reaction, continuation, Readied Movement, and Concentration parity` | `covered` |
| `packages/battle-runtime/rule-core-reactions.mbt.qnt#step:doHoldReactorConcentrationAfterSmallDamage` | `tasks/target-replay-evidence/CRPI-READY-031.json#driver:packages/battle-runtime/rule-core-reactions.mbt.qnt#step:doHoldReactorConcentrationAfterSmallDamage#trace:component-route=RuleCoreReactionContinuationConcentrationOwner action=doHoldReactorConcentrationAfterSmallDamage qComponentRoute=reaction-continuation-concentration-component-route` | `packages/battle-runtime/src/rule-core-reactions.mbt.test.ts#replays QCORE8 Reaction, continuation, Readied Movement, and Concentration parity` | `covered` |
| `packages/battle-runtime/rule-core-reactions.mbt.qnt#step:doOfferOpportunityAttack` | `tasks/target-replay-evidence/CRPI-READY-031.json#driver:packages/battle-runtime/rule-core-reactions.mbt.qnt#step:doOfferOpportunityAttack#trace:component-route=RuleCoreReactionContinuationConcentrationOwner action=doOfferOpportunityAttack qComponentRoute=reaction-continuation-concentration-component-route` | `packages/battle-runtime/src/rule-core-reactions.mbt.test.ts#replays QCORE8 Reaction, continuation, Readied Movement, and Concentration parity` | `covered` |
| `packages/battle-runtime/rule-core-reactions.mbt.qnt#step:doOfferReadiedMovement` | `tasks/target-replay-evidence/CRPI-READY-031.json#driver:packages/battle-runtime/rule-core-reactions.mbt.qnt#step:doOfferReadiedMovement#trace:component-route=RuleCoreReactionContinuationConcentrationOwner action=doOfferReadiedMovement qComponentRoute=reaction-continuation-concentration-component-route` | `packages/battle-runtime/src/rule-core-reactions.mbt.test.ts#replays QCORE8 Reaction, continuation, Readied Movement, and Concentration parity` | `covered` |
| `packages/battle-runtime/rule-core-reactions.mbt.qnt#step:doReadyMovementFixture` | `tasks/target-replay-evidence/CRPI-READY-031.json#driver:packages/battle-runtime/rule-core-reactions.mbt.qnt#step:doReadyMovementFixture#trace:component-route=RuleCoreReactionContinuationConcentrationOwner action=doReadyMovementFixture qComponentRoute=reaction-continuation-concentration-component-route` | `packages/battle-runtime/src/rule-core-reactions.mbt.test.ts#replays QCORE8 Reaction, continuation, Readied Movement, and Concentration parity` | `covered` |
| `packages/battle-runtime/rule-core-reactions.mbt.qnt#step:doRejectReadiedMovementZero` | `tasks/target-replay-evidence/CRPI-READY-031.json#driver:packages/battle-runtime/rule-core-reactions.mbt.qnt#step:doRejectReadiedMovementZero#trace:component-route=RuleCoreReactionContinuationConcentrationOwner action=doRejectReadiedMovementZero qComponentRoute=reaction-continuation-concentration-component-route` | `packages/battle-runtime/src/rule-core-reactions.mbt.test.ts#replays QCORE8 Reaction, continuation, Readied Movement, and Concentration parity` | `covered` |
| `packages/battle-runtime/rule-core-reactions.mbt.qnt#step:doStartReactorConcentrationFixture` | `tasks/target-replay-evidence/CRPI-READY-031.json#driver:packages/battle-runtime/rule-core-reactions.mbt.qnt#step:doStartReactorConcentrationFixture#trace:component-route=RuleCoreReactionContinuationConcentrationOwner action=doStartReactorConcentrationFixture qComponentRoute=reaction-continuation-concentration-component-route` | `packages/battle-runtime/src/rule-core-reactions.mbt.test.ts#replays QCORE8 Reaction, continuation, Readied Movement, and Concentration parity` | `covered` |
| `packages/battle-runtime/rule-core-reactions.mbt.qnt#step:doTakeReadiedMovementFill` | `tasks/target-replay-evidence/CRPI-READY-031.json#driver:packages/battle-runtime/rule-core-reactions.mbt.qnt#step:doTakeReadiedMovementFill#trace:component-route=RuleCoreReactionContinuationConcentrationOwner action=doTakeReadiedMovementFill qComponentRoute=reaction-continuation-concentration-component-route` | `packages/battle-runtime/src/rule-core-reactions.mbt.test.ts#replays QCORE8 Reaction, continuation, Readied Movement, and Concentration parity` | `covered` |
| `packages/battle-runtime/rule-core-reactions.mbt.qnt#step:doTakeReadiedMovementShort` | `tasks/target-replay-evidence/CRPI-READY-031.json#driver:packages/battle-runtime/rule-core-reactions.mbt.qnt#step:doTakeReadiedMovementShort#trace:component-route=RuleCoreReactionContinuationConcentrationOwner action=doTakeReadiedMovementShort qComponentRoute=reaction-continuation-concentration-component-route` | `packages/battle-runtime/src/rule-core-reactions.mbt.test.ts#replays QCORE8 Reaction, continuation, Readied Movement, and Concentration parity` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-031.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id pattern: `component-route=RuleCoreReactionContinuationConcentrationOwner action=<branchAction> qComponentRoute=reaction-continuation-concentration-component-route`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-031/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 73.

RAW / ubiquitous-language trace:

- SRD 5.2.1 Playing the Game: a Reaction is an instant response to a trigger and can occur on another creature's turn.
- SRD 5.2.1 Rules Glossary: taking a Reaction spends the Reaction until the start of the reactor's next turn.
- SRD 5.2.1 Rules Glossary: Ready creates a held response that can be taken as a Reaction before the start of the actor's next turn; Readied Movement can move up to Speed.
- SRD 5.2.1 Playing the Game and Rules Glossary: Opportunity Attacks trigger when a visible creature leaves reach using movement/action/Bonus Action/Reaction/Speed, and are made by taking a Reaction.
- SRD 5.2.1 Rules Glossary: Readied spells require Concentration while held, and damage requires a Constitution saving throw to maintain Concentration with DC max(10, half damage), capped at 30.
- `UBIQUITOUS_LANGUAGE.md`: Reaction, Ready Action, Readied Response, Readied Movement Response, Opportunity Attack, Concentration, Movement, Speed, and Damage terms match the modeled domain language.

Verification results:

- Base check passed: declared base ref `ralph/cleanroom-reducer-full-lane-20260705-restart3/integration` resolved to `a0b81ec24 Mark Ralph task 72 done`; `HEAD` resolved to `a0b81ec24 Mark Ralph task 72 done`; `git merge-base --is-ancestor a0b81ec24888d94c8b478c879423525c1f501cae HEAD` passed, so the Task Base SHA remains an ancestor of `HEAD`.
- RAW/ubiquitous-language review passed against SRD 5.2.1 Playing the Game Reactions, Ready, Opportunity Attacks; Rules Glossary Reaction, Ready, Opportunity Attacks, Concentration; and `UBIQUITOUS_LANGUAGE.md`.
- JSON validation passed: `jq empty tasks/target-replay-evidence/CRPI-READY-031.json tasks/ENGINE_DEPTH_MANIFEST.json tasks/STATE_OWNER_MANIFEST.json tasks/RUN_LEDGER.json`.
- Pre-MBT process check found no actual Vitest or `quint_evaluator` worker process; it only matched the Ralph monitor command text.
- Focused MBT replay passed: `START=$(date +%s); cd packages/battle-runtime && MBT_TRACES=1 MBT_STEPS=6 pnpm exec vitest run src/rule-core-reactions.mbt.test.ts 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 1 test in `TOTAL: 19s`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- Scoped target evidence validation passed: `node scoped validateTargetReplayEvidence for CRPI-READY-031 reaction driver` covered 11 Task 73 obligations.
- `git diff --check` passed.
- Requested broad verification passed: `flock /tmp/dnd-mbt-qnt.lock pnpm quality`. App lint reported warnings only and exited 0; turbo typecheck passed all 9 packages from cache.
- Reviewer-loop convergence passed: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review checks found no remaining reasonable Task 73 findings before verification.

## CRP04-CCF-03 - Character Creation Choice Cardinality and Support-Profile Rejection

- Manifest source commit SHA: `84e17424ba5882f076783f4bd0780b34d2a0a58e`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`
- Selected driver: `packages/character-creation-runtime/character-creation-runtime.mbt.qnt`
- Route connector: `packages/character-creation-runtime/character-creation-runtime.route.mbt.qnt`

Task 91 target replay covers language choice cardinality, duplicate language
options inside one fill, and valid-but-unsupported language and class equipment
choices through public character-creation reducer entrypoints. Semantic `qState`
evidence uses the `character-creation-runtime-state` comparator; route `qRoute`
evidence uses `route-event-list` from
`packages/character-creation-runtime/character-creation-runtime.route.mbt.qnt`.

Generated branch coverage:

| Obligation | Evidence | Sampled inputs | Status |
| --- | --- | --- | --- |
| `packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doRejectUnsupportedLanguage` | `tasks/target-replay-evidence/CRP04-CCF-03.json#driver:packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doRejectUnsupportedLanguage#trace:deterministic-rejection-contract action=doRejectUnsupportedLanguage projection=qState` | `_none_` | `covered` |
| `packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doRejectDuplicateLanguage` | `tasks/target-replay-evidence/CRP04-CCF-03.json#driver:packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doRejectDuplicateLanguage#trace:deterministic-rejection-contract action=doRejectDuplicateLanguage projection=qState` | `_none_` | `covered` |
| `packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doRejectTooFewLanguages` | `tasks/target-replay-evidence/CRP04-CCF-03.json#driver:packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doRejectTooFewLanguages#trace:deterministic-rejection-contract action=doRejectTooFewLanguages projection=qState` | `_none_` | `covered` |
| `packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doRejectTooManyLanguages` | `tasks/target-replay-evidence/CRP04-CCF-03.json#driver:packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doRejectTooManyLanguages#trace:deterministic-rejection-contract action=doRejectTooManyLanguages projection=qState` | `_none_` | `covered` |
| `packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doRejectUnsupportedClassEquipment` | `tasks/target-replay-evidence/CRP04-CCF-03.json#driver:packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doRejectUnsupportedClassEquipment#trace:deterministic-rejection-contract action=doRejectUnsupportedClassEquipment projection=qState` | `_none_` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRP04-CCF-03.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id pattern: `deterministic-rejection-contract action=<branchAction> projection=qState`
- Route trace id pattern: `deterministic-rejection-contract action=<branchAction> projection=qRoute`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRP04-CCF-03/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 91.

Verification results:

- Base check passed: declared base ref
  `ralph/cleanroom-character-creation-lane-20260705/integration` and `HEAD`
  both resolved to `cf0b972e7 Mark character creation rejection replay done`;
  Base SHA `cf0b972e7b49b98cfe16d6bdc5bf0e582bc31d57` is an ancestor of
  `HEAD`.
- RAW/ubiquitous-language review passed against Character Creation language
  selection, Standard Array and Fighter suggestions, Character Origins
  background/species facts, Fighter level-1 choice counts, Equipment
  proficiency/equipment facts, `UBIQUITOUS_LANGUAGE.md`, and
  `packages/character-creation-runtime/VOCABULARY.md`.
- `pnpm --filter @dnd/character-creation-runtime exec vitest run src/character-creation-runtime.mbt.test.ts -t "rejects invalid creation fill batches"` passed with 1 focused deterministic test and 2 skipped MBT tests.
- `pnpm --filter @dnd/character-creation-runtime exec vitest run src/reducer-route-connectors.mbt.test.ts -t "routes language and equipment fill rejections"` passed with 1 focused deterministic route test and 8 skipped MBT tests.
- `START=$(date +%s); MBT_TRACES=1 MBT_STEPS=16 pnpm --filter @dnd/character-creation-runtime exec vitest run src/character-creation-runtime.mbt.test.ts src/reducer-route-connectors.mbt.test.ts -t "character creation" 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 2 files, 10 tests, 2 skipped tests, and `TOTAL: 43s`.
- `pnpm --filter @dnd/character-creation-runtime typecheck` passed.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- `flock /tmp/dnd-mbt-qnt.lock pnpm quality` passed end to end; app lint reported warnings only and exited 0.
- Reviewer-loop convergence round 1 verified RAW traceability, domain language,
  choice cardinality from discovered hole shape, support-profile admission as a
  package-private runtime boundary, unchanged rejected draft state, route owner
  split, no duplicate durable required-count/open-hole/finalization/issue state,
  and no authored-identity dispatch. Round 2 rechecked after artifact updates,
  the typecheck fix, and final verification; no reasonable findings remained.

Plan Impact:

- Status: `none`
- Affected tasks: Task 91 / `CRP04-CCF-03` accepted; future tasks left
  unchanged.
- Required plan edits: none.

## CRPI-READY-030

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`
- Driver path: `packages/battle-runtime/rule-core-movement.mbt.qnt`
- Component connector path: `packages/battle-runtime/rule-core-movement.mbt.qnt`
- Route class: `component-first`
- Durable owner: `RuleCoreMovementGrappleOwner`
- Accepted projection: `qComponentRoute`
- Status: `accepted`
- Evidence file: `tasks/target-replay-evidence/CRPI-READY-030.json`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/battle-runtime/rule-core-movement.mbt.qnt`
- `packages/battle-runtime/rule-core-component-route.qnt`
- `packages/battle-runtime/src/rule-core-movement.mbt.test.ts`
- `packages/battle-runtime/src/rule-core-component-route.ts`
- `packages/battle-runtime/src/battle-reducer/turn-end-movement.ts`
- `packages/battle-runtime/src/battle-reducer/movement-speed.ts`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

The component-first replay for rule-core Movement/Grapple now has accepted target
evidence for the copied `qComponentRoute` projection. The target harness records
the reusable component route sequence parse input, admit input, call
`RuleCoreMovementGrappleOwner`, and project result before downstream battle action,
stat-block, spell-effect, and feature routes consume this owner.

Runtime projections are produced through public battle-runtime Movement, Dash,
Disengage, Grapple, escape, release, and Opportunity Attack interrupt entrypoints
via `resolveBattleSubject` and `resolveBattleInterrupt`, then compared to the
copied component connector route. No production reducer state was added: movement
spent/remaining, Dash bonus, Disengage, action resources, Prone, Grapple links,
and pending Opportunity Attack decisions remain on existing battle state fields.

Generated branch coverage:

| Obligation | Evidence | Harness | Status |
| --- | --- | --- | --- |
| `packages/battle-runtime/rule-core-movement.mbt.qnt#step:doDash` | `tasks/target-replay-evidence/CRPI-READY-030.json#driver:packages/battle-runtime/rule-core-movement.mbt.qnt#step:doDash#trace:component-route=RuleCoreMovementGrappleOwner action=doDash qComponentRoute=movement-grapple-component-route` | `packages/battle-runtime/src/rule-core-movement.mbt.test.ts#replays QCORE7 Movement, Grapple, and OA-decline against battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-movement.mbt.qnt#step:doDeclineOpportunityAttack` | `tasks/target-replay-evidence/CRPI-READY-030.json#driver:packages/battle-runtime/rule-core-movement.mbt.qnt#step:doDeclineOpportunityAttack#trace:component-route=RuleCoreMovementGrappleOwner action=doDeclineOpportunityAttack qComponentRoute=movement-grapple-component-route` | `packages/battle-runtime/src/rule-core-movement.mbt.test.ts#replays QCORE7 Movement, Grapple, and OA-decline against battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-movement.mbt.qnt#step:doDiscoverEscapeGrapple` | `tasks/target-replay-evidence/CRPI-READY-030.json#driver:packages/battle-runtime/rule-core-movement.mbt.qnt#step:doDiscoverEscapeGrapple#trace:component-route=RuleCoreMovementGrappleOwner action=doDiscoverEscapeGrapple qComponentRoute=movement-grapple-component-route` | `packages/battle-runtime/src/rule-core-movement.mbt.test.ts#replays QCORE7 Movement, Grapple, and OA-decline against battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-movement.mbt.qnt#step:doDiscoverGrapple` | `tasks/target-replay-evidence/CRPI-READY-030.json#driver:packages/battle-runtime/rule-core-movement.mbt.qnt#step:doDiscoverGrapple#trace:component-route=RuleCoreMovementGrappleOwner action=doDiscoverGrapple qComponentRoute=movement-grapple-component-route` | `packages/battle-runtime/src/rule-core-movement.mbt.test.ts#replays QCORE7 Movement, Grapple, and OA-decline against battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-movement.mbt.qnt#step:doDiscoverMovement` | `tasks/target-replay-evidence/CRPI-READY-030.json#driver:packages/battle-runtime/rule-core-movement.mbt.qnt#step:doDiscoverMovement#trace:component-route=RuleCoreMovementGrappleOwner action=doDiscoverMovement qComponentRoute=movement-grapple-component-route` | `packages/battle-runtime/src/rule-core-movement.mbt.test.ts#replays QCORE7 Movement, Grapple, and OA-decline against battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-movement.mbt.qnt#step:doDisengage` | `tasks/target-replay-evidence/CRPI-READY-030.json#driver:packages/battle-runtime/rule-core-movement.mbt.qnt#step:doDisengage#trace:component-route=RuleCoreMovementGrappleOwner action=doDisengage qComponentRoute=movement-grapple-component-route` | `packages/battle-runtime/src/rule-core-movement.mbt.test.ts#replays QCORE7 Movement, Grapple, and OA-decline against battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-movement.mbt.qnt#step:doMoveProvokesOpportunityAttack` | `tasks/target-replay-evidence/CRPI-READY-030.json#driver:packages/battle-runtime/rule-core-movement.mbt.qnt#step:doMoveProvokesOpportunityAttack#trace:component-route=RuleCoreMovementGrappleOwner action=doMoveProvokesOpportunityAttack qComponentRoute=movement-grapple-component-route` | `packages/battle-runtime/src/rule-core-movement.mbt.test.ts#replays QCORE7 Movement, Grapple, and OA-decline against battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-movement.mbt.qnt#step:doMoveThreatSuppressedByDisengage` | `tasks/target-replay-evidence/CRPI-READY-030.json#driver:packages/battle-runtime/rule-core-movement.mbt.qnt#step:doMoveThreatSuppressedByDisengage#trace:component-route=RuleCoreMovementGrappleOwner action=doMoveThreatSuppressedByDisengage qComponentRoute=movement-grapple-component-route` | `packages/battle-runtime/src/rule-core-movement.mbt.test.ts#replays QCORE7 Movement, Grapple, and OA-decline against battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-movement.mbt.qnt#step:doRejectDashAfterActionSpent` | `tasks/target-replay-evidence/CRPI-READY-030.json#driver:packages/battle-runtime/rule-core-movement.mbt.qnt#step:doRejectDashAfterActionSpent#trace:component-route=RuleCoreMovementGrappleOwner action=doRejectDashAfterActionSpent qComponentRoute=movement-grapple-component-route` | `packages/battle-runtime/src/rule-core-movement.mbt.test.ts#replays QCORE7 Movement, Grapple, and OA-decline against battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-movement.mbt.qnt#step:doRejectMovementOverspend` | `tasks/target-replay-evidence/CRPI-READY-030.json#driver:packages/battle-runtime/rule-core-movement.mbt.qnt#step:doRejectMovementOverspend#trace:component-route=RuleCoreMovementGrappleOwner action=doRejectMovementOverspend qComponentRoute=movement-grapple-component-route` | `packages/battle-runtime/src/rule-core-movement.mbt.test.ts#replays QCORE7 Movement, Grapple, and OA-decline against battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-movement.mbt.qnt#step:doReleaseGrapple` | `tasks/target-replay-evidence/CRPI-READY-030.json#driver:packages/battle-runtime/rule-core-movement.mbt.qnt#step:doReleaseGrapple#trace:component-route=RuleCoreMovementGrappleOwner action=doReleaseGrapple qComponentRoute=movement-grapple-component-route` | `packages/battle-runtime/src/rule-core-movement.mbt.test.ts#replays QCORE7 Movement, Grapple, and OA-decline against battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-movement.mbt.qnt#step:doResolveEscapeFailure` | `tasks/target-replay-evidence/CRPI-READY-030.json#driver:packages/battle-runtime/rule-core-movement.mbt.qnt#step:doResolveEscapeFailure#trace:component-route=RuleCoreMovementGrappleOwner action=doResolveEscapeFailure qComponentRoute=movement-grapple-component-route` | `packages/battle-runtime/src/rule-core-movement.mbt.test.ts#replays QCORE7 Movement, Grapple, and OA-decline against battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-movement.mbt.qnt#step:doResolveEscapeSuccess` | `tasks/target-replay-evidence/CRPI-READY-030.json#driver:packages/battle-runtime/rule-core-movement.mbt.qnt#step:doResolveEscapeSuccess#trace:component-route=RuleCoreMovementGrappleOwner action=doResolveEscapeSuccess qComponentRoute=movement-grapple-component-route` | `packages/battle-runtime/src/rule-core-movement.mbt.test.ts#replays QCORE7 Movement, Grapple, and OA-decline against battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-movement.mbt.qnt#step:doResolveGrappleFailure` | `tasks/target-replay-evidence/CRPI-READY-030.json#driver:packages/battle-runtime/rule-core-movement.mbt.qnt#step:doResolveGrappleFailure#trace:component-route=RuleCoreMovementGrappleOwner action=doResolveGrappleFailure qComponentRoute=movement-grapple-component-route` | `packages/battle-runtime/src/rule-core-movement.mbt.test.ts#replays QCORE7 Movement, Grapple, and OA-decline against battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-movement.mbt.qnt#step:doResolveGrappleSuccess` | `tasks/target-replay-evidence/CRPI-READY-030.json#driver:packages/battle-runtime/rule-core-movement.mbt.qnt#step:doResolveGrappleSuccess#trace:component-route=RuleCoreMovementGrappleOwner action=doResolveGrappleSuccess qComponentRoute=movement-grapple-component-route` | `packages/battle-runtime/src/rule-core-movement.mbt.test.ts#replays QCORE7 Movement, Grapple, and OA-decline against battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-movement.mbt.qnt#step:doSelectGrappleTarget` | `tasks/target-replay-evidence/CRPI-READY-030.json#driver:packages/battle-runtime/rule-core-movement.mbt.qnt#step:doSelectGrappleTarget#trace:component-route=RuleCoreMovementGrappleOwner action=doSelectGrappleTarget qComponentRoute=movement-grapple-component-route` | `packages/battle-runtime/src/rule-core-movement.mbt.test.ts#replays QCORE7 Movement, Grapple, and OA-decline against battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-movement.mbt.qnt#step:doSpendFullMovement` | `tasks/target-replay-evidence/CRPI-READY-030.json#driver:packages/battle-runtime/rule-core-movement.mbt.qnt#step:doSpendFullMovement#trace:component-route=RuleCoreMovementGrappleOwner action=doSpendFullMovement qComponentRoute=movement-grapple-component-route` | `packages/battle-runtime/src/rule-core-movement.mbt.test.ts#replays QCORE7 Movement, Grapple, and OA-decline against battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-movement.mbt.qnt#step:doSpendMovement` | `tasks/target-replay-evidence/CRPI-READY-030.json#driver:packages/battle-runtime/rule-core-movement.mbt.qnt#step:doSpendMovement#trace:component-route=RuleCoreMovementGrappleOwner action=doSpendMovement qComponentRoute=movement-grapple-component-route` | `packages/battle-runtime/src/rule-core-movement.mbt.test.ts#replays QCORE7 Movement, Grapple, and OA-decline against battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-movement.mbt.qnt#step:doSpendShortMovement` | `tasks/target-replay-evidence/CRPI-READY-030.json#driver:packages/battle-runtime/rule-core-movement.mbt.qnt#step:doSpendShortMovement#trace:component-route=RuleCoreMovementGrappleOwner action=doSpendShortMovement qComponentRoute=movement-grapple-component-route` | `packages/battle-runtime/src/rule-core-movement.mbt.test.ts#replays QCORE7 Movement, Grapple, and OA-decline against battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-movement.mbt.qnt#step:doStandFromProne` | `tasks/target-replay-evidence/CRPI-READY-030.json#driver:packages/battle-runtime/rule-core-movement.mbt.qnt#step:doStandFromProne#trace:component-route=RuleCoreMovementGrappleOwner action=doStandFromProne qComponentRoute=movement-grapple-component-route` | `packages/battle-runtime/src/rule-core-movement.mbt.test.ts#replays QCORE7 Movement, Grapple, and OA-decline against battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-movement.mbt.qnt#step:doStartGrappledTargetTurn` | `tasks/target-replay-evidence/CRPI-READY-030.json#driver:packages/battle-runtime/rule-core-movement.mbt.qnt#step:doStartGrappledTargetTurn#trace:component-route=RuleCoreMovementGrappleOwner action=doStartGrappledTargetTurn qComponentRoute=movement-grapple-component-route` | `packages/battle-runtime/src/rule-core-movement.mbt.test.ts#replays QCORE7 Movement, Grapple, and OA-decline against battle-runtime reducers` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-030.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id pattern: `component-route=RuleCoreMovementGrappleOwner action=<branchAction> qComponentRoute=movement-grapple-component-route`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-030/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 72.

RAW / ubiquitous-language trace:

- SRD 5.2.1 Playing the Game: on a turn, a creature can move a distance up to its Speed and can break up movement around actions.
- SRD 5.2.1 Rules Glossary: Speed is the distance a creature can cover when it moves on its turn, and special speeds share the movement accounting rule.
- SRD 5.2.1 Rules Glossary and Playing the Game: Dash grants extra movement for the current turn equal to Speed, and Disengage prevents Opportunity Attacks for the rest of the turn.
- SRD 5.2.1 Rules Glossary: Prone restricts movement to crawling or spending half Speed to stand.
- SRD 5.2.1 Playing the Game and Rules Glossary: Opportunity Attacks trigger when a visible creature leaves reach using its movement, action, Bonus Action, Reaction, or Speed, and Teleport/forced movement do not provoke.
- SRD 5.2.1 Rules Glossary: Grappled sets Speed to 0, permits grappler drag/carry with extra movement cost, and can end by escape, separation, incapacitation, or release with no action.
- SRD 5.2.1 Rules Glossary: Unarmed Strike Grapple gives the target a Strength or Dexterity save against DC 8 plus Strength modifier and Proficiency Bonus, then applies Grappled on failure.
- `UBIQUITOUS_LANGUAGE.md`: Speed is capacity, Movement is expenditure, Grapple/Prone/Opportunity Attack names match the modeled domain terms.

Verification results:

- Base check passed: declared base ref `codex/cleanroom-reducer-full-lane-20260705-restart2` resolved to `5a3fb5554 Merge Ralph task 100 status`; `HEAD` resolved to `82543595d Mark Ralph task 71 done`; `git merge-base --is-ancestor 82543595d93db102fd8a33d0a191bb8e85fe863e HEAD` passed, so the Task Base SHA remains an ancestor of `HEAD`.
- RAW/ubiquitous-language review passed against SRD 5.2.1 Playing the Game Movement and Position, Actions, Reactions, Opportunity Attacks; Rules Glossary Speed, Dash, Disengage, Prone, Grappled, Grappling, Opportunity Attacks, Unarmed Strike; and `UBIQUITOUS_LANGUAGE.md`.
- JSON validation passed: `jq empty tasks/target-replay-evidence/CRPI-READY-030.json tasks/ENGINE_DEPTH_MANIFEST.json tasks/STATE_OWNER_MANIFEST.json tasks/RUN_LEDGER.json`.
- Pre-MBT process checks passed: no existing `vitest` or `quint_evaluator` processes were running; no evaluator cleanup was needed.
- Focused MBT replay passed: `START=$(date +%s); cd packages/battle-runtime && MBT_TRACES=1 MBT_STEPS=6 pnpm exec vitest run src/rule-core-movement.mbt.test.ts 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 1 test in `TOTAL: 22s`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- Scoped target evidence validation passed: `node scoped validateTargetReplayEvidence for CRPI-READY-030 movement driver` covered 21 Task 72 obligations.
- `git diff --check` passed.
- Requested broad verification passed: `flock /tmp/dnd-mbt-qnt.lock pnpm quality`. App lint reported warnings only and exited 0; turbo typecheck passed all 9 packages from cache.
- Reviewer-loop convergence passed: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review checks found no remaining reasonable Task 72 findings.

# Validation Report

## CRP04-CCF-02 - Character Creation Rejection Replay

- Manifest source commit SHA: `84e17424ba5882f076783f4bd0780b34d2a0a58e`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`
- Selected driver: `packages/character-creation-runtime/character-creation-runtime.mbt.qnt`

Task 90 target replay covers stale revision, duplicate fill, wrong fill kind,
closed progression hole, and future loadout hole rejection through the public
character-creation reducer entrypoints. Semantic `qState` evidence uses the
`character-creation-runtime-state` comparator; route `qRoute` evidence uses
`route-event-list` from `packages/character-creation-runtime/character-creation-runtime.route.mbt.qnt`.

Generated branch coverage:

| Obligation | Evidence | Sampled inputs | Status |
| --- | --- | --- | --- |
| `packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doRejectStaleInitialManifest` | `tasks/target-replay-evidence/CRP04-CCF-02.json#driver:packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doRejectStaleInitialManifest#trace:deterministic-rejection-contract action=doRejectStaleInitialManifest projection=qState` | `_none_` | `covered` |
| `packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doRejectDuplicateFill` | `tasks/target-replay-evidence/CRP04-CCF-02.json#driver:packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doRejectDuplicateFill#trace:deterministic-rejection-contract action=doRejectDuplicateFill projection=qState` | `_none_` | `covered` |
| `packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doRejectWrongKindPrimaryClass` | `tasks/target-replay-evidence/CRP04-CCF-02.json#driver:packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doRejectWrongKindPrimaryClass#trace:deterministic-rejection-contract action=doRejectWrongKindPrimaryClass projection=qState` | `_none_` | `covered` |
| `packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doRejectClosedInitialProgressionHole` | `tasks/target-replay-evidence/CRP04-CCF-02.json#driver:packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doRejectClosedInitialProgressionHole#trace:deterministic-rejection-contract action=doRejectClosedInitialProgressionHole projection=qState` | `_none_` | `covered` |
| `packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doRejectUnknownLoadoutArmor` | `tasks/target-replay-evidence/CRP04-CCF-02.json#driver:packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doRejectUnknownLoadoutArmor#trace:deterministic-rejection-contract action=doRejectUnknownLoadoutArmor projection=qState` | `_none_` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRP04-CCF-02.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id pattern: `deterministic-rejection-contract action=<branchAction> projection=qState`
- Route trace id pattern: `deterministic-rejection-contract action=<branchAction> projection=qRoute`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRP04-CCF-02/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 90.

Verification results:

- Base check passed: declared base ref
  `ralph/cleanroom-character-creation-lane-20260705/integration` and `HEAD`
  both resolved to `883f1021e Mark Ralph task 89 done`; Base SHA
  `883f1021e0752e7706888399562ef037c1339fca` is an ancestor of `HEAD`.
- RAW/ubiquitous-language review passed against Character Creation steps,
  Character Origins background/species choices, Fighter level-1 creation facts,
  Equipment starting-equipment/loadout facts, `UBIQUITOUS_LANGUAGE.md`, and
  `packages/character-creation-runtime/VOCABULARY.md`.
- `pnpm --filter @dnd/character-creation-runtime exec vitest run src/character-creation-runtime.mbt.test.ts -t "rejects invalid creation fill batches"` passed with 1 focused deterministic test and 2 skipped MBT tests.
- `pnpm --filter @dnd/character-creation-runtime typecheck` passed.
- `START=$(date +%s); MBT_TRACES=1 MBT_STEPS=16 pnpm --filter @dnd/character-creation-runtime exec vitest run src/character-creation-runtime.mbt.test.ts src/reducer-route-connectors.mbt.test.ts -t "character creation" 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 2 files, 9 tests, 2 skipped deterministic tests, and `TOTAL: 43s`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- `flock /tmp/dnd-mbt-qnt.lock pnpm quality` passed end to end; app lint reported warnings only and exited 0.
- Reviewer-loop convergence passed: round 1 verified RAW traceability, domain
  language, atomic rejection-before-mutation locality, derived hole/finalization
  projections, route event ownership, and no authored-identity dispatch. Round 2
  rechecked the artifact and code diff after fixes; no reasonable findings
  remained.

Plan Impact:

- Status: `none`
- Affected tasks: Task 90 / `CRP04-CCF-02` accepted; Task 91 left unchanged.
- Required plan edits: none.

## CRP06-SRO-03

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`
- Driver: `packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt`
- Route connector: `packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`
- Acceptance status: `accepted`

Allowed inputs used:

- `packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt`
- `packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.route.mbt.qnt`
- `packages/character-sheet-runtime/character-sheet-reducer-route.qnt`
- `packages/character-sheet-runtime/src/rests.ts`
- `packages/character-sheet-runtime/src/spell-slots.ts`
- `packages/character-sheet-runtime/src/spell-slots-pact-slots.mbt.test.ts`
- `packages/character-sheet-runtime/src/reducer-route-connectors.mbt.test.ts`
- `packages/character-sheet-runtime/README.md`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `.references/srd-5.2.1/Classes/Warlock.md`
- `.references/srd-5.2.1/Classes/Wizard.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

The Character Sheet Spell Slot/Pact Slot replay now has accepted target evidence
for both copied projections required by Task 101. The semantic replay compares
`qState` against public Character Sheet sheet creation, Short Rest, Long Rest,
interruption, slot conversion, and Magical Cunning entrypoints for ordinary
Spell Slot capacity rejection, Pact Slot over-capacity rejection, Short Rest
Pact Slot restoration, Arcane Recovery ordinary-slot refund, Long Rest ordinary
and Pact Slot restoration, created Spell Slot clearing, no-benefit
interruptions, Magical Cunning Pact Slot recovery, and named recovery
rejections. The route replay compares copied `qRoute` against public
character-sheet reducer route events for spell resource, feature resource,
resource spend, rest duration, recovery selection, ordinary Spell Slot delta,
Pact Slot delta, created-slot expiry, feature recovery state, and spell-resource
rejection facts.

No duplicate durable capacity state was introduced. Ordinary Spell Slot
capacity, Pact Slot level, and Pact Slot count remain projections from
`CharacterBuild`. `CharacterSheetSpellSlotOwner` owns nonzero ordinary Spell
Slot expenditures, created Spell Slot delta state, created-slot expiry, and
Arcane Recovery ordinary-slot refunds; `CharacterSheetPactSlotOwner` owns Pact
Slot expenditure and recovery; `CharacterSheetFeatureResourceOwner` owns
rest-triggered feature-use lockouts for Arcane Recovery and Magical Cunning.

Generated branch coverage:

| Obligation | Evidence | Harness | Status |
| --- | --- | --- | --- |
| `packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt#step:doRejectMismatchedOrdinarySpellSlotCapacity` | `tasks/target-replay-evidence/CRP06-SRO-03.json#driver:packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt#step:doRejectMismatchedOrdinarySpellSlotCapacity#trace:semantic-qState=spell-slots-pact-slots action=doRejectMismatchedOrdinarySpellSlotCapacity` and `#trace:public-route=characterSheetSpellResource action=doRejectMismatchedOrdinarySpellSlotCapacity qRoute=spell-slots-pact-slots-public-route` | `packages/character-sheet-runtime/src/spell-slots-pact-slots.mbt.test.ts`, `packages/character-sheet-runtime/src/reducer-route-connectors.mbt.test.ts` | `covered` |
| `packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt#step:doRejectPactSlotExpenditureOverCapacity` | `tasks/target-replay-evidence/CRP06-SRO-03.json#driver:packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt#step:doRejectPactSlotExpenditureOverCapacity` | same | `covered` |
| `packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt#step:doShortRestRestoresPactSlotsOnly` | `tasks/target-replay-evidence/CRP06-SRO-03.json#driver:packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt#step:doShortRestRestoresPactSlotsOnly` | same | `covered` |
| `packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt#step:doShortRestArcaneRecoveryRefundsOrdinarySpellSlot` | `tasks/target-replay-evidence/CRP06-SRO-03.json#driver:packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt#step:doShortRestArcaneRecoveryRefundsOrdinarySpellSlot` | same | `covered` |
| `packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt#step:doCompleteLongRestRestoresOrdinaryPactAndClearsCreatedSlots` | `tasks/target-replay-evidence/CRP06-SRO-03.json#driver:packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt#step:doCompleteLongRestRestoresOrdinaryPactAndClearsCreatedSlots` | same | `covered` |
| `packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt#step:doInterruptShortRestNoSlotBenefit` | `tasks/target-replay-evidence/CRP06-SRO-03.json#driver:packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt#step:doInterruptShortRestNoSlotBenefit` | same | `covered` |
| `packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt#step:doInterruptLongRestBeforeOneHourNoSlotBenefit` | `tasks/target-replay-evidence/CRP06-SRO-03.json#driver:packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt#step:doInterruptLongRestBeforeOneHourNoSlotBenefit` | same | `covered` |
| `packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt#step:doInterruptLongRestWithShortRestSlotBenefits` | `tasks/target-replay-evidence/CRP06-SRO-03.json#driver:packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt#step:doInterruptLongRestWithShortRestSlotBenefits` | same | `covered` |
| `packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt#step:doMagicalCunningRecoversPactSlots` | `tasks/target-replay-evidence/CRP06-SRO-03.json#driver:packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt#step:doMagicalCunningRecoversPactSlots` | same | `covered` |
| `packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt#step:doRejectMagicalCunningWithoutExpendedPactSlots` | `tasks/target-replay-evidence/CRP06-SRO-03.json#driver:packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt#step:doRejectMagicalCunningWithoutExpendedPactSlots` | same | `covered` |
| `packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt#step:doRejectArcaneRecoveryPactSlotRefund` | `tasks/target-replay-evidence/CRP06-SRO-03.json#driver:packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt#step:doRejectArcaneRecoveryPactSlotRefund` | same | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRP06-SRO-03.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id patterns: `semantic-qState=spell-slots-pact-slots action=<branchAction>` and `public-route=characterSheetSpellResource action=<branchAction> qRoute=spell-slots-pact-slots-public-route`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRP06-SRO-03/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 101.

Verification results:

- Base check passed: `git log --oneline -1 ralph/cleanroom-character-sheet-lane-20260705/integration` and `git log --oneline -1 HEAD` both resolved to `7a9151265 Mark Ralph task 100 done`; `git merge-base --is-ancestor 7a9151265cdaeaca86c04e39ad32a1fe496f6bd8 HEAD` passed.
- RAW/ubiquitous-language review passed against Spell Slots, Rules Glossary Short Rest and Long Rest, Warlock Pact Magic and Magical Cunning, Wizard Arcane Recovery, `UBIQUITOUS_LANGUAGE.md`, and `packages/character-sheet-runtime/README.md`.
- Focused Character Sheet deterministic replay passed: `START=$(date +%s); pnpm --filter @dnd/character-sheet-runtime exec vitest run src/spell-slots-pact-slots.mbt.test.ts src/reducer-route-connectors.mbt.test.ts -t "Spell Slot|Pact Slot" 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 2 files, 3 tests, semantic `qState` and route `qRoute` replay for 11 branch obligations; final timed run `TOTAL: 5s`.
- Target evidence subset validation passed for CRP06-SRO-03: 11 covered obligations; semantic `qState` comparator `character-sheet-spell-slots-pact-slots-state` and `qRoute` comparator `route-event-list` accepted. Full target-evidence mode reports expected missing evidence for unrelated tasks when pointed at this one evidence file.
- `pnpm cleanroom-branch-coverage:check` passed.
- `git diff --check` passed.
- `pnpm --filter @dnd/character-sheet-runtime typecheck` passed.
- Requested broad verification `flock /tmp/dnd-mbt-qnt.lock pnpm quality` reached repo-wide typecheck and failed in unrelated baseline code: `packages/character-creation-runtime/src/index.test.ts(10401,5): error TS2322: Type 'string' is not assignable to type "species_gnome_gnomish_lineage".` No Task 101 files are in that ownership surface.
- Reviewer-loop convergence passed: round 1 verified RAW traceability, ubiquitous-language/domain terms, no duplicate Spell Slot or Pact Slot capacity state, owner boundaries, no authored-identity dispatch in recovery execution, and no remaining reasonable code-review findings.

## CRP04-CCF-01

- Manifest source commit SHA: `84e17424ba5882f076783f4bd0780b34d2a0a58e`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`
- Driver: `packages/character-creation-runtime/character-creation-runtime.mbt.qnt`
- Route connector: `packages/character-creation-runtime/character-creation-runtime.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`
- Acceptance status: `accepted`

Allowed inputs used:

- `packages/character-creation-runtime/character-creation-runtime.mbt.qnt`
- `packages/character-creation-runtime/character-creation-runtime-slice.qnt`
- `packages/character-creation-runtime/character-creation-runtime.route.mbt.qnt`
- `packages/character-creation-runtime/character-creation-reducer-route.qnt`
- `packages/character-creation-runtime/VOCABULARY.md`
- `.references/srd-5.2.1/Character-Creation.md`
- `.references/srd-5.2.1/Character-Origins.md`
- `.references/srd-5.2.1/Classes/Fighter.md`
- `.references/srd-5.2.1/Equipment.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Task 89 extends the public character-creation reducer surface by making the
accepted batch boundary explicit in `fill-reducer.ts`:
`acceptedCreationBatchFillResult` now owns the accepted result projection after
`fillCreationHoles` validates and applies the whole submitted batch. The helper
derives the post-acceptance Creation Hole Frontier from `discoverCreationHoles`
and the post-acceptance finalization from `finalizeCharacterDraft`, both from
the accepted `CharacterDraft` plus Unit catalog/support profile facts.

The quarantined runtime harness in
`packages/character-creation-runtime/src/character-creation-runtime.mbt.test.ts`
now includes a deterministic accepted-batch check for the Task 89 branches. It
submits the independent initial accepted batches and the manifest-to-loadout
finalization path through public reducer entrypoints, checks one draft revision
increment per accepted batch, checks no accepted result carries an issue list,
checks holes/finalization equal the derived projections after every accepted
batch, and checks the loadout path reaches a ready finalization.

No duplicate durable open-hole, finalization, or issue ledger was added.
Character Draft remains the owner for accepted creation selections and draft
revision; Character Build owns finalized build facts. Route replay observes
draft creation, `RouteApplyCreationFillBatch`, `RouteDiscoverCreationHoles`
after every accepted batch, partial draft/build fact records, and
`RouteFinalizeCharacterDraft` only after the loadout batch reaches the
finalized stage.

Generated branch coverage:

| Obligation | Evidence | Sampled inputs | Status |
| --- | --- | --- | --- |
| `packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doFillAbilityScoresOnly` | `tasks/target-replay-evidence/CRP04-CCF-01.json#driver:packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doFillAbilityScoresOnly#trace:MBT_TRACES=1 MBT_STEPS=16 action=doFillAbilityScoresOnly projection=qState` | `_none_` | `covered` |
| `packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doFillInitialChoicesOnly` | `tasks/target-replay-evidence/CRP04-CCF-01.json#driver:packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doFillInitialChoicesOnly#trace:MBT_TRACES=1 MBT_STEPS=16 action=doFillInitialChoicesOnly projection=qState` | `_none_` | `covered` |
| `packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doFillInitialManifest` | `tasks/target-replay-evidence/CRP04-CCF-01.json#driver:packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doFillInitialManifest#trace:MBT_TRACES=1 MBT_STEPS=16 action=doFillInitialManifest projection=qState` | `_none_` | `covered` |
| `packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doFillManifestChoices` | `tasks/target-replay-evidence/CRP04-CCF-01.json#driver:packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doFillManifestChoices#trace:MBT_TRACES=1 MBT_STEPS=16 action=doFillManifestChoices projection=qState` | `_none_` | `covered` |
| `packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doFillManifestLoadout` | `tasks/target-replay-evidence/CRP04-CCF-01.json#driver:packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doFillManifestLoadout#trace:MBT_TRACES=1 MBT_STEPS=16 action=doFillManifestLoadout projection=qState` | `_none_` | `covered` |
| `packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doFillManifestPurchase` | `tasks/target-replay-evidence/CRP04-CCF-01.json#driver:packages/character-creation-runtime/character-creation-runtime.mbt.qnt#step:doFillManifestPurchase#trace:MBT_TRACES=1 MBT_STEPS=16 action=doFillManifestPurchase projection=qState` | `_none_` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRP04-CCF-01.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id pattern: `MBT_TRACES=1 MBT_STEPS=16 action=<branchAction> projection=qState`
- Route trace id pattern: `MBT_TRACES=1 MBT_STEPS=16 action=<branchAction> projection=qRoute`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRP04-CCF-01/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 89.

Verification results:

- Base check passed: declared base ref
  `ralph/cleanroom-character-creation-lane-20260705/integration` and `HEAD`
  both resolved to `84e17424b Merge Ralph route replay tasks 61-69`; Base SHA
  `84e17424ba5882f076783f4bd0780b34d2a0a58e` is an ancestor of `HEAD`.
- RAW/ubiquitous-language review passed against Character Creation steps,
  Character Origins background/species choices, Fighter level-1 creation facts,
  Equipment starting-equipment/loadout facts, `UBIQUITOUS_LANGUAGE.md`, and
  `packages/character-creation-runtime/VOCABULARY.md`.
- MBT process precheck found no actual running `vitest` or
  `quint_evaluator` test runner; the only match was an external monitoring
  shell whose command text contained those names.
- `START=$(date +%s); MBT_TRACES=1 MBT_STEPS=16 pnpm --filter @dnd/character-creation-runtime exec vitest run src/character-creation-runtime.mbt.test.ts src/reducer-route-connectors.mbt.test.ts -t "character creation" 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 2 files and 9 tests; final timed run `TOTAL: 45s`.
- `pnpm --filter @dnd/character-creation-runtime exec vitest run src/character-creation-runtime.mbt.test.ts -t "derives holes"` passed with 1 focused harness test and 1 skipped MBT replay test.
- `pnpm --filter @dnd/character-creation-runtime typecheck` passed after the
  Gnomish Lineage replay test narrowed the projected trait Unit id before
  returning the literal-typed test evidence.
- `START=$(date +%s); MBT_TRACES=1 MBT_STEPS=16 pnpm --filter @dnd/character-creation-runtime exec vitest run src/character-creation-runtime.mbt.test.ts src/reducer-route-connectors.mbt.test.ts -t "character creation" 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed after the production/harness change with 2 files, 9 tests, 1 skipped deterministic test, and final timed run `TOTAL: 40s`.
- `pnpm cleanroom-branch-coverage:check -- --target-replay-evidence tasks/target-replay-evidence/CRP04-CCF-01.json` was diagnostic only and failed because that mode requires evidence for the whole active denominator, not just Task 89.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24
  sampled inputs after Task 89 artifact generation.
- `git diff --check` passed after Task 89 artifact updates.
- `flock /tmp/dnd-mbt-qnt.lock pnpm quality` passed after the round-3
  production/harness changes.
- Reviewer-loop convergence passed: round 3 verified RAW traceability, domain
  language, atomic accepted-batch projection locality, derived
  hole/finalization projections, no duplicate durable state, route event
  ownership, and no authored-identity dispatch. No reasonable findings
  remained.

Plan Impact:

- Status: `none`
- Affected tasks: Task 89 / `CRP04-CCF-01` accepted; Task 90 /
  `CRP04-CCF-02` and Task 91 / `CRP04-CCF-03` left unchanged.
- Required plan edits: none.

## CRP05-SBE-01

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`
- Driver: `packages/character-battle-runtime/character-battle-init-projection.mbt.qnt`
- Route connectors:
  `packages/character-battle-runtime/character-battle-init-projection.route.mbt.qnt`,
  `packages/character-battle-runtime/character-battle-encounter-composition.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`
- Acceptance status: `accepted`

Allowed inputs used:

- `packages/character-battle-runtime/character-battle-init-projection.mbt.qnt`
- `packages/character-battle-runtime/character-battle-init-projection.route.mbt.qnt`
- `packages/character-battle-runtime/character-battle-encounter-composition.route.mbt.qnt`
- `packages/character-battle-runtime/character-battle-reducer-route.qnt`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
- `.references/srd-5.2.1/Classes/Warlock.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Character-battle runtime now exposes typed route evidence for Character Sheet to
battle init projection and composed sheet-plus-stat-block battle entry. Semantic
init APIs remain intact, while cumulative init-projection `qRoute` evidence is
owned by public production route replay functions that match the connector
`replayIndex` semantics. The composed entrypoint creates a real `BattleState`
through `startBattle`; participant membership, Encounter Side, Initiative order,
and the first current actor are read from that state rather than stored in a
driver-local cache. Encounter-composition route facts are produced only after
the typed sheet-plus-stat-block entrypoint verifies the expected sheet-derived
character combatant, non-sheet stat-block combatant, and current actor. Build
init issue routing reuses the battle-init owner constant for the
max-HP-exceeds-build-max failure so unrelated build projection failures cannot
claim the hit-point projection branch.

Generated branch coverage:

| Obligation | Evidence | Harness | Status |
| --- | --- | --- | --- |
| `packages/character-battle-runtime/character-battle-init-projection.mbt.qnt#step:doProjectSheetHitPointsArmorClassConditionsAndProfiles` | `tasks/target-replay-evidence/CRP05-SBE-01.json#driver:packages/character-battle-runtime/character-battle-init-projection.mbt.qnt#step:doProjectSheetHitPointsArmorClassConditionsAndProfiles#trace:semantic-qState action=doProjectSheetHitPointsArmorClassConditionsAndProfiles` | `packages/character-battle-runtime/src/character-battle-init-projection.mbt.test.ts` | `covered` |
| `packages/character-battle-runtime/character-battle-init-projection.mbt.qnt#step:doProjectPurePactMagicSlot` | `tasks/target-replay-evidence/CRP05-SBE-01.json#driver:packages/character-battle-runtime/character-battle-init-projection.mbt.qnt#step:doProjectPurePactMagicSlot#trace:semantic-qState action=doProjectPurePactMagicSlot` | `packages/character-battle-runtime/src/character-battle-init-projection.mbt.test.ts` | `covered` |
| `packages/character-battle-runtime/character-battle-init-projection.mbt.qnt#step:doRejectMixedSpellAndPactSlotInit` | `tasks/target-replay-evidence/CRP05-SBE-01.json#driver:packages/character-battle-runtime/character-battle-init-projection.mbt.qnt#step:doRejectMixedSpellAndPactSlotInit#trace:semantic-qState action=doRejectMixedSpellAndPactSlotInit` | `packages/character-battle-runtime/src/character-battle-init-projection.mbt.test.ts` | `covered` |
| `packages/character-battle-runtime/character-battle-init-projection.mbt.qnt#step:doRejectBuildMaximumAboveBuildMaximum` | `tasks/target-replay-evidence/CRP05-SBE-01.json#driver:packages/character-battle-runtime/character-battle-init-projection.mbt.qnt#step:doRejectBuildMaximumAboveBuildMaximum#trace:semantic-qState action=doRejectBuildMaximumAboveBuildMaximum` | `packages/character-battle-runtime/src/character-battle-init-projection.mbt.test.ts` | `covered` |
| `packages/character-battle-runtime/character-battle-init-projection.mbt.qnt#step:doRejectStableRecoveryProgressDuringInit` | `tasks/target-replay-evidence/CRP05-SBE-01.json#driver:packages/character-battle-runtime/character-battle-init-projection.mbt.qnt#step:doRejectStableRecoveryProgressDuringInit#trace:semantic-qState action=doRejectStableRecoveryProgressDuringInit` | `packages/character-battle-runtime/src/character-battle-init-projection.mbt.test.ts` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRP05-SBE-01.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id patterns:
  `semantic-qState action=<branchAction>`,
  `init-qRoute action=<branchAction>`,
  `encounter-qRoute action=<branchAction>`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRP05-SBE-01/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 78.

Verification results:

- Base check passed: `git log --oneline -1 ralph/cleanroom-character-battle-lane-20260705/integration` and `git log --oneline -1 HEAD` both resolved to `84e17424b Merge Ralph route replay tasks 61-69`; `git merge-base --is-ancestor 84e17424ba5882f076783f4bd0780b34d2a0a58e HEAD` passed.
- RAW/ubiquitous-language review passed against The Order of Combat, Initiative, Hit Points, Temporary Hit Points, Spell Slots, Warlock Pact Magic, and `UBIQUITOUS_LANGUAGE.md`.
- `pnpm --filter @dnd/character-battle-runtime typecheck` passed.
- `pnpm --filter @dnd/character-battle-runtime test` passed with 159 tests.
- Focused MBT replay passed: `START=$(date +%s); MBT_TRACES=1 pnpm --filter @dnd/character-battle-runtime exec vitest run src/character-battle-init-projection.mbt.test.ts src/reducer-route-connectors.mbt.test.ts -t "initialization deterministic|routes Character Sheet|routes sheet-derived encounter"; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 3 tests and 4 skipped; final revision-round-2 run was `TOTAL: 10s`. The route connector driver now imports the production route replay functions instead of test-local Task 78 route appenders.
- `pnpm cleanroom-branch-coverage:check --target-replay-evidence tasks/target-replay-evidence/CRP05-SBE-01.json` was diagnostic only and failed because the CLI requires target evidence for every in-scope repository obligation, not only Task 78. The diagnostic run parsed the Task 78 evidence before reporting global missing evidence outside this task.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- `flock /tmp/dnd-mbt-qnt.lock pnpm quality` was diagnostic and failed at repo-wide `turbo typecheck` because `packages/character-creation-runtime/src/index.test.ts(10401,5)` has a pre-existing off-surface type error: `Type 'string' is not assignable to type '"species_gnome_gnomish_lineage"'`.
- Reviewer-loop convergence passed: round 1 removed the test-local route event union in favor of production route vocabulary; round 2 moved Task 78 cumulative route replay into production, made the route MBT driver consume that production replay, tied build max-HP rejection routing to the battle-init owner constant, and constrained encounter-composition route facts to the typed composed-entry boundary.

Plan Impact:

- Status: `update-required`
- Affected task: Task 78 / `CRP05-SBE-01` is unblocked by accepted semantic and route replay evidence.
- Required plan edits: include
  `packages/character-battle-runtime/character-battle-encounter-composition.route.mbt.qnt`
  in the Task 78 connector/evidence list where only the init-projection route
  connector is currently named.

## CRP06-SRO-02

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`
- Driver: `packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt`
- Route connector: `packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`
- Acceptance status: `accepted`

Allowed inputs used:

- `packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt`
- `packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.route.mbt.qnt`
- `packages/character-sheet-runtime/character-sheet-reducer-route.qnt`
- `packages/character-sheet-runtime/src/rests.ts`
- `packages/character-sheet-runtime/src/healing-rest-benefit.ts`
- `packages/character-sheet-runtime/src/hp-rest-hit-dice.mbt.test.ts`
- `packages/character-sheet-runtime/src/reducer-route-connectors.mbt.test.ts`
- `packages/character-sheet-runtime/README.md`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

The Character Sheet HP/rest/Hit Dice replay now has accepted target evidence for
both copied projections required by Task 100. The semantic replay compares
`qState` against public Character Sheet rest entrypoints for Short Rest and Long
Rest start gates, duration gates, interruption outcomes, Short Rest Hit Die
spending, sequential Hit Die spending, Long Rest HP restoration, Hit Point
Maximum reduction clearing, Temporary Hit Point clearing, and spent Hit Dice
restoration. The route replay compares copied `qRoute` against public
character-sheet reducer route events for rest duration fills, Hit Dice spend
fills, Short Rest benefit-choice holes, and the Hit Point, Hit Dice, and sheet
state owners.

No duplicate durable state was introduced. Current HP, Temporary Hit Points, and
Hit Point Maximum reduction remain Character Sheet HP state; spent Hit Dice
remain `CharacterSheet.spentHitDice`; rest duration and Long Rest calendar wait
facts remain rest workflow state. Normal Hit Point Maximum, Hit Die size, and Hit
Die capacity continue to be projected from `CharacterBuild` and installed Unit
facts.

Generated branch coverage:

| Obligation | Evidence | Harness | Status |
| --- | --- | --- | --- |
| `packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt#step:doRejectLongRestStartAtZeroHp` | `tasks/target-replay-evidence/CRP06-SRO-02.json#driver:packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt#step:doRejectLongRestStartAtZeroHp#trace:semantic-qState=hp-rest-hit-dice action=doRejectLongRestStartAtZeroHp` and `#trace:public-route=characterSheetRest action=doRejectLongRestStartAtZeroHp qRoute=hp-rest-hit-dice-public-route` | `packages/character-sheet-runtime/src/hp-rest-hit-dice.mbt.test.ts`, `packages/character-sheet-runtime/src/reducer-route-connectors.mbt.test.ts` | `covered` |
| `packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt#step:doRejectLongRestBeforeSixteenHourWait` | `tasks/target-replay-evidence/CRP06-SRO-02.json#driver:packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt#step:doRejectLongRestBeforeSixteenHourWait` | same | `covered` |
| `packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt#step:doSpendShortRestHitPointDie` | `tasks/target-replay-evidence/CRP06-SRO-02.json#driver:packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt#step:doSpendShortRestHitPointDie` | same | `covered` |
| `packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt#step:doInterruptShortRestNoBenefit` | `tasks/target-replay-evidence/CRP06-SRO-02.json#driver:packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt#step:doInterruptShortRestNoBenefit` | same | `covered` |
| `packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt#step:doCompleteLongRestRestoresHpHitPointDiceAndMaximum` | `tasks/target-replay-evidence/CRP06-SRO-02.json#driver:packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt#step:doCompleteLongRestRestoresHpHitPointDiceAndMaximum` | same | `covered` |
| `packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt#step:doInterruptLongRestBeforeOneHourNoBenefit` | `tasks/target-replay-evidence/CRP06-SRO-02.json#driver:packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt#step:doInterruptLongRestBeforeOneHourNoBenefit` | same | `covered` |
| `packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt#step:doInterruptLongRestWithShortRestBenefits` | `tasks/target-replay-evidence/CRP06-SRO-02.json#driver:packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt#step:doInterruptLongRestWithShortRestBenefits` | same | `covered` |
| `packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt#step:doRejectShortRestStartAtZeroHp` | `tasks/target-replay-evidence/CRP06-SRO-02.json#driver:packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt#step:doRejectShortRestStartAtZeroHp` | same | `covered` |
| `packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt#step:doRejectShortRestDurationTooShort` | `tasks/target-replay-evidence/CRP06-SRO-02.json#driver:packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt#step:doRejectShortRestDurationTooShort` | same | `covered` |
| `packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt#step:doRejectLongRestDurationTooShort` | `tasks/target-replay-evidence/CRP06-SRO-02.json#driver:packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt#step:doRejectLongRestDurationTooShort` | same | `covered` |
| `packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt#step:doRejectLongRestPhysicalExertionTooShort` | `tasks/target-replay-evidence/CRP06-SRO-02.json#driver:packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt#step:doRejectLongRestPhysicalExertionTooShort` | same | `covered` |
| `packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt#step:doSpendShortRestHitPointDiceSequentially` | `tasks/target-replay-evidence/CRP06-SRO-02.json#driver:packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt#step:doSpendShortRestHitPointDiceSequentially` | same | `covered` |
| `packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt#step:doRejectLongRestInterruptionAtRequiredDuration` | `tasks/target-replay-evidence/CRP06-SRO-02.json#driver:packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt#step:doRejectLongRestInterruptionAtRequiredDuration` | same | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRP06-SRO-02.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id patterns: `semantic-qState=hp-rest-hit-dice action=<branchAction>` and `public-route=characterSheetRest action=<branchAction> qRoute=hp-rest-hit-dice-public-route`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRP06-SRO-02/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 100.

Verification results:

- Base check passed: `git log --oneline -1 ralph/cleanroom-character-sheet-lane-20260705/integration` and `git log --oneline -1 HEAD` both resolved to `84e17424b Merge Ralph route replay tasks 61-69`; `git merge-base --is-ancestor 84e17424ba5882f076783f4bd0780b34d2a0a58e HEAD` passed.
- RAW/ubiquitous-language review passed against Rules Glossary Short Rest, Long Rest, Hit Point Dice, Hit Points, Playing the Game Hit Points and Temporary Hit Points, `UBIQUITOUS_LANGUAGE.md`, and `packages/character-sheet-runtime/README.md`.
- Focused Character Sheet deterministic replay passed: `START=$(date +%s); pnpm --filter @dnd/character-sheet-runtime exec vitest run src/hp-rest-hit-dice.mbt.test.ts src/reducer-route-connectors.mbt.test.ts -t "HP rest|Hit Dice" 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 2 tests; final timed run `TOTAL: 13s`.
- Target evidence subset validation passed with 13 covered obligations.
- Targeted typecheck passed: `pnpm --filter @dnd/character-sheet-runtime typecheck`.
- Requested broad verification `flock /tmp/dnd-mbt-qnt.lock pnpm quality` reached repo-wide typecheck and failed in unrelated baseline code: `packages/character-creation-runtime/src/index.test.ts(10401,5): error TS2322: Type 'string' is not assignable to type "species_gnome_gnomish_lineage".` No Task 100 files are in that ownership surface.
- Reviewer-loop convergence passed: round 1 verified RAW traceability, ubiquitous-language/domain terms, no duplicate HP or Hit Dice capacity state, rest owner boundaries, explicit Short Rest benefit-choice fills, and no remaining reasonable code-review findings.

## CRPI-READY-029

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`
- Driver path: `packages/battle-runtime/rule-core-hit-point-damage.mbt.qnt`
- Component connector path: `packages/battle-runtime/rule-core-hit-point-damage.mbt.qnt`
- Route class: `component-first`
- Durable owner: `RuleCoreHitPointDamageOwner`
- Accepted projection: `qComponentRoute`
- Status: `accepted`
- Evidence file: `tasks/target-replay-evidence/CRPI-READY-029.json`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/battle-runtime/rule-core-hit-point-damage.mbt.qnt`
- `packages/battle-runtime/rule-core-component-route.qnt`
- `packages/battle-runtime/src/rule-core-hit-point-damage.mbt.test.ts`
- `packages/battle-runtime/src/rule-core-component-route.ts`
- `packages/battle-runtime/src/battle-reducer/damage-apply.ts`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

The component-first replay for rule-core Hit Point damage now has accepted target
evidence for the copied `qComponentRoute` projection. The target harness records
the reusable component route sequence parse input, admit input, call
`RuleCoreHitPointDamageOwner`, and project result before downstream attack,
stat-block, and spell-effect routes consume this owner.

Runtime projections are produced through public battle-runtime Hit Point damage
application via `applyBattleHitPointDamage` and `hpDamageProjection`, then
compared to the copied component connector route. No production reducer state
was added: current Hit Points, Hit Point Maximum, Temporary Hit Points,
Unconscious condition, and zero-HP lifecycle facts remain on existing
`BattleCreatureState` fields.

Generated branch coverage:

| Obligation                                                                                         | Evidence                                                                                                                                                                                                                                                                                                 | Harness                                                                                                                                | Status    |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `packages/battle-runtime/rule-core-hit-point-damage.mbt.qnt#step:doTemporaryHitPointsAbsorbFirst`  | `tasks/target-replay-evidence/CRPI-READY-029.json#driver:packages/battle-runtime/rule-core-hit-point-damage.mbt.qnt#step:doTemporaryHitPointsAbsorbFirst#trace:component-route=RuleCoreHitPointDamageOwner action=doTemporaryHitPointsAbsorbFirst qComponentRoute=hit-point-damage-component-route`  | `packages/battle-runtime/src/rule-core-hit-point-damage.mbt.test.ts#replays positive-HP resolved damage against battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-hit-point-damage.mbt.qnt#step:doMonsterDiesAtZero`              | `tasks/target-replay-evidence/CRPI-READY-029.json#driver:packages/battle-runtime/rule-core-hit-point-damage.mbt.qnt#step:doMonsterDiesAtZero#trace:component-route=RuleCoreHitPointDamageOwner action=doMonsterDiesAtZero qComponentRoute=hit-point-damage-component-route`                          | `packages/battle-runtime/src/rule-core-hit-point-damage.mbt.test.ts#replays positive-HP resolved damage against battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-hit-point-damage.mbt.qnt#step:doPlayerCharacterFallsUnconscious` | `tasks/target-replay-evidence/CRPI-READY-029.json#driver:packages/battle-runtime/rule-core-hit-point-damage.mbt.qnt#step:doPlayerCharacterFallsUnconscious#trace:component-route=RuleCoreHitPointDamageOwner action=doPlayerCharacterFallsUnconscious qComponentRoute=hit-point-damage-component-route` | `packages/battle-runtime/src/rule-core-hit-point-damage.mbt.test.ts#replays positive-HP resolved damage against battle-runtime reducers` | `covered` |
| `packages/battle-runtime/rule-core-hit-point-damage.mbt.qnt#step:doPlayerCharacterDiesFromMassiveDamage` | `tasks/target-replay-evidence/CRPI-READY-029.json#driver:packages/battle-runtime/rule-core-hit-point-damage.mbt.qnt#step:doPlayerCharacterDiesFromMassiveDamage#trace:component-route=RuleCoreHitPointDamageOwner action=doPlayerCharacterDiesFromMassiveDamage qComponentRoute=hit-point-damage-component-route` | `packages/battle-runtime/src/rule-core-hit-point-damage.mbt.test.ts#replays positive-HP resolved damage against battle-runtime reducers` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-029.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id pattern: `component-route=RuleCoreHitPointDamageOwner action=<branchAction> qComponentRoute=hit-point-damage-component-route`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-029/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 71.

RAW / ubiquitous-language trace:

- SRD 5.2.1 Playing the Game: Hit Points cannot go below 0 and damage is subtracted from Hit Points.
- SRD 5.2.1 Playing the Game: Temporary Hit Points are lost before actual Hit Points.
- SRD 5.2.1 Playing the Game: monsters die when they drop to 0 Hit Points unless the GM treats one like a character.
- SRD 5.2.1 Playing the Game: a character at 0 Hit Points falls Unconscious unless Instant Death applies.
- SRD 5.2.1 Playing the Game: Massive Damage kills a character when remaining damage at 0 equals or exceeds Hit Point Maximum.
- `UBIQUITOUS_LANGUAGE.md`: Temporary Hit Points are absorbed before HP, and Instant Death is the 0-HP remaining-damage threshold.

Verification results:

- Base check passed: `git log --oneline -1 codex/cleanroom-reducer-full-lane-20260705-restart2` and `git log --oneline -1 HEAD` both resolved to `5a3fb5554 Merge Ralph task 100 status`; `git merge-base --is-ancestor 5a3fb555472b3a1adbb66da59d5c161b91e8f954 HEAD` passed.
- JSON validation passed: `jq empty tasks/target-replay-evidence/CRPI-READY-029.json tasks/ENGINE_DEPTH_MANIFEST.json tasks/STATE_OWNER_MANIFEST.json`.
- Pre-MBT process checks passed: no existing `vitest` or `quint_evaluator` processes were running.
- Focused MBT replay passed: `START=$(date +%s); cd packages/battle-runtime && MBT_TRACES=1 MBT_STEPS=4 pnpm exec vitest run src/rule-core-hit-point-damage.mbt.test.ts 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 1 test in `TOTAL: 9s`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `pnpm cleanroom-harness:check` passed.
- `git diff --check` passed.
- Requested broad verification passed: `flock /tmp/dnd-mbt-qnt.lock pnpm quality`.
- Reviewer-loop convergence passed: RAW traceability, ubiquitous-language/domain language, architecture/connascence, and code-review checks found no remaining reasonable Task 71 findings.

## CRPI-READY-028

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`
- Driver path: `packages/battle-runtime/rule-core-features.mbt.qnt`
- Component connector path: `packages/battle-runtime/rule-core-features.mbt.qnt`
- Route class: `component-first`
- Durable owner: `RuleCoreFeatureProfileSemanticsOwner`
- Accepted projection: `qComponentRoute`
- Status: `accepted`
- Evidence file: `tasks/target-replay-evidence/CRPI-READY-028.json`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/battle-runtime/rule-core-component-route.qnt`
- `packages/battle-runtime/battle-runtime-witness-protocol.qnt`
- `packages/battle-runtime/rule-core-features.mbt.qnt`
- `packages/battle-runtime/src/rule-core-features.mbt.test.ts`
- `packages/battle-runtime/src/rule-core-component-route.ts`
- `packages/battle-runtime/src/unit-feature-support.ts`
- `packages/battle-runtime/src/battle-reducer/movement-speed.ts`
- `packages/battle-runtime/src/unit-profile-admission-extra-attack-and-speed-features.test.ts`
- `packages/character-sheet-runtime/src/ability-checks.ts`
- `packages/character-sheet-runtime/src/ability-checks.test.ts`
- `plans/unit-profile-coverage/character-sheet-owner-evidence.json`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `plans/unit-profile-coverage/unit-matrix.json`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Task 70 now restores the required aggregate driver at `packages/battle-runtime/rule-core-features.mbt.qnt`. The driver is a self-contained literal projection witness for the existing QCORE9 feature action set; it imports only the leaf component-route and witness-protocol modules and does not import the split feature drivers. The target harness now runs the aggregate path and compares the copied `qComponentRoute` projection against the target component admission/call/projection surface through `withRuleCoreComponentRoute` and `normalizeRuleCoreFeatureQuintState`.

The task-specific `rogue_second_story_work` row is also covered. Character-sheet projection already exposes the linked Climb Speed and Dexterity-for-jump-distance substitution from the passive mechanics. Battle-runtime admission now accepts a passive class feature with a single linked Climb Speed grant, and movement projection derives Climb Speed from current walk Speed without adding durable climb or jump state.

Generated coverage:

| Obligation                                                           | Evidence                                                                                                                                                                                                                                                                     | Harness                                                                                                                              | Status    |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| `packages/battle-runtime/rule-core-features.mbt.qnt#qComponentRoute` | `tasks/target-replay-evidence/CRPI-READY-028.json#driver:packages/battle-runtime/rule-core-features.mbt.qnt#step:sampledTrace#trace:component-route=RuleCoreFeatureProfileSemanticsOwner qComponentRoute=feature-profile-semantics-component-route MBT_TRACES=1 MBT_STEPS=6` | `packages/battle-runtime/src/rule-core-features.mbt.test.ts#replays QCORE9 aggregate feature family through battle-runtime reducers` | `covered` |
| `rogue_second_story_work#linked-climb-speed-character-sheet`         | `tasks/target-replay-evidence/CRPI-READY-028.json#owner:CharacterSheetLinkedSpeedGrantProjectionOwner#unit:rogue_second_story_work`                                                                                                                                          | `packages/character-sheet-runtime/src/ability-checks.test.ts#Second-Story Work`                                                      | `covered` |
| `rogue_second_story_work#dexterity-jump-distance-character-sheet`    | `tasks/target-replay-evidence/CRPI-READY-028.json#owner:CharacterSheetJumpDistanceAbilitySubstitutionOwner#unit:rogue_second_story_work`                                                                                                                                     | `packages/character-sheet-runtime/src/ability-checks.test.ts#Second-Story Work`                                                      | `covered` |
| `rogue_second_story_work#linked-climb-speed-battle-admission`        | `tasks/target-replay-evidence/CRPI-READY-028.json#owner:BattlePassiveSpeedKindGrantAdmissionOwner#unit:rogue_second_story_work`                                                                                                                                              | `packages/battle-runtime/src/unit-profile-admission-extra-attack-and-speed-features.test.ts#Second-Story Work`                       | `covered` |
| `rogue_second_story_work#linked-climb-speed-battle-projection`       | `tasks/target-replay-evidence/CRPI-READY-028.json#owner:BattlePassiveSpeedKindGrantProjectionOwner#unit:rogue_second_story_work`                                                                                                                                             | `packages/battle-runtime/src/unit-profile-admission-extra-attack-and-speed-features.test.ts#Second-Story Work`                       | `covered` |

Branch coverage note:

The aggregate `step` action contains 27 alternatives. The recorded MBT run used `MBT_TRACES=1 MBT_STEPS=6`, so this report claims aggregate `qComponentRoute` replay only. It does not claim branch-by-branch coverage for all 27 alternatives.

Remaining gaps:

- none for Task 70.

RAW / ubiquitous-language trace:

- SRD 5.2.1 Rules Glossary: Climbing says a creature can use Climb Speed in place of Speed for vertical movement.
- SRD 5.2.1 Rules Glossary: Jumping, Long Jump, and High Jump define jump distance from Strength by default.
- `UBIQUITOUS_LANGUAGE.md`: Speed is a movement capacity, and Long Jump / High Jump are Strength-based by default. Task 70's Second-Story Work projection changes the jump-distance ability from Strength to Dexterity only for the selected feature.

Verification results:

- Decider base check passed on integration: `HEAD` was `84e17424b Merge Ralph route replay tasks 61-69` before applying Task 70, and `git merge-base --is-ancestor 5d418bba6a15834d7847f66f00deff3a8b2bd02e HEAD` passed.
- `pnpm exec quint typecheck packages/battle-runtime/rule-core-features.mbt.qnt` passed.
- `pnpm check:mbt-driver-closure` passed.
- Aggregate MBT replay passed: `MBT_TRACES=1 MBT_STEPS=6 pnpm exec vitest run src/rule-core-features.mbt.test.ts -t "aggregate feature family"` passed in 12s.
- `pnpm --filter @dnd/character-sheet-runtime exec vitest run src/ability-checks.test.ts -t "Second-Story Work"` passed.
- `pnpm --filter @dnd/battle-runtime exec vitest run src/unit-profile-admission-extra-attack-and-speed-features.test.ts -t "Second-Story Work|Roving"` passed.
- `pnpm --filter @dnd/battle-runtime exec tsc --noEmit` passed.
- `pnpm unit-profile-coverage:check` passed.
- `git diff --check` passed.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `pnpm quality` passed all gates through `pnpm circular`, then failed in the final `turbo typecheck` step on untouched baseline file `packages/character-creation-runtime/src/index.test.ts(10401,5)`: `Type 'string' is not assignable to type '"species_gnome_gnomish_lineage"'`. This is outside the Task 70 touched ownership surface.

Plan Impact:

- Status: `none`
- Affected task: `CRPI-READY-028` should be unblocked/accepted.
- Affected backlog entries: split feature driver backlog entries are left unchanged.
- Observations: the aggregate route replay is sampled; branch-by-branch evidence should be produced by a separate deterministic branch replay task if the plan needs that stronger claim.
- Required plan edits: none.

## CRPI-READY-027

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`
- Driver: `packages/battle-runtime/rule-core-attack-damage-disposition.mbt.qnt`
- Component connector: `packages/battle-runtime/rule-core-attack-damage-disposition.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/battle-runtime/rule-core-attack-damage-disposition.mbt.qnt`
- `packages/battle-runtime/rule-core-component-route.qnt`
- `packages/battle-runtime/src/rule-core-attack-damage-disposition.mbt.test.ts`
- `packages/battle-runtime/src/rule-core-component-route.ts`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

The component-first replay for attack damage disposition now has accepted target
evidence for the copied `qComponentRoute` projection. The target harness records
the reusable component route sequence parse input, admit input, call
`RuleCoreAttackDamageDispositionOwner`, and project result before downstream attack route tasks consume
this owner. The observed runtime projections are produced through public
battle-runtime attack resolution for melee Knock Out acceptance and ranged Knock
Out rejection, then compared to the copied component connector route.

No production reducer state was added. Knock Out acceptance reuses existing
`BattleCreatureState` Hit Points, Unconscious condition, and zero-HP lifecycle
state. Ranged Knock Out rejection reuses the existing typed attack kind and
invalid-resolution path. The component route is owned by typed route vocabulary,
not authored spell identity, QNT branch names, witness field names, fixture
labels, or connector filenames.

Generated branch coverage:

| Obligation                                                                                        | Evidence                                                                                                                                                                                                                                                                                                     | Harness                                                                                                                                     | Status    |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `packages/battle-runtime/rule-core-attack-damage-disposition.mbt.qnt#step:doMeleeKnockOut`        | `tasks/target-replay-evidence/CRPI-READY-027.json#driver:packages/battle-runtime/rule-core-attack-damage-disposition.mbt.qnt#step:doMeleeKnockOut#trace:component-route=RuleCoreAttackDamageDispositionOwner action=doMeleeKnockOut qComponentRoute=attack-damage-disposition-component-route`               | `packages/battle-runtime/src/rule-core-attack-damage-disposition.mbt.test.ts#replays Knock Out disposition acceptance and ranged rejection` | `covered` |
| `packages/battle-runtime/rule-core-attack-damage-disposition.mbt.qnt#step:doRejectRangedKnockOut` | `tasks/target-replay-evidence/CRPI-READY-027.json#driver:packages/battle-runtime/rule-core-attack-damage-disposition.mbt.qnt#step:doRejectRangedKnockOut#trace:component-route=RuleCoreAttackDamageDispositionOwner action=doRejectRangedKnockOut qComponentRoute=attack-damage-disposition-component-route` | `packages/battle-runtime/src/rule-core-attack-damage-disposition.mbt.test.ts#replays Knock Out disposition acceptance and ranged rejection` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-027.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id pattern: `component-route=RuleCoreAttackDamageDispositionOwner action=<branchAction> qComponentRoute=attack-damage-disposition-component-route`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-027/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 69.

Verification results:

- Base check passed: `git log --oneline -1 ralph/cleanroom-reducer-full-lane-20260704T211636Z/integration` and `git log --oneline -1 HEAD` both resolved to `547d20c6c Mark Ralph task 68 done`; `git merge-base --is-ancestor 547d20c6c4d960c049c918d360aa704880ee4b3c HEAD` passed.
- RAW/ubiquitous-language review passed against Making an Attack, Damage Rolls, Hit Points, Knocking Out a Creature, Dropping to 0 Hit Points, and `UBIQUITOUS_LANGUAGE.md` terms Knock Out and Unconscious.
- Focused MBT replay passed: `START=$(date +%s); MBT_TRACES=1 MBT_STEPS=2 pnpm --filter @dnd/battle-runtime exec vitest run src/rule-core-attack-damage-disposition.mbt.test.ts 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 1 test; final timed run `TOTAL: 7s`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- `pnpm quality` passed end to end; app lint reported warnings only and exited 0.
- Reviewer-loop convergence passed: round 1 verified RAW traceability, ubiquitous-language/domain terms, component-first architecture, adapter quarantine, no duplicate durable state, no authored-identity dispatch, and no remaining reasonable code-review findings.

## CRPI-READY-026

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`
- Driver: `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt`
- Component connector: `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt`
- `packages/battle-runtime/rule-core-component-route.qnt`
- `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts`
- `packages/battle-runtime/src/rule-core-component-route.ts`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

The component-first replay for ability checks, skills, Search, Guidance,
Enhance Ability, and Command now has accepted target evidence for the copied
`qComponentRoute` projection. The target harness records the reusable
component route sequence parse input, admit input, call `RuleCoreAbilitySkillCommandOwner`,
and project result before downstream battle route tasks consume this owner. The
observed runtime projections are produced through public battle-runtime Search,
Guidance, Enhance Ability, and Command calls, then compared to the copied
component connector route.

No production reducer state was added. Search reveal state remains
`BattleCreatureState.hidden`, skill and ability roll-modifier effects remain
`BattleCreatureState.activeEffects`, Command pending/effect state remains
active effects plus existing condition, movement, turn-resource, and
interrupt-stack state. The component route is owned by typed route vocabulary,
not authored spell identity, QNT branch names, witness field names, fixture
labels, or connector filenames.

Generated branch coverage:

| Obligation                                                                                                  | Evidence                                                                                                                                                                                                                                                                                                                     | Harness                                                                                                                                     | Status    |
| ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doCommandCastGrovel`                  | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doCommandCastGrovel#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doCommandCastGrovel qComponentRoute=ability-skill-command-component-route`                                   | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doCommandFollowApproachContinues`     | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doCommandFollowApproachContinues#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doCommandFollowApproachContinues qComponentRoute=ability-skill-command-component-route`         | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doCommandFollowApproachNoMovement`    | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doCommandFollowApproachNoMovement#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doCommandFollowApproachNoMovement qComponentRoute=ability-skill-command-component-route`       | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doCommandFollowApproachWithinFive`    | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doCommandFollowApproachWithinFive#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doCommandFollowApproachWithinFive qComponentRoute=ability-skill-command-component-route`       | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doCommandFollowDrop`                  | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doCommandFollowDrop#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doCommandFollowDrop qComponentRoute=ability-skill-command-component-route`                                   | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doCommandFollowFlee`                  | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doCommandFollowFlee#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doCommandFollowFlee qComponentRoute=ability-skill-command-component-route`                                   | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doCommandFollowFleeNoMovement`        | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doCommandFollowFleeNoMovement#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doCommandFollowFleeNoMovement qComponentRoute=ability-skill-command-component-route`               | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doCommandFollowFleeOpportunityAttack` | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doCommandFollowFleeOpportunityAttack#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doCommandFollowFleeOpportunityAttack qComponentRoute=ability-skill-command-component-route` | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doCommandFollowFleePartialRejected`   | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doCommandFollowFleePartialRejected#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doCommandFollowFleePartialRejected qComponentRoute=ability-skill-command-component-route`     | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doCommandFollowGrovel`                | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doCommandFollowGrovel#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doCommandFollowGrovel qComponentRoute=ability-skill-command-component-route`                               | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doCommandHaltSuppresses`              | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doCommandHaltSuppresses#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doCommandHaltSuppresses qComponentRoute=ability-skill-command-component-route`                           | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doEnhanceAbilityChoice`               | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doEnhanceAbilityChoice#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doEnhanceAbilityChoice qComponentRoute=ability-skill-command-component-route`                             | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillAcrobatics`            | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillAcrobatics#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doGuidanceSkillAcrobatics qComponentRoute=ability-skill-command-component-route`                       | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillAnimalHandling`        | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillAnimalHandling#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doGuidanceSkillAnimalHandling qComponentRoute=ability-skill-command-component-route`               | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillArcana`                | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillArcana#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doGuidanceSkillArcana qComponentRoute=ability-skill-command-component-route`                               | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillAthletics`             | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillAthletics#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doGuidanceSkillAthletics qComponentRoute=ability-skill-command-component-route`                         | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillDeception`             | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillDeception#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doGuidanceSkillDeception qComponentRoute=ability-skill-command-component-route`                         | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillHistory`               | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillHistory#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doGuidanceSkillHistory qComponentRoute=ability-skill-command-component-route`                             | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillInsight`               | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillInsight#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doGuidanceSkillInsight qComponentRoute=ability-skill-command-component-route`                             | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillIntimidation`          | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillIntimidation#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doGuidanceSkillIntimidation qComponentRoute=ability-skill-command-component-route`                   | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillInvestigation`         | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillInvestigation#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doGuidanceSkillInvestigation qComponentRoute=ability-skill-command-component-route`                 | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillMedicine`              | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillMedicine#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doGuidanceSkillMedicine qComponentRoute=ability-skill-command-component-route`                           | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillNature`                | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillNature#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doGuidanceSkillNature qComponentRoute=ability-skill-command-component-route`                               | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillPerception`            | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillPerception#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doGuidanceSkillPerception qComponentRoute=ability-skill-command-component-route`                       | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillPerformance`           | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillPerformance#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doGuidanceSkillPerformance qComponentRoute=ability-skill-command-component-route`                     | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillPersuasion`            | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillPersuasion#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doGuidanceSkillPersuasion qComponentRoute=ability-skill-command-component-route`                       | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillReligion`              | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillReligion#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doGuidanceSkillReligion qComponentRoute=ability-skill-command-component-route`                           | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillSleightOfHand`         | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillSleightOfHand#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doGuidanceSkillSleightOfHand qComponentRoute=ability-skill-command-component-route`                 | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillStealth`               | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillStealth#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doGuidanceSkillStealth qComponentRoute=ability-skill-command-component-route`                             | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillSurvival`              | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doGuidanceSkillSurvival#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doGuidanceSkillSurvival qComponentRoute=ability-skill-command-component-route`                           | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doSearchFails`                        | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doSearchFails#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doSearchFails qComponentRoute=ability-skill-command-component-route`                                               | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |
| `packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doSearchSucceeds`                     | `tasks/target-replay-evidence/CRPI-READY-026.json#driver:packages/battle-runtime/rule-core-ability-skill-command.mbt.qnt#step:doSearchSucceeds#trace:component-route=RuleCoreAbilitySkillCommandOwner action=doSearchSucceeds qComponentRoute=ability-skill-command-component-route`                                         | `packages/battle-runtime/src/rule-core-ability-skill-command.mbt.test.ts#replays closed reducer choices and Command next-turn consequences` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-026.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id pattern: `component-route=RuleCoreAbilitySkillCommandOwner action=<branchAction> qComponentRoute=ability-skill-command-component-route`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-026/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 68.

Verification results:

- Base check passed: `git log --oneline -1 codex/cleanroom-reducer-full-lane-20260704T211636Z` resolved to `10baec507 Mark Ralph task 45 done`; `git log --oneline -1 HEAD` resolved to `aa332e50c Mark Ralph task 66 done`; `git merge-base --is-ancestor aa332e50c603653b886e028c2c9844cbad43f1e2 HEAD` passed.
- RAW/ubiquitous-language review passed against Ability Checks, Skill Proficiencies, Search [Action], Guidance, Enhance Ability, Command, and `UBIQUITOUS_LANGUAGE.md` terms Action, Spell Effect, Movement, Reaction, and Condition.
- Focused MBT replay passed: `START=$(date +%s); MBT_TRACES=1 MBT_STEPS=32 pnpm --filter @dnd/battle-runtime exec vitest run src/rule-core-ability-skill-command.mbt.test.ts 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 1 test; final timed run `TOTAL: 46s`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- `pnpm quality` passed end to end; app lint reported warnings only and exited 0.
- Reviewer-loop convergence passed: round 1 verified RAW traceability, ubiquitous-language/domain terms, component-first architecture, adapter quarantine, no duplicate durable state, no authored-identity dispatch, and no remaining reasonable code-review findings; final verification commands passed.

## CRPI-READY-025

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`
- Driver: `packages/battle-runtime/battle-runtime-zero-hit-point-mid-resolution.mbt.qnt`
- Route connector: `packages/battle-runtime/battle-runtime-zero-hit-point-mid-resolution.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`
- Acceptance status: `accepted`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-zero-hit-point-mid-resolution.mbt.qnt`
- `packages/battle-runtime/battle-runtime-zero-hit-point-mid-resolution.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-reducer-route.qnt`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md`
- `UBIQUITOUS_LANGUAGE.md`

Files changed for the replay:

- `packages/battle-runtime/src/battle-reducer/reducer-route.ts`
- `packages/battle-runtime/src/zero-hit-point-mid-resolution.mbt.test.ts`
- `tasks/target-replay-evidence/CRPI-READY-025.json`
- `tasks/history/CRPI-READY-025/README.md`
- `tasks/ENGINE_DEPTH_MANIFEST.json`
- `tasks/STATE_OWNER_MANIFEST.json`
- `tasks/RUN_LEDGER.json`
- `tasks/VALIDATION_REPORT.md`

The target route begins with `battleReducerStartRouteEvent`, discovers the spell
attack sequence through `discoverBattleActs`, and observes copied `qRoute`
events through public `resolveBattleSubject` calls. The replay covers Eldritch
Blast target selection, first Attack Roll, first damage, the Concentration
Saving Throw frontier, zero-Hit-Point Unconscious condition transition,
Concentration teardown, dependent Spell Effect cleanup, and second-beam
continuation against post-teardown state.

No duplicate durable state was introduced. Hit Points remain
`BattleCreatureState.hp`; zero-Hit-Point condition state remains
`BattleCreatureState.conditions`; Concentration remains
`BattleCreatureState.concentration`; dependent Spell Effect cleanup remains
`BattleCreatureState.activeEffects`. Route admission is derived from typed spell
attack sequence fills, route hole families, and before/after BattleState facts.
No authored spell name, QNT branch name, witness field name, connector filename,
or fixture label is used for production behavior dispatch.

Branch evidence:

| Obligation                                                                                                 | Evidence                                                                                                                                                                                                                                                                                              | Harness                                                                                                                                              | Status    |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `packages/battle-runtime/battle-runtime-zero-hit-point-mid-resolution.mbt.qnt#step:doResolveEldritchBlast` | `tasks/target-replay-evidence/CRPI-READY-025.json#driver:packages/battle-runtime/battle-runtime-zero-hit-point-mid-resolution.mbt.qnt#step:doResolveEldritchBlast#trace:public-route=zeroHitPointSpellEffectTeardown action=doResolveEldritchBlast qRoute=zero-hit-point-mid-resolution-public-route` | `packages/battle-runtime/src/zero-hit-point-mid-resolution.mbt.test.ts#observes the copied zero-Hit-Point qRoute through public reducer entrypoints` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-025.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id: `public-route=zeroHitPointSpellEffectTeardown action=doResolveEldritchBlast qRoute=zero-hit-point-mid-resolution-public-route`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-025/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 66.

Plan Impact:

- Status: `none`
- Affected task: Task 66 / `CRPI-READY-025` is unblocked by accepted copied `qRoute` replay evidence.
- Observations:
  - `spellAttackProcedure` route holes for spell attack sequences represent remaining procedure families, not only the immediate public hole frontier.
  - `zeroHitPointSpellEffectTeardown` is now a public reducer route subject derived from existing zero-Hit-Point, condition, Concentration, and active-effect state transitions.
- Required plan edits: none.

Verification results:

- Base check passed: the required codex base ref `codex/cleanroom-reducer-full-lane-20260704T211636Z` resolved to `10baec507 Mark Ralph task 45 done`; `HEAD` resolved to `e000fb182 Mark Ralph task 65 done`; the task Base SHA `e000fb1829090dadff171c1a5ffc108c36aadf44` was an ancestor of `HEAD`, and `HEAD` is exactly the Base SHA.
- RAW/ubiquitous-language review passed against SRD 5.2.1 `.references/srd-5.2.1/Playing-the-Game.md#Dropping to 0 Hit Points` and `#Falling Unconscious`, `.references/srd-5.2.1/Rules-Glossary.md#Concentration`, `#Incapacitated`, and `#Unconscious`, `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Eldritch Blast`, `.references/srd-5.2.1/Spells/Descriptions-S-Z.md#Shield of Faith`, and `UBIQUITOUS_LANGUAGE.md` terms Hit Points, Unconscious, Incapacitated, Concentration, Spell Effect, and Spell Attack.
- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- `pnpm --filter @dnd/battle-runtime exec vitest run src/zero-hit-point-mid-resolution.mbt.test.ts -t "does not route readied-spell"` passed with 1 test; readied-spell Concentration cleanup at 0 HP does not emit `zeroHitPointSpellEffectTeardown`.
- Initial timed focused MBT replay failed because production route projection still exposed the immediate spell-attack-sequence hole frontier and object target boundary instead of the copied procedure-level route holes. The route projection was corrected before the passing run.
- MBT process precheck passed before each timed focused replay: `ps aux | grep vitest | grep -v grep` and `ps aux | grep quint_evaluator | grep -v grep` found no running processes; no evaluator cleanup was needed.
- `START=$(date +%s); pnpm --filter @dnd/battle-runtime exec vitest run src/zero-hit-point-mid-resolution.mbt.test.ts 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 4 tests; copied `qRoute` was compared to public `battleReducerStartRouteEvent`, `discoverBattleActs`, and `resolveBattleSubject` route events for `doResolveEldritchBlast`, and readied-spell Concentration cleanup stayed out of the spell-effect teardown route; final timed run `TOTAL: 7s`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- `pnpm quality` passed end to end; app lint reported warnings only and exited 0.
- Reviewer-loop convergence round 1 identified and fixed the missing production `zeroHitPointSpellEffectTeardown` route subject and Concentration Saving Throw ownership; round 2 identified and fixed spell-attack-sequence route hole projection so public replay matches copied `qRoute`; round 3 corrected task-base artifact wording; round 4 gated `zeroHitPointSpellEffectTeardown` on spell-effect Concentration and added readied-spell negative coverage.

## CRPI-READY-024

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`
- Driver: `packages/battle-runtime/battle-runtime-weapon-mastery-selected-identity.mbt.qnt`
- Route connector: `packages/battle-runtime/battle-runtime-weapon-mastery-selected-identity.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`
- Acceptance status: `accepted`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-weapon-mastery-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-weapon-mastery-selected-identity.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-reducer-route.qnt`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Equipment.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Weapon Mastery selected-identity replay now compares the copied
`WeaponMasteryPropertyRouteSubject` `qRoute` to public reducer route events.
The target driver derives its projection by calling public reducer entrypoints:
the route begins with `battleReducerStartRouteEvent`, discovers the weapon
Attack act through `discoverBattleActs`, then resolves target choice, Attack
Roll, damage roll, Saving Throw outcome, Unit Feature decision, and Cleave
second-attack fills through `resolveBattleSubject`.

The runtime does not add a parallel mastery-property ledger. Selected mastery
identity remains a catalog/admission reference; target Hit Points remain in
`BattleCreatureState.hp`; Topple Prone lifecycle remains in
`BattleCreatureState.conditions`; Sap next-Attack-Roll rider state remains in
`BattleCreatureState.activeEffects`; Cleave once-per-turn use remains in
`BattleState.currentTurnResources.weaponMasteryCleaveAttackersUsedThisTurn`.
Route admission is derived from typed weapon Attack fills, mastery rider hole
families, active-effect/condition state changes, and feature-resource
settlement.

Generated branch coverage:

| Obligation                                                                                                                             | Target replay evidence                                                                                                                                                                                                                                                                                                                    | Diagnostic tests                                                                                                                                   | Status    |
| -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `packages/battle-runtime/battle-runtime-weapon-mastery-selected-identity.mbt.qnt#step:doResolveSapMasteryPropertyHit`                  | `tasks/target-replay-evidence/CRPI-READY-024.json#driver:packages/battle-runtime/battle-runtime-weapon-mastery-selected-identity.mbt.qnt#step:doResolveSapMasteryPropertyHit#trace:public-route=weaponMasteryProperty action=doResolveSapMasteryPropertyHit qRoute=sap-active-effect-rider-public-route`                                  | `packages/battle-runtime/src/weapon-mastery-selected-identity.mbt.test.ts#compares Weapon Mastery property public reducer routes to copied qRoute` | `covered` |
| `packages/battle-runtime/battle-runtime-weapon-mastery-selected-identity.mbt.qnt#step:doResolveToppleMasteryPropertyFailedSavingThrow` | `tasks/target-replay-evidence/CRPI-READY-024.json#driver:packages/battle-runtime/battle-runtime-weapon-mastery-selected-identity.mbt.qnt#step:doResolveToppleMasteryPropertyFailedSavingThrow#trace:public-route=weaponMasteryProperty action=doResolveToppleMasteryPropertyFailedSavingThrow qRoute=topple-condition-rider-public-route` | `packages/battle-runtime/src/weapon-mastery-selected-identity.mbt.test.ts#compares Weapon Mastery property public reducer routes to copied qRoute` | `covered` |
| `packages/battle-runtime/battle-runtime-weapon-mastery-selected-identity.mbt.qnt#step:doResolveCleaveMasteryPropertySecondTargetHit`   | `tasks/target-replay-evidence/CRPI-READY-024.json#driver:packages/battle-runtime/battle-runtime-weapon-mastery-selected-identity.mbt.qnt#step:doResolveCleaveMasteryPropertySecondTargetHit#trace:public-route=weaponMasteryProperty action=doResolveCleaveMasteryPropertySecondTargetHit qRoute=cleave-second-target-hit-public-route`   | `packages/battle-runtime/src/weapon-mastery-selected-identity.mbt.test.ts#compares Weapon Mastery property public reducer routes to copied qRoute` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-024.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace ids:
  - `public-route=weaponMasteryProperty action=doResolveSapMasteryPropertyHit qRoute=sap-active-effect-rider-public-route`
  - `public-route=weaponMasteryProperty action=doResolveToppleMasteryPropertyFailedSavingThrow qRoute=topple-condition-rider-public-route`
  - `public-route=weaponMasteryProperty action=doResolveCleaveMasteryPropertySecondTargetHit qRoute=cleave-second-target-hit-public-route`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-024/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 65.

Plan Impact:

- Status: `none`
- Affected tasks:
  - Task 65 / `CRPI-READY-024`: `unblocked`; copied `qRoute` replay is accepted.
  - Future Weapon Mastery property expansion tasks for Graze, Nick, Push, Slow, and Vex: `left unchanged`.
- Observations:
  - Public reducer-route vocabulary now includes `weaponMasteryProperty` plus `unitFeatureDecision` holes/fills so Cleave can be represented without a fixture-local route table.
  - Existing BattleState owners already cover the durable facts required by the route: HP, active effects, conditions, and Cleave turn-use resources.
- Required plan edits: none.

Verification results:

- Base check passed: declared base ref `ralph/cleanroom-reducer-full-lane-20260704T211636Z/integration` was `e0a4a98bf Mark Ralph task 61 done`, `HEAD` was `e0a4a98bf Mark Ralph task 61 done`, and `git merge-base --is-ancestor e0a4a98bf52475bb489fb8aee4c6fbb0779a96be HEAD` exited 0.
- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- Initial focused route replay showed the deterministic Topple/Cleave route wrappers needed leaf action callbacks for the TS driver; the connector wrappers were changed to the existing `any { leaf }` pattern.
- `START=$(date +%s); MBT_TRACES=1 MBT_STEPS=1 pnpm --filter @dnd/battle-runtime exec vitest run src/weapon-mastery-selected-identity.mbt.test.ts 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 3 tests and `TOTAL: 10s`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- `pnpm quality` passed end to end. The app lint stage reported warnings only and exited 0.
- RAW/ubiquitous-language review passed against Equipment.md Mastery Properties, Sap, Topple, Cleave, and UBIQUITOUS_LANGUAGE.md terms for Mastery Property, Weapon Mastery, Attack Roll, Saving Throw, Condition, Rider, and Hit Points.
- Reviewer-loop convergence round 1 identified and fixed missing public route projection for ordinary weapon attacks, `unitFeatureDecision` route holes/fills, and deterministic wrapper callback shape; round 2 verified no duplicate durable state, no authored-identity dispatch, and no remaining reasonable RAW/domain, architecture/connascence, or code-review findings in the touched surface.

## CRPI-READY-019

- Manifest source commit SHA: `0da15bfe0871d5a45782c7ac355d622be8907d44`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`
- Driver: `packages/battle-runtime/battle-runtime-sorcerer-metamagic-spell-attack-sequence-selected-identity.mbt.qnt`
- Route connector: `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`
- Acceptance status: `accepted`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-sorcerer-metamagic-spell-attack-sequence-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-reducer-route.qnt`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Classes/Sorcerer.md`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Quickened Spell attack sequence selected-identity replay now compares the
copied `MetamagicBonusActionCastingTimeRouteSubject` `qRoute` to public reducer
route events. The MBT replay executes the connector's deterministic
`stepRouteBonusActionCastingTime` wrapper, which delegates to the copied
`doRouteBonusActionCastingTime` action and updates `qRoute`. The target driver
derives its projection by calling public reducer entrypoints: the route begins
with `battleReducerStartRouteEvent`, discovers the Quickened Eldritch Blast act
through `discoverBattleActs`, then resolves the sequence through
`resolveBattleSubject` with target-choice, Attack Roll, and damage-roll fills.

The runtime does not add a parallel Quickened Spell ledger. Sorcery Point spend
remains in `CharacterBattlePointPoolResourceState.pointsRemaining`, selected
Metamagic identity remains a catalog/selection/admission boundary, target Hit
Point changes remain in `BattleCreatureState.hp`, and route admission is
derived from typed Quickened Metamagic facts plus the promoted spell Attack
sequence procedure shape and fill frontier.

Generated branch coverage:

| Obligation                                                                                                                                             | Target replay evidence                                                                                                                                                                                                                                                                                                                                                       | Diagnostic tests                                                                                                                                                                    | Status    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `packages/battle-runtime/battle-runtime-sorcerer-metamagic-spell-attack-sequence-selected-identity.mbt.qnt#step:doResolveQuickenedSpellAttackSequence` | `tasks/target-replay-evidence/CRPI-READY-019.json#driver:packages/battle-runtime/battle-runtime-sorcerer-metamagic-spell-attack-sequence-selected-identity.mbt.qnt#step:doResolveQuickenedSpellAttackSequence#trace:public-route=metamagicBonusActionCastingTime action=doResolveQuickenedSpellAttackSequence qRoute=metamagic-quickened-spell-attack-sequence-public-route` | `packages/battle-runtime/src/sorcerer-metamagic-spell-attack-sequence-selected-identity.mbt.test.ts#compares Quickened Spell attack sequence public reducer route to copied qRoute` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-019.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id: `public-route=metamagicBonusActionCastingTime action=doResolveQuickenedSpellAttackSequence qRoute=metamagic-quickened-spell-attack-sequence-public-route`
- Copied connector replay assertion:
  - `packages/battle-runtime/src/sorcerer-metamagic-spell-attack-sequence-selected-identity.mbt.test.ts#compares Quickened Spell attack sequence public reducer route to copied qRoute`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-019/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 50.

Plan Impact:

- Status: `none`
- Affected tasks:
  - Task 50 / `CRPI-READY-019`: `unblocked`; copied `qRoute` replay is accepted.
  - Future metamagic route tasks: `left unchanged`.
- Observations:
  - Quickened spell Attack sequence uses the same bonus-action casting-time
    route as other Quickened spell procedures.
  - Terminal Quickened spell Attack sequence resolution must expose
    turn-boundary lock ownership when the final Attack Roll resolves the
    sequence without another damage-roll hole.
  - The route should stay derived from typed
    `action_casting_time_to_bonus_action_with_spell_turn_limit` facts and the
    spell Attack sequence procedure shape, not selected option identity.
- Required plan edits: none.

Verification results:

- Base check passed: declared base ref `ralph/cleanroom-reducer-full-lane-20260704T211636Z/integration` was `1a172c8c Mark Ralph task 49 done`, `HEAD` was `1a172c8c Mark Ralph task 49 done`, and `git merge-base --is-ancestor 1a172c8c9d49e4b69f24876c5b0d74b38ddb1b32 HEAD` exited 0.
- Initial focused replay attempt failed because the public reducer emitted a terminal `attackRoll`/`battleSpellAttackProcedure` event for the final missed Eldritch Blast attack where the copied route expects turn-boundary ownership.
- `START=$(date +%s); MBT_TRACES=1 MBT_STEPS=1 pnpm --filter @dnd/battle-runtime exec vitest run src/sorcerer-metamagic-spell-attack-sequence-selected-identity.mbt.test.ts 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 3 tests and `TOTAL: 7s` after the route-owner fix.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- `pnpm quality` passed end to end. The app lint stage reported warnings only and exited 0.
- RAW/ubiquitous-language review passed against Sorcerer Metamagic, Quickened Spell, Sorcery Points, Eldritch Blast, and UBIQUITOUS_LANGUAGE.md terms for Magic Action, Bonus Action, Spell Invocation, Spell Attack, Attack Roll, Damage Roll, Pool, and Spend.
- Reviewer-loop convergence round 1 identified and fixed the terminal sequence route-owner gap; round 2 verified no duplicate durable state, no authored-identity dispatch, and no remaining reasonable RAW/domain, architecture/connascence, or code-review findings in the touched surface.

## CRPI-READY-018

- Manifest source commit SHA: `0da15bfe0871d5a45782c7ac355d622be8907d44`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`
- Driver: `packages/battle-runtime/battle-runtime-sorcerer-metamagic-spell-attack-selected-identity.mbt.qnt`
- Route connector: `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`
- Acceptance status: `accepted`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-sorcerer-metamagic-spell-attack-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-reducer-route.qnt`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Classes/Sorcerer.md`
- `.references/srd-5.2.1/Spells/Descriptions-Q-R.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Quickened Spell attack selected-identity replay now compares the copied
`MetamagicBonusActionCastingTimeRouteSubject` `qRoute` to public reducer route
events. The MBT replay executes the connector's deterministic
`stepRouteBonusActionCastingTime` wrapper, which delegates to the copied
`doRouteBonusActionCastingTime` action and updates `qRoute`. The target driver
derives its projection by calling public reducer entrypoints: the route begins
with `battleReducerStartRouteEvent`, discovers the Quickened Ray of Frost act
through `discoverBattleActs`, then resolves target choice, Attack Roll, and
damage roll through `resolveBattleSubject`.

The runtime does not add a parallel Quickened Spell ledger. Sorcery Point spend
remains in `CharacterBattlePointPoolResourceState.pointsRemaining`, selected
Metamagic identity remains a catalog/selection/admission boundary, target Hit
Point changes remain in `BattleCreatureState.hp`, and the Ray of Frost
Speed-reduction Spell Effect remains in `BattleCreatureState.activeEffects`.
Route admission is derived from typed Quickened Metamagic facts plus the
promoted spell Attack damage procedure shape and fill frontier.

Generated branch coverage:

| Obligation                                                                                                                            | Target replay evidence                                                                                                                                                                                                                                                                                                                     | Diagnostic tests                                                                                                                                                  | Status    |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `packages/battle-runtime/battle-runtime-sorcerer-metamagic-spell-attack-selected-identity.mbt.qnt#step:doResolveQuickenedSpellAttack` | `tasks/target-replay-evidence/CRPI-READY-018.json#driver:packages/battle-runtime/battle-runtime-sorcerer-metamagic-spell-attack-selected-identity.mbt.qnt#step:doResolveQuickenedSpellAttack#trace:public-route=metamagicBonusActionCastingTime action=doResolveQuickenedSpellAttack qRoute=metamagic-quickened-spell-attack-public-route` | `packages/battle-runtime/src/sorcerer-metamagic-spell-attack-selected-identity.mbt.test.ts#compares Quickened Spell attack public reducer route to copied qRoute` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-018.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id: `public-route=metamagicBonusActionCastingTime action=doResolveQuickenedSpellAttack qRoute=metamagic-quickened-spell-attack-public-route`
- Copied connector replay assertion:
  - `packages/battle-runtime/src/sorcerer-metamagic-spell-attack-selected-identity.mbt.test.ts#compares Quickened Spell attack public reducer route to copied qRoute`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-018/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 49.

Plan Impact:

- Status: `none`
- Affected tasks:
  - Task 49 / `CRPI-READY-018`: `unblocked`; copied `qRoute` replay is accepted.
  - Future metamagic route tasks: `left unchanged`.
- Observations:
  - Quickened spell Attack uses the same bonus-action casting-time route as
    other Quickened spell procedures; for spell Attack damage, the copied route
    ends at turn-boundary lock ownership after the attack-roll frontier opens a
    damage-roll hole.
  - The route should stay derived from typed
    `action_casting_time_to_bonus_action_with_spell_turn_limit` facts and the
    spell Attack damage procedure shape, not selected option identity.
- Required plan edits: none.

Verification results:

- Base check passed: declared base ref `ralph/cleanroom-reducer-full-lane-20260704T211636Z/integration` was `e64b0f77e Mark Ralph task 48 done`, `HEAD` was `e64b0f77e Mark Ralph task 48 done`, and `git merge-base --is-ancestor e64b0f77ec0eaa1c813c3565afc6d934a118dcce HEAD` exited 0.
- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- `START=$(date +%s); MBT_TRACES=1 MBT_STEPS=1 pnpm --filter @dnd/battle-runtime exec vitest run src/sorcerer-metamagic-spell-attack-selected-identity.mbt.test.ts 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 3 tests passed and `TOTAL: 8s`.
- `START=$(date +%s); MBT_TRACES=1 MBT_STEPS=1 pnpm --filter @dnd/battle-runtime exec vitest run src/reducer-route-connectors.mbt.test.ts -t "Metamagic" 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 1 filtered connector test passed and `TOTAL: 6s`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- `pnpm quality` passed. The app lint stage reported warnings only and exited 0.
- RAW/ubiquitous-language review passed against Sorcerer Metamagic, Quickened Spell, Sorcery Points, Ray of Frost, and UBIQUITOUS_LANGUAGE.md terms for Magic Action, Bonus Action, Spell Invocation, Spell Effect, Attack Roll, Pool, and Spend.
- Reviewer-loop convergence passed: round 1 added copied Quickened spell Attack route connector evidence and public route ownership; round 2 verified route admission is typed by Quickened Metamagic facts, spell Attack damage procedure shape, target/attack/damage fills, and turn-boundary lock ownership. No duplicate durable state or authored-identity dispatch was added.

## CRPI-READY-017

- Manifest source commit SHA: `0da15bfe0871d5a45782c7ac355d622be8907d44`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`
- Driver: `packages/battle-runtime/battle-runtime-sorcerer-metamagic-selected-identity.mbt.qnt`
- Route connector: `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`
- Acceptance status: `accepted`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-sorcerer-metamagic-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-reducer-route.qnt`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Classes/Sorcerer.md`
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Quickened Spell save-gated damage selected-identity replay now compares the
copied `MetamagicBonusActionCastingTimeRouteSubject` `qRoute` to public reducer
route events. The MBT replay executes the connector's deterministic
`stepRouteQuickenedSaveGatedDamage` wrapper, which delegates to the copied
`doResolveQuickenedSaveGatedDamage` action and updates `qRoute`. The target
driver derives its projection by calling public reducer entrypoints: the route
begins with `battleReducerStartRouteEvent`, discovers the Quickened Burning
Hands act through `discoverBattleActs`, then resolves the Saving Throw outcome
and damage roll through `resolveBattleSubject`.

The runtime does not add a parallel Quickened Spell ledger. Sorcery Point spend
remains in `CharacterBattlePointPoolResourceState.pointsRemaining`, the
selected Metamagic identity remains a catalog/selection/admission boundary,
target Hit Point changes remain in `BattleCreatureState.hp`, and route
admission is derived from typed Quickened Metamagic facts plus the promoted
save-gated damage procedure shape and fill frontier.

Generated branch coverage:

| Obligation                                                                                                                   | Target replay evidence                                                                                                                                                                                                                                                                                                                     | Diagnostic tests                                                                                                                                                | Status    |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `packages/battle-runtime/battle-runtime-sorcerer-metamagic-selected-identity.mbt.qnt#step:doResolveQuickenedSaveGatedDamage` | `tasks/target-replay-evidence/CRPI-READY-017.json#driver:packages/battle-runtime/battle-runtime-sorcerer-metamagic-selected-identity.mbt.qnt#step:doResolveQuickenedSaveGatedDamage#trace:public-route=metamagicBonusActionCastingTime action=doResolveQuickenedSaveGatedDamage qRoute=metamagic-quickened-save-gated-damage-public-route` | `packages/battle-runtime/src/sorcerer-metamagic-selected-identity.mbt.test.ts#compares Quickened Spell save-gated damage public reducer route to copied qRoute` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-017.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id: `public-route=metamagicBonusActionCastingTime action=doResolveQuickenedSaveGatedDamage qRoute=metamagic-quickened-save-gated-damage-public-route`
- Copied connector replay assertion:
  - `packages/battle-runtime/src/sorcerer-metamagic-selected-identity.mbt.test.ts#compares Quickened Spell save-gated damage public reducer route to copied qRoute`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-017/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 48.

Plan Impact:

- Status: `none`
- Affected tasks:
  - Task 48 / `CRPI-READY-017`: `unblocked`; copied `qRoute` replay is accepted.
  - Future metamagic route tasks: `left unchanged`.
- Observations:
  - Quickened save-gated damage is a bonus-action casting-time route whose
    intermediate save fill can open a damage-roll frontier before final
    turn-boundary lock ownership.
  - The route should stay derived from typed
    `action_casting_time_to_bonus_action_with_spell_turn_limit` facts and the
    save-gated damage procedure shape, not selected option identity.
- Required plan edits: none.

Verification results:

- Base check passed: declared base ref `codex/cleanroom-reducer-full-lane-20260704T211636Z` was `10baec507 Mark Ralph task 45 done`, `HEAD` was `24768ffd2 Mark Ralph task 47 done`, and `git merge-base --is-ancestor 24768ffd24e479b66db931927e70f17cefb64ce6 HEAD` exited 0.
- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- `START=$(date +%s); MBT_TRACES=1 MBT_STEPS=1 pnpm --filter @dnd/battle-runtime exec vitest run src/sorcerer-metamagic-selected-identity.mbt.test.ts 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 3 tests passed and `TOTAL: 7s`.
- `START=$(date +%s); MBT_TRACES=1 MBT_STEPS=1 pnpm --filter @dnd/battle-runtime exec vitest run src/reducer-route-connectors.mbt.test.ts -t "Metamagic" 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 1 test passed and `TOTAL: 7s`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- `pnpm quality` passed. The app lint stage reported warnings only and exited 0.
- RAW/ubiquitous-language review passed against Sorcerer Metamagic, Quickened Spell, Sorcery Points, Burning Hands, and UBIQUITOUS_LANGUAGE.md terms for Magic Action, Bonus Action, Spell Invocation, Saving Throw, Pool, and Spend.
- Reviewer-loop convergence passed: round 1 added the copied route connector branch and public Quickened save-gated route ownership; round 2 verified route admission is based on typed Quickened Metamagic facts, promoted save-gated damage procedure shape, save/damage fills, and turn-boundary lock ownership, with no duplicate durable state or authored-identity dispatch.

## CRPI-READY-014

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`
- Driver: `packages/battle-runtime/battle-runtime-sorcerer-metamagic-extended-selected-identity.mbt.qnt`
- Route connector: `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`
- Acceptance status: `accepted`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-sorcerer-metamagic-extended-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-reducer-route.qnt`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Classes/Sorcerer.md`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Extended Spell selected-identity replay now compares the copied
`MetamagicSpellDurationProjectionRouteSubject` `qRoute` to public reducer
route events. The MBT replay executes the connector's deterministic
`stepRouteSpellDurationProjection` wrapper, which delegates to the copied
`doRouteSpellDurationProjection` action and updates `qRoute`. The target driver
derives its projection by calling public reducer entrypoints: the route begins
with `battleReducerStartRouteEvent`, discovers the Extended Enlarge/Reduce act
through `discoverBattleActs`, then resolves the willing creature target through
`resolveBattleSubject`. The emitted route records the feature-resource
discovery frontier, active Spell Effect ownership for the duration projection,
and Concentration ownership for the maintenance-save Advantage projection.

The runtime does not add a parallel Extended Spell ledger. Sorcery Point spend
remains in `CharacterBattlePointPoolResourceState.pointsRemaining`, selected
Metamagic identity remains a catalog/selection/admission boundary, doubled
duration remains in `BattleCreatureState.activeEffects`, and Concentration
maintenance save Advantage remains in `BattleCreatureState.concentration`.

Generated branch coverage:

| Obligation                                                                                                                                | Target replay evidence                                                                                                                                                                                                                                                                                                                                     | Diagnostic tests                                                                                                                                                          | Status    |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `packages/battle-runtime/battle-runtime-sorcerer-metamagic-extended-selected-identity.mbt.qnt#step:doResolveExtendedCreatureSizeIncrease` | `tasks/target-replay-evidence/CRPI-READY-014.json#driver:packages/battle-runtime/battle-runtime-sorcerer-metamagic-extended-selected-identity.mbt.qnt#step:doResolveExtendedCreatureSizeIncrease#trace:public-route=metamagicSpellDurationProjection action=doResolveExtendedCreatureSizeIncrease qRoute=metamagic-spell-duration-projection-public-route` | `packages/battle-runtime/src/sorcerer-metamagic-extended-selected-identity.mbt.test.ts#compares Extended Spell duration-projection public reducer route to copied qRoute` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-014.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id: `public-route=metamagicSpellDurationProjection action=doResolveExtendedCreatureSizeIncrease qRoute=metamagic-spell-duration-projection-public-route`
- Copied connector replay assertion:
  - `packages/battle-runtime/src/sorcerer-metamagic-extended-selected-identity.mbt.test.ts#compares Extended Spell duration-projection public reducer route to copied qRoute`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-014/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 45.

Plan Impact:

- Status: `none`
- Affected tasks:
  - Task 45 / `CRPI-READY-014`: `unblocked`; copied `qRoute` replay is accepted.
  - Future metamagic route tasks: `left unchanged`.
- Observations:
  - Extended Spell duration projection is a cast-property Metamagic route:
    discovery is owned by feature-resource admission, while resolution ownership
    is split across the active Spell Effect and Concentration state delta.
  - The route should stay derived from typed
    `duration_extension_and_concentration_save_advantage` facts and promoted
    duration-bearing spell procedure shape, not selected option identity.
- Required plan edits: none.

Verification results:

- Base check passed: `ralph/crpi-ready-014-launcher` and
  `HEAD` were both `69fbba65f Mark Ralph task 44 done`, and
  `git merge-base --is-ancestor 69fbba65fa73812fc773e9d38d958a966a426ac1 HEAD`
  exited 0.
- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- `START=$(date +%s); MBT_TRACES=1 MBT_STEPS=1 pnpm --filter @dnd/battle-runtime exec vitest run src/sorcerer-metamagic-extended-selected-identity.mbt.test.ts 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 3 tests passed and `TOTAL: 7s`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- `pnpm quality` passed. The app lint stage reported warnings only and exited 0.
- RAW/ubiquitous-language review passed against Sorcerer Metamagic, Extended
  Spell, Sorcery Points, Enlarge/Reduce, and UBIQUITOUS_LANGUAGE.md terms for
  Spell Invocation, Spell Effect, Pool, Spend, Duration, Concentration, Saving
  Throw, and Advantage.
- Reviewer-loop convergence passed: round 1 added public
  `metamagicSpellDurationProjection` route ownership; round 2 verified route
  admission is based on typed Extended Metamagic facts, promoted creature-size
  procedure shape, active-effect state delta, and Concentration state, with no
  duplicate durable state or authored-identity dispatch.

## CRPI-READY-013

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`
- Driver: `packages/battle-runtime/battle-runtime-sorcerer-metamagic-empowered-selected-identity.mbt.qnt`
- Route connector: `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`
- Acceptance status: `accepted`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-sorcerer-metamagic-empowered-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-reducer-route.qnt`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Classes/Sorcerer.md`
- `.references/srd-5.2.1/Spells/Descriptions-Q-R.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Empowered Spell selected-identity replay now compares the copied
`MetamagicDamageDiceRerollRouteSubject` `qRoute` to public reducer route
events. The MBT replay executes the connector's deterministic
`stepRouteDamageDiceReroll` wrapper, which delegates to the copied
`doRouteDamageDiceReroll` action and updates `qRoute`. The target driver derives
its projection by calling public reducer entrypoints: the route begins with
`battleReducerStartRouteEvent`, opens the typed damage-reroll frontier after the
Ray of Frost attack roll through `resolveBattleSubject`, then resolves the
Empowered rolled-dice fill through `resolveBattleSubject`. The emitted route
records the feature-resource discovery frontier, damage-roll ownership for the
original and replacement dice, and Hit Point ownership for final damage.

The runtime does not add a parallel Empowered Spell ledger. Sorcery Point spend
remains in `CharacterBattlePointPoolResourceState.pointsRemaining`, selected
Metamagic identity remains a catalog/selection/admission boundary, target HP and
active effect changes remain in `BattleCreatureState`, and route admission is
derived from the typed `damage_dice_reroll` facts on the spell damage-roll hole
and rolled-dice fill.

Generated branch coverage:

| Obligation                                                                                                                               | Target replay evidence                                                                                                                                                                                                                                                                                                                    | Diagnostic tests                                                                                                                                                      | Status    |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `packages/battle-runtime/battle-runtime-sorcerer-metamagic-empowered-selected-identity.mbt.qnt#step:doResolveEmpoweredSpellDamageReroll` | `tasks/target-replay-evidence/CRPI-READY-013.json#driver:packages/battle-runtime/battle-runtime-sorcerer-metamagic-empowered-selected-identity.mbt.qnt#step:doResolveEmpoweredSpellDamageReroll#trace:public-route=metamagicDamageDiceReroll action=doResolveEmpoweredSpellDamageReroll qRoute=metamagic-damage-dice-reroll-public-route` | `packages/battle-runtime/src/sorcerer-metamagic-empowered-selected-identity.mbt.test.ts#compares Empowered Spell damage-reroll public reducer route to copied qRoute` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-013.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id: `public-route=metamagicDamageDiceReroll action=doResolveEmpoweredSpellDamageReroll qRoute=metamagic-damage-dice-reroll-public-route`
- Copied connector replay assertion:
  - `packages/battle-runtime/src/sorcerer-metamagic-empowered-selected-identity.mbt.test.ts#compares Empowered Spell damage-reroll public reducer route to copied qRoute`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-013/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 44.

Plan Impact:

- Status: `none`
- Affected tasks:
  - Task 44 / `CRPI-READY-013`: `unblocked`; copied `qRoute` replay is accepted.
  - Future metamagic route tasks: `left unchanged`.
- Observations:
  - Empowered Spell is not a cast-time `BattleSubject.metamagic` selection in
    this route; the public route must be derived from the damage-roll hole's
    reroll option and the rolled-dice fill's reroll decision.
  - The route connector needed a deterministic `stepRouteDamageDiceReroll`
    wrapper for target replay, delegating directly to the copied
    `doRouteDamageDiceReroll` action without changing `qRoute` semantics.
- Required plan edits: none.

Verification results:

- Base check passed: `ralph/crpi-ready-013-empowered-route/integration` and
  `HEAD` were both `5c06f6b88 Mark Task 43 distant route replay done`, and
  `git merge-base --is-ancestor 5c06f6b8880a618c78f4dfa7949e7007e354b962 HEAD`
  exited 0.
- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- `START=$(date +%s); MBT_TRACES=1 MBT_STEPS=1 pnpm --filter @dnd/battle-runtime exec vitest run src/sorcerer-metamagic-empowered-selected-identity.mbt.test.ts 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 3 tests passed and `TOTAL: 8s`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- `pnpm quality` passed. The app lint stage reported warnings only and exited 0.
- RAW/ubiquitous-language review passed against Sorcerer Metamagic, Empowered
  Spell, Sorcery Points, Ray of Frost, and UBIQUITOUS_LANGUAGE.md terms for
  Magic Action, Spell Invocation, Damage Roll, Pool, Spend, Attack Roll, and
  Spell Effect.
- Reviewer-loop convergence passed: round 1 added public
  `metamagicDamageDiceReroll` route ownership; round 2 corrected route
  admission from cast-time Metamagic selection to typed damage-roll hole/fill
  facts; round 3 verified no duplicate durable state or authored-identity
  dispatch was added.

## CRPI-READY-012

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`
- Driver: `packages/battle-runtime/battle-runtime-sorcerer-metamagic-distant-selected-identity.mbt.qnt`
- Route connector: `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`
- Acceptance status: `accepted`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-sorcerer-metamagic-distant-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-reducer-route.qnt`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Classes/Sorcerer.md`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Distant Spell selected-identity replay now compares the copied
`MetamagicSpellRangeProjectionRouteSubject` `qRoute` to public reducer route
events. The MBT replay executes the connector's deterministic
`stepRouteSpellRangeProjection` wrapper, which delegates to the copied
`doRouteSpellRangeProjection` action and updates `qRoute`. The target driver
derives its projection by calling public reducer entrypoints: the route begins
with `battleReducerStartRouteEvent`, discovers the Distant object-light act
through `discoverBattleActs`, then resolves the object target through
`resolveBattleSubject`. The emitted route records the feature-resource
discovery frontier, the object-target boundary owner, and the target-selection
owner.

The runtime does not add a parallel Distant Spell ledger. Action economy and
spell use remain in `BattleState.currentTurnResources`, Sorcery Point spend
remains in `CharacterBattlePointPoolResourceState.pointsRemaining`, selected
Metamagic identity remains a catalog/selection/admission boundary, and Light
output remains `BattleState.lightEmitters`.

Generated branch coverage:

| Obligation                                                                                                                     | Target replay evidence                                                                                                                                                                                                                                                                                                          | Diagnostic tests                                                                                                                                                     | Status    |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `packages/battle-runtime/battle-runtime-sorcerer-metamagic-distant-selected-identity.mbt.qnt#step:doResolveDistantObjectLight` | `tasks/target-replay-evidence/CRPI-READY-012.json#driver:packages/battle-runtime/battle-runtime-sorcerer-metamagic-distant-selected-identity.mbt.qnt#step:doResolveDistantObjectLight#trace:public-route=metamagicSpellRangeProjection action=doResolveDistantObjectLight qRoute=metamagic-spell-range-projection-public-route` | `packages/battle-runtime/src/sorcerer-metamagic-distant-selected-identity.mbt.test.ts#compares Distant Spell range-projection public reducer route to copied qRoute` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-012.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id: `public-route=metamagicSpellRangeProjection action=doResolveDistantObjectLight qRoute=metamagic-spell-range-projection-public-route`
- Copied connector replay assertion:
  - `packages/battle-runtime/src/sorcerer-metamagic-distant-selected-identity.mbt.test.ts#compares Distant Spell range-projection public reducer route to copied qRoute`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-012/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 43.

Plan Impact:

- Status: `none`
- Affected tasks:
  - Task 43 / `CRPI-READY-012`: `unblocked`; copied `qRoute` replay is accepted.
  - Task 44 and later metamagic route tasks: `left unchanged`.
- Observations:
  - Distant object-light selected identity matches the copied metamagic
    `doRouteSpellRangeProjection` connector shape without synthetic route
    events or duplicate state.
  - The reusable route fact is the typed `spell_range_increase` Metamagic
    effect on an action-spell cast whose `objectLight` procedure consumes an
    object-target frontier.
- Required plan edits: none.

Verification results:

- Base check passed: `ralph/crpi-ready-012-metamagic-distant-route/integration`
  and `HEAD` were both `61011ccc7 Mark Task 42 metamagic careful route blocked`,
  and `git merge-base --is-ancestor 61011ccc7ba7300e5fc341b8944efafa43eedb18 HEAD`
  exited 0.
- `pnpm --filter @dnd/battle-runtime exec tsc --noEmit --pretty false` passed.
- `START=$(date +%s); MBT_TRACES=1 MBT_STEPS=1 pnpm --filter @dnd/battle-runtime exec vitest run src/sorcerer-metamagic-distant-selected-identity.mbt.test.ts 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 3 tests passed and `TOTAL: 8s`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- RAW/ubiquitous-language review passed against Sorcerer Metamagic, Distant
  Spell, Sorcery Points, Light, and UBIQUITOUS_LANGUAGE.md terms for Magic
  Action, Spell Invocation, Pool, Spend, Spell Effect, and Light.
- Reviewer-loop convergence passed: round 1 found the missing public
  `metamagicSpellRangeProjection` route subject and added object-target boundary
  ownership; round 2 restored this cumulative validation report history after
  reviewer feedback; round 3 replaced the literal route assertion and generic
  connector sampling with deterministic copied `doRouteSpellRangeProjection`
  `qRoute` replay against the public reducer route. No duplicate durable state
  or authored-identity dispatch was added.

## CRPI-READY-011

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`
- Driver: `packages/battle-runtime/battle-runtime-sorcerer-metamagic-careful-selected-identity.mbt.qnt`
- Route connector: `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`
- Acceptance status: `blocked`

Task 42 does not satisfy its current acceptance criteria as a normal
implementation item. Neither selected-identity branch has passing
copied-connector `qRoute` replay through public reducer entrypoints. The
save-gated damage branch now records the honest public protected-target
frontier, which does not match the copied connector's damage-shaped
`savingThrowOutcome` discovery frontier. The current task and plan files are
outside the permitted implementation workspace, so this report records the
blocker and the concrete plan edits the decider must apply before this work can
be merged as anything other than blocked/partial.

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-sorcerer-metamagic-careful-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-reducer-route.qnt`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Classes/Sorcerer.md`
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`
- `UBIQUITOUS_LANGUAGE.md`

Partial behavior implemented:

Careful Spell selected-identity diagnostics now observe the target public route
events for the save-gated damage and no-effect semantic projections. The
save-gated damage diagnostic observes the shared
`metamagicSavingThrowProtection` substrate from
`battleReducerStartRouteEvent`, `AvailableBattleAct.routeEvents`, and
`BattleResolutionResult.routeEvents` for the Burning Hands damage procedure,
including the reducer-owned protected-target `spellTargetList` frontier before
the saving-throw frontier exists.

The no-effect selected-identity branch is Careful Command. Public reducer route
observation confirms Command subjects are routed as `commandEffect` before the
new metamagic route predicate, and Command has no rolled-dice damage-adjustment
frontier. The copied metamagic route connector exposes only a damage-shaped
`metamagicSavingThrowProtection` `qRoute` for saving-throw protection, so the
Command/no-effect branch is recorded as a source-QNT-corpus blocker rather than
accepted copied-route replay.

The runtime does not add a parallel Careful Spell ledger: action availability
remains `BattleState.currentTurnResources`, Sorcery Point spend remains
character point-pool resource state, selected Metamagic identity remains a
catalog/selection/admission boundary, protected-target selection remains a
spell target-list fill, and damage prevention remains the existing
save-gated-damage adjustment path.

Generated branch coverage:

| Obligation                                                                                                                           | Target replay evidence                                                                                                                                                                                                                                                                                                                                                                                 | Diagnostic tests                                                                                                                                                       | Status                                   |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `packages/battle-runtime/battle-runtime-sorcerer-metamagic-careful-selected-identity.mbt.qnt#step:doResolveCarefulSaveGatedDamage`   | No accepted copied-connector replay evidence. Blocker evidence: `tasks/target-replay-evidence/CRPI-READY-011.json#driver:packages/battle-runtime/battle-runtime-sorcerer-metamagic-careful-selected-identity.mbt.qnt#step:doResolveCarefulSaveGatedDamage#trace:public-route=metamagicSavingThrowProtection action=doResolveCarefulSaveGatedDamage qRoute=blocked-copied-connector-discovery-frontier` | `packages/battle-runtime/src/sorcerer-metamagic-careful-selected-identity.mbt.test.ts#observes Careful Spell save-protection route through public reducer entrypoints` | `not-covered: source-qnt-corpus-blocked` |
| `packages/battle-runtime/battle-runtime-sorcerer-metamagic-careful-selected-identity.mbt.qnt#step:doResolveCarefulSaveGatedNoEffect` | No accepted copied-connector replay evidence. Blocker evidence: `tasks/target-replay-evidence/CRPI-READY-011.json#driver:packages/battle-runtime/battle-runtime-sorcerer-metamagic-careful-selected-identity.mbt.qnt#step:doResolveCarefulSaveGatedNoEffect#trace:public-route=commandEffect action=doResolveCarefulSaveGatedNoEffect qRoute=blocked-copied-connector-damage-route`                    | `packages/battle-runtime/src/sorcerer-metamagic-careful-selected-identity.mbt.test.ts#observes Careful Command no-effect route through public reducer entrypoints`     | `not-covered: source-qnt-corpus-blocked` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-011.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace ids:
  - `public-route=metamagicSavingThrowProtection action=doResolveCarefulSaveGatedDamage qRoute=blocked-copied-connector-discovery-frontier`
  - `public-route=commandEffect action=doResolveCarefulSaveGatedNoEffect qRoute=blocked-copied-connector-damage-route`
- Public route assertion:
  - `packages/battle-runtime/src/sorcerer-metamagic-careful-selected-identity.mbt.test.ts#observes Careful Spell save-protection route through public reducer entrypoints`
  - `packages/battle-runtime/src/sorcerer-metamagic-careful-selected-identity.mbt.test.ts#observes Careful Command no-effect route through public reducer entrypoints`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-011/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- Source-QNT-corpus blocker: copied connector
  `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
  exposes `doRouteSavingThrowProtection` only as a damage-shaped route that
  starts at `SavingThrowOutcomeFillKind`, then `RolledDiceHoleKind` and
  `BattleDamageAdjustmentOwner`. The target public route for Careful Burning
  Hands starts earlier at the protected-target `spellTargetList` frontier. The
  selected-identity no-effect branch is Careful Command, which the public
  reducer routes as `commandEffect` with `commandOptionChoice` and
  `savingThrowOutcome` fills and no rolled-dice damage-adjustment frontier.

Required plan edits:

- In `/workspace/typescript/dnd/.ralph/runs/crpi-ready-011-metamagic-careful-route/plan.md`,
  change Task 42 / `CRPI-READY-011` from ready/accepted coverage to blocked or
  partial-blocked for both copied `qRoute` obligations.
- Add blocker details: the copied metamagic route connector omits the
  protected-target `spellTargetList` discovery frontier for Careful
  save-gated-damage spells and lacks a Command/no-effect saving-throw-protection
  route shape; target public reducer evidence shows the no-effect branch is
  `commandEffect`, not `metamagicSavingThrowProtection`.
- Add a follow-up queue item to either refresh/reclassify the copied connector
  obligation or add a reducer-owned route fact for Careful no-effect Command
  without synthetic damage events or duplicate replay-history state.

Plan Impact:

- Status: `update-required`
- Affected tasks:
  - Task 42 / `CRPI-READY-011`: `blocked`; neither copied `qRoute` obligation
    has passing target replay evidence.
  - Task 43 / `CRPI-READY-012` and later metamagic route tasks: `left
unchanged`; future implementers should check whether their selected-identity
    branches actually match the copied metamagic route connector shape.
- Observations:
  - The copied metamagic saving-throw-protection route is damage-shaped and
    begins after the target public protected-target frontier.
  - The target public reducer routes Careful Command/no-effect as
    `commandEffect`, not `metamagicSavingThrowProtection`.
  - Matching the copied route for either branch would require either a refreshed
    connector obligation or a real reducer-owned route fact; synthetic route
    events or replay-only duplicate state are not acceptable.
- Required plan edits:
  - Recast Task 42 / `CRPI-READY-011` from `ready-for-research` to blocked or
    partial-blocked.
  - Add the protected-target frontier mismatch and Command/no-effect
    copied-route mismatch as blocker details.
  - Add a follow-up item to refresh/reclassify the copied connector obligation
    or implement an honest reducer-owned no-effect route fact.

Verification results:

- Base check passed: `ralph/crpi-ready-011-metamagic-careful-route/integration`
  and `HEAD` were both `0755a79b Mark Task 41 sleep repeat-save route blocked`,
  and `git merge-base --is-ancestor 0755a79b9d087bdc0a6599a705ca28a71b4d2925 HEAD`
  exited 0.
- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- `pnpm --filter @dnd/battle-runtime exec vitest run src/sorcerer-metamagic-careful-selected-identity.mbt.test.ts -t "observes (Careful Spell save-protection route|Careful Command no-effect route)"` passed with 2 tests and 2 skipped.
- MBT was not rerun in revision round 5. The acceptance blocker is the copied
  connector/public route-shape mismatch already recorded in target replay
  evidence, and the changed production route projection is covered by the
  focused public reducer route tests above.
- `pnpm cleanroom-branch-coverage:check -- --target-replay-evidence tasks/target-replay-evidence/CRPI-READY-011.json` exited 1 with corpus-wide missing-evidence output. For Task 42, `tasks/target-replay-evidence/CRPI-READY-011.json` records both `doResolveCarefulSaveGatedDamage` and `doResolveCarefulSaveGatedNoEffect` as non-passing route-shape blockers.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- RAW/ubiquitous-language review passed against Sorcerer Metamagic, Careful
  Spell, Sorcery Points, Burning Hands, Command, and UBIQUITOUS_LANGUAGE.md
  terms for Magic Action, Spell Invocation, Saving Throw, Pool, and Spend.
- Reviewer-loop convergence completed with a blocker: round 1 found the missing
  public `metamagicSavingThrowProtection` route subject and
  `battleDamageAdjustment` owner; revision round 2 removed overclaimed
  Command/no-effect coverage; revision round 5 corrected the damage diagnostic
  to expose the protected-target frontier before `savingThrowOutcome` and
  recorded both copied route-shape mismatches as source-QNT-corpus blockers. No
  duplicate durable state or authored-identity dispatch was added.

## CRPI-READY-010

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`
- Driver: `packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt`
- Route connector: `packages/battle-runtime/battle-runtime-sleep-repeat-save.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt`
- `packages/battle-runtime/battle-runtime-sleep-repeat-save.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-reducer-route.qnt`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Sleep repeat-save route instrumentation was added for the executable,
state-owned route segments available through public battle reducer route
events. The route starts with `battleReducerStartRouteEvent`, discovers the
Sleep spell act through `AvailableBattleAct.routeEvents`, resolves the selected
Sleep target admission subject through `BattleResolutionResult.routeEvents`,
observes concentration cleanup through the public `endConcentration` runtime
command, and observes turn-boundary repeat-save frontier and fill routes
through public `endTurn` resolution.

The runtime does not add a parallel repeat-save ledger. Sleep repeat-save
ownership remains in existing `BattleCreatureState.activeEffects` entries,
Concentration remains `BattleCreatureState.concentration`, condition lifecycle
state remains `BattleCreatureState.conditions`, and turn-boundary repeat-save
frontier is derived from the existing `sleepPendingRepeatSave` active effect
and `sleepRepeatSave` hole. After a failed repeat save replaces that frontier
with `sleepUnconscious`, later end turns no longer emit
`repeatSaveConditionEffect` turn-boundary route events.

The restored copied connector still appends `repeatSaveConditionEffect`
`battleTurnBoundary` no-op events after Concentration cleanup has removed the
Sleep frontier. The target reducer intentionally does not emit those events
because no reducer-owned `sleepPendingRepeatSave` frontier remains. This is
recorded as a source-QNT-corpus blocker, not accepted replay. Therefore Task 41
does not have accepted target replay evidence for the copied connector
projection.

Copied qRoute branch acceptance:

| Obligation                                                                                                     | Target replay evidence                                                                                                                                                                                                                                                                                                           | Diagnostic tests                                                                                                                                                                                                                          | Status                                   |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt#step:doFillInitialSaveFailure`               | No accepted copied-connector replay evidence. Blocker evidence: `tasks/target-replay-evidence/CRPI-READY-010.json#driver:packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt#step:doEndCasterTurnAfterConcentrationBreak#trace:MBT_TRACES=8 MBT_STEPS=5 qRoute=blocked-copied-connector-post-cleanup-no-op`         | State-owned route segment is implemented diagnostically, but full copied `qRoute` replay is skipped because a later copied-connector branch cannot be matched from reducer-owned state.                                                   | `not-covered: source-qnt-corpus-blocked` |
| `packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt#step:doBreakConcentrationBeforeRepeat`       | No accepted copied-connector replay evidence. Blocker evidence: `tasks/target-replay-evidence/CRPI-READY-010.json#driver:packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt#step:doEndCasterTurnAfterConcentrationBreak#trace:MBT_TRACES=8 MBT_STEPS=5 qRoute=blocked-copied-connector-post-cleanup-no-op`         | State-owned concentration cleanup route segment is implemented diagnostically, but the copied connector then expects post-cleanup no-op turn-boundary route events.                                                                       | `not-covered: source-qnt-corpus-blocked` |
| `packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt#step:doEndCasterTurnAfterConcentrationBreak` | `tasks/target-replay-evidence/CRPI-READY-010.json#driver:packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt#step:doEndCasterTurnAfterConcentrationBreak#trace:MBT_TRACES=8 MBT_STEPS=5 qRoute=blocked-copied-connector-post-cleanup-no-op`                                                                         | The restored copied connector expects a post-cleanup no-op event after no reducer-owned Sleep frontier remains.                                                                                                                           | `not-covered: source-qnt-corpus-blocked` |
| `packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt#step:doEndTargetTurnAfterConcentrationBreak` | No accepted copied-connector replay evidence. Related blocker evidence: `tasks/target-replay-evidence/CRPI-READY-010.json#driver:packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt#step:doEndCasterTurnAfterConcentrationBreak#trace:MBT_TRACES=8 MBT_STEPS=5 qRoute=blocked-copied-connector-post-cleanup-no-op` | Same copied connector post-cleanup no-op mismatch.                                                                                                                                                                                        | `not-covered: source-qnt-corpus-blocked` |
| `packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt#step:doDiscoverRepeatSave`                   | No accepted copied-connector replay evidence. Blocker evidence: `tasks/target-replay-evidence/CRPI-READY-010.json#driver:packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt#step:doEndCasterTurnAfterConcentrationBreak#trace:MBT_TRACES=8 MBT_STEPS=5 qRoute=blocked-copied-connector-post-cleanup-no-op`         | State-owned repeat-save discovery route segment is implemented diagnostically, but full copied `qRoute` replay remains blocked.                                                                                                           | `not-covered: source-qnt-corpus-blocked` |
| `packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt#step:doFillRepeatSaveSuccess`                | No accepted copied-connector replay evidence. Blocker evidence: `tasks/target-replay-evidence/CRPI-READY-010.json#driver:packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt#step:doEndCasterTurnAfterConcentrationBreak#trace:MBT_TRACES=8 MBT_STEPS=5 qRoute=blocked-copied-connector-post-cleanup-no-op`         | State-owned repeat-save success cleanup route segment is implemented diagnostically, but full copied `qRoute` replay remains blocked.                                                                                                     | `not-covered: source-qnt-corpus-blocked` |
| `packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt#step:doFillRepeatSaveFailure`                | No accepted copied-connector replay evidence. Blocker evidence: `tasks/target-replay-evidence/CRPI-READY-010.json#driver:packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt#step:doEndCasterTurnAfterConcentrationBreak#trace:MBT_TRACES=8 MBT_STEPS=5 qRoute=blocked-copied-connector-post-cleanup-no-op`         | State-owned repeat-save failure cleanup route segment is implemented diagnostically; the added regression confirms later `sleepUnconscious` state does not leak repeat-save frontier events. Full copied `qRoute` replay remains blocked. | `not-covered: source-qnt-corpus-blocked` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-010.json`
- Target profile: `typescript-source-worktree`
- Reproduction trace id: `MBT_TRACES=8 MBT_STEPS=5 qRoute=blocked-copied-connector-post-cleanup-no-op`
- Public route assertion:
  - `packages/battle-runtime/src/sleep-repeat-save.mbt.test.ts#blocked: copied Sleep repeat-save qRoute expects post-cleanup turn-boundary events with no reducer-owned frontier`
  - `packages/battle-runtime/src/sleep-repeat-save.mbt.test.ts#does not route repeat-save turn-boundary events after repeat-save failure consumes the frontier`
- Accepted copied-connector replay: none; the copied route replay test is
  intentionally skipped and recorded as blocked.

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-010/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- Source-QNT-corpus blocker: copied connector
  `packages/battle-runtime/battle-runtime-sleep-repeat-save.route.mbt.qnt`
  appends post-Concentration-cleanup `battleTurnBoundary` no-op events after
  the Sleep repeat-save frontier has been removed. The target reducer cannot
  derive those events from `BattleState`, holes, fills, or current active-effect
  ownership without adding duplicate replay-history state.

Required plan edits:

- In `/workspace/typescript/dnd/.ralph/runs/crpi-ready-010-sleep-repeat-save-route/plan.md`
  summary row 696, change `CRPI-READY-010` from `ready-for-research` to
  `blocked` and change the blocker column from `none` to
  `source-qnt-corpus-blocker`.
- In the Task 41 body in the same plan, change `Status:
ready-for-research` to `Status: blocked`.
- Add a blocker detail to Task 41: copied connector
  `packages/battle-runtime/battle-runtime-sleep-repeat-save.route.mbt.qnt`
  expects post-Concentration-cleanup `battleTurnBoundary` no-op `qRoute`
  events after no reducer-owned Sleep repeat-save frontier remains.
- Add a follow-up queue item to either refresh/reclassify the copied connector
  obligation or introduce a valid reducer-owned route fact that allows
  unskipped copied `qRoute` replay without duplicate replay-history state.

Verification results:

- Base check passed: `ralph/crpi-ready-010-sleep-repeat-save-route/integration`
  and `HEAD` were both `a4e419eb1 Mark scalar buff route replay done`, and
  `git merge-base --is-ancestor a4e419eb19bc6827c70bcd3fdc00e6c9af8af6c7 HEAD`
  exited 0.
- RAW/ubiquitous-language review passed against Sleep, Concentration,
  Incapacitated, Unconscious, and UBIQUITOUS_LANGUAGE.md terms for conditions,
  turn structure, Concentration, Spell Invocation, and Spell Effect.
- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- Before each MBT run, `ps aux | grep vitest | grep -v grep` and
  `ps aux | grep quint_evaluator | grep -v grep` found no active runner or
  evaluator.
- Revision round 5 restored the copied route connector to hash
  `c124d6c23ba30449dcceb346d88f57a321ccf9c953db6af627285b60861d95d2` and
  recorded the post-cleanup no-op mismatch as a source-QNT-corpus blocker.
- Full focused route MBT run
  `START=$(date +%s); MBT_TRACES=8 MBT_STEPS=5 pnpm --filter @dnd/battle-runtime exec vitest run src/sleep-repeat-save.mbt.test.ts 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"`
  passed with 2 tests and 1 skipped copied-connector replay blocker; `TOTAL: 7s`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24
  sampled inputs.
- `git diff --check` passed.
- Reviewer-loop completed with a blocker: round 1 found the bounded replay, round 2
  rejected a caller-authored input, and round 3 removed that input and aligned
  the connector with reducer-owned Sleep frontier facts. Round 4 narrowed the
  turn-boundary route predicate to `sleepPendingRepeatSave` and added the
  post-failure regression. Round 5 restored the copied connector and recorded
  the remaining mismatch as a plan-impact blocker. Round 6 removed overclaimed
  accepted coverage from this report. Round 8 recorded concrete required plan
  edits inside the Task 41 validation artifacts; the plan file itself is
  outside this task worktree's permitted edit root.

## CRPI-READY-009

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`
- Driver: `packages/battle-runtime/battle-runtime-scalar-buff.mbt.qnt`
- Route connector: `packages/battle-runtime/battle-runtime-scalar-buff.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-scalar-buff.mbt.qnt`
- `packages/battle-runtime/battle-runtime-scalar-buff.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-reducer-route.qnt`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Scalar-buff target replay now observes the copied `qRoute` projection through
public battle reducer route events. The route starts with
`battleReducerStartRouteEvent`, discovers the scalar-buff spell act through
`AvailableBattleAct.routeEvents`, resolves the selected scalar-buff
subject through `BattleResolutionResult.routeEvents`, and records stale-subject
hole-frontier ownership through the same public resolution boundary.

The runtime does not add a parallel scalar-buff ledger. Magic Action
availability remains `BattleState.currentTurnResources`, Spell Slot spend
remains character spellcasting resource state, the Longstrider Speed increase
remains `BattleCreatureState.activeEffects[kind=speedDelta]`, and Speed remains
projected by movement readers from the existing active Spell Effect.

Generated branch coverage:

| Obligation                                                                                   | Target replay evidence                                                                                                                                                                                                                                | Diagnostic tests                                                                                                     | Status    |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------- |
| `packages/battle-runtime/battle-runtime-scalar-buff.mbt.qnt#step:doFillLongstriderTarget`    | `tasks/target-replay-evidence/CRPI-READY-009.json#driver:packages/battle-runtime/battle-runtime-scalar-buff.mbt.qnt#step:doFillLongstriderTarget#trace:MBT_TRACES=1 MBT_STEPS=2 action=doFillLongstriderTarget qRoute=scalar-buff-public-route`       | `packages/battle-runtime/src/scalar-buff.mbt.test.ts#observes Longstrider qRoute through public reducer entrypoints` | `covered` |
| `packages/battle-runtime/battle-runtime-scalar-buff.mbt.qnt#step:doRejectStaleAfterResolved` | `tasks/target-replay-evidence/CRPI-READY-009.json#driver:packages/battle-runtime/battle-runtime-scalar-buff.mbt.qnt#step:doRejectStaleAfterResolved#trace:MBT_TRACES=1 MBT_STEPS=2 action=doRejectStaleAfterResolved qRoute=scalar-buff-public-route` | `packages/battle-runtime/src/scalar-buff.mbt.test.ts#observes Longstrider qRoute through public reducer entrypoints` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-009.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id: `MBT_TRACES=1 MBT_STEPS=2 action=<branchAction> qRoute=scalar-buff-public-route`
- Public route assertion:
  - `packages/battle-runtime/src/scalar-buff.mbt.test.ts#observes Longstrider qRoute through public reducer entrypoints`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-009/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 40.

Verification results:

- Base check passed: `ralph/crpi-ready-009-scalar-buff-route/integration`
  and `HEAD` were both `db6cc382f Mark Ralph task 39 done`, and
  `git merge-base --is-ancestor db6cc382f9d48585e71045145cc7059b63c4ad05 HEAD`
  exited 0.
- RAW/ubiquitous-language review passed against Longstrider, Speed, and
  UBIQUITOUS_LANGUAGE.md terms for Speed, Movement, Spell Invocation, and Spell
  Effect.
- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- Before MBT, `ps aux | grep vitest | grep -v grep` and
  `ps aux | grep quint_evaluator | grep -v grep` found no active runner or
  evaluator.
- First focused MBT run exposed stale adapter-local route expectations; final
  run `START=$(date +%s); MBT_TRACES=1 MBT_STEPS=6 pnpm --filter @dnd/battle-runtime exec vitest run src/scalar-buff.mbt.test.ts src/scalar-buff-active-effects.mbt.test.ts 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 5 tests; final timed run `TOTAL: 10s`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24
  sampled inputs.
- `git diff --check` passed.
- Reviewer-loop convergence passed: round 1 moved scalar-buff route replay onto
  public reducer route events; round 2 aligned the copied route connector with
  public active-effect and movement-resource owner evidence and found no
  remaining reasonable findings.

## CRP07-DSR-06

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`
- Driver: `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt`
- Route connector: `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt`
- `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-reducer-route.qnt`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Scalar-buff active Spell Effect route replay now observes the copied `qRoute`
projection through public battle reducer route events. The route starts with
`battleReducerStartRouteEvent`, discovers scalar-buff spell acts through
`AvailableBattleAct.routeEvents`, and resolves selected scalar-buff subjects
through `BattleResolutionResult.routeEvents`. The public route records spell
slot/action-economy discovery, active Spell Effect creation, movement-resource
projection, Hit Point maximum projection, immediate Temporary Hit Points, and
Concentration ownership from reducer-owned state deltas.

The runtime does not add a parallel scalar-buff ledger. Magic Action
availability remains `BattleState.currentTurnResources`, Spell Slot spend
remains character spellcasting resource state, active Spell Effects and
Concentration remain `BattleCreatureState.activeEffects` and
`BattleCreatureState.concentration`, movement projections remain active effect
facts consumed by movement readers, Hit Point maximum/current Hit Points remain
`BattleCreatureState.maxHp` and `BattleCreatureState.hp`, and Temporary Hit
Points remain `BattleCreatureState.tempHp`.

Generated branch coverage:

| Obligation                                                                                           | Target replay evidence                                                                                                                                                                                                                                              | Diagnostic tests                                                                                                                                  | Status    |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt#step:doCastShieldOfFaith` | `tasks/target-replay-evidence/CRP07-DSR-06.json#driver:packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt#step:doCastShieldOfFaith#trace:MBT_TRACES=1 MBT_STEPS=6 action=doCastShieldOfFaith qRoute=scalar-buff-active-effects-public-route` | `packages/battle-runtime/src/scalar-buff-active-effects.mbt.test.ts#observes scalar buff active-effect qRoute through public reducer entrypoints` | `covered` |
| `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt#step:doCastLongstrider`   | `tasks/target-replay-evidence/CRP07-DSR-06.json#driver:packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt#step:doCastLongstrider#trace:MBT_TRACES=1 MBT_STEPS=6 action=doCastLongstrider qRoute=scalar-buff-active-effects-public-route`     | `packages/battle-runtime/src/scalar-buff-active-effects.mbt.test.ts#observes scalar buff active-effect qRoute through public reducer entrypoints` | `covered` |
| `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt#step:doCastSpiderClimb`   | `tasks/target-replay-evidence/CRP07-DSR-06.json#driver:packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt#step:doCastSpiderClimb#trace:MBT_TRACES=1 MBT_STEPS=6 action=doCastSpiderClimb qRoute=scalar-buff-active-effects-public-route`     | `packages/battle-runtime/src/scalar-buff-active-effects.mbt.test.ts#observes scalar buff active-effect qRoute through public reducer entrypoints` | `covered` |
| `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt#step:doCastAid`           | `tasks/target-replay-evidence/CRP07-DSR-06.json#driver:packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt#step:doCastAid#trace:MBT_TRACES=1 MBT_STEPS=6 action=doCastAid qRoute=scalar-buff-active-effects-public-route`                     | `packages/battle-runtime/src/scalar-buff-active-effects.mbt.test.ts#observes scalar buff active-effect qRoute through public reducer entrypoints` | `covered` |
| `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt#step:doCastFalseLife`     | `tasks/target-replay-evidence/CRP07-DSR-06.json#driver:packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt#step:doCastFalseLife#trace:MBT_TRACES=1 MBT_STEPS=6 action=doCastFalseLife qRoute=scalar-buff-active-effects-public-route`         | `packages/battle-runtime/src/scalar-buff-active-effects.mbt.test.ts#observes scalar buff active-effect qRoute through public reducer entrypoints` | `covered` |
| `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt#step:doStutter`           | `tasks/target-replay-evidence/CRP07-DSR-06.json#driver:packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt#step:doStutter#trace:MBT_TRACES=1 MBT_STEPS=6 action=doStutter qRoute=scalar-buff-active-effects-public-route`                     | `packages/battle-runtime/src/scalar-buff-active-effects.mbt.test.ts#observes scalar buff active-effect qRoute through public reducer entrypoints` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRP07-DSR-06.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id: `MBT_TRACES=1 MBT_STEPS=6 action=<branchAction> qRoute=scalar-buff-active-effects-public-route`
- Public route assertion:
  - `packages/battle-runtime/src/scalar-buff-active-effects.mbt.test.ts#observes scalar buff active-effect qRoute through public reducer entrypoints`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRP07-DSR-06/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 39.

Verification results:

- Base check passed: `ralph/crp07-dsr-06-scalar-buff-active-effects-route/integration`
  and `HEAD` were both `d56438ff3 Mark Ralph task 38 done`, and
  `git merge-base --is-ancestor d56438ff374260dd3d403a89b98c3829457468af HEAD`
  exited 0.
- RAW/ubiquitous-language review passed against Aid, False Life, Longstrider,
  Shield of Faith, Spider Climb, Concentration, Speed, Temporary Hit Points,
  Armor Class, Hit Points, and UBIQUITOUS_LANGUAGE.md terms for Armor Class,
  Movement, Hit Points, Spell Invocation, Spell Effect, Spell Slot, and
  Concentration.
- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- Before MBT, `ps aux | grep vitest | grep -v grep` and
  `ps aux | grep quint_evaluator | grep -v grep` found no active runner or
  evaluator.
- `START=$(date +%s); MBT_TRACES=1 MBT_STEPS=6 pnpm --filter @dnd/battle-runtime exec vitest run src/scalar-buff-active-effects.mbt.test.ts 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 3 tests; final timed run `TOTAL: 9s`.
- `node` target replay evidence schema check for CRP07-DSR-06 passed with 6 covered obligations.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- Reviewer-loop convergence passed: round 1 promoted scalar-buff route events into the public reducer route surface and target evidence; round 2 found no remaining reasonable RAW/domain, architecture/connascence, or code-review findings.

## CRP07-DSR-02

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`
- Driver: `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt`
- Route connector: `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt`
- `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.qnt`
- `packages/battle-runtime/battle-runtime-reducer-route.qnt`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Save-gated spell ordering route replay now records accepted target evidence for
the copied `qRoute` projection through public battle reducer route events. The
existing public reducer route exposes area save damage discovery, target-list
condition-choice discovery, Saving Throw fills, condition-choice fills,
target-list fills, ordering rejections, damage dice resolution, condition
application, and target Hit Point effects through `AvailableBattleAct.routeEvents`
and `BattleResolutionResult.routeEvents`.

The runtime does not add a parallel save-gated ordering ledger: Magic Action
availability remains `BattleState.currentTurnResources`, Spell Slot spend
remains character spellcasting resource state, target Hit Points remain
`BattleCreatureState.hp`, condition effects remain `BattleCreatureState.conditions`,
and ordering labels remain reducer result facts projected by the harness.

Generated branch coverage:

| Obligation                                                                                                            | Target replay evidence                                                                                                                                                                                                                                  | Diagnostic tests                                                                                                                                                                                            | Status    |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doDiscoverAreaSaveDamage`              | `tasks/target-replay-evidence/CRP07-DSR-02.json#driver:packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doDiscoverAreaSaveDamage#trace:MBT_TRACES=1 MBT_STEPS=5 action=doDiscoverAreaSaveDamage`                           | `packages/battle-runtime/src/save-gated-spell-ordering.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes save-gated spell ordering through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doSubmitDamageBeforeSavingThrow`       | `tasks/target-replay-evidence/CRP07-DSR-02.json#driver:packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doSubmitDamageBeforeSavingThrow#trace:MBT_TRACES=1 MBT_STEPS=5 action=doSubmitDamageBeforeSavingThrow`             | `packages/battle-runtime/src/save-gated-spell-ordering.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes save-gated spell ordering through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doFillAreaSaveFailed`                  | `tasks/target-replay-evidence/CRP07-DSR-02.json#driver:packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doFillAreaSaveFailed#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFillAreaSaveFailed`                                   | `packages/battle-runtime/src/save-gated-spell-ordering.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes save-gated spell ordering through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doFillAreaDamageDice`                  | `tasks/target-replay-evidence/CRP07-DSR-02.json#driver:packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doFillAreaDamageDice#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFillAreaDamageDice`                                   | `packages/battle-runtime/src/save-gated-spell-ordering.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes save-gated spell ordering through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doDiscoverTargetListConditionChoice`   | `tasks/target-replay-evidence/CRP07-DSR-02.json#driver:packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doDiscoverTargetListConditionChoice#trace:MBT_TRACES=1 MBT_STEPS=5 action=doDiscoverTargetListConditionChoice`     | `packages/battle-runtime/src/save-gated-spell-ordering.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes save-gated spell ordering through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doFillTargetListBeforeConditionChoice` | `tasks/target-replay-evidence/CRP07-DSR-02.json#driver:packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doFillTargetListBeforeConditionChoice#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFillTargetListBeforeConditionChoice` | `packages/battle-runtime/src/save-gated-spell-ordering.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes save-gated spell ordering through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doFillConditionChoiceAfterTargetList`  | `tasks/target-replay-evidence/CRP07-DSR-02.json#driver:packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doFillConditionChoiceAfterTargetList#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFillConditionChoiceAfterTargetList`   | `packages/battle-runtime/src/save-gated-spell-ordering.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes save-gated spell ordering through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doFillConditionChoiceBeforeTargetList` | `tasks/target-replay-evidence/CRP07-DSR-02.json#driver:packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doFillConditionChoiceBeforeTargetList#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFillConditionChoiceBeforeTargetList` | `packages/battle-runtime/src/save-gated-spell-ordering.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes save-gated spell ordering through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doFillTargetListAfterConditionChoice`  | `tasks/target-replay-evidence/CRP07-DSR-02.json#driver:packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doFillTargetListAfterConditionChoice#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFillTargetListAfterConditionChoice`   | `packages/battle-runtime/src/save-gated-spell-ordering.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes save-gated spell ordering through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doFillConditionSavingThrow`            | `tasks/target-replay-evidence/CRP07-DSR-02.json#driver:packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doFillConditionSavingThrow#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFillConditionSavingThrow`                       | `packages/battle-runtime/src/save-gated-spell-ordering.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes save-gated spell ordering through the shared reducer surface` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRP07-DSR-02.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id: `MBT_TRACES=1 MBT_STEPS=5 action=<branchAction>`
- Public route assertion:
  - `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes save-gated spell ordering through the shared reducer surface`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRP07-DSR-02/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 38.

Verification results:

- Base check passed: `ralph/crp07-dsr-02-save-gated-spell-ordering-route/integration`
  and `HEAD` were both `4bca26bf0 Mark Task 35 roll modifier route replay done`,
  and `git merge-base --is-ancestor 4bca26bf0bdfd18bc546d8d43f02b10ea06a6a5e HEAD`
  exited 0.
- RAW/ubiquitous-language review passed against Saving Throws, Saving Throws
  and Damage, Spell Slots, spell Saving Throws, UBIQUITOUS_LANGUAGE.md terms
  for Magic Action and Spell Slot, and reducer-spine subject/hole/fill route
  guidance.
- Before MBT, `ps aux | grep vitest | grep -v grep` and
  `ps aux | grep quint_evaluator | grep -v grep` only matched the Ralph
  monitor command text and no active runner or evaluator.
- `cd packages/battle-runtime && START=$(date +%s); MBT_TRACES=1 MBT_STEPS=5 pnpm exec vitest run src/save-gated-spell-ordering.mbt.test.ts src/reducer-route-connectors.mbt.test.ts -t "save-gated spell ordering|routes save-gated spell ordering" 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 2 tests and 33 skipped; final timed run `TOTAL: 8s`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs before artifact edits, then passed again after Task 38 artifacts were added.
- `git diff --check` passed.
- Reviewer-loop convergence passed: round 1 promoted existing public save-gated spell route evidence into Task 38 artifacts and confirmed ordering labels remain reducer result facts; round 2 found no remaining reasonable RAW/domain, architecture/connascence, or code-review findings.

## CRPI-READY-007

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`
- Driver: `packages/battle-runtime/battle-runtime-reaction-casting-time.mbt.qnt`
- Route connector: `packages/battle-runtime/battle-runtime-reaction-casting-time.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-reaction-casting-time.mbt.qnt`
- `packages/battle-runtime/battle-runtime-reaction-casting-time.route.mbt.qnt`
- `packages/battle-runtime/battle-runtime-reducer-route.qnt`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/branch-scope.jsonl`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Reaction casting-time route replay now observes the copied `qRoute` projection
through public battle reducer route events for the in-scope Hellish Rebuke
after-damage branch. The target route begins with `battleReducerStartRouteEvent`,
opens the after-damage Reaction spell window through public
`resolveBattleSubject` route events, and resolves the chosen triggered Reaction
spell through public `resolveBattleInterrupt` route events. The interrupt route
projection now uses the `reactionSpell` route subject for spell-cast and
after-damage triggered Reaction spell windows, while retaining the existing
interrupt-stack resume subject for unrelated interrupt-resume surfaces.

The runtime does not add a parallel Reaction casting-time ledger: Reaction
availability remains `BattleCreatureState.reactionAvailable`, Reaction Spell
Slot spend remains character spellcasting slot state, the Reaction window and
clearing remain `BattleState.interruptStack`, Hit Point effects remain
`BattleCreatureState.hp`, and table-trigger facts plus chosen Reaction decisions
remain boundary fills.

Generated branch coverage:

| Obligation                                                                                                      | Target replay evidence                                                                                                                                                                                                                                                          | Diagnostic tests                                                                                                                             | Status         |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `packages/battle-runtime/battle-runtime-reaction-casting-time.mbt.qnt#step:doHellishRebukeAfterDamage`          | `tasks/target-replay-evidence/CRPI-READY-007.json#driver:packages/battle-runtime/battle-runtime-reaction-casting-time.mbt.qnt#step:doHellishRebukeAfterDamage#trace:MBT_TRACES=1 MBT_STEPS=1 action=doHellishRebukeAfterDamage qRoute=hellish-rebuke-after-damage-public-route` | `packages/battle-runtime/src/reaction-casting-time.mbt.test.ts#observes the copied Hellish Rebuke qRoute through public reducer entrypoints` | `covered`      |
| `packages/battle-runtime/battle-runtime-reaction-casting-time.mbt.qnt#step:doCounterspellEndsSpellCast`         | branch scope marks this level-3 spell branch out of scope                                                                                                                                                                                                                       | not run for Task 32                                                                                                                          | `out-of-scope` |
| `packages/battle-runtime/battle-runtime-reaction-casting-time.mbt.qnt#step:doCounterspellAllowsSpellCastResume` | branch scope marks this level-3 spell branch out of scope                                                                                                                                                                                                                       | not run for Task 32                                                                                                                          | `out-of-scope` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-007.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id: `MBT_TRACES=1 MBT_STEPS=1 action=doHellishRebukeAfterDamage qRoute=hellish-rebuke-after-damage-public-route`
- Public route assertion:
  - `packages/battle-runtime/src/reaction-casting-time.mbt.test.ts#observes the copied Hellish Rebuke qRoute through public reducer entrypoints`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-007/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 32. Counterspell branches remain out of scope for this level-1/2 cleanroom run because `branch-scope.jsonl` marks them out of scope as level-3 spell branches.

Verification results:

- Base check passed: `ralph/crpi-ready-007-reaction-casting-time-route/integration`
  and `HEAD` were both `1a2d6437b Mark Ralph task 31 done`, and
  `git merge-base --is-ancestor 1a2d6437bd34258a16b60ff7558324aea282ed9b HEAD`
  exited 0.
- RAW/ubiquitous-language review passed against Casting Time, Reaction and
  Bonus Action Triggers, Reactions, Rules Glossary Reaction, Hellish Rebuke,
  Counterspell branch-scope rationale, and UBIQUITOUS_LANGUAGE.md terms for
  Reaction, Spell Slot, Magic Action, Saving Throw, Damage Roll, Spell Effect,
  Offer, Decline, and Advance.
- `pnpm --filter @dnd/battle-runtime exec vitest run src/reaction-casting-time.mbt.test.ts -t "observes the copied Hellish Rebuke qRoute"` passed with 1 test and 2 skipped.
- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- Before MBT, `ps aux | grep vitest | grep -v grep` only matched a Ralph
  monitor command containing the word `vitest`; a stricter process check found
  no actual Vitest runner. `ps aux | grep quint_evaluator | grep -v grep` only
  matched the same Ralph monitor command and no active evaluator.
- `cd packages/battle-runtime && START=$(date +%s); MBT_TRACES=1 MBT_STEPS=1 pnpm exec vitest run src/reaction-casting-time.mbt.test.ts src/reaction-interrupt-routes.mbt.test.ts -t "Reaction casting time|Reaction casting route|Hellish Rebuke qRoute" 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 5 tests and 4 skipped; final timed run `TOTAL: 6s`.
- `pnpm cleanroom-branch-coverage:check` passed.
- `git diff --check` passed.
- Reviewer-loop convergence passed: round 1 found public route projection was too generic (`interruptStackResume`) for the copied Reaction casting-time connector; implementation moved the route subject and owner sequence into production public route events. Round 2 found no remaining reasonable RAW/domain, architecture/connascence, or code-review findings.

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

| Obligation                                                                                                                  | Target replay evidence                                                                                                                                                                                                                                                                                                        | Diagnostic tests                                                                                                                                          | Status    |
| --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doResolveQuickenedRestoration`                | `tasks/target-replay-evidence/CRPI-READY-006.json#driver:packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doResolveQuickenedRestoration#trace:MBT_TRACES=1 MBT_STEPS=4 action=doResolveQuickenedRestoration qRoute=quickened-restoration-public-route`                                            | `packages/battle-runtime/src/quickened-spell-governor.mbt.test.ts#observes copied quickened successful branch qRoutes through public reducer entrypoints` | `covered` |
| `packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doResolveQuickenedSaveGatedCondition`         | `tasks/target-replay-evidence/CRPI-READY-006.json#driver:packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doResolveQuickenedSaveGatedCondition#trace:MBT_TRACES=1 MBT_STEPS=4 action=doResolveQuickenedSaveGatedCondition qRoute=quickened-save-gated-active-effect-public-route`                 | `packages/battle-runtime/src/quickened-spell-governor.mbt.test.ts#observes copied quickened successful branch qRoutes through public reducer entrypoints` | `covered` |
| `packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doResolveQuickenedSaveGatedConditionImmunity` | `tasks/target-replay-evidence/CRPI-READY-006.json#driver:packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doResolveQuickenedSaveGatedConditionImmunity#trace:MBT_TRACES=1 MBT_STEPS=4 action=doResolveQuickenedSaveGatedConditionImmunity qRoute=quickened-save-gated-active-effect-public-route` | `packages/battle-runtime/src/quickened-spell-governor.mbt.test.ts#observes copied quickened successful branch qRoutes through public reducer entrypoints` | `covered` |
| `packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doResolveQuickenedDirectCondition`            | `tasks/target-replay-evidence/CRPI-READY-006.json#driver:packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doResolveQuickenedDirectCondition#trace:MBT_TRACES=1 MBT_STEPS=4 action=doResolveQuickenedDirectCondition qRoute=quickened-target-list-active-effect-public-route`                      | `packages/battle-runtime/src/quickened-spell-governor.mbt.test.ts#observes copied quickened successful branch qRoutes through public reducer entrypoints` | `covered` |
| `packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doResolveQuickenedRollModifier`               | `tasks/target-replay-evidence/CRPI-READY-006.json#driver:packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doResolveQuickenedRollModifier#trace:MBT_TRACES=1 MBT_STEPS=4 action=doResolveQuickenedRollModifier qRoute=quickened-target-list-active-effect-public-route`                            | `packages/battle-runtime/src/quickened-spell-governor.mbt.test.ts#observes copied quickened successful branch qRoutes through public reducer entrypoints` | `covered` |
| `packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doResolveQuickenedAfterMagicActionSpent`      | `tasks/target-replay-evidence/CRPI-READY-006.json#driver:packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doResolveQuickenedAfterMagicActionSpent#trace:MBT_TRACES=1 MBT_STEPS=4 action=doResolveQuickenedAfterMagicActionSpent qRoute=quickened-restoration-public-route`                        | `packages/battle-runtime/src/quickened-spell-governor.mbt.test.ts#observes copied quickened successful branch qRoutes through public reducer entrypoints` | `covered` |
| `packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doRejectUnaffordable`                         | `tasks/target-replay-evidence/CRPI-READY-006.json#driver:packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doRejectUnaffordable#trace:MBT_TRACES=1 MBT_STEPS=4 action=doRejectUnaffordable qRoute=quickened-resource-governor-public-route`                                                        | `packages/battle-runtime/src/quickened-spell-governor.mbt.test.ts#observes copied quickened rejection qRoutes through public reducer entrypoints`         | `covered` |
| `packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doRejectUnknownOption`                        | `tasks/target-replay-evidence/CRPI-READY-006.json#driver:packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doRejectUnknownOption#trace:MBT_TRACES=1 MBT_STEPS=4 action=doRejectUnknownOption qRoute=quickened-resource-governor-public-route`                                                      | `packages/battle-runtime/src/quickened-spell-governor.mbt.test.ts#observes copied quickened rejection qRoutes through public reducer entrypoints`         | `covered` |
| `packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doRejectUnsupportedSecondOption`              | `tasks/target-replay-evidence/CRPI-READY-006.json#driver:packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doRejectUnsupportedSecondOption#trace:MBT_TRACES=1 MBT_STEPS=4 action=doRejectUnsupportedSecondOption qRoute=quickened-resource-governor-public-route`                                  | `packages/battle-runtime/src/quickened-spell-governor.mbt.test.ts#observes copied quickened rejection qRoutes through public reducer entrypoints`         | `covered` |
| `packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doRejectOnePerSpell`                          | `tasks/target-replay-evidence/CRPI-READY-006.json#driver:packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doRejectOnePerSpell#trace:MBT_TRACES=1 MBT_STEPS=4 action=doRejectOnePerSpell qRoute=quickened-resource-governor-public-route`                                                          | `packages/battle-runtime/src/quickened-spell-governor.mbt.test.ts#observes copied quickened rejection qRoutes through public reducer entrypoints`         | `covered` |
| `packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doRejectPriorLevelOnePlusSpell`               | `tasks/target-replay-evidence/CRPI-READY-006.json#driver:packages/battle-runtime/battle-runtime-quickened-spell-governor.mbt.qnt#step:doRejectPriorLevelOnePlusSpell#trace:MBT_TRACES=1 MBT_STEPS=4 action=doRejectPriorLevelOnePlusSpell qRoute=quickened-prior-level-one-plus-public-route`                                 | `packages/battle-runtime/src/quickened-spell-governor.mbt.test.ts#observes copied quickened rejection qRoutes through public reducer entrypoints`         | `covered` |

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

| Obligation                                                                                       | Target replay evidence                                                                                                                                                                                                            | Diagnostic tests                                                                                                                                                                               | Status    |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `packages/battle-runtime/battle-runtime-magic-missile.mbt.qnt#step:doFillMagicMissileAllocation` | `tasks/target-replay-evidence/CRP07-DSR-01.json#driver:packages/battle-runtime/battle-runtime-magic-missile.mbt.qnt#step:doFillMagicMissileAllocation#trace:MBT_TRACES=1 MBT_STEPS=2 action=doFillMagicMissileAllocation`         | `packages/battle-runtime/src/magic-missile-allocation.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Magic Missile through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-magic-missile.mbt.qnt#step:doFillMagicMissileDamage`     | `tasks/target-replay-evidence/CRP07-DSR-01.json#driver:packages/battle-runtime/battle-runtime-magic-missile.mbt.qnt#step:doFillMagicMissileDamage#trace:MBT_TRACES=1 MBT_STEPS=2 action=doFillMagicMissileDamage dartRollTotal=3` | `packages/battle-runtime/src/magic-missile-allocation.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Magic Missile through the shared reducer surface` | `covered` |

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

| Obligation                                                                                                            | Target replay evidence                                                                                                                                                                                                                                       | Diagnostic tests                                                                                                                                                                                      | Status    |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `packages/battle-runtime/battle-runtime-interrupt-stack-resume.mbt.qnt#step:doNestedDeclineResumesOuterInterrupt`     | `tasks/target-replay-evidence/CRPI-READY-005.json#driver:packages/battle-runtime/battle-runtime-interrupt-stack-resume.mbt.qnt#step:doNestedDeclineResumesOuterInterrupt#trace:MBT_TRACES=1 MBT_STEPS=1 action=doNestedDeclineResumesOuterInterrupt`         | `packages/battle-runtime/src/interrupt-stack-resume.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes interrupt stack resume through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-interrupt-stack-resume.mbt.qnt#step:doShieldMutationResumesInterruptedAttack` | `tasks/target-replay-evidence/CRPI-READY-005.json#driver:packages/battle-runtime/battle-runtime-interrupt-stack-resume.mbt.qnt#step:doShieldMutationResumesInterruptedAttack#trace:MBT_TRACES=1 MBT_STEPS=1 action=doShieldMutationResumesInterruptedAttack` | `packages/battle-runtime/src/interrupt-stack-resume.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes interrupt stack resume through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-interrupt-stack-resume.mbt.qnt#step:doReplayRecordedProcedureFromRoot`        | `tasks/target-replay-evidence/CRPI-READY-005.json#driver:packages/battle-runtime/battle-runtime-interrupt-stack-resume.mbt.qnt#step:doReplayRecordedProcedureFromRoot#trace:MBT_TRACES=1 MBT_STEPS=1 action=doReplayRecordedProcedureFromRoot`               | `packages/battle-runtime/src/interrupt-stack-resume.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes interrupt stack resume through the shared reducer surface` | `covered` |

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

| Obligation                                                                                                                 | Target replay evidence                                                                                                                                                                                                                                                                            | Diagnostic tests | Status    |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------- |
| `packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doChooseDamageType`                           | `tasks/target-replay-evidence/CRPI-READY-002.json#driver:packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doChooseDamageType#trace:MBT_TRACES=1 MBT_STEPS=8 action=doChooseDamageType damageType=fire`                                                                 | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doChooseFirstLeapTarget`                      | `tasks/target-replay-evidence/CRPI-READY-002.json#driver:packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doChooseFirstLeapTarget#trace:MBT_TRACES=1 MBT_STEPS=8 action=doChooseFirstLeapTarget slotLevel=1 damageType=fire`                                           | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doChooseInitialTarget`                        | `tasks/target-replay-evidence/CRPI-READY-002.json#driver:packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doChooseInitialTarget#trace:MBT_TRACES=1 MBT_STEPS=8 action=doChooseInitialTarget slotLevel=1 damageType=fire`                                               | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doResolveStep0AttackHit`                      | `tasks/target-replay-evidence/CRPI-READY-002.json#driver:packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doResolveStep0AttackHit#trace:MBT_TRACES=1 MBT_STEPS=8 action=doResolveStep0AttackHit slotLevel=1 damageType=fire`                                           | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doResolveStep0DamageDuplicate`                | `tasks/target-replay-evidence/CRPI-READY-002.json#driver:packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doResolveStep0DamageDuplicate#trace:MBT_TRACES=1 MBT_STEPS=8 action=doResolveStep0DamageDuplicate slotLevel=1 damageType=fire`                               | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doResolveStep0DamageNoDuplicate`              | `tasks/target-replay-evidence/CRPI-READY-002.json#driver:packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doResolveStep0DamageNoDuplicate#trace:MBT_TRACES=1 MBT_STEPS=8 action=doResolveStep0DamageNoDuplicate slotLevel=1 damageType=fire`                           | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doResolveStep1AttackHit`                      | `tasks/target-replay-evidence/CRPI-READY-002.json#driver:packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doResolveStep1AttackHit#trace:MBT_TRACES=1 MBT_STEPS=8 action=doResolveStep1AttackHit slotLevel=1 damageType=fire`                                           | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doResolveStep1DuplicateDamageSlot1Limit`      | `tasks/target-replay-evidence/CRPI-READY-002.json#driver:packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doResolveStep1DuplicateDamageSlot1Limit#trace:MBT_TRACES=1 MBT_STEPS=8 action=doResolveStep1DuplicateDamageSlot1Limit slotLevel=1 damageType=fire`           | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doResolveStep1DuplicateDamageSlot2AllowsLeap` | `tasks/target-replay-evidence/CRPI-READY-002.json#driver:packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doResolveStep1DuplicateDamageSlot2AllowsLeap#trace:MBT_TRACES=1 MBT_STEPS=8 action=doResolveStep1DuplicateDamageSlot2AllowsLeap slotLevel=2 damageType=fire` | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doStartCast`                                  | `tasks/target-replay-evidence/CRPI-READY-002.json#driver:packages/battle-runtime/battle-runtime-chained-attack-sequence.mbt.qnt#step:doStartCast#trace:MBT_TRACES=1 MBT_STEPS=8 action=doStartCast slotLevel=1`                                                                                   | `_none_`         | `covered` |

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

| Obligation                                                                                              | Target replay evidence                                                                                                                                                                                                                 | Diagnostic tests | Status    |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------- |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doApproachMovementContinues`      | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doApproachMovementContinues#trace:MBT_TRACES=1 MBT_STEPS=5 action=doApproachMovementContinues`           | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doApproachNoMovement`             | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doApproachNoMovement#trace:MBT_TRACES=1 MBT_STEPS=5 action=doApproachNoMovement`                         | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doDiscoverCommand`                | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doDiscoverCommand#trace:MBT_TRACES=1 MBT_STEPS=5 action=doDiscoverCommand`                               | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doDropNeedsHeldObjectFacts`       | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doDropNeedsHeldObjectFacts#trace:MBT_TRACES=1 MBT_STEPS=5 action=doDropNeedsHeldObjectFacts`             | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFillApproachMovementContinues`  | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFillApproachMovementContinues#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFillApproachMovementContinues`   | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFillApproachMovementWithinFive` | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFillApproachMovementWithinFive#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFillApproachMovementWithinFive` | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFillDropHeldObjectFacts`        | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFillDropHeldObjectFacts#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFillDropHeldObjectFacts`               | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFillFailedGrovelSavingThrow`    | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFillFailedGrovelSavingThrow#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFillFailedGrovelSavingThrow`       | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFillFleeMovement`               | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFillFleeMovement#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFillFleeMovement`                             | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFillGrovelOption`               | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFillGrovelOption#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFillGrovelOption`                             | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFillTargetList`                 | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFillTargetList#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFillTargetList`                                 | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFleeMovement`                   | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFleeMovement#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFleeMovement`                                     | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFleeNoMovement`                 | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFleeNoMovement#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFleeNoMovement`                                 | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFleeOpportunityAttack`          | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFleeOpportunityAttack#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFleeOpportunityAttack`                   | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFollowGrovel`                   | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doFollowGrovel#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFollowGrovel`                                     | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doHaltSuppresses`                 | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doHaltSuppresses#trace:MBT_TRACES=1 MBT_STEPS=5 action=doHaltSuppresses`                                 | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doRejectFleePartialMovement`      | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doRejectFleePartialMovement#trace:MBT_TRACES=1 MBT_STEPS=5 action=doRejectFleePartialMovement`           | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doSubmitOptionBeforeTargetList`   | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doSubmitOptionBeforeTargetList#trace:MBT_TRACES=1 MBT_STEPS=5 action=doSubmitOptionBeforeTargetList`     | `_none_`         | `covered` |
| `packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doSubmitSavingThrowBeforeOption`  | `tasks/target-replay-evidence/CRPI-READY-003.json#driver:packages/battle-runtime/battle-runtime-command-ordering.mbt.qnt#step:doSubmitSavingThrowBeforeOption#trace:MBT_TRACES=1 MBT_STEPS=5 action=doSubmitSavingThrowBeforeOption`   | `_none_`         | `covered` |

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

| Obligation                                                                                      | Target replay evidence                                                                                                                                                                                                   | Diagnostic tests                                                                                                                                | Status    |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt#step:doFillFirstAttackHit`       | `tasks/target-replay-evidence/CRPI-READY-004.json#driver:packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt#step:doFillFirstAttackHit#trace:MBT_TRACES=1 MBT_STEPS=4 action=doFillFirstAttackHit`             | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes independent spell Attack sequences through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt#step:doFillFirstAttackMiss`      | `tasks/target-replay-evidence/CRPI-READY-004.json#driver:packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt#step:doFillFirstAttackMiss#trace:MBT_TRACES=1 MBT_STEPS=4 action=doFillFirstAttackMiss`           | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes independent spell Attack sequences through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt#step:doFillFirstDamageLow`       | `tasks/target-replay-evidence/CRPI-READY-004.json#driver:packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt#step:doFillFirstDamageLow#trace:MBT_TRACES=1 MBT_STEPS=4 action=doFillFirstDamageLow`             | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes independent spell Attack sequences through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt#step:doFillSecondAttackHit`      | `tasks/target-replay-evidence/CRPI-READY-004.json#driver:packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt#step:doFillSecondAttackHit#trace:MBT_TRACES=1 MBT_STEPS=4 action=doFillSecondAttackHit`           | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes independent spell Attack sequences through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt#step:doFillSecondAttackMiss`     | `tasks/target-replay-evidence/CRPI-READY-004.json#driver:packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt#step:doFillSecondAttackMiss#trace:MBT_TRACES=1 MBT_STEPS=4 action=doFillSecondAttackMiss`         | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes independent spell Attack sequences through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt#step:doFillSecondDamageLow`      | `tasks/target-replay-evidence/CRPI-READY-004.json#driver:packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt#step:doFillSecondDamageLow#trace:MBT_TRACES=1 MBT_STEPS=4 action=doFillSecondDamageLow`           | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes independent spell Attack sequences through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt#step:doFillTwoCreatureTargets`   | `tasks/target-replay-evidence/CRPI-READY-004.json#driver:packages/battle-runtime/battle-runtime-eldritch-blast.mbt.qnt#step:doFillTwoCreatureTargets#trace:MBT_TRACES=1 MBT_STEPS=4 action=doFillTwoCreatureTargets`     | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes independent spell Attack sequences through the shared reducer surface` | `covered` |
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

| Obligation                                                                                                             | Target replay evidence                                                                                                                                                                                                                                            | Diagnostic tests                                                                                                                                                                                                                                | Status    |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `packages/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt#step:doCastConcentrationSpell`            | `tasks/target-replay-evidence/CRP07-DSR-05.json#driver:packages/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt#step:doCastConcentrationSpell#trace:MBT_TRACES=1 MBT_STEPS=3 action=doCastConcentrationSpell`                                  | `packages/battle-runtime/src/concentration-break-teardown.mbt.test.ts#public discovered acts/stale filled subjects`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Concentration cleanup ordering deterministically` | `covered` |
| `packages/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt#step:doDamageRequestsConcentrationSave`   | `tasks/target-replay-evidence/CRP07-DSR-05.json#driver:packages/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt#step:doDamageRequestsConcentrationSave#trace:MBT_TRACES=1 MBT_STEPS=3 action=doDamageRequestsConcentrationSave damageDiePip=4` | `packages/battle-runtime/src/concentration-break-teardown.mbt.test.ts#public discovered acts/stale filled subjects`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Concentration cleanup ordering deterministically` | `covered` |
| `packages/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt#step:doFailConcentrationSave`             | `tasks/target-replay-evidence/CRP07-DSR-05.json#driver:packages/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt#step:doFailConcentrationSave#trace:MBT_TRACES=1 MBT_STEPS=3 action=doFailConcentrationSave damageDiePip=4 saveRollTotal=9`     | `packages/battle-runtime/src/concentration-break-teardown.mbt.test.ts#public discovered acts/stale filled subjects`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Concentration cleanup ordering deterministically` | `covered` |
| `packages/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt#step:doVoluntaryEndConcentration`         | `tasks/target-replay-evidence/CRP07-DSR-05.json#driver:packages/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt#step:doVoluntaryEndConcentration#trace:MBT_TRACES=1 MBT_STEPS=3 action=doVoluntaryEndConcentration`                            | `packages/battle-runtime/src/concentration-break-teardown.mbt.test.ts#public discovered acts/stale filled subjects`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Concentration cleanup ordering deterministically` | `covered` |
| `packages/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt#step:doCastReplacementConcentrationSpell` | `tasks/target-replay-evidence/CRP07-DSR-05.json#driver:packages/battle-runtime/battle-runtime-concentration-break-teardown.mbt.qnt#step:doCastReplacementConcentrationSpell#trace:MBT_TRACES=1 MBT_STEPS=3 action=doCastReplacementConcentrationSpell`            | `packages/battle-runtime/src/concentration-break-teardown.mbt.test.ts#public discovered acts/stale filled subjects`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Concentration cleanup ordering deterministically` | `covered` |

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

| Obligation                                                                                                      | Target replay evidence                                                                                                                                                                                                                                     | Diagnostic tests                                                                                                                                                                              | Status    |
| --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `packages/battle-runtime/battle-runtime-death-saving-throw.mbt.qnt#step:doDiscoverEndTurnDeathSavingThrow`      | `tasks/target-replay-evidence/CRP07-DSR-04.json#driver:packages/battle-runtime/battle-runtime-death-saving-throw.mbt.qnt#step:doDiscoverEndTurnDeathSavingThrow#trace:MBT_TRACES=1 MBT_STEPS=3 action=doDiscoverEndTurnDeathSavingThrow`                   | `packages/battle-runtime/src/death-saving-throw.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Death Saving Throw through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-death-saving-throw.mbt.qnt#step:doFillDeathSavingThrow`                 | `tasks/target-replay-evidence/CRP07-DSR-04.json#driver:packages/battle-runtime/battle-runtime-death-saving-throw.mbt.qnt#step:doFillDeathSavingThrow#trace:MBT_TRACES=1 MBT_STEPS=3 action=doFillDeathSavingThrow roll=1`; `roll=5`; `roll=10`; `roll=20`  | `packages/battle-runtime/src/death-saving-throw.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Death Saving Throw through the shared reducer surface` | `covered` |
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

| Obligation                                                                                                                 | Target replay evidence                                                                                                                                                                                                                                       | Diagnostic tests                                                                                                                   | Status    |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doDiscoverFeatureHealingPool`          | `tasks/target-replay-evidence/CRP07-DSR-03.json#driver:packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doDiscoverFeatureHealingPool#trace:MBT_TRACES=1 MBT_STEPS=4 action=doDiscoverFeatureHealingPool`                   | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Hit Point restoration through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doDiscoverSingleTargetSpellHealing`    | `tasks/target-replay-evidence/CRP07-DSR-03.json#driver:packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doDiscoverSingleTargetSpellHealing#trace:MBT_TRACES=1 MBT_STEPS=4 action=doDiscoverSingleTargetSpellHealing`       | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Hit Point restoration through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doDiscoverTargetListSpellHealing`      | `tasks/target-replay-evidence/CRP07-DSR-03.json#driver:packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doDiscoverTargetListSpellHealing#trace:MBT_TRACES=1 MBT_STEPS=4 action=doDiscoverTargetListSpellHealing`           | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Hit Point restoration through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doFillFeatureHealingDistribution`      | `tasks/target-replay-evidence/CRP07-DSR-03.json#driver:packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doFillFeatureHealingDistribution#trace:MBT_TRACES=1 MBT_STEPS=4 action=doFillFeatureHealingDistribution`           | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Hit Point restoration through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doFillSpellHealingRoll`                | `tasks/target-replay-evidence/CRP07-DSR-03.json#driver:packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doFillSpellHealingRoll#trace:MBT_TRACES=1 MBT_STEPS=4 action=doFillSpellHealingRoll`                               | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Hit Point restoration through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doFillSpellHealingTargetChoice`        | `tasks/target-replay-evidence/CRP07-DSR-03.json#driver:packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doFillSpellHealingTargetChoice#trace:MBT_TRACES=1 MBT_STEPS=4 action=doFillSpellHealingTargetChoice`               | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Hit Point restoration through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doFillSpellHealingTargetList`          | `tasks/target-replay-evidence/CRP07-DSR-03.json#driver:packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doFillSpellHealingTargetList#trace:MBT_TRACES=1 MBT_STEPS=4 action=doFillSpellHealingTargetList`                   | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Hit Point restoration through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doSubmitHealingRollBeforeTargetChoice` | `tasks/target-replay-evidence/CRP07-DSR-03.json#driver:packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doSubmitHealingRollBeforeTargetChoice#trace:MBT_TRACES=1 MBT_STEPS=4 action=doSubmitHealingRollBeforeTargetChoice` | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Hit Point restoration through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doSubmitHealingRollBeforeTargetList`   | `tasks/target-replay-evidence/CRP07-DSR-03.json#driver:packages/battle-runtime/battle-runtime-hit-point-restoration-ordering.mbt.qnt#step:doSubmitHealingRollBeforeTargetList#trace:MBT_TRACES=1 MBT_STEPS=4 action=doSubmitHealingRollBeforeTargetList`     | `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes Hit Point restoration through the shared reducer surface` | `covered` |

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

## CRPI-READY-008

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`
- Driver: `packages/battle-runtime/battle-runtime-roll-modifier-active-effects.mbt.qnt`
- Route connector: `packages/battle-runtime/battle-runtime-roll-modifier-active-effects.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-roll-modifier-active-effects.mbt.qnt`
- `packages/battle-runtime/battle-runtime-roll-modifier-active-effects.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md`
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

The route replay for roll-modifier active effects now observes the copied
`qRoute` projection through public battle reducer route events. Roll-modifier
spell discovery projects `rollModifierEffect` route events from public
`AvailableBattleAct.routeEvents`; skill choice, ability choice, fixed two-target
ability choice, Saving Throw outcome, active-effect application, Thaumaturgy
Booming Voice, and roll-modifier Concentration teardown project from public
`BattleResolutionResult.routeEvents`.

BattleState remains the durable owner. Active Spell Effects remain
`BattleCreatureState.activeEffects`, Concentration remains
`BattleCreatureState.concentration`, and table-supplied choice/count frontiers
remain fills. Thaumaturgy's one-minute-effect count stays boundary evidence
instead of becoming a duplicate ledger.

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-008.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id: `MBT_TRACES=1 MBT_STEPS=16 qRoute=roll-modifier-active-effects-public-route`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-008/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 35.

Verification results:

- `pnpm --filter @dnd/battle-runtime exec tsc --noEmit` passed.
- `MBT_TRACES=1 MBT_STEPS=16 pnpm exec vitest run src/roll-modifier-active-effects.mbt.test.ts` passed with 5 tests; final timed run `TOTAL: 17s`.
- Round 3 affected-route regression passed: `pnpm --filter @dnd/battle-runtime exec vitest run src/quickened-spell-governor.mbt.test.ts -t "observes copied quickened successful branch qRoutes"` passed with 1 test and 7 skipped; final timed run `TOTAL: 4s`.
- Round 3 focused target replay passed: `cd packages/battle-runtime && MBT_TRACES=1 MBT_STEPS=16 pnpm exec vitest run src/roll-modifier-active-effects.mbt.test.ts -t "replays roll-modifier active-effect qRoute"` passed with 1 test and 4 skipped; final timed run `TOTAL: 13s`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- RAW/ubiquitous-language review passed against Bane, Bless, Enhance Ability, Enthrall, Guidance, Pass without Trace, Thaumaturgy, and UBIQUITOUS_LANGUAGE.md D20 Rolls, Advantage and Disadvantage, Concentration, Spell Invocation, and Spell Effect.
- Reviewer-loop convergence passed: round 1 added public reducer route projection for roll-modifier active effects and checked no duplicate durable state was introduced; round 2 removed an unjustified route-event cast; round 3 narrowed Task 35 roll-modifier resolution routing away from Quickened `bonusActionSpell` subjects so Task 31 `metamagicBonusActionCastingTime` routes remain authoritative. No remaining reasonable RAW/domain, architecture/connascence, or code-review findings.

## CRPI-READY-015

- Manifest source commit SHA: `10baec50712df61a7a45ac533f61d0536b6410dd`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`
- Driver: `packages/battle-runtime/battle-runtime-sorcerer-metamagic-heightened-selected-identity.mbt.qnt`
- Route connector: `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-sorcerer-metamagic-heightened-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Classes/Sorcerer.md`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

The route replay for Heightened Spell saving-throw roll mode now observes the
copied `qRoute` projection through public battle reducer entrypoints. The
replay starts from `battleReducerStartRouteEvent`, uses `discoverBattleActs` to
obtain the Heightened Hideous Laughter act, and then resolves the subject. After
the Heightened target-choice fill opens the saving-throw hole frontier,
`BattleResolutionResult.routeEvents` exposes `metamagicSavingThrowRollMode`
discovery and roll-mode ownership. The saving-throw fill then exposes saving
throw outcome ownership and the condition lifecycle owner for Hideous Laughter.

BattleState remains the durable owner. Sorcery Point spend remains
`CharacterBattlePointPoolResourceState.pointsRemaining`, target choice remains a
fill, saving-throw Disadvantage remains the existing roll-mode projection on the
saving-throw hole, and active Spell Effects remain
`BattleCreatureState.activeEffects`. No selected-option identity dispatch or
duplicate Heightened target state was added.

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-015.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id: `public-route=metamagicSavingThrowRollMode action=doResolveHeightenedHideousLaughter qRoute=metamagic-saving-throw-roll-mode-public-route`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-015/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 46.

Verification results:

- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- `START=$(date +%s); cd packages/battle-runtime && MBT_TRACES=1 MBT_STEPS=1 pnpm exec vitest run src/sorcerer-metamagic-heightened-selected-identity.mbt.test.ts -t "Heightened Spell saving-throw roll-mode|Sorcerer Metamagic Heightened" 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 3 tests; deterministic `stepRouteSavingThrowRollMode` executed copied `doRouteSavingThrowRollMode` `qRoute` and compared it to the public reducer route; final timed run `TOTAL: 8s`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- `pnpm quality` passed end to end; app lint reported warnings only and exited 0.
- RAW/ubiquitous-language review passed against Sorcerer Metamagic and Heightened Spell, Hideous Laughter, and `UBIQUITOUS_LANGUAGE.md` terms Magic Action, Spell Invocation, Saving Throw, Disadvantage, Pool, Spend, and Spell Effect.
- Reviewer-loop convergence passed: round 1 added public `metamagicSavingThrowRollMode` route ownership and deterministic copied-route replay; round 2 verified no duplicate durable state, no authored-identity dispatch, and no remaining reasonable RAW/domain, architecture/connascence, or code-review findings.

## CRPI-READY-016

- Manifest source commit SHA: `0da15bfe0871d5a45782c7ac355d622be8907d44`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`
- Driver: `packages/battle-runtime/battle-runtime-sorcerer-metamagic-seeking-selected-identity.mbt.qnt`
- Route connector: `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-sorcerer-metamagic-seeking-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Classes/Sorcerer.md`
- `.references/srd-5.2.1/Spells/Descriptions-Q-R.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

The route replay for Seeking Spell missed spell Attack rerolls now observes the
copied `qRoute` projection through public battle reducer entrypoints. The
replay starts from `battleReducerStartRouteEvent`, uses `discoverBattleActs` to
obtain the Ray of Frost spell Attack act, and then resolves the subject. After
the first missed attack-roll fill opens the Seeking reroll hole frontier,
`BattleResolutionResult.routeEvents` exposes `metamagicMissedSpellAttackReroll`
discovery and original attack-roll ownership. The reroll attack-roll fill then
exposes reroll attack-roll ownership, and damage completion exposes the
feature-resource spend completion route.

BattleState remains the durable owner. Sorcery Point spend remains
`CharacterBattlePointPoolResourceState.pointsRemaining`, the pending reroll
frontier remains the existing attack-roll hole option, the reroll decision
remains the existing attack-roll fill payload, and target Hit Point and active
Spell Effect changes remain in `BattleCreatureState`. No selected-option
identity dispatch or duplicate pending-reroll state was added.

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-016.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id: `public-route=metamagicMissedSpellAttackReroll action=doResolveSeekingSpellAttackReroll qRoute=metamagic-missed-spell-attack-reroll-public-route`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-016/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 47.

Verification results:

- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- First focused replay attempt with `step: "doRouteMissedSpellAttackReroll"` failed because the copied connector branch did not expose a deterministic `stepRoute...` wrapper for the driver action protocol.
- Second focused replay attempt still failed with the same initial-route implementation projection after adding only a generic `step` driver alias.
- `START=$(date +%s); cd packages/battle-runtime && MBT_TRACES=1 MBT_STEPS=1 pnpm exec vitest run src/sorcerer-metamagic-seeking-selected-identity.mbt.test.ts -t "Seeking Spell missed-attack reroll|Sorcerer Metamagic Seeking" 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 3 tests after adding `stepRouteMissedSpellAttackReroll`; deterministic `stepRouteMissedSpellAttackReroll` executed copied `doRouteMissedSpellAttackReroll` `qRoute` and compared it to the public reducer route; final timed run `TOTAL: 8s`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- `pnpm quality` passed end to end; app lint reported warnings only and exited 0.
- RAW/ubiquitous-language review passed against Sorcerer Metamagic and Seeking Spell, Ray of Frost, and `UBIQUITOUS_LANGUAGE.md` terms Magic Action, Spell Invocation, Spell Attack, Attack Roll, Damage Roll, Pool, and Spend.
- Reviewer-loop convergence passed: round 1 added public `metamagicMissedSpellAttackReroll` route ownership and deterministic copied-route replay; round 2 verified no duplicate durable state, no authored-identity dispatch, and no remaining reasonable RAW/domain, architecture/connascence, or code-review findings.

## CRPI-READY-020

- Manifest source commit SHA: `0da15bfe0871d5a45782c7ac355d622be8907d44`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`
- Driver: `packages/battle-runtime/battle-runtime-sorcerer-metamagic-subtle-selected-identity.mbt.qnt`
- Route connector: `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-sorcerer-metamagic-subtle-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Classes/Sorcerer.md`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

The route replay for Subtle Spell component projection now observes the copied
`qRoute` projection through public battle reducer entrypoints. The replay starts
from `battleReducerStartRouteEvent`, uses `discoverBattleActs` to obtain the
Subtle False Life scalar-buff act, and resolves that subject with the existing
rolled-dice fill. `AvailableBattleAct.routeEvents` exposes
`metamagicSpellComponentProjection` discovery through the feature-resource
owner, and `BattleResolutionResult.routeEvents` exposes spell-slot and
action-economy ownership for the resolved cast. Public Subtle discovery now uses
the same subject-aware component-projection admission predicate as resolution,
so bonus-action scalar-buff spells such as Barkskin do not expose unsupported
Subtle acts while Subtle remains action-time only.

BattleState remains the durable owner. Sorcery Point spend remains
`CharacterBattlePointPoolResourceState.pointsRemaining`, spell-slot and action
economy remain in the spell invocation resolver, the damage roll remains a
table-supplied fill, and Temporary Hit Points remain in
`BattleCreatureState.tempHp`. No selected-option identity dispatch or duplicate
component projection state was added.

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-020.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id: `public-route=metamagicSpellComponentProjection action=doResolveSubtleFalseLife qRoute=metamagic-subtle-component-projection-public-route`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-020/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 51.

Verification results:

- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- First focused replay attempt failed because public `discoverBattleActs` did
  not yet expose a Subtle False Life act; the typed subject could resolve when
  constructed directly, but that did not satisfy the public-entrypoint route
  requirement.
- `cd packages/battle-runtime && pnpm exec vitest run src/sorcerer-metamagic-subtle-selected-identity.mbt.test.ts -t "labels public Subtle|does not discover Subtle bonus-action"` passed with 2 focused regression tests covering the public Subtle label and the Barkskin bonus-action no-discovery boundary.
- `START=$(date +%s); cd packages/battle-runtime && MBT_TRACES=1 MBT_STEPS=1 pnpm exec vitest run src/sorcerer-metamagic-subtle-selected-identity.mbt.test.ts 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 5 tests after the revision-round fix; deterministic `stepRouteSpellComponentProjection` executed copied `doRouteSpellComponentProjection` `qRoute` and compared it to the public reducer route; final timed run `TOTAL: 7s`.
- `pnpm cleanroom-branch-coverage:check` result recorded in `tasks/RUN_LEDGER.json`.
- `git diff --check` result recorded in `tasks/RUN_LEDGER.json`.
- `pnpm quality` result recorded in `tasks/RUN_LEDGER.json`.
- RAW/ubiquitous-language review passed against Sorcerer Metamagic and Subtle
  Spell, spell Components and Casting Time, False Life, Barkskin, Temporary Hit Points, and
  `UBIQUITOUS_LANGUAGE.md` terms Magic Action, Spell Invocation, Spell
  Component, Pool, Spend, Spell Effect, and Temporary Hit Points.
- Reviewer-loop convergence passed: round 1 added public
  `metamagicSpellComponentProjection` route ownership and scalar-buff Subtle
  act discovery; round 2 fixed the Subtle discovery/admission mismatch for
  bonus-action scalar buffs and replaced the label fallback with a complete
  metamagic effect-kind label map; round 3 verified no duplicate durable state,
  no authored identity dispatch, and no remaining reasonable RAW/domain,
  architecture/connascence, or code-review findings.

## CRPI-READY-021

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`
- Driver: `packages/battle-runtime/battle-runtime-sorcerer-metamagic-transmuted-selected-identity.mbt.qnt`
- Route connector: `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-sorcerer-metamagic-transmuted-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Classes/Sorcerer.md`
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`
- `.references/srd-5.2.1/Spells/Descriptions-Q-R.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

The route replay for Transmuted Spell damage-type substitution now observes the
copied `qRoute` projection through public battle reducer entrypoints. The
replay starts from `battleReducerStartRouteEvent`, uses `discoverBattleActs` to
obtain the Transmuted Burning Hands save-gated damage act, then resolves that
subject through the saving-throw and rolled-dice fills. `AvailableBattleAct`
route events expose `metamagicDamageTypeSubstitution` discovery through the
feature-resource owner. `BattleResolutionResult.routeEvents` expose the
selected replacement Damage Type projection, damage-roll ownership, and
Hit Point ownership.

BattleState remains the durable owner. Sorcery Point spend remains
`CharacterBattlePointPoolResourceState.pointsRemaining`, spell-slot and action
economy remain in the spell invocation resolver, the replacement Damage Type
remains a typed selected Metamagic application fact on the `BattleSubject`, the
damage roll remains a table-supplied fill, and target Hit Points remain in
`BattleCreatureState.hp`. No selected-option identity dispatch or duplicate
damage-type state was added.

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-021.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id: `public-route=metamagicDamageTypeSubstitution action=doResolveTransmutedSaveGatedDamage qRoute=metamagic-damage-type-substitution-public-route`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-021/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 52.

Verification results:

- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- `START=$(date +%s); MBT_TRACES=1 MBT_STEPS=1 pnpm --filter @dnd/battle-runtime exec vitest run src/sorcerer-metamagic-transmuted-selected-identity.mbt.test.ts 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 3 tests; deterministic `stepRouteDamageTypeSubstitution` executed copied `doRouteDamageTypeSubstitution` `qRoute` and compared it to the public reducer route; final timed run `TOTAL: 8s`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- `pnpm quality` passed end to end; app lint reported warnings only and exited 0.
- RAW/ubiquitous-language review passed against Sorcerer Metamagic and
  Transmuted Spell, Burning Hands, Ray of Frost, and
  `UBIQUITOUS_LANGUAGE.md` terms Magic Action, Spell Invocation, Damage,
  Damage Type, Pool, and Spend.
- Reviewer-loop convergence passed: round 1 added public
  `metamagicDamageTypeSubstitution` route ownership and deterministic
  copied-route replay; round 2 verified route admission is typed by
  `damage_type_substitution` Metamagic facts, promoted save-gated damage
  procedure shape, savingThrowOutcome fills, rolledDice fills, and existing
  resource and HP owners. No duplicate durable state or authored-identity
  dispatch was added.

## CRPI-READY-022

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`
- Driver: `packages/battle-runtime/battle-runtime-sorcerer-metamagic-twinned-selected-identity.mbt.qnt`
- Route connector: `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-sorcerer-metamagic-twinned-selected-identity.mbt.qnt`
- `packages/battle-runtime/battle-runtime-sorcerer-metamagic.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Classes/Sorcerer.md`
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

The route replay for Twinned Spell effective-level projection now observes the
copied `qRoute` projection through public battle reducer entrypoints. The
replay starts from `battleReducerStartRouteEvent`, uses `discoverBattleActs` to
obtain the Twinned Bless roll-modifier act, then resolves that subject with the
existing `spellTargetList` fill. `AvailableBattleAct.routeEvents` exposes
`metamagicEffectiveSpellLevel` discovery through the feature-resource owner.
`BattleResolutionResult.routeEvents` exposes spell-slot/action-economy
ownership and target-list ownership for the resolved cast.

BattleState remains the durable owner. Sorcery Point spend remains
`CharacterBattlePointPoolResourceState.pointsRemaining`, spell-slot and action
economy remain in the spell invocation resolver, the effective target-count
projection remains a typed selected Metamagic application fact on the
`BattleSubject` plus the existing invocation targeting projection, target-list
choice remains a table-supplied fill, and active Spell Effects remain in
`BattleCreatureState.activeEffects`. No selected-option identity dispatch or
duplicate effective-level state was added.

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-022.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id: `public-route=metamagicEffectiveSpellLevel action=doResolveTwinnedTargetCount qRoute=metamagic-effective-spell-level-public-route`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-022/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 53.

Verification results:

- Revision-round base check passed: prompt Ralph base ref
  `ralph/cleanroom-reducer-full-lane-20260704T211636Z/integration` was
  `a23d68b8c Mark Ralph task 52 done`, reviewer-feedback codex base ref
  `codex/cleanroom-reducer-full-lane-20260704T211636Z` was
  `10baec507 Mark Ralph task 45 done`, `HEAD` was
  `a23d68b8c Mark Ralph task 52 done`, and the task Base SHA
  `a23d68b8ce4a09594ab492f980e26a555d8d54c4` was an ancestor of `HEAD`.
- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- First focused replay attempt failed because the copied connector exposed
  `doRouteEffectiveSpellLevel` through nondeterministic `step` but did not yet
  define the deterministic `stepRouteEffectiveSpellLevel` wrapper required by
  the target replay harness.
- `START=$(date +%s); pnpm --filter @dnd/battle-runtime exec vitest run src/sorcerer-metamagic-twinned-selected-identity.mbt.test.ts -t "Twinned Spell effective-level" 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with the deterministic route replay; `stepRouteEffectiveSpellLevel` executed copied `doRouteEffectiveSpellLevel` `qRoute` and compared it to the public reducer route; final timed run `TOTAL: 6s`.
- `START=$(date +%s); MBT_TRACES=1 MBT_STEPS=1 pnpm --filter @dnd/battle-runtime exec vitest run src/sorcerer-metamagic-twinned-selected-identity.mbt.test.ts 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 3 tests, covering the selected Unit witness and copied `qRoute` replay together; final timed run `TOTAL: 8s`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- `pnpm quality` passed end to end; app lint reported warnings only and exited 0.
- RAW/ubiquitous-language review passed against Sorcerer Metamagic and Twinned
  Spell, Bless, and `UBIQUITOUS_LANGUAGE.md` terms Spell Level, Cast Level,
  Spell Slot, Spell Invocation, Pool, and Spend.
- Reviewer-loop convergence passed: round 1 added public
  `metamagicEffectiveSpellLevel` route ownership and deterministic copied-route
  replay; round 2 verified route admission is typed by
  `effective_spell_level_increase_for_extra_target` Metamagic facts, promoted
  rollModifier spell procedure shape, spellTargetList fills, and existing
  resource, target-list, and active-effect owners. No duplicate durable state or
  authored-identity dispatch was added.
- Revision round 2 narrowed `metamagicEffectiveSpellLevel` discovery to Twinned
  roll-modifier cast acts with a `spellTargetList` hole and resolution to
  Twinned roll-modifier cast subjects with a `spellTargetList` fill. The run
  ledger base-check artifact was corrected to distinguish the revision prompt's
  Ralph base ref from the reviewer-feedback codex base ref.

## CRPI-READY-023

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `de9d69d8883bbafdfed9a601732620fef6853862f0edaaf48b006ffff2ffa6ec`
- Driver: `packages/battle-runtime/battle-runtime-turn-boundary-effect-lifecycle.mbt.qnt`
- Route connector: `packages/battle-runtime/battle-runtime-turn-boundary-effect-lifecycle.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/battle-runtime/battle-runtime-turn-boundary-effect-lifecycle.mbt.qnt`
- `packages/battle-runtime/battle-runtime-turn-boundary-effect-lifecycle.route.mbt.qnt`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-guidance/reducer-spine.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `UBIQUITOUS_LANGUAGE.md`
- `ASSUMPTIONS.md`

Behavior implemented:

The route replay for turn-boundary effect lifecycle now observes the copied
`qRoute` projection through public battle reducer entrypoints. The replay starts
from `battleReducerStartRouteEvent`, then uses `endTurn` to observe boundary
discovery, rolled-dice Hit Point resolution, saving-throw active-effect
resolution, target end-turn damage, active-effect expiry, and turn-boundary
advancement.

Revision round 2 constrained route admission to the actual public holes owned by
each route subject. A mixed `endTurn` frontier with `deathSavingThrow`,
turn-start damage, and turn-start save holes now emits one `deathSavingThrow`
discovery event owned by `battleHitPointAndZeroHpLifecycle` and one
`turnBoundaryEffectLifecycle` discovery event owned by `battleTurnBoundary`.

Revision round 3 preserves non-turn-boundary route metadata after turn-boundary
damage. If turn-boundary damage opens a `concentrationSavingThrow` frontier, the
public route evidence now emits the Hit Point owner event for the consumed
damage roll and a separate `concentrationTeardown` event owned by
`battleConcentration`. Invalid turn-boundary rolled-dice fills return the
typed invalid result without a `battleHitPoint` ownership event.

Revision round 4 narrows turn-boundary save-fill route admission to the actual
`spellTurnStartSave` hole id. A mixed `endTurn` frontier with a normal spell
condition end-turn save and a turn-start damage/save lifecycle now resolves the
non-turn-boundary save as the generic command route without emitting
`turnBoundaryEffectLifecycle` / `battleActiveEffect` ownership for that fill.

Revision round 5 preserves turn-boundary discovery when a repeat-save condition
frontier is present at the same `endTurn` boundary. A mixed
`sleepPendingRepeatSave` plus turn-start damage/save frontier now emits both the
`repeatSaveConditionEffect` discovery and the `turnBoundaryEffectLifecycle`
discovery through public route events.

Revision round 6 removes the cross-module string-value connascence for
turn-start save hole ids. The hole producer now owns
`spellTurnStartSavingThrowOutcomeHoleId`, and the route classifier reuses that
constructor when deciding whether a `savingThrowOutcome` fill belongs to
`turnBoundaryEffectLifecycle`.

BattleState remains the durable owner for Initiative order and round
advancement. Hit Points remain in `BattleCreatureState.hp`; active Spell
Effects remain in `BattleCreatureState.activeEffects`; ongoing feature
occurrences remain in `BattleCreatureState.activeOngoingFeatureOccurrences`.
Same-timing order remains at the public turn-boundary hole/fill frontier. No
authored identity, QNT branch name, witness field name, connector filename, or
fixture label dispatch was added.

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-023.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace id: `public-route=turnBoundaryEffectLifecycle action=doResolveTargetStartTurn qRoute=target-start-turn-boundary-public-route`
- Reproduction trace id: `public-route=turnBoundaryEffectLifecycle action=doResolveSourceNextTurn qRoute=source-next-turn-boundary-public-route`
- Regression trace id: `public-route=mixed-death-save-turn-boundary-frontier route-ownership-split`
- Regression trace id: `public-route=turn-boundary-damage-concentration-frontier route-ownership-split`
- Regression trace id: `public-route=invalid-turn-boundary-damage-roll-fill no-hit-point-owner-overclaim`
- Regression trace id: `public-route=mixed-non-boundary-save-turn-boundary-save no-active-effect-owner-overclaim`
- Regression trace id: `public-route=mixed-repeat-save-turn-boundary-frontier route-ownership-split`

Branch evidence:

| Obligation                                                                                                    | Evidence                                                                                                                                                                                                                                                                                            | Sampled inputs | Status    |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | --------- |
| `packages/battle-runtime/battle-runtime-turn-boundary-effect-lifecycle.mbt.qnt#step:doResolveTargetStartTurn` | `tasks/target-replay-evidence/CRPI-READY-023.json#driver:packages/battle-runtime/battle-runtime-turn-boundary-effect-lifecycle.mbt.qnt#step:doResolveTargetStartTurn#trace:public-route=turnBoundaryEffectLifecycle action=doResolveTargetStartTurn qRoute=target-start-turn-boundary-public-route` | `_none_`       | `covered` |
| `packages/battle-runtime/battle-runtime-turn-boundary-effect-lifecycle.mbt.qnt#step:doResolveSourceNextTurn`  | `tasks/target-replay-evidence/CRPI-READY-023.json#driver:packages/battle-runtime/battle-runtime-turn-boundary-effect-lifecycle.mbt.qnt#step:doResolveSourceNextTurn#trace:public-route=turnBoundaryEffectLifecycle action=doResolveSourceNextTurn qRoute=source-next-turn-boundary-public-route`    | `_none_`       | `covered` |

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-023/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 61.

Verification results:

- Base check passed: the current task packet's declared Ralph base ref
  `ralph/cleanroom-reducer-full-lane-20260704T211636Z/integration` resolved to
  `a2c638f04 Mark Ralph task 53 done`, `HEAD` resolved to
  `a2c638f04 Mark Ralph task 53 done`, and the task Base SHA
  `a2c638f04c0a79028080c528a193dabe4901797a` was an ancestor of `HEAD`.
  The round-4 reviewer merge note separately checked
  `codex/cleanroom-reducer-full-lane-20260704T211636Z`, which resolved to
  `10baec507 Mark Ralph task 45 done`.
- `pnpm --filter @dnd/battle-runtime typecheck` passed.
- `pnpm --filter @dnd/battle-runtime exec vitest run src/turn-boundary-effect-lifecycle.mbt.test.ts -t "non-boundary end-turn save|mixed repeat-save"` passed; the route classifier still recognizes actual turn-start save fills through the centralized hole-id helper, and mixed repeat-save discovery remains split.
- First focused replay attempt failed because the route replay tried to resolve
  the target save from partially-filled end-turn state; the public reducer
  protocol keeps the same boundary subject and expects accumulated fills.
- `pnpm --filter @dnd/battle-runtime exec vitest run src/turn-boundary-effect-lifecycle.mbt.test.ts -t "splits mixed death-save"` passed; mixed Death Saving Throw plus turn-boundary damage/save discovery split route ownership correctly.
- `pnpm --filter @dnd/battle-runtime exec vitest run src/turn-boundary-effect-lifecycle.mbt.test.ts -t "splits concentration|does not route invalid"` passed; turn-boundary damage concentration holes split to `battleConcentration`, and invalid duplicate turn-boundary damage roll fills emitted no `battleHitPoint` route.
- `pnpm --filter @dnd/battle-runtime exec vitest run src/turn-boundary-effect-lifecycle.mbt.test.ts -t "non-boundary end-turn save"` passed; mixed spell condition end-turn save plus turn-start damage/save frontier did not route the non-turn-boundary save fill as `turnBoundaryEffectLifecycle`.
- `pnpm --filter @dnd/battle-runtime exec vitest run src/turn-boundary-effect-lifecycle.mbt.test.ts -t "mixed repeat-save"` passed; mixed `sleepPendingRepeatSave` plus turn-start damage/save discovery split route ownership correctly.
- MBT process precheck passed before the timed focused replay:
  `ps aux | grep vitest | grep -v grep` and
  `ps aux | grep quint_evaluator | grep -v grep` found no running processes; no
  evaluator cleanup was needed.
- `START=$(date +%s); MBT_TRACES=1 MBT_STEPS=2 pnpm --filter @dnd/battle-runtime exec vitest run src/turn-boundary-effect-lifecycle.mbt.test.ts 2>&1; echo "TOTAL: $(( $(date +%s) - START ))s"` passed with 8 tests; copied `qRoute` was compared to public `endTurn` route events for both branches and all route regressions passed; final timed run `TOTAL: 6s`.
- `pnpm --filter @dnd/battle-runtime exec vitest run src/turn-boundary-effect-lifecycle.mbt.test.ts` passed with 8 tests; copied `qRoute` was compared to public `endTurn` route events for both branches and all route regressions passed.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- `pnpm quality` passed end to end; app lint reported warnings only and exited 0.
- RAW/ubiquitous-language review passed against SRD 5.2.1 The Order of Combat,
  Simultaneous Effects, Reaction, Ready Action, Burning, `ASSUMPTIONS.md#A6`,
  and `UBIQUITOUS_LANGUAGE.md` terms Boundary Crossing, Spell Effect, Timer,
  Reaction, and Turn Structure.
- Reviewer-loop convergence passed: round 1 added public
  `turnBoundaryEffectLifecycle` route ownership and copied-route replay; round
  2 verified route admission is typed by `runtimeCommand` `endTurn`, active
  effect kind shape, public holes/fills, and existing BattleState, Hit Point,
  active-effect, and ongoing-feature owners; round 3 verified concentration
  frontier preservation and invalid-fill non-ownership; round 4 verified that
  non-turn-boundary saving throw fills do not overclaim turn-boundary active
  effect ownership; round 5 verified repeat-save discovery no longer hides
  same-frontier turn-boundary lifecycle discovery; round 6 centralized the
  turn-start save hole-id projection with the hole producer to remove duplicated
  string-value connascence. No duplicate durable state or authored-identity
  dispatch was added.

## CRPI-READY-033

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`
- Driver: `packages/battle-runtime/rule-core-spells.mbt.qnt` (stale aggregate name; current source inventory uses the split connector drivers listed below)
- Route connectors: `packages/battle-runtime/rule-core-spell-damage.mbt.qnt`, `packages/battle-runtime/rule-core-spell-restoration.mbt.qnt`, `packages/battle-runtime/rule-core-spell-defensive-effect.mbt.qnt`, `packages/battle-runtime/rule-core-spell-readied-response.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/battle-runtime/rule-core-spell-damage.mbt.qnt`
- `packages/battle-runtime/rule-core-spell-restoration.mbt.qnt`
- `packages/battle-runtime/rule-core-spell-defensive-effect.mbt.qnt`
- `packages/battle-runtime/rule-core-spell-readied-response.mbt.qnt`
- `packages/battle-runtime/src/rule-core-spells.mbt.test.ts`
- `packages/battle-runtime/rule-core-component-route.qnt`
- `plans/cleanroom-branch-coverage/source-branch-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-route-inventory.json`
- `plans/cleanroom-branch-coverage/reducer-convergence-backlog.json`
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md`
- `.references/srd-5.2.1/Spells/Descriptions-Q-R.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Task 75 accepts the existing rule-core Spell procedure profile component owner.
The copied split spell connectors expose `qComponentRoute` through
`RuleCoreSpellProcedureProfileOwner`, including route-in-denominator Mass Healing Word restoration branches, and the target replay observes the same route event list
through public battle-runtime Spell procedure entrypoints before downstream
battle spell/effect routes consume this owner. No new runtime rule behavior was
introduced.

The replay uses existing public calls in `packages/battle-runtime/src/rule-core-spells.mbt.test.ts`: `discoverBattleActs`,
`resolveBattleSubject`, and `resolveBattleInterrupt`. The durable facts stay
in existing BattleState/BattleCreatureState fields and typed public holes/results.
No authored identity, QNT branch name, witness field name, connector filename, or
fixture label dispatch was added.

Generated branch coverage:

| Obligation | Evidence | Sampled inputs | Status |
| --- | --- | --- | --- |
| `packages/battle-runtime/rule-core-spell-damage.mbt.qnt#step:doAcidSplashAllSuccess` | `tasks/target-replay-evidence/CRPI-READY-033.json#driver:packages/battle-runtime/rule-core-spell-damage.mbt.qnt#step:doAcidSplashAllSuccess#trace:component-route=RuleCoreSpellProcedureProfileOwner connector=spell-damage action=doAcidSplashAllSuccess qComponentRoute=spell-procedure-profile-component-route` | `_none_` | `covered` |
| `packages/battle-runtime/rule-core-spell-damage.mbt.qnt#step:doAcidSplashNeedsDamageRoll` | `tasks/target-replay-evidence/CRPI-READY-033.json#driver:packages/battle-runtime/rule-core-spell-damage.mbt.qnt#step:doAcidSplashNeedsDamageRoll#trace:component-route=RuleCoreSpellProcedureProfileOwner connector=spell-damage action=doAcidSplashNeedsDamageRoll qComponentRoute=spell-procedure-profile-component-route` | `_none_` | `covered` |
| `packages/battle-runtime/rule-core-spell-damage.mbt.qnt#step:doAcidSplashNeedsSavingThrow` | `tasks/target-replay-evidence/CRPI-READY-033.json#driver:packages/battle-runtime/rule-core-spell-damage.mbt.qnt#step:doAcidSplashNeedsSavingThrow#trace:component-route=RuleCoreSpellProcedureProfileOwner connector=spell-damage action=doAcidSplashNeedsSavingThrow qComponentRoute=spell-procedure-profile-component-route` | `_none_` | `covered` |
| `packages/battle-runtime/rule-core-spell-damage.mbt.qnt#step:doAcidSplashOneFail` | `tasks/target-replay-evidence/CRPI-READY-033.json#driver:packages/battle-runtime/rule-core-spell-damage.mbt.qnt#step:doAcidSplashOneFail#trace:component-route=RuleCoreSpellProcedureProfileOwner connector=spell-damage action=doAcidSplashOneFail qComponentRoute=spell-procedure-profile-component-route` | `_none_` | `covered` |
| `packages/battle-runtime/rule-core-spell-damage.mbt.qnt#step:doMagicMissileLow` | `tasks/target-replay-evidence/CRPI-READY-033.json#driver:packages/battle-runtime/rule-core-spell-damage.mbt.qnt#step:doMagicMissileLow#trace:component-route=RuleCoreSpellProcedureProfileOwner connector=spell-damage action=doMagicMissileLow qComponentRoute=spell-procedure-profile-component-route` | `_none_` | `covered` |
| `packages/battle-runtime/rule-core-spell-damage.mbt.qnt#step:doMagicMissileNeedsAllocation` | `tasks/target-replay-evidence/CRPI-READY-033.json#driver:packages/battle-runtime/rule-core-spell-damage.mbt.qnt#step:doMagicMissileNeedsAllocation#trace:component-route=RuleCoreSpellProcedureProfileOwner connector=spell-damage action=doMagicMissileNeedsAllocation qComponentRoute=spell-procedure-profile-component-route` | `_none_` | `covered` |
| `packages/battle-runtime/rule-core-spell-damage.mbt.qnt#step:doRayOfFrostCritical` | `tasks/target-replay-evidence/CRPI-READY-033.json#driver:packages/battle-runtime/rule-core-spell-damage.mbt.qnt#step:doRayOfFrostCritical#trace:component-route=RuleCoreSpellProcedureProfileOwner connector=spell-damage action=doRayOfFrostCritical qComponentRoute=spell-procedure-profile-component-route` | `_none_` | `covered` |
| `packages/battle-runtime/rule-core-spell-damage.mbt.qnt#step:doRayOfFrostHit` | `tasks/target-replay-evidence/CRPI-READY-033.json#driver:packages/battle-runtime/rule-core-spell-damage.mbt.qnt#step:doRayOfFrostHit#trace:component-route=RuleCoreSpellProcedureProfileOwner connector=spell-damage action=doRayOfFrostHit qComponentRoute=spell-procedure-profile-component-route` | `_none_` | `covered` |
| `packages/battle-runtime/rule-core-spell-damage.mbt.qnt#step:doRayOfFrostMiss` | `tasks/target-replay-evidence/CRPI-READY-033.json#driver:packages/battle-runtime/rule-core-spell-damage.mbt.qnt#step:doRayOfFrostMiss#trace:component-route=RuleCoreSpellProcedureProfileOwner connector=spell-damage action=doRayOfFrostMiss qComponentRoute=spell-procedure-profile-component-route` | `_none_` | `covered` |
| `packages/battle-runtime/rule-core-spell-damage.mbt.qnt#step:doRayOfFrostNeedsAttackRoll` | `tasks/target-replay-evidence/CRPI-READY-033.json#driver:packages/battle-runtime/rule-core-spell-damage.mbt.qnt#step:doRayOfFrostNeedsAttackRoll#trace:component-route=RuleCoreSpellProcedureProfileOwner connector=spell-damage action=doRayOfFrostNeedsAttackRoll qComponentRoute=spell-procedure-profile-component-route` | `_none_` | `covered` |
| `packages/battle-runtime/rule-core-spell-damage.mbt.qnt#step:doRayOfFrostNeedsDamageRoll` | `tasks/target-replay-evidence/CRPI-READY-033.json#driver:packages/battle-runtime/rule-core-spell-damage.mbt.qnt#step:doRayOfFrostNeedsDamageRoll#trace:component-route=RuleCoreSpellProcedureProfileOwner connector=spell-damage action=doRayOfFrostNeedsDamageRoll qComponentRoute=spell-procedure-profile-component-route` | `_none_` | `covered` |
| `packages/battle-runtime/rule-core-spell-damage.mbt.qnt#step:doRayOfFrostNeedsTarget` | `tasks/target-replay-evidence/CRPI-READY-033.json#driver:packages/battle-runtime/rule-core-spell-damage.mbt.qnt#step:doRayOfFrostNeedsTarget#trace:component-route=RuleCoreSpellProcedureProfileOwner connector=spell-damage action=doRayOfFrostNeedsTarget qComponentRoute=spell-procedure-profile-component-route` | `_none_` | `covered` |
| `packages/battle-runtime/rule-core-spell-defensive-effect.mbt.qnt#step:doMageArmor` | `tasks/target-replay-evidence/CRPI-READY-033.json#driver:packages/battle-runtime/rule-core-spell-defensive-effect.mbt.qnt#step:doMageArmor#trace:component-route=RuleCoreSpellProcedureProfileOwner connector=spell-defensive-effect action=doMageArmor qComponentRoute=spell-procedure-profile-component-route` | `_none_` | `covered` |
| `packages/battle-runtime/rule-core-spell-defensive-effect.mbt.qnt#step:doMageArmorNeedsTarget` | `tasks/target-replay-evidence/CRPI-READY-033.json#driver:packages/battle-runtime/rule-core-spell-defensive-effect.mbt.qnt#step:doMageArmorNeedsTarget#trace:component-route=RuleCoreSpellProcedureProfileOwner connector=spell-defensive-effect action=doMageArmorNeedsTarget qComponentRoute=spell-procedure-profile-component-route` | `_none_` | `covered` |
| `packages/battle-runtime/rule-core-spell-readied-response.mbt.qnt#step:doReadySpellHold` | `tasks/target-replay-evidence/CRPI-READY-033.json#driver:packages/battle-runtime/rule-core-spell-readied-response.mbt.qnt#step:doReadySpellHold#trace:component-route=RuleCoreSpellProcedureProfileOwner connector=spell-readied-response action=doReadySpellHold qComponentRoute=spell-procedure-profile-component-route` | `_none_` | `covered` |
| `packages/battle-runtime/rule-core-spell-readied-response.mbt.qnt#step:doRejectSecondSlotSpell` | `tasks/target-replay-evidence/CRPI-READY-033.json#driver:packages/battle-runtime/rule-core-spell-readied-response.mbt.qnt#step:doRejectSecondSlotSpell#trace:component-route=RuleCoreSpellProcedureProfileOwner connector=spell-readied-response action=doRejectSecondSlotSpell qComponentRoute=spell-procedure-profile-component-route` | `_none_` | `covered` |
| `packages/battle-runtime/rule-core-spell-readied-response.mbt.qnt#step:doReleaseReadiedSpell` | `tasks/target-replay-evidence/CRPI-READY-033.json#driver:packages/battle-runtime/rule-core-spell-readied-response.mbt.qnt#step:doReleaseReadiedSpell#trace:component-route=RuleCoreSpellProcedureProfileOwner connector=spell-readied-response action=doReleaseReadiedSpell qComponentRoute=spell-procedure-profile-component-route` | `_none_` | `covered` |
| `packages/battle-runtime/rule-core-spell-restoration.mbt.qnt#step:doCureWoundsNeedsHealingRoll` | `tasks/target-replay-evidence/CRPI-READY-033.json#driver:packages/battle-runtime/rule-core-spell-restoration.mbt.qnt#step:doCureWoundsNeedsHealingRoll#trace:component-route=RuleCoreSpellProcedureProfileOwner connector=spell-restoration action=doCureWoundsNeedsHealingRoll qComponentRoute=spell-procedure-profile-component-route` | `_none_` | `covered` |
| `packages/battle-runtime/rule-core-spell-restoration.mbt.qnt#step:doCureWoundsNeedsTarget` | `tasks/target-replay-evidence/CRPI-READY-033.json#driver:packages/battle-runtime/rule-core-spell-restoration.mbt.qnt#step:doCureWoundsNeedsTarget#trace:component-route=RuleCoreSpellProcedureProfileOwner connector=spell-restoration action=doCureWoundsNeedsTarget qComponentRoute=spell-procedure-profile-component-route` | `_none_` | `covered` |
| `packages/battle-runtime/rule-core-spell-restoration.mbt.qnt#step:doCureWoundsWounded` | `tasks/target-replay-evidence/CRPI-READY-033.json#driver:packages/battle-runtime/rule-core-spell-restoration.mbt.qnt#step:doCureWoundsWounded#trace:component-route=RuleCoreSpellProcedureProfileOwner connector=spell-restoration action=doCureWoundsWounded qComponentRoute=spell-procedure-profile-component-route` | `_none_` | `covered` |
| `packages/battle-runtime/rule-core-spell-restoration.mbt.qnt#step:doHealingWordNeedsHealingRoll` | `tasks/target-replay-evidence/CRPI-READY-033.json#driver:packages/battle-runtime/rule-core-spell-restoration.mbt.qnt#step:doHealingWordNeedsHealingRoll#trace:component-route=RuleCoreSpellProcedureProfileOwner connector=spell-restoration action=doHealingWordNeedsHealingRoll qComponentRoute=spell-procedure-profile-component-route` | `_none_` | `covered` |
| `packages/battle-runtime/rule-core-spell-restoration.mbt.qnt#step:doHealingWordNeedsTarget` | `tasks/target-replay-evidence/CRPI-READY-033.json#driver:packages/battle-runtime/rule-core-spell-restoration.mbt.qnt#step:doHealingWordNeedsTarget#trace:component-route=RuleCoreSpellProcedureProfileOwner connector=spell-restoration action=doHealingWordNeedsTarget qComponentRoute=spell-procedure-profile-component-route` | `_none_` | `covered` |
| `packages/battle-runtime/rule-core-spell-restoration.mbt.qnt#step:doHealingWordWounded` | `tasks/target-replay-evidence/CRPI-READY-033.json#driver:packages/battle-runtime/rule-core-spell-restoration.mbt.qnt#step:doHealingWordWounded#trace:component-route=RuleCoreSpellProcedureProfileOwner connector=spell-restoration action=doHealingWordWounded qComponentRoute=spell-procedure-profile-component-route` | `_none_` | `covered` |
| `packages/battle-runtime/rule-core-spell-restoration.mbt.qnt#step:doHealingWordZeroHp` | `tasks/target-replay-evidence/CRPI-READY-033.json#driver:packages/battle-runtime/rule-core-spell-restoration.mbt.qnt#step:doHealingWordZeroHp#trace:component-route=RuleCoreSpellProcedureProfileOwner connector=spell-restoration action=doHealingWordZeroHp qComponentRoute=spell-procedure-profile-component-route` | `_none_` | `covered` |
| `packages/battle-runtime/rule-core-spell-restoration.mbt.qnt#step:doMassHealingWordNeedsHealingRoll` | `tasks/target-replay-evidence/CRPI-READY-033.json#driver:packages/battle-runtime/rule-core-spell-restoration.mbt.qnt#step:doMassHealingWordNeedsHealingRoll#trace:component-route=RuleCoreSpellProcedureProfileOwner connector=spell-restoration action=doMassHealingWordNeedsHealingRoll qComponentRoute=spell-procedure-profile-component-route` | `_none_` | `covered` |
| `packages/battle-runtime/rule-core-spell-restoration.mbt.qnt#step:doMassHealingWordNeedsTargetList` | `tasks/target-replay-evidence/CRPI-READY-033.json#driver:packages/battle-runtime/rule-core-spell-restoration.mbt.qnt#step:doMassHealingWordNeedsTargetList#trace:component-route=RuleCoreSpellProcedureProfileOwner connector=spell-restoration action=doMassHealingWordNeedsTargetList qComponentRoute=spell-procedure-profile-component-route` | `_none_` | `covered` |
| `packages/battle-runtime/rule-core-spell-restoration.mbt.qnt#step:doMassHealingWordWounded` | `tasks/target-replay-evidence/CRPI-READY-033.json#driver:packages/battle-runtime/rule-core-spell-restoration.mbt.qnt#step:doMassHealingWordWounded#trace:component-route=RuleCoreSpellProcedureProfileOwner connector=spell-restoration action=doMassHealingWordWounded qComponentRoute=spell-procedure-profile-component-route` | `_none_` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-READY-033.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace family: `component-route=RuleCoreSpellProcedureProfileOwner qComponentRoute=spell-procedure-profile-component-route`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-READY-033/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- The Ralph plan/task text still names stale aggregate driver `packages/battle-runtime/rule-core-spells.mbt.qnt`; current inventory has split it into four connector drivers.

Verification results:

- Base check passed: current revision prompt base ref `ralph/cleanroom-reducer-full-lane-20260705-restart3/integration` resolved to `064d06e0d Mark Ralph task 74 done`; reviewer-feedback audit ref `codex/cleanroom-reducer-full-lane-20260705-restart2` resolved to `5a3fb5554 Merge Ralph task 100 status`; `HEAD` resolved to `064d06e0d Mark Ralph task 74 done`; Base SHA `064d06e0daeaf82d26c3db3c7b70c4d3bc845286` is an ancestor of `HEAD`.
- RAW/ubiquitous-language review passed against SRD 5.2.1 spell descriptions for Acid Splash, Cure Wounds, Healing Word, Mage Armor, Magic Missile, Mass Cure Wounds, Mass Healing Word, and Ray of Frost; Playing-the-Game Hit Points, Damage Rolls, Saving Throws and Damage, Reactions, and attack spell attack structure; Rules Glossary Magic action, Ready action, Reaction, Hit Points, Healing, and Unconscious; and `UBIQUITOUS_LANGUAGE.md` terms Spell Slot, Spell Invocation, Spell Effect, Hit Points, Attack Roll, Saving Throw, Reaction, Ready Action, and Readied Spell Response.
- `START=$(date +%s); ( cd packages/battle-runtime && MBT_TRACES=1 MBT_STEPS=6 pnpm exec vitest run src/rule-core-spells.mbt.test.ts ) 2>&1 & pid=$!; while kill -0 "$pid" 2>/dev/null; do sleep 1; done; wait "$pid"; status=$?; echo "TOTAL: $(( $(date +%s) - START ))s"; exit "$status"` passed with 5 tests, including the four split spell procedure MBT replay cases; final timed run `TOTAL: 21s`.
- Scoped route-required `validateTargetReplayEvidence` passed for `CRPI-READY-033` with 27 split spell obligations covered, including the three in-denominator Mass Healing Word restoration branches from the route inventory.
- `pnpm cleanroom-branch-coverage:check` exited 143 once in round 2 without diagnostics or leftover processes; direct `node scripts/cleanroom-branch-coverage-check.cjs` then passed with 738 obligations and 24 sampled inputs, and the same `cleanroom-branch-coverage:check` gate passed inside `pnpm quality`.
- `git diff --check` passed.
- `flock /tmp/dnd-mbt-qnt.lock pnpm quality` passed end to end. App lint reported 61 warnings only and exited 0; circular checks passed; turbo typecheck passed 9 packages from cache.
- Reviewer-loop convergence passed: rounds 1-2 verified RAW traceability, ubiquitous-language/domain terms, component-first architecture, adapter quarantine, no duplicate durable Spell procedure state, no authored-identity dispatch, command/report consistency, and no remaining reasonable Task 75 findings.

## CRPI-BLOCK-054

- Manifest source commit SHA: `895539634f9595f8e4650d3c95aaee7084afe8b5`
- Source branch inventory SHA: `5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`
- Driver: `packages/character-sheet-runtime/character-sheet-spellbook-ritual-selected-identity.mbt.qnt`
- Route connector: `packages/character-sheet-runtime/character-sheet-spellbook-ritual-selected-identity.route.mbt.qnt`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`

Allowed inputs used:

- `packages/character-sheet-runtime/character-sheet-spellbook-ritual-selected-identity.mbt.qnt`
- `packages/character-sheet-runtime/character-sheet-spellbook-ritual-selected-identity.route.mbt.qnt`
- `packages/character-sheet-runtime/src/spellbook-ritual-selected-identity.mbt.test.ts`
- `packages/character-sheet-runtime/src/reducer-route-connectors.mbt.test.ts`
- `packages/character-sheet-runtime/src/spell-invocation.ts`
- `packages/character-sheet-runtime/src/sheet-types.ts`
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
- `.references/srd-5.2.1/Classes/Wizard.md`
- `UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

Task 102 accepts the Character Sheet spellbook Ritual selected-identity route
through the public `characterSheetSpellbookRitualInvocationProjection`
entrypoint. The projection derives accepted no-slot ritual invocation or
rejected projection-choice evidence from existing CharacterBuild spellbook Spell
Access, prepared spell facts, Surface Spell Definition ritual facts, and the
spellbook Ritual Access feature. No separate ritual spell list, access cache, or
ritual-casting ledger was introduced.

Generated branch coverage:

| Obligation | Evidence | Sampled inputs | Status |
| --- | --- | --- | --- |
| `packages/character-sheet-runtime/character-sheet-spellbook-ritual-selected-identity.mbt.qnt#step:doInvokeSpellbookRitual` | `tasks/target-replay-evidence/CRPI-BLOCK-054.json#driver:packages/character-sheet-runtime/character-sheet-spellbook-ritual-selected-identity.mbt.qnt#step:doInvokeSpellbookRitual#trace:public-route=characterSheetSpellbookRitualInvocationProjection action=doInvokeSpellbookRitual qRoute=spellbook-ritual-selected-identity-public-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-spellbook-ritual-selected-identity.mbt.qnt#step:doRejectMissingRitualAccessFeature` | `tasks/target-replay-evidence/CRPI-BLOCK-054.json#driver:packages/character-sheet-runtime/character-sheet-spellbook-ritual-selected-identity.mbt.qnt#step:doRejectMissingRitualAccessFeature#trace:public-route=characterSheetSpellbookRitualInvocationProjection action=doRejectMissingRitualAccessFeature qRoute=spellbook-ritual-selected-identity-public-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-spellbook-ritual-selected-identity.mbt.qnt#step:doRejectNonLeveledRitualSpellbookSpell` | `tasks/target-replay-evidence/CRPI-BLOCK-054.json#driver:packages/character-sheet-runtime/character-sheet-spellbook-ritual-selected-identity.mbt.qnt#step:doRejectNonLeveledRitualSpellbookSpell#trace:public-route=characterSheetSpellbookRitualInvocationProjection action=doRejectNonLeveledRitualSpellbookSpell qRoute=spellbook-ritual-selected-identity-public-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-spellbook-ritual-selected-identity.mbt.qnt#step:doRejectNonRitualSpellbookSpell` | `tasks/target-replay-evidence/CRPI-BLOCK-054.json#driver:packages/character-sheet-runtime/character-sheet-spellbook-ritual-selected-identity.mbt.qnt#step:doRejectNonRitualSpellbookSpell#trace:public-route=characterSheetSpellbookRitualInvocationProjection action=doRejectNonRitualSpellbookSpell qRoute=spellbook-ritual-selected-identity-public-route` | `_none_` | `covered` |
| `packages/character-sheet-runtime/character-sheet-spellbook-ritual-selected-identity.mbt.qnt#step:doRejectPreparedOnlyRitual` | `tasks/target-replay-evidence/CRPI-BLOCK-054.json#driver:packages/character-sheet-runtime/character-sheet-spellbook-ritual-selected-identity.mbt.qnt#step:doRejectPreparedOnlyRitual#trace:public-route=characterSheetSpellbookRitualInvocationProjection action=doRejectPreparedOnlyRitual qRoute=spellbook-ritual-selected-identity-public-route` | `_none_` | `covered` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/CRPI-BLOCK-054.json`
- Target profile: `typescript-source-worktree`
- Target profile SHA-256: `95ef7088c72e343baee560bdac17ab88d4c6e85dcde18be380a6026db4c8a4e4`
- Reproduction trace family: `public-route=characterSheetSpellbookRitualInvocationProjection qRoute=spellbook-ritual-selected-identity-public-route`

Harness artifacts:

- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Immutable history: `tasks/history/CRPI-BLOCK-054/`
- Run ledger: `tasks/RUN_LEDGER.json`

Remaining gaps:

- None for Task 102.

Verification results:

- Base check passed: declared base ref
  `ralph/cleanroom-character-sheet-route-lane-20260705T2045Z/integration`
  resolved to `60208a5d4 Mark Ralph task 99 done`, `HEAD` resolved to
  `60208a5d4 Mark Ralph task 99 done`, and Base SHA
  `60208a5d4381977ad3e9bcfee63d0591bdade4c5` was an ancestor of `HEAD`.
- RAW/ubiquitous-language review passed against SRD 5.2.1
  `Spells/Gaining-and-Casting.md` Casting without Slots and Longer Casting
  Times, `Classes/Wizard.md` Level 1 Ritual Adept, and
  `UBIQUITOUS_LANGUAGE.md` Ritual and Spell Access terms.
- `pnpm --filter @dnd/character-sheet-runtime typecheck` passed.
- `pnpm --filter @dnd/character-sheet-runtime exec vitest run src/spell-invocation.test.ts` passed with 5 tests.
- MBT process precheck used the required grep commands. They matched only a
  Ralph monitor shell whose command text contained `vitest` and
  `quint_evaluator`; a process-name check found no actual vitest or
  quint_evaluator process.
- `START=$(date +%s); ( MBT_TRACES=1 MBT_STEPS=1 pnpm --filter @dnd/character-sheet-runtime exec vitest run src/spellbook-ritual-selected-identity.mbt.test.ts src/reducer-route-connectors.mbt.test.ts -t "spellbook ritual|routes spellbook Ritual" ) 2>&1 & pid=$!; wait "$pid"; status=$?; echo "TOTAL: $(( $(date +%s) - START ))s"; exit "$status"` passed with 5 tests and 9 skipped route tests; final timed run `TOTAL: 9s`.
- `pnpm cleanroom-branch-coverage:check` passed with 738 obligations and 24 sampled inputs.
- `git diff --check` passed.
- `pnpm quality` passed end to end; app lint reported 61 warnings and exited 0.
- Reviewer-loop convergence passed: round 1 verified public projection routing,
  RAW traceability, ubiquitous-language/domain language, no duplicate durable
  ritual state, no authored-name dispatch, and adapter quarantine. Round 2
  verified the route comparison comes from public
  `characterSheetSpellbookRitualInvocationProjection`, rejected branches route
  through `projectionChoice`, accepted branches preserve no-slot invocation
  facts, and no remaining reasonable Task 102 findings were found.
