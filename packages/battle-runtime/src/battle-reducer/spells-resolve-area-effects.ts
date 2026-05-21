// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-fog-cloud-obscurement spell.invocation-flaming-sphere-hazard-ram spell.invocation-moonbeam-movable-zone
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-gust-of-wind-line
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-web-restraint-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magical-darkness-point-origin
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-antimagic-field-tracked-light-suppression
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FOG_CLOUD_OBSCUREMENT_LIFECYCLE BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE
import type {
  ActionSpellBattleResolutionInput,
  BattleAntimagicFieldAreaChoice,
  BattleMagicalDarknessAreaChoice,
  BattleSpellAreaChoice,
  BattleResolutionResult,
  BattleTrackedOngoingSpellLightEmitter,
  SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import { needsHolesResult } from "./hole-helpers.ts";
import { invalidResult } from "./result-helpers.ts";
import {
  applyFlamingSphereCastEffect,
  applyFogCloudObscurementCastEffect,
  applyGustOfWindLineCastEffect,
  applyAntimagicFieldOngoingSpellSuppressionCastEffect,
  applyMagicalDarknessPointOriginCastEffect,
  applyMoonbeamCastEffect,
  applyWebRestraintHazardCastEffect,
} from "./spells-active-effects.ts";
import { spellSavingThrowOutcomeHole } from "./spells-damage-fills.ts";
import { spellAreaChoiceHole } from "./spells-holes-fills.ts";
import { spendSpellCastResources } from "./spells-resolve-resources.ts";
import { maybeOpenReactionWindow, snapshotBattle } from "./dispatcher.ts";
import {
  saveMetamagicSelectionState,
  validateGustOfWindLineAreaPushFacts,
  validateSavingThrowOutcomes,
} from "./spells-resolve-save-gates.ts";
import type { SpellFillSet } from "./spells-resolve-fill-set.ts";
import type { CharacterBattleMetamagicOptionFact } from "../character-battle-resources.ts";

export function resolveFogCloudObscurementSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "fogCloudObscurement" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
    input.fillSet.damageTypeChoice !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.movement !== undefined ||
    input.fillSet.spellDamageReductionRolls.length > 0 ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Fog Cloud uses one table-supplied fog area fill.",
    );
  }
  if (input.fillSet.areaChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellAreaChoiceHole(input.invocation),
    ]);
  }
  if (
    input.fillSet.areaChoice.kind !== "fogCloudArea" ||
    input.fillSet.areaChoice.areaId.length === 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Fog Cloud area id must be a non-empty fog area.",
    );
  }

  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const nextState = applyFogCloudObscurementCastEffect({
    state: resourced.state,
    actorId: input.actorId,
    areaId: input.fillSet.areaChoice.areaId,
    invocation: input.invocation,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveMagicalDarknessPointOriginSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "magicalDarknessPointOrigin" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
    input.fillSet.damageTypeChoice !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.movement !== undefined ||
    input.fillSet.spellDamageReductionRolls.length > 0 ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Darkness uses one table-supplied magical Darkness area fill.",
    );
  }
  if (input.fillSet.areaChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellAreaChoiceHole(input.invocation),
    ]);
  }
  if (
    input.fillSet.areaChoice.kind !== "magicalDarknessArea" ||
    input.fillSet.areaChoice.areaId.length === 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Darkness area id must be a non-empty magical Darkness area.",
    );
  }
  const invalidOverlap = magicalDarknessAreaChoiceInvalidReason(
    input.input.state,
    input.fillSet.areaChoice,
    input.invocation,
  );
  if (invalidOverlap !== null) {
    return invalidResult(input.input.state, "invalidFill", invalidOverlap);
  }

  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const nextState = applyMagicalDarknessPointOriginCastEffect({
    state: resourced.state,
    actorId: input.actorId,
    areaChoice: input.fillSet.areaChoice,
    invocation: input.invocation,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveAntimagicFieldOngoingSpellSuppressionAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "antimagicFieldOngoingSpellSuppression" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
    input.fillSet.damageTypeChoice !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.movement !== undefined ||
    input.fillSet.spellDamageReductionRolls.length > 0 ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Antimagic Field uses one table-supplied antimagic Emanation fill.",
    );
  }
  if (input.fillSet.areaChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellAreaChoiceHole(input.invocation),
    ]);
  }
  if (
    input.fillSet.areaChoice.kind !== "antimagicFieldSelfEmanation" ||
    input.fillSet.areaChoice.areaId.length === 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Antimagic Field area id must be a non-empty antimagic Emanation area.",
    );
  }
  const invalidAffectedLights = antimagicFieldAreaChoiceInvalidReason(
    input.input.state,
    input.fillSet.areaChoice,
  );
  if (invalidAffectedLights !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      invalidAffectedLights,
    );
  }

  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const nextState = applyAntimagicFieldOngoingSpellSuppressionCastEffect({
    state: resourced.state,
    actorId: input.actorId,
    areaId: input.fillSet.areaChoice.areaId,
    affectedOngoingSpellLights:
      input.fillSet.areaChoice.affectedOngoingSpellLights,
    invocation: input.invocation,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function magicalDarknessAreaChoiceInvalidReason(
  state: ActionSpellBattleResolutionInput["state"],
  areaChoice: BattleMagicalDarknessAreaChoice,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "magicalDarknessPointOrigin" }
  >,
): string | null {
  const trackedEmitters = trackedOngoingSpellLightEmittersByEffectId(state);
  for (const overlap of areaChoice.spellCreatedLightOverlaps) {
    const emitter = trackedEmitters.get(overlap.sourceEffectId);
    if (emitter === undefined) {
      return "Darkness spell-light overlap must reference a tracked ongoing spell light.";
    }
    if (
      emitter.sourceSpellLevel >
      invocation.dispelledSpellCreatedLightMaxSpellLevel
    ) {
      return "Darkness can only dispel overlapping spell-created light at or below its supported spell level limit.";
    }
  }
  return null;
}

function antimagicFieldAreaChoiceInvalidReason(
  state: ActionSpellBattleResolutionInput["state"],
  areaChoice: BattleAntimagicFieldAreaChoice,
): string | null {
  const trackedEmitters = trackedOngoingSpellLightEmittersByEffectId(state);
  for (const affected of areaChoice.affectedOngoingSpellLights) {
    if (!trackedEmitters.has(affected.sourceEffectId)) {
      return "Antimagic Field affected light must reference a tracked ongoing spell light.";
    }
  }
  return null;
}

function trackedOngoingSpellLightEmittersByEffectId(
  state: ActionSpellBattleResolutionInput["state"],
): ReadonlyMap<
  BattleTrackedOngoingSpellLightEmitter["sourceEffectId"],
  BattleTrackedOngoingSpellLightEmitter
> {
  return new Map(
    state.lightEmitters.flatMap((emitter) =>
      isTrackedOngoingSpellLightEmitter(emitter)
        ? [[emitter.sourceEffectId, emitter]]
        : [],
    ),
  );
}

function isTrackedOngoingSpellLightEmitter(
  emitter: ActionSpellBattleResolutionInput["state"]["lightEmitters"][number],
): emitter is BattleTrackedOngoingSpellLightEmitter {
  return (
    emitter.kind === "spellLightEmitter" &&
    "sourceEffectId" in emitter &&
    "sourceSpellLevel" in emitter
  );
}

export function resolveFlamingSphereSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "flamingSphere" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
    input.fillSet.damageTypeChoice !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.movement !== undefined ||
    input.fillSet.spellDamageReductionRolls.length > 0 ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Movable sphere uses one table-supplied sphere area fill.",
    );
  }
  if (input.fillSet.areaChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellAreaChoiceHole(input.invocation),
    ]);
  }
  if (
    input.fillSet.areaChoice.kind !== "flamingSphereArea" ||
    input.fillSet.areaChoice.areaId.length === 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Movable sphere area id must be a non-empty sphere area.",
    );
  }

  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const nextState = applyFlamingSphereCastEffect({
    state: resourced.state,
    actorId: input.actorId,
    areaId: input.fillSet.areaChoice.areaId,
    invocation: input.invocation,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveMoonbeamSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "moonbeam" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
    input.fillSet.damageTypeChoice !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.movement !== undefined ||
    input.fillSet.spellDamageReductionRolls.length > 0 ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Movable cylinder uses one table-supplied cylinder area fill.",
    );
  }
  if (input.fillSet.areaChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellAreaChoiceHole(input.invocation),
    ]);
  }
  if (
    input.fillSet.areaChoice.kind !== "moonbeamCylinderArea" ||
    input.fillSet.areaChoice.areaId.length === 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Movable cylinder area id must be a non-empty cylinder area.",
    );
  }

  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const nextState = applyMoonbeamCastEffect({
    state: resourced.state,
    actorId: input.actorId,
    areaId: input.fillSet.areaChoice.areaId,
    invocation: input.invocation,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveWebRestraintHazardSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "webRestraintHazard" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
    input.fillSet.damageTypeChoice !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.movement !== undefined ||
    input.fillSet.spellDamageReductionRolls.length > 0 ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Web uses one table-supplied cube area fill.",
    );
  }
  if (input.fillSet.areaChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellAreaChoiceHole(input.invocation),
    ]);
  }
  if (
    input.fillSet.areaChoice.kind !== "webCubeArea" ||
    input.fillSet.areaChoice.areaId.length === 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Web area id must be a non-empty cube area.",
    );
  }

  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const nextState = applyWebRestraintHazardCastEffect({
    state: resourced.state,
    actorId: input.actorId,
    areaId: input.fillSet.areaChoice.areaId,
    invocation: input.invocation,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveGustOfWindLineSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "gustOfWindLine" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly metamagicApplications?: readonly CharacterBattleMetamagicOptionFact[];
}): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.areaChoice !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
    input.fillSet.damageTypeChoice !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.movement !== undefined ||
    input.fillSet.spellDamageReductionRolls.length > 0 ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Gust of Wind uses one Line-area Saving Throw fill.",
    );
  }

  const metamagicSelections = saveMetamagicSelectionState({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    fills: input.input.fills,
    metamagicApplications: input.metamagicApplications,
    targetId: undefined,
  });
  if (metamagicSelections.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      metamagicSelections.message,
    );
  }
  if (metamagicSelections.tag === "needsHoles") {
    return needsHolesResult(
      input.input.state,
      input.input.subject,
      metamagicSelections.holes,
    );
  }
  const savingThrowHole = spellSavingThrowOutcomeHole(
    input.input.state,
    input.actorId,
    input.invocation,
    metamagicSelections.heightenedSpellTargetId,
  );
  if (input.fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      savingThrowHole,
    ]);
  }
  const savingThrowOutcomes = input.fillSet.savingThrowOutcomes;
  const savingThrowValidation = validateSavingThrowOutcomes(
    savingThrowOutcomes,
    savingThrowHole,
    input.input.state,
    input.actorId,
    undefined,
    undefined,
    metamagicSelections.carefulSpellProtectedTargetIds,
    metamagicSelections.heightenedSpellTargetId,
  );
  if (savingThrowValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }
  if (
    !("area" in savingThrowOutcomes) ||
    savingThrowOutcomes.area.kind !== "gustOfWindLineArea"
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Gust of Wind requires Line area and direction facts.",
    );
  }
  const area: Extract<
    BattleSpellAreaChoice,
    { readonly kind: "gustOfWindLineArea" }
  > = savingThrowOutcomes.area;
  const failedTargetIds = savingThrowOutcomes.outcomes.flatMap((outcome) =>
    outcome.succeeded ? [] : [outcome.targetId],
  );
  const areaValidation = validateGustOfWindLineAreaPushFacts({
    area,
    failedTargetIds,
    pushDistanceFeet: input.invocation.pushDistanceFeet,
  });
  if (areaValidation !== null) {
    return invalidResult(input.input.state, "invalidFill", areaValidation);
  }
  if (failedTargetIds.length > 0) {
    const saveFailedReactionWindow = maybeOpenReactionWindow(
      input.input.state,
      {
        trigger: "saveFailed",
        targetId: failedTargetIds[0]!,
        sourceSpellId: input.invocation.spell.id,
        continuation: {
          kind: "replay",
          subject:
            input.input.reactionContinuationSubject ?? input.input.subject,
          fills: input.input.fills,
        },
      },
      input.input.suppressedReactionTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }

  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    ...(input.metamagicApplications === undefined
      ? {}
      : { metamagicApplications: input.metamagicApplications }),
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const nextState = applyGustOfWindLineCastEffect({
    state: resourced.state,
    actorId: input.actorId,
    area,
    invocation: input.invocation,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}
