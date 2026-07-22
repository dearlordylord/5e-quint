// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.REACTION_CASTING_TIME
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS

module battleRuntimeSpellSlotClassification {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import spellInvocationResourceCore.* from "../shared-algebras/proofs/rule-core/spell-invocation-resource-core"

  pure def expendedSlotsAfterInvocation(
    invocation: SpellInvocation,
    expendedSpellSlots: int,
  ): int =
    if (spellInvocationSpendsSpellSlot(invocation)) expendedSpellSlots + 1 else expendedSpellSlots

  pure def expendedSlotsAfterSpellInvocationResource(
    facts: SpellInvocationResourceFacts,
    expendedSpellSlots: int,
  ): int =
    if (spellInvocationResourceRequiresSlot(facts)) expendedSpellSlots + 1 else expendedSpellSlots

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
}
