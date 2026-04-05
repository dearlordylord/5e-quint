# Plan: PRD 4 — Attack Type, Advantage Aggregation, Sneak Attack

## Durable Decisions

- `isMelee: bool` and `isFinesse: bool` are per-attack nondeterministic parameters in Quint, per-event fields in TS.
- `attackerWithin5ft: bool`, `hostileWithin5ft: bool`, `hasAllyAdjacentToTarget: bool` are caller-provided spatial facts — nondeterministic in Quint.
- `targetCanSeeAttacker: bool`, `attackerCanSeeTarget: bool`, `frightSourceInLOS: bool` are caller-provided visibility facts — nondeterministic in Quint.
- `buildAttackContext` is a pure helper in `battle.qnt` that constructs the 30-field `AttackContext` from Combatant state + per-attack parameters. Avoids duplicating record construction in every attack action.
- `pAggregateAttackMods` from `creature.qnt` is reused as-is. No changes to creature.qnt advantage logic.
- `recklessThisTurn` on the target is an advantage source for attacks against them (RAW: "attack rolls against you have Advantage"). Needs a new field or check in `pAggregateAttackMods` or post-aggregation.
- `sneakAttackDice: int` and `sneakAttackUsedThisTurn: bool` on Combatant. SA damage is nondeterministic within Nd6 range.
- Environmental AttackContext fields (`underwater`, `beyondNormalRange`, `attackerGrappled`) hardcoded to safe defaults.
- `attackRoll: int` remains a pre-resolved number. Advantage/disadvantage do NOT affect the roll — they affect SA eligibility, autoCrit, and autoMiss.

---

## Phase 1: Attack Type Parameters + Gate Existing Features

**Slice:** Add `isMelee` and `isFinesse` to every attack action. Gate `meleeDamageBonus` on `isMelee`. Gate `knockOut` on `isMelee`. OA attacks hardcode `isMelee = true`.

**User stories:** 14, 15

### Quint changes (battle.qnt)

- Add `nondet isMelee = Bool.oneOf()` and `nondet isFinesse = Bool.oneOf()` to `bAttack`, `bLegendaryAttack`, `bReadyRelease`.
- `bMovementOAAttack`: hardcode `isMelee = true`, `isFinesse` nondeterministic.
- Pass `isMelee` to `resolveAttack`.
- In `resolveAttack`: gate `meleeDamageBonus` — `val meleeDmgBonus = if (isMelee) attacker.meleeDamageBonus else 0`.
- Gate `knockOut` — `knockOut and isMelee` in the damage path (update `dealDamage` or the check in `resolveAttack` before passing to `dealDamage`).

### TS changes

- Add `isMelee: boolean` and `isFinesse: boolean` to `BATTLE_ATTACK` event type.
- Pass through `resolveAttack`. Gate `meleeDamageBonus` and `knockOut`.
- MBT bridge: map `isMelee` and `isFinesse` from ITF trace to TS event.

### Tests

- `quint typecheck battle.qnt`
- Invariant tests: `quint test --match "inv_" dndTest.qnt`
- TS typecheck + unit tests
- MBT (dev mode): `MBT_DEV=1 npx vitest run src/battle.mbt.test.ts`

### Acceptance criteria

- [ ] `meleeDamageBonus` only applies when `isMelee = true`
- [ ] `knockOut` only triggers when `isMelee = true`
- [ ] OA attacks always have `isMelee = true`
- [ ] MBT passes (dev mode)
- [ ] Typecheck passes (Quint + TS)

---

## Phase 2: Advantage Aggregation in Battle

**Slice:** Build `AttackContext` from Combatant state + spatial nondets. Call `pAggregateAttackMods`. Use `FullAttackMods` in `resolveAttack` for `autoCrit` and `autoMiss`. Wire `recklessThisTurn` into advantage. This phase makes advantage functional — conditions now affect attack outcomes.

**User stories:** 6, 7, 8, 9, 10, 11, 12, 13, 17

### Quint changes (battle.qnt)

- Add `buildAttackContext` pure helper: takes `(cs, attackerId, targetId, isMelee, isFinesse, attackerWithin5ft, hostileWithin5ft, targetCanSeeAttacker, attackerCanSeeTarget, frightSourceInLOS)`, reads conditions from `cs.get(attackerId).creature` and `cs.get(targetId).creature`, returns `AttackContext`.
- Add nondets to each attack action: `attackerWithin5ft`, `hostileWithin5ft`, `targetCanSeeAttacker`, `attackerCanSeeTarget`, `frightSourceInLOS` (all `Bool.oneOf()`). OA: hardcode `attackerWithin5ft = true`.
- In each attack action: call `buildAttackContext(...)`, then `pAggregateAttackMods(ctx)` to get `FullAttackMods`.
- Pass `FullAttackMods` to `resolveAttack` (new parameter).
- In `resolveAttack`:
  - `autoMiss` → attack misses regardless of roll.
  - `autoCrit` → if hit, it's a critical hit regardless of roll/critRange.
  - Store `hasAdvantage`/`hasDisadvantage` for Phase 3 (SA).

### Reckless Attack wiring

- `recklessThisTurn` on attacker: advantage source when `isMelee = true`. Add to `buildAttackContext` or post-aggregation.
- `recklessThisTurn` on target: advantage source for attacks against them. Add to `buildAttackContext` as a target-side advantage source. This may require extending `AttackContext` with a `targetReckless: bool` field, or handling it post-aggregation.
- Check if `pAggregateAttackMods` needs modification to accept reckless fields, or if reckless is applied as a post-aggregation override.

### TS changes

- Port `buildAttackContext` logic to TS (or implement equivalent).
- Add spatial/visibility fields to attack events.
- Compute `FullAttackMods` in TS attack handlers.
- Apply `autoCrit`/`autoMiss` in `resolveAttack`.
- MBT bridge: map new nondets and `FullAttackMods` fields.

### Tests

- Add `dndTest.qnt` tests for `buildAttackContext` + `pAggregateAttackMods` integration: Blinded attacker → disadvantage, Prone target within 5ft → advantage, Reckless → advantage on melee + enemies get advantage.
- Battle invariants: `autoCrit` only when `(targetParalyzed or targetUnconscious) and attackerWithin5ft`.
- MBT (dev mode).

### Acceptance criteria

- [ ] `buildAttackContext` constructs `AttackContext` from Combatant conditions
- [ ] `pAggregateAttackMods` called in every attack action
- [ ] `autoCrit` forces critical hit on Paralyzed/Unconscious targets within 5ft
- [ ] `autoMiss` forces miss (when applicable)
- [ ] `recklessThisTurn` grants advantage on attacker's melee attacks
- [ ] `recklessThisTurn` grants advantage to enemies attacking the Barbarian
- [ ] Dodging target gives disadvantage to attackers
- [ ] MBT passes (dev mode)
- [ ] `/simplify` round 1

---

## Phase 3: Sneak Attack

**Slice:** Add SA fields to Combatant, eligibility check in `resolveAttack`, damage addition, once-per-turn enforcement. End-to-end: a Rogue with advantage hitting with a finesse weapon deals extra SA damage.

**User stories:** 1, 2, 3, 4, 5, 18

### Quint changes (battle.qnt)

- Add to `Combatant`: `sneakAttackDice: int`, `sneakAttackUsedThisTurn: bool`.
- Add to `mkCombatant`/`mkCaster`/`mkMonster` defaults: `sneakAttackDice: 0`, `sneakAttackUsedThisTurn: false`.
- `bStartTurn`: reset `sneakAttackUsedThisTurn` to `false`.
- `bInit`: creature A (rogue 5) gets `sneakAttackDice: 3`.
- In `resolveAttack`, after determining hit:
  ```
  val eligibleWeapon = isFinesse or not(isMelee)
  val saEligible = attacker.sneakAttackDice > 0
    and not(attacker.sneakAttackUsedThisTurn)
    and eligibleWeapon
    and (mods.hasAdvantage or (hasAllyAdjacentToTarget and not(mods.hasDisadvantage)))
  nondet saDmg = if (saEligible) attacker.sneakAttackDice.to(attacker.sneakAttackDice * 6).oneOf() else 0
  val totalDmg = baseDmg + meleeDmgBonus + saDmg
  ```
- Update attacker's `sneakAttackUsedThisTurn = true` when SA fires.
- Add `hasAllyAdjacentToTarget: bool` as nondeterministic parameter to attack actions.
- Thread `isFinesse` and `hasAllyAdjacentToTarget` to `resolveAttack`.

### TS changes

- Add `sneakAttackDice` and `sneakAttackUsedThisTurn` to `BattleCreatureState`.
- Add `hasAllyAdjacentToTarget` to attack event.
- SA eligibility check in `resolveAttack` matching Quint logic.
- SA damage computation (TS rolls actual dice, passes total).
- Reset `sneakAttackUsedThisTurn` in `battleStartTurn`.
- MBT bridge: map new Combatant fields + event field.

### Tests

- `dndTest.qnt` invariant tests:
  - SA + advantage + finesse → extra damage
  - SA + ally adjacent, no advantage, no disadvantage → extra damage
  - SA + disadvantage + ally adjacent → no SA (disadvantage blocks ally path)
  - SA + non-finesse melee → no SA
  - SA once per turn → second attack gets no SA
  - SA + crit → damage includes SA dice in doubled total
- Battle invariants: `sneakAttackUsedThisTurn implies sneakAttackDice > 0`.
- MBT (full run): `npx vitest run src/battle.mbt.test.ts`

### Acceptance criteria

- [ ] SA fires on advantage + eligible weapon
- [ ] SA fires on ally-adjacent path (no advantage, no disadvantage)
- [ ] SA blocked by disadvantage on ally-adjacent path
- [ ] SA blocked by non-finesse melee weapon
- [ ] SA once per turn enforced
- [ ] SA damage doubled on crit
- [ ] MBT passes (full run)
- [ ] `/simplify` convergence (2+ rounds)
- [ ] RAW check against `.references/srd-5.2.1/Classes/Rogue.md`

---

## Verification

1. Each phase: Quint typecheck → invariant tests → TS typecheck → TS unit tests → MBT (dev mode for phases 1-2, full for phase 3)
2. `/simplify` convergence: minimum 2 rounds after Phase 3
3. RAW check: Sneak Attack text in `Classes/Rogue.md`, Prone/Paralyzed/Unconscious in `Rules-Glossary.md`, attack type rules in `Playing-the-Game.md`
