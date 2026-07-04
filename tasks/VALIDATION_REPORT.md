# Validation Report

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

| Obligation | Target replay evidence | Diagnostic tests | Status |
| --- | --- | --- | --- |
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

| Obligation | Target replay evidence | Diagnostic tests | Status |
| --- | --- | --- | --- |
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

| Obligation | Target replay evidence | Diagnostic tests | Status |
| --- | --- | --- | --- |
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

| Obligation | Target replay evidence | Diagnostic tests | Status |
| --- | --- | --- | --- |
| `packages/battle-runtime/battle-runtime-sorcerer-metamagic-careful-selected-identity.mbt.qnt#step:doResolveCarefulSaveGatedDamage` | No accepted copied-connector replay evidence. Blocker evidence: `tasks/target-replay-evidence/CRPI-READY-011.json#driver:packages/battle-runtime/battle-runtime-sorcerer-metamagic-careful-selected-identity.mbt.qnt#step:doResolveCarefulSaveGatedDamage#trace:public-route=metamagicSavingThrowProtection action=doResolveCarefulSaveGatedDamage qRoute=blocked-copied-connector-discovery-frontier` | `packages/battle-runtime/src/sorcerer-metamagic-careful-selected-identity.mbt.test.ts#observes Careful Spell save-protection route through public reducer entrypoints` | `not-covered: source-qnt-corpus-blocked` |
| `packages/battle-runtime/battle-runtime-sorcerer-metamagic-careful-selected-identity.mbt.qnt#step:doResolveCarefulSaveGatedNoEffect` | No accepted copied-connector replay evidence. Blocker evidence: `tasks/target-replay-evidence/CRPI-READY-011.json#driver:packages/battle-runtime/battle-runtime-sorcerer-metamagic-careful-selected-identity.mbt.qnt#step:doResolveCarefulSaveGatedNoEffect#trace:public-route=commandEffect action=doResolveCarefulSaveGatedNoEffect qRoute=blocked-copied-connector-damage-route` | `packages/battle-runtime/src/sorcerer-metamagic-careful-selected-identity.mbt.test.ts#observes Careful Command no-effect route through public reducer entrypoints` | `not-covered: source-qnt-corpus-blocked` |

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

| Obligation | Target replay evidence | Diagnostic tests | Status |
| --- | --- | --- | --- |
| `packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt#step:doFillInitialSaveFailure` | No accepted copied-connector replay evidence. Blocker evidence: `tasks/target-replay-evidence/CRPI-READY-010.json#driver:packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt#step:doEndCasterTurnAfterConcentrationBreak#trace:MBT_TRACES=8 MBT_STEPS=5 qRoute=blocked-copied-connector-post-cleanup-no-op` | State-owned route segment is implemented diagnostically, but full copied `qRoute` replay is skipped because a later copied-connector branch cannot be matched from reducer-owned state. | `not-covered: source-qnt-corpus-blocked` |
| `packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt#step:doBreakConcentrationBeforeRepeat` | No accepted copied-connector replay evidence. Blocker evidence: `tasks/target-replay-evidence/CRPI-READY-010.json#driver:packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt#step:doEndCasterTurnAfterConcentrationBreak#trace:MBT_TRACES=8 MBT_STEPS=5 qRoute=blocked-copied-connector-post-cleanup-no-op` | State-owned concentration cleanup route segment is implemented diagnostically, but the copied connector then expects post-cleanup no-op turn-boundary route events. | `not-covered: source-qnt-corpus-blocked` |
| `packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt#step:doEndCasterTurnAfterConcentrationBreak` | `tasks/target-replay-evidence/CRPI-READY-010.json#driver:packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt#step:doEndCasterTurnAfterConcentrationBreak#trace:MBT_TRACES=8 MBT_STEPS=5 qRoute=blocked-copied-connector-post-cleanup-no-op` | The restored copied connector expects a post-cleanup no-op event after no reducer-owned Sleep frontier remains. | `not-covered: source-qnt-corpus-blocked` |
| `packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt#step:doEndTargetTurnAfterConcentrationBreak` | No accepted copied-connector replay evidence. Related blocker evidence: `tasks/target-replay-evidence/CRPI-READY-010.json#driver:packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt#step:doEndCasterTurnAfterConcentrationBreak#trace:MBT_TRACES=8 MBT_STEPS=5 qRoute=blocked-copied-connector-post-cleanup-no-op` | Same copied connector post-cleanup no-op mismatch. | `not-covered: source-qnt-corpus-blocked` |
| `packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt#step:doDiscoverRepeatSave` | No accepted copied-connector replay evidence. Blocker evidence: `tasks/target-replay-evidence/CRPI-READY-010.json#driver:packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt#step:doEndCasterTurnAfterConcentrationBreak#trace:MBT_TRACES=8 MBT_STEPS=5 qRoute=blocked-copied-connector-post-cleanup-no-op` | State-owned repeat-save discovery route segment is implemented diagnostically, but full copied `qRoute` replay remains blocked. | `not-covered: source-qnt-corpus-blocked` |
| `packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt#step:doFillRepeatSaveSuccess` | No accepted copied-connector replay evidence. Blocker evidence: `tasks/target-replay-evidence/CRPI-READY-010.json#driver:packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt#step:doEndCasterTurnAfterConcentrationBreak#trace:MBT_TRACES=8 MBT_STEPS=5 qRoute=blocked-copied-connector-post-cleanup-no-op` | State-owned repeat-save success cleanup route segment is implemented diagnostically, but full copied `qRoute` replay remains blocked. | `not-covered: source-qnt-corpus-blocked` |
| `packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt#step:doFillRepeatSaveFailure` | No accepted copied-connector replay evidence. Blocker evidence: `tasks/target-replay-evidence/CRPI-READY-010.json#driver:packages/battle-runtime/battle-runtime-sleep-repeat-save.mbt.qnt#step:doEndCasterTurnAfterConcentrationBreak#trace:MBT_TRACES=8 MBT_STEPS=5 qRoute=blocked-copied-connector-post-cleanup-no-op` | State-owned repeat-save failure cleanup route segment is implemented diagnostically; the added regression confirms later `sleepUnconscious` state does not leak repeat-save frontier events. Full copied `qRoute` replay remains blocked. | `not-covered: source-qnt-corpus-blocked` |

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

| Obligation | Target replay evidence | Diagnostic tests | Status |
| --- | --- | --- | --- |
| `packages/battle-runtime/battle-runtime-scalar-buff.mbt.qnt#step:doFillLongstriderTarget` | `tasks/target-replay-evidence/CRPI-READY-009.json#driver:packages/battle-runtime/battle-runtime-scalar-buff.mbt.qnt#step:doFillLongstriderTarget#trace:MBT_TRACES=1 MBT_STEPS=2 action=doFillLongstriderTarget qRoute=scalar-buff-public-route` | `packages/battle-runtime/src/scalar-buff.mbt.test.ts#observes Longstrider qRoute through public reducer entrypoints` | `covered` |
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

| Obligation | Target replay evidence | Diagnostic tests | Status |
| --- | --- | --- | --- |
| `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt#step:doCastShieldOfFaith` | `tasks/target-replay-evidence/CRP07-DSR-06.json#driver:packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt#step:doCastShieldOfFaith#trace:MBT_TRACES=1 MBT_STEPS=6 action=doCastShieldOfFaith qRoute=scalar-buff-active-effects-public-route` | `packages/battle-runtime/src/scalar-buff-active-effects.mbt.test.ts#observes scalar buff active-effect qRoute through public reducer entrypoints` | `covered` |
| `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt#step:doCastLongstrider` | `tasks/target-replay-evidence/CRP07-DSR-06.json#driver:packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt#step:doCastLongstrider#trace:MBT_TRACES=1 MBT_STEPS=6 action=doCastLongstrider qRoute=scalar-buff-active-effects-public-route` | `packages/battle-runtime/src/scalar-buff-active-effects.mbt.test.ts#observes scalar buff active-effect qRoute through public reducer entrypoints` | `covered` |
| `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt#step:doCastSpiderClimb` | `tasks/target-replay-evidence/CRP07-DSR-06.json#driver:packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt#step:doCastSpiderClimb#trace:MBT_TRACES=1 MBT_STEPS=6 action=doCastSpiderClimb qRoute=scalar-buff-active-effects-public-route` | `packages/battle-runtime/src/scalar-buff-active-effects.mbt.test.ts#observes scalar buff active-effect qRoute through public reducer entrypoints` | `covered` |
| `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt#step:doCastAid` | `tasks/target-replay-evidence/CRP07-DSR-06.json#driver:packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt#step:doCastAid#trace:MBT_TRACES=1 MBT_STEPS=6 action=doCastAid qRoute=scalar-buff-active-effects-public-route` | `packages/battle-runtime/src/scalar-buff-active-effects.mbt.test.ts#observes scalar buff active-effect qRoute through public reducer entrypoints` | `covered` |
| `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt#step:doCastFalseLife` | `tasks/target-replay-evidence/CRP07-DSR-06.json#driver:packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt#step:doCastFalseLife#trace:MBT_TRACES=1 MBT_STEPS=6 action=doCastFalseLife qRoute=scalar-buff-active-effects-public-route` | `packages/battle-runtime/src/scalar-buff-active-effects.mbt.test.ts#observes scalar buff active-effect qRoute through public reducer entrypoints` | `covered` |
| `packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt#step:doStutter` | `tasks/target-replay-evidence/CRP07-DSR-06.json#driver:packages/battle-runtime/battle-runtime-scalar-buff-active-effects.mbt.qnt#step:doStutter#trace:MBT_TRACES=1 MBT_STEPS=6 action=doStutter qRoute=scalar-buff-active-effects-public-route` | `packages/battle-runtime/src/scalar-buff-active-effects.mbt.test.ts#observes scalar buff active-effect qRoute through public reducer entrypoints` | `covered` |

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

| Obligation | Target replay evidence | Diagnostic tests | Status |
| --- | --- | --- | --- |
| `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doDiscoverAreaSaveDamage` | `tasks/target-replay-evidence/CRP07-DSR-02.json#driver:packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doDiscoverAreaSaveDamage#trace:MBT_TRACES=1 MBT_STEPS=5 action=doDiscoverAreaSaveDamage` | `packages/battle-runtime/src/save-gated-spell-ordering.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes save-gated spell ordering through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doSubmitDamageBeforeSavingThrow` | `tasks/target-replay-evidence/CRP07-DSR-02.json#driver:packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doSubmitDamageBeforeSavingThrow#trace:MBT_TRACES=1 MBT_STEPS=5 action=doSubmitDamageBeforeSavingThrow` | `packages/battle-runtime/src/save-gated-spell-ordering.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes save-gated spell ordering through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doFillAreaSaveFailed` | `tasks/target-replay-evidence/CRP07-DSR-02.json#driver:packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doFillAreaSaveFailed#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFillAreaSaveFailed` | `packages/battle-runtime/src/save-gated-spell-ordering.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes save-gated spell ordering through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doFillAreaDamageDice` | `tasks/target-replay-evidence/CRP07-DSR-02.json#driver:packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doFillAreaDamageDice#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFillAreaDamageDice` | `packages/battle-runtime/src/save-gated-spell-ordering.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes save-gated spell ordering through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doDiscoverTargetListConditionChoice` | `tasks/target-replay-evidence/CRP07-DSR-02.json#driver:packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doDiscoverTargetListConditionChoice#trace:MBT_TRACES=1 MBT_STEPS=5 action=doDiscoverTargetListConditionChoice` | `packages/battle-runtime/src/save-gated-spell-ordering.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes save-gated spell ordering through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doFillTargetListBeforeConditionChoice` | `tasks/target-replay-evidence/CRP07-DSR-02.json#driver:packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doFillTargetListBeforeConditionChoice#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFillTargetListBeforeConditionChoice` | `packages/battle-runtime/src/save-gated-spell-ordering.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes save-gated spell ordering through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doFillConditionChoiceAfterTargetList` | `tasks/target-replay-evidence/CRP07-DSR-02.json#driver:packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doFillConditionChoiceAfterTargetList#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFillConditionChoiceAfterTargetList` | `packages/battle-runtime/src/save-gated-spell-ordering.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes save-gated spell ordering through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doFillConditionChoiceBeforeTargetList` | `tasks/target-replay-evidence/CRP07-DSR-02.json#driver:packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doFillConditionChoiceBeforeTargetList#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFillConditionChoiceBeforeTargetList` | `packages/battle-runtime/src/save-gated-spell-ordering.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes save-gated spell ordering through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doFillTargetListAfterConditionChoice` | `tasks/target-replay-evidence/CRP07-DSR-02.json#driver:packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doFillTargetListAfterConditionChoice#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFillTargetListAfterConditionChoice` | `packages/battle-runtime/src/save-gated-spell-ordering.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes save-gated spell ordering through the shared reducer surface` | `covered` |
| `packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doFillConditionSavingThrow` | `tasks/target-replay-evidence/CRP07-DSR-02.json#driver:packages/battle-runtime/battle-runtime-save-gated-spell-ordering.mbt.qnt#step:doFillConditionSavingThrow#trace:MBT_TRACES=1 MBT_STEPS=5 action=doFillConditionSavingThrow` | `packages/battle-runtime/src/save-gated-spell-ordering.mbt.test.ts`, `packages/battle-runtime/src/reducer-route-connectors.mbt.test.ts#routes save-gated spell ordering through the shared reducer surface` | `covered` |

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

| Obligation | Target replay evidence | Diagnostic tests | Status |
| --- | --- | --- | --- |
| `packages/battle-runtime/battle-runtime-reaction-casting-time.mbt.qnt#step:doHellishRebukeAfterDamage` | `tasks/target-replay-evidence/CRPI-READY-007.json#driver:packages/battle-runtime/battle-runtime-reaction-casting-time.mbt.qnt#step:doHellishRebukeAfterDamage#trace:MBT_TRACES=1 MBT_STEPS=1 action=doHellishRebukeAfterDamage qRoute=hellish-rebuke-after-damage-public-route` | `packages/battle-runtime/src/reaction-casting-time.mbt.test.ts#observes the copied Hellish Rebuke qRoute through public reducer entrypoints` | `covered` |
| `packages/battle-runtime/battle-runtime-reaction-casting-time.mbt.qnt#step:doCounterspellEndsSpellCast` | branch scope marks this level-3 spell branch out of scope | not run for Task 32 | `out-of-scope` |
| `packages/battle-runtime/battle-runtime-reaction-casting-time.mbt.qnt#step:doCounterspellAllowsSpellCastResume` | branch scope marks this level-3 spell branch out of scope | not run for Task 32 | `out-of-scope` |

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
