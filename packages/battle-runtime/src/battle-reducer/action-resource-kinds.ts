// RAW-COVERAGE: runtime-owner RAW-STAT-BLOCK-MULTIATTACK-001
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties stat-block.multiattack
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE BATTLE.SPELL.SLOW_MULTIATTACK_ATTACK_CAP BATTLE.STAT_BLOCK.MULTIATTACK
import {
  spendMatchingActionResource,
  type ActionEconomySpendError,
  type ActionEconomyState,
  type RuntimeActionResource,
} from "@dnd/shared-algebras/action-economy-algebra";
import * as Either from "effect/Either";
import * as Match from "effect/Match";
import * as Option from "effect/Option";
import type {
  BattleActiveEffectExecutionRef,
  BattleProcedureExecutionRef,
  CombatantId,
} from "../identity.ts";
import {
  statBlockProcedureBinding,
  type StatBlockExecutionSnapshot,
  type StatBlockMultiattackProcedure,
  type StatBlockProcedureBindingFor,
} from "../stat-block-execution-state.ts";
import type {
  ClassFeatureExtraAttackActionResource,
  StatBlockMultiattackActionResource,
} from "./battle-runtime-protocol.ts";

type BoundStatBlockMultiattackActionResource = {
  readonly resource: StatBlockMultiattackActionResource;
  readonly sourceBinding: StatBlockProcedureBindingFor<StatBlockMultiattackProcedure>;
};

export function isStatBlockMultiattackActionResource(
  resource: RuntimeActionResource,
  actorId: CombatantId,
): resource is StatBlockMultiattackActionResource {
  return (
    resource.source === "statBlockMultiattack" &&
    resource.sourceOwnerId === actorId
  );
}

export function statBlockMultiattackActionResourceMatchesProcedure(
  resource: RuntimeActionResource,
  actorId: CombatantId,
  execution: StatBlockExecutionSnapshot,
  procedureRef: BattleProcedureExecutionRef,
): resource is StatBlockMultiattackActionResource {
  const bound = bindStatBlockMultiattackActionResource(
    resource,
    actorId,
    execution,
  );
  if (Option.isNone(bound)) return false;
  return Match.value(bound.value.resource.dispatch).pipe(
    Match.when(
      { kind: "listedOccurrence" },
      ({ attackProcedureRef }) => attackProcedureRef === procedureRef,
    ),
    Match.when({ kind: "oneListedChoice" }, ({ attackProcedureRefs }) =>
      attackProcedureRefs.some((candidate) => candidate === procedureRef),
    ),
    Match.exhaustive,
  );
}

function bindStatBlockMultiattackActionResource(
  resource: RuntimeActionResource,
  actorId: CombatantId,
  execution: StatBlockExecutionSnapshot,
): Option.Option<BoundStatBlockMultiattackActionResource> {
  if (!isStatBlockMultiattackActionResource(resource, actorId)) {
    return Option.none();
  }
  const sourceBinding = statBlockProcedureBinding(
    execution,
    resource.sourceProcedureRef,
  );
  const sourceProcedure = sourceBinding?.procedure;
  if (sourceBinding === undefined || sourceProcedure?.kind !== "multiattack") {
    return Option.none();
  }
  const multiattackBinding: StatBlockProcedureBindingFor<StatBlockMultiattackProcedure> =
    { ...sourceBinding, procedure: sourceProcedure };
  const dispatchMatchesBinding = Match.value(resource.dispatch).pipe(
    Match.when({ kind: "listedOccurrence" }, ({ attackProcedureRef }) =>
      multiattackBinding.procedure.dispatchProcedureRefs.some(
        (listedProcedureRef) => listedProcedureRef === attackProcedureRef,
      ),
    ),
    Match.when({ kind: "oneListedChoice" }, ({ attackProcedureRefs }) =>
      procedureRefListsAreEqual(
        attackProcedureRefs,
        multiattackBinding.procedure.dispatchProcedureRefs,
      ),
    ),
    Match.exhaustive,
  );
  return dispatchMatchesBinding
    ? Option.some({ resource, sourceBinding: multiattackBinding })
    : Option.none();
}

export function hasStatBlockMultiattackContinuationResource(
  actionResources: readonly RuntimeActionResource[],
  actorId: CombatantId,
  execution: StatBlockExecutionSnapshot,
): boolean {
  return actionResources.some((resource) =>
    Option.isSome(
      bindStatBlockMultiattackActionResource(resource, actorId, execution),
    ),
  );
}

export function statBlockMultiattackContinuationActionResourcesAreValid(
  actionResources: readonly RuntimeActionResource[],
  actorId: CombatantId,
  execution: StatBlockExecutionSnapshot,
): boolean {
  const continuationResources = actionResources.filter(
    (resource): resource is StatBlockMultiattackActionResource =>
      resource.source === "statBlockMultiattack",
  );
  if (continuationResources.length === 0) return true;
  if (
    !statBlockMultiattackContinuationDispatchesAreValid(
      continuationResources,
      actorId,
      execution,
    )
  ) {
    return false;
  }
  return actionResources.every((resource) =>
    Match.value(resource).pipe(
      Match.discriminatorsExhaustive("source")({
        turn: () => false,
        unit: () => false,
        spellEffect: () => true,
        statBlockMultiattack: () => true,
        classFeatureExtraAttack: () => false,
        monkFocusFlurryOfBlows: () => false,
      }),
    ),
  );
}

export function actionResourceCollectionOwnershipActivityAndUniquenessAreValid(
  actionResources: readonly RuntimeActionResource[],
  actorId: CombatantId,
  activeEffectRefs: readonly BattleActiveEffectExecutionRef[],
): boolean {
  const spellEffectRefs = actionResources.flatMap((resource) =>
    resource.source === "spellEffect" ? [resource.sourceEffectRef] : [],
  );
  if (
    actionResources.filter((resource) => resource.source === "turn").length >
      1 ||
    new Set(spellEffectRefs).size !== spellEffectRefs.length
  ) {
    return false;
  }
  return actionResources.every((resource) =>
    Match.value(resource).pipe(
      Match.discriminatorsExhaustive("source")({
        turn: () => true,
        unit: ({ sourceOwnerId }) => sourceOwnerId === actorId,
        spellEffect: ({ sourceEffectRef }) =>
          activeEffectRefs.includes(sourceEffectRef),
        statBlockMultiattack: ({ sourceOwnerId }) => sourceOwnerId === actorId,
        classFeatureExtraAttack: ({ sourceOwnerId }) =>
          sourceOwnerId === actorId,
        monkFocusFlurryOfBlows: ({ sourceOwnerId }) =>
          sourceOwnerId === actorId,
      }),
    ),
  );
}

function statBlockMultiattackContinuationDispatchesAreValid(
  continuationResources: readonly StatBlockMultiattackActionResource[],
  actorId: CombatantId,
  execution: StatBlockExecutionSnapshot,
): boolean {
  const boundResources = continuationResources.map((resource) =>
    bindStatBlockMultiattackActionResource(resource, actorId, execution),
  );
  const firstBoundResource = boundResources[0];
  if (
    firstBoundResource === undefined ||
    Option.isNone(firstBoundResource) ||
    boundResources.some(
      (bound) =>
        Option.isNone(bound) ||
        bound.value.resource.sourceProcedureRef !==
          firstBoundResource.value.resource.sourceProcedureRef,
    )
  ) {
    return false;
  }

  return Match.value(firstBoundResource.value.resource.dispatch).pipe(
    Match.when(
      { kind: "oneListedChoice" },
      () =>
        continuationResources.length === 1 &&
        continuationResources.every(
          (resource) => resource.dispatch.kind === "oneListedChoice",
        ),
    ),
    Match.when({ kind: "listedOccurrence" }, () =>
      listedOccurrenceMultiplicityIsValid(
        continuationResources,
        firstBoundResource.value.sourceBinding.procedure.dispatchProcedureRefs,
      ),
    ),
    Match.exhaustive,
  );
}

function listedOccurrenceMultiplicityIsValid(
  resources: readonly StatBlockMultiattackActionResource[],
  listedProcedureRefs: readonly BattleProcedureExecutionRef[],
): boolean {
  const remainingCountByProcedureRef = new Map<
    BattleProcedureExecutionRef,
    number
  >();
  for (const procedureRef of listedProcedureRefs) {
    remainingCountByProcedureRef.set(
      procedureRef,
      (remainingCountByProcedureRef.get(procedureRef) ?? 0) + 1,
    );
  }
  for (const resource of resources) {
    if (resource.dispatch.kind !== "listedOccurrence") return false;
    const procedureRef = resource.dispatch.attackProcedureRef;
    const remainingCount = remainingCountByProcedureRef.get(procedureRef) ?? 0;
    if (remainingCount === 0) return false;
    remainingCountByProcedureRef.set(procedureRef, remainingCount - 1);
  }
  return true;
}

function procedureRefListsAreEqual(
  left: readonly BattleProcedureExecutionRef[],
  right: readonly BattleProcedureExecutionRef[],
): boolean {
  return (
    left.length === right.length &&
    left.every((procedureRef, index) => procedureRef === right[index])
  );
}

export function isClassFeatureExtraAttackActionResource(
  resource: RuntimeActionResource,
  actorId: CombatantId,
): resource is ClassFeatureExtraAttackActionResource {
  return (
    resource.source === "classFeatureExtraAttack" &&
    resource.sourceOwnerId === actorId
  );
}

export function canSpendEscapeGrappleActionResource(
  resources: ActionEconomyState,
  actorId: CombatantId,
): boolean {
  return Either.isRight(spendEscapeGrappleActionResource(resources, actorId));
}

export function spendEscapeGrappleActionResource<T extends ActionEconomyState>(
  resources: T,
  actorId: CombatantId,
): Either.Either<T, ActionEconomySpendError> {
  return spendMatchingActionResource(
    resources,
    "attack",
    (resource) =>
      !isClassFeatureExtraAttackActionResource(resource, actorId) &&
      !isStatBlockMultiattackActionResource(resource, actorId),
  );
}
