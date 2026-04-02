# TODO Features

## 1. Multiclassing Integration

**Status:** Core integration complete (creature.qnt + dndTest.qnt). Battle.qnt and MBT bridge pending.

The `classLevels: ClassName -> int` field is now the **source of truth** for class-level dispatch. The 12 per-class level state variables have been removed. Pure functions for multiclass math are implemented and tested:

- `pMulticlassCasterLevel` — effective caster level from full/half/third caster class levels
- `pEffectiveCasterLevel` — derives multiclass caster level from `classLevels` map
- `pWarlockPactSlotCount` / `pWarlockPactSlotLevel` — warlock pact slot computation
- `pInitSpellSlots` — builds initial SpellSlotState from classLevels (regular + pact slots)
- `pSlotsPerLevel` / `pBuildSlotMap` — full multiclass spellcaster table (PHB Ch6)
- `pMeetsMulticlassPrereq` — per-class ability score prerequisites (all 12 classes)
- `pCanMulticlass` — validates both current and target class prereqs
- `pExtraAttackStacks` / `pCanGainUnarmoredDefense` — anti-stacking guards

### Completed

1. **Removed 12 per-class level state vars** — `classLevels` is now the sole source of truth; all actions use `classLevels.get(ClassName)`.
2. **Rewrote slot initialization** — `pInitSpellSlots` computes regular slots from multiclass caster level and pact slots from warlock level. Used in both `init` and `doLongRest`.
3. **Derive proficiency bonus** from total character level via `pTotalLevel(classLevels)` in `configFromClassLevels`.
4. **Simplified `doStartTurn`** — uses `configFromClassLevels(classLevels)` instead of `configForLevel(classLevels.get(Fighter))` + manual Extra Attack patching.
5. **Fixed `doLongRest`** — hit dice use `pTotalLevel(classLevels)` (not Fighter-only); slots reset to multiclass-computed max.
6. **Updated dndTest.qnt** — replaced 138 per-class level variable references with `classLevels'` assignments.

### Remaining

3. **Track mixed hit dice** — multiclass characters pool hit dice per class (d6/d8/d10/d12). Currently uses single total.
6. **Update battle.qnt `Combatant`** — currently tracks `rogueLevel`, `monkLevel` individually.
7. **Update MBT bridge** — schema, event mappers, and driver for multiclass scenarios.

### Complexity

Remaining work is medium. Battle.qnt Combatant refactor is mechanical; MBT bridge update requires coordinating with XState machine changes.

---

## 2. Spell Identity and Preparation

**Status:** Spell slots modeled; spell identities not tracked.

`SpellSlotState` tracks slot counts per level (1-9), Warlock pact slots, and concentration (`concentrationSpellId: str`). The battle layer (`battle.qnt`) models spell *effects* — save spells, AoE, concentration — but not spell *identities*. Assumption A10 explicitly defers casting time beyond action/bonus action.

The app layer (`app/src/features/spell-*.ts`) has rich spell metadata (name, level, school, damage type, concentration flag) but this is pure TS data, not integrated with the Quint spec.

### What makes sense to add (combat-relevant)

1. **Spell name tracking** — add `spellName: str` to `SpellCastCtx` in battle.qnt. Trivial, improves test clarity and debuggability.
2. **Prepared spell list** — add `prepared: Set[str]` to `Combatant`. Guard cast actions with "is spell in prepared list?" Ensures RAW fidelity (can't cast unprepared spells).
3. **Ritual tag** — add `ritual: bool` flag; gate ritual casting on prepared-list membership + skip slot expenditure. Currently punted by A10 to the caller.

### What's out of scope

- **Spellbook management** (Wizard-only, character-sheet lifetime concern, not combat).
- **Class-specific prep rules** (per-class prep count limits, change-on-rest rules — requires deep class-level integration, couples with multiclassing).
- **Spell copying/discovery** (adventure-timescale mechanics).
- **Always-prepared domain/pact spells** (requires class feature integration in battle layer).

### Complexity

Low-to-medium for the combat-relevant subset. ~4-6 hours for Quint changes + MBT bridge + tests. The minimal version (spell name + prepared set + ritual flag) is self-contained and doesn't require multiclassing to land first.

---

## 3. Time Beyond the Turn Economy

**Status:** Not modeled. Explicitly out of scope per current assumptions.

The spec is a combat state machine. Time is tracked as discrete round cycles via `turnPhase` ("outOfCombat" / "acting" / "waitingForTurn"). Assumption A5 defines each START_TURN/END_TURN cycle as one round. Rests (`pShortRest`, `pLongRest`) complete instantaneously as pure functions.

The `CastingTime` type includes `CTMinutes(int)` and `CTHours(int)` variants (creature.qnt:48-49) but they are **never used** — A10 states casting time beyond action/bonus action is not modeled.

### Why this doesn't belong in creature.qnt

1. **Scope mismatch.** The spec models a single actor in combat. Out-of-combat time is an orchestrator concern (like multi-creature targeting, initiative order).
2. **Assumption A5 is structural.** Duration decrement logic assumes 1 turn = 1 round. Adding minute/hour granularity would require fundamental restructuring.
3. **SRD exploration rules are narrative.** The SRD explicitly leaves out-of-combat pacing to GM discretion — incompatible with a deterministic state machine.
4. **Rests already bridge the gap.** The only state that spans combat and campaign time (exhaustion, hit dice, spell slots) is already handled by rest functions.

### If implemented

This should be a **separate orchestration module** (`exploration.qnt` or `campaign.qnt`) that:

- Tracks calendar time (minutes, hours, days)
- Manages rest progress (Long Rest = 8 hours elapsed)
- Validates out-of-combat casting times before calling slot expenditure
- Calls existing `pShortRest` / `pLongRest` when enough time has passed
- Handles forced march, starvation, and other time-based environmental effects

The creature machine remains a combat simulator that accepts discrete events; the orchestrator translates calendar time into creature events.

### Complexity

Medium-to-high as a new module. Low coupling to creature.qnt (calls existing rest functions). The main design challenge is defining the right abstraction boundary between combat time and campaign time.
