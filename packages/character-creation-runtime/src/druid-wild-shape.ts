import { Either, Match, Option } from "effect";
import {
  resourceCount,
  type ReadonlyNonEmptyArray,
  type ResourceCount,
} from "@dnd/shared/types";
import type {
  StatBlockCatalog,
  StatBlockId,
} from "@dnd/surface/surface/stat-block-catalog";
import {
  druidWildShapeDurationHoursForClassLevel,
  druidWildShapeKnownFormRosterFromPhase,
  isDruidWildShapeFeatureRecord,
  type DruidWildShapeFeatureRecord,
  type DruidWildShapeKnownFormsRoster,
} from "@dnd/surface/surface/druid-wild-shape-readers";
import type { StatBlockRecord, UnitRecord } from "@dnd/surface/surface/types";
import type { UnitCatalog } from "./types.ts";
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { characterBuildFeatureUnitIds } from "./finalization.ts";
import {
  classLevelForUnit,
  progressionClassUnitIds,
} from "./character-progression-types.ts";
import {
  classLevelChoiceCountAtLevel,
  isClassLevelThresholdTiers,
  thresholdTierValueAtClassLevel,
} from "./class-level-scaling.ts";
import type { CharacterBuild } from "./types.ts";

export const DRUID_WILD_SHAPE_UNIT_ID = authoredUnitId("druid_wild_shape");

const byKind = Match.discriminator("kind");

export type CharacterBuildDruidWildShapeFacts = {
  readonly unitId: UnitRecord["id"];
  readonly useCount: {
    readonly maximum: ResourceCount;
    readonly shortRestRefill: ResourceCount;
    readonly longRestRefillsAll: true;
  };
  readonly duration: {
    readonly unit: "hour";
    readonly amount: number;
  };
  readonly knownFormRoster: {
    readonly creatureType: DruidWildShapeKnownFormsRoster["creatureType"];
    readonly count: number;
    readonly maxChallengeRating: number;
    readonly flySpeed: "allowed" | "forbidden";
    readonly longRestReplacementCount: 1;
  };
};

export type CharacterBuildDruidWildShapeKnownFormReplacement = {
  readonly replaceStatBlockId: StatBlockId;
  readonly selectedStatBlockId: StatBlockId;
};

export type CharacterBuildDruidWildShapeFactsIssue = {
  readonly tag: "druidWildShapeFactsIssue";
  readonly message: string;
};

export const DRUID_WILD_SHAPE_KNOWN_FORM_ROSTER_ISSUE_CODES = [
  "wildShapeKnownFormCountMismatch",
] as const;
export const DRUID_WILD_SHAPE_KNOWN_FORM_ELIGIBILITY_ISSUE_CODES = [
  "wildShapeKnownFormWrongCreatureType",
  "wildShapeKnownFormChallengeRatingExceeded",
  "wildShapeKnownFormFlySpeedForbidden",
] as const;
export const DRUID_WILD_SHAPE_IDENTIFIED_FORM_ISSUE_CODES = [
  "wildShapeKnownFormUnavailable",
  ...DRUID_WILD_SHAPE_KNOWN_FORM_ELIGIBILITY_ISSUE_CODES,
] as const;
export const DRUID_WILD_SHAPE_KNOWN_FORM_ISSUE_CODES = [
  ...DRUID_WILD_SHAPE_KNOWN_FORM_ROSTER_ISSUE_CODES,
  ...DRUID_WILD_SHAPE_IDENTIFIED_FORM_ISSUE_CODES,
] as const;

export type DruidWildShapeKnownFormIssue =
  | {
      readonly code: (typeof DRUID_WILD_SHAPE_KNOWN_FORM_ROSTER_ISSUE_CODES)[number];
    }
  | {
      readonly code: (typeof DRUID_WILD_SHAPE_IDENTIFIED_FORM_ISSUE_CODES)[number];
      readonly statBlockId: StatBlockId;
    };

type DruidWildShapeKnownFormEligibilityIssueCode =
  (typeof DRUID_WILD_SHAPE_KNOWN_FORM_ELIGIBILITY_ISSUE_CODES)[number];

export function characterBuildDruidWildShapeFacts(input: {
  readonly build: Pick<CharacterBuild, "progression" | "features">;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  CharacterBuildDruidWildShapeFacts | undefined,
  CharacterBuildDruidWildShapeFactsIssue
> {
  const featureUnit = characterDruidWildShapeFeatureUnit(input);
  if (Either.isLeft(featureUnit)) return Either.left(featureUnit.left);
  if (featureUnit.right === undefined) {
    return Either.right(undefined);
  }
  const feature = featureUnit.right;

  const druidLevel = classLevelForWildShapeFeature({
    build: input.build,
    unitLibrary: input.unitLibrary,
    feature,
  });
  if (Either.isLeft(druidLevel)) return Either.left(druidLevel.left);

  const knownFormRoster = wildShapeKnownFormRoster(feature);
  // Admission requires the retained Wild Shape Unit to carry roster facts.
  /* v8 ignore start */
  if (knownFormRoster === undefined) {
    return druidWildShapeFactsIssue(
      "Wild Shape requires known Beast form roster facts.",
    );
  }
  /* v8 ignore stop */
  const useCountCap = feature.mechanics.resource.cap;
  const maxChallengeRating = knownFormRoster.maxChallengeRating;
  const knownFormCount = classLevelChoiceCountAtLevel(
    knownFormRoster.knownForms,
    druidLevel.right,
  );
  // Admission requires both projections to use class-level threshold tiers.
  /* v8 ignore start */
  if (
    useCountCap.kind !== "threshold_tiers" ||
    !isClassLevelThresholdTiers(useCountCap) ||
    !isClassLevelThresholdTiers(maxChallengeRating)
  ) {
    return druidWildShapeFactsIssue(
      "Wild Shape requires class-level tiered use count and Beast form Challenge Rating facts.",
    );
  }
  /* v8 ignore stop */
  return Either.right({
    unitId: feature.id,
    useCount: {
      maximum: resourceCount(
        thresholdTierValueAtClassLevel(useCountCap, druidLevel.right),
      ),
      shortRestRefill: resourceCount(
        feature.mechanics.resetCadence.shortRestRefill,
      ),
      longRestRefillsAll: true,
    },
    duration: {
      unit: "hour",
      amount: druidWildShapeDurationHoursForClassLevel(druidLevel.right),
    },
    knownFormRoster: {
      creatureType: knownFormRoster.creatureType,
      count: knownFormCount,
      maxChallengeRating: thresholdTierValueAtClassLevel(
        maxChallengeRating,
        druidLevel.right,
      ),
      flySpeed: wildShapeFlySpeedAtClassLevel(
        knownFormRoster.flySpeed,
        druidLevel.right,
      ),
      longRestReplacementCount:
        knownFormRoster.knownFormChange.replacementCount,
    },
  });
}

function characterDruidWildShapeFeatureUnit(input: {
  readonly build: Pick<CharacterBuild, "progression" | "features">;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  DruidWildShapeFeatureRecord | undefined,
  CharacterBuildDruidWildShapeFactsIssue
> {
  const matches: DruidWildShapeFeatureRecord[] = [];
  for (const unitId of characterBuildFeatureUnitIds(
    input.build,
    input.unitLibrary,
  )) {
    const unit = input.unitLibrary.getUnit(unitId);
    if (Option.isSome(unit) && isDruidWildShapeFeatureRecord(unit.value)) {
      matches.push(unit.value);
    }
  }
  if (matches.length > 1) {
    return druidWildShapeFactsIssue(
      "Wild Shape projection supports exactly one Druid Wild Shape feature.",
    );
  }
  return Either.right(matches[0]);
}

export function replaceDruidWildShapeKnownForm(input: {
  readonly facts: CharacterBuildDruidWildShapeFacts;
  readonly currentKnownFormStatBlockIds: readonly StatBlockId[];
  readonly replacement: CharacterBuildDruidWildShapeKnownFormReplacement;
  readonly statBlockCatalog: StatBlockCatalog;
}): Either.Either<
  readonly StatBlockId[],
  CharacterBuildDruidWildShapeFactsIssue
> {
  const currentKnownForms = validateDruidWildShapeKnownForms({
    facts: input.facts,
    knownFormStatBlockIds: input.currentKnownFormStatBlockIds,
    statBlockCatalog: input.statBlockCatalog,
  });
  if (Either.isLeft(currentKnownForms))
    return Either.left(currentKnownForms.left);
  if (
    input.replacement.replaceStatBlockId ===
    input.replacement.selectedStatBlockId
  ) {
    return druidWildShapeFactsIssue(
      "Wild Shape known-form replacement must choose another eligible form.",
    );
  }
  if (
    !input.currentKnownFormStatBlockIds.includes(
      input.replacement.replaceStatBlockId,
    )
  ) {
    return druidWildShapeFactsIssue(
      "Wild Shape known-form replacement must replace a currently known form.",
    );
  }
  const retainedForms = input.currentKnownFormStatBlockIds.filter(
    (statBlockId) => statBlockId !== input.replacement.replaceStatBlockId,
  );
  if (retainedForms.includes(input.replacement.selectedStatBlockId)) {
    return druidWildShapeFactsIssue(
      "Wild Shape known forms must remain distinct after replacement.",
    );
  }
  const nextKnownForms = input.currentKnownFormStatBlockIds.map(
    (statBlockId) =>
      statBlockId === input.replacement.replaceStatBlockId
        ? input.replacement.selectedStatBlockId
        : statBlockId,
  );
  return validateDruidWildShapeKnownForms({
    facts: input.facts,
    knownFormStatBlockIds: nextKnownForms,
    statBlockCatalog: input.statBlockCatalog,
  });
}

export function validateDruidWildShapeKnownForms(input: {
  readonly facts: CharacterBuildDruidWildShapeFacts;
  readonly knownFormStatBlockIds: readonly StatBlockId[];
  readonly statBlockCatalog: StatBlockCatalog;
}): Either.Either<
  readonly StatBlockId[],
  CharacterBuildDruidWildShapeFactsIssue
> {
  const issues = validateDruidWildShapeKnownFormIssues(input);
  if (issues === undefined) return Either.right(input.knownFormStatBlockIds);
  return druidWildShapeFactsIssue(
    messageForDruidWildShapeKnownFormIssue(issues[0]),
  );
}

export function validateDruidWildShapeKnownFormIssues(input: {
  readonly facts: CharacterBuildDruidWildShapeFacts;
  readonly knownFormStatBlockIds: readonly StatBlockId[];
  readonly statBlockCatalog: StatBlockCatalog;
}): ReadonlyNonEmptyArray<DruidWildShapeKnownFormIssue> | undefined {
  const issues: DruidWildShapeKnownFormIssue[] = [];
  if (
    input.knownFormStatBlockIds.length !== input.facts.knownFormRoster.count ||
    hasDuplicateStatBlockIds(input.knownFormStatBlockIds)
  ) {
    issues.push({ code: "wildShapeKnownFormCountMismatch" });
  }
  for (const statBlockId of [...new Set(input.knownFormStatBlockIds)].sort()) {
    const statBlock = input.statBlockCatalog.getStatBlock(statBlockId);
    if (Option.isNone(statBlock)) {
      issues.push({ code: "wildShapeKnownFormUnavailable", statBlockId });
      continue;
    }
    for (const code of druidWildShapeStatBlockIssueCodes({
      facts: input.facts,
      statBlock: statBlock.value,
    })) {
      issues.push({ code, statBlockId });
    }
  }
  const firstIssue = issues[0];
  return firstIssue === undefined
    ? undefined
    : [firstIssue, ...issues.slice(1)];
}

export function messageForDruidWildShapeKnownFormIssue(
  issue: DruidWildShapeKnownFormIssue,
): string {
  return Match.value(issue.code).pipe(
    Match.when(
      "wildShapeKnownFormCountMismatch",
      () => "Wild Shape known forms must match the Druid's known-form count.",
    ),
    Match.when(
      "wildShapeKnownFormUnavailable",
      () => "Wild Shape known forms require available Stat Blocks.",
    ),
    Match.when(
      "wildShapeKnownFormWrongCreatureType",
      () => "Wild Shape known forms require eligible Beast Stat Blocks.",
    ),
    Match.when(
      "wildShapeKnownFormChallengeRatingExceeded",
      () =>
        "Wild Shape known forms cannot exceed the Druid's maximum Challenge Rating.",
    ),
    Match.when(
      "wildShapeKnownFormFlySpeedForbidden",
      () =>
        "Wild Shape known forms cannot have a Fly Speed at this Druid level.",
    ),
    Match.exhaustive,
  );
}

export function validateDruidWildShapeKnownFormRecords(input: {
  readonly facts: CharacterBuildDruidWildShapeFacts;
  readonly knownForms: readonly StatBlockRecord[];
}): Either.Either<
  readonly StatBlockRecord[],
  CharacterBuildDruidWildShapeFactsIssue
> {
  if (
    input.knownForms.length !== input.facts.knownFormRoster.count ||
    hasDuplicateStatBlockIds(input.knownForms.map((form) => form.id))
  ) {
    return druidWildShapeFactsIssue(
      "Wild Shape known forms must match the Druid's known-form count.",
    );
  }
  for (const statBlock of input.knownForms) {
    const eligibility = druidWildShapeStatBlockEligibility({
      facts: input.facts,
      statBlock,
    });
    if (Either.isLeft(eligibility)) return Either.left(eligibility.left);
  }
  return Either.right(input.knownForms);
}

function classLevelForWildShapeFeature(input: {
  readonly build: Pick<CharacterBuild, "progression">;
  readonly unitLibrary: UnitCatalog;
  readonly feature: DruidWildShapeFeatureRecord;
}): Either.Either<number, CharacterBuildDruidWildShapeFactsIssue> {
  for (const classUnitId of progressionClassUnitIds(input.build.progression)) {
    const classUnit = input.unitLibrary.getUnit(classUnitId);
    if (
      Option.isSome(classUnit) &&
      classUnit.value.kind === "class" &&
      classUnit.value.className === input.feature.className
    ) {
      return Either.right(
        classLevelForUnit(input.build.progression, classUnitId),
      );
    }
  }
  return druidWildShapeFactsIssue(
    "Wild Shape projection requires Druid class progression.",
  );
}

function wildShapeKnownFormRoster(
  feature: DruidWildShapeFeatureRecord,
): DruidWildShapeKnownFormsRoster | undefined {
  return druidWildShapeKnownFormRosterFromPhase(feature.mechanics.phases[0]);
}

function wildShapeFlySpeedAtClassLevel(
  flySpeed: DruidWildShapeKnownFormsRoster["flySpeed"],
  classLevel: number,
): CharacterBuildDruidWildShapeFacts["knownFormRoster"]["flySpeed"] {
  return Match.value(flySpeed).pipe(
    byKind("forbidden", () => wildShapeFlySpeed(false)),
    byKind("allowed_at_class_level", (allowed) =>
      wildShapeFlySpeed(classLevel >= allowed.atLevel),
    ),
    Match.exhaustive,
  );
}

function wildShapeFlySpeed(
  allowed: boolean,
): CharacterBuildDruidWildShapeFacts["knownFormRoster"]["flySpeed"] {
  return allowed ? "allowed" : "forbidden";
}

function druidWildShapeStatBlockEligibility(input: {
  readonly facts: CharacterBuildDruidWildShapeFacts;
  readonly statBlock: StatBlockRecord;
}): Either.Either<true, CharacterBuildDruidWildShapeFactsIssue> {
  const issueCode = druidWildShapeStatBlockIssueCodes(input)[0];
  return issueCode === undefined
    ? Either.right(true)
    : druidWildShapeFactsIssue(
        messageForDruidWildShapeKnownFormIssue({
          code: issueCode,
          statBlockId: input.statBlock.id,
        }),
      );
}

function druidWildShapeStatBlockIssueCodes(input: {
  readonly facts: CharacterBuildDruidWildShapeFacts;
  readonly statBlock: StatBlockRecord;
}): readonly DruidWildShapeKnownFormEligibilityIssueCode[] {
  const issues: DruidWildShapeKnownFormEligibilityIssueCode[] = [];
  if (
    input.statBlock.statBlock.creatureType !==
    input.facts.knownFormRoster.creatureType
  ) {
    issues.push("wildShapeKnownFormWrongCreatureType");
  }
  if (
    input.statBlock.challengeRating >
    input.facts.knownFormRoster.maxChallengeRating
  ) {
    issues.push("wildShapeKnownFormChallengeRatingExceeded");
  }
  if (
    input.facts.knownFormRoster.flySpeed === "forbidden" &&
    statBlockHasFlySpeed(input.statBlock)
  ) {
    issues.push("wildShapeKnownFormFlySpeedForbidden");
  }
  return issues;
}

function statBlockHasFlySpeed(statBlock: StatBlockRecord): boolean {
  return statBlock.statBlock.speeds.some((speed) => speed.kind === "fly");
}

function hasDuplicateStatBlockIds(
  statBlockIds: readonly StatBlockId[],
): boolean {
  return new Set(statBlockIds).size !== statBlockIds.length;
}

function druidWildShapeFactsIssue(
  message: string,
): Either.Either<never, CharacterBuildDruidWildShapeFactsIssue> {
  return Either.left({ tag: "druidWildShapeFactsIssue", message });
}
