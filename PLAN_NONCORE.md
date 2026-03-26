# D&D 5e SRD 5.2.1 — Non-Core Specification Plan

**Edition: SRD 5.2.1 (2024).**

Class features, spell effects, species traits, and subclass mechanics. These compose on top of core primitives (PLAN.md / `dnd.qnt`) and are implemented in TypeScript (XState machine / caller side).

**SRD parity:** all modeled features must trace directly to SRD text. No homebrew or interpretive extensions. Where the formalization requires choices the SRD doesn't prescribe, those are documented in `ASSUMPTIONS.md`.

> **NOTE — Suggestive, not prescriptive.** Function names, signatures, state fields, and type
> definitions listed in tasks below are *illustrative suggestions* to communicate intent and scope.
> The implementer decides the actual design — names, decomposition, data representations —
> and iterates freely. Treat task descriptions as "what to model," not "how to type it."

## Relationship to Core

All tasks here depend on PLAN.md core being complete (TA1–TA4, T02, T10a/c/d — all done). Each task composes core primitives:
- Active effect lifecycle (pAddEffect/pRemoveEffect)
- Conditions (pApplyCondition/pRemoveCondition)
- Damage/healing (pTakeDamage/pHeal/pGrantTempHp)
- Action economy (pUseAction/pUseBonusAction/pUseReaction)
- Modifier aggregation (advantage/disadvantage sources)
- START_TURN/END_TURN event arguments (per-effect data)

No task here should require adding new fields to `CreatureState` or `TurnState` in `dnd.qnt`. All state specific to class features, spells, or species traits lives in TypeScript.

### Cross-file dependencies

Tasks in PLAN.md (core): T02, T10a, T10c, T10d, TA1-TA4. When a task below lists a dependency like `deps: [T02]`, that task lives in PLAN.md.

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

```
[T01] Config Identity Extensions (P1) -> deps: none  ✓ done
[T01.5] Multiclass Proficiency Rules (P2) -> deps: [T01]
```

**[T01] Config Identity Extensions** *(done)*
Extend `CharConfig` with `className`, `subclass`, `species`, `classLevels`, `fightingStyles`.
Extend `Feature` sum type or replace with `(class, level)` derivation. Note: SRD 5.2.1 uses `species` (not `race`); subraces are eliminated (Elf uses lineage options: Drow, High Elf, Wood Elf). Ability score increases come from Background, not species.
- State: config fields only, no mutable state
- Test: construct configs for each class/species combo; verify `extraAttacksFromConfig`, `proficiencyBonus` still work
- **Open question:** SRD 5.2.1 made Ritual casting universal (any prepared spell with Ritual tag). `canRitualCast` is currently `false` for Paladin/Ranger/Sorcerer/Warlock — needs ASSUMPTIONS.md entry or fix.

**[T01.5] Multiclass Proficiency Rules**
When multiclassing into a non-starting class, only partial proficiencies are gained (varies per class: Fighter gets armor/weapons/shields, Wizard gets nothing, etc.). Attacking with a non-proficient weapon: no proficiency bonus added to attack roll (NOT disadvantage). Druid restriction: will not wear metal armor or shields (config flag).
- State: `startingClass: ClassName` in config; per-class multiclass proficiency table as pure lookup
- Functions: `pMulticlassProficiencies(className) -> Set[Proficiency]`; modify attack resolution to omit proficiency bonus for non-proficient weapons (caller-side, attackBonus already pre-computed)
- Constraint: Unarmored Defense stacking (`pCanGainUnarmoredDefense`) and Extra Attack stacking (`pExtraAttackStacks`) already implemented in `dnd.qnt` section 18. Thirsting Blade doesn't add to Extra Attack (warlock-specific, enforced here)
- Test: Wizard multiclass gains no new proficiencies; Fighter multiclass gains light/medium armor + shields + simple/martial weapons; Bard multiclass gains light armor + 1 skill; attack with non-proficient weapon has no prof bonus (not disadvantage); Barbarian/Monk multiclass doesn't grant second Unarmored Defense

---

## Shared Mechanics

```
[T03] Evasion (P1) -> deps: none  ✓ done
[T04] Uncanny Dodge (P1) -> deps: none  ✓ done
[T05] Fighting Style Feats (P1) -> deps: [T201]  ✓ done
[T06] Bonus-Action-As-Action Pattern (P1) -> deps: none  ✓ done
[T07] Channel Divinity Framework (P2) -> deps: [T01]  ✓ done
[T08] Spell Effect Data Model (P2) -> deps: none  ✓ done
[T09] Land's Stride (P2) -> deps: none  ✗ dropped (not in SRD 5.2.1)
```

**[T03] Evasion (shared)** *(done)*
Used by Rogue 7, Monk 7, Hunter 15. `pEvasion(dexSaveSucceeded, fullDamage) -> 0 on success, floor(fullDamage/2) on fail`.
- State: `hasEvasion: bool` in config (or derived from class+level)
- Functions: `pEvasionDamage`
- Test: save success->0; save fail->half; 0 damage->0; odd damage rounds down

**[T04] Uncanny Dodge (shared)** *(done)*
Used by Rogue 5, Hunter 15. Reaction: halve one attack's damage.
- State: consumes reaction (already in TurnState)
- Functions: `pUncannyDodge(damage) -> floor(damage/2)`; precondition: reaction available AND attacker is visible (can't use vs unseen attacker)
- Test: 10 damage->5; 7->3; can't use twice (reaction consumed); can't use when incapacitated; can't use vs unseen attacker

**[T05] Fighting Style Feats** *(done)*
4 SRD 5.2.1 Fighting Style feats: Archery (+2 ranged), Defense (+1 AC with armor), GWF (treat 1-2 as 3), TWF (add ability mod to off-hand).
- Functions: `pArcheryAttackBonus`, `pDefenseACBonus`, `pGWFDamageDie`, `pTWFOffHandDamageStyled`
- `hasFightingStyleFeature: bool` in CharConfig (Fighter L1, Paladin L2, Ranger L2)

**[T06] Bonus-Action-As-Action Pattern** *(done)*
Generalize the pattern: "use bonus action to take Dash/Disengage/Hide" (Cunning Action, Step of the Wind, Vanish). Pure function takes `turnState` + `actionChoice` -> modified `turnState` with bonus used + action effect applied.
- Functions: `pBonusActionDash`, `pBonusActionDisengage`, `pBonusActionHide`
- Test: bonus action consumed; movement doubled (Dash); disengaged set; can't use if bonus already used

**[T07] Channel Divinity Framework** *(done)*
Shared by Cleric and Paladin. Per-class scaling: Cleric 2/3/4 (L2/L6/L18), Paladin 2/3 (L3/L11). Multiclass modeled as additive per-class pools (ASSUMPTIONS.md A6).
- Functions: `pClericChannelDivinityMax`, `pPaladinChannelDivinityMax`, `pChannelDivinityMax`, `pExpendChannelDivinity`, `pRestoreChannelDivinityShort`
- Test: boundary scaling for both classes, multiclass additive sum, expend/restore edge cases

**[T08] Spell Effect Data Model** *(done)*
Define `SpellEffectType` sum type and `SpellData` record (name, level, school, casting time, concentration, components). Type definitions only — the foundation that T150-T161 build on. T150 implements damage pattern functions using these types.
- State: type definitions only
- Test: construct sample spells; verify field access

**[T09] Land's Stride (shared)** *(dropped — not in SRD 5.2.1)*
"Land's Stride" does not exist in SRD 5.2.1. Ranger got "Roving" (speed +10, Climb/Swim), Druid got "Land's Aid" (damage/healing). Neither matches the 5.1 Land's Stride mechanic.

---

## Barbarian

```
[T10] Rage (P1) -> deps: [T01]  ✓ done
[T11] Reckless Attack (P1) -> deps: [T01]  ✓ done
[T12] Barbarian Passives (P2) -> deps: [T01]
[T13] Berserker (P2) -> deps: [T10]
```

**[T10] Rage** *(done)*
SRD 5.2.1: rage maintenance changed — rage continues if you make an attack roll, force a creature to make a saving throw, OR take a Bonus Action to extend it (was: must have attacked or taken damage). Duration up to 10 minutes (was 1 minute). Persistent Rage (L15): regain all rage uses when you roll Initiative if you have none; rage lasts up to 10 min without needing to maintain (was: doesn't end from inaction).
- State: `raging: bool`, `rageCharges: int`, `rageMaxCharges: int`, `attackedOrForcedSaveThisTurn: bool`, `rageExtendedWithBA: bool`
- Functions: `pEnterRage`, `pEndRage`, `pExtendRageWithBA`, `pRageDamageBonus(level)->+2/+3/+4`, modify `pApplyDamageModifiers` for B/P/S resistance while raging, modify `pGetSaveModifiers` for advantage on STR saves, modify `pGetCheckModifiers` for advantage on STR checks, block spellcasting while raging; entering rage drops any active concentration spell
- Test: enter rage decrements charges; can't rage at 0 charges; can't rage in heavy armor; +2 damage at level 1; B/P/S resistance halves damage; advantage on STR saves; can't cast while raging; entering rage breaks concentration; rage maintained via attack roll OR forced save OR BA extension; Persistent Rage (L15) regains all uses at Initiative if 0

**[T11] Reckless Attack** *(done)*
SRD 5.2.1: Brutal Strike added at L9. When using Reckless Attack, you can forgo the advantage on one attack to instead deal +1d10 damage and apply one Brutal Strike effect. At L17: +2d10 and two effects. L9 effects: Forceful Blow (push target 15ft), Hamstring Blow (target Speed -15ft until start of your next turn). L13 effects added: Staggering Blow (target has Disadvantage on next saving throw it makes before your next turn), Sundering Blow (+5 to next attack roll against target before your next turn ends).
- State: `recklessThisTurn: bool`, `brutalStrikeChoice: BrutalStrikeEffect option` on TurnState
- Functions: `pDeclareReckless(turnState)`, `pBrutalStrike(turnState, effect, d10Result)->apply effect + bonus damage; forgo advantage on that attack`, modify `pGetOwnAttackModifiers` for advantage on melee STR attacks when reckless (except Brutal Strike attack), modify `pGetDefenseModifiers` for advantage on attacks against until next turn
- Test: reckless grants advantage on own STR melee; attacks against have advantage; Brutal Strike foregoes advantage for +1d10+effect; Forceful Blow pushes 15ft; Hamstring Blow -15ft speed; +2d10 + two effects at L17; resets on turn start; only melee STR (not ranged, not DEX)

**[T12] Barbarian Passives**
Danger Sense, Fast Movement, Primal Knowledge (NEW L3), Instinctive Pounce (NEW L7), Feral Instinct, Relentless Rage, Persistent Rage, Indomitable Might, Primal Champion.
- State: `relentlessRageDC: int` (10, +5 per use, resets on short/long rest); `primalKnowledgeProficiency: Skill` (chosen at L3)
- Functions:
  - modify `pGetSaveModifiers` for Danger Sense (advantage DEX saves vs visible effects, not blinded/deafened/incapacitated)
  - modify `pCalculateEffectiveSpeed` for Fast Movement (+10ft no heavy armor)
  - `pPrimalKnowledge(config)->add proficiency to chosen skill at L3` (Athletics/Intimidation/Nature/Perception/Survival/Animal Handling)
  - Instinctive Pounce (L7): when you enter rage, move up to half your speed as part of the same BA
  - Feral Instinct: advantage on Initiative; if surprised, can act on first turn if you enter rage (BA to rage then act)
  - `pRelentlessRage(conSaveResult, dc)->stay at 1 HP or fall`; DC resets on short or long rest
  - `pIndomitableMight(strScore, rollResult)->max(strScore, rollResult)` for STR checks
  - Persistent Rage (L15): described in T10
  - Primal Champion (L20): STR +4, CON +4, score maximums raised to 24
- Test: Danger Sense advantage only when not blinded/deafened/incapacitated; Fast Movement +10 only without heavy armor; Primal Knowledge adds proficiency to chosen skill; Instinctive Pounce grants half-speed move on rage entry; Relentless Rage DC increments +5, resets on rest; Indomitable Might replaces low STR rolls; Primal Champion raises scores and caps

**[T13] Berserker**
SRD 5.2.1: Frenzy no longer causes exhaustion. Frenzy, Retaliation, Intimidating Presence all revised per 5.2.1.
- State: `frenzyActive: bool`
- Functions: `pActivateFrenzy(state)->frenzyActive during rage`; Frenzy revised (TODO: verify 5.2.1 exact mechanic — bonus attack on melee hit, or once per turn BA; no exhaustion); Mindless Rage (L6, unchanged): block charmed/frightened while raging, suspend pre-existing effects (resume when rage ends); Intimidating Presence revised per 5.2.1 (TODO: verify DC and duration); Retaliation (L14, unchanged): reaction melee attack when you take damage from creature within 5ft, consumes reaction
- Test: Frenzy grants additional attack (TODO: verify exact trigger); ending frenzy rage does NOT add exhaustion; Mindless Rage blocks charmed/frightened + suspends pre-existing; Retaliation consumes reaction, requires taking damage from creature within 5ft

---

## Fighter

```
[T20] Second Wind (P1) -> deps: [T01]  ✓ done
[T20b] Fighter Base Features (P2) -> deps: [T01, T170]
[T21] Action Surge (P1) -> deps: [T01]  ✓ done
[T22] Indomitable (P2) -> deps: [T01]
[T23] Champion (P1) -> deps: [T02, T05]
```

**[T20] Second Wind** *(done)*
SRD 5.2.1: Second Wind gains additional uses at higher levels (2 uses at L2, scales further — TODO: verify exact level thresholds). New features at L2: Tactical Mind (expend a SW use on a failed ability check to add 1d10; if this pushes the total to pass, it passes). New L5 feature: Tactical Shift (when you activate SW, move up to half your Speed without provoking OAs).
- State: `secondWindCharges: int`, `secondWindMax: int`
- Functions: `pSecondWind(state, config, d10Roll)->heal(1d10+fighterLevel), decrement charges`; `pTacticalMind(state, d10, checkResult)->add d10 to failed check, decrement charges`; `pTacticalShift(state, turnState)->move half speed without OA triggers on SW use`; preconditions: charges > 0, bonus action available
- Test: heals correct amount; can't exceed maxHp; consumes bonus action; charges multiple at higher levels; Tactical Mind adds d10 to failed check; resets on short rest

**[T20b] Fighter Base Features**
New base Fighter features in SRD 5.2.1:
- Tactical Master (L9): when you hit with a weapon that has the Push, Sap, or Slow mastery property, you can substitute your weapon mastery property for one of those three options
- Studied Attacks (L13): if you miss an attack, you have Advantage on your next attack roll against the same target before the end of your next turn
- State: `studiedAttackTarget: CreatureId option` (set on miss, cleared on hit or turn end)
- Functions: `pTacticalMaster(weaponMastery, substituteChoice)->use alternate mastery effect`; `pStudiedAttack(state, missedTarget)->set advantage vs that target`
- Test: Tactical Master substitutes mastery property; Studied Attacks advantage only vs same target, only after a miss; clears after use

**[T21] Action Surge** *(done)*
- State: `actionSurgeCharges: int`
- Functions: `pActionSurge(turnState)->reset actionUsed to false`; decrement charges; precondition: not already used Action Surge this turn
- Test: grants second action; can't use at 0 charges; resets on short rest; 2 charges at level 17; can only use ONE Action Surge per turn (even with 2 charges)

**[T22] Indomitable**
- State: `indomitableCharges: int`
- Functions: `pIndomitable(state, newRoll)->use new roll for save`; decrement charges
- Test: expend charge; can't at 0; resets on long rest; 1 charge at 9, 2 at 13, 3 at 17

**[T23] Champion**
Improved Critical (L3: critRange 19), Heroic Warrior (NEW L10: gain Heroic Inspiration at start of each turn if you lack it), Additional Fighting Style (L7: second Fighting Style feat), Remarkable Athlete, Superior Critical (L15: critRange 18), Survivor (revised: heal at turn start if Bloodied — i.e., at or below half max HP and above 0).
- State: uses `critRange` from [T02]; additional fighting style uses [T05]
- Functions: set critRange=19 at L3, 18 at L15; `pRemarkableAthlete(profBonus, isSTRDEXCON, hasProficiency)->add ceil(profBonus/2) if not proficient` (rounds UP); `pHeroicWarrior(state)->grant Heroic Inspiration if lacking at turn start`; `pSurvivor(state, config)->heal 5+CON mod at turn start if 0 < hp <= floor(maxHp/2)`
- Test: crit on 19 at L3; crit on 18 at L15; Remarkable Athlete adds ceil(half prof) only to unproficient STR/DEX/CON checks; Survivor heals only when Bloodied (0 < hp <= half); Heroic Warrior grants inspiration if lacking at turn start

---

## Rogue

```
[T30] Sneak Attack + Cunning Strike (P1) -> deps: [T01]  ✓ done
[T31] Cunning Action (P1) -> deps: [T06]
[T32] Rogue Passives (P2) -> deps: [T01, T03, T04]
[T33] Thief (P3) -> deps: [T31]
```

**[T30] Sneak Attack + Cunning Strike** *(done)*
SRD 5.2.1 adds Cunning Strike (L5), Steady Aim (L3), Improved Cunning Strike (L11), and Devious Strikes (L14).

Sneak Attack base (unchanged): `pSneakAttackDice(rogueLevel)->ceil(level/2)`, `pCanSneakAttack(hasAdvantage, allyAdjacentAndNotIncapacitated, isFinesse, isRanged)->bool`, `pApplySneakAttack(state, diceResult)->add damage + mark used`

Steady Aim (L3): BA to grant yourself Advantage on your next attack roll this turn; your Speed becomes 0 until end of turn.

Cunning Strike (L5): when Sneak Attack hits, you can forgo 1d6 of SA damage to apply one effect (caller provides save result):
- **Poison** (1d6 cost): CON save or Poisoned until start of your next turn
- **Trip** (1d6 cost): DEX save or Prone
- **Withdraw** (1d6 cost): you move up to half your Speed without OAs

Improved Cunning Strike (L11): apply two Cunning Strike effects per Sneak Attack (total die cost must be deducted from SA dice).

Devious Strikes (L14): additional Cunning Strike options:
- **Daze** (2d6 cost): CON save or Incapacitated until end of your next turn
- **Knock Out** (6d6 cost): CON save or Unconscious for 1 minute (wakes on damage)
- **Obscure** (3d6 cost): DEX save or Blinded until end of your next turn

- State: `sneakAttackUsedThisTurn: bool`, `steadyAimUsedThisTurn: bool`
- Functions: `pSteadyAim(turnState)->grant Advantage on next attack, set speed to 0`; `pCunningStrike(state, effect, diceForfeited, saveResult)->remove dice, apply effect on failed save`; `pCanApplyCunningStrike(sneakAttackDiceTotal, diceForfeited)->bool` (must have enough dice remaining)
- Test: SA dice correct per level; requires finesse or ranged + advantage or adjacent ally; once per turn; Steady Aim grants advantage + zeroes speed; Cunning Strike requires sufficient dice; each effect triggers on failed save; Improved CS allows two effects; Devious Strikes options cost correctly; SA dice deducted before applying; resets on turn start

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
Fast Hands (Use Object, disarm trap/open lock, or Sleight of Hand check as bonus via Cunning Action), Second-Story Work (climbing free, jump +DEX), Supreme Sneak (advantage Stealth if <= half speed; adds Stealth Attack as a Cunning Strike option at L13), Use Magic Device (config flag), Thief's Reflexes (L17: two turns in first round; can't use if surprised).
- Functions: modify `pMovementCost` for climbing cost=1; modify jump distance +DEX mod; Fast Hands extends Cunning Action to include Use Object; Supreme Sneak Cunning Strike option (TODO: verify exact 5.2.1 effect)
- Test: climbing cost 1; jump distance +DEX mod; Fast Hands adds Use Object; Thief's Reflexes is caller-managed

---

## Monk

```
[T40] Focus Pool (P1) -> deps: [T01]  ✓ done
[T41] Martial Arts (P1) -> deps: [T01]  ✓ done
[T42] Focus Actions (P1) -> deps: [T40, T06]
[T43] Stunning Strike (P1) -> deps: [T40]
[T44] Monk Passives (P2) -> deps: [T01, T03]
[T45] Monk Reactions (P2) -> deps: [T40]
[T46] Warrior of the Open Hand (P2) -> deps: [T42]
```

**[T40] Focus Pool** *(done)*
SRD 5.2.1: renamed Ki → Monk's Focus (Focus Points). Martial Arts die progression revised: d6/d8/d10/d12 at tiers (was d4/d6/d8/d10).
- State: `focusPoints: int`, `focusMax: int`
- Functions: `pExpendFocus(state, cost)`, `pRestoreFocus(state, config)` (short rest -> full); Uncanny Metabolism (L2): when you roll Initiative, regain all focus points and heal equal to one Martial Arts die (1/LR); Perfect Focus (L15): when you roll Initiative and have fewer than 4 FP, regain to 4
- Test: expend decrements; can't expend below 0; short rest restores to max=monk level; Uncanny Metabolism restores all FP + heals at Initiative 1/LR; Perfect Focus: if < 4 FP at Initiative, becomes 4

**[T41] Martial Arts** *(done)*
- State: none new (derived from class+level)
- Functions: `pMartialArtsDie(monkLevel)->d6/d8/d10/d12` (at L1/L5/L11/L17); modify attack to allow DEX for unarmed/monk weapons; bonus action unarmed strike after Attack action with unarmed strike or monk weapon (no Focus cost)
- Test: d6 at 1, d8 at 5, d10 at 11, d12 at 17; DEX used for unarmed; bonus action unarmed requires Attack action with unarmed/monk weapon

**[T42] Focus Actions**
Flurry of Blows (1 FP: 2 unarmed as bonus; scales to 3 strikes at L10), Patient Defense (1 FP: Dodge as bonus; at L10 also grant temp HP equal to Martial Arts die), Step of the Wind (1 FP: Dash or Disengage as bonus + double jump; at L10 can carry a willing creature of your size or smaller).
- Functions: `pFlurryOfBlows(state, turnState, monkLevel)`, `pPatientDefense(state, turnState, monkLevel)`, `pStepOfTheWind(state, turnState, choice, monkLevel, carryingAlly)`; all consume 1 FP + bonus action via [T06]
- Test: each costs 1 FP; each consumes bonus action; Flurry 2 strikes at L1-9, 3 at L10+; Patient Defense grants temp HP at L10+; Step of the Wind can carry ally at L10+; Flurry replaces Martial Arts bonus

**[T43] Stunning Strike**
SRD 5.2.1: on a **failed** save, target is Stunned until end of your next turn (unchanged). On a **successful** save, target's Speed is halved and it has Disadvantage on its next attack roll before your next turn ends (new partial effect on success).
- Functions: `pStunningStrike(state, targetSaveResult)->expend FP; if fail: stunned; if success: halve speed + disadvantage on next attack`
- Test: costs 1 FP; only on melee hit; stunned on fail; speed halved + next attack disadv on success; can use multiple times per turn (each costs FP)

**[T44] Monk Passives**
Unarmored Movement (+10→+30 speed by level), Focus-Empowered Strikes (magical unarmed at L6), Evasion [T03], Self-Restoration (L2: at end of each turn remove one of Charmed/Frightened/Poisoned from yourself — replaces Stillness of Mind + Purity of Body), Deflect Energy (L13: passive upgrade — `pDeflectAttacks` in T45 now accepts any damage type, not just weapon damage), Disciplined Survivor (all save prof at L14 + FP reroll — was Diamond Soul), Superior Defense (L18: 3 FP, gain resistance to all damage except Force for 1 min — replaces Empty Body), Timeless Body (L15 config flag), Tongue of the Sun and Moon (L13 config flag).

Note: Empty Body (old invisible + resistance option) replaced by Superior Defense. Deflect Energy is not a separate reaction — it extends the existing `pDeflectAttacks` reaction in T45.
- State: `hasDeflectEnergy: bool` (derived from monkLevel >= 13)
- Functions: modify `pCalculateEffectiveSpeed` for Unarmored Movement; `pSelfRestoration(state)->remove one of Charmed/Frightened/Poisoned at end of each turn`; `pDisciplinedSurvivorReroll(state, newRoll)->precondition: save failed; expend 1 FP, use new save result`; `pSuperiorDefense(state, turnState)->3 FP + action, gain all resistance except Force for 1 min`
- Test: speed bonus +10 at 2, +15 at 6, +20 at 10, +25 at 14, +30 at 18; Self-Restoration removes one condition per turn end automatically; Disciplined Survivor: all save prof at L14+, FP reroll after failed save; Superior Defense 3 FP + action

**[T45] Monk Reactions**
Deflect Attacks (reaction: reduce incoming damage by 1d10+DEX+level; throw back for 1 FP if reduced to 0. Base reaction [L2]: weapon attacks only. Deflect Energy [L13, passive from T44]: extends to any damage type via `hasDeflectEnergy` flag), Slow Fall (reduce fall damage by 5×level).
- Functions: `pDeflectAttacks(state, config, d10, incomingDamage, damageType)->reduced damage (all types if hasDeflectEnergy, weapon-damage types otherwise); if 0: throw back for 1 FP`; `pSlowFall(state, config, fallDamage)->max(0, fallDamage - 5*level)`
- Test: Deflect reduces correctly; throw-back costs 1 FP + reduces to 0; weapon attacks deflectable at L2+; all damage types deflectable at L13+ (Deflect Energy); Slow Fall at level 4 reduces by 20; both consume reaction

**[T46] Warrior of the Open Hand**
SRD 5.2.1 rename: Way of the Open Hand → Warrior of the Open Hand. Effects renamed: Addle (can't take reactions until start of your next turn), Push (push 15ft), Topple (DEX save or Prone). Wholeness of Body revised: as a Bonus Action, heal yourself for 1d8+WIS mod; uses = WIS mod (min 1)/long rest. Fleet Step (L11): when you use Step of the Wind, you can take the Dash or Disengage action as a Free Action in addition to spending 1 FP. Quivering Palm revised: 4 FP (was 3), target takes 10d12 Force damage on trigger (CON save: half on success — no longer save-or-die).
- State: `wholenessOfBodyCharges: int`, `quiveringPalmActive: bool`
- Functions: `pOpenHandTechnique(choice, targetSaveResult)` (Addle/Push/Topple); `pWholenessOfBody(state, config, dieRoll)->heal 1d8+WIS mod, decrement charges`; `pFleetStep(state, turnState)->when using Step of the Wind, take Dash/Disengage free`; `pQuiveringPalm(state)->expend 4 FP, mark active`; `pTriggerQuiveringPalm(targetSaveResult, d12Rolls)->10d12 Force, half on success`
- Test: Addle blocks reactions; Push 15ft; Topple prone on fail; Wholeness heals 1d8+WIS mod, charges=WIS mod/LR; Fleet Step free Dash/Disengage with Step of Wind; Quivering Palm costs 4 FP; 10d12 Force half on save success

---

## Paladin

```
[T60] Lay on Hands (P1) -> deps: [T01]  ✓ done
[T61] Paladin's Smite (P1) -> deps: [T01]  ✓ done
[T62] Paladin Passives (P2) -> deps: [T01, T07]
[T63] Oath of Devotion (P2) -> deps: [T07]
```

**[T60] Lay on Hands** *(done)*
- State: `layOnHandsPool: int`
- Functions: `pLayOnHands(state, amount)->heal up to amount from pool`; `pLayOnHandsCure(state)->spend 5 from pool to remove one disease or one poison`; add Restoring Touch (L14, see T62)
- Test: heal correct amount; pool decrements; can't exceed pool; cure costs 5; resets on long rest; pool = paladin level × 5

**[T61] Paladin's Smite** *(done)*
SRD 5.2.1: Divine Smite is now the Paladin's Smite class feature — the spell Divine Smite is always prepared; you can cast it once per long rest without a spell slot. When you expend a spell slot to cast Divine Smite: +2d8 Radiant per spell slot level (max +5d8 from slot), +1d8 extra vs undead/fiend.
Radiant Strikes (L11): on a hit with a melee weapon **or unarmed strike**, you can deal +1d8 Radiant damage (free, no slot required). Replaces Improved Divine Smite.

**Naming in the spec:**
- `dnd.qnt` has no smite-specific code — correct per architecture. Divine Smite is caller-side composition of `pExpendSlot` + damage.
- TypeScript class feature: `PaladinsSmite` (the L1 class feature granting free cast + always-prepared)
- spellId string for `pAddEffect` / effect tracking: `"divine_smite"` (the spell itself)
- `qa_generated.qnt` uses "Improved Divine Smite" in comments (5.1 era term). This is auto-generated; fixed when M6 regenerates the QA pipeline against 5.2.1. Note also: 5.2.1 Radiant Strikes explicitly includes unarmed strikes, so the 5.1-era QA assertion "unarmed strikes do not qualify" is *wrong* for 5.2.1 and must be updated in M6.

- State: `paladinSmiteFreeUseAvailable: bool` (1/LR free cast)
- Functions: `pDivineSmiteDamage(slotLevel, isUndeadOrFiend)->dice count`; `pRadiantStrikes(config)->+1d8 radiant at L11+ on melee or unarmed hit`; integrate with slot expenditure; `pPaladinSmiteFree(state)->use free cast`
- Test: 1st slot->2d8; 2nd->3d8; 4th->5d8 (cap); 4th vs undead->6d8; free cast available 1/LR; Radiant Strikes +1d8 on every melee/unarmed hit at L11+

**[T62] Paladin Passives**
Divine Health (immune disease), Divine Sense (1+CHA mod uses/LR; incorporated into Channel Divinity in 5.2.1 — TODO: verify exact mechanism), Aura of Protection (L6: +CHA mod min +1 to own saves while conscious; extends to 30ft via Aura Expansion L18), Aura of Courage (L10: immune to frightened while conscious; 30ft via Aura Expansion), Radiant Strikes [T61], Faithful Steed (NEW L5: cast Find Steed 1/LR without slot), Abjure Foes (NEW L9: Channel Divinity, action — frighten up to CHA mod creatures within 60ft that can see/hear you, WIS save, frightened 1 min or until damage; caller-provided for multi-target), Restoring Touch (NEW L14: spend 5 LoH HP to remove one of: Blinded, Charmed, Deafened, Frightened, Paralyzed, or Stunned from a creature you touch), Aura Expansion (L18: Aura of Protection and Aura of Courage extend to 30ft).
- State: `faithfulSteedUsed: bool`, `abjureFoesCharges: int` (uses Channel Divinity)
- Functions: modify `pApplyCondition` to block disease for Divine Health; `pAuraOfProtection(state, config)->+CHA mod to own saves`; `pFaithfulSteed(state)->mark used, cast Find Steed`; `pAbjureFoes(state, targetSaveResult)->expend Channel Divinity, frighten on fail`; `pRestoringTouch(state, conditionToRemove)->spend 5 LoH pool`; `pRadiantStrikes` in T61
- Test: Divine Health blocks disease; Aura of Protection +CHA min +1 to own saves; Faithful Steed 1/LR; Abjure Foes uses Channel Divinity; Restoring Touch costs 5 LoH; Aura Expansion at L18

**[T63] Oath of Devotion**
Sacred Weapon (Channel Divinity: +CHA to attacks for 1 min, weapon emits light; revised per 5.2.1 — TODO: verify exact changes), Turn the Unholy (Channel Divinity, caller-provided multi-target), Aura of Devotion (L7: self + 10ft allies can't be charmed while conscious; 30ft at L18), Smite of Protection (NEW L15: when you cast Divine Smite, creatures of your choice in your Aura gain Half Cover until your next turn), Purity of Spirit (L15, revised — TODO: verify 5.2.1 exact text), Holy Nimbus (L20: revised per 5.2.1 — TODO: verify exact changes; 1/LR).
- State: `sacredWeaponActive: bool`, `holyNimbusActive: bool`
- Functions: `pSacredWeapon(state)->expend Channel Divinity, set active`; modify `pResolveAttack` for +CHA (min +1) while active; `pSmiteOfProtection(state)->on Divine Smite cast, grant Half Cover in aura`; `pHolyNimbus(state)->1/LR, activate`
- Test: Sacred Weapon adds CHA mod to attacks; consumes Channel Divinity; Smite of Protection triggers on Divine Smite; Holy Nimbus 1/LR

---

## Ranger

```
[T70] Ranger Features (P2) -> deps: [T01, T05]
[T71] Hunter (P2) -> deps: [T01, T03, T04]
```

**[T70] Ranger Features**
SRD 5.2.1: Favored Enemy and Natural Explorer replaced entirely. New base features:
- Deft Explorer (L1): Expertise in one skill + Know one extra language; at L6 Roving (+5ft speed, climb/swim speed = walk speed); at L10 Tireless (1d8+WIS temp HP as action, uses = WIS mod/LR; reduce exhaustion 1 level on short rest)
- Fighting Style feat (L2, [T05])
- Nature's Veil (L14: Invisible as BA until start of your next turn, uses=WIS mod/LR)
- Precise Hunter (L17: Advantage on attack rolls vs Heavily Obscured, Invisible, or creatures you can't see clearly)
- Relentless Hunter (TODO: verify exact 5.2.1 feature)
- Feral Senses (L18, revised: no disadvantage from being unable to see the attacker if you can hear it; aware of invisible creatures within 30ft)
- Foe Slayer (L20, revised: +WIS mod to attack or damage vs any creature, 1/turn — no longer restricted to Favored Enemy)
- Hide in Plain Sight (L10, replaced by Tireless above — TODO: verify if feature still exists in 5.2.1)
- Vanish (L14, replaced by Nature's Veil — TODO: verify)
- State: `natureVeilCharges: int`, `tiredlessCharges: int`, `roving: bool` (derived from level)
- Functions: `pDeftExplorer(config)->expertise + language`; `pRoving(state, config)->+5ft speed + climb/swim speeds`; `pTireless(state, config, dieRoll)->grant temp HP, consume charge`; `pNaturesVeil(state, turnState)->grant Invisible until start of next turn, consume charge`; `pFoeSlayer(config, wisMod)->+WIS to attack or damage, 1/turn`; modify `pGetOwnAttackModifiers` for Precise Hunter/Feral Senses
- Test: Deft Explorer expertise; Roving grants climb/swim speeds; Tireless temp HP = 1d8+WIS, resets on LR; Nature's Veil Invisible 1/turn, uses = WIS mod; Foe Slayer adds WIS mod 1/turn; Feral Senses removes disadvantage from unseen

**[T71] Hunter**
SRD 5.2.1: all tier choices revised. Note: specific per-tier options per 5.2.1 may differ from 5.1 — use SRD text for final implementation.

New base features: Hunter's Lore (L3: learn two creature types' damage immunities/resistances/vulnerabilities, TODO: model as passive lookup); Superior Hunter's Prey (NEW, TODO: verify exact 5.2.1 feature).

3rd — Hunter's Prey (revised, choose ONE): Colossus Slayer (+1d8 if target < max HP, 1/turn), Giant Killer (reaction attack after Large+ creature within 5ft hits/misses you), Horde Breaker (extra attack on different creature within 5ft).

7th — Defensive Tactics (revised, choose ONE): Escape the Horde (OAs against you have disadvantage), Multiattack Defense (+4 AC after creature hits you vs subsequent attacks from same creature), Steel Will (advantage vs frightened).

11th — Multiattack (revised, choose ONE): Volley (ranged attack each creature in 10ft of a point — caller-provided), Whirlwind Attack (melee attack each creature within 5ft — caller-provided).

15th — Superior Hunter's Defense (revised, choose ONE): Evasion [T03], Stand Against the Tide (redirect missed melee — caller-provided), Uncanny Dodge [T04].

- State: `hunterPrey: HunterPreyChoice`, `defensiveTactic: DefensiveTacticChoice`, `multiattack: MultiattackChoice`, `superiorDefense: SuperiorDefenseChoice` — all enums in config
- Functions: `pColossusSlayer(targetBelowMax)->+1d8`; `pHordeBreaker(turnState)->grant one extra attack`; `pMultiattackDefense(alreadyHitBySameCreature)->+4 AC`; modify saves for Steel Will; modify OA for Escape the Horde
- Test: Colossus Slayer only when target < max HP, 1/turn; Multiattack Defense +4 AC after first hit from same creature; tier choices mutually exclusive

---

## Bard

```
[T80] Bardic Inspiration + Jack of All Trades (P2) -> deps: [T01]
[T81] Lore (P3) -> deps: [T80]
```

**[T80] Bardic Inspiration + Jack of All Trades + Countercharm + Song of Rest**
SRD 5.2.1: Font of Inspiration (L5) revised (regain charges on short rest instead of long rest — TODO: verify exact 5.2.1 text). Superior Inspiration (L20) revised (regain 1 if 0 when rolling Initiative — unchanged). Words of Creation (NEW L20: TODO enumerate effect).
- State: `bardicInspirationCharges: int`
- Functions: `pBardicInspirationDie(level)->d6/d8/d10/d12`; `pExpendInspiration(state)->decrement`; `pJackOfAllTrades(profBonus, hasProficiency)->if not proficient: +floor(profBonus/2)`; Countercharm (L6): action, advantage on saves vs charmed/frightened until end of next turn; Song of Rest (L2): `pSongOfRestDie(bardLevel)->d6/d8/d10/d12`; Superior Inspiration: regain 1 if 0 at initiative; Expertise (L3: double prof on 2 skills, 2 more at L10 — config)
- Test: correct die at each tier; charges = max(CHA mod, 1); recharge short rest at L5+; Jack adds half prof to unproficient checks only; Superior Inspiration triggers when 0 at initiative

**[T81] Lore**
Peerless Skill revised (L14: spend inspiration die on own ability check), Cutting Words revised per 5.2.1 (reaction, subtract inspiration die from enemy attack/ability/damage; immune if can't hear or charm-immune). Magical Discoveries (was Additional Magical Secrets): choose 2 spells from any list at L6.
- Functions: `pPeerlessSkill(state, dieRoll)->add die to own check, expend charge`
- Test: Peerless Skill adds die and expends charge; can't use at 0 charges

---

## Cleric

```
[T90] Cleric Base (P2) -> deps: [T01, T07]
[T91] Life Domain (P2) -> deps: [T90]
```

**[T90] Cleric Base**
SRD 5.2.1: subclass at L3 (was L1). New base class features:
- Divine Order (L1, choose ONE): Protector (medium armor + shield training + martial weapons) or Thaumaturge (+WIS to Religion/Arcana checks — config flag)
- Blessed Strikes (L7, choose ONE — replaces subclass Divine Strike): Potent Spellcasting (add WIS mod to cantrip damage) or Divine Strike (+1d8/+2d8 weapon damage at L8/L14)
- Channel Divinity: incorporates Divine Sense; Turn Undead unchanged; Sear Undead (new Channel Divinity option: when you use Turn Undead, deal Radiant damage = WIS mod × prof bonus to affected undead)
- Improved Blessed Strikes (L14: enhance the L7 choice — TODO: verify exact 5.2.1 text)
- Greater Divine Intervention (L20: cast any Divine/Cleric spell without slot 1/LR, revised from the d100 mechanic)
- Destroy Undead (CR threshold by level — caller-provided, unchanged)
- State: `divineOrderChoice: DivineOrderChoice`, `blessedStrikesChoice: BlessedStrikesChoice`
- Functions: `pDestroyUndeadCR(clericLevel)->0.5/1/2/3/4`; `pPotentSpellcasting(config, wisMod)->+WIS to cantrip damage`; `pDivineStrike(config)->+1d8/+2d8 on weapon hit`; Channel Divinity from [T07]; `pSearUndead(config)->WIS mod × prof bonus Radiant on Turn Undead`
- Test: CR thresholds at correct levels; Protector grants armor/weapon training; Thaumaturge +WIS to Religion/Arcana; Blessed Strikes choice exclusive; Potent Spellcasting adds WIS to cantrip

**[T91] Life Domain**
Disciple of Life (revised per 5.2.1 — TODO: verify exact bonus formula), Preserve Life (Channel Divinity: distribute HP pool — revised), Blessed Healer (self-heal when healing others), Divine Strike → replaced by Blessed Strikes [T90], Supreme Healing (max healing dice at L17 — unchanged), Land's Aid (NEW: TODO enumerate 5.2.1 effect).
- Functions: `pDiscipleOfLife(spellLevel)->bonus healing`; `pPreserveLife(clericLevel)->pool = 5×clericLevel`; `pBlessedHealer(spellLevel, targetIsSelf)->if !self: bonus HP`; `pSupremeHealing(dice, dieSize)->dice*dieSize`; `pLandAid(state)->TODO`
- Test: Disciple healing bonus; Preserve Life pool = 5×level, cap per target; Supreme Healing returns max; Land's Aid TODO

---

## Druid

```
[T100] Wild Shape Framework (P1) -> deps: [T01]  ✓ done
[T101] Circle of the Land (P3) -> deps: [T01]
```

**[T100] Wild Shape Framework** *(done)*
SRD 5.2.1: subclass at L3 (was L2). New base class features:
- Primal Order (L1, choose ONE): Magician (learn extra language + Druidic in script form, 1 extra spell slot — TODO: verify) or Warden (martial weapons proficiency + 1d8 extra melee damage with Primal Strike)
- Elemental Fury (L7, choose ONE): Potent Spellcasting (add WIS mod to cantrip damage) or Primal Strike (weapon/unarmed hits count as magical; on a hit, +1d8 cold/fire/lightning/thunder)
- Wild Companion: as a BA, expend Wild Shape use to cast Find Familiar (lasts until end of next long rest)
- Wild Resurgence (L5?): when you have no Wild Shape uses, expend a spell slot to regain 1 use; 1/LR also regain 1 slot of any level you can cast
- Improved Elemental Fury (L15): enhance the L7 choice (TODO: verify exact text)
- Wild Shape: CR cap 1/4 at L2, 1/2 at L4, 1 at L8+; 2 charges/short rest (TODO: verify if unlimited at L20 changed)
- Does NOT break concentration; can't cast until Beast Spells L18 (V/S only)
- Archdruid (L20): ignore V/S/non-costly-M on druid spells
- State: `wildShapeCharges: int`, `inWildShape: bool`, `wildShapeHp: int`, `wildShapeMaxHp: int`, `originalHp: int`, `primalOrderChoice: PrimalOrderChoice`, `elementalFuryChoice: ElementalFuryChoice`
- Functions: `pEnterWildShape`, `pWildShapeDamage(state, amount)->if beast HP 0: revert + overflow`, `pExitWildShape`, `pWildCompanion(state)->expend Wild Shape use`; `pWildResurgence(state)->expend slot for Wild Shape use`; `pPrimalStrike(config)->+1d8 elemental on hit`
- Test: entering stores original HP; overflow carries; revert restores; CR prereqs enforced; can't cast while shifted (except Beast Spells L18); charge decrement; short rest restores; Wild Companion costs Wild Shape use; Primal Strike +1d8 at L7+

**[T101] Circle of the Land**
Natural Recovery revised (recover slots on short rest, total <= ceil(druidLevel/2), no 6th+; 1/LR — TODO: verify 5.2.1 changes), Circle Spells (config), ~~Land's Stride [T09]~~ (dropped), Nature's Ward (revised: immune charm/fright from fey/elemental, immune poison/disease at L10), Nature's Sanctuary (L14: WIS save or must pick different target — caller-provided), Land's Aid (NEW: TODO enumerate 5.2.1 text).
- State: `naturalRecoveryUsed: bool`
- Functions: `pNaturalRecovery(state, config, slotsToRecover)->validate total <= ceil(druidLevel/2), none 6th+`; modify condition resistance for Nature's Ward
- Test: Natural Recovery validates slot total; Nature's Ward blocks specific condition sources; Land's Aid TODO

---

## Sorcerer

```
[T110] Sorcery Points + Flexible Casting (P1) -> deps: [T01]  ✓ done
[T111] Metamagic (P1) -> deps: [T110]
[T112] Draconic Sorcery (P2) -> deps: [T01]
[T112b] Dragon Companion (P3) -> deps: [T112]
```

**[T110] Sorcery Points + Flexible Casting** *(done)*
SRD 5.2.1: subclass at L3 (was L1). New base class features:
- Innate Sorcery (L1): as a BA, activate for 1 min — +1 to spell save DC and Advantage on checks made to maintain concentration; 2 uses/LR
- Sorcery Incarnate (TODO: verify exact level and effect in 5.2.1)
- Arcane Apotheosis (L20): TODO enumerate effect
- Sorcerous Restoration revised (TODO: verify exact 5.2.1 — was +4 FP on short rest)
- State: `sorceryPoints: int`, `innateSorceryActive: bool`, `innateSorceryCharges: int`
- Functions: `pConvertSlotToPoints(state, slotLevel)->gain 1-5 points`; `pConvertPointsToSlot(state, slotLevel)->spend 2-7 points, create slot (max 5th, vanish on LR)`; `pInnateSorcery(state, turnState)->+1 DC + concentration advantage, 1 min`
- Test: correct costs; can't create above 5th; can't overspend; resets on LR; Innate Sorcery uses = 2/LR; +1 DC while active

**[T111] Metamagic**
SRD 5.2.1: 6 original options revised, 2 new options added. Learns 2 at L3, can gain more at higher levels. Only one per spell EXCEPT Empowered which can combine.
- Quickened (2 SP→bonus action cast), Empowered (1 SP→reroll up to CHA mod damage dice), Heightened (3 SP→Disadvantage on first save), Subtle (1 SP→no V/S), Careful (1 SP→chosen creatures auto-succeed save), Extended (1 SP→double duration max 24h)
- NEW: Seeking Spell (2 SP→reroll missed spell attack roll), Transmuted Spell (1 SP→change damage type to acid/cold/fire/lightning/poison/thunder)
- Note: Distant and Twinned may be revised or removed per 5.2.1 — TODO: verify final set from SRD text
- State: `metamagicKnown: Set[Metamagic]`
- Functions: one per metamagic option
- Test: each costs correct SP; Quickened triggers bonus action spell rule; only one per spell except Empowered; Seeking Spell rerolls attack; Transmuted Spell changes type

**[T112] Draconic Sorcery**
SRD 5.2.1 rename: Draconic Bloodline → Draconic Sorcery. Draconic Resilience (13+DEX AC unarmored, +1 HP/level), Draconic Spells (NEW: always prepared spells tied to ancestry type — config, TODO: enumerate), Elemental Affinity (L6: +CHA damage for ancestry type; 1 SP→resistance 1 hour), Dragon Wings (L14: BA fly at walk speed; can't in non-accommodating armor), Draconic Presence (revised — TODO: verify 5.2.1 text).
- **Core dependency:** Draconic Resilience requires `DraconicUD` variant in `UnarmoredDefense` type in `dnd.qnt` and case in `calculateAC`.
- State: `draconicAncestryType: DamageType`, `dragonWingsActive: bool`
- Functions: modify AC for Draconic Resilience (13+DEX); modify max HP; `pElementalAffinity(config, spellDamageType)->+CHA if match`; `pDragonWings->set fly speed = walk speed`
- Test: AC = 13+DEX without armor; +1 HP per sorcerer level; Elemental Affinity only matching type; Dragon Wings blocked by non-accommodating armor

**[T112b] Dragon Companion**
New feature in SRD 5.2.1 Draconic Sorcery. TODO: enumerate full effect from SRD 5.2.1 Classes/Sorcerer section.

---

## Warlock

```
[T120] Warlock Resources (P2) -> deps: [T01]
[T121] Invocations (P2) -> deps: [T120]
[T122] Fiend Patron (P2) -> deps: [T120]
```

**[T120] Warlock Resources**
SRD 5.2.1: subclass at L3 (was L1). Pact Boon eliminated as a class feature — Pact of the Blade/Chain/Tome are now Eldritch Invocation options available from L1. New features:
- Magical Cunning (L2): expend half your pact spell slots (round up) to regain them; 1/LR
- Contact Patron (L9): cast Commune 1/LR as a ritual without a spell slot
- Eldritch Master (L20): revised — as a Magic Action, regain all pact slots (combines old Eldritch Master + Magical Cunning)
- Mystic Arcanum (L11+): 1 each of 6th-9th/LR — unchanged
- State: `mysticArcanumUsed: Set[int]`, `magicalCunningUsed: bool`
- Functions: `pExpendMysticArcanum(state, level)`; `pMagicalCunning(state, config)->regain half pact slots`; `pContactPatron(state)->cast Commune free`; `pEldritchMaster(state)->regain all pact slots`
- Test: Arcanum 1/LR per level; Magical Cunning regains half slots rounded up, 1/LR; Eldritch Master restores all pact slots

**[T121] Invocations**
SRD 5.2.1: 7 new invocations, 18 revised. Pact Boon options now invocations from L1 (Pact of the Blade, Pact of the Chain, Pact of the Tome).

Combat invocations: Agonizing Blast (+CHA to EB per beam), Lifedrinker (+CHA necrotic on pact weapon), Thirsting Blade (Extra Attack with pact weapon at L5+), Repelling Blast (push 10ft per beam), Eldritch Spear (EB range 300ft), Eldritch Smite (NEW: expend pact slot on hit for Radiant damage + Prone — TODO: verify exact), Devouring Blade (NEW: TODO enumerate).

Defensive: Armor of Shadows (Mage Armor at will), Fiendish Vigor (False Life at will), Devil's Sight (120ft darkness vision), One with Shadows (invisible in dim/dark), Eldritch Mind (NEW: Advantage on concentration checks).

Pact Boon: Gift of the Protectors (NEW: Pact of the Chain — TODO), Investment of the Chain Master (NEW: enhance familiar — TODO), Gift of the Depths (NEW: swim speed + water breathing — TODO), Lessons of the First Ones (NEW: gain an Origin feat — TODO).

- State: `invocations: Set[Invocation]`, `pactBoon: PactBoon option` (now derived from invocation choices)
- Functions: modify damage for Agonizing Blast/Lifedrinker; modify AC for Armor of Shadows; Thirsting Blade grants extra attack; `pEldritchMind(state)->advantage on concentration checks`
- Test: Agonizing Blast adds CHA per beam; Lifedrinker adds CHA necrotic; Thirsting Blade requires Pact of Blade invocation + L5+; Eldritch Mind advantage on concentration

**[T122] Fiend Patron**
SRD 5.2.1 rename: The Fiend → Fiend Patron. Dark One's Blessing (revised: temp HP on kill of creature with CR ≥ 1/2 = CHA+warlock level; also triggers on ally kills within 10ft). Dark One's Own Luck (revised: uses = CHA mod per short rest — was 1/SR). Fiendish Resilience (choose resistance type on rest; bypassed by magical/silvered — unchanged). Hurl Through Hell (revised: 8d10 Psychic damage + Incapacitated until end of your next turn; CHA save; 1/LR or expend a pact slot).
- State: `darkOwnLuckUsedCount: int`, `fiendishResistanceType: DamageType`, `hurlUsed: bool`
- Functions: `pDarkOnesBlessing(config)->temp HP`; `pDarkOnesOwnLuck(state, config, d10)->add to check/save; decrement count`; `pFiendishResilience(state, type)->set resistance`; `pHurlThroughHell(state)->8d10 Psychic + Incapacitated on fail`
- Test: Blessing triggers on own kill OR ally kill within 10ft; Own Luck uses = CHA mod/SR; Resilience bypassed by magical/silvered; Hurl 1/LR or pact slot; 8d10 Psychic + Incapacitated on failed CHA save

---

## Wizard

```
[T130] Arcane Recovery (P2) -> deps: [T01]
[T131] Evoker (P2) -> deps: [T130]
```

**[T130] Arcane Recovery**
SRD 5.2.1: subclass at L3 (was L1). New base class features:
- Scholar (L2): Expertise in two skills from Arcana/History/Investigation/Medicine/Nature/Religion; also gain proficiency in one of those skills — TODO: verify exact 5.2.1 text
- Memorize Spell (L5): after each long rest, replace one of your prepared spells with one from your spellbook for free (additional prepared spell slot, effectively — TODO: verify exact mechanic)
- Spell Mastery (L18): chosen 1st+2nd at lowest level without slot — unchanged
- Signature Spells (L20): 3rd-level 1/SR each — unchanged
- Arcane Recovery (unchanged): 1/LR on short rest, recover slots <= ceil(wizard level/2), no 6th+
- State: `arcaneRecoveryUsed: bool`, `spellMasterySlots: Set[int]`, `signatureSpellsUsed: Set[str]`
- Functions: `pArcaneRecovery(state, config, slotsToRecover)->validate sum <= ceil(level/2), none 6th+`; `pScholar(config)->expertise in two skills`
- Test: can't recover 6th+; total <= ceil(half wizard level); once per LR; Scholar expertise on chosen skills

**[T131] Evoker**
SRD 5.2.1 rename: Evocation subclass → Evoker. Sculpt Spells revised per 5.2.1 (choose up to 1+spell level creatures for auto-succeed — TODO: verify exact changes). Potent Cantrip revised (half damage on save success — unchanged). Empowered Evocation revised (+INT mod to one damage roll of wizard evocation spell — unchanged). Overchannel revised (max damage on wizard damage spells 1-5; self necrotic on repeat — TODO: verify if formula changed).
- State: `overchannelUseCount: int`
- Functions: `pPotentCantrip(fullDamage)->floor(fullDamage/2)` on save success; `pEmpoweredEvocation(config, damage)->damage + INT mod`; `pOverchannel(state, diceCount, dieSize)->diceCount*dieSize`
- Test: Potent Cantrip half on save; Empowered adds INT to one roll; Overchannel max damage; first free, subsequent cost escalating necrotic

---

## Species Traits

```
[T140] Combat Species Traits (P2) -> deps: [T01]
[T141] Species Save/Resistance Modifiers (P2) -> deps: [T01]
```

SRD 5.2.1 structural changes: `race`/`subrace` → `species` (no subraces). Elf uses lineage options (Drow, High Elf, Wood Elf — not subraces in config sense). Ability score increases come from Background. **Removed species:** Half-Orc, Half-Elf. **New species:** Orc, Goliath. Subraces eliminated.

**[T140] Combat Species Traits**
SRD 5.2.1 species: Human (no combat traits), Elf (lineage options), Dwarf, Halfling, Gnome, Dragonborn (revised), Tiefling (revised), Orc (NEW), Goliath (NEW).

Traits:
- **Small species Heavy Weapon Disadvantage** (Halfling, Gnome): Disadvantage on attacks with Heavy weapons — unchanged
- **Orc Relentless Endurance** (Orc replaces Half-Orc): when you drop to 0 HP, drop to 1 HP instead; 1/LR
- **Orc Adrenaline Rush** (NEW, Orc): take the Dash action as a BA; gain temp HP = prof bonus; uses = prof bonus/LR
- **Halfling Lucky**: reroll nat 1 on any d20 — unchanged
- **Dragonborn Breath Weapon**: revised per 5.2.1 — TODO: verify exact scaling and DC formula
- **Halfling Nimbleness**: move through larger creature's space — unchanged
- **Goliath Giant Ancestry** (NEW): choose one of 6 options; all cost Prof Bonus uses/LR:
  - Cloud's Jaunt: BA — teleport 30 ft to visible unoccupied space
  - Fire's Burn: BA (on hit) — +1d10 Fire damage
  - Frost's Chill: BA (on hit) — +1d6 Cold + Speed −10 ft until start of your next turn
  - Hill's Tumble: BA (on hit vs Large or smaller) — Prone
  - Stone's Endurance: Reaction (take damage) — roll 1d12+CON, reduce damage by that total
  - Storm's Thunder: Reaction (take damage from creature ≤60 ft) — deal 1d8 Thunder to that creature
  Additional traits: Large Form (L5+, 1/LR BA → Large size 10 min, +10 Speed, Adv STR checks); Powerful Build (passive — Adv end Grappled, count as one size larger for carry)
- **Savage Attacks (Half-Orc)**: REMOVED — Half-Orc no longer exists in SRD 5.2.1
- State: `relentlessEnduranceUsed: bool`, `adrenalineRushCharges: int`, `breathWeaponUsed: bool`, `giantAncestryChoice: GiantAncestryOption`
- Functions: `pRelentlessEndurance(state)->drop to 1 HP instead of 0`; `pAdrenalineRush(state, config)->Dash + temp HP = prof bonus`; `pHalflingLucky(d20)->reroll if 1`; `pBreathWeapon(state, config, savedRolls)->area damage, 1/SR`; `pGiantAncestry(state, choice, ...)->BA/Reaction per option above`
- Test: Relentless Endurance 1/LR; Adrenaline Rush = prof bonus uses/LR + temp HP; Lucky rerolls 1s; Breath Weapon 1/SR; Goliath option as per SRD

**[T141] Species Save/Resistance Modifiers**
All traits revised against SRD 5.2.1 text:
- **Dwarven Resilience**: Advantage on saves vs Poison + Resistance to Poison damage — TODO: verify exact 5.2.1 text
- **Dwarf Heavy Armor Speed**: no speed penalty in heavy armor — config flag
- **Gnome Cunning**: Advantage on INT/WIS/CHA saves vs magic — unchanged
- **Halfling Brave**: Advantage vs Frightened — unchanged
- **Tiefling Hellish Resistance**: Fire Resistance — unchanged
- **Dragonborn Damage Resistance**: match ancestry type — unchanged in concept, revised per 5.2.1
- **Hill Dwarf Toughness**: +1 HP/level — TODO: verify if still exists in 5.2.1
- **Tiefling Infernal Legacy**: racial spells at 1/LR — TODO: verify 5.2.1 spell list
- **Fey Ancestry** (Elf): Advantage on saves vs Charmed — all lineages (base trait, unchanged). Sleep immunity not in 5.2.1 text.
- State: `infernalLegacyHellishRebukeUsed: bool`, `infernalLegacyDarknessUsed: bool`
- Functions: modify saves/damage for each trait
- Test: per trait — verify against SRD 5.2.1 text before implementation

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

All spell tasks implement spell-specific behavior in TypeScript. Each spell is expressed as a composition of core primitives (active effect lifecycle, conditions, damage/healing, action economy).

**[T150] Damage Patterns**
4 damage patterns: save-for-half, attack-roll, auto-hit (Magic Missile), save-or-nothing. Plus repeatable attack spells (Vampiric Touch, Spiritual Weapon, Flame Blade, Call Lightning, Moonbeam, Spirit Guardians, Counterspell, Disintegrate, Arcane Sword).
NEW spells (TODO entries): Aura of Life, Charm Monster, Chromatic Orb, Dragon's Breath, Elementalism, Hex, Ice Knife, Mind Spike, Phantasmal Force, Ray of Sickness, Searing Smite, Sorcerous Burst, Starry Wisp, Summon Dragon, Tsunami, Vitriolic Sphere.

**[T151] Healing Spells**
Cure Wounds, Healing Word, Prayer of Healing, Mass Cure Wounds, Heal, Mass Heal, Spare the Dying, Goodberry, Beacon of Hope, Regenerate.
NEW (TODO): Power Word Heal.

**[T152] AC/Defense Buff Spells**
Shield, Mage Armor, Shield of Faith, Barkskin, Fire Shield, Mirror Image, Stoneskin, Sanctuary, Protection from Evil and Good, Holy Aura, Globe of Invulnerability.

**[T153] Condition Debuff Spells**
Hold Person/Monster, Blindness/Deafness, Fear, Confusion, Hypnotic Pattern, Sleep, Slow, Entangle/Web, Flesh to Stone, Bestow Curse, Heat Metal, Compulsion, Dominate Beast/Person/Monster, Banishment, Color Spray, Eyebite, **Befuddlement** (was Feeblemind), Irresistible Dance, Phantasmal Killer.
NEW (TODO): Dissonant Whispers, Ensnaring Strike.

**[T154] Condition Buff Spells**
Haste, Greater Invisibility, Freedom of Movement, Blur, Invisibility, Mind Blank, Foresight.

**[T155] Condition Removal Spells**
Lesser Restoration, Greater Restoration, Remove Curse, Dispel Magic.

**[T156] Stat Buff/Debuff Spells**
Bless, Bane, Enhance Ability, Aid, Heroism, Hunter's Mark, Ray of Enfeeblement, Warding Bond, Protection from Energy, Faerie Fire, Death Ward, Divine Favor, Magic Weapon, Enlarge/Reduce, **Shining Smite** (was Branding Smite).
NEW (TODO): Divine Smite (spell, referenced from T61).

**[T157] Temp HP Spells**
False Life, Heroism (also in T156).

**[T158] Revive Spells**
Revivify, Raise Dead, Resurrection, True Resurrection.

**[T159] Cantrip Scaling + Cantrip Debuffs**
Damage cantrips add dice at 5/11/17. Vicious Mockery, Shocking Grasp, Chill Touch debuffs.
NEW (TODO): Starry Wisp (cantrip).

**[T160] Power Words + Divine Word**
Power Word Stun, Power Word Kill, Divine Word (HP-threshold effects).
NEW (TODO): Power Word Heal (in T151).

**[T161] Polymorph**
WIS save or transform. ALL ability scores replaced, CR cap = target level/CR, no effect on shapechangers or 0 HP. Revert on 0 HP with overflow. Concentration.

---

## Weapon Mastery

```
[T170] Weapon Mastery Effects (P3) -> deps: none
```

**[T170] Weapon Mastery Effects**
SRD 5.2.1: each weapon has a Mastery property. Only classes/features that grant weapon mastery can use them. Effects (TODO: implement each per SRD 5.2.1 Equipment):
- **Cleave**: when you hit with a Slashing weapon, deal the weapon's damage die to another creature within reach (no modifier)
- **Graze**: when you miss an attack, deal STR or DEX mod (min 1) damage of the weapon's type to the target
- **Nick**: when you make an Extra Attack, one additional attack can be made with a Light weapon in your off-hand (extends TWF)
- **Push**: on hit, push target up to 10ft away
- **Sap**: on hit, target has Disadvantage on its next attack before your next turn
- **Slow**: on hit, target's Speed reduced by 10ft until start of your next turn
- **Topple**: on hit, STR/DEX save or Prone
- **Vex**: when you hit a target, gain Advantage on your next attack against that target before end of your next turn
- State: `weaponMastery: WeaponMasteryProperty option` on weapon config; `hasWeaponMastery: bool` in CharConfig
- Functions: one per mastery effect; all pure, caller-invoked on hit/miss
- Test: per mastery effect; can't use without weapon mastery feature; correct trigger (on hit vs on miss vs on kill)

---

## Equipment Updates (SRD 5.2.1)

- **New weapons**: Musket (ranged, TODO stats), Pistol (ranged, TODO stats)
- **Net**: moved from weapon to adventuring gear (no longer has weapon mastery)
- **Potion of Healing**: now a Bonus Action to drink (was Action)
- **Removed fighting styles**: Dueling, Protection not in SRD 5.2.1 — see T05

---

## Feat System

```
[T200] Grappler Feat (P4) -> deps: none  ✓ done
[T201] Feat System Framework (P2) -> deps: [T01]  ✓ done
```

**[T201] Feat System Framework** *(done)*
Prerequisite checking for feat categories. `feats: Set[Feat]` and `epicBoon` deferred until concrete Origin/General/Epic Boon feats get mechanics.
- Functions: `pCanTakeFightingStyleFeat`, `pCanTakeEpicBoon`
- `pApplyASI` already existed

**[T200] Grappler Feat** *(done)*
SRD 5.2.1 revised: Pin mechanic removed, replaced with Punch and Grab + Fast Wrestler.
Prereq: STR or DEX 13+. Attack Advantage on attacks against creature you're grappling. Punch and Grab (once/turn: combine Damage and Grapple on Unarmed Strike hit). Fast Wrestler (no extra movement cost to drag creatures your size or smaller).
- Functions: `grapplerAttackAdvantage`, `resolvePunchAndGrab`, `grapplerMovementCost`, `canTakeGrapplerFeat`
- Test: advantage only against grappled target; Punch and Grab combines damage+grapple; Fast Wrestler removes drag penalty; prereq STR or DEX 13+

---

## Suggested Execution Order

Core is complete (PLAN.md). This file is now the active plan. All tasks are unblocked.

1. ~~**[T01]** Config Identity + species~~ ✓, **[T01.5]** Multiclass Proficiency Rules
2. ~~**[T03, T04, T06, T08]** Shared mechanics~~ ✓ (T09 dropped — not in SRD 5.2.1)
3. ~~**[T07]** Channel Divinity (needs T01; unblocks Paladin/Cleric)~~ ✓
4. ~~**[T201]** Feat System Framework; then **[T05]** Fighting Style Feats (needs T201)~~ ✓
5. ~~**P1 class features** — T10 Rage, T11 Reckless, T20 Second Wind, T21 Action Surge, T30 Sneak Attack, T40 Focus Pool, T41 Martial Arts, T60 Lay on Hands, T61 Paladin's Smite, T100 Wild Shape, T110 Sorcery Points; T200 Grappler Feat~~ ✓
6. **P1 dependent** — T13 Berserker (needs T10), T23 Champion (needs T02+T05), T31 Cunning Action (needs T06), T42 Focus Actions (needs T40+T06), T43 Stunning Strike (needs T40)
7. **P1-P2 spells** — T150 Damage Patterns, T152 AC/Defense Buffs, T153 Condition Debuffs (all need T08)
8. **P2-P3 class features, species traits, T170 Weapon Mastery** in any order — **T20b** Fighter Base Features must follow T170 (needs T01+T170)
9. **P2-P3 spells, remaining** in any order

---

## SRD Spell Count

| Category | Count | Task |
|----------|-------|------|
| Damage (incl. repeatable attack spells) | ~70 + 16 new | T150 |
| Healing | ~12 + 1 new | T151 |
| AC/Defense Buffs | ~8 | T152 |
| Condition Debuffs | ~25 + 2 new | T153 |
| Condition Buffs | ~5 | T154 |
| Condition Removal | ~8 | T155 |
| Stat Buff/Debuff | ~15 + 1 new | T156 |
| Temp HP | ~5 | T157 |
| Revive | ~5 | T158 |
| Cantrip Scaling | pattern | T159 |
| Power Words | 2 | T160 |
| Polymorph | 1+True | T161 |
| Summon (~50), Utility (~110) | ~160 | Not modeled |

New in 5.2.1: 20 spells added (distributed across T150-T156 as TODO entries).

## What is NOT Formalized

- Subclasses beyond the 12 SRD subclasses (1 per class)
- Spells not in SRD 5.2.1
- Feats beyond those enumerated per category (TODO: full enumeration)
- Species/lineages beyond SRD 5.2.1 list
- Battlemaps/grids/coordinates
- AoE geometry
- Multi-creature encounter state
- DM-fiat mechanics
- Monsters/NPCs, Magic items, Backgrounds, Alignment
- Improvised weapons, Help action, Ready action spell-holding
- Spellbook mechanics, non-combat species traits
- Charmed social interaction, Antimagic Field interactions
- Dragon Companion (T112b) — perpetual TODO, not v1
