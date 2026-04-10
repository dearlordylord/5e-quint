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

### ~~C3. Evasion not modeled in Quint spec~~ [Implemented]

Implemented in passive-modifiers plan (Phases 1-3). `hasEvasion` on Combatant, `pApplyEvasion` in creature.qnt, `evasionDamage` in class-rogue.ts, gated on `saveAbility == Dex`.

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

### ~~C6. Dodge action not wired in battle~~ [Pre-existing, already implemented before this work]

---

### ~~C8. Ready action not modeled in battle~~ [Implemented]

Implemented in ready-action plan (Phases 1-2). `bReady`, `bReadyPass`, `bReadyRelease` actions. `BPAwaitingReadiedAction` phase. Between-turns window after LA. Readied spells deferred (see plan).

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

### C11. Missing `isIncapacitated` and `bTurnStarted` guards on battle actions [Major]

**SRD Reference:** Rules-Glossary "Incapacitated [Condition]": "An Incapacitated creature can't take any action, Bonus Action, or Reaction."

**Spec Location:** `battle.qnt` — `bAttack`, `bHeal`, `bCastSaveSpell`, `bCastAoE`, `bCastConcentrationSpell`, `bCastBonusActionSpell`, `bMove`

**Current Behavior:** These 7 battle actions guard on `not(ac.creature.dead)` and `ac.turn.actionsRemaining > 0` but do **not** check `not(isIncapacitated(ac.creature))` or `bTurnStarted`. The newly added `bDash`, `bDisengage`, `bDodge` correctly include both guards.

**Expected Behavior:** All action-spending battle actions should guard on:
1. `not(isIncapacitated(ac.creature))` — SRD requires this for any action
2. `bTurnStarted` — ensures `bStartTurn` has run (ticking effects, resetting turn state) before any action is taken

**Fix:** Add `not(isIncapacitated(ac.creature))` and `bTurnStarted` guards to all 7 existing actions. Update corresponding TS action functions with an `isIncapacitated` check (already available in `battle-machine-creature.ts`). MBT will verify parity.

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

### ~~F2. No Dash/Disengage/Dodge/Help/Hide in battle~~ [Partially implemented]

Dash, Disengage, Dodge, Ready implemented (pre-existing + ready-action plan). Help and Hide remain deferred.

---

### ~~F3. Action Surge not executed in battle~~ [Implemented]

Implemented in attack-pipeline plan Phase 3. `bActionSurge` action, `fighterState` + `fighterLevel` on Combatant.

---

### F4. Class features not wired into battle attack resolution [High Impact]

**SRD Reference:** Multiple class features modify attack damage or impose effects on hit.

**Spec Location:** All exist in `creature.qnt` as pure functions. Zero called from `battle.qnt`'s `bAttack`.

| Feature | Class | Level | Effect | Category | PRD |
|---------|-------|-------|--------|----------|-----|
| ~~**Action Surge**~~ | Fighter | 2+ | Extra action (not Magic) | Flow (changes action economy) | ~~PRD 1~~ **Done** |
| ~~**Rage damage bonus**~~ | Barbarian | 1+ | +2/+3/+4 melee damage while raging | Modifier (via `meleeDamageBonus`) + Action (`bEnterRage`) | ~~PRD 1~~ **Done** |
| ~~**Reckless Attack**~~ | Barbarian | 2+ | Advantage on STR attacks, enemies get Advantage on you | Modifier (`recklessThisTurn: bool`) + Action (`bDeclareReckless`) | ~~PRD 1~~ **Done** |
| **Sneak Attack** | Rogue | 1+ | +Nd6 damage (once/turn, needs Advantage or ally) | Flow (eligibility + once-per-turn tracking) | PRD 4 |
| **Stunning Strike** | Monk | 5+ | 1 FP on hit -> CON save or Stunned | Flow (new save -> condition interrupt) | Deferred |
| **Paladin's Smite** | Paladin | 2+ | Grants Divine Smite spell + 1 free cast/LR | Class feature (spell access) | Deferred |
| **Divine Smite** | Paladin | -- | Spell: BA + slot, extra radiant on hit, Counterspellable | Flow (spell cast -> CS window -> slot economy) | Deferred |
| **Second Wind** | Fighter | 1+ | BA -> heal 1d10+fighter level | Flow (BA + resource) | Deferred |
| **Brutal Strike** | Barbarian | 9+ | Replace Advantage -> extra d10 + push/slow | Modifier (forgo dice for effect) | Deferred |
| **Cunning Strike** | Rogue | 5+ | Forgo SA dice for Poison/Trip/Withdraw | Modifier (forgo dice for effect) | Deferred |

**Categorization rationale (see ARCHITECTURE.md "The Quint/TS Frontier"):**
- *Modifier features* modify a value in an existing pipeline. Quint models them via generic fields on Combatant; TS computes the specific values. The damage pipeline already handles arbitrary amounts, so +N from rage adds no new correctness concern.
- *Flow features* create new phases, interrupt points, or change action economy. Quint proves their multi-step interaction patterns are safe.
- Modifiers that need *dynamic toggling* (rage starts/ends, reckless declared per turn) require battle actions, making them flow-adjacent.

**Approach:** PRD 1 covers S1 (attack pipeline unification) + F5 (LA reaction chain) + F3 (Action Surge) + rage/reckless (modifier + action). Deferred items tracked here with category assignments.

---

### ~~F5. Legendary attacks bypass reaction chain~~ [Implemented]

Implemented in attack-pipeline plan Phase 2. `bLegendaryAttack` uses `resolveAttack` with `ADRAwaitingLegendaryAction` return.

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

### F11. Readied movement [Low Impact — Deferred]

*Source: historical Ready Action PRD, now available in git history*

Release grants Speed worth of movement instead of an attack. Simpler than readied attacks (no reaction chain). New `bReadyReleaseMove` action. Phase 1-2 (ready + release as attack) are implemented.

---

### F12. Readied spells with Concentration [Medium Impact — Deferred]

*Source: historical Ready Action PRD Phase 2 note, now available in git history*

Slot spent on ready, Concentration held until release. If Concentration breaks, spell fizzles (slot lost). On release, spell enters normal resolution (Counterspellable). Needs `readiedSpellParams` on Combatant to track spell parameters between ready and release.

---

### F13. Danger Sense [Low Impact — Deferred]

*Source: PRD_PASSIVE_MODIFIERS.md*

Barbarian L2: Advantage on DEX saves against effects you can see (not blinded/deafened/incapacitated). Same modifier-field pattern as Evasion/saveMiscBonus. Would need a `hasDangerSense: bool` on Combatant and advantage aggregation in save resolution.

---

### F14. Elusive [Low Impact — Deferred]

*Source: PRD_PASSIVE_MODIFIERS.md*

Rogue L18: No attack roll has Advantage against you unless you're Incapacitated. Would need an `isElusive: bool` on Combatant, checked in attack advantage aggregation.

---

## Structural Notes

### ~~S1. Unify attack transaction pipeline~~ [Implemented]

Implemented in attack-pipeline plan Phase 1. `resolveAttack` shared pure fn used by `bAttack`, `bMovementOAAttack`, `bLegendaryAttack`, `bReadyRelease`.

### S2. Fix misleading OA "can see" comment [Trivial]

*Source: Codex audit*

`battle.qnt:1655` comment says "Filter threatened to those with reaction + alive + can see mover" but the code only checks reaction + alive. The "can see" check is not implemented (spatial/visibility is out of scope). Fix the comment to match reality.

### S3. Investigate excluded concentration invariants [Minor]

*Source: Codex audit*

Three invariants are excluded from `allBattleInvariants` due to transient CS chain states. The two concentration invariants could be phase-scoped with `bSpellStack == []` as a tighter guard (only check when no pending spell resolutions). `concentrationEffectHasLivingCaster` has a note "may be a real spec bug" -- investigate root cause before phase-scoping.

---

## Performance Notes

> **IMPORTANT:** Nondet range sizes and action count in `battleStep` do NOT affect MBT performance.
> The Rust evaluator samples randomly in constant time — range cardinality is irrelevant.
> The bottleneck is the evaluator's per-step state evaluation cost with complex record types.
> See `QUINT_CONNECT_TROUBLESHOOT.md` for full analysis and measurements.

### P1. Overly broad nondeterministic spell parameters

Spell actions in `creature.qnt` nondet over raw ranges (e.g., `1.to(20)` for d20, `1.to(40)` for damage). Most parameter combinations are unrealistic (L1 spell dealing 39 damage, save DC of 3). Constraining to SRD-realistic ranges per spell level would reduce state space without losing meaningful **coverage** (not performance — see note above).

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
4. ~~**C6 + F2 + F10** (Dodge/Dash/Disengage + spell slot cap)~~ DONE
5. ~~**C11** (missing isIncapacitated + bTurnStarted guards on 7 battle actions)~~ DONE
6. ~~**C3** (Evasion)~~ DONE (PRD 3 passive modifier system, Phases 1-3)
7. ~~**PRD 1** (attack pipeline + class features)~~ DONE -- covers S1, F3, F5, rage/reckless
8. ~~**PRD 3** (passive modifier system, Evasion)~~ DONE -- covers C3
9. ~~**PRD 2** (Ready action, Phase 1)~~ DONE -- covers C8
10. ~~**PRD 4** (attack type + advantage + Sneak Attack)~~ DONE -- covers D1, F4(SA), wires advantage pipeline. PRD: `PRD_ATTACK_TYPE_AND_ADVANTAGE.md`, Plan: `PLAN_PRD4_ATTACK_TYPE_ADVANTAGE_SA.md`
11. ~~**D8** (Battle MBT broken on master — `Unknown action: bDash`)~~ DONE -- added schema + dispatch handlers for bDash/bDisengage/bDodge/bActionSurge/bEnterRage/bDeclareReckless/bReady/bReadyPass/bReadyRelease/bCastBonusActionSpell to both MBT bridges
12. ~~**D7** (MBT bridge schema gaps — `bReadyRelease` etc. missing from `battleDriverSchema`)~~ DONE -- added missing schema entries to battle-machine.mbt.test.ts
13. ~~**D5** (AttackContext divergence Quint↔TS — heavy weapon, grapple, exhaustion)~~ DONE -- aligned Quint AttackContext to 5.2.1 (wielderStrScore/wielderDexScore replace wielderSizeSmallOrTiny); added attackerGrappled/targetIsGrappler to TS; removed 5.1 exhaustion disadvantage from both TS and Quint (5.2.1 uses flat -2*level penalty, already in exhaustionPenalty)
14. ~~**PRD 3 continuation** (saveMiscBonus for Aura of Protection)~~ DONE -- covers F7.
15. **PRD 2 Phase 2** (readied spells w/ Concentration) -- covers F12. Historical details are available in git history.
16. ~~**D6** (knockOut has no TS implementation)~~ DONE -- added `knockOut: boolean` to dealDamage, dealDamageWithAfterReactions, AttackHitCtx, AttackDamageCtx, all attack events (BATTLE_ATTACK, BATTLE_LEGENDARY_ATTACK, BATTLE_READY_RELEASE, BATTLE_MOVEMENT_OA_ATTACK), resolveAttack, and both MBT bridge schemas
17. **F1** (more reactions) -- incremental, add as needed
18. ~~**S2** (fix OA comment)~~ DONE
19. ~~**S3** (investigate excluded invariants)~~ DONE (phase-scoped, added to allBattleInvariants)
20. ~~**C2** (Arcane Recovery)~~ DONE (budget constraint added)
21. ~~**C5** (Knock Out)~~ DONE (melee guard deferred to PRD 4)

---

## Discovered During Implementation (plans/README.md execution)

### D1. `meleeDamageBonus` applies to all attacks, not just melee [Medium — PRD 4]

Plan says "add `meleeDamageBonus` to damage **for melee attacks**." Implementation applies it unconditionally in `resolveAttack` because the spec has no melee/ranged distinction. PRD 4 adds `isMelee: bool` and gates `meleeDamageBonus` on it.

### ~~D2. TS battle actions don't check `turnStarted`~~ [Fixed]

Added `if (!c.turnStarted) return {}` guard to 10 TS battle action functions.

### D3. `pFighterStartTurn` heroic inspiration untested — no L10+ fighter in `bInit` [Low]

`pFighterStartTurn(fs, fighterLevel)` now receives the correct level, so heroic inspiration (L10+) logic is wired correctly. But `bInit` creature D is fighter 5, so the L10+ path is never exercised by MBT. Add a L10+ fighter to `bInit` when fighter features expand.

### D4. `spendAction("magic")` is a silent no-op when blocked [Architectural note]

`spendAction` in `battle-machine-creature.ts` returns the creature unchanged (no error, no signal) when `actionSurgeActionPending` or `ragingBlocksSpells` blocks a magic action. Callers MUST guard explicitly before calling — the function is not a guard, just a state mutator. Found when raging creatures could cast spells through the no-op.

### ~~D5. `AttackContext` divergence between Quint and TS~~ [Implemented]

*Source: PRD 4 /simplify round 2*

Quint's `AttackContext` (`creature.qnt`) and TS's `AttackContext` (`types.ts`) have structurally diverged:

- Quint has `wielderSizeSmallOrTiny` (5.1 rule); TS has `wielderStrScore`/`wielderDexScore` (5.2.1 C10 fix). Different logic for heavy weapon disadvantage.
- Quint has `attackerGrappled`/`targetIsGrappler`; TS has neither. Grapple disadvantage path exists only in Quint.
- TS has `attackerExhaustion`; Quint has no equivalent. Exhaustion disadvantage only in TS.

Currently harmless — both `buildAttackContext` (Quint) and `buildBattleAttackContext` (TS) hardcode the divergent fields to safe defaults. Will bite when grapple or heavy weapons are activated in battle.

**Fix:** Align Quint `AttackContext` to 5.2.1 (add `wielderStrScore`/`wielderDexScore`, drop `wielderSizeSmallOrTiny`; add `attackerExhaustion`). Update `pAggregateAttackMods` to match TS `aggregateAttackMods`.

### ~~D6. `knockOut` has no TS battle machine implementation~~ [Implemented]

*Source: PRD 4 implementation*

Quint `dealDamage` (`battle.qnt:409`) has full knockOut logic (checks `knockOut and kind == PC and hp > 0 and newHp == 0 and not(dead)`, calls `pKnockOut`). The TS `dealDamage` (`battle-machine-helpers.ts:111`) has no `knockOut` parameter — it always applies normal damage. The MBT bridge doesn't map `knockOut`. PRD 4 gates `knockOut` on `isMelee` in Quint but the TS gap remains.

**Fix:** Add `knockOut: boolean` parameter to TS `dealDamage` and `dealDamageWithAfterReactions`. Thread from `resolveAttack` (already has it in Quint). Add to `AttackHitCtx` (already there in Quint). Map in MBT bridge.

### ~~D7. `bReadyRelease` and other actions missing from `battleDriverSchema`~~ [Implemented]

*Source: PRD 4 MBT investigation*

`bReadyRelease`, `bActionSurge`, `bEnterRage`, `bDeclareReckless`, `bReady`, `bReadyPass` are in the MBT bridge dispatch but NOT in `battleDriverSchema`. This means their nondeterministic picks are not parsed from ITF traces — the bridge sends default fallback values instead of the actual Quint-chosen values. MBT fidelity is compromised for any trace that includes these actions.

**Fix:** Add schema entries for all dispatch-only actions.

### ~~D9. `bLegendaryAttack` — legendaryActionsRemaining off by 1~~ [Cannot Reproduce]

*Source: MBT perf research (2026-04-05)*

Cannot reproduce with seed `0x71d322b2` at 3 and 5 steps on both MBT bridges. Code inspection confirms both Quint and TS decrement `legendaryActionsRemaining` before `resolveAttack` identically. Likely fixed as a side effect of D5 (AttackContext alignment), D6 (knockOut wiring), or PRD 4 (attack pipeline).

### ~~D8. Battle MBT broken on master (`Unknown action: bDash`)~~ [Implemented]

*Source: PRD 4 verification*

`MBT_DEV=1 npx vitest run src/battle-projection.mbt.test.ts` fails with `TraceReplayError: Unknown action: bDash` on master (confirmed by stashing PRD 4 changes). The `bDash` action is in both `battleDriverSchema` and the dispatch handler, so the issue is in `@firfi/quint-connect`'s action name resolution — likely the `match bPhase` in `battleStep` reports the composite name for some actions despite the `any { }` wrapper.

**Fix:** Investigate `quint-connect` action name resolution for `match` arms. May need to wrap the `BPActiveTurn` arm differently, or update `quint-connect` to handle nested `match` → `any` patterns.

### D10. `bEnterRage` — HP mismatch on Tier 2 MBT (pre-existing)

*Source: PRD 2 Phase 2 verification (2026-04-05)*

Seed `0x1a3c4179` produces a state mismatch on `bEnterRage` (step 3). Confirmed pre-existing: same seed, same failure on master with all PRD 2 Phase 2 changes stashed. The mismatch is an HP divergence (Quint expects full HP, XState shows damage taken). Likely a barbarian-specific issue — possibly rage resistance not being applied correctly in the MBT bridge, or a `combatantResistances` mapping gap.

**Reproduce:** `QUINT_SEED=0x1a3c4179 MBT_TRACES=1 MBT_MAX_SAMPLES=1 MBT_STEPS=4 npx vitest run src/battle-projection.mbt.test.ts`

**Fix:** Debug the seed's action sequence to identify where HP diverges. Likely in the `bEnterRage` handler's `combatantResistances` mapping or the damage pipeline's resistance application.

### D12. Creature machine `START_CONCENTRATION` couples concentration with active effects — Quint does not

*Source: PRD 2 Phase 2 MBT bridge implementation (2026-04-05)*

**The problem:** The creature machine's `startConcentration` action (machine.ts line 273) does two things atomically:
1. Sets `concentrationSpellId` to the spell ID
2. Adds an `activeEffect` for the spell (via `addAe`)

Quint's `pStartConcentration` (creature.qnt) only does step 1 — it sets `concentrationSpellId`. Active effects are added separately by the caller (e.g., `resolveConcentration` adds effects to both caster and target as a distinct step).

**How we found it:** During MBT bridge implementation for `bReadySpell`, the bridge sent `START_CONCENTRATION` to start holding the readied spell with Concentration. This caused the creature machine to add a phantom `activeEffect` that Quint didn't have — the readied spell hasn't resolved yet, so no effect should exist. MBT failed with an `activeEffects` mismatch (Quint: `[]`, XState: `[{spellId: "inflict_wounds", ...}]`).

**Current workaround:** The MBT bridge sends `START_CONCENTRATION` followed by `REMOVE_EFFECT` to undo the phantom effect. This is brittle — it relies on the effect being removable and leaves a window where the creature machine has incorrect state between the two events.

**What it affects:** Any future feature that needs to start Concentration without immediately applying spell effects will hit the same issue. The creature machine has no way to express "concentrating but no active effect yet." The Quint spec correctly separates these concerns.

**Proper fix:** Split the creature machine's `START_CONCENTRATION` into two operations:
1. `START_CONCENTRATION` — only sets `concentrationSpellId` (matching Quint's `pStartConcentration`)
2. The caller adds effects via `ADD_EFFECT` (already exists as a separate event)

This would require updating `resolveConcentrationSpell` in the MBT bridge (and any direct callers) to send both events, but would eliminate the coupling and make the creature machine match Quint's separation of concerns. The `startConcentration` action in machine.ts would shrink to just `{ concentrationSpellId: Option.some(ev.spellId) }`.

### D11. `SpellSlotLevel` brand too narrow — cannot represent "no slot" (0)

*Source: PRD 2 Phase 2 implementation (2026-04-05)*

`SpellSlotLevel` is branded 1-9. `SpellCastCtx.slotLvl` and `SpellStackEntry.slotLvl` need to represent "no slot to spend/refund" (readied spell release: slot already spent at ready time). Current workaround: widened types to `SpellSlotLevel | 0`. Proper fix: make `SpellSlotLevel` a union that represents valid states — either a slot level (1-9) for a spell being cast, or 0 for a spell whose slot was pre-spent (readied spell release). This should be a branded union or a discriminated type that captures the domain semantics rather than a bare `| 0` escape hatch.
