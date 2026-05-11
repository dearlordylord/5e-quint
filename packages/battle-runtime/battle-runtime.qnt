// -*- mode: Bluespec; -*-

// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.bonus-action-dash-temporary-hit-points unit-feature.reaction-roll-or-damage-reduction spell.creature-type-protection-and-charm spell.invocation-after-hit-damage spell.invocation-after-hit-restraint-turn-start-damage spell.invocation-after-hit-timed-damage-save spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-condition-immunity-turn-start-temporary-hit-points spell.invocation-condition-save spell.invocation-damage-reduction spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-sleep-repeat-save-lifecycle spell.invocation-spell-hosted-weapon-attack spell.invocation-weapon-damage-rider spell.scalar-buff
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.scalar-buff
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-roll-modifier
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-after-hit-restraint-turn-start-damage spell.invocation-after-hit-timed-damage-save spell.invocation-condition-immunity-turn-start-temporary-hit-points
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-chained-attack-damage
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-after-hit-damage spell.invocation-spell-hosted-weapon-attack spell.invocation-weapon-damage-rider
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-marked-damage-rider
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-attack-roll-advantage-save
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-damage-reduction
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-sleep-repeat-save-lifecycle
module battleRuntime {
  // SRD traceability for this canonical battle runtime spec:
  // - Playing-the-Game.md lines 479-495: combat proceeds in rounds and turns
  //   by Initiative order, and the Initiative order remains fixed round to round.
  // - Playing-the-Game.md lines 501-513: a turn can include one action, and
  //   doing nothing is a legal turn choice. ASSUMPTIONS.md A2 records the repo
  //   modeling choice that End Turn is a runtime transition, not a rules Action.
  // - Playing-the-Game.md lines 582-589 and 700-703: an Attack chooses a
  //   target, resolves an attack roll, rolls damage on a hit, and rolls the
  //   attack's damage dice twice on a Critical Hit.
  // - Classes/Fighter.md lines 136-138: the Champion Improved Critical
  //   feature lets weapon and Unarmed Strike attack rolls score a Critical Hit
  //   on a d20 roll of 19 or 20.
  // - Playing-the-Game.md lines 684-698 and 788-808: damage subtracts from HP,
  //   HP cannot go below 0, weapon damage adds the attack ability modifier, and
  //   Temporary Hit Points absorb damage before HP.
  // - Playing-the-Game.md lines 748-780 and ASSUMPTIONS.md A12: Stat Block
  //   monsters use Monster Death at 0 HP; Character Build combatants use the
  //   Death Saving Throw lifecycle, including instant death from massive
  //   damage. This spec covers the immediate HP-mutation boundary: drop to
  //   0 HP, damage at 0 HP, Critical Hit damage at 0 HP, Massive Damage, and
  //   start-turn Death Saving Throw rolls through Stable/dead/natural-20
  //   outcomes. Stable 1d4-hour recovery and post-battle character closeout
  //   are represented in TypeScript session state, not in this battle spec.
  // - Classes/Fighter.md lines 76-80: Action Surge grants one additional action
  //   except Magic, spends one use per Short or Long Rest, and is limited to
  //   once per turn.
  // - Classes/Fighter.md lines 64-68, Playing-the-Game.md lines 318-324 and
  //   740-746: Second Wind spends a Bonus Action and one Short/Long Rest
  //   feature use to restore 1d10 + Fighter level HP, clamped by maximum HP.
  // - Classes/Rogue.md lines 63-69 and Playing-the-Game.md lines 700-703:
  //   Sneak Attack is an optional once-per-turn on-hit damage rider for an
  //   eligible Finesse/Ranged attack, and its extra damage dice are doubled on
  //   Critical Hits.
  // - Spells/Descriptions-A-D.md lines 1588-1597, Playing-the-Game.md lines
  //   694-703, and Rules-Glossary.md lines 297-325: Divine Favor is a
  //   self-hosted Bonus Action spell whose timed effect adds extra Radiant
  //   damage dice to the caster's weapon attacks on a hit; the rider is a
  //   mandatory weapon-hit damage-roll component while active.
  // - Spells/Descriptions-A-D.md lines 1599-1609, Playing-the-Game.md lines
  //   694-703, Spells/Gaining-and-Casting.md lines 33-65, and
  //   UBIQUITOUS_LANGUAGE.md: Divine Smite is a Bonus Action spell cast
  //   immediately after a melee weapon or Unarmed Strike hit. It spends a Spell
  //   Slot, adds Radiant damage to that already-hit attack, scales by slot
  //   level, and adds one die against Fiends or Undead.
  // - Spells/Descriptions-E-L.md lines 1275-1288, Playing-the-Game.md lines
  //   582-589 and 694-703, Rules-Glossary.md lines 138-140 and 239-247,
  //   and UBIQUITOUS_LANGUAGE.md: Hunter's Mark is a Bonus Action
  //   Concentration spell that marks one target, adds Force damage when the
  //   caster hits that target with an Attack Roll, and can be moved with a
  //   Bonus Action after the marked target drops to 0 HP.
  // - Classes/Monk.md lines 102-106, Classes/Rogue.md lines 109-111,
  //   Classes/Bard.md lines 332-334, and Playing-the-Game.md lines 326-332:
  //   Deflect Attacks, Uncanny Dodge, and Cutting Words are Reactions that
  //   modify an attack roll or attack damage at the relevant interrupt point.
  // - Classes/Rogue.md lines 113-115, Classes/Monk.md lines 132-134, and
  //   Playing-the-Game.md lines 704-714: Evasion-style replacement riders
  //   apply only to Dexterity Saving Throw damage procedures whose successful
  //   save outcome is half damage; success becomes no damage and failure
  //   becomes half damage.
  // - Spells/Gaining-and-Casting.md lines 3-65 and 92-96, Rules-Glossary.md
  //   lines 698-702, and Classes/Wizard.md lines 56-82: prepared level-1
  //   Wizard spells spend Spell Slots; cantrips do not.
  // - Spells/Gaining-and-Casting.md lines 176-182 and Playing-the-Game.md
  //   lines 219-222: spell attacks add Proficiency Bonus.
  // - Spells/Descriptions-E-L.md lines 1121-1132,
  //   Spells/Descriptions-M-P.md lines 85-96, and
  //   Spells/Descriptions-A-D.md lines 232-242,
  //   Spells/Descriptions-E-L.md lines 1121-1132, and
  //   Spells/Descriptions-M-P.md lines 479-490: Cure Wounds, Healing Word,
  //   and Mass Healing Word directly restore Hit Points with explicit Action
  //   or Bonus Action cost, target count, minimum slot level, and dice scaling.
  //   Spells/Descriptions-M-P.md lines 85-96 and Spells/Descriptions-Q-R.md
  //   lines 41-52: Magic Missile can allocate darts to one creature or
  //   several and gains one dart per slot level above 1; Ray of Frost reduces
  //   Speed until the start of the caster's next turn.
  // - Spells/Descriptions-S-Z.md lines 215-224, Playing-the-Game.md lines
  //   326-332 and 582-589, and Rules-Glossary.md lines 112 and 918: Shield is
  //   a Reaction spell when hit by an attack roll, including a spell attack
  //   roll, or targeted by Magic Missile; it grants +5 AC against the
  //   triggering attack until the start of the caster's next turn and negates
  //   Magic Missile damage to that target.
  // - Spells/Descriptions-M-P.md lines 5-15 and
  //   Spells/Gaining-and-Casting.md lines 142-149: Mage Armor is a timed
  //   ongoing spell effect whose target's base AC becomes 13 + Dexterity
  //   modifier until the spell ends, with typed early end when the target dons
  //   armor.
  // - Spells/Descriptions-A-D.md lines 13-23, Spells/Gaining-and-Casting.md
  //   lines 187-220, Playing-the-Game.md lines 704-714, and Rules-Glossary.md
  //   lines 854-856: Acid Splash is an Action cantrip that creates a
  //   5-foot-radius Sphere at a point within 60 feet; each creature in the
  //   Sphere makes a Dexterity Saving Throw and takes Acid damage only on a
  //   failed save.
  // - Spells/Gaining-and-Casting.md lines 36-38 and Rules-Glossary.md lines
  //   98-100: lacking training for worn armor prevents spellcasting while
  //   preserving Spell Slot state.
  // - Monsters/Monsters-P-S.md lines 1152-1175 and UBIQUITOUS_LANGUAGE.md:
  //   Skeleton has Bludgeoning vulnerability and Poison damage immunity.
  // - Playing-the-Game.md lines 326-332 and
  //   Spells/Gaining-and-Casting.md lines 92-100: a Reaction is an instant
  //   response to a trigger, can interrupt another creature's turn, is usable
  //   once until the start of the reactor's next turn, and reaction spells use
  //   spell-authored triggers. The battle runtime models the reusable
  //   interrupt window/continuation protocol here; individual reaction
  //   features and spells are restored by later width tasks.
  // - Playing-the-Game.md lines 533-551, Rules-Glossary.md lines 395-397,
  //   738-740, 904-910, and UBIQUITOUS_LANGUAGE.md: Movement spends a
  //   per-turn movement budget derived from Speed; Difficult Terrain and
  //   other spatial costs are caller-authored Movement costs at this runtime
  //   boundary; table-supplied reach-exit facts open an Opportunity Attack
  //   Reaction window before Movement is committed.
  // - Monsters/Overview.md lines 253-265 and ASSUMPTIONS.md A21-A24: Stat
  //   Block monster controls own Legendary Action uses and limited-use
  //   resources. This spec models the Stat Block resource boundary with a
  //   representative Goblin recharge part and Legendary Action use pool;
  //   TypeScript carries the authored StatBlockRecord catalog breadth.
  // - Monsters/Overview.md lines 229-245, Playing-the-Game.md lines
  //   318-324 and 501-503, Rules-Glossary.md line 108, and ASSUMPTIONS.md
  //   A44: Stat Block Multiattack is part of a monster's single Attack
  //   action; pending dispatches are a named-attack continuation in this
  //   runtime, Movement can interleave between dispatch attacks, and dispatches
  //   close when spent or when the turn ends. Stat Block Bonus Action options
  //   spend the one per-turn Bonus Action.
  // - Classes/Fighter.md lines 94-96, Classes/Paladin.md lines 126-128,
  //   Classes/Ranger.md lines 110-112, Playing-the-Game.md lines 501-503,
  //   Rules-Glossary.md lines 102-108, and UBIQUITOUS_LANGUAGE.md:
  //   level-5 Extra Attack changes the
  //   Attack action to produce one additional ordinary attack slot. It spends
  //   the Action once, permits Movement between the attacks, and any unspent
  //   class-feature attack slot closes when the turn ends.
  // - Rules-Glossary.md lines 102-106, 496-514, and 1074 plus
  //   Equipment.md lines 54-56 and ASSUMPTIONS.md A8/A37: the battle-owned
  //   held/wielded hand state, Light-property Off-Hand Attack damage modifier
  //   behavior, Grapple links, release, Escape Grapple, Grappled attack-roll
  //   disadvantage, and Grappled movement-cost facts are battle-owned state.
  // - Rules-Glossary.md lines 542-548 and 858-866 plus
  //   Playing-the-Game.md lines 590-600: Hide records the check total as the
  //   Search DC, grants Invisible while hidden, Search can find the hidden
  //   creature, and making an attack roll or casting a Verbal spell reveals the
  //   hidden creature.
  // - Playing-the-Game.md lines 295-305, 326-332, 499-513, and
  //   Rules-Glossary.md lines 361-365, 420-428, 528-535, 802-806, and
  //   818-826: Dash, Disengage, Dodge, Help, Ready, and standing from Prone
  //   are battle-owned turn/action or movement procedures.
  // - Spells/Descriptions-A-D.md lines 722-737, Playing-the-Game.md lines
  //   145-181 and 582-703, Rules-Glossary.md, and UBIQUITOUS_LANGUAGE.md:
  //   Chromatic Orb is a chained Spell Invocation with one cast-local
  //   damage-type choice, ordered target/Attack Roll/Damage Roll steps,
  //   duplicate d8 face detection, unique targets across the casting,
  //   previous-target 30-foot leap facts, and a leap cap equal to Cast Level.
  // - Spells/Descriptions-M-P.md lines 643-654, Descriptions-S-Z.md lines
  //   7-18, Descriptions-E-L.md lines 1417-1428, and
  //   Descriptions-A-D.md lines 707-720: Poison Spray, Sacred Flame, Inflict
  //   Wounds, Burning Hands, Color Spray, Entangle, and the damage-only slice
  //   of Chill Touch are action-time spells with creature or table-supplied
  //   area targets, cantrip/slot scaling, and the listed attack/save outcomes.
  //   Spells/Descriptions-S-Z.md lines 529-540: Starry Wisp targets one
  //   creature or object within range, makes a ranged spell attack, and deals
  //   Radiant damage on a hit. This object-target slice models caller-supplied
  //   object identity, range legality, Armor Class, and damage disposition;
  //   its Dim Light and Invisible-benefit riders are not modeled as durable
  //   object illumination state in this battle runtime.
  //   Spells/Descriptions-E-L.md lines 1307-1318: Ice Knife is a level-1
  //   Action spell with a primary ranged spell attack, hit-only Piercing
  //   damage, and an unconditional primary-target-anchored burst Dexterity
  //   Saving Throw that deals Cold damage only on a failed save.
  //   Spells/Descriptions-S-Z.md lines 1024-1035: True Strike is an Action
  //   cantrip whose material component is a proficient weapon worth at least
  //   1 CP, immediately makes one attack with that weapon, uses the
  //   spellcasting ability for attack and damage rolls instead of Strength or
  //   Dexterity, lets the weapon damage type be Radiant or normal, and adds
  //   Radiant cantrip-scaling damage at levels 5, 11, and 17.
  // - Character-Origins.md lines 253-255, Playing-the-Game.md lines 788-806,
  //   Rules-Glossary.md lines 361-365, and UBIQUITOUS_LANGUAGE.md:
  //   Orc Adrenaline Rush spends a limited-use Bonus Action Dash, grants
  //   Proficiency Bonus Temporary Hit Points that do not stack, and refreshes
  //   its use pool outside the battle turn reducer on Short or Long Rest.
  // - Spells/Descriptions-E-L.md lines 1183-1194, Playing-the-Game.md
  //   lines 736-738 and 788-808, and UBIQUITOUS_LANGUAGE.md:
  //   Heroism targets willing touched creatures, grants Frightened immunity
  //   until Concentration ends, and grants non-stacking Temporary Hit Points
  //   equal to the caster's spellcasting ability modifier at the start of each
  //   affected target's turns. The current runtime model only has a
  //   table-executable known-willing fact for self targets.
  // - Spells/Descriptions-A-D.md lines 85-97 and 692-703,
  //   Spells/Descriptions-M-P.md lines 907-918, and
  //   UBIQUITOUS_LANGUAGE.md: Animal Friendship is a Beast-only Wisdom-save
  //   spell whose failed save grants Charmed for 24 hours, Charm Person is a
  //   Humanoid-only Wisdom-save spell whose failed save grants Charmed for 1
  //   hour with hostile-target save Advantage, and Protection from Evil and
  //   Good applies a Concentration protection whose scoped creature types have
  //   Disadvantage on attack rolls against the target.
  //
  // This is the canonical package-local spec for implemented
  // @dnd/battle-runtime behavior. Old root battle.qnt is legacy/Core broad
  // proof and restore source material; it is not the place to add new
  // @dnd/battle-runtime behavior.

  type Actor = Fighter | Goblin
  type CombatantSide = PartySide | OppositionSide

  // FIXME: damage type is not only about battle (you can get damaged out of battle). similar with creature size, hand use, maybe more common domain truths. make sure there's shared module for it
  type DamageType = Acid | Bludgeoning | Poison | Force | Cold | Slashing | Piercing | Radiant | Necrotic | Lightning | Psychic | Fire | Thunder

  type SpellInvocation = MagicMissile | RayOfFrost | AcidSplash | PoisonSpray | ChillTouch | StarryWisp | SacredFlame | InflictWounds | BurningHands | ColorSpray | Entangle | EnsnaringStrike | SearingSmite | FaerieFire | AnimalFriendship | CharmPerson | ProtectionFromEvilAndGood | IceKnife | HealingWord | CureWounds | MassHealingWord | Shield | FalseLife | Longstrider | ShieldOfFaith | Heroism | Bane | Bless | Guidance | DivineFavor | DivineSmite | HuntersMark | ShockingGrasp | GuidingBolt | RayOfSickness | ViciousMockery | ProduceFlame | TrueStrike
  type SpellAttackDamageInvocation = RayOfFrostSpellAttack | PoisonSpraySpellAttack | ChillTouchSpellAttack | StarryWispSpellAttack | ShockingGraspSpellAttack | GuidingBoltSpellAttack | RayOfSicknessSpellAttack | ProduceFlameHurlSpellAttack
  type ChainedSpellAttackDamageInvocation =
    | ChromaticOrbChainedSpellAttack
  type ChromaticOrbDamageTypeChoice = ChromaticOrbAcid | ChromaticOrbCold | ChromaticOrbFire | ChromaticOrbLightning | ChromaticOrbPoison | ChromaticOrbThunder
  type SaveGatedDamageInvocation = AcidSplashSaveGate | SacredFlameSaveGate | InflictWoundsSaveGate | BurningHandsSaveGate | ViciousMockerySaveGate
  type AttackBurstSaveDamageInvocation =
    | IceKnifeAttackBurstSaveDamage
  type SaveGatedConditionInvocation =
    | ColorSpraySaveGate
    | EntangleSaveGate
    | AnimalFriendshipSaveGate
    | CharmPersonSaveGate
  type SaveGatedAttackRollAdvantageInvocation =
    | FaerieFireSaveGate
  type SaveGatedTargeting =
    | AreaSaveTargets
    | SingleSaveTarget
    | TargetListSaveTargets({ minTargets: int, baseSlotLevel: int, baseTargets: int, additionalTargetsPerSlotLevel: int })
  type SaveGatedDamageSuccess = NoDamageOnSaveSuccess | HalfDamageOnSaveSuccess
  type MovementSpeedKind = WalkSpeedKind | ClimbSpeedKind | SwimSpeedKind
  type DirectHitPointRestorationSpell = HealingWordRestoration | CureWoundsRestoration | MassHealingWordRestoration
  type ScalarBuffSpell = FalseLifeScalarBuff | LongstriderScalarBuff | ShieldOfFaithScalarBuff
  type RollModifierSpell = BaneRollModifier | BlessRollModifier | GuidanceRollModifier
  type SpellActionCost = SpellMagicAction | SpellBonusAction

  type ActiveEffect = MageArmor | RayOfFrostSpeedDelta | ShieldArmorClassBonus | LongstriderSpeedDelta | ShieldOfFaithArmorClassBonus | HeroismFrightenedImmunity | HeroismTurnStartTemporaryHitPoints({ amount: int }) | BaneD20RollPenalty | BlessD20RollBonus | GuidanceAbilityCheckBonus | ResistanceDamageReduction({ damageType: DamageType, usedThisTurn: bool }) | DivineFavorWeaponDamageRider({ durationTicks: int }) | HuntersMarkDamageRider({ target: Actor, transferAvailable: bool }) | RayOfSicknessPoisoned | ShockingGraspOpportunityAttackDenied | GuidingBoltNextAttackAdvantage | ViciousMockeryNextAttackDisadvantage | ColorSprayBlinded | EntangleRestrained | EnsnaringStrikeRestrained({ damageDice: int }) | SearingSmiteBurning({ damageDice: int, durationTicks: int }) | FaerieFireAttackRollAdvantage | AnimalFriendshipCharmed({ source: Actor, durationTicks: int }) | CharmPersonCharmed({ source: Actor, durationTicks: int }) | ProtectionFromEvilAndGoodAttackDisadvantage | ProduceFlameHeldLight({ durationTicks: int }) | SleepPendingRepeatSave({ source: Actor, repeatAtActor: Actor, repeatAtRound: int, hadIncapacitated: bool }) | SleepUnconscious({ source: Actor, hadUnconscious: bool, hadIncapacitated: bool })
  type SpellAttackRollMode = NormalSpellAttackRoll | AdvantageSpellAttackRoll | DisadvantageSpellAttackRoll
  type RuntimeCreatureType = HumanoidCreature | BeastCreature | AberrationCreature | CelestialCreature | ElementalCreature | FeyCreature | FiendCreature | UndeadCreature
  type ObjectTarget =
    | StarryWispObjectTarget
  type ObjectDamageDisposition =
    | ObjectHitPoints({ hitPoints: int })
    | ObjectHitPointsWithDamageThreshold({ hitPoints: int, damageThreshold: int })
    | ObjectTableResolved
  type ObjectDamageOutcome =
    | ObjectHitPointDamage({
        object: ObjectTarget,
        damageType: DamageType,
        rolledDamage: int,
        effectiveDamage: int,
        priorHitPoints: int,
        nextHitPoints: int,
        destroyed: bool,
      })
    | ObjectTableResolvedDamage({
        object: ObjectTarget,
        damageType: DamageType,
        rolledDamage: int,
      })

  type ChainedSpellAttackDamageHole =
    | ChainedSpellDamageTypeChoice
    | ChainedStepTargetChoice({ stepIndex: int })
    | ChainedStepAttackRoll({ stepIndex: int })
    | ChainedStepDamageRoll({ stepIndex: int })

  type D8FaceCounts = {
    face1: int,
    face2: int,
    face3: int,
    face4: int,
    face5: int,
    face6: int,
    face7: int,
    face8: int,
  }

  type ChainedSpellAttackDamageReplay =
    | ChainedNeedsDamageType
    | ChainedNeedsInitialTarget({ slotLevel: int, selectedDamageType: ChromaticOrbDamageTypeChoice })
    | ChainedNeedsLeapTarget({
        slotLevel: int,
        selectedDamageType: ChromaticOrbDamageTypeChoice,
        previousTarget: Actor,
        targeted: Set[Actor],
        leapsUsed: int,
      })
    | ChainedNeedsAttackRoll({
        slotLevel: int,
        selectedDamageType: ChromaticOrbDamageTypeChoice,
        stepIndex: int,
        target: Actor,
        targeted: Set[Actor],
        leapsUsed: int,
      })
    | ChainedNeedsDamageRoll({
        slotLevel: int,
        selectedDamageType: ChromaticOrbDamageTypeChoice,
        stepIndex: int,
        target: Actor,
        targeted: Set[Actor],
        leapsUsed: int,
        criticalHit: bool,
      })
    | ChainedComplete

  type CreatureSize = Tiny | Small | Medium | Large | Huge | Gargantuan

  type HandUse = HFree | HMainWeapon | HOffWeapon | HShield | HGrapple

  type Hole =
    | TargetChoice
    | ObjectTargetChoice
    | SpellTargetAllocation
    | SpellTargetList
    | AttackRoll
    | DamageRoll
    | SpellDamageRoll
    | DeathSavingThrow
    | SavingThrowOutcome
    | GrappleOutcome
    | EscapeGrappleOutcome
    | AbilityCheck
    | ReactionDecision
    | StatBlockRechargeRoll

  type FighterWeaponAttackDamageRoll = {
    weaponDamageRoll: int,
    divineFavorDamageRoll: int,
    divineSmiteDamageRoll: int,
    huntersMarkDamageRoll: int,
  }
  type FighterSpellAttackDamageRoll = {
    spellDamageRoll: int,
    huntersMarkDamageRoll: int,
  }

  type ReactionTrigger = AttackHit | AttackDamage | SpellCast | SaveFailed | AfterDamage | OpportunityAttack

  type LastTurnActor = NoTurnEnded | LastTurnFighter | LastTurnGoblin
  type FighterCriticalRange = DefaultCriticalRange | ImprovedCriticalRange19

  // Continuations carry the replay lane interrupted by a Reaction window. This
  // package-local QNT keeps representative deterministic fills for those lanes;
  // TypeScript carries the caller-provided fills in the runtime frame.
  type ReactionContinuation =
    | ResumeAttack({ damage: int })
    | ResumeRayOfFrost
    | ResumePoisonSpray
    | ResumeChillTouch
    | ResumeTrueStrikeWeaponAttack
    | ResumeProduceFlameHurl
    | ResumeIceKnife
    | ResumeSaveGateDamage
    | ResumeAfterDamage
    | ResumeMovement({ speedKind: MovementSpeedKind, movementCost: int })

  type PendingReactionFrame = {
    trigger: ReactionTrigger,
    eligibleReactors: Set[Actor],
    offeredReactors: Set[Actor],
    continuation: ReactionContinuation,
  }
  type AttackDamageConcentrationContinuation =
    | ResumeAttackDamageToGoblin
  type InterruptFrame =
    | PendingReaction(PendingReactionFrame)
    | PendingAttackDamageConcentration({ continuation: AttackDamageConcentrationContinuation, damage: int })
  type PendingReactionFrameOption =
    | NoPendingReactionFrame
    | HasPendingReactionFrame(PendingReactionFrame)

  type ZeroHpLifecycle = DiesAtZeroHp | UsesDeathSavingThrows
  type DamageDisposition = OrdinaryDamage | KnockOut

  type HiddenDiscoveryDc =
    | HiddenDc15
    | HiddenDc16
    | HiddenDc17
    | HiddenDc18
    | HiddenDc19
    | HiddenDc20

  type HiddenState =
    | NotHidden
    | HiddenByDc(HiddenDiscoveryDc)

  type ActiveOngoingFeatureOccurrence =
    | NoActiveOngoingFeatureOccurrence
    | ActiveStartOfTurnOngoingFeature
    | ActiveRoundExtendedOngoingFeature({
        expiresAtEndOfFighterTurnRound: int,
        maxExpiresRound: int,
      })
    | ActiveFixedDurationOngoingFeature({
        expiresAtEndOfFighterTurnRound: int,
      })

  type ActiveOngoingFeatureOccurrences = int -> ActiveOngoingFeatureOccurrence

  pure val FIGHTER_RAGE_SOURCE_KEY = 1
  pure val FIGHTER_RECKLESS_ATTACK_SOURCE_KEY = 2
  pure val NO_ACTIVE_ONGOING_FEATURE_OCCURRENCES: ActiveOngoingFeatureOccurrences =
    Map(
      FIGHTER_RAGE_SOURCE_KEY -> NoActiveOngoingFeatureOccurrence,
      FIGHTER_RECKLESS_ATTACK_SOURCE_KEY -> NoActiveOngoingFeatureOccurrence,
    )

  type Combatant = {
    hp: int,
    maxHp: int,
    tempHp: int,
    ac: int,
    dexMod: int,
    activeEffects: Set[ActiveEffect],
    concentrating: bool,
    unconscious: bool,
    // SRD 5.2.1 "Knocking Out a Creature": positive-HP Unconscious caused
    // by Knock Out, with the Knock Out ending rules rather than zero-HP
    // Death Saving Throw lifecycle.
    knockedOut: bool,
    stable: bool,
    deathSuccesses: int,
    deathFailures: int,
    lifecycle: ZeroHpLifecycle,
    reactionAvailable: bool,
    speed: int,
    hasRovingSpeedKindGrants: bool,
    movementSpent: int,
    hidden: HiddenState,
    dodging: bool,
    prone: bool,
    incapacitated: bool,
    // Runtime projection: true when the combatant is wearing armor whose
    // category is Heavy. This exists for SRD Barbarian Heavy-armor gates
    // without modeling full equipment/armor state in the Quint battle spec.
    wearingHeavyArmor: bool,
    activeOngoingFeatureOccurrences: ActiveOngoingFeatureOccurrences,
    creatureSize: CreatureSize,
    leftHandUse: HandUse,
    rightHandUse: HandUse,
  }

  type GrappleLink = {
    escapeDc: int,
    targetDragCostExempt: bool,
  }

  type GrappleState =
    | NoGrapple
    | FighterGrapplesGoblin(GrappleLink)

  type Initiative = {
    round: int,
    alreadyActed: List[Actor],
    stillToAct: List[Actor],
  }

  type BattleState = {
    initiative: Initiative,
    fighter: Combatant,
    goblin: Combatant,
    actionAvailable: bool,
    bonusActionAvailable: bool,
    spellSlotExpendedThisTurn: bool,
    attackRollMadeThisTurn: bool,
    dashMovementBonus: int,
    disengaged: bool,
    lightWeaponAttackMade: bool,
    fighterReadiedSpellHeld: bool,
    fighterReadiedMovementHeld: bool,
    fighterHelpAttackGoblinForGoblin: bool,
    grapple: GrappleState,
    interruptStack: List[InterruptFrame],
    fighterHidePrerequisite: bool,
    goblinRechargeAvailable: bool,
    goblinLegendaryUsesRemaining: int,
    goblinMultiattackDispatchesRemaining: int,
    lastTurnActor: LastTurnActor,
    legendaryActionWindowConsumed: bool,
    fighterCriticalRange: FighterCriticalRange,
    fighterSneakAttackSupported: bool,
    fighterSneakAttackUsedThisTurn: bool,
    fighterExtraAttackSupported: bool,
    fighterExtraAttackSlotsRemaining: int,
  }

  type ActionSurgeResult = {
    state: BattleState,
    usesRemaining: int,
    usedThisTurn: bool,
  }

  type SecondWindResult = {
    state: BattleState,
    usesRemaining: int,
  }

  type CuttingWordsResult = {
    state: BattleState,
    usesRemaining: int,
  }

  type BonusActionDashTemporaryHitPointsResult = {
    state: BattleState,
    usesRemaining: int,
  }

  type AttackReplay =
    | AttackNeedsTarget
    | AttackNeedsAttackRoll
    | AttackRollFilled({ attackTotal: int, naturalD20: int })
    | AttackReplayComplete

  pure val initialState: BattleState = {
    initiative: { round: 1, alreadyActed: [], stillToAct: [Fighter, Goblin] },
    fighter: {
      hp: 12,
      maxHp: 12,
      tempHp: 0,
      ac: 10,
      dexMod: 0,
      activeEffects: Set(),
      concentrating: false,
      unconscious: false,
      knockedOut: false,
      stable: false,
      deathSuccesses: 0,
      deathFailures: 0,
      lifecycle: UsesDeathSavingThrows,
      reactionAvailable: true,
      speed: 30,
      hasRovingSpeedKindGrants: false,
      movementSpent: 0,
      hidden: NotHidden,
      dodging: false,
      prone: false,
      incapacitated: false,
      wearingHeavyArmor: false,
      activeOngoingFeatureOccurrences: NO_ACTIVE_ONGOING_FEATURE_OCCURRENCES,
      creatureSize: Medium,
      leftHandUse: HFree,
      rightHandUse: HMainWeapon,
    },
    goblin: {
      hp: 10,
      maxHp: 10,
      tempHp: 0,
      ac: 15,
      dexMod: 2,
      activeEffects: Set(),
      concentrating: false,
      unconscious: false,
      knockedOut: false,
      stable: false,
      deathSuccesses: 0,
      deathFailures: 0,
      lifecycle: DiesAtZeroHp,
      reactionAvailable: true,
      speed: 30,
      hasRovingSpeedKindGrants: false,
      movementSpent: 0,
      hidden: NotHidden,
      dodging: false,
      prone: false,
      incapacitated: false,
      wearingHeavyArmor: false,
      activeOngoingFeatureOccurrences: NO_ACTIVE_ONGOING_FEATURE_OCCURRENCES,
      creatureSize: Small,
      leftHandUse: HFree,
      rightHandUse: HFree,
    },
    actionAvailable: true,
    bonusActionAvailable: true,
    spellSlotExpendedThisTurn: false,
    attackRollMadeThisTurn: false,
    dashMovementBonus: 0,
    disengaged: false,
    lightWeaponAttackMade: false,
    fighterReadiedSpellHeld: false,
    fighterReadiedMovementHeld: false,
    fighterHelpAttackGoblinForGoblin: false,
    grapple: NoGrapple,
    interruptStack: [],
    fighterHidePrerequisite: false,
    goblinRechargeAvailable: true,
    goblinLegendaryUsesRemaining: 2,
    goblinMultiattackDispatchesRemaining: 0,
    lastTurnActor: NoTurnEnded,
    legendaryActionWindowConsumed: false,
    fighterCriticalRange: DefaultCriticalRange,
    fighterSneakAttackSupported: false,
    fighterSneakAttackUsedThisTurn: false,
    fighterExtraAttackSupported: false,
    fighterExtraAttackSlotsRemaining: 0,
  }

  // The battle runtime receives Initiative counts and the caller-resolved
  // order for tied counts at the boundary. The spec treats that order as
  // authoritative once battle starts.
  pure val callerOrderedTieInitialState: BattleState = {
    ...initialState,
    initiative: { round: 1, alreadyActed: [], stillToAct: [Goblin, Fighter] },
  }

  pure def currentActor(state: BattleState): Actor =
    state.initiative.stillToAct[0]

  pure def currentActorCanAttack(state: BattleState): bool =
    (state.actionAvailable or (currentActor(state) == Fighter and state.fighterExtraAttackSlotsRemaining > 0)) and
    (
      (currentActor(state) == Fighter and not(state.fighter.unconscious) and not(state.fighter.incapacitated)) or
      (currentActor(state) == Goblin and state.goblin.hp > 0)
    )

  pure def fighterRageOccurrence(state: BattleState): ActiveOngoingFeatureOccurrence =
    state.fighter.activeOngoingFeatureOccurrences.get(FIGHTER_RAGE_SOURCE_KEY)

  pure def fighterRecklessAttackOccurrence(state: BattleState): ActiveOngoingFeatureOccurrence =
    state.fighter.activeOngoingFeatureOccurrences.get(FIGHTER_RECKLESS_ATTACK_SOURCE_KEY)

  pure def fighterHasRage(state: BattleState): bool =
    fighterRageOccurrence(state) != NoActiveOngoingFeatureOccurrence

  pure def fighterHasRoundExtendedRage(state: BattleState): bool =
    match fighterRageOccurrence(state) {
      | ActiveRoundExtendedOngoingFeature(_) => true
      | _ => false
    }

  pure def fighterHasRecklessAttack(state: BattleState): bool =
    fighterRecklessAttackOccurrence(state) == ActiveStartOfTurnOngoingFeature

  pure def fighterRageResistances(state: BattleState): Set[DamageType] =
    if (fighterHasRage(state))
      Set(Bludgeoning, Piercing, Slashing)
    else
      Set()

  pure def removeFighterBonusActionOngoingFeature(state: BattleState): BattleState =
    {
      ...state,
      fighter: {
        ...state.fighter,
        activeOngoingFeatureOccurrences: state.fighter.activeOngoingFeatureOccurrences
          .set(FIGHTER_RAGE_SOURCE_KEY, NoActiveOngoingFeatureOccurrence),
      },
    }

  pure def removeFighterFirstAttackRollOngoingFeature(state: BattleState): BattleState =
    {
      ...state,
      fighter: {
        ...state.fighter,
        activeOngoingFeatureOccurrences: state.fighter.activeOngoingFeatureOccurrences
          .set(FIGHTER_RECKLESS_ATTACK_SOURCE_KEY, NoActiveOngoingFeatureOccurrence),
      },
    }

  pure def expireFighterEndOfTurnOngoingFeatures(state: BattleState): BattleState =
    if (currentActor(state) != Fighter)
      state
    else {
      val afterRoundExtended = match fighterRageOccurrence(state) {
        | ActiveRoundExtendedOngoingFeature(data) =>
            if (data.expiresAtEndOfFighterTurnRound == state.initiative.round)
              removeFighterBonusActionOngoingFeature(state)
            else
              state
        | _ => state
      }
      match fighterRageOccurrence(afterRoundExtended) {
        | ActiveFixedDurationOngoingFeature(data) =>
            if (data.expiresAtEndOfFighterTurnRound == state.initiative.round)
              removeFighterBonusActionOngoingFeature(afterRoundExtended)
            else
              afterRoundExtended
        | _ => afterRoundExtended
      }
    }

  pure def expireFighterStartOfTurnOngoingFeatures(state: BattleState, nextActor: Actor): BattleState =
    if (nextActor == Fighter)
      removeFighterFirstAttackRollOngoingFeature(state)
    else
      state

  pure def expireStartOfTurnSpellEffects(state: BattleState, nextActor: Actor): BattleState =
    match nextActor {
      | Fighter => {
          ...state,
          fighter: { ...state.fighter, activeEffects: resetResistanceDamageReductions(state.fighter.activeEffects).exclude(Set(ShieldArmorClassBonus)) },
        }
      | Goblin => {
          ...state,
          goblin: { ...state.goblin, activeEffects: resetResistanceDamageReductions(state.goblin.activeEffects).exclude(Set(ShieldArmorClassBonus)) },
        }
    }

  pure def resetResistanceDamageReductions(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.map(effect => match effect {
      | ResistanceDamageReduction(data) => ResistanceDamageReduction({ ...data, usedThisTurn: false })
      | _ => effect
    })

  pure def applyStartOfTurnSpellEffects(state: BattleState, nextActor: Actor): BattleState =
    match nextActor {
      | Fighter => {
          val heroismTempHp = state.fighter.activeEffects
            .map(effect => match effect {
              | HeroismTurnStartTemporaryHitPoints(data) => data.amount
              | _ => 0
            })
            .fold(0, (highest, amount) => if (highest > amount) highest else amount)
          {
            ...state,
            fighter: { ...state.fighter, tempHp: if (state.fighter.tempHp > heroismTempHp) state.fighter.tempHp else heroismTempHp },
          }
        }
      | Goblin => {
          val heroismTempHp = state.goblin.activeEffects
            .map(effect => match effect {
              | HeroismTurnStartTemporaryHitPoints(data) => data.amount
              | _ => 0
            })
            .fold(0, (highest, amount) => if (highest > amount) highest else amount)
          {
            ...state,
            goblin: { ...state.goblin, tempHp: if (state.goblin.tempHp > heroismTempHp) state.goblin.tempHp else heroismTempHp },
          }
        }
    }

  pure def tickDurationActiveEffects(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects
      .map(effect => match effect {
        | DivineFavorWeaponDamageRider(data) => DivineFavorWeaponDamageRider({ durationTicks: data.durationTicks - 1 })
        | HuntersMarkDamageRider(data) => HuntersMarkDamageRider(data)
        | SearingSmiteBurning(data) => SearingSmiteBurning({ damageDice: data.damageDice, durationTicks: data.durationTicks - 1 })
        | AnimalFriendshipCharmed(data) => AnimalFriendshipCharmed({ source: data.source, durationTicks: data.durationTicks - 1 })
        | CharmPersonCharmed(data) => CharmPersonCharmed({ source: data.source, durationTicks: data.durationTicks - 1 })
        | ProduceFlameHeldLight(data) => ProduceFlameHeldLight({ durationTicks: data.durationTicks - 1 })
        | _ => effect
      })
      .filter(effect => match effect {
        | DivineFavorWeaponDamageRider(data) => data.durationTicks > 0
        | HuntersMarkDamageRider(_) => true
        | SearingSmiteBurning(data) => data.durationTicks > 0
        | AnimalFriendshipCharmed(data) => data.durationTicks > 0
        | CharmPersonCharmed(data) => data.durationTicks > 0
        | ProduceFlameHeldLight(data) => data.durationTicks > 0
        | _ => true
      })

  pure def tickRoundDurationSpellEffects(state: BattleState): BattleState =
    {
      ...state,
      fighter: { ...state.fighter, activeEffects: tickDurationActiveEffects(state.fighter.activeEffects) },
      goblin: { ...state.goblin, activeEffects: tickDurationActiveEffects(state.goblin.activeEffects) },
    }

  pure def normalizeFighterEarlyEndedOngoingFeatures(state: BattleState): BattleState =
    if (state.fighter.wearingHeavyArmor)
      removeFighterBonusActionOngoingFeature(state)
    else if (state.fighter.incapacitated or state.fighter.unconscious)
      {
        ...state,
        fighter: {
        ...state.fighter,
          activeOngoingFeatureOccurrences: state.fighter.activeOngoingFeatureOccurrences
            .set(FIGHTER_RAGE_SOURCE_KEY, if (state.fighter.unconscious)
              NoActiveOngoingFeatureOccurrence
            else
              match fighterRageOccurrence(state) {
                | ActiveRoundExtendedOngoingFeature(_) => NoActiveOngoingFeatureOccurrence
                | _ => fighterRageOccurrence(state)
              }),
        },
      }
    else
      state

  pure def fighterRoundExtendedOngoingFeatureMaxExpiresRound(state: BattleState): int =
    match fighterRageOccurrence(state) {
      | ActiveRoundExtendedOngoingFeature(data) => data.maxExpiresRound
      | _ => state.initiative.round + 100
    }

  pure def setFighterRoundExtendedOngoingFeatureExpiry(state: BattleState, round: int): BattleState = {
    val maxRound = fighterRoundExtendedOngoingFeatureMaxExpiresRound(state)
    {
      ...state,
      fighter: {
        ...state.fighter,
        activeOngoingFeatureOccurrences: state.fighter.activeOngoingFeatureOccurrences
          .set(FIGHTER_RAGE_SOURCE_KEY, ActiveRoundExtendedOngoingFeature({
            expiresAtEndOfFighterTurnRound: if (round > maxRound) maxRound else round,
            maxExpiresRound: maxRound,
          })),
      },
    }
  }

  pure def combatantArmorClass(combatant: Combatant): int =
    activeEffectArmorClass(combatant.ac, combatant.dexMod, combatant.activeEffects)

  pure def attackTargetAc(state: BattleState): int =
    if (currentActor(state) == Fighter) combatantArmorClass(state.goblin) else combatantArmorClass(state.fighter)

  pure def activeEffectArmorClass(baseAc: int, dexMod: int, effects: Set[ActiveEffect]): int =
    {
      val base = if (effects.exists(effect => match effect {
        | MageArmor => true
        | RayOfFrostSpeedDelta => false
        | ShieldArmorClassBonus => false
        | LongstriderSpeedDelta => false
        | ShieldOfFaithArmorClassBonus => false
        | HeroismFrightenedImmunity => false
        | HeroismTurnStartTemporaryHitPoints(_) => false
        | BaneD20RollPenalty => false
        | BlessD20RollBonus => false
        | GuidanceAbilityCheckBonus => false
        | ResistanceDamageReduction(_) => false
        | DivineFavorWeaponDamageRider(_) => false
        | HuntersMarkDamageRider(_) => false
        | RayOfSicknessPoisoned => false
        | ShockingGraspOpportunityAttackDenied => false
        | GuidingBoltNextAttackAdvantage => false
        | ViciousMockeryNextAttackDisadvantage => false
        | ColorSprayBlinded => false
        | EntangleRestrained => false
        | EnsnaringStrikeRestrained(_) => false
        | SearingSmiteBurning(_) => false
        | FaerieFireAttackRollAdvantage => false
        | AnimalFriendshipCharmed(_) => false
        | CharmPersonCharmed(_) => false
        | ProtectionFromEvilAndGoodAttackDisadvantage => false
        | ProduceFlameHeldLight(_) => false
        | SleepPendingRepeatSave(_) => false
        | SleepUnconscious(_) => false
      })) 13 + dexMod else baseAc
      val shieldBonus = if (effects.contains(ShieldArmorClassBonus)) 5 else 0
      val shieldOfFaithBonus = if (effects.contains(ShieldOfFaithArmorClassBonus)) 2 else 0
      base + shieldBonus + shieldOfFaithBonus
    }

  pure def openHoles(state: BattleState): Set[Hole] =
    if (currentActor(state) == Goblin and not(state.goblinRechargeAvailable))
      Set(StatBlockRechargeRoll)
    else if (currentActorCanAttack(state))
      Set(TargetChoice)
    else Set()

  pure def hideHoles(state: BattleState): Set[Hole] =
    if (
      currentActor(state) == Fighter and
      state.actionAvailable and
      not(state.fighter.unconscious) and
      state.fighterHidePrerequisite
    )
      Set(AbilityCheck)
    else Set()

  pure def hiddenDiscoveryDcValue(hidden: HiddenDiscoveryDc): int =
    match hidden {
      | HiddenDc15 => 15
      | HiddenDc16 => 16
      | HiddenDc17 => 17
      | HiddenDc18 => 18
      | HiddenDc19 => 19
      | HiddenDc20 => 20
    }

  pure def totalToHiddenState(total: int): HiddenState =
    if (total < 15) NotHidden
    else if (total == 15) HiddenByDc(HiddenDc15)
    else if (total == 16) HiddenByDc(HiddenDc16)
    else if (total == 17) HiddenByDc(HiddenDc17)
    else if (total == 18) HiddenByDc(HiddenDc18)
    else if (total == 19) HiddenByDc(HiddenDc19)
    else HiddenByDc(HiddenDc20)

  pure def fighterIsHidden(state: BattleState): bool =
    match state.fighter.hidden {
      | NotHidden => false
      | HiddenByDc(_) => true
    }

  pure def hideFighter(state: BattleState, stealthTotal: int): BattleState =
    if (
      currentActor(state) == Fighter and
      state.actionAvailable and
      not(state.fighter.unconscious) and
      state.fighterHidePrerequisite
    )
      {
        ...state,
        fighter: { ...state.fighter, hidden: totalToHiddenState(stealthTotal) },
        actionAvailable: false,
      }
    else
      state

  pure def searchGoblinForFighter(state: BattleState, perceptionTotal: int): BattleState =
    if (currentActor(state) == Goblin and state.actionAvailable)
      {
        ...state,
        fighter: {
          ...state.fighter,
          hidden: match state.fighter.hidden {
            | NotHidden => NotHidden
            | HiddenByDc(dc) =>
              if (perceptionTotal >= hiddenDiscoveryDcValue(dc)) NotHidden else state.fighter.hidden
          },
        },
        actionAvailable: false,
      }
    else
      state

  pure def revealFighterHidden(state: BattleState): BattleState =
    { ...state, fighter: { ...state.fighter, hidden: NotHidden } }

  pure def attackReplayHoles(state: BattleState, replay: AttackReplay): Set[Hole] =
    if (not(currentActorCanAttack(state)))
      Set()
    else match replay {
      | AttackNeedsTarget => Set(TargetChoice)
      | AttackNeedsAttackRoll => Set(AttackRoll)
      | AttackRollFilled(roll) =>
          if (attackHits(roll.attackTotal, roll.naturalD20, attackTargetAc(state), attackCriticalThreshold(state, currentActor(state))))
            Set(DamageRoll)
          else
            Set()
      | AttackReplayComplete => Set()
    }

  pure def nextInitiative(initiative: Initiative): Initiative = {
    val current = initiative.stillToAct[0]
    val remaining = initiative.stillToAct.slice(1, initiative.stillToAct.length())
    val acted = initiative.alreadyActed.append(current)

    if (remaining.length() == 0)
      { round: initiative.round + 1, alreadyActed: [], stillToAct: acted }
    else
      { round: initiative.round, alreadyActed: acted, stillToAct: remaining }
  }

  pure def endTurn(state: BattleState): BattleState = {
    val featureChecked = normalizeFighterEarlyEndedOngoingFeatures(expireFighterEndOfTurnOngoingFeatures(state))
    val advancedInitiative = nextInitiative(featureChecked.initiative)
    val nextActor = advancedInitiative.stillToAct[0]
    val featureAdvanced = applyStartOfTurnSpellEffects(expireStartOfTurnSpellEffects(expireFighterStartOfTurnOngoingFeatures(featureChecked, nextActor), nextActor), nextActor)
    val spellDurationAdvanced = if (advancedInitiative.round > featureChecked.initiative.round)
      tickRoundDurationSpellEffects(featureAdvanced)
    else
      featureAdvanced
    {
      ...spellDurationAdvanced,
      initiative: advancedInitiative,
      actionAvailable: true,
      bonusActionAvailable: true,
      spellSlotExpendedThisTurn: false,
      attackRollMadeThisTurn: false,
      dashMovementBonus: 0,
      disengaged: false,
      lightWeaponAttackMade: false,
      fighterReadiedSpellHeld: if (spellDurationAdvanced.fighterReadiedSpellHeld and nextActor == Fighter) false else spellDurationAdvanced.fighterReadiedSpellHeld,
      fighterReadiedMovementHeld: if (spellDurationAdvanced.fighterReadiedMovementHeld and nextActor == Fighter) false else spellDurationAdvanced.fighterReadiedMovementHeld,
      fighterHelpAttackGoblinForGoblin: if (nextActor == Fighter) false else spellDurationAdvanced.fighterHelpAttackGoblinForGoblin,
      fighter: if (nextActor == Fighter) { ...spellDurationAdvanced.fighter, reactionAvailable: true, movementSpent: 0, dodging: false } else spellDurationAdvanced.fighter,
      goblin: if (nextActor == Goblin) { ...spellDurationAdvanced.goblin, reactionAvailable: true, movementSpent: 0, dodging: false } else spellDurationAdvanced.goblin,
      goblinLegendaryUsesRemaining: if (nextActor == Goblin) 2 else spellDurationAdvanced.goblinLegendaryUsesRemaining,
      goblinMultiattackDispatchesRemaining: 0,
      lastTurnActor: if (currentActor(featureChecked) == Fighter) LastTurnFighter else LastTurnGoblin,
      legendaryActionWindowConsumed: false,
      fighterSneakAttackUsedThisTurn: false,
      fighterExtraAttackSlotsRemaining: 0,
    }
  }

  pure def endTurnWithGoblinRechargeRoll(state: BattleState, roll: int): BattleState = {
    val advanced = endTurn(state)
    if (currentActor(advanced) == Goblin and not(advanced.goblinRechargeAvailable))
      { ...advanced, goblinRechargeAvailable: roll >= 5 }
    else
      advanced
  }

  pure def goblinLegendaryActionWindowOpen(state: BattleState): bool =
    state.lastTurnActor == LastTurnFighter and currentActor(state) != Goblin and not(state.legendaryActionWindowConsumed)

  pure def goblinCanUseLegendaryAction(state: BattleState): bool =
    state.goblin.hp > 0 and
    goblinLegendaryActionWindowOpen(state) and
    state.goblinLegendaryUsesRemaining > 0

  pure def useGoblinLegendaryAction(state: BattleState): BattleState =
    if (goblinCanUseLegendaryAction(state))
      { ...state, goblinLegendaryUsesRemaining: state.goblinLegendaryUsesRemaining - 1, legendaryActionWindowConsumed: true }
    else
      state

  pure def openReactionWindow(state: BattleState, frame: PendingReactionFrame): BattleState =
    { ...state, interruptStack: state.interruptStack.append(PendingReaction(frame)) }

  pure def reactionFrameComplete(frame: PendingReactionFrame): bool =
    frame.eligibleReactors == frame.offeredReactors

  pure def reactorCanReact(state: BattleState, reactor: Actor): bool =
    match reactor {
      | Fighter => state.fighter.reactionAvailable
      | Goblin => state.goblin.reactionAvailable
    }

  pure def spendReaction(state: BattleState, reactor: Actor): BattleState =
    match reactor {
      | Fighter => { ...state, fighter: { ...state.fighter, reactionAvailable: false } }
      | Goblin => { ...state, goblin: { ...state.goblin, reactionAvailable: false } }
    }

  pure def applyShieldReactionSpell(state: BattleState, reactor: Actor): BattleState =
    match reactor {
      | Fighter => {
          ...state,
          fighter: { ...state.fighter, activeEffects: state.fighter.activeEffects.union(Set(ShieldArmorClassBonus)) },
        }
      | Goblin => {
          ...state,
          goblin: { ...state.goblin, activeEffects: state.goblin.activeEffects.union(Set(ShieldArmorClassBonus)) },
        }
    }

  pure def castShieldReactionSpell(state: BattleState, reactor: Actor): BattleState =
    if (canExpendSpellSlotThisTurn(state))
      { ...applyShieldReactionSpell(state, reactor), spellSlotExpendedThisTurn: true }
    else
      state

  pure def reactionResolvesShieldSpell(state: BattleState, frame: PendingReactionFrame, reactor: Actor): bool =
    frame.trigger == SpellCast or (frame.trigger == AttackHit and not(state.fighterReadiedSpellHeld and reactor == Fighter))

  pure def declineReaction(state: BattleState, reactor: Actor): BattleState = {
    if (state.interruptStack.length() == 0)
      state
    else {
      val top = state.interruptStack[state.interruptStack.length() - 1]
      match top {
        | PendingReaction(frame) => {
            val validReactor = frame.eligibleReactors.contains(reactor) and not(frame.offeredReactors.contains(reactor))
            if (not(validReactor))
              state
            else {
              val updatedFrame = { ...frame, offeredReactors: frame.offeredReactors.union(Set(reactor)) }
              val rest = state.interruptStack.slice(0, state.interruptStack.length() - 1)
              if (reactionFrameComplete(updatedFrame))
                { ...state, interruptStack: rest }
              else
                { ...state, interruptStack: rest.append(PendingReaction(updatedFrame)) }
            }
          }
        | _ => state
      }
    }
  }

  pure def declineReactionAndResume(state: BattleState, reactor: Actor): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      val top = state.interruptStack[state.interruptStack.length() - 1]
      match top {
        | PendingReaction(frame) => {
            val afterDecision = declineReaction(state, reactor)
            if (afterDecision.interruptStack.length() < state.interruptStack.length())
              resumeReactionContinuation(afterDecision, frame.continuation)
            else
              afterDecision
          }
        | _ => state
      }
    }

  pure def resolveReaction(state: BattleState, reactor: Actor): BattleState =
    if (state.interruptStack.length() == 0 or not(reactorCanReact(state, reactor)))
      state
    else {
      val top = state.interruptStack[state.interruptStack.length() - 1]
      match top {
        | PendingReaction(frame) => {
            val validReactor = frame.eligibleReactors.contains(reactor) and not(frame.offeredReactors.contains(reactor))
            if (not(validReactor))
              state
            else if (reactionResolvesShieldSpell(state, frame, reactor) and not(canExpendSpellSlotThisTurn(state)))
              state
            else {
              val afterReactionSpend = spendReaction(state, reactor)
              val afterReactionProcedure =
                match frame.trigger {
                  | OpportunityAttack => resolveGoblinOpportunityAttack(afterReactionSpend, 20, 18, 4, true)
                  | AttackHit => if (state.fighterReadiedSpellHeld and reactor == Fighter) releaseReadiedSpell(afterReactionSpend) else castShieldReactionSpell(afterReactionSpend, reactor)
                  | SpellCast => castShieldReactionSpell(afterReactionSpend, reactor)
                  | _ => releaseReadiedSpell(afterReactionSpend)
                }
              val afterDecision = declineReaction(afterReactionProcedure, reactor)
              if (afterDecision.interruptStack.length() < state.interruptStack.length())
                resumeReactionContinuation(afterDecision, frame.continuation)
              else
                afterDecision
            }
          }
        | _ => state
      }
    }

  pure def pendingReactionFrame(frame: InterruptFrame): PendingReactionFrameOption =
    match frame {
      | PendingReaction(pending) => HasPendingReactionFrame(pending)
      | PendingAttackDamageConcentration(_) => NoPendingReactionFrame
    }

  pure def openAttackDamageConcentration(state: BattleState, continuation: AttackDamageConcentrationContinuation, damage: int): BattleState =
    { ...state, interruptStack: state.interruptStack.append(PendingAttackDamageConcentration({ continuation: continuation, damage: damage })) }

  pure def resolveAttackDamageConcentration(state: BattleState, concentrationSaveSucceeded: bool): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      val top = state.interruptStack[state.interruptStack.length() - 1]
      match top {
        | PendingAttackDamageConcentration(frame) => {
            val rest = { ...state, interruptStack: state.interruptStack.slice(0, state.interruptStack.length() - 1) }
            match frame.continuation {
              | ResumeAttackDamageToGoblin => { ...rest, goblin: applyDamageFromSource(rest.goblin, frame.damage, 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter), actionAvailable: false }
            }
          }
        | _ => state
      }
    }

  pure def resumeReactionContinuation(state: BattleState, continuation: ReactionContinuation): BattleState =
    match continuation {
      | ResumeAttack(attack) =>
          if (state.goblin.concentrating and attack.damage > 0)
            openAttackDamageConcentration(state, ResumeAttackDamageToGoblin, attack.damage)
          else
            { ...state, goblin: applyDamageFromSource(state.goblin, attack.damage, 1, true, OrdinaryDamage, Fighter), actionAvailable: false }
      | ResumeRayOfFrost => resolveRayOfFrost(state, 15, 10, 4, true)
      | ResumePoisonSpray => resolvePoisonSpray(state, 15, 10, 7, true)
      | ResumeChillTouch => resolveChillTouch(state, 15, 10, 6, true)
      | ResumeTrueStrikeWeaponAttack => resolveTrueStrikeWeaponAttack(state, 15, 10, 4, 5, 3, 5, Radiant, Slashing, true)
      | ResumeProduceFlameHurl => resolveProduceFlameHurl(state, 15, 10, 5, true)
      | ResumeIceKnife => resolveIceKnife(state, 15, 10, 4, false, true, false, 6, true, true)
      | ResumeSaveGateDamage => resolveAcidSplash(state, false, true, 4, true, true)
      | ResumeAfterDamage => state
      | ResumeMovement(movement) => applyFighterMovementWithSpeedKind(state, movement.speedKind, movement.movementCost)
    }

  pure def endTurnWithDeathSave(state: BattleState, deathSaveRoll: int): BattleState = {
    val advanced = endTurn(state)

    if (currentActor(advanced) == Fighter)
      { ...advanced, fighter: applyStartTurnDeathSave(advanced.fighter, deathSaveRoll) }
    else
      advanced
  }

  pure def attackHits(total: int, naturalD20: int, armorClass: int, criticalThreshold: int): bool =
    if (naturalD20 == 1) false
    else if (attackIsCritical(naturalD20, criticalThreshold)) true
    else total >= armorClass

  pure def attackIsCritical(naturalD20: int, criticalThreshold: int): bool =
    naturalD20 >= criticalThreshold

  pure def fighterCriticalThreshold(state: BattleState): int =
    match state.fighterCriticalRange {
      | DefaultCriticalRange => 20
      | ImprovedCriticalRange19 => 19
    }

  pure def attackCriticalThreshold(state: BattleState, attacker: Actor): int =
    if (attacker == Fighter) fighterCriticalThreshold(state) else 20

  pure def withFighterImprovedCriticalRange19(state: BattleState): BattleState =
    { ...state, fighterCriticalRange: ImprovedCriticalRange19 }

  pure def withFighterSneakAttack(state: BattleState): BattleState =
    { ...state, fighterSneakAttackSupported: true }

  pure def withFighterExtraAttack(state: BattleState): BattleState =
    { ...state, fighterExtraAttackSupported: true }

  pure def spendFighterAttackActionOrExtraAttackSlot(state: BattleState): BattleState =
    if (state.fighterExtraAttackSlotsRemaining > 0)
      { ...state, fighterExtraAttackSlotsRemaining: state.fighterExtraAttackSlotsRemaining - 1 }
    else if (state.actionAvailable)
      {
        ...state,
        actionAvailable: false,
        fighterExtraAttackSlotsRemaining: if (state.fighterExtraAttackSupported) 1 else 0,
      }
    else
      state

  pure def withGoblinHp(state: BattleState, hp: int, tempHp: int): BattleState =
    { ...state, goblin: { ...state.goblin, hp: hp, tempHp: tempHp } }

  pure def withFighterHp(state: BattleState, hp: int, tempHp: int): BattleState =
    { ...state, fighter: { ...state.fighter, hp: hp, tempHp: tempHp } }

  pure def fighterWeaponAttackDamageRoll(weaponDamageRoll: int): FighterWeaponAttackDamageRoll =
    { weaponDamageRoll: weaponDamageRoll, divineFavorDamageRoll: 0, divineSmiteDamageRoll: 0, huntersMarkDamageRoll: 0 }

  pure def fighterWeaponAttackDamageRollWithDivineFavor(
    weaponDamageRoll: int,
    divineFavorDamageRoll: int,
  ): FighterWeaponAttackDamageRoll =
    { weaponDamageRoll: weaponDamageRoll, divineFavorDamageRoll: divineFavorDamageRoll, divineSmiteDamageRoll: 0, huntersMarkDamageRoll: 0 }

  pure def fighterWeaponAttackDamageRollWithDivineSmite(
    weaponDamageRoll: int,
    divineSmiteDamageRoll: int,
  ): FighterWeaponAttackDamageRoll =
    { weaponDamageRoll: weaponDamageRoll, divineFavorDamageRoll: 0, divineSmiteDamageRoll: divineSmiteDamageRoll, huntersMarkDamageRoll: 0 }

  pure def fighterWeaponAttackDamageRollWithHuntersMark(
    weaponDamageRoll: int,
    huntersMarkDamageRoll: int,
  ): FighterWeaponAttackDamageRoll =
    { weaponDamageRoll: weaponDamageRoll, divineFavorDamageRoll: 0, divineSmiteDamageRoll: 0, huntersMarkDamageRoll: huntersMarkDamageRoll }

  pure def fighterSpellAttackDamageRoll(spellDamageRoll: int): FighterSpellAttackDamageRoll =
    { spellDamageRoll: spellDamageRoll, huntersMarkDamageRoll: 0 }

  pure def fighterSpellAttackDamageRollWithHuntersMark(
    spellDamageRoll: int,
    huntersMarkDamageRoll: int,
  ): FighterSpellAttackDamageRoll =
    { spellDamageRoll: spellDamageRoll, huntersMarkDamageRoll: huntersMarkDamageRoll }

  pure def resolveAttack(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterWeaponAttackDamageRoll,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveAttackAtBarbarianLevel(state, attackTotal, naturalD20, damageRoll, concentrationSaveSucceeded, 1)

  pure def resolveAttackKnockOut(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterWeaponAttackDamageRoll,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveAttackWithDisposition(state, attackTotal, naturalD20, damageRoll, concentrationSaveSucceeded, KnockOut)

  pure def resolveAttackWithDisposition(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterWeaponAttackDamageRoll,
    concentrationSaveSucceeded: bool,
    damageDisposition: DamageDisposition,
  ): BattleState =
    resolveAttackAtBarbarianLevelWithDisposition(state, attackTotal, naturalD20, damageRoll, concentrationSaveSucceeded, 1, damageDisposition)

  pure def resolveAttackAtBarbarianLevel(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterWeaponAttackDamageRoll,
    concentrationSaveSucceeded: bool,
    barbarianLevel: int,
  ): BattleState =
    resolveAttackAtBarbarianLevelWithDisposition(state, attackTotal, naturalD20, damageRoll, concentrationSaveSucceeded, barbarianLevel, OrdinaryDamage)

  pure def resolveAttackAtBarbarianLevelWithDisposition(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterWeaponAttackDamageRoll,
    concentrationSaveSucceeded: bool,
    barbarianLevel: int,
    damageDisposition: DamageDisposition,
  ): BattleState =
    if (not(currentActorCanAttack(state)) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated)
      state
    else {
      val revealed = recordFighterAttackRoll(revealFighterHidden(state))
      val spent = spendFighterAttackActionOrExtraAttackSlot(revealed)
      val rageDamage = if (fighterHasRage(revealed)) fighterRageDamageBonus(barbarianLevel) else 0
      val divineFavorDamage = fighterDivineFavorDamage(damageRoll.divineFavorDamageRoll, revealed.fighter.activeEffects)
      val divineSmiteDamage = damageRoll.divineSmiteDamageRoll
      val huntersMarkDamage = fighterHuntersMarkDamage(damageRoll.huntersMarkDamageRoll, revealed.fighter.activeEffects, Goblin)
      if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), fighterCriticalThreshold(state))))
        { ...spent, lightWeaponAttackMade: true }
      else
        { ...spent, goblin: applyDamageFromSource(state.goblin, damageRoll.weaponDamageRoll + 3 + rageDamage + divineFavorDamage + divineSmiteDamage + huntersMarkDamage, if (attackIsCritical(naturalD20, fighterCriticalThreshold(state))) 2 else 1, concentrationSaveSucceeded, damageDisposition, Fighter), lightWeaponAttackMade: true }
    }

  pure def trueStrikeBonusDamageDice(characterLevel: int): int =
    if (characterLevel >= 17) 3
    else if (characterLevel >= 11) 2
    else if (characterLevel >= 5) 1
    else 0

  pure def trueStrikeDamageTypeChoiceIsLegal(selectedDamageType: DamageType, weaponDamageType: DamageType): bool =
    selectedDamageType == Radiant or selectedDamageType == weaponDamageType

  pure def trueStrikeWeaponAttackModifier(spellcastingAbilityModifier: int, proficiencyBonus: int): int =
    spellcastingAbilityModifier + proficiencyBonus

  pure def trueStrikeBonusDamage(bonusDamageRoll: int, characterLevel: int): int =
    if (trueStrikeBonusDamageDice(characterLevel) > 0) bonusDamageRoll else 0

  pure def trueStrikeDamageAfterAdjustments(
    weaponDamageRoll: int,
    bonusDamageRoll: int,
    spellcastingAbilityModifier: int,
    characterLevel: int,
    selectedDamageType: DamageType,
  ): int =
    damageAfterAdjustments(
      weaponDamageRoll + spellcastingAbilityModifier,
      selectedDamageType,
      Set(),
      Set(),
      Set(),
    ) +
    damageAfterAdjustments(
      trueStrikeBonusDamage(bonusDamageRoll, characterLevel),
      Radiant,
      Set(),
      Set(),
      Set(),
    )

  pure def resolveTrueStrikeWeaponAttack(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    weaponDamageRoll: int,
    bonusDamageRoll: int,
    spellcastingAbilityModifier: int,
    characterLevel: int,
    selectedDamageType: DamageType,
    weaponDamageType: DamageType,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (
      not(state.actionAvailable) or
      currentActor(state) != Fighter or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      not(trueStrikeDamageTypeChoiceIsLegal(selectedDamageType, weaponDamageType))
    )
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), fighterCriticalThreshold(state)))) {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      { ...rolled, actionAvailable: false }
    }
    else if (state.goblin.reactionAvailable and not(state.goblin.activeEffects.contains(ShieldArmorClassBonus))) {
      openReactionWindow(recordFighterAttackRoll(revealFighterHidden(state)), {
        trigger: AttackHit,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeTrueStrikeWeaponAttack,
      })
    }
    else {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      val damage = trueStrikeDamageAfterAdjustments(
        weaponDamageRoll,
        bonusDamageRoll,
        spellcastingAbilityModifier,
        characterLevel,
        selectedDamageType,
      )
      { ...rolled, goblin: applyDamageFromSource(state.goblin, damage, if (attackIsCritical(naturalD20, fighterCriticalThreshold(state))) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter), actionAvailable: false }
    }

  pure def fighterSneakAttackEligible(
    state: BattleState,
    rollHasAdvantage: bool,
    allyAdjacent: bool,
    rollHasDisadvantage: bool,
  ): bool =
    state.fighterSneakAttackSupported and
    not(state.fighterSneakAttackUsedThisTurn) and
    (rollHasAdvantage or (allyAdjacent and not(rollHasDisadvantage)))

  pure def resolveAttackWithOptionalSneakAttack(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    weaponDamageRoll: int,
    sneakAttackDamageRoll: int,
    selectedSneakAttack: bool,
    rollHasAdvantage: bool,
    allyAdjacent: bool,
    rollHasDisadvantage: bool,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (not(currentActorCanAttack(state)) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated)
      state
    else {
      val revealed = recordFighterAttackRoll(revealFighterHidden(state))
      val spent = spendFighterAttackActionOrExtraAttackSlot(revealed)
      if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), fighterCriticalThreshold(state))))
        { ...spent, lightWeaponAttackMade: true }
      else {
        val sneakSelectedAndEligible =
          selectedSneakAttack and
          fighterSneakAttackEligible(revealed, rollHasAdvantage, allyAdjacent, rollHasDisadvantage)
        val damage = weaponDamageRoll + 3 + (if (sneakSelectedAndEligible) sneakAttackDamageRoll else 0)
        {
          ...spent,
          goblin: applyDamageFromSource(state.goblin, damage, if (attackIsCritical(naturalD20, fighterCriticalThreshold(state))) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter),
          lightWeaponAttackMade: true,
          fighterSneakAttackUsedThisTurn: sneakSelectedAndEligible or revealed.fighterSneakAttackUsedThisTurn,
        }
    }
    }

  pure def cuttingWordsAttackRollTotal(attackTotal: int, bardicInspirationRoll: int): int =
    attackTotal - bardicInspirationRoll

  pure def cuttingWordsAbilityCheckTotal(originalTotal: int, bardicInspirationRoll: int): int =
    originalTotal - bardicInspirationRoll

  pure def abilityCheckSucceeds(total: int, dc: int): bool =
    total >= dc

  pure def cuttingWordsAbilityCheckResolution(
    originalTotal: int,
    dc: int,
    bardicInspirationRoll: int,
    bardCanSeeCreature: bool,
    creatureWithinSixtyFeet: bool,
    reactionAvailable: bool,
    bardicInspirationUsesRemaining: int,
  ): CuttingWordsResult = {
    if (not(abilityCheckSucceeds(originalTotal, dc)) or not(bardCanSeeCreature) or not(creatureWithinSixtyFeet) or not(reactionAvailable) or bardicInspirationUsesRemaining <= 0)
      { state: initialState, usesRemaining: bardicInspirationUsesRemaining }
    else
      {
        state: { ...initialState, fighter: { ...initialState.fighter, reactionAvailable: false } },
        usesRemaining: bardicInspirationUsesRemaining - 1,
      }
  }

  pure def uncannyDodgeDamage(damage: int): int =
    damage / 2

  pure def deflectAttacksDamage(damage: int, deflectRoll: int, dexMod: int, monkLevel: int): int = {
    val reduced = damage - (deflectRoll + dexMod + monkLevel)
    if (reduced < 0) 0 else reduced
  }

  pure def deflectAttacksRedirectTargetEligible(
    targetSeen: bool,
    attackWasMelee: bool,
    targetWithinFiveFeet: bool,
    targetWithinSixtyFeet: bool,
    targetBehindTotalCover: bool,
  ): bool =
    all {
      targetSeen,
      if (attackWasMelee)
        targetWithinFiveFeet
      else
        all { targetWithinSixtyFeet, not(targetBehindTotalCover) },
    }

  pure def deflectAttacksRedirectDamage(
    reducedDamage: int,
    focusUsesRemaining: int,
    targetEligible: bool,
    savingThrowSucceeded: bool,
    firstMartialArtsRoll: int,
    secondMartialArtsRoll: int,
    dexMod: int,
  ): int =
    if (all { reducedDamage == 0, focusUsesRemaining > 0, targetEligible, not(savingThrowSucceeded) }) {
      val redirected = firstMartialArtsRoll + secondMartialArtsRoll + dexMod
      if (redirected < 0) 0 else redirected
    } else 0

  pure def deflectAttacksRedirectFocusRemaining(
    reducedDamage: int,
    focusUsesRemaining: int,
    targetEligible: bool,
  ): int =
    if (all { reducedDamage == 0, focusUsesRemaining > 0, targetEligible })
      focusUsesRemaining - 1
    else focusUsesRemaining

  pure def resolveAttackRecklessly(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterWeaponAttackDamageRoll,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveAttack(activateRecklessAttackOnFirstAttackRoll(state), attackTotal, naturalD20, damageRoll, concentrationSaveSucceeded)

  pure def resolveGoblinAttack(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Goblin or state.goblin.hp == 0)
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.fighter), 20)))
      { ...state, actionAvailable: false }
    else {
      val adjustedDamage = damageAfterAdjustments(damageRoll + 2, Slashing, fighterRageResistances(state), Set(), Set())
      {
        ...stateWithFighterDamage(state, applyDamageFromSource(state.fighter, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Goblin)),
        actionAvailable: false,
      }
    }

  pure def resolveGoblinMultiattack(state: BattleState): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Goblin or state.goblin.hp == 0)
      state
    else
      { ...state, actionAvailable: false, goblinMultiattackDispatchesRemaining: 2 }

  pure def goblinMultiattackDispatchContinuationOpen(state: BattleState): bool =
    currentActor(state) == Goblin and state.goblinMultiattackDispatchesRemaining > 0

  pure def resolveGoblinMultiattackDispatch(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (state.goblinMultiattackDispatchesRemaining <= 0 or currentActor(state) != Goblin or state.goblin.hp == 0)
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.fighter), 20)))
      { ...state, goblinMultiattackDispatchesRemaining: state.goblinMultiattackDispatchesRemaining - 1 }
    else {
      val adjustedDamage = damageAfterAdjustments(damageRoll + 2, Slashing, fighterRageResistances(state), Set(), Set())
      {
        ...stateWithFighterDamage(state, applyDamageFromSource(state.fighter, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Goblin)),
        goblinMultiattackDispatchesRemaining: state.goblinMultiattackDispatchesRemaining - 1,
      }
    }

  pure def resolveGoblinOpportunityAttack(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveGoblinOpportunityAttackWithDisposition(state, attackTotal, naturalD20, damageRoll, concentrationSaveSucceeded, OrdinaryDamage)

  pure def resolveGoblinOpportunityAttackWithDisposition(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
    damageDisposition: DamageDisposition,
  ): BattleState =
    if (state.goblin.hp == 0)
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.fighter), 20)))
      state
    else {
      val adjustedDamage = damageAfterAdjustments(damageRoll + 2, Slashing, fighterRageResistances(state), Set(), Set())
      stateWithFighterDamage(state, applyDamageFromSource(state.fighter, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, damageDisposition, Goblin))
    }

  pure def resolveGoblinOpportunityAttackWithUncannyDodge(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (state.goblin.hp == 0)
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.fighter), 20)))
      state
    else {
      val adjustedDamage = damageAfterAdjustments(uncannyDodgeDamage(damageRoll + 2), Slashing, fighterRageResistances(state), Set(), Set())
      stateWithFighterDamage(state, applyDamageFromSource(state.fighter, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Goblin))
    }

  pure def resolveRayOfFrost(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveRayOfFrostWithDamageRoll(state, attackTotal, naturalD20, fighterSpellAttackDamageRoll(damageRoll), concentrationSaveSucceeded)

  pure def resolveRayOfFrostWithDamageRoll(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: FighterSpellAttackDamageRoll,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state))
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), 20))) {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      { ...rolled, actionAvailable: false }
    }
    else if (state.goblin.reactionAvailable and not(state.goblin.activeEffects.contains(ShieldArmorClassBonus))) {
      openReactionWindow(recordFighterAttackRoll(revealFighterHidden(state)), {
        trigger: AttackHit,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeRayOfFrost,
      })
    }
    else {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      val huntersMarkDamage = fighterHuntersMarkDamage(damageRoll.huntersMarkDamageRoll, rolled.fighter.activeEffects, Goblin)
      val damaged = applyDamageFromSource(state.goblin, damageRoll.spellDamageRoll + huntersMarkDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter)
      { ...rolled, goblin: { ...damaged, activeEffects: damaged.activeEffects.union(Set(RayOfFrostSpeedDelta)) }, actionAvailable: false }
    }

  pure def resolvePoisonSpray(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state))
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), 20))) {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      { ...rolled, actionAvailable: false }
    }
    else if (state.goblin.reactionAvailable and not(state.goblin.activeEffects.contains(ShieldArmorClassBonus))) {
      openReactionWindow(recordFighterAttackRoll(revealFighterHidden(state)), {
        trigger: AttackHit,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumePoisonSpray,
      })
    }
    else {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      val adjustedDamage = damageAfterAdjustments(damageRoll, Poison, Set(), Set(), Set())
      val damaged = applyDamageFromSource(state.goblin, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter)
      { ...rolled, goblin: damaged, actionAvailable: false }
    }

  pure def resolveChillTouch(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state))
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), 20))) {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      { ...rolled, actionAvailable: false }
    }
    else if (state.goblin.reactionAvailable and not(state.goblin.activeEffects.contains(ShieldArmorClassBonus))) {
      openReactionWindow(recordFighterAttackRoll(revealFighterHidden(state)), {
        trigger: AttackHit,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeChillTouch,
      })
    }
    else {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      val adjustedDamage = damageAfterAdjustments(damageRoll, Necrotic, Set(), Set(), Set())
      val damaged = applyDamageFromSource(state.goblin, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter)
      { ...rolled, goblin: damaged, actionAvailable: false }
    }

  pure def concentrationSavingThrowDc(damage: int): int = {
    val halfDamage = damage / 2
    val floor = if (halfDamage < 10) 10 else halfDamage
    if (floor > 30) 30 else floor
  }

  pure def spellEffectConcentrationActiveEffects(): Set[ActiveEffect] =
    Set(ShieldOfFaithArmorClassBonus, HeroismFrightenedImmunity, BaneD20RollPenalty, BlessD20RollBonus, GuidanceAbilityCheckBonus, EntangleRestrained, FaerieFireAttackRollAdvantage, ProtectionFromEvilAndGoodAttackDisadvantage)

  pure def activeEffectsWithoutSpellEffectConcentration(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects
      .exclude(spellEffectConcentrationActiveEffects)
      .filter(effect => match effect {
        | HeroismTurnStartTemporaryHitPoints(_) => false
        | EnsnaringStrikeRestrained(_) => false
        | SearingSmiteBurning(_) => false
        | ResistanceDamageReduction(_) => false
        | SleepPendingRepeatSave(_) => false
        | SleepUnconscious(_) => false
        | _ => true
      })

  pure def combatantWithoutSpellEffectConcentrationEffects(target: Combatant): Combatant = {
    val hadSleepPending = target.activeEffects.exists(effect => match effect {
      | SleepPendingRepeatSave(_) => true
      | _ => false
    })
    val hadSleepUnconscious = target.activeEffects.exists(effect => match effect {
      | SleepUnconscious(_) => true
      | _ => false
    })
    val sleepPendingHadIncapacitated = target.activeEffects.exists(effect => match effect {
      | SleepPendingRepeatSave(data) => data.hadIncapacitated
      | _ => false
    })
    val sleepUnconsciousHadIncapacitated = target.activeEffects.exists(effect => match effect {
      | SleepUnconscious(data) => data.hadIncapacitated
      | _ => false
    })
    val sleepUnconsciousHadUnconscious = target.activeEffects.exists(effect => match effect {
      | SleepUnconscious(data) => data.hadUnconscious
      | _ => false
    })
    {
      ...target,
      activeEffects: activeEffectsWithoutSpellEffectConcentration(target.activeEffects),
      incapacitated:
        if (hadSleepUnconscious) sleepUnconsciousHadIncapacitated
        else if (hadSleepPending) sleepPendingHadIncapacitated
        else target.incapacitated,
      unconscious: if (hadSleepUnconscious) sleepUnconsciousHadUnconscious else target.unconscious,
      prone: if (hadSleepUnconscious and not(sleepUnconsciousHadUnconscious)) true else target.prone,
    }
  }

  pure def breakConcentration(target: Combatant): Combatant = {
    val withoutSpellEffectConcentration = combatantWithoutSpellEffectConcentrationEffects(target)
    {
      ...withoutSpellEffectConcentration,
      concentrating: false,
      activeEffects: activeEffectsWithoutHuntersMark(withoutSpellEffectConcentration.activeEffects).exclude(Set(MageArmor)),
    }
  }

  pure def sleepEffectFromOtherSource(effect: ActiveEffect, targetActor: Actor): bool =
    match effect {
      | SleepPendingRepeatSave(data) => data.source != targetActor
      | SleepUnconscious(data) => data.source != targetActor
      | _ => false
    }

  pure def breakConcentrationFromSleepAppliedIncapacitated(target: Combatant, targetActor: Actor): Combatant =
    if (not(target.concentrating))
      target
    else {
      val sleepEffectsFromOtherSources = target.activeEffects.filter(effect => sleepEffectFromOtherSource(effect, targetActor))
      val effectsSubjectToBreak = target.activeEffects.filter(effect => not(sleepEffectFromOtherSource(effect, targetActor)))
      val broken = breakConcentration({ ...target, activeEffects: effectsSubjectToBreak })
      { ...broken, activeEffects: broken.activeEffects.union(sleepEffectsFromOtherSources) }
    }

  pure def stateWithFighterDamage(state: BattleState, damagedFighter: Combatant): BattleState =
    if (state.fighter.concentrating and not(damagedFighter.concentrating))
      {
        ...state,
        fighter: damagedFighter,
        goblin: { ...state.goblin, activeEffects: activeEffectsWithoutSpellEffectConcentration(state.goblin.activeEffects) },
      }
    else
      { ...state, fighter: damagedFighter }

  pure def applyDamage(target: Combatant, damage: int, deathFailuresAtZeroHp: int, concentrationSaveSucceeded: bool): Combatant =
    applyDamageWithDisposition(target, damage, deathFailuresAtZeroHp, concentrationSaveSucceeded, OrdinaryDamage)

  pure def activeEffectsAfterTargetDamagedByCasterOrAlly(effects: Set[ActiveEffect], damageSource: Actor): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | AnimalFriendshipCharmed(data) => data.source != damageSource
      | CharmPersonCharmed(data) => data.source != damageSource
      | _ => true
    })

  pure def applyDamageFromSource(
    target: Combatant,
    damage: int,
    deathFailuresAtZeroHp: int,
    concentrationSaveSucceeded: bool,
    damageDisposition: DamageDisposition,
    damageSource: Actor,
  ): Combatant = {
    val damaged = applyDamageWithDisposition(target, damage, deathFailuresAtZeroHp, concentrationSaveSucceeded, damageDisposition)
    if (damage > 0)
      { ...damaged, activeEffects: activeEffectsAfterTargetDamagedByCasterOrAlly(damaged.activeEffects, damageSource) }
    else
      damaged
  }

  pure def applyDamageWithDisposition(target: Combatant, damage: int, deathFailuresAtZeroHp: int, concentrationSaveSucceeded: bool, damageDisposition: DamageDisposition): Combatant = {
    val effectiveDamage = if (damage < 0) 0 else damage
    val tempHpAbsorbed = if (target.tempHp < effectiveDamage) target.tempHp else effectiveDamage
    val hpDamage = effectiveDamage - tempHpAbsorbed
    val nextHp = if (target.hp - hpDamage < 0) 0 else target.hp - hpDamage
    val massiveDamageKills =
      hpDamage > 0 and
      (if (target.hp <= 0) hpDamage else hpDamage - target.hp) >= target.maxHp
    val damaged = { ...target, hp: nextHp, tempHp: target.tempHp - tempHpAbsorbed }

    val afterDamage =
      if (effectiveDamage <= 0)
        target
      else if (target.hp <= 0)
        if (massiveDamageKills) applyInstantDeath(damaged) else applyDamageAtZeroHp(damaged, deathFailuresAtZeroHp)
      else if (nextHp > 0)
        damaged
      else
        if (damageDisposition == KnockOut) applyKnockOut(damaged)
        else if (massiveDamageKills) applyInstantDeath(damaged) else applyDropToZeroHp(damaged)

    if (target.concentrating and effectiveDamage > 0 and not(concentrationSaveSucceeded))
      breakConcentration(afterDamage)
    else
      afterDamage
  }

  pure def applyKnockOut(target: Combatant): Combatant =
    { ...breakConcentration(target), hp: 1, unconscious: true, knockedOut: true }

  pure def applyMageArmor(target: Combatant): Combatant =
    if (target.activeEffects.contains(MageArmor))
      target
    else
      { ...target, activeEffects: target.activeEffects.union(Set(MageArmor)) }

  pure def targetDonsArmor(target: Combatant): Combatant =
    { ...target, activeEffects: target.activeEffects.exclude(Set(MageArmor)) }

  pure def readySpell(state: BattleState): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or state.fighterReadiedSpellHeld)
      state
    else
      { ...state, fighter: { ...state.fighter, concentrating: true }, actionAvailable: false, fighterReadiedSpellHeld: true }

  pure def releaseReadiedSpell(state: BattleState): BattleState =
    if (state.fighterReadiedSpellHeld and not(fighterHasRage(state)))
      { ...state, fighter: { ...state.fighter, concentrating: false }, fighterReadiedSpellHeld: false }
    else
      state

  pure def dashFighter(state: BattleState): BattleState =
    dashFighterWithSpeedKind(state, WalkSpeedKind)

  pure def dashFighterWithSpeedKind(state: BattleState, speedKind: MovementSpeedKind): BattleState =
    if (currentActor(state) == Fighter and state.actionAvailable and not(state.fighter.unconscious) and not(state.fighter.incapacitated))
      { ...state, actionAvailable: false, dashMovementBonus: state.dashMovementBonus + movementSpeed(state.fighter, speedKind) }
    else
      state

  pure def applyFighterTemporaryHitPoints(state: BattleState, temporaryHitPoints: int): BattleState =
    { ...state, fighter: { ...state.fighter, tempHp: if (state.fighter.tempHp > temporaryHitPoints) state.fighter.tempHp else temporaryHitPoints } }

  pure def bonusActionDashTemporaryHitPointsFighter(
    state: BattleState,
    usesRemaining: int,
    proficiencyBonus: int,
    speedKind: MovementSpeedKind
  ): BonusActionDashTemporaryHitPointsResult =
    if (currentActor(state) == Fighter
      and state.bonusActionAvailable
      and usesRemaining > 0
      and proficiencyBonus >= 2
      and proficiencyBonus <= 6
      and not(state.fighter.unconscious)
      and not(state.fighter.incapacitated)) {
      val dashed = {
        ...state,
        bonusActionAvailable: false,
        dashMovementBonus: state.dashMovementBonus + movementSpeed(state.fighter, speedKind),
      }
      {
        state: applyFighterTemporaryHitPoints(dashed, proficiencyBonus),
        usesRemaining: usesRemaining - 1,
      }
    } else {
      { state: state, usesRemaining: usesRemaining }
    }

  pure def disengageFighter(state: BattleState): BattleState =
    if (currentActor(state) == Fighter and state.actionAvailable and not(state.fighter.unconscious) and not(state.fighter.incapacitated))
      { ...state, actionAvailable: false, disengaged: true }
    else
      state

  pure def dodgeFighter(state: BattleState): BattleState =
    if (currentActor(state) == Fighter and state.actionAvailable and not(state.fighter.unconscious) and not(state.fighter.incapacitated))
      { ...state, actionAvailable: false, fighter: { ...state.fighter, dodging: true } }
    else
      state

  pure def readyFighter(state: BattleState): BattleState =
    if (currentActor(state) == Fighter and state.actionAvailable and not(state.fighter.unconscious) and not(state.fighter.incapacitated))
      { ...state, actionAvailable: false, fighterReadiedMovementHeld: true }
    else
      state

  pure def helpFighterAttack(state: BattleState): BattleState =
    if (currentActor(state) == Fighter and state.actionAvailable and not(state.fighter.unconscious) and not(state.fighter.incapacitated))
      { ...state, actionAvailable: false, fighterHelpAttackGoblinForGoblin: true }
    else
      state

  pure def standFighterFromProne(state: BattleState): BattleState =
    if (currentActor(state) == Fighter and state.fighter.prone and state.fighter.speed / 2 > 0 and state.fighter.movementSpent + state.fighter.speed / 2 <= state.fighter.speed + state.dashMovementBonus)
      { ...state, fighter: { ...state.fighter, movementSpent: state.fighter.movementSpent + state.fighter.speed / 2, prone: false } }
    else
      state

  pure def movementRemainingForFighter(state: BattleState): int = {
    movementRemainingForFighterWithSpeedKind(state, WalkSpeedKind)
  }

  pure def movementRemainingForFighterWithSpeedKind(state: BattleState, speedKind: MovementSpeedKind): int = {
    val remaining = movementSpeed(state.fighter, speedKind) + state.dashMovementBonus - state.fighter.movementSpent
    if (remaining < 0) 0 else remaining
  }

  pure def movementRemaining(combatant: Combatant): int =
    if (combatant.speed - combatant.movementSpent < 0) 0 else combatant.speed - combatant.movementSpent

  pure def movementSpeed(combatant: Combatant, speedKind: MovementSpeedKind): int = {
    val walkSpeed = combatant.speed + (if (combatant.activeEffects.contains(LongstriderSpeedDelta)) 10 else 0)
    match speedKind {
      | WalkSpeedKind => walkSpeed
      | ClimbSpeedKind => if (combatant.hasRovingSpeedKindGrants) walkSpeed else 0
      | SwimSpeedKind => if (combatant.hasRovingSpeedKindGrants) walkSpeed else 0
    }
  }

  pure def fighterGoblinGrappleExists(state: BattleState): bool =
    match state.grapple {
      | NoGrapple => false
      | FighterGrapplesGoblin(_) => true
    }

  pure def fighterGoblinGrappleTargetDragCostExempt(state: BattleState): bool =
    match state.grapple {
      | NoGrapple => false
      | FighterGrapplesGoblin(link) => link.targetDragCostExempt
    }

  pure def fighterCanMove(state: BattleState, movementCost: int): bool =
    fighterCanMoveWithSpeedKind(state, WalkSpeedKind, movementCost)

  pure def fighterCanMoveWithSpeedKind(state: BattleState, speedKind: MovementSpeedKind, movementCost: int): bool =
    currentActor(state) == Fighter and
    not(state.fighter.unconscious) and
    not(state.fighter.incapacitated) and
    movementCost > 0 and
    movementCost <= movementRemainingForFighterWithSpeedKind(state, speedKind)

  pure def fighterCanGrappleGoblin(state: BattleState): bool =
    currentActor(state) == Fighter and
    state.actionAvailable and
    not(state.fighter.unconscious) and
    not(state.fighter.incapacitated) and
    not(fighterGoblinGrappleExists(state)) and
    state.fighter.leftHandUse == HFree

  pure def grappleFighterGoblin(state: BattleState, targetFailedSave: bool): BattleState =
    if (not(fighterCanGrappleGoblin(state)))
      state
    else if (targetFailedSave) {
      val extended = extendRageWithEnemySavingThrow(state, Goblin)
      {
        ...extended,
        actionAvailable: false,
        fighter: { ...extended.fighter, leftHandUse: HGrapple },
        grapple: FighterGrapplesGoblin({ escapeDc: 13, targetDragCostExempt: false }),
      }
    }
    else {
      val extended = extendRageWithEnemySavingThrow(state, Goblin)
      { ...extended, actionAvailable: false }
    }

  pure def releaseFighterGrapple(state: BattleState): BattleState =
    if (fighterGoblinGrappleExists(state))
      {
        ...state,
        fighter: { ...state.fighter, leftHandUse: HFree },
        grapple: NoGrapple,
      }
    else
      state

  pure def escapeFighterGrapple(state: BattleState, escapeSucceeded: bool): BattleState =
    if (currentActor(state) == Goblin and state.actionAvailable and fighterGoblinGrappleExists(state))
      if (escapeSucceeded)
        { ...releaseFighterGrapple(state), actionAvailable: false }
      else
        { ...state, actionAvailable: false }
    else
      state

  pure def goblinAttackRequiresDisadvantage(state: BattleState, targetIsFighter: bool): bool =
    fighterGoblinGrappleExists(state) and not(targetIsFighter)

  pure def offHandAttackFighter(state: BattleState, attackTotal: int, naturalD20: int, damageRoll: int): BattleState =
    if (currentActor(state) == Fighter and state.bonusActionAvailable and state.lightWeaponAttackMade)
      if (attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), fighterCriticalThreshold(state)))
        { ...state, goblin: applyDamageFromSource(state.goblin, damageRoll, if (attackIsCritical(naturalD20, fighterCriticalThreshold(state))) 2 else 1, false, OrdinaryDamage, Fighter), bonusActionAvailable: false }
      else
        { ...state, bonusActionAvailable: false }
    else
      state

  pure def offHandAttackFighterWithDamageReduction(state: BattleState, attackTotal: int, naturalD20: int, damageRoll: int, reduction: int): BattleState =
    if (currentActor(state) == Fighter and state.bonusActionAvailable and state.lightWeaponAttackMade)
      if (attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), fighterCriticalThreshold(state))) {
        val reducedDamage = if (damageRoll - reduction < 0) 0 else damageRoll - reduction
        { ...state, goblin: applyDamageFromSource(state.goblin, reducedDamage, if (attackIsCritical(naturalD20, fighterCriticalThreshold(state))) 2 else 1, false, OrdinaryDamage, Fighter), bonusActionAvailable: false }
      }
      else
        { ...state, bonusActionAvailable: false }
    else
      state

  pure def goblinCanOpportunityAttack(state: BattleState, provokedByTable: bool): bool =
    state.goblin.hp > 0 and
    state.goblin.reactionAvailable and
    not(state.disengaged) and
    provokedByTable

  pure def applyFighterMovement(state: BattleState, movementCost: int): BattleState =
    applyFighterMovementWithSpeedKind(state, WalkSpeedKind, movementCost)

  pure def applyFighterMovementWithSpeedKind(state: BattleState, speedKind: MovementSpeedKind, movementCost: int): BattleState =
    if (fighterCanMoveWithSpeedKind(state, speedKind, movementCost))
      {
        ...state,
        fighter: { ...state.fighter, movementSpent: state.fighter.movementSpent + movementCost },
      }
    else
      state

  pure def moveFighter(state: BattleState, movementCost: int, provokedByTable: bool): BattleState =
    moveFighterWithSpeedKind(state, WalkSpeedKind, movementCost, provokedByTable)

  pure def moveFighterWithSpeedKind(state: BattleState, speedKind: MovementSpeedKind, movementCost: int, provokedByTable: bool): BattleState =
    if (not(fighterCanMoveWithSpeedKind(state, speedKind, movementCost)))
      state
    else if (goblinCanOpportunityAttack(state, provokedByTable))
      openReactionWindow(state, {
        trigger: OpportunityAttack,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeMovement({ speedKind: speedKind, movementCost: movementCost }),
      })
    else
      applyFighterMovementWithSpeedKind(state, speedKind, movementCost)

  pure def applyHealing(target: Combatant, healing: int): Combatant = {
    val effectiveHealing = if (healing < 0) 0 else healing
    val nextHp =
      if (target.hp + effectiveHealing > target.maxHp)
        target.maxHp
      else
        target.hp + effectiveHealing

    if (target.deathFailures >= 3 or effectiveHealing <= 0)
      target
    else if (target.hp == 0 and nextHp > 0)
      {
        ...target,
        hp: nextHp,
        unconscious: false,
        knockedOut: false,
        stable: false,
        deathSuccesses: 0,
        deathFailures: 0,
      }
    else if (target.knockedOut and nextHp > target.hp)
      { ...target, hp: nextHp, unconscious: false, knockedOut: false }
    else
      { ...target, hp: nextHp }
  }

  pure def directHitPointRestorationActionCost(invocation: DirectHitPointRestorationSpell): SpellActionCost =
    if (invocation == HealingWordRestoration or invocation == MassHealingWordRestoration) SpellBonusAction
    else SpellMagicAction

  pure def directHitPointRestorationMaximumTargets(invocation: DirectHitPointRestorationSpell): int =
    if (invocation == MassHealingWordRestoration) 6 else 1

  pure def directHitPointRestorationHealing(healingRoll: int, spellcastingAbilityModifier: int): int =
    healingRoll + spellcastingAbilityModifier

  pure def resolveDirectHitPointRestoration(
    state: BattleState,
    invocation: DirectHitPointRestorationSpell,
    targetCount: int,
    healingRoll: int,
    spellcastingAbilityModifier: int,
  ): BattleState = {
    val actionCost = directHitPointRestorationActionCost(invocation)
    val validTargetCount = targetCount >= 1 and targetCount <= directHitPointRestorationMaximumTargets(invocation)
    val canSpendActionCost =
      if (actionCost == SpellBonusAction) state.bonusActionAvailable
      else state.actionAvailable
    if (
      currentActor(state) == Fighter and
      validTargetCount and
      canSpendActionCost and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    ) {
      val healed = applyHealing(
        state.fighter,
        directHitPointRestorationHealing(healingRoll, spellcastingAbilityModifier)
      )
      {
        ...state,
        fighter: healed,
        actionAvailable: if (actionCost == SpellMagicAction) false else state.actionAvailable,
        bonusActionAvailable: if (actionCost == SpellBonusAction) false else state.bonusActionAvailable,
        spellSlotExpendedThisTurn: true,
      }
    } else {
      state
    }
  }

  pure def scalarBuffActionCost(invocation: ScalarBuffSpell): SpellActionCost =
    if (invocation == ShieldOfFaithScalarBuff) SpellBonusAction
    else SpellMagicAction

  pure def scalarBuffMaximumTargets(invocation: ScalarBuffSpell, slotLevel: int): int =
    if (invocation == LongstriderScalarBuff) slotLevel else 1

  pure def scalarBuffTemporaryHitPoints(invocation: ScalarBuffSpell, slotLevel: int, rolledDice: int): int =
    if (invocation == FalseLifeScalarBuff) rolledDice + 4 + ((if (slotLevel > 1) slotLevel - 1 else 0) * 5)
    else 0

  pure def scalarBuffActiveEffects(invocation: ScalarBuffSpell): Set[ActiveEffect] =
    match invocation {
      | FalseLifeScalarBuff => Set()
      | LongstriderScalarBuff => Set(LongstriderSpeedDelta)
      | ShieldOfFaithScalarBuff => Set(ShieldOfFaithArmorClassBonus)
    }

  pure def scalarBuffCombatant(
    combatant: Combatant,
    invocation: ScalarBuffSpell,
    slotLevel: int,
    rolledDice: int,
  ): Combatant =
    if (invocation == FalseLifeScalarBuff)
      { ...combatant, tempHp: if (combatant.tempHp > scalarBuffTemporaryHitPoints(invocation, slotLevel, rolledDice)) combatant.tempHp else scalarBuffTemporaryHitPoints(invocation, slotLevel, rolledDice) }
    else
      { ...combatant, activeEffects: combatant.activeEffects.union(scalarBuffActiveEffects(invocation)) }

  pure def scalarBuffTargetedState(
    state: BattleState,
    invocation: ScalarBuffSpell,
    targets: Set[Actor],
    slotLevel: int,
    rolledDice: int,
  ): BattleState =
    {
      ...state,
      fighter: if (targets.contains(Fighter)) scalarBuffCombatant(state.fighter, invocation, slotLevel, rolledDice) else state.fighter,
      goblin: if (targets.contains(Goblin)) scalarBuffCombatant(state.goblin, invocation, slotLevel, rolledDice) else state.goblin,
    }

  pure def resolveScalarBuffSpell(
    state: BattleState,
    invocation: ScalarBuffSpell,
    targets: Set[Actor],
    slotLevel: int,
    rolledDice: int,
  ): BattleState = {
    val actionCost = scalarBuffActionCost(invocation)
    val targetCount = targets.size()
    val validTargetCount = targetCount >= 1 and targetCount <= scalarBuffMaximumTargets(invocation, slotLevel)
    val canSpendActionCost =
      if (actionCost == SpellBonusAction) state.bonusActionAvailable
      else state.actionAvailable
    if (
      currentActor(state) == Fighter and
      validTargetCount and
      canSpendActionCost and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    ) {
      val concentrationBase =
        if (invocation == ShieldOfFaithScalarBuff)
          {
            ...state,
            fighter: breakConcentration(state.fighter),
            goblin: { ...state.goblin, activeEffects: activeEffectsWithoutSpellEffectConcentration(state.goblin.activeEffects) },
          }
        else
          state
      val effected = scalarBuffTargetedState(concentrationBase, invocation, targets, slotLevel, rolledDice)
      {
        ...effected,
        fighter: { ...effected.fighter, concentrating: if (invocation == ShieldOfFaithScalarBuff) true else effected.fighter.concentrating },
        actionAvailable: if (actionCost == SpellMagicAction) false else state.actionAvailable,
        bonusActionAvailable: if (actionCost == SpellBonusAction) false else state.bonusActionAvailable,
        spellSlotExpendedThisTurn: true,
      }
    } else {
      state
    }
  }

  pure def resolveHeroismSpell(
    state: BattleState,
    targets: Set[Actor],
    slotLevel: int,
    spellcastingAbilityModifier: int,
  ): BattleState = {
    val targetCount = targets.size()
    val validTargetCount = targetCount >= 1 and targetCount <= slotLevel
    val knownWillingTargets = targets == Set(Fighter)
    if (
      currentActor(state) == Fighter and
      validTargetCount and
      knownWillingTargets and
      state.actionAvailable and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    ) {
      val concentrationBase = {
        ...state,
        fighter: breakConcentration(state.fighter),
        goblin: { ...state.goblin, activeEffects: activeEffectsWithoutSpellEffectConcentration(state.goblin.activeEffects) },
      }
      val heroismEffects = Set(HeroismFrightenedImmunity, HeroismTurnStartTemporaryHitPoints({ amount: spellcastingAbilityModifier }))
      {
        ...concentrationBase,
        fighter: if (targets.contains(Fighter)) { ...concentrationBase.fighter, concentrating: true, activeEffects: concentrationBase.fighter.activeEffects.union(heroismEffects) } else { ...concentrationBase.fighter, concentrating: true },
        goblin: if (targets.contains(Goblin)) { ...concentrationBase.goblin, activeEffects: concentrationBase.goblin.activeEffects.union(heroismEffects) } else concentrationBase.goblin,
        actionAvailable: false,
        spellSlotExpendedThisTurn: true,
      }
    } else {
      state
    }
  }

  pure def resolveDivineFavor(state: BattleState): BattleState =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    )
      {
        ...state,
        fighter: {
          ...state.fighter,
          activeEffects: activeEffectsWithoutDivineFavor(state.fighter.activeEffects)
            .union(Set(DivineFavorWeaponDamageRider({ durationTicks: favorWeaponDamageRiderDurationTicks }))),
        },
        bonusActionAvailable: false,
        spellSlotExpendedThisTurn: true,
      }
    else
      state

  pure def favorWeaponDamageRiderDurationTicks: int = 10

  pure def activeEffectsWithoutDivineFavor(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | DivineFavorWeaponDamageRider(_) => false
      | _ => true
    })

  pure def activeEffectsContainDivineFavor(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | DivineFavorWeaponDamageRider(_) => true
      | _ => false
    })

  pure def fighterDivineFavorDamage(divineFavorDamageRoll: int, effects: Set[ActiveEffect]): int =
    if (activeEffectsContainDivineFavor(effects)) divineFavorDamageRoll else 0

  pure def divineSmiteDamageDice(slotLevel: int, targetCreatureType: RuntimeCreatureType): int =
    2 +
    (if (slotLevel > 1) slotLevel - 1 else 0) +
    (if (targetCreatureType == FiendCreature or targetCreatureType == UndeadCreature) 1 else 0)

  pure def resolveDivineSmiteAfterMeleeHit(
    state: BattleState,
    slotLevel: int,
    smiteDamageRoll: int,
    targetCreatureType: RuntimeCreatureType,
    attackCritical: bool,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (
      currentActor(state) == Fighter and
      slotLevel >= 1 and
      state.bonusActionAvailable and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    )
      {
        ...state,
        bonusActionAvailable: false,
        spellSlotExpendedThisTurn: true,
        goblin: applyDamageFromSource(state.goblin, smiteDamageRoll * (if (attackCritical) 2 else 1), 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter),
      }
    else
      state

  pure def activeEffectsWithoutEnsnaringStrike(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | EnsnaringStrikeRestrained(_) => false
      | _ => true
    })

  pure def activeEffectsContainEnsnaringStrike(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | EnsnaringStrikeRestrained(_) => true
      | _ => false
    })

  pure def ensnaringStrikeDamageDiceForSlot(slotLevel: int): int =
    if (slotLevel < 1) 0 else slotLevel

  pure def ensnaringStrikeTargetHasSaveAdvantage(targetSize: CreatureSize): bool =
    targetSize == Large or targetSize == Huge or targetSize == Gargantuan

  pure def ensnaringStrikeDamageDice(effects: Set[ActiveEffect]): int =
    effects
      .map(effect => match effect {
        | EnsnaringStrikeRestrained(data) => data.damageDice
        | _ => 0
      })
      .fold(0, (highest, dice) => if (highest > dice) highest else dice)

  pure def resolveEnsnaringStrikeAfterWeaponHit(
    state: BattleState,
    slotLevel: int,
    goblinSavingThrowSucceeded: bool,
  ): BattleState =
    if (
      currentActor(state) == Fighter and
      slotLevel >= 1 and
      state.bonusActionAvailable and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    )
      {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      {
        ...withoutPrior,
        fighter: { ...withoutPrior.fighter, concentrating: not(goblinSavingThrowSucceeded) },
        goblin: if (goblinSavingThrowSucceeded)
          withoutPrior.goblin
        else
          {
            ...withoutPrior.goblin,
            activeEffects: activeEffectsWithoutEnsnaringStrike(withoutPrior.goblin.activeEffects)
              .union(Set(EnsnaringStrikeRestrained({ damageDice: ensnaringStrikeDamageDiceForSlot(slotLevel) }))),
          },
        bonusActionAvailable: false,
        spellSlotExpendedThisTurn: true,
      }
    }
    else
      state

  pure def endTurnWithEnsnaringStrikeDamage(
    state: BattleState,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState = {
    val advanced = endTurn(state)
    val damageDice = ensnaringStrikeDamageDice(advanced.goblin.activeEffects)
    if (currentActor(advanced) == Goblin and damageDice > 0)
      { ...advanced, goblin: applyDamageFromSource(advanced.goblin, damageRoll, 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter) }
    else
      advanced
  }

  pure def searingSmiteDamageDiceForSlot(slotLevel: int): int =
    if (slotLevel < 1) 0 else slotLevel

  pure def searingSmiteDurationTicks: int = 10

  pure def activeEffectsWithoutSearingSmite(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | SearingSmiteBurning(_) => false
      | _ => true
    })

  pure def activeEffectsContainSearingSmite(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | SearingSmiteBurning(_) => true
      | _ => false
    })

  pure def searingSmiteDamageDice(effects: Set[ActiveEffect]): int =
    effects
      .map(effect => match effect {
        | SearingSmiteBurning(data) => data.damageDice
        | _ => 0
      })
      .fold(0, (highest, dice) => if (highest > dice) highest else dice)

  pure def resolveSearingSmiteAfterMeleeHit(
    state: BattleState,
    slotLevel: int,
    smiteDamageRoll: int,
    attackCritical: bool,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (
      currentActor(state) == Fighter and
      slotLevel >= 1 and
      state.bonusActionAvailable and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    )
      {
        ...state,
        goblin: {
          ...applyDamageFromSource(state.goblin, smiteDamageRoll * (if (attackCritical) 2 else 1), 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter),
          activeEffects: activeEffectsWithoutSearingSmite(state.goblin.activeEffects)
            .union(Set(SearingSmiteBurning({
              damageDice: searingSmiteDamageDiceForSlot(slotLevel),
              durationTicks: searingSmiteDurationTicks,
            }))),
        },
        bonusActionAvailable: false,
        spellSlotExpendedThisTurn: true,
      }
    else
      state

  pure def endTurnWithSearingSmiteDamageAndSave(
    state: BattleState,
    damageRoll: int,
    saveSucceeded: bool,
    concentrationSaveSucceeded: bool,
  ): BattleState = {
    val advanced = endTurn(state)
    val damageDice = searingSmiteDamageDice(advanced.goblin.activeEffects)
    if (currentActor(advanced) == Goblin and damageDice > 0)
      {
        val damagedGoblin = applyDamageFromSource(advanced.goblin, damageRoll, 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter)
        {
          ...advanced,
          goblin: if (saveSucceeded)
            { ...damagedGoblin, activeEffects: activeEffectsWithoutSearingSmite(damagedGoblin.activeEffects) }
          else
            damagedGoblin,
        }
      }
    else
      advanced
  }

  pure def escapeEnsnaringStrike(
    state: BattleState,
    checkSucceeded: bool,
    actorWithinRestrainedTargetReach: bool,
  ): BattleState =
    if (
      not(state.actionAvailable)
        or not(activeEffectsContainEnsnaringStrike(state.goblin.activeEffects))
        or (currentActor(state) != Goblin and not(actorWithinRestrainedTargetReach))
    )
      state
    else
      {
        ...state,
        fighter: if (checkSucceeded) { ...state.fighter, concentrating: false } else state.fighter,
        goblin: if (checkSucceeded) { ...state.goblin, activeEffects: activeEffectsWithoutEnsnaringStrike(state.goblin.activeEffects) } else state.goblin,
        actionAvailable: false,
      }

  pure def resolveHuntersMark(state: BattleState, target: Actor): BattleState =
    if (
      currentActor(state) == Fighter and
      target == Goblin and
      state.bonusActionAvailable and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    )
      {
        ...state,
        fighter: {
          ...state.fighter,
          concentrating: true,
          activeEffects: activeEffectsWithoutHuntersMark(state.fighter.activeEffects)
            .union(Set(HuntersMarkDamageRider({ target: target, transferAvailable: false }))),
        },
        bonusActionAvailable: false,
        spellSlotExpendedThisTurn: true,
      }
    else
      state

  pure def transferHuntersMark(state: BattleState, target: Actor): BattleState =
    if (
      currentActor(state) == Fighter and
      target == Goblin and
      state.bonusActionAvailable and
      activeEffectsContainTransferableHuntersMark(state.fighter.activeEffects) and
      state.fighter.concentrating
    )
      {
        ...state,
        fighter: {
          ...state.fighter,
          activeEffects: activeEffectsWithoutHuntersMark(state.fighter.activeEffects)
            .union(Set(HuntersMarkDamageRider({ target: target, transferAvailable: false }))),
        },
        bonusActionAvailable: false,
      }
    else
      state

  pure def activeEffectsWithoutHuntersMark(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | HuntersMarkDamageRider(_) => false
      | _ => true
    })

  pure def activeEffectsContainTransferableHuntersMark(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | HuntersMarkDamageRider(data) => data.transferAvailable
      | _ => false
    })

  pure def fighterHuntersMarkDamage(huntersMarkDamageRoll: int, effects: Set[ActiveEffect], target: Actor): int =
    if (effects.exists(effect => match effect {
      | HuntersMarkDamageRider(data) => data.target == target
      | _ => false
    })) huntersMarkDamageRoll else 0

  pure def rollModifierMaximumTargets(invocation: RollModifierSpell, slotLevel: int): int =
    match invocation {
      | BaneRollModifier => 3 + (if (slotLevel > 1) slotLevel - 1 else 0)
      | BlessRollModifier => 3 + (if (slotLevel > 1) slotLevel - 1 else 0)
      | GuidanceRollModifier => 1
    }

  pure def rollModifierActiveEffect(invocation: RollModifierSpell): ActiveEffect =
    match invocation {
      | BaneRollModifier => BaneD20RollPenalty
      | BlessRollModifier => BlessD20RollBonus
      | GuidanceRollModifier => GuidanceAbilityCheckBonus
    }

  pure def rollModifierRequiresFailedSave(invocation: RollModifierSpell): bool =
    invocation == BaneRollModifier

  pure def rollModifierSpendsLevelOneSlot(invocation: RollModifierSpell): bool =
    invocation != GuidanceRollModifier

  pure def rollModifierTargetedState(
    state: BattleState,
    invocation: RollModifierSpell,
    targets: Set[Actor],
  ): BattleState =
    {
      ...state,
      fighter: if (targets.contains(Fighter)) { ...state.fighter, activeEffects: state.fighter.activeEffects.union(Set(rollModifierActiveEffect(invocation))) } else state.fighter,
      goblin: if (targets.contains(Goblin)) { ...state.goblin, activeEffects: state.goblin.activeEffects.union(Set(rollModifierActiveEffect(invocation))) } else state.goblin,
    }

  pure def resolveRollModifierSpell(
    state: BattleState,
    invocation: RollModifierSpell,
    selectedTargets: Set[Actor],
    failedSaveTargets: Set[Actor],
    slotLevel: int,
  ): BattleState = {
    val targetCount = selectedTargets.size()
    val validTargetCount = targetCount >= 1 and targetCount <= rollModifierMaximumTargets(invocation, slotLevel)
    val affectedTargets =
      if (rollModifierRequiresFailedSave(invocation)) failedSaveTargets else selectedTargets
    if (
      currentActor(state) == Fighter and
      validTargetCount and
      failedSaveTargets.forall(target => selectedTargets.contains(target)) and
      state.actionAvailable and
      (not(rollModifierSpendsLevelOneSlot(invocation)) or canExpendSpellSlotThisTurn(state)) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    ) {
      val concentrationBase = {
        ...state,
        fighter: breakConcentration(state.fighter),
        goblin: { ...state.goblin, activeEffects: activeEffectsWithoutSpellEffectConcentration(state.goblin.activeEffects) },
      }
      val effected = rollModifierTargetedState(concentrationBase, invocation, affectedTargets)
      {
        ...effected,
        fighter: { ...effected.fighter, concentrating: true },
        actionAvailable: false,
        spellSlotExpendedThisTurn: state.spellSlotExpendedThisTurn or rollModifierSpendsLevelOneSlot(invocation),
      }
    } else {
      state
    }
  }

  pure def produceFlameBrightLightRadiusFeet: int = 20

  pure def produceFlameDimLightAdditionalFeet: int = 20

  pure def produceFlameDurationTicks: int = 100

  pure def activeEffectsWithoutProduceFlameHeldLight(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | ProduceFlameHeldLight(_) => false
      | _ => true
    })

  pure def activeEffectsContainProduceFlameHeldLight(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | ProduceFlameHeldLight(_) => true
      | _ => false
    })

  pure def resolveProduceFlameHeldLight(state: BattleState): BattleState =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    ) {
      {
        ...state,
        fighter: {
          ...state.fighter,
          activeEffects: activeEffectsWithoutProduceFlameHeldLight(state.fighter.activeEffects)
            .union(Set(ProduceFlameHeldLight({ durationTicks: produceFlameDurationTicks }))),
        },
        bonusActionAvailable: false,
      }
    } else {
      state
    }

  pure def produceFlameHurlDamageDice(characterLevel: int): int =
    if (characterLevel >= 17) 4
    else if (characterLevel >= 11) 3
    else if (characterLevel >= 5) 2
    else 1

  pure def resolveProduceFlameHurl(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (
      not(state.actionAvailable) or
      currentActor(state) != Fighter or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      not(activeEffectsContainProduceFlameHeldLight(state.fighter.activeEffects))
    )
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), 20))) {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      { ...rolled, actionAvailable: false }
    }
    else if (state.goblin.reactionAvailable and not(state.goblin.activeEffects.contains(ShieldArmorClassBonus))) {
      openReactionWindow(recordFighterAttackRoll(revealFighterHidden(state)), {
        trigger: AttackHit,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeProduceFlameHurl,
      })
    }
    else {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      val adjustedDamage = damageAfterAdjustments(damageRoll, Fire, Set(), Set(), Set())
      val damaged = applyDamageFromSource(state.goblin, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter)
      { ...rolled, goblin: damaged, actionAvailable: false }
    }

  pure def damageAfterAdjustments(
    damage: int,
    damageType: DamageType,
    resistances: Set[DamageType],
    vulnerabilities: Set[DamageType],
    immunities: Set[DamageType],
  ): int =
    if (immunities.contains(damageType)) 0
    else {
      val afterResistance =
        if (resistances.contains(damageType)) damage / 2 else damage

      if (vulnerabilities.contains(damageType))
        afterResistance * 2
      else
        afterResistance
    }

  pure def sameTypeDamageAfterAdjustments(
    damageParts: List[int],
    damageType: DamageType,
    resistances: Set[DamageType],
    vulnerabilities: Set[DamageType],
    immunities: Set[DamageType],
  ): int =
    damageAfterAdjustments(
      damageParts.foldl(0, (total, damage) => total + damage),
      damageType,
      resistances,
      vulnerabilities,
      immunities,
    )

  pure def resistanceDamageReductionAvailable(effects: Set[ActiveEffect], damageType: DamageType): bool =
    effects.exists(effect => match effect {
      | ResistanceDamageReduction(data) => data.damageType == damageType and not(data.usedThisTurn)
      | _ => false
    })

  pure def damageAfterResistanceSpellReduction(damage: int, damageType: DamageType, effects: Set[ActiveEffect], reductionRoll: int): int =
    if (damage > 0 and resistanceDamageReductionAvailable(effects, damageType))
      if (damage - reductionRoll < 0) 0 else damage - reductionRoll
    else
      damage

  pure def activeEffectsAfterResistanceSpellReduction(effects: Set[ActiveEffect], damageType: DamageType): Set[ActiveEffect] =
    effects.map(effect => match effect {
      | ResistanceDamageReduction(data) =>
          if (data.damageType == damageType and not(data.usedThisTurn))
            ResistanceDamageReduction({ ...data, usedThisTurn: true })
          else
            effect
      | _ => effect
    })

  pure def applyResistanceSpellReductionToFighter(state: BattleState, damageType: DamageType, damage: int, reductionRoll: int): BattleState = {
    val reducedDamage = damageAfterResistanceSpellReduction(damage, damageType, state.fighter.activeEffects, reductionRoll)
    val updatedEffects = activeEffectsAfterResistanceSpellReduction(state.fighter.activeEffects, damageType)
    {
      ...state,
      fighter: applyDamage({ ...state.fighter, activeEffects: updatedEffects }, reducedDamage, 1, true),
    }
  }

  pure def grantActionSurge(
    state: BattleState,
    usesRemaining: int,
    usedThisTurn: bool,
  ): ActionSurgeResult =
    if (currentActor(state) == Fighter and usesRemaining > 0 and not(usedThisTurn))
      {
        state: { ...state, actionAvailable: true },
        usesRemaining: usesRemaining - 1,
        usedThisTurn: true,
      }
    else
      { state: state, usesRemaining: usesRemaining, usedThisTurn: usedThisTurn }

  pure def resolveSecondWind(
    state: BattleState,
    usesRemaining: int,
    healingRoll: int,
    fighterLevel: int,
  ): SecondWindResult =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      usesRemaining > 0 and
      not(state.fighter.unconscious)
    )
      {
        state: {
          ...state,
          fighter: applyHealing(state.fighter, healingRoll + fighterLevel),
          bonusActionAvailable: false,
        },
        usesRemaining: usesRemaining - 1,
      }
    else
      { state: state, usesRemaining: usesRemaining }

  pure def startRage(state: BattleState, usesRemaining: int): SecondWindResult =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      usesRemaining > 0 and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(state.fighter.wearingHeavyArmor) and
      not(fighterHasRage(state))
    )
      {
        state: {
          ...setFighterRoundExtendedOngoingFeatureExpiry({ ...state, fighter: breakConcentration(state.fighter) }, state.initiative.round + 1),
          bonusActionAvailable: false,
          fighterReadiedSpellHeld: false,
        },
        usesRemaining: usesRemaining - 1,
      }
    else
      { state: state, usesRemaining: usesRemaining }

  pure def startPersistentRage(state: BattleState, usesRemaining: int): SecondWindResult =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      usesRemaining > 0 and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(state.fighter.wearingHeavyArmor) and
      not(fighterHasRage(state))
    )
      {
        state: {
          ...state,
          fighter: {
            ...breakConcentration(state.fighter),
            activeOngoingFeatureOccurrences: state.fighter.activeOngoingFeatureOccurrences
              .set(FIGHTER_RAGE_SOURCE_KEY, ActiveFixedDurationOngoingFeature({
                expiresAtEndOfFighterTurnRound: state.initiative.round + 100,
              })),
          },
          bonusActionAvailable: false,
          fighterReadiedSpellHeld: false,
        },
        usesRemaining: usesRemaining - 1,
      }
    else
      { state: state, usesRemaining: usesRemaining }

  pure def extendRageWithBonusAction(state: BattleState, usesRemaining: int): SecondWindResult =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      fighterHasRage(state) and
      fighterHasRoundExtendedRage(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(state.fighter.wearingHeavyArmor)
    )
      {
        state: {
          ...setFighterRoundExtendedOngoingFeatureExpiry(state, state.initiative.round + 1),
          bonusActionAvailable: false,
        },
        usesRemaining: usesRemaining,
      }
    else
      { state: state, usesRemaining: usesRemaining }

  pure def actorSide(actor: Actor): CombatantSide =
    match actor {
      | Fighter => PartySide
      | Goblin => OppositionSide
    }

  pure def actorsAreEnemies(attacker: Actor, target: Actor): bool =
    actorSide(attacker) != actorSide(target)

  pure def extendRageWithAttackRoll(state: BattleState, target: Actor): BattleState =
    if (currentActor(state) == Fighter and actorsAreEnemies(Fighter, target) and fighterHasRoundExtendedRage(state))
      setFighterRoundExtendedOngoingFeatureExpiry(state, state.initiative.round + 1)
    else
      state

  pure def recordFighterAttackRoll(state: BattleState): BattleState =
    { ...extendRageWithAttackRoll(state, Goblin), attackRollMadeThisTurn: true }

  pure def extendRageWithEnemySavingThrow(state: BattleState, target: Actor): BattleState =
    if (currentActor(state) == Fighter and actorsAreEnemies(Fighter, target) and fighterHasRoundExtendedRage(state))
      setFighterRoundExtendedOngoingFeatureExpiry(state, state.initiative.round + 1)
    else
      state

  pure def activateRecklessAttackOnFirstAttackRoll(state: BattleState): BattleState =
    if (
      currentActor(state) == Fighter and
      not(state.attackRollMadeThisTurn) and
      not(fighterHasRecklessAttack(state))
    )
      {
        ...state,
        fighter: {
          ...state.fighter,
          activeOngoingFeatureOccurrences: state.fighter.activeOngoingFeatureOccurrences
            .set(FIGHTER_RECKLESS_ATTACK_SOURCE_KEY, ActiveStartOfTurnOngoingFeature),
        },
      }
    else
      state

  pure def goblinAttackAgainstFighterHasAdvantage(state: BattleState): bool =
    fighterHasRecklessAttack(state)

  pure def expendedSlotsAfterInvocation(
    invocation: SpellInvocation,
    expendedLevelOneSlots: int,
  ): int =
    if (spellInvocationSpendsLevelOneSlot(invocation))
      expendedLevelOneSlots + 1
    else
      expendedLevelOneSlots

  pure def spellInvocationSpendsLevelOneSlot(invocation: SpellInvocation): bool =
    match invocation {
      | MagicMissile => true
      | RayOfFrost => false
      | AcidSplash => false
      | PoisonSpray => false
      | ChillTouch => false
      | StarryWisp => false
      | SacredFlame => false
      | InflictWounds => true
      | BurningHands => true
      | ColorSpray => true
      | Entangle => true
      | EnsnaringStrike => true
      | SearingSmite => true
      | FaerieFire => true
      | AnimalFriendship => true
      | CharmPerson => true
      | ProtectionFromEvilAndGood => true
      | IceKnife => true
      | HealingWord => true
      | CureWounds => true
      | MassHealingWord => true
      | Shield => true
      | FalseLife => true
      | Longstrider => true
      | ShieldOfFaith => true
      | Heroism => true
      | Bane => true
      | Bless => true
      | Guidance => false
      | DivineFavor => true
      | DivineSmite => true
      | HuntersMark => true
      | ShockingGrasp => false
      | GuidingBolt => true
      | RayOfSickness => true
      | ViciousMockery => false
      | ProduceFlame => false
      | TrueStrike => false
    }

  pure def canExpendSpellSlotThisTurn(state: BattleState): bool =
    not(state.spellSlotExpendedThisTurn)

  pure def canDiscoverSpellActs(canCastSpells: bool, raging: bool): bool =
    canCastSpells and not(raging)

  pure def fighterRageDamageBonus(barbarianLevel: int): int =
    if (barbarianLevel >= 16) 4
    else if (barbarianLevel >= 9) 3
    else 2

  pure def spellAttackModifier(
    spellcastingAbilityModifier: int,
    proficiencyBonus: int,
  ): int =
    spellcastingAbilityModifier + proficiencyBonus

  pure def magicMissileDartCount(slotLevel: int): int =
    3 + (slotLevel - 1)

  pure def magicMissileAllocatedDamage(
    dieTotal: int,
    dartCount: int,
    flatPerDart: int,
  ): int =
    dieTotal + (dartCount * flatPerDart)

  pure def magicMissileTargetDamage(
    target: Combatant,
    dieTotal: int,
    dartCount: int,
    flatPerDart: int,
  ): int =
    if (target.activeEffects.contains(ShieldArmorClassBonus))
      0
    else
      magicMissileAllocatedDamage(dieTotal, dartCount, flatPerDart)

  pure def spellAttackDamageType(invocation: SpellAttackDamageInvocation): DamageType =
    match invocation {
      | RayOfFrostSpellAttack => Cold
      | PoisonSpraySpellAttack => Poison
      | ChillTouchSpellAttack => Necrotic
      | StarryWispSpellAttack => Radiant
      | ShockingGraspSpellAttack => Lightning
      | GuidingBoltSpellAttack => Radiant
      | RayOfSicknessSpellAttack => Poison
      | ProduceFlameHurlSpellAttack => Fire
    }

  pure def spellAttackDamageActiveEffects(invocation: SpellAttackDamageInvocation): Set[ActiveEffect] =
    match invocation {
      | RayOfFrostSpellAttack => Set(RayOfFrostSpeedDelta)
      | PoisonSpraySpellAttack => Set()
      | ChillTouchSpellAttack => Set()
      | StarryWispSpellAttack => Set()
      | ShockingGraspSpellAttack => Set(ShockingGraspOpportunityAttackDenied)
      | GuidingBoltSpellAttack => Set(GuidingBoltNextAttackAdvantage)
      | RayOfSicknessSpellAttack => Set(RayOfSicknessPoisoned)
      | ProduceFlameHurlSpellAttack => Set()
    }

  pure def spellAttackDamageSupportsObjectTarget(invocation: SpellAttackDamageInvocation): bool =
    match invocation {
      | StarryWispSpellAttack => true
      | RayOfFrostSpellAttack => false
      | PoisonSpraySpellAttack => false
      | ChillTouchSpellAttack => false
      | ShockingGraspSpellAttack => false
      | GuidingBoltSpellAttack => false
      | RayOfSicknessSpellAttack => false
      | ProduceFlameHurlSpellAttack => false
    }

  pure def objectHitPointDamageOutcome(
    object: ObjectTarget,
    damageType: DamageType,
    rolledDamage: int,
    priorHitPoints: int,
    damageThreshold: int,
  ): ObjectDamageOutcome = {
    val effectiveDamage = if (damageThreshold > 0 and rolledDamage < damageThreshold) 0 else rolledDamage
    val nextHitPoints = if (priorHitPoints - effectiveDamage < 0) 0 else priorHitPoints - effectiveDamage

    ObjectHitPointDamage({
      object: object,
      damageType: damageType,
      rolledDamage: rolledDamage,
      effectiveDamage: effectiveDamage,
      priorHitPoints: priorHitPoints,
      nextHitPoints: nextHitPoints,
      destroyed: nextHitPoints == 0,
    })
  }

  pure def spellObjectDamageOutcome(
    invocation: SpellAttackDamageInvocation,
    object: ObjectTarget,
    damageRoll: int,
    disposition: ObjectDamageDisposition,
  ): ObjectDamageOutcome =
    match disposition {
      | ObjectTableResolved =>
          ObjectTableResolvedDamage({
            object: object,
            damageType: spellAttackDamageType(invocation),
            rolledDamage: damageRoll,
          })
      | ObjectHitPoints(fill) =>
          objectHitPointDamageOutcome(
            object,
            spellAttackDamageType(invocation),
            damageRoll,
            fill.hitPoints,
            0,
          )
      | ObjectHitPointsWithDamageThreshold(fill) =>
          objectHitPointDamageOutcome(
            object,
            spellAttackDamageType(invocation),
            damageRoll,
            fill.hitPoints,
            fill.damageThreshold,
          )
    }

  pure def spellAttackDamageObjectReplayHoles(
    invocation: SpellAttackDamageInvocation,
    canCastSpells: bool,
    objectTargetFilled: bool,
    attackRollFilled: bool,
    attackHitsObject: bool,
    damageRollFilled: bool,
  ): Set[Hole] =
    if (not(canCastSpells) or not(spellAttackDamageSupportsObjectTarget(invocation)))
      Set()
    else if (not(objectTargetFilled))
      Set(ObjectTargetChoice)
    else if (not(attackRollFilled))
      Set(AttackRoll)
    else if (attackHitsObject and not(damageRollFilled))
      Set(SpellDamageRoll)
    else
      Set()

  pure def chromaticOrbDamageTypeChoice(choice: ChromaticOrbDamageTypeChoice): DamageType =
    match choice {
      | ChromaticOrbAcid => Acid
      | ChromaticOrbCold => Cold
      | ChromaticOrbFire => Fire
      | ChromaticOrbLightning => Lightning
      | ChromaticOrbPoison => Poison
      | ChromaticOrbThunder => Thunder
    }

  pure def chainedSpellAttackDamageChoices(invocation: ChainedSpellAttackDamageInvocation): Set[ChromaticOrbDamageTypeChoice] =
    match invocation {
      | ChromaticOrbChainedSpellAttack => Set(ChromaticOrbAcid, ChromaticOrbCold, ChromaticOrbFire, ChromaticOrbLightning, ChromaticOrbPoison, ChromaticOrbThunder)
    }

  pure def chainedSpellAttackDamageBaseSpellLevel(invocation: ChainedSpellAttackDamageInvocation): int =
    match invocation {
      | ChromaticOrbChainedSpellAttack => 1
    }

  pure def chainedSpellAttackDamageDieSize(invocation: ChainedSpellAttackDamageInvocation): int =
    match invocation {
      | ChromaticOrbChainedSpellAttack => 8
    }

  pure def chainedSpellAttackDamageSlotLevelIsLegal(invocation: ChainedSpellAttackDamageInvocation, slotLevel: int): bool =
    slotLevel >= chainedSpellAttackDamageBaseSpellLevel(invocation)

  pure def chainedSpellAttackDamageLeapCountIsLegal(
    invocation: ChainedSpellAttackDamageInvocation,
    slotLevel: int,
    leapsUsed: int,
  ): bool =
    chainedSpellAttackDamageSlotLevelIsLegal(invocation, slotLevel) and
    leapsUsed >= 0 and
    leapsUsed <= slotLevel

  pure def chainedSpellAttackDamageDice(invocation: ChainedSpellAttackDamageInvocation, slotLevel: int): int =
    match invocation {
      | ChromaticOrbChainedSpellAttack => 3 + (slotLevel - chainedSpellAttackDamageBaseSpellLevel(invocation))
    }

  pure def chainedSpellAttackDamageRolledD8Count(
    invocation: ChainedSpellAttackDamageInvocation,
    slotLevel: int,
    criticalHit: bool,
  ): int = {
    val ordinaryDice = chainedSpellAttackDamageDice(invocation, slotLevel)

    if (criticalHit) ordinaryDice * 2 else ordinaryDice
  }

  pure def d8FaceCountTotal(counts: D8FaceCounts): int =
    counts.face1 +
    counts.face2 +
    counts.face3 +
    counts.face4 +
    counts.face5 +
    counts.face6 +
    counts.face7 +
    counts.face8

  pure def d8FaceCountsAreNonNegative(counts: D8FaceCounts): bool =
    counts.face1 >= 0 and
    counts.face2 >= 0 and
    counts.face3 >= 0 and
    counts.face4 >= 0 and
    counts.face5 >= 0 and
    counts.face6 >= 0 and
    counts.face7 >= 0 and
    counts.face8 >= 0

  pure def d8FaceCountsMatchRolledDice(
    invocation: ChainedSpellAttackDamageInvocation,
    slotLevel: int,
    criticalHit: bool,
    counts: D8FaceCounts,
  ): bool =
    chainedSpellAttackDamageSlotLevelIsLegal(invocation, slotLevel) and
    d8FaceCountsAreNonNegative(counts) and
    d8FaceCountTotal(counts) == chainedSpellAttackDamageRolledD8Count(invocation, slotLevel, criticalHit)

  pure def damageRollHasDuplicateD8Face(counts: D8FaceCounts): bool =
    counts.face1 >= 2 or
    counts.face2 >= 2 or
    counts.face3 >= 2 or
    counts.face4 >= 2 or
    counts.face5 >= 2 or
    counts.face6 >= 2 or
    counts.face7 >= 2 or
    counts.face8 >= 2

  pure def chainedSpellAttackDamageCanLeap(
    invocation: ChainedSpellAttackDamageInvocation,
    slotLevel: int,
    leapsUsed: int,
    criticalHit: bool,
    counts: D8FaceCounts,
  ): bool =
    match invocation {
      | ChromaticOrbChainedSpellAttack =>
          d8FaceCountsMatchRolledDice(invocation, slotLevel, criticalHit, counts) and
          damageRollHasDuplicateD8Face(counts) and
          leapsUsed >= 0 and
          leapsUsed < slotLevel
    }

  pure def chainedSpellAttackDamageStepDamageType(
    invocation: ChainedSpellAttackDamageInvocation,
    selectedDamageType: ChromaticOrbDamageTypeChoice,
    stepIndex: int,
  ): DamageType =
    match invocation {
      | ChromaticOrbChainedSpellAttack => chromaticOrbDamageTypeChoice(selectedDamageType)
    }

  pure def chainedSpellAttackDamageTargetedHistoryIsCoherent(
    invocation: ChainedSpellAttackDamageInvocation,
    slotLevel: int,
    targeted: Set[Actor],
    leapsUsed: int,
  ): bool =
    chainedSpellAttackDamageLeapCountIsLegal(invocation, slotLevel, leapsUsed) and
    targeted.size() == leapsUsed + 1

  pure def chainedSpellAttackDamageLeapTargetHistoryIsCoherent(
    invocation: ChainedSpellAttackDamageInvocation,
    slotLevel: int,
    previousTarget: Actor,
    targeted: Set[Actor],
    leapsUsed: int,
  ): bool =
    chainedSpellAttackDamageTargetedHistoryIsCoherent(invocation, slotLevel, targeted, leapsUsed) and
    leapsUsed < slotLevel and
    targeted.contains(previousTarget)

  pure def chainedSpellAttackDamageStepHistoryIsCoherent(
    invocation: ChainedSpellAttackDamageInvocation,
    slotLevel: int,
    stepIndex: int,
    target: Actor,
    targeted: Set[Actor],
    leapsUsed: int,
  ): bool =
    chainedSpellAttackDamageTargetedHistoryIsCoherent(invocation, slotLevel, targeted, leapsUsed) and
    stepIndex == leapsUsed and
    targeted.contains(target)

  pure def chainedSpellAttackDamageReplayHoles(
    invocation: ChainedSpellAttackDamageInvocation,
    canCastSpells: bool,
    replay: ChainedSpellAttackDamageReplay,
  ): Set[ChainedSpellAttackDamageHole] =
    if (not(canCastSpells))
      Set()
    else match replay {
      | ChainedNeedsDamageType => Set(ChainedSpellDamageTypeChoice)
      | ChainedNeedsInitialTarget(fill) =>
          if (
            chainedSpellAttackDamageSlotLevelIsLegal(invocation, fill.slotLevel)
          )
            Set(ChainedStepTargetChoice({ stepIndex: 0 }))
          else
            Set()
      | ChainedNeedsLeapTarget(fill) =>
          if (
            chainedSpellAttackDamageLeapTargetHistoryIsCoherent(
              invocation,
              fill.slotLevel,
              fill.previousTarget,
              fill.targeted,
              fill.leapsUsed,
            )
          )
            Set(ChainedStepTargetChoice({ stepIndex: fill.leapsUsed + 1 }))
          else
            Set()
      | ChainedNeedsAttackRoll(fill) =>
          if (
            chainedSpellAttackDamageStepHistoryIsCoherent(
              invocation,
              fill.slotLevel,
              fill.stepIndex,
              fill.target,
              fill.targeted,
              fill.leapsUsed,
            )
          )
            Set(ChainedStepAttackRoll({ stepIndex: fill.stepIndex }))
          else
            Set()
      | ChainedNeedsDamageRoll(fill) =>
          if (
            chainedSpellAttackDamageStepHistoryIsCoherent(
              invocation,
              fill.slotLevel,
              fill.stepIndex,
              fill.target,
              fill.targeted,
              fill.leapsUsed,
            )
          )
            Set(ChainedStepDamageRoll({ stepIndex: fill.stepIndex }))
          else
            Set()
      | ChainedComplete => Set()
    }

  pure def chainedSpellAttackDamageTargetAllowed(
    invocation: ChainedSpellAttackDamageInvocation,
    replay: ChainedSpellAttackDamageReplay,
    candidate: Actor,
    candidateWithinPreviousTarget30Feet: bool,
  ): bool =
    match replay {
      | ChainedNeedsInitialTarget(fill) => chainedSpellAttackDamageSlotLevelIsLegal(invocation, fill.slotLevel)
      | ChainedNeedsLeapTarget(fill) =>
          candidateWithinPreviousTarget30Feet and
          not(fill.targeted.contains(candidate)) and
          chainedSpellAttackDamageLeapTargetHistoryIsCoherent(
            invocation,
            fill.slotLevel,
            fill.previousTarget,
            fill.targeted,
            fill.leapsUsed,
          )
      | _ => false
    }

  pure def saveGatedDamageFailedSaveActiveEffects(invocation: SaveGatedDamageInvocation): Set[ActiveEffect] =
    match invocation {
      | AcidSplashSaveGate => Set()
      | SacredFlameSaveGate => Set()
      | InflictWoundsSaveGate => Set()
      | BurningHandsSaveGate => Set()
      | ViciousMockerySaveGate => Set(ViciousMockeryNextAttackDisadvantage)
    }

  pure def spellAttackRollModeFromActiveEffects(
    attackerEffects: Set[ActiveEffect],
    targetEffects: Set[ActiveEffect],
    attackerCanSeeTarget: bool,
  ): SpellAttackRollMode =
    if (attackerEffects.contains(ViciousMockeryNextAttackDisadvantage) and (targetEffects.contains(GuidingBoltNextAttackAdvantage) or (attackerCanSeeTarget and targetEffects.contains(FaerieFireAttackRollAdvantage))))
      NormalSpellAttackRoll
    else if (targetEffects.contains(GuidingBoltNextAttackAdvantage) or (attackerCanSeeTarget and targetEffects.contains(FaerieFireAttackRollAdvantage)))
      AdvantageSpellAttackRoll
    else if (attackerEffects.contains(ViciousMockeryNextAttackDisadvantage))
      DisadvantageSpellAttackRoll
    else
      NormalSpellAttackRoll

  pure def protectionFromEvilAndGoodCreatureTypeIsScoped(creatureType: RuntimeCreatureType): bool =
    creatureType == AberrationCreature or
    creatureType == CelestialCreature or
    creatureType == ElementalCreature or
    creatureType == FeyCreature or
    creatureType == FiendCreature or
    creatureType == UndeadCreature

  pure def spellAttackRollModeFromCreatureTypeScopedActiveEffects(
    attackerCreatureType: RuntimeCreatureType,
    attackerEffects: Set[ActiveEffect],
    targetEffects: Set[ActiveEffect],
    attackerCanSeeTarget: bool,
  ): SpellAttackRollMode = {
    val hasAdvantage =
      targetEffects.contains(GuidingBoltNextAttackAdvantage)
      or (attackerCanSeeTarget and targetEffects.contains(FaerieFireAttackRollAdvantage))
    val hasDisadvantage =
      attackerEffects.contains(ViciousMockeryNextAttackDisadvantage)
      or (
        targetEffects.contains(ProtectionFromEvilAndGoodAttackDisadvantage)
        and protectionFromEvilAndGoodCreatureTypeIsScoped(attackerCreatureType)
      )
    if (hasAdvantage and not(hasDisadvantage))
      AdvantageSpellAttackRoll
    else if (hasDisadvantage and not(hasAdvantage))
      DisadvantageSpellAttackRoll
    else
      NormalSpellAttackRoll
  }

  pure def rayOfFrostSpeedEffectActive(
    hit: bool,
    currentActor: Actor,
    caster: Actor,
  ): bool =
    hit and currentActor != caster

  pure def saveGatedTargeting(invocation: SaveGatedDamageInvocation): SaveGatedTargeting =
    match invocation {
      | AcidSplashSaveGate => AreaSaveTargets
      | SacredFlameSaveGate => SingleSaveTarget
      | InflictWoundsSaveGate => SingleSaveTarget
      | BurningHandsSaveGate => AreaSaveTargets
      | ViciousMockerySaveGate => SingleSaveTarget
    }

  pure def saveGatedDamageSuccess(invocation: SaveGatedDamageInvocation): SaveGatedDamageSuccess =
    match invocation {
      | AcidSplashSaveGate => NoDamageOnSaveSuccess
      | SacredFlameSaveGate => NoDamageOnSaveSuccess
      | InflictWoundsSaveGate => HalfDamageOnSaveSuccess
      | BurningHandsSaveGate => HalfDamageOnSaveSuccess
      | ViciousMockerySaveGate => NoDamageOnSaveSuccess
    }

  pure def saveGatedDamageType(invocation: SaveGatedDamageInvocation): DamageType =
    match invocation {
      | AcidSplashSaveGate => Acid
      | SacredFlameSaveGate => Radiant
      | InflictWoundsSaveGate => Necrotic
      | BurningHandsSaveGate => Fire
      | ViciousMockerySaveGate => Psychic
    }

  pure def saveGatedDamageSpendsLevelOneSlot(invocation: SaveGatedDamageInvocation): bool =
    match invocation {
      | AcidSplashSaveGate => false
      | SacredFlameSaveGate => false
      | InflictWoundsSaveGate => true
      | BurningHandsSaveGate => true
      | ViciousMockerySaveGate => false
    }

  pure def attackBurstSaveDamageSpendsLevelOneSlot(invocation: AttackBurstSaveDamageInvocation): bool =
    match invocation {
      | IceKnifeAttackBurstSaveDamage => true
    }

  pure def attackBurstSaveDamageAttackType(invocation: AttackBurstSaveDamageInvocation): DamageType =
    match invocation {
      | IceKnifeAttackBurstSaveDamage => Piercing
    }

  pure def attackBurstSaveDamageBurstType(invocation: AttackBurstSaveDamageInvocation): DamageType =
    match invocation {
      | IceKnifeAttackBurstSaveDamage => Cold
    }

  pure def attackBurstSaveDamageReplayHoles(
    invocation: AttackBurstSaveDamageInvocation,
    canCastSpells: bool,
    targetFilled: bool,
    attackRollFilled: bool,
    attackHitsTarget: bool,
    attackDamageFilled: bool,
    savingThrowOutcomesFilled: bool,
    anyBurstTargetFailsSavingThrow: bool,
  ): Set[Hole] =
    if (not(canCastSpells))
      Set()
    else if (not(targetFilled))
      Set(TargetChoice)
    else if (not(attackRollFilled))
      Set(AttackRoll)
    else if (attackHitsTarget and not(attackDamageFilled))
      Set(DamageRoll)
    else if (not(savingThrowOutcomesFilled))
      Set(SavingThrowOutcome)
    else if (anyBurstTargetFailsSavingThrow)
      Set(SpellDamageRoll)
    else
      Set()

  pure def saveGatedConditionTargeting(invocation: SaveGatedConditionInvocation): SaveGatedTargeting =
    match invocation {
      | ColorSpraySaveGate => AreaSaveTargets
      | EntangleSaveGate => AreaSaveTargets
      | AnimalFriendshipSaveGate => TargetListSaveTargets({ minTargets: 1, baseSlotLevel: 1, baseTargets: 1, additionalTargetsPerSlotLevel: 1 })
      | CharmPersonSaveGate => TargetListSaveTargets({ minTargets: 1, baseSlotLevel: 1, baseTargets: 1, additionalTargetsPerSlotLevel: 1 })
    }

  pure def saveGatedTargetMaxTargets(targeting: SaveGatedTargeting, slotLevel: int): int =
    match targeting {
      | TargetListSaveTargets(data) =>
        data.baseTargets +
          (if (slotLevel > data.baseSlotLevel)
            (slotLevel - data.baseSlotLevel) * data.additionalTargetsPerSlotLevel
          else
            0)
      | _ => 1
    }

  pure def saveGatedConditionFailedSaveActiveEffects(invocation: SaveGatedConditionInvocation, source: Actor): Set[ActiveEffect] =
    match invocation {
      | ColorSpraySaveGate => Set(ColorSprayBlinded)
      | EntangleSaveGate => Set(EntangleRestrained)
      | AnimalFriendshipSaveGate => Set(AnimalFriendshipCharmed({ source: source, durationTicks: 24 * 60 }))
      | CharmPersonSaveGate => Set(CharmPersonCharmed({ source: source, durationTicks: charmPersonCharmedDurationTicks }))
    }

  pure def charmPersonCharmedDurationTicks: int = 60 * 10

  pure def saveGatedConditionTargetCreatureTypeIsLegal(
    invocation: SaveGatedConditionInvocation,
    targetCreatureType: RuntimeCreatureType,
  ): bool =
    match invocation {
      | ColorSpraySaveGate => true
      | EntangleSaveGate => true
      | AnimalFriendshipSaveGate => targetCreatureType == BeastCreature
      | CharmPersonSaveGate => targetCreatureType == HumanoidCreature
    }

  pure def saveGatedConditionSavingThrowHasAdvantage(
    invocation: SaveGatedConditionInvocation,
    targetIsHostile: bool,
  ): bool =
    match invocation {
      | CharmPersonSaveGate => targetIsHostile
      | _ => false
    }

  pure def saveGatedConditionReplayHoles(
    invocation: SaveGatedConditionInvocation,
    canCastSpells: bool,
    targetFilled: bool,
    savingThrowOutcomesFilled: bool,
  ): Set[Hole] =
    if (not(canCastSpells))
      Set()
    else if (saveGatedConditionTargeting(invocation) == SingleSaveTarget and not(targetFilled))
      Set(TargetChoice)
    else if (match saveGatedConditionTargeting(invocation) { | TargetListSaveTargets(_) => true | _ => false } and not(targetFilled))
      Set(SpellTargetList)
    else if (not(savingThrowOutcomesFilled))
      Set(SavingThrowOutcome)
    else
      Set()

  pure def saveGatedAttackRollAdvantageTargeting(invocation: SaveGatedAttackRollAdvantageInvocation): SaveGatedTargeting =
    match invocation {
      | FaerieFireSaveGate => AreaSaveTargets
    }

  pure def saveGatedAttackRollAdvantageFailedSaveActiveEffects(invocation: SaveGatedAttackRollAdvantageInvocation): Set[ActiveEffect] =
    match invocation {
      | FaerieFireSaveGate => Set(FaerieFireAttackRollAdvantage)
    }

  pure def saveGatedAttackRollAdvantageReplayHoles(
    invocation: SaveGatedAttackRollAdvantageInvocation,
    canCastSpells: bool,
    savingThrowOutcomesFilled: bool,
  ): Set[Hole] =
    if (not(canCastSpells))
      Set()
    else if (not(savingThrowOutcomesFilled))
      Set(SavingThrowOutcome)
    else
      Set()

  pure def saveGatedDamageReplayHoles(
    invocation: SaveGatedDamageInvocation,
    canCastSpells: bool,
    targetFilled: bool,
    savingThrowOutcomesFilled: bool,
    anyTargetTakesDamage: bool,
  ): Set[Hole] =
    if (not(canCastSpells))
      Set()
    else if (saveGatedTargeting(invocation) == SingleSaveTarget and not(targetFilled))
      Set(TargetChoice)
    else if (not(savingThrowOutcomesFilled))
      Set(SavingThrowOutcome)
    else if (anyTargetTakesDamage)
      Set(DamageRoll)
    else
      Set()

  pure def acidSplashReplayHoles(
    canCastSpells: bool,
    savingThrowOutcomesFilled: bool,
    anyFailedSavingThrow: bool,
  ): Set[Hole] =
    saveGatedDamageReplayHoles(AcidSplashSaveGate, canCastSpells, true, savingThrowOutcomesFilled, anyFailedSavingThrow)

  pure def saveGatedDamageAmount(
    invocation: SaveGatedDamageInvocation,
    damageRoll: int,
    savingThrowSucceeded: bool,
  ): int =
    if (not(savingThrowSucceeded))
      damageRoll
    else if (saveGatedDamageSuccess(invocation) == HalfDamageOnSaveSuccess)
      damageRoll / 2
    else
      0

  pure def saveGatedDamageTarget(
    invocation: SaveGatedDamageInvocation,
    target: Combatant,
    savingThrowSucceeded: bool,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
    damageSource: Actor,
  ): Combatant =
    if (saveGatedDamageAmount(invocation, damageRoll, savingThrowSucceeded) == 0)
      target
    else
      applyDamageFromSource(
        target,
        damageAfterAdjustments(
          saveGatedDamageAmount(invocation, damageRoll, savingThrowSucceeded),
          saveGatedDamageType(invocation),
          Set(),
          Set(),
          Set()
        ),
        1,
        concentrationSaveSucceeded,
        OrdinaryDamage,
        damageSource,
      )

  pure def acidSplashDamageTarget(
    target: Combatant,
    failedSavingThrow: bool,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): Combatant =
    saveGatedDamageTarget(AcidSplashSaveGate, target, not(failedSavingThrow), damageRoll, concentrationSaveSucceeded, Fighter)

  pure def dexHalfSaveDamageAfterReplacement(
    damageRoll: int,
    saveSucceeded: bool,
    replacementApplies: bool,
  ): int =
    if (replacementApplies and saveSucceeded) 0
    else if (replacementApplies or saveSucceeded) damageRoll / 2
    else damageRoll

  pure def resolveAcidSplash(
    state: BattleState,
    fighterFailedSavingThrow: bool,
    goblinFailedSavingThrow: bool,
    damageRoll: int,
    fighterConcentrationSaveSucceeded: bool,
    goblinConcentrationSaveSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state))
      state
    else
      {
        ...state,
        fighter: acidSplashDamageTarget(state.fighter, fighterFailedSavingThrow, damageRoll, fighterConcentrationSaveSucceeded),
        goblin: acidSplashDamageTarget(state.goblin, goblinFailedSavingThrow, damageRoll, goblinConcentrationSaveSucceeded),
        actionAvailable: false,
      }

  pure def resolveBurningHands(
    state: BattleState,
    fighterSavingThrowSucceeded: bool,
    goblinSavingThrowSucceeded: bool,
    damageRoll: int,
    fighterConcentrationSaveSucceeded: bool,
    goblinConcentrationSaveSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else
      {
        ...state,
        fighter: saveGatedDamageTarget(BurningHandsSaveGate, state.fighter, fighterSavingThrowSucceeded, damageRoll, fighterConcentrationSaveSucceeded, Fighter),
        goblin: saveGatedDamageTarget(BurningHandsSaveGate, state.goblin, goblinSavingThrowSucceeded, damageRoll, goblinConcentrationSaveSucceeded, Fighter),
        actionAvailable: false,
        spellSlotExpendedThisTurn: true,
      }

  pure def resolveBurningHandsEmptyArea(state: BattleState): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else
      {
        ...state,
        actionAvailable: false,
        spellSlotExpendedThisTurn: true,
      }

  pure def saveGatedConditionTarget(
    invocation: SaveGatedConditionInvocation,
    target: Combatant,
    savingThrowSucceeded: bool,
    source: Actor,
  ): Combatant =
    if (savingThrowSucceeded)
      target
    else
      { ...target, activeEffects: target.activeEffects.union(saveGatedConditionFailedSaveActiveEffects(invocation, source)) }

  pure def actorHasTurnLaterThisRound(state: BattleState, actor: Actor): bool =
    actor != currentActor(state) and state.initiative.stillToAct.length() > 1

  pure def sleepRepeatAtRound(state: BattleState, target: Actor): int =
    if (actorHasTurnLaterThisRound(state, target))
      state.initiative.round
    else
      state.initiative.round + 1

  pure def sleepPendingRepeatSaveEffect(
    state: BattleState,
    target: Actor,
    source: Actor,
    hadIncapacitated: bool,
  ): ActiveEffect =
    SleepPendingRepeatSave({
      source: source,
      repeatAtActor: target,
      repeatAtRound: sleepRepeatAtRound(state, target),
      hadIncapacitated: hadIncapacitated,
    })

  pure def sleepInitialSaveTarget(
    state: BattleState,
    target: Combatant,
    targetActor: Actor,
    savingThrowSucceeded: bool,
    source: Actor,
  ): Combatant =
    if (savingThrowSucceeded)
      target
    else {
      val slept = {
        ...target,
        incapacitated: true,
        activeEffects: target.activeEffects
          .filter(effect => match effect {
            | SleepPendingRepeatSave(data) => data.source != source
            | SleepUnconscious(data) => data.source != source
            | _ => true
          })
          .union(Set(sleepPendingRepeatSaveEffect(state, targetActor, source, target.incapacitated))),
      }
      breakConcentrationFromSleepAppliedIncapacitated(slept, targetActor)
    }

  pure def resolveSleepTargetAdmission(
    state: BattleState,
    goblinSavingThrowSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      {
        ...withoutPrior,
        fighter: { ...withoutPrior.fighter, concentrating: true },
        goblin: sleepInitialSaveTarget(withoutPrior, withoutPrior.goblin, Goblin, goblinSavingThrowSucceeded, Fighter),
        actionAvailable: false,
        spellSlotExpendedThisTurn: true,
      }
    }

  pure def sleepRepeatSaveDue(effects: Set[ActiveEffect], actor: Actor, round: int): bool =
    effects.exists(effect => match effect {
      | SleepPendingRepeatSave(data) => data.repeatAtActor == actor and data.repeatAtRound == round
      | _ => false
    })

  pure def sleepPendingHadIncapacitated(effects: Set[ActiveEffect], actor: Actor, round: int): bool =
    effects.exists(effect => match effect {
      | SleepPendingRepeatSave(data) => data.repeatAtActor == actor and data.repeatAtRound == round and data.hadIncapacitated
      | _ => false
    })

  pure def activeEffectsWithoutSleepPendingRepeatSave(effects: Set[ActiveEffect], actor: Actor, round: int): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | SleepPendingRepeatSave(data) => not(data.repeatAtActor == actor and data.repeatAtRound == round)
      | _ => true
    })

  pure def sleepRepeatSaveHoles(state: BattleState): Set[Hole] =
    match currentActor(state) {
      | Fighter =>
        if (sleepRepeatSaveDue(state.fighter.activeEffects, Fighter, state.initiative.round))
          Set(SavingThrowOutcome)
        else
          Set()
      | Goblin =>
        if (sleepRepeatSaveDue(state.goblin.activeEffects, Goblin, state.initiative.round))
          Set(SavingThrowOutcome)
        else
          Set()
    }

  pure def sleepRepeatSaveTarget(
    target: Combatant,
    targetActor: Actor,
    round: int,
    savingThrowSucceeded: bool,
  ): Combatant = {
    val activeEffectsWithoutPending = activeEffectsWithoutSleepPendingRepeatSave(target.activeEffects, targetActor, round)
    val hadIncapacitated = sleepPendingHadIncapacitated(target.activeEffects, targetActor, round)
    if (savingThrowSucceeded)
      { ...target, incapacitated: hadIncapacitated, activeEffects: activeEffectsWithoutPending }
    else {
      val slept = {
        ...target,
        incapacitated: hadIncapacitated,
        unconscious: true,
        prone: true,
        activeEffects: activeEffectsWithoutPending.union(Set(SleepUnconscious({
          source: Fighter,
          hadUnconscious: target.unconscious,
          hadIncapacitated: hadIncapacitated,
        }))),
      }
      breakConcentrationFromSleepAppliedIncapacitated(slept, targetActor)
    }
  }

  pure def endTurnWithSleepRepeatSave(state: BattleState, savingThrowSucceeded: bool): BattleState =
    match currentActor(state) {
      | Fighter =>
        if (sleepRepeatSaveDue(state.fighter.activeEffects, Fighter, state.initiative.round))
          endTurn({ ...state, fighter: sleepRepeatSaveTarget(state.fighter, Fighter, state.initiative.round, savingThrowSucceeded) })
        else
          endTurn(state)
      | Goblin =>
        if (sleepRepeatSaveDue(state.goblin.activeEffects, Goblin, state.initiative.round))
          endTurn({ ...state, goblin: sleepRepeatSaveTarget(state.goblin, Goblin, state.initiative.round, savingThrowSucceeded) })
        else
          endTurn(state)
    }

  pure def selectedTargetCount(fighterTargeted: bool, goblinTargeted: bool): int =
    (if (fighterTargeted) 1 else 0) + (if (goblinTargeted) 1 else 0)

  pure def saveGatedConditionTargetCountIsLegal(
    invocation: SaveGatedConditionInvocation,
    slotLevel: int,
    fighterTargeted: bool,
    goblinTargeted: bool,
  ): bool = {
    val count = selectedTargetCount(fighterTargeted, goblinTargeted)
    val targeting = saveGatedConditionTargeting(invocation)
    val minTargets = match targeting {
      | TargetListSaveTargets(data) => data.minTargets
      | _ => 1
    }
    count >= 1 and
      count >= minTargets and
      count <= saveGatedTargetMaxTargets(targeting, slotLevel)
  }

  pure def resolveTargetListSaveGatedCondition(
    state: BattleState,
    invocation: SaveGatedConditionInvocation,
    slotLevel: int,
    fighterTargeted: bool,
    fighterCreatureType: RuntimeCreatureType,
    fighterSavingThrowSucceeded: bool,
    goblinTargeted: bool,
    goblinCreatureType: RuntimeCreatureType,
    goblinSavingThrowSucceeded: bool,
  ): BattleState =
    if (
      not(state.actionAvailable) or
      currentActor(state) != Fighter or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      not(canExpendSpellSlotThisTurn(state)) or
      not(match saveGatedConditionTargeting(invocation) { | TargetListSaveTargets(_) => true | _ => false }) or
      not(saveGatedConditionTargetCountIsLegal(invocation, slotLevel, fighterTargeted, goblinTargeted)) or
      (fighterTargeted and not(saveGatedConditionTargetCreatureTypeIsLegal(invocation, fighterCreatureType))) or
      (goblinTargeted and not(saveGatedConditionTargetCreatureTypeIsLegal(invocation, goblinCreatureType)))
    )
      state
    else
      {
        ...state,
        fighter: if (fighterTargeted) saveGatedConditionTarget(invocation, state.fighter, fighterSavingThrowSucceeded, Fighter) else state.fighter,
        goblin: if (goblinTargeted) saveGatedConditionTarget(invocation, state.goblin, goblinSavingThrowSucceeded, Fighter) else state.goblin,
        actionAvailable: false,
        spellSlotExpendedThisTurn: true,
      }

  pure def resolveColorSpray(
    state: BattleState,
    fighterSavingThrowSucceeded: bool,
    goblinSavingThrowSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else
      {
        ...state,
        fighter: saveGatedConditionTarget(ColorSpraySaveGate, state.fighter, fighterSavingThrowSucceeded, Fighter),
        goblin: saveGatedConditionTarget(ColorSpraySaveGate, state.goblin, goblinSavingThrowSucceeded, Fighter),
        actionAvailable: false,
        spellSlotExpendedThisTurn: true,
      }

  pure def resolveColorSprayEmptyArea(state: BattleState): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else
      {
        ...state,
        actionAvailable: false,
        spellSlotExpendedThisTurn: true,
      }

  pure def saveGatedAttackRollAdvantageTarget(
    invocation: SaveGatedAttackRollAdvantageInvocation,
    target: Combatant,
    savingThrowSucceeded: bool,
  ): Combatant =
    if (savingThrowSucceeded)
      target
    else
      { ...target, activeEffects: target.activeEffects.union(saveGatedAttackRollAdvantageFailedSaveActiveEffects(invocation)) }

  pure def breakConcentrationSpellEffects(state: BattleState, caster: Actor): BattleState =
    match caster {
      | Fighter =>
        {
          ...state,
          fighter: breakConcentration(state.fighter),
          goblin: combatantWithoutSpellEffectConcentrationEffects(state.goblin),
        }
      | Goblin =>
        {
          ...state,
          goblin: breakConcentration(state.goblin),
          fighter: combatantWithoutSpellEffectConcentrationEffects(state.fighter),
        }
    }

  pure def resolveFaerieFire(
    state: BattleState,
    fighterSavingThrowSucceeded: bool,
    goblinSavingThrowSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      {
        ...withoutPrior,
        fighter: { ...saveGatedAttackRollAdvantageTarget(FaerieFireSaveGate, withoutPrior.fighter, fighterSavingThrowSucceeded), concentrating: true },
        goblin: saveGatedAttackRollAdvantageTarget(FaerieFireSaveGate, withoutPrior.goblin, goblinSavingThrowSucceeded),
        actionAvailable: false,
        spellSlotExpendedThisTurn: true,
      }
    }

  pure def resolveEntangle(
    state: BattleState,
    fighterIncludedInArea: bool,
    goblinSavingThrowSucceeded: bool,
  ): BattleState =
    if (fighterIncludedInArea or not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      {
        ...withoutPrior,
        fighter: { ...withoutPrior.fighter, concentrating: true },
        goblin: saveGatedConditionTarget(EntangleSaveGate, withoutPrior.goblin, goblinSavingThrowSucceeded, Fighter),
        actionAvailable: false,
        spellSlotExpendedThisTurn: true,
      }
    }

  pure def escapeEntangle(state: BattleState, checkSucceeded: bool): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Goblin or not(state.goblin.activeEffects.contains(EntangleRestrained)))
      state
    else
      {
        ...state,
        goblin: if (checkSucceeded) { ...state.goblin, activeEffects: state.goblin.activeEffects.exclude(Set(EntangleRestrained)) } else state.goblin,
        actionAvailable: false,
      }

  pure def resolveSingleTargetSaveGatedDamage(
    state: BattleState,
    invocation: SaveGatedDamageInvocation,
    savingThrowSucceeded: bool,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (
      not(state.actionAvailable) or
      currentActor(state) != Fighter or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      saveGatedTargeting(invocation) != SingleSaveTarget or
      (saveGatedDamageSpendsLevelOneSlot(invocation) and not(canExpendSpellSlotThisTurn(state)))
    )
      state
    else {
      val damaged = saveGatedDamageTarget(invocation, state.goblin, savingThrowSucceeded, damageRoll, concentrationSaveSucceeded, Fighter)
      {
        ...state,
        goblin: damaged,
        actionAvailable: false,
        spellSlotExpendedThisTurn:
          if (saveGatedDamageSpendsLevelOneSlot(invocation)) true else state.spellSlotExpendedThisTurn,
      }
    }

  pure def resolveSacredFlame(
    state: BattleState,
    savingThrowSucceeded: bool,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveSingleTargetSaveGatedDamage(state, SacredFlameSaveGate, savingThrowSucceeded, damageRoll, concentrationSaveSucceeded)

  pure def resolveInflictWounds(
    state: BattleState,
    savingThrowSucceeded: bool,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveSingleTargetSaveGatedDamage(state, InflictWoundsSaveGate, savingThrowSucceeded, damageRoll, concentrationSaveSucceeded)

  pure def adjustedAttackBurstSaveDamage(
    damage: int,
    damageType: DamageType,
  ): int =
    damageAfterAdjustments(damage, damageType, Set(), Set(), Set())

  pure def applyIceKnifeDamageWithSingleConcentrationCheck(
    target: Combatant,
    attackDamage: int,
    burstDamage: int,
    concentrationSaveSucceeded: bool,
  ): Combatant = {
    val totalDamage = attackDamage + burstDamage
    val afterAttack = applyDamageFromSource(target, attackDamage, 1, true, OrdinaryDamage, Fighter)
    val afterBurst = applyDamageFromSource(afterAttack, burstDamage, 1, true, OrdinaryDamage, Fighter)
    if (target.concentrating and totalDamage > 0 and not(concentrationSaveSucceeded))
      breakConcentration(afterBurst)
    else
      afterBurst
  }

  pure def iceKnifeBurstTarget(
    target: Combatant,
    savingThrowSucceeded: bool,
    burstDamageRoll: int,
    concentrationSaveSucceeded: bool,
  ): Combatant = {
    val burstDamage =
      if (savingThrowSucceeded)
        0
      else
        adjustedAttackBurstSaveDamage(burstDamageRoll, attackBurstSaveDamageBurstType(IceKnifeAttackBurstSaveDamage))
    applyIceKnifeDamageWithSingleConcentrationCheck(target, 0, burstDamage, concentrationSaveSucceeded)
  }

  pure def resolveIceKnife(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    attackDamageRoll: int,
    goblinSavingThrowSucceeded: bool,
    fighterIncludedInBurst: bool,
    fighterSavingThrowSucceeded: bool,
    burstDamageRoll: int,
    goblinConcentrationSaveSucceeded: bool,
    fighterConcentrationSaveSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      val hit = attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), 20)
      if (hit and state.goblin.reactionAvailable and not(state.goblin.activeEffects.contains(ShieldArmorClassBonus))) {
        openReactionWindow(rolled, {
          trigger: AttackHit,
          eligibleReactors: Set(Goblin),
          offeredReactors: Set(),
          continuation: ResumeIceKnife,
        })
      } else {
        val attackDamage =
          if (hit)
            adjustedAttackBurstSaveDamage(
              attackDamageRoll * (if (attackIsCritical(naturalD20, 20)) 2 else 1),
              attackBurstSaveDamageAttackType(IceKnifeAttackBurstSaveDamage),
            )
          else
            0
        val burstDamage =
          if (goblinSavingThrowSucceeded)
            0
          else
            adjustedAttackBurstSaveDamage(burstDamageRoll, attackBurstSaveDamageBurstType(IceKnifeAttackBurstSaveDamage))
        val damagedGoblin = applyIceKnifeDamageWithSingleConcentrationCheck(
          rolled.goblin,
          attackDamage,
          burstDamage,
          goblinConcentrationSaveSucceeded,
        )
        val damagedFighter =
          if (fighterIncludedInBurst)
            iceKnifeBurstTarget(rolled.fighter, fighterSavingThrowSucceeded, burstDamageRoll, fighterConcentrationSaveSucceeded)
          else
            rolled.fighter
        {
          ...rolled,
          fighter: damagedFighter,
          goblin: damagedGoblin,
          actionAvailable: false,
          spellSlotExpendedThisTurn: true,
        }
      }
    }

  pure def applyDropToZeroHp(target: Combatant): Combatant =
    match target.lifecycle {
      | DiesAtZeroHp => { ...target, knockedOut: false }
      | UsesDeathSavingThrows => { ...breakConcentration(target), unconscious: true, knockedOut: false, stable: false, deathSuccesses: 0, deathFailures: 0 }
    }

  pure def applyDamageAtZeroHp(target: Combatant, deathFailuresAtZeroHp: int): Combatant =
    match target.lifecycle {
      | DiesAtZeroHp => { ...target, knockedOut: false }
      | UsesDeathSavingThrows => {
          ...target,
          stable: false,
          unconscious: true,
          knockedOut: false,
          deathFailures: if (target.deathFailures + deathFailuresAtZeroHp > 3) 3 else target.deathFailures + deathFailuresAtZeroHp,
        }
    }

  pure def applyInstantDeath(target: Combatant): Combatant =
    match target.lifecycle {
      | DiesAtZeroHp => { ...target, knockedOut: false }
      | UsesDeathSavingThrows => { ...target, unconscious: true, knockedOut: false, stable: false, deathFailures: 3 }
    }

  pure def applyStartTurnDeathSave(target: Combatant, deathSaveRoll: int): Combatant =
    if (target.lifecycle != UsesDeathSavingThrows or target.hp != 0 or target.stable or target.deathFailures >= 3)
      target
    else if (deathSaveRoll == 20)
      { ...target, hp: 1, unconscious: false, knockedOut: false, stable: false, deathSuccesses: 0, deathFailures: 0 }
    else if (deathSaveRoll == 1)
      applyDamageAtZeroHp(target, 2)
    else if (deathSaveRoll >= 10) {
      val successes = if (target.deathSuccesses + 1 > 3) 3 else target.deathSuccesses + 1
      if (successes >= 3)
        { ...target, stable: true, deathSuccesses: 0, deathFailures: 0 }
      else
        { ...target, deathSuccesses: successes }
    } else {
      applyDamageAtZeroHp(target, 1)
    }

  run test_initial_holes_cover_attack_target = {
    assert(openHoles(initialState).contains(TargetChoice))
  }

  run test_hide_records_discovery_dc = {
    val canHide = { ...initialState, fighterHidePrerequisite: true }
    all {
      assert(hideHoles(initialState) == Set()),
      assert(hideHoles(canHide) == Set(AbilityCheck)),
      assert(hideFighter(initialState, 20).fighter.hidden == NotHidden),
      assert(fighterIsHidden(hideFighter(canHide, 15))),
      assert(hideFighter(canHide, 14).fighter.hidden == NotHidden),
    }
  }

  run test_search_finds_hidden_fighter = {
    val hidden = endTurn(hideFighter({ ...initialState, fighterHidePrerequisite: true }, 18))
    all {
      assert(searchGoblinForFighter(hidden, 17).fighter.hidden == HiddenByDc(HiddenDc18)),
      assert(searchGoblinForFighter(hidden, 18).fighter.hidden == NotHidden),
    }
  }

  run test_attack_reveals_hidden_fighter = {
    val hidden = hideFighter({ ...initialState, fighterHidePrerequisite: true }, 18)
    assert(resolveAttack({ ...hidden, actionAvailable: true }, 1, 1, fighterWeaponAttackDamageRoll(4), true).fighter.hidden == NotHidden)
  }

  run test_attack_replay_asks_for_attack_roll_after_target = {
    assert(attackReplayHoles(initialState, AttackNeedsAttackRoll) == Set(AttackRoll))
  }

  run test_attack_replay_asks_for_damage_roll_after_hit = {
    assert(attackReplayHoles(initialState, AttackRollFilled({ attackTotal: 15, naturalD20: 10 })) == Set(DamageRoll))
  }

  run test_goblin_turn_opens_stat_block_attack_target_hole = {
    assert(openHoles(endTurn(initialState)).contains(TargetChoice))
  }

  run test_goblin_turn_opens_stat_block_recharge_hole_before_attack = {
    val spentRecharge = { ...initialState, goblinRechargeAvailable: false }
    assert(openHoles(endTurn(spentRecharge)) == Set(StatBlockRechargeRoll))
  }

  run test_goblin_recharge_roll_restores_available_part_on_success = {
    val spentRecharge = { ...initialState, goblinRechargeAvailable: false }
    val failed = endTurnWithGoblinRechargeRoll(spentRecharge, 4)
    val succeeded = endTurnWithGoblinRechargeRoll(spentRecharge, 5)
    all {
      assert(not(failed.goblinRechargeAvailable)),
      assert(succeeded.goblinRechargeAvailable),
    }
  }

  run test_legendary_action_window_excludes_initial_and_own_turn = {
    val goblinTurn = endTurn(initialState)
    all {
      assert(not(goblinCanUseLegendaryAction(initialState))),
      assert(not(goblinCanUseLegendaryAction(goblinTurn))),
    }
  }

  run test_legendary_action_window_after_another_non_current_turn = {
    val afterFighterTurnWithThirdActor = endTurn({
      ...initialState,
      initiative: { round: 1, alreadyActed: [], stillToAct: [Fighter, Fighter, Goblin] },
    })
    val spent = useGoblinLegendaryAction(afterFighterTurnWithThirdActor)
    all {
      assert(goblinCanUseLegendaryAction(afterFighterTurnWithThirdActor)),
      assert(spent.goblinLegendaryUsesRemaining == 1),
      assert(not(goblinCanUseLegendaryAction(spent))),
    }
  }

  run test_caller_ordered_initiative_tie_selects_first_supplied_actor = {
    all {
      assert(currentActor(callerOrderedTieInitialState) == Goblin),
      assert(
        endTurn(endTurn(callerOrderedTieInitialState)).initiative.stillToAct == [Goblin, Fighter]
      ),
    }
  }

  run test_goblin_attack_replay_uses_fighter_armor_class = {
    assert(attackReplayHoles(endTurn(initialState), AttackRollFilled({ attackTotal: 19, naturalD20: 10 })) == Set(DamageRoll))
  }

  run test_stat_block_multiattack_spends_one_attack_action_and_grants_dispatches = {
    val goblinTurn = endTurn(initialState)
    val multiattack = resolveGoblinMultiattack(goblinTurn)
    val recursive = resolveGoblinMultiattack(multiattack)
    val firstDispatch = resolveGoblinMultiattackDispatch(multiattack, 1, 1, 0, true)
    val secondDispatch = resolveGoblinMultiattackDispatch(firstDispatch, 1, 1, 0, true)
    val ended = endTurn(multiattack)
    all {
      assert(not(multiattack.actionAvailable)),
      assert(multiattack.goblinMultiattackDispatchesRemaining == 2),
      assert(goblinMultiattackDispatchContinuationOpen(multiattack)),
      assert(recursive.goblinMultiattackDispatchesRemaining == 2),
      assert(firstDispatch.goblinMultiattackDispatchesRemaining == 1),
      assert(secondDispatch.goblinMultiattackDispatchesRemaining == 0),
      assert(not(goblinMultiattackDispatchContinuationOpen(secondDispatch))),
      assert(ended.goblinMultiattackDispatchesRemaining == 0),
    }
  }

  run test_class_feature_extra_attack_spends_one_action_and_grants_one_slot = {
    val first = resolveAttack(withFighterExtraAttack(initialState), 1, 1, fighterWeaponAttackDamageRoll(0), true)
    val second = resolveAttack(first, 1, 1, fighterWeaponAttackDamageRoll(0), true)
    val third = resolveAttack(second, 1, 1, fighterWeaponAttackDamageRoll(0), true)
    all {
      assert(not(first.actionAvailable)),
      assert(first.fighterExtraAttackSlotsRemaining == 1),
      assert(second.fighterExtraAttackSlotsRemaining == 0),
      assert(third == second),
    }
  }

  run test_class_feature_extra_attack_allows_movement_between_slots = {
    val first = resolveAttack(withFighterExtraAttack(initialState), 1, 1, fighterWeaponAttackDamageRoll(0), true)
    val moved = moveFighter(first, 5, false)
    val second = resolveAttack(moved, 1, 1, fighterWeaponAttackDamageRoll(0), true)
    all {
      assert(moved.fighterExtraAttackSlotsRemaining == 1),
      assert(moved.fighter.movementSpent == 5),
      assert(second.fighterExtraAttackSlotsRemaining == 0),
    }
  }

  run test_class_feature_extra_attack_end_turn_closes_unspent_slot = {
    val first = resolveAttack(withFighterExtraAttack(initialState), 1, 1, fighterWeaponAttackDamageRoll(0), true)
    val ended = endTurn(first)
    all {
      assert(first.fighterExtraAttackSlotsRemaining == 1),
      assert(ended.fighterExtraAttackSlotsRemaining == 0),
    }
  }

  run test_attack_miss_spends_action_without_damage = {
    val result = resolveAttack(initialState, 14, 9, fighterWeaponAttackDamageRoll(0), true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 10),
      assert(result.goblin.tempHp == 0),
    }
  }

  run test_attack_hit_applies_damage_and_spends_action = {
    val result = resolveAttack(initialState, 15, 10, fighterWeaponAttackDamageRoll(4), true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 3),
    }
  }

  run test_sneak_attack_optional_rider_applies_once_per_turn = {
    val result = resolveAttackWithOptionalSneakAttack(withFighterSneakAttack(initialState), 15, 10, 4, 6, true, true, false, false, true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 0),
      assert(result.fighterSneakAttackUsedThisTurn),
    }
  }

  run test_sneak_attack_adjacent_ally_branch_requires_no_disadvantage = {
    val eligible = resolveAttackWithOptionalSneakAttack(withFighterSneakAttack(initialState), 15, 10, 4, 6, true, false, true, false, true)
    val disadvantaged = resolveAttackWithOptionalSneakAttack(withFighterSneakAttack(initialState), 15, 10, 4, 6, true, false, true, true, true)
    all {
      assert(eligible.goblin.hp == 0),
      assert(eligible.fighterSneakAttackUsedThisTurn),
      assert(disadvantaged.goblin.hp == 3),
      assert(not(disadvantaged.fighterSneakAttackUsedThisTurn)),
    }
  }

  run test_sneak_attack_critical_uses_doubled_rider_dice_total = {
    val result = resolveAttackWithOptionalSneakAttack(withFighterSneakAttack(initialState), 20, 20, 2, 9, true, true, false, false, true)
    all {
      assert(result.goblin.hp == 0),
      assert(result.fighterSneakAttackUsedThisTurn),
    }
  }

  run test_sneak_attack_usage_resets_on_next_turn = {
    val used = resolveAttackWithOptionalSneakAttack(withFighterSneakAttack(initialState), 15, 10, 4, 6, true, true, false, false, true)
    assert(not(endTurn(used).fighterSneakAttackUsedThisTurn))
  }

  run test_reaction_roll_or_damage_reductions = {
    all {
      assert(not(attackHits(cuttingWordsAttackRollTotal(12, 3), 10, 10, 20))),
      assert(not(abilityCheckSucceeds(cuttingWordsAbilityCheckTotal(15, 3), 14))),
      assert(uncannyDodgeDamage(9) == 4),
      assert(deflectAttacksDamage(8, 2, 3, 3) == 0),
    }
  }

  run test_cutting_words_ability_check_reduction = {
    val converted = cuttingWordsAbilityCheckResolution(15, 14, 3, true, true, true, 1)
    val stillSuccessful = cuttingWordsAbilityCheckResolution(19, 14, 3, true, true, true, 1)
    val preReductionFailure = cuttingWordsAbilityCheckResolution(13, 14, 3, true, true, true, 1)
    all {
      assert(not(abilityCheckSucceeds(cuttingWordsAbilityCheckTotal(15, 3), 14))),
      assert(abilityCheckSucceeds(cuttingWordsAbilityCheckTotal(19, 3), 14)),
      assert(converted.state.fighter.reactionAvailable == false),
      assert(converted.usesRemaining == 0),
      assert(stillSuccessful.state.fighter.reactionAvailable == false),
      assert(stillSuccessful.usesRemaining == 0),
      assert(preReductionFailure.state.fighter.reactionAvailable),
      assert(preReductionFailure.usesRemaining == 1),
    }
  }

  run test_deflect_attacks_zero_damage_redirect = {
    val reduced = deflectAttacksDamage(8, 5, 0, 3)
    val meleeTarget = deflectAttacksRedirectTargetEligible(true, true, true, false, true)
    val rangedBehindTotalCover = deflectAttacksRedirectTargetEligible(true, false, false, true, true)
    all {
      assert(reduced == 0),
      assert(meleeTarget),
      assert(not(rangedBehindTotalCover)),
      assert(deflectAttacksRedirectDamage(reduced, 3, meleeTarget, false, 5, 5, 0) == 10),
      assert(deflectAttacksRedirectFocusRemaining(reduced, 3, meleeTarget) == 2),
      assert(deflectAttacksRedirectDamage(1, 3, meleeTarget, false, 5, 5, 0) == 0),
    }
  }

  run test_off_hand_attack_host_accepts_damage_reduction = {
    val afterAttack = { ...initialState, lightWeaponAttackMade: true }
    val result = offHandAttackFighterWithDamageReduction(afterAttack, 15, 10, 6, 3)
    all {
      assert(result.bonusActionAvailable == false),
      assert(result.goblin.hp == 7),
    }
  }

  run test_opportunity_attack_host_accepts_hit_damage_reduction = {
    val result = resolveGoblinOpportunityAttackWithUncannyDodge(initialState, 20, 18, 6, true)
    all {
      assert(result.fighter.hp == 8),
      assert(result.fighter.movementSpent == 0),
    }
  }

  run test_attack_damage_concentration_interrupt_resolves_before_damage = {
    val concentratingGoblin = { ...initialState, goblin: { ...initialState.goblin, concentrating: true, activeEffects: Set(MageArmor) } }
    val pending = resumeReactionContinuation(concentratingGoblin, ResumeAttack({ damage: 4 }))
    val resolved = resolveAttackDamageConcentration(pending, false)
    all {
      assert(pending.interruptStack.length() == 1),
      assert(pendingReactionFrame(pending.interruptStack[0]) == NoPendingReactionFrame),
      assert(pending.goblin.hp == 10),
      assert(resolved.interruptStack == []),
      assert(resolved.goblin.hp == 6),
      assert(not(resolved.goblin.concentrating)),
    }
  }

  run test_zero_damage_reaction_attack_continuation_does_not_open_concentration_interrupt = {
    val concentratingGoblin = { ...initialState, goblin: { ...initialState.goblin, concentrating: true, activeEffects: Set(MageArmor) } }
    val resolved = resumeReactionContinuation(concentratingGoblin, ResumeAttack({ damage: 0 }))
    all {
      assert(resolved.interruptStack == []),
      assert(resolved.goblin.hp == 10),
      assert(resolved.goblin.concentrating),
    }
  }

  run test_goblin_attack_hit_applies_stat_block_damage_to_fighter = {
    val result = resolveGoblinAttack(endTurn(initialState), 20, 18, 5, true)
    all {
      assert(result.actionAvailable == false),
      assert(result.fighter.hp == 5),
    }
  }

  run test_skeleton_damage_adjustments_apply_vulnerability_and_immunity = {
    all {
      assert(
        damageAfterAdjustments(5, Bludgeoning, Set(), Set(Bludgeoning), Set(Poison)) == 10
      ),
      assert(damageAfterAdjustments(5, Poison, Set(), Set(Bludgeoning), Set(Poison)) == 0),
    }
  }

  run test_same_type_damage_adjustments_apply_resistance_after_combining_parts = {
    assert(
      sameTypeDamageAfterAdjustments([3, 1], Slashing, Set(Slashing), Set(), Set()) == 2
    )
  }

  run test_resistance_spell_reduces_matching_damage_once_per_turn = {
    val protected = { ...initialState, fighter: { ...initialState.fighter, activeEffects: Set(ResistanceDamageReduction({ damageType: Slashing, usedThisTurn: false })) } }
    val reduced = applyResistanceSpellReductionToFighter(protected, Slashing, 4, 3)
    val second = applyResistanceSpellReductionToFighter(reduced, Slashing, 4, 3)
    all {
      assert(reduced.fighter.hp == 11),
      assert(reduced.fighter.activeEffects.contains(ResistanceDamageReduction({ damageType: Slashing, usedThisTurn: true }))),
      assert(second.fighter.hp == 7),
    }
  }

  run test_resistance_spell_ignores_nonmatching_damage_and_resets_next_turn = {
    val protected = { ...initialState, fighter: { ...initialState.fighter, activeEffects: Set(ResistanceDamageReduction({ damageType: Piercing, usedThisTurn: true })) } }
    val nonmatching = applyResistanceSpellReductionToFighter(protected, Slashing, 4, 3)
    val reset = endTurn(endTurn(nonmatching))
    all {
      assert(nonmatching.fighter.hp == 8),
      assert(reset.fighter.activeEffects.contains(ResistanceDamageReduction({ damageType: Piercing, usedThisTurn: false }))),
    }
  }

  run test_action_surge_grants_one_extra_action_and_spends_use = {
    val result = grantActionSurge({ ...initialState, actionAvailable: false }, 1, false)
    all {
      assert(result.state.actionAvailable),
      assert(result.usesRemaining == 0),
      assert(result.usedThisTurn),
      assert(grantActionSurge(result.state, result.usesRemaining, result.usedThisTurn) == result),
    }
  }

  run test_second_wind_spends_bonus_action_use_and_heals = {
    val wounded = { ...initialState, fighter: { ...initialState.fighter, hp: 4 } }
    val result = resolveSecondWind(wounded, 2, 6, 2)
    all {
      assert(result.state.fighter.hp == 12),
      assert(not(result.state.bonusActionAvailable)),
      assert(result.usesRemaining == 1),
    }
  }

  run test_rage_ongoing_feature_spends_bonus_action_applies_damage_and_resistance = {
    val raging = startRage(initialState, 2)
    val hit = resolveAttack({ ...raging.state, actionAvailable: true }, 15, 10, fighterWeaponAttackDamageRoll(4), true)
    val levelNineHit = resolveAttackAtBarbarianLevel({ ...raging.state, actionAvailable: true }, 15, 10, fighterWeaponAttackDamageRoll(4), true, 9)
    val goblinTurn = endTurn(raging.state)
    val resisted = resolveGoblinAttack(goblinTurn, 15, 10, 4, true)
    all {
      assert(raging.usesRemaining == 1),
      assert(not(raging.state.bonusActionAvailable)),
      assert(fighterHasRage(raging.state)),
      assert(hit.goblin.hp == 1),
      assert(levelNineHit.goblin.hp == 0),
      assert(resisted.fighter.hp == 9),
    }
  }

  run test_rage_heavy_armor_and_incapacitated_end = {
    val armored = { ...initialState, fighter: { ...initialState.fighter, wearingHeavyArmor: true } }
    val cannotStart = startRage(armored, 2)
    val raging = startRage(initialState, 2).state
    val incapacitated = { ...raging, fighter: { ...raging.fighter, incapacitated: true } }
    all {
      assert(not(fighterHasRage(cannotStart.state))),
      assert(not(fighterHasRage(endTurn(incapacitated)))),
    }
  }

  run test_rage_bonus_action_extension_preserves_uses = {
    val raging = startRage(initialState, 2)
    val nextFighterTurn = endTurn(endTurn(raging.state))
    val extended = extendRageWithBonusAction(nextFighterTurn, raging.usesRemaining)
    all {
      assert(fighterHasRage(extended.state)),
      assert(not(extended.state.bonusActionAvailable)),
      assert(extended.usesRemaining == 1),
    }
  }

  run test_persistent_rage_survives_incapacitated_but_not_unconscious = {
    val raging = startPersistentRage(initialState, 2).state
    val incapacitated = { ...raging, fighter: { ...raging.fighter, incapacitated: true } }
    val unconscious = { ...raging, fighter: { ...raging.fighter, unconscious: true } }
    all {
      assert(fighterHasRage(endTurn(incapacitated))),
      assert(not(fighterHasRage(endTurn(unconscious)))),
    }
  }

  run test_rage_extends_when_grapple_forces_enemy_save = {
    val raging = startRage(initialState, 2).state
    val nextFighterTurn = endTurn(endTurn(raging))
    val grappled = grappleFighterGoblin(nextFighterTurn, true)
    val extendedToNextTurn = match fighterRageOccurrence(grappled) {
      | ActiveRoundExtendedOngoingFeature(data) =>
          data.expiresAtEndOfFighterTurnRound == nextFighterTurn.initiative.round + 1
      | _ => false
    }
    all {
      assert(fighterHasRage(grappled)),
      assert(extendedToNextTurn),
    }
  }

  run test_rage_breaks_concentration_and_blocks_spells = {
    val concentrating = { ...initialState, fighter: { ...initialState.fighter, concentrating: true, activeEffects: Set(MageArmor) } }
    val raging = startRage(concentrating, 2).state
    all {
      assert(not(raging.fighter.concentrating)),
      assert(not(canDiscoverSpellActs(true, fighterHasRage(raging)))),
      assert(resolveRayOfFrost(raging, 15, 10, 4, true) == raging),
    }
  }

  run test_rage_breaks_readied_spell_hold = {
    val readied = readySpell(initialState)
    val raging = startRage(readied, 2).state
    all {
      assert(not(raging.fighter.concentrating)),
      assert(not(raging.fighterReadiedSpellHeld)),
      assert(releaseReadiedSpell(raging) == raging),
    }
  }

  run test_spell_attack_roll_counts_for_first_attack_roll = {
    val afterSpellAttack = resolveRayOfFrost(initialState, 1, 1, 4, true)
    val recklessAfterSpell = activateRecklessAttackOnFirstAttackRoll(afterSpellAttack)
    all {
      assert(afterSpellAttack.attackRollMadeThisTurn),
      assert(not(fighterHasRecklessAttack(recklessAfterSpell))),
    }
  }

  run test_shield_reaction_spell_interrupts_spell_attack_hit = {
    val awaiting = resolveRayOfFrost(initialState, 15, 10, 4, true)
    val resolved = resolveReaction(awaiting, Goblin)
    all {
      assert(pendingReactionFrame(awaiting.interruptStack[0]) == HasPendingReactionFrame({
        trigger: AttackHit,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeRayOfFrost,
      })),
      assert(resolved.goblin.activeEffects.contains(ShieldArmorClassBonus)),
      assert(not(resolved.goblin.reactionAvailable)),
      assert(resolved.goblin.hp == 10),
      assert(not(resolved.actionAvailable)),
    }
  }

  run test_shield_reaction_spell_negates_magic_missile_damage_to_target = {
    val shielded = applyShieldReactionSpell(initialState, Fighter)
    all {
      assert(magicMissileTargetDamage(initialState.fighter, 3, 3, 1) == 6),
      assert(magicMissileTargetDamage(shielded.fighter, 3, 3, 1) == 0),
      assert(expendedSlotsAfterInvocation(Shield, 0) == 1),
    }
  }

  run test_shield_reaction_spell_spends_turn_spell_slot = {
    val awaiting = openReactionWindow(initialState, {
      trigger: SpellCast,
      eligibleReactors: Set(Fighter),
      offeredReactors: Set(),
      continuation: ResumeRayOfFrost,
    })
    val resolved = resolveReaction(awaiting, Fighter)
    all {
      assert(resolved.fighter.activeEffects.contains(ShieldArmorClassBonus)),
      assert(not(resolved.fighter.reactionAvailable)),
      assert(resolved.spellSlotExpendedThisTurn),
    }
  }

  run test_shield_reaction_spell_rejects_second_slot_spell_in_same_turn = {
    val awaiting = openReactionWindow({ ...initialState, spellSlotExpendedThisTurn: true }, {
      trigger: SpellCast,
      eligibleReactors: Set(Fighter),
      offeredReactors: Set(),
      continuation: ResumeRayOfFrost,
    })
    assert(resolveReaction(awaiting, Fighter) == awaiting)
  }

  run test_normal_rage_ends_when_drop_to_zero_sets_unconscious = {
    val raging = startRage(initialState, 2).state
    val dropped = { ...raging, fighter: applyDropToZeroHp(raging.fighter) }
    assert(not(fighterHasRage(endTurn(dropped))))
  }

  run test_reckless_attack_activates_on_first_attack_roll_boundary = {
    val reckless = resolveAttackRecklessly(initialState, 15, 10, fighterWeaponAttackDamageRoll(4), true)
    val goblinTurn = endTurn(reckless)
    val fighterTurn = endTurn(goblinTurn)
    all {
      assert(fighterHasRecklessAttack(reckless)),
      assert(goblinAttackAgainstFighterHasAdvantage(goblinTurn)),
      assert(not(fighterHasRecklessAttack(fighterTurn))),
    }
  }

  run test_spell_invocation_slot_spend_distinguishes_prepared_spell_from_cantrip = {
    all {
      assert(expendedSlotsAfterInvocation(MagicMissile, 0) == 1),
      assert(expendedSlotsAfterInvocation(RayOfFrost, 0) == 0),
      assert(expendedSlotsAfterInvocation(AcidSplash, 0) == 0),
      assert(expendedSlotsAfterInvocation(PoisonSpray, 0) == 0),
      assert(expendedSlotsAfterInvocation(ChillTouch, 0) == 0),
      assert(expendedSlotsAfterInvocation(StarryWisp, 0) == 0),
      assert(expendedSlotsAfterInvocation(SacredFlame, 0) == 0),
      assert(expendedSlotsAfterInvocation(InflictWounds, 0) == 1),
      assert(expendedSlotsAfterInvocation(BurningHands, 0) == 1),
      assert(expendedSlotsAfterInvocation(ColorSpray, 0) == 1),
      assert(expendedSlotsAfterInvocation(Entangle, 0) == 1),
      assert(expendedSlotsAfterInvocation(HealingWord, 0) == 1),
      assert(expendedSlotsAfterInvocation(CureWounds, 0) == 1),
      assert(expendedSlotsAfterInvocation(MassHealingWord, 0) == 1),
      assert(expendedSlotsAfterInvocation(Heroism, 0) == 1),
      assert(expendedSlotsAfterInvocation(Bane, 0) == 1),
      assert(expendedSlotsAfterInvocation(Bless, 0) == 1),
      assert(expendedSlotsAfterInvocation(Guidance, 0) == 0),
    }
  }

  run test_direct_hit_point_restoration_spends_action_cost_slot_and_heals = {
    val wounded = { ...initialState, fighter: { ...initialState.fighter, hp: 4 } }
    val cure = resolveDirectHitPointRestoration(wounded, CureWoundsRestoration, 1, 7, 3)
    val massWord = resolveDirectHitPointRestoration(wounded, MassHealingWordRestoration, 6, 7, 3)
    all {
      assert(cure.fighter.hp == 12),
      assert(not(cure.actionAvailable)),
      assert(cure.bonusActionAvailable),
      assert(cure.spellSlotExpendedThisTurn),
      assert(massWord.fighter.hp == 12),
      assert(massWord.actionAvailable),
      assert(not(massWord.bonusActionAvailable)),
      assert(massWord.spellSlotExpendedThisTurn),
    }
  }

  run test_direct_hit_point_restoration_rejects_second_slot_spell_in_same_turn = {
    val wounded = { ...initialState, fighter: { ...initialState.fighter, hp: 4 }, spellSlotExpendedThisTurn: true }
    assert(resolveDirectHitPointRestoration(wounded, CureWoundsRestoration, 1, 7, 3) == wounded)
  }

  run test_mass_healing_word_rejects_adjacent_invalid_target_counts = {
    val wounded = { ...initialState, fighter: { ...initialState.fighter, hp: 4 } }
    all {
      assert(resolveDirectHitPointRestoration(wounded, MassHealingWordRestoration, 0, 7, 3) == wounded),
      assert(resolveDirectHitPointRestoration(wounded, MassHealingWordRestoration, 7, 7, 3) == wounded),
    }
  }

  run test_spell_act_discovery_respects_spellcasting_gate = {
    all {
      assert(canDiscoverSpellActs(true, false)),
      assert(not(canDiscoverSpellActs(false, false))),
      assert(not(canDiscoverSpellActs(true, true))),
    }
  }

  run test_spell_invocation_executable_spell_facts = {
    all {
      assert(rollModifierMaximumTargets(BlessRollModifier, 2) == 4),
      assert(rollModifierMaximumTargets(BaneRollModifier, 3) == 5),
      assert(rollModifierMaximumTargets(GuidanceRollModifier, 0) == 1),
      assert(rollModifierRequiresFailedSave(BaneRollModifier)),
      assert(not(rollModifierRequiresFailedSave(BlessRollModifier))),
      assert(rollModifierActiveEffect(BaneRollModifier) == BaneD20RollPenalty),
      assert(rollModifierActiveEffect(BlessRollModifier) == BlessD20RollBonus),
      assert(rollModifierActiveEffect(GuidanceRollModifier) == GuidanceAbilityCheckBonus),
      assert(spellAttackModifier(3, 2) == 5),
      assert(magicMissileDartCount(1) == 3),
      assert(magicMissileDartCount(2) == 4),
      assert(magicMissileAllocatedDamage(3, 3, 1) == 6),
      assert(magicMissileAllocatedDamage(4, 1, 1) == 5),
      assert(rayOfFrostSpeedEffectActive(true, Goblin, Fighter)),
      assert(not(rayOfFrostSpeedEffectActive(true, Fighter, Fighter))),
      assert(spellAttackDamageType(PoisonSpraySpellAttack) == Poison),
      assert(spellAttackDamageType(ChillTouchSpellAttack) == Necrotic),
      assert(spellAttackDamageType(StarryWispSpellAttack) == Radiant),
      assert(spellAttackDamageType(ShockingGraspSpellAttack) == Lightning),
      assert(spellAttackDamageType(GuidingBoltSpellAttack) == Radiant),
      assert(spellAttackDamageType(RayOfSicknessSpellAttack) == Poison),
      assert(spellAttackDamageActiveEffects(RayOfSicknessSpellAttack) == Set(RayOfSicknessPoisoned)),
      assert(spellAttackDamageActiveEffects(StarryWispSpellAttack) == Set()),
      assert(spellAttackDamageSupportsObjectTarget(StarryWispSpellAttack)),
      assert(not(spellAttackDamageSupportsObjectTarget(ChillTouchSpellAttack))),
      assert(spellAttackDamageObjectReplayHoles(StarryWispSpellAttack, true, false, false, false, false) == Set(ObjectTargetChoice)),
      assert(spellAttackDamageObjectReplayHoles(StarryWispSpellAttack, true, true, false, false, false) == Set(AttackRoll)),
      assert(spellAttackDamageObjectReplayHoles(StarryWispSpellAttack, true, true, true, true, false) == Set(SpellDamageRoll)),
      assert(spellAttackDamageObjectReplayHoles(StarryWispSpellAttack, true, true, true, false, false) == Set()),
      assert(spellObjectDamageOutcome(StarryWispSpellAttack, StarryWispObjectTarget, 6, ObjectHitPoints({ hitPoints: 5 })) == ObjectHitPointDamage({
        object: StarryWispObjectTarget,
        damageType: Radiant,
        rolledDamage: 6,
        effectiveDamage: 6,
        priorHitPoints: 5,
        nextHitPoints: 0,
        destroyed: true,
      })),
      assert(spellObjectDamageOutcome(StarryWispSpellAttack, StarryWispObjectTarget, 6, ObjectHitPointsWithDamageThreshold({ hitPoints: 10, damageThreshold: 10 })) == ObjectHitPointDamage({
        object: StarryWispObjectTarget,
        damageType: Radiant,
        rolledDamage: 6,
        effectiveDamage: 0,
        priorHitPoints: 10,
        nextHitPoints: 10,
        destroyed: false,
      })),
      assert(spellAttackDamageActiveEffects(ShockingGraspSpellAttack) == Set(ShockingGraspOpportunityAttackDenied)),
      assert(spellAttackDamageActiveEffects(GuidingBoltSpellAttack) == Set(GuidingBoltNextAttackAdvantage)),
      assert(chainedSpellAttackDamageChoices(ChromaticOrbChainedSpellAttack) == Set(ChromaticOrbAcid, ChromaticOrbCold, ChromaticOrbFire, ChromaticOrbLightning, ChromaticOrbPoison, ChromaticOrbThunder)),
      assert(chainedSpellAttackDamageBaseSpellLevel(ChromaticOrbChainedSpellAttack) == 1),
      assert(chainedSpellAttackDamageDieSize(ChromaticOrbChainedSpellAttack) == 8),
      assert(chainedSpellAttackDamageDice(ChromaticOrbChainedSpellAttack, 1) == 3),
      assert(chainedSpellAttackDamageDice(ChromaticOrbChainedSpellAttack, 3) == 5),
      assert(saveGatedDamageFailedSaveActiveEffects(ViciousMockerySaveGate) == Set(ViciousMockeryNextAttackDisadvantage)),
      assert(saveGatedConditionTargeting(ColorSpraySaveGate) == AreaSaveTargets),
      assert(saveGatedConditionFailedSaveActiveEffects(ColorSpraySaveGate, Fighter) == Set(ColorSprayBlinded)),
      assert(saveGatedConditionTargeting(EntangleSaveGate) == AreaSaveTargets),
      assert(saveGatedConditionFailedSaveActiveEffects(EntangleSaveGate, Fighter) == Set(EntangleRestrained)),
      assert(saveGatedAttackRollAdvantageTargeting(FaerieFireSaveGate) == AreaSaveTargets),
      assert(saveGatedAttackRollAdvantageFailedSaveActiveEffects(FaerieFireSaveGate) == Set(FaerieFireAttackRollAdvantage)),
      assert(saveGatedConditionTargeting(AnimalFriendshipSaveGate) == TargetListSaveTargets({ minTargets: 1, baseSlotLevel: 1, baseTargets: 1, additionalTargetsPerSlotLevel: 1 })),
      assert(saveGatedTargetMaxTargets(saveGatedConditionTargeting(AnimalFriendshipSaveGate), 1) == 1),
      assert(saveGatedTargetMaxTargets(saveGatedConditionTargeting(AnimalFriendshipSaveGate), 2) == 2),
      assert(saveGatedConditionTargetCreatureTypeIsLegal(AnimalFriendshipSaveGate, BeastCreature)),
      assert(not(saveGatedConditionTargetCreatureTypeIsLegal(AnimalFriendshipSaveGate, HumanoidCreature))),
      assert(saveGatedConditionFailedSaveActiveEffects(AnimalFriendshipSaveGate, Fighter) == Set(AnimalFriendshipCharmed({ source: Fighter, durationTicks: 24 * 60 }))),
      assert(saveGatedConditionTargeting(CharmPersonSaveGate) == TargetListSaveTargets({ minTargets: 1, baseSlotLevel: 1, baseTargets: 1, additionalTargetsPerSlotLevel: 1 })),
      assert(saveGatedTargetMaxTargets(saveGatedConditionTargeting(CharmPersonSaveGate), 1) == 1),
      assert(saveGatedTargetMaxTargets(saveGatedConditionTargeting(CharmPersonSaveGate), 2) == 2),
      assert(saveGatedConditionTargetCreatureTypeIsLegal(CharmPersonSaveGate, HumanoidCreature)),
      assert(not(saveGatedConditionTargetCreatureTypeIsLegal(CharmPersonSaveGate, BeastCreature))),
      assert(saveGatedConditionFailedSaveActiveEffects(CharmPersonSaveGate, Fighter) == Set(CharmPersonCharmed({ source: Fighter, durationTicks: charmPersonCharmedDurationTicks }))),
      assert(saveGatedConditionSavingThrowHasAdvantage(CharmPersonSaveGate, true)),
      assert(not(saveGatedConditionSavingThrowHasAdvantage(CharmPersonSaveGate, false))),
      assert(spellAttackRollModeFromActiveEffects(Set(), Set(GuidingBoltNextAttackAdvantage), false) == AdvantageSpellAttackRoll),
      assert(spellAttackRollModeFromActiveEffects(Set(), Set(FaerieFireAttackRollAdvantage), true) == AdvantageSpellAttackRoll),
      assert(spellAttackRollModeFromActiveEffects(Set(), Set(FaerieFireAttackRollAdvantage), false) == NormalSpellAttackRoll),
      assert(spellAttackRollModeFromActiveEffects(Set(ViciousMockeryNextAttackDisadvantage), Set(), true) == DisadvantageSpellAttackRoll),
      assert(spellAttackRollModeFromActiveEffects(Set(ViciousMockeryNextAttackDisadvantage), Set(GuidingBoltNextAttackAdvantage), true) == NormalSpellAttackRoll),
      assert(spellAttackRollModeFromActiveEffects(Set(ViciousMockeryNextAttackDisadvantage), Set(FaerieFireAttackRollAdvantage), true) == NormalSpellAttackRoll),
      assert(spellAttackRollModeFromCreatureTypeScopedActiveEffects(UndeadCreature, Set(), Set(ProtectionFromEvilAndGoodAttackDisadvantage), true) == DisadvantageSpellAttackRoll),
      assert(spellAttackRollModeFromCreatureTypeScopedActiveEffects(UndeadCreature, Set(), Set(GuidingBoltNextAttackAdvantage, ProtectionFromEvilAndGoodAttackDisadvantage), false) == NormalSpellAttackRoll),
      assert(spellAttackRollModeFromCreatureTypeScopedActiveEffects(UndeadCreature, Set(), Set(FaerieFireAttackRollAdvantage, ProtectionFromEvilAndGoodAttackDisadvantage), true) == NormalSpellAttackRoll),
      assert(spellAttackRollModeFromCreatureTypeScopedActiveEffects(UndeadCreature, Set(), Set(FaerieFireAttackRollAdvantage, ProtectionFromEvilAndGoodAttackDisadvantage), false) == DisadvantageSpellAttackRoll),
      assert(spellAttackRollModeFromCreatureTypeScopedActiveEffects(HumanoidCreature, Set(), Set(ProtectionFromEvilAndGoodAttackDisadvantage), true) == NormalSpellAttackRoll),
      assert(saveGatedTargeting(SacredFlameSaveGate) == SingleSaveTarget),
      assert(saveGatedDamageSuccess(SacredFlameSaveGate) == NoDamageOnSaveSuccess),
      assert(saveGatedDamageType(SacredFlameSaveGate) == Radiant),
      assert(saveGatedTargeting(InflictWoundsSaveGate) == SingleSaveTarget),
      assert(saveGatedDamageSuccess(InflictWoundsSaveGate) == HalfDamageOnSaveSuccess),
      assert(saveGatedDamageType(InflictWoundsSaveGate) == Necrotic),
      assert(saveGatedTargeting(BurningHandsSaveGate) == AreaSaveTargets),
      assert(saveGatedDamageSuccess(BurningHandsSaveGate) == HalfDamageOnSaveSuccess),
      assert(saveGatedDamageType(BurningHandsSaveGate) == Fire),
      assert(saveGatedTargeting(ViciousMockerySaveGate) == SingleSaveTarget),
      assert(saveGatedDamageSuccess(ViciousMockerySaveGate) == NoDamageOnSaveSuccess),
      assert(saveGatedDamageType(ViciousMockerySaveGate) == Psychic),
      assert(spellInvocationSpendsLevelOneSlot(IceKnife)),
      assert(spellInvocationSpendsLevelOneSlot(AnimalFriendship)),
      assert(spellInvocationSpendsLevelOneSlot(CharmPerson)),
      assert(spellInvocationSpendsLevelOneSlot(ProtectionFromEvilAndGood)),
      assert(spellInvocationSpendsLevelOneSlot(DivineFavor)),
      assert(spellInvocationSpendsLevelOneSlot(DivineSmite)),
      assert(spellInvocationSpendsLevelOneSlot(HuntersMark)),
      assert(fighterDivineFavorDamage(3, Set(DivineFavorWeaponDamageRider({ durationTicks: 1 }))) == 3),
      assert(fighterDivineFavorDamage(3, Set()) == 0),
      assert(divineSmiteDamageDice(1, HumanoidCreature) == 2),
      assert(divineSmiteDamageDice(1, UndeadCreature) == 3),
      assert(divineSmiteDamageDice(3, FiendCreature) == 5),
      assert(fighterHuntersMarkDamage(4, Set(HuntersMarkDamageRider({ target: Goblin, transferAvailable: false })), Goblin) == 4),
      assert(fighterHuntersMarkDamage(4, Set(HuntersMarkDamageRider({ target: Fighter, transferAvailable: false })), Goblin) == 0),
      assert(resolveRayOfFrostWithDamageRoll({ ...initialState, fighter: { ...initialState.fighter, activeEffects: Set(HuntersMarkDamageRider({ target: Goblin, transferAvailable: false })) }, goblin: { ...initialState.goblin, reactionAvailable: false } }, 15, 10, fighterSpellAttackDamageRollWithHuntersMark(4, 6), true).goblin.hp == 0),
      assert(attackBurstSaveDamageSpendsLevelOneSlot(IceKnifeAttackBurstSaveDamage)),
      assert(attackBurstSaveDamageAttackType(IceKnifeAttackBurstSaveDamage) == Piercing),
      assert(attackBurstSaveDamageBurstType(IceKnifeAttackBurstSaveDamage) == Cold),
    }
  }

  run test_roll_modifier_concentration_effects_end_when_caster_concentration_breaks = {
    val concentrating = {
      ...endTurn(initialState),
      fighter: {
        ...initialState.fighter,
        concentrating: true,
        activeEffects: Set(BaneD20RollPenalty, BlessD20RollBonus, GuidanceAbilityCheckBonus),
      },
      goblin: {
        ...initialState.goblin,
        activeEffects: Set(BaneD20RollPenalty, BlessD20RollBonus, GuidanceAbilityCheckBonus),
      },
    }
    val result = resolveGoblinAttack(concentrating, 20, 18, 5, false)
    all {
      assert(not(result.fighter.concentrating)),
      assert(not(result.fighter.activeEffects.contains(BaneD20RollPenalty))),
      assert(not(result.fighter.activeEffects.contains(BlessD20RollBonus))),
      assert(not(result.fighter.activeEffects.contains(GuidanceAbilityCheckBonus))),
      assert(not(result.goblin.activeEffects.contains(BaneD20RollPenalty))),
      assert(not(result.goblin.activeEffects.contains(BlessD20RollBonus))),
      assert(not(result.goblin.activeEffects.contains(GuidanceAbilityCheckBonus))),
    }
  }

  run test_roll_modifier_concentration_replacement_removes_prior_effects_before_new_effect = {
    val prior = {
      ...initialState,
      fighter: {
        ...initialState.fighter,
        concentrating: true,
        activeEffects: Set(BaneD20RollPenalty, GuidanceAbilityCheckBonus),
      },
      goblin: {
        ...initialState.goblin,
        activeEffects: Set(BaneD20RollPenalty, GuidanceAbilityCheckBonus),
      },
    }
    val result = resolveRollModifierSpell(prior, BlessRollModifier, Set(Goblin), Set(), 1)
    all {
      assert(result.fighter.concentrating),
      assert(not(result.fighter.activeEffects.contains(BaneD20RollPenalty))),
      assert(not(result.fighter.activeEffects.contains(GuidanceAbilityCheckBonus))),
      assert(not(result.fighter.activeEffects.contains(BlessD20RollBonus))),
      assert(not(result.goblin.activeEffects.contains(BaneD20RollPenalty))),
      assert(not(result.goblin.activeEffects.contains(GuidanceAbilityCheckBonus))),
      assert(result.goblin.activeEffects.contains(BlessD20RollBonus)),
    }
  }

  run test_guidance_preserves_existing_spell_slot_expended_turn_guard = {
    val alreadySpent = { ...initialState, spellSlotExpendedThisTurn: true }
    val result = resolveRollModifierSpell(alreadySpent, GuidanceRollModifier, Set(Fighter), Set(), 0)
    all {
      assert(result.fighter.concentrating),
      assert(result.fighter.activeEffects.contains(GuidanceAbilityCheckBonus)),
      assert(result.spellSlotExpendedThisTurn),
    }
  }

  run test_chromatic_orb_chained_replay_facts = {
    val noDuplicateFaces = {
      face1: 1,
      face2: 1,
      face3: 1,
      face4: 0,
      face5: 0,
      face6: 0,
      face7: 0,
      face8: 0,
    }
    val duplicateFaces = {
      face1: 2,
      face2: 0,
      face3: 1,
      face4: 0,
      face5: 0,
      face6: 0,
      face7: 0,
      face8: 0,
    }
    val criticalDuplicateFaces = {
      face1: 2,
      face2: 1,
      face3: 1,
      face4: 1,
      face5: 1,
      face6: 0,
      face7: 0,
      face8: 0,
    }
    val level3DuplicateFaces = {
      face1: 2,
      face2: 1,
      face3: 1,
      face4: 1,
      face5: 0,
      face6: 0,
      face7: 0,
      face8: 0,
    }
    val negativeFaceCount = {
      face1: -1,
      face2: 2,
      face3: 2,
      face4: 0,
      face5: 0,
      face6: 0,
      face7: 0,
      face8: 0,
    }

    all {
      assert(d8FaceCountsMatchRolledDice(ChromaticOrbChainedSpellAttack, 1, false, noDuplicateFaces)),
      assert(d8FaceCountsMatchRolledDice(ChromaticOrbChainedSpellAttack, 1, true, criticalDuplicateFaces)),
      assert(not(d8FaceCountsMatchRolledDice(ChromaticOrbChainedSpellAttack, 0, false, noDuplicateFaces))),
      assert(not(d8FaceCountsMatchRolledDice(ChromaticOrbChainedSpellAttack, 1, false, negativeFaceCount))),
      assert(not(damageRollHasDuplicateD8Face(noDuplicateFaces))),
      assert(damageRollHasDuplicateD8Face(duplicateFaces)),
      assert(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 1, 0, false, duplicateFaces)),
      assert(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 1, 0, true, criticalDuplicateFaces)),
      assert(not(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 1, 1, false, duplicateFaces))),
      assert(not(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 1, -1, false, duplicateFaces))),
      assert(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 3, 2, false, level3DuplicateFaces)),
      assert(not(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 3, 2, false, duplicateFaces))),
      assert(not(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 3, 3, false, level3DuplicateFaces))),
      assert(not(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 3, 0, false, noDuplicateFaces))),
      assert(not(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttack, 3, 0, false, negativeFaceCount))),
      assert(chromaticOrbDamageTypeChoice(ChromaticOrbAcid) == Acid),
      assert(chromaticOrbDamageTypeChoice(ChromaticOrbCold) == Cold),
      assert(chromaticOrbDamageTypeChoice(ChromaticOrbFire) == Fire),
      assert(chromaticOrbDamageTypeChoice(ChromaticOrbLightning) == Lightning),
      assert(chromaticOrbDamageTypeChoice(ChromaticOrbPoison) == Poison),
      assert(chromaticOrbDamageTypeChoice(ChromaticOrbThunder) == Thunder),
      assert(chainedSpellAttackDamageStepDamageType(ChromaticOrbChainedSpellAttack, ChromaticOrbFire, 0) == Fire),
      assert(chainedSpellAttackDamageStepDamageType(ChromaticOrbChainedSpellAttack, ChromaticOrbFire, 2) == Fire),
    }
  }

  run test_chromatic_orb_chained_replay_holes_are_ordered = {
    all {
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsDamageType) == Set(ChainedSpellDamageTypeChoice)),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsInitialTarget({ slotLevel: 1, selectedDamageType: ChromaticOrbLightning })) == Set(ChainedStepTargetChoice({ stepIndex: 0 }))),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsInitialTarget({ slotLevel: 0, selectedDamageType: ChromaticOrbLightning })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsAttackRoll({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbLightning,
        stepIndex: 0,
        target: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 0,
      })) == Set(ChainedStepAttackRoll({ stepIndex: 0 }))),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsAttackRoll({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbLightning,
        stepIndex: 1,
        target: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 0,
      })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsAttackRoll({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbLightning,
        stepIndex: 0,
        target: Fighter,
        targeted: Set(Goblin),
        leapsUsed: 0,
      })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsDamageRoll({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbLightning,
        stepIndex: 0,
        target: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 0,
        criticalHit: false,
      })) == Set(ChainedStepDamageRoll({ stepIndex: 0 }))),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsDamageRoll({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbLightning,
        stepIndex: 0,
        target: Goblin,
        targeted: Set(Goblin),
        leapsUsed: -1,
        criticalHit: false,
      })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsDamageRoll({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbLightning,
        stepIndex: 1,
        target: Goblin,
        targeted: Set(),
        leapsUsed: 1,
        criticalHit: false,
      })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsLeapTarget({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbLightning,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 0,
      })) == Set(ChainedStepTargetChoice({ stepIndex: 1 }))),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsLeapTarget({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbLightning,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 1,
      })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbLightning,
        previousTarget: Fighter,
        targeted: Set(Goblin),
        leapsUsed: 0,
      })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbLightning,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 1,
      })) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, true, ChainedComplete) == Set()),
      assert(chainedSpellAttackDamageReplayHoles(ChromaticOrbChainedSpellAttack, false, ChainedNeedsDamageType) == Set()),
    }
  }

  run test_chromatic_orb_leap_target_invariants = {
    all {
      assert(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsInitialTarget({ slotLevel: 1, selectedDamageType: ChromaticOrbAcid }), Goblin, false)),
      assert(not(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsInitialTarget({ slotLevel: 0, selectedDamageType: ChromaticOrbAcid }), Goblin, false))),
      assert(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbAcid,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 0,
      }), Fighter, true)),
      assert(not(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbAcid,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 0,
      }), Goblin, true))),
      assert(not(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbAcid,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 0,
      }), Fighter, false))),
      assert(not(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsLeapTarget({
        slotLevel: 1,
        selectedDamageType: ChromaticOrbAcid,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 1,
      }), Fighter, true))),
      assert(not(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbAcid,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: -1,
      }), Fighter, true))),
      assert(not(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbAcid,
        previousTarget: Fighter,
        targeted: Set(Goblin),
        leapsUsed: 0,
      }), Fighter, true))),
      assert(not(chainedSpellAttackDamageTargetAllowed(ChromaticOrbChainedSpellAttack, ChainedNeedsLeapTarget({
        slotLevel: 2,
        selectedDamageType: ChromaticOrbAcid,
        previousTarget: Goblin,
        targeted: Set(Goblin),
        leapsUsed: 1,
      }), Fighter, true))),
    }
  }

  run test_acid_splash_replay_asks_for_saving_throw_outcomes_then_damage_on_failure = {
    all {
      assert(acidSplashReplayHoles(true, false, false) == Set(SavingThrowOutcome)),
      assert(acidSplashReplayHoles(true, true, true) == Set(DamageRoll)),
      assert(acidSplashReplayHoles(true, true, false) == Set()),
      assert(acidSplashReplayHoles(false, false, false) == Set()),
    }
  }

  run test_single_target_save_damage_replay_asks_for_target_then_saving_throw_then_damage = {
    all {
      assert(saveGatedDamageReplayHoles(SacredFlameSaveGate, true, false, false, false) == Set(TargetChoice)),
      assert(saveGatedDamageReplayHoles(SacredFlameSaveGate, true, true, false, false) == Set(SavingThrowOutcome)),
      assert(saveGatedDamageReplayHoles(SacredFlameSaveGate, true, true, true, true) == Set(DamageRoll)),
      assert(saveGatedDamageReplayHoles(SacredFlameSaveGate, true, true, true, false) == Set()),
      assert(saveGatedDamageReplayHoles(InflictWoundsSaveGate, true, true, true, true) == Set(DamageRoll)),
      assert(saveGatedDamageReplayHoles(BurningHandsSaveGate, true, true, false, false) == Set(SavingThrowOutcome)),
      assert(saveGatedDamageReplayHoles(BurningHandsSaveGate, true, true, true, true) == Set(DamageRoll)),
      assert(saveGatedConditionReplayHoles(ColorSpraySaveGate, true, true, false) == Set(SavingThrowOutcome)),
      assert(saveGatedConditionReplayHoles(ColorSpraySaveGate, true, true, true) == Set()),
      assert(saveGatedConditionReplayHoles(ColorSpraySaveGate, true, false, true) == Set()),
      assert(saveGatedConditionReplayHoles(EntangleSaveGate, true, true, false) == Set(SavingThrowOutcome)),
      assert(saveGatedConditionReplayHoles(EntangleSaveGate, true, true, true) == Set()),
      assert(saveGatedConditionReplayHoles(CharmPersonSaveGate, true, false, false) == Set(SpellTargetList)),
      assert(saveGatedConditionReplayHoles(CharmPersonSaveGate, true, true, false) == Set(SavingThrowOutcome)),
      assert(saveGatedConditionReplayHoles(CharmPersonSaveGate, true, true, true) == Set()),
      assert(saveGatedAttackRollAdvantageReplayHoles(FaerieFireSaveGate, true, false) == Set(SavingThrowOutcome)),
      assert(saveGatedAttackRollAdvantageReplayHoles(FaerieFireSaveGate, true, true) == Set()),
    }
  }

  run test_ice_knife_replay_asks_for_attack_damage_then_mandatory_burst = {
    all {
      assert(attackBurstSaveDamageReplayHoles(IceKnifeAttackBurstSaveDamage, true, false, false, false, false, false, false) == Set(TargetChoice)),
      assert(attackBurstSaveDamageReplayHoles(IceKnifeAttackBurstSaveDamage, true, true, false, false, false, false, false) == Set(AttackRoll)),
      assert(attackBurstSaveDamageReplayHoles(IceKnifeAttackBurstSaveDamage, true, true, true, true, false, false, false) == Set(DamageRoll)),
      assert(attackBurstSaveDamageReplayHoles(IceKnifeAttackBurstSaveDamage, true, true, true, false, false, false, false) == Set(SavingThrowOutcome)),
      assert(attackBurstSaveDamageReplayHoles(IceKnifeAttackBurstSaveDamage, true, true, true, true, true, false, false) == Set(SavingThrowOutcome)),
      assert(attackBurstSaveDamageReplayHoles(IceKnifeAttackBurstSaveDamage, true, true, true, false, false, true, true) == Set(SpellDamageRoll)),
      assert(attackBurstSaveDamageReplayHoles(IceKnifeAttackBurstSaveDamage, false, false, false, false, false, false, false) == Set()),
    }
  }

  run test_acid_splash_damage_applies_only_to_failed_saving_throw_targets = {
    val result = resolveAcidSplash(initialState, false, true, 4, true, true)
    all {
      assert(result.actionAvailable == false),
      assert(result.fighter.hp == 12),
      assert(result.goblin.hp == 6),
    }
  }

  run test_burning_hands_area_save_damage_halves_success_and_spends_slot = {
    val result = resolveBurningHands(initialState, false, true, 6, true, true)
    all {
      assert(result.actionAvailable == false),
      assert(result.spellSlotExpendedThisTurn == true),
      assert(result.fighter.hp == 6),
      assert(result.goblin.hp == 7),
    }
  }

  run test_burning_hands_empty_area_spends_slot_without_damage = {
    val result = resolveBurningHandsEmptyArea(initialState)
    all {
      assert(result.actionAvailable == false),
      assert(result.spellSlotExpendedThisTurn == true),
      assert(result.fighter.hp == 12),
      assert(result.goblin.hp == 10),
    }
  }

  run test_ice_knife_critical_doubles_only_primary_piercing_attack_damage = {
    val noReaction = { ...initialState, goblin: { ...initialState.goblin, reactionAvailable: false } }
    val result = resolveIceKnife(noReaction, 20, 20, 5, false, false, false, 6, true, true)
    all {
      assert(result.actionAvailable == false),
      assert(result.spellSlotExpendedThisTurn),
      assert(result.attackRollMadeThisTurn),
      assert(result.goblin.hp == 0),
      assert(result.fighter.hp == 12),
    }
  }

  run test_ice_knife_miss_still_resolves_primary_target_burst_save = {
    val failed = resolveIceKnife(initialState, 1, 1, 5, false, false, false, 6, true, true)
    val succeeded = resolveIceKnife(initialState, 1, 1, 5, true, false, false, 6, true, true)
    all {
      assert(failed.actionAvailable == false),
      assert(failed.spellSlotExpendedThisTurn),
      assert(failed.goblin.hp == 4),
      assert(succeeded.actionAvailable == false),
      assert(succeeded.spellSlotExpendedThisTurn),
      assert(succeeded.goblin.hp == 10),
    }
  }

  run test_ice_knife_burst_can_include_caster_but_primary_target_is_always_included = {
    val result = resolveIceKnife(initialState, 1, 1, 5, false, true, false, 6, true, true)
    val casterSucceeded = resolveIceKnife(initialState, 1, 1, 5, false, true, true, 6, true, true)
    all {
      assert(result.goblin.hp == 4),
      assert(result.fighter.hp == 6),
      assert(casterSucceeded.goblin.hp == 4),
      assert(casterSucceeded.fighter.hp == 12),
    }
  }

  run test_ice_knife_combines_attack_and_burst_damage_for_concentration = {
    val concentratingGoblin = { ...initialState, goblin: { ...initialState.goblin, concentrating: true, reactionAvailable: false, activeEffects: Set(MageArmor) } }
    val result = resolveIceKnife(concentratingGoblin, 15, 10, 4, false, false, false, 6, false, true)
    all {
      assert(result.goblin.hp == 0),
      assert(not(result.goblin.concentrating)),
      assert(not(result.goblin.activeEffects.contains(MageArmor))),
    }
  }

  run test_ice_knife_spell_attack_hit_opens_shield_reaction_before_damage = {
    val awaiting = resolveIceKnife(initialState, 15, 10, 4, false, false, false, 6, true, true)
    all {
      assert(pendingReactionFrame(awaiting.interruptStack[0]) == HasPendingReactionFrame({
        trigger: AttackHit,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeIceKnife,
      })),
      assert(awaiting.goblin.hp == 10),
      assert(awaiting.actionAvailable),
      assert(not(awaiting.spellSlotExpendedThisTurn)),
    }
  }

  run test_color_spray_area_save_applies_blinded_and_spends_slot = {
    val result = resolveColorSpray(initialState, false, true)
    all {
      assert(result.actionAvailable == false),
      assert(result.spellSlotExpendedThisTurn == true),
      assert(result.fighter.activeEffects.contains(ColorSprayBlinded)),
      assert(not(result.goblin.activeEffects.contains(ColorSprayBlinded))),
    }
  }

  run test_color_spray_empty_area_spends_slot_without_effect = {
    val result = resolveColorSprayEmptyArea(initialState)
    all {
      assert(result.actionAvailable == false),
      assert(result.spellSlotExpendedThisTurn == true),
      assert(not(result.fighter.activeEffects.contains(ColorSprayBlinded))),
      assert(not(result.goblin.activeEffects.contains(ColorSprayBlinded))),
    }
  }

  run test_faerie_fire_applies_attack_roll_advantage_until_concentration_break = {
    val lit = resolveFaerieFire(initialState, true, false)
    val broken = breakConcentrationSpellEffects(lit, Fighter)
    all {
      assert(lit.actionAvailable == false),
      assert(lit.spellSlotExpendedThisTurn == true),
      assert(lit.fighter.concentrating),
      assert(not(lit.fighter.activeEffects.contains(FaerieFireAttackRollAdvantage))),
      assert(lit.goblin.activeEffects.contains(FaerieFireAttackRollAdvantage)),
      assert(spellAttackRollModeFromActiveEffects(Set(), lit.goblin.activeEffects, true) == AdvantageSpellAttackRoll),
      assert(spellAttackRollModeFromActiveEffects(Set(), lit.goblin.activeEffects, false) == NormalSpellAttackRoll),
      assert(not(broken.goblin.activeEffects.contains(FaerieFireAttackRollAdvantage))),
    }
  }

  run test_entangle_excludes_caster_and_applies_restrained_until_concentration_or_escape = {
    val rejectedCasterArea = resolveEntangle(initialState, true, false)
    val entangled = resolveEntangle(initialState, false, false)
    val broken = breakConcentrationSpellEffects(entangled, Fighter)
    val escaped = escapeEntangle({ ...entangled, initiative: { round: 1, alreadyActed: List(Fighter), stillToAct: List(Goblin) }, actionAvailable: true }, true)
    all {
      assert(not(rejectedCasterArea.goblin.activeEffects.contains(EntangleRestrained))),
      assert(entangled.fighter.concentrating),
      assert(entangled.goblin.activeEffects.contains(EntangleRestrained)),
      assert(not(broken.goblin.activeEffects.contains(EntangleRestrained))),
      assert(not(escaped.goblin.activeEffects.contains(EntangleRestrained))),
    }
  }

  run test_charm_person_target_list_slot_scaling_and_damage_break = {
    val failed = resolveTargetListSaveGatedCondition(
      initialState,
      CharmPersonSaveGate,
      1,
      false,
      HumanoidCreature,
      true,
      true,
      HumanoidCreature,
      false,
    )
    val damaged = resolveAttack({ ...failed, actionAvailable: true }, 15, 10, fighterWeaponAttackDamageRoll(1), true)
    val twoTargets = resolveTargetListSaveGatedCondition(
      initialState,
      CharmPersonSaveGate,
      2,
      true,
      HumanoidCreature,
      false,
      true,
      HumanoidCreature,
      false,
    )
    val illegalTwoTargets = resolveTargetListSaveGatedCondition(
      initialState,
      CharmPersonSaveGate,
      1,
      true,
      HumanoidCreature,
      false,
      true,
      HumanoidCreature,
      false,
    )
    all {
      assert(failed.goblin.activeEffects.contains(CharmPersonCharmed({ source: Fighter, durationTicks: charmPersonCharmedDurationTicks }))),
      assert(not(damaged.goblin.activeEffects.contains(CharmPersonCharmed({ source: Fighter, durationTicks: charmPersonCharmedDurationTicks })))),
      assert(twoTargets.fighter.activeEffects.contains(CharmPersonCharmed({ source: Fighter, durationTicks: charmPersonCharmedDurationTicks }))),
      assert(twoTargets.goblin.activeEffects.contains(CharmPersonCharmed({ source: Fighter, durationTicks: charmPersonCharmedDurationTicks }))),
      assert(illegalTwoTargets == initialState),
    }
  }

  run test_sleep_failed_initial_save_adds_pending_repeat_save_until_concentration = {
    val slept = resolveSleepTargetAdmission(initialState, false)
    val broken = breakConcentrationSpellEffects(slept, Fighter)
    all {
      assert(not(slept.actionAvailable)),
      assert(slept.spellSlotExpendedThisTurn),
      assert(slept.fighter.concentrating),
      assert(slept.goblin.incapacitated),
      assert(slept.goblin.activeEffects.contains(SleepPendingRepeatSave({
        source: Fighter,
        repeatAtActor: Goblin,
        repeatAtRound: 1,
        hadIncapacitated: false,
      }))),
      assert(not(broken.fighter.concentrating)),
      assert(not(broken.goblin.incapacitated)),
      assert(not(sleepRepeatSaveDue(broken.goblin.activeEffects, Goblin, 1))),
    }
  }

  run test_sleep_repeat_save_success_removes_pending_effect = {
    val slept = resolveSleepTargetAdmission(initialState, false)
    val goblinTurn = endTurn(slept)
    val repeated = endTurnWithSleepRepeatSave(goblinTurn, true)
    all {
      assert(sleepRepeatSaveHoles(goblinTurn) == Set(SavingThrowOutcome)),
      assert(not(repeated.goblin.incapacitated)),
      assert(not(sleepRepeatSaveDue(repeated.goblin.activeEffects, Goblin, 1))),
    }
  }

  run test_sleep_failed_initial_save_breaks_target_concentration = {
    val concentratingGoblin = {
      ...initialState,
      goblin: { ...initialState.goblin, concentrating: true, activeEffects: Set(MageArmor) },
    }
    val slept = resolveSleepTargetAdmission(concentratingGoblin, false)
    all {
      assert(not(slept.goblin.concentrating)),
      assert(not(slept.goblin.activeEffects.contains(MageArmor))),
      assert(slept.goblin.activeEffects.contains(SleepPendingRepeatSave({
        source: Fighter,
        repeatAtActor: Goblin,
        repeatAtRound: 1,
        hadIncapacitated: false,
      }))),
    }
  }

  run test_sleep_repeat_save_failure_escalates_to_unconscious_until_concentration = {
    val slept = resolveSleepTargetAdmission(initialState, false)
    val goblinTurn = endTurn(slept)
    val repeated = endTurnWithSleepRepeatSave(goblinTurn, false)
    val broken = breakConcentrationSpellEffects(repeated, Fighter)
    all {
      assert(repeated.goblin.unconscious),
      assert(repeated.goblin.prone),
      assert(not(repeated.goblin.incapacitated)),
      assert(repeated.goblin.activeEffects.contains(SleepUnconscious({
        source: Fighter,
        hadUnconscious: false,
        hadIncapacitated: false,
      }))),
      assert(not(broken.goblin.unconscious)),
      assert(broken.goblin.prone),
      assert(not(broken.goblin.activeEffects.contains(SleepUnconscious({
        source: Fighter,
        hadUnconscious: false,
        hadIncapacitated: false,
      })))),
    }
  }

  run test_sleep_repeat_save_failure_breaks_target_concentration = {
    val slept = resolveSleepTargetAdmission(initialState, false)
    val goblinTurn = endTurn(slept)
    val concentratingGoblinTurn = {
      ...goblinTurn,
      goblin: { ...goblinTurn.goblin, concentrating: true, activeEffects: goblinTurn.goblin.activeEffects.union(Set(MageArmor)) },
    }
    val repeated = endTurnWithSleepRepeatSave(concentratingGoblinTurn, false)
    all {
      assert(not(repeated.goblin.concentrating)),
      assert(not(repeated.goblin.activeEffects.contains(MageArmor))),
      assert(repeated.goblin.activeEffects.contains(SleepUnconscious({
        source: Fighter,
        hadUnconscious: false,
        hadIncapacitated: false,
      }))),
    }
  }

  run test_poison_spray_applies_poison_spell_attack_damage = {
    val noReaction = { ...initialState, goblin: { ...initialState.goblin, reactionAvailable: false } }
    val result = resolvePoisonSpray(noReaction, 15, 10, 7, true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 3),
      assert(not(result.spellSlotExpendedThisTurn)),
    }
  }

  run test_chill_touch_applies_necrotic_spell_attack_damage = {
    val noReaction = { ...initialState, goblin: { ...initialState.goblin, reactionAvailable: false } }
    val result = resolveChillTouch(noReaction, 15, 10, 6, true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 4),
      assert(not(result.spellSlotExpendedThisTurn)),
    }
  }

  run test_sacred_flame_applies_radiant_damage_only_on_failed_saving_throw = {
    val failed = resolveSacredFlame(initialState, false, 7, true)
    val succeeded = resolveSacredFlame(initialState, true, 7, true)
    all {
      assert(failed.actionAvailable == false),
      assert(failed.goblin.hp == 3),
      assert(not(failed.spellSlotExpendedThisTurn)),
      assert(succeeded.actionAvailable == false),
      assert(succeeded.goblin.hp == 10),
      assert(not(succeeded.spellSlotExpendedThisTurn)),
    }
  }

  run test_inflict_wounds_spends_slot_and_halves_damage_on_successful_saving_throw = {
    val failed = resolveInflictWounds(initialState, false, 10, true)
    val succeeded = resolveInflictWounds(initialState, true, 10, true)
    val alreadySpent = { ...initialState, spellSlotExpendedThisTurn: true }
    all {
      assert(failed.actionAvailable == false),
      assert(failed.goblin.hp == 0),
      assert(failed.spellSlotExpendedThisTurn),
      assert(succeeded.actionAvailable == false),
      assert(succeeded.goblin.hp == 5),
      assert(succeeded.spellSlotExpendedThisTurn),
      assert(resolveInflictWounds(alreadySpent, false, 10, true) == alreadySpent),
    }
  }

  run test_evasion_style_save_damage_replacement = {
    all {
      assert(dexHalfSaveDamageAfterReplacement(6, true, true) == 0),
      assert(dexHalfSaveDamageAfterReplacement(6, false, true) == 3),
      assert(dexHalfSaveDamageAfterReplacement(6, true, false) == 3),
      assert(dexHalfSaveDamageAfterReplacement(6, false, false) == 6),
    }
  }

  run test_critical_hit_applies_doubled_damage_dice = {
    val result = resolveAttack(initialState, 20, 20, fighterWeaponAttackDamageRoll(9), true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 0),
    }
  }

  run test_authored_critical_range_19_weapon_attack_crits_on_natural_19 = {
    val result = resolveAttack(withFighterImprovedCriticalRange19(initialState), 1, 19, fighterWeaponAttackDamageRoll(1), true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 6),
    }
  }

  run test_default_critical_range_20_weapon_attack_does_not_crit_on_natural_19 = {
    val result = resolveAttack(initialState, 1, 19, fighterWeaponAttackDamageRoll(9), true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 10),
    }
  }

  run test_authored_critical_range_keeps_natural_1_auto_miss = {
    val result = resolveAttack(withFighterImprovedCriticalRange19(initialState), 99, 1, fighterWeaponAttackDamageRoll(9), true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 10),
    }
  }

  run test_temporary_hp_absorbs_damage_before_hp = {
    val result = resolveAttack(withGoblinHp(initialState, 10, 5), 15, 10, fighterWeaponAttackDamageRoll(4), true)
    all {
      assert(result.goblin.tempHp == 0),
      assert(result.goblin.hp == 8),
    }
  }

  run test_hp_clamps_to_zero_and_monster_dies = {
    val result = resolveAttack(withGoblinHp(initialState, 3, 0), 15, 10, fighterWeaponAttackDamageRoll(8), true)
    all {
      assert(result.goblin.hp == 0),
      assert(result.goblin.lifecycle == DiesAtZeroHp),
    }
  }

  run test_character_drop_to_zero_uses_death_saving_throw_lifecycle = {
    val result = applyDamage(withFighterHp(initialState, 3, 0).fighter, 11, 1, true)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.deathFailures == 0),
      assert(result.lifecycle == UsesDeathSavingThrows),
    }
  }

  run test_melee_knock_out_leaves_stat_block_at_one_hp_unconscious = {
    val result = resolveAttackKnockOut(withGoblinHp(initialState, 3, 0), 15, 10, fighterWeaponAttackDamageRoll(8), true)
    all {
      assert(result.goblin.hp == 1),
      assert(result.goblin.unconscious),
      assert(result.goblin.knockedOut),
      assert(result.goblin.lifecycle == DiesAtZeroHp),
    }
  }

  run test_melee_knock_out_leaves_character_at_one_hp_unconscious = {
    val result = applyDamageWithDisposition(withFighterHp(initialState, 3, 0).fighter, 8, 1, true, KnockOut)
    all {
      assert(result.hp == 1),
      assert(result.unconscious),
      assert(result.knockedOut),
      assert(result.lifecycle == UsesDeathSavingThrows),
      assert(result.deathFailures == 0),
    }
  }

  run test_healing_knock_out_recovery_ends_unconscious = {
    val knockedOut = applyDamageWithDisposition(withFighterHp(initialState, 3, 0).fighter, 8, 1, true, KnockOut)
    val result = applyHealing(knockedOut, 4)
    all {
      assert(result.hp == 5),
      assert(not(result.unconscious)),
      assert(not(result.knockedOut)),
    }
  }

  run test_massive_damage_kills_character_on_drop_to_zero = {
    val result = applyDamage(withFighterHp(initialState, 3, 0).fighter, 19, 2, true)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.deathFailures == 3),
    }
  }

  run test_character_damage_at_zero_adds_one_death_failure = {
    val result = applyDamage(withFighterHp(initialState, 0, 0).fighter, 7, 1, true)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.deathFailures == 1),
    }
  }

  run test_character_critical_damage_at_zero_adds_two_death_failures = {
    val result = applyDamage(withFighterHp(initialState, 0, 0).fighter, 7, 2, true)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.deathFailures == 2),
    }
  }

  run test_massive_damage_at_zero_kills_character = {
    val result = applyDamage(withFighterHp(initialState, 0, 0).fighter, 13, 2, true)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.deathFailures == 3),
    }
  }

  run test_start_turn_death_save_failure_adds_one_failure = {
    val result = endTurnWithDeathSave(withFighterHp(endTurn(initialState), 0, 0), 5)
    all {
      assert(currentActor(result) == Fighter),
      assert(result.fighter.hp == 0),
      assert(result.fighter.unconscious),
      assert(result.fighter.deathFailures == 1),
    }
  }

  run test_start_turn_death_save_success_three_stabilizes = {
    val fighter = { ...withFighterHp(initialState, 0, 0).fighter, unconscious: true, deathSuccesses: 2, deathFailures: 1 }
    val result = endTurnWithDeathSave({ ...endTurn(initialState), fighter: fighter }, 10)
    all {
      assert(result.fighter.hp == 0),
      assert(result.fighter.unconscious),
      assert(result.fighter.stable),
      assert(result.fighter.deathSuccesses == 0),
      assert(result.fighter.deathFailures == 0),
    }
  }

  run test_start_turn_death_save_natural_twenty_restores_one_hp = {
    val fighter = { ...withFighterHp(initialState, 0, 0).fighter, deathSuccesses: 1, deathFailures: 2 }
    val result = endTurnWithDeathSave({ ...endTurn(initialState), fighter: fighter }, 20)
    all {
      assert(result.fighter.hp == 1),
      assert(not(result.fighter.unconscious)),
      assert(not(result.fighter.stable)),
      assert(result.fighter.deathSuccesses == 0),
      assert(result.fighter.deathFailures == 0),
    }
  }

  run test_end_turn_advances_current_actor_and_resets_resources = {
    val result = endTurn({ ...initialState, actionAvailable: false, bonusActionAvailable: false })
    all {
      assert(currentActor(result) == Goblin),
      assert(result.initiative.round == 1),
      assert(result.actionAvailable),
      assert(result.bonusActionAvailable),
    }
  }

  run test_end_turn_wraps_to_next_round = {
    val result = endTurn(endTurn(initialState))
    all {
      assert(currentActor(result) == Fighter),
      assert(result.initiative.round == 2),
      assert(result.initiative.alreadyActed == []),
      assert(result.initiative.stillToAct == [Fighter, Goblin]),
    }
  }

  run test_mage_armor_sets_base_ac_plus_dex = {
    all {
      assert(activeEffectArmorClass(10, 2, Set(MageArmor)) == 15),
      assert(activeEffectArmorClass(10, 2, Set(RayOfFrostSpeedDelta)) == 10),
    }
  }

  run test_scalar_buff_longstrider_targets_selected_creature = {
    val result = resolveScalarBuffSpell(initialState, LongstriderScalarBuff, Set(Goblin), 1, 0)
    all {
      assert(not(result.fighter.activeEffects.contains(LongstriderSpeedDelta))),
      assert(result.goblin.activeEffects.contains(LongstriderSpeedDelta)),
      assert(movementSpeed(result.goblin, WalkSpeedKind) == 40),
    }
  }

  run test_scalar_buff_shield_of_faith_targets_selected_creature_and_uses_concentration = {
    val result = resolveScalarBuffSpell(initialState, ShieldOfFaithScalarBuff, Set(Goblin), 1, 0)
    all {
      assert(result.fighter.concentrating),
      assert(not(result.fighter.activeEffects.contains(ShieldOfFaithArmorClassBonus))),
      assert(result.goblin.activeEffects.contains(ShieldOfFaithArmorClassBonus)),
      assert(combatantArmorClass(result.goblin) == 17),
    }
  }

  run test_heroism_stores_distinct_immunity_and_turn_start_temporary_hit_points = {
    val result = resolveHeroismSpell(initialState, Set(Fighter), 1, 3)
    all {
      assert(result.fighter.concentrating),
      assert(result.fighter.activeEffects.contains(HeroismFrightenedImmunity)),
      assert(result.fighter.activeEffects.contains(HeroismTurnStartTemporaryHitPoints({ amount: 3 }))),
      assert(result.fighter.tempHp == 0),
      assert(endTurn(endTurn(result)).fighter.tempHp == 3),
    }
  }

  run test_heroism_slot_level_controls_target_count_and_concentration_cleanup = {
    val hostile = resolveHeroismSpell(initialState, Set(Goblin), 1, 3)
    val invalidCount = resolveHeroismSpell(initialState, Set(Fighter, Goblin), 1, 3)
    val invalidWilling = resolveHeroismSpell(initialState, Set(Fighter, Goblin), 2, 3)
    val valid = resolveHeroismSpell(initialState, Set(Fighter), 1, 3)
    val broken = breakConcentration({ ...valid.fighter, activeEffects: valid.fighter.activeEffects.union(Set(HeroismTurnStartTemporaryHitPoints({ amount: 5 }))) })
    all {
      assert(hostile == initialState),
      assert(invalidCount == initialState),
      assert(invalidWilling == initialState),
      assert(valid.fighter.activeEffects.contains(HeroismFrightenedImmunity)),
      assert(valid.fighter.activeEffects.contains(HeroismTurnStartTemporaryHitPoints({ amount: 3 }))),
      assert(not(broken.activeEffects.contains(HeroismFrightenedImmunity))),
      assert(not(broken.activeEffects.exists(effect => match effect {
        | HeroismTurnStartTemporaryHitPoints(_) => true
        | _ => false
      }))),
    }
  }

  run test_divine_favor_adds_radiant_damage_to_fighter_weapon_hits = {
    val favored = resolveDivineFavor(initialState)
    val hit = resolveAttack(favored, 15, 10, fighterWeaponAttackDamageRollWithDivineFavor(4, 3), true)
    all {
      assert(favored.fighter.activeEffects.contains(DivineFavorWeaponDamageRider({ durationTicks: favorWeaponDamageRiderDurationTicks }))),
      assert(not(favored.bonusActionAvailable)),
      assert(favored.spellSlotExpendedThisTurn),
      assert(hit.goblin.hp == 0),
    }
  }

  run test_divine_favor_weapon_damage_rider_expires_after_one_minute = {
    val favored = resolveDivineFavor(initialState)
    val round1 = endTurn(endTurn(favored))
    val round2 = endTurn(endTurn(round1))
    val round3 = endTurn(endTurn(round2))
    val round4 = endTurn(endTurn(round3))
    val round5 = endTurn(endTurn(round4))
    val round6 = endTurn(endTurn(round5))
    val round7 = endTurn(endTurn(round6))
    val round8 = endTurn(endTurn(round7))
    val round9 = endTurn(endTurn(round8))
    val round10 = endTurn(endTurn(round9))
    val hit = resolveAttack(round10, 15, 10, fighterWeaponAttackDamageRollWithDivineFavor(4, 3), true)
    all {
      assert(activeEffectsContainDivineFavor(round9.fighter.activeEffects)),
      assert(not(activeEffectsContainDivineFavor(round10.fighter.activeEffects))),
      assert(hit.goblin.hp == 3),
    }
  }

  run test_divine_smite_after_hit_spends_bonus_action_and_slot_without_base_attack_replay = {
    val smote = resolveDivineSmiteAfterMeleeHit(initialState, 1, 5, HumanoidCreature, false, true)
    val alreadySpent = resolveDivineSmiteAfterMeleeHit({ ...initialState, spellSlotExpendedThisTurn: true }, 1, 5, HumanoidCreature, false, true)
    val critical = resolveDivineSmiteAfterMeleeHit(initialState, 1, 5, HumanoidCreature, true, true)
    all {
      assert(smote.goblin.hp == 5),
      assert(not(smote.bonusActionAvailable)),
      assert(smote.spellSlotExpendedThisTurn),
      assert(alreadySpent.goblin.hp == initialState.goblin.hp),
      assert(critical.goblin.hp == 0),
    }
  }

  run test_ensnaring_strike_after_weapon_hit_restrains_damages_and_escapes = {
    val ensnared = resolveEnsnaringStrikeAfterWeaponHit(initialState, 1, false)
    val damaged = endTurnWithEnsnaringStrikeDamage(ensnared, 4, true)
    val escaped = escapeEnsnaringStrike(damaged, true, false)
    val helperTurn = endTurn(damaged)
    val helperWithoutReach = escapeEnsnaringStrike(helperTurn, true, false)
    val helperEscaped = escapeEnsnaringStrike(helperTurn, true, true)
    val saveSucceeded = resolveEnsnaringStrikeAfterWeaponHit(initialState, 1, true)
    all {
      assert(ensnared.goblin.activeEffects.contains(EnsnaringStrikeRestrained({ damageDice: 1 }))),
      assert(ensnared.fighter.concentrating),
      assert(not(ensnared.bonusActionAvailable)),
      assert(ensnared.spellSlotExpendedThisTurn),
      assert(damaged.goblin.hp == initialState.goblin.hp - 4),
      assert(not(escaped.goblin.activeEffects.contains(EnsnaringStrikeRestrained({ damageDice: 1 })))),
      assert(not(escaped.fighter.concentrating)),
      assert(helperWithoutReach.goblin.activeEffects.contains(EnsnaringStrikeRestrained({ damageDice: 1 }))),
      assert(not(helperEscaped.goblin.activeEffects.contains(EnsnaringStrikeRestrained({ damageDice: 1 })))),
      assert(not(helperEscaped.fighter.concentrating)),
      assert(not(saveSucceeded.fighter.concentrating)),
      assert(not(activeEffectsContainEnsnaringStrike(saveSucceeded.goblin.activeEffects))),
      assert(ensnaringStrikeTargetHasSaveAdvantage(Large)),
      assert(not(ensnaringStrikeTargetHasSaveAdvantage(Medium))),
      assert(ensnaringStrikeDamageDiceForSlot(3) == 3),
    }
  }

  run test_searing_smite_after_hit_burns_and_constitution_save_ends = {
    val seared = resolveSearingSmiteAfterMeleeHit(initialState, 3, 6, false, true)
    val stillBurning = endTurnWithSearingSmiteDamageAndSave(seared, 9, false, true)
    val ended = endTurnWithSearingSmiteDamageAndSave(seared, 9, true, true)
    all {
      assert(seared.goblin.hp == initialState.goblin.hp - 6),
      assert(seared.goblin.activeEffects.contains(SearingSmiteBurning({ damageDice: 3, durationTicks: searingSmiteDurationTicks }))),
      assert(not(seared.bonusActionAvailable)),
      assert(seared.spellSlotExpendedThisTurn),
      assert(stillBurning.goblin.hp == 0),
      assert(activeEffectsContainSearingSmite(stillBurning.goblin.activeEffects)),
      assert(ended.goblin.hp == 0),
      assert(not(activeEffectsContainSearingSmite(ended.goblin.activeEffects))),
      assert(searingSmiteDamageDiceForSlot(3) == 3),
    }
  }

  run test_searing_smite_burn_expires_after_duration_tick = {
    val burning = {
      ...initialState,
      goblin: {
        ...initialState.goblin,
        activeEffects: Set(SearingSmiteBurning({ damageDice: 1, durationTicks: 1 })),
      },
    }
    val stillSameRound = endTurn(burning)
    val nextRound = endTurn(stillSameRound)
    all {
      assert(activeEffectsContainSearingSmite(stillSameRound.goblin.activeEffects)),
      assert(not(activeEffectsContainSearingSmite(nextRound.goblin.activeEffects))),
    }
  }

  run test_true_strike_weapon_attack_uses_spellcasting_ability_and_cantrip_scaling = {
    val hit = resolveTrueStrikeWeaponAttack(
      { ...initialState, goblin: { ...initialState.goblin, reactionAvailable: false } },
      15,
      10,
      4,
      5,
      3,
      5,
      Radiant,
      Slashing,
      true,
    )
    all {
      assert(hit.goblin.hp == 0),
      assert(not(hit.actionAvailable)),
      assert(not(hit.spellSlotExpendedThisTurn)),
      assert(spellInvocationSpendsLevelOneSlot(TrueStrike) == false),
      assert(trueStrikeWeaponAttackModifier(3, 3) == 6),
      assert(trueStrikeDamageAfterAdjustments(4, 5, 3, 5, Radiant) == 12),
    }
  }

  run test_true_strike_damage_choice_and_bonus_dice_are_level_gated = {
    all {
      assert(trueStrikeDamageTypeChoiceIsLegal(Radiant, Slashing)),
      assert(trueStrikeDamageTypeChoiceIsLegal(Slashing, Slashing)),
      assert(not(trueStrikeDamageTypeChoiceIsLegal(Fire, Slashing))),
      assert(trueStrikeBonusDamageDice(1) == 0),
      assert(trueStrikeBonusDamageDice(5) == 1),
      assert(trueStrikeBonusDamageDice(11) == 2),
      assert(trueStrikeBonusDamageDice(17) == 3),
    }
  }

  run test_produce_flame_held_light_spends_bonus_action_and_records_light = {
    val result = resolveProduceFlameHeldLight(initialState)
    all {
      assert(result.fighter.activeEffects.contains(ProduceFlameHeldLight({ durationTicks: produceFlameDurationTicks }))),
      assert(not(result.bonusActionAvailable)),
      assert(result.actionAvailable),
      assert(not(result.spellSlotExpendedThisTurn)),
      assert(produceFlameBrightLightRadiusFeet == 20),
      assert(produceFlameDimLightAdditionalFeet == 20),
    }
  }

  run test_produce_flame_held_light_recast_keeps_one_flame = {
    val once = resolveProduceFlameHeldLight(initialState)
    val nextTurn = { ...once, bonusActionAvailable: true }
    val recast = resolveProduceFlameHeldLight(nextTurn)
    all {
      assert(recast.fighter.activeEffects.contains(ProduceFlameHeldLight({ durationTicks: produceFlameDurationTicks }))),
      assert(recast.fighter.activeEffects.size() == 1),
    }
  }

  run test_produce_flame_held_light_expires_after_duration_tick = {
    val nearlyExpired = {
      ...resolveProduceFlameHeldLight(initialState),
      fighter: {
        ...initialState.fighter,
        activeEffects: Set(ProduceFlameHeldLight({ durationTicks: 1 })),
      },
    }
    val stillSameRound = endTurn(nearlyExpired)
    val nextRound = endTurn(stillSameRound)
    all {
      assert(activeEffectsContainProduceFlameHeldLight(stillSameRound.fighter.activeEffects)),
      assert(not(activeEffectsContainProduceFlameHeldLight(nextRound.fighter.activeEffects))),
    }
  }

  run test_produce_flame_hurl_requires_held_light_and_deals_fire_damage = {
    val unlit = resolveProduceFlameHurl(initialState, 15, 10, 5, true)
    val lit = resolveProduceFlameHeldLight(initialState)
    val nextTurn = {
      ...lit,
      actionAvailable: true,
      bonusActionAvailable: true,
      goblin: { ...lit.goblin, reactionAvailable: false },
    }
    val hit = resolveProduceFlameHurl(nextTurn, 15, 10, 5, true)
    all {
      assert(unlit == initialState),
      assert(hit.goblin.hp == 5),
      assert(not(hit.actionAvailable)),
      assert(activeEffectsContainProduceFlameHeldLight(hit.fighter.activeEffects)),
      assert(spellAttackDamageType(ProduceFlameHurlSpellAttack) == Fire),
      assert(spellAttackDamageActiveEffects(ProduceFlameHurlSpellAttack) == Set()),
    }
  }

  run test_produce_flame_hurl_cantrip_damage_dice_scale_by_character_level = {
    all {
      assert(produceFlameHurlDamageDice(1) == 1),
      assert(produceFlameHurlDamageDice(5) == 2),
      assert(produceFlameHurlDamageDice(11) == 3),
      assert(produceFlameHurlDamageDice(17) == 4),
    }
  }

  run test_scalar_buff_shield_of_faith_ends_when_caster_concentration_breaks = {
    val concentrating = {
      ...endTurn(initialState),
      fighter: { ...initialState.fighter, concentrating: true },
      goblin: { ...initialState.goblin, activeEffects: Set(ShieldOfFaithArmorClassBonus) },
    }
    val result = resolveGoblinAttack(concentrating, 20, 18, 5, false)
    all {
      assert(not(result.fighter.concentrating)),
      assert(not(result.goblin.activeEffects.contains(ShieldOfFaithArmorClassBonus))),
    }
  }

  run test_concentration_damage_dc_is_capped = {
    all {
      assert(concentrationSavingThrowDc(24) == 12),
      assert(concentrationSavingThrowDc(80) == 30),
    }
  }

  run test_concentration_breaks_on_failed_damage_save = {
    val concentrating = { ...initialState.fighter, concentrating: true, activeEffects: Set(MageArmor) }
    val result = applyDamage(concentrating, 5, 1, false)
    all {
      assert(not(result.concentrating)),
      assert(result.activeEffects == Set()),
    }
  }

  run test_attack_action_can_break_target_concentration = {
    val concentratingGoblin = { ...initialState, goblin: { ...initialState.goblin, concentrating: true, activeEffects: Set(MageArmor) } }
    val result = resolveAttack(concentratingGoblin, 15, 10, fighterWeaponAttackDamageRoll(4), false)
    all {
      assert(result.goblin.hp == 3),
      assert(not(result.goblin.concentrating)),
      assert(result.goblin.activeEffects == Set()),
    }
  }

  run test_goblin_attack_action_can_break_target_concentration = {
    val concentratingFighter = { ...endTurn(initialState), fighter: { ...initialState.fighter, concentrating: true, activeEffects: Set(MageArmor) } }
    val result = resolveGoblinAttack(concentratingFighter, 20, 18, 5, false)
    all {
      assert(result.fighter.hp == 5),
      assert(not(result.fighter.concentrating)),
      assert(result.fighter.activeEffects == Set()),
    }
  }

  run test_acid_splash_damage_can_break_target_concentration = {
    val concentratingGoblin = { ...initialState, goblin: { ...initialState.goblin, concentrating: true, activeEffects: Set(MageArmor) } }
    val result = resolveAcidSplash(concentratingGoblin, false, true, 4, true, false)
    all {
      assert(result.goblin.hp == 6),
      assert(not(result.goblin.concentrating)),
      assert(result.goblin.activeEffects == Set()),
    }
  }

  run test_readied_spell_uses_concentration_until_release_or_next_turn = {
    val readied = readySpell(initialState)
    val released = releaseReadiedSpell(readied)
    val expired = endTurn(endTurn(readied))
    all {
      assert(readied.fighter.concentrating),
      assert(readied.fighterReadiedSpellHeld),
      assert(not(released.fighter.concentrating)),
      assert(not(released.fighterReadiedSpellHeld)),
      assert(not(expired.fighterReadiedSpellHeld)),
    }
  }

  run test_movement_spends_budget = {
    val moved = moveFighter(initialState, 10, 4 > 5)
    all {
      assert(moved.fighter.movementSpent == 10),
      assert(movementRemaining(moved.fighter) == 20),
    }
  }

  run test_roving_speed_kind_movement_and_dash_use_chosen_speed = {
    val roving = {
      ...initialState,
      fighter: {
        ...initialState.fighter,
        speed: 40,
        hasRovingSpeedKindGrants: true,
      },
    }
    val climbed = moveFighterWithSpeedKind(roving, ClimbSpeedKind, 15, false)
    val swam = moveFighterWithSpeedKind(climbed, SwimSpeedKind, 25, false)
    val dashed = dashFighterWithSpeedKind(roving, SwimSpeedKind)
    val unsupportedClimb = moveFighterWithSpeedKind(initialState, ClimbSpeedKind, 1, false)
    all {
      assert(movementSpeed(roving.fighter, ClimbSpeedKind) == 40),
      assert(climbed.fighter.movementSpent == 15),
      assert(movementRemainingForFighterWithSpeedKind(climbed, SwimSpeedKind) == 25),
      assert(swam.fighter.movementSpent == 40),
      assert(dashed.dashMovementBonus == 40),
      assert(unsupportedClimb == initialState),
    }
  }

  run test_generic_combat_actions_update_turn_state = {
    val dashed = dashFighter(initialState)
    val disengaged = disengageFighter(initialState)
    val dodged = dodgeFighter(initialState)
    val readied = readyFighter(initialState)
    val helped = helpFighterAttack(initialState)
    all {
      assert(not(dashed.actionAvailable)),
      assert(dashed.dashMovementBonus == 30),
      assert(movementRemainingForFighter(dashed) == 60),
      assert(disengaged.disengaged),
      assert(dodged.fighter.dodging),
      assert(readied.fighterReadiedMovementHeld),
      assert(helped.fighterHelpAttackGoblinForGoblin),
    }
  }

  run test_adrenaline_rush_bonus_action_dash_grants_temporary_hit_points_and_spends_use = {
    val result = bonusActionDashTemporaryHitPointsFighter(
      { ...initialState, fighter: { ...initialState.fighter, tempHp: 1 } },
      3,
      3,
      WalkSpeedKind
    )
    val higherExisting = bonusActionDashTemporaryHitPointsFighter(
      { ...initialState, fighter: { ...initialState.fighter, tempHp: 5 } },
      3,
      3,
      WalkSpeedKind
    )
    val noUses = bonusActionDashTemporaryHitPointsFighter(initialState, 0, 3, WalkSpeedKind)
    all {
      assert(not(result.state.bonusActionAvailable)),
      assert(result.state.dashMovementBonus == 30),
      assert(result.state.fighter.tempHp == 3),
      assert(result.usesRemaining == 2),
      assert(higherExisting.state.fighter.tempHp == 5),
      assert(noUses.state == initialState),
      assert(noUses.usesRemaining == 0),
    }
  }

  run test_stand_from_prone_spends_half_speed_movement = {
    val prone = { ...initialState, fighter: { ...initialState.fighter, prone: true } }
    val stood = standFighterFromProne(prone)
    all {
      assert(stood.fighter.movementSpent == 15),
      assert(not(stood.fighter.prone)),
      assert(movementRemainingForFighter(stood) == 15),
    }
  }

  run test_disengage_suppresses_opportunity_attack_window = {
    val disengaged = disengageFighter({ ...initialState, actionAvailable: true })
    val moved = moveFighter(disengaged, 5, 10 > 5)
    all {
      assert(moved.interruptStack == []),
      assert(moved.fighter.movementSpent == 5),
    }
  }

  run test_movement_over_budget_is_rejected = {
    assert(moveFighter(initialState, 35, 40 > 5) == initialState)
  }

  run test_grapple_release_and_escape_update_link_state = {
    val grappled = grappleFighterGoblin(initialState, true)
    val released = releaseFighterGrapple(grappled)
    val escaped = escapeFighterGrapple(endTurn(grappled), true)
    all {
      assert(fighterGoblinGrappleExists(grappled)),
      assert(grappled.fighter.leftHandUse == HGrapple),
      assert(not(fighterGoblinGrappleExists(released))),
      assert(not(fighterGoblinGrappleExists(escaped))),
    }
  }

  run test_off_hand_requires_prior_light_attack_and_spends_bonus_action = {
    val rejected = offHandAttackFighter(initialState, 15, 10, 4)
    val afterAttack = resolveAttack(initialState, 1, 1, fighterWeaponAttackDamageRoll(4), false)
    val offHand = offHandAttackFighter(afterAttack, 15, 10, 4)
    all {
      assert(rejected == initialState),
      assert(afterAttack.lightWeaponAttackMade),
      assert(not(offHand.bonusActionAvailable)),
      assert(offHand.goblin.hp == 6),
    }
  }

  run test_grappled_attack_disadvantage_excludes_the_grappler = {
    val grappled = endTurn(grappleFighterGoblin(initialState, true))
    all {
      assert(not(goblinAttackRequiresDisadvantage(grappled, true))),
      assert(goblinAttackRequiresDisadvantage(grappled, false)),
    }
  }

  run test_grapple_drag_cost_is_table_supplied = {
    val grappled = grappleFighterGoblin(initialState, true)
    val oneFootCost = moveFighter(grappled, 1, false)
    val tenFootCost = moveFighter(grappled, 10, false)
    all {
      assert(oneFootCost.fighter.movementSpent == 1),
      assert(tenFootCost.fighter.movementSpent == 10),
    }
  }

  run test_movement_leaving_reach_opens_opportunity_attack_window_before_position_commit = {
    val awaiting = moveFighter(initialState, 5, 10 > 5)
    all {
      assert(awaiting.fighter.movementSpent == 0),
      assert(awaiting.interruptStack.length() == 1),
      assert(pendingReactionFrame(awaiting.interruptStack[0]) == HasPendingReactionFrame({
        trigger: OpportunityAttack,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeMovement({ speedKind: WalkSpeedKind, movementCost: 5 }),
      })),
    }
  }

  run test_declined_opportunity_attack_resumes_movement = {
    val awaiting = moveFighter(initialState, 5, 10 > 5)
    val resumed = declineReactionAndResume(awaiting, Goblin)
    all {
      assert(resumed.interruptStack == []),
      assert(resumed.fighter.movementSpent == 5),
      assert(resumed.goblin.reactionAvailable),
    }
  }

  run test_resolved_opportunity_attack_spends_reaction_damages_then_resumes_movement = {
    val awaiting = moveFighter(initialState, 5, 10 > 5)
    val resolved = resolveReaction(awaiting, Goblin)
    all {
      assert(resolved.interruptStack == []),
      assert(resolved.goblin.reactionAvailable == false),
      assert(resolved.fighter.hp == 6),
      assert(resolved.fighter.movementSpent == 5),
    }
  }

  run test_goblin_opportunity_attack_can_knock_out = {
    val result = resolveGoblinOpportunityAttackWithDisposition(withFighterHp(initialState, 3, 0), 20, 18, 1, true, KnockOut)
    all {
      assert(result.fighter.hp == 1),
      assert(result.fighter.unconscious),
    }
  }

  run test_resolved_reaction_releases_readied_spell_and_resumes_attack_continuation = {
    val readied = { ...readySpell(initialState), actionAvailable: true }
    val awaitingReaction = openReactionWindow(readied, {
      trigger: AttackHit,
      eligibleReactors: Set(Fighter),
      offeredReactors: Set(),
      continuation: ResumeAttack({ damage: 7 }),
    })
    val resolved = resolveReaction(awaitingReaction, Fighter)
    all {
      assert(not(resolved.fighterReadiedSpellHeld)),
      assert(not(resolved.fighter.concentrating)),
      assert(not(resolved.fighter.reactionAvailable)),
      assert(resolved.goblin.hp == 3),
      assert(not(resolved.actionAvailable)),
      assert(resolved.interruptStack == []),
    }
  }
}
