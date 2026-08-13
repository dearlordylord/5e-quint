import type {
  abilityScoreAssignment,
  characterCreationIssueMessage,
  characterDraftId,
  creationChoiceOptionId,
  creationHoleId,
  createCharacterDraft,
  discoverCreationHoles,
  fillCreationHoles,
  finalizeCharacterDraft,
  UnitCatalog,
} from "@dnd/character-creation-runtime";
import type {
  characterSheetConstructionIssuesSummary,
  characterSheetId,
  createFreshCharacterSheet,
  FreshCharacterSheet,
} from "@dnd/character-sheet-runtime";
import type { Hp } from "@dnd/shared/types";
import type { Either } from "effect";

import type { JsonValue } from "./continuation-contract.ts";

export type ScenarioCharacterSdk = {
  readonly abilityScoreAssignment: typeof abilityScoreAssignment;
  readonly characterCreationIssueMessage: typeof characterCreationIssueMessage;
  readonly characterDraftId: typeof characterDraftId;
  readonly characterSheetConstructionIssuesSummary: typeof characterSheetConstructionIssuesSummary;
  readonly characterSheetId: typeof characterSheetId;
  readonly createCharacterDraft: typeof createCharacterDraft;
  readonly createFreshCharacterSheet: typeof createFreshCharacterSheet;
  readonly creationChoiceOptionId: typeof creationChoiceOptionId;
  readonly creationHoleId: typeof creationHoleId;
  readonly discoverCreationHoles: typeof discoverCreationHoles;
  readonly fillCreationHoles: typeof fillCreationHoles;
  readonly finalizeCharacterDraft: typeof finalizeCharacterDraft;
  readonly hp: typeof Hp;
  readonly isLeft: typeof Either.isLeft;
};

export type ScenarioCharacterContext = {
  readonly sdk: ScenarioCharacterSdk;
  readonly unitCatalog: UnitCatalog;
};

export type ScenarioCharacterOutcome =
  | {
      readonly kind: "ready";
      readonly characterSheets: readonly FreshCharacterSheet[];
      readonly observation: JsonValue;
    }
  | {
      readonly kind: "obstructed";
      readonly obstruction: string;
      readonly observation: JsonValue;
    };

export type ScenarioCharacters = (
  context: ScenarioCharacterContext,
) => ScenarioCharacterOutcome | Promise<ScenarioCharacterOutcome>;
