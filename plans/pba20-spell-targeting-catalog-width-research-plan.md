# PBA20 Research Plan - Spell Targeting And Catalog Width

Task: PBA20 - Restore Spell Targeting And Catalog Width

Status: pre-researched. This file is planning evidence and implementation guidance only.

## Research Inputs

- RAW lens: spellcasting rules, targeting, spell slots, Magic Missile, Shield, and candidate spell pressure cases.
- Ubiquitous-language lens: Spell Definition, Spell Access, Spell Invocation, Spell Effect, Spell Slot, Concentration, and target allocation.
- Architecture lens: spell support profiles, Surface spell records, battle-runtime spell replay, MCP spell holes, and PBA7/PBA8/PBA9.

## RAW Anchors

- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`: spell definitions, spell slots, higher-level slots, casting time, range, targets, clear path, invalid targets.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md`: Magic Missile, Misty Step, Mass Healing Word.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md`: Shield, Scorching Ray, Shield of Faith.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`: Acid Splash, Bless, Chain Lightning, Counterspell.

## Ubiquitous Language Findings

- `preparedSlotSpell` is too broad for its current semantics. It currently means level-1 action-time repeated direct damage spell with slot spend.
- Magic Missile targeting is a Spell Invocation fact. The authored Spell Definition already preserves repeatable target selection.
- `allRepeatedEffectsAtOneTarget` is a current restriction, not the domain model.
- A generic single `targetChoice` fill cannot express three darts distributed across multiple creatures.
- Spell Definition, Spell Access, Spell Invocation, and Spell Effect should remain separate in naming and runtime state.

## Architecture Findings

- Relevant files:
  - `packages/battle-runtime/src/index.ts`
  - `packages/battle-runtime/battle-runtime.qnt`
  - `packages/surface/content/magic_missile.json`
  - `packages/surface/content/magic_missile.dhall`
  - `packages/surface/src/surface/schema-spell.ts`
  - `packages/surface/src/surface/unit-catalog.ts`
  - `packages/mcp/src/battle-tool-input.ts`
  - `packages/mcp/src/content-tools.ts`
- Surface Magic Missile already encodes `choose_up_to`, `repeatsAllowed`, independent per-dart application, and linear count scaling by slot level.
- Runtime currently narrows to `allRepeatedEffectsAtOneTarget`, fixes slot level at 1, and multiplies one damage hole by repeated effect count.
- MCP passes generic `BattleFill`; no split-target allocation fill exists.
- The Surface catalog already includes more SRD spells than battle runtime admits.

## Suggested Implementation Shape

- A profile rename/widening could separate current behavior from the broader family, for example a direct repeated-damage spell profile with typed target allocation.
- A runtime Spell Invocation allocation could carry selected slot level plus a multiset of `{ targetId, count }` entries.
- Spell target allocation must carry table-provided spell targetability facts for
  the selected spell shape, such as range/source/origin validity, clear path, and
  Total Cover legality. These are not target distances and are not attack
  normal/long range bands.
- Total dart count should derive from selected slot level and Surface target selection count, not from a hardcoded Magic Missile branch.
- Damage replay could keep one rolled damage protocol for simultaneous darts while applying per-target totals from allocation counts.
- Per-target consequences should derive from actual damaged targets: Shield, resistance/immunity, concentration saves, zero-HP effects, and after-damage reactions.
- Catalog width should remain table-driven where a spell parses into existing profiles. Unsupported spell shapes should pressure named reusable profile families before becoming selectable.
- SRD provenance should stay in the Surface SRD collection; structured import data should not become provenance.

## Suggested Pressure Cases

- Magic Missile split-target allocation and level-2 dart count.
- Shield as a reaction to Magic Missile, likely deferred to PBA21 if reaction machinery is required.
- Scorching Ray as multi-target spell attack pressure.
- Bless as multi-target concentration support pressure.
- Chain Lightning as typed primary/secondary target selection, probably later
  than Magic Missile because of no-duplicate constraints and table-supplied
  secondary-target eligibility/allocation facts. Do not model it as flat AoE
  membership or a generic `{ targetId, count }` allocation.

## Verification Suggestions

- Surface/profile tests for Magic Missile allocation shape.
- Battle-runtime tests for split targets, level-2 slot dart count, per-target damage, and affected target consequences.
- MCP fill/replay coverage for allocation holes.
- Typecheck and `pnpm check:authored-id-dispatch`.
- Promoted QNT/MBT only if reusable spell procedure behavior widens.
- `/simplify` convergence remains required.
