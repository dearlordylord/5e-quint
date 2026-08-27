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
import { Result } from "effect";
import { discoverCreationHoles } from "./discovery.ts";
import { finalizeCharacterDraft } from "./finalization.ts";
import {
  parseBackgroundAbilityScoreIncreaseOptionId,
  selectedChoiceOption,
} from "./hole-factories.ts";
import {
  CHARACTER_CREATION_SUPPORT_PROFILE,
  supportedProgressionForOptionId,
  unsupportedHoleSelectionOptionId,
  type CharacterCreationSupportProfile,
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
type ApplyCreationFillResult<T> = Result.Result<T, ApplyCreationFillIssue>;

function applyCreationFillIssue<T>(
  issue: ApplyCreationFillIssue,
): ApplyCreationFillResult<T> {
  return Result.fail(issue);
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

type AcceptedCreationBatchFillResult = Extract<
  CreationBatchFillResult,
  { readonly tag: "accepted" }
>;

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
    readonly supportProfile?: CharacterCreationSupportProfile;
  },
): CreationBatchFillResult {
  const fillInput = {
    ...input,
    supportProfile: input.supportProfile ?? CHARACTER_CREATION_SUPPORT_PROFILE,
  };
  const holes = discoverCreationHoles(fillInput);
  const holeIndex = indexCreationHoles(holes);
  const fillAcceptance = acceptedCreationFills(fillInput, holeIndex);
  const finalization = finalizeCharacterDraft(fillInput);
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
  /* v8 ignore start -- @preserve -- acceptedCreationFills checked every fill against these same holes, so applying that narrowed batch cannot reject. */
  if (Result.isFailure(nextDraft)) {
    return {
      tag: "rejected",
      draft: input.draft,
      holes,
      issues: nextDraft.failure,
      finalization,
    };
  }
  /* v8 ignore stop -- @preserve */

  return acceptedCreationBatchFillResult(fillInput, nextDraft.success);
}

function acceptedCreationBatchFillResult(
  input: CreationBatchFillInput & {
    readonly unitLibrary: UnitCatalog;
    readonly supportProfile: CharacterCreationSupportProfile;
  },
  draft: CharacterDraft,
): AcceptedCreationBatchFillResult {
  const nextInput = {
    draft,
    unitLibrary: input.unitLibrary,
    supportProfile: input.supportProfile,
  };

  return {
    tag: "accepted",
    draft,
    holes: discoverCreationHoles(nextInput),
    finalization: finalizeCharacterDraft(nextInput),
  };
}

export function creationFillIssues(
  input: CreationBatchFillInput,
  holeIndex: CreationHoleIndex,
): readonly CreationBatchFillIssue[] {
  return acceptedCreationFills(
    {
      ...input,
      supportProfile: CHARACTER_CREATION_SUPPORT_PROFILE,
    },
    holeIndex,
  ).issues;
}

function acceptedCreationFills(
  input: CreationBatchFillInput & {
    readonly supportProfile: CharacterCreationSupportProfile;
  },
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

    const issues = fillIssuesForHole(
      fill,
      fillIndex,
      matchingHole,
      holeIndex,
      input.supportProfile,
    );
    const rejectedIssues = nonEmptyReadonlyArray(issues);
    if (rejectedIssues != null) return rejectedIssues;

    const acceptedFill = acceptedCreationFill(
      matchingHole,
      fill,
      fillIndex,
      input.supportProfile,
    );
    if (Result.isFailure(acceptedFill)) return [acceptedFill.failure];
    acceptedFills.push({ fillIndex, acceptedFill: acceptedFill.success });
    return [];
  });

  return { issues: [...batchIssues, ...fillIssues], acceptedFills };
}

export function fillIssuesForHole(
  fill: CreationFill,
  fillIndex: FillIndex,
  hole: CreationHole,
  holeIndex: CreationHoleIndex = indexCreationHoles([hole]),
  supportProfile: CharacterCreationSupportProfile = CHARACTER_CREATION_SUPPORT_PROFILE,
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
      supportProfile,
    );
  }

  if (hole.kind === "abilityScores" && fill.kind === "abilityScores") {
    return abilityScoreFillIssues(fill, fillIndex, hole);
    /* v8 ignore start -- @preserve -- fillKindMatchesHole and the two exhaustive kind pairs above leave no other typed matching pair. */
  }
  return [];
}
/* v8 ignore stop -- @preserve */

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
  supportProfile: CharacterCreationSupportProfile = CHARACTER_CREATION_SUPPORT_PROFILE,
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

  const unsupportedOptionId = unsupportedHoleSelectionOptionId(
    hole,
    optionIds,
    supportProfile,
  );
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
): Result.Result<
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
    if (Result.isFailure(nextSelections))
      return Result.fail([nextSelections.failure]);
    selections = nextSelections.success;
  }

  return Result.succeed({
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
    ? Result.fail(unknownHoleIssue(fill, fillIndex))
    : Result.succeed(hole);
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
  supportProfile: CharacterCreationSupportProfile,
): ApplyCreationFillResult<AcceptedCreationFill> {
  if (isDraftSourcedCreationHole(hole)) {
    const acceptedFill = acceptedDraftFill(
      hole,
      fill,
      fillIndex,
      supportProfile,
    );
    return Result.isFailure(acceptedFill)
      ? Result.fail(acceptedFill.failure)
      : Result.succeed({ tag: "draft", acceptedFill: acceptedFill.success });
  }

  if (isUnitSourcedCreationHole(hole)) {
    const acceptedFill = acceptedUnitFill(hole, fill, fillIndex);
    /* v8 ignore start -- @preserve -- Validation already admitted this fill against this exact Unit-sourced hole. */
    return Result.isFailure(acceptedFill)
      ? Result.fail(acceptedFill.failure)
      : Result.succeed({ tag: "unitChoice", acceptedFill: acceptedFill.success });
    /* v8 ignore stop -- @preserve */
  }

  if (isLoadoutSourcedCreationHole(hole)) {
    const acceptedFill = acceptedLoadoutFill(hole, fill, fillIndex);
    /* v8 ignore start -- @preserve -- Validation already admitted this fill against this exact loadout-sourced hole. */
    return Result.isFailure(acceptedFill)
      ? Result.fail(acceptedFill.failure)
      : Result.succeed({ tag: "loadout", acceptedFill: acceptedFill.success });
  }
  /* v8 ignore stop -- @preserve */

  /* v8 ignore start -- @preserve -- Creation-hole source is exhaustive across draft, Unit, and loadout variants. */
  return Result.fail(wrongFillKindIssue(fill, fillIndex, hole));
}
/* v8 ignore stop -- @preserve */

function acceptedDraftFill(
  hole: DraftSourcedCreationHole,
  fill: CreationFill,
  fillIndex: FillIndex,
  supportProfile: CharacterCreationSupportProfile,
): ApplyCreationFillResult<AcceptedDraftFill> {
  const path = hole.source.path;
  if (path === "draft.abilityScoreGeneration") {
    /* v8 ignore start -- @preserve -- Validation already matched the ability-score fill to this ability-score hole. */
    if (hole.kind !== "abilityScores" || fill.kind !== "abilityScores") {
      return Result.fail(wrongFillKindIssue(fill, fillIndex, hole));
    }
    /* v8 ignore stop -- @preserve */

    return Result.succeed({
      tag: "abilityScoreGeneration",
      hole,
      fill,
    });
  }

  const choiceFill = acceptedDraftChoiceFillForHole(hole, fill, fillIndex);
  /* v8 ignore next -- @preserve -- Validation already narrowed this to a matching draft choice fill. */
  if (Result.isFailure(choiceFill)) return applyCreationFillIssue(choiceFill.failure);

  if (path === "draft.progression.initial") {
    const singleFill = singleChoiceFill(choiceFill.success.fill, fillIndex);
    /* v8 ignore start -- @preserve -- Validation already enforced this hole's exactly-one cardinality. */
    if (Result.isFailure(singleFill))
      return applyCreationFillIssue(singleFill.failure);
    /* v8 ignore stop -- @preserve */
    const optionId = singleFill.success.optionIds[0];
    const progression = supportedProgressionForOptionId(
      optionId,
      supportProfile,
    );
    /* v8 ignore start -- @preserve -- The initial-progression hole contains only option ids projected from this support profile. */
    return progression == null
      ? Result.fail(unsupportedChoiceIssue(fill, fillIndex, optionId))
      : Result.succeed({
          tag: "initialProgression",
          hole: choiceFill.success.hole,
          fill: singleFill.success,
          progression,
        });
    /* v8 ignore stop -- @preserve */
  }

  if (path === "draft.background") {
    const unitId = selectedSingleUnitId(
      choiceFill.success.hole,
      choiceFill.success.fill,
      fillIndex,
    );
    /* v8 ignore start -- @preserve -- Validation already admitted exactly one Unit-referencing background option from this hole. */
    return Result.isFailure(unitId)
      ? applyCreationFillIssue(unitId.failure)
      : Result.succeed({
          tag: "background",
          hole: choiceFill.success.hole,
          fill: unitId.success.fill,
          background: unitId.success.unitId,
        });
    /* v8 ignore stop -- @preserve */
  }

  if (path === "draft.species") {
    const unitId = selectedSingleUnitId(
      choiceFill.success.hole,
      choiceFill.success.fill,
      fillIndex,
    );
    /* v8 ignore start -- @preserve -- Validation already admitted exactly one Unit-referencing species option from this hole. */
    return Result.isFailure(unitId)
      ? applyCreationFillIssue(unitId.failure)
      : Result.succeed({
          tag: "species",
          hole: choiceFill.success.hole,
          fill: unitId.success.fill,
          species: unitId.success.unitId,
        });
    /* v8 ignore stop -- @preserve */
  }

  if (path === "draft.speciesSize") {
    const singleFill = singleChoiceFill(choiceFill.success.fill, fillIndex);
    /* v8 ignore start -- @preserve -- Validation already enforced this hole's exactly-one cardinality. */
    if (Result.isFailure(singleFill))
      return applyCreationFillIssue(singleFill.failure);
    /* v8 ignore stop -- @preserve */
    const size = speciesSizeSelection(
      singleFill.success,
      fillIndex,
      singleFill.success.optionIds[0],
    );
    /* v8 ignore start -- @preserve -- The species-size hole contains only ids admitted by the closed size selection parser. */
    return Result.isFailure(size)
      ? applyCreationFillIssue(size.failure)
      : Result.succeed({
          tag: "speciesSize",
          hole: choiceFill.success.hole,
          fill: singleFill.success,
          size: size.success,
        });
    /* v8 ignore stop -- @preserve */
  }

  if (path === "draft.draconicAncestry") {
    const singleFill = singleChoiceFill(choiceFill.success.fill, fillIndex);
    /* v8 ignore start -- @preserve -- Validation already enforced this hole's exactly-one cardinality. */
    if (Result.isFailure(singleFill))
      return applyCreationFillIssue(singleFill.failure);
    /* v8 ignore stop -- @preserve */
    return Result.succeed({
      tag: "draconicAncestry",
      hole: choiceFill.success.hole,
      fill: singleFill.success,
      ancestry: characterDraconicAncestrySelection(
        singleFill.success.optionIds[0],
      ),
    });
  }

  if (path === "draft.languages") {
    const languages = startingLanguages(choiceFill.success.fill, fillIndex);
    /* v8 ignore start -- @preserve -- Validation already admitted exactly two distinct selectable language ids from this hole. */
    return Result.isFailure(languages)
      ? applyCreationFillIssue(languages.failure)
      : Result.succeed({
          tag: "languages",
          hole: choiceFill.success.hole,
          fill: choiceFill.success.fill,
          languages: languages.success,
        });
    /* v8 ignore stop -- @preserve */
  }

  if (path === "draft.alignment") {
    const singleFill = singleChoiceFill(choiceFill.success.fill, fillIndex);
    /* v8 ignore start -- @preserve -- Validation already enforced this hole's exactly-one cardinality. */
    if (Result.isFailure(singleFill))
      return applyCreationFillIssue(singleFill.failure);
    /* v8 ignore stop -- @preserve */
    const alignment = alignmentSelection(
      singleFill.success,
      fillIndex,
      singleFill.success.optionIds[0],
    );
    /* v8 ignore start -- @preserve -- The alignment hole contains only ids admitted by the closed alignment parser. */
    return Result.isFailure(alignment)
      ? applyCreationFillIssue(alignment.failure)
      : Result.succeed({
          tag: "alignment",
          hole: choiceFill.success.hole,
          fill: singleFill.success,
          alignment: alignment.success,
        });
  }
  /* v8 ignore stop -- @preserve */

  /* v8 ignore start -- @preserve -- DraftPath is exhaustive across the draft branches handled above. */
  return Result.fail(wrongFillKindIssue(fill, fillIndex, hole));
}
/* v8 ignore stop -- @preserve */

function acceptedUnitFill(
  hole: UnitSourcedCreationHole,
  fill: CreationFill,
  fillIndex: FillIndex,
): ApplyCreationFillResult<AcceptedUnitFill> {
  const choiceFill = acceptedUnitChoiceFillForHole(hole, fill, fillIndex);
  /* v8 ignore next -- @preserve -- Validation already narrowed this to a matching Unit choice fill. */
  if (Result.isFailure(choiceFill)) return applyCreationFillIssue(choiceFill.failure);

  if (hole.source.choiceKey === BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY) {
    const singleFill = singleChoiceFill(choiceFill.success.fill, fillIndex);
    /* v8 ignore start -- @preserve -- Validation already enforced this hole's exactly-one cardinality. */
    if (Result.isFailure(singleFill))
      return applyCreationFillIssue(singleFill.failure);
    /* v8 ignore stop -- @preserve */
    const selection = backgroundAbilityScoreIncreaseSelection(
      singleFill.success,
      fillIndex,
      singleFill.success.optionIds[0],
    );
    /* v8 ignore start -- @preserve -- The background increase hole contains only ids admitted by its option codec. */
    return Result.isFailure(selection)
      ? applyCreationFillIssue(selection.failure)
      : Result.succeed({
          tag: "backgroundAbilityScoreIncrease",
          hole: choiceFill.success.hole,
          fill: singleFill.success,
          selection: selection.success,
        });
    /* v8 ignore stop -- @preserve */
  }

  if (hole.source.choiceKey === EQUIPMENT_PURCHASE_CHOICE_KEY) {
    const unitIds = selectedUnitIds(
      choiceFill.success.hole,
      choiceFill.success.fill,
      fillIndex,
      choiceFill.success.fill.optionIds,
    );
    /* v8 ignore start -- @preserve -- Validation already admitted every purchase option and its Unit reference from this hole. */
    return Result.isFailure(unitIds)
      ? applyCreationFillIssue(unitIds.failure)
      : Result.succeed({
          tag: "equipmentPurchase",
          hole: choiceFill.success.hole,
          fill: choiceFill.success.fill,
          unitIds: unitIds.success,
        });
    /* v8 ignore stop -- @preserve */
  }

  /* v8 ignore start -- @preserve -- Choice validation already enforced this Unit hole's positive cardinality. */
  if (choiceFill.success.fill.optionIds.length === 0) {
    return Result.fail(tooFewChoicesIssue(fill, fillIndex, 1));
  }
  /* v8 ignore stop -- @preserve */

  const options = [];
  for (const optionId of choiceFill.success.fill.optionIds) {
    const option = acceptedChoiceOption(
      choiceFill.success.hole,
      choiceFill.success.fill,
      fillIndex,
      optionId,
    );
    /* v8 ignore start -- @preserve -- Validation already admitted this option id from this exact Unit hole. */
    if (Result.isFailure(option)) return applyCreationFillIssue(option.failure);
    /* v8 ignore stop -- @preserve */
    options.push(selectedChoiceOption(option.success));
  }

  return Result.succeed({
    tag: "unitChoice",
    hole: choiceFill.success.hole,
    fill: choiceFill.success.fill,
    options,
  });
}

function acceptedLoadoutFill(
  hole: LoadoutSourcedCreationHole,
  fill: CreationFill,
  fillIndex: FillIndex,
): ApplyCreationFillResult<AcceptedLoadoutFill> {
  const choiceFill = acceptedLoadoutChoiceFillForHole(hole, fill, fillIndex);
  /* v8 ignore start -- @preserve -- Validation already narrowed this to a matching loadout choice fill. */
  if (Result.isFailure(choiceFill)) return applyCreationFillIssue(choiceFill.failure);
  /* v8 ignore stop -- @preserve */
  const singleFill = singleChoiceFill(choiceFill.success.fill, fillIndex);
  /* v8 ignore start -- @preserve -- Validation already enforced this loadout hole's exactly-one cardinality. */
  if (Result.isFailure(singleFill)) return applyCreationFillIssue(singleFill.failure);
  /* v8 ignore stop -- @preserve */
  const option = acceptedChoiceOption(
    choiceFill.success.hole,
    singleFill.success,
    fillIndex,
    singleFill.success.optionIds[0],
  );
  /* v8 ignore start -- @preserve -- Validation already admitted this option id from this exact loadout hole. */
  if (Result.isFailure(option)) return applyCreationFillIssue(option.failure);
  /* v8 ignore stop -- @preserve */
  const selectedOption = selectedLoadoutChoiceOption(
    choiceFill.success.hole.source,
    option.success,
    singleFill.success,
    fillIndex,
  );
  /* v8 ignore start -- @preserve -- Validation already matched the loadout option's Unit reference to this loadout source. */
  return Result.isFailure(selectedOption)
    ? applyCreationFillIssue(selectedOption.failure)
    : Result.succeed({
        hole: choiceFill.success.hole,
        fill: singleFill.success,
        selectedOption: selectedOption.success,
      });
  /* v8 ignore stop -- @preserve */
}

function acceptedDraftChoiceFillForHole(
  hole: DraftSourcedCreationHole,
  fill: CreationFill,
  fillIndex: FillIndex,
): ApplyCreationFillResult<{
  readonly hole: DraftSourcedChoiceCreationHole;
  readonly fill: ChoiceFill;
}> {
  /* v8 ignore start -- @preserve -- This helper runs only after validation matches a choice fill to a draft choice hole. */
  return hole.kind === "choice" && fill.kind === "choice"
    ? Result.succeed({ hole, fill })
    : Result.fail(wrongFillKindIssue(fill, fillIndex, hole));
  /* v8 ignore stop -- @preserve */
}

function acceptedUnitChoiceFillForHole(
  hole: UnitSourcedCreationHole,
  fill: CreationFill,
  fillIndex: FillIndex,
): ApplyCreationFillResult<{
  readonly hole: UnitSourcedChoiceCreationHole;
  readonly fill: ChoiceFill;
}> {
  /* v8 ignore start -- @preserve -- This helper runs only after validation matches a choice fill to a Unit choice hole. */
  return hole.kind === "choice" && fill.kind === "choice"
    ? Result.succeed({ hole, fill })
    : Result.fail(wrongFillKindIssue(fill, fillIndex, hole));
  /* v8 ignore stop -- @preserve */
}

function acceptedLoadoutChoiceFillForHole(
  hole: LoadoutSourcedCreationHole,
  fill: CreationFill,
  fillIndex: FillIndex,
): ApplyCreationFillResult<{
  readonly hole: LoadoutSourcedChoiceCreationHole;
  readonly fill: ChoiceFill;
}> {
  /* v8 ignore start -- @preserve -- This helper runs only after validation matches a choice fill to a loadout choice hole. */
  return hole.kind === "choice" && fill.kind === "choice"
    ? Result.succeed({ hole, fill })
    : Result.fail(wrongFillKindIssue(fill, fillIndex, hole));
  /* v8 ignore stop -- @preserve */
}

function singleChoiceFill(
  fill: ChoiceFill,
  fillIndex: FillIndex,
): ApplyCreationFillResult<SingleChoiceFill> {
  const optionId = fill.optionIds[0];
  /* v8 ignore start -- @preserve -- Callers use singleChoiceFill only after the hole cardinality validator admits exactly one option. */
  if (optionId == null) {
    return Result.fail(tooFewChoicesIssue(fill, fillIndex, 1));
  }
  if (fill.optionIds.length > 1) {
    return Result.fail(tooManyChoicesIssue(fill, fillIndex, 1));
  }
  /* v8 ignore stop -- @preserve */

  return Result.succeed({ ...fill, optionIds: [optionId] });
}

export function applyDraftFill(
  selections: CharacterDraftSelections,
  acceptedFill: AcceptedDraftFill,
): ApplyCreationFillResult<CharacterDraftSelections> {
  if (acceptedFill.tag === "initialProgression") {
    return Result.succeed({
      ...selections,
      progression: acceptedFill.progression,
    });
  }

  if (acceptedFill.tag === "background") {
    return Result.succeed({
      ...selections,
      background: acceptedFill.background,
    });
  }

  if (acceptedFill.tag === "species") {
    return Result.succeed({
      ...selections,
      species: acceptedFill.species,
    });
  }

  if (acceptedFill.tag === "speciesSize") {
    return Result.succeed({
      ...selections,
      speciesSize: acceptedFill.size,
    });
  }

  if (acceptedFill.tag === "draconicAncestry") {
    return Result.succeed({
      ...selections,
      draconicAncestry: acceptedFill.ancestry,
    });
  }

  if (acceptedFill.tag === "abilityScoreGeneration") {
    return Result.succeed({
      ...selections,
      abilityScoreGeneration: {
        method: acceptedFill.fill.method,
        assignedScores: acceptedFill.fill.value,
      },
    });
  }

  if (acceptedFill.tag === "languages") {
    return Result.succeed({
      ...selections,
      languages: acceptedFill.languages,
    });
  }

  if (acceptedFill.tag === "alignment") {
    return Result.succeed({
      ...selections,
      alignment: acceptedFill.alignment,
    });
    /* v8 ignore start -- @preserve -- AcceptedDraftFill is exhaustively handled above, so typed callers cannot supply another tag. */
  }
  // AcceptedDraftFill is exhaustive above; this compile-time never harness
  // cannot receive a runtime value through the typed reducer entrypoint.
  const exhaustive: never = acceptedFill;
  return exhaustive;
}
/* v8 ignore stop -- @preserve */

export function applyUnitFill(
  selections: CharacterDraftSelections,
  acceptedFill: AcceptedUnitFill,
): ApplyCreationFillResult<CharacterDraftSelections> {
  if (acceptedFill.tag === "backgroundAbilityScoreIncrease") {
    return Result.succeed({
      ...selections,
      backgroundAbilityScoreIncrease: acceptedFill.selection,
    });
  }

  if (acceptedFill.tag === "equipmentPurchase") {
    return Result.succeed({
      ...selections,
      equipment: {
        selectedUnitIds: acceptedFill.unitIds,
      },
    });
  }

  return Result.succeed({
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
    return Result.fail(duplicateFillIssue(acceptedFill.fill, fillIndex));
  }

  return Result.succeed({
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
  /* v8 ignore start -- @preserve -- The selected option came from this loadout hole, whose Unit reference equals its source equipment id. */
  return option.unitRef?.unitId !== source.equipmentUnitId
    ? Result.fail(invalidChoiceIssue(fill, fillIndex, option.optionId))
    : Result.succeed({
        optionId: option.optionId,
      });
  /* v8 ignore stop -- @preserve */
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
    /* v8 ignore start -- @preserve -- Validation already admitted every selected Unit option from this exact hole. */
    if (Result.isFailure(unitId)) return applyCreationFillIssue(unitId.failure);
    /* v8 ignore stop -- @preserve */
    unitIds.push(unitId.success);
  }
  return Result.succeed(unitIds);
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
  /* v8 ignore start -- @preserve -- Validation already enforced this Unit hole's exactly-one cardinality. */
  if (Result.isFailure(singleFill)) return applyCreationFillIssue(singleFill.failure);
  /* v8 ignore stop -- @preserve */
  const unitId = selectedUnitId(
    hole,
    singleFill.success,
    fillIndex,
    singleFill.success.optionIds[0],
  );
  return Result.isFailure(unitId)
    ? applyCreationFillIssue(unitId.failure)
    : Result.succeed({ fill: singleFill.success, unitId: unitId.success });
}

function selectedUnitId(
  hole: ChoiceCreationHole,
  fill: ChoiceFill,
  fillIndex: FillIndex,
  optionId: CreationChoiceOptionId,
): ApplyCreationFillResult<UnitRecord["id"]> {
  const option = acceptedChoiceOption(hole, fill, fillIndex, optionId);
  /* v8 ignore start -- @preserve -- Validation already admitted this option id from this exact hole roster. */
  if (Result.isFailure(option)) return applyCreationFillIssue(option.failure);
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Unit-selection helpers are called only for hole options whose schema includes a Unit reference. */
  return option.success.unitRef == null
    ? Result.fail(invalidChoiceIssue(fill, fillIndex, optionId))
    : Result.succeed(option.success.unitRef.unitId);
  /* v8 ignore stop -- @preserve */
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
  /* v8 ignore start -- @preserve -- Choice validation already admitted this option id from this exact hole roster. */
  return option == null
    ? Result.fail(invalidChoiceIssue(fill, fillIndex, optionId))
    : Result.succeed(option);
  /* v8 ignore stop -- @preserve */
}

function alignmentSelection(
  fill: ChoiceFill,
  fillIndex: FillIndex,
  optionId: CreationChoiceOptionId,
): ApplyCreationFillResult<CharacterAlignment> {
  const alignmentOption = parseAlignmentOptionId(optionId);
  /* v8 ignore start -- @preserve -- The alignment hole exposes only ids that round-trip through the closed alignment codecs. */
  const alignment =
    alignmentOption == null
      ? undefined
      : alignmentFromOptionId(alignmentOption);
  return alignment == null
    ? Result.fail(invalidChoiceIssue(fill, fillIndex, optionId))
    : Result.succeed(alignment);
}
/* v8 ignore stop -- @preserve */

function speciesSizeSelection(
  fill: ChoiceFill,
  fillIndex: FillIndex,
  optionId: CreationChoiceOptionId,
): ApplyCreationFillResult<CharacterSpeciesSizeSelection> {
  if (isCharacterSpeciesSizeSelection(optionId)) {
    return Result.succeed(optionId);
    /* v8 ignore start -- @preserve -- The species-size hole exposes only values accepted by isCharacterSpeciesSizeSelection. */
  }
  return Result.fail(invalidChoiceIssue(fill, fillIndex, optionId));
}
/* v8 ignore stop -- @preserve */

function startingLanguages(
  fill: ChoiceFill,
  fillIndex: FillIndex,
): ApplyCreationFillResult<CharacterStartingLanguages> {
  const first = fill.optionIds[0];
  const second = fill.optionIds[1];
  /* v8 ignore start -- @preserve -- Choice validation already admitted exactly two distinct selectable language ids. */
  if (fill.optionIds.length < 2) {
    return Result.fail(tooFewChoicesIssue(fill, fillIndex, 2));
  }
  if (fill.optionIds.length > 2) {
    return Result.fail(tooManyChoicesIssue(fill, fillIndex, 2));
  }
  if (!isSelectableStandardLanguage(first)) {
    return Result.fail(invalidChoiceIssue(fill, fillIndex, first));
  }
  if (!isSelectableStandardLanguage(second) || first === second) {
    return Result.fail(invalidChoiceIssue(fill, fillIndex, second));
  }
  /* v8 ignore stop -- @preserve */
  return Result.succeed(["Common", first, second] as CharacterStartingLanguages);
}

function backgroundAbilityScoreIncreaseSelection(
  fill: ChoiceFill,
  fillIndex: FillIndex,
  optionId: CreationChoiceOptionId,
): ApplyCreationFillResult<BackgroundAbilityScoreIncreaseSelection> {
  const selection = parseBackgroundAbilityScoreIncreaseOptionId(optionId);
  /* v8 ignore start -- @preserve -- The background increase hole exposes only ids emitted by this same option codec. */
  return selection == null
    ? Result.fail(invalidChoiceIssue(fill, fillIndex, optionId))
    : Result.succeed(selection);
  /* v8 ignore stop -- @preserve */
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
