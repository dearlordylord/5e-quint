import { Either, Match, Option } from "effect";
import { currentActing } from "@dnd/shared-algebras/initiative-algebra";
import { getOnlyOneStrict } from "@dnd/shared/types";
import type { CreatureId } from "@dnd/shared/types";
import type { UnitRecord } from "@dnd/surface/surface/types";

import {
  type CoreAttackAct,
  discoverCoreAttackAct,
} from "#/reducer-core-attack.ts";
import { canCurrentActorAct } from "#/reducer-core-acts.ts";
import {
  activationResourceCost,
  canSpendAction,
  hasUnitActionResource,
} from "@dnd/shared-algebras/action-economy-algebra";
import { unitResourceKey } from "#/reducer-state.ts";
import type { CreatureState, State } from "#/reducer-state.ts";
import {
  type CurrentSliceSupportedActivationPhase,
  type CurrentSliceSupportedActivationUnit,
  getCurrentSliceSupportedActivationUnit,
} from "#/reducer-support.ts";
import { holeStepKey } from "#/reducer-types.ts";
import type {
  AvailableAct,
  ResolutionInvalid,
  Subject,
} from "#/reducer-types.ts";
import { projectPhaseHoles } from "#/runtime-holes.ts";

export const CURRENT_SLICE_ACTIVATION_STEP = holeStepKey("activation:0");

type UnitSubject = Extract<Subject, { readonly tag: "unit" }>;
type EndTurnSubject = Extract<Subject, { readonly tag: "runtimeCommand" }>;

type DiscoverableActionCantrip = CurrentSliceSupportedActivationUnit & {
  readonly kind: "spell";
  readonly mechanics: CurrentSliceSupportedActivationUnit["mechanics"] & {
    readonly level: 0;
    readonly castingTime: { readonly kind: "action" };
  };
};

export type InterpretedCoreEndTurnAct = AvailableAct & {
  readonly subject: EndTurnSubject;
  readonly tag: "coreEndTurn";
};

export type InterpretedUnitAct = AvailableAct & {
  readonly subject: UnitSubject;
  readonly tag: "unit";
  readonly unit: CurrentSliceSupportedActivationUnit;
  readonly phase: CurrentSliceSupportedActivationPhase;
};

export type InterpretedAct =
  | (CoreAttackAct & { readonly tag: "coreAttack" })
  | InterpretedCoreEndTurnAct
  | InterpretedUnitAct;

function invalid(reason: string): ResolutionInvalid {
  return { tag: "invalid", reason };
}

function requireUnitActor(
  state: State,
  actorId: CreatureId,
): Either.Either<CreatureState, ResolutionInvalid> {
  return Either.fromNullable(state.combatants.get(actorId), () =>
    invalid("acting actor not found in combatants"),
  );
}

function requireUnit(
  actor: CreatureState,
  subject: UnitSubject,
): Either.Either<UnitRecord, ResolutionInvalid> {
  return Either.fromNullable(
    actor.units.find((candidate) => candidate.id === subject.unitId),
    () => invalid(`unit not found: ${subject.unitId}`),
  );
}

function requireSupportedUnit(
  unit: UnitRecord,
  subject: UnitSubject,
): Either.Either<CurrentSliceSupportedActivationUnit, ResolutionInvalid> {
  return Either.fromOption(getCurrentSliceSupportedActivationUnit(unit), () =>
    invalid(`unsupported unit: ${subject.unitId}`),
  );
}

function currentSliceActivationPhase(
  unit: CurrentSliceSupportedActivationUnit,
): CurrentSliceSupportedActivationPhase {
  return getOnlyOneStrict(unit.mechanics.phases);
}

function interpretUnitAct(
  state: State,
  subject: UnitSubject,
): Either.Either<InterpretedUnitAct, ResolutionInvalid> {
  return Either.gen(function* () {
    if (!canCurrentActorAct(state)) {
      return yield* Either.left(invalid("acting actor cannot act"));
    }

    const actor = yield* requireUnitActor(state, subject.actorId);
    const unit = yield* requireUnit(actor, subject);
    const supportedUnit = yield* requireSupportedUnit(unit, subject);
    const phase = currentSliceActivationPhase(supportedUnit);

    return {
      tag: "unit" as const,
      subject,
      unit: supportedUnit,
      phase,
      label: supportedUnit.name,
      summary: supportedUnit.description,
      initialHoles: projectPhaseHoles(phase, CURRENT_SLICE_ACTIVATION_STEP),
    };
  });
}

function actionCantripUnit(unit: UnitRecord): DiscoverableActionCantrip | null {
  const supportedUnit = getCurrentSliceSupportedActivationUnit(unit);
  if (Option.isNone(supportedUnit)) {
    return null;
  }
  const unitValue = supportedUnit.value;

  if (unitValue.kind !== "spell") {
    return null;
  }

  if (
    unitValue.mechanics.level !== 0 ||
    unitValue.mechanics.castingTime.kind !== "action"
  ) {
    return null;
  }

  return unitValue as DiscoverableActionCantrip;
}

function isDiscoverableGrantExtraActionUnit(
  unit: CurrentSliceSupportedActivationUnit,
): boolean {
  const phase = currentSliceActivationPhase(unit);
  return (
    phase.kind === "direct" && phase.effects[0].kind === "grant_extra_action"
  );
}

function discoverUnitActs(
  state: State,
  actorId: CreatureId,
): ReadonlyArray<InterpretedUnitAct> {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return [];
  }

  return actor.units.flatMap((unit) => {
    const supportedUnit = getCurrentSliceSupportedActivationUnit(unit);
    if (Option.isNone(supportedUnit)) return [];

    const unitValue = supportedUnit.value;
    const cantripUnit = actionCantripUnit(unit);
    const isActionCantrip = cantripUnit !== null;
    const isGrantExtraAction = isDiscoverableGrantExtraActionUnit(unitValue);
    if (!isActionCantrip && !isGrantExtraAction) return [];

    const cost = activationResourceCost(unitValue);
    if (Either.isLeft(cost)) {
      throw new Error(cost.left);
    }

    if (isActionCantrip && cost.right.kind !== "action") {
      throw new Error("discoverable action cantrip must spend an action");
    }

    if (
      cost.right.kind === "action" &&
      !canSpendAction(state, cost.right.action)
    ) {
      return [];
    }

    if (
      isGrantExtraAction &&
      (state.unitActivationsThisTurn.has(
        unitResourceKey(actorId, unitValue.id),
      ) ||
        (state.expendedUnitUseCounts.get(
          unitResourceKey(actorId, unitValue.id),
        ) ?? 0) >= 1 ||
        hasUnitActionResource(state, actorId, unitValue.id))
    ) {
      return [];
    }

    const subject = {
      tag: "unit" as const,
      actorId,
      unitId: unitValue.id,
    };
    const interpreted = interpretUnitAct(state, subject);
    return Either.isRight(interpreted) ? [interpreted.right] : [];
  });
}

function endTurnAct(actorId: CreatureId): InterpretedCoreEndTurnAct {
  return {
    tag: "coreEndTurn",
    subject: {
      tag: "runtimeCommand",
      actorId,
      command: "endTurn",
    },
    label: "End Turn",
    summary: "End the current turn.",
    initialHoles: [],
  };
}

export function discoverInterpretedActs(
  state: State,
): ReadonlyArray<InterpretedAct> {
  const actorId = currentActing(state.initiative);
  const coreAttack = discoverCoreAttackAct(state, actorId);
  return [
    ...(coreAttack === null
      ? []
      : [{ ...coreAttack, tag: "coreAttack" as const }]),
    endTurnAct(actorId),
    ...discoverUnitActs(state, actorId),
  ];
}

export function interpretSubject(
  state: State,
  subject: Subject,
): Either.Either<InterpretedAct, ResolutionInvalid> {
  if (subject.actorId !== currentActing(state.initiative)) {
    return Either.left(invalid("actor is not currently acting"));
  }

  return Match.value(subject).pipe(
    Match.when({ tag: "srdAction", action: "attack" }, () => {
      const act = discoverCoreAttackAct(state, subject.actorId);
      return act === null
        ? Either.left(invalid("no action available for attack"))
        : Either.right({ ...act, tag: "coreAttack" as const });
    }),
    Match.when({ tag: "runtimeCommand", command: "endTurn" }, () =>
      Either.right(endTurnAct(subject.actorId)),
    ),
    Match.when({ tag: "unit" }, (unitSubject) =>
      interpretUnitAct(state, unitSubject),
    ),
    Match.exhaustive,
  );
}
