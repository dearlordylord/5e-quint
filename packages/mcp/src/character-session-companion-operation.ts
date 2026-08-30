import { characterId, type CharacterId } from "@dnd/battle-runtime";
import {
  characterSheetCompanion,
  createRetainedFamiliarLikeCompanion,
  type CharacterSheetCompanionFormSelection,
  type CharacterSheetRetainedCompanionCreationSource,
  type CharacterSheetRetainedCompanionId,
} from "@dnd/character-sheet-runtime";
import { spellSlotLevel } from "@dnd/shared/types";
import { PACT_OF_THE_CHAIN_SPECIAL_FORM_REFS } from "@dnd/surface/surface/find-familiar-forms";
import { Result } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import type { AvailableCharacterSession } from "./session-store.ts";
import { CharacterSessionOperationOutputSchema } from "./character-tool-output.ts";
import type { ApplyCharacterSessionOperationToolInput } from "./character-session-operation-tool-input.ts";
import { schemaJsonContent } from "./schema-codec.ts";
import { mcpSessionSummary } from "./session-snapshot-output.ts";
import { errorContent } from "./tool-content.ts";

export function applyRetainOneAtATimeCompanionOperation(
  root: McpPlaySessionRoot,
  input: {
    readonly session: AvailableCharacterSession;
    readonly operation: Extract<
      ApplyCharacterSessionOperationToolInput["operation"],
      { readonly kind: "retainOneAtATimeCompanion" }
    >;
  },
) {
  const characterSessionId = input.session.characterId;
  const selectedForm = retainedCompanionFormSelectionFromTool(
    input.operation.selectedForm,
  );
  if (Result.isFailure(selectedForm)) {
    return errorContent("Character session operation failed.", {
      code: "CHARACTER_SESSION_OPERATION_INVALID",
      characterId: characterSessionId,
      message: selectedForm.failure,
    });
  }
  const companionId = input.operation.companionId;
  if (
    retainedCompanionIdUsedByAnotherCharacter(root, {
      characterId: characterId(characterSessionId),
      companionId,
    })
  ) {
    return errorContent("Character session operation failed.", {
      code: "CHARACTER_SESSION_OPERATION_INVALID",
      characterId: characterSessionId,
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
      characterId: characterSessionId,
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
  for (const [
    sessionCharacterId,
    session,
  ] of root.sessionStore.characters.entries()) {
    if (sessionCharacterId === input.characterId) continue;
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
