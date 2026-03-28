# Plan: Monster Support Architecture

## Status

**Ready for implementation** — all prerequisites complete, atomic task list below. Restructured 2026-03-28: universal creature improvements moved to PLAN_CLEANUP.md (items E/F/G/H2/I).

## Prerequisites — ALL DONE

- **E:** ✅ Ongoing damage respects creature R/V/I
- **F:** ✅ `pApplyCondition` accepts `conditionImmunities: Set[Condition]` parameter
- **G:** ✅ `pAddExhaustion` accepts `exhaustionImmune: bool` parameter

## Motivation

The spec (`dnd.qnt`) and XState machine model a single creature's combat state. The core pure functions (`pTakeDamage`, `resolveAttackRoll`, `applyDamageModifiers`, conditions, action economy) are already creature-agnostic — they operate on flat values. However, the configuration layer (`CharConfig`) is PC-only, and there is no data type for monster stat blocks.

To support monsters, we need:
1. A `StatBlock` type for authoring monster data directly (SRD term, monster-only).
2. A `creatureKind` discriminator for death saves vs. instant death at 0 HP.
3. Monster-specific resource tracking (Legendary Actions, Recharge, X/Day) — deferred to a later phase.
4. Two basic SRD monsters as proof-of-concept (Skeleton, Ogre).

## Key Design Decisions

### Decision 1: No shared supertype — parameter-passing is the shared interface

The SRD defines **Stat Block** for monsters and **Character Sheet** for PCs. There is no SRD term for a shared "creature combat config." The project rule is "nothing beyond SRD."

The existing architecture already has the right shared interface: **pure functions that take flat parameters**. `pTakeDamage` takes `resistances: Set[DamageType]` as a parameter — it doesn't care whether those resistances come from a `StatBlock` or a `CharConfig`. This is the correct design. We keep it.

`CharConfig` stays as-is for PCs. `StatBlock` is a new, separate type for monsters. When calling shared functions, the caller extracts the relevant fields from whichever config type it has.

### Decision 2: R/V/I stay as function parameters, not stored on CreatureState

Resistances, vulnerabilities, and immunities are **static creature properties** (come from stat block or class/species). They are NOT mutable runtime state. They stay as parameters on `pTakeDamage` and friends — the caller provides them. This preserves the clean separation and avoids the dual-path correctness landmine.

R/V/I fields live on `StatBlock` (for monsters) and eventually on `CharConfig` (for PCs, when species features are modeled). The call site extracts and passes them.

### Decision 3: `creatureKind` discriminator from day one

Monsters die at 0 HP — they do NOT make death saving throws (SRD: death saves are for player characters). A `creatureKind` discriminator (`PC | Monster`) gates this in `pTakeDamage` and `pStartTurnFull`.

### Decision 4: Multiattack is a list, not a count

SRD Multiattack can include heterogeneous attacks and non-attack effects. Modeling as a list of action-slot references from the start prevents rework.

### Decision 5: Two proof-of-concept monsters

**Skeleton** exercises: vulnerability (Bludgeoning), damage immunity (Poison), condition immunity (Poisoned), exhaustion immunity, creature type (Undead), simple attacks (no multiattack), flat AC, fractional CR.

**Ogre** exercises: Large size (different from all PC sizes), simple but different ability score profile (high STR, low DEX/INT), no immunities/resistances (baseline), different speed (40 ft), higher CR (2), single powerful attack (Greatclub 2d8+4).

Together they cover the spectrum from immune/vulnerable to baseline, Small-Medium to Large, low CR to moderate CR.

---

## Current State Analysis

### Already creature-agnostic (no changes needed)

- **`CreatureState`** (dnd.qnt:517-541) — HP, 14 conditions, exhaustion (int), death saves, active effects. Zero PC-specific fields.
- **`TurnState`** (dnd.qnt:855-871) — action economy: actions, bonus action, reaction, movement, extra attacks. Universal.
- **`SpellSlotState`** (dnd.qnt:1432-1439) — slot tracking, concentration. Monsters with Spellcasting use the same mechanics.
- **`pTakeDamage`** — takes R/V/I as `Set[DamageType]` parameters.
- **`resolveAttackRoll`** — takes flat values (d20, attackBonus, targetAC, critRange).
- **`applyDamageModifiers`** — pure function on damage type sets.
- **Condition functions** — `pApplyCondition` (with immunity param after PLAN_CLEANUP F), `pRemoveCondition`, etc.

### PC-specific (stays PC-specific)

- **`CharConfig`** (dnd.qnt:83-105) — className, subclass, species, level, hitDieType, etc.
- **`FighterState`** (dnd.qnt:109-118) — Second Wind, Action Surge, Indomitable charges.
- **`configForLevel`** (dnd.qnt:2272-2285) — hardcoded to Champion Fighter.
- **`proficiencyBonus(level)`** (dnd.qnt:152-153) — pure function of PC level. Monsters use a different CR-based table.

### What monsters need that doesn't exist yet

| Monster concept | SRD reference | Phase |
|----------------|---------------|-------|
| **Stat Block type** | Rules Glossary: "contains game statistics of a monster" | Phase 1 |
| **Creature Type enum** | 14 types (Aberration ... Undead) | Phase 1 |
| **CR / PB from CR** | CR 0-30, PB derived via separate table | Phase 1 |
| **Multiattack** | "details the attacks a creature can make as part of the Attack action" | Phase 2 |
| **Monster death at 0 HP** | Monsters die, no death saves | Phase 0 |
| **Natural armor** | Flat AC value in stat block | Phase 1 (just an int field) |
| **Initiative modifier** | DEX-based, listed in stat block | Phase 1 |
| **Senses** | Darkvision, Blindsight, etc. | Phase 1 |
| **Legendary Actions** | Limited uses/round, after other creature's turn | **Deferred (Phase L)** |
| **Legendary Resistance** | X/Day, choose to succeed a failed save | **Deferred (Phase L)** |
| **Recharge (X-Y)** | Regains on d6 roll at start of turn | **Deferred (Phase L)** |
| **X/Day abilities** | Regains on Long Rest | **Deferred (Phase L)** |
| **Lair Actions** | Environment-level, initiative count 20 | **Deferred (Phase Lair)** |

---

## Target Types (Quint Sketches)

### CreatureKind — PC vs. Monster discriminator

```quint
type CreatureKind = PC | Monster
```

Gates death saves vs. instant death at 0 HP.

### StatBlock — monster configuration (SRD term)

```quint
type CreatureType =
  | Aberration | Beast | Celestial | Construct | Dragon
  | Elemental | Fey | Fiend | Giant | Humanoid
  | Monstrosity | Ooze | Plant | Undead

type SenseType = Blindsight | Darkvision | Tremorsense | Truesight

type MonsterAttack = {
  name: str,
  attackBonus: int,
  reach: int,              // 0 for ranged-only
  rangeNormal: int,        // 0 for melee-only
  rangeLong: int,
  damageAmount: int,       // average damage
  damageType: DamageType,
  isRanged: bool,
}

/// What a Multiattack consists of — ordered list of action slots.
/// Simple: [MAttack("Shortsword"), MAttack("Shortsword")].
/// Complex: [MAttack("Claw"), MAttack("Claw"), MAttack("Bite")].
/// The caller resolves each slot by matching the name to the attacks map.
type MultiattackSlot = MAttack(str) | MSpecialAbility(str)

type ChallengeRating =
  | CR0 | CR_Eighth | CR_Quarter | CR_Half | CRN(int)

/// SRD: "A stat block contains the game statistics of a monster."
type StatBlock = {
  name: str,
  creatureType: CreatureType,
  size: Size,
  ac: int,                               // flat value (natural armor, etc.)
  initiativeMod: int,
  maxHp: int,
  hitDice: int,                          // number of hit dice
  hitDieType: int,                       // d4-d20 based on size
  speeds: SpeedType -> int,
  abilityScores: Ability -> int,
  saveProficiencies: Set[Ability],
  skillBonuses: Skill -> int,            // flat bonus (not derived from proficiency)
  cr: ChallengeRating,
  proficiencyBonus: int,                 // derived from CR, stored for convenience
  resistances: Set[DamageType],
  vulnerabilities: Set[DamageType],
  damageImmunities: Set[DamageType],
  conditionImmunities: Set[Condition],
  exhaustionImmune: bool,                // separate: Exhaustion is not a Condition type
  senses: SenseType -> int,              // sense type -> range in feet
  attacks: str -> MonsterAttack,         // name -> attack
  multiattack: List[MultiattackSlot],    // empty = no multiattack
  // Legendary/Recharge fields deferred to Phase L
}
```

### Relationship to existing types

```
StatBlock (monster config, authored)     CharConfig (PC config, derived from class/level)
    |                                         |
    |   both provide flat values to:          |
    v                                         v
pTakeDamage(s, amount, type, R, V, I, crit)
resolveAttackRoll(d20, bonus, targetAC, cover, critRange)
pApplyCondition(s, condition, immunities)  ← from PLAN_CLEANUP F
pAddExhaustion(s, levels, exhaustionImmune) ← from PLAN_CLEANUP G
    |
    v
CreatureState (universal mutable state — unchanged)
TurnState (universal action economy — unchanged)
```

---

## Phase Breakdown

### Phase 0: CreatureKind + Monster Death Track

**Goal:** Add the PC/Monster discriminator so monsters die at 0 HP instead of entering the death-save track.

**Requires:** PLAN_CLEANUP items E, F, G complete.

**Deliverables:**
1. Define `CreatureKind = PC | Monster` type.
2. Add `creatureKind: CreatureKind` as a state variable in the MBT section.
3. Update `pTakeDamage` to branch on `creatureKind`:
   - PC: existing behavior (unconscious at 0 HP, death save failures on subsequent hits).
   - Monster: `dead = true` at 0 HP. No unconscious, no death saves.
4. Update `pStartTurnFull` to skip death save logic when `creatureKind = Monster`.
5. Mirror in XState: add `creatureKind` to context, gate death-save states.
6. MBT: existing PC traces set `creatureKind = PC`, behavior unchanged.

**ASSUMPTIONS.md entry:** "Monsters die at 0 HP (SRD: death saves are PC-only). The spec does not model DM fiat to allow monster death saves."

**MBT Impact:** Low. `creatureKind = PC` is the default for all existing traces. New parameter added to `pTakeDamage` signature — existing call sites pass `PC`.

**Verification:** All existing tests pass unchanged. New unit tests: monster at 0 HP → dead (not unconscious), no death save failures on subsequent hits to dead monster.

### Phase 1: StatBlock Type + Two Proof-of-Concept Monsters

**Goal:** Define all monster-related types and author two SRD monsters.

**Deliverables:**
1. Define `CreatureType`, `SenseType`, `MonsterAttack`, `MultiattackSlot`, `ChallengeRating`, `StatBlock` types.
2. Define `crToProficiencyBonus(cr: ChallengeRating): int` pure function (see Appendix B).
3. Author `SKELETON: StatBlock` — see Appendix A.
4. Author `OGRE: StatBlock` — see Appendix C.
5. Write Quint tests:
   - Skeleton fields match SRD values.
   - `pTakeDamage` with Skeleton's vulnerabilities: 8 Bludgeoning → 16 damage.
   - `pTakeDamage` with Skeleton's immunities: any Poison → 0 damage.
   - `pApplyCondition` with Skeleton's immunities: Poisoned → rejected.
   - `pAddExhaustion` with Skeleton's immunity: no-op.
   - Skeleton at 0 HP with `creatureKind = Monster`: dies immediately.
   - Ogre fields match SRD values.
   - Ogre takes normal damage (no resistances, no vulnerabilities).
   - Ogre at 0 HP with `creatureKind = Monster`: dies immediately.
6. Mirror types in TypeScript `types.ts`.

**MBT Impact:** None. New types and constants only.

**Verification:** `quint test` with monster assertions. TypeScript compiles.

### Phase 2: Monster Combat Integration Tests

**Goal:** Validate that existing combat functions work correctly with stat-block-sourced values.

**Deliverables:**
1. Quint tests exercising monster attacks through `resolveAttackRoll`:
   - Skeleton Shortsword: `resolveAttackRoll(d20, 5, targetAC, 0, 20)`.
   - Ogre Greatclub: `resolveAttackRoll(d20, 6, targetAC, 0, 20)`.
2. Complete monster combat turn tests:
   - Skeleton turn: `doStartTurn` (extraAttacks = 0) → `doUseAction(AAttack)` → `doEndTurn`.
   - Ogre turn: same sequence, different stats.
3. Multiattack test with a hypothetical monster having `multiattack: [MAttack("Claw"), MAttack("Claw")]`:
   - Start turn with `extraAttacks = 1` (two attacks total = one action + one extra).
   - `doUseAction(AAttack)` + `doUseExtraAttack`.
   - Verify action economy depleted correctly.
4. Document in ASSUMPTIONS.md: "Multiattack maps to `extraAttacksRemaining = len(multiattack) - 1`. The first slot uses the Attack action; remaining slots use extra attacks. Complex Multiattack with mixed attack types is supported by the `List[MultiattackSlot]` type; the caller decides which `MonsterAttack` to resolve for each slot."

**MBT Impact:** None. Tests only, no state variable changes.

### Phase 3: MBT Integration (Monster Traces)

**Goal:** Add monster creatures to the MBT state space, proving XState handles monsters correctly.

**Deliverables:**
1. Add `monsterStatBlock` as a state variable (config for the current monster, inactive in PC mode).
2. Update `init` to nondeterministically choose `creatureKind = PC | Monster`.
   - PC mode: existing CharConfig/FighterState initialization.
   - Monster mode: select from `{SKELETON, OGRE}`.
3. Update `step` to include monster-appropriate actions when `creatureKind = Monster`:
   - Reuse existing `doTakeDamage` but extract R/V/I from `monsterStatBlock` instead of nondeterministic generation.
   - Reuse existing `doStartTurn`, `doEndTurn`, `doUseAction`, `doUseExtraAttack`, `doUseMovement`.
   - Skip fighter-specific actions (`doUseSecondWind`, `doUseActionSurge`, etc.).
4. Update MBT bridge (`machine.mbt.test.ts`) to map new state variables.
5. Run MBT: mixed PC/Monster traces.

**MBT Impact:** High — this is the integration phase. Develop incrementally:
   1. First: add monster state vars with PC-only traces → bridge still passes.
   2. Then: enable monster init → mixed traces.

---

## Deferred Phases (documented, NOT scheduled)

### Phase L: Legendary Actions, Legendary Resistance, Recharge, X/Day

**Goal:** Model monster-specific mutable resources for powerful monsters.

**Requires:** Phases 0-3 complete.

**Scope:**
1. Define `MonsterResourceState` type:
   - `legendaryActionsRemaining: int` — regained at start of monster's turn.
   - `legendaryResistancesRemaining: int` — X/Day, regained on Long Rest.
   - `rechargeAvailable: str -> bool` — ability name → currently available.
   - `dailyUsesRemaining: str -> int` — ability name → uses left today.
2. Pure functions: `pUseLegendaryAction`, `pRefreshLegendaryActions`, `pUseLegendaryResistance`, `pCheckRecharge`, `pUseDailyAbility`, `pRefreshDailyAbilities`.
3. Add `legendaryActionUses: int` and `legendaryResistanceUses: int` fields to `StatBlock`.
4. Proof-of-concept monster: one Legendary creature (e.g., Adult Red Dragon — exercises Multiattack with heterogeneous attacks, Legendary Actions, Legendary Resistance, Frightful Presence, Recharge breath weapon).
5. MBT integration: `monsterResourceState` as state variable, monster-specific MBT actions.

**Why deferred:** Legendary mechanics are exclusively for high-CR monsters. The basic monster architecture (Phases 0-3) must be proven correct first. Adding Legendary too early risks over-engineering before the foundation is validated.

### Phase Lair: Lair Actions

**Goal:** Model environment-level effects that trigger on initiative count 20.

**Requires:** Phase L complete.

**Scope:** Lair actions are NOT creature-level state — they are environment-level effects. This fundamentally differs from everything in the current single-creature model. Modeling them requires either (a) extending the spec with an environment concept, or (b) treating them as caller-provided events (consistent with the current externalization pattern).

**Why deferred:** Lair actions require architectural decisions beyond the single-creature model. Evaluate after Legendary mechanics are stable.

---

## Atomic Task List

Sequential execution. Each task is independently committable. Validate after each: `quint typecheck` + `quint test` + `vitest run`. Tasks marked with `quint run --invariant` also need the simulation check.

### Phase 0: CreatureKind + Monster Death Track

**M0.1 — Define `CreatureKind` type and state variable**
- Add `type CreatureKind = PC | Monster` to `dnd.qnt` (near other type definitions)
- Add `var creatureKind: CreatureKind` to the MBT state section
- Update `init` to set `creatureKind' = PC` (default, all existing traces are PC)
- Update ALL actions' frame conditions to include `creatureKind' = creatureKind`
- Validate: `quint typecheck` + `quint test` + `quint run --invariant`

**M0.2 — Gate death saves on `creatureKind` in `pTakeDamage`**
- Add `creatureKind: CreatureKind` parameter to `pTakeDamage`
- PC path: existing behavior (unconscious at 0 HP, death save failures on subsequent hits)
- Monster path: `dead = true` at 0 HP, no unconscious, no death saves
- Update all `pTakeDamage` call sites (pure functions + actions) to pass `creatureKind`
- Update `dndTest.qnt` call sites to pass `PC`
- Validate: `quint typecheck` + `quint test` + `quint run --invariant`

**M0.3 — Gate death saves on `creatureKind` in `pStartTurnFull`**
- Add `creatureKind: CreatureKind` parameter to `pStartTurnFull` (or the death-save sub-path)
- Monster path: skip death save roll entirely
- Update call sites to pass `creatureKind`
- Validate: `quint typecheck` + `quint test`

**M0.4 — Quint unit tests for monster death at 0 HP**
- Test: monster at 0 HP → `dead = true`, NOT unconscious
- Test: monster at 0 HP does NOT accumulate death save failures on further hits
- Test: PC behavior unchanged (regression)
- Validate: `quint test`

**M0.5 — Mirror CreatureKind in XState + MBT bridge**
- Add `creatureKind` to `DndContext` in `machine-types.ts`
- Add `creatureKind` to machine context (default: `"PC"`)
- Gate death-save states on `creatureKind === "PC"` in machine
- Update MBT bridge: add `creatureKind` to `NormalizedState`, both conversion functions, Zod schema
- Add ASSUMPTIONS.md entry: "Monsters die at 0 HP (SRD: death saves are PC-only). The spec does not model DM fiat to allow monster death saves."
- Validate: `quint typecheck` + `quint test` + `quint run --invariant` + `vitest run`

### Phase 1: StatBlock Type + Proof-of-Concept Monsters

**M1.1 — Define monster-related types in Quint**
- `CreatureType` enum (14 types: Aberration through Undead)
- `SenseType` enum (Blindsight, Darkvision, Tremorsense, Truesight)
- `ChallengeRating` sum type (`CR0 | CR_Eighth | CR_Quarter | CR_Half | CRN(int)`)
- `MonsterAttack` record type
- `MultiattackSlot` sum type (`MAttack(str) | MSpecialAbility(str)`)
- `StatBlock` record type (all fields from the sketch in this plan)
- Validate: `quint typecheck`

**M1.2 — Define `crToProficiencyBonus` pure function**
- Implement CR → PB lookup per Appendix B table
- Unit tests: CR0 → +2, CR_Quarter → +2, CRN(5) → +3, CRN(9) → +4, CRN(30) → +9
- Validate: `quint typecheck` + `quint test`

**M1.3 — Author `SKELETON` stat block constant**
- Transcribe from Appendix A (SRD 5.2.1 values)
- Verify against `.references/srd-5.2.1/Monsters/Monsters-P-S.md`
- Unit test: assert each field matches SRD values (AC=14, maxHp=13, vulnerabilities=Set(Bludgeoning), damageImmunities=Set(Poison), conditionImmunities=Set(Poisoned), exhaustionImmune=true, cr=CR_Quarter, proficiencyBonus=2)
- Validate: `quint typecheck` + `quint test`

**M1.4 — Author `OGRE` stat block constant**
- Transcribe from Appendix C (SRD 5.2.1 values)
- Verify against `.references/srd-5.2.1/Monsters/Monsters-M-O.md`
- Unit test: assert each field matches SRD values (AC=11, maxHp=68, no R/V/I, cr=CRN(2), proficiencyBonus=2)
- Validate: `quint typecheck` + `quint test`

**M1.5 — Skeleton combat correctness tests**
- `pTakeDamage` with Skeleton's vulnerabilities: 8 Bludgeoning → 16 damage
- `pTakeDamage` with Skeleton's immunities: any Poison → 0 damage
- `pApplyCondition` with Skeleton's conditionImmunities: Poisoned → rejected
- `pAddExhaustion` with Skeleton's exhaustionImmune: no-op
- Skeleton at 0 HP with `creatureKind = Monster`: dead immediately
- Validate: `quint test`

**M1.6 — Ogre combat correctness tests**
- Ogre takes normal damage (no R/V/I, baseline)
- Ogre at 0 HP with `creatureKind = Monster`: dead immediately
- Validate: `quint test`

**M1.7 — Mirror types in TypeScript**
- Add `CreatureType`, `SenseType`, `ChallengeRating`, `MonsterAttack`, `MultiattackSlot`, `StatBlock` to `types.ts` (or a new `monster-types.ts` if `types.ts` is near its line limit)
- Add ASSUMPTIONS.md entries for Phase 1 (monster AC as flat int, exhaustion immunity as bool, CR sum type)
- Validate: `vitest run` (TypeScript compiles)

### Phase 2: Monster Combat Integration Tests

**M2.1 — Monster attack resolution tests**
- Skeleton Shortsword through `resolveAttackRoll(d20, 5, targetAC, 0, 20)`
- Ogre Greatclub through `resolveAttackRoll(d20, 6, targetAC, 0, 20)`
- Validate: `quint test`

**M2.2 — Monster full turn tests**
- Skeleton turn: `doStartTurn` (extraAttacks=0) → `doUseAction(AAttack)` → `doEndTurn`
- Ogre turn: same sequence, different stats
- Validate: `quint test`

**M2.3 — Multiattack test + ASSUMPTIONS.md entry**
- Test with hypothetical monster: `multiattack: [MAttack("Claw"), MAttack("Claw")]`
- Start turn with `extraAttacks = 1` (two attacks = one action + one extra)
- `doUseAction(AAttack)` + `doUseExtraAttack` → verify action economy depleted
- Add ASSUMPTIONS.md entry: multiattack maps to `extraAttacksRemaining = len(multiattack) - 1`
- Validate: `quint test`

### Phase 3: MBT Integration (Monster Traces)

**Not yet split into atomic tasks.** Phase 3 depends on the final shapes from Phases 0-2. Split after Phase 2 is complete. High-level plan:
1. Add `monsterStatBlock` state variable (inactive in PC mode)
2. Update `init` to nondeterministically choose `creatureKind = PC | Monster`
3. Update `step` to include monster-appropriate actions when `creatureKind = Monster`
4. Update MBT bridge to map new state variables
5. Develop incrementally: PC-only first, then mixed traces

---

## Dependency Graph

```
PLAN_CLEANUP E/F/G ✅ (all done)
  |
  v
Phase 0: M0.1 → M0.2 → M0.3 → M0.4 → M0.5
  |
  v
Phase 1: M1.1 → M1.2 → M1.3 → M1.4 → M1.5 → M1.6 → M1.7
  |
  v
Phase 2: M2.1 → M2.2 → M2.3
  |
  v
Phase 3 (split after Phase 2)
  |
  v
Phase L (deferred)
  |
  v
Phase Lair (deferred)
```

---

## Original Dependency Graph (for reference)

```
PLAN_CLEANUP E/F/G (universal creature improvements)
  |
  v
Phase 0 (CreatureKind + monster death track)
  |
  +---> Phase 1 (StatBlock type + Skeleton + Ogre)
  |       |
  |       +---> Phase 2 (Monster combat integration tests)
  |               |
  +---------------+
  |
  v
Phase 3 (MBT integration — requires Phases 0-2)
  |
  v
Phase L (Legendary / Recharge / X/Day — deferred)
  |
  v
Phase Lair (Lair actions — deferred)
```

---

## Scope Boundaries — NOT Doing (in any phase)

1. **No encounter/initiative system.** Single-creature state machine. Turn order stays external.
2. **No monster AI.** The spec validates state transitions; the caller provides decisions.
3. **No full monster catalog.** Skeleton + Ogre as proof-of-concept. More monsters authored against the same types later.
4. **No monster spellcasting notation.** Monsters with Spellcasting use existing `SpellSlotState`. The X/Day spell notation is modeled via `dailyUsesRemaining` (Phase L).
5. **No natural armor formula.** Monster AC is a flat int from the stat block.
6. **No species-derived R/V/I for PCs.** When PC species features are modeled (Dwarf poison resistance, etc.), they will be added to CharConfig. That's a separate effort.
7. **No shared supertype for CharConfig/StatBlock.** Reviewed and rejected — no SRD basis. The shared interface is pure-function parameter signatures.

---

## Risk Analysis

### MBT Bridge Compatibility (HIGH — mitigated by phasing)

Phases 0-2 are additive: new types, new pure functions, new parameters with backward-compatible defaults. The MBT bridge is untouched until Phase 3. Phase 3 is developed incrementally (PC-only first, then mixed).

### Monster Death Track (HIGH — addressed in Phase 0)

Monsters die at 0 HP. `pTakeDamage` currently enters the death-save track unconditionally. Phase 0 gates this on `creatureKind`, which is the minimal foundational change.

### Multiattack Future-Proofing (MEDIUM — addressed by list model)

`List[MultiattackSlot]` handles both simple and complex multiattack without rework. Phases 1-2 only test homogeneous cases, but the type is ready for heterogeneous (exercised in Phase L).

### CharConfig Field Changes (LOW)

Phase 0 adds `creatureKind` parameter to `pTakeDamage`. The manifest at dnd.qnt:82 lists all CharConfig literals. Existing PC call sites pass `PC` — mechanical change only.

---

## ASSUMPTIONS.md Entries Required

These must be added during implementation. Do not forget.

1. **Phase 0:** "Monsters die at 0 HP (SRD: death saves are PC-only). The spec does not model DM fiat to allow monster death saves."
2. **Phase 1:** "Monster AC is a flat integer from the stat block. The spec does not model how natural armor + DEX produces that value — the SRD gives us the final number directly."
3. **Phase 1:** "Exhaustion immunity is a separate boolean, not part of `conditionImmunities: Set[Condition]`. Exhaustion is not one of the 14 SRD Conditions — it is a leveled mechanic (1-6) stored as an integer."
4. **Phase 1:** "CR encoded as sum type: `CR0 | CR_Eighth | CR_Quarter | CR_Half | CRN(int)`. Fractional CRs are special cases with specific PB/XP values that don't follow the integer formula. CR 0 XP ambiguity (0 or 10 XP) is resolved by storing XP separately if needed."
5. **Phase 2:** "Multiattack maps to `extraAttacksRemaining = len(multiattack) - 1`. The first slot uses the Attack action; remaining slots use extra attacks."

---

## Appendix A: Skeleton Stat Block (SRD 5.2.1)

Source: `.references/srd-5.2.1/Monsters/Monsters-P-S.md:1150-1176`

```
Skeleton
Medium Undead, Lawful Evil

AC 14 | Initiative +3 (13)
HP 13 (2d8 + 4)
Speed 30 ft.

STR 10 (+0)  DEX 16 (+3)  CON 15 (+2)  INT 6 (-2)  WIS 8 (-1)  CHA 5 (-3)

Vulnerabilities: Bludgeoning
Immunities: Poison; Exhaustion, Poisoned
Gear: Shortbow, Shortsword
Senses: Darkvision 60 ft.; Passive Perception 9
Languages: Understands Common plus one other
CR 1/4 (XP 50; PB +2)

Actions:
  Shortsword — Melee Attack Roll: +5, reach 5 ft. Hit: 6 (1d6 + 3) Piercing
  Shortbow — Ranged Attack Roll: +5, range 80/320 ft. Hit: 6 (1d6 + 3) Piercing
```

Exercises: vulnerability, damage immunity, condition immunity, exhaustion immunity, Undead type, simple attacks, flat AC, fractional CR.

## Appendix B: CR to Proficiency Bonus Table

Source: `.references/srd-5.2.1/Monsters/Overview.md`

| CR | PB |
|----|-----|
| 0 | +2 |
| 1/8 – 4 | +2 |
| 5 – 8 | +3 |
| 9 – 12 | +4 |
| 13 – 16 | +5 |
| 17 – 20 | +6 |
| 21 – 24 | +7 |
| 25 – 28 | +8 |
| 29 – 30 | +9 |

## Appendix C: Ogre Stat Block (SRD 5.2.1)

Source: `.references/srd-5.2.1/Monsters/Monsters-M-O.md:789-813`

```
Ogre
Large Giant, Chaotic Evil

AC 11 | Initiative -1 (9)
HP 68 (8d10 + 24)
Speed 40 ft.

STR 19 (+4)  DEX 8 (-1)  CON 16 (+3)  INT 5 (-3)  WIS 7 (-2)  CHA 7 (-2)

Senses: Darkvision 60 ft.; Passive Perception 8
Languages: Common, Giant
CR 2 (XP 450; PB +2)

Actions:
  Greatclub — Melee Attack Roll: +6, reach 5 ft. Hit: 13 (2d8 + 4) Bludgeoning
  Javelin — Melee/Ranged Attack Roll: +6, reach 5 ft. / range 30/120 ft. Hit: 11 (2d6 + 4) Piercing
```

Exercises: Large size, no immunities/resistances (baseline), higher speed (40 ft), higher CR (2), melee/ranged weapon, different ability profile from Skeleton.

## Appendix D: Review Log

### Re-research findings (verified against code, 2026-03-28)
- CharConfig mixing confirmed (dnd.qnt:83-105)
- CreatureState is fully creature-agnostic (dnd.qnt:517-541) — confirmed
- CharConfig literal manifest exists at dnd.qnt:82 — confirmed
- `proficiencyBonus(level)` exists as pure function (dnd.qnt:152) — stays for PCs; monsters use CR-based lookup
- Exhaustion is NOT one of the 14 Conditions — separate int field, handled correctly
- `pTakeDamage` signature confirmed: R/V/I as `Set[DamageType]` parameters (dnd.qnt:748-756)
- `pProcessEndOfTurnDamage` and `pProcessStartOfTurn` pass `Set()` for R/V/I — bug, moved to PLAN_CLEANUP E

### Independent review blockers (all resolved)
1. **Invented `CreatureCombatConfig` abstraction** → Rejected. No shared supertype.
2. **Dual R/V/I path** → Rejected. R/V/I stay as parameters only.
3. **`MultiattackN(int)` too narrow** → Changed to `List[MultiattackSlot]`.
4. **Unenforced condition immunities** → Enforcement moved to PLAN_CLEANUP F (prerequisite).
5. **Monsters don't make death saves** → `creatureKind` discriminator in Phase 0.
6. **Missing mechanics** → Added: X/Day (Phase L), exhaustion immunity (PLAN_CLEANUP G), initiative mod, senses.
7. **`proficiencyBonus` stored vs derived** → Stays derived for PCs; stored on StatBlock for monsters.
