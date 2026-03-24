# D&D 5e SRD 5.1 — Non-Core Specification Plan

**Edition: SRD 5.1 (2014). Pending port to SRD 5.2.1 via PLAN_MIGRATION.md.**

Class features, spell effects, racial traits, and subclass mechanics. These compose on top of core primitives (PLAN.md / `dnd.qnt`) and are implemented in TypeScript (XState machine / caller side).

**SRD parity:** all modeled features must trace directly to SRD text. No homebrew or interpretive extensions. Where the formalization requires choices the SRD doesn't prescribe, those are documented in `ASSUMPTIONS.md`.

## BLOCKED

**All tasks below are blocked until PLAN_MIGRATION.md phases M0 + M2 + M3 complete** (M0: archive 5.1 artifacts; M2: migrate core plan to 5.2.1; M3: migrate this file to 5.2.1). Do not implement any task in this file until migration is done. Task descriptions below reflect SRD 5.1 and will change during migration.

> **NOTE — Suggestive, not prescriptive.** Function names, signatures, state fields, and type
> definitions listed in tasks below are *illustrative suggestions* to communicate intent and scope.
> The implementer decides the actual design — names, decomposition, data representations —
> and iterates freely. Treat task descriptions as "what to model," not "how to type it."

## Relationship to Core

All tasks here depend on PLAN.md core being complete (or at least the relevant primitives). Each task composes core primitives:
- Active effect lifecycle (pAddEffect/pRemoveEffect)
- Conditions (pApplyCondition/pRemoveCondition)
- Damage/healing (pTakeDamage/pHeal/pGrantTempHp)
- Action economy (pUseAction/pUseBonusAction/pUseReaction)
- Modifier aggregation (advantage/disadvantage sources)
- START_TURN/END_TURN event arguments (per-effect data)

No task here should require adding new fields to `CreatureState` or `TurnState` in `dnd.qnt`. All state specific to class features, spells, or racial traits lives in TypeScript.

### Cross-file dependencies

Tasks in PLAN.md (core): T02, T10a, T10c-e, TA1-TA4. (T10b and T10f completed, no longer in the plan.) When a task below lists a dependency like `deps: [T02]`, that task lives in PLAN.md.

All non-core tasks implicitly depend on TA1-TA4 (active effect lifecycle, turn lifecycle) being complete. Tasks that manage timed effects (Rage duration, spell durations, Sacred Weapon, etc.) directly compose on `pAddEffect`/`pRemoveEffect` from TA1. This blanket dependency is not repeated in individual task `deps:` lists.

Note: T10 (Rage) and T10a-f (Cover, etc.) share the T10 prefix but are unrelated — T10 is in this file, T10a-f are in PLAN.md.

---

## Priority Tiers

- **P1**: Directly enriches existing combat loop (attack modifiers, damage, AC, action economy). High test value.
- **P2**: Important but less interactive (resource pools, passive bonuses).
- **P3**: Large surface area, moderate per-item complexity (individual spells, invocations).
- **P4**: Small/niche (single feat, config-only traits).

---

## Config & Identity

Class-specific identity fields and lookup tables. The core spec (`dnd.qnt`) uses generic config flags (ability scores, proficiencies, features); these tasks add class/race/subclass identity that the caller uses to derive those flags.

```
[T01] Config Identity Extensions (P1) -> deps: none
[T01.5] Multiclass Proficiency Rules (P2) -> deps: [T01]
```

**[T01] Config Identity Extensions**
Extend `CharConfig` with `className`, `subclass`, `race`, `subrace`, `classLevels`, `fightingStyles`.
Extend `Feature` sum type or replace with `(class, level)` derivation.
- State: config fields only, no mutable state
- Test: construct configs for each class/race combo; verify `extraAttacksFromConfig`, `proficiencyBonus` still work

**[T01.5] Multiclass Proficiency Rules**
When multiclassing into a non-starting class, only partial proficiencies are gained (varies per class: Fighter gets armor/weapons/shields, Wizard gets nothing, etc.). Affects AC and weapon eligibility. Attacking with a non-proficient weapon: no proficiency bonus added to attack roll (NOT disadvantage). Druid restriction: will not wear metal armor or shields (config flag).
- State: `startingClass: ClassName` in config; per-class multiclass proficiency table as pure lookup
- Functions: `pMulticlassProficiencies(className) -> Set[Proficiency]`; modify attack resolution to omit proficiency bonus for non-proficient weapons (caller-side, attackBonus already pre-computed)
- Constraint: Unarmored Defense stacking (`pCanGainUnarmoredDefense`) and Extra Attack stacking (`pExtraAttackStacks`) already implemented in `dnd.qnt` section 18. Thirsting Blade doesn't add to Extra Attack (warlock-specific, enforced here)
- Test: Wizard multiclass gains no new proficiencies; Fighter multiclass gains light/medium armor + shields + simple/martial weapons; Bard multiclass gains light armor + 1 skill; attack with non-proficient weapon has no prof bonus (not disadvantage); Barbarian/Monk multiclass doesn't grant second Unarmored Defense

---

## Shared Mechanics

These are used by multiple classes. Implemented as reusable TS helpers.

```
[T03] Evasion (P1) -> deps: none
[T04] Uncanny Dodge (P1) -> deps: none
[T05] Fighting Styles (P1) -> deps: none
[T06] Bonus-Action-As-Action Pattern (P1) -> deps: none
[T07] Channel Divinity Framework (P2) -> deps: [T01]
[T08] Spell Effect Data Model (P2) -> deps: none
[T09] Land's Stride (P2) -> deps: none
```

**[T03] Evasion (shared)**
Used by Rogue 7, Monk 7, Hunter 15. `pEvasion(dexSaveSucceeded, fullDamage) -> 0 on success, floor(fullDamage/2) on fail`.
- State: `hasEvasion: bool` in config (or derived from class+level)
- Functions: `pEvasionDamage`
- Test: save success->0; save fail->half; 0 damage->0; odd damage rounds down

**[T04] Uncanny Dodge (shared)**
Used by Rogue 5, Hunter 15. Reaction: halve one attack's damage.
- State: consumes reaction (already in TurnState)
- Functions: `pUncannyDodge(damage) -> floor(damage/2)`; precondition: reaction available AND attacker is visible (can't use vs unseen attacker)
- Test: 10 damage->5; 7->3; can't use twice (reaction consumed); can't use when incapacitated; can't use vs unseen attacker

**[T05] Fighting Styles**
6 styles. Shared by Fighter/Paladin/Ranger. All PASSIVE modifiers.
- State: `fightingStyles: Set[FightingStyle]` in config
- Functions: `pArcheryAttackMod`, `pDefenseACMod`, `pDuelingDamageMod`, `pGWFReroll`, `pTWFDamageMod`, `pProtectionReaction` (caller-provided target)
- Test: Archery +2 on ranged; Defense +1 only with armor; Dueling +2 only one-handed no offhand; GWF reroll 1s/2s; TWF adds mod to offhand; Protection requires shield

**[T06] Bonus-Action-As-Action Pattern**
Generalize the pattern: "use bonus action to take Dash/Disengage/Hide" (Cunning Action, Step of the Wind, Vanish). Pure function takes `turnState` + `actionChoice` -> modified `turnState` with bonus used + action effect applied.
- Functions: `pBonusActionDash`, `pBonusActionDisengage`, `pBonusActionHide`
- Test: bonus action consumed; movement doubled (Dash); disengaged set; can't use if bonus already used

**[T07] Channel Divinity Framework**
Shared by Cleric and Paladin. Resource: 1-3 charges/short rest (scales with level). Multiple sources (multiclass) don't stack charges, but you can choose effects from either class.
- State: `channelDivinityCharges: int`, `channelDivinityMax: int`
- Functions: `pExpendChannelDivinity(state)`, `pRestoreChannelDivinity(state, config)`
- Test: expend decrements; can't expend at 0; short rest restores to max; max scales with level; multiclass doesn't double charges

**[T08] Spell Effect Data Model**
Define `SpellEffectType` sum type and `SpellData` record (name, level, school, casting time, concentration, components). Type definitions only — the foundation that T150-T161 build on. T150 implements damage pattern functions using these types.
- State: type definitions only
- Test: construct sample spells; verify field access

**[T09] Land's Stride (shared)**
Used by Ranger 8, Druid (Land) 6. Nonmagical difficult terrain costs no extra movement; nonmagical plants don't slow or damage; advantage on saves vs magical plants.
- State: `hasLandsStride: bool` in config
- Functions: modify `pMovementCost` — if hasLandsStride and nonmagical: cost=1
- Test: difficult terrain cost 1 (not 2) with Land's Stride; magical still 2

---

## Barbarian

```
[T10] Rage (P1) -> deps: [T01]
[T11] Reckless Attack (P1) -> deps: [T01]
[T12] Barbarian Passives (P2) -> deps: [T01]
[T13] Berserker (P2) -> deps: [T10]
```

**[T10] Rage**
- State: `raging: bool`, `rageCharges: int`, `rageMaxCharges: int`, `attackedHostileThisTurn: bool`, `tookDamageThisTurn: bool` (for rage-expiry tracking)
- Functions: `pEnterRage`, `pEndRage`, `pRageDamageBonus(level)->+2/+3/+4`, modify `pApplyDamageModifiers` for B/P/S resistance while raging, modify `pGetSaveModifiers` for advantage on STR saves, modify `pGetCheckModifiers` for advantage on STR checks, block spellcasting while raging; entering rage drops any active concentration spell
- Test: enter rage decrements charges; can't rage at 0 charges; can't rage in heavy armor; +2 damage at level 1; B/P/S resistance halves damage; advantage on STR saves; can't cast while raging; entering rage breaks concentration; rage ends after 1 min / no attack or damage taken / unconscious / choice

**[T11] Reckless Attack**
- State: `recklessThisTurn: bool` on TurnState
- Functions: `pDeclareReckless(turnState)`, modify `pGetOwnAttackModifiers` for advantage on melee STR attacks, modify `pGetDefenseModifiers` for advantage on attacks against until next turn
- Test: declaring reckless grants advantage on own STR melee; attacks against have advantage; resets on turn start; only melee STR (not ranged, not DEX)

**[T12] Barbarian Passives**
Danger Sense, Fast Movement, Brutal Critical, Feral Instinct, Relentless Rage, Persistent Rage, Indomitable Might, Primal Champion.
- State: `relentlessRageDC: int` (10, +5 per use)
- Functions: modify `pGetSaveModifiers` for Danger Sense (advantage DEX saves vs visible, not blinded/deaf/incap); modify `pCalculateEffectiveSpeed` for Fast Movement (+10, no heavy armor); modify `pCalculateDamage` for Brutal Critical (+1/2/3 dice on **melee** crit only at 9/13/17); `pRelentlessRage(conSaveResult, dc)->stay at 1 HP or fall`; `pIndomitableMight(strScore, rollResult)->max(strScore, rollResult)` for STR checks; Feral Instinct: advantage on initiative, can act first turn if entering rage while surprised; Persistent Rage (15th): rage only ends if unconscious or by choice (remove attack/damage-taken timer requirement); Primal Champion (20th): STR +4, CON +4, maximums raised to 24
- Test: Danger Sense advantage only when not blinded/deafened/incapacitated and effect is visible; Fast Movement +10 only without heavy armor; Brutal Critical adds correct extra dice per tier (melee only, NOT ranged crits); Relentless Rage DC increments by 5, resets to 10 on short or long rest; Indomitable Might replaces low STR check rolls; Persistent Rage at 15 doesn't expire from inaction; Primal Champion increases ability scores and caps

**[T13] Berserker**
Frenzy, Mindless Rage, Intimidating Presence, Retaliation.
- State: `frenzyActive: bool`
- Functions: `pActivateFrenzy(state)->frenzyActive during rage`, modify `pEndRage` to add exhaustion if frenzy was active, modify condition application to block charmed/frightened while raging (Mindless Rage at 6+); if already charmed/frightened on rage entry, those effects are **suspended** (not removed) for rage duration, resume when rage ends, Intimidating Presence (action, 30ft, target must be able to see or hear you, WIS save DC 8+prof+CHA, frightened until end of next turn, can extend with action each turn; 24hr immunity on success — caller-provided for multi-creature targeting) and Retaliation (14th: reaction melee attack when you take damage from creature within 5ft; consumes reaction)
- Test: Frenzy grants bonus action melee on turns AFTER activation (not same turn); ending frenzy rage +1 exhaustion; Mindless Rage blocks charmed/frightened while raging + suspends pre-existing effects (resume on rage end); exhaustion stacks; Retaliation consumes reaction, requires taking damage from creature within 5ft

---

## Fighter

```
[T20] Second Wind (P1) -> deps: [T01]
[T21] Action Surge (P1) -> deps: [T01]
[T22] Indomitable (P2) -> deps: [T01]
[T23] Champion (P1) -> deps: [T02, T05]
```

**[T20] Second Wind**
- State: `secondWindUsed: bool`
- Functions: `pSecondWind(state, config, d10Roll)->heal(1d10+fighterLevel), mark used`; precondition: not used, bonus action available
- Test: heals correct amount; can't exceed maxHp; consumes bonus action; can't use twice; resets on short rest

**[T21] Action Surge**
- State: `actionSurgeCharges: int`
- Functions: `pActionSurge(turnState)->reset actionUsed to false`; decrement charges; precondition: not already used Action Surge this turn
- Test: grants second action; can't use at 0 charges; resets on short rest; 2 charges at level 17; can only use ONE Action Surge per turn (even with 2 charges)

**[T22] Indomitable**
- State: `indomitableCharges: int`
- Functions: `pIndomitable(state, newRoll)->use new roll for save`; decrement charges
- Test: expend charge; can't at 0; resets on long rest; 1 charge at 9, 2 at 13, 3 at 17

**[T23] Champion**
Improved Critical, Remarkable Athlete, Additional Fighting Style, Superior Critical, Survivor.
- State: uses `critRange` from [T02]; additional fighting style uses [T05]
- Functions: set critRange=19 at 3, 18 at 15; `pRemarkableAthlete(profBonus, isSTRDEXCON, hasProficiency)->add ceil(profBonus/2) if not proficient` (rounds UP per SRD); `pSurvivor(state, config)->heal 5+CON mod at turn start if 0 < hp <= maxHp/2`
- Note: Fighter Extra Attack scales to 4 total attacks at level 20 (3 at 11, 4 at 20) — already modeled via `FExtraAttack` variants (FExtraAttack = 2, FExtraAttack2 = 3, FExtraAttack3 = 4 total attacks)
- Test: crit on 19 at Champion 3; crit on 18 at Champion 15; Remarkable Athlete adds ceil(half prof) only to unproficient STR/DEX/CON checks; Survivor heals at turn start only when > 0 and <= half; Survivor doesn't heal at 0 or above half

---

## Rogue

```
[T30] Sneak Attack (P1) -> deps: [T01]
[T31] Cunning Action (P1) -> deps: [T06]
[T32] Rogue Passives (P2) -> deps: [T01, T03, T04]
[T33] Thief (P3) -> deps: [T31]
```

**[T30] Sneak Attack**
- State: `sneakAttackUsedThisTurn: bool`
- Functions: `pSneakAttackDice(rogueLevel)->ceil(level/2)`, `pCanSneakAttack(hasAdvantage, allyAdjacentAndNotIncapacitated, isFinesse, isRanged)->bool`, `pApplySneakAttack(state, diceResult)->add damage + mark used`
- Test: correct dice count per level (1d6 at 1, 5d6 at 9, 10d6 at 19); requires finesse or ranged; requires advantage OR non-incapacitated ally adjacent to target; only once per turn; resets on turn start

**[T31] Cunning Action**
Uses [T06] pattern. Rogue 2+: Dash/Disengage/Hide as bonus action.
- Functions: `pCunningAction(turnState, choice)` — delegates to [T06] functions
- Test: each of three options works as bonus; can't use if bonus already used; requires Rogue 2+

**[T32] Rogue Passives**
Expertise (double prof on 2 skills at 1st, 2 more at 6th), Evasion [T03], Uncanny Dodge [T04], Reliable Talent, Slippery Mind, Elusive, Blindsense, Stroke of Luck.
- State: `strokeOfLuckUsed: bool`
- Functions: `pReliableTalent(d20, isProficient)->max(10, d20) if proficient`; modify `pGetDefenseModifiers` for Elusive (no advantage on attacks against, unless incapacitated); `pStrokeOfLuck()->turn missed attack into hit, OR treat failed ability check as 20 (NOT saves)`; Slippery Mind (15th): add WIS save proficiency
- Test: Reliable Talent replaces 9->10 but not 11->11; Elusive cancels advantage from all sources; Stroke of Luck only on missed attack or failed ability check (not saves), resets on short rest; Blindsense is config flag (caller-provided)

**[T33] Thief**
Fast Hands (Use Object, disarm trap/open lock with thieves' tools, or Sleight of Hand check as bonus via Cunning Action), Second-Story Work (climbing free, jump +DEX), Supreme Sneak (advantage Stealth if <= half speed), Use Magic Device (config flag), Thief's Reflexes (17th: two turns in first round at normal initiative and initiative-10; can't use if surprised).
- Functions: modify `pMovementCost` for climbing cost=1 with Second-Story Work; modify jump distance +DEX mod; Fast Hands extends Cunning Action options to include Use Object
- Test: climbing cost 1 (not 2); jump distance increased by DEX mod; Fast Hands adds Use Object to Cunning Action; Thief's Reflexes is caller-managed (initiative ordering)

---

## Monk

```
[T40] Ki Pool (P1) -> deps: [T01]
[T41] Martial Arts (P1) -> deps: [T01]
[T42] Ki Actions (P1) -> deps: [T40, T06]
[T43] Stunning Strike (P1) -> deps: [T40]
[T44] Monk Passives (P2) -> deps: [T01, T03]
[T45] Monk Reactions (P2) -> deps: [T40]
[T46] Open Hand (P2) -> deps: [T42]
```

**[T40] Ki Pool**
- State: `kiPoints: int`, `kiMax: int`
- Functions: `pExpendKi(state, cost)`, `pRestoreKi(state, config)` (short rest -> full)
- Test: expend decrements; can't expend below 0; short rest restores to max=monk level; Perfect Self (20): regain 4 on initiative if 0

**[T41] Martial Arts**
- State: none new (derived from class+level)
- Functions: `pMartialArtsDie(monkLevel)->d4/d6/d8/d10`; modify attack to allow DEX for unarmed/monk weapons; bonus action unarmed strike after Attack action with unarmed strike or monk weapon (no Ki cost)
- Test: d4 at 1, d6 at 5, d8 at 11, d10 at 17; DEX used for unarmed; bonus action unarmed requires Attack action with unarmed/monk weapon (not any weapon)

**[T42] Ki Actions**
Flurry of Blows (1 Ki: 2 unarmed as bonus, replaces Martial Arts bonus), Patient Defense (1 Ki: Dodge as bonus), Step of the Wind (1 Ki: Dash or Disengage as bonus + double jump).
- Functions: `pFlurryOfBlows(state, turnState)`, `pPatientDefense(state, turnState)`, `pStepOfTheWind(state, turnState, choice)`; all consume 1 Ki + bonus action via [T06]
- Test: each costs 1 Ki; each consumes bonus action; Flurry replaces Martial Arts bonus (can't do both); Patient Defense sets dodging; Step of the Wind doubles jump distance

**[T43] Stunning Strike**
1 Ki on melee weapon hit. Target CON save or stunned until end of your next turn.
- Functions: `pStunningStrike(state, targetSaveResult)->expend Ki; if fail: stunned (caller applies)`
- Test: costs 1 Ki; only on melee hit; target stunned on fail; not stunned on success; can use multiple times per turn (each costs Ki)

**[T44] Monk Passives**
Unarmored Movement (+10->+30 speed by level), Ki-Empowered Strikes (magical unarmed at 6), Evasion [T03], Stillness of Mind (action: end charmed/frightened), Purity of Body (immune disease/poison at 10), Tongue of the Sun and Moon (13th: understand all spoken languages — config flag), Diamond Soul (all save prof at 14 + Ki reroll), Timeless Body (15th: age slowly, no food/water — config flag), Empty Body.
- State: derived from level
- Functions: modify `pCalculateEffectiveSpeed` for Unarmored Movement; `pStillnessOfMind(state)->remove charmed+frightened, consume action`; `pDiamondSoulReroll(state, newRoll)->precondition: save failed; expend 1 Ki, use new save result`; `pEmptyBody(state, turnState)->consumes action + 4 Ki, gain invisible + all resistance except force`; also: 8 Ki option -> cast astral projection without material components (largely out of combat scope, noted for completeness)
- Test: speed bonus +10 at 2, +15 at 6, +20 at 10, +25 at 14, +30 at 18; Stillness of Mind consumes action; Diamond Soul: proficient in all saves at 14+, Ki reroll only after failed save; Empty Body costs 4 Ki + action

**[T45] Monk Reactions**
Deflect Missiles (reduce ranged damage by 1d10+DEX+level; throw back for 1 Ki if reduced to 0), Slow Fall (reduce fall damage by 5*level).
- Functions: `pDeflectMissiles(state, config, d10, incomingDamage)->reduced damage by 1d10+DEX+level; if 0: can throw back for 1 Ki as part of same reaction (ranged attack, proficient, monk weapon, 20/60 range)`; `pSlowFall(state, config, fallDamage)->max(0, fallDamage - 5*level)`
- Test: Deflect reduces correctly; throw-back costs 1 Ki and requires reduction to 0; Slow Fall at level 4 reduces by 20; both consume reaction

**[T46] Open Hand**
Open Hand Technique (on Flurry hit: DEX save->prone, STR save->pushed 15ft, or no reactions until end of next turn), Wholeness of Body (heal 3*level, 1/long rest), Tranquility (11th: Sanctuary effect after each long rest, WIS save DC 8+WIS+prof to attack you, ends if you attack/cast on hostile), Quivering Palm (3 Ki on unarmed hit; later trigger: CON save or 0 HP or 10d10 necrotic).
- State: `wholenessOfBodyUsed: bool`, `quiveringPalmActive: bool`, `tranquilityActive: bool`
- Functions: `pOpenHandTechnique(choice, targetSaveResult)`, `pWholenessOfBody(state, config)->heal 3*level`, `pTransquility(state)->set active after long rest; ends on hostile action`, `pQuiveringPalm(state)->expend 3 Ki, mark active`, `pTriggerQuiveringPalm(targetSaveResult)->0 HP or 10d10`
- Test: each Open Hand choice validated; Wholeness heals correct amount, 1/long rest; Tranquility active after long rest, ends on attack/spell; Quivering Palm costs 3 Ki; trigger is save-or-die

---

## Paladin

```
[T60] Lay on Hands (P1) -> deps: [T01]
[T61] Divine Smite (P1) -> deps: [T01]
[T62] Paladin Passives (P2) -> deps: [T01, T07]
[T63] Oath of Devotion (P2) -> deps: [T07]
```

**[T60] Lay on Hands**
- State: `layOnHandsPool: int`
- Functions: `pLayOnHands(state, amount)->heal up to amount from pool`; `pLayOnHandsCure(state)->spend 5 from pool to cure one disease or poison`
- Test: heal correct amount; pool decrements; can't exceed pool; cure costs 5; resets on long rest; pool = paladin level * 5

**[T61] Divine Smite**
On melee weapon hit, expend spell slot: +2d8 radiant (+1d8 per slot above 1st; +1d8 vs undead/fiend; max 5d8 from slot, but undead/fiend bonus can push to 6d8 total).
- Functions: `pDivineSmiteDamage(slotLevel, isUndeadOrFiend)->dice count`; integrate with slot expenditure
- Test: 1st slot->2d8; 2nd->3d8; 4th slot->5d8 (cap from slot); 4th slot vs undead->6d8 (5+1); Improved Divine Smite (11+): always +1d8 radiant on melee

**[T62] Paladin Passives**
Divine Health (immune disease), Divine Sense (1st: action, detect celestials/fiends/undead within 60ft; 1+CHA mod uses/long rest), Aura of Protection (6th: +CHA mod to all saves for self, minimum bonus of +1; 10ft range for allies — caller-provided for allies; extends to 30ft at 18th; must be conscious), Aura of Courage (10th: immune to frightened for self; 10ft allies caller-provided; 30ft at 18th; must be conscious), Improved Divine Smite (+1d8 radiant on all melee weapon hits at 11; owned by T62, stacks with T61 Divine Smite when both used), Cleansing Touch (end spell, max(CHA mod, 1) charges/long rest).
- State: `divineSenseCharges: int`, `cleansingTouchCharges: int`
- Functions: modify `pApplyCondition` to block disease for Divine Health; Aura of Protection: modify `pGetSaveModifiers` to add CHA mod to own saves while conscious; Improved Divine Smite modifies damage calc; `pCleansingTouch(state)->decrement charges`
- Test: Divine Sense charges = 1+CHA mod, resets long rest; disease immunity; Aura of Protection adds CHA mod (min +1) to own saves (self-buff portion); Improved Divine Smite adds 1d8 to every melee hit at 11+; Cleansing Touch charges = max(CHA mod, 1)

**[T63] Oath of Devotion**
Sacred Weapon (Channel Divinity: +CHA to attacks for 1 min, weapon emits light), Turn the Unholy (Channel Divinity: action, 30ft, WIS save, turned 1 min or until damage — caller-provided for multi-creature targeting), Aura of Devotion (7th: self + 10ft allies can't be charmed while conscious; 30ft at 18th — self portion modeled, ally portion caller-provided), Purity of Spirit (15th: permanent protection from evil/good effect — NO concentration unlike the spell; aberrations/celestials/elementals/fey/fiends/undead have **disadvantage on attack rolls against you**; can't be charmed/frightened/possessed by them), Holy Nimbus (20th: 10 radiant to enemies at turn start within 30ft bright light, advantage on saves vs fiend/undead spells, 1/long rest, 1 min).
- State: `sacredWeaponActive: bool`, `holyNimbusActive: bool`, `purityOfSpiritActive: bool`
- Functions: `pSacredWeapon(state)->expend Channel Divinity, set active`; modify `pResolveAttack` for +CHA (min +1) while active; ends if weapon dropped or unconscious; Purity of Spirit: modify defense/save modifiers vs listed creature types
- Test: Sacred Weapon adds CHA mod to attacks; consumes Channel Divinity; ends if weapon dropped or wielder falls unconscious; Purity of Spirit blocks charm/frighten/possession from specific types; Holy Nimbus is 1/long rest

---

## Ranger

```
[T70] Ranger Passives (P2) -> deps: [T01, T05, T09]
[T71] Hunter (P2) -> deps: [T01, T03, T04]
```

**[T70] Ranger Passives**
Favored Enemy (config flag, caller bonuses), Natural Explorer (config flag), Fighting Style [T05], Primeval Awareness (3rd: expend spell slot to detect aberrations/celestials/dragons/elementals/fey/fiends/undead within 1mi or 6mi in favored terrain, for 1 min per slot level — minimal state, mostly caller-provided), Land's Stride [T09], Hide in Plain Sight (10th: 1 min camouflage, +10 Stealth vs solid surface; breaks on move/action/reaction), Vanish (Hide as bonus at 14), Feral Senses (no disadvantage from unseen at 18; aware invisible 30ft if not hidden/blinded/deafened), Foe Slayer (+WIS to attack or damage vs favored, 1/turn at 20).
- State: `hideInPlainSightActive: bool`
- Functions: modify `pGetOwnAttackModifiers` for Feral Senses (remove unseen disadvantage); `pFoeSlayer(config, wisMod, isFavoredEnemy)->+WIS to attack or damage if favored enemy`; Vanish uses [T06] Hide-as-bonus pattern; `pHideInPlainSight(state)->+10 Stealth, set active; breaks on move/action/reaction`; Primeval Awareness consumes spell slot (state change only)
- Test: Feral Senses removes disadvantage from unseen; Foe Slayer adds WIS mod; Vanish is bonus action Hide; Hide in Plain Sight +10 breaks on movement

**[T71] Hunter**
Choose-one features per tier (mutually exclusive at each level). Each tier is a separate enum choice in config.

3rd — Hunter's Prey (choose ONE): Colossus Slayer (+1d8 if target < max HP, 1/turn), Giant Killer (reaction attack after Large+ creature within 5ft hits/misses you), Horde Breaker (extra attack on different creature within 5ft of original target).

7th — Defensive Tactics (choose ONE): Escape the Horde (OAs against you have disadvantage), Multiattack Defense (+4 AC after creature hits you, vs subsequent attacks from same creature this turn), Steel Will (advantage on saves vs frightened).

11th — Multiattack (choose ONE): Volley (ranged attack each creature within 10ft of point in range — caller-provided), Whirlwind Attack (melee attack each creature within 5ft — caller-provided).

15th — Superior Hunter's Defense (choose ONE): Evasion [T03], Stand Against the Tide (reaction: redirect missed melee — caller-provided), Uncanny Dodge [T04].

- State: `hunterPrey: HunterPreyChoice`, `defensiveTactic: DefensiveTacticChoice`, `multiattack: MultiattackChoice`, `superiorDefense: SuperiorDefenseChoice` — all enums in config
- Functions: `pColossusSlayer(targetBelowMax)->+1d8`; `pHordeBreaker(turnState)->grant one extra attack`; `pMultiattackDefense(alreadyHitBySameCreature)->+4 AC`; modify saves for Steel Will; modify OA for Escape the Horde
- Test: Colossus Slayer only when target < max HP, 1/turn; Multiattack Defense +4 AC activates after first hit from same creature; each tier choice is mutually exclusive

---

## Bard

```
[T80] Bardic Inspiration + Jack of All Trades (P2) -> deps: [T01]
[T81] Lore (P3) -> deps: [T80]
```

**[T80] Bardic Inspiration + Jack of All Trades + Countercharm + Song of Rest**
- State: `bardicInspirationCharges: int`
- Functions: `pBardicInspirationDie(level)->d6/d8/d10/d12`; `pExpendInspiration(state)->decrement`; `pJackOfAllTrades(profBonus, hasProficiency)->if not proficient: +floor(profBonus/2)`; Countercharm (6th): action, advantage on saves vs charmed/frightened until end of next turn; Song of Rest (2nd): `pSongOfRestDie(bardLevel)->d6/d8/d10/d12` at 2/9/13/17; Superior Inspiration (20): regain 1 if 0 at initiative; Expertise (3rd: double prof on 2 skills, 2 more at 10th — config)
- Test: correct die at each tier; charges = max(CHA mod, 1); recharge long rest (short at 5+); Jack adds half prof to unproficient checks only; Song of Rest die scales; Superior Inspiration triggers when 0 charges

**[T81] Lore**
Peerless Skill (spend inspiration on own check at 14), Cutting Words (reaction, subtract inspiration die from enemy attack/ability/damage; immune if can't hear or charm-immune). Bonus Proficiencies (3 skills) and Additional Magical Secrets are config.
- Functions: `pPeerlessSkill(state, dieRoll)->add die to own check, expend charge`
- Test: Peerless Skill adds die and expends charge; can't use at 0 charges

---

## Cleric

```
[T90] Cleric Base (P2) -> deps: [T01, T07]
[T91] Life Domain (P2) -> deps: [T90]
```

**[T90] Cleric Base**
Turn Undead (Channel Divinity: action, 30ft, WIS save, turned 1 min or until damage — caller-provided), Destroy Undead (CR threshold by level — caller-provided), Divine Intervention (d100 check — caller-provided).
- Functions: `pDestroyUndeadCR(clericLevel)->0.5/1/2/3/4`; Channel Divinity from [T07]
- Test: CR thresholds at correct levels; Channel Divinity charges correct

**[T91] Life Domain**
Disciple of Life (+2+spell level to healing), Preserve Life (Channel Divinity: distribute up to 5x cleric level HP, each restored to at most half max HP — caller-provided), Blessed Healer (self-heal 2+spell level when healing others), Divine Strike (1d8/2d8 radiant at 8/14), Supreme Healing (max healing dice at 17).
- Functions: `pDiscipleOfLife(spellLevel)->2+spellLevel`, `pPreserveLife(clericLevel)->pool = 5*clericLevel`, `pBlessedHealer(spellLevel, targetIsSelf)->if !self: 2+spellLevel`, `pDivineStrike(clericLevel)->1d8 at 8, 2d8 at 14`, `pSupremeHealing(dice, dieSize)->dice*dieSize`
- Test: Disciple correct bonus; Preserve Life pool = 5*level, each target capped at half max HP; Divine Strike 1/turn; Supreme Healing returns max

---

## Druid

```
[T100] Wild Shape Framework (P1) -> deps: [T01]
[T101] Circle of the Land (P3) -> deps: [T01, T09]
```

**[T100] Wild Shape Framework**
Transform: replace STR/DEX/CON/HP/AC/speed with beast form; retain INT/WIS/CHA/proficiencies/features. Damage overflow on revert. Reverts on 0 HP, unconscious, or death. Does NOT break concentration. Can't cast until Beast Spells 18 (V/S only). Max CR: 1/4 at 2nd, 1/2 at 4th, 1 at 8th+. Duration = floor(druidLevel/2) hours. 2 charges/short rest (unlimited at 20). Archdruid (20th): ignore V/S/non-costly-M on druid spells.
- State: `wildShapeCharges: int`, `inWildShape: bool`, `wildShapeHp: int`, `wildShapeMaxHp: int`, `originalHp: int`, `archdruidActive: bool`
- Functions: `pEnterWildShape`, `pWildShapeDamage(state, amount)->if beast HP 0: revert + overflow`, `pExitWildShape`, `pCanWildShape(config, cr, hasSwim, hasFly)->prereq check`
- Test: entering stores original HP; overflow carries; revert restores; CR prereqs enforced; can't cast while shifted (except Beast Spells 18); charge decrement; short rest restores

**[T101] Circle of the Land**
Natural Recovery (recover slots on short rest, up to half druid level rounded up, no 6th+, 1/long rest), Circle Spells (config), Land's Stride [T09], Nature's Ward (immune charm/fright from fey/elemental, immune poison/disease at 10), Nature's Sanctuary (14th: WIS save or pick different target — caller-provided).
- State: `naturalRecoveryUsed: bool`
- Functions: `pNaturalRecovery(state, config, slotsToRecover)->validate total <= ceil(druidLevel/2), none 6th+`; modify condition resistance for Nature's Ward
- Test: Natural Recovery validates slot total; Nature's Ward blocks specific condition sources

---

## Sorcerer

```
[T110] Sorcery Points + Flexible Casting (P1) -> deps: [T01]
[T111] Metamagic (P1) -> deps: [T110]
[T112] Draconic Bloodline (P2) -> deps: [T01]
```

**[T110] Sorcery Points + Flexible Casting**
- State: `sorceryPoints: int`
- Functions: `pConvertSlotToPoints(state, slotLevel)->gain 1-5 points`; `pConvertPointsToSlot(state, slotLevel)->spend 2-7 points, create slot (max 5th, vanish on long rest)`
- Test: correct costs; can't create above 5th; can't overspend; resets on long rest; Sorcerous Restoration (20): +4 on short rest

**[T111] Metamagic**
8 options. Learns 2 at 3rd, 1 more at 10th, 1 more at 17th (4 total). Only one per spell EXCEPT Empowered which can combine.
- Quickened (2 SP->bonus action cast), Empowered (1 SP->reroll up to CHA mod damage dice), Heightened (3 SP->disadvantage on first save), Subtle (1 SP->no V/S), Careful (1 SP->chosen creatures auto-succeed save), Distant (1 SP->double range), Extended (1 SP->double duration max 24h), Twinned (spell level SP, min 1->second target, single-target only)
- State: `metamagicKnown: Set[Metamagic]`
- Functions: one per metamagic
- Test: each costs correct SP; Quickened triggers bonus action spell rule; only one per spell except Empowered; Twinned cost = spell level (min 1)

**[T112] Draconic Bloodline**
Draconic Resilience (13+DEX AC unarmored, +1 HP/level), Elemental Affinity (+CHA damage for ancestry type at 6; 1 SP->resistance for 1 hour), Dragon Wings (bonus action fly at 14; can't in non-accommodating armor), Draconic Presence (5 SP: charm/fear aura, concentration — caller-provided).
- **Core dependency:** Draconic Resilience requires adding a `DraconicUD` variant to `UnarmoredDefense` type in `dnd.qnt` (currently only `NoUnarmoredDefense | BarbarianUD | MonkUD`) and a corresponding case in `calculateAC`.
- State: `draconicAncestryType: DamageType`, `dragonWingsActive: bool`
- Functions: modify AC for Draconic Resilience (13+DEX); modify max HP; `pElementalAffinity(config, spellDamageType)->+CHA if match`; `pDragonWings->set fly speed = walk speed`
- Test: AC = 13+DEX without armor; +1 HP per sorcerer level; Elemental Affinity only matching type; Dragon Wings blocked by non-accommodating armor

---

## Warlock

```
[T120] Warlock Resources (P2) -> deps: [T01]
[T121] Invocations (P2) -> deps: [T120]
[T122] The Fiend (P2) -> deps: [T120]
```

**[T120] Warlock Resources**
Mystic Arcanum (1 each of 6th-9th/long rest), Pact of the Blade/Tome/Chain, Eldritch Master (1/long rest: regain all pact slots).
- State: `mysticArcanumUsed: Set[int]`, `pactBoon: PactBoon`
- Functions: `pExpendMysticArcanum(state, level)`, `pCreatePactWeapon(state)`, `pEldritchMaster(state)`
- Test: Arcanum 1/long rest per level; Pact Blade proficient+magical; Eldritch Master restores pact slots only

**[T121] Invocations**
Combat: Agonizing Blast (+CHA to EB per beam), Lifedrinker (+CHA necrotic on pact weapon), Thirsting Blade (Extra Attack with pact weapon), Repelling Blast (push 10ft per beam), Eldritch Spear (EB range 300ft). Defensive: Armor of Shadows (Mage Armor at will), Fiendish Vigor (False Life at will), Devil's Sight (120ft darkness), One with Shadows (invisible in dim/dark). Spell access: config/at-will.
- State: `invocations: Set[Invocation]`
- Functions: modify damage for Agonizing Blast/Lifedrinker; modify AC for Armor of Shadows; Thirsting Blade grants extra attack
- Test: Agonizing Blast adds CHA per beam; Lifedrinker adds CHA necrotic; Thirsting Blade requires Pact of Blade + level 5+

**[T122] The Fiend**
Dark One's Blessing (temp HP on kill = CHA+warlock level), Dark One's Own Luck (d10 to check/save, 1/short rest), Fiendish Resilience (choose resistance type on rest; bypassed by magical/silvered), Hurl Through Hell (10d10 psychic to non-fiends, 1/long rest).
- State: `darkOwnLuckUsed: bool`, `fiendishResistanceType: DamageType`, `hurlUsed: bool`
- Functions: `pDarkOnesBlessing(config)->temp HP`; `pDarkOnesOwnLuck(state, d10)->add to check/save`; `pFiendishResilience(state, type)->set resistance`; `pHurlThroughHell(state)->10d10 psychic`
- Test: Blessing correct temp HP, only on kill; Own Luck resets on short rest; Resilience bypassed by magical/silvered; Hurl 1/long rest

---

## Wizard

```
[T130] Arcane Recovery (P2) -> deps: [T01]
[T131] Evocation (P2) -> deps: [T130]
```

**[T130] Arcane Recovery**
1/long rest on short rest: recover slots totaling <= ceil(wizard level/2), no 6th+. Spell Mastery (18): chosen 1st+2nd at lowest level without slot. Signature Spells (20): 3rd-level 1/short rest each.
- State: `arcaneRecoveryUsed: bool`, `spellMasterySlots: Set[int]`, `signatureSpellsUsed: Set[str]`
- Functions: `pArcaneRecovery(state, config, slotsToRecover)->validate sum <= ceil(level/2), none 6th+`
- Test: can't recover 6th+; total <= ceil(half wizard level); once per long rest

**[T131] Evocation**
Sculpt Spells (choose up to 1+spell level creatures for auto-succeed+0 damage — caller-provided), Potent Cantrip (half damage on save success instead of 0), Empowered Evocation (+INT mod to one damage roll of wizard evocation spell), Overchannel (max damage on 1st-5th wizard damage spell; self-necrotic on repeat: increasing d12 per prior use, bypasses resistance).
- State: `overchannelUseCount: int`
- Functions: `pPotentCantrip(fullDamage)->floor(fullDamage/2)` on save success; `pEmpoweredEvocation(config, damage)->damage + INT mod`; `pOverchannel(state, diceCount, dieSize)->diceCount*dieSize`
- Test: Potent Cantrip half on save; Empowered adds INT to one roll; Overchannel any wizard damage spell 1st-5th; first free, second costs 2d12/level

---

## Racial Traits

```
[T140] Combat Racial Traits (P2) -> deps: [T01]
[T141] Racial Save/Resistance Modifiers (P2) -> deps: [T01]
```

**[T140] Combat Racial Traits**
Small Size Heavy Weapon Disadvantage, Half-Orc Relentless Endurance (1 HP instead of 0, 1/long rest), Half-Orc Savage Attacks (extra weapon die on melee crit), Halfling Lucky (reroll nat 1 on any d20), Dragonborn Breath Weapon (scaling 2d6-5d6, 1/short rest, save DC = 8+CON+prof), Halfling Nimbleness (move through larger creature's space).
- State: `relentlessEnduranceUsed: bool`, `breathWeaponUsed: bool`
- Functions: per trait
- Test: per trait (see original PLAN for full test criteria)

**[T141] Racial Save/Resistance Modifiers**
Dwarven Resilience (advantage poison saves + poison resistance), Dwarf Heavy Armor Speed, Fey Ancestry (advantage charm saves + sleep immunity), Gnome Cunning (advantage INT/WIS/CHA saves vs magic), Halfling Brave (advantage vs frightened), Tiefling Hellish Resistance (fire resistance), Dragonborn Damage Resistance, Hill Dwarf Toughness (+1 HP/level), Tiefling Infernal Legacy (racial spells 1/long rest).
- State: `infernalLegacyHellishRebukeUsed: bool`, `infernalLegacyDarknessUsed: bool`
- Functions: modify saves/damage for each
- Test: per trait (see original PLAN for full test criteria)

---

## Spell Effects

```
[T150] Spell Data Model + Damage Patterns (P2) -> deps: [T08]
[T151] Healing Spells (P2) -> deps: [T08]
[T152] AC/Defense Buff Spells (P1) -> deps: [T08]
[T153] Condition Debuff Spells (P1) -> deps: [T08]
[T154] Condition Buff Spells (P2) -> deps: [T08]
[T155] Condition Removal Spells (P2) -> deps: [T08]
[T156] Stat Buff/Debuff Spells (P3) -> deps: [T08]
[T157] Temp HP Spells (P3) -> deps: [T08]
[T158] Revive Spells (P3) -> deps: [T08]
[T159] Cantrip Scaling (P2) -> deps: [T08]
[T160] Power Words (P3) -> deps: [T08]
[T161] Polymorph (P3) -> deps: [T100]
```

All spell tasks implement spell-specific behavior in TypeScript. Each spell is expressed as a composition of core primitives (active effect lifecycle, conditions, damage/healing, action economy). See original PLAN for full per-spell specifications.

**[T150] Damage Patterns**
Implement 4 damage patterns using T08 types: save-for-half, attack-roll, auto-hit (Magic Missile), save-or-nothing. Plus repeatable attack spells (Vampiric Touch, Spiritual Weapon, Flame Blade, Call Lightning, Moonbeam, Spirit Guardians, Counterspell, Disintegrate, Arcane Sword).

**[T151] Healing Spells**
Cure Wounds, Healing Word, Prayer of Healing, Mass Cure Wounds, Heal, Mass Heal, Spare the Dying, Goodberry, Beacon of Hope, Regenerate.

**[T152] AC/Defense Buff Spells**
Shield, Mage Armor, Shield of Faith, Barkskin, Fire Shield, Mirror Image, Stoneskin, Sanctuary, Protection from Evil and Good, Holy Aura, Globe of Invulnerability.

**[T153] Condition Debuff Spells**
Hold Person/Monster, Blindness/Deafness, Fear, Confusion, Hypnotic Pattern, Sleep, Slow, Entangle/Web, Flesh to Stone, Bestow Curse, Heat Metal, Compulsion, Dominate Beast/Person/Monster, Banishment, Color Spray, Eyebite, Feeblemind, Irresistible Dance, Phantasmal Killer.

**[T154] Condition Buff Spells**
Haste, Greater Invisibility, Freedom of Movement, Blur, Invisibility, Mind Blank, Foresight.

**[T155] Condition Removal Spells**
Lesser Restoration, Greater Restoration, Remove Curse, Dispel Magic.

**[T156] Stat Buff/Debuff Spells**
Bless, Bane, Enhance Ability, Aid, Heroism, Hunter's Mark, Ray of Enfeeblement, Warding Bond, Protection from Energy, Faerie Fire, Death Ward, Divine Favor, Magic Weapon, Enlarge/Reduce.

**[T157] Temp HP Spells**
False Life, Heroism (already in T156).

**[T158] Revive Spells**
Revivify, Raise Dead, Resurrection, True Resurrection.

**[T159] Cantrip Scaling + Cantrip Debuffs**
Damage cantrips add dice at 5/11/17. Vicious Mockery, Shocking Grasp, Chill Touch debuffs.

**[T160] Power Words + Divine Word**
Power Word Stun, Power Word Kill, Divine Word (HP-threshold effects).

**[T161] Polymorph**
WIS save or transform. Differs from Wild Shape: ALL ability scores replaced, CR cap = target level/CR, no effect on shapechangers or 0 HP. Revert on 0 HP with overflow. Concentration.

---

## Grappler Feat

```
[T200] Grappler Feat (P4) -> deps: none
```

**[T200] Grappler Feat**
Prereq STR 13+. Advantage on attacks against creature you're grappling. Pin (action to grapple check): both restrained until grapple ends.
- Functions: modify attack modifiers for advantage when grappling; `pPinGrapple(contestResult)->both restrained`
- Test: advantage only against grappled target; Pin restrains both; Pin consumes action; Pin ends when grapple ends

---

## Suggested Execution Order

0. **Complete PLAN_MIGRATION.md M0 + M2 + M3 first.** Tasks below are 5.1 descriptions and will be rewritten during migration.
1. **[T01]** Config Identity (most class tasks depend on it), **[T01.5]** Multiclass Proficiency Rules
2. **[T03-T06, T08, T09]** Shared mechanics (no deps or only T01; unblock class tasks)
3. **[T07]** Channel Divinity (needs T01; unblocks Paladin/Cleric)
4. **P1 class features** — T10 Rage, T11 Reckless, T20 Second Wind, T21 Action Surge, T30 Sneak Attack, T40 Ki, T41 Martial Arts, T60 Lay on Hands, T61 Divine Smite, T100 Wild Shape, T110 Sorcery Points (all need only T01)
5. **P1 dependent** — T13 Berserker (needs T10), T23 Champion (needs T02+T05), T31 Cunning Action (needs T06), T42 Ki Actions (needs T40+T06), T43 Stunning Strike (needs T40)
6. **P1-P2 spells** — T150 Damage Patterns, T152 AC/Defense Buffs, T153 Condition Debuffs (all need T08)
7. **P2 class features, racial traits** in any order
8. **P2-P3 spells, remaining** in any order

---

## SRD Spell Count

| Category | Count | Task |
|----------|-------|------|
| Damage (incl. repeatable attack spells) | ~70 | T150 |
| Healing | ~12 | T151 |
| AC/Defense Buffs | ~8 | T152 |
| Condition Debuffs | ~25 | T153 |
| Condition Buffs | ~5 | T154 |
| Condition Removal | ~8 | T155 |
| Stat Buff/Debuff | ~15 | T156 |
| Temp HP | ~5 | T157 |
| Revive | ~5 | T158 |
| Cantrip Scaling | pattern | T159 |
| Power Words | 2 | T160 |
| Polymorph | 1+True | T161 |
| Summon (~50), Utility (~110) | ~160 | Not modeled |

## What is NOT Formalized

- Subclasses beyond the 12 SRD subclasses (1 per class)
- Spells not in SRD 5.1 (~43 PHB-exclusive)
- Feats beyond Grappler (only feat in SRD 5.1)
- Races/subraces beyond SRD 9 + subraces
- Variant Human
- Battlemaps/grids/coordinates
- AoE geometry
- Multi-creature encounter state
- DM-fiat mechanics
- Monsters/NPCs, Magic items, Backgrounds, Alignment
- Improvised weapons, Help action, Ready action spell-holding
- Spellbook mechanics, non-combat racial traits, racial weapon proficiencies
- Charmed social interaction, Antimagic Field interactions
