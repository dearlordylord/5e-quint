// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-marked-damage-rider

module battleRuntimeMarkedRiders {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"

  pure def huntersMarkDurationTicks(slotLevel: int): int =
    if (slotLevel >= 5) 24 * 60 * 10
    else if (slotLevel >= 3) 8 * 60 * 10
    else 60 * 10

  pure def hexDurationTicks(slotLevel: int): int =
    if (slotLevel >= 5) 60 * 60 * 24
    else if (slotLevel >= 3) 60 * 60 * 8
    else if (slotLevel >= 2) 60 * 60 * 4
    else 60 * 60

  pure def activeEffectsWithoutHuntersMark(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | HuntersMarkDamageRider(_) => false
      | _ => true
    })

  pure def activeEffectsWithoutHex(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | HexDamageRider(_) => false
      | _ => true
    })

  pure def activeEffectsWithoutMarkedDamageRider(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    activeEffectsWithoutHex(activeEffectsWithoutHuntersMark(effects))

  pure def activeEffectsContainMarkedDamageRider(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | HuntersMarkDamageRider(_) => true
      | HexDamageRider(_) => true
      | _ => false
    })

  pure def activeEffectsContainTimedConcentrationSpellEffect(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | HuntersMarkDamageRider(_) => true
      | HexDamageRider(_) => true
      | FogCloudObscurement(_) => true
      | MagicalDarknessPointOrigin(_) => true
      | WebRestraintHazard(_) => true
      | SleetStormAreaHazard(_) => true
      | HeatMetalObjectContactDamage(_) => true
      | SpikeGrowthMovementHazard(_) => true
      | DancingLightsEffect(_) => true
      | FlameBladeEffect(_) => true
      | InvisibilityCondition(_) => true
      | SeeInvisibleAndEthereal(_) => false
      | MindSpikeConcentrationDuration(_) => true
      | CreatureSizeChange(_) => true
      | LevitatedCreature(_) => false
      | SpiritualWeapon(_) => true
      | SelfTransformationModeEffect(_) => true
      | _ => false
    })

  pure def activeEffectsContainHuntersMark(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | HuntersMarkDamageRider(_) => true
      | _ => false
    })

  pure def activeEffectsHuntersMarkDurationTicks(effects: Set[ActiveEffect]): int =
    effects.map(effect => match effect {
      | HuntersMarkDamageRider(data) => data.durationTicks
      | _ => 0
    }).fold(0, (highest, ticks) => if (highest > ticks) highest else ticks)

  pure def activeEffectsHexDurationTicks(effects: Set[ActiveEffect]): int =
    effects.map(effect => match effect {
      | HexDamageRider(data) => data.durationTicks
      | _ => 0
    }).fold(0, (highest, ticks) => if (highest > ticks) highest else ticks)

  pure def activeEffectsHexAbility(effects: Set[ActiveEffect]): Ability =
    effects.map(effect => match effect {
      | HexDamageRider(data) => data.ability
      | _ => StrAbility
    }).fold(StrAbility, (selected, ability) => if (selected == StrAbility) ability else selected)

  pure def markedDamageRiderTransferIsAvailable(state: BattleState, transfer: MarkedDamageRiderTransfer): bool =
    match transfer {
      | AwaitingTargetDrop => false
      | TransferAvailable => true
      | TransferAvailableAfterTurn(data) => data.actor != currentActor(state) or data.round != state.initiative.round
    }

  pure def activeEffectsContainTransferableHuntersMark(state: BattleState, effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | HuntersMarkDamageRider(data) => markedDamageRiderTransferIsAvailable(state, data.transfer)
      | _ => false
    })

  pure def activeEffectsContainTransferableHex(state: BattleState, effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | HexDamageRider(data) => markedDamageRiderTransferIsAvailable(state, data.transfer)
      | _ => false
    })

  pure def fighterHuntersMarkDamage(huntersMarkDamageRoll: int, effects: Set[ActiveEffect], target: Actor): int =
    if (effects.exists(effect => match effect {
      | HuntersMarkDamageRider(data) => data.target == target
      | _ => false
    })) huntersMarkDamageRoll else 0

  pure def fighterHexDamage(hexDamageRoll: int, effects: Set[ActiveEffect], target: Actor): int =
    if (effects.exists(effect => match effect {
      | HexDamageRider(data) => data.target == target
      | _ => false
    })) hexDamageRoll else 0

  pure def hexAbilityCheckRollMode(effects: Set[ActiveEffect], actor: Actor, ability: Ability): AbilityCheckRollMode =
    if (effects.exists(effect => match effect {
      | HexDamageRider(data) => data.target == actor and data.ability == ability
      | _ => false
    })) DisadvantageAbilityCheck else NormalAbilityCheck

  pure def huntersMarkFindingAbilityCheckRollMode(effects: Set[ActiveEffect], target: Actor, ability: Ability, skill: AbilityCheckSkill): AbilityCheckRollMode =
    if (
      ability == WisAbility and
      (skill == PerceptionSkill or skill == SurvivalSkill) and
      effects.exists(effect => match effect {
        | HuntersMarkDamageRider(data) => data.target == target
        | _ => false
      })
    ) AdvantageAbilityCheck else NormalAbilityCheck

  pure def enhanceAbilityCheckRollMode(effects: Set[ActiveEffect], ability: Ability): AbilityCheckRollMode =
    if (effects.exists(effect => match effect {
      | EnhanceAbilityCheckAdvantage(data) => data.ability == ability
      | _ => false
    })) AdvantageAbilityCheck else NormalAbilityCheck

  pure def heatMetalHoldingWearingPenaltyAbilityCheckRollMode(effects: Set[ActiveEffect]): AbilityCheckRollMode =
    if (effects.exists(effect => match effect {
      | HeatMetalHoldingWearingPenalty(_) => true
      | _ => false
    })) DisadvantageAbilityCheck else NormalAbilityCheck

  pure def requiredAbilityCheckRollMode(
    disadvantageMode: AbilityCheckRollMode,
    advantageMode: AbilityCheckRollMode,
  ): AbilityCheckRollMode =
    if (
      disadvantageMode == DisadvantageAbilityCheck and
      advantageMode == AdvantageAbilityCheck
    ) NormalAbilityCheck
    else if (disadvantageMode == DisadvantageAbilityCheck)
      DisadvantageAbilityCheck
    else if (advantageMode == AdvantageAbilityCheck)
      AdvantageAbilityCheck
    else
      NormalAbilityCheck
}
