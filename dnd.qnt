// -*- mode: Bluespec; -*-

/// D&D 5e PHB - Phase 1: Core Types, Config & Resolution
/// Formal specification of foundational mechanics.
/// All dice rolls pre-resolved: callers pass results as arguments.

module dnd {

  // ============================================================
  // 1. TYPES (core/types)
  // ============================================================

  type Ability = Str | Dex | Con | Int_ | Wis | Cha

  type Skill =
    | Acrobatics | AnimalHandling | Arcana | Athletics
    | Deception | History | Insight | Intimidation
    | Investigation | Medicine | Nature | Perception
    | Performance | Persuasion | Religion | SleightOfHand
    | Stealth | Survival

  type Size = Tiny | Small | Medium | Large | Huge | Gargantuan

  type DamageType =
    | Acid | Bludgeoning | Cold | Fire | Force
    | Lightning | Necrotic | Piercing | Poison
    | Psychic | Radiant | Slashing | Thunder

  type CoverType = NoCover | HalfCover | ThreeQuartersCover | TotalCover

  type ArmorCategory = LightArmor | MediumArmor | HeavyArmor

  type WeaponProperty =
    | Finesse | Heavy | Light_ | Loading | Reach
    | Thrown | TwoHanded | Versatile | Ammunition | Special

  type SpeedType = Walk | Fly | Swim | Climb | Burrow

  type ProficiencyLevel = NoneProf | HalfProf | Proficient | Expertise

  type Illumination = Bright | Dim | Dark

  // Skill -> default ability mapping
  pure def skillAbility(s: Skill): Ability = match s {
    | Acrobatics => Dex     | AnimalHandling => Wis | Arcana => Int_
    | Athletics => Str      | Deception => Cha      | History => Int_
    | Insight => Wis        | Intimidation => Cha   | Investigation => Int_
    | Medicine => Wis       | Nature => Int_         | Perception => Wis
    | Performance => Cha    | Persuasion => Cha      | Religion => Int_
    | SleightOfHand => Dex  | Stealth => Dex        | Survival => Wis
  }

  // ============================================================
  // 2. CHARACTER CONFIG (character/config)
  // ============================================================

  /// Immutable for the duration of the state machine.
  type CharConfig = {
    abilityScores: Ability -> int,   // 1-30
    level: int,                      // 1-20
    size: Size,
    speeds: SpeedType -> int,        // base speeds; 0 = no such speed
    saveProficiencies: Set[Ability],
    skillProficiencies: Set[Skill],
    expertiseSkills: Set[Skill],
    armorProficiencies: Set[ArmorCategory],
    hitDieType: int,                 // 6, 8, 10, or 12
    spellcastingAbility: Ability,    // ignored if not a caster
    hasSpellcasting: bool,
    canRitualCast: bool,
    unarmoredDefense: UnarmoredDefense,
    features: Set[str],
  }

  type UnarmoredDefense = NoUnarmoredDefense | BarbarianUD | MonkUD

  // ============================================================
  // 3. PURE FUNCTIONS - Config & Resolution
  // ============================================================

  /// (score - 10) / 2, floor division
  pure def abilityModifier(score: int): int = {
    if (score >= 10) (score - 10) / 2
    else -(((10 - score) + 1) / 2)
  }

  /// +2 at level 1, +6 at level 17+
  pure def proficiencyBonus(level: int): int = (level - 1) / 4 + 2

  /// Proficiency multiplier by level
  pure def profMultiplier(profLevel: ProficiencyLevel, profBonus: int): int = match profLevel {
    | NoneProf => 0
    | HalfProf => profBonus / 2
    | Proficient => profBonus
    | Expertise => profBonus * 2
  }

  /// Passive check: 10 + mod + prof + adv/disadv
  pure def passiveCheck(
    abilityMod: int,
    profLevel: ProficiencyLevel,
    profBonus: int,
    hasAdvantage: bool,
    hasDisadvantage: bool
  ): int = {
    val profMod = profMultiplier(profLevel, profBonus)
    val advMod = if (hasAdvantage and not(hasDisadvantage)) 5
                 else if (hasDisadvantage and not(hasAdvantage)) -5
                 else 0
    10 + abilityMod + profMod + advMod
  }

  pure def spellcastingBonus(config: CharConfig): int = {
    abilityModifier(config.abilityScores.get(config.spellcastingAbility)) + proficiencyBonus(config.level)
  }

  pure def spellSaveDC(config: CharConfig): int = 8 + spellcastingBonus(config)

  pure def spellAttackBonus(config: CharConfig): int = spellcastingBonus(config)

  // ============================================================
  // 4. d20 RESOLUTION (core/dice)
  // ============================================================

  /// Advantage/disadvantage resolution.
  /// Multiple sources -> still one extra die.
  /// Any advantage + any disadvantage -> cancel to neither.
  type AdvState = { hasAdvantage: bool, hasDisadvantage: bool }

  pure def resolveAdvantage(sources: AdvState): AdvState = {
    if (sources.hasAdvantage and sources.hasDisadvantage)
      { hasAdvantage: false, hasDisadvantage: false }
    else sources
  }

  /// Ability check: roll + abilityMod + profMultiplier >= DC
  pure def checkSucceeds(
    d20Roll: int,
    abilityMod: int,
    profLevel: ProficiencyLevel,
    profBonus: int,
    miscBonus: int,
    dc: int
  ): bool = {
    d20Roll + abilityMod + profMultiplier(profLevel, profBonus) + miscBonus >= dc
  }

  /// Saving throw: same formula as check; classes grant proficiency in 2 saves
  pure def saveSucceeds(
    d20Roll: int,
    abilityMod: int,
    isProficient: bool,
    profBonus: int,
    miscBonus: int,
    dc: int
  ): bool = {
    val prof = if (isProficient) profBonus else 0
    d20Roll + abilityMod + prof + miscBonus >= dc
  }

  type ContestResult = AWins | BWins | Tie

  /// Contest: higher total wins; tie = status quo (no change)
  pure def contestWinner(totalA: int, totalB: int): ContestResult = {
    if (totalA > totalB) AWins
    else if (totalB > totalA) BWins
    else Tie
  }

  /// Group check: >= half succeed -> group succeeds
  pure def groupCheckSucceeds(successes: int, total: int): bool = {
    successes * 2 >= total
  }

  /// Attack roll result
  type AttackResult = { hits: bool, isCritical: bool }

  /// Attack resolution: nat20 always hits+crits, nat1 always misses
  pure def resolveAttackRoll(
    d20Roll: int,
    attackBonus: int,
    targetAC: int,
    targetCoverBonus: int
  ): AttackResult = {
    if (d20Roll == 20) { hits: true, isCritical: true }
    else if (d20Roll == 1) { hits: false, isCritical: false }
    else {
      val total = d20Roll + attackBonus
      val ac = targetAC + targetCoverBonus
      { hits: total >= ac, isCritical: false }
    }
  }

  /// Cover bonus (same value for AC and DEX saves per PHB)
  pure def coverBonus(cover: CoverType): int = match cover {
    | NoCover => 0
    | HalfCover => 2
    | ThreeQuartersCover => 5
    | TotalCover => 0   // can't be targeted directly
  }

  pure def canBeTargeted(cover: CoverType): bool = match cover {
    | TotalCover => false
    | _ => true
  }

  // ============================================================
  // 5. DAMAGE MODIFIERS
  // ============================================================

  /// Apply in order: immunity -> resistance -> vulnerability.
  /// Multiple instances of same type count as one.
  pure def applyDamageModifiers(
    amount: int,
    damageType: DamageType,
    immunities: Set[DamageType],
    resistances: Set[DamageType],
    vulnerabilities: Set[DamageType]
  ): int = {
    if (immunities.contains(damageType)) 0
    else {
      val afterResist = if (resistances.contains(damageType)) amount / 2 else amount
      if (vulnerabilities.contains(damageType)) afterResist * 2 else afterResist
    }
  }

  /// Critical hit damage: normal dice + bonus dice + modifier (modifier NOT doubled)
  pure def criticalDamage(normalDice: int, bonusDice: int, modifier: int): int = {
    normalDice + bonusDice + modifier
  }

  /// Normal damage: dice + modifier
  pure def normalDamage(diceResult: int, modifier: int): int = {
    diceResult + modifier
  }

  // ============================================================
  // 6. EQUIPMENT (character/equipment)
  // ============================================================

  /// Armor definition
  type Armor = {
    category: ArmorCategory,
    baseAC: int,
    strRequirement: int,         // 0 = none
    stealthDisadvantage: bool,
  }

  // Standard armors
  pure val PADDED: Armor = { category: LightArmor, baseAC: 11, strRequirement: 0, stealthDisadvantage: true }
  pure val LEATHER: Armor = { category: LightArmor, baseAC: 11, strRequirement: 0, stealthDisadvantage: false }
  pure val STUDDED_LEATHER: Armor = { category: LightArmor, baseAC: 12, strRequirement: 0, stealthDisadvantage: false }

  pure val HIDE: Armor = { category: MediumArmor, baseAC: 12, strRequirement: 0, stealthDisadvantage: false }
  pure val CHAIN_SHIRT: Armor = { category: MediumArmor, baseAC: 13, strRequirement: 0, stealthDisadvantage: false }
  pure val SCALE_MAIL: Armor = { category: MediumArmor, baseAC: 14, strRequirement: 0, stealthDisadvantage: true }
  pure val BREASTPLATE: Armor = { category: MediumArmor, baseAC: 14, strRequirement: 0, stealthDisadvantage: false }
  pure val HALF_PLATE: Armor = { category: MediumArmor, baseAC: 15, strRequirement: 0, stealthDisadvantage: true }

  pure val RING_MAIL: Armor = { category: HeavyArmor, baseAC: 14, strRequirement: 0, stealthDisadvantage: true }
  pure val CHAIN_MAIL: Armor = { category: HeavyArmor, baseAC: 16, strRequirement: 13, stealthDisadvantage: true }
  pure val SPLINT: Armor = { category: HeavyArmor, baseAC: 17, strRequirement: 15, stealthDisadvantage: true }
  pure val PLATE: Armor = { category: HeavyArmor, baseAC: 18, strRequirement: 15, stealthDisadvantage: true }

  type ArmorState = Unarmored | WearingArmor(Armor)

  /// Calculate AC. conMod/wisMod only used for BarbarianUD/MonkUD respectively.
  pure def calculateAC(
    armorState: ArmorState,
    dexMod: int,
    hasShield: bool,
    unarmoredDef: UnarmoredDefense,
    conMod: int,
    wisMod: int
  ): int = {
    val shieldBonus = if (hasShield) 2 else 0
    val baseAC = match armorState {
      | WearingArmor(armor) => match armor.category {
        | LightArmor => armor.baseAC + dexMod
        | MediumArmor => {
          val cappedDex = if (dexMod > 2) 2 else dexMod
          armor.baseAC + cappedDex
        }
        | HeavyArmor => armor.baseAC
      }
      | Unarmored => match unarmoredDef {
        | NoUnarmoredDefense => 10 + dexMod
        | BarbarianUD => 10 + dexMod + conMod
        | MonkUD => 10 + dexMod + wisMod
      }
    }
    baseAC + shieldBonus
  }

  /// Heavy armor STR requirement: speed reduced by 10 if STR < requirement
  pure def armorSpeedPenalty(armorState: ArmorState, strScore: int): int = match armorState {
    | WearingArmor(armor) =>
      if (armor.strRequirement > 0 and strScore < armor.strRequirement) 10 else 0
    | Unarmored => 0
  }

  /// Wearing armor without proficiency: disadv on STR/DEX rolls + can't cast spells
  pure def lacksArmorProficiency(armorState: ArmorState, proficiencies: Set[ArmorCategory]): bool = match armorState {
    | WearingArmor(armor) => not(proficiencies.contains(armor.category))
    | Unarmored => false
  }

  /// Weapon definition
  type Weapon = {
    name: str,
    damageDie: int,               // d4=4, d6=6, etc.
    versatileDie: int,            // 0 if not versatile
    damageType: DamageType,
    properties: Set[WeaponProperty],
    isMelee: bool,                // true for melee weapons (including melee-Thrown like dagger)
    normalRange: int,             // 0 for melee-only
    longRange: int,               // 0 for melee-only
  }

  /// Unarmed strike: 1 + STR mod bludgeoning, always proficient
  pure def unarmedDamage(strMod: int): int = {
    val dmg = 1 + strMod
    if (dmg < 0) 0 else dmg
  }

  /// Choose attack ability mod for a weapon (finesse picks higher)
  pure def weaponAttackAbility(weapon: Weapon, strMod: int, dexMod: int): int = {
    if (weapon.properties.contains(Finesse)) {
      if (dexMod > strMod) dexMod else strMod
    } else if (not(weapon.isMelee)) {
      dexMod
    } else {
      strMod
    }
  }

  /// Heavy weapon penalty: Small/Tiny creatures have disadvantage
  pure def heavyWeaponDisadvantage(weapon: Weapon, wielderSize: Size): bool = {
    weapon.properties.contains(Heavy) and (wielderSize == Tiny or wielderSize == Small)
  }

  /// Carrying capacity: STR x 15 lbs
  /// Size modifiers: each size above Medium doubles; Tiny halves
  pure def carryingCapacity(strScore: int, creatureSize: Size): int = {
    val base = strScore * 15
    match creatureSize {
      | Tiny => base / 2
      | Small => base
      | Medium => base
      | Large => base * 2
      | Huge => base * 4
      | Gargantuan => base * 8
    }
  }

  /// Push/drag/lift = STR x 30 (same size modifiers)
  pure def pushDragLift(strScore: int, creatureSize: Size): int = {
    carryingCapacity(strScore, creatureSize) * 2
  }

  // ============================================================
  // 7. DONNING / DOFFING
  // ============================================================

  /// Donning time in minutes
  pure def donTime(category: ArmorCategory): int = match category {
    | LightArmor => 1
    | MediumArmor => 5
    | HeavyArmor => 10
  }

  /// Doffing time in minutes (can be halved with help)
  pure def doffTime(category: ArmorCategory, hasHelp: bool): int = {
    val base = match category {
      | LightArmor => 1
      | MediumArmor => 1
      | HeavyArmor => 5
    }
    if (hasHelp) base / 2 else base
  }
  // Shield: 1 action don, 1 action doff (handled in turn/action economy)

  // ============================================================
  // 8. CREATURE STATE TYPES (Phase 2)
  // ============================================================

  type Condition =
    | CBlinded | CCharmed | CDeafened | CFrightened | CGrappled
    | CIncapacitated | CInvisible | CParalyzed | CPetrified
    | CPoisoned | CProne | CRestrained | CStunned | CUnconscious

  type IncapSource = ISParalyzed | ISPetrified | ISStunned | ISUnconscious | ISDirect

  type DeathSaves = { successes: int, failures: int }

  pure val DEATH_SAVES_RESET: DeathSaves = { successes: 0, failures: 0 }

  type CreatureState = {
    hp: int,
    maxHp: int,
    tempHp: int,
    deathSaves: DeathSaves,
    stable: bool,
    dead: bool,
    blinded: bool,
    charmed: bool,
    deafened: bool,
    exhaustion: int,
    frightened: bool,
    grappled: bool,
    invisible: bool,
    paralyzed: bool,
    petrified: bool,
    poisoned: bool,
    prone: bool,
    restrained: bool,
    stunned: bool,
    unconscious: bool,
    incapacitatedSources: Set[IncapSource],
  }

  pure val ALL_DAMAGE_TYPES: Set[DamageType] =
    Set(Acid, Bludgeoning, Cold, Fire, Force, Lightning, Necrotic,
        Piercing, Poison, Psychic, Radiant, Slashing, Thunder)

  pure def freshCreature(maxHp: int): CreatureState = {
    hp: maxHp, maxHp: maxHp, tempHp: 0,
    deathSaves: DEATH_SAVES_RESET,
    stable: false, dead: false,
    blinded: false, charmed: false, deafened: false,
    exhaustion: 0, frightened: false, grappled: false,
    invisible: false, paralyzed: false, petrified: false,
    poisoned: false, prone: false, restrained: false,
    stunned: false, unconscious: false,
    incapacitatedSources: Set(),
  }

  pure def isIncapacitated(s: CreatureState): bool =
    s.incapacitatedSources.size() > 0

  pure def isConscious(s: CreatureState): bool = s.hp > 0 and not(s.dead)

  /// Exhaustion 4+ halves max HP
  pure def effectiveMaxHp(s: CreatureState): int =
    if (s.exhaustion >= 4) s.maxHp / 2 else s.maxHp

  // ============================================================
  // 9. CONDITIONS (character/conditions)
  // ============================================================

  /// Apply a condition, including implication side effects.
  /// Paralyzed/Petrified/Stunned -> incapacitated.
  /// Unconscious -> incapacitated + prone.
  /// Petrified blocks poisoned condition.
  pure def pApplyCondition(s: CreatureState, c: Condition): CreatureState = match c {
    | CBlinded => s.with("blinded", true)
    | CCharmed => s.with("charmed", true)
    | CDeafened => s.with("deafened", true)
    | CFrightened => s.with("frightened", true)
    | CGrappled => s.with("grappled", true)
    | CIncapacitated =>
        s.with("incapacitatedSources", s.incapacitatedSources.union(Set(ISDirect)))
    | CInvisible => s.with("invisible", true)
    | CParalyzed =>
        s.with("paralyzed", true)
         .with("incapacitatedSources", s.incapacitatedSources.union(Set(ISParalyzed)))
    | CPetrified =>
        s.with("petrified", true)
         .with("incapacitatedSources", s.incapacitatedSources.union(Set(ISPetrified)))
    | CPoisoned => if (s.petrified) s else s.with("poisoned", true)
    | CProne => s.with("prone", true)
    | CRestrained => s.with("restrained", true)
    | CStunned =>
        s.with("stunned", true)
         .with("incapacitatedSources", s.incapacitatedSources.union(Set(ISStunned)))
    | CUnconscious =>
        s.with("unconscious", true)
         .with("prone", true)
         .with("incapacitatedSources", s.incapacitatedSources.union(Set(ISUnconscious)))
  }

  /// Remove a condition, re-deriving implications.
  /// Prone is NOT removed when unconscious is removed — creature must stand up.
  pure def pRemoveCondition(s: CreatureState, c: Condition): CreatureState = match c {
    | CBlinded => s.with("blinded", false)
    | CCharmed => s.with("charmed", false)
    | CDeafened => s.with("deafened", false)
    | CFrightened => s.with("frightened", false)
    | CGrappled => s.with("grappled", false)
    | CIncapacitated =>
        s.with("incapacitatedSources", s.incapacitatedSources.exclude(Set(ISDirect)))
    | CInvisible => s.with("invisible", false)
    | CParalyzed =>
        s.with("paralyzed", false)
         .with("incapacitatedSources", s.incapacitatedSources.exclude(Set(ISParalyzed)))
    | CPetrified =>
        s.with("petrified", false)
         .with("incapacitatedSources", s.incapacitatedSources.exclude(Set(ISPetrified)))
    | CPoisoned => s.with("poisoned", false)
    | CProne => s.with("prone", false)
    | CRestrained => s.with("restrained", false)
    | CStunned =>
        s.with("stunned", false)
         .with("incapacitatedSources", s.incapacitatedSources.exclude(Set(ISStunned)))
    | CUnconscious =>
        s.with("unconscious", false)
         .with("incapacitatedSources", s.incapacitatedSources.exclude(Set(ISUnconscious)))
  }

  /// Increment exhaustion. Level 6 = death. Level 4+ halves max HP and clamps current HP.
  pure def pAddExhaustion(s: CreatureState, levels: int): CreatureState = {
    val newLevel = if (s.exhaustion + levels > 6) 6 else s.exhaustion + levels
    val s1 = s.with("exhaustion", newLevel)
    if (newLevel >= 6) s1.with("dead", true).with("hp", 0)
    else {
      val effMax = effectiveMaxHp(s1)
      if (s1.hp > effMax) s1.with("hp", effMax) else s1
    }
  }

  /// Reduce exhaustion (min 0). HP does not auto-increase.
  pure def pReduceExhaustion(s: CreatureState, levels: int): CreatureState = {
    val newLevel = if (s.exhaustion - levels < 0) 0 else s.exhaustion - levels
    s.with("exhaustion", newLevel)
  }

  // -- Modifier aggregation --

  /// Modifiers on this creature's own attack rolls from its conditions
  pure def pOwnAttackModifiers(s: CreatureState, frightSourceInLOS: bool): AdvState = {
    {
      hasAdvantage: s.invisible,
      hasDisadvantage: s.blinded or s.prone or s.restrained
        or s.poisoned or (s.frightened and frightSourceInLOS) or s.exhaustion >= 3,
    }
  }

  type DefenseMods = { attackerAdvantage: bool, attackerDisadvantage: bool, autoCrit: bool }

  /// Modifiers on attacks AGAINST this creature from its conditions
  pure def pDefenseModifiers(s: CreatureState, attackerWithin5ft: bool): DefenseMods = {
    {
      attackerAdvantage: s.blinded or s.paralyzed or s.petrified
        or s.stunned or s.unconscious or s.restrained
        or (s.prone and attackerWithin5ft),
      attackerDisadvantage: s.invisible or (s.prone and not(attackerWithin5ft)),
      autoCrit: (s.paralyzed or s.unconscious) and attackerWithin5ft,
    }
  }

  type D20Mods = { hasAdvantage: bool, hasDisadvantage: bool, autoFail: bool }

  /// Ability check modifiers from conditions
  pure def pCheckModifiers(
    s: CreatureState,
    requiresSight: bool, requiresHearing: bool, frightSourceInLOS: bool
  ): D20Mods = {
    {
      hasAdvantage: false,
      hasDisadvantage: s.exhaustion >= 1 or s.poisoned
        or (s.frightened and frightSourceInLOS),
      autoFail: (s.blinded and requiresSight) or (s.deafened and requiresHearing),
    }
  }

  /// Saving throw modifiers from conditions
  pure def pSaveModifiers(s: CreatureState, ability: Ability): D20Mods = {
    val isStrOrDex = ability == Str or ability == Dex
    {
      hasAdvantage: false,
      hasDisadvantage: s.exhaustion >= 3 or (s.restrained and ability == Dex),
      autoFail: isStrOrDex and (s.paralyzed or s.petrified or s.stunned or s.unconscious),
    }
  }

  pure def pCanAct(s: CreatureState): bool = not(isIncapacitated(s))

  pure def pCanSpeak(s: CreatureState): bool =
    not(s.paralyzed) and not(s.petrified) and not(s.unconscious)

  // ============================================================
  // 10. HIT POINTS (character/hitpoints)
  // ============================================================

  /// Apply damage with resistance/vulnerability/immunity, temp HP absorption,
  /// instant death, and death save failures at 0 HP.
  /// Petrified auto-adds resistance to all damage types.
  pure def pTakeDamage(
    s: CreatureState,
    amount: int,
    damageType: DamageType,
    resistances: Set[DamageType],
    vulnerabilities: Set[DamageType],
    immunities: Set[DamageType],
    isCritical: bool
  ): CreatureState = {
    if (s.dead) s
    else {
      val effMax = effectiveMaxHp(s)
      val effResist = if (s.petrified) ALL_DAMAGE_TYPES else resistances
      val effAmount = applyDamageModifiers(amount, damageType, immunities, effResist, vulnerabilities)
      if (effAmount <= 0) s
      else {
        val tempAbsorb = if (s.tempHp >= effAmount) effAmount else s.tempHp
        val dmgThrough = effAmount - tempAbsorb
        val s1 = s.with("tempHp", s.tempHp - tempAbsorb)
        if (dmgThrough == 0) s1
        else if (s1.hp == 0) {
          // Already at 0 HP: death save failures or instant death
          if (dmgThrough >= effMax) s1.with("dead", true)
          else pAddDeathFailures(s1.with("stable", false), if (isCritical) 2 else 1)
        } else {
          // HP > 0: apply remaining damage
          val newHp = s1.hp - dmgThrough
          if (newHp <= 0) {
            val overflow = -newHp
            val s2 = s1.with("hp", 0)
            if (overflow >= effMax) s2.with("dead", true)
            else pApplyCondition(s2, CUnconscious)
          } else s1.with("hp", newHp)
        }
      }
    }
  }

  /// Heal. Caps at effectiveMaxHp. At 0 HP: regain consciousness, reset death saves.
  pure def pHeal(s: CreatureState, amount: int): CreatureState = {
    if (s.dead or amount <= 0) s
    else {
      val effMax = effectiveMaxHp(s)
      val newHp = if (s.hp + amount > effMax) effMax else s.hp + amount
      val s1 = s.with("hp", newHp)
      if (s.hp == 0 and newHp > 0)
        pRemoveCondition(s1, CUnconscious)
          .with("deathSaves", DEATH_SAVES_RESET)
          .with("stable", false)
      else s1
    }
  }

  /// Player chooses: keepOld=true keeps current temp HP, false replaces with new amount.
  /// Temp HP at 0 HP do NOT restore consciousness.
  pure def pGrantTempHp(s: CreatureState, amount: int, keepOld: bool): CreatureState =
    if (keepOld) s else s.with("tempHp", amount)

  /// Add death save failures. 3+ failures = dead.
  pure def pAddDeathFailures(s: CreatureState, count: int): CreatureState = {
    val newFails = s.deathSaves.failures + count
    val s1 = s.with("deathSaves", { successes: s.deathSaves.successes, failures: newFails })
    if (newFails >= 3) s1.with("dead", true) else s1
  }

  /// Death saving throw. Only rolls when at 0 HP, not stable, not dead.
  /// Nat 20: regain 1 HP + consciousness. Nat 1: two failures.
  /// 3 successes: stable. 3 failures: dead.
  pure def pDeathSave(s: CreatureState, d20Roll: int): CreatureState = {
    if (s.dead or s.hp > 0 or s.stable) s
    else if (d20Roll == 20) {
      pRemoveCondition(
        s.with("hp", 1).with("deathSaves", DEATH_SAVES_RESET),
        CUnconscious
      )
    } else if (d20Roll == 1) {
      pAddDeathFailures(s, 2)
    } else if (d20Roll >= 10) {
      val newSucc = s.deathSaves.successes + 1
      if (newSucc >= 3)
        s.with("stable", true).with("deathSaves", DEATH_SAVES_RESET)
      else
        s.with("deathSaves", { successes: newSucc, failures: s.deathSaves.failures })
    } else {
      pAddDeathFailures(s, 1)
    }
  }

  /// Stabilize at 0 HP (DC 10 Medicine or healer's kit). Resets death saves.
  pure def pStabilize(s: CreatureState): CreatureState =
    if (s.dead or s.hp > 0) s
    else s.with("stable", true).with("deathSaves", DEATH_SAVES_RESET)

  /// Stable creature regains 1 HP after 1d4 hours
  pure def pStableRecovery(s: CreatureState): CreatureState =
    if (not(s.stable) or s.dead) s else pHeal(s, 1)

  /// Melee attacker's choice when reducing to 0: unconscious + stable
  pure def pKnockOut(s: CreatureState): CreatureState =
    pApplyCondition(s.with("hp", 0), CUnconscious)
      .with("stable", true)
      .with("deathSaves", DEATH_SAVES_RESET)

  // ============================================================
  // 11. TURN STRUCTURE & ACTION ECONOMY (combat/turn)
  // ============================================================

  /// Per-turn mutable state, reset each turn.
  type TurnState = {
    movementRemaining: int,
    effectiveSpeed: int,
    actionUsed: bool,
    attackActionUsed: bool,
    bonusActionUsed: bool,
    reactionAvailable: bool,
    freeInteractionUsed: bool,
    extraAttacksRemaining: int,
    disengaged: bool,
    dodging: bool,
    readiedAction: bool,
    bonusActionSpellCast: bool,
    nonCantripActionSpellCast: bool,
    surprised: bool,
  }

  /// Action types for pUseAction
  type ActionType =
    | AAttack | ACastSpell | ADash | ADisengage | ADodge
    | AHelp | AHide | AReady | ASearch | AUseObject

  /// Extra attacks from config features. Default 0.
  /// Fighter 5: 1, Fighter 11: 2, Fighter 20: 3
  pure def extraAttacksFromConfig(config: CharConfig): int = {
    if (config.features.contains("extra_attack_3")) 3
    else if (config.features.contains("extra_attack_2")) 2
    else if (config.features.contains("extra_attack")) 1
    else 0
  }

  /// Start a new turn. Resets action economy. Movement = effective speed.
  /// Surprised creatures can't move or act on first turn.
  /// Reaction resets at start of own turn.
  pure def pStartTurn(
    config: CharConfig,
    creature: CreatureState,
    armorState: ArmorState,
    isSurprised: bool,
    callerSpeedModifier: int,
    isGrappling: bool,
    grappledTargetTwoSizesSmaller: bool
  ): TurnState = {
    // Grappled/restrained: speed 0, no bonuses apply — short-circuit
    val speed = if (creature.grappled or creature.restrained) 0
    else {
      val baseSpeed = config.speeds.get(Walk)
      val armorPenalty = armorSpeedPenalty(armorState, config.abilityScores.get(Str))
      val afterArmor = if (baseSpeed - armorPenalty < 0) 0 else baseSpeed - armorPenalty
      val afterExhaustion =
        if (creature.exhaustion >= 5) 0
        else if (creature.exhaustion >= 2) afterArmor / 2
        else afterArmor
      val afterGrappling =
        if (isGrappling and not(grappledTargetTwoSizesSmaller)) afterExhaustion / 2
        else afterExhaustion
      val withMod = afterGrappling + callerSpeedModifier
      if (withMod < 0) 0 else withMod
    }
    {
      movementRemaining: if (isSurprised) 0 else speed,
      effectiveSpeed: speed,
      actionUsed: isSurprised,
      attackActionUsed: false,
      bonusActionUsed: isSurprised,
      reactionAvailable: not(isSurprised),
      freeInteractionUsed: false,
      extraAttacksRemaining: extraAttacksFromConfig(config),
      disengaged: false,
      dodging: false,
      readiedAction: false,
      bonusActionSpellCast: false,
      nonCantripActionSpellCast: false,
      surprised: isSurprised,
    }
  }

  /// Use the action for this turn. Returns updated TurnState.
  /// Precondition: action not yet used, creature can act.
  /// Side effects depend on action type.
  pure def pUseAction(t: TurnState, creature: CreatureState, actionType: ActionType): TurnState = {
    if (t.actionUsed or isIncapacitated(creature)) t
    else {
      val t1 = t.with("actionUsed", true)
      val t2 = match actionType {
        | AAttack => t1.with("attackActionUsed", true)
        | ADisengage => t1.with("disengaged", true)
        | ADodge => t1.with("dodging", true)
        | ADash => t1.with("movementRemaining", t1.movementRemaining + t1.effectiveSpeed)
        | AReady => t1.with("readiedAction", true)
        | _ => t1
      }
      t2
    }
  }

  /// Use bonus action. Can't use if can't take actions (incapacitated).
  pure def pUseBonusAction(t: TurnState, creature: CreatureState): TurnState = {
    if (t.bonusActionUsed or isIncapacitated(creature)) t
    else t.with("bonusActionUsed", true)
  }

  /// Use reaction. Can happen on any creature's turn.
  pure def pUseReaction(t: TurnState): TurnState = {
    if (not(t.reactionAvailable)) t
    else t.with("reactionAvailable", false)
  }

  /// Spend movement. feet = distance to move, movementCost = multiplier (1 = normal, 2 = difficult terrain, etc.)
  /// Returns updated TurnState; no change if insufficient movement.
  pure def pUseMovement(t: TurnState, feet: int, movementCost: int): TurnState = {
    val cost = feet * movementCost
    if (cost > t.movementRemaining or cost < 0) t
    else t.with("movementRemaining", t.movementRemaining - cost)
  }

  /// Use free object interaction. First is free, second requires an action.
  pure def pUseObjectInteraction(t: TurnState): TurnState = {
    if (not(t.freeInteractionUsed)) t.with("freeInteractionUsed", true)
    else t // second interaction needs Use an Object action (caller handles)
  }

  /// Use one extra attack within the Attack action.
  pure def pUseExtraAttack(t: TurnState): TurnState = {
    if (t.extraAttacksRemaining <= 0) t
    else t.with("extraAttacksRemaining", t.extraAttacksRemaining - 1)
  }

  /// Mark that a bonus action spell was cast this turn.
  /// Restricts action to cantrips only.
  pure def pMarkBonusActionSpell(t: TurnState): TurnState =
    t.with("bonusActionSpellCast", true)

  /// Mark that a non-cantrip spell was cast as action this turn.
  /// Blocks bonus action spells.
  pure def pMarkNonCantripActionSpell(t: TurnState): TurnState =
    t.with("nonCantripActionSpellCast", true)

  /// Can cast a bonus action spell this turn?
  /// Blocked if a non-cantrip spell was already cast as action.
  pure def canCastBonusActionSpell(t: TurnState): bool =
    not(t.nonCantripActionSpellCast)

  /// Can cast a non-cantrip spell as action this turn?
  /// Blocked if a bonus action spell was cast this turn.
  pure def canCastNonCantripAction(t: TurnState): bool =
    not(t.bonusActionSpellCast)

  /// After surprise turn ends, creature can use reactions again.
  /// Modeled as: at end of surprised creature's first turn, reaction becomes available.
  pure def pEndSurpriseTurn(t: TurnState): TurnState =
    if (t.surprised) t.with("reactionAvailable", true).with("surprised", false)
    else t

  // ============================================================
  // 12. ATTACK MODIFIER AGGREGATION (combat/attack)
  // ============================================================

  /// Full attack context for resolving an attack.
  /// Combines creature conditions, turn state, position, and environment.
  type AttackContext = {
    // Attacker conditions (from pOwnAttackModifiers)
    attackerBlinded: bool,
    attackerProne: bool,
    attackerRestrained: bool,
    attackerPoisoned: bool,
    attackerFrightened: bool,
    attackerFrightSourceInLOS: bool,
    attackerExhaustion: int,
    // Target conditions (from pDefenseModifiers)
    targetBlinded: bool,
    targetParalyzed: bool,
    targetPetrified: bool,
    targetStunned: bool,
    targetUnconscious: bool,
    targetRestrained: bool,
    targetProne: bool,
    // Position
    attackerWithin5ft: bool,
    // Turn state
    targetDodging: bool,
    targetCanSeeAttacker: bool,
    // Unseen attacker/target
    attackerCanSeeTarget: bool,
    // Ranged
    isRangedAttack: bool,
    beyondNormalRange: bool,
    hostileWithin5ft: bool,
    // Weapon
    isHeavyWeapon: bool,
    wielderSizeSmallOrTiny: bool,
    // Environment
    squeezing: bool,
    underwater: bool,
    attackerHasSwimSpeed: bool,
    isUnderwaterMeleeException: bool,
    isUnderwaterRangedException: bool,
  }

  type FullAttackMods = {
    hasAdvantage: bool,
    hasDisadvantage: bool,
    autoCrit: bool,
    autoMiss: bool,
  }

  /// Aggregate all advantage/disadvantage sources for a single attack.
  pure def pAggregateAttackMods(ctx: AttackContext): FullAttackMods = {
    // --- Advantage sources ---
    val adv_targetBlinded = ctx.targetBlinded
    val adv_targetIncap = ctx.targetParalyzed or ctx.targetPetrified
                          or ctx.targetStunned or ctx.targetUnconscious
    val adv_targetProne5ft = ctx.targetProne and ctx.attackerWithin5ft
    val adv_targetRestrained = ctx.targetRestrained
    // PHB p.195: "When a creature can't see you, you have advantage on attack rolls against it."
    // Subsumes invisible, hidden, darkness, etc.
    val adv_unseenAttacker = not(ctx.targetCanSeeAttacker)

    val anyAdvantage = adv_targetBlinded or adv_targetIncap
      or adv_targetProne5ft or adv_targetRestrained or adv_unseenAttacker

    // --- Disadvantage sources ---
    val disadv_attackerBlinded = ctx.attackerBlinded
    val disadv_attackerProne = ctx.attackerProne
    val disadv_attackerRestrained = ctx.attackerRestrained
    val disadv_attackerPoisoned = ctx.attackerPoisoned
    val disadv_attackerFrightened = ctx.attackerFrightened and ctx.attackerFrightSourceInLOS
    val disadv_exhaustion3 = ctx.attackerExhaustion >= 3
    val disadv_targetProneBeyond5ft = ctx.targetProne and not(ctx.attackerWithin5ft)
    val disadv_rangedBeyondNormal = ctx.isRangedAttack and ctx.beyondNormalRange
    val disadv_rangedCloseQuarters = ctx.isRangedAttack and ctx.hostileWithin5ft
    val disadv_cantSeeTarget = not(ctx.attackerCanSeeTarget)
    val disadv_heavySmall = ctx.isHeavyWeapon and ctx.wielderSizeSmallOrTiny
    val disadv_squeezing = ctx.squeezing
    val disadv_underwaterMelee = ctx.underwater and not(ctx.isRangedAttack)
      and not(ctx.attackerHasSwimSpeed) and not(ctx.isUnderwaterMeleeException)
    val disadv_underwaterRanged = ctx.underwater and ctx.isRangedAttack
      and not(ctx.beyondNormalRange) and not(ctx.isUnderwaterRangedException)
    val disadv_dodging = ctx.targetDodging and ctx.targetCanSeeAttacker

    val anyDisadvantage = disadv_attackerBlinded
      or disadv_attackerProne or disadv_attackerRestrained or disadv_attackerPoisoned
      or disadv_attackerFrightened or disadv_exhaustion3 or disadv_targetProneBeyond5ft
      or disadv_rangedBeyondNormal or disadv_rangedCloseQuarters or disadv_cantSeeTarget
      or disadv_heavySmall or disadv_squeezing or disadv_underwaterMelee
      or disadv_underwaterRanged or disadv_dodging

    // --- Auto-crit ---
    val autoCrit = (ctx.targetParalyzed or ctx.targetUnconscious) and ctx.attackerWithin5ft

    // --- Auto-miss: underwater ranged beyond normal range ---
    val autoMiss = ctx.underwater and ctx.isRangedAttack and ctx.beyondNormalRange

    // --- Resolve: any adv + any disadv cancel ---
    val resolved = resolveAdvantage({ hasAdvantage: anyAdvantage, hasDisadvantage: anyDisadvantage })

    {
      hasAdvantage: resolved.hasAdvantage,
      hasDisadvantage: resolved.hasDisadvantage,
      autoCrit: autoCrit,
      autoMiss: autoMiss,
    }
  }

  /// Opportunity attack eligibility (from target's perspective)
  pure def pCanBeOpportunityAttacked(t: TurnState): bool = not(t.disengaged)

  /// Two-weapon fighting: can use bonus action for off-hand attack?
  /// Requires: Attack action taken, bonus action not used, creature can act.
  pure def pCanTwoWeaponFighting(t: TurnState, creature: CreatureState): bool =
    t.attackActionUsed and not(t.bonusActionUsed) and not(isIncapacitated(creature))

  // ============================================================
  // 13. COMBAT ACTIONS & INTERACTIONS (Phase 4)
  // ============================================================

  // -- 13.1 Loading property --

  /// Loading: limits weapon to one attack per action/bonus/reaction,
  /// regardless of Extra Attack. Returns whether extra attack is allowed.
  pure def pCanExtraAttackWithWeapon(weapon: Weapon): bool =
    not(weapon.properties.contains(Loading))

  // -- 13.2 Two-Weapon Fighting --

  /// Full TWF precondition: both weapons must be Light melee.
  /// Caller ensures weapons are distinct (PHB: "a different light melee weapon").
  pure def pCanTWFWithWeapons(
    mainWeapon: Weapon,
    offHandWeapon: Weapon,
    t: TurnState,
    creature: CreatureState
  ): bool = {
    if (not(pCanTwoWeaponFighting(t, creature))) false
    else {
      val mainLight = mainWeapon.properties.contains(Light_)
      val offLight = offHandWeapon.properties.contains(Light_)
      mainLight and offLight and mainWeapon.isMelee and offHandWeapon.isMelee
    }
  }

  /// TWF off-hand damage: don't add ability modifier unless negative.
  pure def pTWFOffHandDamage(diceResult: int, abilityMod: int): int = {
    val mod = if (abilityMod < 0) abilityMod else 0
    val dmg = diceResult + mod
    if (dmg < 0) 0 else dmg
  }

  // -- 13.3 Grapple & Shove --

  pure def sizeOrd(s: Size): int = match s {
    | Tiny => 0
    | Small => 1
    | Medium => 2
    | Large => 3
    | Huge => 4
    | Gargantuan => 5
  }

  /// Target at most one size larger
  pure def pWithinOneSize(attackerSize: Size, targetSize: Size): bool =
    sizeOrd(targetSize) <= sizeOrd(attackerSize) + 1

  /// Is sizeB at least two sizes smaller than sizeA?
  /// Used for grapple speed penalty exemption and hostile space movement.
  pure def pTwoSizesSmaller(sizeA: Size, sizeB: Size): bool =
    sizeOrd(sizeB) <= sizeOrd(sizeA) - 2

  /// Shared result type for grapple and shove (both are contested special attacks)
  type ContestActionResult = { success: bool, targetState: CreatureState }

  /// Attempt grapple. Replaces one attack within Attack action.
  /// Auto-success if target is incapacitated. Tie = no change (status quo).
  pure def pGrapple(
    attackerSize: Size,
    targetSize: Size,
    targetState: CreatureState,
    contestResult: ContestResult,
    attackerHasFreeHand: bool
  ): ContestActionResult = {
    if (not(pWithinOneSize(attackerSize, targetSize)) or not(attackerHasFreeHand))
      { success: false, targetState: targetState }
    else if (isIncapacitated(targetState) or contestResult == AWins)
      { success: true, targetState: pApplyCondition(targetState, CGrappled) }
    else
      { success: false, targetState: targetState }
  }

  /// Release grapple (no action required)
  pure def pReleaseGrapple(targetState: CreatureState): CreatureState =
    pRemoveCondition(targetState, CGrappled)

  /// Escape grapple. Target uses its action.
  /// BWins = escape; AWins/Tie = no change (status quo).
  pure def pEscapeGrapple(
    targetState: CreatureState,
    contestResult: ContestResult
  ): CreatureState = {
    if (contestResult == BWins) pReleaseGrapple(targetState)
    else targetState
  }

  type ShoveChoice = ShoveProne | ShovePush

  /// Attempt shove. Replaces one attack within Attack action.
  /// Same size rule as grapple. No free hand required (PHB: shove has no hand requirement).
  pure def pShove(
    attackerSize: Size,
    targetSize: Size,
    targetState: CreatureState,
    contestResult: ContestResult,
    choice: ShoveChoice
  ): ContestActionResult = {
    if (not(pWithinOneSize(attackerSize, targetSize)))
      { success: false, targetState: targetState }
    else if (isIncapacitated(targetState) or contestResult == AWins)
      match choice {
        | ShoveProne => { success: true, targetState: pApplyCondition(targetState, CProne) }
        | ShovePush => { success: true, targetState: targetState }
      }
    else
      { success: false, targetState: targetState }
  }

  // -- 13.4 Opportunity Attacks --
  // pCanBeOpportunityAttacked already defined in section 12.
  // OA trigger rules are externalized (caller decides).
  // OA costs reaction (caller calls pUseReaction).
  // OA is one melee attack (caller resolves via existing attack functions).

  // -- 13.5 Mounted Combat --

  type MountType = ControlledMount | IndependentMount

  /// Spend half effective speed. Fails if speed is 0 or insufficient movement.
  /// Used by mount/dismount and standing from prone.
  pure def pSpendHalfSpeed(t: TurnState): TurnState = {
    val cost = t.effectiveSpeed / 2
    if (t.effectiveSpeed == 0 or cost > t.movementRemaining) t
    else t.with("movementRemaining", t.movementRemaining - cost)
  }

  /// Costs half speed. PHB: "once during your move" — caller enforces the once constraint.
  /// Can't mount if speed is 0 (PHB: "you can't mount it if your speed is 0").
  pure def pMountOrDismount(t: TurnState): TurnState = pSpendHalfSpeed(t)

  pure def pIsValidControlledMountAction(actionType: ActionType): bool = match actionType {
    | ADash => true
    | ADisengage => true
    | ADodge => true
    | _ => false
  }

  /// DC 10 DEX save. Triggers: (1) mount moved against will, (2) rider knocked prone.
  pure def pForcedDismountSave(
    d20Roll: int,
    dexMod: int,
    isProficient: bool,
    profBonus: int
  ): bool = {
    saveSucceeds(d20Roll, dexMod, isProficient, profBonus, 0, 10)
  }

  /// Mount knocked prone (trigger 3): rider can use reaction to land on feet.
  type MountKnockedProneResult = { creatureState: CreatureState, turnState: TurnState }

  pure def pMountKnockedProne(
    creature: CreatureState,
    t: TurnState,
    usesReaction: bool
  ): MountKnockedProneResult = {
    if (usesReaction and t.reactionAvailable)
      { creatureState: creature, turnState: pUseReaction(t) }
    else
      { creatureState: pApplyCondition(creature, CProne), turnState: t }
  }

  // ============================================================
  // 14. MOVEMENT SYSTEM (Phase 5)
  // ============================================================

  // -- 14.1 Movement Cost Multiplier --

  /// Compute movement cost multiplier per foot of movement.
  /// Extra foot penalties stack additively: base 1 + extras.
  /// PHB Ch8: climbing/swimming/crawling costs 1 extra foot (2 extra in difficult terrain).
  /// PHB Ch9: difficult terrain costs 1 extra foot. Squeezing costs 1 extra foot.
  /// Caller uses result with pUseMovement(t, feet, multiplier).
  pure def pMovementCost(
    isDifficultTerrain: bool,
    isCrawling: bool,
    isClimbingOrSwimming: bool,
    hasRelevantSpeed: bool,
    isSqueezing: bool
  ): int = {
    val terrainExtra = if (isDifficultTerrain) 1 else 0
    val crawlExtra = if (isCrawling) 1 else 0
    val climbSwimExtra = if (isClimbingOrSwimming and not(hasRelevantSpeed)) 1 else 0
    val squeezeExtra = if (isSqueezing) 1 else 0
    1 + terrainExtra + crawlExtra + climbSwimExtra + squeezeExtra
  }

  // -- 14.2 Prone Movement --

  /// Stand from prone. Costs half effective speed.
  /// PHB: "You can't stand up if you don't have enough movement left or if your speed is 0."
  /// Returns TurnState unchanged if can't stand. Caller removes CProne on success.
  pure def pStandFromProne(t: TurnState): TurnState = pSpendHalfSpeed(t)

  /// Drop prone. Free (0 movement cost).
  /// PHB: "You can drop prone without using any of your speed."
  pure def pDropProne(s: CreatureState): CreatureState = pApplyCondition(s, CProne)

  // -- 14.3 Flying Movement --

  /// PHB: flying creature falls if knocked prone, speed reduced to 0,
  /// or otherwise deprived of ability to move — unless it has hover
  /// or is held aloft by magic (e.g. fly spell).
  /// Returns true if the creature falls.
  pure def pFlyingCreatureFalls(
    creature: CreatureState,
    effectiveSpeed: int,
    hasHover: bool,
    heldAloftByMagic: bool
  ): bool =
    if (hasHover or heldAloftByMagic) false
    else creature.prone or effectiveSpeed == 0

  // -- 14.4 Speed Type Switching --

  /// Switch speed type mid-move.
  /// PHB: "subtract the distance you've already moved from the new speed."
  /// Caller provides effective speed for new type (after all modifiers)
  /// and total distance already moved this turn (actual feet, not budget spent).
  /// Returns TurnState unchanged if new remaining would be 0 or less.
  pure def pSwitchSpeedType(
    t: TurnState,
    newTypeEffectiveSpeed: int,
    distanceAlreadyMoved: int
  ): TurnState = {
    val newRemaining = newTypeEffectiveSpeed - distanceAlreadyMoved
    if (newRemaining <= 0) t
    else t.with("movementRemaining", newRemaining).with("effectiveSpeed", newTypeEffectiveSpeed)
  }

  // -- 14.5 Jumping --

  /// Long jump distance in feet.
  /// PHB: cover feet = STR score with running start (≥10 ft), half standing.
  /// Jump distance costs movement normally.
  pure def pLongJumpDistance(strScore: int, hasRunningStart: bool): int =
    if (hasRunningStart) strScore else strScore / 2

  /// High jump height in feet.
  /// PHB: height = 3 + STR mod (min 0 ft) with running start (≥10 ft), half standing.
  pure def pHighJumpHeight(strScore: int, hasRunningStart: bool): int = {
    val base = 3 + abilityModifier(strScore)
    val height = if (base < 0) 0 else base
    if (hasRunningStart) height else height / 2
  }

  /// Landing in difficult terrain after a jump.
  /// PHB: DC 10 Acrobatics or land prone. Caller resolves check, passes result.
  pure def pJumpLandInDifficultTerrain(
    creature: CreatureState,
    checkPassed: bool
  ): CreatureState =
    if (checkPassed) creature else pApplyCondition(creature, CProne)

  // -- 14.6 Movement Constraints --

  /// Can move through a hostile creature's space?
  /// PHB: "only if the creature is at least two sizes larger or smaller than you."
  pure def pCanMoveThroughHostile(moverSize: Size, hostileSize: Size): bool =
    pTwoSizesSmaller(moverSize, hostileSize) or pTwoSizesSmaller(hostileSize, moverSize)

}
