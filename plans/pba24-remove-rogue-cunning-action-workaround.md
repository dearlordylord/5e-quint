# PBA24 Research Plan - Remove Rogue Cunning Action Workaround

Task: PBA24 - Remove Rogue Cunning Action Support Workaround

Status: draft research plan.

## Purpose

Remove the MCP composition workaround that grants a battle support profile from
`unit.kind === "class" && unit.className === "rogue" && entry.level >= 2`.
That branch stands in for missing Surface-authored Rogue Cunning Action feature
Units. It should become ordinary Unit-selected support-profile flow after PBA25
has supplied the generic feature-grant and retained-Unit path.

## Research Scope

- Inspect `packages/mcp/src/battle-support-profiles.ts` and the battle-runtime
  support-profile family for Bonus Action Hide.
- Determine whether `class_rogue` and `rogue_cunning_action` or equivalent
  Surface content exists. Current evidence says neither is shipped.
- Consume the PBA25-owned retained feature-Unit path. If that path is still
  missing or cannot retain Cunning Action by advancement, stop and fix PBA25
  rather than reintroducing a Rogue-specific grant workaround here.
- Ensure support selection parses Unit mechanics shape, not class names, Unit
  ids, or feature names.
- Update MCP tests that currently rely on class-level support inference.
- Replace tests that attach the support profile to a fake class Unit with tests
  that require a real retained Cunning Action Unit.

## Expected Implementation Direction

- Surface owns the Rogue Cunning Action feature Unit and its mechanics shape.
  Cunning Action is not a use-count resource; it permits Dash, Disengage, and
  Hide to use the turn's Bonus Action resource.
- Character creation already includes the granted Unit ref when a supported
  Rogue advancement reaches the relevant level through the generic PBA25 path.
- MCP no longer infers Bonus Action Hide support from class name/level.
- Battle support profiles are attached by parsing retained Unit refs.
- Prefer a reusable support profile such as `bonusActionStandardActions` or
  `alternateActionCost` carrying `dash | disengage | hide`, rather than a
  Rogue-specific reducer branch or a Hide-only string. If the first slice keeps
  Hide-only runtime behavior, it must document Dash/Disengage as remaining
  Cunning Action width.
- Do not add generic class-feature grant discovery or retained-Unit machinery in
  this task; PBA25 owns that shared character-creation behavior.

## Verification

- RAW/UL check for Rogue Cunning Action in `.references/srd-5.2.1/Classes/`.
- `pnpm --filter @dnd/surface typecheck`
- `pnpm --filter @dnd/surface test`
- `pnpm --filter @dnd/character-creation-runtime typecheck`
- `pnpm --filter @dnd/character-creation-runtime test`
- `pnpm --filter @dnd/battle-runtime typecheck`
- Focused battle-runtime tests for Bonus Action Hide support if support parsing
  changes.
- Package-local QNT tests if Bonus Action Dash/Disengage or reusable
  bonus-action standard-action behavior is added.
- `pnpm --filter @dnd/mcp typecheck`
- `pnpm --filter @dnd/mcp test`
- `pnpm check:authored-id-dispatch`
- No broad battle MBT unless the battle replay procedure changes.
- `/simplify` convergence, minimum two rounds.
