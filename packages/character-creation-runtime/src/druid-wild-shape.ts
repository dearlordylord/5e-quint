import { Either, Match, Option } from "effect";
import { resourceCount, type ResourceCount } from "@dnd/shared/types";
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

export const DRUID_WILD_SHAPE_UNIT_ID =
  "druid_wild_shape" as const satisfies UnitRecord["id"];

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
  if (knownFormRoster === undefined) {
    return druidWildShapeFactsIssue(
      "Wild Shape requires known Beast form roster facts.",
    );
  }
  const useCountCap = feature.mechanics.resource.cap;
  const maxChallengeRating = knownFormRoster.maxChallengeRating;
  const knownFormCount = classLevelChoiceCountAtLevel(
    knownFormRoster.knownForms,
    druidLevel.right,
  );
  if (
    useCountCap.kind !== "threshold_tiers" ||
    !isClassLevelThresholdTiers(useCountCap) ||
    !isClassLevelThresholdTiers(maxChallengeRating)
  ) {
    return druidWildShapeFactsIssue(
      "Wild Shape requires class-level tiered use count and Beast form Challenge Rating facts.",
    );
  }
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
  if (
    input.knownFormStatBlockIds.length !== input.facts.knownFormRoster.count ||
    hasDuplicateStatBlockIds(input.knownFormStatBlockIds)
  ) {
    return druidWildShapeFactsIssue(
      "Wild Shape known forms must match the Druid's known-form count.",
    );
  }
  for (const statBlockId of input.knownFormStatBlockIds) {
    const statBlock = input.statBlockCatalog.getStatBlock(statBlockId);
    if (Option.isNone(statBlock)) {
      return druidWildShapeFactsIssue(
        "Wild Shape known forms require available Stat Blocks.",
      );
    }
    const eligibility = druidWildShapeStatBlockEligibility({
      facts: input.facts,
      statBlock: statBlock.value,
    });
    if (Either.isLeft(eligibility)) return Either.left(eligibility.left);
  }
  return Either.right(input.knownFormStatBlockIds);
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
  if (
    input.statBlock.statBlock.creatureType !==
    input.facts.knownFormRoster.creatureType
  ) {
    return druidWildShapeFactsIssue(
      "Wild Shape known forms require eligible Beast Stat Blocks.",
    );
  }
  if (
    input.statBlock.challengeRating >
    input.facts.knownFormRoster.maxChallengeRating
  ) {
    return druidWildShapeFactsIssue(
      "Wild Shape known forms cannot exceed the Druid's maximum Challenge Rating.",
    );
  }
  if (
    input.facts.knownFormRoster.flySpeed === "forbidden" &&
    statBlockHasFlySpeed(input.statBlock)
  ) {
    return druidWildShapeFactsIssue(
      "Wild Shape known forms cannot have a Fly Speed at this Druid level.",
    );
  }
  return Either.right(true);
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
