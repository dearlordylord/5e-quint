// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.GLYPH_DURABLE_OCCURRENCE_LIFECYCLE BATTLE.SPELL.GLYPH_EXPLOSIVE_RUNE_RELEASE BATTLE.SPELL.GLYPH_STORED_SPELL_RELEASE BATTLE.SPELL.GLYPH_STORED_CONCENTRATION_FULL_DURATION
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-glyph-durable-occurrence spell.invocation-glyph-explosive-rune-release spell.invocation-glyph-stored-spell-release spell.invocation-glyph-stored-concentration-full-duration spell.invocation-glyph-stored-summon-object-placement
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-glyph-durable-occurrence spell.invocation-glyph-explosive-rune-release spell.invocation-glyph-stored-spell-release spell.invocation-glyph-stored-concentration-full-duration spell.invocation-glyph-stored-summon-object-placement
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

  run test_completed_inscription_creates_active_glyph_occurrence = {
    val occurrence = completedGlyphOccurrence(1, 3, "thunder", 200, 100)
    all {
      assert(completedGlyphInscriptionAccepted(3, "thunder")),
      assert(occurrence.active),
      assert(occurrence.effectId == 1),
      assert(occurrence.sourceSpellLevel == 3),
      assert(glyphOccurrenceHasExplosiveRuneRelease(occurrence, "thunder")),
      assert(not(glyphOccurrenceHasStoredSpellRelease(
        occurrence,
        1,
        "singleCreature",
        "none",
        false,
        glyphStoredSpellReadiedReleaseProcedure,
      ))),
      assert(occurrence.coveredAreaId == 200),
      assert(occurrence.castLocationId == 100),
      assert(occurrence.movementInvalidationMoreThanFeet == 10),
    }
  }

  run test_completed_inscription_stores_prepared_spell_without_immediate_effect = {
    val occurrence =
      completedStoredSpellGlyphOccurrence(
        1,
        3,
        1,
        "singleCreature",
        "none",
        false,
        glyphStoredSpellReadiedReleaseProcedure,
        200,
        100,
      )
    all {
      assert(completedStoredSpellGlyphInscriptionAccepted(
        3,
        1,
        "singleCreature",
        "none",
        false,
        glyphStoredSpellReadiedReleaseProcedure,
      )),
      assert(completedStoredSpellGlyphInscriptionAccepted(
        5,
        5,
        "area",
        "none",
        false,
        glyphStoredSpellSaveGatedDamageProcedure,
      )),
      assert(completedStoredSpellGlyphInscriptionAccepted(
        3,
        1,
        "hostileTrap",
        "none",
        false,
        glyphStoredSpellGreaseGroundHazardProcedure,
      )),
      assert(completedStoredSpellGlyphInscriptionAccepted(
        3,
        2,
        "area",
        "none",
        true,
        glyphStoredSpellMoonbeamProcedure,
      )),
      assert(completedStoredSpellGlyphInscriptionAccepted(
        3,
        3,
        "area",
        "none",
        true,
        glyphStoredSpellHypnoticPatternProcedure,
      )),
      assert(completedStoredSpellGlyphInscriptionAccepted(
        3,
        2,
        "harmfulObject",
        "none",
        true,
        glyphStoredSpellSpiritualWeaponAttackProxyProcedure,
      )),
      assert(completedStoredSpellGlyphInscriptionAccepted(
        3,
        2,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellSaveGatedConditionProcedure,
      )),
      assert(completedStoredSpellGlyphInscriptionAccepted(
        3,
        2,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellScalarBuffProcedure,
      )),
      assert(occurrence.active),
      assert(glyphOccurrenceHasStoredSpellRelease(
        occurrence,
        1,
        "singleCreature",
        "none",
        false,
        glyphStoredSpellReadiedReleaseProcedure,
      )),
      assert(not(glyphOccurrenceHasExplosiveRuneRelease(occurrence, "thunder"))),
      assert(occurrence.coveredAreaId == 200),
      assert(occurrence.castLocationId == 100),
    }
  }

  run test_completed_inscription_rejects_below_minimum_spell_level = {
    all {
      assert(not(completedGlyphInscriptionAccepted(2, "thunder"))),
      assert(completedGlyphInscriptionAccepted(3, "thunder")),
      assert(completedGlyphInscriptionAccepted(4, "thunder")),
      assert(not(completedGlyphInscriptionAccepted(3, "force"))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        2,
        1,
        "singleCreature",
        "none",
        false,
        glyphStoredSpellReadiedReleaseProcedure,
      ))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        4,
        "singleCreature",
        "none",
        false,
        glyphStoredSpellReadiedReleaseProcedure,
      ))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        1,
        "selfOnly",
        "none",
        false,
        glyphStoredSpellReadiedReleaseProcedure,
      ))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        1,
        "singleCreature",
        "now",
        false,
        glyphStoredSpellReadiedReleaseProcedure,
      ))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        1,
        "singleCreature",
        "none",
        false,
        "unknownProcedure",
      ))),
      assert(completedStoredSpellGlyphInscriptionAccepted(
        3,
        1,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellSaveGatedConditionProcedure,
      )),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        1,
        "singleCreature",
        "none",
        false,
        glyphStoredSpellSaveGatedConditionProcedure,
      ))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        1,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellReadiedReleaseProcedure,
      ))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        1,
        "area",
        "none",
        true,
        glyphStoredSpellSaveGatedConditionProcedure,
      ))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        2,
        "harmfulObject",
        "none",
        false,
        glyphStoredSpellSpiritualWeaponAttackProxyProcedure,
      ))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        2,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellSpiritualWeaponAttackProxyProcedure,
      ))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        2,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellMoonbeamProcedure,
      ))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        2,
        "area",
        "none",
        false,
        glyphStoredSpellMoonbeamProcedure,
      ))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        3,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellHypnoticPatternProcedure,
      ))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        3,
        "area",
        "none",
        false,
        glyphStoredSpellHypnoticPatternProcedure,
      ))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        2,
        "area",
        "none",
        true,
        glyphStoredSpellScalarBuffProcedure,
      ))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        2,
        "singleCreature",
        "none",
        false,
        glyphStoredSpellScalarBuffProcedure,
      ))),
    }
  }

  run test_stored_concentration_release_uses_full_duration_owner = {
    val occurrence =
      completedStoredSpellGlyphOccurrence(
        1,
        3,
        2,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellSaveGatedConditionProcedure,
        200,
        100,
      )
    val acceptedWitness = StoredSingleCreatureReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      targetId: 10,
    })
    val ended = glyphAfterStoredSpellRelease(occurrence, acceptedWitness)
    all {
      assert(glyphOccurrenceHasStoredSpellRelease(
        occurrence,
        2,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellSaveGatedConditionProcedure,
      )),
      assert(glyphStoredSpellReleaseWitnessAccepted(occurrence, acceptedWitness)),
      assert(glyphStoredSpellReleaseOwner(occurrence) == FullDurationStoredConcentrationOwner),
      assert(not(ended.active)),
    }
  }

  run test_stored_concentration_save_gated_damage_release_uses_full_duration_owner = {
    val occurrence =
      completedStoredSpellGlyphOccurrence(
        1,
        3,
        2,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellSaveGatedDamageProcedure,
        200,
        100,
      )
    val acceptedWitness = StoredSingleCreatureReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      targetId: 10,
    })
    val areaWitness = StoredAreaReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      areaOriginAnchorId: 10,
    })
    val ended = glyphAfterStoredSpellRelease(occurrence, acceptedWitness)
    all {
      assert(glyphOccurrenceHasStoredSpellRelease(
        occurrence,
        2,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellSaveGatedDamageProcedure,
      )),
      assert(glyphStoredSpellReleaseWitnessAccepted(occurrence, acceptedWitness)),
      assert(glyphStoredSpellReleaseOwner(occurrence) == FullDurationStoredConcentrationOwner),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, areaWitness))),
      assert(not(ended.active)),
    }
  }

  run test_stored_single_creature_active_effect_release_uses_full_duration_owner = {
    val occurrence =
      completedStoredSpellGlyphOccurrence(
        1,
        3,
        2,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellScalarBuffProcedure,
        200,
        100,
      )
    val acceptedWitness = StoredSingleCreatureReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      targetId: 10,
    })
    val areaWitness = StoredAreaReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      areaOriginAnchorId: 10,
    })
    val ended = glyphAfterStoredSpellRelease(occurrence, acceptedWitness)
    all {
      assert(completedStoredSpellGlyphInscriptionAccepted(
        3,
        2,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellScalarBuffProcedure,
      )),
      assert(glyphStoredSpellScalarBuffProcedure.in(glyphStoredSpellSingleCreatureActiveEffectProcedures)),
      assert(glyphOccurrenceHasStoredSpellRelease(
        occurrence,
        2,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellScalarBuffProcedure,
      )),
      assert(glyphStoredSpellReleaseWitnessAccepted(occurrence, acceptedWitness)),
      assert(glyphStoredSpellReleaseOwner(occurrence) == FullDurationStoredConcentrationOwner),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, areaWitness))),
      assert(not(ended.active)),
    }
  }

  run test_stored_self_transformation_release_uses_full_duration_owner = {
    val occurrence =
      completedStoredSpellGlyphOccurrence(
        1,
        3,
        2,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellSelfTransformationModeProcedure,
        200,
        100,
      )
    val acceptedWitness = StoredSingleCreatureReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      targetId: 10,
    })
    val areaWitness = StoredAreaReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      areaOriginAnchorId: 10,
    })
    val ended = glyphAfterStoredSpellRelease(occurrence, acceptedWitness)
    all {
      assert(completedStoredSpellGlyphInscriptionAccepted(
        3,
        2,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellSelfTransformationModeProcedure,
      )),
      assert(glyphStoredSpellSelfTransformationModeProcedure.in(glyphStoredSpellSelfTransformationProcedures)),
      assert(glyphOccurrenceHasStoredSpellRelease(
        occurrence,
        2,
        "singleCreature",
        "none",
        true,
        glyphStoredSpellSelfTransformationModeProcedure,
      )),
      assert(glyphStoredSpellReleaseWitnessAccepted(occurrence, acceptedWitness)),
      assert(glyphStoredSpellReleaseOwner(occurrence) == FullDurationStoredConcentrationOwner),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, areaWitness))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        2,
        "area",
        "none",
        true,
        glyphStoredSpellSelfTransformationModeProcedure,
      ))),
      assert(not(completedStoredSpellGlyphInscriptionAccepted(
        3,
        2,
        "singleCreature",
        "none",
        false,
        glyphStoredSpellSelfTransformationModeProcedure,
      ))),
      assert(not(ended.active)),
    }
  }

  run test_stored_area_ongoing_concentration_release_uses_full_duration_owner = {
    val occurrence =
      completedStoredSpellGlyphOccurrence(
        1,
        3,
        2,
        "area",
        "none",
        true,
        glyphStoredSpellMoonbeamProcedure,
        200,
        100,
      )
    val acceptedWitness = StoredAreaReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      areaOriginAnchorId: 10,
    })
    val wrongAreaCenterWitness = StoredAreaReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      areaOriginAnchorId: 11,
    })
    val ended = glyphAfterStoredSpellRelease(occurrence, acceptedWitness)
    all {
      assert(completedStoredSpellGlyphInscriptionAccepted(
        3,
        2,
        "area",
        "none",
        true,
        glyphStoredSpellMoonbeamProcedure,
      )),
      assert(glyphStoredSpellMoonbeamProcedure.in(glyphStoredSpellAreaOngoingProcedures)),
      assert(glyphOccurrenceHasStoredSpellRelease(
        occurrence,
        2,
        "area",
        "none",
        true,
        glyphStoredSpellMoonbeamProcedure,
      )),
      assert(glyphStoredSpellReleaseWitnessAccepted(occurrence, acceptedWitness)),
      assert(glyphStoredSpellReleaseOwner(occurrence) == FullDurationStoredConcentrationOwner),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, wrongAreaCenterWitness))),
      assert(not(ended.active)),
    }
  }

  run test_stored_area_control_concentration_release_uses_full_duration_owner = {
    val occurrence =
      completedStoredSpellGlyphOccurrence(
        1,
        3,
        3,
        "area",
        "none",
        true,
        glyphStoredSpellHypnoticPatternProcedure,
        200,
        100,
      )
    val acceptedWitness = StoredAreaReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      areaOriginAnchorId: 10,
    })
    val wrongAreaCenterWitness = StoredAreaReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      areaOriginAnchorId: 11,
    })
    val wrongSingleCreatureWitness = StoredSingleCreatureReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      targetId: 10,
    })
    val ended = glyphAfterStoredSpellRelease(occurrence, acceptedWitness)
    all {
      assert(completedStoredSpellGlyphInscriptionAccepted(
        3,
        3,
        "area",
        "none",
        true,
        glyphStoredSpellHypnoticPatternProcedure,
      )),
      assert(glyphStoredSpellHypnoticPatternProcedure.in(glyphStoredSpellAreaControlProcedures)),
      assert(glyphOccurrenceHasStoredSpellRelease(
        occurrence,
        3,
        "area",
        "none",
        true,
        glyphStoredSpellHypnoticPatternProcedure,
      )),
      assert(glyphStoredSpellReleaseWitnessAccepted(occurrence, acceptedWitness)),
      assert(glyphStoredSpellReleaseOwner(occurrence) == FullDurationStoredConcentrationOwner),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, wrongAreaCenterWitness))),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, wrongSingleCreatureWitness))),
      assert(not(ended.active)),
    }
  }

  run test_stored_harmful_object_release_requires_close_force_witness_and_fixed_target = {
    val occurrence =
      completedStoredSpellGlyphOccurrence(
        1,
        3,
        2,
        "harmfulObject",
        "none",
        true,
        glyphStoredSpellSpiritualWeaponAttackProxyProcedure,
        200,
        100,
      )
    val placement = {
      subject: "harmful_objects",
      positionId: 300,
      placement: "as_close_as_possible_to_triggering_creature",
      attackTargetId: 10,
      targetReachPositionId: 300,
      forceReachFeet: glyphStoredSpellSpiritualWeaponForceReachFeet,
    }
    val acceptedWitness = StoredHarmfulObjectReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      targetId: 10,
      hostilePlacement: placement,
    })
    val ordinarySingleCreatureWitness = StoredSingleCreatureReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      targetId: 10,
    })
    val wrongTargetWitness = StoredHarmfulObjectReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      targetId: 11,
      hostilePlacement: placement,
    })
    val wrongPlacementTargetWitness = StoredHarmfulObjectReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      targetId: 10,
      hostilePlacement: { ...placement, attackTargetId: 11 },
    })
    val wrongPlacementSubjectWitness = StoredHarmfulObjectReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      targetId: 10,
      hostilePlacement: { ...placement, subject: "traps" },
    })
    val wrongReachPositionWitness = StoredHarmfulObjectReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      targetId: 10,
      hostilePlacement: { ...placement, targetReachPositionId: 301 },
    })
    val ended = glyphAfterStoredSpellRelease(occurrence, acceptedWitness)
    all {
      assert(glyphOccurrenceHasStoredSpellRelease(
        occurrence,
        2,
        "harmfulObject",
        "none",
        true,
        glyphStoredSpellSpiritualWeaponAttackProxyProcedure,
      )),
      assert(glyphStoredSpellReleaseWitnessAccepted(occurrence, acceptedWitness)),
      assert(glyphStoredSpellReleaseOwner(occurrence) == FullDurationStoredConcentrationOwner),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, ordinarySingleCreatureWitness))),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, wrongTargetWitness))),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, wrongPlacementTargetWitness))),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, wrongPlacementSubjectWitness))),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, wrongReachPositionWitness))),
      assert(not(ended.active)),
    }
  }

  run test_trigger_occurrence_does_not_end_glyph_without_release = {
    val occurrence = completedGlyphOccurrence(1, 3, "thunder", 200, 100)
    val spellGlyph =
      completedStoredSpellGlyphOccurrence(
        1,
        3,
        1,
        "singleCreature",
        "none",
        false,
        glyphStoredSpellReadiedReleaseProcedure,
        200,
        100,
      )
    val ended = glyphAfterTriggerOccurrence(occurrence, 1)
    val spellGlyphEnded = glyphAfterTriggerOccurrence(spellGlyph, 1)
    val unrelated = glyphAfterTriggerOccurrence(occurrence, 2)
    all {
      assert(ended.active),
      assert(spellGlyphEnded.active),
      assert(unrelated.active),
    }
  }

  run test_movement_invalidation_requires_matching_cast_location_and_more_than_ten_feet = {
    val occurrence = completedGlyphOccurrence(1, 3, "thunder", 200, 100)
    val exactThreshold = glyphAfterMovementInvalidation(occurrence, 1, 100, 10)
    val wrongCastLocation = glyphAfterMovementInvalidation(occurrence, 1, 200, 11)
    val movedBeyondThreshold = glyphAfterMovementInvalidation(occurrence, 1, 100, 11)
    all {
      assert(exactThreshold.active),
      assert(wrongCastLocation.active),
      assert(not(movedBeyondThreshold.active)),
    }
  }

  run test_explosive_rune_release_requires_matching_area_witness_and_stored_release = {
    val occurrence = completedGlyphOccurrence(1, 5, "thunder", 200, 100)
    val acceptedWitness = {
      triggerOccurrence: { effectId: 1 },
      coveredAreaId: 200,
      affectedTargetCount: 2,
      savingThrowAbility: "dex",
      savingThrowDcSource: "casterSpellSaveDc",
      savingThrowOutcomeCount: 2,
    }
    val wrongAreaWitness = { ...acceptedWitness, coveredAreaId: 201 }
    val wrongSaveAbilityWitness = { ...acceptedWitness, savingThrowAbility: "con" }
    val wrongSaveDcWitness = { ...acceptedWitness, savingThrowDcSource: "fixed" }
    val wrongSaveCountWitness = { ...acceptedWitness, savingThrowOutcomeCount: 1 }
    val wrongReleaseBranchOccurrence =
      completedStoredSpellGlyphOccurrence(
        1,
        5,
        3,
        "area",
        "none",
        false,
        glyphStoredSpellSaveGatedDamageProcedure,
        200,
        100,
      )
    val wrongDamageTypeOccurrence = completedGlyphOccurrence(1, 5, "force", 200, 100)
    all {
      assert(glyphExplosiveRuneReleaseWitnessAccepted(occurrence, acceptedWitness)),
      assert(not(glyphExplosiveRuneReleaseWitnessAccepted(occurrence, wrongAreaWitness))),
      assert(not(glyphExplosiveRuneReleaseWitnessAccepted(occurrence, wrongSaveAbilityWitness))),
      assert(not(glyphExplosiveRuneReleaseWitnessAccepted(occurrence, wrongSaveDcWitness))),
      assert(not(glyphExplosiveRuneReleaseWitnessAccepted(occurrence, wrongSaveCountWitness))),
      assert(not(glyphExplosiveRuneReleaseWitnessAccepted(wrongReleaseBranchOccurrence, acceptedWitness))),
      assert(not(glyphExplosiveRuneReleaseWitnessAccepted(wrongDamageTypeOccurrence, acceptedWitness))),
    }
  }

  run test_explosive_rune_release_scales_damage_and_halves_successful_saves = {
    val occurrence = completedGlyphOccurrence(1, 5, "thunder", 200, 100)
    all {
      assert(glyphExplosiveRuneDamageDice(3) == 5),
      assert(glyphExplosiveRuneDamageDice(5) == 7),
      assert(glyphExplosiveRuneRadiusFeet == 20),
      assert(glyphExplosiveRuneDamageDieSize == 8),
      assert(glyphExplosiveRuneDamageDice(occurrence.sourceSpellLevel) == 7),
      assert(glyphExplosiveRuneDamageOnSave(27, false) == 27),
      assert(glyphExplosiveRuneDamageOnSave(27, true) == 13),
    }
  }

  run test_explosive_rune_release_ends_matching_glyph_after_release = {
    val occurrence = completedGlyphOccurrence(1, 3, "fire", 200, 100)
    val releaseWitness = {
      triggerOccurrence: { effectId: 1 },
      coveredAreaId: 200,
      affectedTargetCount: 1,
      savingThrowAbility: "dex",
      savingThrowDcSource: "casterSpellSaveDc",
      savingThrowOutcomeCount: 1,
    }
    val ended = glyphAfterExplosiveRuneRelease(occurrence, releaseWitness)
    val unrelated = glyphAfterExplosiveRuneRelease(
      occurrence,
      { ...releaseWitness, triggerOccurrence: { effectId: 2 } },
    )
    all {
      assert(not(ended.active)),
      assert(unrelated.active),
    }
  }

  run test_stored_spell_release_targets_triggering_creature_and_ends_glyph = {
    val occurrence =
      completedStoredSpellGlyphOccurrence(
        1,
        3,
        1,
        "singleCreature",
        "none",
        false,
        glyphStoredSpellReadiedReleaseProcedure,
        200,
        100,
      )
    val acceptedWitness = StoredSingleCreatureReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      targetId: 10,
    })
    val wrongTargetWitness = StoredSingleCreatureReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      targetId: 11,
    })
    val wrongShapeWitness = StoredAreaReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      areaOriginAnchorId: 10,
    })
    val ended = glyphAfterStoredSpellRelease(occurrence, acceptedWitness)
    all {
      assert(glyphStoredSpellReleaseWitnessAccepted(occurrence, acceptedWitness)),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, wrongTargetWitness))),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, wrongShapeWitness))),
      assert(not(ended.active)),
    }
  }

  run test_stored_spell_area_release_centers_on_triggering_creature = {
    val occurrence =
      completedStoredSpellGlyphOccurrence(
        1,
        3,
        3,
        "area",
        "none",
        false,
        glyphStoredSpellSaveGatedDamageProcedure,
        200,
        100,
      )
    val acceptedWitness = StoredAreaReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      areaOriginAnchorId: 10,
    })
    val wrongAreaCenterWitness = StoredAreaReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      areaOriginAnchorId: 11,
    })
    val ended = glyphAfterStoredSpellRelease(occurrence, acceptedWitness)
    all {
      assert(glyphStoredSpellReleaseWitnessAccepted(occurrence, acceptedWitness)),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, wrongAreaCenterWitness))),
      assert(not(ended.active)),
    }
  }

  run test_stored_hostile_trap_release_requires_close_placement_witness = {
    val occurrence =
      completedStoredSpellGlyphOccurrence(
        1,
        3,
        1,
        "hostileTrap",
        "none",
        false,
        glyphStoredSpellGreaseGroundHazardProcedure,
        200,
        100,
      )
    val placement = {
      subject: "traps",
      areaId: 300,
      placement: "as_close_as_possible_to_triggering_creature",
      attackTargetId: 10,
    }
    val acceptedWitness = StoredHostileTrapReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      areaOriginAnchorId: 10,
      hostilePlacement: placement,
    })
    val ordinaryAreaWitness = StoredAreaReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      areaOriginAnchorId: 10,
    })
    val wrongPlacementTargetWitness = StoredHostileTrapReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      areaOriginAnchorId: 10,
      hostilePlacement: { ...placement, attackTargetId: 11 },
    })
    val wrongPlacementSubjectWitness = StoredHostileTrapReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      areaOriginAnchorId: 10,
      hostilePlacement: { ...placement, subject: "harmful_objects" },
    })
    val wrongAreaCenterWitness = StoredHostileTrapReleaseWitness({
      triggerOccurrence: { effectId: 1 },
      triggeringCreatureId: 10,
      areaOriginAnchorId: 11,
      hostilePlacement: placement,
    })
    val ended = glyphAfterStoredSpellRelease(occurrence, acceptedWitness)
    all {
      assert(glyphStoredSpellReleaseWitnessAccepted(occurrence, acceptedWitness)),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, ordinaryAreaWitness))),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, wrongPlacementTargetWitness))),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, wrongPlacementSubjectWitness))),
      assert(not(glyphStoredSpellReleaseWitnessAccepted(occurrence, wrongAreaCenterWitness))),
      assert(not(ended.active)),
    }
  }
}
