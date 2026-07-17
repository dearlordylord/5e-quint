// Monk's Focus option execution.
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.monk-focus-battle-options unit-feature.open-hand-technique unit-feature.stunning-strike

import {
  rolledDiceTotal,
  validateRolledDiceForDiceExpr,
} from "@dnd/shared-algebras/runtime-dice-algebra";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import type { DiceExpr } from "@dnd/surface/surface/types";
import {
  canSpendBonusAction,
  spendActivationResource,
} from "@dnd/shared-algebras/action-economy-algebra";
import * as Either from "effect/Either";

import type {
  BoundCharacterUnarmedStrikeActionOption,
  SupportedAttackActionOption,
} from "../battle-action-options.ts";
import type {
  AvailableBattleAct,
  AdmittedMonkFocusFlurryOfBlowsStrikeBattleResolutionInput,
  AdmittedMonkFocusOptionBattleResolutionInput,
  BattleCreatureState,
  BattleFill,
  BattleRolledDiceFill,
  BattleResolutionResult,
  BattleState,
  BattleTargetChoiceHole,
  BattleTurnResources,
  BattleUnitFeatureRollHole,
  CharacterBattleCreatureState,
  MonkFocusOptionBattleResolutionInput,
} from "../battle-reducer.ts";
import { SIZES } from "@dnd/shared/types";
import type { CombatantId } from "../identity.ts";
import type { CharacterBattleUseCountResourceState } from "../character-battle-resources.ts";
import {
  characterBattleResourceIsUseCount,
  resourceHasUsesRemaining,
  spendCharacterResourceUse,
} from "../character-battle-resources.ts";
import {
  battleMonkFocusBattleOptionsSupportForUnit,
  martialArtsSrdDieSizeAtClassLevel,
  type BattleMonkFocusBattleOptionsSupportProfile,
} from "../unit-feature-support.ts";

import type { MonkFocusFlurryOfBlowsActionResource } from "./battle-runtime-protocol.ts";
import { attackActionOptionsForActor } from "./attack-damage-apply.ts";
import { applyDashToActor, applyDisengage } from "./attack-resolution.ts";
import {
  combatantCanTakeActions,
  isCharacterBattleCreatureState,
} from "./creature-state.ts";
import {
  attackTargetChoices,
  attackTargetHole,
  needsHolesResult,
} from "./hole-helpers.ts";
import { representedMovementSpeedKinds } from "./movement-speed.ts";
import { invalidResult } from "./result-helpers.ts";
import { resolveSelectedAttackProcedure } from "./attack-main.ts";
import { snapshotBattle } from "./dispatcher.ts";
import { applyTemporaryHitPoints } from "./damage-apply.ts";
import { combatantEffectiveSize } from "./druid-wild-shape.ts";
import { clearPendingAttackRollMissToHitReplacementSelection } from "./statblock-attacks.ts";

export type MonkFocusResourceFact = {
  readonly actor: CharacterBattleCreatureState;
  readonly resource: CharacterBattleUseCountResourceState;
  readonly profile: BattleMonkFocusBattleOptionsSupportProfile;
};

const HEIGHTENED_FOCUS_MONK_LEVEL = 10;

export function monkFocusActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  if (!isCharacterBattleCreatureState(actor)) return [];
  if (!combatantCanTakeActions(actor)) return [];

  return [
    ...monkFocusOptionActs(state, actor),
    ...monkFocusFlurryOfBlowsStrikeActs(state, actor),
  ];
}

function monkFocusOptionActs(
  state: BattleState,
  actor: CharacterBattleCreatureState,
): readonly AvailableBattleAct[] {
  if (!canSpendBonusAction(state.currentTurnResources)) return [];
  const focus = monkFocusResourceForActor(state, actor.combatantId);
  if (focus === null) return [];
  const acts: AvailableBattleAct[] = [];
  const hasFocusPoint = resourceHasUsesRemaining(focus.resource);
  const unarmedStrike = flurryOfBlowsUnarmedStrikeForActor(
    state,
    actor.combatantId,
  );

  if (hasFocusPoint && unarmedStrike !== undefined) {
    acts.push({
      subject: {
        tag: "monkFocusOption",
        actorId: actor.combatantId,
        resourceUnitId: focus.resource.unit.id,
        option: "flurryOfBlows",
      },
      label: focus.profile.flurryOfBlows.displayName,
      summary: `Spend 1 Focus Point and a Bonus Action to make ${monkFocusFlurryOfBlowsStrikeCount(focus)} Unarmed Strikes.`,
      initialHoles: [],
    });
  }

  acts.push({
    subject: {
      tag: "monkFocusOption",
      actorId: actor.combatantId,
      resourceUnitId: focus.resource.unit.id,
      option: "patientDefense",
      mode: "freeDisengage",
    },
    label: `${focus.profile.patientDefense.displayName}: Disengage`,
    summary: "Take the Disengage action as a Bonus Action.",
    initialHoles: [],
  });
  if (hasFocusPoint) {
    acts.push({
      subject: {
        tag: "monkFocusOption",
        actorId: actor.combatantId,
        resourceUnitId: focus.resource.unit.id,
        option: "patientDefense",
        mode: "focusDisengageDodge",
      },
      label: `${focus.profile.patientDefense.displayName}: Disengage and Dodge`,
      summary:
        "Spend 1 Focus Point and a Bonus Action to take the Disengage and Dodge actions.",
      initialHoles: monkHasHeightenedFocus(actor)
        ? [heightenedPatientDefenseTemporaryHitPointsRollHole(focus)]
        : [],
    });
  }

  for (const speedKind of representedMovementSpeedKinds(actor)) {
    acts.push({
      subject: {
        tag: "monkFocusOption",
        actorId: actor.combatantId,
        resourceUnitId: focus.resource.unit.id,
        option: "stepOfTheWind",
        mode: "freeDash",
        speedKind,
      },
      label: `${focus.profile.stepOfTheWind.displayName}: Dash`,
      summary: "Take the Dash action as a Bonus Action.",
      initialHoles: [],
    });
    if (hasFocusPoint) {
      acts.push({
        subject: {
          tag: "monkFocusOption",
          actorId: actor.combatantId,
          resourceUnitId: focus.resource.unit.id,
          option: "stepOfTheWind",
          mode: "focusDisengageDash",
          speedKind,
        },
        label: `${focus.profile.stepOfTheWind.displayName}: Disengage and Dash`,
        summary:
          "Spend 1 Focus Point and a Bonus Action to take the Disengage and Dash actions.",
        initialHoles: monkHasHeightenedFocus(actor)
          ? [heightenedStepOfTheWindCarryHole(state, focus)]
          : [],
      });
    }
  }

  return acts;
}

function monkFocusFlurryOfBlowsStrikeActs(
  state: BattleState,
  actor: CharacterBattleCreatureState,
): readonly AvailableBattleAct[] {
  const flurryResource = state.currentTurnResources.actionResources.find(
    (resource): resource is MonkFocusFlurryOfBlowsActionResource =>
      isMonkFocusFlurryOfBlowsActionResource(
        resource,
        actor.combatantId,
        undefined,
      ),
  );
  if (flurryResource === undefined) return [];

  const unarmedStrike = flurryOfBlowsUnarmedStrikeForActor(
    state,
    actor.combatantId,
  );
  if (unarmedStrike === undefined) {
    return [];
  }
  return [
    {
      subject: {
        tag: "monkFocusFlurryOfBlowsStrike",
        actorId: actor.combatantId,
        resourceUnitId: flurryResource.sourceUnitId,
        procedureRef: unarmedStrike.procedureRef,
      },
      label: "Flurry of Blows Unarmed Strike",
      summary: "Make one Unarmed Strike granted by Flurry of Blows.",
      initialHoles: [attackTargetHole(state, actor.combatantId, unarmedStrike)],
    },
  ];
}

export function resolveMonkFocusOption(
  input: AdmittedMonkFocusOptionBattleResolutionInput,
): BattleResolutionResult {
  const focus = monkFocusResourceForActor(input.state, input.subject.actorId);
  if (
    focus === null ||
    focus.resource.unit.id !== input.subject.resourceUnitId
  ) {
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
            sourceUnitId: focus.resource.unit.id,
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
    roll.selectedAttackDamageRiderUnitIds !== undefined ||
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

function heightenedPatientDefenseTemporaryHitPointsRollHole(
  focus: MonkFocusResourceFact,
): BattleUnitFeatureRollHole {
  const expr = heightenedPatientDefenseTemporaryHitPointsDiceExpr(focus);
  const protocolId = `battle:monk-focus:heightened-patient-defense-temporary-hit-points:${focus.resource.unit.id}:${diceExprLabel(expr)}`;
  return {
    kind: "rolledDice",
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: `${focus.profile.patientDefense.displayName} Temporary Hit Points (${diceExprLabel(expr)})`,
    unitFeature: focus.profile,
  };
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

function heightenedPatientDefenseTemporaryHitPointsDiceExpr(
  focus: MonkFocusResourceFact,
): DiceExpr {
  const level = monkClassLevel(focus.actor);
  return {
    dice: 2,
    dieSize: level === null ? 6 : martialArtsSrdDieSizeAtClassLevel(level),
  };
}

function monkFocusFlurryOfBlowsStrikeCount(
  focus: MonkFocusResourceFact,
):
  | BattleMonkFocusBattleOptionsSupportProfile["flurryOfBlows"]["strikeCount"]
  | 3 {
  return monkHasHeightenedFocus(focus.actor)
    ? 3
    : focus.profile.flurryOfBlows.strikeCount;
}

function monkHasHeightenedFocus(actor: CharacterBattleCreatureState): boolean {
  const level = monkClassLevel(actor);
  return level !== null && Number(level) >= HEIGHTENED_FOCUS_MONK_LEVEL;
}

function monkClassLevel(actor: CharacterBattleCreatureState) {
  return (
    actor.origin.classLevels.find((level) => level.className === "monk")
      ?.level ?? null
  );
}

function diceExprLabel(expr: DiceExpr): string {
  const flat =
    expr.flat === undefined || expr.flat === 0
      ? ""
      : expr.flat > 0
        ? `+${expr.flat}`
        : `${expr.flat}`;
  return `${expr.dice}d${expr.dieSize}${flat}`;
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

function heightenedStepOfTheWindCarryHole(
  state: BattleState,
  focus: MonkFocusResourceFact,
): BattleTargetChoiceHole {
  const protocolId = `battle:monk-focus:heightened-step-of-the-wind-carry:${focus.resource.unit.id}:${focus.actor.combatantId}`;
  return {
    kind: "targetChoice",
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: `${focus.profile.stepOfTheWind.displayName} carried creature`,
    requiresTableSpatialFact: true,
    choices: [...state.combatants.keys()].filter(
      (combatantId) => combatantId !== focus.actor.combatantId,
    ),
  };
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
          sourceUnitId: focus.resource.unit.id,
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
          focus.profile.stepOfTheWind.jumpDistanceMultiplier.multiplier,
      },
    },
  };
}

export function resolveMonkFocusFlurryOfBlowsStrike(
  input: AdmittedMonkFocusFlurryOfBlowsStrikeBattleResolutionInput,
): BattleResolutionResult {
  if (
    !combatantCanTakeActions(input.state.combatants.get(input.subject.actorId))
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Flurry of Blows is no longer available for this actor.",
    );
  }
  if (
    !stateHasMonkFocusFlurryOfBlowsActionResource(
      input.state,
      input.subject.actorId,
      input.subject.resourceUnitId,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Flurry of Blows Unarmed Strike is no longer available.",
    );
  }
  const unarmedStrike = flurryOfBlowsUnarmedStrikeForActor(
    input.state,
    input.subject.actorId,
  );
  if (
    unarmedStrike === undefined ||
    unarmedStrike.procedureRef !== input.subject.procedureRef
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Flurry of Blows requires the actor's Unarmed Strike.",
    );
  }
  return resolveSelectedAttackProcedure(
    input,
    unarmedStrike,
    (state, actorId, attack) =>
      spendMonkFocusFlurryOfBlowsActionResource(
        state,
        actorId,
        attack,
        input.subject.resourceUnitId,
      ),
  );
}

function spendMonkFocusFlurryOfBlowsActionResource(
  state: BattleState,
  actorId: CombatantId,
  _attack: SupportedAttackActionOption,
  resourceUnitId: string,
): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  const resourceIndex = state.currentTurnResources.actionResources.findIndex(
    (resource) =>
      isMonkFocusFlurryOfBlowsActionResource(resource, actorId, resourceUnitId),
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

function stateHasMonkFocusFlurryOfBlowsActionResource(
  state: BattleState,
  actorId: CombatantId,
  resourceUnitId: string,
): boolean {
  return state.currentTurnResources.actionResources.some((resource) =>
    isMonkFocusFlurryOfBlowsActionResource(resource, actorId, resourceUnitId),
  );
}

export function isMonkFocusFlurryOfBlowsActionResource(
  resource: BattleTurnResources["actionResources"][number],
  actorId: CombatantId,
  resourceUnitId: string | undefined,
): resource is MonkFocusFlurryOfBlowsActionResource {
  return (
    resource.source === "monkFocusFlurryOfBlows" &&
    resource.sourceOwnerId === actorId &&
    (resourceUnitId === undefined || resource.sourceUnitId === resourceUnitId)
  );
}

export function monkFocusResourceForActor(
  state: BattleState,
  actorId: CombatantId,
): MonkFocusResourceFact | null {
  const actor = state.combatants.get(actorId);
  if (!isCharacterBattleCreatureState(actor)) return null;
  for (const resource of actor.origin.resources) {
    const support = battleMonkFocusBattleOptionsSupportForUnit(resource.unit);
    if (
      support !== null &&
      support !== "unsupported" &&
      characterBattleResourceIsUseCount(resource)
    ) {
      return { actor, resource, profile: support };
    }
  }
  return null;
}

function unarmedStrikeForActor(
  state: BattleState,
  actorId: CombatantId,
): BoundCharacterUnarmedStrikeActionOption | undefined {
  return attackActionOptionsForActor(state, actorId).find(
    (attack): attack is BoundCharacterUnarmedStrikeActionOption =>
      attack.kind === "unarmedStrike",
  );
}

function flurryOfBlowsUnarmedStrikeForActor(
  state: BattleState,
  actorId: CombatantId,
): BoundCharacterUnarmedStrikeActionOption | undefined {
  const unarmedStrike = unarmedStrikeForActor(state, actorId);
  if (
    unarmedStrike === undefined ||
    attackTargetChoices(state, actorId, unarmedStrike).length === 0
  ) {
    return undefined;
  }
  return unarmedStrike;
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
        candidate.unit.id === resource.unit.id ? resource : candidate,
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
