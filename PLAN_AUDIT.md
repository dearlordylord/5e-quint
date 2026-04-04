# PLAN: Quint Spec Correctness & Feature Parity with SRD 5.2.1

## Correctness Fixes

### C1. Legendary Resistance spends reaction instead of LR charge [Critical]

**SRD Reference:** Rules Glossary, all monster stat blocks: "Legendary Resistance (N/Day). If the [monster] fails a saving throw, it can choose to succeed instead."

**Spec Location:** `battle.qnt:1358-1360` (`bResolveSaveFailedReaction`), also AoE path at `battle.qnt:1395`

**Current Behavior:** LR calls `spendReaction(bCreatures, reactorId)`, consuming the reactor's reaction. Does NOT call `pUseLegendaryResistance` from `creature.qnt:3444` which correctly decrements `legendaryResistancesRemaining`.

**Two bugs:**
1. `legendaryResistancesRemaining` is never decremented -- unlimited LR uses
2. LR incorrectly costs a reaction -- RAW: LR is independent of reaction economy

**Fix:**
- Call `pUseLegendaryResistance` on the reactor's `monsterResources` in both branches
- Remove `spendReaction` call from LR path
- Update eligibility check: reactor needs `legendaryResistancesRemaining > 0` (not `reactionAvailable`)
- Mirror in TS: `battle-machine-actions-spell.ts:170`

---

### C2. Arcane Recovery simplified to single-slot [Minor]

**SRD Reference:** `Classes/Wizard.md`: "choose expended spell slots to recover. The spell slots can have a combined level equal to no more than half your Wizard level (round up), and none of the slots can be level 6 or higher."

**Spec Location:** `creature.qnt:4857-4877` (`doUseArcaneRecovery`)

**Current Behavior:** `nondet slotLevel = 1.to(5).oneOf()` picks one slot level, restores one slot. No budget validation, no multi-slot recovery.

**Problems:**
- L1 Wizard can recover a L5 slot (should only get 1 level's worth)
- No multi-slot combination (e.g., L6 Wizard recovering L1+L2)
- No validation against wizard level

**Fix:**
- Add `arcaneRecoveryBudget(wizardLevel) = (wizardLevel + 1) / 2`
- Model multi-slot: nondet over valid (level, count) pairs summing to <= budget
- Validate slot is actually expended and exists in the wizard's slot table
- Alternative (simpler): keep single-slot but constrain `slotLevel <= budget`

---

### C3. Evasion not modeled in Quint spec [Major]

**SRD Reference:** `Classes/Rogue.md:113` and `Classes/Monk.md:132`: "When you're subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you instead take no damage if you succeed on the saving throw and only half damage if you fail. You can't use this feature if you have the Incapacitated condition."

**Spec Location:** Missing entirely from both `creature.qnt` and `battle.qnt`. TS feature layer has `evasionDamage()` in `app/src/features/class-rogue.ts:308`.

**Current Behavior:** `bResolveAoETarget` applies standard half-on-success. No Evasion check. All AoE save-for-half damage against Rogue/Monk L7+ is overstated.

**Fix:**
- Add `hasEvasion: bool` to `Combatant` (derived from rogueLevel >= 7 or monkLevel >= 7)
- In `bResolveAoETarget`: if `hasEvasion` and not incapacitated:
  - Save success: 0 damage (instead of half)
  - Save fail: half damage (instead of full)
- Add corresponding pure function `pEvasionDamage` to `creature.qnt`
- Wire into `bCastSaveSpell` for single-target DEX-save spells too

---

### C5. Knock Out missing from battle [Minor]

**SRD Reference:** Playing the Game, "Knocking Out a Creature": "When a melee attack would reduce a creature to 0 HP, the attacker can choose to reduce to 1 HP instead. The creature gains the Unconscious condition and starts a Short Rest."

**Spec Location:** `creature.qnt:1235` has `pKnockOut`. Not called from `battle.qnt`.

**Current Behavior:** `bAttack` applies damage via `dealDamage` with no attacker-choice branch when target hits 0 HP.

**Fix:**
- In `bAttack` damage resolution: when `pTakeDamageAsCreature` would reduce to 0 HP and attack is melee, add nondeterministic `knockOut` boolean
- If true: call `pKnockOut` instead of normal damage path
- Add melee-only guard (check weapon or attack context)

---

### C6. Dodge action not wired in battle [Major]

**SRD Reference:** Playing the Game, "Dodge": "Until the start of your next turn, any attack roll made against you has Disadvantage if you can see the attacker, and you make Dexterity saving throws with Advantage."

**Spec Location:** `creature.qnt:1253` has `dodging: bool`, `creature.qnt:1343` sets it via `ADodge`. No `bDodge` in `battle.qnt`.

**Current Behavior:** Dodge flag exists and is checked during attack modifier aggregation (`creature.qnt:1526`), but no battle action ever sets it. Creatures cannot Dodge during combat.

**Fix:**
- Add `bDodge` action to `battle.qnt`:
  - Guard: active creature, `actionsRemaining > 0`, `pCanAct`
  - Call `pUseAction(turn, creature, ADodge)` on active creature's turn state
  - Keep `bPhase' = BPActiveTurn`
- Add to `battleStep` dispatcher under `BPActiveTurn`

---

### C8. Ready action not modeled in battle [Major]

**SRD Reference:** Playing the Game, "Ready": "You take the Ready action to wait for a particular trigger before acting. When the trigger occurs, you can either take your response right after the trigger finishes or ignore the trigger. Readied spells require Concentration."

**Spec Location:** `creature.qnt:1254` has `readiedAction: bool`, `creature.qnt:1345` sets it via `AReady`. Not called from `battle.qnt`.

**Current Behavior:** Ready is fully modeled at creature level (action cost, flag) but absent from battle. Creatures can't prepare held actions.

**Fix:**
- Add `bReady` action to `battle.qnt`:
  - Guard: active creature, `actionsRemaining > 0`, `pCanAct`
  - Call `pUseAction(turn, creature, AReady)` -- sets `readiedAction: true`
  - Readied spell variant: also call `pStartConcentration` on the prepared spell
- Add reaction trigger: when `readiedAction` is true and trigger fires, creature can use reaction to execute
- This is the most complex addition -- the trigger system needs a new `PendingInterrupt` variant

---

### C9. Monk Unarmored Defense improperly stacks with shields [Critical]

*Source: Gemini audit of CODEX_QUERY.md*

**SRD Reference:** `Classes/Monk.md:72-74`: "While you aren't wearing armor **or wielding a Shield**, your base Armor Class equals 10 plus your Dexterity and Wisdom modifiers."

**Spec Location:** `creature.qnt:707-713` (`calculateAC`)

**Current Behavior:** `calculateAC` computes MonkUD as `10 + dexMod + wisMod`, then unconditionally adds `shieldBonus` (+2) at line 713. A Monk with a shield gets `10 + DEX + WIS + 2`.

**Expected Behavior:** MonkUD deactivates when wielding a shield. A Monk with a shield should use standard unarmored AC (`10 + dexMod + 2 = 12 + DEX`), not MonkUD.

**Fix:**
- In the `Unarmored` branch of `calculateAC`, when `unarmoredDef == MonkUD` and `hasShield == true`, fall back to `NoUnarmoredDefense` formula (`10 + dexMod`)
- Alternatively: compute MonkUD AC without shield AND standard AC with shield, take higher (player's choice)
- Mirror in TS: check `calculateAC` in the XState machine

---

### C10. Heavy Weapon uses 5.1 size check instead of 5.2.1 STR threshold [Major]

*Source: Gemini audit of CODEX_QUERY.md*

**SRD Reference:** `Equipment.md:52`: "You have Disadvantage on attack rolls with a Heavy weapon if it's a Melee weapon and your Strength score isn't at least 13 or if it's a Ranged weapon and your Dexterity score isn't at least 13."

**Spec Location:** `creature.qnt:759-761` (`heavyWeaponDisadvantage`)

**Current Behavior:** Checks `wielderSize == Tiny or wielderSize == Small` -- this is the **SRD 5.1 (2014)** rule.

**Expected Behavior:** SRD 5.2.1 changed Heavy to an ability score threshold: STR 13 for melee, DEX 13 for ranged. Size is no longer relevant.

**Fix:**
- Change signature to `heavyWeaponDisadvantage(weapon: Weapon, strScore: int, dexScore: int): bool`
- Check `weapon.properties.contains(Heavy) and ((weapon.isMelee and strScore < 13) or (not(weapon.isMelee) and dexScore < 13))`
- Remove size parameter
- Update all callers

---

### ~~C4. Concentration DC cap at 30~~ [Not a bug]

Validated: `pConcentrationDC` at `creature.qnt:2005-2009` already caps at 30 via `intMin(intMax(half, 10), 30)`. Matches RAW exactly.

### ~~C7. Damage at 0 HP massive damage~~ [Not a bug]

Validated: `pTakeDamageAsCreature` at `creature.qnt:1126-1172` correctly handles both "already at 0 HP" (line 1152: `dmgThrough >= effMax`) and "reduced to 0 HP overflow" (line 1164: `overflow >= effMax`). Both paths trigger instant death per RAW.

---

## Feature Gaps

### F1. Limited reaction types (8 of ~26) [High Impact]

**SRD Reference:** Various class features, spells, and monster abilities grant reactions beyond the 8 currently modeled.

**Spec Location:** `battle.qnt:44-52` (`ReactionDecision` type)

**Currently modeled:** RShield, RParry, RCuttingWords, RUncannyDodge, RCounterspell, RLegendaryResistance, RDamageReduction (Deflect Attacks), plus after-damage spell reactions (Hellish Rebuke, Fire Shield) and Retaliation.

**High-priority missing reactions (by combat frequency):**
1. **Absorb Elements** -- reaction on taking elemental damage; gain resistance + extra 1d6 melee
2. **Sentinel** -- OA on ally attack; OA reduces speed to 0; OA on Disengage
3. **War Caster** -- cast spell as OA instead of melee attack
4. **Silvery Barbs** -- on creature succeeding d20 test, force reroll; give ally Advantage
5. **Countercharm** -- already in `TriggerType` comment but not implemented
6. **Slow Fall** (Monk) -- reduce falling damage by 5x Monk level
7. **Interception** (Fighting Style) -- reduce damage to ally by 1d10+PB

**Approach:** Add new `ReactionDecision` variants incrementally. Each new reaction needs a variant, an eligibility check, and resolution logic in the matching handler.

---

### F2. No Dash/Disengage/Dodge/Help/Hide in battle [High Impact]

**SRD Reference:** Playing the Game, "Actions" section.

**Spec Location:** `battle.qnt:1921-1925` (BPActiveTurn action list). Only Attack, Magic (4 spell variants), Move, Heal, ConcentrationCheck, Start/End Turn.

| Action | Impact | Complexity | Notes |
|--------|--------|-----------|-------|
| **Dash** | High | Low | Grant extra movement = effectiveSpeed. Pure function exists in creature.qnt. |
| **Disengage** | High | Low | Set `disengaged: true`. Pure function exists. Blocks OAs. |
| **Dodge** | High | Low | Set `dodging: true`. Pure function exists. See C6. |
| **Help** | Medium | Medium | Grant Advantage on next attack vs target. Needs target tracking. |
| **Hide** | Medium | High | DC 15 Stealth -> Invisible. Needs obscurement/cover model. |

**Approach:** Dash, Disengage, Dodge are low-hanging fruit -- pure functions exist. Wire as `bDash`, `bDisengage`, `bDodge`.

---

### F3. Action Surge not executed in battle [High Impact]

**SRD Reference:** `Classes/Fighter.md`: "You can take one additional action on your turn. This action can't be the Magic action. You can use this feature only once per turn."

**Spec Location:** `creature.qnt:2407-2417` (`pUseActionSurge`). `battle.qnt` has 4 guard clauses checking `actionSurgeActionPending` (lines 966, 1439, 1532, 1840) but never triggers the feature.

**Current Behavior:** Battle prevents Magic during Action Surge (defensive guards) but never grants the extra action. The feature is phantom infrastructure.

**Fix:**
- Add `bActionSurge` battle action:
  - Guard: active creature, fighter with charges, `pCanAct`, not used this turn
  - Call `pUseActionSurge` -- increments `actionsRemaining`, sets `actionSurgeActionPending`
  - Keep `bPhase' = BPActiveTurn`
- Existing Magic-prevention guards become active and meaningful

---

### F4. Class features not wired into battle attack resolution [High Impact]

**SRD Reference:** Multiple class features modify attack damage or impose effects on hit.

**Spec Location:** All exist in `creature.qnt` as pure functions. Zero called from `battle.qnt`'s `bAttack`.

| Feature | Class | Level | Effect | Complexity |
|---------|-------|-------|--------|-----------|
| **Sneak Attack** | Rogue | 1+ | +Nd6 damage (once/turn, needs Advantage or ally) | Medium |
| **Rage damage bonus** | Barbarian | 1+ | +2/+3/+4 melee damage while raging | Low |
| **Divine Smite** | Paladin | 2+ | +Nd8 radiant on hit (spend slot, BA) | Medium |
| **Stunning Strike** | Monk | 5+ | 1 FP on hit -> CON save or Stunned | Medium |
| **Second Wind** | Fighter | 1+ | BA -> heal 1d10+fighter level | Low |
| **Reckless Attack** | Barbarian | 2+ | Advantage on STR attacks, enemies get Advantage on you | Low |
| **Brutal Strike** | Barbarian | 9+ | Replace Advantage -> extra d10 + push/slow | Medium |

**Approach:** Incremental. Start with Rage damage bonus and Reckless Attack (lowest complexity), then Sneak Attack and Divine Smite.

---

### F5. Legendary attacks bypass reaction chain [Medium Impact]

**SRD Reference:** No rule exempts Legendary Actions from triggering reactions.

**Spec Location:** `battle.qnt:1800-1826` (`bLegendaryAttack`). Calls `dealDamage` directly, transitions to `BPActiveTurn`.

**Current Behavior:** Damage applied with no hit-reaction, damage-reaction, or after-damage window. Shield, Uncanny Dodge, etc. cannot respond to LA attacks.

**Fix:**
- Refactor `bLegendaryAttack` to enter the same reaction chain as `bAttack`
- On hit: `BPAwaitingReaction(PIAttackHit(...))` with `atkReturnTo` pointing back to LA window
- Needs new `AfterDamageReturn` variant: `ADRAwaitingLegendaryAction(LAWindowCtx)`

---

### F7. Aura of Protection / Aura of Courage not in Quint spec [Medium Impact]

**SRD Reference:** `Classes/Paladin.md:135-141`:
- **L6 Aura of Protection:** Paladin + allies in 10ft add CHA mod (min +1) to all saves. Inactive if Incapacitated.
- **L10 Aura of Courage:** Immunity to Frightened while in Aura of Protection.
- **L18 Aura Expansion:** Aura becomes 30ft.

**Spec Location:** Not in `creature.qnt` or `battle.qnt`. TS features layer has full implementation in `app/src/features/class-paladin.ts:158-175`. `saveSucceeds` in `creature.qnt:543` accepts `miscBonus: int` but always receives `0`.

**Approach:**
- **Self-benefit (creature.qnt):** Add `auraOfProtectionBonus` pure def. Thread into `saveSucceeds` calls via `miscBonus`.
- **Ally benefit (battle.qnt):** During save resolution, check if any non-incapacitated Paladin L6+ exists. Since battle has no spatial model, range could be a boolean `inPaladinAura: bool` on each creature set at init.
- **Aura of Courage:** Add Frightened immunity for creatures in aura.

---

### F8. Cover mechanics not in battle [Low Impact -- Not Planned]

**SRD Reference:** Playing the Game, "Cover": Half (+2 AC/DEX saves), Three-Quarters (+5), Total (untargetable).

**Spec Location:** `creature.qnt` has `coverBonus()`, `CoverType`, `canBeTargeted()`. Not used in `battle.qnt`.

**Status:** Not planned. Cover requires spatial modeling (positional relationships) which is out of scope for the current abstract combat model. `creature.qnt` pure functions are ready if spatial modeling is added later.

---

### F9. Grapple/Shove/TWF disconnected from battle [Medium Impact]

*Source: Codex audit of CODEX_QUERY.md*

**SRD Reference:** Unarmed Strike offers damage/grapple/shove choice. Two-Weapon Fighting grants BA extra attack with Light weapons.

**Spec Location:** `creature.qnt` has `pGrapple` (L1617), `pShove` (L1634), `pCanTWFWithWeapons` (L1575), `pTWFOffHandDamage` (L1590). Zero references in `battle.qnt`.

**Current Behavior:** `bAttack` models a single generic attack with nondeterministic weapon parameters. No unarmed strike choice, no grapple/shove saves, no TWF bonus attack.

**Approach:** Add `bUnarmedStrike` (with damage/grapple/shove choice via sum type) and `bTWFAttack` (BA extra attack) to battle. Grapple/shove need the save-failed reaction path (`PISaveFailed`).

---

### F10. Battle spell slot level capped at 1-3 [Medium Impact]

*Source: Codex audit of CODEX_QUERY.md*

**Spec Location:** All four spell actions (`bCastSaveSpell:957`, `bCastAoE:1526`, `bCastConcentrationSpell:1429`, `bCastBonusActionSpell:1868`) use `nondet slotLvl = 1.to(3).oneOf()`.

**Current Behavior:** L4-9 spells are unreachable in battle MBT. This limits coverage of high-level spell interactions (Counterspell at L4+, upcasting, Mystic Arcanum).

**Fix:** Expand to `1.to(9)` or derive from caster's actual available slot levels. Guard with `pCanCastAtLevel`.

---

## Structural Notes

### S1. Unify attack transaction pipeline [Medium]

*Source: Codex audit*

`bAttack` (L668) and `bMovementOAAttack` (L1687) share ~15 lines of identical hit-resolution logic (construct `AttackHitCtx`, check eligible reactors, branch to `BPAwaitingReaction` or direct damage). Extractable to `resolveAttackHit(cs, atkCtx)` returning `{ creatures, phase }`. Would also enable F5 fix (routing LA attacks through the same chain).

### S2. Fix misleading OA "can see" comment [Trivial]

*Source: Codex audit*

`battle.qnt:1655` comment says "Filter threatened to those with reaction + alive + can see mover" but the code only checks reaction + alive. The "can see" check is not implemented (spatial/visibility is out of scope). Fix the comment to match reality.

### S3. Investigate excluded concentration invariants [Minor]

*Source: Codex audit*

Three invariants are excluded from `allBattleInvariants` due to transient CS chain states. The two concentration invariants could be phase-scoped with `bSpellStack == []` as a tighter guard (only check when no pending spell resolutions). `concentrationEffectHasLivingCaster` has a note "may be a real spec bug" -- investigate root cause before phase-scoping.

---

## Performance Notes

### P1. Overly broad nondeterministic spell parameters

Spell actions in `creature.qnt` nondet over raw ranges (e.g., `1.to(20)` for d20, `1.to(40)` for damage). Most parameter combinations are unrealistic (L1 spell dealing 39 damage, save DC of 3). Constraining to SRD-realistic ranges per spell level would reduce state space without losing meaningful coverage.

### P2. Counterspell chain inlined to depth 5

`returnToCSWindow` at `battle.qnt:1130` is manually unrolled 5 levels deep (~200 lines of near-duplicate code). Quint lacks recursion. Future: the generator/contract/spec pattern from [Emerald PR #236](https://github.com/informalsystems/emerald/pull/236) could replace this with a generator that produces valid CS chain sequences.

### P3. Hardcoded `bInit` creature count and composition

`bInit` always creates exactly 4 creatures (A=rogue5/caster, B=caster, C=monster with LA/LR, D=caster). This limits exploration to one party shape. Parameterizing count (2-6) and archetypes would improve coverage. The `Combatant` record already supports arbitrary configurations.

### P4. Frame condition boilerplate

Every action must preserve 7 state variables. `keepBattle` covers 5; actions modifying `bTurnIndex`/`bRound`/`bSpellStack`/`bTurnStarted` must write all 7 individually. Error-prone (CLAUDE.md documents a grep recipe for catching misses). A single `BattleState` record would eliminate frame conditions but requires Quint `var` workaround.

### P5. AoE target list iteration

`bResolveAoETarget` processes targets one at a time from `remaining: Set[CreatureId]`, iterating the full creature map each step. O(n^2) for full AoE at scale. Precomputing as an ordered list at cast time would make each step O(1).

### P6. OA powerset branching

*Source: Codex audit*

`bMove` at line 1642 uses `allIds.exclude(Set(activeId)).powerset().oneOf()` -- full powerset of opponent IDs. With 3 opponents: 2^3=8 subsets (manageable). With P3 expansion to 6+ creatures: 2^5=32+ subsets per move step. Would need constrained nondet if creature count grows.

---

## Verification

1. Each fix: update Quint spec -> `quint test --match "inv_" dndTest.qnt` -> update MBT bridge -> run MBT
2. `/simplify` convergence: minimum 2 rounds after implementation
3. RAW check: every change verified against `.references/srd-5.2.1/` passages cited above

## Priority Order

1. ~~**C1** (LR bug)~~ DONE
2. ~~**C9** (Monk UD + Shield)~~ DONE
3. ~~**C10** (Heavy Weapon 5.1->5.2.1)~~ DONE
4. **C6 + F2** (Dodge/Dash/Disengage) -- low complexity, high value batch
5. **C3** (Evasion) -- correctness, moderate complexity
6. **F3** (Action Surge) -- completes existing phantom infrastructure
7. **F4** (class features) -- incremental, start with Rage/Reckless
8. **S1** (unify attack pipeline) -- enables F5, reduces duplication
9. **F5** (LA reaction chain) -- moderate complexity, unlocked by S1
10. **F10** (spell slot cap 1-3 -> 1-9) -- coverage gap, small fix
11. **F9** (grapple/shove/TWF in battle) -- medium complexity
12. **C8** (Ready) -- high complexity, significant new mechanics
13. **F7** (Aura of Protection) -- requires spatial abstraction design
14. **F1** (more reactions) -- incremental, add as needed
15. ~~**S2** (fix OA comment)~~ DONE
16. **S3** (investigate excluded invariants) -- quality-of-proof
17. **C2** (Arcane Recovery) -- minor
18. **C5** (Knock Out) -- minor
