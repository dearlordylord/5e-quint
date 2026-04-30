import {
  STANDARD_LANGUAGES,
  alignmentFromOptionId,
  parseAlignmentOptionId,
  type CharacterStartingLanguages,
  type SelectableStandardLanguage,
} from "@dnd/shared/game-facts";
import { isValidAbilityScoreAssignment } from "@dnd/shared-algebras/ability-score-algebra";
import type { Ability, UnitRecord } from "@dnd/surface/surface/types";
import { discoverCreationHoles } from "./discovery.ts";
import { finalizeCharacterDraft } from "./finalization.ts";
import { selectedChoiceOption } from "./hole-factories.ts";
import { unsupportedHoleSelectionOptionId } from "./support-gates.ts";
import {
  BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY,
  EQUIPMENT_PURCHASE_CHOICE_KEY,
  SURFACE_ABILITIES,
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
  type ChoiceCount,
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
  type UnitLibrary,
} from "./types.ts";

export function fillCreationHoles(
  input: CreationBatchFillInput & {
    readonly unitLibrary: UnitLibrary;
  },
): CreationBatchFillResult {
  const holes = discoverCreationHoles(input);
  const issues = creationFillIssues(input, holes);
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

  const nextDraft = applyCreationFills(input.draft, holes, input.fills);
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
  holes: readonly CreationHole[],
): readonly CreationBatchFillIssue[] {
  const batchIssues =
    input.expectedRevision === input.draft.revision
      ? []
      : [staleRevisionIssue(input)];

  return [
    ...batchIssues,
    ...input.fills.flatMap((fill, fillIndexValue) => {
      const fillIndex = creationFillIndex(fillIndexValue);
      const matchingHole = holes.find((hole) => hole.holeId === fill.holeId);
      const isDuplicate = input.fills
        .slice(0, fillIndexValue)
        .some((priorFill) => priorFill.holeId === fill.holeId);

      if (isDuplicate) {
        return [duplicateFillIssue(fill, fillIndex)];
      }

      if (matchingHole == null) {
        return [unknownHoleIssue(fill, fillIndex)];
      }

      return fillIssuesForHole(fill, fillIndex, matchingHole);
    }),
  ];
}

export function fillIssuesForHole(
  fill: CreationFill,
  fillIndex: FillIndex,
  hole: CreationHole,
): readonly CreationFillIssue[] {
  if (!fillKindMatchesHole(fill, hole)) {
    return [wrongFillKindIssue(fill, fillIndex, hole)];
  }

  if (hole.kind === "choice" && fill.kind === "choice") {
    return choiceFillIssues(fill, fillIndex, hole);
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
  hole: Extract<CreationHole, { readonly kind: "choice" }>,
): readonly CreationFillIssue[] {
  const optionIds = fill.optionIds;
  const requiredCount = hole.cardinality.count;
  const cardinalityIssues = [
    ...(optionIds.length < requiredCount
      ? [tooFewChoicesIssue(fill, fillIndex, requiredCount)]
      : []),
    ...(optionIds.length > requiredCount
      ? [tooManyChoicesIssue(fill, fillIndex, requiredCount)]
      : []),
  ];
  const invalidOptionIds = optionIds.filter(
    (optionId, optionIndex) =>
      optionIds.indexOf(optionId) !== optionIndex ||
      !hole.options.some((option) => option.optionId === optionId),
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
  holes: readonly CreationHole[],
  fills: readonly CreationFill[],
): CharacterDraft {
  const selections = fills.reduce(
    (selectionsSoFar, fill) =>
      applyCreationFill(selectionsSoFar, requireHole(holes, fill.holeId), fill),
    draft.selections,
  );

  return {
    ...draft,
    selections,
    revision: draftRevision(draft.revision + 1),
  };
}

export function requireHole(
  holes: readonly CreationHole[],
  holeId: CreationHoleId,
): CreationHole {
  const hole = holes.find((candidate) => candidate.holeId === holeId);
  if (hole == null) {
    throw new Error(`Accepted fill referenced missing creation hole ${holeId}`);
  }

  return hole;
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
      advancement: {
        entries: [{ classUnitId, level: 1 }],
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
  if (optionId === "one_each") {
    return { kind: "oneEach" };
  }

  const parts = optionId.split(":");
  const plusTwo = parts[1];
  const plusOne = parts[2];
  if (
    parts[0] !== "two_and_one" ||
    !isAbility(plusTwo) ||
    !isAbility(plusOne) ||
    plusTwo === plusOne
  ) {
    throw new Error(
      `Accepted fill referenced invalid background ability score increase ${optionId}`,
    );
  }

  // TypeScript cannot infer this mapped union branch from the local
  // plusTwo/plusOne distinctness check above.
  return {
    kind: "twoAndOne",
    plusTwo,
    plusOne,
  } as BackgroundAbilityScoreIncreaseSelection;
}

export function isAbility(value: string | undefined): value is Ability {
  return (
    value != null && SURFACE_ABILITIES.some((ability) => ability === value)
  );
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
  expectedCount: ChoiceCount,
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
  expectedCount: ChoiceCount,
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
