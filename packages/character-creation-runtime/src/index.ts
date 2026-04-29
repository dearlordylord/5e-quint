import { Brand } from "effect";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import type {
  Ability,
  SixAbilityScores,
  UnitRecord,
} from "@dnd/surface/surface/types";

export type UnitLibrary = UnitCatalog;

export type CreationSessionId = string & Brand.Brand<"CreationSessionId">;
const CreationSessionId = Brand.nominal<CreationSessionId>();
export const creationSessionId: (value: string) => CreationSessionId =
  CreationSessionId;

export type CharacterDraftId = string & Brand.Brand<"CharacterDraftId">;
const CharacterDraftId = Brand.nominal<CharacterDraftId>();
export const characterDraftId: (value: string) => CharacterDraftId =
  CharacterDraftId;

export const ABILITY_SCORE_METHODS = [
  "standardArray",
  "randomGeneration",
  "pointCost",
] as const;
export type AbilityScoreMethod = (typeof ABILITY_SCORE_METHODS)[number];

export const STANDARD_LANGUAGES = [
  "Common",
  "Common Sign Language",
  "Draconic",
  "Dwarvish",
  "Elvish",
  "Giant",
  "Gnomish",
  "Goblin",
  "Halfling",
  "Orc",
] as const;
export type StandardLanguage = (typeof STANDARD_LANGUAGES)[number];
export type SelectableStandardLanguage = Exclude<StandardLanguage, "Common">;
export type CharacterStartingLanguages = {
  readonly [First in SelectableStandardLanguage]: readonly [
    "Common",
    First,
    Exclude<SelectableStandardLanguage, First>,
  ];
}[SelectableStandardLanguage];

export const ALIGNMENT_MORALITIES = ["good", "neutral", "evil"] as const;
export type AlignmentMorality = (typeof ALIGNMENT_MORALITIES)[number];

export const ALIGNMENT_ORDERS = ["lawful", "neutral", "chaotic"] as const;
export type AlignmentOrder = (typeof ALIGNMENT_ORDERS)[number];

export type CharacterAlignment = {
  readonly morality: AlignmentMorality;
  readonly order: AlignmentOrder;
};

export const CHARACTER_DRAFT_PATHS = [
  "draft.primaryClass",
  "draft.advancement.initial",
  "draft.background",
  "draft.abilityScoreGeneration",
  "draft.backgroundAbilityScoreIncrease",
  "draft.species",
  "draft.languages",
  "draft.alignment",
  "draft.choices",
  "draft.equipment",
] as const;
export type CharacterDraftPath = (typeof CHARACTER_DRAFT_PATHS)[number];

export type UnitChoiceKey = string & Brand.Brand<"UnitChoiceKey">;
const UnitChoiceKey = Brand.nominal<UnitChoiceKey>();
export const unitChoiceKey: (value: string) => UnitChoiceKey = UnitChoiceKey;

export type CreationChoiceOptionId = string &
  Brand.Brand<"CreationChoiceOptionId">;
const CreationChoiceOptionId = Brand.nominal<CreationChoiceOptionId>();
export const creationChoiceOptionId: (value: string) => CreationChoiceOptionId =
  CreationChoiceOptionId;

export type CreationHoleSource =
  | { readonly tag: "draft"; readonly path: CharacterDraftPath }
  | {
      readonly tag: "unit";
      readonly unitId: UnitRecord["id"];
      readonly choiceKey: UnitChoiceKey;
    };

export type CreationHoleIdText =
  | `cc:draft:${CharacterDraftPath}`
  | `cc:unit:${UnitRecord["id"]}:${UnitChoiceKey}`;

export type CreationHoleId = CreationHoleIdText & Brand.Brand<"CreationHoleId">;
const CreationHoleId = Brand.nominal<CreationHoleId>();
export const creationHoleId: (value: CreationHoleIdText) => CreationHoleId =
  CreationHoleId;

export type UnitRef = {
  readonly unitId: UnitRecord["id"];
};

export type AbilityScoreAssignment = SixAbilityScores;

export type AbilityScoreGenerationSelection = {
  readonly method: AbilityScoreMethod;
  readonly assignedScores: AbilityScoreAssignment;
};

export type TwoAndOneBackgroundAbilityScoreIncreaseSelection = {
  readonly [PlusTwo in Ability]: {
    readonly kind: "twoAndOne";
    readonly plusTwo: PlusTwo;
    readonly plusOne: Exclude<Ability, PlusTwo>;
  };
}[Ability];

export type BackgroundAbilityScoreIncreaseSelection =
  | TwoAndOneBackgroundAbilityScoreIncreaseSelection
  | {
      readonly kind: "oneEach";
    };

export const CHARACTER_CLASS_LEVELS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
] as const;
export type CharacterClassLevel = (typeof CHARACTER_CLASS_LEVELS)[number];

export type CharacterAdvancementSelection = {
  readonly entries: readonly CharacterAdvancementEntry[];
};

export type CharacterAdvancementEntry = {
  readonly classUnitId: UnitRecord["id"];
  readonly level: CharacterClassLevel;
};

export type CharacterChoiceSelection = {
  readonly source: CreationHoleSource;
  readonly optionIds: readonly CreationChoiceOptionId[];
};

export type CharacterEquipmentSelection = {
  readonly selectedUnitIds: readonly UnitRecord["id"][];
};

export type CharacterDraftSelections = {
  readonly primaryClass?: UnitRecord["id"];
  readonly advancement?: CharacterAdvancementSelection;
  readonly background?: UnitRecord["id"];
  readonly abilityScoreGeneration?: AbilityScoreGenerationSelection;
  readonly backgroundAbilityScoreIncrease?: BackgroundAbilityScoreIncreaseSelection;
  readonly species?: UnitRecord["id"];
  readonly languages?: CharacterStartingLanguages;
  readonly alignment?: CharacterAlignment;
  readonly choices: readonly CharacterChoiceSelection[];
  readonly equipment?: CharacterEquipmentSelection;
};

export type CharacterDraft = {
  readonly draftId: CharacterDraftId;
  readonly selections: CharacterDraftSelections;
  readonly revision: number;
};

export type CreationSession = {
  readonly sessionId: CreationSessionId;
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitLibrary;
};

export type CreationChoiceOption = {
  readonly optionId: CreationChoiceOptionId;
  readonly label: string;
  readonly unitRef?: UnitRef;
};

export type CreationHole =
  | {
      readonly kind: "singleChoice";
      readonly holeId: CreationHoleId;
      readonly source: CreationHoleSource;
      readonly options: readonly CreationChoiceOption[];
    }
  | {
      readonly kind: "multiChoice";
      readonly holeId: CreationHoleId;
      readonly source: CreationHoleSource;
      readonly min: number;
      readonly max: number;
      readonly options: readonly CreationChoiceOption[];
    }
  | {
      readonly kind: "abilityScores";
      readonly holeId: CreationHoleId;
      readonly source: CreationHoleSource;
      readonly methods: readonly AbilityScoreMethod[];
    }
  | {
      readonly kind: "freeText";
      readonly holeId: CreationHoleId;
      readonly source: CreationHoleSource;
    };

export type CreationFill =
  | {
      readonly kind: "choice";
      readonly holeId: CreationHoleId;
      readonly optionId: CreationChoiceOptionId;
    }
  | {
      readonly kind: "multiChoice";
      readonly holeId: CreationHoleId;
      readonly optionIds: readonly CreationChoiceOptionId[];
    }
  | {
      readonly kind: "abilityScores";
      readonly holeId: CreationHoleId;
      readonly value: AbilityScoreAssignment;
    }
  | {
      readonly kind: "text";
      readonly holeId: CreationHoleId;
      readonly value: string;
    };

export const CREATION_FILL_ISSUE_CODES = [
  "unknownHole",
  "duplicateFill",
  "wrongFillKind",
  "invalidChoice",
  "tooFewChoices",
  "tooManyChoices",
  "unsupportedChoice",
] as const;
export type CreationFillIssueCode = (typeof CREATION_FILL_ISSUE_CODES)[number];

export type CreationFillIssue = {
  readonly tag: "illegalFill";
  readonly holeId: CreationHoleId;
  readonly fillIndex: number;
  readonly code: CreationFillIssueCode;
  readonly message: string;
};

export const CREATION_BATCH_ISSUE_CODES = ["staleRevision"] as const;
export type CreationBatchIssueCode =
  (typeof CREATION_BATCH_ISSUE_CODES)[number];

export type CreationBatchIssue = {
  readonly tag: "illegalBatch";
  readonly code: CreationBatchIssueCode;
  readonly message: string;
};

export type CreationIssue = CreationFillIssue | CreationBatchIssue;

export type CreationBatchFillInput = {
  readonly draft: CharacterDraft;
  readonly fills: readonly CreationFill[];
  readonly expectedRevision: number;
};

export type CreationBatchFillResult =
  | {
      readonly tag: "accepted";
      readonly draft: CharacterDraft;
      readonly holes: readonly CreationHole[];
      readonly finalization: CreationFinalizationResult;
    }
  | {
      readonly tag: "rejected";
      readonly draft: CharacterDraft;
      readonly holes: readonly CreationHole[];
      readonly issues: readonly CreationIssue[];
      readonly finalization: CreationFinalizationResult;
    };

export type FinalizedCharacterSelections = {
  readonly primaryClass: UnitRecord["id"];
  readonly advancement: CharacterAdvancementSelection;
  readonly background: UnitRecord["id"];
  readonly abilityScoreGeneration: AbilityScoreGenerationSelection;
  readonly backgroundAbilityScoreIncrease: BackgroundAbilityScoreIncreaseSelection;
  readonly species: UnitRecord["id"];
  readonly languages: CharacterStartingLanguages;
  readonly alignment: CharacterAlignment;
  readonly choices: readonly CharacterChoiceSelection[];
  readonly equipment: CharacterEquipmentSelection;
};

export type CharacterSheet = {
  readonly sourceDraftId: CharacterDraftId;
  readonly selections: FinalizedCharacterSelections;
  readonly unitRefs: readonly UnitRef[];
};

export type CreationFinalizationResult =
  | { readonly tag: "ready"; readonly sheet: CharacterSheet }
  | { readonly tag: "incomplete"; readonly holes: readonly CreationHole[] }
  | {
      readonly tag: "invalid";
      readonly issues: readonly CreationIssue[];
      readonly holes: readonly CreationHole[];
    };

let nextDraftOrdinal = 0;

export function createCharacterDraft(input: {
  readonly unitLibrary: UnitLibrary;
  readonly draftId?: CharacterDraftId;
}): CharacterDraft {
  void input.unitLibrary;

  return {
    draftId:
      input.draftId ?? characterDraftId(`cc:draft:${nextDraftOrdinal++}`),
    selections: {
      choices: [],
    },
    revision: 0,
  };
}

export function discoverCreationHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitLibrary;
}): readonly CreationHole[] {
  void input;

  return [];
}

export function fillCreationHoles(
  input: CreationBatchFillInput & {
    readonly unitLibrary: UnitLibrary;
  },
): CreationBatchFillResult {
  const holes = discoverCreationHoles(input);
  const issues = creationFillIssues(input, holes);
  const finalization = finalizeCharacterDraft(input);

  if (issues.length > 0) {
    return {
      tag: "rejected",
      draft: input.draft,
      holes,
      issues,
      finalization,
    };
  }

  return {
    tag: "accepted",
    draft: input.draft,
    holes,
    finalization,
  };
}

export function finalizeCharacterDraft(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitLibrary;
}): CreationFinalizationResult {
  return {
    tag: "incomplete",
    holes: discoverCreationHoles(input),
  };
}

function creationFillIssues(
  input: CreationBatchFillInput,
  holes: readonly CreationHole[],
): readonly CreationIssue[] {
  if (input.expectedRevision !== input.draft.revision) {
    return [staleRevisionIssue(input)];
  }

  return input.fills.flatMap((fill, fillIndex) => {
    const matchingHole = holes.find((hole) => hole.holeId === fill.holeId);
    const isDuplicate = input.fills
      .slice(0, fillIndex)
      .some((priorFill) => priorFill.holeId === fill.holeId);

    if (isDuplicate) {
      return [duplicateFillIssue(fill, fillIndex)];
    }

    if (matchingHole == null) {
      return [unknownHoleIssue(fill, fillIndex)];
    }

    return [unsupportedFillIssue(fill, fillIndex)];
  });
}

function staleRevisionIssue(input: CreationBatchFillInput): CreationBatchIssue {
  return {
    tag: "illegalBatch",
    code: "staleRevision",
    message: `Expected draft revision ${input.expectedRevision}, received ${input.draft.revision}.`,
  };
}

function duplicateFillIssue(
  fill: CreationFill,
  fillIndex: number,
): CreationFillIssue {
  return {
    tag: "illegalFill",
    holeId: fill.holeId,
    fillIndex,
    code: "duplicateFill",
    message: `Duplicate fill for character creation hole: ${fill.holeId}`,
  };
}

function unknownHoleIssue(
  fill: CreationFill,
  fillIndex: number,
): CreationFillIssue {
  return {
    tag: "illegalFill",
    holeId: fill.holeId,
    fillIndex,
    code: "unknownHole",
    message: `Unknown character creation hole: ${fill.holeId}`,
  };
}

function unsupportedFillIssue(
  fill: CreationFill,
  fillIndex: number,
): CreationFillIssue {
  return {
    tag: "illegalFill",
    holeId: fill.holeId,
    fillIndex,
    code: "unsupportedChoice",
    message: `Filling character creation hole is not implemented yet: ${fill.holeId}`,
  };
}
