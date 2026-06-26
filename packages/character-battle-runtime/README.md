# @dnd/character-battle-runtime

Composition package for Character Sheet and battle-runtime integration.

This package owns Character Sheet to battle creature initialization and battle
handoff settlement back onto an existing Character Sheet. `@dnd/battle-runtime`
must not import Character Sheet types directly.

Character Sheet inputs to this package are stored sheet state: mutable play
state and selected identities. Battle initialization and settlement may observe
capacity-rich snapshots, but Hit Point Maximum, Hit Dice capacity, ordinary
Spell Slot capacity, Pact Slot level/count, and class-feature resource capacity
must be derived from Character Build and Unit facts or checked against those
projections before any sheet state is written.

Owned boundary functions:

- `characterSheetBattleInit` projects an existing Character Sheet plus caller
  battle facts into battle-runtime creature initialization.
- `battleCreatureInitFromCharacterBuild` accepts an `armorClassBaseChoice` when
  the build has multiple available class-feature AC formulas; the choice is
  forwarded to Character Sheet AC projection before battle state is created.
- `characterSpellcasting` projects selected Armor of Shadows invocation
  ownership into `armorOfShadowsMageArmor` Spell Access for battle-runtime,
  without adding Mage Armor to ordinary prepared-spell slot access.
- `battleCreatureInitFromCharacterBuild` projects selected Eldritch Mind
  invocation ownership into the `eldritchMind` battle invocation feature, which
  battle-runtime uses only for Concentration maintenance Saving Throws.
- `settleCharacterSheetFromBattle` settles battle-owned HP, Temporary Hit
  Points, non-Unconscious conditions, ordinary Spell Slot expenditure, pure Pact
  Slot expenditure, and supported feature-resource expenditure back onto the
  same Character Sheet identity, then settles retained companion outcome from
  the same Battle State. Mixed ordinary Spell Slot plus Pact Slot state is
  rejected until battle Spell Slots carry source-distinct slot identity.
- Character Sheet capacities are not stored by this package. Hit Point Maximum,
  Hit Dice capacity, ordinary Spell Slot capacity, Pact Slot level/count, and
  feature-resource capacity are derived from `CharacterBuild` and Surface Units;
  battle handoff writes only current HP, Temporary Hit Points, maximum
  reduction, conditions, spent Hit Dice, slot expenditures, resource
  expenditures, rest-use state, and companion state.

Battle handoff settlement has a fixed order:

1. Reject non-character combatants, character-identity mismatch, max-HP drift,
   over-maximum HP, active Wild Shape forms, active battle effects,
   Concentration, and active ongoing feature occurrences before writing sheet
   state.
2. Derive zero-HP lifecycle and Knock Out state from the combatant.
3. Derive battle-owned resource, ordinary Spell Slot, and pure Pact Slot deltas,
   rejecting slot-capacity drift, lower-than-sheet expenditure,
   over-expenditure, mixed ordinary-plus-Pact slot pools, and source-ambiguous
   ordinary-vs-created Spell Slot spends.
4. Recreate the Character Sheet from durable sheet/build facts plus battle-owned
   HP, Temporary Hit Points, non-Unconscious conditions, and resource
   expenditures.
5. Replace Spell Slot source state only after the fresh sheet parse succeeds, so
   ordinary and created Spell Slot accounting stays a Character Sheet concern.
6. Settle retained companion state from `BattleState.companions`; battle-only
   companions remain battle-local and leave the Character Sheet unchanged.

Runtime encounter state such as combatant ids, initiative, turns, reactions,
active effects, and battle-local resources is not written to `CharacterBuild`;
settlement preserves the durable build output and writes only Character Sheet
play-state fields.

MCP and app code should call this package instead of owning parallel
Character Sheet/battle projection logic.

Rules-kernel coverage for battle/sheet composition semantics is tracked in
`plans/rules-kernel-coverage/`. New handoff or battle-initialization reducer
behavior should add or extend a semantic obligation and connect QNT ownership to
production TS through MBT or deterministic QNT replay.
