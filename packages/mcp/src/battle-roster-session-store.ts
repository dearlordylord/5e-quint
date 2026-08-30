import type {
  BattleCreatureState,
  BattlePendingTransaction,
  BattleRuntimeSession,
  CombatantId,
} from "@dnd/battle-runtime";
import {
  addBattleRuntimeCombatant,
  battleStateInitIssueMessage,
  battlePendingTransactionView,
  removeBattleRuntimeCombatants,
} from "@dnd/battle-runtime";
import { settleCharacterSheetFromBattle } from "@dnd/character-battle-runtime";
import type { SrdStatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Result, Match, Option } from "effect";

import type { CharacterSessionRegistry } from "./session-store.ts";
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
    pendingBattleTransaction: BattlePendingTransaction | null,
  ): Result.Result<
    ActiveBattleRosterTransitionPreview,
    McpBattleRosterTransitionIssue
  >;
  commit(
    plan: ActiveBattleRosterTransitionPlan,
    activeBattle: BattleRuntimeSession,
    pendingBattleTransaction: BattlePendingTransaction | null,
  ): Result.Result<BattleRuntimeSession, McpBattleRosterTransitionIssue>;
};

export function createBattleRosterTransitionPlanner(input: {
  readonly characters: CharacterSessionRegistry;
  readonly statBlockCatalog: SrdStatBlockCatalog;
  readonly unitLibrary: UnitCatalog;
  readonly storeIdentity: object;
}): BattleRosterTransitionPlanner {
  return {
    plan(operation, activeBattle, pendingBattleTransaction) {
      if (pendingBattleTransaction !== null) {
        const pendingView = battlePendingTransactionView(
          pendingBattleTransaction,
        );
        if (Option.isNone(pendingView)) {
          return Result.fail({ tag: "battleRosterUnknownPendingTransaction" });
        }
        return Result.fail({
          tag: "battleRosterPendingBattleFills",
          pendingSubject: pendingView.value.subject,
        });
      }
      return planActiveBattleRosterTransition({
        ...input,
        operation,
        activeBattle,
      });
    },
    commit(plan, activeBattle, pendingBattleTransaction) {
      const data = activeBattleRosterTransitionPlanData.get(plan);
      if (data === undefined || data.storeIdentity !== input.storeIdentity) {
        return Result.fail({ tag: "battleRosterUnknownPlan" });
      }
      if (activeBattle !== data.activeBattle) {
        return Result.fail({
          tag: "battleRosterPlanBattleChanged",
          battleId: data.activeBattle.state.battleId,
        });
      }
      if (pendingBattleTransaction !== data.pendingBattleTransaction) {
        return Result.fail({ tag: "battleRosterPlanFillsChanged" });
      }
      const misalignedCharacterIds = data.characterSessionTransitions
        .filter((transition) => !transitionCharacterIdsAlign(transition))
        .flatMap(transitionCharacterIds);
      if (misalignedCharacterIds.length > 0) {
        return Result.fail({
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
        return Result.fail({
          tag: "battleRosterPlanCharacterChanged",
          characterIds: changedCharacterIds,
        });
      }
      const committed = input.characters.setAll(
        data.characterSessionTransitions.map(({ next }) => next),
      );
      if (Result.isFailure(committed)) {
        return Result.fail({
          tag: "battleStateCharacterSessionRegistryConflict",
          registryIssue: committed.failure,
          affectedCharacterIds: data.characterSessionTransitions.map(
            transitionCharacterId,
          ),
        });
      }
      activeBattleRosterTransitionPlanData.delete(plan);
      return Result.succeed(data.result.prospectiveBattle);
    },
  };
}

function planActiveBattleRosterTransition(input: {
  readonly operation: McpBattleRosterOperation;
  readonly activeBattle: BattleRuntimeSession;
  readonly characters: CharacterSessionRegistry;
  readonly statBlockCatalog: SrdStatBlockCatalog;
  readonly unitLibrary: UnitCatalog;
  readonly storeIdentity: object;
}): Result.Result<
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
}): Result.Result<
  ActiveBattleRosterTransitionPreview,
  McpBattleRosterTransitionIssue
> {
  const { operation } = input;
  const characterId = operation.combatant.creatureInit.characterId;
  const currentSession = input.characters.get(characterId);
  if (currentSession === undefined) {
    return Result.fail({
      tag: "battleRosterCharacterSessionMissing",
      combatantId: operation.combatant.combatantId,
      characterId,
    });
  }
  if (currentSession.tag === "inBattle") {
    return Result.fail({
      tag: "battleRosterCharacterAlreadyInBattle",
      characterId: currentSession.sheet.characterId,
      battleId: currentSession.battleId,
    });
  }
  const admitted = addBattleRuntimeCombatant({
    session: input.activeBattle,
    combatant: operation.combatant,
  });
  if (Result.isFailure(admitted)) {
    return Result.fail({
      tag: "battleRosterCombatantAdmissionFailed",
      combatantId: operation.combatant.combatantId,
      ownerPath: ["operation", "combatant"],
      message: battleStateInitIssueMessage(admitted.failure),
    });
  }
  return Result.succeed(
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
      pendingBattleTransaction: null,
      result: { kind: "add", prospectiveBattle: admitted.success },
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
}): Result.Result<
  ActiveBattleRosterTransitionPreview,
  McpBattleRosterTransitionIssue
> {
  const admitted = addBattleRuntimeCombatant({
    session: input.activeBattle,
    combatant: input.operation.combatant,
  });
  if (Result.isFailure(admitted)) {
    return Result.fail({
      tag: "battleRosterCombatantAdmissionFailed",
      combatantId: input.operation.combatant.combatantId,
      ownerPath: ["operation", "combatant"],
      message: battleStateInitIssueMessage(admitted.failure),
    });
  }
  return Result.succeed(
    activeBattleRosterTransitionPlan({
      storeIdentity: input.storeIdentity,
      activeBattle: input.activeBattle,
      characterSessionTransitions: [],
      pendingBattleTransaction: null,
      result: { kind: "add", prospectiveBattle: admitted.success },
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
  readonly statBlockCatalog: SrdStatBlockCatalog;
  readonly unitLibrary: UnitCatalog;
  readonly storeIdentity: object;
}): Result.Result<
  ActiveBattleRosterTransitionPreview,
  McpBattleRosterTransitionIssue
> {
  const combatant = input.activeBattle.state.combatants.get(
    input.operation.combatantId,
  );
  if (combatant === undefined) {
    return Result.fail({
      tag: "battleRosterCombatantNotFound",
      combatantId: input.operation.combatantId,
    });
  }
  const settled = settledCharacterSessionForBattleRemoval({
    ...input,
    combatant,
  });
  if (Result.isFailure(settled)) return Result.fail(settled.failure);
  const removed = removeBattleRuntimeCombatants({
    session: input.activeBattle,
    combatantIds: [input.operation.combatantId],
  });
  if (Result.isFailure(removed)) {
    return Result.fail({
      tag: "battleRosterCombatantRemovalFailed",
      combatantId: input.operation.combatantId,
      message: battleStateInitIssueMessage(removed.failure),
    });
  }
  const removedCombatantIds = nonEmptyCombatantIds(
    [...input.activeBattle.state.combatants.keys()].filter(
      (id) => !removed.success.state.combatants.has(id),
    ),
  );
  if (removedCombatantIds === undefined) {
    return Result.fail({
      tag: "battleRosterRemovalEmpty",
      combatantId: input.operation.combatantId,
    });
  }
  return Result.succeed(
    activeBattleRosterTransitionPlan({
      storeIdentity: input.storeIdentity,
      activeBattle: input.activeBattle,
      characterSessionTransitions: settled.success,
      pendingBattleTransaction: null,
      result: {
        kind: "remove",
        prospectiveBattle: removed.success,
        removedCombatantIds,
      },
    }),
  );
}

function settledCharacterSessionForBattleRemoval(input: {
  readonly combatant: BattleCreatureState;
  readonly activeBattle: BattleRuntimeSession;
  readonly characters: CharacterSessionRegistry;
  readonly statBlockCatalog: SrdStatBlockCatalog;
  readonly unitLibrary: UnitCatalog;
}): Result.Result<
  ActiveBattleRosterTransitionPlanData["characterSessionTransitions"],
  McpBattleRosterTransitionIssue
> {
  if (input.combatant.origin.kind !== "character") {
    return Result.succeed([]);
  }
  const characterId = input.combatant.origin.characterId;
  const session = input.characters.get(characterId);
  if (session === undefined) {
    return Result.fail({
      tag: "battleRosterCharacterSessionMissing",
      combatantId: input.combatant.combatantId,
      characterId,
    });
  }
  if (session.tag !== "inBattle") {
    return Result.fail({
      tag: "battleRosterCharacterSessionNotInBattle",
      characterId,
    });
  }
  if (session.battleId !== input.activeBattle.state.battleId) {
    return Result.fail({
      tag: "battleRosterCharacterBattleOwnershipConflict",
      characterId,
      expectedBattleId: input.activeBattle.state.battleId,
      actualBattleId: session.battleId,
    });
  }
  const settled = settleCharacterSheetFromBattle({
    battleSession: input.activeBattle,
    combatantId: input.combatant.combatantId,
    sheet: session.sheet,
    unitLibrary: input.unitLibrary,
    statBlockCatalog: input.statBlockCatalog,
  });
  if (Result.isFailure(settled)) {
    return Result.fail({
      tag: "battleRosterSettlementInvalid",
      characterId,
      message: settled.failure.message,
    });
  }
  return Result.succeed([
    {
      kind: "leaveBattle",
      expected: session,
      next: settled.success,
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
