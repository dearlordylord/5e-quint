# 11. Modifier Algebra

## Idea

Represent modifier composition through a small algebra of channels rather than ad hoc booleans and one-off fields.

## Origin

The concept comes from **dnd_engine** (furlat/dnd_engine, Python), which implements a 4-channel `ModifiableValue` system:

```
                    ┌─────────────────────────────────────────┐
                    │           ModifiableValue               │
                    │         (e.g. AttackRoll, AC)           │
                    ├─────────────┬───────────────────────────┤
                    │   SELF      │        TO-TARGET          │
                    │ (my own     │  (projected onto whoever  │
                    │  modifiers) │   interacts with me)      │
              ┌─────┼─────────────┼───────────────────────────┤
              │     │             │                           │
   STATIC     │  self_static     │  to_target_static         │
   (always    │  e.g. proficiency│  e.g. Blinded → adv to    │
    active)   │  bonus, base AC  │  attackers against me     │
              │                  │                           │
              ├──────────────────┼───────────────────────────┤
              │                  │                           │
   CONTEXTUAL │  self_contextual │  to_target_contextual     │
   (depends   │  e.g. Charmed:   │  e.g. Pack Tactics:       │
    on state) │  can't attack    │  adv if ally adjacent     │
              │  charmer         │                           │
              └──────────────────┴───────────────────────────┘
```

Each channel holds typed modifiers: `NumericalModifier`, `AdvantageModifier`, `CriticalModifier`, `AutoHitModifier`, `ResistanceModifier`, `SizeModifier`, `DamageTypeModifier`.

Resolution: when entity A attacks entity B, `set_from_target()` merges B's `to_target_*` channels into A's resolution, then `normalized_score()` computes the final value.

### Competitor Comparison

| Project | Modifier approach | Type safety |
|---|---|---|
| **dnd_engine** (Python) | 4-channel algebra (self/target x static/contextual) | Typed modifier classes |
| **rpg-toolkit** (Go) | Staged chain modifiers on typed topics (AttackChain, DamageChain) | Type-safe topic enums |
| **opencombatengine** (C#) | StatType-indexed effect pipeline (~15 StatTypes) | Enum-based |
| **foundryvtt-dnd5e** (JS) | ActiveEffect key-path mutations (`system.attributes.ac.bonus`) | Untyped string paths |
| **avrae** (Python) | Passive effect descriptors folded over active effects | ~20 passive fields |

From `COMPARISON.md`: "dnd_engine's 4-channel system is the most architecturally ambitious modifier model. Our approach is simpler but more verifiable -- explicit fields checked by invariants beat composable modifiers that could silently stack."

## What We Use Instead

Explicit named fields on `Combatant` (battle.qnt) / `BattleCreatureState` (TS), each individually checked by Quint invariants:

```
  ┌─────────────────────────────────────────────────┐
  │  Combatant (battle.qnt)                          │
  │                                                  │
  │  hasEvasion: bool           Rogue 7 / Monk 7     │
  │  saveMiscBonus: int         Paladin Aura, etc.   │
  │  critRange: int             Champion Fighter      │
  │  recklessThisTurn: bool     Barbarian Reckless    │
  │  sneakAttackDice: int       Rogue level           │
  │  sneakAttackUsedThisTurn: bool                    │
  │  meleeDamageBonus: int      Rage damage           │
  │  combatantResistances: Set[DamageType]            │
  │  parryAcBonus: int          Battle Master Parry   │
  │  bardicInspirationCharges: int  Cutting Words     │
  │  ragingBlocksSpells: bool   Rage blocks casting   │
  │                                                  │
  │  (planned):                                      │
  │  hasDangerSense: bool       Barbarian 2           │
  │  isElusive: bool            Rogue 18              │
  │  conditionImmunities: Set[Condition]              │
  └─────────────────────────────────────────────────┘
```

TS features compute specific values, callers inject them via `InitCreatureConfig`:

```
  class-rogue.ts     → hasEvasion: true, sneakAttackDice: 3
  class-paladin.ts   → saveMiscBonus: +3 (Aura of Protection)
  class-fighter.ts   → critRange: 19 (Champion)
  class-barbarian.ts → meleeDamageBonus: 2, combatantResistances: {B,P,S}
```

| | dnd_engine algebra | Our explicit fields |
|---|---|---|
| Adding a new modifier | Register into a channel -- no new fields | Add a new field + defaults + pipeline read |
| Verifiability | Composition is implicit; hard to prove invariants | Each field individually invariant-checked |
| Silent stacking bugs | Possible (modifiers compose opaquely) | Impossible (fields are explicit, named, tested) |
| Scalability | Scales to hundreds of modifiers naturally | Gets verbose with many fields |
| Quint fit | Would need an open-ended modifier registry | Works directly with Quint typed records |

## Current Fit In This Repo

- `ARCHITECTURE.md` already anticipates generic modifier fields such as `saveMiscBonus`, `conditionImmunities`, and advantage gates.
- `packages/core/src/types.ts` and feature files already expose many repeated modifier patterns.
- 10 modifier fields currently implemented, 3 planned (see ARCHITECTURE.md "Deferred Design Work").

## Application To Our Code: PassiveModifiers Sub-Record

The important insight is not the exact competitor design. It is that modifier families should have a closed algebra. We adopt the **sub-record** approach: group modifier fields into a `PassiveModifiers` record, keep each field explicit and named, but eliminate the per-field boilerplate.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Combatant                                                          │
│                                                                     │
│  creature: CreatureState     (HP, conditions, exhaustion, ...)      │
│  turn: TurnState             (action/BA/reaction/movement economy)  │
│  slots: SpellSlotState       (spell slots, concentration)           │
│  kind, monsterResources, statBlock, grapple, ...                    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  mods: PassiveModifiers                                     │    │
│  │                                                             │    │
│  │  -- Save pipeline --                                        │    │
│  │  hasEvasion: bool           (Rogue 7, Monk 7)               │    │
│  │  saveMiscBonus: int         (Paladin Aura, Ring of Prot.)   │    │
│  │  hasDangerSense: bool       (Barbarian 2) <- planned        │    │
│  │                                                             │    │
│  │  -- Attack pipeline --                                      │    │
│  │  critRange: int             (default 20, Champion 19/18)    │    │
│  │  recklessThisTurn: bool     (Barbarian Reckless Attack)     │    │
│  │  isElusive: bool            (Rogue 18) <- planned           │    │
│  │                                                             │    │
│  │  -- Damage pipeline --                                      │    │
│  │  sneakAttackDice: int       (ceil(rogueLevel/2))            │    │
│  │  sneakAttackUsedThisTurn: bool                              │    │
│  │  meleeDamageBonus: int      (rage damage)                   │    │
│  │  combatantResistances: Set[DamageType]                      │    │
│  │                                                             │    │
│  │  -- Reaction pipeline --                                    │    │
│  │  parryAcBonus: int          (Battle Master Parry)           │    │
│  │  bardicInspirationCharges: int  (Lore Bard Cutting Words)   │    │
│  │                                                             │    │
│  │  -- Spell pipeline --                                       │    │
│  │  ragingBlocksSpells: bool   (rage blocks casting)           │    │
│  │                                                             │    │
│  │  -- Condition pipeline --                                   │    │
│  │  conditionImmunities: Set[Condition] <- planned             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  -- Class identity (stays flat, used to compute mods at init) --    │
│  rogueLevel, monkLevel, fighterLevel, barbarianLevel, bardLevel,    │
│  dexMod                                                             │
└─────────────────────────────────────────────────────────────────────┘
```

### Quint Changes

**Define the record type** (battle.qnt):

```quint
type PassiveModifiers = {
  hasEvasion: bool, saveMiscBonus: int, critRange: int,
  recklessThisTurn: bool, sneakAttackDice: int,
  sneakAttackUsedThisTurn: bool, meleeDamageBonus: int,
  combatantResistances: Set[DamageType], parryAcBonus: int,
  bardicInspirationCharges: int, ragingBlocksSpells: bool,
}

val FRESH_MODS: PassiveModifiers = {
  hasEvasion: false, saveMiscBonus: 0, critRange: 20,
  recklessThisTurn: false, sneakAttackDice: 0,
  sneakAttackUsedThisTurn: false, meleeDamageBonus: 0,
  combatantResistances: Set(), parryAcBonus: 0,
  bardicInspirationCharges: 0, ragingBlocksSpells: false,
}
```

**Constructors collapse** (x3: mkCombatant, mkCaster, mkMonster):

```quint
// BEFORE: 11 separate modifier field defaults per constructor
// AFTER:  mods: FRESH_MODS  (1 line replaces 11)
```

**Read sites** (28 sites, mechanical rename):

```quint
tgt.hasEvasion        ->  tgt.mods.hasEvasion
tgt.saveMiscBonus     ->  tgt.mods.saveMiscBonus
ac.critRange          ->  ac.mods.critRange
// etc. for all 11 fields
```

**Write sites** (9 sites, two-level `.with()`):

```quint
// BEFORE (bStartTurn):
.with("recklessThisTurn", false)
.with("sneakAttackUsedThisTurn", false)

// AFTER:
.with("mods", ac.mods
  .with("recklessThisTurn", false)
  .with("sneakAttackUsedThisTurn", false))

// BEFORE (bEnterRage):
.with("meleeDamageBonus", rageBonus)
.with("ragingBlocksSpells", true)
.with("combatantResistances", Set(Bludgeoning, Piercing, Slashing))

// AFTER:
.with("mods", ac.mods
  .with("meleeDamageBonus", rageBonus)
  .with("ragingBlocksSpells", true)
  .with("combatantResistances", Set(Bludgeoning, Piercing, Slashing)))
```

### TypeScript Changes

**Type definitions** (battle-machine-types.ts):

```typescript
export interface PassiveModifiers {
  readonly hasEvasion: boolean;
  readonly saveMiscBonus: number;
  readonly critRange: number;
  readonly recklessThisTurn: boolean;
  readonly sneakAttackDice: number;
  readonly sneakAttackUsedThisTurn: boolean;
  readonly meleeDamageBonus: number;
  readonly combatantResistances: ReadonlySet<DamageType>;
  readonly parryAcBonus: number;
  readonly bardicInspirationCharges: number;
  readonly ragingBlocksSpells: boolean;
}

export const FRESH_MODS: PassiveModifiers = { /* defaults */ };
```

**BattleCreatureState**: replace 11 flat fields with `readonly mods: PassiveModifiers`.

**InitCreatureConfig**: replace 11 optional fields with `readonly mods?: Partial<PassiveModifiers>`.

**battleInit() collapse** (battle-machine-actions-turn.ts):

```typescript
// BEFORE: 55 lines of ...(cfg.X != null ? { X: cfg.X } : {})
// AFTER:  1 line
creatures.set(cfg.id, {
  ...base,
  ...(cfg.mods != null ? { mods: { ...FRESH_MODS, ...cfg.mods } } : {}),
  // only ~6 non-modifier config fields remain as individual spreads
});
```

**Update helper** (battle-machine-helpers.ts):

```typescript
export function updateMods(
  c: BattleCreatureState,
  patch: Partial<PassiveModifiers>,
): BattleCreatureState {
  return { ...c, mods: { ...c.mods, ...patch } };
}
```

**Write sites use helper** (8 sites across 2 files):

```typescript
// BEFORE: { ...ac, recklessThisTurn: false, sneakAttackUsedThisTurn: false }
// AFTER:  updateMods(ac, { recklessThisTurn: false, sneakAttackUsedThisTurn: false })

// BEFORE: { ...ac, meleeDamageBonus: ..., ragingBlocksSpells: true, combatantResistances: ... }
// AFTER:  updateMods(ac, { meleeDamageBonus: ..., ragingBlocksSpells: true, combatantResistances: ... })
```

**Read sites** (~30 sites across 4 files, mechanical rename):

```typescript
tgt.hasEvasion  ->  tgt.mods.hasEvasion
// same pattern for all 11 fields
```

**MBT bridge** (battle-machine.mbt.test.ts): nest schema and mapping under `mods`.

### Phase 3: Resolver (Deferred)

A typed resolver becomes valuable when multiple features contribute to the **same** modifier target (e.g., Paladin Aura + Ring of Protection + Bless all feeding `saveMiscBonus`). Currently each target has exactly one source.

```
  Feature functions (pure)
  ┌──────────────────────────┐
  │ rogueModifiers(level):   │
  │   Grant("hasEvasion")    │
  │   Bonus("sneakAttack",3) │
  │                          │       ┌────────────────────┐
  │ paladinModifiers(level): │       │ resolveModifiers() │
  │   Bonus("saveMisc", +3)  │──────>│                    │
  │                          │       │ bonus: sum         │
  │ itemModifiers(ring):     │       │ grant: OR          │──> PassiveModifiers
  │   Bonus("saveMisc", +1)  │──────>│ override: min-wins │
  │                          │       │ set: union         │
  │ championModifiers(lvl):  │       └────────────────────┘
  │   Override("critRange",  │
  │            19)           │
  └──────────────────────────┘
```

Closed target enums (compile-time checked, `as const satisfies ReadonlyArray<keyof PassiveModifiers>`):

- **Bonus targets** (additive): saveMiscBonus, meleeDamageBonus, parryAcBonus, sneakAttackDice, bardicInspirationCharges
- **Grant targets** (boolean OR): hasEvasion, ragingBlocksSpells, recklessThisTurn, hasDangerSense, isElusive
- **Override targets** (min-wins): critRange
- **Set targets** (union): combatantResistances, conditionImmunities

**Trigger condition**: defer Phase 3 until PRD 3 (passive modifiers) adds planned fields AND we have a real multi-source composition case.

## Adding a New Modifier: Before vs. After

Example: adding `hasDangerSense: bool` (Barbarian L2).

| Step | Before (flat fields) | After (sub-record) |
|---|---|---|
| Quint type | Add field to Combatant (31->32 fields) | Add field to PassiveModifiers |
| Quint constructors | Add default x3 constructors | Add to FRESH_MODS (1 place) |
| Quint pipeline | Add read in save pipeline | Same |
| TS type | Add to BattleCreatureState + InitCreatureConfig | Add to PassiveModifiers (1 interface) |
| TS init default | Add to freshCreature() | Already in FRESH_MODS |
| TS init spreading | Add conditional spread in battleInit() | Nothing (cfg.mods already spreads) |
| MBT bridge | Add to schema + bridge read + bridge write | Add to nested schema (1 place) |
| **Total** | **~8 places, ~20 lines** | **~3 places, ~5 lines** |

## Scope of Change

| Layer | Files | Nature |
|---|---|---|
| Quint | 1 (`battle.qnt`) | Record restructure + 28 read renames + 9 write nests |
| TS types | 1 (`battle-machine-types.ts`) | Interface restructure |
| TS init | 2 (`battle-machine-creature.ts`, `battle-machine-actions-turn.ts`) | Collapse init boilerplate |
| TS pipelines | 3 (`battle-machine-actions-attack.ts`, `-spell.ts`, `battle-machine-helpers.ts`) | ~30 mechanical renames |
| MBT bridge | 1 (`battle-machine.mbt.test.ts`) | Schema paths nest one level |
| Tests | 2 (`battle-rules-scenarios.test.ts`, `available-actions.test.ts`) | Mechanical renames in setup |
| React | 0 files | No direct access to these fields |

**Total: ~10 files, ~60 mechanical renames, net negative lines.**

## Migration Sequence

1. **Phase 1** (Quint sub-record) -> Tier 1 MBT to verify
2. **Phase 2** (TS mirror + updateMods helper) -> Tier 2 MBT to verify parity
3. **Phase 3** (resolver) -> defer until PRD 3 needs multi-source composition

Phase 1+2 is a single coherent refactor, net-negative lines, zero behavior change, MBT-provable.

## Quint Impact

High. Groups the planned modifier frontier into a single typed record. Adding future modifiers (Danger Sense, Elusive, condition immunities) costs 3 touches instead of 8.

## Domain Language Impact

Medium. Introduces "passive modifiers" (`mods`) as a named concept in the domain. Pipeline reads gain a consistent `tgt.mods.X` prefix that signals "this is a modifier, not core state."

## Recommendation

Adopt carefully. Use a small closed algebra, not an open-ended modifier registry. The goal is to make generic modifier modeling in Quint simpler and more auditable. Phase 1+2 (sub-record grouping) before PRD 3. Phase 3 (resolver with composition rules) only when multi-source stacking becomes real.
