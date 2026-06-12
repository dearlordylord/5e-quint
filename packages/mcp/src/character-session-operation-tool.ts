import { characterId, type CharacterId } from "@dnd/battle-runtime";
import {
  characterSheetCompanion,
  createRetainedFamiliarLikeCompanion,
  parseCharacterSheetRetainedCompanionId,
  type CharacterSheetCompanionFormSelection,
  type CharacterSheetRetainedCompanionCreationSource,
  type CharacterSheetRetainedCompanionId,
} from "@dnd/character-sheet-runtime";
import { spellSlotLevel } from "@dnd/shared/types";
import { PACT_OF_THE_CHAIN_SPECIAL_FORM_REFS } from "@dnd/surface/surface/find-familiar-forms";
import { Either, Match } from "effect";

import type { McpCompositionRoot } from "./composition-root.ts";
import type { AvailableCharacterSession } from "./session-store.ts";
import { CharacterSessionOperationOutputSchema } from "./character-tool-output.ts";
import { schemaJsonContent } from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";
import type { ApplyCharacterSessionOperationToolInput } from "./character-session-operation-tool-input.ts";

export function applyCharacterSessionOperation(
  root: McpCompositionRoot,
  input: ApplyCharacterSessionOperationToolInput,
) {
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
    Match.exhaustive,
  );
}

function applyRetainOneAtATimeCompanionOperation(
  root: McpCompositionRoot,
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
  const companionId = parseCharacterSheetRetainedCompanionId(
    input.operation.companionId,
  );
  if (Either.isLeft(companionId)) {
    return errorContent("Character session operation failed.", {
      code: "CHARACTER_SESSION_OPERATION_INVALID",
      characterId: input.characterId,
      message: companionId.left.message,
    });
  }
  if (
    retainedCompanionIdUsedByAnotherCharacter(root, {
      characterId: characterId(input.characterId),
      companionId: companionId.right,
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
    companionId: companionId.right,
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
    session: root.sessionStore.snapshot(),
  });
}

function retainedCompanionIdUsedByAnotherCharacter(
  root: McpCompositionRoot,
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
