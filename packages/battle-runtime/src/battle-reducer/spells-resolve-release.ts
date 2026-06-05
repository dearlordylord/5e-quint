// Held-light, rider, ready, and release spell resolution extracted from spells-resolve.ts.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-created-held-object
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.remarkable-athlete

import {
  spendAction,
  spendActivationResource,
} from "@dnd/shared-algebras/action-economy-algebra";
import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import {
  attackRollHits,
  attackRollResultIsValid,
} from "@dnd/shared-algebras/attack-roll-algebra";
import { Either } from "effect";
import {
  attackRollIsCriticalHit,
  maybeOpenInterruptWindow,
  snapshotBattle,
  type ActionSpellBattleResolutionInput,
  type BattleActiveEffect,
  type BattleResolutionInputForSubject,
  type BattleResolutionResult,
  type BattleDancingLightsPlacementValue,
  type BattleState,
  type BonusActionSpellBattleResolutionInput,
  type ReadiedSpellInvocation,
  type SpellMarkedDamageRider,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { BattleSubject } from "../battle-subjects.ts";
import type { CombatantId } from "../identity.ts";
import {
  damageDispositionFillFor,
  damageDispositionFillsValidation,
  damageDispositionForTarget,
  zeroHitPointReplacementDispositionHole,
} from "./attack-damage-apply.ts";
import {
  attackRollModeMatches,
  consumeHelpAttackForAttackRoll,
  recordAttackRollOngoingFeatures,
  requiredSpellAttackRollMode,
} from "./attack-roll.ts";
import { activeEffectArmorClass } from "./creature-state.ts";
import {
  breakBattleConcentration,
  concentrationSavingThrowHole,
  damageLifecycleConcentrationSavingThrowFillCheck,
  damageLifecycleHideousLaughterDamageRepeatSaveFillCheck,
  fillsMatchingHoleIds,
  damageLifecycleConcentrationSavingThrowHoles,
} from "./damage-apply.ts";
import {
  activeMarkedDamageRiders,
  applyAvailableSourceDamageRollPenalty,
  damageAmountByTypeAfterTargetAdjustments,
  sourceDamageRollPenaltyRollHoleForDamageRoll,
  sourceDamageRollPenaltyRollForDamageRoll,
  unexpectedSourceDamageRollPenaltyRoll,
} from "./damage-helpers.ts";
import { needsHolesResult, revealHidden } from "./hole-helpers.ts";
import { invalidResult } from "./result-helpers.ts";
import { resolveRemarkableAthleteCriticalHitMovement } from "./remarkable-athlete-critical-movement.ts";
import { battleStateAfterTargetActionEarlyEndForActor } from "./sanctuary-targeting-interdiction.ts";
import { expendSpellSlot } from "./spell-effects.ts";
import {
  applyDancingLightsSpellEffect,
  setSpellCreatedHeldObjectState,
  spellCreatedHeldObjectEffectForSource,
  repositionDancingLightsSpellEffect,
  dancingLightsFromEffect,
  applySpellActiveEffects,
  applySpellLightEmitterEffects,
  applySpellDamage,
  spellAttackRollHole,
  spellDamageByTypeForTarget,
  spellDamageHole,
  spellTargetHole,
  spellTargetIsLegal,
  validateSpellDamageFill,
} from "./spells-holes-fills.ts";
import { markSpellSlotExpendedThisTurn } from "./spell-turn-resources.ts";
import { spellRequiresVerbal } from "./spells-discovery.ts";
import {
  clearPendingAttackRollMissToHitReplacementSelection,
  recordAttackRollMissToHitReplacementUsed,
  selectedAttackRollMissToHitReplacement,
} from "./statblock-attacks.ts";
import { spendSpellCastResources } from "./spells-resolve-resources.ts";
import { resolveChainedSpellAttackDamageAct } from "./spells-resolve-chained.ts";
import { spellCastInterruptFrame } from "./spell-cast-interrupt-frame.ts";

import { resolvePreparedSlotSpellRelease } from "./spells-resolve-prepared-slot.ts";
import { resolveSaveGateDamageSpellRelease } from "./spells-resolve-save-gates.ts";
import {
  spellFillSet,
  spellFillSetContainsOnlySpellCastReactionFacts,
  type SpellFillSet,
} from "./spells-resolve-fill-set.ts";
import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
import { spellDancingLightsPlacementHole } from "./spells-targeting.ts";

export function resolveReleaseSpellCreatedHeldObjectCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "releaseSpellCreatedHeldObject";
      }
    >
  >,
): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Spell-created held object release does not accept fills.",
    );
  }
  const actor = input.state.combatants.get(input.subject.actorId);
  const effect = spellCreatedHeldObjectEffectForSource(
    actor,
    input.subject.sourceCombatantId,
    input.subject.sourceSpellId,
  );
  if (effect === undefined || effect.objectState.kind !== "held") {
    return invalidResult(
      input.state,
      "staleSubject",
      "Spell-created held object is no longer held by this actor.",
    );
  }
  const released = setSpellCreatedHeldObjectState({
    state: input.state,
    actorId: input.subject.actorId,
    effect,
    objectState: { kind: "notHeld" },
  });
  if (released.tag === "invalid") {
    return invalidResult(input.state, "staleSubject", released.message);
  }
  return {
    tag: "resolved",
    state: released.state,
    snapshot: snapshotBattle(released.state),
  };
}

export function resolveDancingLightsCastSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "dancingLightsSeparateCast"
        | "dancingLightsCombinedCast";
    }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (dancingLightsFillSetHasUnrelatedFills(input.fillSet)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Dancing Lights spells use only a Dancing Lights placement fill.",
    );
  }
  const placement = input.fillSet.dancingLightsPlacement?.value;
  if (placement === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellDancingLightsPlacementHole(
        input.invocation,
        input.invocation.form,
        [],
      ),
    ]);
  }
  const placementError = dancingLightsCastPlacementError(
    input.invocation,
    placement,
  );
  if (placementError !== null) {
    return invalidResult(input.input.state, "invalidFill", placementError);
  }
  if (placement.mode !== "cast") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Dancing Lights placement does not match the selected form.",
    );
  }
  const spellCastReactionWindow = maybeOpenInterruptWindow(
    input.input.state,
    spellCastInterruptFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: [],
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "magicAction" },
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    }),
    input.input.handledInterruptTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
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
  const effected = applyDancingLightsSpellEffect(
    resourced.state,
    input.actorId,
    input.invocation,
    placement,
  );
  return {
    tag: "resolved",
    state: effected,
    snapshot: snapshotBattle(effected),
  };
}

export function resolveDancingLightsRepositionSpellAct(input: {
  readonly input: BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "dancingLightsReposition" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (dancingLightsFillSetHasUnrelatedFills(input.fillSet)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Dancing Lights spells use only a Dancing Lights placement fill.",
    );
  }
  const placement = input.fillSet.dancingLightsPlacement?.value;
  if (placement === undefined) {
    const activeEffect = input.input.state.combatants
      .get(input.actorId)
      ?.activeEffects.find(
        (
          candidate,
        ): candidate is Extract<
          BattleActiveEffect,
          { readonly kind: "dancingLights" }
        > =>
          candidate.kind === "dancingLights" &&
          candidate.sourceSpellId === input.invocation.spell.id &&
          candidate.sourceCombatantId === input.actorId,
      );
    if (activeEffect === undefined) {
      return invalidResult(
        input.input.state,
        "staleSubject",
        "Dancing Lights movement requires active lights from this spell.",
      );
    }
    return needsHolesResult(input.input.state, input.input.subject, [
      spellDancingLightsPlacementHole(
        input.invocation,
        activeEffect.form,
        dancingLightsFromEffect(activeEffect).map((light) => light.lightId),
      ),
    ]);
  }
  const placementError = dancingLightsRepositionPlacementError(
    input.input.state,
    input.actorId,
    input.invocation,
    placement,
  );
  if (placementError !== null) {
    return invalidResult(input.input.state, "invalidFill", placementError);
  }
  if (placement.mode !== "reposition") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Dancing Lights movement requires reposition placement.",
    );
  }
  const effected = repositionDancingLightsSpellEffect(
    input.input.state,
    input.actorId,
    input.invocation,
    placement,
  );
  const spent = spendActivationResource(effected.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Bonus Action spell is no longer available for the current actor.",
    );
  }
  const state = {
    ...effected,
    currentTurnResources: spent.right,
  };
  return {
    tag: "resolved",
    state,
    snapshot: snapshotBattle(state),
  };
}

function dancingLightsCastPlacementError(
  invocation: Extract<
    SupportedSpellInvocation,
    {
      readonly procedure:
        | "dancingLightsSeparateCast"
        | "dancingLightsCombinedCast";
    }
  >,
  placement: BattleDancingLightsPlacementValue,
): string | null {
  if (placement.mode !== "cast" || placement.form !== invocation.form) {
    return "Dancing Lights placement does not match the selected form.";
  }
  if (placement.form === "combinedMediumForm") {
    return placement.light.distanceFromCasterFeet > invocation.rangeFeet
      ? "Dancing Lights placement must be within the spell range."
      : null;
  }
  return dancingLightsSeparatePlacementError(
    placement.lights,
    invocation.rangeFeet,
    invocation.spacingFeet,
  );
}

function dancingLightsRepositionPlacementError(
  state: BattleState,
  actorId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "dancingLightsReposition" }
  >,
  placement: BattleDancingLightsPlacementValue,
): string | null {
  if (placement.mode !== "reposition") {
    return "Dancing Lights movement requires reposition placement.";
  }
  const effect = state.combatants
    .get(actorId)
    ?.activeEffects.find(
      (
        candidate,
      ): candidate is Extract<
        BattleActiveEffect,
        { readonly kind: "dancingLights" }
      > =>
        candidate.kind === "dancingLights" &&
        candidate.sourceSpellId === invocation.spell.id &&
        candidate.sourceCombatantId === actorId,
    );
  if (effect === undefined) {
    return "Dancing Lights movement requires active lights from this spell.";
  }
  if (placement.form !== effect.form) {
    return "Dancing Lights movement form does not match the active lights.";
  }
  const placements =
    placement.form === "combinedMediumForm"
      ? [placement.light]
      : placement.lights;
  if (
    placements.some(
      (candidate) => candidate.moveDistanceFeet > invocation.maxMoveFeet,
    )
  ) {
    return "Dancing Lights can move a light up to 60 feet.";
  }
  const currentDancingLightIds = dancingLightsFromEffect(effect).map(
    (dancingLight) => dancingLight.lightId,
  );
  const placedLightIds = placements.map((candidate) => candidate.lightId);
  if (
    placedLightIds.length !== new Set(placedLightIds).size ||
    placedLightIds.length !== currentDancingLightIds.length ||
    placedLightIds.some((lightId) => !currentDancingLightIds.includes(lightId))
  ) {
    return "Dancing Lights movement must place each active light identity.";
  }
  const inRange =
    placement.form === "combinedMediumForm"
      ? placement.light.distanceFromCasterFeet <= invocation.rangeFeet
        ? [placement.light]
        : []
      : placement.lights.filter(
          (candidate) =>
            candidate.distanceFromCasterFeet <= invocation.rangeFeet,
        );
  if (placement.form === "separateLights") {
    if (inRange.length === 0) {
      return null;
    }
    return dancingLightsSeparatePlacementError(
      inRange,
      invocation.rangeFeet,
      invocation.spacingFeet,
    );
  }
  return null;
}

function dancingLightsFillSetHasUnrelatedFills(
  fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>,
): boolean {
  return (
    fillSet.targetId !== undefined ||
    fillSet.objectTarget !== undefined ||
    fillSet.targetSpatialFacts.length > 0 ||
    fillSet.targetAllocation !== undefined ||
    fillSet.targetList !== undefined ||
    fillSet.attackSequencePartFills.some(
      (attackSequencePartFill) =>
        attackSequencePartFill.target !== undefined ||
        attackSequencePartFill.attackRoll !== undefined ||
        attackSequencePartFill.damageRoll !== undefined,
    ) ||
    fillSet.attackRoll !== undefined ||
    fillSet.savingThrowOutcomes !== undefined ||
    fillSet.skillChoice !== undefined ||
    fillSet.targetAbilityChoices !== undefined ||
    fillSet.abilityChoice !== undefined ||
    fillSet.commandOptionChoice !== undefined ||
    fillSet.areaChoice !== undefined ||
    fillSet.damageTypeChoice !== undefined ||
    fillSet.concentrationSavingThrows.length > 0 ||
    fillSet.hideousLaughterDamageRepeatSaves.length > 0 ||
    fillSet.damageDispositions.length > 0 ||
    fillSet.damageRoll !== undefined ||
    fillSet.movement !== undefined ||
    fillSet.spellDamageReductionRolls.length > 0 ||
    fillSet.attackBurstDamageRoll !== undefined ||
    fillSet.healingRoll !== undefined
  );
}

function dancingLightsSeparatePlacementError(
  placements: readonly {
    readonly distanceFromCasterFeet: number;
    readonly nearestSiblingDistanceFeet?: number;
  }[],
  rangeFeet: number,
  spacingFeet: number,
): string | null {
  if (placements.length === 0 || placements.length > 4) {
    return "Dancing Lights separate form requires one to four lights.";
  }
  if (
    placements.some((candidate) => candidate.distanceFromCasterFeet > rangeFeet)
  ) {
    return "Dancing Lights placement must be within the spell range.";
  }
  if (
    placements.length > 1 &&
    placements.some(
      (candidate) =>
        candidate.nearestSiblingDistanceFeet === undefined ||
        candidate.nearestSiblingDistanceFeet > spacingFeet,
    )
  ) {
    return "Dancing Lights separate lights must stay within 20 feet of another light.";
  }
  return null;
}

export function resolveReadySpellAct(
  input: ActionSpellBattleResolutionInput,
  invocation: ReadiedSpellInvocation,
): BattleResolutionResult {
  const fillSet = spellFillSet(input.fills, invocation);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  if (!spellFillSetContainsOnlySpellCastReactionFacts(fillSet, {})) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Ready Spell accepts only spell-cast Reaction trigger facts.",
    );
  }
  if (input.state.readiedSpells.has(input.subject.actorId)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This caster is already holding a readied spell.",
    );
  }
  if (input.subject.mode.tag !== "ready") {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "Ready Spell requires a selected Reaction trigger.",
    );
  }

  const castingState = spellRequiresVerbal(invocation.spell)
    ? revealHidden(input.state, input.subject.actorId)
    : input.state;
  const spellCastState = battleStateAfterTargetActionEarlyEndForActor(
    castingState,
    input.subject.actorId,
  );
  const spellCastReactionWindow = maybeOpenInterruptWindow(
    spellCastState,
    spellCastInterruptFrame({
      casterId: input.subject.actorId,
      invocation,
      targetIds: [],
      reactionSpellTargetFacts: fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "magicAction" },
      continuation: {
        kind: "replay",
        subject: input.subject,
        fills: input.fills,
      },
    }),
    input.handledInterruptTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const afterPriorConcentration = breakBattleConcentration(
    spellCastState,
    input.subject.actorId,
  );
  const refreshedActor = afterPriorConcentration.combatants.get(
    input.subject.actorId,
  );
  if (refreshedActor?.origin.kind !== "character") {
    return invalidResult(
      input.state,
      "staleSubject",
      "Ready Spell caster is no longer available.",
    );
  }
  const concentratingActor = {
    ...refreshedActor,
    concentration: {
      sourceSpellId: invocation.spell.id,
      effectKind: "readiedSpell" as const,
    },
  };
  const withConcentration = {
    ...afterPriorConcentration,
    combatants: new Map(afterPriorConcentration.combatants).set(
      input.subject.actorId,
      concentratingActor,
    ),
    readiedSpells: new Map(afterPriorConcentration.readiedSpells).set(
      input.subject.actorId,
      {
        invocation,
        trigger: input.subject.mode.trigger,
        expiresAt: {
          kind: "startOfTurn" as const,
          combatantId: input.subject.actorId,
        },
      },
    ),
  };
  const spent = spendAction(withConcentration.currentTurnResources, "magic");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic action is no longer available for the current actor.",
    );
  }
  const slotted =
    invocation.resource.tag === "spellSlot"
      ? expendSpellSlot(
          withConcentration,
          input.subject.actorId,
          invocation.resource.slotLevel,
        )
      : withConcentration;
  const nextTurnResources =
    invocation.resource.tag === "spellSlot"
      ? markSpellSlotExpendedThisTurn(spent.right, input.subject.actorId)
      : Either.right(spent.right);
  if (Either.isLeft(nextTurnResources)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  const nextState = {
    ...slotted,
    currentTurnResources: nextTurnResources.right,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveSpellRelease(
  input: ActionSpellBattleResolutionInput,
  invocation: ReadiedSpellInvocation,
): BattleResolutionResult {
  if (invocation.procedure === "chainedSpellAttackDamage") {
    return resolveChainedSpellAttackDamageAct({
      input,
      actorId: input.subject.actorId,
      invocation,
      opensSpellCastReactionWindow: false,
      spendsCastResources: false,
    });
  }
  const fillSet = spellFillSet(input.fills, invocation);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  if (invocation.procedure === "saveGatedDamage") {
    return resolveSaveGateDamageSpellRelease({
      input,
      actorId: input.subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "repeatedDamageAllocation") {
    return resolvePreparedSlotSpellRelease({
      input,
      actorId: input.subject.actorId,
      invocation,
      fillSet,
    });
  }

  if (fillSet.targetId == null) {
    return needsHolesResult(input.state, input.subject, [
      spellTargetHole(input.state, input.subject.actorId, invocation),
    ]);
  }
  const target = input.state.combatants.get(fillSet.targetId);
  if (
    target == null ||
    !spellTargetIsLegal(
      input.state,
      input.subject.actorId,
      target.combatantId,
      invocation,
      fillSet.targetSpatialFacts,
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Readied spell target must be a combatant within the selected spell's supported range.",
    );
  }
  let spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [];
  let releaseResolutionStateAfterCriticalMovement: BattleState | null = null;
  if (invocation.procedure === "spellAttackDamage") {
    const requiredRollMode = requiredSpellAttackRollMode(
      input.state,
      input.subject.actorId,
      target.combatantId,
      invocation,
      fillSet.targetSpatialFacts,
    );
    if (fillSet.attackRoll == null) {
      return needsHolesResult(input.state, input.subject, [
        spellAttackRollHole(
          input.state,
          input.subject.actorId,
          invocation,
          requiredRollMode,
        ),
      ]);
    }
    if (!attackRollResultIsValid(fillSet.attackRoll)) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell attack roll result is outside the d20 attack-roll protocol.",
      );
    }
    if (!attackRollModeMatches(fillSet.attackRoll, requiredRollMode)) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Readied spell attack roll mode does not match the current attack-roll rule.",
      );
    }
    const ordinaryHit = attackRollHits(
      fillSet.attackRoll,
      currentArmorClass(activeEffectArmorClass(target)),
    );
    const missToHitReplacement = selectedAttackRollMissToHitReplacement({
      state: input.state,
      subject: input.subject,
      attackerId: input.subject.actorId,
      targetId: target.combatantId,
      attackRoll: fillSet.attackRoll,
      ordinaryHit,
    });
    if (
      fillSet.attackRoll.missToHitReplacementUnitId !== undefined &&
      missToHitReplacement === null
    ) {
      return invalidResult(
        input.state,
        "invalidFill",
        ordinaryHit
          ? "Attack-roll miss-to-hit replacement can only be selected after a miss."
          : "Attack-roll miss-to-hit replacement is not available for this spell attack roll.",
      );
    }
    const releaseAttackRolledState = recordAttackRollMissToHitReplacementUsed(
      consumeHelpAttackForAttackRoll(
        recordAttackRollOngoingFeatures(
          input.state,
          input.subject.actorId,
          target.combatantId,
          null,
        ),
        input.subject.actorId,
        target.combatantId,
      ),
      input.subject.actorId,
      missToHitReplacement,
      {
        subject: input.subject,
        targetId: target.combatantId,
        attackRoll: fillSet.attackRoll,
      },
    );
    const hit = ordinaryHit || missToHitReplacement !== null;
    const critical = attackRollIsCriticalHit(fillSet.attackRoll);
    spellMarkedDamageRiders = hit
      ? activeMarkedDamageRiders(
          releaseAttackRolledState.combatants.get(input.subject.actorId),
          target.combatantId,
        )
      : [];
    const remarkableAthleteMovement =
      resolveRemarkableAthleteCriticalHitMovement({
        state: releaseAttackRolledState,
        subject: input.subject,
        attackerId: input.subject.actorId,
        scoredCriticalHit: critical,
        fills: fillSet,
      });
    if (remarkableAthleteMovement.tag === "result") {
      return remarkableAthleteMovement.result;
    }
    releaseResolutionStateAfterCriticalMovement =
      remarkableAthleteMovement.state;
    if (hit && fillSet.damageRoll == null) {
      if (fillSet.sourceDamageRollPenaltyRolls.length > 0) {
        return invalidResult(
          input.state,
          "invalidFill",
          "Source damage roll penalty does not match an active source-side damage penalty.",
        );
      }
      return needsHolesResult(
        releaseResolutionStateAfterCriticalMovement,
        input.subject,
        [spellDamageHole(invocation, critical, spellMarkedDamageRiders)],
      );
    }
    if (
      !hit &&
      (fillSet.damageRoll != null ||
        fillSet.damageDispositions.length > 0 ||
        fillSet.sourceDamageRollPenaltyRolls.length > 0)
    ) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell damage can only be filled after a hit.",
      );
    }
    if (!hit) {
      return {
        tag: "resolved",
        state: releaseResolutionStateAfterCriticalMovement,
        snapshot: snapshotBattle(releaseResolutionStateAfterCriticalMovement),
      };
    }
  } else if (fillSet.attackRoll != null) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Magic Missile does not use an attack roll.",
    );
  }

  if (fillSet.damageRoll == null) {
    if (fillSet.sourceDamageRollPenaltyRolls.length > 0) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Source damage roll penalty does not match an active source-side damage penalty.",
      );
    }
    return needsHolesResult(input.state, input.subject, [
      spellDamageHole(invocation),
    ]);
  }
  const releaseDamageBaseState =
    releaseResolutionStateAfterCriticalMovement ?? input.state;
  const critical =
    invocation.procedure === "spellAttackDamage" &&
    fillSet.attackRoll != null &&
    attackRollIsCriticalHit(fillSet.attackRoll);
  const damageValidation = validateSpellDamageFill(
    fillSet.damageRoll,
    invocation,
    critical,
    spellMarkedDamageRiders,
  );
  if (damageValidation !== null) {
    return invalidResult(input.state, "invalidFill", damageValidation);
  }
  const spellDamageByType = spellDamageByTypeForTarget(
    target,
    invocation,
    fillSet.damageRoll,
    "full",
    spellMarkedDamageRiders,
    critical,
  );
  const damageSource = releaseDamageBaseState.combatants.get(
    input.subject.actorId,
  );
  const expectedSourcePenaltyHole =
    sourceDamageRollPenaltyRollHoleForDamageRoll(
      damageSource,
      spellDamageByType,
      fillSet.damageRoll.holeId,
    );
  if (
    unexpectedSourceDamageRollPenaltyRoll(
      fillSet.sourceDamageRollPenaltyRolls,
      expectedSourcePenaltyHole === null ? [] : [expectedSourcePenaltyHole],
    ) !== undefined
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  const sourceDamageRollPenaltyRoll = sourceDamageRollPenaltyRollForDamageRoll(
    fillSet.sourceDamageRollPenaltyRolls,
    damageSource,
    spellDamageByType,
    fillSet.damageRoll.holeId,
  );
  const sourcePenalty = applyAvailableSourceDamageRollPenalty(
    damageSource,
    spellDamageByType,
    fillSet.damageRoll.holeId,
    sourceDamageRollPenaltyRoll,
  );
  if (sourcePenalty.tag === "invalid") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  if (sourcePenalty.tag === "needsHoles") {
    return needsHolesResult(releaseDamageBaseState, input.subject, [
      ...sourcePenalty.holes,
    ]);
  }
  const spellDamageAmount = damageAmountByTypeAfterTargetAdjustments(
    target,
    sourcePenalty.damageByType,
  );
  const concentrationSave = concentrationSavingThrowHole(
    target,
    spellDamageAmount,
  );
  const concentrationLifecycleHoles =
    damageLifecycleConcentrationSavingThrowHoles({
      state: releaseDamageBaseState,
      target,
      damageAmount: spellDamageAmount,
    });
  const concentrationLifecycleFills = fillsMatchingHoleIds(
    fillSet.concentrationSavingThrows,
    concentrationLifecycleHoles,
  );
  const concentrationFill =
    concentrationSave === null
      ? undefined
      : concentrationSavingThrowFillFor(
          concentrationLifecycleFills,
          concentrationSave,
        );
  const concentrationSaveCheck =
    damageLifecycleConcentrationSavingThrowFillCheck({
      state: releaseDamageBaseState,
      target,
      damageAmount: spellDamageAmount,
      fills: fillSet.concentrationSavingThrows,
    });
  if (concentrationSaveCheck.tag === "needsHoles") {
    return needsHolesResult(releaseDamageBaseState, input.subject, [
      ...concentrationSaveCheck.holes,
    ]);
  }
  if (concentrationSaveCheck.tag === "invalid") {
    return invalidResult(
      input.state,
      "invalidFill",
      concentrationSaveCheck.message,
    );
  }
  const damageDispositionHole = zeroHitPointReplacementDispositionHole({
    damageSourceId: input.subject.actorId,
    target,
    damageAmount: spellDamageAmount,
  });
  const damageDispositionValidation = damageDispositionFillsValidation({
    holes: damageDispositionHole === null ? [] : [damageDispositionHole],
    fills: fillSet.damageDispositions,
  });
  if (damageDispositionValidation !== null) {
    return invalidResult(
      input.state,
      "invalidFill",
      damageDispositionValidation,
    );
  }
  if (
    damageDispositionHole !== null &&
    damageDispositionFillFor(
      fillSet.damageDispositions,
      damageDispositionHole,
    ) === undefined
  ) {
    return needsHolesResult(releaseDamageBaseState, input.subject, [
      damageDispositionHole,
    ]);
  }
  const hideousLaughterSaveCheck =
    damageLifecycleHideousLaughterDamageRepeatSaveFillCheck({
      state: releaseDamageBaseState,
      target,
      damageAmount: spellDamageAmount,
      fills: fillSet.hideousLaughterDamageRepeatSaves,
    });
  if (hideousLaughterSaveCheck.tag === "needsHoles") {
    return needsHolesResult(releaseDamageBaseState, input.subject, [
      ...hideousLaughterSaveCheck.holes,
    ]);
  }
  if (hideousLaughterSaveCheck.tag === "invalid") {
    return invalidResult(
      input.state,
      "invalidFill",
      hideousLaughterSaveCheck.message,
    );
  }
  const hideousLaughterLifecycleFills = fillsMatchingHoleIds(
    fillSet.hideousLaughterDamageRepeatSaves,
    hideousLaughterSaveCheck.holes,
  );
  const releaseResolutionState =
    invocation.procedure === "spellAttackDamage" && fillSet.attackRoll != null
      ? (releaseResolutionStateAfterCriticalMovement ??
          recordAttackRollMissToHitReplacementUsed(
            consumeHelpAttackForAttackRoll(
              recordAttackRollOngoingFeatures(
                input.state,
                input.subject.actorId,
                target.combatantId,
                null,
              ),
              input.subject.actorId,
              target.combatantId,
            ),
            input.subject.actorId,
            selectedAttackRollMissToHitReplacement({
              state: input.state,
              subject: input.subject,
              attackerId: input.subject.actorId,
              targetId: target.combatantId,
              attackRoll: fillSet.attackRoll,
              ordinaryHit: attackRollHits(
                fillSet.attackRoll,
                currentArmorClass(activeEffectArmorClass(target)),
              ),
            }),
            {
              subject: input.subject,
              targetId: target.combatantId,
              attackRoll: fillSet.attackRoll,
            },
          ))
      : input.state;
  const damaged = applySpellDamage(
    releaseResolutionState,
    target.combatantId,
    invocation,
    fillSet.damageRoll,
    critical,
    {
      concentrationSavingThrow: concentrationFill,
      wardingBondDamageShareConcentrationSavingThrows:
        concentrationLifecycleFills,
      damageDisposition: damageDispositionForTarget(
        damageDispositionHole === null ? [] : [damageDispositionHole],
        fillSet.damageDispositions,
        target.combatantId,
      ),
      spellMarkedDamageRiders,
      sourceDamageRollPenaltyRoll,
      hideousLaughterDamageRepeatSaves: hideousLaughterLifecycleFills,
      damageSourceId: input.subject.actorId,
      spatialFacts: fillSet.targetSpatialFacts,
    },
  );
  const effected = applySpellActiveEffects(
    damaged,
    input.subject.actorId,
    target.combatantId,
    invocation,
  );
  const lit =
    invocation.procedure === "spellAttackDamage"
      ? applySpellLightEmitterEffects(
          effected,
          input.subject.actorId,
          { kind: "combatant", combatantId: target.combatantId },
          invocation,
        )
      : effected;
  const resolvedState = {
    ...lit,
    currentTurnResources: clearPendingAttackRollMissToHitReplacementSelection(
      lit.currentTurnResources,
      input.subject.actorId,
    ),
  };
  return {
    tag: "resolved",
    state: resolvedState,
    snapshot: snapshotBattle(resolvedState),
  };
}
