import type {
  BattleId,
  BattlePendingTransaction,
  BattleRuntimeSession,
  BattleSubject,
  CombatantId,
} from "@dnd/battle-runtime";
import type {
  BattleRosterCharacterCombatant,
  BattleRosterStatBlockCombatant,
} from "@dnd/character-battle-runtime";
import type { CharacterSheetId } from "@dnd/character-sheet-runtime";

import type {
  AvailableCharacterSession,
  InBattleCharacterSession,
  McpBattleStateTransitionIssue,
} from "./session-store-types.ts";

type CharacterId = CharacterSheetId;

export type McpBattleRosterOperation =
  | {
      readonly kind: "addCharacter";
      readonly combatant: BattleRosterCharacterCombatant;
    }
  | {
      readonly kind: "addStatBlock";
      readonly combatant: BattleRosterStatBlockCombatant;
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
  readonly characterSessionTransitions: readonly CharacterSessionBattleTransition[];
  readonly pendingBattleTransaction: BattlePendingTransaction | null;
  readonly result: ActiveBattleRosterTransitionPlanResult;
};

export type CharacterSessionBattleTransition =
  | {
      readonly kind: "enterBattle";
      readonly expected: AvailableCharacterSession;
      readonly next: InBattleCharacterSession;
    }
  | {
      readonly kind: "leaveBattle";
      readonly expected: InBattleCharacterSession;
      readonly next: AvailableCharacterSession;
    };

export type McpBattleRosterTransitionIssue =
  | Extract<
      McpBattleStateTransitionIssue,
      {
        readonly tag:
          | "invalidBattleStateTransition"
          | "battleStateCharacterSessionRegistryConflict";
      }
    >
  | {
      readonly tag: "battleRosterPendingBattleFills";
      readonly pendingSubject: BattleSubject;
    }
  | {
      readonly tag: "battleRosterUnknownPendingTransaction";
    }
  | {
      readonly tag: "battleRosterCombatantAdmissionFailed";
      readonly combatantId: CombatantId;
      readonly ownerPath: readonly ["operation", "combatant"];
      readonly message: string;
    }
  | {
      readonly tag: "battleRosterCombatantRemovalFailed";
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
