// Monk's Focus option execution.
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.monk-focus-battle-options unit-feature.open-hand-technique unit-feature.stunning-strike

import {
  rolledDiceTotal,
  validateRolledDiceForDiceExpr,
} from "@dnd/shared-algebras/runtime-dice-algebra";
import { spendActivationResource } from "@dnd/shared-algebras/action-economy-algebra";
import * as Either from "effect/Either";
import type { SupportedAttackActionOption } from "../battle-action-options.ts";
import type {
  AdmittedMonkFocusOptionBattleResolutionInput,
  BattleCreatureState,
  BattleFill,
  BattleRolledDiceFill,
  BattleResolutionResult,
  BattleState,
  BattleTurnResources,
  BattleUnitFeatureRollHole,
  CharacterBattleCreatureState,
  MonkFocusOptionBattleResolutionInput,
} from "../battle-state-execution.ts";
import { SIZES } from "@dnd/shared/types";
import type { BattleProcedureExecutionRef, CombatantId } from "../identity.ts";
import {
  resourceHasUsesRemaining,
  spendCharacterResourceUse,
  type CharacterBattleUseCountResourceState,
} from "../character-battle-resource-execution.ts";
import type { MonkFocusFlurryOfBlowsActionResource } from "./battle-runtime-protocol.ts";
import { applyDashToActor, applyDisengage } from "./mobility-actions.ts";
import {
  combatantCanTakeActions,
  isCharacterBattleCreatureState,
} from "./creature-state-execution.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { representedMovementSpeedKinds } from "./movement-speed.ts";
import { invalidResult } from "./result-helpers.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import { applyTemporaryHitPoints } from "./damage-apply.ts";
import { combatantEffectiveSize } from "./druid-wild-shape.ts";
import { clearPendingAttackRollMissToHitReplacementSelection } from "./statblock-attacks.ts";
import {
  flurryOfBlowsUnarmedStrikeForActor,
  heightenedPatientDefenseTemporaryHitPointsDiceExpr,
  heightenedPatientDefenseTemporaryHitPointsRollHole,
  heightenedStepOfTheWindCarryHole,
  isMonkFocusFlurryOfBlowsActionResource,
  monkFocusResourceForActor,
  monkHasHeightenedFocus,
} from "./monk-focus-discovery.ts";
import type { MonkFocusResourceFact } from "./monk-focus-discovery.ts";
export {
  flurryOfBlowsUnarmedStrikeForActor,
  isMonkFocusFlurryOfBlowsActionResource,
  monkFocusActs,
  monkFocusResourceForActor,
} from "./monk-focus-discovery.ts";
export type { MonkFocusResourceFact } from "./monk-focus-discovery.ts";

export function resolveMonkFocusOption(
  input: AdmittedMonkFocusOptionBattleResolutionInput,
): BattleResolutionResult {
  const focus = monkFocusResourceForActor(
    input.state,
    input.subject.actorId,
    input.subject.procedureRef,
  );
  if (focus === null) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Monk Focus option requires the shared Focus Point resource.",
    );
  }
  if (!combatantCanTakeActions(focus.actor)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Monk Focus options are no longer available for this actor.",
    );
  }
  if (
    input.subject.option === "flurryOfBlows" &&
    flurryOfBlowsUnarmedStrikeForActor(input.state, input.subject.actorId) ===
      undefined
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Flurry of Blows requires an available Unarmed Strike target.",
    );
  }
  const heightenedPatientDefenseRollRequest =
    heightenedPatientDefenseTemporaryHitPointsRollRequest(input, focus);
  const heightenedStepOfTheWindCarryRequest =
    heightenedStepOfTheWindCarryRequestForInput(input, focus);
  if (heightenedPatientDefenseRollRequest.tag === "needsRoll") {
    return needsHolesResult(input.state, input.subject, [
      heightenedPatientDefenseRollRequest.hole,
    ]);
  }
  if (heightenedPatientDefenseRollRequest.tag === "invalid") {
    return invalidResult(
      input.state,
      "invalidFill",
      heightenedPatientDefenseRollRequest.message,
    );
  }
  if (heightenedStepOfTheWindCarryRequest.tag === "invalid") {
    return invalidResult(
      input.state,
      "invalidFill",
      heightenedStepOfTheWindCarryRequest.message,
    );
  }
  if (
    input.fills.length > 0 &&
    heightenedPatientDefenseRollRequest.tag !== "roll" &&
    heightenedStepOfTheWindCarryRequest.tag !== "carry"
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Monk Focus options accept no fills.",
    );
  }
  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Monk Focus Bonus Action is no longer available.",
    );
  }

  if (input.subject.option === "flurryOfBlows") {
    return resolveFlurryOfBlowsActivation(input, focus, spent.right);
  }
  if (
    input.subject.option === "patientDefense" &&
    input.subject.mode === "freeDisengage"
  ) {
    const nextState = applyDisengage(input.state, spent.right);
    return resolved(nextState);
  }
  if (
    input.subject.option === "patientDefense" &&
    input.subject.mode === "focusDisengageDodge"
  ) {
    return resolvePatientDefenseFocus(input, focus, spent.right);
  }
  if (
    input.subject.option === "stepOfTheWind" &&
    input.subject.mode === "freeDash"
  ) {
    if (
      !representedMovementSpeedKinds(focus.actor).includes(
        input.subject.speedKind,
      )
    ) {
      return invalidResult(
        input.state,
        "unsupportedActOption",
        "Step of the Wind speed kind is not represented for this combatant.",
      );
    }
    const nextState = applyDashToActor(
      input.state,
      focus.actor,
      input.subject.speedKind,
      spent.right,
    );
    return resolved(nextState);
  }
  if (
    input.subject.option === "stepOfTheWind" &&
    input.subject.mode === "focusDisengageDash"
  ) {
    return resolveStepOfTheWindFocus(
      input,
      focus,
      spent.right,
      heightenedStepOfTheWindCarryRequest,
    );
  }
  return invalidResult(
    input.state,
    "unsupportedActOption",
    "Monk Focus option mode is not admitted by the runtime profile.",
  );
}

function resolveFlurryOfBlowsActivation(
  input: MonkFocusOptionBattleResolutionInput,
  focus: MonkFocusResourceFact,
  spentResources: BattleTurnResources,
): BattleResolutionResult {
  if (!resourceHasUsesRemaining(focus.resource)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Flurry of Blows requires an unspent Focus Point.",
    );
  }
  const withSpentFocus = stateWithMonkFocusResource(
    input.state,
    focus.actor,
    spendCharacterResourceUse(focus.resource),
  );
  const nextState = {
    ...withSpentFocus,
    currentTurnResources: {
      ...spentResources,
      actionResources: [
        ...spentResources.actionResources,
        ...Array.from(
          { length: monkFocusFlurryOfBlowsStrikeCount(focus) },
          (): MonkFocusFlurryOfBlowsActionResource => ({
            kind: "action",
            source: "monkFocusFlurryOfBlows",
            sourceOwnerId: input.subject.actorId,
            sourceProcedureRef: input.subject.procedureRef,
          }),
        ),
      ],
    },
  };
  return resolved(nextState);
}

function resolvePatientDefenseFocus(
  input: MonkFocusOptionBattleResolutionInput,
  focus: MonkFocusResourceFact,
  spentResources: BattleTurnResources,
): BattleResolutionResult {
  if (!resourceHasUsesRemaining(focus.resource)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Patient Defense requires an unspent Focus Point for Dodge.",
    );
  }
  const withDisengage = applyDisengage(input.state, spentResources);
  const actor = withDisengage.combatants.get(input.subject.actorId);
  if (!isCharacterBattleCreatureState(actor)) {
    return invalidResult(
      input.state,
      "missingCombatant",
      "Patient Defense actor is not in this battle.",
    );
  }
  const dodgingActor = { ...actor, dodging: true };
  const withDodge = {
    ...withDisengage,
    combatants: new Map(withDisengage.combatants).set(
      actor.combatantId,
      dodgingActor,
    ),
  };
  const heightenedRoll = heightenedPatientDefenseTemporaryHitPointsRollRequest(
    input,
    focus,
  );
  if (heightenedRoll.tag === "invalid" || heightenedRoll.tag === "needsRoll") {
    return invalidResult(
      input.state,
      "invalidFill",
      heightenedRoll.tag === "invalid"
        ? heightenedRoll.message
        : "Heightened Focus Patient Defense requires a Temporary Hit Points roll.",
    );
  }
  const withHeightenedTemporaryHitPoints =
    heightenedRoll.tag === "roll"
      ? stateWithHeightenedPatientDefenseTemporaryHitPoints(
          withDodge,
          dodgingActor,
          heightenedRoll.roll,
        )
      : withDodge;
  const actorAfterTemporaryHitPoints =
    withHeightenedTemporaryHitPoints.combatants.get(input.subject.actorId);
  if (!isCharacterBattleCreatureState(actorAfterTemporaryHitPoints)) {
    return invalidResult(
      input.state,
      "missingCombatant",
      "Patient Defense actor is not in this battle.",
    );
  }
  return resolved(
    stateWithMonkFocusResource(
      withHeightenedTemporaryHitPoints,
      actorAfterTemporaryHitPoints,
      spendCharacterResourceUse(focus.resource),
    ),
  );
}

type HeightenedPatientDefenseTemporaryHitPointsRollRequest =
  | { readonly tag: "none" }
  | { readonly tag: "needsRoll"; readonly hole: BattleUnitFeatureRollHole }
  | { readonly tag: "roll"; readonly roll: BattleRolledDiceFill }
  | { readonly tag: "invalid"; readonly message: string };

function heightenedPatientDefenseTemporaryHitPointsRollRequest(
  input: MonkFocusOptionBattleResolutionInput,
  focus: MonkFocusResourceFact,
): HeightenedPatientDefenseTemporaryHitPointsRollRequest {
  if (
    input.subject.option !== "patientDefense" ||
    input.subject.mode !== "focusDisengageDodge" ||
    !monkHasHeightenedFocus(focus.actor)
  ) {
    return { tag: "none" };
  }
  const roll = singleRolledDiceFill(input.fills);
  if (roll === undefined) {
    return {
      tag: "needsRoll",
      hole: heightenedPatientDefenseTemporaryHitPointsRollHole(focus),
    };
  }
  if (roll === "invalid") {
    return {
      tag: "invalid",
      message:
        "Heightened Focus Patient Defense requires exactly one Temporary Hit Points roll.",
    };
  }
  const expectedHole =
    heightenedPatientDefenseTemporaryHitPointsRollHole(focus);
  if (roll.holeId !== expectedHole.holeId) {
    return {
      tag: "invalid",
      message:
        "Heightened Focus Patient Defense roll does not match the requested hole.",
    };
  }
  if (
    roll.selectedAttackDamageRiderProcedureRefs !== undefined ||
    roll.cunningStrikeOption !== undefined ||
    roll.weaponDamageDiceRollChoice !== undefined ||
    roll.attackDamageDieFloorChoice !== undefined ||
    roll.attackDamageAbilityModifierChoice !== undefined ||
    roll.spellDamageReroll !== undefined
  ) {
    return {
      tag: "invalid",
      message:
        "Heightened Focus Patient Defense roll does not accept damage-roll feature choices.",
    };
  }
  const validation = validateRolledDiceForDiceExpr(
    roll.value,
    heightenedPatientDefenseTemporaryHitPointsDiceExpr(focus),
  );
  return validation === null
    ? { tag: "roll", roll }
    : { tag: "invalid", message: validation.reason };
}

function singleRolledDiceFill(
  fills: readonly BattleFill[],
): BattleRolledDiceFill | "invalid" | undefined {
  const [first, ...rest] = fills;
  if (first === undefined) return undefined;
  if (first.kind !== "rolledDice" || rest.length > 0) return "invalid";
  return first;
}

function stateWithHeightenedPatientDefenseTemporaryHitPoints(
  state: BattleState,
  actor: CharacterBattleCreatureState,
  roll: BattleRolledDiceFill,
): BattleState {
  return {
    ...state,
    combatants: new Map(state.combatants).set(
      actor.combatantId,
      applyTemporaryHitPoints(actor, rolledDiceTotal(roll.value)),
    ),
  };
}

function monkFocusFlurryOfBlowsStrikeCount(
  focus: MonkFocusResourceFact,
): 2 | 3 {
  return monkHasHeightenedFocus(focus.actor)
    ? 3
    : focus.execution.flurryOfBlows.strikeCount;
}

function resolveStepOfTheWindFocus(
  input: MonkFocusOptionBattleResolutionInput,
  focus: MonkFocusResourceFact,
  spentResources: BattleTurnResources,
  carryRequest: HeightenedStepOfTheWindCarryRequest,
): BattleResolutionResult {
  if (!resourceHasUsesRemaining(focus.resource)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Step of the Wind requires an unspent Focus Point for Disengage.",
    );
  }
  if (
    input.subject.option !== "stepOfTheWind" ||
    input.subject.mode !== "focusDisengageDash"
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Step of the Wind Focus mode requires a Dash speed kind.",
    );
  }
  if (
    !representedMovementSpeedKinds(focus.actor).includes(
      input.subject.speedKind,
    )
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Step of the Wind speed kind is not represented for this combatant.",
    );
  }
  const withDash = applyDashToActor(
    input.state,
    focus.actor,
    input.subject.speedKind,
    spentResources,
  );
  const withDisengage = applyDisengage(withDash, withDash.currentTurnResources);
  const withJumpDistanceMultiplier = applyStepOfTheWindJumpDistanceMultiplier(
    withDisengage,
    focus,
  );
  const withCarriedCreature = applyHeightenedStepOfTheWindCarry(
    withJumpDistanceMultiplier,
    focus,
    carryRequest,
    input.subject.procedureRef,
  );
  const actor = withCarriedCreature.combatants.get(input.subject.actorId);
  if (!isCharacterBattleCreatureState(actor)) {
    return invalidResult(
      input.state,
      "missingCombatant",
      "Step of the Wind actor is not in this battle.",
    );
  }
  return resolved(
    stateWithMonkFocusResource(
      withCarriedCreature,
      actor,
      spendCharacterResourceUse(focus.resource),
    ),
  );
}

type HeightenedStepOfTheWindCarryRequest =
  | { readonly tag: "none" }
  | { readonly tag: "noCarry" }
  | { readonly tag: "carry"; readonly carriedCreatureId: CombatantId }
  | { readonly tag: "invalid"; readonly message: string };

function heightenedStepOfTheWindCarryRequestForInput(
  input: MonkFocusOptionBattleResolutionInput,
  focus: MonkFocusResourceFact,
): HeightenedStepOfTheWindCarryRequest {
  if (
    input.subject.option !== "stepOfTheWind" ||
    input.subject.mode !== "focusDisengageDash" ||
    !monkHasHeightenedFocus(focus.actor)
  ) {
    return { tag: "none" };
  }
  const [first, ...rest] = input.fills;
  if (first === undefined) return { tag: "noCarry" };
  if (
    rest.length > 0 ||
    first.kind !== "targetChoice" ||
    first.holeId !== heightenedStepOfTheWindCarryHole(input.state, focus).holeId
  ) {
    return {
      tag: "invalid",
      message:
        "Heightened Focus Step of the Wind accepts at most one carried-creature target choice.",
    };
  }
  const carriedCreature = input.state.combatants.get(first.value);
  if (first.value === input.subject.actorId || carriedCreature === undefined) {
    return {
      tag: "invalid",
      message:
        "Heightened Focus Step of the Wind carried creature must be another combatant in the battle.",
    };
  }
  if (
    !heightenedStepOfTheWindCarryHole(input.state, focus).choices.includes(
      first.value,
    )
  ) {
    return {
      tag: "invalid",
      message:
        "Heightened Focus Step of the Wind carried creature is not an eligible target choice.",
    };
  }
  if (!creatureSizeAtMostLarge(carriedCreature)) {
    return {
      tag: "invalid",
      message:
        "Heightened Focus Step of the Wind carried creature must be Large or smaller.",
    };
  }
  if (
    !first.spatialFacts?.some(
      (fact) =>
        fact.kind === "heightenedStepOfTheWindCarryEligible" &&
        fact.carrierId === input.subject.actorId &&
        fact.carriedCreatureId === first.value,
    )
  ) {
    return {
      tag: "invalid",
      message:
        "Heightened Focus Step of the Wind requires a table fact that the carried creature is willing and within 5 feet.",
    };
  }
  return { tag: "carry", carriedCreatureId: first.value };
}

function creatureSizeAtMostLarge(combatant: BattleCreatureState): boolean {
  return (
    SIZES.indexOf(combatantEffectiveSize(combatant)) <= SIZES.indexOf("large")
  );
}

function applyHeightenedStepOfTheWindCarry(
  state: BattleState,
  focus: MonkFocusResourceFact,
  request: HeightenedStepOfTheWindCarryRequest,
  sourceProcedureRef: BattleProcedureExecutionRef,
): BattleState {
  if (request.tag !== "carry") return state;
  return {
    ...state,
    currentTurnResources: {
      ...state.currentTurnResources,
      heightenedStepOfTheWindCarriedCreatures: [
        ...state.currentTurnResources.heightenedStepOfTheWindCarriedCreatures,
        {
          carrierId: focus.actor.combatantId,
          carriedCreatureId: request.carriedCreatureId,
          sourceProcedureRef,
          movementDoesNotProvokeOpportunityAttacks: true,
          expires: "endOfCarrierTurn",
        },
      ],
    },
  };
}

function applyStepOfTheWindJumpDistanceMultiplier(
  state: BattleState,
  focus: MonkFocusResourceFact,
): BattleState {
  return {
    ...state,
    currentTurnResources: {
      ...state.currentTurnResources,
      jumpDistanceMultiplier: {
        multiplier:
          focus.execution.stepOfTheWind.jumpDistanceMultiplier.multiplier,
      },
    },
  };
}

export function spendMonkFocusFlurryOfBlowsActionResource(
  state: BattleState,
  actorId: CombatantId,
  _attack: SupportedAttackActionOption,
  focusProcedureRef: BattleProcedureExecutionRef,
): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  const resourceIndex = state.currentTurnResources.actionResources.findIndex(
    (resource) =>
      isMonkFocusFlurryOfBlowsActionResource(
        resource,
        actorId,
        focusProcedureRef,
      ),
  );
  if (resourceIndex === -1) {
    return invalidResult(
      state,
      "staleSubject",
      "Flurry of Blows Unarmed Strike is no longer available.",
    );
  }
  const nextState = {
    ...state,
    currentTurnResources: clearPendingAttackRollMissToHitReplacementSelection(
      {
        ...state.currentTurnResources,
        actionResources: state.currentTurnResources.actionResources.filter(
          (_, index) => index !== resourceIndex,
        ),
      },
      actorId,
    ),
  };
  return resolved(nextState);
}

export function stateHasMonkFocusFlurryOfBlowsActionResource(
  state: BattleState,
  actorId: CombatantId,
  focusProcedureRef: BattleProcedureExecutionRef,
): boolean {
  return state.currentTurnResources.actionResources.some((resource) =>
    isMonkFocusFlurryOfBlowsActionResource(
      resource,
      actorId,
      focusProcedureRef,
    ),
  );
}

export function stateWithMonkFocusResource(
  state: BattleState,
  actor: CharacterBattleCreatureState,
  resource: CharacterBattleUseCountResourceState,
): BattleState {
  const currentActor = state.combatants.get(actor.combatantId);
  if (currentActor?.origin.kind !== "character") return state;
  const nextActor: BattleCreatureState = {
    ...currentActor,
    origin: {
      ...currentActor.origin,
      resources: currentActor.origin.resources.map((candidate) =>
        candidate.resourcePoolRef === resource.resourcePoolRef
          ? resource
          : candidate,
      ),
    },
  };
  return {
    ...state,
    combatants: new Map(state.combatants).set(actor.combatantId, nextActor),
  };
}

function resolved(
  state: BattleState,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  return {
    tag: "resolved",
    state,
    snapshot: snapshotBattle(state),
  };
}
