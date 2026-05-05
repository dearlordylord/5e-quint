# PBA18 Research Plan - Attack Range And Conditional Attack Riders

Task: PBA18 - Widen Attack Range And Conditional Attack Riders

Status: pre-researched. This file is planning evidence and implementation guidance only.

## Research Inputs

- RAW lens: attack range, long-range Disadvantage, Advantage/Disadvantage cancellation, Critical Hits, Sneak Attack rider pressure.
- Ubiquitous-language lens: Attack Roll, Range, Critical Hit, and rider naming.
- Architecture lens: battle-runtime attack support profiles, Surface attack readers, MCP target holes, and PBA14B/PBA14D reaction windows.

## RAW Anchors

- `.references/srd-5.2.1/Playing-the-Game.md`: Making an Attack, Range, Advantage/Disadvantage, natural 1/20, Critical Hits.
- `.references/srd-5.2.1/Equipment.md`: Weapon Range property.
- `.references/srd-5.2.1/Classes/Rogue.md`: Sneak Attack eligibility.
- `UBIQUITOUS_LANGUAGE.md`: Attack Roll, Critical Hit, Attack Damage Rider.

## Ubiquitous Language Findings

- Current `rangedRange` runtime language effectively means normal range, not full ranged attack range.
- Surface already preserves `normal` and `long`, while runtime projection drops `long`. This creates a connascence risk because callers can see authored long range upstream.
- `AttackDamageRider` should stay tied to attack-roll hit or attack damage payloads. Conditional attack riders may need separate timing names such as Attack Roll Rider, Attack Damage Rider, Attack Hit Rider, and Attack Declared Rider.
- Critical Hit should remain a result of attack resolution, not a threshold label on a rider. Rider dice that are attack damage should continue to participate in central Critical Hit doubling.

## Architecture Findings

- Relevant files:
  - `packages/battle-runtime/src/index.ts`
  - `packages/surface/src/surface/schema-base.ts`
  - `packages/surface/src/surface/schema-spell.ts`
  - `packages/surface/src/surface/schema-nonspell.ts`
  - `packages/surface/content/stat_block_goblin_warrior.json`
  - `packages/mcp/src/battle-tool-output.ts`
  - `packages/mcp/src/content-tools.ts`
  - `packages/battle-runtime/src/index.test.ts`
  - `packages/mcp/src/server.test.ts`
- `SupportedCreatureNamedAttackRoll` retains `rangeFeet.normal` and `rangeFeet.long`, but `AttackTargetConstraint` currently keeps only `normalFeet`.
- `requiredAttackRollMode` currently does not include range-derived Disadvantage.
- Stat Block conditional bonus damage is currently a narrow advantage-only effect and should not become a tuple-position convention.

## Suggested Implementation Shape

- `AttackTargetConstraint` could widen from `{ kind: "rangedRange"; normalFeet }` to `{ kind: "rangedRange"; normalFeet; longFeet }`.
- Target legality should consume a table-supplied range band for the selected
  target and attack:
  - normal range: legal, no range Disadvantage;
  - long range: legal, range Disadvantage;
  - out of range: illegal.
- Range-derived Disadvantage could flow through the same roll-mode aggregation path as hidden, Dodge, grapple, and ongoing features so RAW cancellation remains centralized.
- Surface attack readers should remain the source for normal/long range metadata.
  The table supplies the selected target's range band; MCP should not copy
  authored range facts, accept target distances, or infer geometry into session
  state.
- Conditional Stat Block riders could parse from existing attack `onHit` / `EffectAtom` data into damage components derived from the resolved attack context.
- Unit feature riders and Stat Block on-hit effects should stay separate provenance/profile domains, though they may share lower-level damage component helpers.

## Connascence Checks

- Target legality and attack-roll mode must change together because long range is both legal targeting and Disadvantage.
- Damage hole IDs encode the resulting expression. New conditional rider inclusion can change MCP fill examples.
- Reaction windows from PBA14D inspect attack-hit and attack-damage paths; new rider timing should preserve those windows rather than bypassing them.

## Verification Suggestions

- Battle-runtime tests:
  - normal-range target appears and rolls normally;
  - long-range target appears and requires Disadvantage;
  - beyond-long target is rejected;
  - existing Disadvantage/Advantage sources cancel correctly;
  - conditional rider applies only under its resolved context;
  - Critical Hit doubles conditional attack damage dice consistently.
- MCP tests:
  - long-range targets appear as normal runtime target choices;
  - follow-up attack-roll hole reports Disadvantage;
  - MCP input carries table-provided range-band facts, not normal/long authored
    range metadata or target distances.
- Regression tests:
  - Sneak Attack still uses Unit support profiles;
  - Cutting Words/Uncanny Dodge still see attack-hit and damage windows.
- Promoted QNT/MBT only if reusable attack procedure behavior changes.
- `/simplify` convergence remains required.
