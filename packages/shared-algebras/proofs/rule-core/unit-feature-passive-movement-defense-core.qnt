// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.passive-armor-class-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS

module unitFeaturePassiveMovementDefenseCore {
  import hitPointDamage.* from "./hit-point-damage"
  import actionTurnProcedures.* from "./action-turn-procedures"

  // RAW anchors:
  // - Classes/Barbarian.md: Fast Movement.
  // - Classes/Monk.md: Unarmored Movement.
  // - Classes/Ranger.md: Roving.
  // - Feats.md: Defense.
  // - Rules-Glossary.md: Armor Class, Dash, Climb Speed, Speed, and Swim Speed.
  // - Playing-the-Game.md: Armor Class, Combat Movement, and Dash.
  // - UBIQUITOUS_LANGUAGE.md: Armor Class, Speed, Movement, and Armor Category.

  type ArmorWorn =
    | NoArmorWorn
    | LightArmorWorn
    | MediumArmorWorn
    | HeavyArmorWorn

  type PassiveArmorClassBonusFacts = {
    armorWorn: ArmorWorn,
  }

  type NotWearingHeavyArmorSpeedBonusFacts = {
    baseSpeedFeet: int,
    armorWorn: ArmorWorn,
    movementSpentFeet: int,
  }

  type UnarmoredUnshieldedSpeedBonusFacts = {
    baseSpeedFeet: int,
    armorWorn: ArmorWorn,
    wieldingShield: bool,
    movementSpentFeet: int,
  }

  type PassiveSpeedBonusFacts =
    | NotWearingHeavyArmorSpeedBonus(NotWearingHeavyArmorSpeedBonusFacts)
    | UnarmoredUnshieldedSpeedBonus(UnarmoredUnshieldedSpeedBonusFacts)

  type PassiveSpeedBudgetResult = {
    speedFeet: int,
    movementRemainingFeet: int,
    dashMovementBonusFeet: int,
  }

  type MovementSpeedKind =
    | WalkSpeedKind
    | ClimbSpeedKind
    | SwimSpeedKind

  type PassiveSpeedKindGrantsFacts = {
    baseSpeedFeet: int,
    armorWorn: ArmorWorn,
    movementSpentFeet: int,
    chosenSpeedKind: MovementSpeedKind,
  }

  type PassiveSpeedKindGrantsResult = {
    chosenSpeedKind: MovementSpeedKind,
    speedFeet: int,
    grantedSpeedKinds: Set[MovementSpeedKind],
    movementRemainingFeet: int,
    dashMovementBonusFeet: int,
  }

  pure def wearingArmorForDefense(facts: PassiveArmorClassBonusFacts): bool =
    facts.armorWorn != NoArmorWorn

  pure def defenseArmorClass(baseArmorClass: int, facts: PassiveArmorClassBonusFacts): int =
    if (wearingArmorForDefense(facts)) baseArmorClass + 1 else baseArmorClass

  pure def passiveSpeedBonusApplies(facts: PassiveSpeedBonusFacts): bool =
    match facts {
      | NotWearingHeavyArmorSpeedBonus(data) => data.armorWorn != HeavyArmorWorn
      | UnarmoredUnshieldedSpeedBonus(data) =>
        data.armorWorn == NoArmorWorn and not(data.wieldingShield)
    }

  pure def passiveSpeedBonusDelta(facts: PassiveSpeedBonusFacts): int =
    if (passiveSpeedBonusApplies(facts)) 10 else 0

  pure def passiveSpeedBonus(facts: PassiveSpeedBonusFacts): int =
    passiveSpeedBonusDelta(facts)

  pure def passiveSpeedBonusBaseSpeedFeet(facts: PassiveSpeedBonusFacts): int =
    match facts {
      | NotWearingHeavyArmorSpeedBonus(data) => data.baseSpeedFeet
      | UnarmoredUnshieldedSpeedBonus(data) => data.baseSpeedFeet
    }

  pure def passiveSpeedBonusMovementSpentFeet(facts: PassiveSpeedBonusFacts): int =
    match facts {
      | NotWearingHeavyArmorSpeedBonus(data) => data.movementSpentFeet
      | UnarmoredUnshieldedSpeedBonus(data) => data.movementSpentFeet
    }

  pure def passiveSpeedBonusEffectiveSpeed(facts: PassiveSpeedBonusFacts): int =
    passiveSpeedBonusBaseSpeedFeet(facts) + passiveSpeedBonus(facts)

  pure def resolvePassiveSpeedBonusBudget(
    turn: TurnProcedureState,
    facts: PassiveSpeedBonusFacts
  ): PassiveSpeedBudgetResult = {
    val speed = passiveSpeedBonusEffectiveSpeed(facts)
    {
      speedFeet: speed,
      movementRemainingFeet:
        nonnegative(speed + turn.dashMovementBonusFeet - passiveSpeedBonusMovementSpentFeet(facts)),
      dashMovementBonusFeet: turn.dashMovementBonusFeet,
    }
  }

  pure def resolvePassiveSpeedBonusDash(
    turn: TurnProcedureState,
    facts: PassiveSpeedBonusFacts
  ): PassiveSpeedBudgetResult = {
    val speed = passiveSpeedBonusEffectiveSpeed(facts)
    val dashed = resolveDash(turn, speed, StandardActionCost(DashAction))
    resolvePassiveSpeedBonusBudget(dashed, facts)
  }

  pure def rovingSpeedFacts(
    facts: PassiveSpeedKindGrantsFacts
  ): PassiveSpeedBonusFacts = {
    NotWearingHeavyArmorSpeedBonus({
      baseSpeedFeet: facts.baseSpeedFeet,
      armorWorn: facts.armorWorn,
      movementSpentFeet: facts.movementSpentFeet,
    })
  }

  pure def rovingEffectiveSpeed(facts: PassiveSpeedKindGrantsFacts): int =
    passiveSpeedBonusEffectiveSpeed(rovingSpeedFacts(facts))

  pure def rovingGrantedSpeedKinds: Set[MovementSpeedKind] =
    Set(ClimbSpeedKind, SwimSpeedKind)

  pure def resolveRovingSpeedKindBudget(
    turn: TurnProcedureState,
    facts: PassiveSpeedKindGrantsFacts
  ): PassiveSpeedKindGrantsResult = {
    val budget = resolvePassiveSpeedBonusBudget(turn, rovingSpeedFacts(facts))
    {
      chosenSpeedKind: facts.chosenSpeedKind,
      speedFeet: budget.speedFeet,
      grantedSpeedKinds: rovingGrantedSpeedKinds,
      movementRemainingFeet: budget.movementRemainingFeet,
      dashMovementBonusFeet: budget.dashMovementBonusFeet,
    }
  }

  pure def resolveRovingSpeedKindDash(
    turn: TurnProcedureState,
    facts: PassiveSpeedKindGrantsFacts
  ): PassiveSpeedKindGrantsResult = {
    val speed = rovingEffectiveSpeed(facts)
    val dashed = resolveDash(turn, speed, StandardActionCost(DashAction))
    resolveRovingSpeedKindBudget(dashed, facts)
  }
}
