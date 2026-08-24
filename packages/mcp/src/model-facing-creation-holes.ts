import {
  choiceCardinalityBounds,
  discoverCreationHoles,
  finalizeCharacterDraft,
  supportedHoleOptionIds,
  type CharacterCreationSupportProfile,
  type CharacterDraft,
  type CreationBatchFillResult,
  type CreationFinalizationResult,
  type CreationHole,
  type NonEmptyReadonlyArray,
  type UnitCatalog,
} from "@dnd/character-creation-runtime";
import { Match } from "effect";

export type ModelFacingCreationProjectionIssue = {
  readonly tag: "supportedOptionsBelowMinimum";
  readonly holeId: string;
  readonly minimum: number;
  readonly supportedOptionCount: number;
};

type ModelFacingCreationProjection<A> =
  | { readonly tag: "projected"; readonly value: A }
  | {
      readonly tag: "invalidSupportProfile";
      readonly issues: NonEmptyReadonlyArray<ModelFacingCreationProjectionIssue>;
    };

export type ModelFacingCreationState = {
  readonly holes: readonly CreationHole[];
  readonly finalization: CreationFinalizationResult;
};

export function discoverModelFacingCreationState(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitCatalog;
  readonly supportProfile: CharacterCreationSupportProfile;
}): ModelFacingCreationProjection<ModelFacingCreationState> {
  const holes = projectModelFacingCreationHoles(
    discoverCreationHoles(input),
    input.supportProfile,
  );
  if (holes.tag === "invalidSupportProfile") return holes;
  const finalization = projectModelFacingFinalization(
    finalizeCharacterDraft(input),
    input.supportProfile,
  );
  if (finalization.tag === "invalidSupportProfile") return finalization;
  return {
    tag: "projected",
    value: { holes: holes.value, finalization: finalization.value },
  };
}

export function projectModelFacingCreationFillResult(
  result: CreationBatchFillResult,
  supportProfile: CharacterCreationSupportProfile,
): ModelFacingCreationProjection<CreationBatchFillResult> {
  const holes = projectModelFacingCreationHoles(result.holes, supportProfile);
  if (holes.tag === "invalidSupportProfile") return holes;
  const finalization = projectModelFacingFinalization(
    result.finalization,
    supportProfile,
  );
  if (finalization.tag === "invalidSupportProfile") return finalization;
  return {
    tag: "projected",
    value: { ...result, holes: holes.value, finalization: finalization.value },
  };
}

export function projectModelFacingFinalization(
  finalization: CreationFinalizationResult,
  supportProfile: CharacterCreationSupportProfile,
): ModelFacingCreationProjection<CreationFinalizationResult> {
  return Match.value(finalization).pipe(
    Match.when({ tag: "ready" }, (ready) => projected(ready)),
    Match.when({ tag: "invalid" }, (invalid) => projected(invalid)),
    Match.when({ tag: "incomplete" }, (incomplete) => {
      const holes = projectModelFacingCreationHoles(
        incomplete.holes,
        supportProfile,
      );
      return holes.tag === "invalidSupportProfile"
        ? holes
        : projected({ ...incomplete, holes: holes.value });
    }),
    Match.exhaustive,
  );
}

function projectModelFacingCreationHoles(
  holes: NonEmptyReadonlyArray<CreationHole>,
  supportProfile: CharacterCreationSupportProfile,
): ModelFacingCreationProjection<NonEmptyReadonlyArray<CreationHole>>;
function projectModelFacingCreationHoles(
  holes: readonly CreationHole[],
  supportProfile: CharacterCreationSupportProfile,
): ModelFacingCreationProjection<readonly CreationHole[]>;
function projectModelFacingCreationHoles(
  holes: readonly CreationHole[],
  supportProfile: CharacterCreationSupportProfile,
): ModelFacingCreationProjection<readonly CreationHole[]> {
  const [first, ...rest] = holes;
  if (first === undefined) return projected([]);
  const projectedFirst = projectModelFacingCreationHole(first, supportProfile);
  const projectedHoles: CreationHole[] = [];
  const issues: ModelFacingCreationProjectionIssue[] = [];
  if (projectedFirst.tag === "invalidSupportProfile") {
    issues.push(...projectedFirst.issues);
  } else {
    projectedHoles.push(projectedFirst.value);
  }
  for (const hole of rest) {
    const result = projectModelFacingCreationHole(hole, supportProfile);
    if (result.tag === "invalidSupportProfile") {
      issues.push(...result.issues);
    } else {
      projectedHoles.push(result.value);
    }
  }
  const [firstIssue, ...remainingIssues] = issues;
  if (firstIssue !== undefined) {
    return invalidSupportProfile([firstIssue, ...remainingIssues]);
  }
  return projected(projectedHoles);
}

function projectModelFacingCreationHole(
  hole: CreationHole,
  supportProfile: CharacterCreationSupportProfile,
): ModelFacingCreationProjection<CreationHole> {
  return Match.value(hole).pipe(
    Match.when({ kind: "abilityScores" }, (abilityScoresHole) =>
      projected(abilityScoresHole),
    ),
    Match.when({ kind: "choice" }, (choiceHole) => {
      const supportedOptionIds = supportedHoleOptionIds(
        choiceHole,
        supportProfile,
      );
      if (supportedOptionIds === undefined) return projected(choiceHole);
      const supportedOptionIdSet = new Set(supportedOptionIds);
      const options = choiceHole.options.filter(({ optionId }) =>
        supportedOptionIdSet.has(optionId),
      );
      const minimum = choiceCardinalityBounds(choiceHole.cardinality)?.min;
      if (minimum !== undefined && options.length < minimum) {
        return invalidSupportProfile([
          {
            tag: "supportedOptionsBelowMinimum",
            holeId: choiceHole.holeId,
            minimum,
            supportedOptionCount: options.length,
          },
        ]);
      }
      return projected({ ...choiceHole, options });
    }),
    Match.exhaustive,
  );
}

function projected<A>(value: A): ModelFacingCreationProjection<A> {
  return { tag: "projected", value };
}

function invalidSupportProfile(
  issues: NonEmptyReadonlyArray<ModelFacingCreationProjectionIssue>,
): ModelFacingCreationProjection<never> {
  return { tag: "invalidSupportProfile", issues };
}
