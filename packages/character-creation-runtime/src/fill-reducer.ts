import {
  STANDARD_LANGUAGES,
  alignmentFromOptionId,
  parseAlignmentOptionId,
  type CharacterStartingLanguages,
  type SelectableStandardLanguage,
} from "@dnd/shared/game-facts";
import { isValidAbilityScoreAssignment } from "@dnd/shared-algebras/ability-score-algebra";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";
import { discoverCreationHoles } from "./discovery.ts";
import { finalizeCharacterDraft } from "./finalization.ts";
import {
  parseBackgroundAbilityScoreIncreaseOptionId,
  selectedChoiceOption,
} from "./hole-factories.ts";
import {
  supportedProgressionForOptionId,
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
  type NonEmptyReadonlyArray,
  type UnitCatalog,
} from "./types.ts";

type ApplyCreationFillIssue = CreationFillIssue;
type ApplyCreationFillResult<T> = Either.Either<T, ApplyCreationFillIssue>;

function applyCreationFillIssue<T>(
  issue: ApplyCreationFillIssue,
): ApplyCreationFillResult<T> {
  return Either.left(issue);
}

export type CreationHoleIndex = {
  readonly holesById: ReadonlyMap<CreationHoleId, CreationHole>;
  readonly choiceOptionsByHoleId: ReadonlyMap<
    CreationHoleId,
    ReadonlyMap<CreationChoiceOptionId, CreationChoiceOption>
  >;
};

type DraftSourcedCreationHole = CreationHole & {
  readonly source: Extract<CreationHoleSource, { readonly tag: "draft" }>;
};

type UnitSourcedCreationHole = CreationHole & {
  readonly source: Extract<CreationHoleSource, { readonly tag: "unit" }>;
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
  if (Either.isLeft(nextDraft)) {
    return {
      tag: "rejected",
      draft: input.draft,
      holes,
      issues: nextDraft.left,
      finalization,
    };
  }
  const nextInput = { draft: nextDraft.right, unitLibrary: input.unitLibrary };

  return {
    tag: "accepted",
    draft: nextDraft.right,
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
): Either.Either<
  CharacterDraft,
  NonEmptyReadonlyArray<CreationBatchFillIssue>
> {
  let selections = draft.selections;
  for (const [fillIndexValue, fill] of fills.entries()) {
    const fillIndex = creationFillIndex(fillIndexValue);
    const hole = getHole(holeIndex, fill, fillIndex);
    if (Either.isLeft(hole)) return Either.left([hole.left]);
    const nextSelections = applyCreationFill(
      selections,
      hole.right,
      fill,
      fillIndex,
    );
    if (Either.isLeft(nextSelections))
      return Either.left([nextSelections.left]);
    selections = nextSelections.right;
  }

  return Either.right({
    ...draft,
    selections,
    revision: draftRevision(draft.revision + 1),
  });
}

export function getHole(
  holeIndex: CreationHoleIndex,
  fill: CreationFill,
  fillIndex: FillIndex,
): ApplyCreationFillResult<CreationHole> {
  const hole = holeIndex.holesById.get(fill.holeId);
  return hole == null
    ? Either.left(unknownHoleIssue(fill, fillIndex))
    : Either.right(hole);
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
  if (optionById == null) return new Map();

  return optionById;
}

export function applyCreationFill(
  selections: CharacterDraftSelections,
  hole: CreationHole,
  fill: CreationFill,
  fillIndex: FillIndex,
): ApplyCreationFillResult<CharacterDraftSelections> {
  const source = hole.source;
  if (source.tag === "draft") {
    return applyDraftFill(selections, { ...hole, source }, fill, fillIndex);
  }

  return applyUnitFill(selections, { ...hole, source }, fill, fillIndex);
}

export function applyDraftFill(
  selections: CharacterDraftSelections,
  hole: DraftSourcedCreationHole,
  fill: CreationFill,
  fillIndex: FillIndex,
): ApplyCreationFillResult<CharacterDraftSelections> {
  const path = hole.source.path;
  if (path === "draft.progression.initial" && fill.kind === "choice") {
    const optionId = oneOptionId(fill, fillIndex);
    if (Either.isLeft(optionId)) return applyCreationFillIssue(optionId.left);
    const progression = supportedProgressionForOptionId(optionId.right);
    if (progression == null) {
      return Either.left(
        unsupportedChoiceIssue(fill, fillIndex, optionId.right),
      );
    }

    return Either.right({
      ...selections,
      progression,
    });
  }

  if (path === "draft.background" && fill.kind === "choice") {
    const optionId = oneOptionId(fill, fillIndex);
    if (Either.isLeft(optionId)) return applyCreationFillIssue(optionId.left);
    const background = selectedUnitId(hole, fill, fillIndex, optionId.right);
    if (Either.isLeft(background))
      return applyCreationFillIssue(background.left);
    return Either.right({
      ...selections,
      background: background.right,
    });
  }

  if (path === "draft.species" && fill.kind === "choice") {
    const optionId = oneOptionId(fill, fillIndex);
    if (Either.isLeft(optionId)) return applyCreationFillIssue(optionId.left);
    const species = selectedUnitId(hole, fill, fillIndex, optionId.right);
    if (Either.isLeft(species)) return applyCreationFillIssue(species.left);
    return Either.right({
      ...selections,
      species: species.right,
    });
  }

  if (
    path === "draft.abilityScoreGeneration" &&
    fill.kind === "abilityScores"
  ) {
    return Either.right({
      ...selections,
      abilityScoreGeneration: {
        method: fill.method,
        assignedScores: fill.value,
      },
    });
  }

  if (path === "draft.languages" && fill.kind === "choice") {
    const languages = startingLanguages(fill, fillIndex);
    if (Either.isLeft(languages)) return applyCreationFillIssue(languages.left);
    return Either.right({
      ...selections,
      languages: languages.right,
    });
  }

  if (path === "draft.alignment" && fill.kind === "choice") {
    const optionId = oneOptionId(fill, fillIndex);
    if (Either.isLeft(optionId)) return applyCreationFillIssue(optionId.left);
    const alignment = alignmentSelection(fill, fillIndex, optionId.right);
    if (Either.isLeft(alignment)) return applyCreationFillIssue(alignment.left);
    return Either.right({
      ...selections,
      alignment: alignment.right,
    });
  }

  return Either.left(wrongFillKindIssue(fill, fillIndex, hole));
}

export function applyUnitFill(
  selections: CharacterDraftSelections,
  hole: UnitSourcedCreationHole,
  fill: CreationFill,
  fillIndex: FillIndex,
): ApplyCreationFillResult<CharacterDraftSelections> {
  const source = hole.source;
  if (
    source.choiceKey === BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY &&
    fill.kind === "choice"
  ) {
    const optionId = oneOptionId(fill, fillIndex);
    if (Either.isLeft(optionId)) return applyCreationFillIssue(optionId.left);
    const selection = backgroundAbilityScoreIncreaseSelection(
      fill,
      fillIndex,
      optionId.right,
    );
    if (Either.isLeft(selection)) return applyCreationFillIssue(selection.left);
    return Either.right({
      ...selections,
      backgroundAbilityScoreIncrease: selection.right,
    });
  }

  if (
    source.choiceKey === EQUIPMENT_PURCHASE_CHOICE_KEY &&
    fill.kind === "choice"
  ) {
    const unitIds = selectedUnitIds(hole, fill, fillIndex, fill.optionIds);
    if (Either.isLeft(unitIds)) return applyCreationFillIssue(unitIds.left);
    return Either.right({
      ...selections,
      equipment: {
        selectedUnitIds: unitIds.right,
      },
    });
  }

  if (fill.kind !== "choice") {
    return Either.left(wrongFillKindIssue(fill, fillIndex, hole));
  }

  if (fill.optionIds.length === 0) {
    return Either.left(tooFewChoicesIssue(fill, fillIndex, 1));
  }

  const options = [];
  for (const optionId of fill.optionIds) {
    const option = acceptedChoiceOption(hole, fill, fillIndex, optionId);
    if (Either.isLeft(option)) return applyCreationFillIssue(option.left);
    options.push(selectedChoiceOption(option.right));
  }

  return Either.right({
    ...selections,
    choices: [
      ...selections.choices,
      {
        source,
        options,
      },
    ],
  });
}

function oneOptionId(
  fill: ChoiceFill,
  fillIndex: FillIndex,
): ApplyCreationFillResult<CreationChoiceOptionId> {
  const optionId = fill.optionIds[0];
  return optionId == null || fill.optionIds.length !== 1
    ? Either.left(tooFewChoicesIssue(fill, fillIndex, 1))
    : Either.right(optionId);
}

function selectedUnitIds(
  hole: CreationHole,
  fill: ChoiceFill,
  fillIndex: FillIndex,
  optionIds: readonly CreationChoiceOptionId[],
): ApplyCreationFillResult<readonly UnitRecord["id"][]> {
  const unitIds = [];
  for (const optionId of optionIds) {
    const unitId = selectedUnitId(hole, fill, fillIndex, optionId);
    if (Either.isLeft(unitId)) return applyCreationFillIssue(unitId.left);
    unitIds.push(unitId.right);
  }
  return Either.right(unitIds);
}

function selectedUnitId(
  hole: CreationHole,
  fill: ChoiceFill,
  fillIndex: FillIndex,
  optionId: CreationChoiceOptionId,
): ApplyCreationFillResult<UnitRecord["id"]> {
  const option = acceptedChoiceOption(hole, fill, fillIndex, optionId);
  if (Either.isLeft(option)) return applyCreationFillIssue(option.left);
  return option.right.unitRef == null
    ? Either.left(invalidChoiceIssue(fill, fillIndex, optionId))
    : Either.right(option.right.unitRef.unitId);
}

function acceptedChoiceOption(
  hole: CreationHole,
  fill: ChoiceFill,
  fillIndex: FillIndex,
  optionId: CreationChoiceOptionId,
): ApplyCreationFillResult<CreationChoiceOption> {
  if (!("options" in hole)) {
    return Either.left(wrongFillKindIssue(fill, fillIndex, hole));
  }
  const option = hole.options.find(
    (candidate) => candidate.optionId === optionId,
  );
  return option == null
    ? Either.left(invalidChoiceIssue(fill, fillIndex, optionId))
    : Either.right(option);
}

function alignmentSelection(
  fill: ChoiceFill,
  fillIndex: FillIndex,
  optionId: CreationChoiceOptionId,
): ApplyCreationFillResult<CharacterAlignment> {
  const alignmentOption = parseAlignmentOptionId(optionId);
  const alignment =
    alignmentOption == null
      ? undefined
      : alignmentFromOptionId(alignmentOption);
  return alignment == null
    ? Either.left(invalidChoiceIssue(fill, fillIndex, optionId))
    : Either.right(alignment);
}

function startingLanguages(
  fill: ChoiceFill,
  fillIndex: FillIndex,
): ApplyCreationFillResult<CharacterStartingLanguages> {
  const first = fill.optionIds[0];
  const second = fill.optionIds[1];
  if (fill.optionIds.length < 2) {
    return Either.left(tooFewChoicesIssue(fill, fillIndex, 2));
  }
  if (fill.optionIds.length > 2) {
    return Either.left(tooManyChoicesIssue(fill, fillIndex, 2));
  }
  if (!isSelectableStandardLanguage(first)) {
    return Either.left(invalidChoiceIssue(fill, fillIndex, first));
  }
  if (!isSelectableStandardLanguage(second) || first === second) {
    return Either.left(invalidChoiceIssue(fill, fillIndex, second));
  }
  return Either.right(["Common", first, second] as CharacterStartingLanguages);
}

function backgroundAbilityScoreIncreaseSelection(
  fill: ChoiceFill,
  fillIndex: FillIndex,
  optionId: CreationChoiceOptionId,
): ApplyCreationFillResult<BackgroundAbilityScoreIncreaseSelection> {
  const selection = parseBackgroundAbilityScoreIncreaseOptionId(optionId);
  return selection == null
    ? Either.left(invalidChoiceIssue(fill, fillIndex, optionId))
    : Either.right(selection);
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
