// KERNEL-COVERAGE: runtime-owner CREATION.DRAFT.FILL_BATCH_SLICE_REPLAY CREATION.CHOICE_DISCOVERY_CARDINALITY CHARACTER.LIFECYCLE.LAYER_PROJECTION
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
  characterDraconicAncestrySelection,
  creationFillIndex,
  draftRevision,
  isCharacterSpeciesSizeSelection,
  nonEmptyReadonlyArray,
  type BackgroundAbilityScoreIncreaseSelection,
  type CharacterAlignment,
  type CharacterDraft,
  type CharacterDraftSelections,
  type CharacterDraconicAncestrySelection,
  type CharacterSpeciesSizeSelection,
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
  type DraftCreationHoleSource,
  type FillIndex,
  type LoadoutSource,
  type LoadoutSelectedChoiceOption,
  type NonEmptyReadonlyArray,
  type UnitCatalog,
  type UnitChoiceSource,
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

type AcceptedCreationFillEntry = {
  readonly fillIndex: FillIndex;
  readonly acceptedFill: AcceptedCreationFill;
};

type CreationFillAcceptance = {
  readonly issues: readonly CreationBatchFillIssue[];
  readonly acceptedFills: readonly AcceptedCreationFillEntry[];
};

type DraftSourcedCreationHole = CreationHole & {
  readonly source: DraftCreationHoleSource;
};

type DraftSourcedChoiceCreationHole = ChoiceCreationHole & {
  readonly source: DraftCreationHoleSource;
};

type DraftSourcedAbilityScoreCreationHole = Extract<
  CreationHole,
  { readonly kind: "abilityScores" }
> & {
  readonly source: DraftCreationHoleSource;
};

type UnitSourcedCreationHole = CreationHole & {
  readonly source: UnitChoiceSource;
};

type UnitSourcedChoiceCreationHole = ChoiceCreationHole & {
  readonly source: UnitChoiceSource;
};

type LoadoutSourcedCreationHole = CreationHole & {
  readonly source: LoadoutSource;
};

type LoadoutSourcedChoiceCreationHole = ChoiceCreationHole & {
  readonly source: LoadoutSource;
};

export function fillCreationHoles(
  input: CreationBatchFillInput & {
    readonly unitLibrary: UnitCatalog;
  },
): CreationBatchFillResult {
  const holes = discoverCreationHoles(input);
  const holeIndex = indexCreationHoles(holes);
  const fillAcceptance = acceptedCreationFills(input, holeIndex);
  const finalization = finalizeCharacterDraft(input);
  const rejectedIssues = nonEmptyReadonlyArray(fillAcceptance.issues);

  if (rejectedIssues != null) {
    return {
      tag: "rejected",
      draft: input.draft,
      holes,
      issues: rejectedIssues,
      finalization,
    };
  }

  const nextDraft = applyCreationFills(
    input.draft,
    fillAcceptance.acceptedFills,
  );
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
  return acceptedCreationFills(input, holeIndex).issues;
}

function acceptedCreationFills(
  input: CreationBatchFillInput,
  holeIndex: CreationHoleIndex,
): CreationFillAcceptance {
  const batchIssues =
    input.expectedRevision === input.draft.revision
      ? []
      : [staleRevisionIssue(input)];

  const acceptedFills: AcceptedCreationFillEntry[] = [];
  const fillIssues = input.fills.flatMap((fill, fillIndexValue) => {
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

    const issues = fillIssuesForHole(fill, fillIndex, matchingHole, holeIndex);
    const rejectedIssues = nonEmptyReadonlyArray(issues);
    if (rejectedIssues != null) return rejectedIssues;

    const acceptedFill = acceptedCreationFill(matchingHole, fill, fillIndex);
    if (Either.isLeft(acceptedFill)) return [acceptedFill.left];
    acceptedFills.push({ fillIndex, acceptedFill: acceptedFill.right });
    return [];
  });

  return { issues: [...batchIssues, ...fillIssues], acceptedFills };
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
type AbilityScoreFill = Extract<
  CreationFill,
  { readonly kind: "abilityScores" }
>;

type SingleChoiceFill = ChoiceFill & {
  readonly optionIds: readonly [CreationChoiceOptionId];
};

type AcceptedDraftFill =
  | {
      readonly tag: "initialProgression";
      readonly hole: DraftSourcedChoiceCreationHole;
      readonly fill: SingleChoiceFill;
      readonly progression: NonNullable<
        CharacterDraftSelections["progression"]
      >;
    }
  | {
      readonly tag: "background";
      readonly hole: DraftSourcedChoiceCreationHole;
      readonly fill: SingleChoiceFill;
      readonly background: UnitRecord["id"];
    }
  | {
      readonly tag: "species";
      readonly hole: DraftSourcedChoiceCreationHole;
      readonly fill: SingleChoiceFill;
      readonly species: UnitRecord["id"];
    }
  | {
      readonly tag: "speciesSize";
      readonly hole: DraftSourcedChoiceCreationHole;
      readonly fill: SingleChoiceFill;
      readonly size: CharacterSpeciesSizeSelection;
    }
  | {
      readonly tag: "draconicAncestry";
      readonly hole: DraftSourcedChoiceCreationHole;
      readonly fill: SingleChoiceFill;
      readonly ancestry: CharacterDraconicAncestrySelection;
    }
  | {
      readonly tag: "abilityScoreGeneration";
      readonly hole: DraftSourcedAbilityScoreCreationHole;
      readonly fill: AbilityScoreFill;
    }
  | {
      readonly tag: "languages";
      readonly hole: DraftSourcedChoiceCreationHole;
      readonly fill: ChoiceFill;
      readonly languages: CharacterStartingLanguages;
    }
  | {
      readonly tag: "alignment";
      readonly hole: DraftSourcedChoiceCreationHole;
      readonly fill: SingleChoiceFill;
      readonly alignment: CharacterAlignment;
    };

type AcceptedUnitFill =
  | {
      readonly tag: "backgroundAbilityScoreIncrease";
      readonly hole: UnitSourcedChoiceCreationHole;
      readonly fill: SingleChoiceFill;
      readonly selection: BackgroundAbilityScoreIncreaseSelection;
    }
  | {
      readonly tag: "equipmentPurchase";
      readonly hole: UnitSourcedChoiceCreationHole;
      readonly fill: ChoiceFill;
      readonly unitIds: readonly UnitRecord["id"][];
    }
  | {
      readonly tag: "unitChoice";
      readonly hole: UnitSourcedChoiceCreationHole;
      readonly fill: ChoiceFill;
      readonly options: readonly ReturnType<typeof selectedChoiceOption>[];
    };

type AcceptedLoadoutFill = {
  readonly hole: LoadoutSourcedChoiceCreationHole;
  readonly fill: SingleChoiceFill;
  readonly selectedOption: LoadoutSelectedChoiceOption;
};

type AcceptedCreationFill =
  | { readonly tag: "draft"; readonly acceptedFill: AcceptedDraftFill }
  | { readonly tag: "unitChoice"; readonly acceptedFill: AcceptedUnitFill }
  | { readonly tag: "loadout"; readonly acceptedFill: AcceptedLoadoutFill };

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
  acceptedFills: readonly AcceptedCreationFillEntry[],
): Either.Either<
  CharacterDraft,
  NonEmptyReadonlyArray<CreationBatchFillIssue>
> {
  let selections = draft.selections;
  for (const acceptedFill of acceptedFills) {
    const nextSelections = applyCreationFill(
      selections,
      acceptedFill.acceptedFill,
      acceptedFill.fillIndex,
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
  acceptedFill: AcceptedCreationFill,
  fillIndex: FillIndex,
): ApplyCreationFillResult<CharacterDraftSelections> {
  return acceptedFill.tag === "draft"
    ? applyDraftFill(selections, acceptedFill.acceptedFill)
    : acceptedFill.tag === "unitChoice"
      ? applyUnitFill(selections, acceptedFill.acceptedFill)
      : applyLoadoutFill(selections, acceptedFill.acceptedFill, fillIndex);
}

function isDraftSourcedCreationHole(
  hole: CreationHole,
): hole is DraftSourcedCreationHole {
  return hole.source.tag === "draft";
}

function isUnitSourcedCreationHole(
  hole: CreationHole,
): hole is UnitSourcedCreationHole {
  return hole.source.tag === "unitChoice";
}

function isLoadoutSourcedCreationHole(
  hole: CreationHole,
): hole is LoadoutSourcedCreationHole {
  return hole.source.tag === "loadout";
}

function acceptedCreationFill(
  hole: CreationHole,
  fill: CreationFill,
  fillIndex: FillIndex,
): ApplyCreationFillResult<AcceptedCreationFill> {
  if (isDraftSourcedCreationHole(hole)) {
    const acceptedFill = acceptedDraftFill(hole, fill, fillIndex);
    return Either.isLeft(acceptedFill)
      ? Either.left(acceptedFill.left)
      : Either.right({ tag: "draft", acceptedFill: acceptedFill.right });
  }

  if (isUnitSourcedCreationHole(hole)) {
    const acceptedFill = acceptedUnitFill(hole, fill, fillIndex);
    return Either.isLeft(acceptedFill)
      ? Either.left(acceptedFill.left)
      : Either.right({ tag: "unitChoice", acceptedFill: acceptedFill.right });
  }

  if (isLoadoutSourcedCreationHole(hole)) {
    const acceptedFill = acceptedLoadoutFill(hole, fill, fillIndex);
    return Either.isLeft(acceptedFill)
      ? Either.left(acceptedFill.left)
      : Either.right({ tag: "loadout", acceptedFill: acceptedFill.right });
  }

  return Either.left(wrongFillKindIssue(fill, fillIndex, hole));
}

function acceptedDraftFill(
  hole: DraftSourcedCreationHole,
  fill: CreationFill,
  fillIndex: FillIndex,
): ApplyCreationFillResult<AcceptedDraftFill> {
  const path = hole.source.path;
  if (path === "draft.abilityScoreGeneration") {
    if (hole.kind !== "abilityScores" || fill.kind !== "abilityScores") {
      return Either.left(wrongFillKindIssue(fill, fillIndex, hole));
    }

    return Either.right({
      tag: "abilityScoreGeneration",
      hole,
      fill,
    });
  }

  const choiceFill = acceptedDraftChoiceFillForHole(hole, fill, fillIndex);
  if (Either.isLeft(choiceFill)) return applyCreationFillIssue(choiceFill.left);

  if (path === "draft.progression.initial") {
    const singleFill = singleChoiceFill(choiceFill.right.fill, fillIndex);
    if (Either.isLeft(singleFill))
      return applyCreationFillIssue(singleFill.left);
    const optionId = singleFill.right.optionIds[0];
    const progression = supportedProgressionForOptionId(optionId);
    return progression == null
      ? Either.left(unsupportedChoiceIssue(fill, fillIndex, optionId))
      : Either.right({
          tag: "initialProgression",
          hole: choiceFill.right.hole,
          fill: singleFill.right,
          progression,
        });
  }

  if (path === "draft.background") {
    const unitId = selectedSingleUnitId(
      choiceFill.right.hole,
      choiceFill.right.fill,
      fillIndex,
    );
    return Either.isLeft(unitId)
      ? applyCreationFillIssue(unitId.left)
      : Either.right({
          tag: "background",
          hole: choiceFill.right.hole,
          fill: unitId.right.fill,
          background: unitId.right.unitId,
        });
  }

  if (path === "draft.species") {
    const unitId = selectedSingleUnitId(
      choiceFill.right.hole,
      choiceFill.right.fill,
      fillIndex,
    );
    return Either.isLeft(unitId)
      ? applyCreationFillIssue(unitId.left)
      : Either.right({
          tag: "species",
          hole: choiceFill.right.hole,
          fill: unitId.right.fill,
          species: unitId.right.unitId,
        });
  }

  if (path === "draft.speciesSize") {
    const singleFill = singleChoiceFill(choiceFill.right.fill, fillIndex);
    if (Either.isLeft(singleFill))
      return applyCreationFillIssue(singleFill.left);
    const size = speciesSizeSelection(
      singleFill.right,
      fillIndex,
      singleFill.right.optionIds[0],
    );
    return Either.isLeft(size)
      ? applyCreationFillIssue(size.left)
      : Either.right({
          tag: "speciesSize",
          hole: choiceFill.right.hole,
          fill: singleFill.right,
          size: size.right,
        });
  }

  if (path === "draft.draconicAncestry") {
    const singleFill = singleChoiceFill(choiceFill.right.fill, fillIndex);
    if (Either.isLeft(singleFill))
      return applyCreationFillIssue(singleFill.left);
    return Either.right({
      tag: "draconicAncestry",
      hole: choiceFill.right.hole,
      fill: singleFill.right,
      ancestry: characterDraconicAncestrySelection(
        singleFill.right.optionIds[0],
      ),
    });
  }

  if (path === "draft.languages") {
    const languages = startingLanguages(choiceFill.right.fill, fillIndex);
    return Either.isLeft(languages)
      ? applyCreationFillIssue(languages.left)
      : Either.right({
          tag: "languages",
          hole: choiceFill.right.hole,
          fill: choiceFill.right.fill,
          languages: languages.right,
        });
  }

  if (path === "draft.alignment") {
    const singleFill = singleChoiceFill(choiceFill.right.fill, fillIndex);
    if (Either.isLeft(singleFill))
      return applyCreationFillIssue(singleFill.left);
    const alignment = alignmentSelection(
      singleFill.right,
      fillIndex,
      singleFill.right.optionIds[0],
    );
    return Either.isLeft(alignment)
      ? applyCreationFillIssue(alignment.left)
      : Either.right({
          tag: "alignment",
          hole: choiceFill.right.hole,
          fill: singleFill.right,
          alignment: alignment.right,
        });
  }

  return Either.left(wrongFillKindIssue(fill, fillIndex, hole));
}

function acceptedUnitFill(
  hole: UnitSourcedCreationHole,
  fill: CreationFill,
  fillIndex: FillIndex,
): ApplyCreationFillResult<AcceptedUnitFill> {
  const choiceFill = acceptedUnitChoiceFillForHole(hole, fill, fillIndex);
  if (Either.isLeft(choiceFill)) return applyCreationFillIssue(choiceFill.left);

  if (hole.source.choiceKey === BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY) {
    const singleFill = singleChoiceFill(choiceFill.right.fill, fillIndex);
    if (Either.isLeft(singleFill))
      return applyCreationFillIssue(singleFill.left);
    const selection = backgroundAbilityScoreIncreaseSelection(
      singleFill.right,
      fillIndex,
      singleFill.right.optionIds[0],
    );
    return Either.isLeft(selection)
      ? applyCreationFillIssue(selection.left)
      : Either.right({
          tag: "backgroundAbilityScoreIncrease",
          hole: choiceFill.right.hole,
          fill: singleFill.right,
          selection: selection.right,
        });
  }

  if (hole.source.choiceKey === EQUIPMENT_PURCHASE_CHOICE_KEY) {
    const unitIds = selectedUnitIds(
      choiceFill.right.hole,
      choiceFill.right.fill,
      fillIndex,
      choiceFill.right.fill.optionIds,
    );
    return Either.isLeft(unitIds)
      ? applyCreationFillIssue(unitIds.left)
      : Either.right({
          tag: "equipmentPurchase",
          hole: choiceFill.right.hole,
          fill: choiceFill.right.fill,
          unitIds: unitIds.right,
        });
  }

  if (choiceFill.right.fill.optionIds.length === 0) {
    return Either.left(tooFewChoicesIssue(fill, fillIndex, 1));
  }

  const options = [];
  for (const optionId of choiceFill.right.fill.optionIds) {
    const option = acceptedChoiceOption(
      choiceFill.right.hole,
      choiceFill.right.fill,
      fillIndex,
      optionId,
    );
    if (Either.isLeft(option)) return applyCreationFillIssue(option.left);
    options.push(selectedChoiceOption(option.right));
  }

  return Either.right({
    tag: "unitChoice",
    hole: choiceFill.right.hole,
    fill: choiceFill.right.fill,
    options,
  });
}

function acceptedLoadoutFill(
  hole: LoadoutSourcedCreationHole,
  fill: CreationFill,
  fillIndex: FillIndex,
): ApplyCreationFillResult<AcceptedLoadoutFill> {
  const choiceFill = acceptedLoadoutChoiceFillForHole(hole, fill, fillIndex);
  if (Either.isLeft(choiceFill)) return applyCreationFillIssue(choiceFill.left);
  const singleFill = singleChoiceFill(choiceFill.right.fill, fillIndex);
  if (Either.isLeft(singleFill)) return applyCreationFillIssue(singleFill.left);
  const option = acceptedChoiceOption(
    choiceFill.right.hole,
    singleFill.right,
    fillIndex,
    singleFill.right.optionIds[0],
  );
  if (Either.isLeft(option)) return applyCreationFillIssue(option.left);
  const selectedOption = selectedLoadoutChoiceOption(
    choiceFill.right.hole.source,
    option.right,
    singleFill.right,
    fillIndex,
  );
  return Either.isLeft(selectedOption)
    ? applyCreationFillIssue(selectedOption.left)
    : Either.right({
        hole: choiceFill.right.hole,
        fill: singleFill.right,
        selectedOption: selectedOption.right,
      });
}

function acceptedDraftChoiceFillForHole(
  hole: DraftSourcedCreationHole,
  fill: CreationFill,
  fillIndex: FillIndex,
): ApplyCreationFillResult<{
  readonly hole: DraftSourcedChoiceCreationHole;
  readonly fill: ChoiceFill;
}> {
  return hole.kind === "choice" && fill.kind === "choice"
    ? Either.right({ hole, fill })
    : Either.left(wrongFillKindIssue(fill, fillIndex, hole));
}

function acceptedUnitChoiceFillForHole(
  hole: UnitSourcedCreationHole,
  fill: CreationFill,
  fillIndex: FillIndex,
): ApplyCreationFillResult<{
  readonly hole: UnitSourcedChoiceCreationHole;
  readonly fill: ChoiceFill;
}> {
  return hole.kind === "choice" && fill.kind === "choice"
    ? Either.right({ hole, fill })
    : Either.left(wrongFillKindIssue(fill, fillIndex, hole));
}

function acceptedLoadoutChoiceFillForHole(
  hole: LoadoutSourcedCreationHole,
  fill: CreationFill,
  fillIndex: FillIndex,
): ApplyCreationFillResult<{
  readonly hole: LoadoutSourcedChoiceCreationHole;
  readonly fill: ChoiceFill;
}> {
  return hole.kind === "choice" && fill.kind === "choice"
    ? Either.right({ hole, fill })
    : Either.left(wrongFillKindIssue(fill, fillIndex, hole));
}

function singleChoiceFill(
  fill: ChoiceFill,
  fillIndex: FillIndex,
): ApplyCreationFillResult<SingleChoiceFill> {
  const optionId = fill.optionIds[0];
  if (optionId == null) {
    return Either.left(tooFewChoicesIssue(fill, fillIndex, 1));
  }
  if (fill.optionIds.length > 1) {
    return Either.left(tooManyChoicesIssue(fill, fillIndex, 1));
  }

  return Either.right({ ...fill, optionIds: [optionId] });
}

export function applyDraftFill(
  selections: CharacterDraftSelections,
  acceptedFill: AcceptedDraftFill,
): ApplyCreationFillResult<CharacterDraftSelections> {
  if (acceptedFill.tag === "initialProgression") {
    return Either.right({
      ...selections,
      progression: acceptedFill.progression,
    });
  }

  if (acceptedFill.tag === "background") {
    return Either.right({
      ...selections,
      background: acceptedFill.background,
    });
  }

  if (acceptedFill.tag === "species") {
    return Either.right({
      ...selections,
      species: acceptedFill.species,
    });
  }

  if (acceptedFill.tag === "speciesSize") {
    return Either.right({
      ...selections,
      speciesSize: acceptedFill.size,
    });
  }

  if (acceptedFill.tag === "draconicAncestry") {
    return Either.right({
      ...selections,
      draconicAncestry: acceptedFill.ancestry,
    });
  }

  if (acceptedFill.tag === "abilityScoreGeneration") {
    return Either.right({
      ...selections,
      abilityScoreGeneration: {
        method: acceptedFill.fill.method,
        assignedScores: acceptedFill.fill.value,
      },
    });
  }

  if (acceptedFill.tag === "languages") {
    return Either.right({
      ...selections,
      languages: acceptedFill.languages,
    });
  }

  if (acceptedFill.tag === "alignment") {
    return Either.right({
      ...selections,
      alignment: acceptedFill.alignment,
    });
  }

  const exhaustive: never = acceptedFill;
  return exhaustive;
}

export function applyUnitFill(
  selections: CharacterDraftSelections,
  acceptedFill: AcceptedUnitFill,
): ApplyCreationFillResult<CharacterDraftSelections> {
  if (acceptedFill.tag === "backgroundAbilityScoreIncrease") {
    return Either.right({
      ...selections,
      backgroundAbilityScoreIncrease: acceptedFill.selection,
    });
  }

  if (acceptedFill.tag === "equipmentPurchase") {
    return Either.right({
      ...selections,
      equipment: {
        selectedUnitIds: acceptedFill.unitIds,
      },
    });
  }

  return Either.right({
    ...selections,
    choices: [
      ...selections.choices,
      {
        kind: "unitChoice",
        source: acceptedFill.hole.source,
        options: acceptedFill.options,
      },
    ],
  });
}

export function applyLoadoutFill(
  selections: CharacterDraftSelections,
  acceptedFill: AcceptedLoadoutFill,
  fillIndex: FillIndex,
): ApplyCreationFillResult<CharacterDraftSelections> {
  if (
    selections.choices.some(
      (selection) =>
        selection.kind === "loadout" &&
        selection.source.slot === acceptedFill.hole.source.slot,
    )
  ) {
    return Either.left(duplicateFillIssue(acceptedFill.fill, fillIndex));
  }

  return Either.right({
    ...selections,
    choices: [
      ...selections.choices,
      {
        kind: "loadout",
        source: acceptedFill.hole.source,
        options: [acceptedFill.selectedOption],
      },
    ],
  });
}

function selectedLoadoutChoiceOption(
  source: LoadoutSource,
  option: CreationChoiceOption,
  fill: ChoiceFill,
  fillIndex: FillIndex,
): ApplyCreationFillResult<LoadoutSelectedChoiceOption> {
  return option.unitRef?.unitId !== source.equipmentUnitId
    ? Either.left(invalidChoiceIssue(fill, fillIndex, option.optionId))
    : Either.right({
        optionId: option.optionId,
      });
}

function selectedUnitIds(
  hole: ChoiceCreationHole,
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

function selectedSingleUnitId(
  hole: ChoiceCreationHole,
  fill: ChoiceFill,
  fillIndex: FillIndex,
): ApplyCreationFillResult<{
  readonly fill: SingleChoiceFill;
  readonly unitId: UnitRecord["id"];
}> {
  const singleFill = singleChoiceFill(fill, fillIndex);
  if (Either.isLeft(singleFill)) return applyCreationFillIssue(singleFill.left);
  const unitId = selectedUnitId(
    hole,
    singleFill.right,
    fillIndex,
    singleFill.right.optionIds[0],
  );
  return Either.isLeft(unitId)
    ? applyCreationFillIssue(unitId.left)
    : Either.right({ fill: singleFill.right, unitId: unitId.right });
}

function selectedUnitId(
  hole: ChoiceCreationHole,
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
  hole: ChoiceCreationHole,
  fill: ChoiceFill,
  fillIndex: FillIndex,
  optionId: CreationChoiceOptionId,
): ApplyCreationFillResult<CreationChoiceOption> {
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

function speciesSizeSelection(
  fill: ChoiceFill,
  fillIndex: FillIndex,
  optionId: CreationChoiceOptionId,
): ApplyCreationFillResult<CharacterSpeciesSizeSelection> {
  if (isCharacterSpeciesSizeSelection(optionId)) {
    return Either.right(optionId);
  }

  return Either.left(invalidChoiceIssue(fill, fillIndex, optionId));
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
