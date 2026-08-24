import type {
  BattleCreatureState,
  BattleRuntimeSession,
  CombatantId,
} from "@dnd/battle-runtime";
import {
  addBattleRuntimeCombatant,
  battleStateInitIssueMessage,
  removeBattleRuntimeCombatants,
} from "@dnd/battle-runtime";
import { settleCharacterSheetFromBattle } from "@dnd/character-battle-runtime";
import type { StatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Either, Match } from "effect";

import type {
  CharacterSessionRegistry,
  PendingBattleFillSession,
} from "./session-store.ts";
import {
  createActiveBattleRosterTransitionPlan,
  type ActiveBattleRosterTransitionPlan,
  type ActiveBattleRosterTransitionPlanData,
  type ActiveBattleRosterTransitionPreview,
  type CharacterSessionBattleTransition,
  type McpBattleRosterOperation,
  type McpBattleRosterTransitionIssue,
} from "./battle-roster-session-types.ts";
import { projectCharacterSessionInBattle } from "./character-session-occupancy.ts";

const activeBattleRosterTransitionPlanData = new WeakMap<
  ActiveBattleRosterTransitionPlan,
  ActiveBattleRosterTransitionPlanData
>();

export type BattleRosterTransitionPlanner = {
  plan(
    operation: McpBattleRosterOperation,
    activeBattle: BattleRuntimeSession,
    pendingBattleFills: PendingBattleFillSession | null,
  ): Either.Either<
    ActiveBattleRosterTransitionPreview,
    McpBattleRosterTransitionIssue
  >;
  commit(
    plan: ActiveBattleRosterTransitionPlan,
    activeBattle: BattleRuntimeSession,
    pendingBattleFills: PendingBattleFillSession | null,
  ): Either.Either<BattleRuntimeSession, McpBattleRosterTransitionIssue>;
};

export function createBattleRosterTransitionPlanner(input: {
  readonly characters: CharacterSessionRegistry;
  readonly statBlockCatalog: StatBlockCatalog;
  readonly unitLibrary: UnitCatalog;
  readonly storeIdentity: object;
}): BattleRosterTransitionPlanner {
  return {
    plan(operation, activeBattle, pendingBattleFills) {
      if (pendingBattleFills !== null) {
        return Either.left({
          tag: "battleRosterPendingBattleFills",
          pendingSubject: pendingBattleFills.subject,
        });
      }
      return planActiveBattleRosterTransition({
        ...input,
        operation,
        activeBattle,
      });
    },
    commit(plan, activeBattle, pendingBattleFills) {
      const data = activeBattleRosterTransitionPlanData.get(plan);
      if (data === undefined || data.storeIdentity !== input.storeIdentity) {
        return Either.left({ tag: "battleRosterUnknownPlan" });
      }
      if (activeBattle !== data.activeBattle) {
        return Either.left({
          tag: "battleRosterPlanBattleChanged",
          battleId: data.activeBattle.state.battleId,
        });
      }
      if (pendingBattleFills !== data.pendingBattleFills) {
        return Either.left({ tag: "battleRosterPlanFillsChanged" });
      }
      const misalignedCharacterIds = data.characterSessionTransitions
        .filter((transition) => !transitionCharacterIdsAlign(transition))
        .flatMap(transitionCharacterIds);
      if (misalignedCharacterIds.length > 0) {
        return Either.left({
          tag: "battleRosterPlanCharacterChanged",
          characterIds: [...new Set(misalignedCharacterIds)],
        });
      }
      const changedCharacterIds = data.characterSessionTransitions
        .filter(
          (transition) =>
            input.characters.get(transitionCharacterId(transition)) !==
            transition.expected,
        )
        .map(transitionCharacterId);
      if (changedCharacterIds.length > 0) {
        return Either.left({
          tag: "battleRosterPlanCharacterChanged",
          characterIds: changedCharacterIds,
        });
      }
      const committed = input.characters.setAll(
        data.characterSessionTransitions.map(({ next }) => next),
      );
      if (Either.isLeft(committed)) {
        return Either.left({
          tag: "battleStateCharacterSessionRegistryConflict",
          registryIssue: committed.left,
          affectedCharacterIds: data.characterSessionTransitions.map(
            transitionCharacterId,
          ),
        });
      }
      activeBattleRosterTransitionPlanData.delete(plan);
      return Either.right(data.result.prospectiveBattle);
    },
  };
}

function planActiveBattleRosterTransition(input: {
  readonly operation: McpBattleRosterOperation;
  readonly activeBattle: BattleRuntimeSession;
  readonly characters: CharacterSessionRegistry;
  readonly statBlockCatalog: StatBlockCatalog;
  readonly unitLibrary: UnitCatalog;
  readonly storeIdentity: object;
}): Either.Either<
  ActiveBattleRosterTransitionPreview,
  McpBattleRosterTransitionIssue
> {
  return Match.value(input.operation).pipe(
    Match.when({ kind: "addCharacter" }, (operation) =>
      planAddCharacterBattleCombatant({ ...input, operation }),
    ),
    Match.when({ kind: "addStatBlock" }, (operation) =>
      planAddStatBlockBattleCombatant({ ...input, operation }),
    ),
    Match.when({ kind: "remove" }, (operation) =>
      planRemoveBattleCombatant({ ...input, operation }),
    ),
    Match.exhaustive,
  );
}

function planAddCharacterBattleCombatant(input: {
  readonly operation: Extract<
    McpBattleRosterOperation,
    { readonly kind: "addCharacter" }
  >;
  readonly activeBattle: BattleRuntimeSession;
  readonly characters: CharacterSessionRegistry;
  readonly storeIdentity: object;
}): Either.Either<
  ActiveBattleRosterTransitionPreview,
  McpBattleRosterTransitionIssue
> {
  const { operation } = input;
  const characterId = operation.combatant.creatureInit.characterId;
  const currentSession = input.characters.get(characterId);
  if (currentSession === undefined) {
    return Either.left({
      tag: "battleRosterCharacterSessionMissing",
      combatantId: operation.combatant.combatantId,
      characterId,
    });
  }
  if (currentSession.tag === "inBattle") {
    return Either.left({
      tag: "battleRosterCharacterAlreadyInBattle",
      characterId: currentSession.sheet.characterId,
      battleId: currentSession.battleId,
    });
  }
  const admitted = addBattleRuntimeCombatant({
    session: input.activeBattle,
    combatant: operation.combatant,
  });
  if (Either.isLeft(admitted)) {
    return Either.left({
      tag: "battleRosterCombatantAdmissionFailed",
      combatantId: operation.combatant.combatantId,
      message: battleStateInitIssueMessage(admitted.left),
    });
  }
  return Either.right(
    activeBattleRosterTransitionPlan({
      storeIdentity: input.storeIdentity,
      activeBattle: input.activeBattle,
      characterSessionTransitions: [
        {
          kind: "enterBattle",
          expected: currentSession,
          next: projectCharacterSessionInBattle({
            session: currentSession,
            battleId: input.activeBattle.state.battleId,
          }),
        },
      ],
      pendingBattleFills: null,
      result: { kind: "add", prospectiveBattle: admitted.right },
    }),
  );
}

function planAddStatBlockBattleCombatant(input: {
  readonly operation: Extract<
    McpBattleRosterOperation,
    { readonly kind: "addStatBlock" }
  >;
  readonly activeBattle: BattleRuntimeSession;
  readonly storeIdentity: object;
}): Either.Either<
  ActiveBattleRosterTransitionPreview,
  McpBattleRosterTransitionIssue
> {
  const admitted = addBattleRuntimeCombatant({
    session: input.activeBattle,
    combatant: input.operation.combatant,
  });
  if (Either.isLeft(admitted)) {
    return Either.left({
      tag: "battleRosterCombatantAdmissionFailed",
      combatantId: input.operation.combatant.combatantId,
      message: battleStateInitIssueMessage(admitted.left),
    });
  }
  return Either.right(
    activeBattleRosterTransitionPlan({
      storeIdentity: input.storeIdentity,
      activeBattle: input.activeBattle,
      characterSessionTransitions: [],
      pendingBattleFills: null,
      result: { kind: "add", prospectiveBattle: admitted.right },
    }),
  );
}

function planRemoveBattleCombatant(input: {
  readonly operation: Extract<
    McpBattleRosterOperation,
    { readonly kind: "remove" }
  >;
  readonly activeBattle: BattleRuntimeSession;
  readonly characters: CharacterSessionRegistry;
  readonly statBlockCatalog: StatBlockCatalog;
  readonly unitLibrary: UnitCatalog;
  readonly storeIdentity: object;
}): Either.Either<
  ActiveBattleRosterTransitionPreview,
  McpBattleRosterTransitionIssue
> {
  const combatant = input.activeBattle.state.combatants.get(
    input.operation.combatantId,
  );
  if (combatant === undefined) {
    return Either.left({
      tag: "battleRosterCombatantNotFound",
      combatantId: input.operation.combatantId,
    });
  }
  const settled = settledCharacterSessionForBattleRemoval({
    ...input,
    combatant,
  });
  if (Either.isLeft(settled)) return Either.left(settled.left);
  const removed = removeBattleRuntimeCombatants({
    session: input.activeBattle,
    combatantIds: [input.operation.combatantId],
  });
  if (Either.isLeft(removed)) {
    return Either.left({
      tag: "battleRosterCombatantRemovalFailed",
      combatantId: input.operation.combatantId,
      message: battleStateInitIssueMessage(removed.left),
    });
  }
  const removedCombatantIds = nonEmptyCombatantIds(
    [...input.activeBattle.state.combatants.keys()].filter(
      (id) => !removed.right.state.combatants.has(id),
    ),
  );
  if (removedCombatantIds === undefined) {
    return Either.left({
      tag: "battleRosterRemovalEmpty",
      combatantId: input.operation.combatantId,
    });
  }
  return Either.right(
    activeBattleRosterTransitionPlan({
      storeIdentity: input.storeIdentity,
      activeBattle: input.activeBattle,
      characterSessionTransitions: settled.right,
      pendingBattleFills: null,
      result: {
        kind: "remove",
        prospectiveBattle: removed.right,
        removedCombatantIds,
      },
    }),
  );
}

function settledCharacterSessionForBattleRemoval(input: {
  readonly combatant: BattleCreatureState;
  readonly activeBattle: BattleRuntimeSession;
  readonly characters: CharacterSessionRegistry;
  readonly statBlockCatalog: StatBlockCatalog;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  ActiveBattleRosterTransitionPlanData["characterSessionTransitions"],
  McpBattleRosterTransitionIssue
> {
  if (input.combatant.origin.kind !== "character") {
    return Either.right([]);
  }
  const characterId = input.combatant.origin.characterId;
  const session = input.characters.get(characterId);
  if (session === undefined) {
    return Either.left({
      tag: "battleRosterCharacterSessionMissing",
      combatantId: input.combatant.combatantId,
      characterId,
    });
  }
  if (session.tag !== "inBattle") {
    return Either.left({
      tag: "battleRosterCharacterSessionNotInBattle",
      characterId,
    });
  }
  if (session.battleId !== input.activeBattle.state.battleId) {
    return Either.left({
      tag: "battleRosterCharacterBattleOwnershipConflict",
      characterId,
      expectedBattleId: input.activeBattle.state.battleId,
      actualBattleId: session.battleId,
    });
  }
  const settled = settleCharacterSheetFromBattle({
    combatant: input.combatant,
    state: input.activeBattle.state,
    context: input.activeBattle.context,
    sheet: session.sheet,
    unitLibrary: input.unitLibrary,
    statBlockCatalog: input.statBlockCatalog,
  });
  if (Either.isLeft(settled)) {
    return Either.left({
      tag: "battleRosterSettlementInvalid",
      characterId,
      message: settled.left.message,
    });
  }
  return Either.right([
    {
      kind: "leaveBattle",
      expected: session,
      next: settled.right,
    },
  ]);
}

function transitionCharacterId(transition: CharacterSessionBattleTransition) {
  return Match.value(transition).pipe(
    Match.when({ kind: "enterBattle" }, ({ expected }) => expected.characterId),
    Match.when(
      { kind: "leaveBattle" },
      ({ expected }) => expected.sheet.characterId,
    ),
    Match.exhaustive,
  );
}

function transitionCharacterIds(transition: CharacterSessionBattleTransition) {
  return Match.value(transition).pipe(
    Match.when({ kind: "enterBattle" }, ({ expected, next }) => [
      expected.characterId,
      next.sheet.characterId,
    ]),
    Match.when({ kind: "leaveBattle" }, ({ expected, next }) => [
      expected.sheet.characterId,
      next.characterId,
    ]),
    Match.exhaustive,
  );
}

function transitionCharacterIdsAlign(
  transition: CharacterSessionBattleTransition,
): boolean {
  const [expectedCharacterId, nextCharacterId] =
    transitionCharacterIds(transition);
  return expectedCharacterId === nextCharacterId;
}

function activeBattleRosterTransitionPlan(
  input: ActiveBattleRosterTransitionPlanData,
): ActiveBattleRosterTransitionPreview {
  const plan = createActiveBattleRosterTransitionPlan();
  activeBattleRosterTransitionPlanData.set(plan, input);
  return input.result.kind === "add"
    ? {
        kind: "add",
        plan,
        prospectiveBattle: input.result.prospectiveBattle,
      }
    : {
        kind: "remove",
        plan,
        prospectiveBattle: input.result.prospectiveBattle,
        removedCombatantIds: input.result.removedCombatantIds,
      };
}

function nonEmptyCombatantIds(
  ids: readonly CombatantId[],
): readonly [CombatantId, ...CombatantId[]] | undefined {
  const first = ids[0];
  return first === undefined ? undefined : [first, ...ids.slice(1)];
}
