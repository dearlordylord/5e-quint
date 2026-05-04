# PBA19 Research Plan - Stat Block Multiattack And Bonus Actions

Task: PBA19 - Restore Stat Block Multiattack And Bonus Actions

Status: pre-researched. This file is planning evidence and implementation guidance only.

## Research Inputs

- RAW lens: Monsters overview for stat block actions, Multiattack, Bonus Actions, Legendary Actions, Recharge, and Limited Use.
- Ubiquitous-language lens: Stat Block, Multiattack, Action, Bonus Action, monster/NPC terms.
- Architecture lens: Surface Stat Block schema/readers, battle-runtime monster support profiles, PBA11 resources, and MCP.

## RAW Anchors

- `.references/srd-5.2.1/Monsters/Overview.md`: stat block sections, monster Actions, Multiattack, Bonus Actions, Legendary Actions, Limited Usage, Recharge.
- `.references/srd-5.2.1/Playing-the-Game.md`: Bonus Action rules.
- `.references/srd-5.2.1/Rules-Glossary.md`: Stat Block section vocabulary and Bonus Action.

## Ubiquitous Language Findings

- Stat Block is authored monster/NPC rules content, not the shared PC/monster abstraction.
- Multiattack is not extra action economy. It is an Actions-section entry that defines what the monster's single Attack action consists of.
- Monster Bonus Actions are sectioned Stat Block parts and should use Bonus Action economy.
- Goblin Warrior already authors Nimble Escape in `bonusActions.actionOptions`; the content exists and does not need new provenance.

## Architecture Findings

- Relevant files:
  - `packages/surface/src/surface/schema-spell.ts`
  - `packages/surface/src/surface/stat-block-catalog.ts`
  - `packages/surface/src/interpreter/tracer.ts`
  - `packages/battle-runtime/src/index.ts`
  - `packages/shared-algebras/src/action-economy-algebra.ts`
  - `packages/mcp/src/content-tools.ts`
  - `packages/mcp/src/battle-state-projection.ts`
- Surface already has `CreatureActions`, `multiattacks`, `bonusActions`, `limitedUse`, and `actionOptions`.
- Runtime currently reads supported Stat Block attacks from `actions` and `legendaryActions`, not `bonusActions`, and rejects `multiattackCount`.
- PBA11 resource scanning already includes `bonusActions`, `reactions`, and `legendaryActions`.
- MCP `list_stat_blocks` currently exposes ordinary action attacks, not Multiattack or Bonus Actions.

## Suggested Implementation Shape

- A first Multiattack support profile could admit only `CreatureNamedMultiattack` dispatches to supported attack parts from the `actions` section with literal positive counts.
- Multiattack could become a distinct Attack-action subject instead of expanding into independent action subjects during discovery.
- Replay could use dispatch-indexed holes carrying dispatch index plus attack part identity so duplicate names or reordered dispatches cannot corrupt fills.
- `multiattackCount` on individual attacks/saves/supports should not become a second runtime execution model if `CreatureNamedMultiattack.dispatches` is the canonical domain shape.
- Stat Block Bonus Actions could use a subject carrying `{ section: "bonusActions", name }`, not the existing character `bonusAction.hide` shape.
- Goblin Warrior Nimble Escape could admit a narrow "standard action option as Bonus Action" profile delegating to existing Disengage or Hide procedures and spending `currentHasBonusAction`.
- Resource spending can reuse PBA11 helpers such as `statBlockPartLimitedUseAvailable`, `spendStatBlockPartResources`, recharge holes, and `StatBlockPartKey` snapshots.
- MCP should project runtime-discovered acts; authored summaries in `list_stat_blocks` can show Multiattack and Bonus Actions without becoming executable registries.

## Invalid-State Risks

- `CreatureNamedMultiattackSchema` dispatches by raw name only and can reference missing, duplicate, ambiguous, or unsupported parts unless support parsing narrows it.
- `CreatureNamedActionOptionSchema` relies on section placement for action cost. Readers should carry `StatBlockPartSection` through support parsing.
- Reusing `bonusAction.hide` for Goblin Nimble Escape would conflate Rogue Cunning Action and Stat Block Nimble Escape.

## Verification Suggestions

- Surface contract tests for invalid Multiattack dispatches.
- Battle-runtime tests for:
  - a synthetic two-attack Multiattack;
  - Goblin Warrior Nimble Escape as Bonus Action Hide/Disengage;
  - resource spending and Recharge/Limited Use interactions.
- MCP workflow test for discovery/fill/resolve of a supported Multiattack or Stat Block Bonus Action.
- Promoted QNT/MBT only for new reusable procedure behavior, not catalog width.
- `/simplify` convergence remains required.
