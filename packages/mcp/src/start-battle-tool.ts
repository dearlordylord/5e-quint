import {
  battleTablePositionId,
  battleCreatureInitFromStatBlock,
  snapshotBattle,
  startBattle,
  type BattleCreatureInit,
  type BattleState,
  type CombatantId,
} from "@dnd/battle-runtime";
import {
  admitCharacterSheetCompanionToBattle,
  characterSheetBattleInit,
} from "@dnd/character-battle-runtime";
import { traverseValidation } from "@dnd/shared-algebras/validation-algebra";
import { Either, Match, Option } from "effect";

import { publishAdminProjectionBestEffort } from "./admin-mirror.ts";
import { characterBuildDisplayName } from "./character-display.ts";
import type { McpCompositionRoot } from "./composition-root.ts";
import { type AvailableCharacterSession } from "./session-store.ts";
import {
  type InitialBattleCombatantToolInput,
  type InitialCharacterSessionCombatantToolInput,
  type CompanionAdmissionToolInput,
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

type StartableBattleCombatant =
  | {
      readonly tag: "characterSession";
      readonly creatureInit: BattleCreatureInit;
      readonly characterSession: StartableCharacterSessionCombatant;
    }
  | {
      readonly tag: "encounterCombatant";
      readonly creatureInit: BattleCreatureInit;
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
    input.companionAdmissions,
  );
  if (duplicateInput !== null) return duplicateInput;
  const initialCombatantOrder = initialCombatantOrderForStartInput(input);

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
  const admittedState = admitCompanionAdmissions({
    root,
    state: state.right,
    admissions: input.companionAdmissions,
    characterSessions: combatants.right.characterSessions,
    initialCombatantOrder,
  });
  if (Either.isLeft(admittedState)) return admittedState.left;

  root.sessionStore.battleState = admittedState.right;
  root.sessionStore.pendingBattleFills = null;
  for (const { session } of combatants.right.characterSessions) {
    root.sessionStore.characters.set({
      tag: "inBattle",
      sheet: session,
      battleId: input.battleId,
    });
  }
  publishAdminProjectionBestEffort(root);

  return schemaJsonContent(StartBattleOutputSchema, {
    snapshot: snapshotBattle(admittedState.right),
    session: root.sessionStore.snapshot(),
  });
}

function duplicateStartBattleInputContent(
  initialCombatants: readonly InitialBattleCombatantToolInput[],
  companionAdmissions: readonly CompanionAdmissionToolInput[],
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

  const duplicateCombatantId = firstDuplicate([
    ...initialCombatants.map((combatant) => combatant.combatantId),
    ...companionAdmissions.flatMap((admission) =>
      admission.companionCombatantId === undefined
        ? []
        : [admission.companionCombatantId],
    ),
  ]);
  if (duplicateCombatantId !== null) {
    return errorContent("Duplicate combatant id in battle start.", {
      code: "DUPLICATE_BATTLE_COMBATANT_ID",
      combatantId: duplicateCombatantId,
    });
  }

  const duplicateCompanionOwner = firstDuplicate(
    companionAdmissions.map((admission) => admission.ownerCharacterId),
  );
  if (duplicateCompanionOwner !== null) {
    return errorContent("Duplicate companion owner in battle start.", {
      code: "DUPLICATE_BATTLE_COMPANION_OWNER",
      characterId: duplicateCompanionOwner,
    });
  }

  return null;
}

function startableBattleCombatants(input: {
  readonly root: McpCompositionRoot;
  readonly initialCombatants: readonly InitialBattleCombatantToolInput[];
}): Either.Either<StartableBattleCombatants, ReturnType<typeof errorContent>> {
  const combatants = traverseValidation(input.initialCombatants, (combatant) =>
    startableBattleCombatant({
      root: input.root,
      combatant,
    }),
  );
  if (Either.isLeft(combatants)) {
    return Either.left(invalidBattleCombatantsContent(combatants.left));
  }

  return Either.right({
    creatureInits: combatants.right.flatMap((combatant) =>
      combatant.tag === "characterSession" ||
      combatant.tag === "encounterCombatant"
        ? [combatant.creatureInit]
        : [],
    ),
    characterSessions: combatants.right.flatMap((combatant) =>
      combatant.tag === "characterSession" ? [combatant.characterSession] : [],
    ),
  });
}

function startableBattleCombatant(input: {
  readonly root: McpCompositionRoot;
  readonly combatant: InitialBattleCombatantToolInput;
}): Either.Either<StartableBattleCombatant, ToolError> {
  const { root, combatant } = input;
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
        statBlockCatalog: root.statBlockCatalog,
      });
      return Either.isLeft(characterInit)
        ? Either.left(
            errorContent(characterInit.left.message, {
              code: "CHARACTER_BATTLE_INIT_INVALID",
            }),
          )
        : Either.right({
            tag: "characterSession" as const,
            creatureInit: { ...characterInit.right },
            characterSession: { character, session },
          });
    }),
    Match.when({ kind: "statBlock" }, (statBlockCombatant) => {
      const encounterCombatant = statBlockCombatant;
      const statBlock = root.statBlockCatalog.getStatBlock(
        encounterCombatant.statBlockId,
      );
      if (Option.isNone(statBlock)) {
        return Either.left(
          errorContent("Unknown Stat Block combatant.", {
            code: "UNKNOWN_STAT_BLOCK_COMBATANT",
            statBlockId: encounterCombatant.statBlockId,
          }),
        );
      }
      return Either.right({
        tag: "encounterCombatant" as const,
        creatureInit: {
          ...battleCreatureInitFromStatBlock({
            combatantId: statBlockCombatant.combatantId,
            statBlock: statBlock.value,
            initiative: statBlockCombatant.initiative,
            side: encounterCombatant.side,
            ...(encounterCombatant.currentHp === undefined
              ? {}
              : { currentHp: encounterCombatant.currentHp }),
            ...(encounterCombatant.tempHp === undefined
              ? {}
              : { tempHp: encounterCombatant.tempHp }),
          }),
        },
      });
    }),
    Match.exhaustive,
  );
}

function admitCompanionAdmissions(input: {
  readonly root: McpCompositionRoot;
  readonly state: BattleState;
  readonly admissions: readonly CompanionAdmissionToolInput[];
  readonly characterSessions: readonly StartableCharacterSessionCombatant[];
  readonly initialCombatantOrder: ReadonlyMap<CombatantId, number>;
}): Either.Either<BattleState, ReturnType<typeof errorContent>> {
  let state = input.state;
  for (const admission of input.admissions) {
    const owner = input.characterSessions.find(
      ({ character }) => character.characterId === admission.ownerCharacterId,
    );
    if (owner === undefined) {
      return Either.left(
        errorContent("Companion admission owner is not in the battle roster.", {
          code: "COMPANION_OWNER_NOT_IN_ROSTER",
          characterId: admission.ownerCharacterId,
          ...(admission.companionCombatantId === undefined
            ? {}
            : { companionCombatantId: admission.companionCombatantId }),
        }),
      );
    }
    const admitted = admitCharacterSheetCompanionToBattle({
      state,
      sheet: owner.session,
      unitLibrary: input.root.unitLibrary,
      ownerCombatantId: owner.character.combatantId,
      ...(admission.companionCombatantId === undefined
        ? {}
        : { companionCombatantId: admission.companionCombatantId }),
      ...(admission.initiative === undefined
        ? {}
        : { initiative: admission.initiative }),
      placement:
        admission.positionId === undefined
          ? { kind: "unoccupiedSpaceWithinSpellRange" }
          : {
              kind: "unoccupiedSpaceWithinSpellRange",
              positionId: battleTablePositionId(admission.positionId),
            },
      initialCombatantOrder: input.initialCombatantOrder,
      statBlockCatalog: input.root.statBlockCatalog,
    });
    if (Either.isLeft(admitted)) {
      return Either.left(
        errorContent("Companion admission failed.", {
          code: "COMPANION_ADMISSION_FAILED",
          characterId: admission.ownerCharacterId,
          ...(admission.companionCombatantId === undefined
            ? {}
            : { combatantId: admission.companionCombatantId }),
          message: admitted.left.message,
        }),
      );
    }
    state = admitted.right;
  }
  return Either.right(state);
}

function initialCombatantOrderForStartInput(
  input: StartBattleToolInput,
): ReadonlyMap<CombatantId, number> {
  return new Map(
    [
      ...input.initialCombatants.map((combatant) => combatant.combatantId),
      ...input.companionAdmissions.flatMap((admission) =>
        admission.companionCombatantId === undefined
          ? []
          : [admission.companionCombatantId],
      ),
    ].map((combatantId, index) => [combatantId, index]),
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
