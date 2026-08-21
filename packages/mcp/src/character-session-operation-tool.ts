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
  type CharacterSheetRetainedCompanionCreationSource,
  type CharacterSheetRetainedCompanionId,
} from "@dnd/character-sheet-runtime";
import type { StatBlockId } from "@dnd/shared/game-facts";
import { spellSlotLevel } from "@dnd/shared/types";
import { PACT_OF_THE_CHAIN_SPECIAL_FORM_REFS } from "@dnd/surface/surface/find-familiar-forms";
import { Either, Match } from "effect";

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
    Match.exhaustive,
  );
}

function applyAdvanceClassLevelOperation(
  root: McpPlaySessionRoot,
  input: {
    readonly characterId: string;
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
  if (Either.isLeft(levelGain)) {
    return characterSessionOperationInvalid(input.characterId, levelGain.left);
  }
  const build = advanceCharacterBuildClassLevel({
    build: input.session.build,
    unitLibrary: root.unitLibrary,
    levelGain: levelGain.right,
  });
  if (Either.isLeft(build)) {
    return characterSessionOperationInvalid(
      input.characterId,
      runtimeIssueMessage(build.left),
    );
  }
  return commitAvailableCharacterSheetOperation(root, {
    characterId: input.characterId,
    sheet: input.session,
    build: build.right,
  });
}

function applyReplaceDruidWildShapeKnownFormOperation(
  root: McpPlaySessionRoot,
  input: {
    readonly characterId: string;
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
  if (Either.isLeft(facts)) {
    return characterSessionOperationInvalid(
      input.characterId,
      runtimeIssueMessage(facts.left),
    );
  }
  if (facts.right === undefined) {
    return characterSessionOperationInvalid(
      input.characterId,
      "Druid Wild Shape replacement requires the Druid Wild Shape feature.",
    );
  }
  const replaced = replaceDruidWildShapeKnownForm({
    facts: facts.right,
    currentKnownFormStatBlockIds: currentKnownForms.statBlockIds,
    replacement: input.operation.replacement,
    statBlockCatalog: root.statBlockCatalog,
  });
  if (Either.isLeft(replaced)) {
    return characterSessionOperationInvalid(
      input.characterId,
      runtimeIssueMessage(replaced.left),
    );
  }
  return commitAvailableCharacterSheetOperation(root, {
    characterId: input.characterId,
    sheet: input.session,
    build: input.session.build,
    druidWildShapeKnownFormStatBlockIds: replaced.right,
  });
}

function commitAvailableCharacterSheetOperation(
  root: McpPlaySessionRoot,
  input: {
    readonly characterId: string;
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
  if (Either.isLeft(rebuilt)) {
    return characterSessionOperationInvalid(input.characterId, rebuilt.left);
  }
  const detail = characterSessionDetailForAvailableSheet(root, rebuilt.right);
  if (Either.isLeft(detail)) {
    return characterSessionOperationInvalid(
      input.characterId,
      detail.left.message,
    );
  }
  root.sessionStore.characters.set(rebuilt.right);
  return schemaJsonContent(CharacterSessionOperationOutputSchema, {
    detail: characterSessionDetailOutput(detail.right),
    session: mcpSessionSummary(root.sessionStore.snapshot()),
  });
}

function characterSessionOperationInvalid(
  characterId: string,
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
    readonly characterId: string;
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
  if (Either.isLeft(selectedForm)) {
    return errorContent("Character session operation failed.", {
      code: "CHARACTER_SESSION_OPERATION_INVALID",
      characterId: input.characterId,
      message: selectedForm.left,
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
    selectedForm: selectedForm.right,
    ...(input.operation.creatureTypeOverrideChoiceId === undefined
      ? {}
      : {
          creatureTypeOverrideChoiceId:
            input.operation.creatureTypeOverrideChoiceId,
        }),
  });
  if (Either.isLeft(updated)) {
    return errorContent("Character session operation failed.", {
      code: "CHARACTER_SESSION_OPERATION_INVALID",
      characterId: input.characterId,
      message: updated.left.message,
    });
  }
  root.sessionStore.characters.set(updated.right);
  return schemaJsonContent(CharacterSessionOperationOutputSchema, {
    character: updated.right,
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
): Either.Either<CharacterSheetCompanionFormSelection, string> {
  if (selectedForm.tag !== "pactOfTheChainSpecialForm") {
    return Either.right(selectedForm);
  }
  const specialForm = PACT_OF_THE_CHAIN_SPECIAL_FORM_REFS.find(
    (form) => form.formId === selectedForm.formId,
  );
  return specialForm === undefined
    ? Either.left("Unknown retained companion special form.")
    : Either.right({
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
