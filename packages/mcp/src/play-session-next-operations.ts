import type { McpSessionSummary } from "./session-snapshot-output.ts";
import { battleToolNames } from "./battle-tool-input.ts";
import { characterToolNames } from "./character-tool-input.ts";
import { contentToolNames } from "./content-tools.ts";
import type { UnresolvedInputGroup } from "./play-session-operation-projection.ts";
import type {
  PlaySessionNextOperationName,
  PlaySessionOperationName,
} from "./play-session-tool-contract.ts";
import { playSessionToolNames } from "./play-session-tool-contract.ts";

export function nextOperationsFrom(
  operationName: PlaySessionOperationName,
  projection: McpSessionSummary,
  unresolvedInputs: readonly UnresolvedInputGroup[],
  hasAvailableCharacterSession: boolean,
): readonly PlaySessionNextOperationName[] {
  if (projection.battleState.tag === "initialInitiativeSetup") {
    return [battleToolNames.battleLifecycle, battleToolNames.readBattleState];
  }
  if (projection.battleState.tag === "activeBattle") {
    if (unresolvedInputs.length > 0) {
      return [battleToolNames.fillBattleHole, battleToolNames.readBattleState];
    }
    if (operationName === playSessionToolNames.read) {
      return [
        battleToolNames.discoverBattleActs,
        battleToolNames.readBattleState,
        battleToolNames.battleLifecycle,
      ];
    }
    return [
      battleToolNames.discoverBattleActs,
      battleToolNames.readBattleState,
      battleToolNames.battleLifecycle,
      battleToolNames.endBattle,
    ];
  }
  if (projection.draftIds.length > 0) {
    if (operationName === playSessionToolNames.read) {
      return [characterToolNames.discoverCreationHoles];
    }
    return unresolvedInputs.length > 0
      ? [
          characterToolNames.fillCreationHoles,
          characterToolNames.discoverCreationHoles,
        ]
      : [
          characterToolNames.finalizeCharacter,
          characterToolNames.discoverCreationHoles,
        ];
  }
  if (projection.characterIds.length > 0) {
    return [
      characterToolNames.listCharacters,
      characterToolNames.inspectCharacterSession,
      characterToolNames.queryCharacterSession,
      battleToolNames.startBattle,
      ...(hasAvailableCharacterSession
        ? [characterToolNames.applyCharacterSessionOperation]
        : []),
      characterToolNames.createCharacterDraft,
    ];
  }
  return [
    characterToolNames.createCharacterDraft,
    contentToolNames.listCatalogUnits,
    contentToolNames.listStatBlocks,
  ];
}
