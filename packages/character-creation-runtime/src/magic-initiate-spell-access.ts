// KERNEL-COVERAGE: runtime-owner CREATION.MAGIC_INITIATE.CHOICE_FINALIZATION
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import {
  MAGIC_INITIATE_SPELLCASTING_ABILITY_OPTIONS,
  readBackgroundCreationFacts,
  readMagicInitiateSpellAccessSourceFacts,
  readSpeciesCreationFacts,
  type MagicInitiateSpellAccessSourceFacts,
} from "@dnd/surface/surface/character-creation-readers";
import {
  classSpellListForClassName,
  type UnitCatalog,
} from "@dnd/surface/surface/unit-catalog";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { Either, Option } from "effect";

import type {
  CharacterBuild,
  CharacterBuildMagicInitiateSpellAccess,
} from "./types.ts";

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
}): Either.Either<
  readonly CharacterBuildMagicInitiateSpellAccess[],
  readonly [
    CharacterBuildMagicInitiateSpellAccessIssue,
    ...CharacterBuildMagicInitiateSpellAccessIssue[],
  ]
> {
  if (!Array.isArray(input.value)) {
    return Either.left([
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
    if (Either.isLeft(parsed)) issues.push(...parsed.left);
    else accesses.push(parsed.right);
  });

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

  const parsedSpellLists = accesses.flatMap((access) => {
    const grant = magicInitiateGrantInstance(
      access.featUnitId,
      input.unitLibrary,
    );
    return grant === undefined ? [] : [grant.spellList];
  });
  if (hasDuplicateValues(parsedSpellLists)) {
    issues.push({
      message:
        "Character Build Magic Initiate Spell Accesses must use distinct spell lists.",
    });
  }

  const firstIssue = issues[0];
  return firstIssue === undefined
    ? Either.right(accesses)
    : Either.left([firstIssue, ...issues.slice(1)]);
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
  const speciesFacts = readSpeciesCreationFacts(species.value);
  if (speciesFacts.tag !== "readable") return [];

  const originFeatSources = new Set(
    Object.values(speciesFacts.value.traits).flatMap((traitUnitId) => {
      const trait = input.unitLibrary.getUnit(traitUnitId);
      if (
        Option.isNone(trait) ||
        trait.value.kind !== "species_trait" ||
        trait.value.mechanics.family !== "passive"
      ) {
        return [];
      }
      return trait.value.mechanics.grants.some(
        (grant) =>
          grant.kind === "grant_feat" &&
          ("category" in grant
            ? grant.category === "origin"
            : grant.categories.includes("origin")),
      )
        ? [trait.value.id]
        : [];
    }),
  );

  return input.features.flatMap((feature) => {
    if (
      feature.kind !== "selectedClassChoice" ||
      !originFeatSources.has(feature.selectedFromUnitId)
    ) {
      return [];
    }
    const selected = input.unitLibrary.getUnit(feature.unitId);
    return Option.isSome(selected) &&
      selected.value.kind === "feat" &&
      selected.value.category === "origin"
      ? [selected.value.id]
      : [];
  });
}

function parseMagicInitiateSpellAccessEntry(input: {
  readonly value: unknown;
  readonly index: number;
  readonly grantInstances: readonly MagicInitiateGrantInstance[];
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  CharacterBuildMagicInitiateSpellAccess,
  readonly [
    CharacterBuildMagicInitiateSpellAccessIssue,
    ...CharacterBuildMagicInitiateSpellAccessIssue[],
  ]
> {
  const issues: CharacterBuildMagicInitiateSpellAccessIssue[] = [];
  if (!isMagicInitiateSpellAccessInput(input.value)) {
    return Either.left([
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
    if (
      spellList === undefined ||
      cantrips[0] === cantrips[1] ||
      !cantrips.every((spellId) => spellList.cantrips.includes(spellId))
    ) {
      issues.push({
        index: input.index,
        message:
          "Magic Initiate cantrips must be two distinct cantrips from the selected spell list.",
      });
    }
    if (
      spellList === undefined ||
      !spellList.leveled.some(
        (spell) => spell.spellId === levelOneSpell && spell.spellLevel === 1,
      )
    ) {
      issues.push({
        index: input.index,
        message:
          "Magic Initiate level-1 spell must come from the selected spell list.",
      });
    }
  }

  const firstIssue = issues[0];
  if (firstIssue !== undefined)
    return Either.left([firstIssue, ...issues.slice(1)]);
  return Either.right({
    featUnitId,
    spellcastingAbility: input.value.spellcastingAbility,
    cantrips,
    levelOneSpell,
  });
}

function magicInitiateGrantInstances(
  build: MagicInitiateSpellAccessBuildContext,
  unitLibrary: UnitCatalog,
): readonly MagicInitiateGrantInstance[] {
  const grants: MagicInitiateGrantInstance[] = [];
  const background = unitLibrary.getUnit(build.background);
  if (Option.isSome(background)) {
    const facts = readBackgroundCreationFacts(background.value);
    if (facts.tag === "readable") {
      const grant = magicInitiateGrantInstance(
        facts.value.originFeatId,
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
    Array.isArray(value.cantrips) &&
    value.cantrips.length === 2 &&
    typeof value.cantrips[0] === "string" &&
    typeof value.cantrips[1] === "string" &&
    typeof value.levelOneSpell === "string"
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
