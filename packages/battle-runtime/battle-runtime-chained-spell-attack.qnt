// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-chained-attack-damage

module battleRuntimeChainedSpellAttack {
  import battleRuntimeSpellBridge.* from "./battle-runtime-spell-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeDamageAdjustments.* from "./battle-runtime-damage-adjustments"

  pure def battleRuntimeChainedSpellAttackDamageProfileForInvocation(
    invocation: ChainedSpellAttackDamageInvocation
  ): BattleRuntimeChainedSpellAttackDamageProfile =
    match invocation {
      | ChromaticOrbChainedSpellAttack => BattleRuntimeChromaticOrbChainedSpellAttack
    }

  pure def battleRuntimeChainedSpellAttackDamageChoiceForChromaticOrb(choice: ChromaticOrbDamageTypeChoice): BattleRuntimeChainedSpellAttackDamageTypeChoice =
    match choice {
      | ChromaticOrbAcid => BattleRuntimeChainedSpellAttackAcidDamage
      | ChromaticOrbCold => BattleRuntimeChainedSpellAttackColdDamage
      | ChromaticOrbFire => BattleRuntimeChainedSpellAttackFireDamage
      | ChromaticOrbLightning => BattleRuntimeChainedSpellAttackLightningDamage
      | ChromaticOrbPoison => BattleRuntimeChainedSpellAttackPoisonDamage
      | ChromaticOrbThunder => BattleRuntimeChainedSpellAttackThunderDamage
    }

  pure def chromaticOrbDamageTypeChoiceFromBridge(
    choice: BattleRuntimeChainedSpellAttackDamageTypeChoice
  ): ChromaticOrbDamageTypeChoice =
    match choice {
      | BattleRuntimeChainedSpellAttackAcidDamage => ChromaticOrbAcid
      | BattleRuntimeChainedSpellAttackColdDamage => ChromaticOrbCold
      | BattleRuntimeChainedSpellAttackFireDamage => ChromaticOrbFire
      | BattleRuntimeChainedSpellAttackLightningDamage => ChromaticOrbLightning
      | BattleRuntimeChainedSpellAttackPoisonDamage => ChromaticOrbPoison
      | BattleRuntimeChainedSpellAttackThunderDamage => ChromaticOrbThunder
    }

  pure def chromaticOrbDamageTypeChoice(choice: ChromaticOrbDamageTypeChoice): DamageType =
    damageTypeFromRuleDamageType(
      battleRuntimeChainedSpellAttackDamageType(
        battleRuntimeChainedSpellAttackDamageChoiceForChromaticOrb(choice)
      )
    )

  pure def chainedSpellAttackDamageChoices(invocation: ChainedSpellAttackDamageInvocation): Set[ChromaticOrbDamageTypeChoice] =
    battleRuntimeChainedSpellAttackDamageChoices(
      battleRuntimeChainedSpellAttackDamageProfileForInvocation(invocation)
    ).map(chromaticOrbDamageTypeChoiceFromBridge)

  pure def chainedSpellAttackDamageBaseSpellLevel(invocation: ChainedSpellAttackDamageInvocation): int =
    battleRuntimeChainedSpellAttackDamageBaseSpellLevel(
      battleRuntimeChainedSpellAttackDamageProfileForInvocation(invocation)
    )

  pure def chainedSpellAttackDamageDieSize(invocation: ChainedSpellAttackDamageInvocation): int =
    battleRuntimeChainedSpellAttackDamageDieSize(
      battleRuntimeChainedSpellAttackDamageProfileForInvocation(invocation)
    )

  pure def chainedSpellAttackDamageSlotLevelIsLegal(invocation: ChainedSpellAttackDamageInvocation, slotLevel: int): bool =
    battleRuntimeChainedSpellAttackDamageSlotLevelIsLegal(
      battleRuntimeChainedSpellAttackDamageProfileForInvocation(invocation),
      slotLevel,
    )

  pure def chainedSpellAttackDamageLeapCountIsLegal(
    invocation: ChainedSpellAttackDamageInvocation,
    slotLevel: int,
    leapsUsed: int,
  ): bool =
    battleRuntimeChainedSpellAttackDamageLeapCountIsLegal(
      battleRuntimeChainedSpellAttackDamageProfileForInvocation(invocation),
      slotLevel,
      leapsUsed,
    )

  pure def chainedSpellAttackDamageDice(invocation: ChainedSpellAttackDamageInvocation, slotLevel: int): int =
    battleRuntimeChainedSpellAttackDamageDice(
      battleRuntimeChainedSpellAttackDamageProfileForInvocation(invocation),
      slotLevel,
    )

  pure def chainedSpellAttackDamageRolledD8Count(
    invocation: ChainedSpellAttackDamageInvocation,
    slotLevel: int,
    criticalHit: bool,
  ): int =
    battleRuntimeChainedSpellAttackDamageRolledD8Count(
      battleRuntimeChainedSpellAttackDamageProfileForInvocation(invocation),
      slotLevel,
      criticalHit,
    )

  pure def d8FaceCountTotal(counts: D8FaceCounts): int =
    battleRuntimeD8FaceCountTotal(counts)

  pure def d8FaceCountsAreNonNegative(counts: D8FaceCounts): bool =
    battleRuntimeD8FaceCountsAreNonNegative(counts)

  pure def d8FaceCountsMatchRolledDice(
    invocation: ChainedSpellAttackDamageInvocation,
    slotLevel: int,
    criticalHit: bool,
    counts: D8FaceCounts,
  ): bool =
    battleRuntimeD8FaceCountsMatchRolledDice(
      battleRuntimeChainedSpellAttackDamageProfileForInvocation(invocation),
      slotLevel,
      criticalHit,
      counts,
    )

  pure def damageRollHasDuplicateD8Face(counts: D8FaceCounts): bool =
    battleRuntimeDamageRollHasDuplicateD8Face(counts)

  pure def chainedSpellAttackDamageCanLeap(
    invocation: ChainedSpellAttackDamageInvocation,
    slotLevel: int,
    leapsUsed: int,
    criticalHit: bool,
    counts: D8FaceCounts,
  ): bool =
    battleRuntimeChainedSpellAttackDamageCanLeap(
      battleRuntimeChainedSpellAttackDamageProfileForInvocation(invocation),
      slotLevel,
      leapsUsed,
      criticalHit,
      counts,
    )

  pure def chainedSpellAttackDamageStepDamageType(
    invocation: ChainedSpellAttackDamageInvocation,
    selectedDamageType: ChromaticOrbDamageTypeChoice,
    stepIndex: int,
  ): DamageType =
    chromaticOrbDamageTypeChoice(selectedDamageType)

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
}
