// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.REACTION_CASTING_TIME
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE

module battleRuntimeSpellInvocation {
  import battleRuntimeFeatureBridge.* from "./battle-runtime-feature-bridge"
  import battleRuntimeSpellBridge.* from "./battle-runtime-spell-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import spellInvocationResourceCore.* from "../shared-algebras/proofs/rule-core/spell-invocation-resource-core"

  pure def battleTurnSpellSlotUseActor(slotUse: BattleTurnSpellSlotUse): Actor =
    match slotUse {
      | BattlePendingSpellSlotUse(actor) => actor
      | BattleCommittedSpellSlotUse(actor) => actor
    }

  pure def battleActorHasSpellSlotUse(state: BattleState, actor: Actor): bool =
    state.spellSlotUsesThisTurn.exists(slotUse => battleTurnSpellSlotUseActor(slotUse) == actor)

  pure def battleActorHasCommittedSpellSlotUse(state: BattleState, actor: Actor): bool =
    state.spellSlotUsesThisTurn.contains(BattleCommittedSpellSlotUse(actor))

  pure def canActorExpendSpellSlotThisTurn(state: BattleState, actor: Actor): bool =
    not(battleActorHasSpellSlotUse(state, actor))

  pure def battleActorHasCastLevelOnePlusSpellThisTurn(state: BattleState, actor: Actor): bool =
    state.levelOnePlusSpellCastsThisTurn.contains(actor)

  pure def battleActorHasQuickenedLevelOnePlusSpellThisTurn(state: BattleState, actor: Actor): bool =
    state.quickenedLevelOnePlusSpellCastsThisTurn.contains(actor)

  pure def commitActorLevelOnePlusSpellCast(state: BattleState, actor: Actor): BattleState =
    if (battleActorHasCastLevelOnePlusSpellThisTurn(state, actor))
      state
    else
      { ...state, levelOnePlusSpellCastsThisTurn: state.levelOnePlusSpellCastsThisTurn.union(Set(actor)) }

  pure def commitActorQuickenedLevelOnePlusSpellCast(state: BattleState, actor: Actor): BattleState =
    if (battleActorHasQuickenedLevelOnePlusSpellThisTurn(state, actor))
      state
    else
      { ...state, quickenedLevelOnePlusSpellCastsThisTurn: state.quickenedLevelOnePlusSpellCastsThisTurn.union(Set(actor)) }

  pure def claimPendingActorSpellSlotUse(state: BattleState, actor: Actor): BattleState =
    if (battleActorHasSpellSlotUse(state, actor))
      state
    else
      { ...state, spellSlotUsesThisTurn: state.spellSlotUsesThisTurn.union(Set(BattlePendingSpellSlotUse(actor))) }

  pure def releasePendingActorSpellSlotUse(state: BattleState, actor: Actor): BattleState =
    { ...state, spellSlotUsesThisTurn: state.spellSlotUsesThisTurn.filter(slotUse => slotUse != BattlePendingSpellSlotUse(actor)) }

  pure def commitActorSpellSlotUse(state: BattleState, actor: Actor): BattleState =
    if (battleActorHasCommittedSpellSlotUse(state, actor))
      state
    else {
      val released = releasePendingActorSpellSlotUse(state, actor)
      commitActorLevelOnePlusSpellCast({
        ...released,
        spellSlotUsesThisTurn: released.spellSlotUsesThisTurn.union(Set(BattleCommittedSpellSlotUse(actor))),
      }, actor)
    }

  pure def expendedSlotsAfterInvocation(
    invocation: SpellInvocation,
    expendedSpellSlots: int,
  ): int =
    if (spellInvocationSpendsSpellSlot(invocation))
      expendedSpellSlots + 1
    else
      expendedSpellSlots

  pure def expendedSlotsAfterSpellInvocationResource(
    facts: SpellInvocationResourceFacts,
    expendedSpellSlots: int,
  ): int =
    if (spellInvocationResourceRequiresSlot(facts))
      expendedSpellSlots + 1
    else
      expendedSpellSlots

  pure def spellInvocationSpendsSpellSlot(invocation: SpellInvocation): bool =
    match invocation {
      | RayOfFrost => false
      | AcidSplash => false
      | PoisonSpray => false
      | ChillTouch => false
      | StarryWisp => false
      | FireBolt => false
      | EldritchBlast => false
      | ScorchingRay => true
      | SacredFlame => false
      | InflictWounds => true
      | BurningHands => true
      | Fireball => true
      | ColorSpray => true
      | Entangle => true
      | EnsnaringStrike => true
      | SearingSmite => true
      | ShiningSmite => true
      | FaerieFire => true
      | AnimalFriendship => true
      | CharmPerson => true
      | CalmEmotions => true
      | BlindnessDeafness => true
      | HoldPerson => true
      | ProtectionFromEvilAndGood => true
      | ProtectionFromPoison => true
      | LesserRestoration => true
      | IceKnife => true
      | HealingWord => true
      | CureWounds => true
      | MassHealingWord => true
      | Shield => true
      | Counterspell => true
      | FalseLife => true
      | Longstrider => true
      | ShieldOfFaith => true
      | SpiderClimb => true
      | Fly => true
      | Barkskin => true
      | Heroism => true
      | Aid => true
      | Bane => true
      | Bless => true
      | Guidance => false
      | PassWithoutTrace => true
      | EnhanceAbility => true
      | Enthrall => true
      | Thaumaturgy => false
      | DivineFavor => true
      | DivineSmite => true
      | HuntersMark => true
      | Hex => true
      | MagicWeapon => true
      | ShockingGrasp => false
      | GuidingBolt => true
      | RayOfSickness => true
      | ViciousMockery => false
      | ProduceFlame => false
      | DancingLightsSpell => false
      | Light => false
      | ContinualFlame => true
      | FlameBlade => true
      | TrueStrike => false
      | Grease => true
      | FogCloud => true
      | Darkness => true
      | AntimagicField => true
      | Web => true
      | SpikeGrowth => true
      | Command => true
      | DissonantWhispers => true
      | FeatherFall => true
      | HellishRebuke => true
      | SorcerousBurst => false
      | SpareTheDying => false
      | HideousLaughter => true
      | HypnoticPattern => true
      | MistyStep => true
      | Blur => true
      | SeeInvisibility => true
      | MirrorImage => true
      | MindSpike => true
      | AlterSelf => true
      | DragonsBreath => true
    }

  pure def canExpendSpellSlotThisTurn(state: BattleState): bool =
    canActorExpendSpellSlotThisTurn(state, currentActor(state))

  pure def canDiscoverSpellActs(canCastSpells: bool, raging: bool): bool =
    canCastSpells and not(battleRuntimeRagePreventsSpellcasting(raging))

  pure def fighterRageDamageBonus(barbarianLevel: int): int =
    battleRuntimeRageDamageBonus(barbarianLevel)

  pure def spellAttackModifier(
    spellcastingAbilityModifier: int,
    proficiencyBonus: int,
  ): int =
    spellcastingAbilityModifier + proficiencyBonus

  pure def innateSorceryAppliesToSpell(
    innateSorceryActive: bool,
    spellSourceClass: SpellSourceClass,
  ): bool =
    innateSorceryActive and spellSourceClass == SorcererSpellSource

  pure def sorcererSpellSaveDcWithInnateSorcery(
    baseDc: int,
    innateSorceryActive: bool,
    spellSourceClass: SpellSourceClass,
  ): int =
    baseDc + (if (innateSorceryAppliesToSpell(innateSorceryActive, spellSourceClass)) 1 else 0)

  pure def sorcererSpellAttackRollModeWithInnateSorcery(
    baseline: SpellAttackRollMode,
    innateSorceryActive: bool,
    spellSourceClass: SpellSourceClass,
  ): SpellAttackRollMode =
    if (innateSorceryAppliesToSpell(innateSorceryActive, spellSourceClass) and baseline == DisadvantageSpellAttackRoll)
      NormalSpellAttackRoll
    else if (innateSorceryAppliesToSpell(innateSorceryActive, spellSourceClass) and baseline == NormalSpellAttackRoll)
      AdvantageSpellAttackRoll
    else
      baseline

  pure def battleRuntimeScalarBuffProfileForInvocation(invocation: ScalarBuffSpell): BattleRuntimeScalarBuffProfile =
    match invocation {
      | FalseLifeScalarBuff => BattleRuntimeFalseLifeScalarBuff
      | LongstriderScalarBuff => BattleRuntimeLongstriderScalarBuff
      | ShieldOfFaithScalarBuff => BattleRuntimeShieldOfFaithScalarBuff
      | SpiderClimbScalarBuff => BattleRuntimeSpiderClimbScalarBuff
      | FlyScalarBuff => BattleRuntimeFlyScalarBuff
      | BarkskinScalarBuff => BattleRuntimeBarkskinScalarBuff
      | AidScalarBuff => BattleRuntimeAidScalarBuff
    }

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
}
