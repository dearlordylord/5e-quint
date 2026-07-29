// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.species-lineage-trait-projection
import { Either, Option } from "effect";
import { readSpeciesCreationFacts } from "@dnd/surface/surface/character-creation-readers";
import type {
  GnomishLineageMechanics,
  SpeciesTraitRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import type {
  CharacterBuild,
  CharacterBuildGnomishLineageSpellcastingAbility,
  UnitCatalog,
} from "./types.ts";
import { GNOMISH_LINEAGE_CHOICE_KEY } from "./phase1-manifest.ts";

type GnomishLineageTraitUnit = SpeciesTraitRecord & {
  readonly mechanics: GnomishLineageMechanics;
};

type GnomishLineageSource = {
  readonly traitUnitId: UnitRecord["id"];
  readonly mechanics: GnomishLineageMechanics;
};

export type CharacterBuildGnomishLineageOption =
  GnomishLineageMechanics["options"][number];

export type CharacterBuildGnomishLineageTraitProjection = {
  readonly traitUnitId: UnitRecord["id"];
  readonly spellcastingAbility: CharacterBuildGnomishLineageSpellcastingAbility;
  readonly option: CharacterBuildGnomishLineageOption;
};

export type CharacterBuildGnomishLineageTraitProjectionIssue = {
  readonly tag: "gnomishLineageTraitProjectionIssue";
  readonly message: string;
};

export function characterBuildGnomishLineageTraitProjection(input: {
  readonly build: Pick<CharacterBuild, "species" | "speciesChoiceFacts">;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  CharacterBuildGnomishLineageTraitProjection | undefined,
  CharacterBuildGnomishLineageTraitProjectionIssue
> {
  const selection = input.build.speciesChoiceFacts?.gnomishLineage;
  if (selection === undefined) {
    return Either.right(undefined);
  }

  const source = gnomishLineageSourceForBuild(input);
  if (Either.isLeft(source)) {
    return Either.left(source.left);
  }

  const option = source.right.mechanics.options.find(
    (candidate) => candidate.id === selection.lineageId,
  );
  /* v8 ignore start -- The admitted lineage id came from this exact installed option roster. */
  if (option === undefined) {
    return projectionIssue(
      "Selected Gnomish Lineage id is absent from the selected species trait Surface options.",
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- The admitted spellcasting ability came from this exact installed ability roster. */
  if (
    !source.right.mechanics.spellcastingAbilityChoice.abilities.some(
      (ability) => ability === selection.spellcastingAbility,
    )
  ) {
    return projectionIssue(
      "Selected Gnomish Lineage spellcasting ability is absent from the selected species trait Surface options.",
    );
  }
  /* v8 ignore stop */

  return Either.right({
    traitUnitId: source.right.traitUnitId,
    spellcastingAbility: selection.spellcastingAbility,
    option,
  });
}

function gnomishLineageSourceForBuild(input: {
  readonly build: Pick<CharacterBuild, "species">;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  GnomishLineageSource,
  CharacterBuildGnomishLineageTraitProjectionIssue
> {
  const speciesUnit = input.unitLibrary.getUnit(input.build.species);
  if (Option.isNone(speciesUnit)) {
    return projectionIssue(
      "Selected Gnomish Lineage requires an installed species Unit.",
    );
  }

  const speciesFacts = readSpeciesCreationFacts(speciesUnit.value);
  if (speciesFacts.tag !== "readable") {
    return projectionIssue(
      "Selected Gnomish Lineage requires a readable species Unit.",
    );
  }

  const sources = Object.values(speciesFacts.value.traits).flatMap(
    (traitUnitId): readonly GnomishLineageSource[] => {
      const traitUnit = input.unitLibrary.getUnit(traitUnitId);
      if (
        Option.isNone(traitUnit) ||
        !isGnomishLineageTraitUnit(traitUnit.value)
      ) {
        return [];
      }

      return [
        {
          traitUnitId: traitUnit.value.id,
          mechanics: traitUnit.value.mechanics,
        },
      ];
    },
  );
  /* v8 ignore start -- Support admission retains exactly one installed Gnomish Lineage trait source for a lineage selection. */
  if (sources.length !== 1) {
    return projectionIssue(
      sources.length === 0
        ? "Selected Gnomish Lineage requires one species lineage choice trait Unit."
        : "Selected Gnomish Lineage cannot project from multiple species lineage choice trait Units.",
    );
  }
  /* v8 ignore stop */

  return Either.right(sources[0]);
}

function isGnomishLineageTraitUnit(
  unit: UnitRecord,
): unit is GnomishLineageTraitUnit {
  return (
    unit.kind === "species_trait" &&
    unit.mechanics.family === "species_lineage_choice" &&
    unit.mechanics.choiceKey === GNOMISH_LINEAGE_CHOICE_KEY
  );
}

function projectionIssue(
  message: string,
): Either.Either<never, CharacterBuildGnomishLineageTraitProjectionIssue> {
  return Either.left({ tag: "gnomishLineageTraitProjectionIssue", message });
}
