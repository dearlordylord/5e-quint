import { characterId } from "@dnd/battle-runtime";
import {
  advanceCharacterBuildClassLevel,
  characterBuildDruidWildShapeFacts,
  replaceDruidWildShapeKnownForm,
} from "@dnd/character-creation-runtime";
import { type CharacterSheetId } from "@dnd/character-sheet-runtime";
import type { StatBlockId } from "@dnd/shared/game-facts";
import { Result, Match } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import type { AvailableCharacterSession } from "./session-store.ts";
import { CharacterSessionOperationOutputSchema } from "./character-tool-output.ts";
import type { ApplyCharacterSessionOperationToolInput } from "./character-session-operation-tool-input.ts";
import {
  applyCompleteLongRestOperation,
  applyCompleteShortRestOperation,
  applyInterruptLongRestOperation,
  applyInterruptShortRestOperation,
} from "./character-session-rest-operation.ts";
import { applyHealingCharacterSessionOperation } from "./character-session-healing-operation.ts";
import { applyRetainOneAtATimeCompanionOperation } from "./character-session-companion-operation.ts";
import { applyPassCalendarTimeOperation } from "./character-session-calendar-operation.ts";
import {
  applyCharacterSessionResourceOperation,
  isCharacterSessionResourceOperation,
} from "./character-session-resource-operation.ts";
import {
  characterBuildClassLevelGainFromTool,
  runtimeIssueMessage,
} from "./character-session-class-level-gain.ts";
import { rebuildCharacterSheetForOperation } from "./character-session-sheet-rebuild.ts";
import {
  characterSessionDetailForAvailableSheet,
  characterSessionDetailOutput,
  type CharacterSessionProjectionIssue,
} from "./character-session-rows.ts";
import { characterBuildDisplayNameIssueMessage } from "./character-display.ts";
import { schemaJsonContent } from "./schema-codec.ts";
import { mcpSessionSummary } from "./session-snapshot-output.ts";
import { errorContent } from "./tool-content.ts";

export function applyCharacterSessionOperation(
  root: McpPlaySessionRoot,
  input: ApplyCharacterSessionOperationToolInput,
) {
  if (
    input.operation.kind === "applyLayOnHands" ||
    input.operation.kind === "applySpellRestBenefit"
  ) {
    return applyHealingCharacterSessionOperation(root, {
      characterId: input.characterId,
      operation: input.operation,
    });
  }
  const id = characterId(input.characterId);
  const session = root.sessionStore.characters.get(id);
  if (session === undefined) {
    return errorContent(`Unknown character session: ${input.characterId}`, {
      code: "UNKNOWN_CHARACTER_SESSION",
      characterId: input.characterId,
    });
  }
  if (session.tag === "inBattle") {
    return errorContent(
      "Character session operation requires an available character.",
      {
        code: "CHARACTER_SESSION_IN_BATTLE",
        characterId: input.characterId,
      },
    );
  }

  return Match.value(input.operation).pipe(
    Match.when({ kind: "retainOneAtATimeCompanion" }, (operation) =>
      applyRetainOneAtATimeCompanionOperation(root, {
        characterId: input.characterId,
        session,
        operation,
      }),
    ),
    Match.when({ kind: "advanceClassLevel" }, (operation) =>
      applyAdvanceClassLevelOperation(root, {
        characterId: input.characterId,
        session,
        operation,
      }),
    ),
    Match.when({ kind: "replaceDruidWildShapeKnownForm" }, (operation) =>
      applyReplaceDruidWildShapeKnownFormOperation(root, {
        characterId: input.characterId,
        session,
        operation,
      }),
    ),
    Match.when({ kind: "completeShortRest" }, (operation) =>
      applyCompleteShortRestOperation(root, {
        characterId: input.characterId,
        session,
        operation,
      }),
    ),
    Match.when({ kind: "interruptShortRest" }, (operation) =>
      applyInterruptShortRestOperation(root, {
        characterId: input.characterId,
        session,
        operation,
      }),
    ),
    Match.when({ kind: "completeLongRest" }, (operation) =>
      applyCompleteLongRestOperation(root, {
        characterId: input.characterId,
        session,
        operation,
      }),
    ),
    Match.when({ kind: "interruptLongRest" }, (operation) =>
      applyInterruptLongRestOperation(root, {
        characterId: input.characterId,
        session,
        operation,
      }),
    ),
    Match.when({ kind: "passCalendarTime" }, (operation) =>
      applyPassCalendarTimeOperation(root, {
        characterId: input.characterId,
        session,
        operation,
      }),
    ),
    Match.when(isCharacterSessionResourceOperation, (operation) =>
      applyCharacterSessionResourceOperation(root, {
        characterId: input.characterId,
        session,
        operation,
      }),
    ),
    Match.exhaustive,
  );
}

function applyAdvanceClassLevelOperation(
  root: McpPlaySessionRoot,
  input: {
    readonly characterId: CharacterSheetId;
    readonly session: AvailableCharacterSession;
    readonly operation: Extract<
      ApplyCharacterSessionOperationToolInput["operation"],
      { readonly kind: "advanceClassLevel" }
    >;
  },
) {
  const levelGain = characterBuildClassLevelGainFromTool(root, {
    levelGain: input.operation.levelGain,
  });
  if (Result.isFailure(levelGain)) {
    return characterSessionOperationInvalid(
      input.characterId,
      levelGain.failure,
    );
  }
  const build = advanceCharacterBuildClassLevel({
    build: input.session.build,
    unitLibrary: root.unitLibrary,
    levelGain: levelGain.success,
  });
  if (Result.isFailure(build)) {
    return characterSessionOperationInvalid(
      input.characterId,
      runtimeIssueMessage(build.failure),
    );
  }
  return commitAvailableCharacterSheetOperation(root, {
    characterId: input.characterId,
    sheet: input.session,
    build: build.success,
  });
}

function applyReplaceDruidWildShapeKnownFormOperation(
  root: McpPlaySessionRoot,
  input: {
    readonly characterId: CharacterSheetId;
    readonly session: AvailableCharacterSession;
    readonly operation: Extract<
      ApplyCharacterSessionOperationToolInput["operation"],
      { readonly kind: "replaceDruidWildShapeKnownForm" }
    >;
  },
) {
  const currentKnownForms = input.session.druidWildShapeKnownForms;
  if (currentKnownForms === undefined) {
    return characterSessionOperationInvalid(
      input.characterId,
      "Druid Wild Shape replacement requires current known forms.",
    );
  }
  const facts = characterBuildDruidWildShapeFacts({
    build: input.session.build,
    unitLibrary: root.unitLibrary,
  });
  if (Result.isFailure(facts)) {
    return characterSessionOperationInvalid(
      input.characterId,
      runtimeIssueMessage(facts.failure),
    );
  }
  if (facts.success === undefined) {
    return characterSessionOperationInvalid(
      input.characterId,
      "Druid Wild Shape replacement requires the Druid Wild Shape feature.",
    );
  }
  const replaced = replaceDruidWildShapeKnownForm({
    facts: facts.success,
    currentKnownFormStatBlockIds: currentKnownForms.statBlockIds,
    replacement: input.operation.replacement,
    statBlockCatalog: root.statBlockCatalog,
  });
  if (Result.isFailure(replaced)) {
    return characterSessionOperationInvalid(
      input.characterId,
      runtimeIssueMessage(replaced.failure),
    );
  }
  return commitAvailableCharacterSheetOperation(root, {
    characterId: input.characterId,
    sheet: input.session,
    build: input.session.build,
    druidWildShapeKnownFormStatBlockIds: replaced.success,
  });
}

function commitAvailableCharacterSheetOperation(
  root: McpPlaySessionRoot,
  input: {
    readonly characterId: CharacterSheetId;
    readonly sheet: AvailableCharacterSession;
    readonly build: AvailableCharacterSession["build"];
    readonly druidWildShapeKnownFormStatBlockIds?: readonly StatBlockId[];
  },
) {
  const rebuilt = rebuildCharacterSheetForOperation(root, {
    sheet: input.sheet,
    build: input.build,
    ...(input.druidWildShapeKnownFormStatBlockIds === undefined
      ? {}
      : {
          druidWildShapeKnownFormStatBlockIds:
            input.druidWildShapeKnownFormStatBlockIds,
        }),
  });
  if (Result.isFailure(rebuilt)) {
    return characterSessionOperationInvalid(input.characterId, rebuilt.failure);
  }
  const detail = characterSessionDetailForAvailableSheet(root, rebuilt.success);
  if (Result.isFailure(detail)) {
    return characterSessionOperationProjectionInvalid(
      input.characterId,
      detail.failure,
    );
  }
  root.sessionStore.characters.set(rebuilt.success);
  return schemaJsonContent(CharacterSessionOperationOutputSchema, {
    detail: characterSessionDetailOutput(detail.success),
    session: mcpSessionSummary(root.sessionStore.snapshot()),
  });
}

function characterSessionOperationInvalid(
  characterId: CharacterSheetId,
  message: string,
) {
  return errorContent("Character session operation failed.", {
    code: "CHARACTER_SESSION_OPERATION_INVALID",
    characterId,
    message,
  });
}

function characterSessionOperationProjectionInvalid(
  characterId: CharacterSheetId,
  issue: CharacterSessionProjectionIssue,
) {
  const message = Match.value(issue).pipe(
    Match.when(
      { tag: "hitPointMaximumUnavailable" },
      ({ issue: characterSheetIssue }) => characterSheetIssue.message,
    ),
    Match.when(
      { tag: "hitDiceUnavailable" },
      ({ issue: characterSheetIssue }) => characterSheetIssue.message,
    ),
    Match.when(
      { tag: "resourcesUnavailable" },
      ({ issue: characterSheetIssue }) => characterSheetIssue.message,
    ),
    Match.when({ tag: "characterDisplayUnavailable" }, ({ issues }) =>
      characterBuildDisplayNameIssueMessage(issues),
    ),
    Match.exhaustive,
  );
  return errorContent("Character session operation failed.", {
    code: "CHARACTER_SESSION_OPERATION_INVALID",
    characterId,
    message,
    issue,
  });
}
