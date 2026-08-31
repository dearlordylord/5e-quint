import type {
  BattleId,
  BattleRuntimeSession,
  CombatantId,
} from "@dnd/battle-runtime";
import { settleCharacterSheetFromBattle } from "@dnd/character-battle-runtime";
import type { CharacterSheetId } from "@dnd/character-sheet-runtime";
import { Result, Match } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import type {
  AvailableCharacterSession,
  InBattleCharacterSession,
} from "./session-store-types.ts";
import { errorContent } from "./tool-content.ts";

export type BattleCharacterSessionSettlement = {
  readonly expected: InBattleCharacterSession;
  readonly next: AvailableCharacterSession;
};

export type BattleCharacterSessionHandoffIssue =
  | {
      readonly tag: "unknownBattleCharacterSession";
      readonly combatantId: CombatantId;
      readonly characterId: CharacterSheetId;
    }
  | {
      readonly tag: "characterSessionNotInBattle";
      readonly characterId: CharacterSheetId;
    }
  | {
      readonly tag: "characterSessionBattleOwnershipConflict";
      readonly characterId: CharacterSheetId;
      readonly expectedBattleId: BattleId;
      readonly actualBattleId: BattleId;
    }
  | {
      readonly tag: "characterSessionSettlementInvalid";
      readonly characterId: CharacterSheetId;
      readonly message: string;
    };

export function settleCharacterSessionsFromBattle(
  root: McpPlaySessionRoot,
  battleSession: BattleRuntimeSession,
): Result.Result<
  readonly BattleCharacterSessionSettlement[],
  BattleCharacterSessionHandoffIssue
> {
  const state = battleSession.state;
  const settlements: BattleCharacterSessionSettlement[] = [];
  for (const combatant of state.combatants.values()) {
    if (combatant.origin.kind !== "character") continue;

    const characterId = combatant.origin.characterId;
    const session = root.sessionStore.characters.get(characterId);
    if (session == null) {
      return Result.fail({
        tag: "unknownBattleCharacterSession",
        combatantId: combatant.combatantId,
        characterId,
      });
    }

    if (session.tag !== "inBattle") {
      return Result.fail({
        tag: "characterSessionNotInBattle",
        characterId,
      });
    }
    if (session.battleId !== state.battleId) {
      return Result.fail({
        tag: "characterSessionBattleOwnershipConflict",
        characterId,
        expectedBattleId: state.battleId,
        actualBattleId: session.battleId,
      });
    }
    const settledSession = settleCharacterSheetFromBattle({
      battleSession,
      combatantId: combatant.combatantId,
      sheet: session.sheet,
      unitLibrary: root.unitLibrary,
      statBlockCatalog: root.statBlockCatalog,
    });
    if (Result.isFailure(settledSession)) {
      return Result.fail({
        tag: "characterSessionSettlementInvalid",
        characterId,
        message: settledSession.failure.message,
      });
    }
    settlements.push({ expected: session, next: settledSession.success });
  }

  return Result.succeed(settlements);
}

export function characterSessionHandoffErrorContent(
  issue: BattleCharacterSessionHandoffIssue,
) {
  return Match.value(issue).pipe(
    Match.when({ tag: "unknownBattleCharacterSession" }, (matched) =>
      errorContent("Battle character has no matching session record.", {
        code: "UNKNOWN_BATTLE_CHARACTER_SESSION",
        combatantId: matched.combatantId,
        characterId: matched.characterId,
      }),
    ),
    Match.when({ tag: "characterSessionNotInBattle" }, (matched) =>
      errorContent("Battle character session is not in battle.", {
        code: "CHARACTER_SESSION_NOT_IN_BATTLE",
        characterId: matched.characterId,
      }),
    ),
    Match.when({ tag: "characterSessionBattleOwnershipConflict" }, (matched) =>
      errorContent("Battle character session belongs to another battle.", {
        code: "CHARACTER_SESSION_BATTLE_OWNERSHIP_CONFLICT",
        characterId: matched.characterId,
        expectedBattleId: matched.expectedBattleId,
        actualBattleId: matched.actualBattleId,
      }),
    ),
    Match.when({ tag: "characterSessionSettlementInvalid" }, (matched) =>
      errorContent("Battle character session handoff failed.", {
        code: "CHARACTER_SESSION_HANDOFF_INVALID",
        characterId: matched.characterId,
        message: matched.message,
      }),
    ),
    Match.exhaustive,
  );
}
