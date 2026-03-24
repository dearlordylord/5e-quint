# D&D 5e SRD 5.1 — Quint Specification Plan

Source: SRD 5.1 (CC-BY-4.0). Reference: `.references/srd/`
Single-creature state machine. All dice pre-resolved. Multi-creature interactions caller-provided.

> **NOTE — Suggestive, not prescriptive.** Function names, signatures, state fields, and type
> definitions listed in tasks below are *illustrative suggestions* to communicate intent and scope.
> The implementer decides the actual Quint design — names, decomposition, data representations —
> and iterates freely. Treat task descriptions as "what to model," not "how to type it."

## Completed

Core types, config, d20 resolution, equipment, HP/death saves, 14 conditions + exhaustion,
turn structure & action economy, attack resolution, combat actions, two-weapon fighting,
grapple & shove, opportunity attacks, mounted combat (partial), movement system,
spellcasting framework (slots, concentration, ritual, bonus action rule, multiclass slots),
resting, environment, character construction & leveling, unarmored defense (Barbarian/Monk
AC formulas already in `CharConfig.unarmoredDefense`), Extra Attack (`FExtraAttack` variants).
MBT infrastructure wired to `@firfi/quint-connect`.

---

## Task DAG

### Priority Tiers

- **P1**: Directly enriches existing combat loop (attack modifiers, damage, AC, action economy). High test value.
- **P2**: Important but less interactive with existing spec (resource pools, passive bonuses).
- **P3**: Large surface area, moderate per-item complexity (individual spells, invocations).
- **P4**: Small/niche (single feat, config-only traits).

### Notation

`[Txx] Name (Pn) → deps: [Tyy, Tzz]`
Each task lists: state additions, new pure functions, and test criteria.

---

### Foundation

```
[T01] Config Identity Extensions (P1) → deps: none
[T01.5] Multiclass Proficiency Rules (P2) → deps: [T01]
[T02] Crit Range Parameterization (P1) → deps: none
[T03] Evasion (shared mechanic) (P1) → deps: none
[T04] Uncanny Dodge (shared mechanic) (P1) → deps: none
[T05] Fighting Styles (P1) → deps: none
[T06] Bonus-Action-As-Action Pattern (P1) → deps: none
[T07] Channel Divinity Framework (P2) → deps: [T01]
[T08] Spell Effect Data Model (P2) → deps: none
[T09] Land's Stride (shared mechanic) (P2) → deps: none
[T10a] Cover (P1) → deps: none
[T10b] Condition-Attack Interactions (P1) → deps: none
[T10c] Resistance Stacking & Order of Operations (P1) → deps: none
[T10d] Underwater Combat (P3) → deps: none
[T10e] Squeezing (P3) → deps: none
[T10f] Flying Falls (P2) → deps: none
```

**[T01] Config Identity Extensions**
Extend `CharConfig` with `className`, `subclass`, `race`, `subrace`, `classLevels`, `fightingStyles`.
Extend `Feature` sum type or replace with `(class, level)` derivation.
- State: config fields only, no mutable state
- Test: construct configs for each class/race combo; verify `extraAttacksFromConfig`, `proficiencyBonus` still work

**[T01.5] Multiclass Proficiency Rules**
When multiclassing into a non-starting class, only partial proficiencies are gained (varies per class: Fighter gets armor/weapons/shields, Wizard gets nothing, etc.). Affects AC and weapon eligibility. Attacking with a non-proficient weapon: no proficiency bonus added to attack roll (NOT disadvantage). Druid restriction: will not wear metal armor or shields (config flag).
- State: `startingClass: ClassName` in config; per-class multiclass proficiency table as pure lookup
- Functions: `pMulticlassProficiencies(className) → Set[Proficiency]`; modify `pResolveAttack` to omit proficiency bonus for non-proficient weapons; integrate with AC/attack resolution
- Constraint: Unarmored Defense can't be gained from a second class if already possessed; Extra Attack from multiple classes doesn't stack (can't exceed 2 attacks unless class feature says otherwise, e.g. Fighter); Thirsting Blade doesn't add to Extra Attack
- Test: Wizard multiclass gains no new proficiencies; Fighter multiclass gains light/medium armor + shields + simple/martial weapons; Bard multiclass gains light armor + 1 skill; attack with non-proficient weapon has no prof bonus (not disadvantage); Barbarian/Monk multiclass doesn't grant second Unarmored Defense

**[T02] Crit Range Parameterization**
Replace hardcoded `d20Roll == 20` crit check with `d20Roll >= critRange` in `pResolveAttack`.
Add `critRange: int` to config (default 20). Champion sets 19/18.
- State: `critRange` in config
- Functions: modify `pResolveAttack`
- Test: crit on 19 with critRange=19; no crit on 19 with critRange=20; crit on 18 with critRange=18

**[T03] Evasion (shared)**
Used by Rogue 7, Monk 7, Hunter 15. `pEvasion(dexSaveSucceeded, fullDamage) → 0 on success, floor(fullDamage/2) on fail`.
- State: `hasEvasion: bool` in config (or derived from class+level)
- Functions: `pEvasionDamage`
- Test: save success→0; save fail→half; 0 damage→0; odd damage rounds down

**[T04] Uncanny Dodge (shared)**
Used by Rogue 5, Hunter 15. Reaction: halve one attack's damage.
- State: consumes reaction (already in TurnState)
- Functions: `pUncannyDodge(damage) → floor(damage/2)`; precondition: reaction available AND attacker is visible (can't use vs unseen attacker)
- Test: 10 damage→5; 7→3; can't use twice (reaction consumed); can't use when incapacitated; can't use vs unseen attacker

**[T05] Fighting Styles**
6 styles. Shared by Fighter/Paladin/Ranger. All PASSIVE modifiers.
- State: `fightingStyles: Set[FightingStyle]` in config
- Functions: `pArcheryAttackMod`, `pDefenseACMod`, `pDuelingDamageMod`, `pGWFReroll`, `pTWFDamageMod`, `pProtectionReaction` (caller-provided target)
- Test: Archery +2 on ranged; Defense +1 only with armor; Dueling +2 only one-handed no offhand; GWF reroll 1s/2s; TWF adds mod to offhand; Protection requires shield

**[T06] Bonus-Action-As-Action Pattern**
Generalize the pattern: "use bonus action to take Dash/Disengage/Hide" (Cunning Action, Step of the Wind, Vanish). Pure function takes `turnState` + `actionChoice` → modified `turnState` with bonus used + action effect applied.
- Functions: `pBonusActionDash`, `pBonusActionDisengage`, `pBonusActionHide`
- Test: bonus action consumed; movement doubled (Dash); disengaged set; can't use if bonus already used

**[T07] Channel Divinity Framework**
Shared by Cleric and Paladin. Resource: 1-3 charges/short rest (scales with level). Multiple sources (multiclass) don't stack charges, but you can choose effects from either class.
- State: `channelDivinityCharges: int`, `channelDivinityMax: int`
- Functions: `pExpendChannelDivinity(state)`, `pRestoreChannelDivinity(state, config)`
- Test: expend decrements; can't expend at 0; short rest restores to max; max scales with level; multiclass doesn't double charges

**[T08] Spell Effect Data Model**
Define `SpellEffectType` sum type and `SpellData` record (name, level, school, casting time, concentration, components). Foundation for all spell effect tasks.
- State: type definitions only
- Test: construct sample spells; verify field access

**[T09] Land's Stride (shared)**
Used by Ranger 8, Druid (Land) 6. Nonmagical difficult terrain costs no extra movement; nonmagical plants don't slow or damage; advantage on saves vs magical plants.
- State: `hasLandsStride: bool` in config
- Functions: modify `pMovementCost` — if hasLandsStride and nonmagical: cost=1
- Test: difficult terrain cost 1 (not 2) with Land's Stride; magical still 2

**[T10a] Cover**
Half cover: +2 AC + +2 DEX saves. Three-quarters cover: +5 AC + +5 DEX saves. Total cover: can't be targeted directly. Multiple cover sources don't stack — only the most protective degree applies. Cover is caller-provided (the spec tracks the bonus, caller decides if cover exists).
- State: `coverBonus: 0 | 2 | 5` (or `CoverLevel: None | Half | ThreeQuarters | Total`)
- Functions: modify `pCalculateAC` and `pGetSaveModifiers` for DEX saves to add cover bonus; modify `pCanTarget` for total cover
- Test: half cover +2 AC and +2 DEX save; three-quarters +5/+5; total cover blocks targeting; cover doesn't affect non-DEX saves; multiple cover sources use best only (don't stack)

**[T10b] Condition-Attack Interactions**
Auto-crit: attacks that hit a paralyzed or unconscious creature within 5 feet are automatic critical hits. Auto-fail saves: paralyzed, stunned, unconscious, and petrified creatures automatically fail STR and DEX saving throws. Petrified also grants resistance to all damage. These are core condition effects that interact with attack and save resolution.
- Functions: modify `pResolveIncomingAttack` to auto-crit if target is paralyzed/unconscious and attacker within 5ft; modify `pResolveSave` to auto-fail STR/DEX if paralyzed/stunned/unconscious/petrified
- Test: melee attack on paralyzed target within 5ft is auto-crit; ranged attack on paralyzed target is NOT auto-crit; paralyzed creature auto-fails DEX save (e.g. Fireball); stunned creature auto-fails STR save; petrified creature auto-fails both; unconscious at 0 HP + auto-crit within 5ft = two death save failures; petrified creature has resistance to all damage

**[T10c] Resistance Stacking & Order of Operations**
Multiple instances of resistance (or vulnerability) to the same damage type count as only one instance. Order: apply all flat modifiers first, then halve for resistance, then double for vulnerability. Resistance and vulnerability on the same type: apply resistance first (halve), then vulnerability (double) = 1× net (SRD applies both in order, not skips both).
- Functions: modify `pCalculateFinalDamage` to enforce single-instance and correct ordering
- Test: Rage B/P/S resistance + Stoneskin B/P/S resistance = one instance of halving (not quarter); resistance + vulnerability = apply both in order (halve then double = 1×); flat bonuses applied before halving

**[T10d] Underwater Combat**
Melee weapons (except dagger, javelin, shortsword, spear, trident): disadvantage on attack rolls unless creature has swim speed. Ranged weapons: auto-miss beyond normal range; disadvantage within normal range (except crossbow, net, javelin-like thrown). Fully immersed creatures have fire resistance.
- State: `isUnderwater: bool` (for attack penalties), `isFullySubmerged: bool` (for fire resistance — stricter than merely underwater)
- Functions: modify `pGetOwnAttackModifiers` for underwater melee/ranged penalties; modify `pApplyDamageModifiers` for fire resistance when fully submerged
- Test: underwater melee with longsword = disadvantage without swim speed; underwater melee with shortsword = no penalty; underwater ranged beyond normal range = auto-miss; fully submerged = fire resistance (wading does not grant fire resistance)

**[T10e] Squeezing**
A creature can squeeze through a space one size smaller. While squeezing: +1 extra foot per foot moved, disadvantage on attack rolls and DEX saves, advantage on attacks against the creature.
- State: `isSqueezed: bool`
- Functions: modify `pGetOwnAttackModifiers` for disadvantage; modify `pGetDefenseModifiers` for advantage against; modify `pGetSaveModifiers` for DEX disadvantage; modify `pMovementCost` for +1
- Test: squeezing = disadvantage on own attacks; attacks against have advantage; DEX saves at disadvantage; movement costs +1 per foot

**[T10f] Flying Falls**
A flying creature knocked prone, with speed reduced to 0, or otherwise deprived of ability to move, falls — unless it can hover or is held aloft by magic. Falling creature descends up to 500 feet instantly and takes 1d6 bludgeoning per 10 feet fallen.
- State: derived from `isFlying`, `isProne`, `speed == 0`, `canHover`
- Functions: `pCheckFlyingFall(isFlying, isProne, speed, canHover, isMagicallyAloft)→falls if flying + (prone or speed==0) and !canHover and !isMagicallyAloft`
- Test: flying + prone = falls; flying + speed 0 = falls; flying + prone + hover = doesn't fall; flying + prone + fly spell (magically aloft) = doesn't fall; falling damage = 1d6 per 10 feet

---

### Barbarian

```
[T10] Rage (P1) → deps: [T01]
[T11] Reckless Attack (P1) → deps: [T01]
[T12] Barbarian Passives (P2) → deps: [T01]
[T13] Berserker (P2) → deps: [T10]
```

**[T10] Rage**
- State: `raging: bool`, `rageCharges: int`, `rageMaxCharges: int`, `attackedHostileThisTurn: bool`, `tookDamageThisTurn: bool` (for rage-expiry tracking)
- Functions: `pEnterRage`, `pEndRage`, `pRageDamageBonus(level)→+2/+3/+4`, modify `pApplyDamageModifiers` for B/P/S resistance while raging, modify `pGetSaveModifiers` for advantage on STR saves, modify `pGetCheckModifiers` for advantage on STR checks, block spellcasting while raging; entering rage drops any active concentration spell
- Test: enter rage decrements charges; can't rage at 0 charges; can't rage in heavy armor; +2 damage at level 1; B/P/S resistance halves damage; advantage on STR saves; can't cast while raging; entering rage breaks concentration; rage ends after 1 min / no attack or damage taken / unconscious / choice

**[T11] Reckless Attack**
- State: `recklessThisTurn: bool` on TurnState
- Functions: `pDeclareReckless(turnState)`, modify `pGetOwnAttackModifiers` for advantage on melee STR attacks, modify `pGetDefenseModifiers` for advantage on attacks against until next turn
- Test: declaring reckless grants advantage on own STR melee; attacks against have advantage; resets on turn start; only melee STR (not ranged, not DEX)

**[T12] Barbarian Passives**
Danger Sense, Fast Movement, Brutal Critical, Feral Instinct, Relentless Rage, Persistent Rage, Indomitable Might, Primal Champion.
- State: `relentlessRageDC: int` (10, +5 per use)
- Functions: modify `pGetSaveModifiers` for Danger Sense (advantage DEX saves vs visible, not blinded/deaf/incap); modify `pCalculateEffectiveSpeed` for Fast Movement (+10, no heavy armor); modify `pCalculateDamage` for Brutal Critical (+1/2/3 dice on **melee** crit only at 9/13/17); `pRelentlessRage(conSaveResult, dc)→stay at 1 HP or fall`; `pIndomitableMight(strScore, rollResult)→max(strScore, rollResult)` for STR checks; Feral Instinct: advantage on initiative, can act first turn if entering rage while surprised; Persistent Rage (15th): rage only ends if unconscious or by choice (remove attack/damage-taken timer requirement); Primal Champion (20th): STR +4, CON +4, maximums raised to 24
- Test: Danger Sense advantage only when not blinded/deafened/incapacitated and effect is visible; Fast Movement +10 only without heavy armor; Brutal Critical adds correct extra dice per tier (melee only, NOT ranged crits); Relentless Rage DC increments by 5, resets to 10 on short or long rest; Indomitable Might replaces low STR check rolls; Persistent Rage at 15 doesn't expire from inaction; Primal Champion increases ability scores and caps

**[T13] Berserker**
Frenzy, Mindless Rage, Intimidating Presence, Retaliation.
- State: `frenzyActive: bool`
- Functions: `pActivateFrenzy(state)→frenzyActive during rage`, modify `pEndRage` to add exhaustion if frenzy was active, modify condition application to block charmed/frightened while raging (Mindless Rage at 6+); if already charmed/frightened on rage entry, those effects are **suspended** (not removed) for rage duration, resume when rage ends, Intimidating Presence (action, 30ft, target must be able to see or hear you, WIS save DC 8+prof+CHA, frightened until end of next turn, can extend with action each turn; 24hr immunity on success — caller-provided for multi-creature targeting) and Retaliation (14th: reaction melee attack when you take damage from creature within 5ft; consumes reaction)
- Test: Frenzy grants bonus action melee on turns AFTER activation (not same turn); ending frenzy rage +1 exhaustion; Mindless Rage blocks charmed/frightened while raging + suspends pre-existing effects (resume on rage end); exhaustion stacks; Retaliation consumes reaction, requires taking damage from creature within 5ft

---

### Fighter

```
[T20] Second Wind (P1) → deps: [T01]
[T21] Action Surge (P1) → deps: [T01]
[T22] Indomitable (P2) → deps: [T01]
[T23] Champion (P1) → deps: [T02, T05]
```

**[T20] Second Wind**
- State: `secondWindUsed: bool`
- Functions: `pSecondWind(state, config, d10Roll)→heal(1d10+fighterLevel), mark used`; precondition: not used, bonus action available
- Test: heals correct amount; can't exceed maxHp; consumes bonus action; can't use twice; resets on short rest

**[T21] Action Surge**
- State: `actionSurgeCharges: int`
- Functions: `pActionSurge(turnState)→reset actionUsed to false`; decrement charges; precondition: not already used Action Surge this turn
- Test: grants second action; can't use at 0 charges; resets on short rest; 2 charges at level 17; can only use ONE Action Surge per turn (even with 2 charges)

**[T22] Indomitable**
- State: `indomitableCharges: int`
- Functions: `pIndomitable(state, newRoll)→use new roll for save`; decrement charges
- Test: expend charge; can't at 0; resets on long rest; 1 charge at 9, 2 at 13, 3 at 17

**[T23] Champion**
Improved Critical, Remarkable Athlete, Additional Fighting Style, Superior Critical, Survivor.
- State: uses `critRange` from [T02]; additional fighting style uses [T05]
- Functions: set critRange=19 at 3, 18 at 15; `pRemarkableAthlete(profBonus, isSTRDEXCON, hasProficiency)→add ceil(profBonus/2) if not proficient` (rounds UP per SRD); `pSurvivor(state, config)→heal 5+CON mod at turn start if 0 < hp <= maxHp/2`
- Note: Fighter Extra Attack scales to 4 total attacks at level 20 (3 at 11, 4 at 20) — already modeled via `FExtraAttack` variants (FExtraAttack = 2, FExtraAttack2 = 3, FExtraAttack3 = 4 total attacks)
- Test: crit on 19 at Champion 3; crit on 18 at Champion 15; Remarkable Athlete adds ceil(half prof) only to unproficient STR/DEX/CON checks; Survivor heals at turn start only when > 0 and <= half; Survivor doesn't heal at 0 or above half

---

### Rogue

```
[T30] Sneak Attack (P1) → deps: [T01]
[T31] Cunning Action (P1) → deps: [T06]
[T32] Rogue Passives (P2) → deps: [T01, T03, T04]
[T33] Thief (P3) → deps: [T31]
```

**[T30] Sneak Attack**
- State: `sneakAttackUsedThisTurn: bool`
- Functions: `pSneakAttackDice(rogueLevel)→ceil(level/2)`, `pCanSneakAttack(hasAdvantage, allyAdjacentAndNotIncapacitated, isFinesse, isRanged)→bool`, `pApplySneakAttack(state, diceResult)→add damage + mark used`
- Test: correct dice count per level (1d6 at 1, 5d6 at 9, 10d6 at 19); requires finesse or ranged; requires advantage OR non-incapacitated ally adjacent to target; only once per turn; resets on turn start

**[T31] Cunning Action**
Uses [T06] pattern. Rogue 2+: Dash/Disengage/Hide as bonus action.
- Functions: `pCunningAction(turnState, choice)` — delegates to [T06] functions
- Test: each of three options works as bonus; can't use if bonus already used; requires Rogue 2+

**[T32] Rogue Passives**
Expertise (double prof on 2 skills at 1st, 2 more at 6th), Evasion [T03], Uncanny Dodge [T04], Reliable Talent, Slippery Mind, Elusive, Blindsense, Stroke of Luck.
- State: `strokeOfLuckUsed: bool`
- Functions: `pReliableTalent(d20, isProficient)→max(10, d20) if proficient`; modify `pGetDefenseModifiers` for Elusive (no advantage on attacks against, unless incapacitated); `pStrokeOfLuck()→turn missed attack into hit, OR treat failed ability check as 20 (NOT saves)`; Slippery Mind (15th): add WIS save proficiency
- Test: Reliable Talent replaces 9→10 but not 11→11; Elusive cancels advantage from all sources; Stroke of Luck only on missed attack or failed ability check (not saves), resets on short rest; Blindsense is config flag (caller-provided)

**[T33] Thief**
Fast Hands (Use Object, disarm trap/open lock with thieves' tools, or Sleight of Hand check as bonus via Cunning Action), Second-Story Work (climbing free, jump +DEX), Supreme Sneak (advantage Stealth if <= half speed), Use Magic Device (config flag), Thief's Reflexes (17th: two turns in first round at normal initiative and initiative−10; can't use if surprised).
- Functions: modify `pMovementCost` for climbing cost=1 with Second-Story Work; modify jump distance +DEX mod; Fast Hands extends Cunning Action options to include Use Object
- Test: climbing cost 1 (not 2); jump distance increased by DEX mod; Fast Hands adds Use Object to Cunning Action; Thief's Reflexes is caller-managed (initiative ordering)

---

### Monk

```
[T40] Ki Pool (P1) → deps: [T01]
[T41] Martial Arts (P1) → deps: [T01]
[T42] Ki Actions (P1) → deps: [T40, T06]
[T43] Stunning Strike (P1) → deps: [T40]
[T44] Monk Passives (P2) → deps: [T01, T03]
[T45] Monk Reactions (P2) → deps: [T40]
[T46] Open Hand (P2) → deps: [T42]
```

**[T40] Ki Pool**
- State: `kiPoints: int`, `kiMax: int`
- Functions: `pExpendKi(state, cost)`, `pRestoreKi(state, config)` (short rest → full)
- Test: expend decrements; can't expend below 0; short rest restores to max=monk level; Perfect Self (20): regain 4 on initiative if 0

**[T41] Martial Arts**
- State: none new (derived from class+level)
- Functions: `pMartialArtsDie(monkLevel)→d4/d6/d8/d10`; modify attack to allow DEX for unarmed/monk weapons; bonus action unarmed strike after Attack action with unarmed strike or monk weapon (no Ki cost)
- Test: d4 at 1, d6 at 5, d8 at 11, d10 at 17; DEX used for unarmed; bonus action unarmed requires Attack action with unarmed/monk weapon (not any weapon)

**[T42] Ki Actions**
Flurry of Blows (1 Ki: 2 unarmed as bonus, replaces Martial Arts bonus), Patient Defense (1 Ki: Dodge as bonus), Step of the Wind (1 Ki: Dash or Disengage as bonus + double jump).
- Functions: `pFlurryOfBlows(state, turnState)`, `pPatientDefense(state, turnState)`, `pStepOfTheWind(state, turnState, choice)`; all consume 1 Ki + bonus action via [T06]
- Test: each costs 1 Ki; each consumes bonus action; Flurry replaces Martial Arts bonus (can't do both); Patient Defense sets dodging; Step of the Wind doubles jump distance

**[T43] Stunning Strike**
1 Ki on melee weapon hit. Target CON save or stunned until end of your next turn.
- Functions: `pStunningStrike(state, targetSaveResult)→expend Ki; if fail: stunned (caller applies)`
- Test: costs 1 Ki; only on melee hit; target stunned on fail; not stunned on success; can use multiple times per turn (each costs Ki)

**[T44] Monk Passives**
Unarmored Movement (+10→+30 speed by level), Ki-Empowered Strikes (magical unarmed at 6), Evasion [T03], Stillness of Mind (action: end charmed/frightened), Purity of Body (immune disease/poison at 10), Tongue of the Sun and Moon (13th: understand all spoken languages — config flag), Diamond Soul (all save prof at 14 + Ki reroll), Timeless Body (15th: age slowly, no food/water — config flag), Empty Body.
- State: derived from level
- Functions: modify `pCalculateEffectiveSpeed` for Unarmored Movement; `pStillnessOfMind(state)→remove charmed+frightened, consume action`; `pDiamondSoulReroll(state, newRoll)→precondition: save failed; expend 1 Ki, use new save result`; `pEmptyBody(state, turnState)→consumes action + 4 Ki, gain invisible + all resistance except force`; also: 8 Ki option → cast astral projection without material components (largely out of combat scope, noted for completeness)
- Test: speed bonus +10 at 2, +15 at 6, +20 at 10, +25 at 14, +30 at 18; Stillness of Mind consumes action; Diamond Soul: proficient in all saves at 14+, Ki reroll only after failed save; Empty Body costs 4 Ki + action

**[T45] Monk Reactions**
Deflect Missiles (reduce ranged damage by 1d10+DEX+level; throw back for 1 Ki if reduced to 0), Slow Fall (reduce fall damage by 5*level).
- Functions: `pDeflectMissiles(state, config, d10, incomingDamage)→reduced damage by 1d10+DEX+level; if 0: can throw back for 1 Ki as part of same reaction (ranged attack, proficient, monk weapon, 20/60 range)`; `pSlowFall(state, config, fallDamage)→max(0, fallDamage - 5*level)`
- Test: Deflect reduces correctly; throw-back costs 1 Ki and requires reduction to 0; Slow Fall at level 4 reduces by 20; both consume reaction

**[T46] Open Hand**
Open Hand Technique (on Flurry hit: DEX save→prone, STR save→pushed 15ft, or no reactions until end of next turn), Wholeness of Body (heal 3*level, 1/long rest), Tranquility (11th: Sanctuary effect after each long rest, WIS save DC 8+WIS+prof to attack you, ends if you attack/cast on hostile), Quivering Palm (3 Ki on unarmed hit; later trigger: CON save or 0 HP or 10d10 necrotic).
- State: `wholenessOfBodyUsed: bool`, `quiveringPalmActive: bool`, `tranquilityActive: bool`
- Functions: `pOpenHandTechnique(choice, targetSaveResult)`, `pWholenessOfBody(state, config)→heal 3*level`, `pTransquility(state)→set active after long rest; ends on hostile action`, `pQuiveringPalm(state)→expend 3 Ki, mark active`, `pTriggerQuiveringPalm(targetSaveResult)→0 HP or 10d10`
- Test: each Open Hand choice validated; Wholeness heals correct amount, 1/long rest; Tranquility active after long rest, ends on attack/spell; Quivering Palm costs 3 Ki; trigger is save-or-die

---

### Paladin

```
[T60] Lay on Hands (P1) → deps: [T01]
[T61] Divine Smite (P1) → deps: [T01]
[T62] Paladin Passives (P2) → deps: [T01, T07]
[T63] Oath of Devotion (P2) → deps: [T07]
```

**[T60] Lay on Hands**
- State: `layOnHandsPool: int`
- Functions: `pLayOnHands(state, amount)→heal up to amount from pool`; `pLayOnHandsCure(state)→spend 5 from pool to cure one disease or poison`
- Test: heal correct amount; pool decrements; can't exceed pool; cure costs 5; resets on long rest; pool = paladin level * 5

**[T61] Divine Smite**
On melee weapon hit, expend spell slot: +2d8 radiant (+1d8 per slot above 1st; +1d8 vs undead/fiend; max 5d8 from slot, but undead/fiend bonus can push to 6d8 total).
- Functions: `pDivineSmiteDamage(slotLevel, isUndeadOrFiend)→dice count`; integrate with slot expenditure
- Test: 1st slot→2d8; 2nd→3d8; 4th slot→5d8 (cap from slot); 4th slot vs undead→6d8 (5+1); Improved Divine Smite (11+): always +1d8 radiant on melee

**[T62] Paladin Passives**
Divine Health (immune disease), Divine Sense (1st: action, detect celestials/fiends/undead within 60ft; 1+CHA mod uses/long rest), Aura of Protection (6th: +CHA mod to all saves for self, minimum bonus of +1; 10ft range for allies — caller-provided for allies; extends to 30ft at 18th; must be conscious), Aura of Courage (10th: immune to frightened for self; 10ft allies caller-provided; 30ft at 18th; must be conscious), Improved Divine Smite (+1d8 radiant on all melee weapon hits at 11; owned by T62, stacks with T61 Divine Smite when both used), Cleansing Touch (end spell, max(CHA mod, 1) charges/long rest).
- State: `divineSenseCharges: int`, `cleansingTouchCharges: int`
- Functions: modify `pApplyCondition` to block disease for Divine Health; Aura of Protection: modify `pGetSaveModifiers` to add CHA mod to own saves while conscious; Improved Divine Smite modifies damage calc; `pCleansingTouch(state)→decrement charges`
- Test: Divine Sense charges = 1+CHA mod, resets long rest; disease immunity; Aura of Protection adds CHA mod (min +1) to own saves (self-buff portion); Improved Divine Smite adds 1d8 to every melee hit at 11+; Cleansing Touch charges = max(CHA mod, 1)

**[T63] Oath of Devotion**
Sacred Weapon (Channel Divinity: +CHA to attacks for 1 min, weapon emits light), Turn the Unholy (Channel Divinity: action, 30ft, WIS save, turned 1 min or until damage — caller-provided for multi-creature targeting), Aura of Devotion (7th: self + 10ft allies can't be charmed while conscious; 30ft at 18th — self portion modeled, ally portion caller-provided), Purity of Spirit (15th: permanent protection from evil/good effect — NO concentration unlike the spell; aberrations/celestials/elementals/fey/fiends/undead have **disadvantage on attack rolls against you**; can't be charmed/frightened/possessed by them), Holy Nimbus (20th: 10 radiant to enemies at turn start within 30ft bright light, advantage on saves vs fiend/undead spells, 1/long rest, 1 min).
- State: `sacredWeaponActive: bool`, `holyNimbusActive: bool`, `purityOfSpiritActive: bool`
- Functions: `pSacredWeapon(state)→expend Channel Divinity, set active`; modify `pResolveAttack` for +CHA (min +1) while active; ends if weapon dropped or unconscious; Purity of Spirit: modify defense/save modifiers vs listed creature types
- Test: Sacred Weapon adds CHA mod to attacks; consumes Channel Divinity; ends if weapon dropped or wielder falls unconscious; Purity of Spirit blocks charm/frighten/possession from specific types; Holy Nimbus is 1/long rest

---

### Ranger

```
[T70] Ranger Passives (P2) → deps: [T01, T05, T09]
[T71] Hunter (P2) → deps: [T01, T03, T04]
```

**[T70] Ranger Passives**
Favored Enemy (config flag, caller bonuses), Natural Explorer (config flag), Fighting Style [T05], Primeval Awareness (3rd: expend spell slot to detect aberrations/celestials/dragons/elementals/fey/fiends/undead within 1mi or 6mi in favored terrain, for 1 min per slot level — minimal state, mostly caller-provided), Land's Stride [T09], Hide in Plain Sight (10th: 1 min camouflage, +10 Stealth vs solid surface; breaks on move/action/reaction), Vanish (Hide as bonus at 14), Feral Senses (no disadvantage from unseen at 18; aware invisible 30ft if not hidden/blinded/deafened), Foe Slayer (+WIS to attack or damage vs favored, 1/turn at 20).
- State: `hideInPlainSightActive: bool`
- Functions: modify `pGetOwnAttackModifiers` for Feral Senses (remove unseen disadvantage); `pFoeSlayer(config, wisMod, isFavoredEnemy)→+WIS to attack or damage if favored enemy`; Vanish uses [T06] Hide-as-bonus pattern; `pHideInPlainSight(state)→+10 Stealth, set active; breaks on move/action/reaction`; Primeval Awareness consumes spell slot (state change only)
- Test: Feral Senses removes disadvantage from unseen; Foe Slayer adds WIS mod; Vanish is bonus action Hide; Hide in Plain Sight +10 breaks on movement

**[T71] Hunter**
Choose-one features per tier (mutually exclusive at each level). Each tier is a separate enum choice in config.

3rd — Hunter's Prey (choose ONE):
- Colossus Slayer (+1d8 if target < max HP, 1/turn)
- Giant Killer (reaction attack after Large+ creature within 5ft hits/misses you, provided you can see the creature)
- Horde Breaker (extra attack on different creature within 5ft of original target)

7th — Defensive Tactics (choose ONE):
- Escape the Horde (OAs against you have disadvantage)
- Multiattack Defense (after a creature **hits** you, +4 AC against all **subsequent** attacks from that same creature for the rest of the turn)
- Steel Will (advantage on saves vs frightened)

11th — Multiattack (choose ONE):
- Volley (ranged attack each creature within 10ft of point in range — caller-provided multi-target)
- Whirlwind Attack (melee attack each creature within 5ft — caller-provided multi-target)

15th — Superior Hunter's Defense (choose ONE):
- Evasion [T03]
- Stand Against the Tide (reaction: force missed melee attacker to repeat attack on another creature of your choice — caller-provided redirect)
- Uncanny Dodge [T04]

- State: `hunterPrey: HunterPreyChoice`, `defensiveTactic: DefensiveTacticChoice`, `multiattack: MultiattackChoice`, `superiorDefense: SuperiorDefenseChoice` — all enums in config
- Functions: `pColossusSlayer(targetBelowMax)→+1d8`; `pHordeBreaker(turnState)→grant one extra attack with same weapon vs different creature within 5ft of original target, 1/turn`; `pMultiattackDefense(alreadyHitBySameCreature)→+4 AC if already hit once this turn`; modify `pGetSaveModifiers` for Steel Will (advantage vs frightened); modify `pCanBeOpportunityAttacked` for Escape the Horde
- Test: Colossus Slayer only when target < max HP, 1/turn; Multiattack Defense +4 AC activates after first hit from same creature (applies to subsequent attacks, not retroactively); each tier choice is mutually exclusive (can't pick two from same tier)

---

### Bard

```
[T80] Bardic Inspiration + Jack of All Trades (P2) → deps: [T01]
[T81] Lore (P3) → deps: [T80]
```

**[T80] Bardic Inspiration + Jack of All Trades + Countercharm + Song of Rest**
- State: `bardicInspirationCharges: int`
- Functions: `pBardicInspirationDie(level)→d6/d8/d10/d12`; `pExpendInspiration(state)→decrement`; `pJackOfAllTrades(profBonus, hasProficiency)→if not proficient: +floor(profBonus/2)`; Countercharm (6th): action to start performance, self + allies within 30ft get advantage on saves vs charmed/frightened until end of next turn (ends early if incapacitated or silenced); Song of Rest (2nd): allies regain extra HP during short rest when spending Hit Dice — `pSongOfRestDie(bardLevel)→d6/d8/d10/d12` at 2/9/13/17; Superior Inspiration (20): regain 1 if 0 at initiative; Expertise (3rd: double prof on 2 skills, 2 more at 10th — config)
- Test: correct die at each tier; charges = max(CHA mod, 1) (minimum 1); recharge long rest (short at 5+); Jack adds half prof to unproficient checks only; Countercharm grants advantage vs charm/frightened, ends on incapacitated/silenced; Song of Rest die scales d6→d12; Superior Inspiration triggers when 0 charges

**[T81] Lore**
Peerless Skill (spend inspiration on own check at 14), Cutting Words (reaction, spend inspiration to subtract from enemy attack/ability/damage roll; creature immune if it can't hear you or is immune to charmed — caller-provided for targeting). Bonus Proficiencies (3 skills) and Additional Magical Secrets are config.
- Functions: `pPeerlessSkill(state, dieRoll)→add die to own check, expend charge`
- Test: Peerless Skill adds die and expends charge; can't use at 0 charges

---

### Cleric

```
[T90] Cleric Base (P2) → deps: [T01, T07]
[T91] Life Domain (P2) → deps: [T90]
```

**[T90] Cleric Base**
Turn Undead (Channel Divinity: action, 30ft, WIS save, turned 1 min or until damage — caller-provided for multi-creature targeting), Destroy Undead (CR threshold by level — caller-provided), Divine Intervention (d100 check — caller-provided).
- Functions: `pDestroyUndeadCR(clericLevel)→0.5/1/2/3/4`; Channel Divinity from [T07]
- Test: CR thresholds at correct levels (0.5 at 5, 1 at 8, 2 at 11, 3 at 14, 4 at 17); Channel Divinity charges correct

**[T91] Life Domain**
Disciple of Life (+2+spell level to healing), Preserve Life (Channel Divinity: action, distribute up to 5×cleric level HP among creatures within 30ft, each restored to at most half its max HP; no undead/constructs — caller-provided for multi-target distribution), Blessed Healer (self-heal 2+spell level when healing **others**, not self), Divine Strike (1d8/2d8 radiant on melee at 8/14), Supreme Healing (max healing dice at 17). Heavy armor proficiency and bonus spells are config.
- Functions: `pDiscipleOfLife(spellLevel)→2+spellLevel`, `pPreserveLife(clericLevel)→total pool = 5*clericLevel`, `pBlessedHealer(spellLevel, targetIsSelf)→if !targetIsSelf: 2+spellLevel`, `pDivineStrike(clericLevel)→1d8 at 8, 2d8 at 14`, `pSupremeHealing(dice, dieSize)→dice*dieSize`
- Test: Disciple of Life correct bonus per spell level; Preserve Life pool = 5*level, each target capped at half max HP; Divine Strike only 1/turn; Supreme Healing returns max

---

### Druid

```
[T100] Wild Shape Framework (P1) → deps: [T01]
[T101] Circle of the Land (P3) → deps: [T01, T09]
```

**[T100] Wild Shape Framework**
Transform: replace STR/DEX/CON/HP/AC/speed with beast form; retain INT/WIS/CHA/proficiencies/features. Damage overflow on revert. Reverts on 0 HP, unconscious (including from spells like Sleep), or death. Transforming does NOT break existing concentration (unlike Rage). Can't cast (until Beast Spells 18; Beast Spells allows V/S only — material components still blocked until Archdruid 20). Max CR by lookup: 1/4 at 2nd, 1/2 at 4th, 1 at 8th+ (no further scaling beyond CR 1; no fly until 8, no swim until 4). Duration = floor(druidLevel/2) hours (rounded down). 2 charges/short rest (unlimited at 20). Archdruid (20th): also ignore V/S/non-costly-M components on all druid spells.
- State: `wildShapeCharges: int`, `inWildShape: bool`, `wildShapeHp: int`, `wildShapeMaxHp: int`, `originalHp: int`, `archdruidActive: bool`
- Functions: `pEnterWildShape(state, config, beastHP, beastMaxHP)`, `pWildShapeDamage(state, amount)→if beast HP 0: revert + overflow`, `pExitWildShape(state)→restore original HP`, `pCanWildShape(config, cr, hasSwim, hasFly)→prereq check`
- Test: entering stores original HP; damage reduces beast HP; overflow carries to real HP; revert restores original; CR prereqs enforced (1/4 at 2, 1/2 at 4, 1 at 8+, no higher); can't cast while shifted (except Beast Spells 18: V/S only, no material); unconscious from Sleep triggers revert; charge decrement; short rest restores; Archdruid at 20 ignores V/S/M; duration = floor(level/2) hours

**[T101] Circle of the Land**
Natural Recovery (recover slots on short rest, up to half druid level rounded up, no 6th+, 1/long rest), Circle Spells (config), Land's Stride [T09], Nature's Ward (immune charm/fright from fey/elemental, immune poison/disease at 10), Nature's Sanctuary (14th: beasts/plants must WIS save or pick different target; 24hr immunity on success — caller-provided).
- State: `naturalRecoveryUsed: bool`
- Functions: `pNaturalRecovery(state, config, slotsToRecover)→validate total <= ceil(druidLevel/2), none 6th+`; modify condition resistance for Nature's Ward
- Test: Natural Recovery validates slot total; Nature's Ward blocks specific condition sources

---

### Sorcerer

```
[T110] Sorcery Points + Flexible Casting (P1) → deps: [T01]
[T111] Metamagic (P1) → deps: [T110]
[T112] Draconic Bloodline (P2) → deps: [T01]
```

**[T110] Sorcery Points + Flexible Casting**
- State: `sorceryPoints: int`
- Functions: `pConvertSlotToPoints(state, slotLevel)→gain 1-5 points`; `pConvertPointsToSlot(state, slotLevel)→spend 2-7 points, create slot (max 5th, vanish on long rest)`
- Test: correct point costs per level; can't create above 5th; can't overspend; resets on long rest; Sorcerous Restoration (20): +4 on short rest

**[T111] Metamagic**
8 options. Sorcerer learns 2 at 3rd, 1 more at 10th, 1 more at 17th (4 total). Only one metamagic per spell cast, EXCEPT Empowered Spell which can be used together with another metamagic.

- Quickened (2 SP→bonus action cast, still triggers bonus action spell rule)
- Empowered (1 SP→reroll up to CHA mod damage dice, minimum of one; can combine with another metamagic on same cast)
- Heightened (3 SP→disadvantage on first save)
- Subtle (1 SP→no V/S)
- Careful (1 SP→chosen creatures auto-succeed save, caller-provided)
- Distant (1 SP→double range; touch becomes 30ft)
- Extended (1 SP→double duration, max 24 hours)
- Twinned (spell level SP, min 1→second target, caller-provided; only single-target spells)

- State: `metamagicKnown: Set[Metamagic]`, `metamagicCount: int` (max 2/3/4 by level)
- Functions: one per metamagic; `pQuickenedSpell(state, turnState)`, `pEmpoweredSpell(state, damageRolls, chaMod, rerolls)`, etc.
- Test: each costs correct SP; Quickened triggers bonus action spell rule; only one metamagic per spell EXCEPT Empowered which can combine; Twinned costs = spell level (min 1); metamagicKnown.size() <= metamagicCount

**[T112] Draconic Bloodline**
Draconic Resilience (13+DEX AC unarmored, +1 HP/level), Elemental Affinity (+CHA damage for ancestry type at 6; 1 SP→resistance for 1 hour at 6), Dragon Wings (bonus action fly at 14; can't use while wearing armor unless armor accommodates wings), Draconic Presence (5 SP: charm/fear aura, uses concentration framework — caller-provided for multi-target).
- State: `draconicAncestryType: DamageType`, `dragonWingsActive: bool`
- Functions: modify `pCalculateAC` for Draconic Resilience (13+DEX); modify max HP calculation; `pElementalAffinity(config, spellDamageType)→+CHA if match`; `pDragonWings(state)→set fly speed = walk speed`
- Test: AC = 13+DEX without armor; +1 HP per sorcerer level; Elemental Affinity only for matching type; Dragon Wings grants fly speed (blocked by non-accommodating armor)

---

### Warlock

```
[T120] Warlock Resources (P2) → deps: [T01]
[T121] Invocations (P2) → deps: [T120]
[T122] The Fiend (P2) → deps: [T120]
```

**[T120] Warlock Resources**
Mystic Arcanum (1 each of 6th-9th/long rest, gained at 11/13/15/17), Pact of the Blade (create weapon, proficient, magical), Pact of the Tome (3 cantrips — config), Pact of the Chain (enhanced Find Familiar — caller-provided familiar actions), Eldritch Master (1/long rest: 1 min to regain all pact slots).
- State: `mysticArcanumUsed: Set[int]`, `pactBoon: PactBoon`
- Functions: `pExpendMysticArcanum(state, level)`, `pCreatePactWeapon(state)`, `pEldritchMaster(state)`
- Test: Arcanum 1/long rest per level; Pact Blade is proficient+magical; Eldritch Master restores pact slots (not regular slots)

**[T121] Invocations**
Mechanically relevant to single-creature state (others are at-will spell access or config flags):

Combat modifiers:
- Agonizing Blast (+CHA to EB damage per beam)
- Lifedrinker (12th, Pact Blade: +CHA necrotic on pact weapon hits, minimum 1)
- Thirsting Blade (5th, Pact Blade: Extra Attack with pact weapon)
- Repelling Blast (push EB target 10ft per beam — caller-provided positioning)
- Eldritch Spear (EB range 300ft)

Defensive/passive:
- Armor of Shadows (Mage Armor at will, no slot)
- Fiendish Vigor (False Life at will as 1st-level, no slot)
- Devil's Sight (see normally in darkness, magical and nonmagical, to 120ft)
- One with Shadows (action: invisible in dim/dark until move/action/reaction)

Spell access (config/at-will):
- Book of Ancient Secrets (Tome: ritual casting from any class)
- Ascendant Step (9th: Levitate at will)
- Otherworldly Leap (9th: Jump at will)
- Witch Sight (15th: see true forms within 30ft)
- Chains of Carceri (15th: Hold Monster 1/long rest per target)
- Plus ~10 more at-will spell invocations (Mask of Many Faces, Misty Visions, etc.)

- State: `invocations: Set[Invocation]`
- Functions: modify damage for Agonizing Blast and Lifedrinker; modify AC for Armor of Shadows; Thirsting Blade grants extra attack with pact weapon; Fiendish Vigor grants temp HP
- Test: Agonizing Blast adds CHA mod per beam; Lifedrinker adds CHA mod necrotic; Thirsting Blade requires Pact of Blade + level 5+; Armor of Shadows sets AC 13+DEX without armor

**[T122] The Fiend**
Dark One's Blessing (temp HP = CHA mod + warlock level on reducing hostile to 0 HP), Dark One's Own Luck (6th: d10 to check/save, 1/short rest), Fiendish Resilience (10th: choose damage resistance type on short/long rest; resistance bypassed by magical weapons or silvered weapons regardless of chosen damage type), Hurl Through Hell (14th: 10d10 psychic to non-fiends, 1/long rest).
- State: `darkOwnLuckUsed: bool`, `fiendishResistanceType: DamageType`, `hurlUsed: bool`
- Functions: `pDarkOnesBlessing(config)→temp HP = max(CHA mod + warlock level, 1)`; `pDarkOnesOwnLuck(state, d10)→add to check/save`; `pFiendishResilience(state, type)→set resistance type`; `pHurlThroughHell(state)→mark used; 10d10 psychic to non-fiend`
- Test: Dark One's Blessing correct temp HP, only on reducing to 0 HP; Own Luck resets on short rest; Fiendish Resilience bypassed by magical/silvered weapons (any damage type, not just B/P/S); Hurl 1/long rest

---

### Wizard

```
[T130] Arcane Recovery (P2) → deps: [T01]
[T131] Evocation (P2) → deps: [T130]
```

**[T130] Arcane Recovery**
1/long rest: on short rest, recover spell slots totaling up to ceil(wizard level / 2) (no 6th+). Spell Mastery (18): cast chosen 1st+2nd at lowest level without slot, only when prepared. Signature Spells (20): 3rd-level 1/short rest each.
- State: `arcaneRecoveryUsed: bool`, `spellMasterySlots: Set[int]`, `signatureSpellsUsed: Set[str]`
- Functions: `pArcaneRecovery(state, config, slotsToRecover)→validate sum <= ceil(level/2), none 6th+`
- Test: can't recover 6th+; total slots <= ceil(half wizard level); only once per long rest

**[T131] Evocation**
Sculpt Spells (choose up to 1 + spell level creatures for auto-succeed + 0 damage on area evocations — caller-provided), Potent Cantrip (half damage on save success instead of 0), Empowered Evocation (+INT mod to **one** damage roll of any wizard evocation spell — only one roll per cast, not all rolls), Overchannel (max damage on 1st-5th **wizard** spell that deals damage — any school, not just evocation; self-necrotic on repeat: 2d12 per prior use before long rest, bypasses resistance/immunity).
- State: `overchannelUseCount: int`
- Functions: `pPotentCantrip(fullDamage)→floor(fullDamage/2)` on save success; `pEmpoweredEvocation(config, damage)→damage + INT mod`; `pOverchannel(state, diceCount, dieSize)→diceCount*dieSize; if not first: (1+priorUses)d12 per spell level necrotic to self (ignores resistance). Progression: 2nd use=2d12/level, 3rd use=3d12/level, 4th use=4d12/level`
- Test: Potent Cantrip returns half on save (not 0); Empowered Evocation adds INT to one damage roll only; Overchannel applies to any wizard damage spell 1st-5th (not just evocation); first use free, second costs 2d12/level, third costs 3d12/level (NOT 4d12); self-damage bypasses resistance

---

### Racial Traits

```
[T140] Combat Racial Traits (P2) → deps: [T01]
[T141] Racial Save/Resistance Modifiers (P2) → deps: [T01]
```

**[T140] Combat Racial Traits**
Small Size Heavy Weapon Disadvantage (Halfling, Gnome: disadvantage on attack rolls with weapons that have the Heavy property), Half-Orc Relentless Endurance (1 HP instead of 0, 1/long rest), Half-Orc Savage Attacks (extra weapon die on melee crit), Halfling Lucky (reroll nat 1 on any d20 roll — attacks, ability checks, AND saving throws), Dragonborn Breath Weapon (scaling 2d6-5d6 at 1/6/11/16, 1/short rest, save DC = 8+CON+prof, save type varies by ancestry: DEX save for Black/Blue/Brass/Bronze/Copper/Gold/Red, CON save for Green/Silver/White), Halfling Nimbleness (move through space of any creature at least one size larger).
- State: `relentlessEnduranceUsed: bool`, `breathWeaponUsed: bool`
- Functions: `pSmallSizeHeavyWeaponPenalty(creatureSize, weaponHeavy)→if Small and Heavy: disadvantage`; `pRelentlessEndurance(state)→set HP to 1 instead of 0`; `pSavageAttacks(weaponDieSize)→one extra die on crit`; `pHalflingLucky(d20, reroll)→if d20==1 on attack/check/save: must use reroll (mandatory, even if reroll is also 1); with advantage/disadvantage: reroll only one of the two dice (player chooses which)`; `pBreathWeapon(level, conMod, profBonus, ancestrySaveType)→damage dice + save DC + save type`; modify `pMovementCost` for Halfling Nimbleness (can move through larger creature's space)
- Test: Small size + Heavy weapon = disadvantage (Halfling with greatsword); Relentless fires only at 0 HP; 1/long rest; Savage Attacks adds 1 extra die (not 2); Lucky rerolls natural 1 on attacks, checks, AND saves; Breath Weapon scales at 6/11/16; save DC correct; save type matches ancestry (DEX vs CON); save-for-half (successful save = half damage, not zero); Nimbleness allows movement through larger creatures

**[T141] Racial Save/Resistance Modifiers**
Dwarven Resilience (advantage poison saves + poison resistance), Dwarf Heavy Armor Speed (dwarf speed not reduced by heavy armor — modify `pCalculateEffectiveSpeed`), Fey Ancestry (advantage on saves vs charm + absolute immunity to magical sleep [not a save — checked at spell targeting layer, e.g. Sleep spell skips creatures with this trait] — Elf, Half-Elf), Gnome Cunning (advantage INT/WIS/CHA saves vs magic), Halfling Brave (advantage vs frightened), Tiefling Hellish Resistance (fire resistance), Dragonborn Damage Resistance (type from ancestry), Hill Dwarf Toughness (+1 HP/level), Tiefling Infernal Legacy (racial spells 1/long rest: thaumaturgy cantrip at 1st, hellish rebuke **as a 2nd-level spell** (3d10) at 3rd, darkness at 5th).
- State: `infernalLegacyHellishRebukeUsed: bool`, `infernalLegacyDarknessUsed: bool`
- Functions: modify `pGetSaveModifiers` for each; modify `pApplyDamageModifiers` for resistances; modify max HP for Dwarven Toughness; modify `pCalculateEffectiveSpeed` to exempt dwarves from heavy armor speed penalty
- Test: each modifier applies under correct conditions; Gnome Cunning only vs magic; Fey Ancestry blocks magical sleep at targeting layer (not a save modifier); charm save advantage separate; Dwarven Toughness adds 1 per level to max HP; Dwarf speed unaffected by heavy armor

---

### Spell Effects

```
[T150] Spell Data Model + Damage Patterns (P2) → deps: [T08]
[T151] Healing Spells (P2) → deps: [T08]
[T152] AC/Defense Buff Spells (P1) → deps: [T08]
[T153] Condition Debuff Spells (P1) → deps: [T08]
[T154] Condition Buff Spells (P2) → deps: [T08]
[T155] Condition Removal Spells (P2) → deps: [T08]
[T156] Stat Buff/Debuff Spells (P3) → deps: [T08]
[T157] Temp HP Spells (P3) → deps: [T08]
[T158] Revive Spells (P3) → deps: [T08]
[T159] Cantrip Scaling (P2) → deps: [T08]
[T160] Power Words (P3) → deps: [T08]
[T161] Polymorph (P3) → deps: [T100]
```

**[T150] Spell Data Model + Damage Patterns**
Define `SpellData` record. Implement 4 damage patterns as pure functions:
- Save-for-half: `pSaveForHalf(total, saved)→if saved: floor/2 else total` (Fireball, Lightning Bolt, etc.)
- Attack-roll: uses existing `pResolveAttack` (Fire Bolt, Scorching Ray, Eldritch Blast, etc.)
- Auto-hit: `pMagicMissile(slotLevel)→(slotLevel+2) darts, 1d4+1 each`
- Save-or-nothing: `pSaveOrNothing(total, saved)→if saved: 0 else total` (Poison Spray, etc.)
- Vampiric Touch: melee spell attack, 3d6 necrotic (+1d6 per slot above 3rd), caster heals half damage dealt; concentration; repeat attack costs your **action** each subsequent turn (not bonus action)
- Spiritual Weapon: bonus action summon, melee spell attack 1d8+spellmod force, bonus action to attack/move on subsequent turns; scales +1d8 per 2 slots above 2nd; NOT concentration
- Flame Blade: bonus action create, **action** to make melee spell attack 3d6 fire each turn; scales +1d6 per 2 slots above 2nd (starting at 4th slot); concentration
- Call Lightning: 3d10 lightning per action strike, DEX save-for-half; scales +1d10 per slot above 3rd; concentration, outdoor/high-ceiling; +1d10 bonus damage if outdoor stormy conditions when cast
- Moonbeam: 2d10 radiant, CON save-for-half, on entry or turn start in area; scales +1d10 per slot above 2nd; concentration; moving beam costs **action** each turn; shapechanger disadvantage + forced revert on fail
- Spirit Guardians: 3d8 radiant/necrotic, WIS save-for-half, on entry or turn start in 15ft aura; scales +1d8 per slot above 3rd; concentration; halves speed of affected
- Counterspell: reaction, auto-interrupt spell of 3rd or lower; higher: spellcasting ability check DC 10+spell level; upcast raises auto-succeed threshold (4th slot auto-interrupts 4th or lower, etc.)
- Additional damage spells: Disintegrate (DEX save, 10d6+40 force, +3d6 per slot above 6th; creature reduced to 0 HP is disintegrated — only True Resurrection/Wish can restore), Arcane Sword (action to cast with initial melee spell attack, then bonus action to attack on subsequent turns, 3d10 force; **concentration**)
- Test: save-for-half correct with odd numbers (7→3); Magic Missile dart count scales; save-or-nothing 0 on success; Vampiric Touch heals half; Spiritual Weapon not concentration; Counterspell upcast raises auto-succeed threshold; Disintegrate at 0 HP prevents normal revival; Call Lightning storm bonus +1d10

**[T151] Healing Spells**
Cure Wounds, Healing Word, Prayer of Healing, Mass Cure Wounds, Heal, Mass Heal, Spare the Dying, Goodberry (1st; creates 10 berries, each heals 1 HP as action, provides nourishment for 1 day; berries expire after 24 hours), Beacon of Hope (advantage on WIS saves + death saves; maximize healing dice received for duration — concentration), Regenerate (4d8+15 immediate + 1 HP at start of each turn for 1 hour; regrows severed body parts).
- Functions: `pCureWounds(slotLevel, mod, diceResult)` (d8 dice), `pHealingWord(slotLevel, mod, diceResult)` (d4 dice, bonus action), `pHealSpell(slotLevel)→70 HP + end blind/deaf/disease; +10 per slot above 6th`, `pSpareTheDying()→stabilize`, `pBeaconOfHope()→set active (concentration); grants advantage on WIS saves + death saves; maximizes all healing received`, `pRegenerate(state)→4d8+15 immediate; 1 HP/turn start for 1 hour`
- Test: correct scaling per upcast level; Healing Word is bonus action; Heal restores 70 at 6th, 80 at 7th (+10/slot); Spare the Dying stabilizes (no slot); Beacon of Hope maximizes healing dice; Regenerate heals 1 HP each turn start

**[T152] AC/Defense Buff Spells**
Shield (+5 AC reaction when hit or targeted by Magic Missile; +5 applies retroactively to the triggering attack, can turn hit→miss; lasts until start of next turn), Mage Armor (13+DEX, no armor; spell ends if target dons armor), Shield of Faith (+2 AC, concentration), Barkskin (AC minimum 16, concentration), Fire Shield (warm: cold resistance + 2d8 fire retaliation; OR chill: fire resistance + 2d8 cold retaliation), Mirror Image (3 duplicates, AC 10+DEX; d20 threshold: 6+ with 3 images, 8+ with 2, 11+ with 1 to target image instead of caster; image destroyed on hit), Stoneskin (resistance to nonmagical B/P/S, concentration), Sanctuary (**bonus action** cast; WIS save or must choose new target; ends if warded creature attacks/casts on hostile), Protection from Evil and Good (concentration; listed creature types have disadvantage on attacks against target; target can't be charmed/frightened/possessed by them), Holy Aura (8th; advantage on all saves; attackers have disadvantage; fiend/undead attacker must CON save or be blinded; concentration), Globe of Invulnerability (6th; spells of 5th level or lower can't affect anything inside; concentration).
- State: `shieldActive: bool`, `mageArmorActive: bool`, `shieldOfFaithActive: bool`, `barkskinActive: bool`, `fireShieldActive: bool`, `fireShieldType: DamageType`, `mirrorImageCount: int`, `stoneskinActive: bool`, `sanctuaryActive: bool`, `protFromEvilGoodActive: bool`, `holyAuraActive: bool`, `globeOfInvulnActive: bool`
- Functions: modify `pCalculateAC` for each; Shield also negates Magic Missile; `pMirrorImageCheck(d20, duplicateCount)→if 3 images: 6+, 2 images: 8+, 1 image: 11+ targets image; image AC = 10+DEX, hit destroys it`; `pSanctuaryCheck(wisSaveResult)→must choose new target on fail`
- Test: Shield +5 retroactive to triggering attack (can turn hit→miss); Shield blocks Magic Missile damage; Mage Armor sets 13+DEX only without armor, ends if armor donned; Barkskin sets floor at 16; Fire Shield retaliatory 2d8; Mirror Image thresholds correct (6+/8+/11+); Stoneskin resists nonmagical B/P/S; Sanctuary ends on hostile action; PfEG gives attacker disadvantage from listed types + blocks charm/frighten/possess; Holy Aura advantage all saves + attacker disadvantage + blinds fiend/undead; Globe blocks spells ≤5th; multiple AC buffs stack correctly where applicable

**[T153] Condition Debuff Spells**
Hold Person/Monster (paralyzed), Blindness/Deafness, Fear (drop held items + frightened + must Dash away; save to end only when ending turn without line of sight to caster), Confusion (d10 table each turn: 1=random move, 2-6=no action/move, 7-8=melee nearest, 9-10=act normally; can't take reactions; WIS save each turn end to end), Hypnotic Pattern (charmed+incapacitated+speed 0; effect ends on taking any damage or if another creature uses action to shake target), Sleep (unconscious by HP; undead and creatures immune to being charmed are unaffected), Slow (-2 AC, disadvantage DEX saves, no reactions, halved speed, spell-delay: if casting 1-action spell, d20 roll 11+ = spell delayed to next turn and must use action to complete or spell wasted), Entangle/Web (restrained), Flesh to Stone (CON save; initial fail = restrained; then CON save each turn — 3 cumulative failures = petrified, 3 cumulative successes = spell ends; if concentration held full 1 min = permanent petrification), Bestow Curse (various curse options; concentration at 3rd-4th; **no concentration at 5th+** upcast), Heat Metal (2d8 fire + CON save or drop held object + disadvantage on attacks/checks while holding; bonus action to repeat damage; scales +1d8 per slot above 2nd; **concentration**), Compulsion (4th, WIS save; target is NOT charmed — forced movement toward direction you choose only; repeat save each turn; auto-succeed if immune to charmed; concentration), Dominate Beast/Person/Monster (WIS save with advantage if in combat; charmed + telepathic control; new save on taking damage; concentration), Banishment (CHA save, incapacitated + removed from encounter; concentration; if held 1 min vs non-native plane creature: permanent), Color Spray (HP-based blind, no save, ascending HP; 6d10 pool, +2d10/slot; 1 round), Eyebite (6th, WIS save, choose: asleep/panicked/frightened-dash/sickened-disadvantage attacks+checks; new target each turn; can't retarget creature that already saved against this casting; concentration), Feeblemind (8th, INT save, 4d6 psychic + INT and CHA become 1 + can't cast spells; INT save each 30 days to end), Irresistible Dance (6th, no initial save; creatures immune to charmed are immune; target must dance: disadvantage on attacks, disadvantage on DEX saves, attackers have advantage; uses all movement to dance; action WIS save to end each turn; concentration), Phantasmal Killer (4th, WIS save, frightened; each turn end: WIS save or 4d10 psychic — successful save **ends the spell entirely**; concentration).
- Functions: `pHoldPerson(saveResult)→if fail: apply paralyzed`; `pSleep(hpPool, targetHP, isUndead, isCharmImmune)→if undead/charm-immune: skip; if targetHP <= remaining pool: unconscious`; `pSlow(state)→apply debuffs`; `pHeatMetal(damage, conSaveResult)→damage + if fail: drop object + disadvantage`; `pCompulsion(wisSaveResult, isCharmImmune)→if immune: auto-succeed; if fail: forced movement (NOT charmed condition); caster must spend **bonus action** each turn to designate direction; target can take its action before being forced to move; save to end comes after moving`; `pDominate(wisSaveResult, inCombat)→if fail (with advantage if in combat): charmed`; `pBanishment(chaSaveResult, isNativePlane)→if fail: incapacitated + removed; if not native and concentration held 1 min: permanent`; `pColorSpray(hpPool, targetHP)→if targetHP <= pool: blinded 1 round`; `pEyebite(wisSaveResult, choice)→asleep/frightened+dash/sickened(disadvantage attacks+checks, WIS save each turn end to end Sickened only)`; `pFeeblemind(intSaveResult, damage)→if fail: INT=1, CHA=1, can't cast`; `pIrresistibleDance(isCharmImmune)→if charm-immune: immune; else no save; disadvantage attacks/DEX saves, advantage against; action WIS save each turn to end`; `pPhantasmalKiller(wisSaveResult)→if fail: frightened; each turn end: WIS save or 4d10 psychic, success ends spell entirely`; etc.
- Test: Hold Person applies paralyzed on failed WIS save; Sleep skips undead and charm-immune creatures, affects lowest HP first, no save; Slow applies all five effects (including spell-delay on d20 11+); repeated saves each turn end for hold/fear/confusion; Heat Metal forces drop on failed CON save, is concentration; Compulsion is NOT charmed — only forced movement; Dominate grants advantage on initial save if currently in combat; Banishment permanent vs non-native if concentration held 1 min; Color Spray is HP-based blind (no save); Irresistible Dance has no initial save but charm-immune creatures are immune; Phantasmal Killer successful per-turn save ends spell entirely; Eyebite can't retarget creature that saved; Feeblemind sets INT/CHA to 1

**[T154] Condition Buff Spells**
Haste (+2 AC, advantage DEX saves, double speed, +1 limited action: Attack (ONE weapon attack only), Dash, Disengage, Hide, or Use Object; lose turn on end — can't move or act until after next turn), Greater Invisibility (invisible, can attack/cast), Freedom of Movement (immune to **magical** paralysis/restraint; difficult terrain free; spend 5ft movement to escape nonmagical restraints; underwater movement/attack penalties negated), Blur (disadvantage on attacks against; creatures with blindsight or truesight are immune to this effect), Invisibility (invisible, ends on attack/cast), Mind Blank (8th; immune to psychic damage + charmed condition + divination + telepathy reading; 24 hours; no concentration), Foresight (9th; advantage on attack rolls, ability checks, and saving throws; others have disadvantage on attacks against target; 8 hours; no concentration; can't be surprised).
- State: `hasteActive: bool`, `hasteLethargic: bool` (for turn loss on end), `blurActive: bool`, `freedomOfMovementActive: bool`, `mindBlankActive: bool`, `foresightActive: bool`
- Functions: modify AC, saves, speed, action economy for Haste; modify defense modifiers for Blur; modify condition immunity for Freedom of Movement
- Test: Haste all bonuses apply; Haste Attack action = ONE weapon attack only (not Extra Attack); ending Haste causes lost turn (can't move or act); Blur gives disadvantage to attacks against (immune if attacker has blindsight/truesight); Freedom of Movement prevents magical paralysis/restraint; 5ft to escape nonmagical; negates underwater penalties; Mind Blank immune psychic+charmed (no concentration, 24h); Foresight advantage attacks/checks/saves + disadvantage on attacks against (no concentration, 8h)

**[T155] Condition Removal Spells**
Lesser Restoration (remove one **disease** OR one condition: blind/deaf/paralyzed/poisoned), Greater Restoration (remove 1: charm/petrify/curse/ability reduction/HP max reduction/1 exhaustion), Remove Curse (end all curses), Dispel Magic (end spell: auto if <= slot, check if higher).
- Functions: `pLesserRestoration(state, condition)→remove condition`; `pGreaterRestoration(state, choice)→remove chosen effect`; `pDispelMagic(slotUsed, targetSpellLevel, checkResult)→bool success`
- Test: Lesser Restoration removes one disease OR one of: blinded/deafened/paralyzed/poisoned; Greater Restoration removes 1 exhaustion level; Dispel Magic auto-succeeds at equal or higher slot

**[T156] Stat Buff/Debuff Spells**
Bless (+1d4 attacks+saves; **concentration**), Bane (CHA save to resist; -1d4 attacks+saves; **concentration**), Enhance Ability (advantage on one ability's checks; Bear: 2d6 temp HP), Aid (+5/10/15 to max HP and current HP), Heroism (concentration; immune frightened + temp HP = casting mod each turn start; temp HP from Heroism lost when spell ends), Hunter's Mark (bonus action, concentration: +1d6 damage per hit to marked target; advantage on Perception/Survival to find it; can move mark on target death), Ray of Enfeeblement (halve STR-based weapon damage; CON save each turn to end), Warding Bond (+1 AC/saves + resistance to all damage, caster takes same damage as warded — target must be within 60ft; ends if separated beyond 60ft or **caster drops to 0 HP**), Protection from Energy (resistance to one chosen element, concentration), Faerie Fire (DEX save to resist; on fail: advantage on attacks against affected creatures + negates invisibility benefit; concentration), Death Ward (drop to 1 instead of 0 on lethal damage; also negates effects that would kill instantaneously without dealing damage, e.g. Power Word Kill; single use then expires), Divine Favor (1st, bonus action, concentration: +1d4 radiant on all weapon hits for duration), Magic Weapon (2nd, concentration: nonmagical weapon becomes +1/+2/+3 magic weapon at slots 2/4/6; bonus applies to both attack and damage rolls), Enlarge/Reduce (2nd, CON save to resist; Enlarge: advantage STR checks/saves + +1d4 damage per hit; Reduce: disadvantage STR checks/saves + -1d4 damage per hit; concentration).
- State: `blessActive: bool`, `baneActive: bool`, `aidBonus: int`, `heroismActive: bool`, `deathWardActive: bool`, `huntersMarkActive: bool`, `wardingBondActive: bool`, `protectionFromEnergyType: DamageType`, `rayOfEnfeeblementActive: bool`
- Functions: per spell; `pHuntersMark(state, diceResult)→+1d6 per hit`; `pWardingBond(state)→+1 AC, +1 saves, resistance; mirror damage to caster`; `pRayOfEnfeeblement(spellAttackHit, damage, isSTRWeapon)→requires ranged spell attack hit; floor(damage/2) if STR weapon; CON save each turn end to end`
- Test: Bless adds 1d4 to correct rolls, is concentration; Bane requires CHA save, is concentration; Aid increases max AND current HP; Death Ward triggers once then expires; also negates no-damage instant kills (e.g. Power Word Kill); Heroism grants temp HP each turn start, temp HP stripped on spell end; Hunter's Mark adds 1d6 per hit not per turn; Warding Bond mirrors damage to caster, ends if caster at 0 HP; Divine Favor +1d4 radiant per weapon hit; Magic Weapon +1/+2/+3 at slots 2/4/6; Enlarge +1d4 damage + STR advantage, Reduce -1d4 + STR disadvantage

**[T157] Temp HP Spells**
False Life (1d4+4 temp HP, scales with upcast), Heroism (casting mod temp HP each turn — already in T156).
- Functions: `pFalseLife(slotLevel, d4Roll)→4+d4+(5*(slotLevel-1))`
- Test: correct temp HP amount; scales with slot level

**[T158] Revive Spells**
Revivify (1 HP, dead < 1 min), Raise Dead (1 HP, dead < 10 days, -4 penalty), Resurrection, True Resurrection.
- Functions: `pRevivify(state)→set HP to 1, set dead=false`; `pRaiseDead(state)→HP=1, dead=false, -4 penalty to d20s (clears 1/long rest)`
- Test: only works on dead creature; Revivify only < 1 min; Raise Dead applies penalty

**[T159] Cantrip Scaling + Cantrip Debuffs**
Damage cantrips add extra dice at levels 5, 11, 17. Additionally, several cantrips impose combat-relevant debuffs beyond damage:
- Vicious Mockery: WIS save, 1d4 psychic (scales); on fail: disadvantage on next attack roll before end of its next turn
- Shocking Grasp: melee spell attack, 1d8 lightning (scales); advantage on attack if target in metal armor; on hit: target can't take reactions until start of its next turn
- Chill Touch: ranged spell attack, 1d8 necrotic (scales); on hit: target can't regain HP until start of your next turn; undead target also has disadvantage on attack rolls against you until then
- Functions: `pCantripDiceCount(characterLevel)→1/2/3/4`; `pViciousMockery(wisSaveResult)→if fail: damage + disadvantage on next attack`; `pShockingGrasp(hitResult, targetInMetal)→advantage if metal; on hit: damage + no reactions until next turn`; `pChillTouch(hitResult, targetIsUndead)→on hit: damage + no HP regen; undead: also disadvantage vs you`
- Test: 1d at 1-4, 2d at 5-10, 3d at 11-16, 4d at 17+; Vicious Mockery disadvantage on next attack only; Shocking Grasp advantage vs metal armor, blocks reactions; Chill Touch blocks healing and gives undead disadvantage

**[T160] Power Words + Divine Word**
Power Word Stun (if HP <= 150: stunned, CON save each turn), Power Word Kill (if HP <= 100: dead), Divine Word (7th, **bonus action** cast, CHA save; HP-threshold effects on failed save: ≤20 HP = killed instantly, ≤30 HP = blinded+deafened+stunned 1 hour, ≤40 HP = blinded+deafened 10 min, ≤50 HP = deafened 1 min; also banishes celestials/elementals/fey/fiends (only these 4 types, not all extraplanar) to home plane if not already there, can't return for 24h).
- Functions: `pPowerWordStun(targetHP)→if <= 150: stunned`; `pPowerWordKill(targetHP)→if <= 100: dead`; `pDivineWord(chaSaveResult, targetHP)→HP-threshold conditions or death`
- Test: exact HP thresholds; no save for Power Word Kill; Power Word Stun allows repeated saves; Divine Word requires CHA save, HP thresholds at 20/30/40/50

**[T161] Polymorph**
WIS save or transform into beast form. Differs from Wild Shape [T100] in key ways: (1) ALL ability scores replaced including INT/WIS/CHA (Wild Shape retains mental scores), (2) CR cap = target's level or CR (not fixed druid table), (3) no effect on shapechangers or creatures at 0 HP. Revert on 0 HP with overflow (same as Wild Shape). Concentration.
- Functions: `pPolymorph(state, targetSaveResult, newForm, targetLevelOrCR, isShapechanger, targetHP)→if shapechanger or HP==0: no effect; if fail: transform replacing ALL stats; CR of new form <= targetLevelOrCR`
- Test: revert+overflow on 0 HP (same as Wild Shape); ALL ability scores replaced (including INT/WIS/CHA — unlike Wild Shape); WIS save to resist; unwilling save, willing don't; no effect on shapechangers; no effect at 0 HP; CR cap = target level/CR; concentration

---

### Grappler Feat

```
[T200] Grappler Feat (P4) → deps: none
```

**[T200] Grappler Feat**
Prereq STR 13+. Advantage on attacks against creature you're grappling. Pin (use your **action** to make another grapple check): on success, both you and target are restrained until grapple ends.
- Functions: modify `pGetOwnAttackModifiers` for advantage when grappling target; `pPinGrapple(contestResult)→both restrained; consumes action`
- Test: advantage only against grappled target (not others); Pin restrains both; Pin consumes action; Pin ends when grapple ends

---

## DAG Visualization

```
[T01]─Config Identity
  │
  ├──[T01.5]─Multiclass Proficiencies
  ├──[T02]─Crit Range ──────────────────────────────┐
  ├──[T05]─Fighting Styles ─────────────────────────┐│
  ├──[T07]─Channel Divinity ────────────────────────┐││
  │                                                 │││
  │  ┌──────────────── BARBARIAN ───────────────┐   │││
  ├──[T10]─Rage                                 │   │││
  │   └──[T13]─Berserker                        │   │││
  ├──[T11]─Reckless Attack                      │   │││
  ├──[T12]─Barbarian Passives                   │   │││
  │  └────────────────────────────────────────────┘   │││
  │                                                 │││
  │  ┌──────────────── FIGHTER ─────────────────┐   │││
  ├──[T20]─Second Wind                          │   │││
  ├──[T21]─Action Surge                         │   │││
  ├──[T22]─Indomitable                          │   │││
  │  [T23]─Champion ← [T02]+[T05]              │←──┘│┘
  │  └────────────────────────────────────────────┘   ││
  │                                                 ││
  │  ┌──────────────── ROGUE ───────────────────┐   ││
  ├──[T30]─Sneak Attack                         │   ││
  │  [T31]─Cunning Action ← [T06]              │   ││
  ├──[T32]─Rogue Passives ← [T03]+[T04]        │   ││
  │  [T33]─Thief ← [T31]                       │   ││
  │  └────────────────────────────────────────────┘   ││
  │                                                 ││
  │  ┌──────────────── MONK ────────────────────┐   ││
  ├──[T40]─Ki Pool                              │   ││
  ├──[T41]─Martial Arts                         │   ││
  │  [T42]─Ki Actions ← [T40]+[T06]            │   ││
  │  [T43]─Stunning Strike ← [T40]             │   ││
  ├──[T44]─Monk Passives ← [T03]               │   ││
  │  [T45]─Monk Reactions ← [T40]              │   ││
  │  [T46]─Open Hand ← [T42]                   │   ││
  │  └────────────────────────────────────────────┘   ││
  │                                                 ││
  │  ┌──────────────── PALADIN ─────────────────┐   ││
  ├──[T60]─Lay on Hands                         │   ││
  ├──[T61]─Divine Smite                         │   ││
  │  [T62]─Paladin Passives ← [T07]            │←──┘│
  │  [T63]─Devotion ← [T07]                    │←───┘
  │  └────────────────────────────────────────────┘
  │
  │  ┌──────────────── RANGER ──────────────────┐
  ├──[T70]─Ranger Passives ← [T05]+[T09]       │
  │  [T71]─Hunter ← [T03]+[T04]                │
  │  └────────────────────────────────────────────┘
  │
  │  ┌──────────────── CASTERS ─────────────────┐
  ├──[T80]─Bardic Inspiration + JoAT + Countercharm
  │  [T81]─Lore ← [T80]                        │
  ├──[T90]─Cleric Base ← [T07]                 │
  │  [T91]─Life Domain ← [T90]                 │
  ├──[T100]─Wild Shape ─────────────────────────│──→ [T161]─Polymorph
  │  [T101]─Circle of Land ← [T09]             │
  ├──[T110]─Sorcery Points                      │
  │  [T111]─Metamagic ← [T110]                 │
  ├──[T112]─Draconic Bloodline                  │
  ├──[T120]─Warlock Resources                   │
  │  [T121]─Invocations ← [T120]               │
  │  [T122]─The Fiend ← [T120]                 │
  ├──[T130]─Arcane Recovery                     │
  │  [T131]─Evocation ← [T130]                 │
  │  └────────────────────────────────────────────┘
  │
  │  ┌──────────────── RACIAL ──────────────────┐
  ├──[T140]─Combat Racial Traits                │
  ├──[T141]─Racial Save/Resistance Modifiers    │
  │  └────────────────────────────────────────────┘

[T08]─Spell Data Model
  ├──[T150]─Damage Patterns
  ├──[T151]─Healing Spells
  ├──[T152]─AC/Defense Buff Spells
  ├──[T153]─Condition Debuff Spells
  ├──[T154]─Condition Buff Spells
  ├──[T155]─Condition Removal Spells
  ├──[T156]─Stat Buff/Debuff Spells
  ├──[T157]─Temp HP Spells
  ├──[T158]─Revive Spells
  ├──[T159]─Cantrip Scaling + Debuffs
  ├──[T160]─Power Words + Divine Word
  └──[T161]─Polymorph ← [T100]

No deps:
[T03]─Evasion, [T04]─Uncanny Dodge, [T05]─Fighting Styles,
[T06]─Bonus-Action-As-Action, [T09]─Land's Stride,
[T10a]─Cover, [T10b]─Condition-Attack Interactions,
[T10c]─Resistance Stacking, [T10d]─Underwater Combat,
[T10e]─Squeezing, [T10f]─Flying Falls, [T200]─Grappler Feat
```

## Suggested Execution Order

Start with P1 foundation + highest-interaction features:

1. **[T01]** Config Identity (everything depends on it)
2. **[T02]** Crit Range, **[T03]** Evasion, **[T04]** Uncanny Dodge, **[T05]** Fighting Styles, **[T06]** Bonus-Action Pattern, **[T10a]** Cover, **[T10b]** Condition-Attack Interactions, **[T10c]** Resistance Stacking (all independent, all P1)
3. **[T10]** Rage, **[T11]** Reckless, **[T30]** Sneak Attack, **[T21]** Action Surge, **[T61]** Divine Smite, **[T40]** Ki Pool, **[T41]** Martial Arts (P1 class features, all need only T01)
4. **[T42]** Ki Actions, **[T43]** Stunning Strike, **[T31]** Cunning Action, **[T23]** Champion, **[T20]** Second Wind (P1, depend on earlier tasks)
5. **[T08]** Spell Data Model → **[T152]** AC/Defense Buffs, **[T153]** Condition Debuffs, **[T150]** Damage Patterns (P1-P2 spells)
6. **[T01.5]** Multiclass Proficiencies, **[T10f]** Flying Falls, then P2 class features in any order
7. P2-P3 spells in any order; **[T10d]** Underwater Combat, **[T10e]** Squeezing
8. P3-P4 remainder

---

## What is NOT Formalized

- Subclasses beyond the 12 SRD subclasses (1 per class)
- Spells not in SRD 5.1 (~43 PHB-exclusive, e.g. Hex, Compelled Duel, Armor of Agathys)
- Feats beyond Grappler (only feat in SRD 5.1)
- Races/subraces beyond SRD 9 + subraces
- Variant Human
- Battlemaps/grids/coordinates
- AoE geometry
- Multi-creature encounter state
- DM-fiat mechanics
- Monsters/NPCs, Magic items, Backgrounds, Alignment
- Improvised weapons (1d4, 20/60 thrown — low priority, could add as P4)
- Help action combat advantage grant (AHelp action type exists but no state for attack advantage tracking — could add as P4)
- Ready action spell-holding (readiedAction flag exists but no concentration/dissipation rules — could add as P3)
- Spellbook acquisition mechanics (Wizard spell copying costs/time)
- Non-combat racial traits (Stonecunning, Trance, Thieves' Cant, Druidic, languages)
- Racial weapon proficiencies (Dwarven Combat Training, Elf Weapon Training — config-level)
- Racial ability score increases (config-level, already in CharConfig ability scores)
- Charmed condition social interaction advantage (out of combat scope)
- Antimagic Field spell-suppression interactions (complex meta-interaction, deferred)

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
