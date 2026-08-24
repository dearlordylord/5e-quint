import type {
  CharacterDraft,
  CharacterDraftId,
  NonEmptyReadonlyArray,
} from "@dnd/character-creation-runtime";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import type {
  ModelFacingCreationProjectionIssue,
  ModelFacingCreationState,
} from "./model-facing-creation-holes.ts";
import { mcpSessionSummary } from "./session-snapshot-output.ts";
import { errorContent } from "./tool-content.ts";

export function creationDraftPayload(
  root: McpPlaySessionRoot,
  draft: CharacterDraft,
  projection: ModelFacingCreationState,
) {
  return {
    draft,
    holes: projection.holes,
    finalization: projection.finalization,
    session: mcpSessionSummary(root.sessionStore.snapshot()),
  };
}

export function invalidCreationSupportProfileContent(
  issues: NonEmptyReadonlyArray<ModelFacingCreationProjectionIssue>,
) {
  return errorContent(
    "Character creation support profile cannot satisfy a required choice.",
    { code: "INVALID_CHARACTER_CREATION_SUPPORT_PROFILE", issues },
  );
}

export function duplicateDraftIdContent(
  draftId: CharacterDraftId,
  existingOwner: "activeDraft" | "finalizedSession",
) {
  return errorContent(`Character draft id already exists: ${draftId}`, {
    code: "DUPLICATE_CHARACTER_DRAFT_ID",
    draftId,
    existingOwner,
  });
}
