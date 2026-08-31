import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import type { DiceExpr } from "@dnd/surface/surface/types";
import { canSpendBonusAction } from "@dnd/shared-algebras/action-economy-algebra";
import type { BoundCharacterUnarmedStrikeActionOption } from "../battle-action-options.ts";
import type {
  BattleActDiscoveryCandidate,
  BattleState,
  BattleTargetChoiceHole,
  BattleTurnResources,
  BattleUnitFeatureRollHole,
  CharacterBattleCreatureState,
} from "../battle-state-execution.ts";
import type { BattleProcedureExecutionRef, CombatantId } from "../identity.ts";
import type { UnitSupportProcedureExecution } from "../character-execution-queries.ts";
import type { UnitFeatureProcedureExecution } from "../character-execution-vocabulary.ts";
import { isUnitFeatureProcedureOwner } from "../unit-procedure-kind.ts";
import {
  characterBattleResourceIsUseCount,
  resourceHasUsesRemaining,
  type CharacterBattleUseCountResourceState,
} from "../character-battle-resource-execution.ts";
import { martialArtsSrdDieSizeAtClassLevel } from "../unit-feature-execution-constants.ts";
import type { MonkFocusFlurryOfBlowsActionResource } from "./battle-runtime-protocol.ts";
import { attackActionOptionsForActor } from "./attack-damage-apply.ts";
import {
  combatantCanTakeActions,
  isCharacterBattleCreatureState,
} from "./creature-state-execution.ts";
import { attackTargetChoices, attackTargetHole } from "./hole-helpers.ts";
import { representedMovementSpeedKinds } from "./movement-speed.ts";

export type MonkFocusResourceFact = {
  readonly actor: CharacterBattleCreatureState;
  readonly resource: CharacterBattleUseCountResourceState;
  readonly execution: Extract<
    UnitFeatureProcedureExecution | UnitSupportProcedureExecution,
    { readonly kind: "monkFocusBattleOptions" }
  >;
  readonly procedureRef: BattleProcedureExecutionRef;
};

const HEIGHTENED_FOCUS_MONK_LEVEL = 10;

export function monkFocusActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
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
): readonly BattleActDiscoveryCandidate[] {
  if (!canSpendBonusAction(state.currentTurnResources)) return [];
  const focus = monkFocusResourceForActor(state, actor.combatantId);
  if (focus === null) return [];
  const acts: BattleActDiscoveryCandidate[] = [];
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
        procedureRef: focus.procedureRef,
        option: "flurryOfBlows",
      },
      initialHoles: [],
    });
  }

  acts.push({
    subject: {
      tag: "monkFocusOption",
      actorId: actor.combatantId,
      procedureRef: focus.procedureRef,
      option: "patientDefense",
      mode: "freeDisengage",
    },
    initialHoles: [],
  });
  if (hasFocusPoint) {
    acts.push({
      subject: {
        tag: "monkFocusOption",
        actorId: actor.combatantId,
        procedureRef: focus.procedureRef,
        option: "patientDefense",
        mode: "focusDisengageDodge",
      },
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
        procedureRef: focus.procedureRef,
        option: "stepOfTheWind",
        mode: "freeDash",
        speedKind,
      },
      initialHoles: [],
    });
    if (hasFocusPoint) {
      acts.push({
        subject: {
          tag: "monkFocusOption",
          actorId: actor.combatantId,
          procedureRef: focus.procedureRef,
          option: "stepOfTheWind",
          mode: "focusDisengageDash",
          speedKind,
        },
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
): readonly BattleActDiscoveryCandidate[] {
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
        focusProcedureRef: flurryResource.sourceProcedureRef,
        procedureRef: unarmedStrike.procedureRef,
      },
      initialHoles: [attackTargetHole(state, actor.combatantId, unarmedStrike)],
    },
  ];
}

export function heightenedPatientDefenseTemporaryHitPointsRollHole(
  focus: MonkFocusResourceFact,
): BattleUnitFeatureRollHole {
  const expr = heightenedPatientDefenseTemporaryHitPointsDiceExpr(focus);
  const protocolId = `battle:monk-focus:heightened-patient-defense-temporary-hit-points:${focus.procedureRef}:${diceExprLabel(expr)}`;
  return {
    kind: "rolledDice",
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: `Patient Defense Temporary Hit Points (${diceExprLabel(expr)})`,
  };
}

export function heightenedPatientDefenseTemporaryHitPointsDiceExpr(
  focus: MonkFocusResourceFact,
): DiceExpr {
  const level = monkClassLevel(focus.actor);
  return {
    dice: 2,
    dieSize: level === null ? 6 : martialArtsSrdDieSizeAtClassLevel(level),
  };
}

export function monkHasHeightenedFocus(
  actor: CharacterBattleCreatureState,
): boolean {
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

export function heightenedStepOfTheWindCarryHole(
  state: BattleState,
  focus: MonkFocusResourceFact,
): BattleTargetChoiceHole {
  const protocolId = `battle:monk-focus:heightened-step-of-the-wind-carry:${focus.procedureRef}:${focus.actor.combatantId}`;
  return {
    kind: "targetChoice",
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: "Step of the Wind carried creature",
    requiresTableSpatialFact: true,
    choices: [...state.combatants.keys()].filter(
      (combatantId) => combatantId !== focus.actor.combatantId,
    ),
  };
}

export function isMonkFocusFlurryOfBlowsActionResource(
  resource: BattleTurnResources["actionResources"][number],
  actorId: CombatantId,
  focusProcedureRef: BattleProcedureExecutionRef | undefined,
): resource is MonkFocusFlurryOfBlowsActionResource {
  return (
    resource.source === "monkFocusFlurryOfBlows" &&
    resource.sourceOwnerId === actorId &&
    (focusProcedureRef === undefined ||
      resource.sourceProcedureRef === focusProcedureRef)
  );
}

export function monkFocusResourceForActor(
  state: BattleState,
  actorId: CombatantId,
  procedureRef?: BattleProcedureExecutionRef,
): MonkFocusResourceFact | null {
  const actor = state.combatants.get(actorId);
  if (!isCharacterBattleCreatureState(actor)) return null;
  for (const binding of actor.origin.execution.procedureBindings) {
    if (procedureRef !== undefined && binding.procedureRef !== procedureRef) {
      continue;
    }
    const procedure = binding.procedure;
    if (
      !isUnitFeatureProcedureOwner(procedure) ||
      typeof procedure.execution !== "object" ||
      procedure.execution.kind !== "monkFocusBattleOptions" ||
      procedure.source.kind !== "resourcePool"
    ) {
      continue;
    }
    const resourcePoolRef = procedure.source.resourcePoolRef;
    const resource = actor.origin.resources.find(
      (candidate) =>
        candidate.resourcePoolRef === resourcePoolRef &&
        characterBattleResourceIsUseCount(candidate),
    );
    if (resource !== undefined && characterBattleResourceIsUseCount(resource)) {
      return {
        actor,
        resource,
        execution: procedure.execution,
        procedureRef: binding.procedureRef,
      };
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

export function flurryOfBlowsUnarmedStrikeForActor(
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
