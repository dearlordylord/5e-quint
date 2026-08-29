// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.species-lineage-trait-projection
import { Result, Option } from "effect";
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
import { projectCharacterDefinition } from "./character-definition-projection.ts";

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
}): Result.Result<
  CharacterBuildGnomishLineageTraitProjection | undefined,
  CharacterBuildGnomishLineageTraitProjectionIssue
> {
  const selection = input.build.speciesChoiceFacts?.gnomishLineage;
  if (selection === undefined) {
    return Result.succeed(undefined);
  }

  const source = gnomishLineageSourceForBuild(input);
  if (Result.isFailure(source)) {
    return Result.fail(source.failure);
  }

  const option = source.success.mechanics.options.find(
    (candidate) => candidate.id === selection.lineageId,
  );
  /* v8 ignore start -- @preserve -- The admitted lineage id came from this exact installed option roster. */
  if (option === undefined) {
    return projectionIssue(
      "Selected Gnomish Lineage id is absent from the selected species trait Surface options.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- The admitted spellcasting ability came from this exact installed ability roster. */
  if (
    !source.success.mechanics.spellcastingAbilityChoice.abilities.some(
      (ability) => ability === selection.spellcastingAbility,
    )
  ) {
    return projectionIssue(
      "Selected Gnomish Lineage spellcasting ability is absent from the selected species trait Surface options.",
    );
  }
  /* v8 ignore stop -- @preserve */

  return Result.succeed({
    traitUnitId: source.success.traitUnitId,
    spellcastingAbility: selection.spellcastingAbility,
    option,
  });
}

function gnomishLineageSourceForBuild(input: {
  readonly build: Pick<CharacterBuild, "species">;
  readonly unitLibrary: UnitCatalog;
}): Result.Result<
  GnomishLineageSource,
  CharacterBuildGnomishLineageTraitProjectionIssue
> {
  const speciesUnit = input.unitLibrary.getUnit(input.build.species);
  if (Option.isNone(speciesUnit)) {
    return projectionIssue(
      "Selected Gnomish Lineage requires an installed species Unit.",
    );
  }

  const speciesProjection = projectCharacterDefinition(speciesUnit.value);
  if (
    speciesProjection.tag !== "readable" ||
    speciesProjection.value.kind !== "species"
  ) {
    return projectionIssue(
      "Selected Gnomish Lineage requires a readable species Unit.",
    );
  }

  const sources = Object.values(speciesProjection.value.facts.traits).flatMap(
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
  /* v8 ignore start -- @preserve -- Support admission retains exactly one installed Gnomish Lineage trait source for a lineage selection. */
  if (sources.length !== 1) {
    return projectionIssue(
      sources.length === 0
        ? "Selected Gnomish Lineage requires one species lineage choice trait Unit."
        : "Selected Gnomish Lineage cannot project from multiple species lineage choice trait Units.",
    );
  }
  /* v8 ignore stop -- @preserve */

  return Result.succeed(sources[0]);
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
): Result.Result<never, CharacterBuildGnomishLineageTraitProjectionIssue> {
  return Result.fail({ tag: "gnomishLineageTraitProjectionIssue", message });
}
