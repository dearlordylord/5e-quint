import { Either } from "effect";

import { InvalidBattleInitError } from "#/errors.ts";
import type {
  Combatant,
  BattleParticipant,
  BattleInit,
  BattleInitiativeCount,
  BattleInitiativeTieResolution,
  BattleState,
} from "#/battle-types.ts";
import type { CreatureId } from "#/types.ts";

function duplicateIds(ids: ReadonlyArray<CreatureId>): ReadonlyArray<CreatureId> {
  const seen = new Set<CreatureId>();
  const duplicates = new Set<CreatureId>();
  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.add(id);
      continue;
    }
    seen.add(id);
  }
  return [...duplicates];
}

function invalidBattleInit(
  message: string,
): Either.Either<never, InvalidBattleInitError> {
  return Either.left(new InvalidBattleInitError({ message }));
}

function sameActorSet(
  left: ReadonlyArray<CreatureId>,
  right: ReadonlyArray<CreatureId>,
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const rightSet = new Set(right);
  return left.every((actorId) => rightSet.has(actorId));
}

function validateTieResolutions(
  combatantIds: ReadonlyArray<CreatureId>,
  initiativeCounts: ReadonlyMap<CreatureId, number>,
  tieResolutions: ReadonlyArray<BattleInitiativeTieResolution>,
): Either.Either<ReadonlyMap<CreatureId, number>, InvalidBattleInitError> {
  const flattenedActorIds = tieResolutions.flatMap(
    (resolution) => resolution.actorIds,
  );
  const duplicates = duplicateIds(flattenedActorIds);
  if (duplicates.length > 0) {
    return invalidBattleInit(
      `tie resolutions contain duplicate actor ids: ${duplicates.join(", ")}`,
    );
  }

  const combatantIdSet = new Set(combatantIds);
  const unknownActorIds = flattenedActorIds.filter(
    (actorId) => !combatantIdSet.has(actorId),
  );
  if (unknownActorIds.length > 0) {
    return invalidBattleInit(
      `tie resolutions contain unknown actor ids: ${unknownActorIds.join(", ")}`,
    );
  }

  const groupsByCount = new Map<number, Array<CreatureId>>();
  for (const actorId of combatantIds) {
    const count = initiativeCounts.get(actorId)!;
    const group = groupsByCount.get(count);
    if (group === undefined) {
      groupsByCount.set(count, [actorId]);
      continue;
    }
    group.push(actorId);
  }

  const tiedGroups = [...groupsByCount.values()].filter(
    (group) => group.length > 1,
  );
  if (tieResolutions.length !== tiedGroups.length) {
    return invalidBattleInit(
      `tie resolutions must cover exactly the tied initiative groups: expected ${tiedGroups.length}, received ${tieResolutions.length}`,
    );
  }

  const tieResolutionIndex = new Map<CreatureId, number>();
  for (const tiedGroup of tiedGroups) {
    const resolution = tieResolutions.find((candidate) =>
      sameActorSet(candidate.actorIds, tiedGroup),
    );
    if (resolution === undefined) {
      return invalidBattleInit(
        `missing tie resolution for tied actors: ${tiedGroup.join(", ")}`,
      );
    }

    for (const [index, actorId] of resolution.actorIds.entries()) {
      tieResolutionIndex.set(actorId, index);
    }
  }

  return Either.right(tieResolutionIndex);
}

function validateInitiativeCounts(
  combatantIds: ReadonlyArray<CreatureId>,
  initiativeCounts: ReadonlyArray<BattleInitiativeCount>,
): Either.Either<ReadonlyMap<CreatureId, number>, InvalidBattleInitError> {
  const initiativeActorIds = initiativeCounts.map((entry) => entry.actorId);
  const duplicates = duplicateIds(initiativeActorIds);
  if (duplicates.length > 0) {
    return invalidBattleInit(
      `initiative counts contain duplicate actor ids: ${duplicates.join(", ")}`,
    );
  }

  const combatantIdSet = new Set(combatantIds);
  const unknownActorIds = initiativeActorIds.filter(
    (actorId) => !combatantIdSet.has(actorId),
  );
  if (unknownActorIds.length > 0) {
    return invalidBattleInit(
      `initiative counts contain unknown actor ids: ${unknownActorIds.join(", ")}`,
    );
  }

  const initiativeIdSet = new Set(initiativeActorIds);
  const missingActorIds = combatantIds.filter(
    (actorId) => !initiativeIdSet.has(actorId),
  );
  if (missingActorIds.length > 0) {
    return invalidBattleInit(
      `initiative counts are missing actor ids: ${missingActorIds.join(", ")}`,
    );
  }

  return Either.right(
    new Map(initiativeCounts.map((entry) => [entry.actorId, entry.count])),
  );
}

function resetTurnScopedUnitUsage(
  participant: BattleParticipant,
): BattleParticipant {
  return {
    ...participant,
    combatant: {
      ...participant.combatant,
      unitResourceStates: participant.combatant.unitResourceStates.map((resourceState) => ({
        ...resourceState,
        usedThisTurn: false,
      })),
    },
  };
}

function orderParticipants(
  combatants: ReadonlyArray<Combatant>,
  initiativeOrder: ReadonlyArray<CreatureId>,
  initiativeCounts: ReadonlyMap<CreatureId, number>,
): ReadonlyArray<BattleParticipant> {
  const combatantsById = new Map(
    combatants.map((combatant, projectionOrder) => [
      combatant.id,
      { combatant, projectionOrder },
    ]),
  );
  return initiativeOrder.map((actorId) => ({
    combatant: combatantsById.get(actorId)!.combatant,
    initiativeCount: initiativeCounts.get(actorId)!,
    projectionOrder: combatantsById.get(actorId)!.projectionOrder,
  }));
}

export function createInitiativeOrder(
  combatantIds: ReadonlyArray<CreatureId>,
  init: BattleInit,
): Either.Either<ReadonlyArray<CreatureId>, InvalidBattleInitError> {
  const validatedInitiativeCounts = validateInitiativeCounts(
    combatantIds,
    init.initiativeCounts,
  );
  if (Either.isLeft(validatedInitiativeCounts)) {
    return Either.left(validatedInitiativeCounts.left);
  }

  const validatedTieResolutions = validateTieResolutions(
    combatantIds,
    validatedInitiativeCounts.right,
    init.tieResolutions,
  );
  if (Either.isLeft(validatedTieResolutions)) {
    return Either.left(validatedTieResolutions.left);
  }

  return Either.right(
    [...combatantIds].sort((leftActorId, rightActorId) => {
      const leftCount = validatedInitiativeCounts.right.get(leftActorId)!;
      const rightCount = validatedInitiativeCounts.right.get(rightActorId)!;
      if (leftCount !== rightCount) {
        return rightCount - leftCount;
      }

      return (
        validatedTieResolutions.right.get(leftActorId)! -
        validatedTieResolutions.right.get(rightActorId)!
      );
    }),
  );
}

function validatedInitiativeCountsById(
  combatantIds: ReadonlyArray<CreatureId>,
  init: BattleInit,
): Either.Either<ReadonlyMap<CreatureId, number>, InvalidBattleInitError> {
  const validatedInitiativeCounts = validateInitiativeCounts(
    combatantIds,
    init.initiativeCounts,
  );
  if (Either.isLeft(validatedInitiativeCounts)) {
    return Either.left(validatedInitiativeCounts.left);
  }

  const validatedTieResolutions = validateTieResolutions(
    combatantIds,
    validatedInitiativeCounts.right,
    init.tieResolutions,
  );
  if (Either.isLeft(validatedTieResolutions)) {
    return Either.left(validatedTieResolutions.left);
  }

  return Either.right(validatedInitiativeCounts.right);
}

export function initializeBattleState(
  combatants: ReadonlyArray<Combatant>,
  init: BattleInit,
): Either.Either<BattleState, InvalidBattleInitError> {
  const combatantIds = combatants.map((combatant) => combatant.id);
  if (combatantIds.length === 0) {
    return invalidBattleInit("battle init requires at least one combatant");
  }

  const initiativeOrder = createInitiativeOrder(combatantIds, init);
  if (Either.isLeft(initiativeOrder)) {
    return Either.left(initiativeOrder.left);
  }

  const initiativeCounts = validatedInitiativeCountsById(combatantIds, init);
  if (Either.isLeft(initiativeCounts)) {
    return Either.left(initiativeCounts.left);
  }

  const orderedParticipants = orderParticipants(
    combatants,
    initiativeOrder.right,
    initiativeCounts.right,
  );
  const [currentParticipant, ...waitingParticipants] = orderedParticipants;

  return Either.right({
    currentParticipant: resetTurnScopedUnitUsage(currentParticipant!),
    waitingParticipants,
    round: 1,
    turnNumber: 1,
    openPrompt: null,
    standardActionsRemaining: 1,
    nonMagicActionsRemaining: 0,
  });
}

export function advanceBattleTurn(state: BattleState): BattleState {
  const nextTurnOrder = [...state.waitingParticipants, state.currentParticipant];
  const [currentParticipant, ...waitingParticipants] = nextTurnOrder;
  const wrapsRound =
    state.turnNumber % (state.waitingParticipants.length + 1) === 0;

  return {
    ...state,
    currentParticipant: resetTurnScopedUnitUsage(currentParticipant!),
    waitingParticipants,
    round: wrapsRound ? state.round + 1 : state.round,
    turnNumber: state.turnNumber + 1,
    openPrompt: null,
    standardActionsRemaining: 1,
    nonMagicActionsRemaining: 0,
  };
}
