import {
  STANDARD_LANGUAGES,
  alignmentFromOptionId,
  parseAlignmentOptionId,
  type CharacterStartingLanguages,
  type SelectableStandardLanguage,
} from "@dnd/shared/game-facts";
import { isValidAbilityScoreAssignment } from "@dnd/shared-algebras/ability-score-algebra";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { discoverCreationHoles } from "./discovery.ts";
import { finalizeCharacterDraft } from "./finalization.ts";
import {
  parseBackgroundAbilityScoreIncreaseOptionId,
  selectedChoiceOption,
} from "./hole-factories.ts";
import {
  supportedAdvancementForOptionId,
  unsupportedHoleSelectionOptionId,
} from "./support-gates.ts";
import {
  BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY,
  EQUIPMENT_PURCHASE_CHOICE_KEY,
} from "./phase1-manifest.ts";
import {
  creationFillIndex,
  draftRevision,
  nonEmptyReadonlyArray,
  type BackgroundAbilityScoreIncreaseSelection,
  type CharacterAlignment,
  type CharacterDraft,
  type CharacterDraftPath,
  type CharacterDraftSelections,
  choiceCardinalityBounds,
  type ChoiceCreationHole,
  type CreationBatchFillInput,
  type CreationBatchFillIssue,
  type CreationBatchFillResult,
  type CreationBatchIssue,
  type CreationChoiceOption,
  type CreationChoiceOptionId,
  type CreationFill,
  type CreationFillIssue,
  type CreationHole,
  type CreationHoleId,
  type CreationHoleSource,
  type FillIndex,
  type UnitCatalog,
} from "./types.ts";

export type CreationHoleIndex = {
  readonly holesById: ReadonlyMap<CreationHoleId, CreationHole>;
  readonly choiceOptionsByHoleId: ReadonlyMap<
    CreationHoleId,
    ReadonlyMap<CreationChoiceOptionId, CreationChoiceOption>
  >;
};

export function fillCreationHoles(
  input: CreationBatchFillInput & {
    readonly unitLibrary: UnitCatalog;
  },
): CreationBatchFillResult {
  const holes = discoverCreationHoles(input);
  const holeIndex = indexCreationHoles(holes);
  const issues = creationFillIssues(input, holeIndex);
  const finalization = finalizeCharacterDraft(input);
  const rejectedIssues = nonEmptyReadonlyArray(issues);

  if (rejectedIssues != null) {
    return {
      tag: "rejected",
      draft: input.draft,
      holes,
      issues: rejectedIssues,
      finalization,
    };
  }

  const nextDraft = applyCreationFills(input.draft, holeIndex, input.fills);
  const nextInput = { draft: nextDraft, unitLibrary: input.unitLibrary };

  return {
    tag: "accepted",
    draft: nextDraft,
    holes: discoverCreationHoles(nextInput),
    finalization: finalizeCharacterDraft(nextInput),
  };
}

export function creationFillIssues(
  input: CreationBatchFillInput,
  holeIndex: CreationHoleIndex,
): readonly CreationBatchFillIssue[] {
  const batchIssues =
    input.expectedRevision === input.draft.revision
      ? []
      : [staleRevisionIssue(input)];

  return [
    ...batchIssues,
    ...input.fills.flatMap((fill, fillIndexValue) => {
      const fillIndex = creationFillIndex(fillIndexValue);
      const matchingHole = holeIndex.holesById.get(fill.holeId);
      const isDuplicate = input.fills
        .slice(0, fillIndexValue)
        .some((priorFill) => priorFill.holeId === fill.holeId);

      if (isDuplicate) {
        return [duplicateFillIssue(fill, fillIndex)];
      }

      if (matchingHole == null) {
        return [unknownHoleIssue(fill, fillIndex)];
      }

      return fillIssuesForHole(fill, fillIndex, matchingHole, holeIndex);
    }),
  ];
}

export function fillIssuesForHole(
  fill: CreationFill,
  fillIndex: FillIndex,
  hole: CreationHole,
  holeIndex: CreationHoleIndex = indexCreationHoles([hole]),
): readonly CreationFillIssue[] {
  if (!fillKindMatchesHole(fill, hole)) {
    return [wrongFillKindIssue(fill, fillIndex, hole)];
  }

  if (hole.kind === "choice" && fill.kind === "choice") {
    return choiceFillIssues(
      fill,
      fillIndex,
      hole,
      requireChoiceOptionIndex(holeIndex, hole),
    );
  }

  if (hole.kind === "abilityScores" && fill.kind === "abilityScores") {
    return abilityScoreFillIssues(fill, fillIndex, hole);
  }

  return [];
}

export function fillKindMatchesHole(
  fill: CreationFill,
  hole: CreationHole,
): boolean {
  return (
    (hole.kind === "choice" && fill.kind === "choice") ||
    (hole.kind === "abilityScores" && fill.kind === "abilityScores")
  );
}

export function choiceFillIssues(
  fill: ChoiceFill,
  fillIndex: FillIndex,
  hole: ChoiceCreationHole,
  optionById: ReadonlyMap<CreationChoiceOptionId, CreationChoiceOption>,
): readonly CreationFillIssue[] {
  const optionIds = fill.optionIds;
  const bounds = choiceCardinalityBounds(hole.cardinality);
  const cardinalityIssues = [
    ...(optionIds.length < bounds.min
      ? [tooFewChoicesIssue(fill, fillIndex, bounds.min)]
      : []),
    ...(optionIds.length > bounds.max
      ? [tooManyChoicesIssue(fill, fillIndex, bounds.max)]
      : []),
  ];
  const invalidOptionIds = optionIds.filter(
    (optionId, optionIndex) =>
      optionIds.indexOf(optionId) !== optionIndex || !optionById.has(optionId),
  );

  if (invalidOptionIds.length > 0) {
    return [
      ...cardinalityIssues,
      ...invalidOptionIds.map((optionId) =>
        invalidChoiceIssue(fill, fillIndex, optionId),
      ),
    ];
  }

  const unsupportedOptionId = unsupportedHoleSelectionOptionId(hole, optionIds);
  return unsupportedOptionId == null
    ? cardinalityIssues
    : [
        ...cardinalityIssues,
        unsupportedChoiceIssue(fill, fillIndex, unsupportedOptionId),
      ];
}

type ChoiceFill = Extract<CreationFill, { readonly kind: "choice" }>;

export function abilityScoreFillIssues(
  fill: Extract<CreationFill, { readonly kind: "abilityScores" }>,
  fillIndex: FillIndex,
  hole: Extract<CreationHole, { readonly kind: "abilityScores" }>,
): readonly CreationFillIssue[] {
  return hole.methods.includes(fill.method) &&
    isValidAbilityScoreAssignment(fill.method, fill.value)
    ? []
    : [invalidAbilityScoresIssue(fill, fillIndex)];
}

export function applyCreationFills(
  draft: CharacterDraft,
  holeIndex: CreationHoleIndex,
  fills: readonly CreationFill[],
): CharacterDraft {
  const selections = fills.reduce(
    (selectionsSoFar, fill) =>
      applyCreationFill(
        selectionsSoFar,
        requireHole(holeIndex, fill.holeId),
        fill,
      ),
    draft.selections,
  );

  return {
    ...draft,
    selections,
    revision: draftRevision(draft.revision + 1),
  };
}

export function requireHole(
  holeIndex: CreationHoleIndex,
  holeId: CreationHoleId,
): CreationHole {
  const hole = holeIndex.holesById.get(holeId);
  if (hole == null) {
    throw new Error(`Accepted fill referenced missing creation hole ${holeId}`);
  }

  return hole;
}

export function indexCreationHoles(
  holes: readonly CreationHole[],
): CreationHoleIndex {
  const holesById = new Map<CreationHoleId, CreationHole>();
  const choiceOptionsByHoleId = new Map<
    CreationHoleId,
    ReadonlyMap<CreationChoiceOptionId, CreationChoiceOption>
  >();

  for (const hole of holes) {
    holesById.set(hole.holeId, hole);
    if (hole.kind === "choice") {
      choiceOptionsByHoleId.set(
        hole.holeId,
        new Map(hole.options.map((option) => [option.optionId, option])),
      );
    }
  }

  return { holesById, choiceOptionsByHoleId };
}

export function requireChoiceOptionIndex(
  holeIndex: CreationHoleIndex,
  hole: ChoiceCreationHole,
): ReadonlyMap<CreationChoiceOptionId, CreationChoiceOption> {
  const optionById = holeIndex.choiceOptionsByHoleId.get(hole.holeId);
  if (optionById == null) {
    throw new Error(`Indexed choice options missing for ${hole.holeId}.`);
  }

  return optionById;
}

export function applyCreationFill(
  selections: CharacterDraftSelections,
  hole: CreationHole,
  fill: CreationFill,
): CharacterDraftSelections {
  if (hole.source.tag === "draft") {
    return applyDraftFill(selections, hole, hole.source.path, fill);
  }

  return applyUnitFill(selections, hole, hole.source, fill);
}

export function applyDraftFill(
  selections: CharacterDraftSelections,
  hole: CreationHole,
  path: CharacterDraftPath,
  fill: CreationFill,
): CharacterDraftSelections {
  if (path === "draft.primaryClass" && fill.kind === "choice") {
    const classUnitId = requireSelectedUnitId(hole, requireOneOptionId(fill));
    return {
      ...selections,
      primaryClass: classUnitId,
    };
  }

  if (path === "draft.advancement.initial" && fill.kind === "choice") {
    const advancement = supportedAdvancementForOptionId(
      requireOneOptionId(fill),
    );
    if (advancement == null) {
      throw new Error(
        `Accepted fill ${fill.holeId} referenced unsupported advancement option.`,
      );
    }

    return {
      ...selections,
      advancement: {
        entries: [advancement],
      },
    };
  }

  if (path === "draft.background" && fill.kind === "choice") {
    return {
      ...selections,
      background: requireSelectedUnitId(hole, requireOneOptionId(fill)),
    };
  }

  if (path === "draft.species" && fill.kind === "choice") {
    return {
      ...selections,
      species: requireSelectedUnitId(hole, requireOneOptionId(fill)),
    };
  }

  if (
    path === "draft.abilityScoreGeneration" &&
    fill.kind === "abilityScores"
  ) {
    return {
      ...selections,
      abilityScoreGeneration: {
        method: fill.method,
        assignedScores: fill.value,
      },
    };
  }

  if (path === "draft.languages" && fill.kind === "choice") {
    return {
      ...selections,
      languages: requireStartingLanguages(fill.optionIds),
    };
  }

  if (path === "draft.alignment" && fill.kind === "choice") {
    return {
      ...selections,
      alignment: requireAlignmentSelection(requireOneOptionId(fill)),
    };
  }

  throw new Error(
    `Accepted fill ${fill.holeId} cannot be applied to draft path ${path}.`,
  );
}

export function applyUnitFill(
  selections: CharacterDraftSelections,
  hole: CreationHole,
  source: Extract<CreationHoleSource, { readonly tag: "unit" }>,
  fill: CreationFill,
): CharacterDraftSelections {
  if (
    source.choiceKey === BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY &&
    fill.kind === "choice"
  ) {
    return {
      ...selections,
      backgroundAbilityScoreIncrease:
        requireBackgroundAbilityScoreIncreaseSelection(
          requireOneOptionId(fill),
        ),
    };
  }

  if (
    source.choiceKey === EQUIPMENT_PURCHASE_CHOICE_KEY &&
    fill.kind === "choice"
  ) {
    return {
      ...selections,
      equipment: {
        selectedUnitIds: requireSelectedUnitIds(hole, fill.optionIds),
      },
    };
  }

  if (fill.kind !== "choice") {
    throw new Error(
      `Accepted fill ${fill.holeId} cannot be applied to unit choice ${source.choiceKey}.`,
    );
  }

  if (fill.optionIds.length === 0) {
    throw new Error(
      `Accepted unit choice fill ${fill.holeId} must carry at least one option.`,
    );
  }

  return {
    ...selections,
    choices: [
      ...selections.choices,
      {
        source,
        options: fill.optionIds.map((optionId) =>
          selectedChoiceOption(requireAcceptedChoiceOption(hole, optionId)),
        ),
      },
    ],
  };
}

export function requireSelectedUnitIds(
  hole: CreationHole,
  optionIds: readonly CreationChoiceOptionId[],
): readonly UnitRecord["id"][] {
  return optionIds.map((optionId) => requireSelectedUnitId(hole, optionId));
}

export function requireOneOptionId(fill: ChoiceFill): CreationChoiceOptionId {
  const optionIds = fill.optionIds;
  const optionId = optionIds[0];
  if (optionId == null || optionIds.length !== 1) {
    throw new Error(
      `Accepted choice fill ${fill.holeId} must carry exactly one option.`,
    );
  }

  return optionId;
}

export function requireSelectedUnitId(
  hole: CreationHole,
  optionId: CreationChoiceOptionId,
): UnitRecord["id"] {
  const option = requireAcceptedChoiceOption(hole, optionId);
  if (option.unitRef == null) {
    throw new Error(
      `Accepted fill option ${optionId} for ${hole.holeId} does not reference a Unit.`,
    );
  }

  return option.unitRef.unitId;
}

export function requireAcceptedChoiceOption(
  hole: CreationHole,
  optionId: CreationChoiceOptionId,
): CreationChoiceOption {
  if (!("options" in hole)) {
    throw new Error(`Accepted fill referenced non-choice hole ${hole.holeId}.`);
  }

  const option = hole.options.find(
    (candidate) => candidate.optionId === optionId,
  );
  if (option == null) {
    throw new Error(
      `Accepted fill referenced invalid choice ${optionId} for ${hole.holeId}.`,
    );
  }

  return option;
}

export function requireAlignmentSelection(
  optionId: CreationChoiceOptionId,
): CharacterAlignment {
  const alignmentOption = parseAlignmentOptionId(optionId);
  if (alignmentOption == null) {
    throw new Error(`Accepted fill referenced invalid alignment ${optionId}`);
  }

  return alignmentFromOptionId(alignmentOption);
}

export function requireStartingLanguages(
  optionIds: readonly CreationChoiceOptionId[],
): CharacterStartingLanguages {
  const first = optionIds[0];
  const second = optionIds[1];
  if (
    optionIds.length !== 2 ||
    !isSelectableStandardLanguage(first) ||
    !isSelectableStandardLanguage(second) ||
    first === second
  ) {
    throw new Error("Accepted fill referenced invalid starting languages.");
  }

  // SRD 5.2.1 Character-Creation.md:52 and :106-108: origin chooses two
  // languages, and every character knows Common plus those two Standard
  // Languages. This is the origin language choice, not the character's total
  // languages forever; classes and other features may add more.
  // TypeScript cannot infer this dependent tuple union from the local
  // selectable-and-distinct checks above; the values are plain strings at runtime.
  return ["Common", first, second] as CharacterStartingLanguages;
}

export function requireBackgroundAbilityScoreIncreaseSelection(
  optionId: CreationChoiceOptionId,
): BackgroundAbilityScoreIncreaseSelection {
  const selection = parseBackgroundAbilityScoreIncreaseOptionId(optionId);
  if (selection == null) {
    throw new Error(
      `Accepted fill referenced invalid background ability score increase ${optionId}`,
    );
  }

  return selection;
}

export function isSelectableStandardLanguage(
  value: CreationChoiceOptionId | undefined,
): value is CreationChoiceOptionId & SelectableStandardLanguage {
  return (
    value != null &&
    value !== "Common" &&
    STANDARD_LANGUAGES.some((language) => language === value)
  );
}

export function wrongFillKindIssue(
  fill: CreationFill,
  fillIndex: FillIndex,
  hole: CreationHole,
): CreationFillIssue {
  return {
    tag: "illegalFill",
    holeId: fill.holeId,
    fillIndex,
    code: "wrongFillKind",
    message: `Fill kind ${fill.kind} does not match character creation hole ${hole.holeId} of kind ${hole.kind}.`,
  };
}

export function invalidChoiceIssue(
  fill: CreationFill,
  fillIndex: FillIndex,
  optionId: CreationChoiceOptionId,
): CreationFillIssue {
  return {
    tag: "illegalFill",
    holeId: fill.holeId,
    fillIndex,
    code: "invalidChoice",
    message: `Invalid choice ${optionId} for character creation hole: ${fill.holeId}`,
  };
}

export function invalidAbilityScoresIssue(
  fill: Extract<CreationFill, { readonly kind: "abilityScores" }>,
  fillIndex: FillIndex,
): CreationFillIssue {
  return {
    tag: "illegalFill",
    holeId: fill.holeId,
    fillIndex,
    code: "invalidAbilityScores",
    message:
      "Invalid ability score assignment for the selected generation method.",
  };
}

export function tooFewChoicesIssue(
  fill: CreationFill,
  fillIndex: FillIndex,
  expectedCount: number,
): CreationFillIssue {
  return {
    tag: "illegalFill",
    holeId: fill.holeId,
    fillIndex,
    code: "tooFewChoices",
    message: `Too few choices for character creation hole ${fill.holeId}; expected at least ${expectedCount}.`,
  };
}

export function tooManyChoicesIssue(
  fill: CreationFill,
  fillIndex: FillIndex,
  expectedCount: number,
): CreationFillIssue {
  return {
    tag: "illegalFill",
    holeId: fill.holeId,
    fillIndex,
    code: "tooManyChoices",
    message: `Too many choices for character creation hole ${fill.holeId}; expected at most ${expectedCount}.`,
  };
}

export function unsupportedChoiceIssue(
  fill: CreationFill,
  fillIndex: FillIndex,
  optionId: CreationChoiceOptionId,
): CreationFillIssue {
  return {
    tag: "illegalFill",
    holeId: fill.holeId,
    fillIndex,
    code: "unsupportedChoice",
    message: `Unsupported choice ${optionId} for character creation hole: ${fill.holeId}`,
  };
}

export function staleRevisionIssue(
  input: CreationBatchFillInput,
): CreationBatchIssue {
  return {
    tag: "illegalBatch",
    code: "staleRevision",
    message: `Expected draft revision ${input.expectedRevision}, received ${input.draft.revision}.`,
  };
}

export function duplicateFillIssue(
  fill: CreationFill,
  fillIndex: FillIndex,
): CreationFillIssue {
  return {
    tag: "illegalFill",
    holeId: fill.holeId,
    fillIndex,
    code: "duplicateFill",
    message: `Duplicate fill for character creation hole: ${fill.holeId}`,
  };
}

export function unknownHoleIssue(
  fill: CreationFill,
  fillIndex: FillIndex,
): CreationFillIssue {
  return {
    tag: "illegalFill",
    holeId: fill.holeId,
    fillIndex,
    code: "unknownHole",
    message: `Unknown character creation hole: ${fill.holeId}`,
  };
}
