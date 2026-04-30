# @dnd/core Architecture

Core owns the legacy XState-based combat and creature runtime path. The
repository is currently growing Surface-backed reducer packages beside it; this
document records Core-specific projection rules that should not dominate the
top-level architecture guide.

## Battle Projection Contract

The battle projection contract has four layers:

- `battle.qnt:Combatant` is the semantic contract for battle-owned combat facts.
- `packages/core/src/battle-machine-types.ts:BattleCreatureState` is the runtime mirror of that contract.
- `packages/core/src/battle-machine-types.ts:InitCreatureConfig` is the promotion input contract.
- `packages/core/src/battle-machine-actions-turn.ts:buildCreatureState` is the authoritative `InitCreatureConfig -> BattleCreatureState` projector.

The battle engine keeps a flat `Map<CreatureId, BattleCreatureState>` rather
than embedding creature child actors because combat resolution needs atomic
cross-creature updates, reaction windows and turn advancement are battle-level
phases, and MBT parity is direct because `battle.qnt` already models battle
state as `CreatureId -> Combatant`.

Ownership rule:

- If battle resolves a rule and the rule needs a persistent combat fact, that fact belongs on `Combatant` / `BattleCreatureState`.
- Source owners compile their durable facts into `InitCreatureConfig`; once projected, battle owns the combatant copy.
- Do not project whole source objects when battle only needs a stable derived fact, but do not leave battle dependent on caller-only state for battle-owned semantics.

Battle-owned projected facts fall into these categories:

- mutable combat state: vitals, conditions, grapple links, active effects, turn economy, spell-slot state, concentration, and monster per-encounter resources;
- durable combatant facts battle rules read directly: creature kind, size, base AC, side, position, walk speed, projected weapon profiles, hand occupancy, resistances/vulnerabilities/immunities, and reaction/bonus-action option payloads;
- projected class and modifier facts needed by battle-resolved rules: tracked class levels, `dexMod`, save bonuses, crit range, sneak-attack dice, melee damage bonus, parry bonus, and similar rule inputs already read from combatant state.

The authoritative field list is the code itself: `battle.qnt:Combatant` plus
`BattleCreatureState`. This section defines the ownership methodology, not a
duplicate registry.

Caller/session-owned facts remain outside the battle projection when they are
transient runtime qualifiers or external adjudication:

- spatial and geometry facts such as cover, distance, adjacency, threatened sets, line of sight, and pathing;
- DM or table adjudication facts such as initiative tie ordering and whether a ready trigger actually occurred;
- session routing metadata such as encounter drafts, active host selection, and character-list references;
- full creature-sheet structures that battle does not read directly.

Projection methodology for a new battle-owned field:

1. Add the field to `battle.qnt:Combatant` if the rule changes battle semantics.
2. Mirror it in `BattleCreatureState`.
3. Mirror it in `InitCreatureConfig`.
4. Thread it through `buildCreatureState`.
5. Set fresh defaults in `packages/core/src/battle-machine-creature.ts` (`freshCreature` / `freshCaster`).
6. Update MBT normalization in `packages/core/src/battle-projection.mbt.test.ts`.
7. Update every source-specific compiler that produces `InitCreatureConfig`, including raw `BATTLE_INIT` / `BATTLE_ADD_CREATURE` adapter paths, `monsterCatalogInitCreatureConfig` / `statBlockToInitCreatureConfig`, and any PC or session-owned start-battle projector.
8. Verify parity and task-scoped tests.
9. Update this section if the new field changes the documented ownership categories.

Source-specific compilers should stay separate from battle-state construction.
The intended shape is:

```text
source owner -> named InitCreatureConfig projector -> buildCreatureState
```

Battle participation rule:

- battle lifecycle commands control participation in a battle, not creature existence;
- creatures are authored outside battle and then projected into battle state;
- `BATTLE_INIT` is the initial batch add of already-authored creatures into a new battle;
- `BATTLE_ADD_CREATURE` is the same projection operation later in the battle lifecycle;
- the same model also permits removing creatures from an ongoing battle when the caller/session semantics require it.

Some caller/session paths still assemble `BATTLE_INIT` creature objects inline.
That is workable for narrow fixtures, but new projected fields should move
toward named source-owner projectors instead of expanding inline construction.

Current `dexMod` / `strMod` note:

- `dexMod` is battle-owned today because current battle semantics read it directly for Monk Deflect Attacks / Deflect Energy math.
- `strMod` is not currently a battle-owned field because current battle semantics do not read it from combatant state.
- That split is acceptable only while no battle-owned rule needs Strength-backed combat facts. It is not a permanent boundary. If battle starts resolving unarmed-strike, grapple, shove, or other Strength-based combat semantics from combatant state, the minimal canonical Strength-backed fact must be promoted through the same projection surface rather than fetched from caller-only state.

## Quint/TS Frontier

The frontier between what lives in Quint and what lives in TypeScript is not
"generic vs specific." It is whether a feature affects runtime correctness over
state transitions.

Flow features belong in Quint when they create new battle phases, interrupt
chains, or state-machine transitions. Examples include reaction facilities,
spell-stack resolution, attack interruption, and multi-creature orchestration.
The named SRD feature can be specific, but it should plug into a common battle
facility when one exists.

Modifier features can be split: Quint owns the generic mechanic shape that a
pipeline reads, while TypeScript computes the concrete SRD-derived value. For
example, Quint can prove that a save-bonus pipeline is correct for arbitrary
inputs while TypeScript proves that a particular class feature contributes a
specific value.

Pure content remains TypeScript or Surface-authored data. Weapon rows, spell
damage expressions, armor entries, and individual Stat Blocks should not move
into Quint unless their behavior changes state-transition correctness.

Promotion rule:

- start specific content/features in TypeScript or Surface;
- promote only the reusable runtime mechanic into Quint when state-transition
  interactions need parity or invariant coverage;
- keep source-content facts and battle-owned runtime facts separated by explicit
  projection boundaries.

Abstract Quint ranges intentionally stress mechanics beyond ordinary content
examples. Future generator/contract/spec work could replace broad abstract
ranges with SRD-realistic generated parameter combinations while preserving
invariant coverage.
