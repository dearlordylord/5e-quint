// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-created-held-object
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-object-contact-damage
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ongoing-spell-ending
// Spell profile predicates and projections (Cluster O). Mechanical extraction
// from battle-reducer.ts. Aggregates: per-procedure `supported*Profile`
// predicates, spell-specific authoring bodies (faerieFire, animalFriendship,
// colorSpray, entangle), targeting/range/cost helpers, shape predicates,
// and equality helpers.
//
// O is a leaf cluster within the spells subsystem: it depends on Q
// (spell-effects), domain constants/types from `../battle-reducer.ts`, and
// surface types only. Consumers are K (discovery), P (holes/fills), L
// (resolve), and F (turn).

// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-flaming-sphere-hazard-ram
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spike-growth-movement-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-web-restraint-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magical-darkness-point-origin
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-antimagic-field-ongoing-spell-suppression
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-levitated-creature
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE

import {
  elapsedTimeTicksFromTimeSpanDuration,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";
import {
  type BattleCreatureState,
  type BattleState,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { CharacterBattleSpellcastingState } from "../character-battle-resources.ts";
import {
  effectiveCharacterBattleCantrips,
  effectiveCharacterBattlePreparedSpells,
} from "../character-battle-resources.ts";
import { parseBattleSpellEffectLevel } from "./spells-effective-level.ts";

import {
  sameStringSet,
  supportedDamageAmountExpr,
} from "./spells-profile-shared.ts";
import { hasSaveGateRepeatSaves } from "./spell-procedure-profiles/_save-gate-helpers.ts";
import { chainedSpellAttackDamageProfile } from "./spell-procedure-profiles/chained-spell-attack-damage.ts";
import { attackBurstSaveDamageProfile } from "./spell-procedure-profiles/attack-burst-save-damage.ts";
import { spellHostedWeaponAttackProfile } from "./spell-procedure-profiles/spell-hosted-weapon-attack.ts";
import { weaponAttackOverrideProfile } from "./spell-procedure-profiles/weapon-attack-override.ts";
export * from "./spells-profiles-attack-damage.ts";

const DISPEL_MAGIC_TARGET_KINDS = [
  "creature",
  "object",
  "magical_effect",
] as const;

type OngoingOperationEffect = Extract<
  SpellRecord["mechanics"],
  { readonly family: "ongoing_effect" }
>["operations"][number]["effect"];
type OngoingOperation = Extract<
  SpellRecord["mechanics"],
  { readonly family: "ongoing_effect" }
>["operations"][number];
type OngoingSaveGateEffect = Extract<
  OngoingOperationEffect,
  { readonly kind: "save_gate" }
>;
type WebRestraintSaveEffect = OngoingSaveGateEffect & {
  readonly onFail: Extract<
    OngoingSaveGateEffect["onFail"],
    { readonly kind: "apply_condition_while_in_area_or_until_escape" }
  >;
};
import { abilityD20TestRollModeSaveGateProfile } from "./spell-procedure-profiles/ability-d20-test-roll-mode-save-gate.ts";
import { afterHitDamageProfile } from "./spell-procedure-profiles/after-hit-damage.ts";
import { afterHitSaveGatedConditionProfile } from "./spell-procedure-profiles/after-hit-save-gated-condition.ts";
import { damageReductionProfile } from "./spell-procedure-profiles/damage-reduction.ts";
import { blurAttackRollDefenseProfile } from "./spell-procedure-profiles/blur-attack-roll-defense.ts";
import { commandProfile } from "./spell-procedure-profiles/command.ts";
import { heldLightProfile } from "./spell-procedure-profiles/held-light.ts";
import { heldLightHurlProfile } from "./spell-procedure-profiles/held-light-hurl.ts";
import { hideousLaughterProfile } from "./spell-procedure-profiles/hideous-laughter.ts";
import { makeStableProfile } from "./spell-procedure-profiles/make-stable.ts";
import { magicWeaponEnhancementProfile } from "./spell-procedure-profiles/magic-weapon-enhancement.ts";
import { markedDamageRiderProfile } from "./spell-procedure-profiles/marked-damage-rider.ts";
import { objectLightProfile } from "./spell-procedure-profiles/object-light.ts";
import {
  objectContactDamageProfile,
  objectContactDamageRepeatProfile,
} from "./spell-procedure-profiles/object-contact-damage.ts";
import {
  admitPersistentArmorEffectInvocationSpellAccess,
  persistentArmorEffectProfile,
} from "./spell-procedure-profiles/persistent-armor-effect.ts";
import { conditionRemovalProtectionProfile } from "./spell-procedure-profiles/condition-removal-protection.ts";
import { conditionImmunityAndTurnStartTemporaryHitPointsProfile } from "./spell-procedure-profiles/condition-immunity-turn-start-temporary-hit-points.ts";
import { counterspellProfile } from "./spell-procedure-profiles/counterspell.ts";
import { creatureSizeChangeProfile } from "./spell-procedure-profiles/creature-size-change.ts";
import { creatureTypeProtectionProfile } from "./spell-procedure-profiles/creature-type-protection.ts";
import { directConditionProfile } from "./spell-procedure-profiles/direct-condition.ts";
import { directConditionRemovalProfile } from "./spell-procedure-profiles/direct-condition-removal.ts";
import { directHitPointRestorationProfile } from "./spell-procedure-profiles/direct-hit-point-restoration.ts";
import {
  dancingLightsCombinedCastProfile,
  dancingLightsRepositionProfile,
  dancingLightsSeparateCastProfile,
} from "./spell-procedure-profiles/dancing-lights.ts";
import { dragonsBreathInitialProfile } from "./spell-procedure-profiles/dragons-breath-initial.ts";
import { expeditiousRetreatDashProfile } from "./spell-procedure-profiles/expeditious-retreat-dash.ts";
import { featherFallMitigationProfile } from "./spell-procedure-profiles/feather-fall-mitigation.ts";
import { flamingSphereProfile } from "./spell-procedure-profiles/flaming-sphere.ts";
import { fogCloudObscurementProfile } from "./spell-procedure-profiles/fog-cloud-obscurement.ts";
import { greaseGroundHazardProfile } from "./spell-procedure-profiles/grease-ground-hazard.ts";
import { gustOfWindLineProfile } from "./spell-procedure-profiles/gust-of-wind-line.ts";
import { jumpMovementReplacementProfile } from "./spell-procedure-profiles/jump-movement-replacement.ts";
import { levitatedCreatureProfile } from "./spell-procedure-profiles/levitated-creature.ts";
import { mirrorImageHitInterceptionProfile } from "./spell-procedure-profiles/mirror-image-hit-interception.ts";
import { moonbeamProfile } from "./spell-procedure-profiles/moonbeam.ts";
import { repeatedDamageAllocationProfile } from "./spell-procedure-profiles/repeated-damage-allocation.ts";
import { rollModifierProfile } from "./spell-procedure-profiles/roll-modifier.ts";
import { sanctuaryTargetingInterdictionProfile } from "./spell-procedure-profiles/sanctuary-targeting-interdiction.ts";
import { saveGatedAttackRollAdvantageProfile } from "./spell-procedure-profiles/save-gated-attack-roll-advantage.ts";
import { saveGatedConditionProfile } from "./spell-procedure-profiles/save-gated-condition.ts";
import { saveGatedConditionImmunityProfile } from "./spell-procedure-profiles/save-gated-condition-immunity.ts";
import { saveGatedDamageProfile } from "./spell-procedure-profiles/save-gated-damage.ts";
import { scalarBuffProfile } from "./spell-procedure-profiles/scalar-buff.ts";
import { seeInvisibleObserverSightProfile } from "./spell-procedure-profiles/see-invisible-observer-sight.ts";
import { selfTransformationModeProfile } from "./spell-procedure-profiles/self-transformation-mode.ts";
import { selfTeleportProfile } from "./spell-procedure-profiles/self-teleport.ts";
import { shieldReactionProfile } from "./spell-procedure-profiles/shield-reaction.ts";
import { sleepTargetAdmissionProfile } from "./spell-procedure-profiles/sleep-target-admission.ts";
import { spikeGrowthMovementHazardProfile } from "./spell-procedure-profiles/spike-growth-movement-hazard.ts";
import { spellAttackDamageProfile } from "./spell-procedure-profiles/spell-attack-damage.ts";
import { spellAttackSequenceProfile } from "./spell-procedure-profiles/spell-attack-sequence.ts";
import {
  spellCreatedHeldObjectAttackProfile,
  spellCreatedHeldObjectProfile,
  spellCreatedHeldObjectReEvokeProfile,
} from "./spell-procedure-profiles/spell-created-held-object.ts";
import {
  spiritualWeaponAttackProxyProfile,
  spiritualWeaponRepeatAttackProfile,
} from "./spell-procedure-profiles/spiritual-weapon.ts";
import { thaumaturgyBoomingVoiceProfile } from "./spell-procedure-profiles/thaumaturgy-booming-voice.ts";
import { wardingBondProfile } from "./spell-procedure-profiles/warding-bond.ts";
import { weaponDamageRiderProfile } from "./spell-procedure-profiles/weapon-damage-rider.ts";
import { afterHitDamageAndIlluminationProfile } from "./spell-procedure-profiles/after-hit-damage-and-illumination.ts";
import { afterHitTimedDamageAndSaveProfile } from "./spell-procedure-profiles/after-hit-timed-damage-and-save.ts";
import { spellAdmissionContextFor } from "./spell-procedure-profiles/profile.ts";
export * from "./spells-profiles-support.ts";
export {
  animalFriendshipSaveGateConditionSpell,
  areaSaveGateSpellRangeFeet,
  charmPersonSaveGateConditionSpell,
  colorSpraySaveGateConditionSpell,
  entangleSaveGateConditionSpell,
  faerieFireSaveGateAttackRollAdvantageSpell,
  hasSaveGateRepeatSaves,
  isViciousMockeryNextAttackRiderShape,
  saveGateTargeting,
  supportedCantripSaveGateDamageProfile,
  supportedFailedSavePostDamageRiders,
  supportedPreparedSaveGateAttackRollAdvantageProfile,
  supportedPreparedSaveGateConditionProfile,
  supportedPreparedSaveGateConditionImmunityProfile,
  supportedPreparedSaveGateDamageProfile,
  supportedSaveGateConditionSpell,
  supportedSaveGateDamageProfile,
  supportedSaveGateFailedSaveEffects,
} from "./spell-procedure-profiles/_save-gate-helpers.ts";
export {
  diceExprWithDelta,
  singleTargetSpellRangeFeet,
  supportedDamageAmountExpr,
  supportedRepeatedEffectCount,
} from "./spells-profile-shared.ts";
export { supportedPreparedSleepTargetAdmissionProfile } from "./spell-procedure-profiles/sleep-target-admission.ts";
export { supportedPreparedHideousLaughterProfile } from "./spell-procedure-profiles/hideous-laughter.ts";
export { supportedPreparedGreaseGroundHazardProfile } from "./spell-procedure-profiles/grease-ground-hazard.ts";
export { supportedPreparedCommandProfile } from "./spell-procedure-profiles/command.ts";

type ActivationPhase = Extract<
  SpellRecord["mechanics"],
  { readonly family: "activation" }
>["phases"][number];

export function supportedSpellActs(
  actor: BattleCreatureState,
  state?: BattleState,
): readonly SupportedSpellInvocation[] {
  if (actor.origin.kind !== "character") {
    return [];
  }
  const spellcasting = actor.origin.spellcasting;
  if (spellcasting === undefined || !spellcasting.canCastSpells) {
    return [];
  }
  const preparedSpells = effectiveCharacterBattlePreparedSpells(spellcasting);
  const cantrips = effectiveCharacterBattleCantrips(spellcasting);
  const admissionContext = spellAdmissionContextFor(actor, state);
  if (admissionContext === null) {
    return [];
  }

  return [
    ...preparedSpells.flatMap((spell) =>
      repeatedDamageAllocationProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      spellAttackSequenceProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      spellAttackDamageProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      chainedSpellAttackDamageProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      attackBurstSaveDamageProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      saveGatedDamageProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      saveGatedConditionProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      saveGatedAttackRollAdvantageProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      abilityD20TestRollModeSaveGateProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      saveGatedConditionImmunityProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      sleepTargetAdmissionProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      hideousLaughterProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      greaseGroundHazardProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      gustOfWindLineProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      fogCloudObscurementProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedMagicalDarknessPointOriginProfile(
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedAntimagicFieldOngoingSpellSuppressionProfile(
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      flamingSphereProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      spiritualWeaponAttackProxyProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      spikeGrowthMovementHazardProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      moonbeamProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedWebRestraintHazardProfile(
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      objectContactDamageProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      objectContactDamageRepeatProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      spiritualWeaponRepeatAttackProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      commandProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      scalarBuffProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      selfTransformationModeProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      rollModifierProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      creatureSizeChangeProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      levitatedCreatureProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      wardingBondProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      creatureTypeProtectionProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      blurAttackRollDefenseProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      seeInvisibleObserverSightProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      mirrorImageHitInterceptionProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      conditionRemovalProtectionProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      objectLightProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedOngoingSpellEndSpellProfile(
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      spellCreatedHeldObjectProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      spellCreatedHeldObjectAttackProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      spellCreatedHeldObjectReEvokeProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      conditionImmunityAndTurnStartTemporaryHitPointsProfile.admit(
        spell,
        admissionContext,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      weaponDamageRiderProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      magicWeaponEnhancementProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      afterHitDamageProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      afterHitSaveGatedConditionProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      afterHitTimedDamageAndSaveProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      afterHitDamageAndIlluminationProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      markedDamageRiderProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      expeditiousRetreatDashProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      jumpMovementReplacementProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      dragonsBreathInitialProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      selfTeleportProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      sanctuaryTargetingInterdictionProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      directConditionProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      directConditionRemovalProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      featherFallMitigationProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      persistentArmorEffectProfile.admit(spell, admissionContext),
    ),
    ...spellcasting.invocationSpellAccesses.flatMap((access) =>
      admitPersistentArmorEffectInvocationSpellAccess(
        actor.combatantId,
        access,
      ),
    ),
    ...preparedSpells.flatMap((spell) =>
      directHitPointRestorationProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      shieldReactionProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      counterspellProfile.admit(spell, admissionContext),
    ),
    ...preparedSpells.flatMap((spell) =>
      supportedPreparedHellishRebukeReactionSpellProfile(
        spell,
        spellcasting.spellSlots,
      ),
    ),
    ...cantrips.flatMap((spell) =>
      heldLightProfile.admit(spell, admissionContext),
    ),
    ...cantrips.flatMap((spell) =>
      dancingLightsSeparateCastProfile.admit(spell, admissionContext),
    ),
    ...cantrips.flatMap((spell) =>
      dancingLightsCombinedCastProfile.admit(spell, admissionContext),
    ),
    ...cantrips.flatMap((spell) =>
      dancingLightsRepositionProfile.admit(spell, admissionContext),
    ),
    ...cantrips.flatMap((spell) =>
      objectLightProfile.admit(spell, admissionContext),
    ),
    ...cantrips.flatMap((spell) =>
      heldLightHurlProfile.admit(spell, admissionContext),
    ),
    ...cantrips.flatMap((spell) =>
      spellHostedWeaponAttackProfile.admit(spell, admissionContext),
    ),
    ...cantrips.flatMap((spell) =>
      weaponAttackOverrideProfile.admit(spell, admissionContext),
    ),
    ...cantrips.flatMap((spell) =>
      spellAttackSequenceProfile.admit(spell, admissionContext),
    ),
    ...cantrips.flatMap((spell) =>
      spellAttackDamageProfile.admit(spell, admissionContext),
    ),
    ...cantrips.flatMap((spell) =>
      saveGatedDamageProfile.admit(spell, admissionContext),
    ),
    ...cantrips.flatMap((spell) =>
      rollModifierProfile.admit(spell, admissionContext),
    ),
    ...cantrips.flatMap((spell) =>
      thaumaturgyBoomingVoiceProfile.admit(spell, admissionContext),
    ),
    ...cantrips.flatMap((spell) =>
      damageReductionProfile.admit(spell, admissionContext),
    ),
    ...cantrips.flatMap((spell) =>
      makeStableProfile.admit(spell, admissionContext),
    ),
  ];
}

export function supportedPreparedOngoingSpellEndSpellProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const range =
    spell.mechanics.family === "activation" ? spell.mechanics.range : null;
  const rangeFeet =
    range?.kind === "point" && typeof range.feet === "number"
      ? range.feet
      : null;
  if (
    spell.mechanics.family !== "activation" ||
    range === null ||
    spell.mechanics.level !== 3 ||
    spell.mechanics.castingTime.kind !== "action" ||
    rangeFeet !== 120 ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    spell.mechanics.components.v !== true ||
    spell.mechanics.components.s !== true ||
    spell.mechanics.components.m !== false
  ) {
    return [];
  }
  const directPhase = spell.mechanics.phases[0];
  const abilityCheckPhase = spell.mechanics.phases[1];
  if (
    spell.mechanics.phases.length !== 2 ||
    directPhase === undefined ||
    abilityCheckPhase === undefined ||
    !isOngoingSpellEndDirectPhase(directPhase) ||
    !isOngoingSpellEndAbilityCheckPhase(abilityCheckPhase) ||
    ongoingSpellEndTargetHoleId(directPhase) !==
      ongoingSpellEndTargetHoleId(abilityCheckPhase)
  ) {
    return [];
  }
  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] =>
    Number(slot.spellLevel) < spell.mechanics.level
      ? []
      : [
          {
            access: { tag: "prepared" },
            resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
            procedure: "ongoingSpellEnd",
            spell,
            actionCost: "magicAction",
            rangeFeet: movementFeet(rangeFeet),
          },
        ],
  );
}

function isOngoingSpellEndDirectPhase(phase: ActivationPhase): boolean {
  return (
    phase.kind === "direct" &&
    isOngoingSpellEndTargetAttachment(phase.attachment) &&
    phase.effects?.length === 1 &&
    phase.effects[0]?.kind === "end_ongoing_spells" &&
    phase.effects[0]?.maxSpellLevel === "caster_slot_level"
  );
}

function isOngoingSpellEndAbilityCheckPhase(phase: ActivationPhase): boolean {
  return (
    phase.kind === "ability_check_gate" &&
    String(phase.ability) === "caster_spellcasting_ability" &&
    phase.dc === 10 &&
    phase.autoSuccessIfCasterSlotGte === "target_spell_level" &&
    phase.onPass.kind === "end_ongoing_spells" &&
    phase.onPass.maxSpellLevel === "contested_spell_level" &&
    phase.onFail === undefined &&
    isOngoingSpellEndTargetAttachment(phase.attachment)
  );
}

function isOngoingSpellEndTargetAttachment(
  attachment: Extract<
    ActivationPhase,
    { readonly attachment: unknown }
  >["attachment"],
): boolean {
  const targetKinds =
    attachment.kind === "hole" &&
    attachment.value.kind === "target" &&
    "targetKinds" in attachment.value.selection
      ? attachment.value.selection.targetKinds
      : undefined;
  return (
    attachment.kind === "hole" &&
    attachment.value.kind === "target" &&
    attachment.value.selection.mode === "one" &&
    targetKinds !== undefined &&
    sameStringSet(targetKinds, DISPEL_MAGIC_TARGET_KINDS)
  );
}

function ongoingSpellEndTargetHoleId(phase: ActivationPhase): string | null {
  if (phase.kind !== "direct" && phase.kind !== "ability_check_gate") {
    return null;
  }
  const attachment = phase.attachment;
  return attachment.kind === "hole" &&
    isOngoingSpellEndTargetAttachment(attachment)
    ? attachment.holeId
    : null;
}

export function supportedPreparedMagicalDarknessPointOriginProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  if (spell.mechanics.family !== "ongoing_effect") {
    return [];
  }
  const attachment = spell.mechanics.attachment;
  const darknessOperation = spell.mechanics.operations[0];
  const overlapOperation = spell.mechanics.operations[1];
  const maxSpellLevel =
    overlapOperation?.effect.kind ===
    "end_overlapping_spell_created_bright_or_dim_light"
      ? parseBattleSpellEffectLevel(overlapOperation.effect.maxSpellLevel)
      : null;
  const durationTicks =
    spell.mechanics.duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.upTo)
      : null;
  const earlyEnd =
    spell.mechanics.duration.kind === "concentration"
      ? (spell.mechanics.duration.earlyEnd ?? [])
      : [];
  const rangeFeet =
    spell.mechanics.range.kind === "point" ? spell.mechanics.range.feet : null;
  const area =
    attachment.kind === "hole" &&
    attachment.value.kind === "area" &&
    "shape" in attachment.value
      ? attachment.value
      : null;
  const radius = area?.shape.kind === "sphere" ? area.shape.radiusFeet : null;
  if (
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "action" ||
    rangeFeet !== 60 ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 10 ||
    earlyEnd.length !== 0 ||
    spell.mechanics.operations.length !== 2 ||
    darknessOperation?.trigger.kind !== "passive" ||
    darknessOperation.effect.kind !== "area_is_magical_darkness" ||
    overlapOperation?.trigger.kind !== "passive" ||
    maxSpellLevel === null ||
    area?.origin.kind !== "point_within_range" ||
    radius !== 15 ||
    durationTicks === null ||
    Either.isLeft(durationTicks)
  ) {
    return [];
  }

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "magicalDarknessPointOrigin",
        spell,
        targeting: {
          kind: "pointOriginSphere",
          radiusFeet: movementFeet(radius),
        },
        durationTicks: durationTicks.right,
        rangeFeet: movementFeet(rangeFeet),
        dispelledSpellCreatedLightMaxSpellLevel: maxSpellLevel,
      },
    ];
  });
}

export function supportedPreparedAntimagicFieldOngoingSpellSuppressionProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const profile = antimagicFieldOngoingSpellSuppressionSpell(spell);
  if (profile === null) {
    return [];
  }

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "antimagicFieldOngoingSpellSuppression",
        spell,
        targeting: {
          kind: "selfOriginEmanation",
          radiusFeet: movementFeet(profile.radiusFeet),
        },
        durationTicks: profile.durationTicks,
        rangeFeet: movementFeet(0),
      },
    ];
  });
}

function antimagicFieldOngoingSpellSuppressionSpell(spell: SpellRecord): {
  readonly radiusFeet: number;
  readonly durationTicks: ElapsedTimeTicks;
} | null {
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  const attachment = spell.mechanics.attachment;
  const durationTicks =
    spell.mechanics.duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.upTo)
      : null;
  const suppressOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "suppress_ongoing_magic_effects",
  );
  if (
    spell.mechanics.level !== 8 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "hour" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    attachment.kind !== "area" ||
    attachment.origin.kind !== "self" ||
    attachment.shape.kind !== "emanation" ||
    attachment.shape.radiusFeet !== 10 ||
    suppressOperation?.effect.kind !== "suppress_ongoing_magic_effects" ||
    suppressOperation.effect.suppressedTimeCountsAgainstDuration !== true ||
    !sameStringSet(suppressOperation.effect.exceptSources ?? [], [
      "artifact",
      "deity",
    ]) ||
    durationTicks === null ||
    Either.isLeft(durationTicks)
  ) {
    return null;
  }
  return {
    radiusFeet: attachment.shape.radiusFeet,
    durationTicks: durationTicks.right,
  };
}

export function supportedPreparedWebRestraintHazardProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  const web = webRestraintHazardSpell(spell);
  if (web === null) {
    return [];
  }

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    return [
      {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
        procedure: "webRestraintHazard",
        spell,
        ability: "dex",
        dc: { kind: "caster_spell_save_dc" },
        targeting: {
          kind: "pointOriginCube",
          sideFeet: movementFeet(web.sideFeet),
        },
        durationTicks: web.durationTicks,
        rangeFeet: movementFeet(web.rangeFeet),
      },
    ];
  });
}

function webRestraintHazardSpell(spell: SpellRecord): {
  readonly durationTicks: ElapsedTimeTicks;
  readonly rangeFeet: number;
  readonly sideFeet: number;
} | null {
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  const durationTicks =
    spell.mechanics.duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.upTo)
      : null;
  const attachment = spell.mechanics.attachment;
  const area =
    attachment.kind === "hole" && attachment.value.kind === "area"
      ? attachment.value
      : null;
  const enterOperation = spell.mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_creature_enters_area",
  );
  const startTurnOperation = spell.mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_creature_starts_turn_in_area",
  );
  const escapeOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "on_affected_creature_spends_action",
  );
  const difficultTerrainOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "area_is_difficult_terrain",
  );
  const lightlyObscuredOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "area_is_lightly_obscured",
  );
  const anchorOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "area_anchor_or_layering_requirement",
  );
  const burnAwayOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "area_section_burns_away",
  );

  if (
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 60 ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "hour" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.operations.length !== 7 ||
    durationTicks === null ||
    Either.isLeft(durationTicks) ||
    area?.kind !== "area" ||
    area.origin.kind !== "point_within_range" ||
    area.shape.kind !== "cube" ||
    area.shape.sideFeet !== 20 ||
    !isWebRestraintSaveGate(enterOperation?.effect) ||
    enterOperation?.usageLimit?.kind !== "once_per_turn" ||
    !isWebRestraintSaveGate(startTurnOperation?.effect) ||
    !isWebRestraintEscapeOperation(escapeOperation) ||
    difficultTerrainOperation === undefined ||
    lightlyObscuredOperation === undefined ||
    anchorOperation?.effect.kind !== "area_anchor_or_layering_requirement" ||
    burnAwayOperation?.effect.kind !== "area_section_burns_away"
  ) {
    return null;
  }

  return {
    durationTicks: durationTicks.right,
    rangeFeet: spell.mechanics.range.feet,
    sideFeet: area.shape.sideFeet,
  };
}

function isWebRestraintSaveGate(
  effect: OngoingOperationEffect | undefined,
): effect is WebRestraintSaveEffect {
  return (
    effect?.kind === "save_gate" &&
    effect.ability === "dex" &&
    effect.dc.kind === "caster_spell_save_dc" &&
    effect.onSuccess.kind === "none" &&
    effect.onFail.kind === "apply_condition_while_in_area_or_until_escape" &&
    effect.onFail.condition === "restrained"
  );
}

function isWebRestraintEscapeOperation(
  operation: OngoingOperation | undefined,
): boolean {
  return (
    operation?.trigger.kind === "on_affected_creature_spends_action" &&
    operation.trigger.cost.kind === "action" &&
    operation.predicate?.kind === "has_condition" &&
    operation.predicate.condition === "restrained" &&
    operation.effect.kind === "ability_check_gate" &&
    operation.effect.ability === "str" &&
    operation.effect.skill === "athletics" &&
    operation.effect.dc.kind === "caster_spell_save_dc" &&
    operation.effect.onPass.kind === "remove_condition" &&
    operation.effect.onPass.condition === "restrained"
  );
}

export function supportedPreparedHellishRebukeReactionSpellProfile(
  spell: SpellRecord,
  spellSlots: CharacterBattleSpellcastingState["spellSlots"],
): readonly SupportedSpellInvocation[] {
  if (
    spell.mechanics.family !== "triggered_reaction" ||
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "reaction" ||
    spell.mechanics.castingTime.trigger.kind !== "takes_damage_from_creature" ||
    !spell.mechanics.castingTime.trigger.requiresVisibleCreature ||
    spell.mechanics.castingTime.trigger.rangeFeet !== 60 ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 60 ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    spell.mechanics.interruptsTrigger ||
    spell.mechanics.phases.length !== 1
  ) {
    return [];
  }
  const phase = spell.mechanics.phases[0];
  if (
    phase?.kind !== "save_gate" ||
    hasSaveGateRepeatSaves(phase) ||
    phase.ability !== "dex" ||
    phase.dc.kind !== "caster_spell_save_dc" ||
    phase.onSuccess.kind !== "half_damage" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target" ||
    phase.attachment.value.selection.mode !== "one" ||
    phase.onFail.kind !== "damage" ||
    phase.onFail.damageType !== "fire"
  ) {
    return [];
  }
  const failedDamage = phase.onFail;
  const rangeFeet = spell.mechanics.range.feet;

  return spellSlots.flatMap((slot): readonly SupportedSpellInvocation[] => {
    if (Number(slot.spellLevel) < spell.mechanics.level) {
      return [];
    }
    const damageExpr = supportedDamageAmountExpr({
      amount: failedDamage.amount,
      spellLevel: spell.mechanics.level,
      slotLevel: slot.spellLevel,
    });
    return damageExpr === null
      ? []
      : [
          {
            access: { tag: "prepared" },
            resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
            procedure: "saveGatedDamage" as const,
            spell,
            ability: phase.ability,
            dc: phase.dc,
            targeting: { kind: "singleCombatant" as const },
            damage: {
              expr: damageExpr,
              damageType: "fire",
            },
            successDamage: "half" as const,
            rangeFeet: movementFeet(rangeFeet),
            failedSavePostDamageRiders: [],
            saveRollModeRule: null,
          },
        ];
  });
}
