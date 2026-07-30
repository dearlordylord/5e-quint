// Held-light, rider, ready, and release spell resolution extracted from spells-resolve.ts.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-created-held-object spell.invocation-glyph-stored-summon-object-placement
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.remarkable-athlete
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.d20-test-natural-one-reroll

import {
  spendAction,
  spendActivationResource,
} from "@dnd/shared-algebras/action-economy-algebra";
import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import { damageAmount as toDamageAmount } from "@dnd/shared/types";
import {
  attackRollHits,
  attackRollResultIsValid,
} from "@dnd/shared-algebras/attack-roll-algebra";
import { Either } from "effect";
import {
  type ActionSpellBattleResolutionInput,
  type BattleActiveEffect,
  type BattleResolutionInputForSubject,
  type BattleResolutionResult,
  type BattleDancingLightsPlacementValue,
  type BattleState,
  type BattleExecutableSpellInvocation,
  type BonusActionSpellBattleResolutionInput,
  type ReadiedSpellInvocation,
  type SupportedDamageSpellInvocation,
  type SpellMarkedDamageRider,
} from "../battle-state-execution.ts";
import { attackRollIsCriticalHit } from "./attack-resolution.ts";
import { maybeOpenInterruptWindow } from "./interrupt-execution.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import { spellAttackRerollUnsupportedIssue } from "./spell-reroll-issues.ts";
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
import { activeEffectArmorClass } from "./creature-state-execution.ts";
import {
  breakBattleConcentration,
  concentrationSavingThrowHole,
  damageLifecycleConcentrationSavingThrowFillCheck,
  damageLifecycleHideousLaughterDamageRepeatSaveFillCheck,
  fillsMatchingHoleIds,
  damageLifecycleConcentrationSavingThrowHoles,
} from "./damage-apply.ts";
import { damageRelationshipDecisionFillCheck } from "./damage-relationship-decisions.ts";
import {
  activeMarkedDamageRiders,
  applyAvailableSourceDamageRollPenalty,
  damageAmountByTypeAfterTargetAdjustments,
  sourceDamageRollPenaltyRollHoleForDamageRoll,
  sourceDamageRollPenaltyRollForDamageRoll,
  unexpectedSourceDamageRollPenaltyRoll,
} from "./damage-helpers.ts";
import {
  attackRollHoleWithD20TestNaturalOneRerollOption,
  d20TestNaturalOneRerollRollDecisionRequired,
  d20TestNaturalOneRerollRollIssue,
  effectiveD20TestNaturalOneRerollAttackRoll,
} from "./d20-test-natural-one-reroll.ts";
import { revealHidden } from "./hole-helpers.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult } from "./result-helpers.ts";
import { resolveRemarkableAthleteCriticalHitMovement } from "./remarkable-athlete-critical-movement.ts";
import { battleStateAfterTargetActionEarlyEndForActor } from "./sanctuary-targeting-interdiction.ts";
import { expendSpellSlot } from "./spell-effects.ts";
import {
  applyDancingLightsSpellEffect,
  releaseSpellCreatedHeldObjectState,
  repositionDancingLightsSpellEffect,
  dancingLightsFromEffect,
  applySpellActiveEffects,
  applySpellLightEmitterEffects,
  applySpellDamage,
  spellAttackRollHole,
  spellDamageByTypeForTarget,
  spellDamageHole,
  selectedSpellAttackDamageProcedure,
  spellTargetHole,
  spellTargetIsLegal,
  validateSpellDamageFill,
} from "./spells-holes-fills.ts";
import { applySpiritualWeaponAttackProxyEffect } from "./spells-active-effects.ts";
import { markSpellSlotExpendedThisTurn } from "./spell-turn-resources.ts";
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
import { spellFillSet, type SpellFillSet } from "./spells-resolve-fill-set.ts";
import { fillsBelongToSpellCastHoles } from "./fill-hole-protocol.ts";
import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
import {
  spellDancingLightsPlacementHole,
  spiritualWeaponForcePositionHole,
  spiritualWeaponForcePositionInvalidReason,
} from "./spells-targeting.ts";

type ReleasableSpellInvocation =
  | BattleExecutableSpellInvocation<ReadiedSpellInvocation>
  | Extract<
      BattleExecutableSpellInvocation<SupportedDamageSpellInvocation>,
      { readonly procedure: "spiritualWeaponAttackProxy" }
    >;

type ReadySpellBattleResolutionInput = ActionSpellBattleResolutionInput & {
  readonly subject: ActionSpellBattleResolutionInput["subject"] & {
    readonly mode: Extract<
      ActionSpellBattleResolutionInput["subject"]["mode"],
      { readonly tag: "ready" }
    >;
  };
};

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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Spell-created held object release does not accept fills.",
    );
  }
  /* v8 ignore stop */
  const released = releaseSpellCreatedHeldObjectState({
    state: input.state,
    actorId: input.subject.actorId,
    effectRef: input.subject.effectRef,
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
    BattleExecutableSpellInvocation,
    {
      readonly procedure:
        | "dancingLightsSeparateCast"
        | "dancingLightsCombinedCast";
    }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (dancingLightsFillSetHasUnrelatedFills(input.fillSet)) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Dancing Lights spells use only a Dancing Lights placement fill.",
    );
  }
  /* v8 ignore stop */
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (placementError !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.input.state, "invalidFill", placementError);
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (placement.mode !== "cast") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Dancing Lights placement does not match the selected form.",
    );
  }
  /* v8 ignore stop */
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
    BattleExecutableSpellInvocation,
    { readonly procedure: "dancingLightsReposition" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (dancingLightsFillSetHasUnrelatedFills(input.fillSet)) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Dancing Lights spells use only a Dancing Lights placement fill.",
    );
  }
  /* v8 ignore stop */
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
          candidate.effectRef === input.invocation.activeEffectRef &&
          candidate.sourceProcedureRef ===
            input.invocation.sourceDancingLightsProcedureRef &&
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (placementError !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.input.state, "invalidFill", placementError);
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (placement.mode !== "reposition") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Dancing Lights movement requires reposition placement.",
    );
  }
  /* v8 ignore stop */
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
    BattleExecutableSpellInvocation,
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
    BattleExecutableSpellInvocation,
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
        candidate.effectRef === invocation.activeEffectRef &&
        candidate.sourceProcedureRef ===
          invocation.sourceDancingLightsProcedureRef &&
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
  input: ReadySpellBattleResolutionInput,
  invocation: BattleExecutableSpellInvocation<ReadiedSpellInvocation>,
): BattleResolutionResult {
  const fillSet = spellFillSet(
    input.fills,
    invocation,
    input.subject.procedureRef,
    input.subject.actorId,
    input.state,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!fillsBelongToSpellCastHoles(input.fills)) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Ready Spell accepts only spell-cast Reaction trigger facts.",
    );
  }
  /* v8 ignore stop */
  if (input.state.readiedSpells.has(input.subject.actorId)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This caster is already holding a readied spell.",
    );
  }
  const castingState = invocation.spellRuleFacts.components.verbal
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
  /* v8 ignore start -- Defensive internal guard: invocation admission proves a character caster, and synchronous Concentration teardown preserves that combatant and origin. */
  if (refreshedActor?.origin.kind !== "character") {
    return invalidResult(
      input.state,
      "staleSubject",
      "Ready Spell caster is no longer available.",
    );
  }
  /* v8 ignore stop */
  const concentratingActor = {
    ...refreshedActor,
    concentration: {
      sourceProcedureRef: input.subject.procedureRef,
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
        procedureRef: input.subject.procedureRef,
        trigger: input.subject.mode.trigger,
        expiresAt: {
          kind: "startOfTurn" as const,
          combatantId: input.subject.actorId,
        },
      },
    ),
  };
  const spent = spendAction(withConcentration.currentTurnResources, "magic");
  /* v8 ignore start -- Defensive internal guard: dispatcher Magic-action admission runs before Ready resolution, and the preceding synchronous setup does not spend an Action. */
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic action is no longer available for the current actor.",
    );
  }
  /* v8 ignore stop */
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
  /* v8 ignore start -- Defensive internal guard: spell discovery and interrupt-checkpoint admission reject a second committed Spell Slot use before Ready resolution. */
  if (Either.isLeft(nextTurnResources)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  /* v8 ignore stop */
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
  candidateInvocation: ReleasableSpellInvocation,
  options: {
    readonly selfOriginAreaAnchorId?: CombatantId;
    readonly opensSpellCastReactionWindow?: boolean;
    readonly storedGlyphTriggeringCreatureTargetId?: CombatantId;
  } = {},
): BattleResolutionResult {
  if (candidateInvocation.procedure === "chainedSpellAttackDamage") {
    return resolveChainedSpellAttackDamageAct({
      input,
      actorId: input.subject.actorId,
      invocation: candidateInvocation,
      opensSpellCastReactionWindow: false,
      spendsCastResources: false,
    });
  }
  const fillSet = spellFillSet(
    input.fills,
    candidateInvocation,
    candidateInvocation.sourceProcedureRef,
    input.subject.actorId,
    input.state,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  /* v8 ignore stop */
  const selectedInvocation = selectedSpellAttackDamageProcedure(
    candidateInvocation,
    fillSet.damageTypeChoice,
  );
  if (selectedInvocation.tag === "needsHoles") {
    return needsHolesResult(input.state, input.subject, [
      selectedInvocation.hole,
    ]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (selectedInvocation.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      selectedInvocation.message,
    );
  }
  /* v8 ignore stop */
  const invocation = selectedInvocation.invocation;
  if (invocation.procedure === "spiritualWeaponAttackProxy") {
    if (fillSet.spiritualWeaponForcePosition === undefined) {
      return needsHolesResult(input.state, input.subject, [
        spiritualWeaponForcePositionHole(invocation),
      ]);
    }
    const spiritualWeaponPlacementError =
      spiritualWeaponForcePositionInvalidReason(
        fillSet.spiritualWeaponForcePosition,
        invocation,
      );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (spiritualWeaponPlacementError !== null) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        spiritualWeaponPlacementError,
      );
    }
    /* v8 ignore stop */
  }
  if (invocation.procedure === "saveGatedDamage") {
    return resolveSaveGateDamageSpellRelease({
      input,
      actorId: input.subject.actorId,
      invocation,
      fillSet,
      ...(options.selfOriginAreaAnchorId === undefined
        ? {}
        : { selfOriginAreaAnchorId: options.selfOriginAreaAnchorId }),
      ...(options.opensSpellCastReactionWindow === undefined
        ? {}
        : {
            opensSpellCastReactionWindow: options.opensSpellCastReactionWindow,
          }),
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
  const storedGlyphRetargetingMatches =
    options.storedGlyphTriggeringCreatureTargetId !== undefined &&
    fillSet.targetId === options.storedGlyphTriggeringCreatureTargetId;
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    target == null ||
    (!storedGlyphRetargetingMatches &&
      !spellTargetIsLegal(
        input.state,
        input.subject.actorId,
        target.combatantId,
        invocation,
        fillSet.targetSpatialFacts,
      ))
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Readied spell target must be a combatant within the selected spell's supported range.",
    );
  }
  /* v8 ignore stop */
  let spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [];
  let releaseResolutionStateAfterCriticalMovement: BattleState | null = null;
  if (
    invocation.procedure === "spellAttackDamage" ||
    invocation.procedure === "spiritualWeaponAttackProxy"
  ) {
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
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (!attackRollResultIsValid(fillSet.attackRoll)) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell attack roll result is outside the d20 attack-roll protocol.",
      );
    }
    /* v8 ignore stop */
    const spellAttackRerollIssue = spellAttackRerollUnsupportedIssue(
      fillSet.attackRoll,
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (spellAttackRerollIssue !== null) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(input.state, "invalidFill", spellAttackRerollIssue);
    }
    /* v8 ignore stop */
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (!attackRollModeMatches(fillSet.attackRoll, requiredRollMode)) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        "Readied spell attack roll mode does not match the current attack-roll rule.",
      );
    }
    /* v8 ignore stop */
    const actorBeforeSpellAttack = input.state.combatants.get(
      input.subject.actorId,
    );
    if (
      d20TestNaturalOneRerollRollDecisionRequired({
        actor: actorBeforeSpellAttack,
        originalNaturalD20: Number(fillSet.attackRoll.naturalD20),
        rollMode: fillSet.attackRoll.rollMode,
        rolledD20s: fillSet.attackRoll.rolledD20s,
        decision: fillSet.attackRoll.d20TestNaturalOneReroll,
      })
    ) {
      return needsHolesResult(input.state, input.subject, [
        attackRollHoleWithD20TestNaturalOneRerollOption(
          spellAttackRollHole(
            input.state,
            input.subject.actorId,
            invocation,
            requiredRollMode,
          ),
        ),
      ]);
    }
    const d20TestNaturalOneRerollIssue = d20TestNaturalOneRerollRollIssue({
      actor: actorBeforeSpellAttack,
      total: fillSet.attackRoll.total,
      originalNaturalD20: Number(fillSet.attackRoll.naturalD20),
      rollMode: fillSet.attackRoll.rollMode,
      rolledD20s: fillSet.attackRoll.rolledD20s,
      decision: fillSet.attackRoll.d20TestNaturalOneReroll,
      requiredRollMode,
    });
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (d20TestNaturalOneRerollIssue !== null) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        d20TestNaturalOneRerollIssue,
      );
    }
    /* v8 ignore stop */
    const effectiveAttackRoll = effectiveD20TestNaturalOneRerollAttackRoll(
      fillSet.attackRoll,
    );
    const ordinaryHit = attackRollHits(
      effectiveAttackRoll,
      currentArmorClass(activeEffectArmorClass(input.state, target)),
    );
    const missToHitReplacement = selectedAttackRollMissToHitReplacement({
      state: input.state,
      subject: input.subject,
      attackerId: input.subject.actorId,
      targetId: target.combatantId,
      attackRoll: effectiveAttackRoll,
      ordinaryHit,
    });
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (
      fillSet.attackRoll.missToHitReplacementProcedureRef !== undefined &&
      missToHitReplacement === null
    ) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        ordinaryHit
          ? "Attack-roll miss-to-hit replacement can only be selected after a miss."
          : "Attack-roll miss-to-hit replacement is not available for this spell attack roll.",
      );
    }
    /* v8 ignore stop */
    const releaseAttackRolledState = recordAttackRollMissToHitReplacementUsed(
      consumeHelpAttackForAttackRoll(
        recordAttackRollOngoingFeatures(
          input.state,
          input.subject.actorId,
          target.combatantId,
          null,
          fillSet.targetRelationshipFacts,
        ),
        input.subject.actorId,
        target.combatantId,
      ),
      input.subject.actorId,
      missToHitReplacement,
      {
        subject: input.subject,
        targetId: target.combatantId,
        attackRoll: effectiveAttackRoll,
      },
    );
    const hit = ordinaryHit || missToHitReplacement !== null;
    const critical = attackRollIsCriticalHit(effectiveAttackRoll);
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
      return remarkableAthleteMovement.result.tag === "needsHoles"
        ? {
            ...remarkableAthleteMovement.result,
            state: input.state,
            snapshot: snapshotBattle(input.state),
          }
        : {
            ...remarkableAthleteMovement.result,
            snapshot: snapshotBattle(input.state),
          };
    }
    const spiritualWeaponRepeatTargeting = {
      kind: "fixedCombatant" as const,
      combatantId: target.combatantId,
    };
    releaseResolutionStateAfterCriticalMovement =
      invocation.procedure === "spiritualWeaponAttackProxy" &&
      fillSet.spiritualWeaponForcePosition !== undefined
        ? applySpiritualWeaponAttackProxyEffect({
            state: remarkableAthleteMovement.state,
            actorId: input.subject.actorId,
            forcePositionId: fillSet.spiritualWeaponForcePosition.positionId,
            repeatTargeting: spiritualWeaponRepeatTargeting,
            invocation,
          })
        : remarkableAthleteMovement.state;
    if (hit && fillSet.damageRoll == null) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (fillSet.sourceDamageRollPenaltyRolls.length > 0) {
        /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
        return invalidResult(
          input.state,
          "invalidFill",
          "Source damage roll penalty does not match an active source-side damage penalty.",
        );
      }
      /* v8 ignore stop */
      return needsHolesResult(input.state, input.subject, [
        spellDamageHole(invocation, critical, spellMarkedDamageRiders),
      ]);
    }
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (
      !hit &&
      (fillSet.damageRoll != null ||
        fillSet.damageDispositions.length > 0 ||
        fillSet.sourceDamageRollPenaltyRolls.length > 0)
    ) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell damage can only be filled after a hit.",
      );
    }
    /* v8 ignore stop */
    if (!hit) {
      return {
        tag: "resolved",
        state: releaseResolutionStateAfterCriticalMovement,
        snapshot: snapshotBattle(releaseResolutionStateAfterCriticalMovement),
      };
    }
  } else if (fillSet.attackRoll != null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Magic Missile does not use an attack roll.",
    );
  }

  if (fillSet.damageRoll == null) {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fillSet.sourceDamageRollPenaltyRolls.length > 0) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        "Source damage roll penalty does not match an active source-side damage penalty.",
      );
    }
    /* v8 ignore stop */
    return needsHolesResult(input.state, input.subject, [
      spellDamageHole(invocation),
    ]);
  }
  const releaseDamageBaseState =
    releaseResolutionStateAfterCriticalMovement ?? input.state;
  const effectiveReleaseAttackRoll =
    (invocation.procedure === "spellAttackDamage" ||
      invocation.procedure === "spiritualWeaponAttackProxy") &&
    fillSet.attackRoll != null
      ? effectiveD20TestNaturalOneRerollAttackRoll(fillSet.attackRoll)
      : undefined;
  const critical =
    effectiveReleaseAttackRoll !== undefined &&
    attackRollIsCriticalHit(effectiveReleaseAttackRoll);
  const damageValidation = validateSpellDamageFill(
    fillSet.damageRoll,
    invocation,
    critical,
    spellMarkedDamageRiders,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", damageValidation);
  }
  /* v8 ignore stop */
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    unexpectedSourceDamageRollPenaltyRoll(
      fillSet.sourceDamageRollPenaltyRolls,
      expectedSourcePenaltyHole === null ? [] : [expectedSourcePenaltyHole],
    ) !== undefined
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  /* v8 ignore stop */
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (sourcePenalty.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  /* v8 ignore stop */
  if (sourcePenalty.tag === "needsHoles") {
    return needsHolesResult(input.state, input.subject, [
      ...sourcePenalty.holes,
    ]);
  }
  const spellDamageAmount = damageAmountByTypeAfterTargetAdjustments(
    input.state,
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
    return needsHolesResult(input.state, input.subject, [
      ...concentrationSaveCheck.holes,
    ]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (concentrationSaveCheck.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      concentrationSaveCheck.message,
    );
  }
  /* v8 ignore stop */
  const damageDispositionHole = zeroHitPointReplacementDispositionHole({
    damageSourceId: input.subject.actorId,
    target,
    damageAmount: spellDamageAmount,
  });
  const damageDispositionValidation = damageDispositionFillsValidation({
    holes: damageDispositionHole === null ? [] : [damageDispositionHole],
    fills: fillSet.damageDispositions,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageDispositionValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      damageDispositionValidation,
    );
  }
  /* v8 ignore stop */
  if (
    damageDispositionHole !== null &&
    damageDispositionFillFor(
      fillSet.damageDispositions,
      damageDispositionHole,
    ) === undefined
  ) {
    return needsHolesResult(input.state, input.subject, [
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
    return needsHolesResult(input.state, input.subject, [
      ...hideousLaughterSaveCheck.holes,
    ]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (hideousLaughterSaveCheck.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      hideousLaughterSaveCheck.message,
    );
  }
  /* v8 ignore stop */
  const hideousLaughterLifecycleFills = fillsMatchingHoleIds(
    fillSet.hideousLaughterDamageRepeatSaves,
    hideousLaughterSaveCheck.holes,
  );
  const releaseResolutionState =
    effectiveReleaseAttackRoll !== undefined
      ? (releaseResolutionStateAfterCriticalMovement ??
        recordAttackRollMissToHitReplacementUsed(
          consumeHelpAttackForAttackRoll(
            recordAttackRollOngoingFeatures(
              input.state,
              input.subject.actorId,
              target.combatantId,
              null,
              fillSet.targetRelationshipFacts,
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
            attackRoll: effectiveReleaseAttackRoll,
            ordinaryHit: attackRollHits(
              effectiveReleaseAttackRoll,
              currentArmorClass(activeEffectArmorClass(input.state, target)),
            ),
          }),
          {
            subject: input.subject,
            targetId: target.combatantId,
            attackRoll: effectiveReleaseAttackRoll,
          },
        ))
      : input.state;
  const damageDisposition = damageDispositionForTarget(
    damageDispositionHole === null ? [] : [damageDispositionHole],
    fillSet.damageDispositions,
    target.combatantId,
  );
  const relationshipCheck = damageRelationshipDecisionFillCheck({
    state: releaseResolutionState,
    damageEventHoleId: fillSet.damageRoll.holeId,
    damageSourceId: input.subject.actorId,
    targets:
      spellDamageAmount <= 0
        ? []
        : [
            {
              targetId: target.combatantId,
              damageAmount: toDamageAmount(spellDamageAmount),
              damageDisposition,
            },
          ],
    spatialFacts: fillSet.targetSpatialFacts,
    decisionsByRelationshipHole: fillSet.damageRelationshipDecisions,
  });
  if (relationshipCheck.tag === "needsHoles") {
    return needsHolesResult(
      input.state,
      input.subject,
      relationshipCheck.holes,
    );
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (relationshipCheck.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", relationshipCheck.message);
  }
  /* v8 ignore stop */
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
      damageDisposition,
      spellMarkedDamageRiders,
      sourceDamageRollPenaltyRoll,
      hideousLaughterDamageRepeatSaves: hideousLaughterLifecycleFills,
      damageSourceId: input.subject.actorId,
      spatialFacts: fillSet.targetSpatialFacts,
      ...(relationshipCheck.decisions === undefined
        ? {}
        : { relationshipDecisions: relationshipCheck.decisions }),
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
