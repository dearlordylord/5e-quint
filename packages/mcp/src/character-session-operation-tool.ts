import { characterId, type CharacterId } from "@dnd/battle-runtime";
import {
  advanceCharacterBuildClassLevel,
  characterBuildDruidWildShapeFacts,
  replaceDruidWildShapeKnownForm,
} from "@dnd/character-creation-runtime";
import {
  characterSheetCompanion,
  createRetainedFamiliarLikeCompanion,
  type CharacterSheetCompanionFormSelection,
  type CharacterSheetId,
  type CharacterSheetRetainedCompanionCreationSource,
  type CharacterSheetRetainedCompanionId,
} from "@dnd/character-sheet-runtime";
import type { StatBlockId } from "@dnd/shared/game-facts";
import { spellSlotLevel } from "@dnd/shared/types";
import { PACT_OF_THE_CHAIN_SPECIAL_FORM_REFS } from "@dnd/surface/surface/find-familiar-forms";
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
} from "./character-session-rows.ts";
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
    return characterSessionOperationInvalid(
      input.characterId,
      detail.failure.message,
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

function applyRetainOneAtATimeCompanionOperation(
  root: McpPlaySessionRoot,
  input: {
    readonly characterId: CharacterSheetId;
    readonly session: AvailableCharacterSession;
    readonly operation: Extract<
      ApplyCharacterSessionOperationToolInput["operation"],
      { readonly kind: "retainOneAtATimeCompanion" }
    >;
  },
) {
  const selectedForm = retainedCompanionFormSelectionFromTool(
    input.operation.selectedForm,
  );
  if (Result.isFailure(selectedForm)) {
    return errorContent("Character session operation failed.", {
      code: "CHARACTER_SESSION_OPERATION_INVALID",
      characterId: input.characterId,
      message: selectedForm.failure,
    });
  }
  const companionId = input.operation.companionId;
  if (
    retainedCompanionIdUsedByAnotherCharacter(root, {
      characterId: characterId(input.characterId),
      companionId,
    })
  ) {
    return errorContent("Character session operation failed.", {
      code: "CHARACTER_SESSION_OPERATION_INVALID",
      characterId: input.characterId,
      message:
        "Retained companion id is already used by another character session.",
    });
  }
  const updated = createRetainedFamiliarLikeCompanion({
    sheet: input.session,
    unitLibrary: root.unitLibrary,
    statBlockCatalog: root.statBlockCatalog,
    companionId,
    source: retainedCompanionSourceFromTool(input.operation.source),
    selectedForm: selectedForm.success,
    ...(input.operation.creatureTypeOverrideChoiceId === undefined
      ? {}
      : {
          creatureTypeOverrideChoiceId:
            input.operation.creatureTypeOverrideChoiceId,
        }),
  });
  if (Result.isFailure(updated)) {
    return errorContent("Character session operation failed.", {
      code: "CHARACTER_SESSION_OPERATION_INVALID",
      characterId: input.characterId,
      message: updated.failure.message,
    });
  }
  root.sessionStore.characters.set(updated.success);
  return schemaJsonContent(CharacterSessionOperationOutputSchema, {
    character: updated.success,
    session: mcpSessionSummary(root.sessionStore.snapshot()),
  });
}

function retainedCompanionIdUsedByAnotherCharacter(
  root: McpPlaySessionRoot,
  input: {
    readonly characterId: CharacterId;
    readonly companionId: CharacterSheetRetainedCompanionId;
  },
): boolean {
  for (const [characterId, session] of root.sessionStore.characters.entries()) {
    if (characterId === input.characterId) continue;
    const sheet = session.tag === "inBattle" ? session.sheet : session;
    const companion = characterSheetCompanion(sheet);
    if (
      companion.tag === "retainedOneAtATime" &&
      companion.companion.companionId === input.companionId
    ) {
      return true;
    }
  }
  return false;
}

function retainedCompanionFormSelectionFromTool(
  selectedForm: Extract<
    ApplyCharacterSessionOperationToolInput["operation"],
    { readonly kind: "retainOneAtATimeCompanion" }
  >["selectedForm"],
): Result.Result<CharacterSheetCompanionFormSelection, string> {
  if (selectedForm.tag !== "pactOfTheChainSpecialForm") {
    return Result.succeed(selectedForm);
  }
  const specialForm = PACT_OF_THE_CHAIN_SPECIAL_FORM_REFS.find(
    (form) => form.formId === selectedForm.formId,
  );
  return specialForm === undefined
    ? Result.fail("Unknown retained companion special form.")
    : Result.succeed({
        tag: "pactOfTheChainSpecialForm",
        formId: specialForm.formId,
      });
}

function retainedCompanionSourceFromTool(
  source: Extract<
    ApplyCharacterSessionOperationToolInput["operation"],
    { readonly kind: "retainOneAtATimeCompanion" }
  >["source"],
): CharacterSheetRetainedCompanionCreationSource {
  if (source.tag === "spellSlotSpellCast") {
    return {
      tag: "spellSlotSpellCast",
      spellId: source.spellId,
      spellLevel: spellSlotLevel(source.spellLevel),
    };
  }
  if (source.tag === "ritualSpell") {
    return { tag: "ritualSpell", spellId: source.spellId };
  }
  if (source.tag === "invocationSpellAccess") {
    return { tag: "invocationSpellAccess", spellId: source.spellId };
  }
  return {
    tag: "classFeatureSpellCast",
    featureUnitId: source.featureUnitId,
    spend:
      source.spend.tag === "spellSlot"
        ? {
            tag: "spellSlot",
            spellLevel: spellSlotLevel(source.spend.spellLevel),
          }
        : source.spend,
  };
}
