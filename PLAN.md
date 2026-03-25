# D&D 5e SRD 5.2.1 — Core Specification Plan

**Edition: SRD 5.2.1 (2024).**

Source: SRD 5.2.1 (CC-BY-4.0). Reference: `.references/srd-5.2.1/`
Single-creature state machine. All dice pre-resolved. Multi-creature interactions caller-provided.

> **NOTE — Suggestive, not prescriptive.** Function names, signatures, state fields, and type
> definitions listed in tasks below are *illustrative suggestions* to communicate intent and scope.
> The implementer decides the actual Quint design — names, decomposition, data representations —
> and iterates freely. Treat task descriptions as "what to model," not "how to type it."

## Scope

This plan covers **core mechanics only** — generic rules modeled in `dnd.qnt` that any class, spell, or racial feature composes on top of. Class features, spell effects, racial traits, and subclass mechanics live in `PLAN_NONCORE.md` (TS/caller side).

**Boundary rule:** if a mechanic is specific to a class, spell, species, or subclass, it belongs in PLAN_NONCORE.md. If it's a generic rule that multiple features compose (d20 resolution, conditions, action economy, damage modifiers, etc.), it belongs here.

**SRD parity:** the spec formalizes the SRD and nothing else. Every rule must trace to a specific SRD passage. No homebrew or interpretive extensions. Where the formalization requires choices the SRD doesn't prescribe, those are documented in `ASSUMPTIONS.md`.

## Completed

Core types, config, d20 resolution, equipment, HP/death saves, 14 conditions + exhaustion,
turn structure & action economy, attack resolution (including condition-attack interactions:
auto-crit for paralyzed/unconscious within 5ft, auto-fail STR/DEX saves, petrified resistance),
combat actions, two-weapon fighting, grapple & shove, opportunity attacks,
mounted combat (partial — no task to complete; mount/dismount, controlled mount actions,
forced dismount save, mount knocked prone reaction all implemented),
movement system (including flying falls: `pFlyingCreatureFalls`),
underwater combat (attack penalties via `AttackContext` + fire resistance via `underwaterResistances`),
squeezing attack disadvantage and movement cost (missing: advantage on attacks against squeezer, DEX save disadvantage),
spellcasting framework (slots, concentration, ritual, bonus action rule, multiclass slots, pact slots),
resting, environment, character construction & leveling, unarmored defense (Barbarian/Monk
AC formulas already in `CharConfig.unarmoredDefense`), Extra Attack (`FExtraAttack` variants).
crit range parameterization (`critRange` in `CharConfig`),
cover DEX save bonus (`pSaveCoverBonus`),
damage flat modifiers before resistance/vulnerability (`applyDamageModifiers` `flatModifier` param).
MBT infrastructure wired to `@firfi/quint-connect`.

### 5.2.1 Revision Needed for Completed Features

> **Research complete.** See `REVISION_RESEARCH.md` for full SRD 5.1 vs 5.2.1 delta analysis of each item below. TL;DR: most items are already migrated; actual work needed: dehydration/malnutrition rewrite, squeezing removal, TWF melee-only ASSUMPTIONS.md entry.

The following completed features were implemented under SRD 5.1 and need revision for 5.2.1 during M2.5:

- ~~**Exhaustion:** completely new system. Was 6 tiers with specific per-tier effects (disadv ability checks, speed halved, disadv attacks/saves, HP max halved, speed 0, death). Now: -2 x level on D20 Tests, -5 x level ft Speed, death at level 6 (Rules-Glossary.md "Exhaustion [Condition]").~~ *(done — speed penalty, HP-max-halving removal, `hasEaten` removal, dead exhaustion params cleanup all complete)*
- **Stunned:** no longer includes Speed 0. 5.2.1 Stunned = Incapacitated + auto-fail STR/DEX saves + Advantage on attacks against. No Speed reduction (Rules-Glossary.md "Stunned [Condition]").
- **Grappled:** added "Disadvantage on attack rolls against any target other than the grappler" (Rules-Glossary.md "Grappled [Condition]").
- **Surprise:** was turn-skip; now Disadvantage on Initiative roll, which is pre-combat. Remove from turn state machine (Rules-Glossary.md "Initiative," Playing-the-Game.md "Surprise").
- **Knock Out:** was reduce to 0 HP; now reduce to 1 HP + Unconscious condition + starts Short Rest. Unconscious ends if creature regains any HP (Playing-the-Game.md "Knocking Out a Creature").
- **Concentration DC:** now capped at max DC 30. DC = max(10, floor(damage/2)), up to 30 (Rules-Glossary.md "Concentration").
- ~~**Grapple/Shove:** was contested Athletics checks; now saving throw (Str or Dex, target's choice) vs DC 8 + Str mod + PB, as part of Unarmed Strike (Rules-Glossary.md "Unarmed Strike").~~ *(done — migrated to save-based in Bug 1 fix)*
- **Two-weapon fighting (Light property):** bonus attack no longer adds ability modifier to damage unless that modifier is negative (Equipment.md "Light" property).
- **Underwater melee:** any weapon dealing Piercing damage avoids Disadvantage; was a specific weapon list (Playing-the-Game.md "Impeded Weapons").
- **Squeezing:** absent from SRD 5.2.1. Existing squeezing code should be removed during M2.5.
- **Type renames:** Cast a Spell -> Magic [Action], Use an Object -> Utilize [Action], Hit Dice -> Hit Point Dice. New actions: Study, Influence.

---

## Task DAG

### Priority Tiers

- **P1**: Directly enriches existing combat loop (attack modifiers, damage, AC, action economy). High test value.
- **P2**: Important but less interactive with existing spec (resource pools, passive bonuses).
- **P3**: Large surface area, moderate per-item complexity.

### Notation

`[Txx] Name (Pn) -> deps: [Tyy, Tzz]`
Each task lists: state additions, new pure functions, and test criteria.

---

### Config & Resolution Extensions

```
[T02] Crit Range Parameterization (P1) -> deps: none  ✓ done
```

**[T02] Crit Range Parameterization** *(done)*
Replace hardcoded `d20Roll == 20` crit check with `d20Roll >= critRange` in `pResolveAttack`.
Add `critRange: int` to config (default 20). Champion sets 19/18. SRD 5.2.1 Critical Hit is still natural 20; expanded crit range is a class feature (Champion Fighter).
- State: `critRange` in config
- Functions: modify `pResolveAttack`
- Test: crit on 19 with critRange=19; no crit on 19 with critRange=20; crit on 18 with critRange=18

---

### Combat Rule Extensions

```
[T10a] Cover (P1) -> deps: none  ✓ done
[T10c] Resistance Stacking & Order of Operations (P1) -> deps: none  ✓ done
[T10d] Underwater Combat — fire resistance (P3) -> deps: none  ✓ done
```

**[T10a] Cover** *(done)*
Partially implemented: `CoverType`, `coverBonus()`, `canBeTargeted()`, and attack-roll integration (`targetCoverBonus` param in `resolveAttackRoll`) already exist. Remaining: integrate cover bonus into DEX save resolution via `pSaveModifiers`. SRD 5.2.1 Cover rules unchanged: Half Cover +2 AC and DEX saves, Three-Quarters +5 (Rules-Glossary.md "Cover").
- Functions: modify `pSaveModifiers` to add cover bonus for DEX saves
- Test: half cover +2 DEX save; three-quarters +5 DEX save; cover doesn't affect non-DEX saves

**[T10c] Resistance Stacking & Order of Operations** *(done)*
Partially implemented: `applyDamageModifiers` already handles immunity->resistance->vulnerability ordering, and uses `Set[DamageType]` so multiple instances naturally count as one. Remaining: add flat-modifier support (applied before halving/doubling). SRD 5.2.1 explicitly defines the order: "adjustments such as bonuses, penalties, or multipliers are applied first; Resistance is applied second; and Vulnerability is applied third" (Playing-the-Game.md "Order of Application"). The planned flat-modifier step aligns with this.
- Functions: extend `applyDamageModifiers` (or add wrapper) to accept flat modifiers applied before resistance/vulnerability
- Test: flat bonuses applied before halving; resistance + vulnerability = apply both in order (halve then double = 1x); multiple resistance sources still count as one; example from SRD: 28 Fire damage - 5 flat = 23, halved (Resistance) = 11, doubled (Vulnerability) = 22

**[T10d] Underwater Combat — fire resistance** *(done)*
Partially implemented: attack penalties (melee disadvantage, ranged auto-miss/disadvantage) already in `AttackContext` and `pAggregateAttackMods`. Remaining: fire resistance for creatures underwater. SRD 5.2.1 simplifies: "Anything underwater has Resistance to Fire damage" (Playing-the-Game.md "Fire Resistance"). No "fully submerged" distinction — just underwater or not.
- State: use existing `isUnderwater` or equivalent field (no `isFullySubmerged` needed)
- Functions: modify damage resolution to add fire Resistance when underwater
- Test: underwater = fire Resistance; not underwater = no fire Resistance

---

### Combat Mode & Turn Lifecycle

Absorbed from PLAN_APPENDIX.md. These are foundational changes to turn structure that all other tasks depend on.

```
[TA1] Active Effect Lifecycle (P1) -> deps: none
[TA2] END_TURN Event (P1) -> deps: [TA1]
[TA3] Combat Mode Separation (P1) -> deps: [TA2]
[TA4] START_TURN Refactoring (P1) -> deps: [TA3]
```

**[TA1] Active Effect Lifecycle** *(done)*

Core spec (`dnd.qnt`) owns the lifecycle: add, remove, decrement, expiry. Knows nothing about what specific spells do. Spell-specific behavior lives in TypeScript (caller).

**Design note — clock first, wiring later.** TA1 intentionally builds only the duration clock. Spell→condition linkage (e.g., Hold Person → Paralyzed) is caller-side (PLAN_NONCORE). The clock must exist before anything can use it.

State addition to CreatureState:
```quint
type ExpiryPhase = AtStartOfTurn | AtEndOfTurn

type ActiveEffect = {
  spellId: str,
  turnsRemaining: int,    // decremented once per round at START_TURN; ≤0 = expired
  expiresAt: ExpiryPhase  // when the removal check fires (see timing analysis below)
}

// In CreatureState:
activeEffects: Set[ActiveEffect]
```

**Two-phase expiry model.** The SRD has two distinct expiry points: "until the start of your next turn" (Dodge, Shield) vs "until the end of your next turn" / "for N rounds" (Rage, Hold Person). Effects are removed at the phase matching their `expiresAt` field. Decrement happens once per round at START_TURN. See `TEMP_timing_analysis.md` for full traces.

```
START_TURN:
  1. Decrement ALL turnsRemaining by 1
  2. Remove where (expiresAt == AtStartOfTurn AND turnsRemaining ≤ 0)
  3. Process start-of-turn triggers (surviving effects only)

(acting)

END_TURN:
  1. Process end-of-turn triggers (saves, damage)
  2. Remove where (expiresAt == AtEndOfTurn AND turnsRemaining ≤ 0)
```

| Cat | SRD pattern | expiresAt | turnsRemaining | Removed at | Examples |
|-----|-------------|-----------|----------------|------------|----------|
| A | "until start of next turn" | AtStartOfTurn | 1 | START_TURN (after decrement) | Dodge, Shield, Reckless Attack, reaction cooldown |
| B | "until end of next turn" | AtEndOfTurn | 1 | END_TURN (next turn) | Rage (each extension), Ray of Sickness |
| C | "for N rounds" + end-of-turn saves | AtEndOfTurn | N | END_TURN (Nth turn) | Hold Person, Blindness/Deafness, Hypnotic Pattern |
| D | "for N rounds" + start-of-turn damage | AtEndOfTurn | N | END_TURN (Nth turn) | Searing Smite, Ensnaring Strike |
| E | concentration, no fixed trigger | AtEndOfTurn | N | END_TURN or early (conc break/save) | Spirit Guardians, Bless |

Core lifecycle functions:
- `pAddEffect(effects, spellId, durationTurns, expiresAt)` — add effect, replace existing with same spellId (no stacking)
- `pRemoveEffect(effects, spellId)` — remove by spellId (dispel, concentration break)
- `pDecrementDurations(effects)` — decrement all by 1, called at START_TURN step 1
- `pExpiredAtPhase(effects, phase)` — return effects where `expiresAt == phase AND turnsRemaining ≤ 0`
- `pClearExpiredAtPhase(effects, phase)` — remove expired effects for the given phase
- `pHasEffect(effects, spellId)` — check if active (must check `turnsRemaining > 0`)
- `pTickEffects(effects, n)` — atomic decrement-by-n + clear all expired; used out of combat

Interaction with concentration: when concentration breaks, also call `pRemoveEffect` for the concentrated spell. When new concentration starts, break old + remove old effect + add new.

Interaction with conditions: separate systems. Hold Person = `pAddEffect("hold_person", 10, AtEndOfTurn)` + `pApplyCondition(CParalyzed)`. Caller coordinates.

Out-of-combat time advance: caller calls `pTickEffects(effects, n)` where n = rounds elapsed. `expiresAt` phase is irrelevant outside combat — just decrement and clear.

Completeness criterion: any SRD spell can be expressed as a sequence of pAddEffect, condition/damage/healing primitives, START_TURN/END_TURN event args, pRemoveEffect. No spell should require new fields in CreatureState.

- Test: add effect; decrement reduces all durations; phase-aware expiry (AtStartOfTurn vs AtEndOfTurn); replace existing with same spellId; remove by spellId; concentration break removes associated effect; pTickEffects(n) clears sub-n effects; pHasEffect returns false for expired effects

**[TA1-fix] Zombie effect prevention + concentration invariant** *(P1, do before TA2)*

1. **`pHasEffect` must check `turnsRemaining > 0`** — current impl only checks existence, so expired-but-uncleared effects appear "active."
2. **`pTickEffects(effects, n)`** — atomic decrement-by-n + clear all expired. Prevents zombie effects from callers who decrement without clearing. Also serves as the out-of-combat time-advance primitive.
3. **`ActiveEffect` type needs `expiresAt: ExpiryPhase`** field — see two-phase expiry model above. Current impl has only `{ spellId, remainingTurns }`.
4. **`concentrationConsistency` invariant** — "if dead or incapacitated, `concentrationSpellId` must be empty." Safety net for the manual `pWithConcBreak` wrapping pattern: catches missing wraps during random walks.

**[TA2] END_TURN Event**

D&D 5e has no explicit "end turn" action, but "end of your turn" is a pervasive trigger point (repeated saves, ongoing damage). Modeling assumption (see ASSUMPTIONS.md).

`END_TURN` transitions `acting` -> `waitingForTurn`.

Event arguments (all pre-resolved):
```
END_TURN: {
  endOfTurnSaves: Array<{ spellId: string, saveSucceeded: boolean }>
  endOfTurnDamage: Array<{ spellId: string, damage: number, damageType: DamageType }>
}
```

Spec processes each save (removing conditions on success) and applies damage. Duration decrement happens at START_TURN, not here. **But END_TURN must also remove expired `AtEndOfTurn` effects** (step 2 in the two-phase expiry model — see TA1 timing table).

- Test: end-of-turn save success removes effect + associated condition; end-of-turn damage applied; expired AtEndOfTurn effects removed; transition from acting to waitingForTurn; can't END_TURN from waitingForTurn

**[TA3] Combat Mode Separation**

The structured round/turn/action economy is combat-only (SRD 5.2.1 Playing-the-Game "Combat"). Outside combat, GM uses minute/hour/day time. Resting requires non-combat context.

Introduce top-level combat/non-combat gate. SRD 5.2.1 MAJOR CHANGE: surprise no longer skips turns. Surprise = Disadvantage on Initiative roll, resolved before the state machine starts (Rules-Glossary.md "Initiative"). No `surprised` sub-state; no `END_SURPRISE_TURN` transition.

```
outOfCombat
  accepts: SHORT_REST, LONG_REST, SPEND_HIT_DIE, ENTER_COMBAT
inCombat
  waitingForTurn
    accepts: START_TURN -> acting
  acting
    accepts: USE_ACTION, USE_MOVEMENT, USE_BONUS_ACTION, USE_REACTION,
             USE_EXTRA_ATTACK, STAND_FROM_PRONE, DROP_PRONE,
             MARK_BONUS_ACTION_SPELL, MARK_NON_CANTRIP_ACTION_SPELL,
             END_TURN -> waitingForTurn
  EXIT_COMBAT -> outOfCombat
```

Combat-only events: USE_ACTION, USE_BONUS_ACTION, USE_REACTION, USE_MOVEMENT, USE_EXTRA_ATTACK, STAND_FROM_PRONE, DROP_PRONE, MARK_BONUS_ACTION_SPELL, MARK_NON_CANTRIP_ACTION_SPELL, START_TURN, END_TURN.

Out-of-combat-only: SHORT_REST, LONG_REST.

Always available: ADD_EXHAUSTION, REDUCE_EXHAUSTION, GRAPPLE, RELEASE_GRAPPLE, ESCAPE_GRAPPLE, SHOVE, EXPEND_SLOT, EXPEND_PACT_SLOT, SPEND_HIT_DIE, APPLY_CONDITION, REMOVE_CONDITION, damage/healing events, APPLY_STARVATION, APPLY_DEHYDRATION.

- Test: action economy events blocked out of combat; rest events blocked in combat; always-available events work in both; START_TURN only from waitingForTurn

**[TA4] START_TURN Refactoring**

Current: START_TURN accepted from any state (can be spammed). Fix:

1. Restrict: START_TURN only from `waitingForTurn` (requires END_TURN first)
2. Extended event arguments (in addition to existing):
```
START_TURN: {
  // existing: baseSpeed, callerSpeedModifier, isGrappling, grappledTargetTwoSizesSmaller
  // removed: isSurprised (surprise is pre-combat in 5.2.1)
  // new:
  deathSaveRoll?: number           // d20 result, only if hp == 0
  startOfTurnEffects: Array<{
    spellId: string
    healAmount?: number            // e.g., Regenerate 1 HP
    tempHpAmount?: number          // e.g., Heroism = casting mod
    saveResult?: boolean           // e.g., Bestow Curse WIS save
    damageAmount?: number          // e.g., ongoing aura damage
  }>
}
```
3. Two-phase effect lifecycle at START_TURN (per TA1 timing model):
   - Decrement ALL `turnsRemaining` by 1
   - Remove effects where `expiresAt == AtStartOfTurn AND turnsRemaining ≤ 0`
   - Then process start-of-turn triggers (surviving effects only)
   - (AtEndOfTurn removal happens in END_TURN — see TA2)
4. Death save integration: if hp == 0 and not stable and not dead, process deathSaveRoll as part of START_TURN.

- Test: START_TURN only from waitingForTurn; AtStartOfTurn effects removed before processing; start-of-turn effects processed for surviving effects; durations decremented; death save integrated; can't spam START_TURN

---

### ASSUMPTIONS.md Updates (from APPENDIX)

**A2: END_TURN as modeling convention**
END_TURN is an explicit event. D&D 5e has no explicit "end turn" action, but "at the end of your turn" is pervasive. Players say "I end my turn." The state machine needs a transition to prevent START_TURN spam and process end-of-turn triggers.

**A3: Round = 6 seconds as atomic time unit**
The round (6 seconds) is the smallest time unit modeled. All durations tracked as integer turn counts. No sub-round time tracking.

**A4: Single-creature turn = 1 round for duration tracking**
Each START_TURN/END_TURN cycle = one round passing. Effect durations decrement by 1 per cycle. Simplification: in multi-creature combat, initiative-order offset matters, but single-creature model can only observe own turns.

---

## Known Bugs (M2 parity gaps) — all resolved

1. ~~**Grapple + incapacitatedSources:**~~ Root cause was SRD edition mismatch: Quint used 5.2.1 save-based grapple/shove (`saveFailed: bool`), XState used 5.1 contest-based (`contestResult: ContestResult`). MBT mapped `saveFailed` to `contest` (undefined → fallback `"tie"`), so grapple/shove never succeeded via contest. Fix: migrated XState to save-based, updated MBT schemas. The incapacitatedSources divergence was a red herring symptom.

2. ~~**Concentration consistency invariant:**~~ `applyStarvation`/`applyDehydration` lacked `concBreak` when exhaustion reached level 6 (death). Fix: `exhaustionWithConcBreak` helper. Full incapacitation-path audit confirmed all paths covered.

3. ~~**hitPointDiceRemaining divergence:**~~ XState used 5.1 half-recovery on long rest; Quint used 5.2.1 full restore. Fix: `computeLongRest` → `newHitDice: totalHitDice`, removed `hitDiceRecovery`.

**Additional 5.2.1 parity fixes applied during bug investigation:**
- End-of-turn damage now handles death/unconscious/deathSave transitions (`computeEndTurn` + damageTrack `always` guards with `dead` context bridge field)
- Exhaustion no longer halves max HP (`effectiveMaxHp` simplified to identity)

---

## DAG Visualization

```
✓ [T02]-Crit Range
✓ [T10a]-Cover, [T10c]-Resistance Stacking, [T10d]-Underwater

✓ [TA1]-Active Effect Lifecycle
  ✓ [TA1-fix]-Zombie prevention + expiresAt + concentration invariant
       ✓ [TA2]-END_TURN
            ✓ [TA3]-Combat Mode
                 +--[TA4]-START_TURN Refactoring
```

## Suggested Execution Order

Next: **[TA4]** START_TURN Refactoring

### Housekeeping (no deps, do anytime)

**Extract guards to `machine-guards.ts`.**
`machine.ts` is at 413/420 lines. Guards are ~55 lines of pure `({context, event}) => boolean` functions — clean seam, no XState type issues. Extracting drops machine.ts to ~358 lines (62 lines headroom). Actions are NOT worth extracting (thin `assign()` wrappers, would add type friction).

**Cross-plan dependency:** PLAN_NONCORE.md implementation is blocked until TA3+TA4 are complete (non-core composes on combat mode + turn lifecycle primitives). See `PLAN_MIGRATION.md` for the full sequencing between core, non-core, and the 5.1→5.2.1 migration.

---

## What is NOT in this Plan

Class features, spell effects, racial traits, subclass mechanics, and feat implementations are in `PLAN_NONCORE.md`. They compose on top of the core primitives defined here and are implemented in TypeScript (caller side).

**Note:** `dnd.qnt` section 18 currently contains class-specific lookup tables (`pClassHitDie`, `pMeetsMulticlassPrereq`, `pCanMulticlass`) that are technically non-core "fluff tables" by the boundary rule. They work fine for now; consider extracting them during the 5.2.1 migration.

The core spec is complete when any SRD spell, class feature, or racial trait can be expressed as a composition of:
1. Active effect lifecycle (add/remove/decrement/expire)
2. Condition primitives (apply/remove)
3. Damage/healing primitives
4. Action economy (action/bonus/reaction/movement)
5. Modifier aggregation (advantage/disadvantage/bonuses)
6. START_TURN/END_TURN event arguments (caller-provided per-effect data)
