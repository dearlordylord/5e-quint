# Plan: Internalize speed bonuses, remove `callerSpeedModifier`

## Problem

`callerSpeedModifier` is a per-turn external input on `START_TURN` with no RAW basis. The SRD says:

> "A character's Speed is **determined during character creation.**" (Playing-the-Game.md)

Speed is a persistent creature stat. What resets each turn is *movement remaining*, not speed itself. Class features that modify speed ("your speed increases by 10 feet while you aren't wearing Heavy armor") are conditional on equipment, not on turn state.

Currently `callerSpeedModifier` is hardcoded to 0 everywhere. The TS functions `fastMovementBonus()` and `unarmoredMovementBonus()` exist in `features/` but are only used by the React UI for display — never wired into speed computation.

## RAW: What modifies speed

| Source | SRD text | Condition | Modeled? |
|--------|----------|-----------|----------|
| Barbarian Fast Movement (L5) | "your speed increases by 10 feet" | "while you aren't wearing Heavy armor" | TS function exists, not wired |
| Monk Unarmored Movement (L2+) | "your speed increases by 10 feet" (scales) | "while you aren't wearing armor or wielding a Shield" | TS function exists, not wired |
| Exhaustion | "Speed is halved" / "Speed is 0" | exhaustion level 3/5 (5.1) or -5ft/level (5.2.1) | Already in `pComputeEffectiveSpeed` |
| Grappled | "Speed becomes 0" | condition active | Already modeled |
| Restrained | "Speed becomes 0" | condition active | Already modeled |
| Armor penalty | Speed reduced by 10 if lacking Str requirement | wearing armor, Str < requirement | Already in `pComputeEffectiveSpeed` via `armorPenalty` param |
| Spells (Longstrider, Haste, Slow) | various | via ActiveEffect | Future: should be intrinsic via effect system |
| Difficult terrain | double movement cost | per-square | Already modeled as movement cost multiplier, not speed |

## What each layer already knows

**Quint `creature.qnt`:**
- `CharConfig.classLevels` — has barbarian/monk levels
- `ArmorState` parameter on `pStartTurnFull` / `pStartTurn` — knows if wearing heavy/any armor
- `pComputeEffectiveSpeed` — already computes exhaustion, grappled, restrained, armor penalty

**TS creature machine (`machine-startturn.ts`):**
- `DndContext.classStates.barbarian?.level`, `.monk?.level` — has class levels
- No armor state (comment: "armor not modeled at creature level")
- `computeInitTurn` already derives extra attacks from class levels the same way

**Quint `battle.qnt`:**
- `Combatant.barbarianLevel`, `.monkLevel` — has class levels
- No armor state tracked on Combatant (armor not modeled at battle level)

## Design

Speed bonuses from class features are **equipment-conditional but combat-static** — armor doesn't change mid-combat in normal play. This means:

1. At **init time**, compute the speed bonus from class levels + starting armor state
2. Bake it into `baseWalkSpeed` (or a separate additive field) so `pComputeEffectiveSpeed` doesn't need a `callerSpeedModifier` parameter

This matches how `baseWalkSpeed` already works — set at init, used every turn.

### Option A: Fold into `baseWalkSpeed` at init

The caller (battle machine, MCP, app) computes `baseWalkSpeed = raceSpeed + fastMovementBonus + unarmoredMovementBonus` and passes that as `baseWalkSpeed`. No new fields, no new parameters.

- **Pro:** Zero spec changes. `baseWalkSpeed` already carries the semantic of "how fast this creature walks."
- **Pro:** The Quint spec already fuzzes `baseWalkSpeed` via `nondet` in the creature spec and hardcodes it per-combatant in `bInit`. The fuzzing already covers bonus/no-bonus scenarios.
- **Con:** If armor changes mid-combat (extremely rare but RAW-possible: Doffing armor takes 1-10 minutes, so essentially never in combat), the bonus wouldn't update.
- **Con:** Loses visibility — you can't tell from `baseWalkSpeed: 40` whether that's a fast race or a 30+10 bonus.

### Option B: Separate `speedBonus` computed at init

Same as the reverted approach, but without `callerSpeedModifier` — the bonus is folded into speed computation inside `pComputeEffectiveSpeed` or at init, not passed as a per-turn event parameter.

- **Pro:** Explicit — you can see the bonus separately.
- **Con:** New field across the stack (Combatant, BattleCreatureState, etc.) for a value that's just added to base speed.

### Recommendation: Option A

Option A is simpler. The caller already computes `baseWalkSpeed` — just add the class feature bonus to it at init time. No spec changes needed. The Quint spec's `nondet callerSpeedMod` already covers the range abstractly; the concrete callers just need to pass the right `baseWalkSpeed`.

The question of mid-combat armor changes is moot: doffing armor takes minutes (SRD "Donning and Doffing Armor"), so it doesn't happen in the combat turns we model.

## Steps

### 1. Remove `callerSpeedModifier` from creature machine `START_TURN` event

**`machine-types.ts`:** Remove `callerSpeedModifier` from the `START_TURN` event type.

**`machine-startturn.ts` (`computeInitTurn`):** Instead of `callerSpeedModifier: ev.callerSpeedModifier`, compute the bonus inline:
```typescript
const barbarianLevel = c.classStates.barbarian?.level ?? 0
const monkLevel = c.classStates.monk?.level ?? 0
// Armor not modeled at creature level — assume unarmored for feature eligibility.
// Battle machine passes correct baseWalkSpeed inclusive of bonus.
const speedMod = fastMovementBonus(barbarianLevel, "none") + unarmoredMovementBonus(monkLevel)
```
Or better: just pass `callerSpeedModifier: 0` and have the battle machine handle it via `baseWalkSpeed`. The creature machine doesn't know armor state, so it can't compute the bonus correctly anyway.

**Actually — simplest path:** Remove `callerSpeedModifier` from `START_TURN` entirely. The creature machine passes `callerSpeedModifier: 0` to `calculateEffectiveSpeed` (hardcoded). The battle machine already computes speed independently in `processStartTurn`. The MCP/app callers fold the bonus into `baseWalkSpeed` at init.

### 2. Wire speed bonus into `baseWalkSpeed` at battle init

**`battle-machine-actions-turn.ts` (`battleInit`):** When computing `baseWalkSpeed` for a PC combatant, add the class feature bonus:
```typescript
const baseSpeed = cfg.baseWalkSpeed ?? 30
const bonus = fastMovementBonus(cfg.barbarianLevel ?? 0, armorWeight(cfg))
            + unarmoredMovementBonus(cfg.monkLevel ?? 0)
// fold bonus into baseWalkSpeed
creatures.set(cfg.id, { ...base, baseWalkSpeed: baseSpeed + bonus, ... })
```

**`battle.qnt` (`bInit`):** Combatant "B" (barbarianLevel: 5) gets `baseWalkSpeed: 40` instead of `baseWalkSpeed: 30`.

### 3. Remove `callerSpeedModifier` from Quint `pComputeEffectiveSpeed`

**`creature.qnt`:** Remove the `callerSpeedModifier` parameter from `pComputeEffectiveSpeed` and all callers (`pStartTurn`, `pStartTurnFull`). The abstract fuzzing in `aStartTurn` drops `nondet callerSpeedMod`.

This is the biggest change — it touches the spec's interface. But it makes the spec match RAW: speed is not an external per-turn input, it's a creature stat.

### 4. Update callers

**MCP (`packages/mcp/src/index.ts`):** Remove `callerSpeedModifier` from `START_TURN` send.

**App (`packages/app`):** Remove `callerSpeedModifier` from `START_TURN` send. The `useFeatures` hooks already compute `fastMovementBonus` and `unarmoredMovementBonus` — fold them into the machine's `baseWalkSpeed` input at init.

**MBT bridges:** Update to match.

### 5. Update tests

**`machine.test.ts`:** Remove `callerSpeedModifier` from all `START_TURN` sends and `startTurn()` helper. Remove or update `calculateEffectiveSpeed` tests that test `callerSpeedModifier`.

**`battle-machine.mbt.test.ts`:** Combatant "B" gets `baseWalkSpeed: 40`.

## Verification

1. `quint typecheck creature.qnt && quint typecheck battle.qnt`
2. `cd packages/core && npx tsc --noEmit`
3. Tier 1 creature MBT
4. Tier 1 battle MBT
5. Tier 1 battle machine MBT
6. Unit tests
7. `/simplify` convergence (2 rounds)

## No open questions

`callerSpeedModifier` is removed from the Quint spec too. There's no SRD concept of "an external modifier applied to your speed each turn." Speed is a stat you have; things modify it by changing the stat. The spec should match RAW, not invent abstractions for fuzzing convenience.
