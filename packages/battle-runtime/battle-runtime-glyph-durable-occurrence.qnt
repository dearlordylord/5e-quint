// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.GLYPH_DURABLE_OCCURRENCE_LIFECYCLE BATTLE.SPELL.GLYPH_EXPLOSIVE_RUNE_RELEASE BATTLE.SPELL.GLYPH_STORED_SPELL_RELEASE BATTLE.SPELL.GLYPH_STORED_CONCENTRATION_FULL_DURATION
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-glyph-durable-occurrence spell.invocation-glyph-explosive-rune-release spell.invocation-glyph-stored-spell-release spell.invocation-glyph-stored-concentration-full-duration spell.invocation-glyph-stored-summon-object-placement
//
// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Glyph of Warding:
//   the glyph lasts until dispelled or triggered; once triggered, the spell
//   ends; if the inscribed surface or object is moved more than 10 feet from
//   where the spell was cast, the glyph is broken and the spell ends without
//   triggering. The explosive rune branch releases a 20-foot-radius Sphere,
//   requires Dexterity Saving Throws, deals 5d8 chosen Acid/Cold/Fire/
//   Lightning/Thunder damage on failed saves, halves damage on successful
//   saves, and adds 1d8 per slot level above 3. The spell glyph branch stores
//   a prepared spell of no higher level than the glyph slot, has no immediate
//   effect at storage time, and releases the stored spell against or centered
//   on the triggering creature. Represented area ongoing and area control spell
//   glyph releases reuse the same centered-area witness rule without ordinary
//   Concentration ownership. The represented self-transformation release uses
//   a single-creature triggering-creature witness without ordinary
//   Concentration ownership. The represented hostile trap and Spiritual Weapon
//   harmful-object branches consume close-as-possible placement witnesses, with
//   Spiritual Weapon repeat targeting fixed to the triggering creature. If the
//   stored spell requires Concentration, the released spell lasts until the end
//   of its full duration.
// - UBIQUITOUS_LANGUAGE.md: Spell Effect, Saving Throw, Area of Effect,
//   Spell Invocation, Damage Type, and table-owned spatial facts.
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-glyph-durable-occurrence spell.invocation-glyph-explosive-rune-release spell.invocation-glyph-stored-spell-release spell.invocation-glyph-stored-concentration-full-duration spell.invocation-glyph-stored-summon-object-placement

module battleRuntimeGlyphDurableOccurrence {
  type GlyphExplosiveRuneRelease = {
    damageType: str,
  }

  type GlyphStoredSpellReleaseFacts = {
    storedSpellLevel: int,
    storageImmediateEffect: str,
    storedSpellRequiresConcentration: bool,
    storedSpellProcedure: str,
  }

  type GlyphStoredSpellRelease =
    | StoredSingleCreatureSpell(GlyphStoredSpellReleaseFacts)
    | StoredAreaSpell(GlyphStoredSpellReleaseFacts)
    | StoredHostileTrapSpell(GlyphStoredSpellReleaseFacts)
    | StoredHarmfulObjectSpell(GlyphStoredSpellReleaseFacts)

  type GlyphRelease =
    | ExplosiveRuneRelease(GlyphExplosiveRuneRelease)
    | SpellGlyphRelease(GlyphStoredSpellRelease)

  type GlyphStoredSpellReleaseOwner =
    | NativeStoredSpellOwner
    | FullDurationStoredConcentrationOwner

  type GlyphOccurrence = {
    active: bool,
    effectId: int,
    sourceSpellLevel: int,
    release: GlyphRelease,
    coveredAreaId: int,
    castLocationId: int,
    movementInvalidationMoreThanFeet: int,
  }

  type GlyphTriggerOccurrenceWitness = {
    effectId: int,
  }

  type GlyphExplosiveRuneReleaseWitness = {
    triggerOccurrence: GlyphTriggerOccurrenceWitness,
    coveredAreaId: int,
    affectedTargetCount: int,
    savingThrowAbility: str,
    savingThrowDcSource: str,
    savingThrowOutcomeCount: int,
  }

  type GlyphStoredSpellHostileTrapPlacementWitness = {
    subject: str,
    areaId: int,
    placement: str,
    attackTargetId: int,
  }

  type GlyphStoredSpellHarmfulObjectPlacementWitness = {
    subject: str,
    positionId: int,
    placement: str,
    attackTargetId: int,
    targetReachPositionId: int,
    forceReachFeet: int,
  }

  type GlyphStoredSpellReleaseWitness =
    | StoredSingleCreatureReleaseWitness({
        triggerOccurrence: GlyphTriggerOccurrenceWitness,
        triggeringCreatureId: int,
        targetId: int,
      })
    | StoredAreaReleaseWitness({
        triggerOccurrence: GlyphTriggerOccurrenceWitness,
        triggeringCreatureId: int,
        areaOriginAnchorId: int,
      })
    | StoredHostileTrapReleaseWitness({
        triggerOccurrence: GlyphTriggerOccurrenceWitness,
        triggeringCreatureId: int,
        areaOriginAnchorId: int,
        hostilePlacement: GlyphStoredSpellHostileTrapPlacementWitness,
      })
    | StoredHarmfulObjectReleaseWitness({
        triggerOccurrence: GlyphTriggerOccurrenceWitness,
        triggeringCreatureId: int,
        targetId: int,
        hostilePlacement: GlyphStoredSpellHarmfulObjectPlacementWitness,
      })

  pure val glyphMinimumSpellLevel = 3

  pure val glyphMovementInvalidationThresholdFeet = 10

  pure val glyphExplosiveRuneRadiusFeet = 20

  pure val glyphExplosiveRuneBaseDamageDice = 5

  pure val glyphExplosiveRuneDamageDieSize = 8

  pure val glyphExplosiveRuneDamageTypes: Set[str] =
    Set("acid", "cold", "fire", "lightning", "thunder")

  pure val glyphStoredSpellReleaseKinds: Set[str] =
    Set("singleCreature", "area", "hostileTrap", "harmfulObject")

  pure val glyphStoredSpellReadiedReleaseProcedure = "readiedSpellRelease"

  pure val glyphStoredSpellSaveGatedConditionProcedure = "saveGatedCondition"

  pure val glyphStoredSpellSaveGatedDamageProcedure = "saveGatedDamage"

  pure val glyphStoredSpellGreaseGroundHazardProcedure = "greaseGroundHazard"

  pure val glyphStoredSpellSpiritualWeaponAttackProxyProcedure =
    "spiritualWeaponAttackProxy"

  pure val glyphStoredSpellFogCloudObscurementProcedure =
    "fogCloudObscurement"

  pure val glyphStoredSpellMagicalDarknessPointOriginProcedure =
    "magicalDarknessPointOrigin"

  pure val glyphStoredSpellFlamingSphereProcedure = "flamingSphere"

  pure val glyphStoredSpellSpikeGrowthMovementHazardProcedure =
    "spikeGrowthMovementHazard"

  pure val glyphStoredSpellMoonbeamProcedure = "moonbeam"

  pure val glyphStoredSpellWebRestraintHazardProcedure = "webRestraintHazard"

  pure val glyphStoredSpellGustOfWindLineProcedure = "gustOfWindLine"

  pure val glyphStoredSpellHypnoticPatternProcedure = "hypnoticPattern"

  pure val glyphStoredSpellScalarBuffProcedure = "scalarBuff"

  pure val glyphStoredSpellRollModifierProcedure = "rollModifier"

  pure val glyphStoredSpellCreatureSizeIncreaseProcedure =
    "creatureSizeIncrease"

  pure val glyphStoredSpellCreatureSizeDecreaseProcedure =
    "creatureSizeDecrease"

  pure val glyphStoredSpellLevitatedCreatureProcedure = "levitatedCreature"

  pure val glyphStoredSpellDirectConditionProcedure = "directCondition"

  pure val glyphStoredSpellHastePositiveProcedure = "hastePositive"

  pure val glyphStoredSpellCreatureTypeProtectionProcedure =
    "creatureTypeProtection"

  pure val glyphStoredSpellConditionImmunityTurnStartTemporaryHitPointsProcedure =
    "conditionImmunityAndTurnStartTemporaryHitPoints"

  pure val glyphStoredSpellSelfTransformationModeProcedure =
    "selfTransformationMode"

  pure val glyphStoredSpellAreaOngoingProcedures: Set[str] =
    Set(
      glyphStoredSpellFogCloudObscurementProcedure,
      glyphStoredSpellMagicalDarknessPointOriginProcedure,
      glyphStoredSpellFlamingSphereProcedure,
      glyphStoredSpellSpikeGrowthMovementHazardProcedure,
      glyphStoredSpellMoonbeamProcedure,
      glyphStoredSpellWebRestraintHazardProcedure,
      glyphStoredSpellGustOfWindLineProcedure,
    )

  pure val glyphStoredSpellAreaControlProcedures: Set[str] =
    Set(glyphStoredSpellHypnoticPatternProcedure)

  pure val glyphStoredSpellSingleCreatureActiveEffectProcedures: Set[str] =
    Set(
      glyphStoredSpellScalarBuffProcedure,
      glyphStoredSpellRollModifierProcedure,
      glyphStoredSpellCreatureSizeIncreaseProcedure,
      glyphStoredSpellCreatureSizeDecreaseProcedure,
      glyphStoredSpellLevitatedCreatureProcedure,
      glyphStoredSpellDirectConditionProcedure,
      glyphStoredSpellHastePositiveProcedure,
      glyphStoredSpellCreatureTypeProtectionProcedure,
      glyphStoredSpellConditionImmunityTurnStartTemporaryHitPointsProcedure,
    )

  pure val glyphStoredSpellSelfTransformationProcedures: Set[str] =
    Set(glyphStoredSpellSelfTransformationModeProcedure)

  pure val glyphStoredSpellBaseProcedures: Set[str] =
    Set(
      glyphStoredSpellReadiedReleaseProcedure,
      glyphStoredSpellSaveGatedConditionProcedure,
      glyphStoredSpellSaveGatedDamageProcedure,
      glyphStoredSpellGreaseGroundHazardProcedure,
      glyphStoredSpellSpiritualWeaponAttackProxyProcedure,
    )

  pure val glyphStoredSpellProcedures: Set[str] =
    glyphStoredSpellBaseProcedures
      .union(glyphStoredSpellAreaOngoingProcedures)
      .union(glyphStoredSpellAreaControlProcedures)
      .union(glyphStoredSpellSingleCreatureActiveEffectProcedures)
      .union(glyphStoredSpellSelfTransformationProcedures)

  pure val glyphStoredSpellHostilePlacementSubjects: Set[str] =
    Set("summoned_hostile_creatures", "harmful_objects", "traps")

  pure val glyphStoredSpellHostileTrapSubject = "traps"

  pure val glyphStoredSpellHarmfulObjectSubject = "harmful_objects"

  pure val glyphStoredSpellHostilePlacementRule =
    "as_close_as_possible_to_triggering_creature"

  pure val glyphStoredSpellSpiritualWeaponForceReachFeet = 5

  pure val glyphStoredSpellNoImmediateEffect = "none"

  pure def storedSpellProcedureAcceptedForGlyphStorage(
    storedReleaseKind: str,
    storedSpellRequiresConcentration: bool,
    storedSpellProcedure: str,
  ): bool =
    if (storedSpellProcedure == glyphStoredSpellSaveGatedConditionProcedure)
    storedSpellRequiresConcentration and
      storedReleaseKind == "singleCreature"
    else if (storedSpellProcedure == glyphStoredSpellSaveGatedDamageProcedure)
    not(storedSpellRequiresConcentration) or
      storedReleaseKind == "singleCreature"
    else if (storedSpellProcedure == glyphStoredSpellSpiritualWeaponAttackProxyProcedure)
    storedSpellRequiresConcentration and
      storedReleaseKind == "harmfulObject"
    else if (storedSpellProcedure.in(glyphStoredSpellAreaOngoingProcedures))
    storedSpellRequiresConcentration and
      storedReleaseKind == "area"
    else if (storedSpellProcedure.in(glyphStoredSpellAreaControlProcedures))
    storedSpellRequiresConcentration and
      storedReleaseKind == "area"
    else if (storedSpellProcedure.in(glyphStoredSpellSingleCreatureActiveEffectProcedures))
    storedSpellRequiresConcentration and
      storedReleaseKind == "singleCreature"
    else if (storedSpellProcedure.in(glyphStoredSpellSelfTransformationProcedures))
    storedSpellRequiresConcentration and
      storedReleaseKind == "singleCreature"
    else not(storedSpellRequiresConcentration)

  pure def storedSpellReleaseFacts(
    storedSpellLevel: int,
    storageImmediateEffect: str,
    storedSpellRequiresConcentration: bool,
    storedSpellProcedure: str,
  ): GlyphStoredSpellReleaseFacts = {
    storedSpellLevel: storedSpellLevel,
    storageImmediateEffect: storageImmediateEffect,
    storedSpellRequiresConcentration: storedSpellRequiresConcentration,
    storedSpellProcedure: storedSpellProcedure,
  }

  pure def storedSpellReleaseForKind(
    storedReleaseKind: str,
    facts: GlyphStoredSpellReleaseFacts,
  ): GlyphStoredSpellRelease =
    if (storedReleaseKind == "singleCreature")
    StoredSingleCreatureSpell(facts)
    else if (storedReleaseKind == "hostileTrap")
    StoredHostileTrapSpell(facts)
    else if (storedReleaseKind == "harmfulObject")
    StoredHarmfulObjectSpell(facts)
    else StoredAreaSpell(facts)

  pure def storedSpellReleaseKind(
    release: GlyphStoredSpellRelease,
  ): str =
    match release {
      | StoredSingleCreatureSpell(_) => "singleCreature"
      | StoredAreaSpell(_) => "area"
      | StoredHostileTrapSpell(_) => "hostileTrap"
      | StoredHarmfulObjectSpell(_) => "harmfulObject"
    }

  pure def storedSpellReleaseFactsFrom(
    release: GlyphStoredSpellRelease,
  ): GlyphStoredSpellReleaseFacts =
    match release {
      | StoredSingleCreatureSpell(facts) => facts
      | StoredAreaSpell(facts) => facts
      | StoredHostileTrapSpell(facts) => facts
      | StoredHarmfulObjectSpell(facts) => facts
    }

  pure def completedGlyphInscriptionAccepted(
    sourceSpellLevel: int,
    damageType: str,
  ): bool =
    sourceSpellLevel >= glyphMinimumSpellLevel and
    damageType.in(glyphExplosiveRuneDamageTypes)

  pure def completedStoredSpellGlyphInscriptionAccepted(
    sourceSpellLevel: int,
    storedSpellLevel: int,
    storedReleaseKind: str,
    storageImmediateEffect: str,
    storedSpellRequiresConcentration: bool,
    storedSpellProcedure: str,
  ): bool =
    sourceSpellLevel >= glyphMinimumSpellLevel and
    storedSpellLevel <= sourceSpellLevel and
    storedReleaseKind.in(glyphStoredSpellReleaseKinds) and
    storedSpellProcedure.in(glyphStoredSpellProcedures) and
    storageImmediateEffect == glyphStoredSpellNoImmediateEffect and
    storedSpellProcedureAcceptedForGlyphStorage(
      storedReleaseKind,
      storedSpellRequiresConcentration,
      storedSpellProcedure,
    )

  pure def completedGlyphOccurrence(
    effectId: int,
    sourceSpellLevel: int,
    damageType: str,
    coveredAreaId: int,
    castLocationId: int,
  ): GlyphOccurrence = {
    active: true,
    effectId: effectId,
    sourceSpellLevel: sourceSpellLevel,
    release: ExplosiveRuneRelease({ damageType: damageType }),
    coveredAreaId: coveredAreaId,
    castLocationId: castLocationId,
    movementInvalidationMoreThanFeet: glyphMovementInvalidationThresholdFeet,
  }

  pure def completedStoredSpellGlyphOccurrence(
    effectId: int,
    sourceSpellLevel: int,
    storedSpellLevel: int,
    storedReleaseKind: str,
    storageImmediateEffect: str,
    storedSpellRequiresConcentration: bool,
    storedSpellProcedure: str,
    coveredAreaId: int,
    castLocationId: int,
  ): GlyphOccurrence = {
    active: true,
    effectId: effectId,
    sourceSpellLevel: sourceSpellLevel,
    release: SpellGlyphRelease(storedSpellReleaseForKind(
      storedReleaseKind,
      storedSpellReleaseFacts(
        storedSpellLevel,
        storageImmediateEffect,
        storedSpellRequiresConcentration,
        storedSpellProcedure,
      ),
    )),
    coveredAreaId: coveredAreaId,
    castLocationId: castLocationId,
    movementInvalidationMoreThanFeet: glyphMovementInvalidationThresholdFeet,
  }

  pure def inactiveGlyphOccurrence(occurrence: GlyphOccurrence): GlyphOccurrence = {
    active: false,
    effectId: occurrence.effectId,
    sourceSpellLevel: occurrence.sourceSpellLevel,
    release: occurrence.release,
    coveredAreaId: occurrence.coveredAreaId,
    castLocationId: occurrence.castLocationId,
    movementInvalidationMoreThanFeet: occurrence.movementInvalidationMoreThanFeet,
  }

  pure def glyphOccurrenceHasExplosiveRuneRelease(
    occurrence: GlyphOccurrence,
    damageType: str,
  ): bool =
    match occurrence.release {
      | ExplosiveRuneRelease(release) => release.damageType == damageType
      | _ => false
    }

  pure def glyphOccurrenceHasStoredSpellRelease(
    occurrence: GlyphOccurrence,
    storedSpellLevel: int,
    storedReleaseKind: str,
    storageImmediateEffect: str,
    storedSpellRequiresConcentration: bool,
    storedSpellProcedure: str,
  ): bool =
    match occurrence.release {
      | SpellGlyphRelease(release) =>
          storedSpellReleaseFactsFrom(release).storedSpellLevel == storedSpellLevel and
          storedSpellReleaseKind(release) == storedReleaseKind and
          storedSpellReleaseFactsFrom(release).storageImmediateEffect == storageImmediateEffect and
          storedSpellReleaseFactsFrom(release).storedSpellRequiresConcentration == storedSpellRequiresConcentration and
          storedSpellReleaseFactsFrom(release).storedSpellProcedure == storedSpellProcedure
      | _ => false
    }

  pure def glyphStoredSpellReleaseOwner(
    occurrence: GlyphOccurrence,
  ): GlyphStoredSpellReleaseOwner =
    match occurrence.release {
      | SpellGlyphRelease(release) =>
          if (storedSpellReleaseFactsFrom(release).storedSpellRequiresConcentration)
          FullDurationStoredConcentrationOwner
          else NativeStoredSpellOwner
      | _ => NativeStoredSpellOwner
    }

  pure def glyphAfterTriggerOccurrence(
    occurrence: GlyphOccurrence,
    witnessEffectId: int,
  ): GlyphOccurrence =
    occurrence

  pure def glyphAfterMovementInvalidation(
    occurrence: GlyphOccurrence,
    witnessEffectId: int,
    witnessCastLocationId: int,
    movedDistanceFeet: int,
  ): GlyphOccurrence =
    if (
      occurrence.active and
      occurrence.effectId == witnessEffectId and
      occurrence.castLocationId == witnessCastLocationId and
      movedDistanceFeet > occurrence.movementInvalidationMoreThanFeet
    )
    inactiveGlyphOccurrence(occurrence)
    else occurrence

  pure def glyphExplosiveRuneDamageDice(sourceSpellLevel: int): int =
    if (sourceSpellLevel >= glyphMinimumSpellLevel)
    glyphExplosiveRuneBaseDamageDice + (sourceSpellLevel - glyphMinimumSpellLevel)
    else 0

  pure def glyphExplosiveRuneDamageOnSave(
    failedSaveDamage: int,
    savingThrowSucceeded: bool,
  ): int =
    if (savingThrowSucceeded) failedSaveDamage / 2 else failedSaveDamage

  pure def glyphExplosiveRuneReleaseWitnessAccepted(
    occurrence: GlyphOccurrence,
    witness: GlyphExplosiveRuneReleaseWitness,
  ): bool =
    match occurrence.release {
      | ExplosiveRuneRelease(release) =>
          occurrence.active and
          occurrence.effectId == witness.triggerOccurrence.effectId and
          release.damageType.in(glyphExplosiveRuneDamageTypes) and
          occurrence.coveredAreaId == witness.coveredAreaId and
          witness.affectedTargetCount >= 0 and
          (
            witness.affectedTargetCount == 0 or
            (
              witness.savingThrowOutcomeCount == witness.affectedTargetCount and
              witness.savingThrowAbility == "dex" and
              witness.savingThrowDcSource == "casterSpellSaveDc"
            )
          )
      | _ => false
    }

  pure def glyphStoredSpellReleaseWitnessAccepted(
    occurrence: GlyphOccurrence,
    witness: GlyphStoredSpellReleaseWitness,
  ): bool =
    match occurrence.release {
      | SpellGlyphRelease(release) =>
          storedSpellReleaseWitnessAcceptedFor(
            occurrence,
            release,
            witness,
          )
      | _ => false
    }

  pure def storedSpellReleaseBaseAccepted(
    occurrence: GlyphOccurrence,
    release: GlyphStoredSpellRelease,
    witnessEffectId: int,
  ): bool = {
    val facts = storedSpellReleaseFactsFrom(release)
    occurrence.active and
    occurrence.effectId == witnessEffectId and
    completedStoredSpellGlyphInscriptionAccepted(
      occurrence.sourceSpellLevel,
      facts.storedSpellLevel,
      storedSpellReleaseKind(release),
      facts.storageImmediateEffect,
      facts.storedSpellRequiresConcentration,
      facts.storedSpellProcedure,
    )
  }

  pure def hostileTrapPlacementWitnessAccepted(
    witness: GlyphStoredSpellHostileTrapPlacementWitness,
    triggeringCreatureId: int,
  ): bool =
    witness.subject.in(glyphStoredSpellHostilePlacementSubjects) and
    witness.subject == glyphStoredSpellHostileTrapSubject and
    witness.areaId > 0 and
    witness.placement == glyphStoredSpellHostilePlacementRule and
    witness.attackTargetId == triggeringCreatureId

  pure def harmfulObjectPlacementWitnessAccepted(
    witness: GlyphStoredSpellHarmfulObjectPlacementWitness,
    triggeringCreatureId: int,
  ): bool =
    witness.subject.in(glyphStoredSpellHostilePlacementSubjects) and
    witness.subject == glyphStoredSpellHarmfulObjectSubject and
    witness.positionId > 0 and
    witness.placement == glyphStoredSpellHostilePlacementRule and
    witness.attackTargetId == triggeringCreatureId and
    witness.targetReachPositionId == witness.positionId and
    witness.forceReachFeet == glyphStoredSpellSpiritualWeaponForceReachFeet

  pure def storedSpellReleaseWitnessAcceptedFor(
    occurrence: GlyphOccurrence,
    release: GlyphStoredSpellRelease,
    witness: GlyphStoredSpellReleaseWitness,
  ): bool =
    match release {
      | StoredSingleCreatureSpell(_) =>
          match witness {
            | StoredSingleCreatureReleaseWitness(w) =>
                storedSpellReleaseBaseAccepted(
                  occurrence,
                  release,
                  w.triggerOccurrence.effectId,
                ) and
                w.targetId == w.triggeringCreatureId
            | _ => false
          }
      | StoredAreaSpell(_) =>
          match witness {
            | StoredAreaReleaseWitness(w) =>
                storedSpellReleaseBaseAccepted(
                  occurrence,
                  release,
                  w.triggerOccurrence.effectId,
                ) and
                w.areaOriginAnchorId == w.triggeringCreatureId
            | _ => false
          }
      | StoredHostileTrapSpell(_) =>
          match witness {
            | StoredHostileTrapReleaseWitness(w) =>
                storedSpellReleaseBaseAccepted(
                  occurrence,
                  release,
                  w.triggerOccurrence.effectId,
                ) and
                w.areaOriginAnchorId == w.triggeringCreatureId and
                hostileTrapPlacementWitnessAccepted(
                  w.hostilePlacement,
                  w.triggeringCreatureId,
                )
            | _ => false
          }
      | StoredHarmfulObjectSpell(_) =>
          match witness {
            | StoredHarmfulObjectReleaseWitness(w) =>
                storedSpellReleaseBaseAccepted(
                  occurrence,
                  release,
                  w.triggerOccurrence.effectId,
                ) and
                w.targetId == w.triggeringCreatureId and
                harmfulObjectPlacementWitnessAccepted(
                  w.hostilePlacement,
                  w.triggeringCreatureId,
                )
            | _ => false
          }
    }

  pure def glyphAfterExplosiveRuneRelease(
    occurrence: GlyphOccurrence,
    witness: GlyphExplosiveRuneReleaseWitness,
  ): GlyphOccurrence =
    if (glyphExplosiveRuneReleaseWitnessAccepted(occurrence, witness))
    inactiveGlyphOccurrence(occurrence)
    else occurrence

  pure def glyphAfterStoredSpellRelease(
    occurrence: GlyphOccurrence,
    witness: GlyphStoredSpellReleaseWitness,
  ): GlyphOccurrence =
    if (glyphStoredSpellReleaseWitnessAccepted(occurrence, witness))
    inactiveGlyphOccurrence(occurrence)
    else occurrence

}
