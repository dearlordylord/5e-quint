// KERNEL-COVERAGE: runtime-owner SHEET.ABILITY_CHECK.PROFICIENCY_BONUS
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.ability-check-proficiency-bonus
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.ability-check-ability-substitution
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.jump-distance-ability-substitution
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.linked-speed-grant-projection
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import {
  characterBuildFeatureUnitIds,
  characterBuildProficiencies,
  characterCreationIssueMessage,
  computeTotalLevel,
  type CharacterBuild,
  type UnitCatalog,
} from "@dnd/character-creation-runtime";
import {
  characterLevel,
  proficiencyBonusForCharacterLevel,
  type CharacterLevel,
  type ProficiencyBonus,
} from "@dnd/shared/types";
import type { PassiveMechanics, UnitRecord } from "@dnd/surface/surface/types";
import { Result, Match, Option } from "effect";

import { projectCharacterSheetClassFeature } from "./character-feature-projection.ts";
import {
  JACK_OF_ALL_TRADES_PROFICIENCY_BONUS_DIVISOR,
  characterSheetIssue,
  getRequiredUnit,
  type CharacterSheetAbilityCheckAbility,
  type CharacterSheetAbilityCheckAbilityInput,
  type CharacterSheetAbilityCheckAbilitySubstitution,
  type CharacterSheetAbilityCheckProficiencyBonusProjection,
  type CharacterSheetAbilityCheckProficiencyBonus,
  type CharacterSheetAbilityCheckProficiencyBonusInput,
  type CharacterSheetIssue,
  type CharacterSheetJumpDistanceAbility,
  type CharacterSheetJumpDistanceAbilityInput,
  type CharacterSheetJumpDistanceAbilitySubstitution,
  type CharacterSheetLinkedSpeedGrant,
} from "./sheet-types.ts";

const CHARACTER_SHEET_ABILITY_CHECK_PROFICIENCY_BONUS_ROUTE_EVENT = {
  kind: "projectCharacterSheetFacts",
  subject: "abilityCheckProjection",
  owner: "buildProjection",
} as const;

export function characterSheetProficiencyBonusForCharacterLevel(
  totalLevel: CharacterLevel,
): ProficiencyBonus {
  return proficiencyBonusForCharacterLevel(totalLevel);
}

export function characterSheetAbilityCheckProficiencyBonus(
  input: CharacterSheetAbilityCheckProficiencyBonusInput,
): Result.Result<
  CharacterSheetAbilityCheckProficiencyBonus,
  CharacterSheetIssue
> {
  const proficiencies = characterBuildProficiencies(
    input.build,
    input.unitLibrary,
  );
  /* v8 ignore start -- @preserve -- A proficiency projection failure means the parsed build and Unit catalog no longer correlate. */
  if (Result.isFailure(proficiencies)) {
    return characterSheetIssue(
      proficiencies.failure.map(characterCreationIssueMessage).join("; "),
    );
  }
  /* v8 ignore stop -- @preserve */

  const proficiencyBonus = characterSheetProficiencyBonusForCharacterLevel(
    characterLevel(computeTotalLevel(input.build.progression)),
  );
  if (proficiencies.success.expertise.includes(input.skill)) {
    return Result.succeed({
      tag: "expertise",
      skill: input.skill,
      bonus: proficiencyBonus * 2,
    });
  }
  if (proficiencies.success.skills.includes(input.skill)) {
    return Result.succeed({
      tag: "skillProficiency",
      skill: input.skill,
      bonus: proficiencyBonus,
    });
  }
  const jackOfAllTradesUnitId = characterBuildJackOfAllTradesFeatureUnitId(
    input.build,
    input.unitLibrary,
  );
  /* v8 ignore start -- @preserve -- Jack of All Trades lookup failure means a build-owned feature id no longer resolves in its Unit catalog. */
  if (Result.isFailure(jackOfAllTradesUnitId)) {
    return Result.fail(jackOfAllTradesUnitId.failure);
  }
  /* v8 ignore stop -- @preserve */
  return Match.value(input.otherProficiencyBonus).pipe(
    Match.when({ tag: "otherProficiencyBonusApplies" }, () =>
      Result.succeed({
        tag: "none" as const,
        bonus: 0 as const,
      }),
    ),
    Match.when({ tag: "noOtherProficiencyBonus" }, () =>
      jackOfAllTradesUnitId.success !== undefined
        ? Result.succeed({
            tag: "jackOfAllTrades" as const,
            sourceUnitId: jackOfAllTradesUnitId.success,
            skill: input.skill,
            bonus: Math.floor(
              proficiencyBonus / JACK_OF_ALL_TRADES_PROFICIENCY_BONUS_DIVISOR,
            ),
          })
        : Result.succeed({
            tag: "none" as const,
            bonus: 0 as const,
          }),
    ),
    Match.exhaustive,
  );
}

export function characterSheetAbilityCheckProficiencyBonusProjection(
  input: CharacterSheetAbilityCheckProficiencyBonusInput,
): Result.Result<
  CharacterSheetAbilityCheckProficiencyBonusProjection,
  CharacterSheetIssue
> {
  return Result.map(
    characterSheetAbilityCheckProficiencyBonus(input),
    (proficiencyBonus) => ({
      proficiencyBonus,
      qRoute: [
        CHARACTER_SHEET_ABILITY_CHECK_PROFICIENCY_BONUS_ROUTE_EVENT,
      ] as const,
    }),
  );
}

export function characterSheetAbilityCheckAbility(
  input: CharacterSheetAbilityCheckAbilityInput,
): Result.Result<CharacterSheetAbilityCheckAbility, CharacterSheetIssue> {
  const optionalSubstitutions: CharacterSheetAbilityCheckAbilitySubstitution[] =
    [];
  const activeFeatureUnitIds = new Set(input.activeFeatureUnitIds);

  for (const feature of characterSheetClassFeatureComponents(
    input.build,
    input.unitLibrary,
  )) {
    /* v8 ignore next -- @preserve -- Malformed build/catalog correlation: the shared component iterator can fail only when an admitted feature id no longer resolves. */
    if (Result.isFailure(feature)) return Result.fail(feature.failure);
    for (const grant of feature.success.mechanics.grants) {
      if (
        grant.kind !== "offer_ability_substitution_for_ability_checks" ||
        !grant.skillFilter.skills.includes(input.skill)
      ) {
        continue;
      }
      if (
        grant.requiredActiveFeature !== undefined &&
        !activeFeatureUnitIds.has(
          authoredUnitId(grant.requiredActiveFeature.unitId),
        )
      ) {
        continue;
      }
      optionalSubstitutions.push({
        ability: grant.use,
        sourceUnitId: feature.success.unitId,
        ...(grant.requiredActiveFeature === undefined
          ? {}
          : {
              requiredActiveFeatureUnitId: authoredUnitId(
                grant.requiredActiveFeature.unitId,
              ),
            }),
      });
    }
  }

  return Result.succeed({
    defaultAbility: input.defaultAbility,
    optionalSubstitutions,
  });
}

export function characterSheetJumpDistanceAbility(
  input: CharacterSheetJumpDistanceAbilityInput,
): Result.Result<CharacterSheetJumpDistanceAbility, CharacterSheetIssue> {
  const optionalSubstitutions: CharacterSheetJumpDistanceAbilitySubstitution[] =
    [];

  for (const feature of characterSheetClassFeatureComponents(
    input.build,
    input.unitLibrary,
  )) {
    /* v8 ignore next -- @preserve -- Malformed build/catalog correlation: the shared component iterator can fail only when an admitted feature id no longer resolves. */
    if (Result.isFailure(feature)) return Result.fail(feature.failure);
    for (const grant of feature.success.mechanics.grants) {
      if (
        grant.kind === "offer_ability_substitution_for_jump_distance" &&
        grant.replaces === input.defaultAbility
      ) {
        optionalSubstitutions.push({
          ability: grant.use,
          replaces: grant.replaces,
          sourceUnitId: feature.success.unitId,
        });
      }
    }
  }

  return Result.succeed({
    defaultAbility: input.defaultAbility,
    optionalSubstitutions,
  });
}

export function characterSheetLinkedSpeedGrants(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Result.Result<
  readonly CharacterSheetLinkedSpeedGrant[],
  CharacterSheetIssue
> {
  const grants: CharacterSheetLinkedSpeedGrant[] = [];
  for (const feature of characterSheetClassFeatureComponents(
    build,
    unitLibrary,
  )) {
    /* v8 ignore next -- @preserve -- Malformed build/catalog correlation: the shared component iterator can fail only when an admitted feature id no longer resolves. */
    if (Result.isFailure(feature)) return Result.fail(feature.failure);
    for (const grant of feature.success.mechanics.grants) {
      if (grant.kind !== "grant_speed") continue;
      grants.push({
        sourceUnitId: feature.success.unitId,
        speedKind: grant.speedKind,
        feet: grant.feet,
      });
    }
  }
  return Result.succeed(grants);
}

function* characterSheetClassFeatureComponents(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Generator<
  Result.Result<
    {
      readonly unitId: UnitRecord["id"];
      readonly mechanics: PassiveMechanics;
    },
    CharacterSheetIssue
  >
> {
  for (const unitId of characterBuildFeatureUnitIds(build, unitLibrary)) {
    const unit = getRequiredUnit(unitLibrary, unitId);
    /* v8 ignore start -- @preserve -- Build-owned feature ids must resolve in the same Unit catalog used to derive the feature roster. */
    if (Result.isFailure(unit)) {
      yield Result.fail(unit.failure);
      continue;
    }
    /* v8 ignore stop -- @preserve */
    const feature = projectCharacterSheetClassFeature(unit.success);
    if (Option.isNone(feature)) continue;
    if (feature.value.mechanics.family === "composite") {
      for (const part of feature.value.mechanics.parts) {
        if (part.family !== "passive") continue;
        yield Result.succeed({ unitId, mechanics: part });
      }
      continue;
    }
    if (feature.value.mechanics.family === "passive") {
      yield Result.succeed({
        unitId,
        mechanics: feature.value.mechanics,
      });
    }
  }
}

function characterBuildJackOfAllTradesFeatureUnitId(
  build: Pick<CharacterBuild, "progression" | "features">,
  unitLibrary: UnitCatalog,
): Result.Result<UnitRecord["id"] | undefined, CharacterSheetIssue> {
  for (const unitId of characterBuildFeatureUnitIds(build, unitLibrary)) {
    const unit = getRequiredUnit(unitLibrary, unitId);
    /* v8 ignore next -- @preserve -- Malformed build/catalog correlation: Jack of All Trades lookup receives feature ids already admitted from this catalog. */
    if (Result.isFailure(unit)) return Result.fail(unit.failure);
    const feature = projectCharacterSheetClassFeature(unit.success);
    if (
      Option.isSome(feature) &&
      feature.value.mechanics.family === "passive" &&
      feature.value.mechanics.grants.some(
        (grant) => grant.kind === "jack_of_all_trades_ability_check_bonus",
      )
    ) {
      return Result.succeed(unitId);
    }
  }
  return Result.succeed(undefined);
}
