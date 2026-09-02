import { Result, Match, Option } from "effect";
import {
  resourceCount,
  type ReadonlyNonEmptyArray,
  type ResourceCount,
} from "@dnd/shared/types";
import type {
  StatBlockCatalog,
  StatBlockId,
} from "@dnd/surface/surface/stat-block-catalog-contract";
import {
  druidWildShapeDurationHoursForClassLevel,
  druidWildShapeKnownFormRosterFromPhase,
  isDruidWildShapeFeatureRecord,
  type DruidWildShapeFeatureRecord,
  type DruidWildShapeKnownFormsRoster,
} from "@dnd/surface/surface/druid-wild-shape-readers";
import { statBlockHasPotentialFlySpeed } from "@dnd/surface/surface/stat-block-speed-readers";
import type { StatBlockRecord } from "@dnd/surface/surface/stat-block-types";
import type { UnitRecord } from "@dnd/surface/surface/types";
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
import { projectCharacterCreationClassFeatureFacts } from "./character-feature-projection.ts";

export const DRUID_WILD_SHAPE_UNIT_ID = authoredUnitId("druid_wild_shape");

const byKind = Match.discriminator("kind");

type DruidWildShapeFeatureFacts = ReturnType<
  typeof projectCharacterCreationClassFeatureFacts<DruidWildShapeFeatureRecord>
>;
type DruidWildShapeFeatureSource = {
  readonly unitId: UnitRecord["id"];
  readonly facts: DruidWildShapeFeatureFacts;
};

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
}): Result.Result<
  CharacterBuildDruidWildShapeFacts | undefined,
  CharacterBuildDruidWildShapeFactsIssue
> {
  const featureUnit = characterDruidWildShapeFeatureUnit(input);
  if (Result.isFailure(featureUnit)) return Result.fail(featureUnit.failure);
  if (featureUnit.success === undefined) {
    return Result.succeed(undefined);
  }
  const feature = featureUnit.success;

  const druidLevel = classLevelForWildShapeFeature({
    build: input.build,
    unitLibrary: input.unitLibrary,
    feature: feature.facts,
  });
  if (Result.isFailure(druidLevel)) return Result.fail(druidLevel.failure);

  const knownFormRoster = wildShapeKnownFormRoster(feature.facts);
  /* v8 ignore start -- @preserve -- Admission retains Wild Shape only after proving its Beast-form roster exists. */
  if (knownFormRoster === undefined) {
    return druidWildShapeFactsIssue(
      "Wild Shape requires known Beast form roster facts.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const useCountCap = feature.facts.mechanics.resource.cap;
  const maxChallengeRating = knownFormRoster.maxChallengeRating;
  const knownFormCount = classLevelChoiceCountAtLevel(
    knownFormRoster.knownForms,
    druidLevel.success,
  );
  /* v8 ignore start -- @preserve -- Admission proves both retained projections use class-level threshold tiers. */
  if (
    useCountCap.kind !== "threshold_tiers" ||
    !isClassLevelThresholdTiers(useCountCap) ||
    !isClassLevelThresholdTiers(maxChallengeRating)
  ) {
    return druidWildShapeFactsIssue(
      "Wild Shape requires class-level tiered use count and Beast form Challenge Rating facts.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return Result.succeed({
    unitId: feature.unitId,
    useCount: {
      maximum: resourceCount(
        thresholdTierValueAtClassLevel(useCountCap, druidLevel.success),
      ),
      shortRestRefill: resourceCount(
        feature.facts.mechanics.resetCadence.shortRestRefill,
      ),
      longRestRefillsAll: true,
    },
    duration: {
      unit: "hour",
      amount: druidWildShapeDurationHoursForClassLevel(druidLevel.success),
    },
    knownFormRoster: {
      creatureType: knownFormRoster.creatureType,
      count: knownFormCount,
      maxChallengeRating: thresholdTierValueAtClassLevel(
        maxChallengeRating,
        druidLevel.success,
      ),
      flySpeed: wildShapeFlySpeedAtClassLevel(
        knownFormRoster.flySpeed,
        druidLevel.success,
      ),
      longRestReplacementCount:
        knownFormRoster.knownFormChange.replacementCount,
    },
  });
}

function characterDruidWildShapeFeatureUnit(input: {
  readonly build: Pick<CharacterBuild, "progression" | "features">;
  readonly unitLibrary: UnitCatalog;
}): Result.Result<
  DruidWildShapeFeatureSource | undefined,
  CharacterBuildDruidWildShapeFactsIssue
> {
  const matches: DruidWildShapeFeatureSource[] = [];
  for (const unitId of characterBuildFeatureUnitIds(
    input.build,
    input.unitLibrary,
  )) {
    const unit = input.unitLibrary.getUnit(unitId);
    if (Option.isSome(unit) && isDruidWildShapeFeatureRecord(unit.value)) {
      matches.push({
        unitId: unit.value.id,
        facts: projectCharacterCreationClassFeatureFacts(unit.value),
      });
    }
  }
  if (matches.length > 1) {
    return druidWildShapeFactsIssue(
      "Wild Shape projection supports exactly one Druid Wild Shape feature.",
    );
  }
  return Result.succeed(matches[0]);
}

export function replaceDruidWildShapeKnownForm(input: {
  readonly facts: CharacterBuildDruidWildShapeFacts;
  readonly currentKnownFormStatBlockIds: readonly StatBlockId[];
  readonly replacement: CharacterBuildDruidWildShapeKnownFormReplacement;
  readonly statBlockCatalog: StatBlockCatalog;
}): Result.Result<
  readonly StatBlockId[],
  CharacterBuildDruidWildShapeFactsIssue
> {
  const currentKnownForms = validateDruidWildShapeKnownForms({
    facts: input.facts,
    knownFormStatBlockIds: input.currentKnownFormStatBlockIds,
    statBlockCatalog: input.statBlockCatalog,
  });
  if (Result.isFailure(currentKnownForms))
    return Result.fail(currentKnownForms.failure);
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
}): Result.Result<
  readonly StatBlockId[],
  CharacterBuildDruidWildShapeFactsIssue
> {
  const issues = validateDruidWildShapeKnownFormIssues(input);
  if (issues === undefined) return Result.succeed(input.knownFormStatBlockIds);
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
}): Result.Result<
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
    if (Result.isFailure(eligibility)) return Result.fail(eligibility.failure);
  }
  return Result.succeed(input.knownForms);
}

function classLevelForWildShapeFeature(input: {
  readonly build: Pick<CharacterBuild, "progression">;
  readonly unitLibrary: UnitCatalog;
  readonly feature: DruidWildShapeFeatureFacts;
}): Result.Result<number, CharacterBuildDruidWildShapeFactsIssue> {
  for (const classUnitId of progressionClassUnitIds(input.build.progression)) {
    const classUnit = input.unitLibrary.getUnit(classUnitId);
    if (
      Option.isSome(classUnit) &&
      classUnit.value.kind === "class" &&
      classUnit.value.className === input.feature.className
    ) {
      return Result.succeed(
        classLevelForUnit(input.build.progression, classUnitId),
      );
    }
  }
  return druidWildShapeFactsIssue(
    "Wild Shape projection requires Druid class progression.",
  );
}

function wildShapeKnownFormRoster(
  feature: DruidWildShapeFeatureFacts,
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
}): Result.Result<true, CharacterBuildDruidWildShapeFactsIssue> {
  const issueCode = druidWildShapeStatBlockIssueCodes(input)[0];
  return issueCode === undefined
    ? Result.succeed(true)
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
    statBlockHasPotentialFlySpeed(input.statBlock.statBlock)
  ) {
    issues.push("wildShapeKnownFormFlySpeedForbidden");
  }
  return issues;
}

function hasDuplicateStatBlockIds(
  statBlockIds: readonly StatBlockId[],
): boolean {
  return new Set(statBlockIds).size !== statBlockIds.length;
}

function druidWildShapeFactsIssue(
  message: string,
): Result.Result<never, CharacterBuildDruidWildShapeFactsIssue> {
  return Result.fail({ tag: "druidWildShapeFactsIssue", message });
}
