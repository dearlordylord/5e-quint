import type {
  BattleCreatureInit,
  BattleId,
  BattleRuntimeSession,
  BattleSubject,
  CombatantId,
} from "@dnd/battle-runtime";
import type { CharacterSheetId } from "@dnd/character-sheet-runtime";

import type {
  CharacterSession,
  McpBattleStateTransitionIssue,
  PendingBattleFillSession,
} from "./session-store.ts";

type CharacterId = CharacterSheetId;

export type McpBattleRosterOperation =
  | {
      readonly kind: "addCharacter";
      readonly combatant: BattleCreatureInit;
    }
  | {
      readonly kind: "addStatBlock";
      readonly combatant: BattleCreatureInit;
    }
  | {
      readonly kind: "remove";
      readonly combatantId: CombatantId;
    };

export type ActiveBattleRosterTransitionPlan = {
  readonly [ActiveBattleRosterTransitionPlanBrand]: true;
};

const ActiveBattleRosterTransitionPlanBrand: unique symbol = Symbol(
  "ActiveBattleRosterTransitionPlan",
);

export function createActiveBattleRosterTransitionPlan(): ActiveBattleRosterTransitionPlan {
  return Object.freeze({
    [ActiveBattleRosterTransitionPlanBrand]: true as const,
  });
}

export type ActiveBattleRosterTransitionPreview =
  | {
      readonly kind: "add";
      readonly plan: ActiveBattleRosterTransitionPlan;
      readonly prospectiveBattle: BattleRuntimeSession;
    }
  | {
      readonly kind: "remove";
      readonly plan: ActiveBattleRosterTransitionPlan;
      readonly prospectiveBattle: BattleRuntimeSession;
      readonly removedCombatantIds: readonly [CombatantId, ...CombatantId[]];
    };

export type ActiveBattleRosterTransitionPlanResult =
  | {
      readonly kind: "add";
      readonly prospectiveBattle: BattleRuntimeSession;
    }
  | {
      readonly kind: "remove";
      readonly prospectiveBattle: BattleRuntimeSession;
      readonly removedCombatantIds: readonly [CombatantId, ...CombatantId[]];
    };

export type ActiveBattleRosterTransitionPlanData = {
  readonly storeIdentity: object;
  readonly activeBattle: BattleRuntimeSession;
  readonly nextCharacterSessions: readonly CharacterSession[];
  readonly affectedCharacterSessions: readonly {
    readonly characterId: CharacterId;
    readonly session: CharacterSession;
  }[];
  readonly pendingBattleFills: PendingBattleFillSession | null;
  readonly result: ActiveBattleRosterTransitionPlanResult;
};

export type McpBattleRosterTransitionIssue =
  | McpBattleStateTransitionIssue
  | {
      readonly tag: "battleRosterPendingBattleFills";
      readonly pendingSubject: BattleSubject;
    }
  | {
      readonly tag: "battleRosterOperationInvalid";
      readonly message: string;
    }
  | {
      readonly tag: "battleRosterCombatantAdmissionFailed";
      readonly combatantId: CombatantId;
      readonly message: string;
    }
  | {
      readonly tag: "battleRosterCombatantNotFound";
      readonly combatantId: CombatantId;
    }
  | {
      readonly tag: "battleRosterRemovalEmpty";
      readonly combatantId: CombatantId;
    }
  | {
      readonly tag: "battleRosterCharacterSessionMissing";
      readonly combatantId: CombatantId;
      readonly characterId: CharacterId;
    }
  | {
      readonly tag: "battleRosterCharacterSessionNotInBattle";
      readonly characterId: CharacterId;
    }
  | {
      readonly tag: "battleRosterCharacterBattleOwnershipConflict";
      readonly characterId: CharacterId;
      readonly expectedBattleId: BattleId;
      readonly actualBattleId: BattleId;
    }
  | {
      readonly tag: "battleRosterCharacterAlreadyInBattle";
      readonly characterId: CharacterId;
      readonly battleId: BattleId;
    }
  | {
      readonly tag: "battleRosterSettlementInvalid";
      readonly characterId: CharacterId;
      readonly message: string;
    }
  | {
      readonly tag: "battleRosterUnknownPlan";
    }
  | {
      readonly tag: "battleRosterPlanBattleChanged";
      readonly battleId: BattleId;
    }
  | {
      readonly tag: "battleRosterPlanCharacterChanged";
      readonly characterIds: readonly CharacterId[];
    }
  | {
      readonly tag: "battleRosterPlanFillsChanged";
    };
