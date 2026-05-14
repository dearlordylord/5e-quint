import {
  battleCreatureInitFromStatBlock,
  snapshotBattle,
  startBattle,
  type BattleCreatureInit,
} from "@dnd/battle-runtime";
import { characterSheetBattleInit } from "@dnd/character-battle-runtime";
import { traverseValidation } from "@dnd/shared-algebras/validation-algebra";
import { Either, Match, Option } from "effect";

import { characterBuildDisplayName } from "./character-display.ts";
import type { McpCompositionRoot } from "./composition-root.ts";
import { type AvailableCharacterSession } from "./session-store.ts";
import {
  type InitialBattleCombatantToolInput,
  type InitialCharacterSessionCombatantToolInput,
  type StartBattleToolInput,
} from "./start-battle-tool-input.ts";
import { StartBattleOutputSchema } from "./battle-tool-output.ts";
import { schemaJsonContent, type ToolError } from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";

type StartableCharacterSessionCombatant = {
  readonly character: InitialCharacterSessionCombatantToolInput;
  readonly session: AvailableCharacterSession;
};

type StartableBattleCombatants = {
  readonly creatureInits: readonly BattleCreatureInit[];
  readonly characterSessions: readonly StartableCharacterSessionCombatant[];
};

type StartableBattleCombatant = {
  readonly creatureInit: BattleCreatureInit;
  readonly characterSession?: StartableCharacterSessionCombatant;
};

export function handleStartBattleToolCall(
  root: McpCompositionRoot,
  input: StartBattleToolInput,
) {
  const activeBattle = root.sessionStore.battleState;
  if (activeBattle !== null) {
    return errorContent("A battle session is already active.", {
      code: "BATTLE_SESSION_ALREADY_ACTIVE",
      battleId: activeBattle.battleId,
    });
  }

  const duplicateInput = duplicateStartBattleInputContent(
    input.initialCombatants,
  );
  if (duplicateInput !== null) return duplicateInput;

  const combatants = startableBattleCombatants({
    root,
    initialCombatants: input.initialCombatants,
  });
  if (Either.isLeft(combatants)) return combatants.left;

  const state = startBattle({
    battleId: input.battleId,
    combatants: combatants.right.creatureInits,
  });
  if (Either.isLeft(state)) {
    return errorContent("Battle session start failed.", {
      code: "BATTLE_START_FAILED",
      message: state.left.message,
    });
  }
  root.sessionStore.battleState = state.right;
  root.sessionStore.pendingBattleFills = null;
  for (const { session } of combatants.right.characterSessions) {
    root.sessionStore.characters.set({
      tag: "inBattle",
      sheet: session,
      battleId: input.battleId,
    });
  }

  return schemaJsonContent(StartBattleOutputSchema, {
    snapshot: snapshotBattle(state.right),
    session: root.sessionStore.snapshot(),
  });
}

function duplicateStartBattleInputContent(
  initialCombatants: readonly InitialBattleCombatantToolInput[],
) {
  const characters = initialCombatants.filter(isCharacterSessionCombatant);
  const duplicateCharacterId = firstDuplicate(
    characters.map((character) => character.characterId),
  );
  if (duplicateCharacterId !== null) {
    return errorContent("Duplicate character id in battle start.", {
      code: "DUPLICATE_BATTLE_CHARACTER_ID",
      characterId: duplicateCharacterId,
    });
  }

  const duplicateCombatantId = firstDuplicate(
    initialCombatants.map((combatant) => combatant.combatantId),
  );
  if (duplicateCombatantId !== null) {
    return errorContent("Duplicate combatant id in battle start.", {
      code: "DUPLICATE_BATTLE_COMBATANT_ID",
      combatantId: duplicateCombatantId,
    });
  }

  return null;
}

function startableBattleCombatants(input: {
  readonly root: McpCompositionRoot;
  readonly initialCombatants: readonly InitialBattleCombatantToolInput[];
}): Either.Either<StartableBattleCombatants, ReturnType<typeof errorContent>> {
  const combatants = traverseValidation(input.initialCombatants, (combatant) =>
    startableBattleCombatant(input.root, combatant),
  );
  if (Either.isLeft(combatants)) {
    return Either.left(invalidBattleCombatantsContent(combatants.left));
  }

  return Either.right({
    creatureInits: combatants.right.map((combatant) => combatant.creatureInit),
    characterSessions: combatants.right.flatMap((combatant) =>
      combatant.characterSession === undefined
        ? []
        : [combatant.characterSession],
    ),
  });
}

function startableBattleCombatant(
  root: McpCompositionRoot,
  combatant: InitialBattleCombatantToolInput,
): Either.Either<StartableBattleCombatant, ToolError> {
  return Match.value(combatant).pipe(
    Match.when({ kind: "characterSession" }, (character) => {
      const session = root.sessionStore.characters.get(character.characterId);
      if (session === undefined) {
        return Either.left(
          errorContent(
            `Unknown finalized character session: ${character.characterId}`,
            {
              code: "UNKNOWN_FINALIZED_CHARACTER_SESSION",
              characterId: character.characterId,
            },
          ),
        );
      }
      if (session.tag === "inBattle") {
        return Either.left(
          errorContent("Character is already assigned to a battle.", {
            code: "CHARACTER_ALREADY_IN_BATTLE",
            characterId: character.characterId,
            battleId: session.battleId,
          }),
        );
      }
      const characterInit = characterSheetBattleInit({
        combatantId: character.combatantId,
        displayName: characterBuildDisplayName(root.unitLibrary, session.build),
        sheet: session,
        initiative: character.initiative,
        side: character.side,
        unitLibrary: root.unitLibrary,
      });
      return Either.isLeft(characterInit)
        ? Either.left(
            errorContent(characterInit.left.message, {
              code: "CHARACTER_BATTLE_INIT_INVALID",
            }),
          )
        : Either.right({
            creatureInit: { ...characterInit.right },
            characterSession: { character, session },
          });
    }),
    Match.when({ kind: "statBlock" }, (statBlockCombatant) => {
      const statBlock = root.statBlockCatalog.getStatBlock(
        statBlockCombatant.statBlockId,
      );
      if (Option.isNone(statBlock)) {
        return Either.left(
          errorContent("Unknown Stat Block combatant.", {
            code: "UNKNOWN_STAT_BLOCK_COMBATANT",
            statBlockId: statBlockCombatant.statBlockId,
          }),
        );
      }
      return Either.right({
        creatureInit: {
          ...battleCreatureInitFromStatBlock({
            combatantId: statBlockCombatant.combatantId,
            statBlock: statBlock.value,
            initiative: statBlockCombatant.initiative,
            side: statBlockCombatant.side,
            ...(statBlockCombatant.currentHp === undefined
              ? {}
              : { currentHp: statBlockCombatant.currentHp }),
            ...(statBlockCombatant.tempHp === undefined
              ? {}
              : { tempHp: statBlockCombatant.tempHp }),
          }),
        },
      });
    }),
    Match.exhaustive,
  );
}

function invalidBattleCombatantsContent(issues: readonly ToolError[]) {
  return errorContent("Invalid battle start combatants.", {
    code: "INVALID_BATTLE_COMBATANTS",
    issues: issues.map(toolErrorPayload),
  });
}

function toolErrorPayload(error: ToolError): unknown {
  const text = error.content[0]?.text;
  if (text === undefined) return error;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isCharacterSessionCombatant(
  combatant: InitialBattleCombatantToolInput,
): combatant is InitialCharacterSessionCombatantToolInput {
  return combatant.kind === "characterSession";
}

function firstDuplicate<T>(values: readonly T[]): T | null {
  const seen = new Set<T>();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return null;
}
