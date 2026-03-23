# D&D 5e Rules Formalization in Quint - Plan

Formal specification of D&D 5e Player's Handbook mechanics in Quint,
following State type + Pure functions + Thin actions patterns (cf. savage repo).

Reference material: `.references/rules/` (PHB chapters 0-15).

## Progress

- [x] Phase 1: Core Types, Config & Resolution
- [x] Phase 2: Character Status State Machine
- [x] Phase 3: Combat Turn & Attack
- [x] Phase 4: Combat Actions & Interactions
- [x] Phase 5: Movement System
- [x] Phase 6: Spellcasting System
- [x] Phase 7: Resting & Recovery
- [ ] Phase 8: Environmental Rules
- [ ] Phase 9: Character Construction & Leveling

---

## Design Principles

1. **Keep it composable.** Single-creature state machine. Multi-creature interactions
   (opportunity attacks, Help, grapple contests) are externalized as parameters —
   the caller provides contest results, target states, etc. Same as savage's approach
   to dice rolls. This makes the spec modular and add-able.

2. **All dice are pre-resolved.** Callers pass roll results as arguments. The spec
   never generates random values — it validates transitions given outcomes.

3. **Composed records, implementer's choice.** State may be one big record (savage-style)
   or composed from sub-records (HP, conditions, turn resources, etc.). The plan
   specifies logical groupings; the implementer decides physical structure.

4. **Ability scores are immutable config.** Like savage's `isWildCard`/`maxWounds`,
   ability scores and class features don't change during the state machine's scope.
   Level-up produces a new config, not a state mutation.

5. **No battlemaps, no grids, no coordinates.** Spatial relationships (range, AoE,
   positioning) are caller-provided booleans/enums, not computed from coordinates.

6. **Module structure is aspirational.** Savage uses one module + one test file.
   Quint supports multi-module imports. The file tree below may consolidate in
   practice. Start with one file, split when it gets unwieldy.

7. **Only formalize what has deterministic rules.** DM-fiat mechanics, narrative
   content, and "the DM decides" situations are out of scope.

8. **Cross-reference with rules at every phase.** Before implementing a phase,
   re-read the corresponding PHB chapter(s) in `.references/rules/`. After
   implementing, re-read them again and verify every rule is covered. This is
   mandatory — not optional, not "if time permits."

---

## Architecture

```
core/          -- foundational types and resolution
  types.qnt         -- shared types (Ability, DamageType, Size, etc.)
  dice.qnt          -- d20 resolution: check, save, attack (adv/disadv, proficiency)
character/     -- character state (immutable config + mutable status)
  config.qnt        -- immutable: ability scores, proficiencies, class, race, size, speeds
  equipment.qnt     -- armor AC calc, weapon properties, carrying capacity, don/doff
  conditions.qnt    -- 14 conditions + exhaustion (canonical home for all condition state)
  hitpoints.qnt     -- HP, temp HP, healing, death saves, instant death
  spellslots.qnt    -- spell slot tables, expenditure, multiclass calculation
combat/        -- encounter and turn-level state
  turn.qnt          -- turn structure: action economy (action/bonus/reaction/move/free)
  attack.qnt        -- attack resolution: roll vs AC, crits, damage, cover, underwater
  actions.qnt       -- combat actions: Dash, Disengage, Dodge, Help, Hide, Ready, etc.
  movement.qnt      -- speed calculation, movement costs, standing/prone, squeezing
  grapple.qnt       -- grapple & shove: contested checks, size constraints
spellcasting/  -- magic system
  casting.qnt       -- cast action, components, concentration, bonus action rule
rest/          -- recovery
  rest.qnt          -- short rest (hit dice), long rest (HP, slots, hit dice, exhaustion)
environment/   -- hazards & travel
  environment.qnt   -- falling, suffocation, vision/light, food/water, travel pace
leveling/      -- character progression
  leveling.qnt      -- XP thresholds, level-up, multiclass prereqs, point buy, feats
```

---

## Phase 1: Core Types, Config & Resolution

**Source**: PHB Ch 7 (Using Ability Scores), Ch 1 (Proficiency Bonus), Ch 5 (Equipment)

**Cross-ref before**: `07-using-ability-scores.md`, `01-step-by-step-characters.md`, `05-equipment.md`
**Cross-ref after**: verify every formula, every AC table entry, every weapon property

Equipment moves here because AC, weapon properties, and armor penalties are needed
by almost every later phase (attack, movement, spellcasting).

### 1.1 Shared Types (`core/types.qnt`)

- `Ability` enum: `STR`, `DEX`, `CON`, `INT`, `WIS`, `CHA`
- `Skill` enum: 18 skills, each mapped to a default Ability
- `Size` enum: `Tiny`, `Small`, `Medium`, `Large`, `Huge`, `Gargantuan`
- `DamageType` enum: 13 types (Acid, Bludgeoning, Cold, Fire, Force, Lightning, Necrotic, Piercing, Poison, Psychic, Radiant, Slashing, Thunder)
- `CoverType`: `None`, `Half`, `ThreeQuarters`, `Total`
- `ArmorCategory`: `Light`, `Medium`, `Heavy`
- `WeaponProperty` enum: `Finesse`, `Heavy`, `Light`, `Loading`, `Reach`, `Thrown`, `TwoHanded`, `Versatile`, `Ammunition`, `Special`
- `SpeedType` enum: `Walk`, `Fly`, `Swim`, `Climb`, `Burrow`
- `SpellLevel` = `int` (0-9)
- `Illumination` enum: `Bright`, `Dim`, `Dark`
- `ProficiencyLevel` enum: `None`, `Half`, `Proficient`, `Expertise`

### 1.2 Character Config (`character/config.qnt`)

Immutable for the duration of the state machine. Caller constructs at init.

- `abilityScores: Ability -> int` (1-30)
- `level: int` (1-20)
- `classLevels: List[{className: str, level: int}]` (for multiclass)
- `size: Size`
- `speeds: SpeedType -> int` (base speeds; 0 = no such speed)
- `proficiencies: {savingThrows: Set[Ability], skills: Set[Skill], tools: Set[str], armor: Set[ArmorCategory], weapons: Set[str]}`
- `expertiseSkills: Set[Skill]` (double proficiency bonus)
- `hitDieType: int` (d6=6, d8=8, d10=10, d12=12)
- `maxHitDice: int` (= level)
- `spellcastingAbility: Ability` (or none)
- `hasUnarmoredDefense: {active: bool, ability: Ability}` (Barbarian: CON, Monk: WIS)
- `canRitualCast: bool` (class feature required — not all spellcasters can ritual cast)
- `features: Set[Feature]` (sum type: `FExtraAttack`, `FExtraAttack2`, `FExtraAttack3`, etc.)

Pure functions:
- `abilityModifier(score: int): int` = `(score - 10) / 2` (floor division)
- `proficiencyBonus(level: int): int` = `(level - 1) / 4 + 2`
- `passiveCheck(abilityMod, profLevel, profBonus, hasAdvantage, hasDisadvantage)`:
  `10 + abilityMod + profMultiplier(profLevel, profBonus) + (if adv: 5 else if disadv: -5 else 0)`
- `profMultiplier(level, bonus)`: None -> 0, Half -> bonus/2, Proficient -> bonus, Expertise -> bonus*2
- `spellSaveDC(config)` = `8 + abilityModifier(spellcastingAbility) + proficiencyBonus(level)`
- `spellAttackBonus(config)` = `abilityModifier(spellcastingAbility) + proficiencyBonus(level)`

**Invariants**:
- `abilityModifier(10) == 0`, `abilityModifier(1) == -5`, `abilityModifier(30) == 10`
- `proficiencyBonus` ranges +2 (level 1) to +6 (level 17+)
- Proficiency bonus applied at most once per roll (multiplied/halved, never stacked)

### 1.3 d20 Resolution System (`core/dice.qnt`)

Universal resolution. All three pillars (ability check, saving throw, attack roll) share structure.

- **Advantage/Disadvantage**:
  - Multiple sources -> still one extra die
  - Any advantage + any disadvantage -> cancel to neither (regardless of count)
  - With adv: caller passes higher of two d20s; with disadv: lower
- **Check resolution**: `roll + abilityMod + profMultiplier(profLevel, profBonus) + misc >= DC`
- **Saving throw**: same formula; each class grants proficiency in exactly 2 saves
- **Contest**: Both sides roll; higher total wins; tie = status quo (no change)
- **Group check**: >= half succeed -> group succeeds

**Invariants**:
- Advantage + disadvantage always cancel regardless of source count
- Proficiency bonus never stacks (at most once per roll)
- Natural 20 on attack always hits; natural 1 always misses (attacks only — not checks or saves)

### 1.4 Equipment (`character/equipment.qnt`)

**Armor Class calculation**:
- No armor: `10 + DEX mod`
- Light armor: `base + DEX mod` (no cap). Padded: 11, Leather: 11, Studded leather: 12
- Medium armor: `base + min(DEX mod, 2)`. Hide: 12, Chain shirt: 13, Scale mail: 14, Breastplate: 14, Half plate: 15
- Heavy armor: `base` (no DEX). Ring mail: 14, Chain mail: 16, Splint: 17, Plate: 18
- Shield: +2 AC (only one at a time)
- Unarmored Defense (Barbarian): `10 + DEX mod + CON mod`
- Unarmored Defense (Monk): `10 + DEX mod + WIS mod`

Pure function: `pCalculateAC(armorCategory, armorBase, dexMod, hasShield, unarmoredDefense) -> int`

**Armor proficiency**:
- Wearing armor without proficiency: disadvantage on any ability check, saving throw, or attack roll **that involves Strength or Dexterity** (not all rolls — WIS saves are unaffected). **Cannot cast spells at all.**
- Heavy armor STR requirement: if wearer's STR < listed minimum (Chain mail: 13, Splint: 15, Plate: 15), speed reduced by 10 ft. Ring mail has no STR requirement.
- Stealth disadvantage: Padded, Scale mail, Half plate, Ring mail, Chain mail, Splint, Plate impose disadvantage on Dexterity (Stealth) checks.

**Donning/Doffing**:
- Light armor: 1 min on / 1 min off
- Medium armor: 5 min on / 1 min off
- Heavy armor: 10 min on / 5 min off
- Shield: 1 action on / 1 action off (interacts with action economy)
- **Help doffing**: if another creature helps, doffing time is halved

**Weapon properties** (affect attack/damage resolution):
- **Finesse**: attacker chooses STR or DEX for attack and damage
- **Heavy**: Small/Tiny creatures have disadvantage
- **Light**: required for two-weapon fighting
- **Loading**: one attack per action/bonus action/reaction (limits Extra Attack)
- **Reach**: melee range 10 ft instead of 5 ft
- **Thrown**: can make ranged attack using same ability mod as melee (STR, or DEX if finesse)
- **Two-Handed**: requires both hands to attack
- **Versatile**: different damage die one-handed vs two-handed
- **Ammunition**: requires ammo; recover half after battle

**Unarmed strikes**: `1 + STR mod` bludgeoning damage. Always proficient.

**Carrying capacity** (standard rules only; encumbrance variant deferred):
- Capacity = `STR x 15` lbs
- Push/drag/lift = `STR x 30` lbs (speed drops to 5 if exceeding capacity)
- Size modifiers: each size above Medium doubles; Tiny halves

---

## Phase 2: Character Status State Machine

**Source**: PHB Ch 9 (Damage & Healing), Appendix A (Conditions)

**Cross-ref before**: `09-combat.md` (Damage and Healing section), `12-conditions.md`
**Cross-ref after**: verify every condition effect, every death save path, every damage modifier

Closest analog to savage.qnt. Models a single creature's mutable state.

### 2.1 Hit Points (`character/hitpoints.qnt`)

State fields:
- `hp: int` (0 to `maxHp`)
- `maxHp: int` (can be halved by exhaustion level 4)
- `tempHp: int` (>= 0)
- `deathSaves: {successes: int, failures: int}` (each 0-3)
- `stable: bool`
- `dead: bool`

Pure functions:
- `pTakeDamage(state, amount, damageType, resistances, vulnerabilities, immunities)`:
  - Damage modifiers: delegates to `pApplyDamageModifiers` from `attack.qnt` (single source of truth for immunity -> resistance -> vulnerability ordering)
  - Temp HP absorb first; remainder hits real HP
  - If HP drops to 0: check instant death (overflow >= maxHp -> dead); otherwise fall unconscious
  - If already at 0 HP: each damage instance = 1 death save failure; critical hit = 2 failures; overflow >= maxHp = instant death. **Note**: an unconscious creature at 0 HP hit by any attack from within 5ft auto-crits (from Unconscious condition), so melee attacks against dying creatures always deal 2 death save failures.
- `pHeal(state, amount)` -> `min(hp + amount, maxHp)`; if was at 0, regain consciousness and reset death saves
- `pGrantTempHp(state, newAmount, keepOld: bool)` -> if keepOld: keep current tempHp; else: set to newAmount. **Player chooses** whether to keep old or take new — it is NOT forced to max. Caller provides the choice.
- `pDeathSave(state, d20Roll)`:
  - >= 10: +1 success; 3 successes -> stable (and reset death save counts to 0)
  - < 10: +1 failure; 3 failures -> dead
  - Natural 1: +2 failures
  - Natural 20: regain 1 HP (resets death saves, regain consciousness)
- `pStabilize(state, medicineCheckResult)`:
  - Requires DC 10 Wisdom (Medicine) check (or healer's kit, no check)
  - Stable: no more death saves; still unconscious at 0 HP
  - **Death save counts (successes and failures) reset to zero upon becoming stable**
  - A stable creature that isn't healed regains 1 HP after 1d4 hours (modeled as `pStableRecovery(state, hours)`)
  - If a stable creature takes damage: stops being stable, must start making death saves again
- `pKnockOut(state)` -> unconscious + stable (melee attacker's choice when reducing to 0)

**Key invariants**:
- `hp >= 0 and hp <= maxHp`
- `tempHp >= 0`
- `dead implies hp == 0`
- `deathSaves.successes <= 3 and deathSaves.failures <= 3`
- `conscious implies hp > 0` (temp HP alone at 0 HP does NOT restore consciousness)
- `stable implies deathSaves.successes == 0 and deathSaves.failures == 0`
- Instant death: `overflowDamage >= maxHp implies dead`
- Healing at 0 HP resets death saves
- Stabilization resets death saves
- Resistance then vulnerability applied sequentially (not cancelled)

### 2.2 Conditions (`character/conditions.qnt`)

14 conditions. **This module is the canonical home for all condition state.**
Other modules import condition state; they do not duplicate it.

State fields:
- `blinded: bool`
- `charmed: bool` (charmer identity is caller-provided context, not tracked in state)
- `deafened: bool`
- `exhaustion: int` (0-6; 6 = death)
- `frightened: bool` (source identity is caller context)
- `grappled: bool`
- `incapacitated: bool`
- `invisible: bool`
- `paralyzed: bool`
- `petrified: bool`
- `poisoned: bool`
- `prone: bool`
- `restrained: bool`
- `stunned: bool`
- `unconscious: bool`

**Full condition effects** (all must be reflected in modifier functions):

| Condition | Attack Mods | Save Mods | Check Mods | Other |
|-----------|-------------|-----------|------------|-------|
| Blinded | Disadv on own attacks; adv on attacks against | -- | Auto-fail sight-dependent checks | Can't see |
| Charmed | Can't attack charmer or target charmer with harmful abilities/magical effects | -- | Charmer has adv on social checks | -- |
| Deafened | -- | -- | Auto-fail hearing-dependent checks | Can't hear |
| Exhaustion 1 | -- | -- | Disadv on ability checks | -- |
| Exhaustion 2 | -- | -- | (cumulative) | Speed halved |
| Exhaustion 3 | Disadv on attacks | Disadv on saves | (cumulative) | -- |
| Exhaustion 4 | (cumulative) | (cumulative) | (cumulative) | HP max halved |
| Exhaustion 5 | (cumulative) | (cumulative) | (cumulative) | Speed 0 |
| Exhaustion 6 | -- | -- | -- | Death |
| Frightened | Disadv on attacks (source in LOS) | -- | Disadv on ability checks (source in LOS) | Can't willingly move closer |
| Grappled | -- | -- | -- | Speed 0; no speed bonuses apply |
| Incapacitated | -- | -- | -- | Can't take actions or reactions |
| Invisible | Adv on own attacks; disadv on attacks against | -- | -- | Heavily obscured for hiding |
| Paralyzed | -> Incapacitated | Auto-fail STR/DEX | -- | Can't move/speak; attacks have adv; **any attack that hits within 5ft is a crit** |
| Petrified | -> Incapacitated | Auto-fail STR/DEX | -- | Can't move/speak; unaware; attacks have adv; resistance to all damage; immune to poison/disease (pre-existing suspended, not neutralized); weight x10; ceases aging |
| Poisoned | Disadv on attacks | -- | Disadv on ability checks | -- |
| Prone | Disadv on own attacks | -- | -- | Attacker within 5ft has adv; attacker beyond 5ft has disadv (ALL attacks, not just ranged); crawl only; stand costs half speed |
| Restrained | Disadv on own attacks; adv on attacks against | Disadv on DEX saves | -- | Speed 0; no speed bonuses apply |
| Stunned | -> Incapacitated | Auto-fail STR/DEX | -- | Can't move; speaks only falteringly; attacks have adv |
| Unconscious | -> Incapacitated + Prone | Auto-fail STR/DEX | -- | Drops held items (caller models inventory); unaware; attacks have adv; **any attack that hits within 5ft is a crit** |

**Condition implication tracking**: When a "parent" condition (Paralyzed, Petrified, Stunned, Unconscious) is applied, it sets `incapacitated = true` (and for Unconscious, `prone = true`). When removed, `incapacitated` is only cleared if NO other parent still implies it. Implementation: track a `incapacitatedSources: Set[str]` (e.g. `{"paralyzed", "stunned"}`). `incapacitated = incapacitatedSources.size() > 0`.

Side effects of applying conditions:
- Unconscious: creature drops held items, falls prone (caller models inventory; prone set by implication)
- Petrified: nonmagical objects worn/carried transform too; weight x10 (caller models if relevant)

Pure functions:
- `pApplyCondition(state, condition)` -> set flag, add to source sets for implications
- `pRemoveCondition(state, condition)` -> clear flag, remove from source sets, re-derive implications
- `pAddExhaustion(state, levels)` -> increment; 6 = death; 4 halves maxHp
- `pReduceExhaustion(state, levels)` -> decrement (min 0); restore maxHp if dropping below 4
- `pGetAttackModifiers(state, sourceInLOS, attackerWithin5ft)` -> `{hasAdvantage: bool, hasDisadvantage: bool, autoCrit: bool}` aggregated from all conditions. autoCrit if paralyzed or unconscious and attacker within 5ft.
- `pGetCheckModifiers(state, ability, requiresSight, requiresHearing, sourceInLOS)` -> `{hasAdvantage, hasDisadvantage, autoFail}`
- `pGetSaveModifiers(state, ability)` -> `{hasAdvantage, hasDisadvantage, autoFail}`
- `pCanAct(state)` -> `not incapacitated`
- `pCanSpeak(state)` -> `not paralyzed and not petrified and not unconscious` (stunned: can speak falteringly — returns true; DM may limit)

**Key invariants**:
- `paralyzed implies incapacitated`
- `petrified implies incapacitated`
- `stunned implies incapacitated`
- `unconscious implies incapacitated and prone`
- `exhaustion >= 6 implies dead`
- `incapacitated == (incapacitatedSources.size() > 0)`
- Grappled ends if grappler becomes incapacitated (caller signals this)
- Frightened: can't willingly move closer to source (enforced as movement constraint)

---

## Phase 3: Combat Turn & Attack

**Source**: PHB Ch 9

**Cross-ref before**: `09-combat.md` (all sections from "The Order of Combat" through "Underwater Combat")
**Cross-ref after**: verify every action, every attack modifier, every damage rule

### 3.1 Turn Structure & Action Economy (`combat/turn.qnt`)

State (per-turn, reset each turn):
- `movementRemaining: int`
- `actionUsed: bool`
- `bonusActionUsed: bool`
- `reactionAvailable: bool` (resets at start of own turn; consumed by opportunity attacks, readied actions, spells like Shield)
- `freeInteractionUsed: bool`
- `extraAttacksRemaining: int` (from Extra Attack; typically 1 for most classes, 2 for Fighter 11+, 3 for Fighter 20)
- `disengaged: bool` (Disengage active for this turn)
- `dodging: bool` (Dodge active until next turn start)
- `readiedAction: bool` (has a readied trigger pending)
- `bonusActionSpellCast: bool` (tracks if a bonus action spell was cast this turn — restricts action to cantrip only)
- `nonCantripActionSpellCast: bool` (tracks if a non-cantrip spell was cast as action — blocks bonus action spells)

Pure functions:
- `pStartTurn(state, config)` -> reset movement to effective speed; actionUsed/bonusActionUsed = false; reactionAvailable = true; dodging from previous turn may still be active (cleared at THIS turn start); extraAttacksRemaining = from config features
- `pUseAction(state, actionType)` -> mark used; validate preconditions per action type
- `pUseBonusAction(state)` -> mark used; can't use if can't take actions
- `pUseReaction(state)` -> mark unavailable; can happen on any creature's turn
- `pUseMovement(state, feet, movementCost)` -> deduct `feet * movementCost` from remaining
- `pUseObjectInteraction(state)` -> first free; second requires action
- `pUseExtraAttack(state)` -> decrement; 0 = no more attacks this action

**Invariants**:
- At most 1 action per turn
- At most 1 bonus action per turn
- At most 1 reaction per round
- Movement can be split (before/after action, between attacks)
- Can't take bonus action if can't take actions (incapacitated)
- Bonus action spell cast -> action can only be cantrip (tracked via `bonusActionSpellCast`)
- Non-cantrip spell cast as action -> can't cast bonus action spells this turn (tracked via `nonCantripActionSpellCast`). The PHB rule is symmetric: on any turn where a bonus action spell is cast, the only other spell allowed is a cantrip with casting time 1 action — and vice versa.
- Surprised creatures: can't move or act on first turn, can't use reaction until first turn ends

### 3.2 Attack Resolution (`combat/attack.qnt`)

Models a single attack from roll through damage application.

Pure functions:
- `pResolveAttack(d20Roll, abilityMod, profBonus, targetAC, coverBonus, hasAdvantage, hasDisadvantage)`:
  - Natural 20 -> hit + critical (regardless of AC)
  - Natural 1 -> miss (regardless of modifiers)
  - Otherwise: `d20Roll + abilityMod + profBonus + misc >= targetAC + coverBonus`
- `pCalculateDamage(damageDiceResult, abilityMod, isCritical, bonusDamageDiceResult)`:
  - Normal: `damageDiceResult + abilityMod`
  - Critical: `damageDiceResult + bonusDamageDiceResult + abilityMod` (caller rolls dice twice, passes both; modifiers NOT doubled)
- `pApplyDamageModifiers(amount, damageType, immunities, resistances, vulnerabilities)`:
  - Immunity -> 0
  - Then resistance -> `floor(amount / 2)`
  - Then vulnerability -> `amount * 2`
  - Applied **sequentially in this order**, not cancelled
  - Multiple instances of same type count as one
- `pCalculateCoverBonus(coverType)`:
  - Half: +2 AC **and** +2 DEX saves
  - Three-quarters: +5 AC **and** +5 DEX saves
  - Total: can't be targeted directly

**Attack modifier aggregation** (from conditions, position, environment):

Advantage sources:
- Target is blinded (attacker can see)
- Attacker is invisible (target can't see)
- Target is paralyzed/petrified/stunned/unconscious (attacks against have adv)
- Target is prone AND attacker within 5ft
- Target is restrained
- Attacker is unseen by target (hidden, in darkness, etc.)

Disadvantage sources (on attacks AGAINST this creature):
- Target is dodging and can see the attacker (`dodging` from turn state)

Disadvantage sources (on this creature's attacks):
- Attacker is blinded
- Target is invisible (attacker can't see)
- Attacker is prone
- Attacker is restrained
- Attacker is poisoned
- Attacker is frightened (source of fear in line of sight)
- Exhaustion >= 3
- Target is prone AND attacker beyond 5ft (applies to ALL attacks, not just ranged)
- Ranged attack beyond normal range (but within long range)
- Ranged attack with hostile creature within 5ft who can see attacker and isn't incapacitated
- Attacker can't see target (unseen target)
- Heavy weapon used by Small/Tiny creature
- Squeezing

Auto-crit: Target is paralyzed or unconscious AND **any attack** (not just melee) hits from within 5ft.

**Unseen attacker/target rules** (distinct from Blinded/Invisible conditions):
- Attacking a target you can't see: disadvantage
- If target isn't where you guess: automatic miss (caller provides hit boolean)
- Hidden attacker: reveals location on attack (hit or miss)
- If target can't see you: advantage on attack

**Underwater combat modifiers**:
- Melee without swim speed: disadvantage (unless dagger, javelin, shortsword, spear, trident)
- Ranged beyond normal range: auto-miss
- Ranged within normal range: disadvantage (unless crossbow, net, or thrown-like-javelin weapon)
- Fully immersed: resistance to fire damage

**Invariants**:
- Nat 20 always hits regardless of AC
- Nat 1 always misses regardless of bonuses
- Critical hit doubles dice only, not flat modifiers
- Resistance and vulnerability applied sequentially (halve then double), never skipped
- Multiple resistances/vulnerabilities to same type count as one instance

---

## Phase 4: Combat Actions & Interactions

**Source**: PHB Ch 9

**Cross-ref before**: `09-combat.md` (Actions in Combat, Grappling, Shoving, Mounted Combat, Underwater)
**Cross-ref after**: verify every action precondition, every contest mechanic

### 4.1 Standard Combat Actions (`combat/actions.qnt`)

Each action consumes the action budget. Pure functions validate preconditions.

- **Attack**: One attack (or more with Extra Attack). Delegates to `attack.qnt`. Extra Attack: when you take the Attack action, make `1 + extraAttacks` total weapon attacks. Loading property limits to 1 attack per action/bonus action/reaction regardless of Extra Attack.
- **Cast a Spell**: Delegates to `casting.qnt`.
- **Dash**: Gain extra movement = effective speed. Stacks with Cunning Action Dash, etc.
- **Disengage**: Set `disengaged = true`. Movement doesn't provoke opportunity attacks this turn.
- **Dodge**: Set `dodging = true`. Until next turn start: attacks against have disadvantage (if you can see attacker); advantage on DEX saves. Ends if incapacitated or speed drops to 0.
- **Help**: Externalized — caller marks that ally's next check/attack gains advantage. Requires: ally and target within 5ft, attacker can take actions.
- **Hide**: Caller provides Stealth check result. On success: unseen (advantage on attacks, enemies have disadvantage). Revealed on attack (hit or miss).
- **Ready**: Set trigger. When triggered (on another's turn): spend reaction to take readied action. If holding spell: requires concentration; if concentration breaks, spell wasted. If trigger never occurs: action lost at start of next turn.
  - Readied action details: must describe perceivable trigger; reaction fires in response; if readied action is a spell, cast the spell on your turn then hold it with concentration
- **Search**: Perception or Investigation check (externalized result).
- **Use an Object**: For objects requiring an action (potions, etc.).

### 4.2 Two-Weapon Fighting

Preconditions:
- Took the Attack action this turn
- Attacked with a light melee weapon in one hand
- Have a different light melee weapon in other hand

Effect:
- Bonus action: one attack with off-hand weapon
- Don't add ability modifier to off-hand damage (unless modifier is negative)
- If weapon has thrown property: can throw instead of melee

### 4.3 Grapple & Shove (`combat/grapple.qnt`)

Special melee attacks replacing one attack within the Attack action.

**Grapple**:
- Precondition: target <= one size larger; within reach; attacker has free hand
- Contest: attacker Athletics vs target's choice of Athletics or Acrobatics (caller provides both results)
- Auto-success if target incapacitated
- Success: target gains Grappled (speed 0; **no speed bonuses apply**)
- Release: free (no action)
- Escape: target uses action; Athletics or Acrobatics vs attacker's Athletics
- Moving grappled creature: attacker's speed halved (unless target >= 2 sizes smaller)

**Shove**:
- Precondition: target <= one size larger; within reach
- Contest: same as grapple
- Auto-success if target incapacitated
- Success: knock prone OR push 5 feet (attacker chooses; push direction is caller-provided)

**Invariants**:
- Grapple ends if grappler becomes incapacitated (caller signals)
- Grapple ends if effect removes target from reach (caller signals)
- Size constraint: target at most one size larger

### 4.4 Opportunity Attacks

Modeled as a transition on the ATTACKED creature's state (single-creature perspective: "I was opportunity attacked, here's the attack result"). The decision of whether an OA triggers is caller logic:

- Trigger: hostile creature **that the attacker can see** moves out of attacker's reach using its own movement/action/reaction
- **Timing**: the attack interrupts movement, occurring right before the creature leaves reach (target is still within reach when OA resolves)
- NOT triggered by: Disengage; teleportation; forced movement (not using own movement/action/reaction)
- Cost to attacker: reaction
- Type: one melee attack

Pure function:
- `pCanBeOpportunityAttacked(state)` -> not disengaged (Disengage active this turn)
- `pReceiveOpportunityAttack(state, attackResult)` -> apply damage if hit (delegates to hitpoints)

### 4.5 Mounted Combat (partial)

Deterministic rules only:
- Mounting/dismounting: costs half your speed. Can do once during your move.
- **Controlled mount** (trained, non-intelligent): shares your initiative; limited to Dash, Disengage, Dodge actions; **can move and act even on the turn you mount it**.
- **Independent mount** (intelligent, e.g. dragon): retains its own initiative; no action restrictions; acts as it wishes (DM-controlled — not formalized beyond initiative separation).
- **Forced dismount triggers** (two distinct causes, same save):
  1. Mount is moved against its will while you're on it -> DC 10 DEX save or fall prone within 5ft
  2. You are knocked prone while mounted -> DC 10 DEX save or fall prone within 5ft
- Mount knocked prone: you can use your reaction to dismount and land on feet; otherwise you are dismounted and fall prone within 5ft
- **OA targeting**: if mount provokes an opportunity attack while you're riding, attacker can target you or the mount (caller decides)

---

## Phase 5: Movement System

**Source**: PHB Ch 9 (Movement and Position), Ch 8 (Movement, Jumping)

**Cross-ref before**: `09-combat.md` (Movement and Position), `08-adventuring.md` (Movement, Special Types)
**Cross-ref after**: verify every speed modifier, every cost multiplier, every jumping formula

### 5.1 Combat Movement (`combat/movement.qnt`)

**No grid, no coordinates.** Models movement budget and cost multipliers only.

State: uses `movementRemaining` from turn.qnt and conditions from conditions.qnt.

**Multiple speed types**: creatures may have walk, fly, swim, climb, burrow speeds.
When switching speed type mid-move: subtract distance already moved from new speed.

Pure functions:
- `pCalculateEffectiveSpeed(config, conditions, armorEquipped)`:
  - Base: `config.speeds.get(Walk)` (or current speed type)
  - Heavy armor without meeting STR requirement (STR < armor's listed minimum): -10 ft
  - Exhaustion 2+: halved (applied after armor penalty)
  - Exhaustion 5+: 0
  - Grappled: 0 (and no speed bonuses apply)
  - Restrained: 0 (and no speed bonuses apply)
  - Grappling another creature: halved (unless target >= 2 sizes smaller)
  - Other effects (spells, items): caller-provided modifier; ignored if grappled or restrained
- `pMovementCost(baseCost, isDifficultTerrain, isCrawling, isClimbing, isSwimming, hasRelevantSpeed)`:
  - Difficult terrain: x2
  - Crawling: x2
  - Climbing/swimming without relevant speed: x2
  - Crawling in difficult terrain: x3
  - Climbing/swimming without relevant speed in difficult terrain: x3
  - Climbing/swimming with relevant speed in difficult terrain: x2
  - Squeezing: x2 (plus disadvantage on attacks and DEX saves; advantage on attacks against)
- `pStandFromProne(state)` -> costs half effective speed; fails if remaining < half
- `pDropProne(state)` -> free (0 cost)
- `pFlyingCreatureFalls(state)` -> if prone or speed 0, creature falls (unless has hover)
- `pSwitchSpeedType(state, newType, config)` -> remaining = max(0, config.speeds.get(newType) - movementUsed)

**Jumping** (deterministic formulas):
- Long jump (running start >= 10 ft): cover feet = STR score. Standing: half.
- High jump (running start >= 10 ft): height = 3 + STR mod (min 0). Standing: half.
- Jump distance costs movement normally.
- Landing in difficult terrain: DC 10 Acrobatics or land prone (caller provides result).

**Movement constraints** (not spatial — expressed as boolean preconditions the caller checks):
- Can't end move in another creature's space
- Moving through hostile creature: only if >= 2 sizes different
- Friendly creature's space: counts as difficult terrain
- Frightened: can't willingly move closer to source of fear

---

## Phase 6: Spellcasting System

**Source**: PHB Ch 10 (Spellcasting), Ch 6 (Multiclass Spellcasting)

**Cross-ref before**: `10-spellcasting.md`, `06-customization-options.md` (Spellcasting section)
**Cross-ref after**: verify slot math, concentration rules, component constraints, ritual rules

### 6.1 Spell Slots (`character/spellslots.qnt`)

State:
- `slotsMax: SpellLevel -> int` (from class table or multiclass calculation)
- `slotsCurrent: SpellLevel -> int`
- `pactSlotsMax: int` (warlock only)
- `pactSlotsCurrent: int`
- `pactSlotLevel: int`

Pure functions:
- `pExpendSlot(state, level)` -> decrement; fail if 0
- `pExpendPactSlot(state)` -> decrement; fail if 0
- `pCanCastAtLevel(state, spellLevel, slotLevel)` -> `slotLevel >= spellLevel and slotsCurrent.get(slotLevel) > 0`
- `pRestoreAllSlots(state)` -> reset to max (long rest)
- `pRestorePactSlots(state)` -> reset pact slots (short rest)
- `pCalculateMulticlassSlots(classLevels)`:
  - Full casters (bard, cleric, druid, sorcerer, wizard): full level
  - Half casters (paladin, ranger): `floor(level / 2)`
  - Third casters (eldritch knight, arcane trickster): `floor(level / 3)`
  - Sum all -> look up Multiclass Spellcaster table (PHB Ch 6)
  - Warlock pact magic: **separate**, not added to multiclass total
  - Pact slots usable to cast non-warlock spells and vice versa

**Invariants**:
- `slotsCurrent.get(l) >= 0 and slotsCurrent.get(l) <= slotsMax.get(l)` for all levels
- Can cast lower-level spell with higher-level slot
- Can't cast higher-level spell with lower-level slot
- Cantrips (level 0): unlimited, no slots

### 6.2 Casting Rules (`spellcasting/casting.qnt`)

Pure functions:
- `pCastSpell(state, spellLevel, slotUsed, castingTime, hasConcentration, isRitual, components)`:
  - Validate slot at `slotUsed >= spellLevel`
  - If bonus action cast: set `bonusActionSpellCast = true` on turn state; action this turn restricted to cantrip only
  - If concentration: drop existing concentration first
  - If ritual: no slot expended; +10 min casting time; **cannot upcast** (always cast at base spell level); **requires** `config.canRitualCast == true` (class feature)
  - Components: V requires `pCanSpeak(conditions)`; S requires a free hand; M requires focus or specific components (caller validates). If material is consumed, caller tracks inventory.
  - **Armor check**: if wearing armor without proficiency, **cannot cast at all** (return failure)

**Concentration**:
- State: `concentrating: bool`, `concentrationSpellId: str`
- `pConcentrationCheck(state, damageTaken, conSaveResult)`:
  - DC = `max(10, floor(damageTaken / 2))`
  - If save fails: concentration broken
  - Separate save per damage source in same event
- Broken by: new concentration spell, incapacitation, death, failed save
- Can end voluntarily (no action)

**Longer casting times** (spells requiring > 1 action):
- Must spend action each turn on the casting
- Must maintain concentration during the casting
- If concentration broken: spell fails, slot not expended

**Combining magical effects**:
- Different spells: effects stack while durations overlap
- Same spell multiple times: only the most potent (or most recent if equal) applies; don't combine

**Invariants**:
- At most one concentration spell active at any time
- Bonus action spell -> action can only be a cantrip (not another leveled spell, not even with action surge)
- Wearing non-proficient armor -> cannot cast spells (binary, not disadvantage)
- Ritual casting cannot upcast and requires a class feature

---

## Phase 7: Resting & Recovery

**Source**: PHB Ch 8 (Resting)

**Cross-ref before**: `08-adventuring.md` (Resting section)
**Cross-ref after**: verify HP recovery, HD recovery, slot recovery, exhaustion, temp HP

### 7.1 Short Rest (`rest/rest.qnt`)

- Duration: >= 1 hour
- Can spend Hit Dice: for each HD spent, roll `hitDieType + CON mod` (min 0), regain that many HP
- Hit die types per class: d6 (sorcerer, wizard), d8 (bard, cleric, druid, monk, rogue, warlock), d10 (fighter, paladin, ranger), d12 (barbarian)
- Can spend multiple HD sequentially (decide after each roll)
- Warlock: recover pact spell slots

### 7.2 Long Rest

- Duration: >= 8 hours (6 sleeping, 2 light activity)
- Regain all lost HP
- Regain spent Hit Dice: up to `max(1, floor(totalHD / 2))`
- Regain all spell slots (regular and pact)
- Reduce exhaustion by 1 (if ate and drank)
- **Temp HP with no specified duration expire** (PHB: "they last until depleted or you finish a long rest")
- Limit: one long rest per 24 hours
- Requires >= 1 HP to benefit
- Interrupted by >= 1 hour of strenuous activity -> restart entirely

Pure functions:
- `pShortRest(state, hdRolls: List[int], config)` -> spend HD from pool, heal per roll, restore pact slots
- `pLongRest(state, hasEaten, config)` -> full HP, restore HD (up to half), all slots, -1 exhaustion, clear default-duration temp HP

**Invariants**:
- HP <= maxHp after any healing
- HD spent <= available HD
- HD recovered on long rest: `max(1, floor(totalHD / 2))`
- Can't benefit from > 1 long rest per 24 hours

---

## Phase 8: Environmental Rules

**Source**: PHB Ch 8 (The Environment)

**Cross-ref before**: `08-adventuring.md` (The Environment section)
**Cross-ref after**: verify every formula, every DC, every exhaustion trigger

### 8.1 Falling (`environment/environment.qnt`)

- Damage: `min(floor(heightFeet / 10), 20)` d6 bludgeoning (caller provides roll result)
- Land prone (unless damage entirely avoided)

### 8.2 Suffocation

- Hold breath: `1 + CON mod` minutes, **minimum 30 seconds** (not 1 minute). Formula: if `1 + CON_mod < 1`, use 0.5 minutes (30 seconds = 5 rounds).
- Out of breath: `max(CON mod, 1)` rounds
- At start of next turn after rounds expire: drop to 0 HP, dying
- **Cannot regain HP or be stabilized until breathing again**

### 8.3 Vision & Light

Three illumination levels:
- Bright: normal sight
- Dim -> lightly obscured: disadvantage on Perception (sight)
- Darkness -> heavily obscured: effectively Blinded condition

Special senses (config flags):
- Darkvision (range): darkness -> dim equivalent; dim -> bright equivalent
- Blindsight (range): perceive without sight
- Truesight (range): see in magical darkness, invisible creatures, illusions, shapechangers, into Ethereal

### 8.4 Food & Water

- Food: 1 lb/day; half-rations (0.5 lb) count as half a day without food. Survive `3 + CON mod` days (min 1) without; then 1 exhaustion/day
- Water: 1 gallon/day (2 in heat); half -> DC 15 CON save or 1 exhaustion; less -> auto exhaustion
- If already exhausted (>= 1 level) when suffering dehydration: takes 2 exhaustion levels instead of 1 (this escalation applies to **water only**, not food — starvation is always 1 level/day)
- Normal day of eating resets food counter to zero
- **Exhaustion from lack of food or water can't be removed until the character eats and drinks the full required amount**

### 8.5 Travel & Forced March

- Pace: Fast (400ft/min, 4mi/hr, 30mi/day, -5 passive Perception), Normal (300/3/24), Slow (200/2/18, can stealth)
- Difficult terrain: half travel speed
- Forced march: after 8 hours, each additional hour -> CON save DC `10 + (hours - 8)`; fail = 1 exhaustion

---

## Phase 9: Character Construction & Leveling

**Source**: PHB Ch 1-4, 6

**Cross-ref before**: `01-step-by-step-characters.md`, `06-customization-options.md`
**Cross-ref after**: verify XP table, multiclass tables, point buy costs, HP formula

### 9.1 Ability Score Generation (`leveling/leveling.qnt`)

Three methods (all pre-resolved):
- **Standard array**: 15, 14, 13, 12, 10, 8 — assign each to one ability
- **Point buy**: 27 points; scores 8-15; cost table:
  | Score | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
  |-------|---|---|----|----|----|----|----|----|
  | Cost  | 0 | 1 | 2  | 3  | 4  | 5  | 7  | 9  |
- **Rolled**: 4d6 drop lowest, six times (caller provides results)

Constraints:
- Each score assigned to exactly one ability (bijection from 6 scores to 6 abilities)
- Racial modifiers applied after assignment
- Final scores: 1-20 typical PC cap (can exceed via magic)

### 9.2 Level Advancement

XP thresholds: 0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000

On level up:
- Gain 1 HD of class's hit die type
- HP: roll HD + CON mod, **minimum of 1** (or take average + CON mod, also min 1). First level of first class: max HD + CON mod.
- Gain class features for new level
- At levels 4/8/12/16/19: ASI (+2 to one score or +1 to two) OR feat (if using optional feat rules)

### 9.3 Multiclassing

**Prerequisites**: must meet ability score minimums for BOTH current and new class.
| Class | Minimum |
|-------|---------|
| Barbarian | STR 13 |
| Bard | CHA 13 |
| Cleric | WIS 13 |
| Druid | WIS 13 |
| Fighter | STR 13 or DEX 13 |
| Monk | DEX 13 and WIS 13 |
| Paladin | STR 13 and CHA 13 |
| Ranger | DEX 13 and WIS 13 |
| Rogue | DEX 13 |
| Sorcerer | CHA 13 |
| Warlock | CHA 13 |
| Wizard | INT 13 |

**Proficiency**: bonus based on total character level. Multiclassing into a class grants only LIMITED proficiencies (not full starting proficiencies):
| Class | Gained |
|-------|--------|
| Barbarian | Shields, simple weapons, martial weapons |
| Bard | Light armor, one skill, one instrument |
| Cleric | Light armor, medium armor, shields |
| Druid | Light armor, medium armor, shields (druids will not wear metal armor or shields) |
| Fighter | Light/medium armor, shields, simple/martial weapons |
| Monk | Simple weapons, shortswords |
| Paladin | Light/medium armor, shields, simple/martial weapons |
| Ranger | Light/medium armor, shields, simple/martial, one skill |
| Rogue | Light armor, one skill, thieves' tools |
| Sorcerer | -- |
| Warlock | Light armor, simple weapons |
| Wizard | -- |

**Extra Attack**: doesn't stack across classes.
**Unarmored Defense**: can't gain it from a second class.
**HP on multiclass level**: roll new class's HD + CON mod, **minimum 1** (NOT max HD — that's first level only).
**Spell slots**: see Phase 6 multiclass calculation.

### 9.4 Feats (optional rule)

At ASI levels (4/8/12/16/19), can choose a feat instead of ability score increase.

- Most feats taken only once
- Must meet prerequisites (ability scores, proficiencies, etc.)
- Losing a prerequisite (e.g., STR drops below 13) -> can't use feat until restored

Feats are a data table (name + prerequisites + effects). Individual feat effects are like individual spell effects — the framework (choice, prerequisites, one-time constraint) is formalized; individual feat mechanics are not enumerated here.

---

## Dependency Order (Build Sequence)

```
Phase 1  core/types.qnt
         character/config.qnt
         core/dice.qnt
         character/equipment.qnt      <- moved here; needed by phases 2-6
           |
Phase 2  character/hitpoints.qnt
         character/conditions.qnt     <- canonical home for ALL condition state
           |
Phase 3  combat/turn.qnt
         combat/attack.qnt
           |
Phase 4  combat/actions.qnt
         combat/grapple.qnt           <- imports conditions for incapacitated auto-win
           |
Phase 5  combat/movement.qnt          <- imports conditions for prone/grappled/restrained/speed
           |
Phase 6  character/spellslots.qnt
         spellcasting/casting.qnt     <- imports equipment for armor check, turn for bonus action
           |
Phase 7  rest/rest.qnt               <- imports hitpoints, spellslots
           |
Phase 8  environment/environment.qnt
           |
Phase 9  leveling/leveling.qnt
```

---

## What is NOT Formalized

- **Individual class features**: Hundreds of features. The framework (level, HD, proficiencies, ASI schedule, spell slots) is modeled; individual features are opaque tags in config.
- **Individual spells**: 300+ spells. The casting framework is modeled; individual effects are not.
- **Individual feats**: Framework (prerequisites, ASI-or-feat choice) is modeled; individual feat effects are not.
- **Individual racial features**: Racial stat bonuses modeled in config; individual traits are opaque.
- **Battlemaps/grids/coordinates**: Spatial relationships are caller-provided booleans.
- **AoE geometry**: Cut. Caller determines which creatures are affected and passes them in.
- **Chapters 0, 4, 13, 14, 15**: Introduction, personality/background (narrative), gods (lore), planes (lore), credits.
- **DM-fiat rules**: Improvised actions, social interaction outcomes, exploration specifics.
- **Initiative ordering**: Multi-creature concern. Caller manages initiative list and provides "whose turn is it." Tie-breaking is parameterized (caller resolves ties).

---

## Implementation Workflow

For EVERY phase:

1. **Before coding**: re-read the corresponding PHB chapter(s) listed in the phase's "Cross-ref before" line. Note any rules you're unsure about.
2. **Implement**: write the Quint spec following the plan.
3. **After coding**: re-read the same PHB chapters ("Cross-ref after"). For every rule in the chapter, confirm it is either (a) covered in your spec or (b) explicitly listed in "What is NOT Formalized." Flag anything that falls through the cracks.
4. **Test**: write the companion `*Test.qnt` file. Verify invariants, test edge cases.

This double cross-reference is mandatory. Do not skip it.

---

## Testing Strategy

Each module gets a `*Test.qnt` companion. Follow REPL-first debugging, then action witnesses, then invariant verification.

**Priority test scenarios**:
1. Death save state machine: all 5 paths (stabilize via 3 successes, die via 3 failures, nat 1 double failure, nat 20 regain HP, damage while dying — including auto-crit from unconscious)
2. Condition implication chain: apply Paralyzed -> incapacitated set; remove Paralyzed while Stunned active -> incapacitated remains
3. Attack resolution: nat 1/20 edges, cover on DEX saves, advantage/disadvantage cancellation
4. Damage resistance/vulnerability: sequential application with odd numbers (halve 7 = 3, double 3 = 6)
5. Concentration: break on damage (DC = max(10, dmg/2)), break on second concentration spell, break on incapacitation
6. Multiclass spell slot calculation: full + half + third caster combinations
7. Exhaustion ladder: accumulate to death at 6, HP max halved at 4, recovery via long rest
8. Grapple: size constraints, incapacitated auto-success, escape contest, speed 0 + no bonuses
9. Temp HP: player choice (not forced max), absorb before real HP, don't restore consciousness at 0 HP, expire on long rest
10. Bonus action spell rule: cast Healing Word (bonus) -> can only cast cantrip (not Fireball) as action
11. Armor proficiency: wearing without proficiency -> cannot cast spells; disadvantage only on STR/DEX rolls
12. Two-weapon fighting: requires light in both hands, no ability mod on off-hand damage
13. Stabilization: resets death save counts; stable creature taking damage restarts death saves
14. Auto-crit at 0 HP: unconscious creature hit from within 5ft -> always crits -> always 2 death save failures
15. Restrained/Grappled: speed 0 AND no speed bonuses (Haste, Longstrider etc. negated)
