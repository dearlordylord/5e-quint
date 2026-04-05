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
| **Sneak Attack** | Rogue | 1+ | +Nd6 damage (once/turn, needs Advantage or ally) | Modifier (`sneakAttackEligible: bool`, extra damage is +N) | Deferred |
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

*Source: PRD_READY_ACTION.md*

Release grants Speed worth of movement instead of an attack. Simpler than readied attacks (no reaction chain). New `bReadyReleaseMove` action. Phase 1-2 (ready + release as attack) are implemented.

---

### F12. Readied spells with Concentration [Medium Impact — Deferred]

*Source: PRD_READY_ACTION.md Phase 2*

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
4. ~~**C6 + F2 + F10** (Dodge/Dash/Disengage + spell slot cap)~~ DONE
5. ~~**C11** (missing isIncapacitated + bTurnStarted guards on 7 battle actions)~~ DONE
6. **C3** (Evasion) -- correctness, needs PRD 3 (passive modifier system)
7. **PRD 1** (attack pipeline + class features) -- covers S1, F3, F4, F5, F9
8. **PRD 3** (passive modifier system) -- covers C3, F7, and future passives
9. **PRD 2** (Ready action) -- covers C8
10. **F1** (more reactions) -- incremental, add as needed
15. ~~**S2** (fix OA comment)~~ DONE
16. **S3** (investigate excluded invariants) -- quality-of-proof
17. **C2** (Arcane Recovery) -- minor
18. **C5** (Knock Out) -- minor

---

## Discovered During Implementation (plans/README.md execution)

### D1. `meleeDamageBonus` applies to all attacks, not just melee [Medium]

Plan says "add `meleeDamageBonus` to damage **for melee attacks**." Implementation applies it unconditionally in `resolveAttack` because the spec has no melee/ranged distinction. When melee vs ranged is modeled, `meleeDamageBonus` must be gated on `isMelee`.

### D2. TS battle actions don't check `turnStarted` [Pre-existing tech debt]

Every Quint active-turn action guards on `bTurnStarted`. No TS action function checks `c.turnStarted`. If a caller sends `BATTLE_ATTACK` before `BATTLE_START_TURN`, TS proceeds while Quint blocks. MBT always sends start-turn first so this doesn't cause failures. Pre-existing across all actions, not introduced by this work. Related to C11.

### D3. `pFighterStartTurn` heroic inspiration untested — no L10+ fighter in `bInit` [Low]

`pFighterStartTurn(fs, fighterLevel)` now receives the correct level, so heroic inspiration (L10+) logic is wired correctly. But `bInit` creature D is fighter 5, so the L10+ path is never exercised by MBT. Add a L10+ fighter to `bInit` when fighter features expand.

### D4. `spendAction("magic")` is a silent no-op when blocked [Architectural note]

`spendAction` in `battle-machine-creature.ts` returns the creature unchanged (no error, no signal) when `actionSurgeActionPending` or `ragingBlocksSpells` blocks a magic action. Callers MUST guard explicitly before calling — the function is not a guard, just a state mutator. Found when raging creatures could cast spells through the no-op.
