# Phase 0 Core Deletion / Restore Audit

Migration baseline: `39f9ab71`  
Current audit date: 2026-04-28

CAM19A refresh: `41a71d3dec664ab3a7036b5c02da7c6d41ac3670`
on 2026-04-29, after the MCP green path can close a battle and hand reduced
player-character HP back to the character list.

This audit inventories old Core, App, and MCP lanes that will break, move, or be
deleted while Correction replaces the old Core vertical. The migration rule is
controlled breakage, not compatibility preservation: `CPU*`, `PEA*`, and `PPR*`
are deleted architecture, while old domain knowledge is preserved by baseline
references and Restore Ledger rows.

## CAM19A Current-HEAD Refresh

Source inventory commands:

```sh
git rev-parse HEAD
rg -l '@dnd/core' packages/mcp packages/character-creation-runtime packages/battle-runtime | sort
rg -n '@dnd/core|CPU|PEA|PPR|projected-executable|projected-compiler|projected-action-bridge|projected-persistent' packages/mcp packages/character-creation-runtime packages/battle-runtime
rg -n '@dnd/core' packages/mcp/src/green packages/character-creation-runtime/src packages/battle-runtime/src packages/character-creation-runtime/character-creation-runtime-slice.qnt packages/battle-runtime/battle-runtime-slice.qnt
rg -n 'projectedPreparedSpell|projected-action-bridge|projected-persistent|projected-compiler|projected-executable|CPU|PEA|PPR' packages/mcp/src packages/character-creation-runtime/src packages/battle-runtime/src
```

Current-HEAD comparison against baseline audit:

- Stale item: the baseline statement that no `CPU*`/`PEA*`/`PPR*` production
  code is safe to delete before a green MCP entrypoint exists is now stale. The
  green entrypoint exists under `packages/mcp/src/green/` and the full green
  fixture includes post-battle character HP handoff. The next action is legacy
  isolation, not production deletion in CAM19A.
- Still-legacy MCP files with `@dnd/core` imports:
  `packages/mcp/src/server.ts`, `server-shared.ts`, `host-factories.ts`,
  `server-control.ts`, `server-table-events.ts`, `server-runtime.ts`,
  `server-battle-attack-runtime.ts`, `server-action-decode.ts`,
  `character-session.ts`, `character-session-helpers.ts`, `start-battle.ts`,
  and `server.test.ts`.
- Still-legacy MCP script call sites for the old Core-backed tool surface:
  `packages/mcp/src/harness.ts` calls `get_state`,
  `get_available_actions`, and `execute_action`; and
  `packages/mcp/src/probe-short-rest.ts` calls `get_available_actions`.
  These scripts do not import Core directly, but they exercise the legacy
  `server.ts` tool surface and must move with the legacy boundary or be
  deleted. Retain them only if CAM19B rewrites them to call the promoted green
  tools through `packages/mcp/src/green/`.
- Still-legacy MCP package metadata:
  `packages/mcp/package.json` keeps the package-level `@dnd/core` dependency
  and `packages/mcp/tsconfig.json` keeps the path alias while old MCP files
  remain in the package.
- Newly safe to isolate: every non-`src/green/` MCP file above can move behind
  a deletion-marked legacy boundary because the Surface runtime vertical no
  longer needs them for the green fixture. `packages/mcp/src/index.ts` and
  `packages/mcp/src/session-router.ts` do not import Core directly, but they
  route through `server.ts`, `server-shared.ts`, `host-factories.ts`,
  `character-session.ts`, and `start-battle.ts`, so they belong to the same
  legacy boundary until promotion.
- Missing from the old audit: `packages/mcp/src/green/` is now the current
  promoted candidate path. The direct Core import check over
  `packages/mcp/src/green`, `packages/character-creation-runtime/src`,
  `packages/battle-runtime/src`, and both package-local QNT slices returns no
  matches.
- Still-legacy projected MCP lane:
  `packages/mcp/src/server-runtime.ts` imports
  `@dnd/core/projected-action-bridge-prepared-spell.ts`; `server.ts` branches
  on `projectedPreparedSpell`; `server.test.ts` still carries Acid Splash
  projected prepared spell tests.
- Stale projected-vocabulary false positive: the acceptance regex finds
  `PHASE1_WEAPON_SPEAR_UNIT_ID` in
  `packages/character-creation-runtime/src/phase1-manifest.ts` because the
  substring `PEA` appears in `SPEAR`. This is not projected vocabulary.
- Still clean runtime packages: `@dnd/character-creation-runtime` and
  `@dnd/battle-runtime` source/QNT files do not import `@dnd/core` and do not
  use old projected executable module names. README mentions of `@dnd/core` are
  documentation of the boundary, not runtime dependencies.
- Promoted-path Core import checks must target source/QNT files when the
  desired result is zero matches. Broad package checks include expected
  documentation mentions in package READMEs and are classification checks, not
  executable zero-match gates.

Restore Ledger coverage at this refresh:

- Core-backed MCP host, action-token workflow, old character session, and old
  start-battle route are covered by the Restore Ledger row "Old MCP Core-backed
  tools".
- `server-runtime.ts`, `server.ts`, and `server.test.ts` projected prepared
  spell call sites are covered by "Projected prepared spell / Acid Splash lane".
- Old `available-actions.ts` imports in MCP are covered by "Old
  `available-actions.ts` breadth".
- Old character draft/sheet/session behavior is covered by "Full character
  creation width", "Level advancement and higher-level starts",
  "Spellcasting and Mage/Wizard creation", and "Old MCP Core-backed tools".
- Old battle machine host, old battle event/runtime input decoding, and old
  monster catalog startup are covered by "Old Core battle MBT", "Monster
  legendary/recharge/daily controls", and "Old MCP Core-backed tools".
- The old projected executable modules and `CPU*`/`PEA*`/`PPR*` vocabulary are
  covered by "Old projected execution vocabulary", with Acid Splash, Second
  Wind, Action Surge, and Mage Armor lanes covered by their dedicated rows.

Prior Phase 0 outputs consulted:

- `plans/phase1-fighter-manifest.md`: selected vertical is an Orc Soldier
  Fighter 1 with Defense, Longsword, Chain Mail, Shield, and Goblin Warrior.
- `plans/phase0-surface-unit-availability.md`: Surface and Unit coverage for the same selected vertical.
- `plans/phase0-runtime-boundary-api.md`: green path imports `@dnd/surface`,
  `@dnd/character-creation-runtime`, and `@dnd/battle-runtime`, with no
  `@dnd/core` imports.

## Core Import Inventory

### MCP: host/session root

Current files:

- `packages/mcp/src/server.ts`
- `packages/mcp/src/server-shared.ts`
- `packages/mcp/src/host-factories.ts`
- `packages/mcp/src/server-control.ts`
- `packages/mcp/src/server-table-events.ts`
- `packages/mcp/src/server.test.ts`

Core imports and lane:

- `@dnd/core/battle-machine.ts`: old battle XState host.
- `@dnd/core/machine.ts`: old single-creature XState host.
- `@dnd/core/machine-types.ts`: old `DndContext`, `DndEvent`, and machine input payloads.
- `@dnd/core/battle-machine-types.ts` and `@dnd/core/battle-machine-events.ts`: old battle event/context API.
- `@dnd/core/context-encoding.ts`: old snapshot/transport encoding.
- `@dnd/core/types.ts`: branded ids and scalar constructors used by old hosts.
- `@dnd/core/available-actions.ts`: old action discovery, preview, finalization, table event schema, and token API.
- `@dnd/core/machine-queries.ts`: old single-creature status gates.
- `@dnd/core/features/class-fighter.ts`: old Fighter helper data for table events.

Classification: legacy-only until green MCP entrypoint exists. These imports
cannot remain on the green MCP path because the green path must not import
`@dnd/core`.

### MCP: runtime-input decoders

Current files:

- `packages/mcp/src/server-runtime.ts`
- `packages/mcp/src/server-battle-attack-runtime.ts`
- `packages/mcp/src/server-action-decode.ts`

Core imports and lane:

- `@dnd/core/available-actions.ts`: runtime token schema and runtime tag shape.
- `@dnd/core/projected-action-bridge-prepared-spell.ts`: `projectedPreparedSpell` runtime input decoder and prompt shape.
- `@dnd/core/battle-machine-creature.ts`: old battle weapon die helper.
- `@dnd/core/battle-machine-types.ts`: old battle context and creature state.
- `@dnd/core/battle-machine-events.ts`: movement-origin constants.
- `@dnd/core/features/class-bard.ts`, `class-tables.ts`, `class-monk.ts`: old class dice helpers.
- `@dnd/core/machine-types.ts`: old creature context.

Classification: delete or legacy-only after green runtime. Do not preserve
`projectedPreparedSpell` as a compatibility vocabulary; green battle holes
should carry the new runtime facts directly.

### MCP: character surface

Current files:

- `packages/mcp/src/character-session.ts`
- `packages/mcp/src/character-session-helpers.ts`
- `packages/mcp/src/start-battle.ts`

Core imports and lane:

- `@dnd/core/character-domain.ts`: old `CharacterDraft`, `CharacterSheet`,
  finalization, assessment, open-choice, and advancement semantics.
- `@dnd/core/character-sheet-derived.ts`: old creature/battle projections.
- `@dnd/core/character-ability-scores.ts`: old character creation constants
  through app surfaces.
- `@dnd/core/features/class-tables.ts`: old class names and hit dice.
- `@dnd/core/player-loadouts.ts`: old Fighter battle loadout.
- `@dnd/core/monster-catalog.ts`: old monster id/catalog path.
- `@dnd/core/types.ts`: old battle weapon profile and scalar brands.

Classification: replace in first green vertical. The new MCP character tools
must call `@dnd/character-creation-runtime`, `@dnd/battle-runtime`, and
`@dnd/surface`/SRD collection imports instead of Core.

### App: single-creature simulator and feature panels

Current files include:

- `packages/app/src/components/App.tsx`
- `packages/app/src/components/EventPanel.tsx`
- `packages/app/src/components/StatePanel.tsx`
- `packages/app/src/components/TransitionLog.tsx`
- `packages/app/src/components/FeaturePanel.tsx`
- `packages/app/src/components/MonkPanel.tsx`
- `packages/app/src/components/PaladinPanel.tsx`
- `packages/app/src/components/RoguePanel.tsx`
- `packages/app/src/features/useFeatures.ts`
- `packages/app/src/features/useFighterExtras.ts`
- `packages/app/src/features/useMonkPaladinFeatures.ts`
- `packages/app/src/features/useRogueFeatures.ts`
- `packages/app/src/features/useFeatures.test.tsx`

Core imports and lane:

- `@dnd/core/machine.ts`, `machine-types.ts`, `machine-helpers.ts`,
  `machine-queries.ts`: old single-creature simulator.
- `@dnd/core/features/*`: old TS feature bridge/store and class helpers.
- `@dnd/core/types.ts`: old condition, damage, ability, and scalar types.

Classification: temporarily omitted app lane. Preserve baseline references; do
not adapt this UI onto green runtime in the first vertical.

### App: character creation

Current files include:

- `packages/app/src/components/character-creation/CharacterCreationPage.tsx`
- `packages/app/src/components/character-creation/CharacterCreationStepContent.tsx`
- `packages/app/src/components/character-creation/AbilityScoresStep.tsx`
- `packages/app/src/components/character-creation/DetailsStep.tsx`
- `packages/app/src/components/character-creation/OpenChoicePicker.tsx`
- `packages/app/src/components/character-creation/characterCreationPresets.ts`
- `packages/app/src/components/character-creation/CharacterCreationPage.test.tsx`

Core imports and lane:

- `@dnd/core/character-domain.ts`: old draft/sheet/update/choice semantics.
- `@dnd/core/character-sheet-derived.ts`: old projection.
- `@dnd/core/character-ability-scores.ts`: old ability generation constants.
- `@dnd/core/features/class-tables.ts`: old class names.
- `@dnd/core/types.ts`: old ability brands.

Classification: temporarily omitted app lane. Green character creation is MCP
first; app UI may fail until rebuilt over the new runtime.

### App: battle scene and trace visualizers

Current files include:

- `packages/app/src/entry.tsx`
- `packages/app/src/battle-scene/BattlePage.tsx`
- `packages/app/src/battle-scene/EmbedBattlePage.tsx`
- `packages/app/src/battle-scene/BattleInspector.tsx`
- `packages/app/src/battle-scene/InterruptPanel.tsx`
- `packages/app/src/battle-scene/*`
- `packages/app/src/components/trace-visualizer/*`

Core imports and lane:

- `@dnd/core/demo/fireball-battle.ts`: old demo scenario.
- `@dnd/core/battle-machine.ts`, `battle-machine-types.ts`: old battle host.
- `@dnd/core/battle-scene/*`: old scene snapshot, layout, director, narration,
  dice engine, and sprite contracts.
- `@dnd/core/machine.ts`, `machine-types.ts`: old creature trace replay.
- `@dnd/core/features/class-tables.ts`, `@dnd/core/types.ts`: old trace fixture helpers.

Classification: temporarily omitted app/debug lane. Preserve baseline references
for visual replay concepts, but do not keep Core just to keep battle UI green.

## Projected Vocabulary Inventory

### `CPU*`

| Symbol          | Current definition/callers                                                                                                                                                                                                                                                              | Classification              | Deletion path                                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `CPUExecutable` | Variant in `CompiledProjectedUnit` in `packages/core/src/projected-compiler.ts`; produced by `compileProjectedSpell`, `compileProjectedClassFeature`, and `compileProjectedUnit`; consumed by `compileProjectedExecutable`; asserted in `packages/core/src/projected-compiler.test.ts`. | Delete after green runtime. | Replace compiler output with direct Surface/runtime reducer facts in the green packages; then delete `projected-compiler.ts` and tests. |
| `CPUPersistent` | Variant in `CompiledProjectedUnit`; produced by `compileProjectedSpell`; consumed by `compileProjectedPersistent`; asserted in compiler tests.                                                                                                                                          | Delete after green runtime. | Move Mage Armor/base-AC semantics into the runtime-owned Surface/unit reader or Restore Ledger; do not rename this as a new IR.         |

### `PEA*`

| Symbol                          | Current definition/callers                                                                                                                                                                                                                                                                                                                                                                                                                                        | Classification                                                                                       | Deletion path                                                                                                                                                        |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PEASelf`                       | Attachment variant in `projected-executable.ts` and `projected-executable.qnt`; emitted by `projected-compiler.ts`; consumed by `projected-mechanic-interpreter-helpers.ts`, `projected-creature-action-reducer.ts`, and tests.                                                                                                                                                                                                                                   | Delete after green runtime.                                                                          | Green character/battle holes should name self-targeting in their own domain protocols, not as `PEA*`.                                                                |
| `PEAOneTarget`                  | Attachment variant in TS/QNT; emitted for target attachments; consumed by interpreter helpers and tests.                                                                                                                                                                                                                                                                                                                                                          | Delete after green runtime.                                                                          | Replace with green battle target-choice holes.                                                                                                                       |
| `PEAAreaSpherePointWithinRange` | Attachment variant in TS/QNT; emitted for Acid Splash; consumed by prepared-spell bridge, interpreter helpers, compiler/interpreter tests, and QNT subset docs. Acid Splash RAW is `.references/srd-5.2.1/Spells/Descriptions-A-D.md:20` and `:29`; this row preserves old-code references, not provenance.                                                                                                                                                       | Legacy-only until Restore Ledger entry exists for Acid Splash/projected spell lane.                  | First green vertical does not include Acid Splash. Preserve old-code references; do not preserve the tag.                                                            |
| `PEASaveGateDamage`             | Executable action variant in TS/QNT; emitted for Acid Splash; consumed by `projected-mechanic-interpreter.ts`, `projected-action-bridge-helpers.ts`, `projected-action-bridge-prepared-spell.ts`, `projected-creature-action-reducer.ts`, compiler/interpreter tests, and MCP `projectedPreparedSpell` runtime tests. Acid Splash RAW is `.references/srd-5.2.1/Spells/Descriptions-A-D.md:20` and `:29`; this row preserves old-code references, not provenance. | Legacy-only until Restore Ledger entry exists for projected prepared spells.                         | Omit from first green Fighter/monster attack vertical; restore later as Surface UnitRecord-backed spell-act holes, not as projected IR.                              |
| `PEADirectHealHp`               | Executable action variant emitted for Second Wind; consumed by interpreter, bridge helpers, creature action reducer, and tests. Fighter level 1 must still include Second Wind on the finalized Character Sheet (`.references/srd-5.2.1/Classes/Fighter.md:31`, `:62`; `plans/phase1-fighter-manifest.md:26`).                                                                                                                                                    | Delete after green character/runtime.                                                                | Preserve Second Wind as a level-1 sheet/resource fact; only its Bonus Action healing battle act may be deferred because the first battle slice does not exercise it. |
| `PEADirectGrantExtraAction`     | Executable action variant emitted for Action Surge; consumed by interpreter, bridge helpers, battle/creature action reducers, `available-actions.ts`, `machine.ts`, and tests.                                                                                                                                                                                                                                                                                    | Delete after green runtime; legacy-only if Action Surge remains outside first green Fighter level-1. | First green Fighter is level 1, so Action Surge is omitted. Ledger must preserve baseline references.                                                                |

### `PPR*`

| Symbol         | Current definition/callers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Classification                                                                                                      | Deletion path                                                                                                                                             |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PPRSetBaseAc` | Persistent record variant in `projected-executable.ts` and `projected-executable.qnt`; emitted by `compileProjectedPersistent`; consumed by `projected-persistent.ts`, `battle-init-creature-config.ts`, `battle-machine-types.ts`, `character-sheet-derived.ts`, `battle-machine-actions-turn.ts`, `battle-machine-actions-attack.ts`, `battle-machine-helpers.ts`, `available-actions.ts`, MBT normalization, and tests. Mage Armor RAW is `.references/srd-5.2.1/Spells/Descriptions-M-P.md:5` and `:14`; this row preserves old-code references, not provenance. | Legacy-only until Mage Armor/persistent projection has a Restore Ledger row; delete after green runtime if omitted. | First green vertical does not need Mage Armor. Preserve the Mage Armor/base-AC concept by baseline references, then delete the projected persistent lane. |

### Projected modules and callers

Delete after green runtime:

- `packages/core/src/projected-executable.ts`
- `packages/core/src/projected-compiler.ts`
- `packages/core/src/projected-mechanic-interpreter.ts`
- `packages/core/src/projected-mechanic-interpreter-types.ts`
- `packages/core/src/projected-mechanic-interpreter-helpers.ts`
- `packages/core/src/projected-action-bridge.ts`
- `packages/core/src/projected-action-bridge-prepared-spell.ts`
- `packages/core/src/projected-action-bridge-helpers.ts`
- `packages/core/src/projected-action-context.ts`
- `packages/core/src/projected-creature-action-reducer.ts`
- `packages/core/src/projected-battle-action-reducer.ts`
- `packages/core/src/projected-persistent.ts`
- `packages/core/src/projected-compiler.test.ts`
- `packages/core/src/projected-executable.test.ts`
- `packages/core/src/projected-mechanic-interpreter.test.ts`
- `packages/core/src/projected-persistent.test.ts`

Legacy-only until Restore Ledger entries exist:

- `packages/core/src/projected-action-bridge-prepared-spell.ts`
- `projected-executable.qnt`
- `plans/EXECUTABLE_PROJECTION_QUINT_SUBSETS.md`
- `plans/EXECUTABLE_PROJECTION_ACTIVE_PERSISTENT_PRIMITIVE.md`
- projected sections of `packages/core/src/available-actions.ts`,
  `available-actions.test.ts`, `battle-projection.mbt.test.ts`, and
  `packages/mcp/src/server-runtime.ts` / `server.test.ts`.

Delete now candidates:

- No `CPU*`/`PEA*`/`PPR*` production code is safe to delete before a green MCP
  entrypoint exists because current MCP and app gates still route through old
  Core. The current safe action is ledgering and isolating legacy paths, not
  partial deletion.

## Lane Classification Table

| Lane                                        | Current files                                                                                                                                                                                   | Baseline reference                                                                                                                                                                                                                                                                                        | First green replacement                                                                                               | Temporarily omitted                                     | Disabled or expected-failing checks                                                     | Green replacement check                                           | Restore condition                                                          | Risk if omitted                                                                                                                     |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Core-backed MCP host and action tokens      | `packages/mcp/src/server.ts`, `server-shared.ts`, `host-factories.ts`, `server-control.ts`, `server-table-events.ts`                                                                            | `git show 39f9ab71:packages/mcp/src/server.ts`; `git show 39f9ab71:packages/mcp/src/server-control.ts`; `git show 39f9ab71:packages/mcp/src/server-table-events.ts`                                                                                                                                       | New MCP green tool module over `@dnd/character-creation-runtime` and `@dnd/battle-runtime`                            | No for green surface; yes for old tools                 | Old `packages/mcp/src/server.test.ts` action-token tests may fail                       | MCP green vertical fixture                                        | Old tools rebuilt or intentionally retired over new runtimes               | High if old and green tools share host root; Core import can leak into green path                                                   |
| MCP runtime-input decoders                  | `server-runtime.ts`, `server-battle-attack-runtime.ts`, `server-action-decode.ts`                                                                                                               | `git show 39f9ab71:packages/mcp/src/server-runtime.ts`; `git show 39f9ab71:packages/mcp/src/server-battle-attack-runtime.ts`; `git show 39f9ab71:packages/mcp/src/server-action-decode.ts`                                                                                                                | Runtime holes/fills from battle runtime                                                                               | Yes outside Attack/End Turn                             | Old execute-action runtime tests, projected spell runtime tests                         | Battle runtime hit/miss/damage/end-turn fixture                   | Runtime facts represented by green battle hole fill types                  | Medium; old decoder names can drag `projectedPreparedSpell` forward                                                                 |
| MCP character tools                         | `character-session.ts`, `character-session-helpers.ts`, `start-battle.ts`                                                                                                                       | `git show 39f9ab71:packages/mcp/src/character-session.ts`; `git show 39f9ab71:packages/mcp/src/character-session-helpers.ts`; `git show 39f9ab71:packages/mcp/src/start-battle.ts`                                                                                                                        | New player-character draft/hole/finalize tools over character creation runtime                                        | No for level-1 Fighter; yes for broad character surface | Existing MCP character tests may fail                                                   | Orc Soldier Fighter creation through holes and finalization       | Runtime supports broad SRD character creation                              | Medium; old Core `CharacterDraft`/`CharacterSheet` can be mistaken for the new player-character draft and finalized Character Sheet |
| Old Core character creation width           | `character-domain.ts`, `character-ability-scores.ts`, `character-advancement.ts`, `character-sheet-advancement.ts`, `character-sheet-derived.ts`                                                | `git show 39f9ab71:packages/core/src/character-domain.ts`; `git show 39f9ab71:packages/core/src/character-ability-scores.ts`; `git show 39f9ab71:packages/core/src/character-advancement.ts`; `git show 39f9ab71:packages/core/src/character-sheet-derived.ts`                                            | `@dnd/character-creation-runtime` level-1 Fighter reducer/QNT                                                         | Yes outside exact manifest                              | Broad character tests may be skipped/deleted from green gate                            | Character runtime QNT/MBT and deterministic complete Fighter test | Surface UnitRecord-backed broad SRD choices                                | High if broad draft facts are copied instead of re-derived from UnitRecords                                                         |
| Old Core battle machine                     | `battle-machine.ts`, `battle-machine-*`, `battle.qnt`, `battle-projection.mbt.test.ts`, `battle-machine.mbt.test.ts`                                                                            | `git show 39f9ab71:packages/core/src/battle-machine.ts`; `git show 39f9ab71:packages/core/src/battle-projection.mbt.test.ts`; `git show 39f9ab71:battle.qnt`                                                                                                                                              | `@dnd/battle-runtime` Attack action plus runtime end-turn command reducer/QNT                                         | Yes outside first green acts                            | Old battle MBT may be outside green gate during breakage                                | Battle runtime slice QNT/MBT                                      | Slice merges into/replaces one battle authority                            | High; two battle authorities can diverge if both remain active                                                                      |
| Old available-actions breadth               | `packages/core/src/available-actions.ts`, `available-actions.test.ts`                                                                                                                           | `git show 39f9ab71:packages/core/src/available-actions.ts`; `git show 39f9ab71:packages/core/src/available-actions.test.ts`                                                                                                                                                                               | Battle/creation discover-holes and discover-acts APIs                                                                 | Yes outside green tools                                 | Preview/finalize/token tests may fail                                                   | Green MCP discover/fill/resolve tests                             | New runtime protocol covers omitted action families                        | Medium; token/protocol vocabulary may leak into green APIs                                                                          |
| Projected executable/persistent vocabulary  | `projected-executable.ts`, `projected-compiler.ts`, `projected-action-bridge*.ts`, `projected-*reducer.ts`, `projected-persistent.ts`, `projected-executable.qnt`                               | `git show 39f9ab71:packages/core/src/projected-executable.ts`; `git show 39f9ab71:packages/core/src/projected-compiler.ts`; `git show 39f9ab71:packages/core/src/projected-action-bridge.ts`; `git show 39f9ab71:packages/core/src/projected-persistent.ts`; `git show 39f9ab71:projected-executable.qnt` | None as vocabulary; semantics move into Surface/runtime facts                                                         | Yes                                                     | Projected compiler/interpreter/persistent tests should be deleted or marked legacy-only | Surface/runtime tests for supported green Units                   | Do not restore as IR; restore missing semantics directly                   | High if preserved through adapter; violates non-negotiable deletion                                                                 |
| Prepared spell / Acid Splash projected lane | `projected-action-bridge-prepared-spell.ts`, `available-actions.ts`, `server-runtime.ts`, MCP tests                                                                                             | `git show 39f9ab71:packages/core/src/projected-action-bridge-prepared-spell.ts`; `git show 39f9ab71:packages/mcp/src/server-runtime.ts`; RAW: `.references/srd-5.2.1/Spells/Descriptions-A-D.md:20`, `:29`                                                                                                | None in first green Fighter/monster vertical                                                                          | Yes                                                     | Acid Splash execute-action tests expected to fail                                       | None in phase 1-3                                                 | Surface UnitRecord-backed spell acts and battle spell holes                | Medium; loses useful save-gate/damage pressure unless ledgered                                                                      |
| Second Wind battle action lane              | `projected-creature-action-reducer.ts`, `projected-action-context.ts`, `machine.ts`; RAW: `.references/srd-5.2.1/Classes/Fighter.md:31`, `:62`; manifest: `plans/phase1-fighter-manifest.md:26` | Feature projected action tests                                                                                                                                                                                                                                                                            | Character finalization must preserve Second Wind as a level-1 sheet/resource fact; battle act support may be deferred | Yes for the Bonus Action healing battle act only        | Character Sheet includes Second Wind; battle action tests may fail                      | Orc Soldier Fighter finalization fixture                          | Runtime supports Surface UnitRecord-backed Second Wind battle action holes | Medium; level-1 sheet legality must not be dropped while battle act execution is omitted                                            |
| Action Surge projected lane                 | `git show 39f9ab71:packages/core/src/projected-battle-action-reducer.ts`; `git show 39f9ab71:packages/core/src/projected-action-context.ts`                                                     | Feature projected action tests                                                                                                                                                                                                                                                                            | None in first green level-1 Fighter                                                                                   | Yes                                                     | Action Surge action tests expected to fail                                              | None in first green vertical                                      | Runtime supports Surface UnitRecord-backed class feature action holes      | Low for first green because Action Surge is level 2                                                                                 |
| Mage Armor / persistent projected lane      | `projected-persistent.ts`, `battle-init-creature-config.ts`, `character-sheet-derived.ts`, AC consumers                                                                                         | `git show 39f9ab71:packages/core/src/projected-persistent.ts`; `git show 39f9ab71:packages/core/src/battle-init-creature-config.ts`; `git show 39f9ab71:packages/core/src/character-sheet-derived.ts`; RAW: `.references/srd-5.2.1/Spells/Descriptions-M-P.md:5`, `:14`                                   | None in first green vertical                                                                                          | Yes                                                     | Persistent projection and Mage Armor AC tests expected to fail                          | None in phase 1-3                                                 | Runtime supports Surface UnitRecord-backed persistent effects/lifecycle    | Medium; base-AC override/lifecycle knowledge must be preserved by reference                                                         |
| Monster catalog and controls                | `monster-catalog.ts`, `monster-types.ts`, MCP start battle and server snapshot helpers                                                                                                          | `git show 39f9ab71:packages/core/src/monster-catalog.ts`; `git show 39f9ab71:packages/core/src/monster-types.ts`; `git show 39f9ab71:packages/mcp/src/start-battle.ts`                                                                                                                                    | SRD Stat Block collection boundary for Goblin Warrior                                                                 | Partially                                               | Legendary/recharge/daily/control tests may fail                                         | Goblin Warrior participates in green battle fixture               | Surface or distinct SRD Stat Block boundary supports broader monsters      | High if 5e-tools or Core catalog is treated as provenance                                                                           |
| App single-creature simulator and features  | `App.tsx`, `EventPanel.tsx`, `StatePanel.tsx`, `FeaturePanel.tsx`, app feature hooks                                                                                                            | `git show 39f9ab71:packages/app/src/components/App.tsx`; `git show 39f9ab71:packages/app/src/features/useFeatures.ts`                                                                                                                                                                                     | None in first green MCP vertical                                                                                      | Yes                                                     | App simulator tests/build may fail                                                      | MCP green fixture                                                 | App rebuilt over stable runtime snapshots                                  | Low for MCP goal, medium for developer ergonomics                                                                                   |
| App character creation                      | `components/character-creation/*`                                                                                                                                                               | `git show 39f9ab71:packages/app/src/components/character-creation/CharacterCreationPage.tsx`; `git show 39f9ab71:packages/app/src/components/character-creation/OpenChoicePicker.tsx`                                                                                                                     | None in first green MCP vertical                                                                                      | Yes                                                     | CharacterCreationPage tests/build may fail                                              | MCP character creation fixture                                    | App consumes new character runtime                                         | Medium; useful UI workflow knowledge only preserved by references                                                                   |
| App battle scene and trace visualizers      | `battle-scene/*`, `components/trace-visualizer/*`, `entry.tsx`                                                                                                                                  | `git show 39f9ab71:packages/app/src/battle-scene/BattlePage.tsx`; `git show 39f9ab71:packages/app/src/components/trace-visualizer/TraceVisualizer.tsx`; `git show 39f9ab71:packages/core/src/battle-scene/director.ts`                                                                                    | None in first green MCP vertical                                                                                      | Yes                                                     | Battle UI, trace visualizer tests/build may fail                                        | MCP green fixture                                                 | Runtime exposes stable snapshots/traces                                    | Medium; visual replay contracts can be expensive to rediscover                                                                      |

## Green Path Cutover Plan

1. Create a separate MCP green composition root, for example
   `packages/mcp/src/green-server.ts`, whose imports are limited to
   `@dnd/surface`, the SRD UnitRecord collection, the SRD Stat Block collection,
   `@dnd/character-creation-runtime`, `@dnd/battle-runtime`, and local MCP
   transport helpers.
2. Keep existing `server.ts`, `server-shared.ts`, `host-factories.ts`, and old
   Core action-token tools out of the green import graph. Do not thread green
   tools through `SupportedActionHost`, because that type is built from Core
   XState actors.
3. Replace MCP character operations with green stored sessions:
   create player-character draft, discover creation holes, fill creation holes,
   finalize the Orc Soldier Fighter, inspect battle-ready runtime projection.
4. Replace `start_battle` with a green battle session initializer that consumes:
   battle-ready player-character combat input derived from the finalized
   Character Sheet, the authored SRD Goblin Warrior Stat Block selected from the
   new collection boundary, initiative/current actor facts, and no Core monster
   catalog.
5. Replace `get_available_actions` / `execute_action` on the green path with
   runtime-native operations:
   discover battle acts, choose Attack action or runtime end-turn command, fill
   target/attack-roll/damage holes, resolve.
6. Add a dependency/import check for the green MCP module:
   `rg '@dnd/core' packages/mcp/src/green-server.ts packages/character-creation-runtime packages/battle-runtime`
   must return no matches.
7. After the green fixture passes, either isolate old Core-backed MCP tools under
   an explicit legacy entrypoint or delete them with Restore Ledger coverage.

## CAM19B-CAM19D Deletion / Isolation Checklist

### CAM19B: isolate the legacy Core MCP path

Files to move or place behind an explicitly deletion-marked legacy boundary:

- `packages/mcp/src/index.ts`
- `packages/mcp/src/session-router.ts`
- `packages/mcp/src/server.ts`
- `packages/mcp/src/server-shared.ts`
- `packages/mcp/src/host-factories.ts`
- `packages/mcp/src/server-control.ts`
- `packages/mcp/src/server-table-events.ts`
- `packages/mcp/src/server-runtime.ts`
- `packages/mcp/src/server-battle-attack-runtime.ts`
- `packages/mcp/src/server-action-decode.ts`
- `packages/mcp/src/character-session.ts`
- `packages/mcp/src/character-session-helpers.ts`
- `packages/mcp/src/start-battle.ts`
- `packages/mcp/src/server.test.ts`
- `packages/mcp/src/harness.ts`
- `packages/mcp/src/probe-short-rest.ts`

Files that must remain on the Surface runtime path:

- `packages/mcp/src/green/battle-creature-init.ts`
- `packages/mcp/src/green/battle-fill-input.ts`
- `packages/mcp/src/green/battle-tool-input.ts`
- `packages/mcp/src/green/battle-tools.ts`
- `packages/mcp/src/green/character-tool-input.ts`
- `packages/mcp/src/green/character-tools.ts`
- `packages/mcp/src/green/composition-root.ts`
- `packages/mcp/src/green/index.ts`
- `packages/mcp/src/green/session-store.ts`
- `packages/mcp/src/green/index.test.ts`

CAM19B tests and checks:

- Keep `packages/mcp/src/green/index.test.ts` passing.
- Move or mark `packages/mcp/src/server.test.ts` as legacy-only with the
  legacy files; do not require it for the promoted MCP gate.
- Move `packages/mcp/src/harness.ts` and
  `packages/mcp/src/probe-short-rest.ts` with the legacy files or delete them.
  They call the old `get_state`/`get_available_actions`/`execute_action`
  surface and are not promoted-compatible unless rewritten against
  `packages/mcp/src/green/`.
- Run the promoted source/QNT Core import check:
  `rg '@dnd/core' packages/mcp/src/green packages/character-creation-runtime/src packages/battle-runtime/src packages/character-creation-runtime/character-creation-runtime-slice.qnt packages/battle-runtime/battle-runtime-slice.qnt`.
- A broader `rg '@dnd/core' packages/mcp/src/green packages/character-creation-runtime packages/battle-runtime`
  may still report expected README documentation mentions; do not use it as the
  zero-match gate unless docs are excluded.
- Run `rg '@dnd/core' packages/mcp/src packages/character-creation-runtime packages/battle-runtime` and classify any remaining MCP matches as legacy-only.
- Update `packages/mcp/README.md` if the legacy boundary path or package name
  differs from this checklist.

### CAM19C: delete projected vocabulary from the promoted path

Projected MCP call sites to delete from the promoted path or leave reachable
only from the deletion-marked legacy boundary:

- `packages/mcp/src/server-runtime.ts` import of
  `@dnd/core/projected-action-bridge-prepared-spell.ts`.
- `packages/mcp/src/server.ts` branch on `projectedPreparedSpell`.
- Acid Splash `projectedPreparedSpell` tests in
  `packages/mcp/src/server.test.ts`.

Projected Core files to delete once no promoted or legacy-retained code imports
them:

- `packages/core/src/projected-executable.ts`
- `packages/core/src/projected-compiler.ts`
- `packages/core/src/projected-mechanic-interpreter.ts`
- `packages/core/src/projected-mechanic-interpreter-types.ts`
- `packages/core/src/projected-mechanic-interpreter-helpers.ts`
- `packages/core/src/projected-action-bridge.ts`
- `packages/core/src/projected-action-bridge-prepared-spell.ts`
- `packages/core/src/projected-action-bridge-helpers.ts`
- `packages/core/src/projected-action-context.ts`
- `packages/core/src/projected-creature-action-reducer.ts`
- `packages/core/src/projected-battle-action-reducer.ts`
- `packages/core/src/projected-persistent.ts`
- `packages/core/src/projected-compiler.test.ts`
- `packages/core/src/projected-executable.test.ts`
- `packages/core/src/projected-mechanic-interpreter.test.ts`
- `packages/core/src/projected-persistent.test.ts`
- `projected-executable.qnt`

CAM19C checks:

- Run `rg 'CPU|PEA|PPR|projected-executable|projected-compiler|projected-action-bridge|projected-persistent' packages/mcp packages/character-creation-runtime packages/battle-runtime`.
- Treat `PHASE1_WEAPON_SPEAR_UNIT_ID` as a documented false positive unless
  the check is tightened to projected tag boundaries.
- Verify Second Wind remains as a level-1 Fighter sheet/resource fact and is
  not restored through `PEADirectHealHp`.
- Confirm Acid Splash, Action Surge, and Mage Armor remain ledgered omissions,
  not renamed projected IR.

### CAM19D: reconcile docs and tests after deletion

Docs to reconcile:

- `plans/CORRECTION_APPLICATION_MIGRATION_PLAN.md`
- `plans/phase0-core-deletion-restore-audit.md`
- `packages/mcp/README.md`
- `packages/character-creation-runtime/README.md`
- `packages/battle-runtime/README.md`
- Any remaining `plans/EXECUTABLE_PROJECTION_*` document that still describes
  projected executable/Core-backed MCP as active architecture.

Test ownership to reconcile:

- The MCP promoted-path test should cover create/finalize character, select
  Goblin Warrior, start battle, Fighter Attack with damage, End Turn, Goblin
  Attack with damage, battle closeout, and post-battle character HP handoff.
- Legacy `server.test.ts` assertions for Core action tokens, Core character
  sessions, `projectedPreparedSpell`, monster controls, and old runtime input
  decoders should be deleted with the legacy path or documented as legacy-only.
- Runtime package tests remain the verification surface for the Surface-backed
  character and battle reducers.

CAM19D checks:

- Run the promoted-path Core import check:
  `rg '@dnd/core' packages/mcp/src/green packages/character-creation-runtime/src packages/battle-runtime/src packages/character-creation-runtime/character-creation-runtime-slice.qnt packages/battle-runtime/battle-runtime-slice.qnt`.
- If CAM19D also runs the broader package check
  `rg '@dnd/core' packages/mcp/src/green packages/character-creation-runtime packages/battle-runtime`,
  classify README matches as expected documentation noise unless the docs now
  claim an active Core dependency.
- Run the projected vocabulary check:
  `rg 'CPU|PEA|PPR|projected-executable|projected-compiler|projected-action-bridge|projected-persistent' packages/mcp packages/character-creation-runtime packages/battle-runtime`.
- Record any remaining expected failure against a Restore Ledger row before
  unblocking CAM20.

## Expected Breakage List

Each expected break maps to a Restore Ledger row above. Anything not mapped here
should be treated as an unexpected blocker.

- MCP `get_available_actions`, `preview_action`, `execute_action`,
  `execute_control_command`, `record_table_event`, old `start_battle`, and old
  stored character tools may fail while the Core host is disconnected.
- MCP tests in `packages/mcp/src/server.test.ts` that use Core actors, old
  action tokens, projected prepared spell runtime inputs, monster control state,
  or Core character draft/sheet payloads may fail.
- Core projected tests may be deleted or marked legacy-only:
  `projected-compiler.test.ts`, `projected-executable.test.ts`,
  `projected-mechanic-interpreter.test.ts`, `projected-persistent.test.ts`.
- Core old action-discovery tests in `available-actions.test.ts` may fail where
  they assert projected prepared spells, Second Wind, Action Surge, monster
  commands, or old token shapes.
- Old Core battle MBT may be excluded from the green gate during controlled
  breakage, but the green battle runtime must get its own QNT/MBT check.
- App routes may fail: `/` single-creature simulator, character creation,
  battle scene, embedded battle scene, machine visualizers, and trace visualizer.
- Docs likely stale during breakage: `README.md`, `ARCHITECTURE.md`,
  `DESIGN_EXECUTABLE_PROJECTION_TRACER_BULLET.md`,
  `plans/EXECUTABLE_PROJECTION_*`, `packages/surface-runtime-correction/MBT_TO_REDUCER_GRAPH.md`.

## Restore Ledger Additions

Add or retain these rows in the migration Restore Ledger before deleting old
| Omitted lane | Baseline references | Disabled/expected-failing checks | Green replacement check | Preserve conceptually | Safe to omit now because | Restore condition |
| --- | --- | --- | --- | --- | --- | --- |
| Core-backed MCP action-token host | `git show 39f9ab71:packages/mcp/src/server.ts`; `git show 39f9ab71:packages/mcp/src/server-shared.ts`; `git show 39f9ab71:packages/mcp/src/host-factories.ts` | Old MCP action-token tests | MCP green vertical fixture | Stored session ergonomics; discover/preview/execute workflow shape | Green tools need a Core-free runtime path | Tools are rebuilt over new runtime APIs or intentionally retired |
| Projected prepared spell / Acid Splash lane | `git show 39f9ab71:packages/core/src/projected-action-bridge-prepared-spell.ts`; `git show 39f9ab71:packages/mcp/src/server-runtime.ts`; RAW: `.references/srd-5.2.1/Spells/Descriptions-A-D.md:20`, `:29` | Acid Splash projected runtime tests | None in phase 1-3 | Save-gate + damage spell pressure; explicit runtime facts | First green vertical is Fighter Attack action plus runtime end-turn command | Surface UnitRecord-backed spell act holes exist |
| Second Wind battle action lane | `git show 39f9ab71:packages/core/src/projected-creature-action-reducer.ts`; `git show 39f9ab71:packages/core/src/projected-action-context.ts`; RAW: `.references/srd-5.2.1/Classes/Fighter.md:31`, `:62`; manifest: `plans/phase1-fighter-manifest.md:26` | Feature projected action tests | Character finalization fixture preserves Second Wind as a level-1 sheet/resource fact; no first-slice battle act check | Class feature action and resource pressure | First green battle slice does not exercise the Bonus Action healing act | Runtime supports Surface UnitRecord-backed Second Wind battle action holes |
| Action Surge projected lane | `git show 39f9ab71:packages/core/src/projected-battle-action-reducer.ts`; `git show 39f9ab71:packages/core/src/projected-action-context.ts` | Feature projected action tests | None in first green level-1 Fighter | Class feature extra-action pressure | First green Fighter is level 1 | Runtime supports Surface UnitRecord-backed class feature action holes |
| Mage Armor projected persistent lane | `git show 39f9ab71:packages/core/src/projected-persistent.ts`; `git show 39f9ab71:packages/core/src/battle-init-creature-config.ts`; `git show 39f9ab71:packages/core/src/character-sheet-derived.ts`; RAW: `.references/srd-5.2.1/Spells/Descriptions-M-P.md:5`, `:14` | Persistent projection tests; AC override tests | None in first green vertical | Base AC override plus early-end lifecycle | First green vertical does not include Mage Armor | Runtime supports Surface UnitRecord-backed persistent effects/lifecycle |
| App character creation UI | `git show 39f9ab71:packages/app/src/components/character-creation/CharacterCreationPage.tsx`; `git show 39f9ab71:packages/app/src/components/character-creation/OpenChoicePicker.tsx`; `git show 39f9ab71:packages/app/src/components/character-creation/characterCreationPresets.ts` | App character creation tests/build | MCP Fighter creation fixture | Step UI and open-choice display workflow | MCP green surface is priority | App consumes new character runtime |
| App battle scene and trace visualizers | `git show 39f9ab71:packages/app/src/battle-scene/BattlePage.tsx`; `git show 39f9ab71:packages/app/src/components/trace-visualizer/TraceVisualizer.tsx`; `git show 39f9ab71:packages/core/src/battle-scene/director.ts` | App battle/trace routes | MCP green fixture | Visual replay, narration, layout, dice cues | Runtime can be validated without full UI | Runtime exposes stable snapshots/traces |

## Questions For Owner

1. Which old MCP tools remain available during the break?

   Recommended answer: none on the green path. Keep old tools only behind an
   explicit legacy entrypoint if needed for local inspection, and do not require
   them in the green gate.

2. Which app surfaces are allowed to fail?

   Recommended answer: all app surfaces are allowed to fail during the Core
   break, provided each one maps to a Restore Ledger row. The MCP green fixture
   is the product-facing validation surface for the migration.

3. Which Core tests are deleted, skipped, or moved to legacy-only?

   Recommended answer: delete or mark legacy-only projected vocabulary tests
   once green runtime coverage exists; exclude old Core battle MBT from the
   green gate during controlled breakage; require new character-creation and
   battle-runtime QNT/MBT checks before declaring the green vertical safe.

4. Does any old Core type need to move into Surface or runtime before Core can
   break?

   Recommended answer: yes, but only domain facts needed by the first green
   vertical: ability/damage scalar vocabularies if not already shared,
   player-character draft types, finalized Character Sheet runtime types,
   battle-ready combat input types, and the SRD Stat Block boundary. Do not move
   `DndContext`, old `ActionToken`, `CPU*`, `PEA*`, or `PPR*`.

5. What is the first commit boundary where `CPU*`/`PEA*`/`PPR*` can disappear?

   Recommended answer: the first commit after the MCP green vertical fixture
   passes and every omitted projected lane has a Restore Ledger row with
   `39f9ab71` references. Before that, isolate the legacy path; at that
   boundary, delete the projected modules instead of wrapping them.
