// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-created-held-object
// Spell invocation reference projections extracted from spells-holes-fills.ts.

import { Match } from "effect";
import { spellId } from "../identity.ts";
import {
  type SpellInvocationRef,
  classFeatureFreeCastSpellInvocationRef,
  spellEffectInvocationRef,
} from "../battle-subjects.ts";
import {
  isPreparedDamageSpellSource,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import { damageReductionProfile } from "./spell-procedure-profiles/damage-reduction.ts";
import { conditionImmunityAndTurnStartTemporaryHitPointsProfile } from "./spell-procedure-profiles/condition-immunity-turn-start-temporary-hit-points.ts";
import { conditionRemovalProtectionProfile } from "./spell-procedure-profiles/condition-removal-protection.ts";
import { creatureSizeChangeProfile } from "./spell-procedure-profiles/creature-size-change.ts";
import { creatureTypeProtectionProfile } from "./spell-procedure-profiles/creature-type-protection.ts";
import { directConditionProfile } from "./spell-procedure-profiles/direct-condition.ts";
import { directConditionRemovalProfile } from "./spell-procedure-profiles/direct-condition-removal.ts";
import { directHitPointRestorationProfile } from "./spell-procedure-profiles/direct-hit-point-restoration.ts";
import { dragonsBreathInitialProfile } from "./spell-procedure-profiles/dragons-breath-initial.ts";
import { expeditiousRetreatDashProfile } from "./spell-procedure-profiles/expeditious-retreat-dash.ts";
import { featherFallMitigationProfile } from "./spell-procedure-profiles/feather-fall-mitigation.ts";
import { greaseGroundHazardProfile } from "./spell-procedure-profiles/grease-ground-hazard.ts";
import { heldLightProfile } from "./spell-procedure-profiles/held-light.ts";
import { hideousLaughterProfile } from "./spell-procedure-profiles/hideous-laughter.ts";
import { jumpMovementReplacementProfile } from "./spell-procedure-profiles/jump-movement-replacement.ts";
import { levitatedCreatureProfile } from "./spell-procedure-profiles/levitated-creature.ts";
import { makeStableProfile } from "./spell-procedure-profiles/make-stable.ts";
import { magicWeaponEnhancementProfile } from "./spell-procedure-profiles/magic-weapon-enhancement.ts";
import { markedDamageRiderProfile } from "./spell-procedure-profiles/marked-damage-rider.ts";
import { objectLightProfile } from "./spell-procedure-profiles/object-light.ts";
import { blurAttackRollDefenseProfile } from "./spell-procedure-profiles/blur-attack-roll-defense.ts";
import { commandProfile } from "./spell-procedure-profiles/command.ts";
import { counterspellProfile } from "./spell-procedure-profiles/counterspell.ts";
import { attackBurstSaveDamageProfile } from "./spell-procedure-profiles/attack-burst-save-damage.ts";
import { chainedSpellAttackDamageProfile } from "./spell-procedure-profiles/chained-spell-attack-damage.ts";
import { persistentArmorEffectProfile } from "./spell-procedure-profiles/persistent-armor-effect.ts";
import { repeatedDamageAllocationProfile } from "./spell-procedure-profiles/repeated-damage-allocation.ts";
import { rollModifierProfile } from "./spell-procedure-profiles/roll-modifier.ts";
import { sanctuaryTargetingInterdictionProfile } from "./spell-procedure-profiles/sanctuary-targeting-interdiction.ts";
import { saveGatedAttackRollAdvantageProfile } from "./spell-procedure-profiles/save-gated-attack-roll-advantage.ts";
import { saveGatedConditionImmunityProfile } from "./spell-procedure-profiles/save-gated-condition-immunity.ts";
import { saveGatedConditionProfile } from "./spell-procedure-profiles/save-gated-condition.ts";
import { saveGatedDamageProfile } from "./spell-procedure-profiles/save-gated-damage.ts";
import { scalarBuffProfile } from "./spell-procedure-profiles/scalar-buff.ts";
import { seeInvisibleObserverSightProfile } from "./spell-procedure-profiles/see-invisible-observer-sight.ts";
import { selfTransformationModeProfile } from "./spell-procedure-profiles/self-transformation-mode.ts";
import { selfTeleportProfile } from "./spell-procedure-profiles/self-teleport.ts";
import { shieldReactionProfile } from "./spell-procedure-profiles/shield-reaction.ts";
import { sleepTargetAdmissionProfile } from "./spell-procedure-profiles/sleep-target-admission.ts";
import { spellAttackDamageProfile } from "./spell-procedure-profiles/spell-attack-damage.ts";
import { spellAttackSequenceProfile } from "./spell-procedure-profiles/spell-attack-sequence.ts";
import { spellHostedWeaponAttackProfile } from "./spell-procedure-profiles/spell-hosted-weapon-attack.ts";
import { thaumaturgyBoomingVoiceProfile } from "./spell-procedure-profiles/thaumaturgy-booming-voice.ts";
import { wardingBondProfile } from "./spell-procedure-profiles/warding-bond.ts";
import { weaponAttackOverrideProfile } from "./spell-procedure-profiles/weapon-attack-override.ts";
import { weaponDamageRiderProfile } from "./spell-procedure-profiles/weapon-damage-rider.ts";

export function supportedSpellInvocationRef(
  invocation: SupportedSpellInvocation,
): SpellInvocationRef {
  if (isCreatureSizeChangeSpellInvocation(invocation)) {
    return creatureSizeChangeProfile.invocationRef(invocation);
  }
  if (isLevitatedCreatureSpellInvocation(invocation)) {
    return levitatedCreatureProfile.invocationRef(invocation);
  }
  if (invocation.procedure === "afterHitDamage") {
    if (invocation.resource.tag === "classFeatureFreeCast") {
      return classFeatureFreeCastSpellInvocationRef(
        invocation.spell.id,
        invocation.resource.resourceUnitId,
        "afterHitDamage",
      );
    }
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "afterHitDamage",
    };
  }
  if (invocation.procedure === "afterHitSaveGatedCondition") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "afterHitSaveGatedCondition",
    };
  }
  if (invocation.procedure === "afterHitTimedDamageAndSave") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "afterHitTimedDamageAndSave",
    };
  }
  if (invocation.procedure === "afterHitDamageAndIllumination") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "afterHitDamageAndIllumination",
    };
  }
  if (invocation.procedure === "spellHostedWeaponAttack") {
    return spellHostedWeaponAttackProfile.invocationRef(invocation);
  }
  if (invocation.procedure === "weaponAttackOverride") {
    return weaponAttackOverrideProfile.invocationRef(invocation);
  }
  if (invocation.procedure === "wardingBond") {
    return wardingBondProfile.invocationRef(invocation);
  }
  if (invocation.procedure === "sleepTargetAdmission") {
    return sleepTargetAdmissionProfile.invocationRef(invocation);
  }
  if (invocation.procedure === "hideousLaughter") {
    return hideousLaughterProfile.invocationRef(invocation);
  }
  if (invocation.procedure === "abilityD20TestRollModeSaveGate") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "abilityD20TestRollModeSaveGate",
    };
  }
  if (invocation.procedure === "greaseGroundHazard") {
    return greaseGroundHazardProfile.invocationRef(invocation);
  }
  if (invocation.procedure === "gustOfWindLine") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "gustOfWindLine",
    };
  }
  if (invocation.procedure === "fogCloudObscurement") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "fogCloudObscurement",
    };
  }
  if (invocation.procedure === "magicalDarknessPointOrigin") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "magicalDarknessPointOrigin",
    };
  }
  if (invocation.procedure === "antimagicFieldOngoingSpellSuppression") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "antimagicFieldOngoingSpellSuppression",
    };
  }
  if (invocation.procedure === "webRestraintHazard") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "webRestraintHazard",
    };
  }
  if (invocation.procedure === "flamingSphere") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "flamingSphere",
    };
  }
  if (invocation.procedure === "spiritualWeaponAttackProxy") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "spiritualWeaponAttackProxy",
    };
  }
  if (invocation.procedure === "spikeGrowthMovementHazard") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "spikeGrowthMovementHazard",
    };
  }
  if (invocation.procedure === "moonbeam") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "moonbeam",
    };
  }
  if (invocation.procedure === "objectContactDamage") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "objectContactDamage",
    };
  }
  if (invocation.procedure === "objectContactDamageRepeat") {
    return spellEffectInvocationRef(
      invocation.spell.id,
      invocation.activeEffect.sourceCombatantId,
      "objectContactDamageRepeat",
    );
  }
  if (invocation.procedure === "spiritualWeaponRepeatAttack") {
    return spellEffectInvocationRef(
      invocation.spell.id,
      invocation.activeEffect.sourceCombatantId,
      "spiritualWeaponRepeatAttack",
    );
  }
  if (invocation.procedure === "spellCreatedHeldObject") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "spellCreatedHeldObject",
    };
  }
  if (invocation.procedure === "spellCreatedHeldObjectAttack") {
    return spellEffectInvocationRef(
      invocation.spell.id,
      invocation.activeEffect.sourceCombatantId,
      "spellCreatedHeldObjectAttack",
    );
  }
  if (invocation.procedure === "spellCreatedHeldObjectReEvoke") {
    return spellEffectInvocationRef(
      invocation.spell.id,
      invocation.activeEffect.sourceCombatantId,
      "spellCreatedHeldObjectReEvoke",
    );
  }
  if (invocation.procedure === "command") {
    return commandProfile.invocationRef(invocation);
  }
  if (invocation.procedure === "spellAttackSequence") {
    return spellAttackSequenceProfile.invocationRef(invocation);
  }
  if (invocation.procedure === "expeditiousRetreatDash") {
    return expeditiousRetreatDashProfile.invocationRef(invocation);
  }
  if (invocation.procedure === "selfTransformationMode") {
    return selfTransformationModeProfile.invocationRef(invocation);
  }
  if (invocation.procedure === "jumpMovementReplacement") {
    return jumpMovementReplacementProfile.invocationRef(invocation);
  }
  if (invocation.procedure === "dragonsBreathInitial") {
    return dragonsBreathInitialProfile.invocationRef(invocation);
  }
  if (invocation.procedure === "selfTeleport") {
    return selfTeleportProfile.invocationRef(invocation);
  }
  if (invocation.procedure === "featherFallMitigation") {
    return featherFallMitigationProfile.invocationRef(invocation);
  }
  if (invocation.procedure === "counterspell") {
    return counterspellProfile.invocationRef(invocation);
  }
  if (invocation.procedure === "shieldReaction") {
    return shieldReactionProfile.invocationRef(invocation);
  }
  if (invocation.procedure === "sanctuaryTargetingInterdiction") {
    return sanctuaryTargetingInterdictionProfile.invocationRef(invocation);
  }
  if (invocation.procedure === "directCondition") {
    return directConditionProfile.invocationRef(invocation);
  }
  if (invocation.procedure === "directConditionRemoval") {
    return directConditionRemovalProfile.invocationRef(invocation);
  }
  if (invocation.procedure === "objectLight") {
    return objectLightProfile.invocationRef(invocation);
  }
  if (invocation.procedure === "ongoingSpellEnd") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "ongoingSpellEnd",
    };
  }
  if (invocation.procedure === "dancingLightsSeparateCast") {
    return {
      tag: "cantrip",
      spellId: spellId(invocation.spell.id),
      procedure: "dancingLightsSeparateCast",
    };
  }
  if (invocation.procedure === "dancingLightsCombinedCast") {
    return {
      tag: "cantrip",
      spellId: spellId(invocation.spell.id),
      procedure: "dancingLightsCombinedCast",
    };
  }
  if (invocation.procedure === "dancingLightsReposition") {
    return {
      tag: "cantrip",
      spellId: spellId(invocation.spell.id),
      procedure: "dancingLightsReposition",
    };
  }
  if (invocation.procedure === "makeStable") {
    return makeStableProfile.invocationRef(invocation);
  }
  if (invocation.procedure === "thaumaturgyBoomingVoice") {
    return thaumaturgyBoomingVoiceProfile.invocationRef(invocation);
  }
  if (invocation.procedure === "blurAttackRollDefense") {
    return blurAttackRollDefenseProfile.invocationRef(invocation);
  }
  if (invocation.procedure === "seeInvisibleObserverSight") {
    return seeInvisibleObserverSightProfile.invocationRef(invocation);
  }
  if (invocation.procedure === "mirrorImageHitInterception") {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: "mirrorImageHitInterception",
    };
  }
  if (invocation.procedure === "conditionRemovalProtection") {
    return conditionRemovalProtectionProfile.invocationRef(invocation);
  }
  if (invocation.procedure === "saveGatedConditionImmunity") {
    return saveGatedConditionImmunityProfile.invocationRef(invocation);
  }
  if (invocation.procedure === "magicWeaponEnhancement") {
    return magicWeaponEnhancementProfile.invocationRef(invocation);
  }
  return Match.value(invocation).pipe(
    Match.when({ procedure: "heldLight" }, (cantrip) =>
      heldLightProfile.invocationRef(cantrip),
    ),
    Match.when({ procedure: "damageReduction" }, (cantrip) =>
      damageReductionProfile.invocationRef(cantrip),
    ),
    Match.when({ procedure: "repeatedDamageAllocation" }, (slotSpell) =>
      repeatedDamageAllocationProfile.invocationRef(slotSpell),
    ),
    Match.when({ procedure: "attackBurstSaveDamage" }, (slotSpell) =>
      attackBurstSaveDamageProfile.invocationRef(slotSpell),
    ),
    Match.when({ procedure: "chainedSpellAttackDamage" }, (slotSpell) =>
      chainedSpellAttackDamageProfile.invocationRef(slotSpell),
    ),
    Match.when({ procedure: "heldLightHurl" }, damageSpellInvocationRef),
    Match.when({ procedure: "spellAttackDamage" }, (spellAttackDamage) =>
      spellAttackDamageProfile.invocationRef(spellAttackDamage),
    ),
    Match.when({ procedure: "saveGatedDamage" }, (saveGatedDamage) =>
      saveGatedDamageProfile.invocationRef(saveGatedDamage),
    ),
    Match.when({ procedure: "saveGatedCondition" }, (saveGatedCondition) =>
      saveGatedConditionProfile.invocationRef(saveGatedCondition),
    ),
    Match.when(
      { procedure: "saveGatedAttackRollAdvantage" },
      (attackRollAdvantageSpell) =>
        saveGatedAttackRollAdvantageProfile.invocationRef(
          attackRollAdvantageSpell,
        ),
    ),
    Match.when({ procedure: "scalarBuff" }, (buffSpell) =>
      scalarBuffProfile.invocationRef(buffSpell),
    ),
    Match.when({ procedure: "rollModifier" }, (modifierSpell) =>
      rollModifierProfile.invocationRef(modifierSpell),
    ),
    Match.when({ procedure: "creatureTypeProtection" }, (protectionSpell) =>
      creatureTypeProtectionProfile.invocationRef(protectionSpell),
    ),
    Match.when(
      { procedure: "conditionImmunityAndTurnStartTemporaryHitPoints" },
      (heroism) =>
        conditionImmunityAndTurnStartTemporaryHitPointsProfile.invocationRef(
          heroism,
        ),
    ),
    Match.when({ procedure: "weaponDamageRider" }, (riderSpell) =>
      weaponDamageRiderProfile.invocationRef(riderSpell),
    ),
    Match.when({ procedure: "markedDamageRider" }, (riderSpell) =>
      markedDamageRiderProfile.invocationRef(riderSpell),
    ),
    Match.when({ procedure: "persistentArmorEffect" }, (persistent) =>
      persistentArmorEffectProfile.invocationRef(persistent),
    ),
    Match.when({ procedure: "directHitPointRestoration" }, (healing) =>
      directHitPointRestorationProfile.invocationRef(healing),
    ),
    Match.exhaustive,
  );
}

function isCreatureSizeChangeSpellInvocation(
  invocation: SupportedSpellInvocation,
): invocation is Extract<
  SupportedSpellInvocation,
  { readonly procedure: "creatureSizeIncrease" | "creatureSizeDecrease" }
> {
  return (
    invocation.procedure === "creatureSizeIncrease" ||
    invocation.procedure === "creatureSizeDecrease"
  );
}

function isLevitatedCreatureSpellInvocation(
  invocation: SupportedSpellInvocation,
): invocation is Extract<
  SupportedSpellInvocation,
  { readonly procedure: "levitatedCreature" }
> {
  return invocation.procedure === "levitatedCreature";
}

export function damageSpellInvocationRef(
  invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "heldLightHurl"
        | "spellAttackSequence"
        | "spellAttackDamage"
        | "saveGatedDamage";
    }
  >,
): SpellInvocationRef {
  if (
    invocation.procedure !== "heldLightHurl" &&
    isPreparedDamageSpellSource(invocation)
  ) {
    return {
      tag: "spellSlot",
      spellId: spellId(invocation.spell.id),
      slotLevel: invocation.resource.slotLevel,
      procedure: invocation.procedure,
    };
  }
  return {
    tag: "cantrip",
    spellId: spellId(invocation.spell.id),
    procedure: invocation.procedure,
  };
}

export function sameSpellInvocationRef(
  left: SpellInvocationRef,
  right: SpellInvocationRef,
): boolean {
  if (
    left.tag !== right.tag ||
    left.spellId !== right.spellId ||
    left.procedure !== right.procedure
  ) {
    return false;
  }
  if (left.tag === "cantrip" && right.tag === "cantrip") {
    return true;
  }
  if (left.tag === "spellEffect" && right.tag === "spellEffect") {
    return left.sourceCombatantId === right.sourceCombatantId;
  }
  if (
    left.tag === "classFeatureFreeCast" &&
    right.tag === "classFeatureFreeCast"
  ) {
    return left.resourceUnitId === right.resourceUnitId;
  }
  if (left.tag === "armorOfShadows" && right.tag === "armorOfShadows") {
    return true;
  }
  return left.tag === "spellSlot" && right.tag === "spellSlot"
    ? left.slotLevel === right.slotLevel
    : false;
}

export function supportedSpellInvocationMatchesRef(
  invocation: SupportedSpellInvocation,
  ref: SpellInvocationRef,
): boolean {
  return sameSpellInvocationRef(supportedSpellInvocationRef(invocation), ref);
}
