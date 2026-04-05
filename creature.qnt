// -*- mode: Bluespec; -*-

/// D&D 5e PHB - Phase 1: Core Types, Config & Resolution
/// Formal specification of foundational mechanics.
/// All dice rolls pre-resolved: callers pass results as arguments.

module creature {

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

  // SRD 5.2.1 spell schools (Rules Glossary / spell lists)
  type SpellSchool =
    | Abjuration | Conjuration | Divination | Enchantment
    | Evocation | Illusion | Necromancy | Transmutation

  type CastingTime =
    | CTAction | CTBonusAction | CTReaction | CTMinutes(int) | CTHours(int)

  type SpellComponent = Verbal | Somatic | Material

  type SpellEffectType =
    | SETDamage | SETHealing | SETCondition | SETBuff
    | SETUtility | SETSummon | SETControl

  type SpellData = {
    name: str,
    level: int,               // 0 = cantrip
    school: SpellSchool,
    castingTime: CastingTime,
    concentration: bool,
    components: Set[SpellComponent],
    effectType: SpellEffectType,
  }

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
  // 1b. MONSTER TYPES (Stat Block — SRD 5.2.1)
  // ============================================================

  /// PC vs Monster discriminator — gates death saves vs instant death at 0 HP.
  type CreatureKind = PC | Monster

  /// SRD 5.2.1 creature types (14 families).
  type CreatureType =
    | Aberration | Beast | Celestial | Construct | Dragon
    | Elemental | Fey | Fiend | Giant | Humanoid
    | Monstrosity | Ooze | Plant | Undead

  type SenseType = Blindsight | Darkvision | Tremorsense | Truesight

  type MonsterAttack = {
    name: str,
    attackBonus: int,
    reach: int,              // 0 for ranged-only
    rangeNormal: int,        // 0 for melee-only
    rangeLong: int,
    damageAmount: int,       // average damage
    damageType: DamageType,
    isRanged: bool,
  }

  /// What a Multiattack consists of — ordered list of action slots.
  type MultiattackSlot = MAttack(str) | MSpecialAbility(str)

  type ChallengeRating =
    | CR0 | CR_Eighth | CR_Quarter | CR_Half | CRN(int)

  // -- Legendary / Recharge / X-Day types (Phase L) --

  /// Legendary action definition: name + cost in legendary action uses
  type LegendaryActionDef = { name: str, cost: int }

  /// Recharge ability: minimum d6 roll to recharge (e.g., 5 for "Recharge 5-6")
  type RechargeAbilityDef = { name: str, rechargeMin: int }

  /// Pre-resolved recharge roll passed to START_TURN
  type RechargeRollEvent = { abilityName: str, d6Roll: int }

  /// Mutable monster resources — separate state var (like FighterState for PCs)
  type MonsterResourceState = {
    legendaryActionsRemaining: int,
    legendaryResistancesRemaining: int,
    rechargeAvailable: str -> bool,
    dailyUsesRemaining: str -> int,
  }

  /// CR to proficiency bonus (SRD 5.2.1 Monsters Overview)
  pure def crToProficiencyBonus(cr: ChallengeRating): int = match cr {
    | CR0 => 2
    | CR_Eighth => 2
    | CR_Quarter => 2
    | CR_Half => 2
    | CRN(n) => if (n <= 4) 2
      else if (n <= 8) 3
      else if (n <= 12) 4
      else if (n <= 16) 5
      else if (n <= 20) 6
      else if (n <= 24) 7
      else if (n <= 28) 8
      else 9
  }

  /// SRD Stat Block: "contains the game statistics of a monster." Authored
  /// directly — the SRD gives final numbers. Distinct from Character Sheet
  /// (PC-only, derived from class/level/species). Both produce creature-level
  /// combat stats; the shared interface is pure function parameters, not a
  /// shared type — the SRD has no such concept. See UBIQUITOUS_LANGUAGE.md.
  type StatBlock = {
    name: str,
    creatureType: CreatureType,
    creatureSize: Size,               // `size` is reserved in Quint
    ac: int,
    initiativeMod: int,
    maxHp: int,
    hitDice: int,
    hitDieType: int,
    speeds: SpeedType -> int,
    abilityScores: Ability -> int,
    saveProficiencies: Set[Ability],
    skillBonuses: Skill -> int,
    cr: ChallengeRating,
    proficiencyBonus: int,
    resistances: Set[DamageType],
    vulnerabilities: Set[DamageType],
    damageImmunities: Set[DamageType],
    conditionImmunities: Set[Condition],
    exhaustionImmune: bool,
    senses: SenseType -> int,
    attacks: str -> MonsterAttack,
    multiattack: List[MultiattackSlot],
    // Phase L: Legendary / Recharge / X-Day
    legendaryActionUses: int,                    // 0 = no legendary actions
    legendaryResistanceUses: int,                // 0 = no LR
    legendaryActions: str -> LegendaryActionDef, // name -> definition
    rechargeAbilities: str -> RechargeAbilityDef,// name -> recharge range
    dailyAbilities: str -> int,                  // name -> max uses per day
    inLair: bool,                                // +1 to LA and LR uses
  }

  // -- Proof-of-concept monsters --

  /// Skeleton (SRD 5.2.1, Monsters P-S)
  pure val SKELETON: StatBlock = {
    name: "Skeleton",
    creatureType: Undead,
    creatureSize: Medium,
    ac: 14,
    initiativeMod: 3,
    maxHp: 13,
    hitDice: 2,
    hitDieType: 8,
    speeds: Map(Walk -> 30, Fly -> 0, Swim -> 0, Climb -> 0, Burrow -> 0),
    abilityScores: Map(Str -> 10, Dex -> 16, Con -> 15, Int_ -> 6, Wis -> 8, Cha -> 5),
    saveProficiencies: Set(),
    skillBonuses: Map(),
    cr: CR_Quarter,
    proficiencyBonus: 2,
    resistances: Set(),
    vulnerabilities: Set(Bludgeoning),
    damageImmunities: Set(Poison),
    conditionImmunities: Set(CPoisoned),
    exhaustionImmune: true,
    senses: Map(Darkvision -> 60),
    attacks: Map(
      "Shortsword" -> { name: "Shortsword", attackBonus: 5, reach: 5, rangeNormal: 0, rangeLong: 0, damageAmount: 6, damageType: Piercing, isRanged: false },
      "Shortbow" -> { name: "Shortbow", attackBonus: 5, reach: 0, rangeNormal: 80, rangeLong: 320, damageAmount: 6, damageType: Piercing, isRanged: true }
    ),
    multiattack: [],
    legendaryActionUses: 0, legendaryResistanceUses: 0,
    legendaryActions: Map(), rechargeAbilities: Map(), dailyAbilities: Map(),
    inLair: false,
  }

  /// Ogre (SRD 5.2.1, Monsters M-O)
  pure val OGRE: StatBlock = {
    name: "Ogre",
    creatureType: Giant,
    creatureSize: Large,
    ac: 11,
    initiativeMod: -1,
    maxHp: 68,
    hitDice: 8,
    hitDieType: 10,
    speeds: Map(Walk -> 40, Fly -> 0, Swim -> 0, Climb -> 0, Burrow -> 0),
    abilityScores: Map(Str -> 19, Dex -> 8, Con -> 16, Int_ -> 5, Wis -> 7, Cha -> 7),
    saveProficiencies: Set(),
    skillBonuses: Map(),
    cr: CRN(2),
    proficiencyBonus: 2,
    resistances: Set(),
    vulnerabilities: Set(),
    damageImmunities: Set(),
    conditionImmunities: Set(),
    exhaustionImmune: false,
    senses: Map(Darkvision -> 60),
    attacks: Map(
      "Greatclub" -> { name: "Greatclub", attackBonus: 6, reach: 5, rangeNormal: 0, rangeLong: 0, damageAmount: 13, damageType: Bludgeoning, isRanged: false },
      "Javelin" -> { name: "Javelin", attackBonus: 6, reach: 5, rangeNormal: 30, rangeLong: 120, damageAmount: 11, damageType: Piercing, isRanged: false }
    ),
    multiattack: [],
    legendaryActionUses: 0, legendaryResistanceUses: 0,
    legendaryActions: Map(), rechargeAbilities: Map(), dailyAbilities: Map(),
    inLair: false,
  }

  /// Adult Red Dragon (SRD 5.2.1, Monsters P-S)
  /// CR 17 proof-of-concept: exercises Legendary Actions, Legendary Resistance,
  /// Recharge (Fire Breath 5-6), and 1/Day (Fireball).
  pure val ADULT_RED_DRAGON: StatBlock = {
    name: "Adult Red Dragon",
    creatureType: Dragon,
    creatureSize: Huge,
    ac: 19,
    initiativeMod: 12,
    maxHp: 256,
    hitDice: 19,
    hitDieType: 12,
    speeds: Map(Walk -> 40, Fly -> 80, Swim -> 0, Climb -> 40, Burrow -> 0),
    abilityScores: Map(Str -> 27, Dex -> 10, Con -> 25, Int_ -> 16, Wis -> 13, Cha -> 23),
    saveProficiencies: Set(Dex, Wis),  // SRD: DEX +6 (mod+0, PB+6), WIS +7 (mod+1, PB+6)
    skillBonuses: Map(Perception -> 13, Stealth -> 6),
    cr: CRN(17),
    proficiencyBonus: 6,
    resistances: Set(),
    vulnerabilities: Set(),
    damageImmunities: Set(Fire),
    conditionImmunities: Set(),
    exhaustionImmune: false,
    senses: Map(Blindsight -> 60, Darkvision -> 120),
    attacks: Map(
      "Rend" -> { name: "Rend", attackBonus: 14, reach: 10, rangeNormal: 0, rangeLong: 0, damageAmount: 13, damageType: Slashing, isRanged: false }
    ),
    multiattack: [MAttack("Rend"), MAttack("Rend"), MAttack("Rend")],
    legendaryActionUses: 3,
    legendaryResistanceUses: 3,
    legendaryActions: Map(
      "Commanding Presence" -> { name: "Commanding Presence", cost: 1 },
      "Fiery Rays" -> { name: "Fiery Rays", cost: 1 },
      "Pounce" -> { name: "Pounce", cost: 1 }
    ),
    rechargeAbilities: Map(
      "Fire Breath" -> { name: "Fire Breath", rechargeMin: 5 }
    ),
    dailyAbilities: Map("Fireball" -> 1),
    inLair: false,
  }

  /// Null stat block for PC mode (all fields zero/empty — never read in PC mode)
  pure val NULL_STAT_BLOCK: StatBlock = {
    name: "",
    creatureType: Humanoid,
    creatureSize: Medium,
    ac: 0,
    initiativeMod: 0,
    maxHp: 0,
    hitDice: 0,
    hitDieType: 0,
    speeds: Map(Walk -> 0, Fly -> 0, Swim -> 0, Climb -> 0, Burrow -> 0),
    abilityScores: Map(Str -> 10, Dex -> 10, Con -> 10, Int_ -> 10, Wis -> 10, Cha -> 10),
    saveProficiencies: Set(),
    skillBonuses: Map(),
    cr: CR0,
    proficiencyBonus: 0,
    resistances: Set(),
    vulnerabilities: Set(),
    damageImmunities: Set(),
    conditionImmunities: Set(),
    exhaustionImmune: false,
    senses: Map(),
    attacks: Map(),
    multiattack: [],
    legendaryActionUses: 0, legendaryResistanceUses: 0,
    legendaryActions: Map(), rechargeAbilities: Map(), dailyAbilities: Map(),
    inLair: false,
  }

  // ============================================================
  // 2. CHARACTER CONFIG (character/config)
  // ============================================================

  /// SRD Character Sheet: tracks a PC's information, derived from class, level,
  /// species, and equipment. Counterpart to StatBlock (monster-only). Both
  /// produce creature-level combat stats; see StatBlock comment for design.
  // Adding a field here requires updating all CharConfig literals (BASE_CHAMPION_CONFIG in creature.qnt; TEST_WIZARD, TEST_FIGHTER_5, TEST_BARBARIAN_ORC, TEST_CLERIC_DWARF, TEST_ROGUE_HALFLING, TEST_PALADIN_DRAGONBORN, TEST_RANGER_ELF, TEST_MONK_GNOME, TEST_SORCERER_TIEFLING, TEST_WARLOCK_GOLIATH, TEST_BARD_HUMAN, TEST_DRUID_ELF in dndTest.qnt)
  type CharConfig = {
    className: ClassName,            // primary class
    subclass: SubclassName,          // SRD 5.2.1: one subclass per class
    species: Species,                // SRD 5.2.1 species (replaces 5.1 "race")
    classLevels: ClassName -> int,   // multiclass: maps each class to its level (0 = not taken); source of truth for class-level dispatch
    fightingStyles: Set[FightingStyleFeat], // Fighting Style feats chosen (Fighter/Paladin/Ranger)
    abilityScores: Ability -> int,   // 1-30
    level: int,                      // 1-20
    creatureSize: Size,
    speeds: SpeedType -> int,        // base speeds; 0 = no such speed
    saveProficiencies: Set[Ability],
    skillProficiencies: Set[Skill],
    expertiseSkills: Set[Skill],
    armorProficiencies: Set[ArmorCategory],
    hitDieType: int,                 // 6, 8, 10, or 12
    spellcastingAbility: Ability,    // ignored if not a caster
    hasSpellcasting: bool,

    unarmoredDefense: UnarmoredDefense,
    features: Set[Feature],
    critRange: int,            // minimum d20 roll for critical hit (default 20; Champion 19/18)
    hasFightingStyleFeature: bool,  // Fighter L1, Paladin L2, Ranger L2
  }

  type Feature = FExtraAttack | FExtraAttack2 | FExtraAttack3

  type FighterState = {
    secondWindCharges: int,
    secondWindMax: int,
    actionSurgeCharges: int,
    actionSurgeMax: int,
    actionSurgeUsedThisTurn: bool,
    indomitableCharges: int,
    indomitableMax: int,
    heroicInspiration: bool,
  }

  type BarbarianState = {
    raging: bool,
    rageCharges: int,
    rageMaxCharges: int,
    rageTurnsRemaining: int,        // 100 = 10 min; 0 = not raging
    attackedOrForcedSaveThisTurn: bool,
    rageExtendedWithBA: bool,
    recklessThisTurn: bool,
    frenzyUsedThisTurn: bool,
    intimidatingPresenceUsed: bool,
    relentlessRageTimesUsed: int,
    brutalStrikeUsedThisTurn: bool,
  }

  type MonkState = {
    focusPoints: int,
    focusMax: int,
    uncannyMetabolismUsed: bool,
    stunningStrikeUsedThisTurn: bool,
    wholenessCharges: int,
    wholenessMax: int,
  }

  // Stub types for parallel class integration (prep commit).
  // Each starts with minimal fields; worktree agents will expand.
  type PaladinState = {
    layOnHandsPool: int,
    layOnHandsMax: int,
    channelDivinityCharges: int,
    channelDivinityMax: int,
    smiteFreeUsed: bool,
  }

  type RogueState = {
    sneakAttackUsedThisTurn: bool,
    steadyAimUsedThisTurn: bool,
    cunningStrikeUsesThisTurn: int,
  }

  type ClericState = {
    channelDivinityCharges: int,
    channelDivinityMax: int,
  }

  type DruidState = {
    wildShapeCharges: int,
    wildShapeMax: int,
    inWildShape: bool,
    wildResurgenceSlotUsedThisLR: bool,
  }

  type SorcererState = {
    sorceryPoints: int,
    sorceryPointsMax: int,
    sorcerousRestorationUsed: bool,
    innateSorceryActive: bool,
    innateSorceryCharges: int,
    innateSorceryTurnsRemaining: int,
    metamagicUsedThisCast: Set[str],
    apotheosisUsedThisTurn: bool,
  }

  type WarlockState = {
    mysticArcanumUsed: Set[int],
    magicalCunningUsed: bool,
    eldritchSmiteUsedThisTurn: bool,
  }

  type WizardState = {
    arcaneRecoveryUsed: bool,
    overchannelUsesThisLR: int,
  }

  type RangerState = {
    huntersMarkFreeUses: int,
    tirelessCharges: int,
    tirelessMax: int,
    naturesVeilCharges: int,
    naturesVeilMax: int,
  }

  type BardState = {
    bardicInspirationCharges: int,
    bardicInspirationMax: int,
  }

  type UnarmoredDefense = NoUnarmoredDefense | BarbarianUD | MonkUD

  /// SRD 5.2.1 species (Character Origins chapter).
  /// Subraces are eliminated; lineage options (Elf → Drow/High Elf/Wood Elf) are
  /// handled by separate config fields when needed, not by the Species type itself.
  type Species =
    | Dragonborn | Dwarf | Elf | Gnome | Goliath
    | Halfling | Human | Orc | Tiefling

  /// SRD 5.2.1 subclass names (one per class in the SRD).
  type SubclassName =
    | PathOfTheBerserker | CollegeOfLore | LifeDomain | CircleOfTheLand
    | Champion | WarriorOfTheOpenHand | OathOfDevotion | Hunter
    | Thief | DraconicSorcery | FiendPatron | Evoker

  /// SRD 5.2.1 Fighting Style feats (Feats chapter).
  /// Classes with Fighting Style feature: Fighter (level 1), Paladin (level 2), Ranger (level 2).
  type FightingStyleFeat = FSArchery | FSDefense | FSGreatWeaponFighting | FSTwoWeaponFighting

  // ============================================================
  // 3. PURE FUNCTIONS - Config & Resolution
  // ============================================================

  pure def intMax(a: int, b: int): int = if (a > b) a else b
  pure def intMin(a: int, b: int): int = if (a < b) a else b

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

  /// Evasion (Rogue 7, Monk 7): on DEX save, success = 0 damage, fail = half damage.
  /// SRD 5.2.1: "If [the creature] isn't Incapacitated … takes no damage on a successful save
  /// and only half damage on a failed one."
  pure def pApplyEvasion(damage: int, saveSucceeded: bool, hasEvasion: bool, incapacitated: bool): int = {
    if (not(hasEvasion) or incapacitated) {
      damage
    } else {
      if (saveSucceeded) 0
      else damage / 2
    }
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

  /// Attack resolution: nat1 always misses, d20 >= critRange always hits+crits
  pure def resolveAttackRoll(
    d20Roll: int,
    attackBonus: int,
    targetAC: int,
    targetCoverBonus: int,
    critRange: int
  ): AttackResult = {
    if (d20Roll == 1) { hits: false, isCritical: false }
    else if (d20Roll >= critRange) { hits: true, isCritical: true }
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

  /// SRD 5.2.1 "Order of Application" (Playing-the-Game.md):
  /// 1. Adjustments (bonuses, penalties, multipliers) applied first
  /// 2. Resistance applied second (halve)
  /// 3. Vulnerability applied third (double)
  /// Immunity overrides all. Multiple instances of same type count as one.
  /// flatModifier: flat adjustment subtracted from damage before resistance/vulnerability
  /// (positive = damage reduction, negative = damage increase).
  pure def applyDamageModifiers(
    amount: int,
    damageType: DamageType,
    immunities: Set[DamageType],
    resistances: Set[DamageType],
    vulnerabilities: Set[DamageType],
    flatModifier: int
  ): int = {
    if (immunities.contains(damageType)) 0
    else {
      val afterFlat = intMax(0, amount - flatModifier)
      val afterResist = if (resistances.contains(damageType)) afterFlat / 2 else afterFlat
      if (vulnerabilities.contains(damageType)) afterResist * 2 else afterResist
    }
  }

  /// Augment resistance set for underwater environment.
  /// SRD 5.2.1: "Anything underwater has Resistance to Fire damage."
  pure def underwaterResistances(
    resistances: Set[DamageType],
    isUnderwater: bool
  ): Set[DamageType] = {
    if (isUnderwater) resistances.union(Set(Fire)) else resistances
  }

  /// Critical hit damage: normal dice + bonus dice + modifier (modifier NOT doubled)
  pure def criticalDamage(normalDice: int, bonusDice: int, modifier: int): int = {
    normalDice + bonusDice + modifier
  }

  /// Normal damage: dice + modifier
  pure def normalDamage(diceResult: int, modifier: int): int = {
    diceResult + modifier
  }

  // -- Feat System Framework (SRD 5.2.1) --

  /// Can a character take a Fighting Style feat?
  pure def pCanTakeFightingStyleFeat(config: CharConfig): bool =
    config.hasFightingStyleFeature

  /// Can a character take an Epic Boon feat? Requires level 19+.
  pure def pCanTakeEpicBoon(config: CharConfig): bool =
    config.level >= 19

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
          val cappedDex = intMin(dexMod, 2)
          armor.baseAC + cappedDex
        }
        | HeavyArmor => armor.baseAC
      }
      | Unarmored => match unarmoredDef {
        | NoUnarmoredDefense => 10 + dexMod
        | BarbarianUD => 10 + dexMod + conMod
        // SRD 5.2.1 Monk L1: "While you aren't wearing armor *or wielding a Shield*"
        | MonkUD => if (hasShield) 10 + dexMod else 10 + dexMod + wisMod
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
    intMax(0, dmg)
  }

  /// Choose attack ability mod for a weapon (finesse picks higher)
  pure def weaponAttackAbility(weapon: Weapon, strMod: int, dexMod: int): int = {
    if (weapon.properties.contains(Finesse)) {
      intMax(dexMod, strMod)
    } else if (not(weapon.isMelee)) {
      dexMod
    } else {
      strMod
    }
  }

  /// Heavy weapon penalty (SRD 5.2.1): Disadvantage if melee + STR < 13, or ranged + DEX < 13.
  pure def heavyWeaponDisadvantage(weapon: Weapon, strScore: int, dexScore: int): bool = {
    weapon.properties.contains(Heavy) and (
      (weapon.isMelee and strScore < 13) or (not(weapon.isMelee) and dexScore < 13)
    )
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

  /// Doffing time in minutes
  pure def doffTime(category: ArmorCategory): int =
    match category {
      | LightArmor => 1
      | MediumArmor => 1
      | HeavyArmor => 5
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

  /// When an effect's removal check fires: start of turn or end of turn.
  /// SRD has two distinct expiry points — see PLAN.md timing analysis.
  type ExpiryPhase = AtStartOfTurn | AtEndOfTurn

  /// Timed effect on a creature (spell, ability, etc.) with duration in turns.
  /// Instant spells (Fireball, Healing Word) don't create an ActiveEffect —
  /// they just apply damage/healing/conditions directly.
  /// Core spec owns lifecycle only; spell-specific behavior lives in caller.
  type ActiveEffect = {
    spellId: str, turnsRemaining: int, expiresAt: ExpiryPhase, casterId: str,
    grantedResistances: Set[DamageType], grantedVulnerabilities: Set[DamageType], grantedImmunities: Set[DamageType],
  }

  /// End-of-turn save: caller provides spell, result, and conditions to remove on success.
  type EndOfTurnSave = { spellId: str, saveSucceeded: bool, conditionsToRemove: Set[Condition] }

  /// End-of-turn damage: caller provides spell, amount, type, and pre-resolved concentration save.
  type EndOfTurnDamage = { spellId: str, damage: int, damageType: DamageType, conSaveSucceeded: bool, resistances: Set[DamageType], vulnerabilities: Set[DamageType], immunities: Set[DamageType] }

  /// Start-of-turn effect trigger: caller provides pre-resolved per-effect data.
  type StartOfTurnEffect = {
    spellId: str,
    healAmount: int,         // 0 = none
    tempHpAmount: int,       // 0 = none
    saveResult: bool,        // true = save succeeded, remove effect
    damageAmount: int,       // 0 = none
    damageType: DamageType,
    conSaveSucceeded: bool,  // for concentration check on damage
    resistances: Set[DamageType],
    vulnerabilities: Set[DamageType],
    immunities: Set[DamageType]
  }

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
    hitDiceRemaining: ClassName -> int,  // per-class remaining HD (total per class = class level)
    activeEffects: Set[ActiveEffect],   // timed effects (spells, abilities); lifecycle only
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
    hitDiceRemaining: ZERO_CLASS_LEVELS,
    activeEffects: Set(),
  }

  pure def isIncapacitated(s: CreatureState): bool =
    s.incapacitatedSources.size() > 0

  pure def isConscious(s: CreatureState): bool = s.hp > 0 and not(s.dead)

  /// Effective max HP (extension point for effects that modify HP maximum).
  pure def effectiveMaxHp(s: CreatureState): int = s.maxHp

  // -- 8.1 Active Effect Lifecycle --
  // Core owns add/remove/decrement/expire. Spell-specific behavior is caller's job.

  /// Add an effect, replacing any existing with the same spellId (no stacking).
  pure def pAddEffect(
    effects: Set[ActiveEffect], spellId: str, durationTurns: int, expiresAt: ExpiryPhase, casterId: str,
    grantedR: Set[DamageType], grantedV: Set[DamageType], grantedI: Set[DamageType]
  ): Set[ActiveEffect] =
    effects.filter(e => e.spellId != spellId).union(Set({
      spellId: spellId, turnsRemaining: durationTurns, expiresAt: expiresAt, casterId: casterId,
      grantedResistances: grantedR, grantedVulnerabilities: grantedV, grantedImmunities: grantedI,
    }))

  /// Convenience wrapper: add effect with no granted R/V/I.
  pure def pAddEffectSimple(
    effects: Set[ActiveEffect], spellId: str, durationTurns: int, expiresAt: ExpiryPhase, casterId: str
  ): Set[ActiveEffect] =
    pAddEffect(effects, spellId, durationTurns, expiresAt, casterId, Set(), Set(), Set())

  /// Remove an effect by spellId (dispel, concentration break, etc.).
  pure def pRemoveEffect(effects: Set[ActiveEffect], spellId: str): Set[ActiveEffect] =
    effects.filter(e => e.spellId != spellId)

  /// Decrement all durations by 1. Called during START_TURN (TA4).
  pure def pDecrementDurations(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.map(e => e.with("turnsRemaining", e.turnsRemaining - 1))

  /// Return effects expired at the given phase (turnsRemaining <= 0 AND matching expiresAt).
  pure def pExpiredAtPhase(effects: Set[ActiveEffect], phase: ExpiryPhase): Set[ActiveEffect] =
    effects.filter(e => e.expiresAt == phase and e.turnsRemaining <= 0)

  /// Remove expired effects for the given phase only.
  pure def pClearExpiredAtPhase(effects: Set[ActiveEffect], phase: ExpiryPhase): Set[ActiveEffect] =
    effects.exclude(pExpiredAtPhase(effects, phase))

  /// Check whether an effect with the given spellId is active (not expired).
  pure def pHasEffect(effects: Set[ActiveEffect], spellId: str): bool =
    effects.exists(e => e.spellId == spellId and e.turnsRemaining > 0)

  /// Atomic decrement-by-n + clear all expired. Out-of-combat time advance primitive.
  pure def pTickEffects(effects: Set[ActiveEffect], n: int): Set[ActiveEffect] =
    effects.map(e => e.with("turnsRemaining", e.turnsRemaining - n)).filter(e => e.turnsRemaining > 0)

  // ============================================================
  // 9. CONDITIONS (character/conditions)
  // ============================================================

  /// Apply a condition, including implication side effects.
  /// Paralyzed/Petrified/Stunned -> incapacitated.
  /// Unconscious -> incapacitated + prone.
  /// Petrified blocks poisoned condition.
  pure def pApplyCondition(s: CreatureState, c: Condition, immunities: Set[Condition]): CreatureState =
    if (immunities.contains(c)) s
    else match c {
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
    | CProne => if (s.unconscious) s else s.with("prone", false)
    | CRestrained => s.with("restrained", false)
    | CStunned =>
        s.with("stunned", false)
         .with("incapacitatedSources", s.incapacitatedSources.exclude(Set(ISStunned)))
    | CUnconscious =>
        s.with("unconscious", false)
         .with("incapacitatedSources", s.incapacitatedSources.exclude(Set(ISUnconscious)))
  }

  /// Increment exhaustion. Level 6 = death. If exhaustionImmune, no effect.
  pure def pAddExhaustion(s: CreatureState, levels: int, exhaustionImmune: bool): CreatureState = {
    if (exhaustionImmune) s
    else {
      val newLevel = intMin(s.exhaustion + levels, 6)
      val s1 = s.with("exhaustion", newLevel)
      if (newLevel >= 6) s1.with("dead", true).with("hp", 0)
      else s1
    }
  }

  /// Reduce exhaustion (min 0). HP does not auto-increase.
  pure def pReduceExhaustion(s: CreatureState, levels: int): CreatureState = {
    val newLevel = intMax(s.exhaustion - levels, 0)
    s.with("exhaustion", newLevel)
  }

  // -- Modifier aggregation --

  /// Modifiers on this creature's own attack rolls from its conditions.
  /// Exhaustion flat penalty applied separately via exhaustionPenalty.
  pure def pOwnAttackModifiers(s: CreatureState, frightSourceInLOS: bool): AdvState = {
    {
      hasAdvantage: s.invisible,
      hasDisadvantage: s.blinded or s.prone or s.restrained
        or s.poisoned or (s.frightened and frightSourceInLOS),
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

  /// Ability check modifiers from conditions.
  /// Exhaustion flat penalty applied separately via exhaustionPenalty.
  pure def pCheckModifiers(
    s: CreatureState,
    requiresSight: bool, requiresHearing: bool, frightSourceInLOS: bool
  ): D20Mods = {
    {
      hasAdvantage: false,
      hasDisadvantage: s.poisoned
        or (s.frightened and frightSourceInLOS),
      autoFail: (s.blinded and requiresSight) or (s.deafened and requiresHearing),
    }
  }

  /// Saving throw modifiers from conditions.
  /// Exhaustion flat penalty applied separately via exhaustionPenalty.
  pure def pSaveModifiers(s: CreatureState, ability: Ability): D20Mods = {
    val isStrOrDex = ability == Str or ability == Dex
    {
      hasAdvantage: false,
      hasDisadvantage: s.restrained and ability == Dex,
      autoFail: isStrOrDex and (s.paralyzed or s.petrified or s.stunned or s.unconscious),
    }
  }

  /// Cover bonus for saving throws: applies only to DEX saves (Rules-Glossary "Cover").
  pure def pSaveCoverBonus(ability: Ability, cover: CoverType): int =
    if (ability == Dex) coverBonus(cover) else 0

  /// Exhaustion flat penalty: -2 * exhaustion level, applied to all D20 Tests.
  pure def exhaustionPenalty(s: CreatureState): int = -2 * s.exhaustion

  pure def pCanAct(s: CreatureState): bool = not(isIncapacitated(s))

  pure def pCanSpeak(s: CreatureState): bool =
    not(s.paralyzed) and not(s.petrified) and not(s.unconscious)

  // ============================================================
  // 10. HIT POINTS (character/hitpoints)
  // ============================================================

  /// Apply damage with resistance/vulnerability/immunity, temp HP absorption,
  /// instant death, and death save failures at 0 HP.
  /// Petrified auto-adds resistance to all damage types.
  /// NOTE: Death save track (unconscious at 0 HP, failures on subsequent hits) is PC-only per RAW.
  /// Current spec applies universally — correct while only PCs use the spec (see A12).
  /// Take damage (PC behavior: death saves at 0 HP). Delegates to pTakeDamageAsCreature.
  pure def pTakeDamage(
    s: CreatureState,
    amount: int,
    damageType: DamageType,
    resistances: Set[DamageType],
    vulnerabilities: Set[DamageType],
    immunities: Set[DamageType],
    isCritical: bool
  ): CreatureState =
    pTakeDamageAsCreature(s, amount, damageType, resistances, vulnerabilities, immunities, isCritical, PC)

  /// Post-process: if monster is at 0 HP, set dead=true. Mirrors XState "always" guard.
  /// Correct monster death after pTakeDamage(PC) path sets spurious unconscious.
  /// Monsters die at 0 HP — they never go unconscious from the PC death-save track.
  /// Prone is NOT cleared here — it may be legitimately set (e.g., from a fall).
  pure def pMonsterDeathCheck(s: CreatureState, kind: CreatureKind): CreatureState = {
    if (kind == Monster and s.hp == 0 and not(s.dead))
      s.with("dead", true)
       .with("unconscious", false)
       .with("incapacitatedSources", s.incapacitatedSources.exclude(Set(ISUnconscious)))
    else s
  }

  /// CreatureKind-aware take damage: monsters die at 0 HP, PCs enter death save track.
  /// SRD 5.2.1 Rules Glossary "Monsters and Death": monsters die at 0 HP.
  pure def pTakeDamageAsCreature(
    s: CreatureState,
    amount: int,
    damageType: DamageType,
    resistances: Set[DamageType],
    vulnerabilities: Set[DamageType],
    immunities: Set[DamageType],
    isCritical: bool,
    kind: CreatureKind
  ): CreatureState = {
    if (s.dead) s
    else {
      val effMax = effectiveMaxHp(s)
      val effResist = if (s.petrified) ALL_DAMAGE_TYPES else resistances
      val effAmount = applyDamageModifiers(amount, damageType, immunities, effResist, vulnerabilities, 0)
      if (effAmount <= 0) s
      else {
        val tempAbsorb = intMin(s.tempHp, effAmount)
        val dmgThrough = effAmount - tempAbsorb
        val s1 = s.with("tempHp", s.tempHp - tempAbsorb)
        if (dmgThrough == 0) s1
        else if (s1.hp == 0) {
          // Already at 0 HP
          match kind {
            | Monster => s1.with("dead", true)  // Monsters: already dead, further damage is no-op
            | PC => {
              if (dmgThrough >= effMax) s1.with("dead", true)
              else pAddDeathFailures(s1.with("stable", false), if (isCritical) 2 else 1)
            }
          }
        } else {
          val newHp = s1.hp - dmgThrough
          if (newHp <= 0) {
            val overflow = -newHp
            val s2 = s1.with("hp", 0)
            match kind {
              | Monster => s2.with("dead", true)  // Monsters die at 0 HP
              | PC => {
                if (overflow >= effMax) s2.with("dead", true)
                else pApplyCondition(s2, CUnconscious, Set())
              }
            }
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
      val newHp = intMin(s.hp + amount, effMax)
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
    val newFails = intMin(s.deathSaves.failures + count, 3)
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

  /// Melee attacker's choice: reduce to 1 HP + unconscious.
  /// Creature starts a Short Rest (caller responsibility).
  pure def pKnockOut(s: CreatureState): CreatureState =
    pApplyCondition(s.with("hp", 1), CUnconscious, Set())

  // ============================================================
  // 11. TURN STRUCTURE & ACTION ECONOMY (combat/turn)
  // ============================================================

  /// Per-turn mutable state, reset each turn.
  type TurnState = {
    movementRemaining: int,
    effectiveSpeed: int,
    actionsRemaining: int,  // default 1; counter enables Action Surge / Haste granting additional actions
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
    bonusMovementRemaining: int,
    bonusMovementOAFree: bool,
    // SRD 5.2.1 Action Surge: extra action "except the Magic action."
    // Enforced at two layers:
    //   Quint: battle magic actions guard with not(actionSurgeActionPending).
    //          pUseAction also rejects AMagic when pending (defense-in-depth).
    //   XState: useAction in machine.ts returns {} for magic when pending —
    //           XState can't prevent events from arriving, must reject internally.
    // When adding new magic battle actions: add the Quint guard.
    // XState covers all magic centrally via actionType check.
    actionSurgeActionPending: bool,
    // SRD 5.2.1 "One Spell with a Spell Slot per Turn": on a turn, you can
    // expend only one spell slot to cast a spell. Reset for ALL creatures at
    // start of each turn (not just the active creature). Gates eligibleForCounterspell.
    slotExpendedThisTurn: bool,
  }

  /// Action types for pUseAction
  type ActionType =
    | AAttack | AMagic | ADash | ADisengage | ADodge
    | AHelp | AHide | AInfluence | AReady | ASearch | AStudy | AUtilize

  /// Extra attacks from config features. Default 0.
  /// Fighter 5: 1, Fighter 11: 2, Fighter 20: 3
  pure def extraAttacks(config: CharConfig): int = {
    if (config.features.contains(FExtraAttack3)) 3
    else if (config.features.contains(FExtraAttack2)) 2
    else if (config.features.contains(FExtraAttack)) 1
    else 0
  }

  /// Start a new turn. Resets action economy. Movement = effective speed.
  /// Reaction resets at start of own turn.
  pure def pStartTurn(
    config: CharConfig,
    creature: CreatureState,
    armorState: ArmorState,
    callerSpeedModifier: int,
    isGrappling: bool,
    grappledTargetTwoSizesSmaller: bool
  ): TurnState = {
    // Grappled/restrained: speed 0, no bonuses apply — short-circuit
    val speed = if (creature.grappled or creature.restrained) 0
    else {
      val baseSpeed = config.speeds.get(Walk)
      val armorPenalty = armorSpeedPenalty(armorState, config.abilityScores.get(Str))
      val afterArmor = intMax(0, baseSpeed - armorPenalty)
      val afterExhaustion = intMax(0, afterArmor - 5 * creature.exhaustion)
      val afterGrappling =
        if (isGrappling and not(grappledTargetTwoSizesSmaller)) afterExhaustion / 2
        else afterExhaustion
      val withMod = afterGrappling + callerSpeedModifier
      intMax(0, withMod)
    }
    {
      movementRemaining: speed,
      effectiveSpeed: speed,
      actionsRemaining: 1,
      attackActionUsed: false,
      bonusActionUsed: false,
      reactionAvailable: true,
      freeInteractionUsed: false,
      extraAttacksRemaining: extraAttacks(config),
      disengaged: false,
      dodging: false,
      readiedAction: false,
      bonusActionSpellCast: false,
      nonCantripActionSpellCast: false,
      bonusMovementRemaining: 0,
      bonusMovementOAFree: false,
      actionSurgeActionPending: false,
      slotExpendedThisTurn: false,
    }
  }

  /// Use the action for this turn. Returns updated TurnState.
  /// Precondition: action not yet used, creature can act.
  /// SRD 5.2.1 Action Surge: "except the Magic action" — reject Magic if pending.
  pure def pUseAction(t: TurnState, creature: CreatureState, actionType: ActionType): TurnState = {
    if (t.actionsRemaining <= 0 or isIncapacitated(creature)) t
    else if (t.actionSurgeActionPending and actionType == AMagic) t  // Action Surge cannot be Magic
    else {
      val t1 = t.with("actionsRemaining", t.actionsRemaining - 1)
      val t2 = match actionType {
        | AAttack => t1.with("attackActionUsed", true)
        | ADisengage => t1.with("disengaged", true)
        | ADodge => t1.with("dodging", true)
        | ADash => t1.with("movementRemaining", t1.movementRemaining + t1.effectiveSpeed)
        | AReady => t1.with("readiedAction", true)
        | _ => t1
      }
      // Clear pending flag after consuming the Action Surge action
      if (t.actionSurgeActionPending) t2.with("actionSurgeActionPending", false) else t2
    }
  }

  /// Use bonus action. Can't use if can't take actions (incapacitated).
  pure def pUseBonusAction(t: TurnState, creature: CreatureState): TurnState = {
    if (t.bonusActionUsed or isIncapacitated(creature)) t
    else t.with("bonusActionUsed", true)
  }

  /// Use bonus action to Dash — adds effectiveSpeed to movementRemaining.
  pure def pBonusActionDash(t: TurnState, creature: CreatureState): TurnState =
    if (t.bonusActionUsed or isIncapacitated(creature)) t
    else t.with("bonusActionUsed", true)
          .with("movementRemaining", t.movementRemaining + t.effectiveSpeed)

  /// Use bonus action to Disengage.
  pure def pBonusActionDisengage(t: TurnState, creature: CreatureState): TurnState =
    if (t.bonusActionUsed or isIncapacitated(creature)) t
    else t.with("bonusActionUsed", true).with("disengaged", true)

  /// Use bonus action to Hide. Hidden status resolved by caller (Stealth check).
  pure def pBonusActionHide(t: TurnState, creature: CreatureState): TurnState =
    if (t.bonusActionUsed or isIncapacitated(creature)) t
    else t.with("bonusActionUsed", true)

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

  /// Grant bonus movement (floor of effectiveSpeed / 2), with or without OA immunity.
  pure def pGrantBonusMovement(ts: TurnState, effectiveSpeed: int, oaFree: bool): TurnState = {
    ts.with("bonusMovementRemaining", effectiveSpeed / 2)
      .with("bonusMovementOAFree", oaFree)
  }

  /// Can use bonus movement: has remaining bonus movement.
  pure def canUseBonusMovement(ts: TurnState): bool = {
    ts.bonusMovementRemaining > 0
  }

  /// Consume bonus movement.
  pure def pUseBonusMovement(ts: TurnState, feet: int): TurnState = {
    ts.with("bonusMovementRemaining", intMax(ts.bonusMovementRemaining - feet, 0))
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

  /// Grant one additional action this turn (Action Surge, Haste).
  /// Caller-side features enforce action type restrictions.
  pure def pGrantExtraAction(t: TurnState): TurnState = {
    t.with("actionsRemaining", t.actionsRemaining + 1)
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
    attackerGrappled: bool,
    targetIsGrappler: bool,
    // Environment
    underwater: bool,
    attackerHasSwimSpeed: bool,
    isUnderwaterMeleeException: bool,
    isUnderwaterRangedException: bool,
    // Reckless Attack (Barbarian)
    attackerReckless: bool,  // attacker declared Reckless Attack this turn (advantage on melee)
    targetReckless: bool,    // target declared Reckless Attack (enemies get advantage)
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
    // Reckless Attack: attacker gets advantage on melee attacks
    val adv_attackerReckless = ctx.attackerReckless and not(ctx.isRangedAttack)
    // RAW: "attack rolls against you have Advantage" when reckless
    val adv_targetReckless = ctx.targetReckless

    val anyAdvantage = adv_targetBlinded or adv_targetIncap
      or adv_targetProne5ft or adv_targetRestrained or adv_unseenAttacker
      or adv_attackerReckless or adv_targetReckless

    // --- Disadvantage sources ---
    val disadv_attackerBlinded = ctx.attackerBlinded
    val disadv_attackerProne = ctx.attackerProne
    val disadv_attackerRestrained = ctx.attackerRestrained
    val disadv_attackerPoisoned = ctx.attackerPoisoned
    val disadv_attackerFrightened = ctx.attackerFrightened and ctx.attackerFrightSourceInLOS
    val disadv_targetProneBeyond5ft = ctx.targetProne and not(ctx.attackerWithin5ft)
    val disadv_rangedBeyondNormal = ctx.isRangedAttack and ctx.beyondNormalRange
    val disadv_rangedCloseQuarters = ctx.isRangedAttack and ctx.hostileWithin5ft
    val disadv_cantSeeTarget = not(ctx.attackerCanSeeTarget)
    val disadv_heavySmall = ctx.isHeavyWeapon and ctx.wielderSizeSmallOrTiny
    val disadv_grappled = ctx.attackerGrappled and not(ctx.targetIsGrappler)
    val disadv_underwaterMelee = ctx.underwater and not(ctx.isRangedAttack)
      and not(ctx.attackerHasSwimSpeed) and not(ctx.isUnderwaterMeleeException)
    val disadv_underwaterRanged = ctx.underwater and ctx.isRangedAttack
      and not(ctx.beyondNormalRange) and not(ctx.isUnderwaterRangedException)
    val disadv_dodging = ctx.targetDodging and ctx.targetCanSeeAttacker

    val anyDisadvantage = disadv_attackerBlinded
      or disadv_attackerProne or disadv_attackerRestrained or disadv_attackerPoisoned
      or disadv_attackerFrightened or disadv_targetProneBeyond5ft
      or disadv_rangedBeyondNormal or disadv_rangedCloseQuarters or disadv_cantSeeTarget
      or disadv_heavySmall or disadv_grappled or disadv_underwaterMelee
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
    intMax(0, dmg)
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

  /// Grapple/Shove save DC: 8 + attacker's STR mod + PB.
  pure def pGrappleShoveDC(strMod: int, profBonus: int): int = 8 + strMod + profBonus

  /// Shared result type for grapple and shove
  type GrappleShoveResult = { success: bool, targetState: CreatureState }

  /// Attempt grapple via Unarmed Strike.
  /// Target makes STR or DEX save (their choice) vs DC = 8 + attacker STR mod + PB.
  /// Auto-success if target is incapacitated.
  /// Caller resolves the save and passes `targetSaveFailed: bool`.
  pure def pGrapple(
    attackerSize: Size,
    targetSize: Size,
    targetState: CreatureState,
    targetSaveFailed: bool,
    attackerHasFreeHand: bool
  ): GrappleShoveResult = {
    if (not(pWithinOneSize(attackerSize, targetSize)) or not(attackerHasFreeHand))
      { success: false, targetState: targetState }
    else if (isIncapacitated(targetState) or targetSaveFailed)
      { success: true, targetState: pApplyCondition(targetState, CGrappled, Set()) }
    else
      { success: false, targetState: targetState }
  }

  /// Release grapple (no action required)
  pure def pReleaseGrapple(targetState: CreatureState): CreatureState =
    pRemoveCondition(targetState, CGrappled)

  /// Escape grapple. Target uses its action to make Athletics/Acrobatics check
  /// against the grapple's escape DC.
  /// Caller resolves the check and passes `escapeSucceeded: bool`.
  pure def pEscapeGrapple(
    targetState: CreatureState,
    escapeSucceeded: bool
  ): CreatureState = {
    if (escapeSucceeded) pReleaseGrapple(targetState)
    else targetState
  }

  type ShoveChoice = ShoveProne | ShovePush

  /// Attempt shove via Unarmed Strike.
  /// Target makes STR or DEX save (their choice) vs DC = 8 + attacker STR mod + PB.
  /// Same size rule as grapple. No free hand required.
  /// Caller resolves the save and passes `targetSaveFailed: bool`.
  pure def pShove(
    attackerSize: Size,
    targetSize: Size,
    targetState: CreatureState,
    targetSaveFailed: bool,
    choice: ShoveChoice
  ): GrappleShoveResult = {
    if (not(pWithinOneSize(attackerSize, targetSize)))
      { success: false, targetState: targetState }
    else if (isIncapacitated(targetState) or targetSaveFailed)
      match choice {
        | ShoveProne => { success: true, targetState: pApplyCondition(targetState, CProne, Set()) }
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
      { creatureState: pApplyCondition(creature, CProne, Set()), turnState: t }
  }

  // ============================================================
  // 14. MOVEMENT SYSTEM (Phase 5)
  // ============================================================

  // -- 14.1 Movement Cost Multiplier --

  /// Compute movement cost multiplier per foot of movement.
  /// Extra foot penalties stack additively: base 1 + extras.
  /// PHB Ch8: climbing/swimming/crawling costs 1 extra foot (2 extra in difficult terrain).
  /// PHB Ch9: difficult terrain costs 1 extra foot.
  /// Caller uses result with pUseMovement(t, feet, multiplier).
  pure def pMovementCost(
    isDifficultTerrain: bool,
    isCrawling: bool,
    isClimbingOrSwimming: bool,
    hasRelevantSpeed: bool
  ): int = {
    val terrainExtra = if (isDifficultTerrain) 1 else 0
    val crawlExtra = if (isCrawling) 1 else 0
    val climbSwimExtra = if (isClimbingOrSwimming and not(hasRelevantSpeed)) 1 else 0
    1 + terrainExtra + crawlExtra + climbSwimExtra
  }

  // -- 14.2 Prone Movement --

  /// Stand from prone. Costs half effective speed.
  /// PHB: "You can't stand up if you don't have enough movement left or if your speed is 0."
  /// Returns TurnState unchanged if can't stand. Caller removes CProne on success.
  pure def pStandFromProne(t: TurnState): TurnState = pSpendHalfSpeed(t)

  /// Drop prone. Free (0 movement cost). Can't drop prone if Speed is 0.
  pure def pDropProne(s: CreatureState, effectiveSpeed: int): CreatureState =
    if (effectiveSpeed == 0) s
    else pApplyCondition(s, CProne, Set())

  // -- 14.3 Flying Movement --

  /// PHB: flying creature falls if it has the Incapacitated or Prone
  /// condition, or its fly speed is reduced to 0 — unless it can hover
  /// or is held aloft by magic (e.g. fly spell).
  /// Returns true if the creature falls.
  pure def pFlyingCreatureFalls(
    creature: CreatureState,
    effectiveSpeed: int,
    hasHover: bool,
    heldAloftByMagic: bool
  ): bool =
    if (hasHover or heldAloftByMagic) false
    else creature.prone or isIncapacitated(creature) or effectiveSpeed == 0

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
    val height = intMax(0, base)
    if (hasRunningStart) height else height / 2
  }

  /// Landing in difficult terrain after a jump.
  /// PHB: DC 10 Acrobatics or land prone. Caller resolves check, passes result.
  pure def pJumpLandInDifficultTerrain(
    creature: CreatureState,
    checkPassed: bool
  ): CreatureState =
    if (checkPassed) creature else pApplyCondition(creature, CProne, Set())

  // -- 14.6 Movement Constraints --

  /// Can move through a hostile creature's space?
  /// PHB: "only if the creature is at least two sizes larger or smaller than you."
  pure def pCanMoveThroughHostile(moverSize: Size, hostileSize: Size): bool =
    pTwoSizesSmaller(moverSize, hostileSize) or pTwoSizesSmaller(hostileSize, moverSize)

  // ============================================================
  // 15. SPELLCASTING SYSTEM (Phase 6)
  // ============================================================

  // -- 15.1 Types & Constants --


  type SpellSlotState = {
    slotsMax: int -> int,        // spell level 1-9 -> max slots
    slotsCurrent: int -> int,    // spell level 1-9 -> current slots
    pactSlotsMax: int,           // 0 for non-warlocks
    pactSlotsCurrent: int,
    pactSlotLevel: int,          // warlock pact slot level (1-5)
    concentrationSpellId: str,   // "" if not concentrating
  }

  pure def isConcentrating(ss: SpellSlotState): bool = ss.concentrationSpellId != ""

  pure val EMPTY_SLOTS: int -> int =
    Map(1 -> 0, 2 -> 0, 3 -> 0, 4 -> 0, 5 -> 0, 6 -> 0, 7 -> 0, 8 -> 0, 9 -> 0)

  // -- 15.2 Slot Management --

  /// Expend a regular spell slot. Returns unchanged state if no slots at that level.
  pure def pExpendSlot(ss: SpellSlotState, level: int): SpellSlotState = {
    val current = ss.slotsCurrent.get(level)
    if (current <= 0) ss
    else ss.with("slotsCurrent", ss.slotsCurrent.set(level, current - 1))
  }

  /// Restore a regular spell slot (inverse of pExpendSlot). Capped at max.
  pure def pRestoreSlot(ss: SpellSlotState, level: int): SpellSlotState = {
    val current = ss.slotsCurrent.get(level)
    val maximum = ss.slotsMax.get(level)
    if (current >= maximum) ss
    else ss.with("slotsCurrent", ss.slotsCurrent.set(level, current + 1))
  }

  /// Expend a warlock pact slot. Returns unchanged state if no pact slots.
  pure def pExpendPactSlot(ss: SpellSlotState): SpellSlotState =
    if (ss.pactSlotsCurrent <= 0) ss
    else ss.with("pactSlotsCurrent", ss.pactSlotsCurrent - 1)

  /// Can cast a spell at spellLevel using a slot of slotLevel?
  /// PHB: slot must be >= spell level and have remaining uses.
  pure def pCanCastAtLevel(ss: SpellSlotState, spellLevel: int, slotLevel: int): bool =
    slotLevel >= spellLevel and ss.slotsCurrent.get(slotLevel) > 0

  /// Can cast a spell using a warlock pact slot?
  /// PHB: pact slot level must be >= spell level.
  pure def pCanCastWithPactSlot(ss: SpellSlotState, spellLevel: int): bool =
    ss.pactSlotsCurrent > 0 and ss.pactSlotLevel >= spellLevel

  /// Restore all spell slots (long rest). Restores both regular and pact slots.
  pure def pRestoreAllSlots(ss: SpellSlotState): SpellSlotState =
    ss.with("slotsCurrent", ss.slotsMax)
      .with("pactSlotsCurrent", ss.pactSlotsMax)

  /// Restore only pact slots (short rest).
  pure def pRestorePactSlots(ss: SpellSlotState): SpellSlotState =
    ss.with("pactSlotsCurrent", ss.pactSlotsMax)

  // -- 15.3 Multiclass Slot Calculation --

  /// Compute effective caster level for multiclass spellcaster table.
  /// PHB Ch6: full casters contribute full level, half casters floor(level/2),
  /// third casters floor(level/3). Warlock pact magic is separate.
  pure def pMulticlassCasterLevel(fullLevels: int, halfLevels: int, thirdLevels: int): int =
    fullLevels + halfLevels / 2 + thirdLevels / 3

  /// Multiclass Spellcaster table (PHB Ch6).
  /// Returns number of spell slots for given caster level and spell level.
  pure def pSlotsPerLevel(casterLevel: int, spellLevel: int): int = {
    if (spellLevel == 1) {
      if (casterLevel >= 3) 4
      else if (casterLevel == 2) 3
      else if (casterLevel == 1) 2
      else 0
    } else if (spellLevel == 2) {
      if (casterLevel >= 4) 3
      else if (casterLevel == 3) 2
      else 0
    } else if (spellLevel == 3) {
      if (casterLevel >= 6) 3
      else if (casterLevel == 5) 2
      else 0
    } else if (spellLevel == 4) {
      if (casterLevel >= 9) 3
      else if (casterLevel == 8) 2
      else if (casterLevel == 7) 1
      else 0
    } else if (spellLevel == 5) {
      if (casterLevel >= 18) 3
      else if (casterLevel >= 10) 2
      else if (casterLevel == 9) 1
      else 0
    } else if (spellLevel == 6) {
      if (casterLevel >= 19) 2
      else if (casterLevel >= 11) 1
      else 0
    } else if (spellLevel == 7) {
      if (casterLevel >= 20) 2
      else if (casterLevel >= 13) 1
      else 0
    } else if (spellLevel == 8) {
      if (casterLevel >= 15) 1
      else 0
    } else if (spellLevel == 9) {
      if (casterLevel >= 17) 1
      else 0
    } else 0
  }

  /// Build a full slot map from caster level.
  pure def pBuildSlotMap(casterLevel: int): int -> int =
    Map(
      1 -> pSlotsPerLevel(casterLevel, 1),
      2 -> pSlotsPerLevel(casterLevel, 2),
      3 -> pSlotsPerLevel(casterLevel, 3),
      4 -> pSlotsPerLevel(casterLevel, 4),
      5 -> pSlotsPerLevel(casterLevel, 5),
      6 -> pSlotsPerLevel(casterLevel, 6),
      7 -> pSlotsPerLevel(casterLevel, 7),
      8 -> pSlotsPerLevel(casterLevel, 8),
      9 -> pSlotsPerLevel(casterLevel, 9)
    )

  /// Compute effective caster level from classLevels map (SRD 5.2.1 Multiclassing).
  /// Full casters: Bard, Cleric, Druid, Sorcerer, Wizard (all levels).
  /// Half casters: Paladin, Ranger (half levels, truncated per Quint integer division).
  /// Warlock: excluded (Pact Magic is separate). Fighter/Barbarian/Monk/Rogue: 0.
  /// Third casters (Eldritch Knight, Arcane Trickster) not modeled — SRD only has Champion/Thief.
  pure def pEffectiveCasterLevel(cl: ClassName -> int): int = {
    val full = cl.get(Bard) + cl.get(Cleric) + cl.get(Druid) + cl.get(Sorcerer) + cl.get(Wizard)
    val half = cl.get(Paladin) + cl.get(Ranger)
    pMulticlassCasterLevel(full, half, 0)
  }

  /// Warlock pact slot count by level (SRD 5.2.1 Warlock table).
  pure def pWarlockPactSlotCount(warlockLevel: int): int = {
    if (warlockLevel >= 17) 4
    else if (warlockLevel >= 11) 3
    else if (warlockLevel >= 2) 2
    else if (warlockLevel >= 1) 1
    else 0
  }

  /// Warlock pact slot level by class level (SRD 5.2.1 Warlock table).
  pure def pWarlockPactSlotLevel(warlockLevel: int): int = {
    if (warlockLevel >= 9) 5
    else if (warlockLevel >= 7) 4
    else if (warlockLevel >= 5) 3
    else if (warlockLevel >= 3) 2
    else if (warlockLevel >= 1) 1
    else 0
  }

  /// Build initial SpellSlotState from classLevels.
  /// Regular slots from multiclass caster level; pact slots from warlock level.
  pure def pInitSpellSlots(cl: ClassName -> int): SpellSlotState = {
    val casterLvl = pEffectiveCasterLevel(cl)
    val slotMap = pBuildSlotMap(casterLvl)
    val wkLevel = cl.get(Warlock)
    {
      slotsMax: slotMap,
      slotsCurrent: slotMap,
      pactSlotsMax: pWarlockPactSlotCount(wkLevel),
      pactSlotsCurrent: pWarlockPactSlotCount(wkLevel),
      pactSlotLevel: pWarlockPactSlotLevel(wkLevel),
      concentrationSpellId: "",
    }
  }

  // -- 15.4 Concentration --

  /// Concentration save DC: max(10, floor(damage / 2)), capped at 30.
  pure def pConcentrationDC(damageTaken: int): int = {
    val half = damageTaken / 2
    intMin(intMax(half, 10), 30)
  }

  /// Break concentration. Clears spell.
  pure def pBreakConcentration(ss: SpellSlotState): SpellSlotState =
    ss.with("concentrationSpellId", "")

  /// Start concentrating on a spell. Replaces existing concentration if any.
  /// PHB: "You can't concentrate on two spells at once."
  pure def pStartConcentration(ss: SpellSlotState, spellId: str): SpellSlotState =
    ss.with("concentrationSpellId", spellId)

  /// Break concentration if transition caused incapacitation or death (no save).
  pure def pBreakConcOnStateChange(ss: SpellSlotState, oldS: CreatureState, newS: CreatureState): SpellSlotState =
    if (isConcentrating(ss) and (
      (newS.dead and not(oldS.dead)) or
      (isIncapacitated(newS) and not(isIncapacitated(oldS)))
    )) pBreakConcentration(ss)
    else ss

  /// Remove the concentrated spell's active effect if concentration broke.
  pure def pEffectsOnConcBreak(ssOld: SpellSlotState, ssNew: SpellSlotState, effects: Set[ActiveEffect]): Set[ActiveEffect] =
    if (isConcentrating(ssOld) and not(isConcentrating(ssNew)))
      pRemoveEffect(effects, ssOld.concentrationSpellId)
    else effects

  type ConcBreakResult = { creature: CreatureState, slots: SpellSlotState }

  /// Combined: break concentration on state change + remove associated active effect.
  pure def pWithConcBreak(ss: SpellSlotState, oldS: CreatureState, newS: CreatureState): ConcBreakResult = {
    val ssNew = pBreakConcOnStateChange(ss, oldS, newS)
    { creature: newS.with("activeEffects", pEffectsOnConcBreak(ss, ssNew, newS.activeEffects)), slots: ssNew }
  }

  /// Resolve concentration check after taking damage.
  /// Caller computes DC via pConcentrationDC, resolves save via saveSucceeds, passes result.
  /// Separate call per damage source.
  pure def pConcentrationCheck(ss: SpellSlotState, conSaveSucceeded: bool): SpellSlotState =
    if (not(isConcentrating(ss))) ss
    else if (conSaveSucceeded) ss
    else pBreakConcentration(ss)

  // -- 15.5 END_TURN Processing (TA2) --

  /// Process end-of-turn saves. On success: remove active effect + specified conditions.
  pure def pProcessEndOfTurnSaves(s: CreatureState, saves: List[EndOfTurnSave]): CreatureState =
    saves.foldl(s, (acc, save) =>
      if (save.saveSucceeded) {
        val s1 = acc.with("activeEffects", pRemoveEffect(acc.activeEffects, save.spellId))
        save.conditionsToRemove.fold(s1, (a, c) => pRemoveCondition(a, c))
      } else acc
    )

  /// Process end-of-turn damage. Apply each, handle concentration breaks.
  pure def pProcessEndOfTurnDamage(
    s: CreatureState, ss: SpellSlotState, damages: List[EndOfTurnDamage]
  ): ConcBreakResult =
    damages.foldl({ creature: s, slots: ss }, (acc, dmg) => {
      val newS = pTakeDamage(acc.creature, dmg.damage, dmg.damageType, dmg.resistances, dmg.vulnerabilities, dmg.immunities, false)
      val r = pWithConcBreak(acc.slots, acc.creature, newS)
      // If still concentrating after state-change break, check concentration save
      val r2 = if (isConcentrating(r.slots)) {
        val ss2 = pConcentrationCheck(r.slots, dmg.conSaveSucceeded)
        val eff2 = pEffectsOnConcBreak(r.slots, ss2, r.creature.activeEffects)
        { creature: r.creature.with("activeEffects", eff2), slots: ss2 }
      } else r
      r2
    })

  /// Full END_TURN processing: saves -> damage -> clear expired AtEndOfTurn effects.
  pure def pEndTurn(
    s: CreatureState, ss: SpellSlotState,
    saves: List[EndOfTurnSave], damages: List[EndOfTurnDamage]
  ): ConcBreakResult = {
    val s1 = pProcessEndOfTurnSaves(s, saves)
    val r = pProcessEndOfTurnDamage(s1, ss, damages)
    val cleaned = pClearExpiredAtPhase(r.creature.activeEffects, AtEndOfTurn)
    { creature: r.creature.with("activeEffects", cleaned), slots: r.slots }
  }

  // -- 15.5b START_TURN Processing (TA4) --

  /// Process start-of-turn effects. Only processes effects that survived expiry.
  /// Mirrors pProcessEndOfTurnDamage for damage/concentration handling.
  pure def pProcessStartOfTurn(
    s: CreatureState, ss: SpellSlotState, effects: List[StartOfTurnEffect]
  ): ConcBreakResult =
    effects.foldl({ creature: s, slots: ss }, (acc, eff) => {
      // Only process if the effect survived decrement + expiry
      if (not(pHasEffect(acc.creature.activeEffects, eff.spellId))) acc
      else {
        // Save success: remove effect
        val s1 = if (eff.saveResult)
          acc.creature.with("activeEffects", pRemoveEffect(acc.creature.activeEffects, eff.spellId))
        else acc.creature
        // Heal
        val s2 = if (eff.healAmount > 0) pHeal(s1, eff.healAmount) else s1
        // Temp HP (replace mode)
        val s3 = if (eff.tempHpAmount > 0) pGrantTempHp(s2, eff.tempHpAmount, false) else s2
        // Damage + concentration break
        if (eff.damageAmount > 0) {
          val s4 = pTakeDamage(s3, eff.damageAmount, eff.damageType, eff.resistances, eff.vulnerabilities, eff.immunities, false)
          val r = pWithConcBreak(acc.slots, acc.creature, s4)
          val r2 = if (isConcentrating(r.slots)) {
            val ss2 = pConcentrationCheck(r.slots, eff.conSaveSucceeded)
            val eff2 = pEffectsOnConcBreak(r.slots, ss2, r.creature.activeEffects)
            { creature: r.creature.with("activeEffects", eff2), slots: ss2 }
          } else r
          r2
        } else {
          // No damage — check for concentration break from state change (death from heal overflow, etc.)
          pWithConcBreak(acc.slots, acc.creature, s3)
        }
      }
    })

  /// Full START_TURN orchestrator: decrement → expiry → death save → effects → turn reset.
  /// NOTE: Death save roll at step 3 is PC-only per RAW. See A12 in ASSUMPTIONS.md.
  type StartTurnFullResult = { creature: CreatureState, slots: SpellSlotState, turn: TurnState }

  pure def pStartTurnFull(
    config: CharConfig,
    s: CreatureState,
    ss: SpellSlotState,
    armorState: ArmorState,
    callerSpeedModifier: int,
    isGrappling: bool,
    grappledTargetTwoSizesSmaller: bool,
    deathSaveRoll: int,
    deathSaveRoll2: int,
    startEffects: List[StartOfTurnEffect]
  ): StartTurnFullResult = {
    // 1. Decrement all durations
    val eff1 = pDecrementDurations(s.activeEffects)
    // 2. Clear expired AtStartOfTurn
    val eff2 = pClearExpiredAtPhase(eff1, AtStartOfTurn)
    val s1 = s.with("activeEffects", eff2)
    // 3. Death save (if applicable) — Defy Death (Champion L18) applied via pFighterDeathSaveRoll
    val fighterLvl = config.classLevels.get(Fighter)
    val effectiveDsRoll = pFighterDeathSaveRoll(fighterLvl, deathSaveRoll, deathSaveRoll2)
    val s2 = if (s1.hp == 0 and not(s1.stable) and not(s1.dead) and deathSaveRoll > 0)
      pDeathSave(s1, effectiveDsRoll)
    else s1
    // 4. Process start-of-turn effects
    val r = pProcessStartOfTurn(s2, ss, startEffects)
    // 5. Turn state reset (uses post-processing creature state)
    val t = pStartTurn(config, r.creature, armorState, callerSpeedModifier, isGrappling, grappledTargetTwoSizesSmaller)
    { creature: r.creature, slots: r.slots, turn: t }
  }

  // -- 15.6 Casting Validation --

  /// Can the creature provide the required spell components?
  /// V: requires ability to speak (pCanSpeak). S: requires a free hand (caller-provided).
  /// M: caller validates (focus/pouch/specific component).
  pure def pCanProvideComponents(
    creature: CreatureState,
    requiresVerbal: bool,
    requiresSomatic: bool,
    hasFreeHand: bool
  ): bool = {
    val vOk = not(requiresVerbal) or pCanSpeak(creature)
    val sOk = not(requiresSomatic) or hasFreeHand
    vOk and sOk
  }

  // ============================================================
  // 16. RESTING & RECOVERY (Phase 7)
  // ============================================================
  // PHB Ch8: Short Rest (1+ hour), Long Rest (8+ hours).
  // SpellSlotState restoration handled by existing pRestorePactSlots / pRestoreAllSlots.

  // -- 16.1 Short Rest: Hit Die Spending --

  /// Spend one hit die from a specific class pool. Heals dieRoll + conMod (min 0).
  /// No-op if no HD remaining for that class or creature is dead.
  pure def pSpendHitDie(s: CreatureState, className: ClassName, conMod: int, dieRoll: int): CreatureState =
    if (s.hitDiceRemaining.get(className) <= 0 or s.dead) s
    else {
      val raw = dieRoll + conMod
      val healing = intMax(0, raw)
      pHeal(s, healing).with("hitDiceRemaining", s.hitDiceRemaining.setBy(className, (n) => n - 1))
    }

  /// Short rest: spend hit dice from a list of pre-resolved (class, roll) pairs, then return state.
  /// Caller also calls pRestorePactSlots on SpellSlotState if applicable.
  pure def pShortRest(s: CreatureState, conMod: int, hdRolls: List[(ClassName, int)]): CreatureState = {
    hdRolls.foldl(s, (acc, pair) => pSpendHitDie(acc, pair._1, conMod, pair._2))
  }

  // -- 16.2 Long Rest --

  /// Long rest (Rules-Glossary "Long Rest"):
  /// - Must have >= 1 HP at start of rest to benefit (otherwise no-op)
  /// - Regain all lost HP and all spent Hit Point Dice
  /// - Exhaustion level decreases by 1 (unconditional, no food requirement)
  /// - Clear temp HP
  /// Caller also calls pRestoreAllSlots on SpellSlotState.
  pure def pLongRest(s: CreatureState, classLevels: ClassName -> int): CreatureState =
    if (s.hp < 1) s
    else {
      val s1 = pReduceExhaustion(s, 1)
      val s2 = s1.with("hp", effectiveMaxHp(s1))
      s2.with("hitDiceRemaining", classLevels)
        .with("tempHp", 0)
    }

  // ============================================================
  // 17. ENVIRONMENTAL RULES (Phase 8)
  // ============================================================
  // PHB Ch8: The Environment — falling, suffocation, vision/light,
  // food/water, travel & forced march.

  // -- 17.1 Falling --

  /// Number of d6 for fall damage. PHB: 1d6 per 10 feet, max 20d6.
  pure def pFallingDamageDice(heightFeet: int): int =
    intMin(heightFeet / 10, 20)

  /// Apply fall: bludgeoning damage + land prone unless damage entirely avoided.
  /// Prone applies if any damage reached the creature (including temp HP absorption).
  pure def pApplyFall(
    s: CreatureState,
    damageRoll: int,
    resistances: Set[DamageType],
    vulnerabilities: Set[DamageType],
    immunities: Set[DamageType]
  ): CreatureState = {
    if (damageRoll <= 0) s
    else {
      val s1 = pTakeDamage(s, damageRoll, Bludgeoning, resistances, vulnerabilities, immunities, false)
      if (s1 == s) s else pApplyCondition(s1, CProne, Set())
    }
  }

  // -- 17.2 Suffocation --

  /// Rounds a creature can hold its breath. PHB: 1 + CON mod minutes, min 30 seconds.
  /// Returns rounds (1 minute = 10 rounds, 30 seconds = 5 rounds).
  pure def pHoldBreathRounds(conMod: int): int =
    intMax((1 + conMod) * 10, 5)

  /// Rounds a suffocating creature survives after running out of breath.
  /// PHB: CON mod rounds, min 1. After these rounds expire, drops to 0 HP.
  pure def pSuffocationRounds(conMod: int): int =
    intMax(conMod, 1)

  /// Apply suffocation death: drop to 0 HP, dying (unconscious + prone for PCs).
  /// Cannot regain HP or stabilize until breathing again (caller enforces).
  pure def pSuffocate(s: CreatureState, kind: CreatureKind): CreatureState =
    if (s.dead or s.hp == 0) s
    else if (kind == Monster) s.with("hp", 0).with("dead", true)
    else pApplyCondition(s.with("hp", 0), CUnconscious, Set())

  // -- 17.3 Vision & Light --

  type Obscurement = Unobscured | LightlyObscured | HeavilyObscured

  /// Map illumination to obscurement level.
  pure def pIlluminationObscurement(light: Illumination): Obscurement = match light {
    | Bright => Unobscured
    | Dim => LightlyObscured
    | Dark => HeavilyObscured
  }

  /// Effective obscurement considering darkvision.
  /// Darkvision: darkness -> dim equivalent (lightly obscured); dim -> bright (unobscured).
  /// Blindsight/truesight override obscurement entirely (caller handles).
  pure def pEffectiveObscurement(light: Illumination, hasDarkvision: bool): Obscurement = {
    if (hasDarkvision) {
      match light {
        | Bright => Unobscured
        | Dim => Unobscured
        | Dark => LightlyObscured
      }
    } else pIlluminationObscurement(light)
  }

  /// Whether a creature is effectively blinded by obscurement.
  pure def pBlindedByObscurement(obs: Obscurement): bool = obs == HeavilyObscured

  /// Perception disadvantage from obscurement (sight-based checks).
  pure def pPerceptionDisadvantage(obs: Obscurement): bool =
    obs == LightlyObscured or obs == HeavilyObscured

  // -- 17.4 Food & Water --

  /// Days a creature can go without food before exhaustion.
  /// SRD 5.2.1 "Malnutrition": flat 5 days, no CON modifier.
  pure val pStarvationThreshold: int = 5

  /// Apply starvation exhaustion. PHB: 1 level per day beyond threshold.
  pure def pApplyStarvation(s: CreatureState): CreatureState = pAddExhaustion(s, 1, false)

  /// Apply dehydration exhaustion. SRD 5.2.1 "Dehydration":
  /// Creature that drinks less than half required water gains 1 Exhaustion level.
  pure def pApplyDehydration(s: CreatureState): CreatureState = pAddExhaustion(s, 1, false)

  // -- 17.5 Travel & Forced March --

  type TravelPace = PaceFast | PaceNormal | PaceSlow

  /// Travel speed in feet per minute (PHB table, 30ft base speed).
  pure def pTravelFeetPerMinute(pace: TravelPace): int = match pace {
    | PaceFast => 400
    | PaceNormal => 300
    | PaceSlow => 200
  }

  /// Travel distance in miles per hour.
  pure def pTravelMilesPerHour(pace: TravelPace): int = match pace {
    | PaceFast => 4
    | PaceNormal => 3
    | PaceSlow => 2
  }

  /// Travel distance in miles per day (8 hours).
  pure def pTravelMilesPerDay(pace: TravelPace): int = match pace {
    | PaceFast => 30
    | PaceNormal => 24
    | PaceSlow => 18
  }

  pure def pTravelPerceptionPenalty(pace: TravelPace): int = match pace {
    | PaceFast => -5
    | _ => 0
  }

  pure def pCanStealthWhileTraveling(pace: TravelPace): bool = pace == PaceSlow

  /// Difficult terrain halves travel distance.
  pure def pDifficultTerrainTravel(distance: int): int = distance / 2

  /// Forced march CON save DC. PHB: DC 10 + (hours past 8).
  /// Returns 0 if not yet forced marching (hours <= 8).
  pure def pForcedMarchDC(hoursMarched: int): int =
    if (hoursMarched <= 8) 0
    else 10 + (hoursMarched - 8)

  // ============================================================
  // 17.6 FIGHTER CLASS FEATURES (SRD 5.2.1 Fighter)
  // ============================================================

  /// Second Wind max uses (SRD 5.2.1 Fighter Features table).
  /// L0: 0, L1-3: 2, L4-9: 3, L10+: 4.
  pure def secondWindMaxCharges(fighterLevel: int): int = {
    if (fighterLevel <= 0) 0
    else if (fighterLevel <= 3) 2
    else if (fighterLevel <= 9) 3
    else 4
  }

  /// Action Surge max charges (SRD 5.2.1).
  /// Below L2: 0, L2-16: 1, L17+: 2.
  pure def actionSurgeMaxCharges(fighterLevel: int): int = {
    if (fighterLevel < 2) 0
    else if (fighterLevel < 17) 1
    else 2
  }

  /// Indomitable max charges (SRD 5.2.1).
  /// Below L9: 0, L9-12: 1, L13-16: 2, L17+: 3.
  pure def indomitableMaxCharges(fighterLevel: int): int = {
    if (fighterLevel < 9) 0
    else if (fighterLevel < 13) 1
    else if (fighterLevel < 17) 2
    else 3
  }

  /// Fresh fighter state for a given level.
  pure def freshFighterState(fighterLevel: int): FighterState = {
    val swMax = secondWindMaxCharges(fighterLevel)
    val asMax = actionSurgeMaxCharges(fighterLevel)
    val indMax = indomitableMaxCharges(fighterLevel)
    {
      secondWindCharges: swMax, secondWindMax: swMax,
      actionSurgeCharges: asMax, actionSurgeMax: asMax,
      actionSurgeUsedThisTurn: false,
      indomitableCharges: indMax, indomitableMax: indMax,
      heroicInspiration: false,
    }
  }

  /// Can use Second Wind: charges > 0, bonus action available, not incapacitated, not dead.
  pure def canUseSecondWind(fs: FighterState, ts: TurnState, s: CreatureState): bool = {
    fs.secondWindCharges > 0 and not(ts.bonusActionUsed) and not(isIncapacitated(s)) and not(s.dead)
  }

  /// Use Second Wind: heal d10 + level via pHeal, decrement charge.
  pure def pUseSecondWind(s: CreatureState, fs: FighterState, d10Roll: int, fighterLevel: int): { creature: CreatureState, fighter: FighterState } = {
    val healAmount = d10Roll + fighterLevel
    {
      creature: pHeal(s, healAmount),
      fighter: fs.with("secondWindCharges", fs.secondWindCharges - 1),
    }
  }

  /// Can use Action Surge: charges > 0, not used this turn, not incapacitated.
  pure def canUseActionSurge(fs: FighterState, s: CreatureState): bool = {
    fs.actionSurgeCharges > 0 and not(fs.actionSurgeUsedThisTurn) and not(isIncapacitated(s))
  }

  /// Use Action Surge: grant +1 action, decrement charge, mark used.
  /// SRD 5.2.1: "except the Magic action" — set pending flag to gate Magic.
  pure def pUseActionSurge(ts: TurnState, fs: FighterState): { turn: TurnState, fighter: FighterState } = {
    {
      turn: ts.with("actionsRemaining", ts.actionsRemaining + 1)
              .with("actionSurgeActionPending", true),
      fighter: fs.with("actionSurgeCharges", fs.actionSurgeCharges - 1)
                .with("actionSurgeUsedThisTurn", true),
    }
  }

  /// Can use Indomitable: level >= 9 and charges > 0.
  pure def canUseIndomitable(fighterLevel: int, fs: FighterState): bool = {
    fighterLevel >= 9 and fs.indomitableCharges > 0
  }

  /// Use Indomitable: decrement charge (caller handles reroll).
  pure def pUseIndomitable(fs: FighterState): FighterState = {
    fs.with("indomitableCharges", fs.indomitableCharges - 1)
  }

  /// Can use Tactical Mind: level >= 2 and Second Wind charges > 0 (SRD 5.2.1).
  pure def canUseTacticalMind(fighterLevel: int, fs: FighterState): bool = {
    fighterLevel >= 2 and fs.secondWindCharges > 0
  }

  /// Tactical Mind: expend a Second Wind use on a failed ability check to add 1d10.
  /// Charge is only consumed if the boosted check succeeds.
  pure def pUseTacticalMind(fs: FighterState, boostedCheckSucceeds: bool): FighterState = {
    if (boostedCheckSucceeds) fs.with("secondWindCharges", fs.secondWindCharges - 1)
    else fs
  }

  /// Fighter short rest: regain 1 SW charge (capped), restore all AS charges.
  pure def pFighterShortRest(fs: FighterState): FighterState = {
    fs.with("secondWindCharges", intMin(fs.secondWindCharges + 1, fs.secondWindMax))
      .with("actionSurgeCharges", fs.actionSurgeMax)
  }

  /// Fighter long rest: restore all charges to max.
  pure def pFighterLongRest(fs: FighterState): FighterState = {
    fs.with("secondWindCharges", fs.secondWindMax)
      .with("actionSurgeCharges", fs.actionSurgeMax)
      .with("indomitableCharges", fs.indomitableMax)
  }

  /// Fighter start of turn: reset actionSurgeUsedThisTurn flag.
  /// Heroic Warrior (Champion L10): gain Heroic Inspiration if you don't have it.
  pure def pFighterStartTurn(fs: FighterState, fighterLevel: int): FighterState = {
    val fs1 = fs.with("actionSurgeUsedThisTurn", false)
    // Heroic Warrior (Champion L10): gain Heroic Inspiration if you don't have it
    if (fighterLevel >= 10 and not(fs1.heroicInspiration))
      fs1.with("heroicInspiration", true)
    else fs1
  }

  // -- 17.7 Survivor (Champion L18) --

  /// Defy Death (Champion L18): advantage on death saves, rolls 18-20 count as 20.
  /// Returns the effective roll after applying advantage and threshold.
  pure def pFighterDeathSaveRoll(fighterLevel: int, roll1: int, roll2: int): int = {
    val roll = if (fighterLevel >= 18) intMax(roll1, roll2) else roll1
    if (fighterLevel >= 18 and roll >= 18) 20 else roll
  }

  /// Bloodied: at or below half max HP AND has at least 1 HP (SRD 5.2.1).
  pure def isBloodied(s: CreatureState): bool = {
    s.hp > 0 and s.hp <= s.maxHp / 2
  }

  /// Heroic Rally (Champion L18): heal 5 + conMod at start of turn if Bloodied.
  pure def pHeroicRally(s: CreatureState, fighterLevel: int, conMod: int): CreatureState = {
    if (fighterLevel >= 18 and isBloodied(s))
      pHeal(s, 5 + conMod)
    else s
  }

  // ============================================================
  // 17.B BARBARIAN FUNCTIONS (Phase B)
  // ============================================================
  // Pure functions for Barbarian resource tracking: Rage, Reckless
  // Attack, Frenzy, Intimidating Presence, Relentless Rage.

  // -- B0: Constants --

  /// Max rage charges by barbarian level (SRD 5.2.1 Barbarian Features table).
  pure def rageMaxChargesForLevel(barbarianLevel: int): int = {
    if (barbarianLevel >= 17) 6
    else if (barbarianLevel >= 12) 5
    else if (barbarianLevel >= 6) 4
    else if (barbarianLevel >= 3) 3
    else if (barbarianLevel >= 1) 2
    else 0
  }

  /// Fresh barbarian state for a given level.
  pure def freshBarbarianState(barbarianLevel: int): BarbarianState = {
    val maxCharges = rageMaxChargesForLevel(barbarianLevel)
    {
      raging: false,
      rageCharges: maxCharges,
      rageMaxCharges: maxCharges,
      rageTurnsRemaining: 0,
      attackedOrForcedSaveThisTurn: false,
      rageExtendedWithBA: false,
      recklessThisTurn: false,
      frenzyUsedThisTurn: false,
      intimidatingPresenceUsed: false,
      relentlessRageTimesUsed: 0,
      brutalStrikeUsedThisTurn: false,
    }
  }

  // -- B1: Guards --

  /// Can enter rage: charges > 0 AND not already raging.
  /// Armor check (no heavy armor) is a caller-side concern (D4).
  pure def canEnterRage(bs: BarbarianState): bool = {
    bs.rageCharges > 0 and not(bs.raging)
  }

  /// Can use Intimidating Presence: L14+, not already used, bonus action available.
  pure def canUseIntimidatingPresence(bs: BarbarianState, barbarianLevel: int, bonusActionUsed: bool): bool = {
    barbarianLevel >= 14 and not(bs.intimidatingPresenceUsed) and not(bonusActionUsed)
  }

  /// Can restore Intimidating Presence by expending a rage charge.
  pure def canRestoreIntimidatingPresence(bs: BarbarianState, barbarianLevel: int): bool = {
    barbarianLevel >= 14 and bs.intimidatingPresenceUsed and bs.rageCharges > 0
  }

  /// Brutal Strike guard: L9+, Reckless this turn, not yet used.
  /// SRD: "If you use Reckless Attack, you can forgo any Advantage on one
  /// Strength-based attack roll of your choice on your turn."
  /// isStrengthBased is caller-managed in single-creature model.
  pure def canBrutalStrike(bs: BarbarianState, barbarianLevel: int): bool = {
    bs.recklessThisTurn and barbarianLevel >= 9 and not(bs.brutalStrikeUsedThisTurn)
  }

  /// Relentless Rage guard: L11+, must be raging.
  /// SRD: "If you drop to 0 Hit Points while your Rage is active and don't die outright"
  pure def canRelentlessRage(bs: BarbarianState, barbarianLevel: int): bool = {
    bs.raging and barbarianLevel >= 11
  }

  /// Relentless Rage DC: 10 + (timesUsed * 5).
  /// SRD: "DC increases by 5" each use, "DC resets to 10" on SR/LR.
  pure def relentlessRageDC(timesUsed: int): int = 10 + timesUsed * 5

  // -- B2: Transitions + Lifecycle --

  /// Enter rage: set raging, decrement charge, set turns to 100 (10 min), reset flags.
  pure def pEnterRage(bs: BarbarianState): BarbarianState = {
    bs.with("raging", true)
      .with("rageCharges", bs.rageCharges - 1)
      .with("rageTurnsRemaining", 100)
      .with("attackedOrForcedSaveThisTurn", false)
      .with("rageExtendedWithBA", false)
  }

  /// End rage: clear raging, zero turns, reset per-turn flags.
  pure def pEndRage(bs: BarbarianState): BarbarianState = {
    bs.with("raging", false)
      .with("rageTurnsRemaining", 0)
      .with("attackedOrForcedSaveThisTurn", false)
      .with("rageExtendedWithBA", false)
      .with("recklessThisTurn", false)
  }

  /// Extend rage with bonus action.
  pure def pExtendRageBA(bs: BarbarianState): BarbarianState = {
    bs.with("rageExtendedWithBA", true)
  }

  /// Mark that an attack or forced save occurred this turn (rage maintenance).
  pure def pMarkAttackOrForcedSave(bs: BarbarianState): BarbarianState = {
    bs.with("attackedOrForcedSaveThisTurn", true)
  }

  /// Declare Reckless Attack this turn.
  pure def pDeclareReckless(bs: BarbarianState): BarbarianState = {
    bs.with("recklessThisTurn", true)
  }

  /// Check rage maintenance at start of turn.
  /// SRD L15 Persistent Rage: rage lasts 10 min without maintenance.
  /// Below L15: rage ends if no attack, no forced save, and no BA extension last turn.
  pure def pCheckRageMaintenance(bs: BarbarianState, barbarianLevel: int): BarbarianState = {
    if (not(bs.raging)) bs
    // Persistent Rage (L15+): skip maintenance check
    else if (barbarianLevel >= 15) bs
    // Rage maintained if attacked, forced save, or extended with BA
    else if (bs.attackedOrForcedSaveThisTurn or bs.rageExtendedWithBA) bs
    // Rage ends
    else pEndRage(bs)
  }

  /// Use Intimidating Presence: mark as used.
  pure def pUseIntimidatingPresence(bs: BarbarianState): BarbarianState = {
    bs.with("intimidatingPresenceUsed", true)
  }

  /// Restore Intimidating Presence by expending a rage charge.
  pure def pRestoreIntimidatingPresence(bs: BarbarianState): BarbarianState = {
    bs.with("rageCharges", bs.rageCharges - 1)
      .with("intimidatingPresenceUsed", false)
  }

  /// Brutal Strike transition: mark used this turn.
  pure def pBrutalStrike(bs: BarbarianState): BarbarianState = {
    bs.with("brutalStrikeUsedThisTurn", true)
  }

  /// Relentless Rage transition: increment counter.
  pure def pUseRelentlessRage(bs: BarbarianState): BarbarianState = {
    bs.with("relentlessRageTimesUsed", bs.relentlessRageTimesUsed + 1)
  }

  // -- B2 (continued): Lifecycle --

  /// Barbarian start of turn: reset per-turn flags, decrement turns, check maintenance.
  pure def pBarbarianStartTurn(bs: BarbarianState, barbarianLevel: int): BarbarianState = {
    // 1. Check rage maintenance (uses LAST turn's flags)
    val bs1 = pCheckRageMaintenance(bs, barbarianLevel)
    // 2. Reset per-turn flags for the new turn
    val bs2 = bs1.with("attackedOrForcedSaveThisTurn", false)
                  .with("rageExtendedWithBA", false)
                  .with("recklessThisTurn", false)
                  .with("frenzyUsedThisTurn", false)
                  .with("brutalStrikeUsedThisTurn", false)
    // 3. Decrement rage turns (if still raging after maintenance)
    if (bs2.raging and bs2.rageTurnsRemaining > 0)
      bs2.with("rageTurnsRemaining", bs2.rageTurnsRemaining - 1)
    else bs2
  }

  /// Barbarian short rest: regain 1 rage charge (capped), reset relentlessRageTimesUsed.
  pure def pBarbarianShortRest(bs: BarbarianState): BarbarianState = {
    bs.with("rageCharges", intMin(bs.rageCharges + 1, bs.rageMaxCharges))
      .with("relentlessRageTimesUsed", 0)
  }

  /// Barbarian long rest: restore all charges, end rage, reset all flags.
  pure def pBarbarianLongRest(bs: BarbarianState): BarbarianState = {
    pEndRage(bs)
      .with("rageCharges", bs.rageMaxCharges)
      .with("relentlessRageTimesUsed", 0)
      .with("intimidatingPresenceUsed", false)
      .with("recklessThisTurn", false)
      .with("frenzyUsedThisTurn", false)
      .with("brutalStrikeUsedThisTurn", false)
  }

  // -- B3: Rage Query Functions (pure, no state change) --

  /// Rage damage bonus by barbarian level (SRD 5.2.1 Barbarian Features table).
  /// L1-8: +2, L9-15: +3, L16+: +4.
  pure def rageDamageBonus(barbarianLevel: int): int = {
    if (barbarianLevel >= 16) 4
    else if (barbarianLevel >= 9) 3
    else 2
  }

  /// Damage types resisted while raging (SRD: Bludgeoning, Piercing, Slashing).
  val RAGE_RESISTANCE_TYPES: Set[DamageType] = Set(Bludgeoning, Piercing, Slashing)

  /// Returns the set of damage types the barbarian resists while raging.
  /// Empty set if not raging.
  pure def rageResistances(raging: bool): Set[DamageType] = {
    if (raging) Set(Bludgeoning, Piercing, Slashing)
    else Set()
  }

  // ============================================================
  // 17.M MONK RESOURCE FUNCTIONS
  // ============================================================
  // Pure functions for SRD 5.2.1 Monk (Way of the Open Hand).
  // Follows the same pattern as Fighter/Barbarian: type + constants,
  // guards, transitions, lifecycle.

  // -- M0: Constants --

  /// Focus Points pool size by monk level (SRD 5.2.1 Monk Features table).
  /// 0 at L0-1 (no Focus), monkLevel at L2+.
  pure def focusMaxForLevel(monkLevel: int): int = {
    if (monkLevel >= 2) monkLevel
    else 0
  }

  /// Fresh monk state for a given level and Wisdom modifier (for Wholeness of Body).
  /// wholenessMax = WIS mod (1-5 range, caller provides).
  pure def freshMonkState(monkLevel: int, wholenessMax: int): MonkState = {
    val fm = focusMaxForLevel(monkLevel)
    val wMax = if (monkLevel >= 6) wholenessMax else 0
    {
      focusPoints: fm,
      focusMax: fm,
      uncannyMetabolismUsed: false,
      stunningStrikeUsedThisTurn: false,
      wholenessCharges: wMax,
      wholenessMax: wMax,
    }
  }

  // -- M1: Guards --

  /// Can expend Focus Points: have enough points.
  pure def canExpendFocus(ms: MonkState, cost: int): bool = {
    ms.focusPoints >= cost
  }

  /// Can use Stunning Strike: L5+, not used this turn, 1+ FP.
  pure def canStunningStrike(ms: MonkState, monkLevel: int): bool = {
    monkLevel >= 5 and not(ms.stunningStrikeUsedThisTurn) and ms.focusPoints >= 1
  }

  /// Can use Wholeness of Body: L6+ (Open Hand), charges > 0, bonus action free.
  pure def canWholenessOfBody(ms: MonkState, monkLevel: int, bonusActionUsed: bool): bool = {
    monkLevel >= 6 and ms.wholenessCharges > 0 and not(bonusActionUsed)
  }

  /// Can use Uncanny Metabolism: not used this long rest.
  pure def canUncannyMetabolism(ms: MonkState): bool = {
    not(ms.uncannyMetabolismUsed)
  }

  // -- M2: Transitions --

  /// Expend Focus Points (generic).
  pure def pExpendFocus(ms: MonkState, cost: int): MonkState = {
    ms.with("focusPoints", ms.focusPoints - cost)
  }

  /// Flurry of Blows: spend 1 FP. Caller handles BA + extra unarmed strikes.
  pure def pFlurryOfBlows(ms: MonkState): MonkState = {
    pExpendFocus(ms, 1)
  }

  /// Patient Defense (Focus): spend 1 FP. Caller sets dodging + disengaged.
  pure def pPatientDefenseFocus(ms: MonkState): MonkState = {
    pExpendFocus(ms, 1)
  }

  /// Step of the Wind (Focus): spend 1 FP. Caller handles dash + disengage.
  pure def pStepOfTheWindFocus(ms: MonkState): MonkState = {
    pExpendFocus(ms, 1)
  }

  /// Stunning Strike: spend 1 FP, mark used this turn.
  pure def pStunningStrike(ms: MonkState): MonkState = {
    ms.with("focusPoints", ms.focusPoints - 1)
      .with("stunningStrikeUsedThisTurn", true)
  }

  /// Use Wholeness of Body: decrement charges.
  pure def pUseWholenessOfBody(ms: MonkState): MonkState = {
    ms.with("wholenessCharges", ms.wholenessCharges - 1)
  }

  /// Uncanny Metabolism: restore all FP, mark used.
  pure def pUncannyMetabolism(ms: MonkState, monkLevel: int): MonkState = {
    ms.with("focusPoints", focusMaxForLevel(monkLevel))
      .with("uncannyMetabolismUsed", true)
  }

  // -- M3: Lifecycle --

  /// Monk start of turn: reset per-turn flags.
  pure def pMonkStartTurn(ms: MonkState): MonkState = {
    ms.with("stunningStrikeUsedThisTurn", false)
  }

  /// Monk short rest: restore all FP.
  pure def pMonkShortRest(ms: MonkState): MonkState = {
    ms.with("focusPoints", ms.focusMax)
  }

  /// Monk long rest: restore all FP, reset UM flag, restore wholeness charges.
  pure def pMonkLongRest(ms: MonkState): MonkState = {
    ms.with("focusPoints", ms.focusMax)
      .with("uncannyMetabolismUsed", false)
      .with("wholenessCharges", ms.wholenessMax)
  }

  // ============================================================
  // 17.P CLASS STUB FUNCTIONS (prep for parallel integration)
  // ============================================================
  // Minimal fresh/lifecycle functions for each class stub.
  // Worktree agents will replace these with real implementations.

  // -- Paladin --

  /// SRD: Channel Divinity uses by level: 2 at L3, 3 at L11.
  pure def pPaladinChannelDivinityMax(paladinLevel: int): int = {
    if (paladinLevel >= 11) 3
    else if (paladinLevel >= 3) 2
    else 0
  }

  pure def freshPaladinState(paladinLevel: int): PaladinState = {
    val lohMax = if (paladinLevel >= 1) paladinLevel * 5 else 0
    val cdMax = pPaladinChannelDivinityMax(paladinLevel)
    { layOnHandsPool: lohMax, layOnHandsMax: lohMax, channelDivinityCharges: cdMax, channelDivinityMax: cdMax, smiteFreeUsed: false }
  }

  pure def pPaladinStartTurn(ps: PaladinState): PaladinState = ps

  /// SRD: "You regain one of its expended uses when you finish a Short Rest"
  pure def pPaladinShortRest(ps: PaladinState): PaladinState = {
    val newCharges = if (ps.channelDivinityCharges < ps.channelDivinityMax)
      ps.channelDivinityCharges + 1 else ps.channelDivinityCharges
    ps.with("channelDivinityCharges", newCharges)
  }

  /// SRD: Long Rest restores full LoH pool and all CD uses.
  pure def pPaladinLongRest(ps: PaladinState): PaladinState = {
    ps.with("layOnHandsPool", ps.layOnHandsMax).with("channelDivinityCharges", ps.channelDivinityMax).with("smiteFreeUsed", false)
  }

  // -- P1: Guards --

  /// Can use Lay on Hands: pool >= amount, amount > 0.
  /// SRD: "restore a number of Hit Points to that creature, up to the maximum amount remaining in the pool"
  pure def canLayOnHands(ps: PaladinState, amount: int): bool = {
    ps.layOnHandsPool >= amount and amount > 0
  }

  /// Can use Paladin Channel Divinity: L3+, charges > 0.
  /// SRD: "You can use this class's Channel Divinity twice" (L3+)
  pure def canPaladinChannelDivinity(ps: PaladinState, paladinLevel: int): bool = {
    paladinLevel >= 3 and ps.channelDivinityCharges > 0
  }

  // -- P2: Transitions --

  /// Use Lay on Hands: deduct amount from pool.
  /// SRD: "draw power from the pool of healing"
  pure def pUseLayOnHands(ps: PaladinState, amount: int): PaladinState = {
    ps.with("layOnHandsPool", ps.layOnHandsPool - amount)
  }

  /// Use Paladin Channel Divinity: decrement charges.
  pure def pUsePaladinChannelDivinity(ps: PaladinState): PaladinState = {
    ps.with("channelDivinityCharges", ps.channelDivinityCharges - 1)
  }

  /// Can use Divine Smite (slot-based): L2+, has a slot at the chosen level.
  /// SRD: "Paladin's Smite... you can also cast it by expending a spell slot"
  pure def canDivineSmite(paladinLevel: int, slotsCurrent: int -> int, slotLevel: int): bool = {
    paladinLevel >= 2 and slotLevel >= 1 and slotLevel <= 9 and slotsCurrent.get(slotLevel) > 0
  }

  /// Can use free Divine Smite (1/LR): L2+, not yet used.
  /// SRD: "you always have it prepared... cast without a spell slot once per LR"
  pure def canDivineSmiteFree(ps: PaladinState, paladinLevel: int): bool = {
    paladinLevel >= 2 and not(ps.smiteFreeUsed)
  }

  /// Use free Divine Smite: set the flag.
  pure def pUseDivineSmiteFree(ps: PaladinState): PaladinState = {
    ps.with("smiteFreeUsed", true)
  }

  // -- Rogue --
  pure def freshRogueState(rogueLevel: int): RogueState = {
    { sneakAttackUsedThisTurn: false, steadyAimUsedThisTurn: false, cunningStrikeUsesThisTurn: 0 }
  }
  pure def pRogueStartTurn(rs: RogueState): RogueState = {
    rs.with("sneakAttackUsedThisTurn", false).with("steadyAimUsedThisTurn", false).with("cunningStrikeUsesThisTurn", 0)
  }
  pure def pRogueShortRest(rs: RogueState): RogueState = rs
  pure def pRogueLongRest(rs: RogueState): RogueState = rs

  // -- R1: Guards --

  /// Can use Sneak Attack: L1+, not used this turn.
  /// SRD L1: "Once per turn, you can deal an extra 1d6 damage..."
  pure def canSneakAttack(rs: RogueState, rogueLevel: int): bool = {
    rogueLevel >= 1 and not(rs.sneakAttackUsedThisTurn)
  }

  /// Can use Steady Aim: L3+, not used this turn, BA free.
  /// SRD L3: "As a Bonus Action, you give yourself Advantage on your next attack roll..."
  pure def canSteadyAim(rs: RogueState, rogueLevel: int, bonusActionUsed: bool): bool = {
    rogueLevel >= 3 and not(rs.steadyAimUsedThisTurn) and not(bonusActionUsed)
  }

  /// Can use Cunning Action: L2+, bonus action available.
  /// SRD L2: "you can take one of the following actions as a Bonus Action: Dash, Disengage, or Hide."
  pure def canCunningAction(rogueLevel: int, bonusActionUsed: bool): bool = {
    rogueLevel >= 2 and not(bonusActionUsed)
  }

  /// Can use Uncanny Dodge: L5+, reaction available.
  /// SRD L5: "when an attacker that you can see hits you with an attack roll,
  /// you can use your Reaction to halve the attack's damage against you."
  /// Attacker visibility is a caller concern — Quint only gates on level + reaction.
  pure def canUncannyDodge(rogueLevel: int, reactionAvailable: bool): bool = {
    rogueLevel >= 5 and reactionAvailable
  }

  /// Max Cunning Strike effects per SA: 1 at L5, 2 at L11+ (Improved Cunning Strike).
  pure def maxCunningStrikes(rogueLevel: int): int = {
    if (rogueLevel >= 11) 2 else if (rogueLevel >= 5) 1 else 0
  }

  /// Cunning Strike guard: L5+, SA used this turn, uses below max.
  /// SRD L5: "you can add one of the following Cunning Strike effects."
  /// SRD L11: "You can use up to two Cunning Strike effects."
  /// Dice cost and effect details are caller-managed.
  pure def canCunningStrike(rs: RogueState, rogueLevel: int): bool = {
    rogueLevel >= 5 and rs.sneakAttackUsedThisTurn and rs.cunningStrikeUsesThisTurn < maxCunningStrikes(rogueLevel)
  }

  // -- R2: Transitions --

  /// Mark Sneak Attack as used this turn.
  pure def pUseSneakAttack(rs: RogueState): RogueState = {
    rs.with("sneakAttackUsedThisTurn", true)
  }

  /// Use Steady Aim: mark used, sets speed to 0.
  pure def pUseSteadyAim(rs: RogueState): RogueState = {
    rs.with("steadyAimUsedThisTurn", true)
  }

  /// Cunning Strike transition: increment uses counter.
  pure def pCunningStrike(rs: RogueState): RogueState = {
    rs.with("cunningStrikeUsesThisTurn", rs.cunningStrikeUsesThisTurn + 1)
  }

  // -- Cleric --
  /// SRD: Channel Divinity uses by level: 2 at L2, 3 at L6, 4 at L18.
  pure def clericChannelDivinityMax(clericLevel: int): int = {
    if (clericLevel >= 18) 4
    else if (clericLevel >= 6) 3
    else if (clericLevel >= 2) 2
    else 0
  }

  pure def freshClericState(clericLevel: int): ClericState = {
    val cdMax = clericChannelDivinityMax(clericLevel)
    { channelDivinityCharges: cdMax, channelDivinityMax: cdMax }
  }
  pure def pClericStartTurn(cs: ClericState): ClericState = cs
  /// SRD: "You regain one of its expended uses when you finish a Short Rest"
  pure def pClericShortRest(cs: ClericState): ClericState = {
    val newCharges = if (cs.channelDivinityCharges < cs.channelDivinityMax)
      cs.channelDivinityCharges + 1 else cs.channelDivinityCharges
    cs.with("channelDivinityCharges", newCharges)
  }
  pure def pClericLongRest(cs: ClericState): ClericState = {
    cs.with("channelDivinityCharges", cs.channelDivinityMax)
  }

  // -- C1: Guards --

  /// Can use Channel Divinity: L2+, charges > 0.
  /// SRD: "You can use this class's Channel Divinity twice." (Level 2)
  pure def canClericChannelDivinity(cs: ClericState, clericLevel: int): bool = {
    clericLevel >= 2 and cs.channelDivinityCharges > 0
  }

  // -- C2: Transitions --

  /// Use Channel Divinity: decrement charges.
  /// SRD: "You regain one of its expended uses when you finish a Short Rest,
  /// and you regain all expended uses when you finish a Long Rest."
  pure def pUseClericChannelDivinity(cs: ClericState): ClericState = {
    cs.with("channelDivinityCharges", cs.channelDivinityCharges - 1)
  }

  // -- Druid --

  /// SRD 5.2.1 Druid Features table: Wild Shape uses by level.
  /// L2=2, L6=3, L17=4.
  pure def wildShapeMaxCharges(druidLevel: int): int = {
    if (druidLevel >= 17) 4
    else if (druidLevel >= 6) 3
    else if (druidLevel >= 2) 2
    else 0
  }

  pure def freshDruidState(druidLevel: int): DruidState = {
    val wsMax = wildShapeMaxCharges(druidLevel)
    { wildShapeCharges: wsMax, wildShapeMax: wsMax, inWildShape: false, wildResurgenceSlotUsedThisLR: false }
  }

  pure def pDruidStartTurn(ds: DruidState): DruidState = ds

  /// SRD: "You regain one expended use when you finish a Short Rest"
  pure def pDruidShortRest(ds: DruidState): DruidState = {
    val newCharges = if (ds.wildShapeCharges < ds.wildShapeMax)
      ds.wildShapeCharges + 1 else ds.wildShapeCharges
    ds.with("wildShapeCharges", newCharges)
  }

  /// SRD: "you regain all expended uses when you finish a Long Rest"
  pure def pDruidLongRest(ds: DruidState): DruidState = {
    ds.with("wildShapeCharges", ds.wildShapeMax).with("inWildShape", false).with("wildResurgenceSlotUsedThisLR", false)
  }

  // -- D1: Guards --

  /// Can enter Wild Shape: L2+, charges > 0, BA free, not already in WS.
  /// SRD: "As a Bonus Action, you shape-shift into a Beast form"
  pure def canEnterWildShape(ds: DruidState, druidLevel: int, bonusActionUsed: bool): bool = {
    druidLevel >= 2 and ds.wildShapeCharges > 0 and not(bonusActionUsed) and not(ds.inWildShape)
  }

  /// Can exit Wild Shape: currently in WS, BA free.
  /// SRD: "You can also leave the form early as a Bonus Action"
  pure def canExitWildShape(ds: DruidState, bonusActionUsed: bool): bool = {
    ds.inWildShape and not(bonusActionUsed)
  }

  // -- D2: Transitions --

  /// Enter Wild Shape: expend charge, enter beast form.
  pure def pEnterWildShape(ds: DruidState): DruidState = {
    ds.with("wildShapeCharges", ds.wildShapeCharges - 1).with("inWildShape", true)
  }

  /// Exit Wild Shape: revert to normal form.
  pure def pExitWildShape(ds: DruidState): DruidState = {
    ds.with("inWildShape", false)
  }

  /// Wild Resurgence part 1: expend spell slot → regain WS charge.
  /// SRD L5: "if you have no uses of Wild Shape left, you can give yourself
  /// one use by expending a spell slot (no action required)."
  /// Once per turn — modeled as gated on turnPhase == "acting".
  pure def canWildResurgenceForCharge(ds: DruidState, druidLevel: int): bool = {
    druidLevel >= 5 and ds.wildShapeCharges == 0
  }

  pure def pWildResurgenceGainCharge(ds: DruidState): DruidState = {
    ds.with("wildShapeCharges", ds.wildShapeCharges + 1)
  }

  /// Wild Resurgence part 2: expend WS charge → regain L1 spell slot.
  /// SRD: "you can't do so again until you finish a Long Rest."
  pure def canWildResurgenceForSlot(ds: DruidState, druidLevel: int): bool = {
    druidLevel >= 5 and ds.wildShapeCharges > 0 and not(ds.wildResurgenceSlotUsedThisLR)
  }

  pure def pWildResurgenceGainSlot(ds: DruidState): DruidState = {
    ds.with("wildShapeCharges", ds.wildShapeCharges - 1)
      .with("wildResurgenceSlotUsedThisLR", true)
  }

  // -- Sorcerer --
  pure def freshSorcererState(sorcererLevel: int): SorcererState = {
    val spMax = if (sorcererLevel >= 2) sorcererLevel else 0
    {
      sorceryPoints: spMax,
      sorceryPointsMax: spMax,
      sorcerousRestorationUsed: false,
      innateSorceryActive: false,
      innateSorceryCharges: 2,
      innateSorceryTurnsRemaining: 0,
      metamagicUsedThisCast: Set(),
      apotheosisUsedThisTurn: false,
    }
  }

  /// Sorcerer start of turn: decrement Innate Sorcery duration, deactivate at 0.
  /// Also resets metamagic tracking (per-cast set + Apotheosis flag).
  pure def pSorcererStartTurn(ss: SorcererState): SorcererState = {
    val ss1 = ss.with("metamagicUsedThisCast", Set()).with("apotheosisUsedThisTurn", false)
    if (ss1.innateSorceryActive and ss1.innateSorceryTurnsRemaining > 0) {
      val remaining = ss1.innateSorceryTurnsRemaining - 1
      if (remaining == 0)
        ss1.with("innateSorceryTurnsRemaining", 0).with("innateSorceryActive", false)
      else
        ss1.with("innateSorceryTurnsRemaining", remaining)
    } else ss1
  }

  /// Sorcerer short rest: Sorcerous Restoration (L5+, 1/LR).
  /// SRD: "when you finish a Short Rest, you can regain expended Sorcery Points,
  /// but no more than a number equal to half your Sorcerer level (round down)"
  pure def pSorcererShortRest(ss: SorcererState, sorcererLevel: int): SorcererState = {
    if (sorcererLevel >= 5 and not(ss.sorcerousRestorationUsed)) {
      val regain = sorcererLevel / 2
      val newPts = intMin(ss.sorceryPoints + regain, ss.sorceryPointsMax)
      ss.with("sorceryPoints", newPts).with("sorcerousRestorationUsed", true)
    } else ss
  }

  pure def pSorcererLongRest(ss: SorcererState): SorcererState = {
    ss.with("sorceryPoints", ss.sorceryPointsMax)
      .with("sorcerousRestorationUsed", false)
      .with("innateSorceryActive", false)
      .with("innateSorceryCharges", 2)
      .with("innateSorceryTurnsRemaining", 0)
      .with("metamagicUsedThisCast", Set())
      .with("apotheosisUsedThisTurn", false)
  }

  // -- S1: Sorcerer Guards --

  /// Can spend sorcery points: have enough.
  pure def canSpendSorceryPoints(ss: SorcererState, cost: int): bool = {
    ss.sorceryPoints >= cost and cost > 0
  }

  /// Can activate Innate Sorcery: L1+, BA free, charges > 0 OR (L7+ and SP >= 2).
  /// SRD: "you can use a Bonus Action to activate your innate magic for 1 minute"
  /// L7+ Sorcery Incarnate: "spend 2 Sorcery Points when you have no uses left"
  pure def canInnateSorcery(ss: SorcererState, sorcererLevel: int, bonusActionUsed: bool): bool = {
    if (sorcererLevel < 1 or bonusActionUsed) false
    else if (ss.innateSorceryCharges > 0) true
    else sorcererLevel >= 7 and ss.sorceryPoints >= 2
  }

  // -- S2: Sorcerer Transitions --

  /// Spend sorcery points.
  pure def pSpendSorceryPoints(ss: SorcererState, cost: int): SorcererState = {
    ss.with("sorceryPoints", ss.sorceryPoints - cost)
  }

  /// Restore sorcery points (capped at max).
  pure def pRestoreSorceryPoints(ss: SorcererState, amount: int): SorcererState = {
    val newPts = if (ss.sorceryPoints + amount > ss.sorceryPointsMax)
      ss.sorceryPointsMax else ss.sorceryPoints + amount
    ss.with("sorceryPoints", newPts)
  }

  /// Font of Magic slot creation cost (SRD 5.2.1 table).
  /// L1=2, L2=3, L3=5, L4=6, L5=7.
  pure def slotCreationCost(slotLevel: int): int = {
    if (slotLevel == 1) 2
    else if (slotLevel == 2) 3
    else if (slotLevel == 3) 5
    else if (slotLevel == 4) 6
    else if (slotLevel == 5) 7
    else 99
  }

  /// Activate Innate Sorcery: consume charge or SP. Lasts 10 rounds (1 minute).
  /// SRD: "As a Bonus Action, you can unleash that magic for 1 minute"
  pure def pUseInnateSorcery(ss: SorcererState, sorcererLevel: int): SorcererState = {
    val base = ss.with("innateSorceryActive", true).with("innateSorceryTurnsRemaining", 10)
    if (ss.innateSorceryCharges > 0)
      base.with("innateSorceryCharges", ss.innateSorceryCharges - 1)
    else
      // Sorcery Incarnate (L7+): spend 2 SP
      base.with("sorceryPoints", ss.sorceryPoints - 2)
  }

  // -- S3: Metamagic (Level 2+) --

  /// All 10 Metamagic options.
  pure val METAMAGIC_OPTIONS: Set[str] = Set("careful", "distant", "empowered", "extended", "heightened", "quickened", "seeking", "subtle", "transmuted", "twinned")

  /// Options that can stack with another option on the same spell.
  /// SRD: Empowered Spell and Seeking Spell "even if you've already used a different Metamagic option".
  pure val STACKABLE_METAMAGIC: Set[str] = Set("empowered", "seeking")

  /// SP cost for a given Metamagic option: 2 for heightened/quickened, 1 for rest.
  pure def metamagicCost(option: str): int = {
    if (option == "heightened" or option == "quickened") 2 else 1
  }

  /// Whether a Metamagic option bypasses the one-option-per-spell stacking limit.
  pure def canStackWith(option: str): bool = {
    STACKABLE_METAMAGIC.contains(option)
  }

  /// Maximum non-stackable Metamagic options allowed per spell.
  /// SRD L2: 1 per spell. L7 Sorcery Incarnate: 2 when Innate Sorcery active.
  pure def maxMetamagicOptions(ss: SorcererState, sorcererLevel: int): int = {
    if (ss.innateSorceryActive and sorcererLevel >= 7) 2 else 1
  }

  /// Count of non-stackable options already used on the current spell.
  pure def nonStackableCount(ss: SorcererState): int = {
    ss.metamagicUsedThisCast.filter(o => not(canStackWith(o))).size()
  }

  /// Can the sorcerer use a given Metamagic option right now?
  /// Guards: L2+, option is valid, SP sufficient (unless Apotheosis free),
  /// stacking limit respected, Quickened requires BA free and no L1+ action spell cast.
  pure def canUseMetamagic(ss: SorcererState, sorcererLevel: int, option: str,
      bonusActionUsed: bool, nonCantripActionSpellCast: bool): bool = {
    if (sorcererLevel < 2) false
    else if (not(METAMAGIC_OPTIONS.contains(option))) false
    else if (ss.metamagicUsedThisCast.contains(option)) false  // can't use same option twice
    else {
      val withinLimit = if (canStackWith(option)) true
        else nonStackableCount(ss) < maxMetamagicOptions(ss, sorcererLevel)
      if (not(withinLimit)) false
      // SRD line 187: "can't modify a spell in this way if you've already cast a
      // level 1+ spell on the current turn" + BA must be free
      else if (option == "quickened" and (bonusActionUsed or nonCantripActionSpellCast)) false
      // Arcane Apotheosis (L20): 1 free metamagic per turn while Innate Sorcery active
      else if (ss.innateSorceryActive and sorcererLevel >= 20 and not(ss.apotheosisUsedThisTurn))
        true  // free use — SP check not needed
      else canSpendSorceryPoints(ss, metamagicCost(option))
    }
  }

  /// Apply a Metamagic option: spend SP (or mark Apotheosis free use), add to set.
  pure def pUseMetamagic(ss: SorcererState, sorcererLevel: int, option: str): SorcererState = {
    val ss1 = ss.with("metamagicUsedThisCast", ss.metamagicUsedThisCast.union(Set(option)))
    // Arcane Apotheosis (L20): free once per turn while Innate Sorcery active
    if (ss1.innateSorceryActive and sorcererLevel >= 20 and not(ss.apotheosisUsedThisTurn))
      ss1.with("apotheosisUsedThisTurn", true)
    else
      pSpendSorceryPoints(ss1, metamagicCost(option))
  }

  // -- Warlock --
  pure def freshWarlockState(warlockLevel: int): WarlockState = {
    { mysticArcanumUsed: Set(), magicalCunningUsed: false, eldritchSmiteUsedThisTurn: false }
  }
  pure def pWarlockStartTurn(ws: WarlockState): WarlockState = {
    ws.with("eldritchSmiteUsedThisTurn", false)
  }
  /// SRD: Pact Magic slots recover on Short Rest (via pRestorePactSlots in doShortRest).
  /// Magical Cunning recharges on Long Rest only — no SR reset.
  pure def pWarlockShortRest(ws: WarlockState): WarlockState = ws
  pure def pWarlockLongRest(ws: WarlockState): WarlockState = {
    ws.with("mysticArcanumUsed", Set()).with("magicalCunningUsed", false).with("eldritchSmiteUsedThisTurn", false)
  }

  /// Can use Magical Cunning: L2+, not used this LR.
  /// SRD: "you regain expended Pact Magic spell slots but no more than a number
  /// equal to half your maximum (round up). Once you use this feature, you can't
  /// do so again until you finish a Long Rest."
  pure def canMagicalCunning(ws: WarlockState, warlockLevel: int): bool = {
    warlockLevel >= 2 and not(ws.magicalCunningUsed)
  }

  /// Can use Mystic Arcanum: L11+, spell level not already used this LR.
  /// SRD: "You can cast your arcanum spell once without expending a spell slot,
  /// and you must finish a Long Rest before you can cast it in this way again."
  pure def canMysticArcanum(ws: WarlockState, warlockLevel: int, spellLevel: int): bool = {
    warlockLevel >= 11 and not(ws.mysticArcanumUsed.contains(spellLevel))
  }

  /// Use Magical Cunning: set flag. Pact slot recovery is caller-managed.
  pure def pUseMagicalCunning(ws: WarlockState): WarlockState = {
    ws.with("magicalCunningUsed", true)
  }

  /// Use Mystic Arcanum: mark spell level as used this LR.
  pure def pUseMysticArcanum(ws: WarlockState, spellLevel: int): WarlockState = {
    ws.with("mysticArcanumUsed", ws.mysticArcanumUsed.union(Set(spellLevel)))
  }

  /// Eldritch Smite guard: L5+, pact slot available, not used this turn.
  /// SRD: "Once per turn when you hit a creature with your pact weapon,
  /// you can expend a Pact Magic spell slot"
  /// Prerequisite: Level 5+ Warlock, Pact of the Blade Invocation
  pure def canEldritchSmite(ws: WarlockState, warlockLevel: int, pactSlotsCurrent: int): bool = {
    warlockLevel >= 5 and pactSlotsCurrent > 0 and not(ws.eldritchSmiteUsedThisTurn)
  }

  /// Eldritch Smite transition: mark used this turn.
  pure def pEldritchSmite(ws: WarlockState): WarlockState = {
    ws.with("eldritchSmiteUsedThisTurn", true)
  }

  // -- Wizard --
  pure def freshWizardState(wizardLevel: int): WizardState = {
    { arcaneRecoveryUsed: false, overchannelUsesThisLR: 0 }
  }
  pure def pWizardStartTurn(ws: WizardState): WizardState = ws
  pure def pWizardShortRest(ws: WizardState): WizardState = ws
  pure def pWizardLongRest(ws: WizardState): WizardState = {
    ws.with("arcaneRecoveryUsed", false).with("overchannelUsesThisLR", 0)
  }

  /// Can use Arcane Recovery: L1+, not used this LR.
  /// SRD: "When you finish a Short Rest, you can choose expended spell slots to recover."
  pure def canArcaneRecovery(ws: WizardState, wizardLevel: int): bool = {
    wizardLevel >= 1 and not(ws.arcaneRecoveryUsed)
  }

  /// Use Arcane Recovery: set flag. Caller handles slot restoration.
  pure def pUseArcaneRecovery(ws: WizardState): WizardState = {
    ws.with("arcaneRecoveryUsed", true)
  }

  /// Overchannel guard: L14+.
  /// SRD: "When you cast a Wizard spell with a spell slot of levels 1–5
  /// that deals damage, you can deal maximum damage with that spell on
  /// the turn you cast it."
  /// Slot level and damage maximization are caller-managed.
  pure def canOverchannel(wizardLevel: int): bool = {
    wizardLevel >= 14
  }

  /// Overchannel transition: increment uses counter.
  pure def pOverchannel(ws: WizardState): WizardState = {
    ws.with("overchannelUsesThisLR", ws.overchannelUsesThisLR + 1)
  }

  // -- Ranger --

  /// Favored Enemy free Hunter's Mark uses by ranger level.
  /// SRD: 2 (L1-4), 3 (L5-8), 4 (L9-12), 5 (L13-16), 6 (L17-20).
  pure def pFavoredEnemyFreeUses(rangerLevel: int): int = {
    if (rangerLevel <= 0) 0
    else if (rangerLevel < 5) 2
    else if (rangerLevel < 9) 3
    else if (rangerLevel < 13) 4
    else if (rangerLevel < 17) 5
    else 6
  }

  pure def freshRangerState(rangerLevel: int, wisMod: int): RangerState = {
    {
      huntersMarkFreeUses: pFavoredEnemyFreeUses(rangerLevel),
      tirelessCharges: if (rangerLevel >= 10) intMax(1, wisMod) else 0,
      tirelessMax: if (rangerLevel >= 10) intMax(1, wisMod) else 0,
      naturesVeilCharges: if (rangerLevel >= 14) intMax(1, wisMod) else 0,
      naturesVeilMax: if (rangerLevel >= 14) intMax(1, wisMod) else 0,
    }
  }

  pure def pRangerStartTurn(rs: RangerState): RangerState = rs
  pure def pRangerShortRest(rs: RangerState): RangerState = rs
  pure def pRangerLongRest(rs: RangerState, rangerLevel: int): RangerState = {
    { ...rs,
      huntersMarkFreeUses: pFavoredEnemyFreeUses(rangerLevel),
      tirelessCharges: rs.tirelessMax,
      naturesVeilCharges: rs.naturesVeilMax,
    }
  }

  /// Use free Hunter's Mark: decrement free uses.
  pure def pUseFreeHuntersMark(rs: RangerState): RangerState = {
    rs.with("huntersMarkFreeUses", rs.huntersMarkFreeUses - 1)
  }

  /// Use Tireless: spend charge, return temp HP amount.
  /// SRD L10: "1d8 plus your Wisdom modifier (minimum of 1)."
  /// tirelessMax encodes intMax(1, wisMod), so tempHp = d8Roll + tirelessMax.
  pure def pUseTireless(rs: RangerState, d8Roll: int): { ranger: RangerState, tempHp: int } = {
    { ranger: rs.with("tirelessCharges", rs.tirelessCharges - 1),
      tempHp: d8Roll + rs.tirelessMax }
  }

  /// Use Nature's Veil: spend charge. Caller applies Invisible condition to state.
  /// SRD L14: "As a Bonus Action, you can give yourself the Invisible condition
  /// until the end of your next turn."
  pure def pUseNaturesVeil(rs: RangerState): RangerState = {
    rs.with("naturesVeilCharges", rs.naturesVeilCharges - 1)
  }

  // -- Bard --

  pure def freshBardState(bardLevel: int, chaMod: int): BardState = {
    {
      bardicInspirationCharges: if (bardLevel >= 1) intMax(1, chaMod) else 0,
      bardicInspirationMax: if (bardLevel >= 1) intMax(1, chaMod) else 0,
    }
  }

  /// Superior Inspiration L18: restore charges to min 2 on initiative (start of turn).
  pure def pBardStartTurn(bs: BardState, bardLevel: int): BardState = {
    if (bardLevel >= 18 and bs.bardicInspirationCharges < 2)
      bs.with("bardicInspirationCharges", 2)
    else bs
  }

  /// Font of Inspiration L5: full recharge on short rest.
  pure def pBardShortRest(bs: BardState, bardLevel: int): BardState = {
    if (bardLevel >= 5) bs.with("bardicInspirationCharges", bs.bardicInspirationMax)
    else bs
  }

  /// Long rest: full recharge.
  pure def pBardLongRest(bs: BardState): BardState = {
    bs.with("bardicInspirationCharges", bs.bardicInspirationMax)
  }

  /// Use Bardic Inspiration: spend 1 charge. BA cost is caller-managed.
  /// SRD L1: "As a Bonus Action, you can inspire another creature..."
  pure def pUseBardicInspiration(bs: BardState): BardState = {
    bs.with("bardicInspirationCharges", bs.bardicInspirationCharges - 1)
  }

  /// Cutting Words L3 (Lore): spend 1 BI charge. Reaction cost caller-managed.
  /// SRD: "you can take a Reaction to expend one use of your Bardic Inspiration"
  pure def pUseCuttingWords(bs: BardState): BardState = {
    bs.with("bardicInspirationCharges", bs.bardicInspirationCharges - 1)
  }

  /// Font of Inspiration slot restore L5: spend spell slot, regain 1 BI use. Free action.
  /// SRD: "you can expend a spell slot (no action required) to regain one expended use"
  pure def pUseFontSlotRestore(bs: BardState): BardState = {
    bs.with("bardicInspirationCharges", bs.bardicInspirationCharges + 1)
  }

  /// Peerless Skill L14: on ability check/attack roll failure, add BI die.
  /// SRD: "On a failure, the Bardic Inspiration isn't expended."
  /// success = true means the boosted check succeeded → spend charge.
  pure def pUsePeerlessSkill(bs: BardState, success: bool): BardState = {
    if (success) bs.with("bardicInspirationCharges", bs.bardicInspirationCharges - 1)
    else bs
  }

  // ============================================================
  // 17.L MONSTER RESOURCE FUNCTIONS (Phase L)
  // ============================================================
  // Pure functions for Legendary Actions, Legendary Resistance,
  // Recharge abilities, and X/Day abilities.

  // -- ML2.1: Legendary Actions --

  /// Use a legendary action: decrement remaining by cost.
  /// Caller must guard: remaining >= cost.
  pure def pUseLegendaryAction(mrs: MonsterResourceState, actionName: str,
      legendaryActions: str -> LegendaryActionDef): MonsterResourceState = {
    val cost = legendaryActions.get(actionName).cost
    mrs.with("legendaryActionsRemaining", mrs.legendaryActionsRemaining - cost)
  }

  /// Refresh legendary actions to max (start of monster's turn).
  pure def pRefreshLegendaryActions(mrs: MonsterResourceState, maxUses: int,
      inLair: bool): MonsterResourceState = {
    val effective = maxUses + (if (inLair) 1 else 0)
    mrs.with("legendaryActionsRemaining", effective)
  }

  // -- ML2.2: Legendary Resistance --

  /// Use Legendary Resistance: if save failed and LR available, succeed instead.
  /// Returns updated mrs + effective save result.
  pure def pUseLegendaryResistance(mrs: MonsterResourceState, saveSucceeded: bool,
      useLR: bool): { mrs: MonsterResourceState, effectiveSaveResult: bool } = {
    if (saveSucceeded) { mrs: mrs, effectiveSaveResult: true }
    else if (useLR and mrs.legendaryResistancesRemaining > 0)
      { mrs: mrs.with("legendaryResistancesRemaining",
          mrs.legendaryResistancesRemaining - 1),
        effectiveSaveResult: true }
    else { mrs: mrs, effectiveSaveResult: false }
  }

  // -- ML2.3: Recharge Abilities --

  /// Process recharge rolls at start of turn.
  pure def pProcessRechargeRolls(mrs: MonsterResourceState,
      rolls: List[RechargeRollEvent],
      rechargeAbilities: str -> RechargeAbilityDef): MonsterResourceState = {
    rolls.foldl(mrs, (acc, roll) => {
      if (not(rechargeAbilities.keys().contains(roll.abilityName))) acc
      else {
        val minRoll = rechargeAbilities.get(roll.abilityName).rechargeMin
        if (roll.d6Roll >= minRoll)
          acc.with("rechargeAvailable", acc.rechargeAvailable.set(roll.abilityName, true))
        else acc
      }
    })
  }

  /// Use a recharge ability: mark as unavailable.
  pure def pUseRechargeAbility(mrs: MonsterResourceState, name: str): MonsterResourceState = {
    mrs.with("rechargeAvailable", mrs.rechargeAvailable.set(name, false))
  }

  // -- ML2.4: Daily Abilities --

  /// Use a daily ability: decrement remaining uses.
  pure def pUseDailyAbility(mrs: MonsterResourceState, name: str): MonsterResourceState = {
    val current = mrs.dailyUsesRemaining.get(name)
    mrs.with("dailyUsesRemaining", mrs.dailyUsesRemaining.set(name, current - 1))
  }

  /// Refresh all daily abilities to max (long rest).
  pure def pRefreshDailyAbilities(mrs: MonsterResourceState,
      maxUses: str -> int): MonsterResourceState = {
    mrs.with("dailyUsesRemaining", maxUses)
  }

  /// Refresh all recharge abilities (short/long rest).
  pure def pRefreshRechargeAbilities(mrs: MonsterResourceState): MonsterResourceState = {
    val refreshed = mrs.rechargeAvailable.keys().fold(mrs.rechargeAvailable,
      (m, k) => m.set(k, true))
    mrs.with("rechargeAvailable", refreshed)
  }

  // ============================================================
  // 18. CHARACTER CONSTRUCTION & LEVELING (Phase 9)
  // ============================================================
  // PHB Ch1 (character creation), Ch6 (multiclassing, feats).

  // -- 18.1 Class Types & Hit Dice --

  type ClassName =
    | Barbarian | Bard | Cleric | Druid | Fighter | Monk
    | Paladin | Ranger | Rogue | Sorcerer | Warlock | Wizard

  /// Zero-level map for all classes.
  pure val ZERO_CLASS_LEVELS: ClassName -> int = Map(
    Barbarian -> 0, Bard -> 0, Cleric -> 0, Druid -> 0,
    Fighter -> 0, Monk -> 0, Paladin -> 0, Ranger -> 0,
    Rogue -> 0, Sorcerer -> 0, Warlock -> 0, Wizard -> 0
  )

  /// Create classLevels map for a single-class character.
  pure def singleClassLevels(c: ClassName, level: int): ClassName -> int =
    ZERO_CLASS_LEVELS.set(c, level)

  /// Hit die type per class (PHB class tables).
  pure def pClassHitDie(c: ClassName): int = match c {
    | Barbarian => 12
    | Fighter => 10
    | Paladin => 10
    | Ranger => 10
    | Bard => 8
    | Cleric => 8
    | Druid => 8
    | Monk => 8
    | Rogue => 8
    | Warlock => 8
    | Sorcerer => 6
    | Wizard => 6
  }

  // -- 18.2 Ability Score Generation --


  /// Point buy cost for a single ability score (PHB table).
  /// Scores outside 8-15 return 0 (invalid, caller validates range).
  pure def pPointBuyCost(score: int): int =
    if (score <= 8) 0
    else if (score == 9) 1
    else if (score == 10) 2
    else if (score == 11) 3
    else if (score == 12) 4
    else if (score == 13) 5
    else if (score == 14) 7
    else if (score == 15) 9
    else 0

  pure def pPointBuyTotalCost(scores: List[int]): int =
    scores.foldl(0, (acc, s) => acc + pPointBuyCost(s))

  pure def pValidPointBuy(scores: List[int]): bool =
    scores.length() == 6
    and scores.foldl(true, (acc, s) => acc and s >= 8 and s <= 15)
    and pPointBuyTotalCost(scores) <= 27

  // -- 18.3 Level Advancement --

  pure def pXpForLevel(level: int): int =
    if (level <= 1) 0
    else if (level == 2) 300
    else if (level == 3) 900
    else if (level == 4) 2700
    else if (level == 5) 6500
    else if (level == 6) 14000
    else if (level == 7) 23000
    else if (level == 8) 34000
    else if (level == 9) 48000
    else if (level == 10) 64000
    else if (level == 11) 85000
    else if (level == 12) 100000
    else if (level == 13) 120000
    else if (level == 14) 140000
    else if (level == 15) 165000
    else if (level == 16) 195000
    else if (level == 17) 225000
    else if (level == 18) 265000
    else if (level == 19) 305000
    else 355000

  pure def pLevelForXp(xp: int): int =
    if (xp >= 355000) 20
    else if (xp >= 305000) 19
    else if (xp >= 265000) 18
    else if (xp >= 225000) 17
    else if (xp >= 195000) 16
    else if (xp >= 165000) 15
    else if (xp >= 140000) 14
    else if (xp >= 120000) 13
    else if (xp >= 100000) 12
    else if (xp >= 85000) 11
    else if (xp >= 64000) 10
    else if (xp >= 48000) 9
    else if (xp >= 34000) 8
    else if (xp >= 23000) 7
    else if (xp >= 14000) 6
    else if (xp >= 6500) 5
    else if (xp >= 2700) 4
    else if (xp >= 900) 3
    else if (xp >= 300) 2
    else 1

  /// HP at 1st level of first class: max hit die + CON mod (min 1).
  pure def pFirstLevelHp(hitDieType: int, conMod: int): int =
    intMax(1, hitDieType + conMod)

  /// HP gained on level up: dieRoll + CON mod (min 1).
  /// Also used for multiclass level gains (PHB Ch6: NOT max HD).
  pure def pLevelUpHp(dieRoll: int, conMod: int): int =
    intMax(1, dieRoll + conMod)

  /// Fighter gets extra ASI at 6, 14; Rogue at 10 — handled by caller's class features.
  pure val ASI_LEVELS: Set[int] = Set(4, 8, 12, 16, 19)

  pure def pIsASILevel(level: int): bool = ASI_LEVELS.contains(level)

  /// Caller invokes once with +2, or twice with +1 each. Capped at 20.
  pure def pApplyASI(scores: Ability -> int, ability: Ability, increase: int): Ability -> int =
    scores.set(ability, intMin(scores.get(ability) + increase, 20))

  /// When CON modifier changes (e.g., via ASI), HP max adjusts retroactively.
  /// PHB Ch1: "your hit point maximum increases by 1 for each level you have attained."
  pure def pConModHpAdjustment(oldConMod: int, newConMod: int, totalLevel: int): int =
    (newConMod - oldConMod) * totalLevel

  /// Sum all class levels to get total character level.
  pure def pTotalLevel(cl: ClassName -> int): int =
    cl.get(Barbarian) + cl.get(Bard) + cl.get(Cleric) + cl.get(Druid)
    + cl.get(Fighter) + cl.get(Monk) + cl.get(Paladin) + cl.get(Ranger)
    + cl.get(Rogue) + cl.get(Sorcerer) + cl.get(Warlock) + cl.get(Wizard)

  // -- 18.4 Multiclassing --

  pure def pMeetsMulticlassPrereq(scores: Ability -> int, c: ClassName): bool = match c {
    | Barbarian => scores.get(Str) >= 13
    | Bard => scores.get(Cha) >= 13
    | Cleric => scores.get(Wis) >= 13
    | Druid => scores.get(Wis) >= 13
    | Fighter => scores.get(Str) >= 13 or scores.get(Dex) >= 13
    | Monk => scores.get(Dex) >= 13 and scores.get(Wis) >= 13
    | Paladin => scores.get(Str) >= 13 and scores.get(Cha) >= 13
    | Ranger => scores.get(Dex) >= 13 and scores.get(Wis) >= 13
    | Rogue => scores.get(Dex) >= 13
    | Sorcerer => scores.get(Cha) >= 13
    | Warlock => scores.get(Cha) >= 13
    | Wizard => scores.get(Int_) >= 13
  }

  /// Must meet prereqs for BOTH current and new class (PHB Ch6).
  pure def pCanMulticlass(scores: Ability -> int, currentClass: ClassName, newClass: ClassName): bool =
    pMeetsMulticlassPrereq(scores, currentClass) and pMeetsMulticlassPrereq(scores, newClass)

  /// Extra Attack doesn't stack across classes (PHB Ch6).
  pure def pExtraAttackStacks(alreadyHasExtraAttack: bool): bool = not(alreadyHasExtraAttack)

  /// Unarmored Defense can't be gained from a second class (PHB Ch6).
  pure def pCanGainUnarmoredDefense(currentUD: UnarmoredDefense): bool =
    currentUD == NoUnarmoredDefense

  // -- 18.5 Feats (optional rule framework) --
  // PHB Ch6: at ASI levels (pIsASILevel), can forgo ASI to take a feat.
  // Each feat taken only once (unless description says otherwise).
  // Must meet feat prerequisites; losing prerequisite disables feat.
  // Individual feat mechanics are not enumerated — framework only.
  // Caller tracks taken feats and validates prerequisites.

  // ============================================================
  // 19. MBT INFRASTRUCTURE — State Variables, Actions, Invariants
  // ============================================================
  // Required by @firfi/quint-connect for model-based testing.
  // Pattern from savage.qnt: thin action wrappers around pure functions.

  // -- 19.1 State Variables --

  var state: CreatureState
  var turnState: TurnState
  var spellSlots: SpellSlotState
  var turnPhase: str  // "outOfCombat" | "acting" | "waitingForTurn"
  var fighterState: FighterState
  var classLevels: ClassName -> int   // multiclass: maps each class to its level (0 = not taken)
  var creatureKind: CreatureKind
  var monsterStatBlock: StatBlock
  var monsterResourceState: MonsterResourceState
  var barbarianState: BarbarianState
  var monkState: MonkState
  var paladinState: PaladinState
  var rogueState: RogueState
  var clericState: ClericState
  var druidState: DruidState
  var sorcererState: SorcererState
  var warlockState: WarlockState
  var wizardState: WizardState
  var rangerState: RangerState
  var bardState: BardState

  /// Default (empty) monster resources — used for PCs and non-legendary monsters.
  pure val FRESH_MONSTER_RESOURCES: MonsterResourceState = {
    legendaryActionsRemaining: 0,
    legendaryResistancesRemaining: 0,
    rechargeAvailable: Map(),
    dailyUsesRemaining: Map(),
  }

  /// Initialize MonsterResourceState from a stat block, applying lair bonus.
  pure def pInitMonsterResources(sb: StatBlock): MonsterResourceState = {
    val lairBonus = if (sb.inLair) 1 else 0
    {
      legendaryActionsRemaining: sb.legendaryActionUses + lairBonus,
      legendaryResistancesRemaining: sb.legendaryResistanceUses + lairBonus,
      rechargeAvailable: sb.rechargeAbilities.keys().fold(Map(), (m, k) => m.put(k, false)),
      dailyUsesRemaining: sb.dailyAbilities,
    }
  }

  // -- 19.2 Nondeterministic Parameter Ranges --

  pure val HP_RANGE = 1.to(30)
  pure val DAMAGE_RANGE = 0.to(60)
  pure val HEAL_RANGE = 1.to(30)
  pure val D20_RANGE = 1.to(20)
  pure val TEMP_HP_RANGE = 0.to(20)
  pure val EXHAUSTION_ADD_RANGE = 1.to(3)
  pure val SLOT_LEVEL_RANGE = 1.to(9)
  pure val MOVEMENT_RANGE = 5.to(30)
  pure val MOVE_COST_RANGE = 1.to(3)
  pure val HD_ROLL_RANGE = 1.to(12)
  pure val EFFECT_DURATION_RANGE = 1.to(10)
  pure val SPELL_IDS: Set[str] = Set("spell_a", "spell_b", "spell_c")

  pure val CONDITIONS: Set[Condition] = Set(
    CBlinded, CCharmed, CDeafened, CFrightened, CGrappled,
    CIncapacitated, CInvisible, CParalyzed, CPetrified,
    CPoisoned, CProne, CRestrained, CStunned, CUnconscious
  )

  pure val DAMAGE_TYPES: Set[DamageType] = ALL_DAMAGE_TYPES

  pure val ACTION_TYPES: Set[ActionType] = Set(
    AAttack, AMagic, ADash, ADisengage, ADodge,
    AHelp, AHide, AInfluence, AReady, ASearch, AStudy, AUtilize
  )

  pure val SIZES: Set[Size] = Set(Tiny, Small, Medium, Large, Huge, Gargantuan)

  pure val SHOVE_CHOICES: Set[ShoveChoice] = Set(ShoveProne, ShovePush)


  // -- 19.3 Config Derivation --

  /// Base Champion config — the 14 fields that don't change with level.
  /// NOTE: Hardcoded to Champion because it is the only Fighter subclass in
  /// the SRD 5.2.1. Each SRD class has exactly one subclass; no others are
  /// available to model. Parameterize if non-SRD subclasses are ever added.
  pure val BASE_CHAMPION_CONFIG: CharConfig = {
    className: Fighter,
    subclass: Champion,
    species: Human,
    classLevels: singleClassLevels(Fighter, 1),
    fightingStyles: Set(FSDefense),
    abilityScores: Map(Str -> 14, Dex -> 12, Con -> 14, Int_ -> 10, Wis -> 13, Cha -> 8),
    level: 1,
    creatureSize: Medium,
    speeds: Map(Walk -> 30, Fly -> 0, Swim -> 0, Climb -> 0, Burrow -> 0),
    saveProficiencies: Set(Str, Con),
    skillProficiencies: Set(Athletics, Perception),
    expertiseSkills: Set(),
    armorProficiencies: Set(LightArmor, MediumArmor, HeavyArmor),
    hitDieType: 10,
    spellcastingAbility: Wis,
    hasSpellcasting: false,
    unarmoredDefense: NoUnarmoredDefense,
    features: Set(),
    critRange: 20,
    hasFightingStyleFeature: true,
  }

  /// Derive full CharConfig from level (single-class Fighter/Champion convenience).
  /// Level-dependent fields:
  /// - level, classLevels, critRange (Champion Improved/Superior Critical), features (Extra Attack tiers)
  /// NOTE: Hardcoded to Champion (the only Fighter subclass in SRD 5.2.1).
  pure def configForLevel(level: int): CharConfig =
    configFromClassLevels(singleClassLevels(Fighter, level))

  /// Derive full CharConfig from classLevels map. Combines features from all classes.
  /// Champion crit range, Fighter Extra Attack tiers, and single Extra Attack from
  /// Barbarian/Monk/Paladin/Ranger L5+ are all computed.
  pure def configFromClassLevels(cl: ClassName -> int): CharConfig = {
    val totalLvl = pTotalLevel(cl)
    val fLevel = cl.get(Fighter)
    // Fighter Extra Attack tiers (Champion-only for SRD)
    val fighterFeatures = if (fLevel >= 20) Set(FExtraAttack, FExtraAttack2, FExtraAttack3)
      else if (fLevel >= 11) Set(FExtraAttack, FExtraAttack2)
      else if (fLevel >= 5) Set(FExtraAttack)
      else Set()
    // Other classes that grant Extra Attack at L5: Barbarian, Monk, Paladin, Ranger
    val hasExtraAttack = fighterFeatures.contains(FExtraAttack)
      or cl.get(Barbarian) >= 5 or cl.get(Monk) >= 5
      or cl.get(Paladin) >= 5 or cl.get(Ranger) >= 5
    val features = if (hasExtraAttack)
      fighterFeatures.union(Set(FExtraAttack))
    else fighterFeatures
    // Champion Improved/Superior Critical (Fighter subclass)
    val cr = if (fLevel >= 15) 18
      else if (fLevel >= 3) 19
      else 20
    BASE_CHAMPION_CONFIG
      .with("level", totalLvl)
      .with("classLevels", cl)
      .with("critRange", cr)
      .with("features", features)
  }

  // -- 19.3b Test Config --

  pure val TEST_CONFIG: CharConfig = configForLevel(5)

  /// Derive a CharConfig from a StatBlock for monster start-turn processing.
  /// Monsters don't have class features, levels, or fighting styles — only speed matters.
  pure def monsterConfigFromStatBlock(sb: StatBlock): CharConfig =
    BASE_CHAMPION_CONFIG
      .with("level", 0)
      .with("speeds", sb.speeds)
      .with("features", Set())

  pure val FRESH_TURN: TurnState = {
    movementRemaining: 30,
    effectiveSpeed: 30,
    actionsRemaining: 1,
    attackActionUsed: false,
    bonusActionUsed: false,
    reactionAvailable: true,
    freeInteractionUsed: false,
    extraAttacksRemaining: 1,  // Hardcoded; doStartTurn derives correct value from configForLevel. Acceptable: L18+ play is rare.
    disengaged: false,
    dodging: false,
    readiedAction: false,
    bonusActionSpellCast: false,
    nonCantripActionSpellCast: false,
    bonusMovementRemaining: 0,
    bonusMovementOAFree: false,
    actionSurgeActionPending: false,
    slotExpendedThisTurn: false,
  }

  pure val FRESH_SPELL_SLOTS: SpellSlotState = {
    slotsMax: EMPTY_SLOTS,
    slotsCurrent: EMPTY_SLOTS,
    pactSlotsMax: 0,
    pactSlotsCurrent: 0,
    pactSlotLevel: 0,
    concentrationSpellId: "",
  }

  // -- 19.4 Action Init --

  pure val MONSTER_STAT_BLOCKS: Set[StatBlock] = Set(SKELETON, OGRE, ADULT_RED_DRAGON)

  action init = {
    nondet kind = Set(PC, Monster).oneOf()
    nondet l = Set(3, 5, 9, 10, 18).oneOf()
    nondet maxHp = HP_RANGE.oneOf()
    nondet selectedBlock = MONSTER_STAT_BLOCKS.oneOf()
    // A25: class selection — one of 12 SRD classes at level l, others at 0
    nondet pcClass = Set("Fighter", "Barbarian", "Monk", "Wizard", "Rogue", "Cleric", "Paladin", "Warlock", "Sorcerer", "Druid", "Ranger", "Bard").oneOf()
    // D5: Wholeness of Body uses WIS mod; Ranger uses WIS mod; spec uses nondet range 1-5
    nondet wisMod = 1.to(5).oneOf()
    // Bard uses CHA mod for Bardic Inspiration charges
    nondet chaMod = 1.to(5).oneOf()
    if (kind == Monster) {
      val monsterExtraAttacks = if (selectedBlock.multiattack.length() > 0)
        selectedBlock.multiattack.length() - 1 else 0
      val monsterSpeed = selectedBlock.speeds.get(Walk)
      all {
        creatureKind' = Monster,
        monsterStatBlock' = selectedBlock,
        monsterResourceState' = pInitMonsterResources(selectedBlock),
        state' = freshCreature(selectedBlock.maxHp),
        classLevels' = ZERO_CLASS_LEVELS,
        fighterState' = freshFighterState(0),
        barbarianState' = freshBarbarianState(0),
        monkState' = freshMonkState(0, 0),
        paladinState' = freshPaladinState(0),
        rogueState' = freshRogueState(0),
        clericState' = freshClericState(0),
        druidState' = freshDruidState(0),
        sorcererState' = freshSorcererState(0),
        warlockState' = freshWarlockState(0),
        wizardState' = freshWizardState(0),
        rangerState' = freshRangerState(0, 0),
        bardState' = freshBardState(0, 0),
        turnState' = FRESH_TURN
          .with("extraAttacksRemaining", monsterExtraAttacks)
          .with("movementRemaining", monsterSpeed)
          .with("effectiveSpeed", monsterSpeed),
        spellSlots' = FRESH_SPELL_SLOTS,
        turnPhase' = "outOfCombat",
      }
    } else {
      val fLevel = if (pcClass == "Fighter") l else 0
      val bLevel = if (pcClass == "Barbarian") l else 0
      val mLevel = if (pcClass == "Monk") l else 0
      val wLevel = if (pcClass == "Wizard") l else 0
      val rLevel = if (pcClass == "Rogue") l else 0
      val cLevel = if (pcClass == "Cleric") l else 0
      val pLevel = if (pcClass == "Paladin") l else 0
      val wkLevel = if (pcClass == "Warlock") l else 0
      val sLevel = if (pcClass == "Sorcerer") l else 0
      val dLevel = if (pcClass == "Druid") l else 0
      val rnLevel = if (pcClass == "Ranger") l else 0
      val bdLevel = if (pcClass == "Bard") l else 0
      val pcClassLevels = ZERO_CLASS_LEVELS
        .set(Fighter, fLevel).set(Barbarian, bLevel).set(Monk, mLevel)
        .set(Wizard, wLevel).set(Rogue, rLevel).set(Cleric, cLevel)
        .set(Paladin, pLevel).set(Warlock, wkLevel).set(Sorcerer, sLevel)
        .set(Druid, dLevel).set(Ranger, rnLevel).set(Bard, bdLevel)
      all {
        creatureKind' = PC,
        monsterStatBlock' = NULL_STAT_BLOCK,
        monsterResourceState' = FRESH_MONSTER_RESOURCES,
        classLevels' = pcClassLevels,
        state' = freshCreature(maxHp).with("hitDiceRemaining", pcClassLevels),
        fighterState' = freshFighterState(fLevel),
        barbarianState' = freshBarbarianState(bLevel),
        monkState' = freshMonkState(mLevel, wisMod),
        paladinState' = freshPaladinState(pLevel),
        rogueState' = freshRogueState(rLevel),
        clericState' = freshClericState(cLevel),
        druidState' = freshDruidState(dLevel),
        sorcererState' = freshSorcererState(sLevel),
        warlockState' = freshWarlockState(wkLevel),
        wizardState' = freshWizardState(wLevel),
        rangerState' = freshRangerState(rnLevel, wisMod),
        bardState' = freshBardState(bdLevel, chaMod),
        turnState' = FRESH_TURN,
        spellSlots' = pInitSpellSlots(pcClassLevels),
        turnPhase' = "outOfCombat",
      }
    }
  }

  // -- 19.5 Thin Action Wrappers --

  // HP / damage track actions
  action doTakeDamage = {
    nondet amount = DAMAGE_RANGE.oneOf()
    nondet dt = DAMAGE_TYPES.oneOf()
    nondet isCrit = Bool.oneOf()
    val r = pWithConcBreak(spellSlots, state, pTakeDamage(state, amount, dt, Set(), Set(), Set(), isCrit))
    all { state' = r.creature, turnState' = turnState, spellSlots' = r.slots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  action doTakeDamageWithMods = {
    nondet amount = DAMAGE_RANGE.oneOf()
    nondet dt = DAMAGE_TYPES.oneOf()
    nondet isCrit = Bool.oneOf()
    nondet resType = DAMAGE_TYPES.oneOf()
    nondet vulnType = DAMAGE_TYPES.oneOf()
    val r = pWithConcBreak(spellSlots, state, pTakeDamage(state, amount, dt, Set(resType), Set(vulnType), Set(), isCrit))
    all { state' = r.creature, turnState' = turnState, spellSlots' = r.slots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  /// Monster take damage: R/V/I sourced from stat block, monster death at 0 HP.
  action doTakeDamageMonster = {
    nondet amount = DAMAGE_RANGE.oneOf()
    nondet dt = DAMAGE_TYPES.oneOf()
    nondet isCrit = Bool.oneOf()
    val s1 = pTakeDamageAsCreature(state, amount, dt,
      monsterStatBlock.resistances, monsterStatBlock.vulnerabilities,
      monsterStatBlock.damageImmunities, isCrit, Monster)
    val r = pWithConcBreak(spellSlots, state, s1)
    all { state' = r.creature, turnState' = turnState, spellSlots' = r.slots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  action doHeal = {
    nondet amount = HEAL_RANGE.oneOf()
    all { state' = pHeal(state, amount), turnState' = turnState, spellSlots' = spellSlots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  action doGrantTempHp = {
    nondet amount = TEMP_HP_RANGE.oneOf()
    nondet keepOld = Bool.oneOf()
    all { state' = pGrantTempHp(state, amount, keepOld), turnState' = turnState, spellSlots' = spellSlots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  action doDeathSave = {
    nondet roll = D20_RANGE.oneOf()
    nondet roll2 = D20_RANGE.oneOf()
    val effectiveRoll = pFighterDeathSaveRoll(classLevels.get(Fighter), roll, roll2)
    all { state' = pDeathSave(state, effectiveRoll), turnState' = turnState, spellSlots' = spellSlots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  action doStabilize = all {
    state' = pStabilize(state), turnState' = turnState, spellSlots' = spellSlots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState
  }

  action doKnockOut = {
    val r = pWithConcBreak(spellSlots, state, pKnockOut(state))
    all { state' = r.creature, turnState' = turnState, spellSlots' = r.slots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  action doApplyCondition = {
    nondet c = CONDITIONS.oneOf()
    nondet useImmunity = Bool.oneOf()
    nondet immuneCondition = CONDITIONS.oneOf()
    val immunities = if (useImmunity) Set(immuneCondition) else Set()
    val r = pWithConcBreak(spellSlots, state, pApplyCondition(state, c, immunities))
    all { state' = r.creature, turnState' = turnState, spellSlots' = r.slots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  action doRemoveCondition = {
    nondet c = CONDITIONS.oneOf()
    all { state' = pRemoveCondition(state, c), turnState' = turnState, spellSlots' = spellSlots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  // Exhaustion actions
  action doAddExhaustion = {
    nondet levels = EXHAUSTION_ADD_RANGE.oneOf()
    nondet exhaustionImmune = Bool.oneOf()
    val r = pWithConcBreak(spellSlots, state, pAddExhaustion(state, levels, exhaustionImmune))
    all { state' = pMonsterDeathCheck(r.creature, creatureKind), turnState' = turnState, spellSlots' = r.slots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  action doReduceExhaustion = {
    nondet levels = EXHAUSTION_ADD_RANGE.oneOf()
    all { state' = pReduceExhaustion(state, levels), turnState' = turnState, spellSlots' = spellSlots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  // Turn actions
  action unchanged = all { state' = state, turnState' = turnState, spellSlots' = spellSlots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }

  // Combat mode transitions
  action doEnterCombat = {
    if (turnPhase != "outOfCombat") unchanged
    else all { state' = state, turnState' = turnState, spellSlots' = spellSlots, turnPhase' = "waitingForTurn", fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  action doExitCombat = {
    if (turnPhase == "outOfCombat") unchanged
    else all { state' = state, turnState' = turnState, spellSlots' = spellSlots, turnPhase' = "outOfCombat", fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  action doStartTurn = {
    nondet callerSpeedMod = (-10).to(10).oneOf()
    nondet isGrappling = Bool.oneOf()
    nondet grappledSmall = Bool.oneOf()
    nondet deathSaveRoll = D20_RANGE.oneOf()
    nondet deathSaveRoll2 = D20_RANGE.oneOf()
    nondet conMod = (-2).to(5).oneOf()
    nondet numEffects = 0.to(1).oneOf()
    nondet effSpellId = SPELL_IDS.oneOf()
    nondet effHeal = 0.to(5).oneOf()
    nondet effTempHp = 0.to(5).oneOf()
    nondet effSaveResult = Bool.oneOf()
    nondet effDmgAmount = DAMAGE_RANGE.oneOf()
    nondet effDmgType = DAMAGE_TYPES.oneOf()
    nondet effConSave = Bool.oneOf()
    nondet effResType = DAMAGE_TYPES.oneOf()
    nondet effVulnType = DAMAGE_TYPES.oneOf()
    if (turnPhase != "waitingForTurn") unchanged
    else {
      val effects: List[StartOfTurnEffect] = if (numEffects == 0) []
        else [{
          spellId: effSpellId, healAmount: effHeal, tempHpAmount: effTempHp,
          saveResult: effSaveResult, damageAmount: effDmgAmount,
          damageType: effDmgType, conSaveSucceeded: effConSave,
          resistances: Set(effResType), vulnerabilities: Set(effVulnType), immunities: Set()
        }]
      if (creatureKind == Monster) {
        val r = pStartTurnFull(monsterConfigFromStatBlock(monsterStatBlock), state, spellSlots, Unarmored,
          callerSpeedMod, isGrappling, grappledSmall, 0, 0, effects)  // 0 = skip death save
        val monsterExtraAttacks = if (monsterStatBlock.multiattack.length() > 0)
          monsterStatBlock.multiattack.length() - 1 else 0
        // Phase L: refresh legendary actions + process recharge rolls
        val mrs1 = pRefreshLegendaryActions(monsterResourceState,
          monsterStatBlock.legendaryActionUses, monsterStatBlock.inLair)
        // Recharge rolls: generate one roll per unavailable recharge ability
        nondet rechargeRollVal = 1.to(6).oneOf()
        val rechargeRolls: List[RechargeRollEvent] = monsterStatBlock.rechargeAbilities.keys().fold(
          [], (acc, name) =>
            if (not(mrs1.rechargeAvailable.get(name)))
              acc.append({ abilityName: name, d6Roll: rechargeRollVal })
            else acc)
        val mrs2 = pProcessRechargeRolls(mrs1, rechargeRolls, monsterStatBlock.rechargeAbilities)
        all {
          state' = pMonsterDeathCheck(r.creature, creatureKind),
          turnState' = r.turn.with("extraAttacksRemaining", monsterExtraAttacks),
          spellSlots' = r.slots,
          turnPhase' = "acting",
          fighterState' = fighterState,  // unchanged for monsters
          classLevels' = classLevels,
          creatureKind' = creatureKind,
          monsterStatBlock' = monsterStatBlock,
          monsterResourceState' = mrs2,
          barbarianState' = barbarianState,
          monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
        }
      } else {
        // PC start turn: derive config from classLevels (multiclass-aware)
        val pcConfig = configFromClassLevels(classLevels)
        val r = pStartTurnFull(pcConfig, state, spellSlots, Unarmored,
          callerSpeedMod, isGrappling, grappledSmall, deathSaveRoll, deathSaveRoll2, effects)
        // Heroic Rally (Champion L18): heal 5 + conMod if Bloodied
        val afterRally = pHeroicRally(r.creature, classLevels.get(Fighter), conMod)
        all {
          state' = afterRally,
          turnState' = r.turn,
          spellSlots' = r.slots,
          turnPhase' = "acting",
          fighterState' = pFighterStartTurn(fighterState, classLevels.get(Fighter)),
          classLevels' = classLevels,
          creatureKind' = creatureKind,
          monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState,
          barbarianState' = pBarbarianStartTurn(barbarianState, classLevels.get(Barbarian)),
         
          monkState' = pMonkStartTurn(monkState),
         
          paladinState' = pPaladinStartTurn(paladinState),
          rogueState' = pRogueStartTurn(rogueState),
          clericState' = pClericStartTurn(clericState),
          druidState' = pDruidStartTurn(druidState),
          sorcererState' = pSorcererStartTurn(sorcererState),
          warlockState' = pWarlockStartTurn(warlockState),
          wizardState' = pWizardStartTurn(wizardState),
          rangerState' = pRangerStartTurn(rangerState),
          bardState' = pBardStartTurn(bardState, classLevels.get(Bard)),
        }
      }
    }
  }

  action doUseAction = {
    nondet at = ACTION_TYPES.oneOf()
    if (turnPhase != "acting") unchanged
    else all { state' = state, turnState' = pUseAction(turnState, state, at), spellSlots' = spellSlots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  action doUseBonusAction = {
    if (turnPhase != "acting") unchanged
    else all { state' = state, turnState' = pUseBonusAction(turnState, state), spellSlots' = spellSlots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  action doUseReaction = {
    if (turnPhase != "acting") unchanged
    else all { state' = state, turnState' = pUseReaction(turnState), spellSlots' = spellSlots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  action doUseMovement = {
    nondet feet = MOVEMENT_RANGE.oneOf()
    nondet cost = MOVE_COST_RANGE.oneOf()
    if (turnPhase != "acting") unchanged
    else all { state' = state, turnState' = pUseMovement(turnState, feet, cost), spellSlots' = spellSlots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  action doUseExtraAttack = {
    if (turnPhase != "acting") unchanged
    else all { state' = state, turnState' = pUseExtraAttack(turnState), spellSlots' = spellSlots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  action doStandFromProne = {
    if (turnPhase != "acting") unchanged
    // Can't stand if incapacitated (unconscious, paralyzed, etc.)
    else if (isIncapacitated(state)) unchanged
    else {
      val t1 = pStandFromProne(turnState)
      val s1 = if (t1 != turnState) pRemoveCondition(state, CProne) else state
      all { state' = s1, turnState' = t1, spellSlots' = spellSlots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
    }
  }

  action doDropProne = {
    if (turnPhase != "acting") unchanged
    else all { state' = pDropProne(state, turnState.effectiveSpeed), turnState' = turnState, spellSlots' = spellSlots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  action doMarkBonusActionSpell = {
    if (turnPhase != "acting") unchanged
    else all { state' = state, turnState' = pMarkBonusActionSpell(turnState), spellSlots' = spellSlots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  action doMarkNonCantripActionSpell = {
    if (turnPhase != "acting") unchanged
    else all { state' = state, turnState' = pMarkNonCantripActionSpell(turnState), spellSlots' = spellSlots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  // Spell slot actions (A1: requires ability to act — see ASSUMPTIONS.md)
  action doExpendSlot = {
    nondet level = SLOT_LEVEL_RANGE.oneOf()
    val ss1 = if (isConscious(state) and pCanAct(state)) pExpendSlot(spellSlots, level) else spellSlots
    all { state' = state, turnState' = turnState, spellSlots' = ss1, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  action doExpendPactSlot = {
    val ss1 = if (isConscious(state) and pCanAct(state)) pExpendPactSlot(spellSlots) else spellSlots
    all { state' = state, turnState' = turnState, spellSlots' = ss1, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  action doStartConcentration = {
    nondet spellId = SPELL_IDS.oneOf()
    nondet duration = EFFECT_DURATION_RANGE.oneOf()
    if (state.dead or isIncapacitated(state)) unchanged
    else {
      val effects1 = pRemoveEffect(state.activeEffects, spellSlots.concentrationSpellId)
      val effects2 = pAddEffectSimple(effects1, spellId, duration, AtEndOfTurn, "")
      val ss1 = pStartConcentration(spellSlots, spellId)
      all { state' = state.with("activeEffects", effects2), turnState' = turnState, spellSlots' = ss1, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
    }
  }

  action doBreakConcentration = {
    val ss1 = pBreakConcentration(spellSlots)
    val effects1 = pEffectsOnConcBreak(spellSlots, ss1, state.activeEffects)
    all { state' = state.with("activeEffects", effects1), turnState' = turnState, spellSlots' = ss1, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  action doConcentrationCheck = {
    nondet saveSucceeded = Bool.oneOf()
    val ss1 = pConcentrationCheck(spellSlots, saveSucceeded)
    val effects1 = pEffectsOnConcBreak(spellSlots, ss1, state.activeEffects)
    all { state' = state.with("activeEffects", effects1), turnState' = turnState, spellSlots' = ss1, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  // Active effect actions
  action doAddEffect = {
    nondet spellId = SPELL_IDS.oneOf()
    nondet duration = EFFECT_DURATION_RANGE.oneOf()
    nondet expiresAt = Set(AtStartOfTurn, AtEndOfTurn).oneOf()
    all { state' = state.with("activeEffects", pAddEffectSimple(state.activeEffects, spellId, duration, expiresAt, "")), turnState' = turnState, spellSlots' = spellSlots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  action doRemoveEffect = {
    nondet spellId = SPELL_IDS.oneOf()
    all { state' = state.with("activeEffects", pRemoveEffect(state.activeEffects, spellId)), turnState' = turnState, spellSlots' = spellSlots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  // Rest actions
  action doSpendHitDie = {
    nondet className = Set(Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard).oneOf()
    nondet conMod = (-2).to(5).oneOf()
    nondet dieRoll = HD_ROLL_RANGE.oneOf()
    all { state' = pSpendHitDie(state, className, conMod, dieRoll), turnState' = turnState, spellSlots' = spellSlots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  action doShortRest = {
    nondet conMod = (-2).to(5).oneOf()
    nondet numDice = 0.to(3).oneOf()
    nondet c1 = Set(Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard).oneOf()
    nondet c2 = Set(Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard).oneOf()
    nondet c3 = Set(Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard).oneOf()
    nondet r1 = HD_ROLL_RANGE.oneOf()
    nondet r2 = HD_ROLL_RANGE.oneOf()
    nondet r3 = HD_ROLL_RANGE.oneOf()
    if (turnPhase != "outOfCombat") unchanged
    else {
      val rolls = [(c1, r1), (c2, r2), (c3, r3)].slice(0, numDice)
      // Phase L: recharge abilities refresh on short rest
      val mrs1 = pRefreshRechargeAbilities(monsterResourceState)
      all {
        state' = pShortRest(state, conMod, rolls),
        turnState' = turnState,
        spellSlots' = pRestorePactSlots(spellSlots),
        turnPhase' = turnPhase,
        fighterState' = pFighterShortRest(fighterState),
        classLevels' = classLevels,
        creatureKind' = creatureKind,
        monsterStatBlock' = monsterStatBlock,
        monsterResourceState' = mrs1,
        barbarianState' = pBarbarianShortRest(barbarianState),
       
        monkState' = pMonkShortRest(monkState),
       
        paladinState' = pPaladinShortRest(paladinState),
        rogueState' = pRogueShortRest(rogueState),
        clericState' = pClericShortRest(clericState),
        druidState' = pDruidShortRest(druidState),
        sorcererState' = pSorcererShortRest(sorcererState, classLevels.get(Sorcerer)),
        warlockState' = pWarlockShortRest(warlockState),
        wizardState' = pWizardShortRest(wizardState),
        rangerState' = pRangerShortRest(rangerState),
        bardState' = pBardShortRest(bardState, classLevels.get(Bard)),
      }
    }
  }

  action doLongRest = {
    // SRD 5.2.1: "To start a Long Rest, you must have at least 1 Hit Point."
    if (turnPhase != "outOfCombat" or state.hp < 1) unchanged
    else {
      // Phase L: refresh recharge, daily, and legendary resistance on long rest
      val mrs1 = pRefreshRechargeAbilities(monsterResourceState)
      val mrs2 = pRefreshDailyAbilities(mrs1, monsterStatBlock.dailyAbilities)
      val mrs3 = mrs2.with("legendaryResistancesRemaining",
        monsterStatBlock.legendaryResistanceUses + (if (monsterStatBlock.inLair) 1 else 0))
      // Restore slots: recompute max from multiclass caster level, then fill to max
      val freshSlots = pInitSpellSlots(classLevels)
      all {
        state' = pLongRest(state, classLevels),
        turnState' = turnState,
        // Long rest restores all slots to multiclass-computed max; preserve concentration
        spellSlots' = freshSlots.with("concentrationSpellId", spellSlots.concentrationSpellId),
        turnPhase' = turnPhase,
        fighterState' = pFighterLongRest(fighterState),
        classLevels' = classLevels,
        creatureKind' = creatureKind,
        monsterStatBlock' = monsterStatBlock,
        monsterResourceState' = mrs3,
        barbarianState' = pBarbarianLongRest(barbarianState),
       
        monkState' = pMonkLongRest(monkState),
       
        paladinState' = pPaladinLongRest(paladinState),
        rogueState' = pRogueLongRest(rogueState),
        clericState' = pClericLongRest(clericState),
        druidState' = pDruidLongRest(druidState),
        sorcererState' = pSorcererLongRest(sorcererState),
        warlockState' = pWarlockLongRest(warlockState),
        wizardState' = pWizardLongRest(wizardState),
        rangerState' = pRangerLongRest(rangerState, classLevels.get(Ranger)),
        bardState' = pBardLongRest(bardState),
      }
    }
  }

  // Environmental actions
  action doApplyFall = {
    nondet damageRoll = DAMAGE_RANGE.oneOf()
    val r = pWithConcBreak(spellSlots, state, pApplyFall(state, damageRoll, Set(), Set(), Set()))
    all { state' = pMonsterDeathCheck(r.creature, creatureKind), turnState' = turnState, spellSlots' = r.slots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  action doSuffocate = {
    val r = pWithConcBreak(spellSlots, state, pSuffocate(state, creatureKind))
    all { state' = r.creature, turnState' = turnState, spellSlots' = r.slots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  action doApplyStarvation = {
    val r = pWithConcBreak(spellSlots, state, pApplyStarvation(state))
    all { state' = pMonsterDeathCheck(r.creature, creatureKind), turnState' = turnState, spellSlots' = r.slots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  action doApplyDehydration = {
    val r = pWithConcBreak(spellSlots, state, pApplyDehydration(state))
    all { state' = pMonsterDeathCheck(r.creature, creatureKind), turnState' = turnState, spellSlots' = r.slots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  // Grapple/Shove actions (applied to self as target)
  action doGrapple = {
    nondet atkSize = SIZES.oneOf()
    nondet tgtSize = SIZES.oneOf()
    nondet saveFailed = Bool.oneOf()
    nondet freeHand = Bool.oneOf()
    val result = pGrapple(atkSize, tgtSize, state, saveFailed, freeHand)
    all { state' = result.targetState, turnState' = turnState, spellSlots' = spellSlots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  action doReleaseGrapple = all {
    state' = pReleaseGrapple(state), turnState' = turnState, spellSlots' = spellSlots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState
  }

  action doEscapeGrapple = {
    nondet escaped = Bool.oneOf()
    all { state' = pEscapeGrapple(state, escaped), turnState' = turnState, spellSlots' = spellSlots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  action doShove = {
    nondet atkSize = SIZES.oneOf()
    nondet tgtSize = SIZES.oneOf()
    nondet saveFailed = Bool.oneOf()
    nondet choice = SHOVE_CHOICES.oneOf()
    val result = pShove(atkSize, tgtSize, state, saveFailed, choice)
    all { state' = result.targetState, turnState' = turnState, spellSlots' = spellSlots, turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels, creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState, barbarianState' = barbarianState, monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState }
  }

  // -- 19.6 doEndTurn Action --

  action doEndTurn = {
    if (turnPhase != "acting") unchanged
    else {
      nondet numSaves = 0.to(1).oneOf()
      nondet saveSpellId = SPELL_IDS.oneOf()
      nondet saveSucceeded = Bool.oneOf()
      nondet saveCondition = CONDITIONS.oneOf()
      // Phase L: Legendary Resistance on end-of-turn saves
      nondet useLR = Bool.oneOf()
      val lrResult = if (creatureKind == Monster and numSaves > 0)
        pUseLegendaryResistance(monsterResourceState, saveSucceeded, useLR)
      else { mrs: monsterResourceState, effectiveSaveResult: saveSucceeded }
      val effectiveSave = lrResult.effectiveSaveResult
      val saves = if (numSaves == 0) []
        else [{ spellId: saveSpellId, saveSucceeded: effectiveSave, conditionsToRemove: Set(saveCondition) }]
      nondet numDmg = 0.to(1).oneOf()
      nondet dmgSpellId = SPELL_IDS.oneOf()
      nondet dmgAmount = DAMAGE_RANGE.oneOf()
      nondet dmgType = DAMAGE_TYPES.oneOf()
      nondet conSave = Bool.oneOf()
      nondet dmgResType = DAMAGE_TYPES.oneOf()
      nondet dmgVulnType = DAMAGE_TYPES.oneOf()
      // Monster end-of-turn: R/V/I from stat block; PC: from nondeterministic generation
      val dmgRes = if (creatureKind == Monster) monsterStatBlock.resistances else Set(dmgResType)
      val dmgVuln = if (creatureKind == Monster) monsterStatBlock.vulnerabilities else Set(dmgVulnType)
      val dmgImm = if (creatureKind == Monster) monsterStatBlock.damageImmunities else Set()
      val damages = if (numDmg == 0) []
        else [{ spellId: dmgSpellId, damage: dmgAmount, damageType: dmgType, conSaveSucceeded: conSave, resistances: dmgRes, vulnerabilities: dmgVuln, immunities: dmgImm }]
      val result = pEndTurn(state, spellSlots, saves, damages)
      all {
        state' = pMonsterDeathCheck(result.creature, creatureKind),
        turnState' = turnState,
        spellSlots' = result.slots,
        turnPhase' = "waitingForTurn",
        fighterState' = fighterState,
        classLevels' = classLevels,
        creatureKind' = creatureKind,
        monsterStatBlock' = monsterStatBlock,
        monsterResourceState' = lrResult.mrs,
        barbarianState' = barbarianState,
        monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
      }
    }
  }

  // -- 19.6b Fighter Class Actions --

  action doUseSecondWind = {
    nondet d10Roll = 1.to(10).oneOf()
    if (turnPhase != "acting" or not(canUseSecondWind(fighterState, turnState, state))) unchanged
    else {
      val result = pUseSecondWind(state, fighterState, d10Roll, classLevels.get(Fighter))
      // Tactical Shift (Fighter L5): on Second Wind, grant half-speed OA-free bonus movement
      val ts1 = turnState.with("bonusActionUsed", true)
      val ts2 = if (classLevels.get(Fighter) >= 5) pGrantBonusMovement(ts1, turnState.effectiveSpeed, true) else ts1
      all {
        state' = result.creature,
        turnState' = ts2,
        spellSlots' = spellSlots,
        turnPhase' = turnPhase,
        fighterState' = result.fighter,
        classLevels' = classLevels,
        creatureKind' = creatureKind,
        monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState,
        barbarianState' = barbarianState,
        monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
      }
    }
  }

  action doUseActionSurge = {
    if (turnPhase != "acting" or not(canUseActionSurge(fighterState, state))) unchanged
    else {
      val result = pUseActionSurge(turnState, fighterState)
      all {
        state' = state,
        turnState' = result.turn,
        spellSlots' = spellSlots,
        turnPhase' = turnPhase,
        fighterState' = result.fighter,
        classLevels' = classLevels,
        creatureKind' = creatureKind,
        monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState,
        barbarianState' = barbarianState,
        monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
      }
    }
  }

  action doUseIndomitable = {
    if (turnPhase != "acting" or not(canUseIndomitable(classLevels.get(Fighter), fighterState))) unchanged
    else all {
      state' = state,
      turnState' = turnState,
      spellSlots' = spellSlots,
      turnPhase' = turnPhase,
      fighterState' = pUseIndomitable(fighterState),
      classLevels' = classLevels,
      creatureKind' = creatureKind,
      monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState,
      barbarianState' = barbarianState,
      monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  action doUseTacticalMind = {
    nondet boostedCheckSucceeds = Bool.oneOf()
    if (turnPhase != "acting" or not(canUseTacticalMind(classLevels.get(Fighter), fighterState)) or isIncapacitated(state)) unchanged
    else all {
      state' = state,
      turnState' = turnState,
      spellSlots' = spellSlots,
      turnPhase' = turnPhase,
      fighterState' = pUseTacticalMind(fighterState, boostedCheckSucceeds),
      classLevels' = classLevels,
      creatureKind' = creatureKind,
      monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState,
      barbarianState' = barbarianState,
      monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  /// Use Heroic Inspiration: spend inspiration (e.g. to reroll a d20).
  /// SRD 5.2.1 Champion L10 Heroic Warrior: inspiration granted at start of turn,
  /// consumed when used.
  action doUseHeroicInspiration = {
    if (not(fighterState.heroicInspiration)) unchanged
    else all {
      state' = state,
      turnState' = turnState,
      spellSlots' = spellSlots,
      turnPhase' = turnPhase,
      fighterState' = fighterState.with("heroicInspiration", false),
      classLevels' = classLevels,
      creatureKind' = creatureKind,
      monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState,
      barbarianState' = barbarianState,
      monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  // -- 19.6c Remarkable Athlete (Champion L3) --

  /// Remarkable Athlete: after scoring a Critical Hit, move up to half Speed without OAs.
  /// SRD 5.2.1 Champion L3: "immediately after you score a Critical Hit, you can move up to
  /// half your Speed without provoking Opportunity Attacks."
  action doScoreCriticalHit = {
    if (turnPhase != "acting" or classLevels.get(Fighter) < 3 or isIncapacitated(state)) unchanged
    else all {
      state' = state,
      turnState' = pGrantBonusMovement(turnState, turnState.effectiveSpeed, true),
      spellSlots' = spellSlots,
      turnPhase' = turnPhase,
      fighterState' = fighterState,
      classLevels' = classLevels,
      creatureKind' = creatureKind,
      monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState,
      barbarianState' = barbarianState,
      monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  // -- 19.6d Bonus Movement Action --

  action doUseBonusMovement = {
    nondet feet = 1.to(15).oneOf()
    if (turnPhase != "acting" or not(canUseBonusMovement(turnState))) unchanged
    else all {
      state' = state,
      turnState' = pUseBonusMovement(turnState, feet),
      spellSlots' = spellSlots,
      turnPhase' = turnPhase,
      fighterState' = fighterState,
      classLevels' = classLevels,
      creatureKind' = creatureKind,
      monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState,
      barbarianState' = barbarianState,
      monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  // -- 19.6f Barbarian Class Actions --

  /// Enter Rage: bonus action, must have charges and not raging.
  /// SRD L1: "You can enter it as a Bonus Action if you aren't wearing Heavy armor."
  action doEnterRage = {
    if (turnPhase != "acting" or turnState.bonusActionUsed or isIncapacitated(state)
        or not(canEnterRage(barbarianState))) unchanged
    else all {
      state' = state,
      turnState' = turnState.with("bonusActionUsed", true),
      spellSlots' = spellSlots,
      turnPhase' = turnPhase,
      fighterState' = fighterState, classLevels' = classLevels,
      creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
      monsterResourceState' = monsterResourceState,
      barbarianState' = pEnterRage(barbarianState),
      monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  /// End Rage voluntarily (free action).
  action doEndRage = {
    if (not(barbarianState.raging)) unchanged
    else all {
      state' = state, turnState' = turnState, spellSlots' = spellSlots,
      turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
      creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
      monsterResourceState' = monsterResourceState,
      barbarianState' = pEndRage(barbarianState),
      monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  /// Extend Rage with bonus action.
  /// SRD: "Take a Bonus Action to extend your Rage."
  action doExtendRageBA = {
    if (turnPhase != "acting" or not(barbarianState.raging) or turnState.bonusActionUsed) unchanged
    else all {
      state' = state,
      turnState' = turnState.with("bonusActionUsed", true),
      spellSlots' = spellSlots,
      turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
      creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
      monsterResourceState' = monsterResourceState,
      barbarianState' = pExtendRageBA(barbarianState),
      monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  /// Mark attack or forced save (bookkeeping for rage maintenance).
  action doMarkAttackOrForcedSave = {
    if (not(barbarianState.raging)) unchanged
    else all {
      state' = state, turnState' = turnState, spellSlots' = spellSlots,
      turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
      creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
      monsterResourceState' = monsterResourceState,
      barbarianState' = pMarkAttackOrForcedSave(barbarianState),
      monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  /// Declare Reckless Attack this turn (free, once per turn).
  /// SRD L2: "When you make your first attack roll on your turn, you can decide to attack recklessly."
  action doDeclareReckless = {
    if (turnPhase != "acting" or barbarianState.recklessThisTurn or classLevels.get(Barbarian) < 2) unchanged
    else all {
      state' = state, turnState' = turnState, spellSlots' = spellSlots,
      turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
      creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
      monsterResourceState' = monsterResourceState,
      barbarianState' = pDeclareReckless(barbarianState),
      monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  /// Use Intimidating Presence: bonus action, L14+.
  action doUseIntimidatingPresence = {
    if (turnPhase != "acting" or not(canUseIntimidatingPresence(barbarianState, classLevels.get(Barbarian), turnState.bonusActionUsed))) unchanged
    else all {
      state' = state,
      turnState' = turnState.with("bonusActionUsed", true),
      spellSlots' = spellSlots,
      turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
      creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
      monsterResourceState' = monsterResourceState,
      barbarianState' = pUseIntimidatingPresence(barbarianState),
      monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  /// Restore Intimidating Presence by expending a rage charge (free action).
  action doRestoreIntimidatingPresence = {
    if (not(canRestoreIntimidatingPresence(barbarianState, classLevels.get(Barbarian)))) unchanged
    else all {
      state' = state, turnState' = turnState, spellSlots' = spellSlots,
      turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
      creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
      monsterResourceState' = monsterResourceState,
      barbarianState' = pRestoreIntimidatingPresence(barbarianState),
      monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  /// Brutal Strike: forgo Reckless advantage for +1d10 damage + effect.
  /// SRD L9: "If you use Reckless Attack, you can forgo any Advantage on one
  /// Strength-based attack roll of your choice on your turn."
  /// Damage and effect details are caller-managed.
  action doBrutalStrike = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or not(canBrutalStrike(barbarianState, classLevels.get(Barbarian)))) unchanged
    else all {
      state' = state,
      turnState' = turnState,
      spellSlots' = spellSlots,
      turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
      creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
      monsterResourceState' = monsterResourceState,
      barbarianState' = pBrutalStrike(barbarianState),
      monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  /// Relentless Rage: CON save to stay at 2×classLevels.get(Barbarian) HP when dropping to 0.
  /// SRD L11: "If you drop to 0 Hit Points while your Rage is active and don't
  /// die outright, you can make a DC 10 Constitution saving throw."
  /// NOT gated on turnPhase — fires during damage resolution.
  action doUseRelentlessRage = {
    if (isIncapacitated(state)
        or not(canRelentlessRage(barbarianState, classLevels.get(Barbarian)))) unchanged
    else {
      nondet conSaveSucceeded = Set(true, false).oneOf()
      val bs1 = pUseRelentlessRage(barbarianState)
      val newState = if (conSaveSucceeded) state.with("hp", 2 * classLevels.get(Barbarian)) else state
      all {
        state' = newState,
        turnState' = turnState,
        spellSlots' = spellSlots,
        turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
        creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
        monsterResourceState' = monsterResourceState,
        barbarianState' = bs1,
        monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
      }
    }
  }

  // -- 19.6g Monk Class Actions --

  /// Flurry of Blows: BA + 1 FP, L2+. Grants 2 extra unarmed strikes (caller-side).
  /// SRD L2: "you can spend 1 Focus Point and make two Unarmed Strikes as a Bonus Action."
  action doFlurryOfBlows = {
    if (turnPhase != "acting" or turnState.bonusActionUsed or isIncapacitated(state)
        or classLevels.get(Monk) < 2 or not(canExpendFocus(monkState, 1))) unchanged
    else all {
      state' = state,
      turnState' = turnState.with("bonusActionUsed", true),
      spellSlots' = spellSlots,
      turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
      creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
      monsterResourceState' = monsterResourceState,
      barbarianState' = barbarianState,
      monkState' = pFlurryOfBlows(monkState), paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  /// Patient Defense (Free): BA only, L2+. Sets disengaged.
  /// SRD L2: "you can take the Disengage action as a Bonus Action."
  action doPatientDefenseFree = {
    if (turnPhase != "acting" or turnState.bonusActionUsed or isIncapacitated(state)
        or classLevels.get(Monk) < 2) unchanged
    else all {
      state' = state,
      turnState' = turnState.with("bonusActionUsed", true).with("disengaged", true),
      spellSlots' = spellSlots,
      turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
      creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
      monsterResourceState' = monsterResourceState,
      barbarianState' = barbarianState,
      monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  /// Patient Defense (Focus): BA + 1 FP. Sets dodging + disengaged.
  /// SRD L2: "you can spend 1 Focus Point to also take the Dodge action."
  action doPatientDefenseFocus = {
    if (turnPhase != "acting" or turnState.bonusActionUsed or isIncapacitated(state)
        or classLevels.get(Monk) < 2 or not(canExpendFocus(monkState, 1))) unchanged
    else all {
      state' = state,
      turnState' = turnState.with("bonusActionUsed", true).with("dodging", true).with("disengaged", true),
      spellSlots' = spellSlots,
      turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
      creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
      monsterResourceState' = monsterResourceState,
      barbarianState' = barbarianState,
      monkState' = pPatientDefenseFocus(monkState), paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  /// Step of the Wind (Free): BA only, L2+. Dash action.
  /// SRD L2: "you can take the Dash action as a Bonus Action."
  action doStepOfTheWindFree = {
    if (turnPhase != "acting" or turnState.bonusActionUsed or isIncapacitated(state)
        or classLevels.get(Monk) < 2) unchanged
    else all {
      state' = state,
      turnState' = pBonusActionDash(turnState, state),
      spellSlots' = spellSlots,
      turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
      creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
      monsterResourceState' = monsterResourceState,
      barbarianState' = barbarianState,
      monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  /// Step of the Wind (Focus): BA + 1 FP. Dash + Disengage.
  /// SRD L2: "you can spend 1 Focus Point to also take the Disengage action."
  action doStepOfTheWindFocus = {
    if (turnPhase != "acting" or turnState.bonusActionUsed or isIncapacitated(state)
        or classLevels.get(Monk) < 2 or not(canExpendFocus(monkState, 1))) unchanged
    else all {
      state' = state,
      turnState' = pBonusActionDash(turnState, state).with("disengaged", true),
      spellSlots' = spellSlots,
      turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
      creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
      monsterResourceState' = monsterResourceState,
      barbarianState' = barbarianState,
      monkState' = pStepOfTheWindFocus(monkState), paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  /// Stunning Strike: 1 FP, L5+. Once per turn.
  /// SRD L5: "once per turn, you can spend 1 Focus Point to attempt to stun."
  action doStunningStrike = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or not(canStunningStrike(monkState, classLevels.get(Monk)))) unchanged
    else all {
      state' = state,
      turnState' = turnState,
      spellSlots' = spellSlots,
      turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
      creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
      monsterResourceState' = monsterResourceState,
      barbarianState' = barbarianState,
      monkState' = pStunningStrike(monkState), paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  /// Wholeness of Body: BA, L6+ (Open Hand). Heals, decrements charge.
  /// SRD Warrior of the Open Hand L6: "As a Bonus Action, you can roll your Martial Arts die.
  /// You regain a number of Hit Points equal to the number rolled plus your Wisdom modifier."
  action doWholenessOfBody = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or not(canWholenessOfBody(monkState, classLevels.get(Monk), turnState.bonusActionUsed))) unchanged
    else {
      nondet healRoll = 1.to(12).oneOf()
      all {
        state' = pHeal(state, healRoll),
        turnState' = turnState.with("bonusActionUsed", true),
        spellSlots' = spellSlots,
        turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
        creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
        monsterResourceState' = monsterResourceState,
        barbarianState' = barbarianState,
        monkState' = pUseWholenessOfBody(monkState), paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
      }
    }
  }

  /// Uncanny Metabolism: free action at initiative. Restores all FP + heals.
  /// SRD L2: "When you roll Initiative, you can regain all expended Focus Points.
  /// You also regain a number of Hit Points equal to your Monk level plus your Wisdom modifier."
  /// Modeled as available during acting (player choice).
  action doUncannyMetabolism = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or not(canUncannyMetabolism(monkState)) or classLevels.get(Monk) < 2) unchanged
    else {
      nondet healRoll = 1.to(12).oneOf()
      all {
        state' = pHeal(state, classLevels.get(Monk) + healRoll),
        turnState' = turnState,
        spellSlots' = spellSlots,
        turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
        creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
        monsterResourceState' = monsterResourceState,
        barbarianState' = barbarianState,
        monkState' = pUncannyMetabolism(monkState, classLevels.get(Monk)), paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
      }
    }
  }

  // -- 19.6w Wizard Actions --

  /// Arcane Recovery: restore a spell slot. Once per LR.
  /// SRD: "choose expended spell slots to recover... combined level no more than
  /// half your Wizard level (round up), and none of the slots can be level 6 or higher."
  /// Simplified: single slot recovery — slotLevel <= budget AND <= 5 AND slot is expended.
  action doUseArcaneRecovery = {
    val wLvl = classLevels.get(Wizard)
    if (turnPhase != "acting" or isIncapacitated(state)
        or not(canArcaneRecovery(wizardState, wLvl))) unchanged
    else {
      // Budget: half wizard level, round up. E.g., L1→1, L2→1, L3→2, L5→3, L9→5.
      val budget = (wLvl + 1) / 2
      nondet slotLevel = 1.to(5).oneOf()
      all {
        // SRD: combined level <= half wizard level (round up)
        slotLevel <= budget,
        // SRD: slot must be expended (current < max)
        spellSlots.slotsCurrent.get(slotLevel) < spellSlots.slotsMax.get(slotLevel),
        val ss1 = pRestoreSlot(spellSlots, slotLevel)
        all {
          state' = state,
          turnState' = turnState,
          spellSlots' = ss1,
          turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
          creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
          monsterResourceState' = monsterResourceState,
          barbarianState' = barbarianState,
          monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState,
          wizardState' = pUseArcaneRecovery(wizardState),
          rangerState' = rangerState, bardState' = bardState,
        }
      }
    }
  }

  /// Overchannel: max damage on L1-5 wizard spell. First free, then escalating necrotic.
  /// SRD L14: "When you cast a Wizard spell with a spell slot of levels 1–5 that
  /// deals damage, you can deal maximum damage with that spell on the turn you cast it."
  /// Self-damage and slot level are caller-managed.
  action doOverchannel = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or not(canOverchannel(classLevels.get(Wizard)))) unchanged
    else all {
      state' = state,
      turnState' = turnState,
      spellSlots' = spellSlots,
      turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
      creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
      monsterResourceState' = monsterResourceState,
      barbarianState' = barbarianState,
      monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState,
      wizardState' = pOverchannel(wizardState),
      rangerState' = rangerState, bardState' = bardState,
    }
  }

  // -- 19.6d Paladin Actions (Phase P) --

  /// Lay on Hands: heal amount from pool. Bonus Action.
  /// SRD: "As a Bonus Action, you can touch a creature (which could be yourself)
  /// and draw power from the pool of healing to restore a number of Hit Points
  /// to that creature, up to the maximum amount remaining in the pool."
  action doUseLayOnHands = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or turnState.bonusActionUsed) unchanged
    else {
      nondet amount = 1.to(25).oneOf()
      if (not(canLayOnHands(paladinState, amount))) unchanged
      else {
        val healed = pHeal(state, amount)
        all {
          state' = healed,
          turnState' = turnState.with("bonusActionUsed", true),
          spellSlots' = spellSlots,
          turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
          creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
          monsterResourceState' = monsterResourceState,
          barbarianState' = barbarianState,
          monkState' = monkState,
          paladinState' = pUseLayOnHands(paladinState, amount),
          rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
        }
      }
    }
  }

  /// Paladin Channel Divinity: decrement charge.
  /// SRD: "You can use this class's Channel Divinity twice. You regain one of its
  /// expended uses when you finish a Short Rest, and you regain all expended uses
  /// when you finish a Long Rest."
  action doUsePaladinChannelDivinity = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or not(canPaladinChannelDivinity(paladinState, classLevels.get(Paladin)))) unchanged
    else all {
      state' = state,
      turnState' = turnState,
      spellSlots' = spellSlots,
      turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
      creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
      monsterResourceState' = monsterResourceState,
      barbarianState' = barbarianState,
      monkState' = monkState,
      paladinState' = pUsePaladinChannelDivinity(paladinState),
      rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  /// Divine Smite (slot-based): expend a spell slot. Costs Bonus Action.
  /// SRD 5.2.1 Divine Smite: "Casting Time: Bonus Action... trigger: you hit a creature"
  /// Damage is caller-managed (like Sneak Attack).
  action doDivineSmite = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or classLevels.get(Paladin) < 2 or turnState.bonusActionUsed) unchanged
    else {
      nondet slotLevel = SLOT_LEVEL_RANGE.oneOf()
      if (not(canDivineSmite(classLevels.get(Paladin), spellSlots.slotsCurrent, slotLevel))) unchanged
      else {
        val ss1 = pExpendSlot(spellSlots, slotLevel)
        all {
          state' = state,
          turnState' = turnState.with("bonusActionUsed", true),
          spellSlots' = ss1,
          turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
          creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
          monsterResourceState' = monsterResourceState,
          barbarianState' = barbarianState,
          monkState' = monkState,
          paladinState' = paladinState,
          rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
        }
      }
    }
  }

  /// Divine Smite (free 1/LR): no slot expenditure. Still costs BA.
  /// SRD: "you always have it prepared... cast without a spell slot once per Long Rest"
  action doDivineSmiteFree = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or turnState.bonusActionUsed
        or not(canDivineSmiteFree(paladinState, classLevels.get(Paladin)))) unchanged
    else all {
      state' = state,
      turnState' = turnState.with("bonusActionUsed", true),
      spellSlots' = spellSlots,
      turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
      creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
      monsterResourceState' = monsterResourceState,
      barbarianState' = barbarianState,
      monkState' = monkState,
      paladinState' = pUseDivineSmiteFree(paladinState),
      rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  // -- Rogue Actions --

  /// Sneak Attack: mark used this turn. Damage is caller-managed.
  /// SRD L1: "Once per turn, you can deal an extra 1d6 damage to one creature you hit
  /// with an attack roll if you have Advantage on the roll and the attack uses a Finesse
  /// or a Ranged weapon."
  action doUseSneakAttack = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or not(canSneakAttack(rogueState, classLevels.get(Rogue)))) unchanged
    else all {
      state' = state,
      turnState' = turnState,
      spellSlots' = spellSlots,
      turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
      creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
      monsterResourceState' = monsterResourceState,
      barbarianState' = barbarianState,
      monkState' = monkState, paladinState' = paladinState,
      rogueState' = pUseSneakAttack(rogueState),
      clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  /// Steady Aim: BA, grants advantage on next attack, speed becomes 0.
  /// SRD L3: "As a Bonus Action, you give yourself Advantage on your next attack roll
  /// on the current turn. You can use this feature only if you haven't moved during
  /// this turn, and after you use it, your Speed is 0 until the end of the current turn."
  action doUseSteadyAim = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or not(canSteadyAim(rogueState, classLevels.get(Rogue), turnState.bonusActionUsed))
        or turnState.movementRemaining != turnState.effectiveSpeed) unchanged
    else all {
      state' = state,
      turnState' = turnState.with("bonusActionUsed", true).with("effectiveSpeed", 0).with("movementRemaining", 0),
      spellSlots' = spellSlots,
      turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
      creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
      monsterResourceState' = monsterResourceState,
      barbarianState' = barbarianState,
      monkState' = monkState, paladinState' = paladinState,
      rogueState' = pUseSteadyAim(rogueState),
      clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  /// Cunning Action: Dash as Bonus Action.
  /// SRD L2: "Dash, Disengage, or Hide" as BA
  action doCunningActionDash = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or not(canCunningAction(classLevels.get(Rogue), turnState.bonusActionUsed))) unchanged
    else all {
      state' = state,
      turnState' = pBonusActionDash(turnState, state),
      spellSlots' = spellSlots,
      turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
      creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
      monsterResourceState' = monsterResourceState,
      barbarianState' = barbarianState,
      monkState' = monkState, paladinState' = paladinState,
      rogueState' = rogueState,
      clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  /// Cunning Action: Disengage as Bonus Action.
  action doCunningActionDisengage = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or not(canCunningAction(classLevels.get(Rogue), turnState.bonusActionUsed))) unchanged
    else all {
      state' = state,
      turnState' = turnState.with("bonusActionUsed", true).with("disengaged", true),
      spellSlots' = spellSlots,
      turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
      creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
      monsterResourceState' = monsterResourceState,
      barbarianState' = barbarianState,
      monkState' = monkState, paladinState' = paladinState,
      rogueState' = rogueState,
      clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  /// Cunning Action: Hide as Bonus Action. (Mechanical no-op in single-creature model beyond BA cost.)
  action doCunningActionHide = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or not(canCunningAction(classLevels.get(Rogue), turnState.bonusActionUsed))) unchanged
    else all {
      state' = state,
      turnState' = turnState.with("bonusActionUsed", true),
      spellSlots' = spellSlots,
      turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
      creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
      monsterResourceState' = monsterResourceState,
      barbarianState' = barbarianState,
      monkState' = monkState, paladinState' = paladinState,
      rogueState' = rogueState,
      clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  /// Uncanny Dodge: use Reaction. Damage halving is caller-managed.
  /// SRD L5: "you can use your Reaction to halve the attack's damage against you"
  action doUseUncannyDodge = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or not(canUncannyDodge(classLevels.get(Rogue), turnState.reactionAvailable))) unchanged
    else all {
      state' = state,
      turnState' = pUseReaction(turnState),
      spellSlots' = spellSlots,
      turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
      creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
      monsterResourceState' = monsterResourceState,
      barbarianState' = barbarianState,
      monkState' = monkState, paladinState' = paladinState,
      rogueState' = rogueState,
      clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  /// Cunning Strike: mark that a Cunning Strike effect was applied this turn.
  /// SRD L5: "When you deal Sneak Attack damage, you can add one of the
  /// following Cunning Strike effects."
  /// Effect choice, dice cost, and condition application are caller-managed.
  action doCunningStrike = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or not(canCunningStrike(rogueState, classLevels.get(Rogue)))) unchanged
    else all {
      state' = state,
      turnState' = turnState,
      spellSlots' = spellSlots,
      turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
      creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
      monsterResourceState' = monsterResourceState,
      barbarianState' = barbarianState,
      monkState' = monkState, paladinState' = paladinState,
      rogueState' = pCunningStrike(rogueState),
      clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  /// Use Cleric Channel Divinity: decrement charge.
  /// SRD: "You can use this class's Channel Divinity twice.
  /// You regain one of its expended uses when you finish a Short Rest,
  /// and you regain all expended uses when you finish a Long Rest."
  action doUseClericChannelDivinity = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or not(canClericChannelDivinity(clericState, classLevels.get(Cleric)))) unchanged
    else all {
      state' = state,
      turnState' = turnState,
      spellSlots' = spellSlots,
      turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
      creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
      monsterResourceState' = monsterResourceState,
      barbarianState' = barbarianState,
      monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState,
      clericState' = pUseClericChannelDivinity(clericState),
      druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  // -- 19.6wk Warlock Actions --

  /// Magical Cunning: regain pact slots. Once per LR.
  /// SRD: "you regain expended Pact Magic spell slots but no more than a number
  /// equal to half your maximum (round up)"
  /// Simplified: just sets the flag. Pact slot recovery is caller-managed.
  action doUseMagicalCunning = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or not(canMagicalCunning(warlockState, classLevels.get(Warlock)))) unchanged
    else all {
      state' = state,
      turnState' = turnState,
      spellSlots' = spellSlots,
      turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
      creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
      monsterResourceState' = monsterResourceState,
      barbarianState' = barbarianState,
      monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState,
      warlockState' = pUseMagicalCunning(warlockState),
      wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  /// Mystic Arcanum: cast a high-level spell once per LR.
  /// SRD: "You can cast your arcanum spell once without expending a spell slot,
  /// and you must finish a Long Rest before you can cast it in this way again."
  action doUseMysticArcanum = {
    if (turnPhase != "acting" or isIncapacitated(state)) unchanged
    else {
      nondet spellLevel = Set(6, 7, 8, 9).oneOf()
      if (not(canMysticArcanum(warlockState, classLevels.get(Warlock), spellLevel))) unchanged
      else all {
        state' = state,
        turnState' = turnState,
        spellSlots' = spellSlots,
        turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
        creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
        monsterResourceState' = monsterResourceState,
        barbarianState' = barbarianState,
        monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState,
        warlockState' = pUseMysticArcanum(warlockState, spellLevel),
        wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
      }
    }
  }

  /// Eldritch Smite: expend pact slot for Force damage on pact weapon hit.
  /// SRD: "Once per turn when you hit a creature with your pact weapon,
  /// you can expend a Pact Magic spell slot to deal an extra 1d8 Force damage"
  /// Damage amount and Prone effect are caller-managed.
  action doEldritchSmite = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or not(canEldritchSmite(warlockState, classLevels.get(Warlock), spellSlots.pactSlotsCurrent))) unchanged
    else all {
      state' = state,
      turnState' = turnState,
      spellSlots' = spellSlots.with("pactSlotsCurrent", spellSlots.pactSlotsCurrent - 1),
      turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
      creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
      monsterResourceState' = monsterResourceState,
      barbarianState' = barbarianState,
      monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState,
      warlockState' = pEldritchSmite(warlockState),
      wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  // -- 19.6s Sorcerer Actions (Phase S) --

  /// Font of Magic: convert spell slot to sorcery points.
  /// SRD: "You can expend a spell slot to gain a number of Sorcery Points
  /// equal to the slot's level (no action required)."
  action doConvertSlotToPoints = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or classLevels.get(Sorcerer) < 2) unchanged
    else {
      nondet slotLevel = SLOT_LEVEL_RANGE.oneOf()
      val ss1 = pExpendSlot(spellSlots, slotLevel)
      if (ss1 == spellSlots) unchanged
      else {
        val newSorc = pRestoreSorceryPoints(sorcererState, slotLevel)
        all {
          state' = state,
          turnState' = turnState,
          spellSlots' = ss1,
          turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
          creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
          monsterResourceState' = monsterResourceState,
          barbarianState' = barbarianState,
          monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState,
          sorcererState' = newSorc,
          warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
        }
      }
    }
  }

  /// Font of Magic: convert sorcery points to spell slot.
  /// SRD: "As a Bonus Action, you can transform unexpended Sorcery Points
  /// into one spell slot." Max slot level 5. Cost: L1=2, L2=3, L3=5, L4=6, L5=7.
  action doConvertPointsToSlot = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or classLevels.get(Sorcerer) < 2 or turnState.bonusActionUsed) unchanged
    else {
      nondet slotLevel = 1.to(5).oneOf()
      val cost = slotCreationCost(slotLevel)
      if (not(canSpendSorceryPoints(sorcererState, cost))) unchanged
      else {
        val ss1 = pRestoreSlot(spellSlots, slotLevel)
        if (ss1 == spellSlots) unchanged
        else all {
          state' = state,
          turnState' = turnState.with("bonusActionUsed", true),
          spellSlots' = ss1,
          turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
          creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
          monsterResourceState' = monsterResourceState,
          barbarianState' = barbarianState,
          monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState,
          sorcererState' = pSpendSorceryPoints(sorcererState, cost),
          warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
        }
      }
    }
  }

  /// Innate Sorcery: BA, activate innate magic.
  /// SRD: "As a Bonus Action, you can unleash that magic for 1 minute"
  action doUseInnateSorcery = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or not(canInnateSorcery(sorcererState, classLevels.get(Sorcerer), turnState.bonusActionUsed))) unchanged
    else all {
      state' = state,
      turnState' = turnState.with("bonusActionUsed", true),
      spellSlots' = spellSlots,
      turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
      creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
      monsterResourceState' = monsterResourceState,
      barbarianState' = barbarianState,
      monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState,
      sorcererState' = pUseInnateSorcery(sorcererState, classLevels.get(Sorcerer)),
      warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  /// Metamagic: apply a Metamagic option to a spell being cast.
  /// SRD L2: "you can alter your spells to suit your needs"
  /// One non-stackable option per spell (Empowered/Seeking bypass).
  /// L7 Sorcery Incarnate: up to 2 non-stackable when Innate Sorcery active.
  /// L20 Arcane Apotheosis: 1 free (no SP) per turn when Innate Sorcery active.
  action doUseMetamagic = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or classLevels.get(Sorcerer) < 2) unchanged
    else {
      nondet option = METAMAGIC_OPTIONS.oneOf()
      if (not(canUseMetamagic(sorcererState, classLevels.get(Sorcerer), option, turnState.bonusActionUsed, turnState.nonCantripActionSpellCast))) unchanged
      else {
        val ss1 = pUseMetamagic(sorcererState, classLevels.get(Sorcerer), option)
        val ts1 = if (option == "quickened") turnState.with("bonusActionUsed", true) else turnState
        all {
          state' = state,
          turnState' = ts1,
          spellSlots' = spellSlots,
          turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
          creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
          monsterResourceState' = monsterResourceState,
          barbarianState' = barbarianState,
          monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState,
          sorcererState' = ss1,
          warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
        }
      }
    }
  }

  // -- 19.6dr Druid Actions (Phase DR) --

  /// Enter Wild Shape: BA, expend charge, grant temp HP = druid level.
  /// SRD 5.2.1: "you retain your Hit Points" + "you gain Temporary Hit Points
  /// equal to your Druid level." No separate beast HP pool (5.1 had one with
  /// damage spillover on revert — removed in 5.2.1).
  action doEnterWildShape = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or not(canEnterWildShape(druidState, classLevels.get(Druid), turnState.bonusActionUsed))) unchanged
    else all {
      state' = pGrantTempHp(state, classLevels.get(Druid), false),
      turnState' = turnState.with("bonusActionUsed", true),
      spellSlots' = spellSlots,
      turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
      creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
      monsterResourceState' = monsterResourceState,
      barbarianState' = barbarianState,
      monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState,
      druidState' = pEnterWildShape(druidState),
      sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  /// Exit Wild Shape: BA, revert to normal form.
  /// SRD: "You can also leave the form early as a Bonus Action"
  action doExitWildShape = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or not(canExitWildShape(druidState, turnState.bonusActionUsed))) unchanged
    else all {
      state' = state,
      turnState' = turnState.with("bonusActionUsed", true),
      spellSlots' = spellSlots,
      turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
      creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
      monsterResourceState' = monsterResourceState,
      barbarianState' = barbarianState,
      monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState,
      druidState' = pExitWildShape(druidState),
      sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
    }
  }

  /// Wild Resurgence part 1: expend a spell slot → regain 1 WS charge.
  /// SRD L5: "if you have no uses of Wild Shape left, you can give yourself
  /// one use by expending a spell slot (no action required)."
  action doWildResurgenceCharge = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or not(canWildResurgenceForCharge(druidState, classLevels.get(Druid)))) unchanged
    else {
      nondet slotLevel = SLOT_LEVEL_RANGE.oneOf()
      if (spellSlots.slotsCurrent.get(slotLevel) <= 0) unchanged
      else {
        val ss1 = pExpendSlot(spellSlots, slotLevel)
        all {
          state' = state,
          turnState' = turnState,
          spellSlots' = ss1,
          turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
          creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
          monsterResourceState' = monsterResourceState,
          barbarianState' = barbarianState,
          monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState,
          druidState' = pWildResurgenceGainCharge(druidState),
          sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
        }
      }
    }
  }

  /// Wild Resurgence part 2: expend WS charge → regain L1 spell slot.
  /// SRD: "expend one use of Wild Shape (no action required) to give yourself
  /// a level 1 spell slot … can't do so again until you finish a Long Rest."
  action doWildResurgenceSlot = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or not(canWildResurgenceForSlot(druidState, classLevels.get(Druid)))) unchanged
    else {
      val ss1 = pRestoreSlot(spellSlots, 1)
      if (ss1 == spellSlots) unchanged  // L1 slot already at max
      else all {
        state' = state,
        turnState' = turnState,
        spellSlots' = ss1,
        turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
        creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
        monsterResourceState' = monsterResourceState,
        barbarianState' = barbarianState,
        monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState,
        druidState' = pWildResurgenceGainSlot(druidState),
        sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
      }
    }
  }

  // -- 19.6f Ranger Actions --

  /// Use free Hunter's Mark: decrement free uses. No action cost (SRD: free).
  action doUseFreeHuntersMark = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or classLevels.get(Ranger) < 1 or rangerState.huntersMarkFreeUses <= 0) unchanged
    else all {
      state' = state, turnState' = turnState, spellSlots' = spellSlots, turnPhase' = turnPhase,
      fighterState' = fighterState, classLevels' = classLevels,
      creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState,
      barbarianState' = barbarianState,
      monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState,
      rangerState' = pUseFreeHuntersMark(rangerState),
      bardState' = bardState,
    }
  }

  /// Tireless: Magic action, grant temp HP. SRD L10.
  action doUseTireless = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or classLevels.get(Ranger) < 10 or rangerState.tirelessCharges <= 0
        or turnState.actionsRemaining <= 0) unchanged
    else {
      nondet d8Roll = 1.to(8).oneOf()
      val result = pUseTireless(rangerState, d8Roll)
      // Tireless uses Magic action (costs an action) + grants temp HP
      val ts1 = pUseAction(turnState, state, AMagic)
      val s1 = pGrantTempHp(state, result.tempHp, false)
      all {
        state' = s1, turnState' = ts1, spellSlots' = spellSlots, turnPhase' = turnPhase,
        fighterState' = fighterState, classLevels' = classLevels,
        creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState,
        barbarianState' = barbarianState,
        monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState,
        rangerState' = result.ranger,
        bardState' = bardState,
      }
    }
  }

  /// Nature's Veil: Bonus Action, grant Invisible condition. SRD L14.
  action doUseNaturesVeil = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or classLevels.get(Ranger) < 14 or rangerState.naturesVeilCharges <= 0
        or turnState.bonusActionUsed) unchanged
    else {
      val ts1 = pUseBonusAction(turnState, state)
      val s1 = pApplyCondition(state, CInvisible, Set())
      all {
        state' = s1, turnState' = ts1, spellSlots' = spellSlots, turnPhase' = turnPhase,
        fighterState' = fighterState, classLevels' = classLevels,
        creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState,
        barbarianState' = barbarianState,
        monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState,
        rangerState' = pUseNaturesVeil(rangerState),
        bardState' = bardState,
      }
    }
  }

  // -- 19.6g Bard Actions --

  /// Bardic Inspiration: Bonus Action, spend 1 BI charge. SRD L1.
  action doUseBardicInspiration = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or classLevels.get(Bard) < 1 or bardState.bardicInspirationCharges <= 0
        or turnState.bonusActionUsed) unchanged
    else {
      val ts1 = pUseBonusAction(turnState, state)
      all {
        state' = state, turnState' = ts1, spellSlots' = spellSlots, turnPhase' = turnPhase,
        fighterState' = fighterState, classLevels' = classLevels,
        creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState,
        barbarianState' = barbarianState,
        monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState,
        rangerState' = rangerState,
        bardState' = pUseBardicInspiration(bardState),
      }
    }
  }

  /// Cutting Words L3 (Lore): Reaction, spend 1 BI charge. SRD L3 Lore.
  action doUseCuttingWords = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or classLevels.get(Bard) < 3 or bardState.bardicInspirationCharges <= 0
        or not(turnState.reactionAvailable)) unchanged
    else {
      val ts1 = pUseReaction(turnState)
      all {
        state' = state, turnState' = ts1, spellSlots' = spellSlots, turnPhase' = turnPhase,
        fighterState' = fighterState, classLevels' = classLevels,
        creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState,
        barbarianState' = barbarianState,
        monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState,
        rangerState' = rangerState,
        bardState' = pUseCuttingWords(bardState),
      }
    }
  }

  /// Font of Inspiration slot restore L5: spend spell slot, regain 1 BI. Free action.
  action doUseFontSlotRestore = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or classLevels.get(Bard) < 5
        or bardState.bardicInspirationCharges >= bardState.bardicInspirationMax) unchanged
    else {
      nondet slotLevel = 1.to(5).oneOf()
      val ss1 = pExpendSlot(spellSlots, slotLevel)
      if (ss1 == spellSlots) unchanged  // no slot available at that level
      else all {
        state' = state, turnState' = turnState, spellSlots' = ss1, turnPhase' = turnPhase,
        fighterState' = fighterState, classLevels' = classLevels,
        creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState,
        barbarianState' = barbarianState,
        monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState,
        rangerState' = rangerState,
        bardState' = pUseFontSlotRestore(bardState),
      }
    }
  }

  /// Peerless Skill L14: on failed check, add BI die. Only spends on success.
  action doUsePeerlessSkill = {
    if (turnPhase != "acting" or isIncapacitated(state)
        or classLevels.get(Bard) < 14 or bardState.bardicInspirationCharges <= 0) unchanged
    else {
      nondet success = Bool.oneOf()
      all {
        state' = state, turnState' = turnState, spellSlots' = spellSlots, turnPhase' = turnPhase,
        fighterState' = fighterState, classLevels' = classLevels,
        creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock, monsterResourceState' = monsterResourceState,
        barbarianState' = barbarianState,
        monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState,
        rangerState' = rangerState,
        bardState' = pUsePeerlessSkill(bardState, success),
      }
    }
  }

  // -- 19.7 Step Action --

  /// PC-only actions: fighter features, barbarian features, monk features, wizard features, rogue features, cleric features, paladin features, warlock features, sorcerer features, druid features, ranger features, bard features, death saves, PC damage variants
  action stepPC = any {
    doTakeDamage,
    doTakeDamageWithMods,
    doDeathSave,
    doStabilize,
    doKnockOut,
    doUseSecondWind,
    doUseActionSurge,
    doUseIndomitable,
    doUseTacticalMind,
    doUseHeroicInspiration,
    doScoreCriticalHit,
    doEnterRage,
    doEndRage,
    doExtendRageBA,
    doMarkAttackOrForcedSave,
    doDeclareReckless,
    doUseIntimidatingPresence,
    doRestoreIntimidatingPresence,
    doBrutalStrike,
    doUseRelentlessRage,
    doFlurryOfBlows,
    doPatientDefenseFree,
    doPatientDefenseFocus,
    doStepOfTheWindFree,
    doStepOfTheWindFocus,
    doStunningStrike,
    doWholenessOfBody,
    doUncannyMetabolism,
    doUseArcaneRecovery,
    doOverchannel,
    doUseSneakAttack,
    doUseSteadyAim,
    doCunningActionDash,
    doCunningActionDisengage,
    doCunningActionHide,
    doUseUncannyDodge,
    doCunningStrike,
    doUseClericChannelDivinity,
    doUseLayOnHands,
    doUsePaladinChannelDivinity,
    doDivineSmite,
    doDivineSmiteFree,
    doUseMagicalCunning,
    doUseMysticArcanum,
    doEldritchSmite,
    doConvertSlotToPoints,
    doConvertPointsToSlot,
    doUseInnateSorcery,
    doUseMetamagic,
    doEnterWildShape,
    doExitWildShape,
    doWildResurgenceCharge,
    doWildResurgenceSlot,
    doUseFreeHuntersMark,
    doUseTireless,
    doUseNaturesVeil,
    doUseBardicInspiration,
    doUseCuttingWords,
    doUseFontSlotRestore,
    doUsePeerlessSkill,
  }

  // -- 19.6e Monster Resource Actions (Phase L) --

  /// Use a Legendary Action between turns.
  /// SRD: "immediately after another creature's turn" → guard: waitingForTurn.
  action doUseLegendaryAction = {
    if (turnPhase != "waitingForTurn" or creatureKind != Monster or isIncapacitated(state)
        or monsterStatBlock.legendaryActions.keys().size() == 0
        or monsterResourceState.legendaryActionsRemaining <= 0)
      unchanged
    else {
      nondet actionName = monsterStatBlock.legendaryActions.keys().oneOf()
      val cost = monsterStatBlock.legendaryActions.get(actionName).cost
      if (monsterResourceState.legendaryActionsRemaining < cost) unchanged
      else {
        val mrs1 = pUseLegendaryAction(monsterResourceState, actionName, monsterStatBlock.legendaryActions)
        all {
          state' = state, turnState' = turnState, spellSlots' = spellSlots,
          turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
          creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
          monsterResourceState' = mrs1,
          barbarianState' = barbarianState,
          monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
        }
      }
    }
  }

  /// Use a Recharge ability (must be available).
  action doUseRechargeAbility = {
    if (turnPhase != "acting" or creatureKind != Monster
        or monsterStatBlock.rechargeAbilities.keys().size() == 0) unchanged
    else {
      nondet name = monsterStatBlock.rechargeAbilities.keys().oneOf()
      if (not(monsterResourceState.rechargeAvailable.get(name))) unchanged
      else {
        val mrs1 = pUseRechargeAbility(monsterResourceState, name)
        all {
          state' = state, turnState' = turnState, spellSlots' = spellSlots,
          turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
          creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
          monsterResourceState' = mrs1,
          barbarianState' = barbarianState,
          monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
        }
      }
    }
  }

  /// Use a daily ability (must have remaining uses).
  action doUseDailyAbility = {
    if (turnPhase != "acting" or creatureKind != Monster
        or monsterStatBlock.dailyAbilities.keys().size() == 0) unchanged
    else {
      nondet name = monsterStatBlock.dailyAbilities.keys().oneOf()
      if (monsterResourceState.dailyUsesRemaining.get(name) <= 0) unchanged
      else {
        val mrs1 = pUseDailyAbility(monsterResourceState, name)
        all {
          state' = state, turnState' = turnState, spellSlots' = spellSlots,
          turnPhase' = turnPhase, fighterState' = fighterState, classLevels' = classLevels,
          creatureKind' = creatureKind, monsterStatBlock' = monsterStatBlock,
          monsterResourceState' = mrs1,
          barbarianState' = barbarianState,
          monkState' = monkState, paladinState' = paladinState, rogueState' = rogueState, clericState' = clericState, druidState' = druidState, sorcererState' = sorcererState, warlockState' = warlockState, wizardState' = wizardState, rangerState' = rangerState, bardState' = bardState,
        }
      }
    }
  }

  /// Monster-only actions: stat-block-sourced damage + resource actions
  action stepMonster = any {
    doTakeDamageMonster,
    doUseLegendaryAction,
    doUseRechargeAbility,
    doUseDailyAbility,
  }

  /// Universal actions: shared by both PCs and monsters
  action stepUniversal = any {
    doHeal,
    doGrantTempHp,
    doApplyCondition,
    doRemoveCondition,
    doAddExhaustion,
    doReduceExhaustion,
    doStartTurn,
    doUseAction,
    doUseBonusAction,
    doUseReaction,
    doUseMovement,
    doUseExtraAttack,
    doStandFromProne,
    doDropProne,
    doMarkBonusActionSpell,
    doMarkNonCantripActionSpell,
    doExpendSlot,
    doExpendPactSlot,
    doStartConcentration,
    doBreakConcentration,
    doConcentrationCheck,
    doAddEffect,
    doRemoveEffect,
    doSpendHitDie,
    doShortRest,
    doLongRest,
    doApplyFall,
    doSuffocate,
    doApplyStarvation,
    doApplyDehydration,
    doGrapple,
    doReleaseGrapple,
    doEscapeGrapple,
    doShove,
    doEndTurn,
    doEnterCombat,
    doExitCombat,
    doUseBonusMovement,
  }

  action step = {
    if (state.dead) unchanged
    else if (creatureKind == Monster) any { stepMonster, stepUniversal }
    else any { stepPC, stepUniversal }
  }

  // -- 19.7 Safety Invariants --

  val hpBounded = state.hp >= 0 and state.hp <= state.maxHp

  val tempHpNonNegative = state.tempHp >= 0

  val deathSavesBounded =
    state.deathSaves.successes >= 0 and state.deathSaves.successes <= 3
    and state.deathSaves.failures >= 0 and state.deathSaves.failures <= 3

  val deadImpliesHp0 = state.dead implies state.hp == 0

  val exhaustionBounded = state.exhaustion >= 0 and state.exhaustion <= 6

  val exhaustion6ImpliesDead = (state.exhaustion >= 6) implies state.dead

  val paralyzedImpliesIncap =
    state.paralyzed implies state.incapacitatedSources.contains(ISParalyzed)

  val petrifiedImpliesIncap =
    state.petrified implies state.incapacitatedSources.contains(ISPetrified)

  val stunnedImpliesIncap =
    state.stunned implies state.incapacitatedSources.contains(ISStunned)

  val unconsciousImpliesIncap =
    state.unconscious implies state.incapacitatedSources.contains(ISUnconscious)

  val unconsciousImpliesProne =
    state.unconscious implies state.prone

  /// Dead creatures should not be concentrating.
  val deadNotConcentrating = state.dead implies not(isConcentrating(spellSlots))

  val stableImpliesDeathSavesReset =
    state.stable implies (state.deathSaves.successes == 0 and state.deathSaves.failures == 0)

  val deadIsAbsorbing = state.dead implies (
    pTakeDamage(state, 10, Slashing, Set(), Set(), Set(), false) == state
    and pHeal(state, 10) == state
    and pDeathSave(state, 15) == state
  )

  /// Incapacitated creatures should not be concentrating.
  val incapNotConcentrating = isIncapacitated(state) implies not(isConcentrating(spellSlots))

  val slotsBounded =
    spellSlots.slotsCurrent.keys().forall(level =>
      spellSlots.slotsCurrent.get(level) >= 0
      and spellSlots.slotsCurrent.get(level) <= spellSlots.slotsMax.get(level)
    )

  val pactSlotsBounded =
    spellSlots.pactSlotsCurrent >= 0
    and spellSlots.pactSlotsCurrent <= spellSlots.pactSlotsMax

  val hitDiceNonNegative =
    state.hitDiceRemaining.get(Barbarian) >= 0
    and state.hitDiceRemaining.get(Bard) >= 0
    and state.hitDiceRemaining.get(Cleric) >= 0
    and state.hitDiceRemaining.get(Druid) >= 0
    and state.hitDiceRemaining.get(Fighter) >= 0
    and state.hitDiceRemaining.get(Monk) >= 0
    and state.hitDiceRemaining.get(Paladin) >= 0
    and state.hitDiceRemaining.get(Ranger) >= 0
    and state.hitDiceRemaining.get(Rogue) >= 0
    and state.hitDiceRemaining.get(Sorcerer) >= 0
    and state.hitDiceRemaining.get(Warlock) >= 0
    and state.hitDiceRemaining.get(Wizard) >= 0

  /// No two active effects share the same spellId.
  val activeEffectsUniqueSpellIds =
    state.activeEffects.forall(e1 =>
      state.activeEffects.forall(e2 =>
        (e1.spellId == e2.spellId) implies (e1 == e2)
      )
    )

  val turnPhaseValid = turnPhase.in(Set("outOfCombat", "acting", "waitingForTurn"))

  val secondWindBounded =
    fighterState.secondWindCharges >= 0 and fighterState.secondWindCharges <= fighterState.secondWindMax

  val actionSurgeBounded =
    fighterState.actionSurgeCharges >= 0 and fighterState.actionSurgeCharges <= fighterState.actionSurgeMax

  val indomitableBounded =
    fighterState.indomitableCharges >= 0 and fighterState.indomitableCharges <= fighterState.indomitableMax

  val bonusMovementBounded = turnState.bonusMovementRemaining >= 0

  // movementRemaining <= effectiveSpeed is NOT a valid invariant.
  // Multiple SRD mechanisms let total movement exceed base Speed on a turn:
  //   - Dash (Rules-Glossary): adds Speed to movement budget (stackable via
  //     Cunning Action, Step of the Wind, Haste action, Expeditious Retreat)
  //   - Mid-turn movement grants: Barbarian Rage entry ("move up to half your Speed"),
  //     Fighter Second Wind/Tactical Mind, Rogue Withdraw — immediate movement
  //     outside the normal budget
  //   - Speed-modifying effects (Longstrider +10ft, Haste doubles, Boots of Speed
  //     doubles, Fast Movement +10ft, Unarmored Movement +10-30ft) if effectiveSpeed
  //     doesn't account for them

  // Phase B: Barbarian resource invariants
  val rageChargesBounded =
    barbarianState.rageCharges >= 0 and barbarianState.rageCharges <= barbarianState.rageMaxCharges

  val rageTurnsNonNegative = barbarianState.rageTurnsRemaining >= 0

  val rageConsistency =
    not(barbarianState.raging) implies barbarianState.rageTurnsRemaining == 0

  val relentlessRageNonNegative = barbarianState.relentlessRageTimesUsed >= 0

  // Phase M: Monk resource invariants
  val focusPointsBounded =
    monkState.focusPoints >= 0 and monkState.focusPoints <= monkState.focusMax

  val focusMaxNonNegative = monkState.focusMax >= 0

  val wholenessChargesBounded =
    monkState.wholenessCharges >= 0 and monkState.wholenessCharges <= monkState.wholenessMax

  // Phase P: Paladin resource invariants
  val paladinLayOnHandsBounded =
    paladinState.layOnHandsPool >= 0 and paladinState.layOnHandsPool <= paladinState.layOnHandsMax

  /// Cleric CD charges bounded: 0 ≤ charges ≤ max.
  val clericChannelDivinityBounded =
    clericState.channelDivinityCharges >= 0 and clericState.channelDivinityCharges <= clericState.channelDivinityMax

  val paladinChannelDivinityBounded =
    paladinState.channelDivinityCharges >= 0 and paladinState.channelDivinityCharges <= paladinState.channelDivinityMax

  val druidWildShapeChargesBounded =
    druidState.wildShapeCharges >= 0 and druidState.wildShapeCharges <= druidState.wildShapeMax

  val sorceryPointsBounded =
    sorcererState.sorceryPoints >= 0 and sorcererState.sorceryPoints <= sorcererState.sorceryPointsMax

  // Phase L: Monster resource invariants
  val legendaryActionsBounded =
    monsterResourceState.legendaryActionsRemaining >= 0

  val legendaryResistancesBounded =
    monsterResourceState.legendaryResistancesRemaining >= 0

  val dailyUsesNonNegative =
    monsterResourceState.dailyUsesRemaining.keys().forall(name =>
      monsterResourceState.dailyUsesRemaining.get(name) >= 0)

  // Turn resource bounds
  val actionsRemainingNonNeg = turnState.actionsRemaining >= 0
  val actionsRemainingBounded = turnState.actionsRemaining <= 2
  val movementRemainingNonNeg = turnState.movementRemaining >= 0
  val extraAttacksNonNeg = turnState.extraAttacksRemaining >= 0

  // Stability invariants
  val stableImpliesZeroHp = state.stable implies state.hp == 0
  val stableImpliesUnconscious = state.stable implies state.unconscious

  // Active effect durations
  val activeEffectDurationsNonNeg = state.activeEffects.forall(e => e.turnsRemaining >= 0)

  // Death save state machine
  val hpPositiveImpliesNoDeathSaves =
    state.hp > 0 implies (state.deathSaves.successes == 0 and state.deathSaves.failures == 0)

  val zeroHpNotDeadNotStableImpliesUnconscious =
    (state.hp == 0 and not(state.dead) and not(state.stable)) implies state.unconscious

  val threeDeathFailuresImpliesDead =
    state.deathSaves.failures >= 3 implies state.dead

  /// Combined invariant for all safety properties.
  val allInvariants = and {
    hpBounded,
    tempHpNonNegative,
    deathSavesBounded,
    deadImpliesHp0,
    exhaustionBounded,
    exhaustion6ImpliesDead,
    paralyzedImpliesIncap,
    petrifiedImpliesIncap,
    stunnedImpliesIncap,
    unconsciousImpliesIncap,
    unconsciousImpliesProne,
    stableImpliesDeathSavesReset,
    deadIsAbsorbing,
    deadNotConcentrating,
    incapNotConcentrating,
    slotsBounded,
    pactSlotsBounded,
    hitDiceNonNegative,
    activeEffectsUniqueSpellIds,
    turnPhaseValid,
    secondWindBounded,
    actionSurgeBounded,
    indomitableBounded,
    bonusMovementBounded,
    legendaryActionsBounded,
    legendaryResistancesBounded,
    dailyUsesNonNegative,
    rageChargesBounded,
    rageTurnsNonNegative,
    rageConsistency,
    relentlessRageNonNegative,
    focusPointsBounded,
    focusMaxNonNegative,
    wholenessChargesBounded,
    paladinLayOnHandsBounded,
    clericChannelDivinityBounded,
    paladinChannelDivinityBounded,
    druidWildShapeChargesBounded,
    sorceryPointsBounded,
    actionsRemainingNonNeg,
    actionsRemainingBounded,
    movementRemainingNonNeg,
    extraAttacksNonNeg,
    stableImpliesZeroHp,
    stableImpliesUnconscious,
    activeEffectDurationsNonNeg,
    hpPositiveImpliesNoDeathSaves,
    zeroHpNotDeadNotStableImpliesUnconscious,
    threeDeathFailuresImpliesDead,
  }

  // ============================================================
  // 19.8 Inductive Invariant (for Apalache verification)
  // ============================================================
  // Must be strong enough that: Inv /\ Step => Inv'
  // Each constraint was added because Apalache found a
  // counterexample without it.

  /// All structurally valid FighterState records.
  /// Uses nested map().flatten() because Quint has no flatMap or cross.
  pure val VALID_FIGHTER_STATES: Set[FighterState] =
    0.to(4).map(swC =>
      0.to(4).map(swM =>
        0.to(2).map(asC =>
          0.to(2).map(asM =>
            0.to(3).map(indC =>
              0.to(3).map(indM =>
                Set(true, false).map(asUsed =>
                  Set(true, false).map(hi =>
                    {
                      secondWindCharges: swC, secondWindMax: swM,
                      actionSurgeCharges: asC, actionSurgeMax: asM,
                      actionSurgeUsedThisTurn: asUsed,
                      indomitableCharges: indC, indomitableMax: indM,
                      heroicInspiration: hi,
                    }
                  )
                ).flatten()
              ).flatten()
            ).flatten()
          ).flatten()
        ).flatten()
      ).flatten()
    ).flatten()
    .filter(fs =>
      fs.secondWindCharges <= fs.secondWindMax
      and fs.actionSurgeCharges <= fs.actionSurgeMax
      and fs.indomitableCharges <= fs.indomitableMax
    )

  val inductiveInv = and {
    // Fighter level must be a valid D&D level (1-20)
    classLevels.get(Fighter).in(1.to(20)),

    // Fighter state must be a structurally valid record
    fighterState.in(VALID_FIGHTER_STATES),

    // Turn phase valid
    turnPhase.in(Set("outOfCombat", "acting", "waitingForTurn")),

    // Level-to-max charge relationships (established by init, preserved by step).
    fighterState.secondWindMax == secondWindMaxCharges(classLevels.get(Fighter)),
    fighterState.actionSurgeMax == actionSurgeMaxCharges(classLevels.get(Fighter)),
    fighterState.indomitableMax == indomitableMaxCharges(classLevels.get(Fighter)),

    // Action economy coupling: actionsRemaining starts at 1 (from pStartTurn),
    // Action Surge adds 1 (once per turn). So max is 2.
    // If Action Surge hasn't been used this turn, actionsRemaining <= 1.
    turnState.actionsRemaining >= 0,
    turnState.actionsRemaining <= 2,
    not(fighterState.actionSurgeUsedThisTurn) implies turnState.actionsRemaining <= 1,

    // Core state bounds
    state.hp >= 0,
    state.hp <= state.maxHp,
    state.maxHp >= 1,
    state.tempHp >= 0,
    state.exhaustion >= 0,
    state.exhaustion <= 6,
    state.deathSaves.successes >= 0,
    state.deathSaves.successes <= 3,
    state.deathSaves.failures >= 0,
    state.deathSaves.failures <= 3,
    state.hitDiceRemaining.get(Barbarian) >= 0,
    state.hitDiceRemaining.get(Bard) >= 0,
    state.hitDiceRemaining.get(Cleric) >= 0,
    state.hitDiceRemaining.get(Druid) >= 0,
    state.hitDiceRemaining.get(Fighter) >= 0,
    state.hitDiceRemaining.get(Monk) >= 0,
    state.hitDiceRemaining.get(Paladin) >= 0,
    state.hitDiceRemaining.get(Ranger) >= 0,
    state.hitDiceRemaining.get(Rogue) >= 0,
    state.hitDiceRemaining.get(Sorcerer) >= 0,
    state.hitDiceRemaining.get(Warlock) >= 0,
    state.hitDiceRemaining.get(Wizard) >= 0,

    // Turn state bounds
    turnState.movementRemaining >= 0,
    turnState.effectiveSpeed >= 0,
    turnState.extraAttacksRemaining >= 0,
    turnState.bonusMovementRemaining >= 0,

    // Spell slot bounds
    spellSlots.pactSlotsCurrent >= 0,
    spellSlots.pactSlotsCurrent <= spellSlots.pactSlotsMax,
  }

}
