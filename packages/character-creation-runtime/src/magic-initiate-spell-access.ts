// KERNEL-COVERAGE: runtime-owner CREATION.MAGIC_INITIATE.CHOICE_FINALIZATION
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import {
  MAGIC_INITIATE_SPELLCASTING_ABILITY_OPTIONS,
  readMagicInitiateSpellAccessSourceFacts,
  type MagicInitiateSpellAccessSourceFacts,
} from "@dnd/surface/surface/character-creation-readers";
import {
  classSpellListForClassName,
  type UnitCatalog,
} from "@dnd/surface/surface/unit-catalog-core";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { Result, Option } from "effect";

import type {
  CharacterBuild,
  CharacterBuildMagicInitiateSpellAccess,
} from "./types.ts";
import { projectCharacterDefinition } from "./character-definition-projection.ts";
import { projectCharacterCreationFeature } from "./character-feature-projection.ts";

export type CharacterBuildMagicInitiateSpellAccessIssue = {
  readonly index?: number;
  readonly message: string;
};

type MagicInitiateSpellAccessBuildContext = Pick<
  CharacterBuild,
  "background" | "species" | "features"
>;

type MagicInitiateGrantInstance = {
  readonly featUnitId: UnitRecord["id"];
  readonly spellList: MagicInitiateSpellAccessSourceFacts["spellList"];
};

export type MagicInitiateAbility =
  MagicInitiateSpellAccessSourceFacts["spellcastingAbilityOptions"][number];

export function parseCharacterBuildMagicInitiateSpellAccesses(input: {
  readonly value: unknown;
  readonly build: MagicInitiateSpellAccessBuildContext;
  readonly unitLibrary: UnitCatalog;
}): Result.Result<
  readonly CharacterBuildMagicInitiateSpellAccess[],
  readonly [
    CharacterBuildMagicInitiateSpellAccessIssue,
    ...CharacterBuildMagicInitiateSpellAccessIssue[],
  ]
> {
  if (!Array.isArray(input.value)) {
    return Result.fail([
      { message: "Character Build requires Magic Initiate Spell Accesses." },
    ]);
  }

  const grantInstances = magicInitiateGrantInstances(
    input.build,
    input.unitLibrary,
  );
  const issues: CharacterBuildMagicInitiateSpellAccessIssue[] = [];
  const accesses: CharacterBuildMagicInitiateSpellAccess[] = [];

  input.value.forEach((value, index) => {
    const parsed = parseMagicInitiateSpellAccessEntry({
      value,
      index,
      grantInstances,
      unitLibrary: input.unitLibrary,
    });
    if (Result.isFailure(parsed)) issues.push(...parsed.failure);
    else accesses.push(parsed.success);
  });

  issues.push(
    ...magicInitiateGrantInstanceIssues(grantInstances, accesses),
    ...magicInitiateParsedSpellListIssues(accesses, input.unitLibrary),
  );

  const firstIssue = issues[0];
  return firstIssue === undefined
    ? Result.succeed(accesses)
    : Result.fail([firstIssue, ...issues.slice(1)]);
}

function magicInitiateGrantInstanceIssues(
  grantInstances: readonly MagicInitiateGrantInstance[],
  accesses: readonly CharacterBuildMagicInitiateSpellAccess[],
): readonly CharacterBuildMagicInitiateSpellAccessIssue[] {
  const issues: CharacterBuildMagicInitiateSpellAccessIssue[] = [];
  if (hasDuplicateValues(grantInstances.map((grant) => grant.spellList))) {
    issues.push({
      message:
        "Character Build cannot acquire Magic Initiate more than once for the same spell list.",
    });
  }
  const expectedSourceCounts = new Map<UnitRecord["id"], number>();
  for (const grant of grantInstances) {
    expectedSourceCounts.set(
      grant.featUnitId,
      (expectedSourceCounts.get(grant.featUnitId) ?? 0) + 1,
    );
  }
  for (const [sourceUnitId, expectedCount] of expectedSourceCounts) {
    const count = accesses.filter(
      (access) => access.featUnitId === sourceUnitId,
    ).length;
    if (count !== expectedCount) {
      issues.push({
        message:
          expectedCount === 1
            ? `Character Build requires exactly one Magic Initiate Spell Access for owned source Unit ${sourceUnitId}.`
            : `Character Build requires exactly ${expectedCount} Magic Initiate Spell Accesses for owned source Unit ${sourceUnitId}.`,
      });
    }
  }
  return issues;
}

function magicInitiateParsedSpellListIssues(
  accesses: readonly CharacterBuildMagicInitiateSpellAccess[],
  unitLibrary: UnitCatalog,
): readonly CharacterBuildMagicInitiateSpellAccessIssue[] {
  const parsedSpellLists = accesses.flatMap((access) => {
    const grant = magicInitiateGrantInstance(access.featUnitId, unitLibrary);
    return grant === undefined ? [] : [grant.spellList];
  });
  return hasDuplicateValues(parsedSpellLists)
    ? [
        {
          message:
            "Character Build Magic Initiate Spell Accesses must use distinct spell lists.",
        },
      ]
    : [];
}

/**
 * Projects the selected origin feats that are actually owned through the
 * selected species' origin-feat grant source. Stored builds retain the
 * selected feature and its source, but the species Surface facts remain the
 * authority for whether that source can grant an origin feat.
 */
export function characterBuildSpeciesOriginFeatUnitIds(input: {
  readonly species: CharacterBuild["species"];
  readonly features: CharacterBuild["features"];
  readonly unitLibrary: UnitCatalog;
}): readonly UnitRecord["id"][] {
  const species = input.unitLibrary.getUnit(input.species);
  if (Option.isNone(species)) return [];
  const speciesProjection = projectCharacterDefinition(species.value);
  if (
    speciesProjection.tag !== "readable" ||
    speciesProjection.value.kind !== "species"
  ) {
    return [];
  }

  const originFeatSources = new Set(
    Object.values(speciesProjection.value.facts.traits).flatMap(
      (traitUnitId) => {
        const trait = input.unitLibrary.getUnit(traitUnitId);
        if (Option.isNone(trait)) {
          return [];
        }
        const projection = projectCharacterCreationFeature(trait.value);
        if (
          projection.tag !== "readable" ||
          projection.value.kind !== "species_trait" ||
          projection.value.facts.mechanics.family !== "passive"
        )
          return [];
        return projection.value.facts.mechanics.grants.some(
          (grant) =>
            grant.kind === "grant_feat" &&
            ("category" in grant
              ? grant.category === "origin"
              : grant.categories.includes("origin")),
        )
          ? [trait.value.id]
          : [];
      },
    ),
  );

  return input.features.flatMap((feature) => {
    if (
      feature.kind !== "selectedClassChoice" ||
      !originFeatSources.has(feature.selectedFromUnitId)
    ) {
      return [];
    }
    const selected = input.unitLibrary.getUnit(feature.unitId);
    if (Option.isNone(selected)) return [];
    const projection = projectCharacterCreationFeature(selected.value);
    return projection.tag === "readable" &&
      projection.value.kind === "feat" &&
      projection.value.facts.category === "origin"
      ? [selected.value.id]
      : [];
  });
}

function parseMagicInitiateSpellAccessEntry(input: {
  readonly value: unknown;
  readonly index: number;
  readonly grantInstances: readonly MagicInitiateGrantInstance[];
  readonly unitLibrary: UnitCatalog;
}): Result.Result<
  CharacterBuildMagicInitiateSpellAccess,
  readonly [
    CharacterBuildMagicInitiateSpellAccessIssue,
    ...CharacterBuildMagicInitiateSpellAccessIssue[],
  ]
> {
  const issues: CharacterBuildMagicInitiateSpellAccessIssue[] = [];
  if (!isMagicInitiateSpellAccessInput(input.value)) {
    return Result.fail([
      {
        index: input.index,
        message:
          "Magic Initiate Spell Access must contain exactly source Unit id, Intelligence, Wisdom, or Charisma, two cantrip Unit ids, and one level-1 spell Unit id.",
      },
    ]);
  }

  const featUnitId = authoredUnitId(input.value.featUnitId);
  const cantrips: [UnitRecord["id"], UnitRecord["id"]] = [
    authoredUnitId(input.value.cantrips[0]),
    authoredUnitId(input.value.cantrips[1]),
  ];
  const levelOneSpell = authoredUnitId(input.value.levelOneSpell);
  if (!input.grantInstances.some((grant) => grant.featUnitId === featUnitId)) {
    issues.push({
      index: input.index,
      message: `Magic Initiate Spell Access source Unit ${featUnitId} is not owned by the Character Build.`,
    });
  }
  const feat = input.unitLibrary.getUnit(featUnitId);
  const sourceFacts = Option.isSome(feat)
    ? readMagicInitiateSpellAccessSourceFacts(feat.value)
    : undefined;
  if (sourceFacts === undefined || sourceFacts.tag !== "readable") {
    issues.push({
      index: input.index,
      message: `Magic Initiate Spell Access source Unit ${featUnitId} is invalid.`,
    });
  } else {
    const spellList = classSpellListForClassName({
      className: sourceFacts.value.spellList,
      unitLibrary: input.unitLibrary,
    });
    issues.push(
      ...magicInitiateSpellListIssues({
        index: input.index,
        spellList,
        cantrips,
        levelOneSpell,
      }),
    );
  }

  const firstIssue = issues[0];
  if (firstIssue !== undefined)
    return Result.fail([firstIssue, ...issues.slice(1)]);
  return Result.succeed({
    featUnitId,
    spellcastingAbility: input.value.spellcastingAbility,
    cantrips,
    levelOneSpell,
  });
}

function magicInitiateSpellListIssues(input: {
  readonly index: number;
  readonly spellList: ReturnType<typeof classSpellListForClassName>;
  readonly cantrips: readonly [UnitRecord["id"], UnitRecord["id"]];
  readonly levelOneSpell: UnitRecord["id"];
}): readonly CharacterBuildMagicInitiateSpellAccessIssue[] {
  const issues: CharacterBuildMagicInitiateSpellAccessIssue[] = [];
  const spellList = input.spellList;
  if (spellList === undefined) {
    issues.push(
      {
        index: input.index,
        message:
          "Magic Initiate cantrips must be two distinct cantrips from the selected spell list.",
      },
      {
        index: input.index,
        message:
          "Magic Initiate level-1 spell must come from the selected spell list.",
      },
    );
    return issues;
  }
  if (
    input.cantrips[0] === input.cantrips[1] ||
    !input.cantrips.every((spellId) => spellList.cantrips.includes(spellId))
  ) {
    issues.push({
      index: input.index,
      message:
        "Magic Initiate cantrips must be two distinct cantrips from the selected spell list.",
    });
  }
  if (
    !spellList.leveled.some(
      (spell) =>
        spell.spellId === input.levelOneSpell && spell.spellLevel === 1,
    )
  ) {
    issues.push({
      index: input.index,
      message:
        "Magic Initiate level-1 spell must come from the selected spell list.",
    });
  }
  return issues;
}

function magicInitiateGrantInstances(
  build: MagicInitiateSpellAccessBuildContext,
  unitLibrary: UnitCatalog,
): readonly MagicInitiateGrantInstance[] {
  const grants: MagicInitiateGrantInstance[] = [];
  const background = unitLibrary.getUnit(build.background);
  if (Option.isSome(background)) {
    const projection = projectCharacterDefinition(background.value);
    if (
      projection.tag === "readable" &&
      projection.value.kind === "background"
    ) {
      const grant = magicInitiateGrantInstance(
        projection.value.facts.originFeatId,
        unitLibrary,
      );
      if (grant !== undefined) grants.push(grant);
    }
  }
  for (const featUnitId of characterBuildSpeciesOriginFeatUnitIds({
    species: build.species,
    features: build.features,
    unitLibrary,
  })) {
    const grant = magicInitiateGrantInstance(featUnitId, unitLibrary);
    if (grant !== undefined) grants.push(grant);
  }
  return grants;
}

function magicInitiateGrantInstance(
  featUnitId: UnitRecord["id"],
  unitLibrary: UnitCatalog,
): MagicInitiateGrantInstance | undefined {
  const feat = unitLibrary.getUnit(featUnitId);
  if (Option.isNone(feat)) return undefined;
  const facts = readMagicInitiateSpellAccessSourceFacts(feat.value);
  return facts.tag === "readable"
    ? { featUnitId, spellList: facts.value.spellList }
    : undefined;
}

function hasDuplicateValues<T>(values: readonly T[]): boolean {
  return new Set(values).size !== values.length;
}

function isMagicInitiateAbility(
  value: unknown,
): value is MagicInitiateSpellAccessSourceFacts["spellcastingAbilityOptions"][number] {
  return MAGIC_INITIATE_SPELLCASTING_ABILITY_OPTIONS.some(
    (ability) => ability === value,
  );
}

function isMagicInitiateSpellAccessInput(value: unknown): value is {
  readonly featUnitId: string;
  readonly spellcastingAbility: MagicInitiateAbility;
  readonly cantrips: readonly [string, string];
  readonly levelOneSpell: string;
} {
  return (
    isRecord(value) &&
    hasExactKeys(value, [
      "featUnitId",
      "spellcastingAbility",
      "cantrips",
      "levelOneSpell",
    ]) &&
    typeof value.featUnitId === "string" &&
    isMagicInitiateAbility(value.spellcastingAbility) &&
    isMagicInitiateCantripPair(value.cantrips) &&
    typeof value.levelOneSpell === "string"
  );
}

function isMagicInitiateCantripPair(
  value: unknown,
): value is readonly [string, string] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "string" &&
    typeof value[1] === "string"
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): boolean {
  const expected = new Set(keys);
  return (
    Object.keys(value).length === expected.size &&
    Object.keys(value).every((key) => expected.has(key))
  );
}
