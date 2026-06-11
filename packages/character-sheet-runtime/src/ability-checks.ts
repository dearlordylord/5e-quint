// KERNEL-COVERAGE: runtime-owner SHEET.ABILITY_CHECK.PROFICIENCY_BONUS
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.ability-check-proficiency-bonus
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.ability-check-ability-substitution
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.jump-distance-ability-substitution
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.linked-speed-grant-projection
import {
  characterBuildFeatureUnitIds,
  characterBuildProficiencies,
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
import { Either, Match } from "effect";

import {
  JACK_OF_ALL_TRADES_PROFICIENCY_BONUS_DIVISOR,
  characterSheetIssue,
  getRequiredUnit,
  type CharacterSheetAbilityCheckAbility,
  type CharacterSheetAbilityCheckAbilityInput,
  type CharacterSheetAbilityCheckAbilitySubstitution,
  type CharacterSheetAbilityCheckProficiencyBonus,
  type CharacterSheetAbilityCheckProficiencyBonusInput,
  type CharacterSheetIssue,
  type CharacterSheetJumpDistanceAbility,
  type CharacterSheetJumpDistanceAbilityInput,
  type CharacterSheetJumpDistanceAbilitySubstitution,
  type CharacterSheetLinkedSpeedGrant,
} from "./sheet-types.ts";

export function characterSheetProficiencyBonusForCharacterLevel(
  totalLevel: CharacterLevel,
): ProficiencyBonus {
  return proficiencyBonusForCharacterLevel(totalLevel);
}

export function characterSheetAbilityCheckProficiencyBonus(
  input: CharacterSheetAbilityCheckProficiencyBonusInput,
): Either.Either<
  CharacterSheetAbilityCheckProficiencyBonus,
  CharacterSheetIssue
> {
  const proficiencies = characterBuildProficiencies(
    input.build,
    input.unitLibrary,
  );
  if (Either.isLeft(proficiencies)) {
    return characterSheetIssue(
      proficiencies.left.map((issue) => issue.message).join("; "),
    );
  }

  const proficiencyBonus = characterSheetProficiencyBonusForCharacterLevel(
    characterLevel(computeTotalLevel(input.build.progression)),
  );
  if (proficiencies.right.expertise.includes(input.skill)) {
    return Either.right({
      tag: "expertise",
      skill: input.skill,
      bonus: proficiencyBonus * 2,
    });
  }
  if (proficiencies.right.skills.includes(input.skill)) {
    return Either.right({
      tag: "skillProficiency",
      skill: input.skill,
      bonus: proficiencyBonus,
    });
  }
  const jackOfAllTradesUnitId = characterBuildJackOfAllTradesFeatureUnitId(
    input.build,
    input.unitLibrary,
  );
  if (Either.isLeft(jackOfAllTradesUnitId)) {
    return Either.left(jackOfAllTradesUnitId.left);
  }
  return Match.value(input.otherProficiencyBonus).pipe(
    Match.when({ tag: "otherProficiencyBonusApplies" }, () =>
      Either.right({
        tag: "none" as const,
        bonus: 0 as const,
      }),
    ),
    Match.when({ tag: "noOtherProficiencyBonus" }, () =>
      jackOfAllTradesUnitId.right !== undefined
        ? Either.right({
            tag: "jackOfAllTrades" as const,
            sourceUnitId: jackOfAllTradesUnitId.right,
            skill: input.skill,
            bonus: Math.floor(
              proficiencyBonus / JACK_OF_ALL_TRADES_PROFICIENCY_BONUS_DIVISOR,
            ),
          })
        : Either.right({
            tag: "none" as const,
            bonus: 0 as const,
          }),
    ),
    Match.exhaustive,
  );
}

export function characterSheetAbilityCheckAbility(
  input: CharacterSheetAbilityCheckAbilityInput,
): Either.Either<CharacterSheetAbilityCheckAbility, CharacterSheetIssue> {
  const optionalSubstitutions: CharacterSheetAbilityCheckAbilitySubstitution[] =
    [];
  const activeFeatureUnitIds = new Set(input.activeFeatureUnitIds);

  for (const feature of characterSheetClassFeatureComponents(
    input.build,
    input.unitLibrary,
  )) {
    if (Either.isLeft(feature)) return Either.left(feature.left);
    for (const grant of feature.right.mechanics.grants) {
      if (
        grant.kind !== "offer_ability_substitution_for_ability_checks" ||
        !grant.skillFilter.skills.includes(input.skill)
      ) {
        continue;
      }
      if (
        grant.requiredActiveFeature !== undefined &&
        !activeFeatureUnitIds.has(grant.requiredActiveFeature.unitId)
      ) {
        continue;
      }
      optionalSubstitutions.push({
        ability: grant.use,
        sourceUnitId: feature.right.unitId,
        ...(grant.requiredActiveFeature === undefined
          ? {}
          : {
              requiredActiveFeatureUnitId: grant.requiredActiveFeature.unitId,
            }),
      });
    }
  }

  return Either.right({
    defaultAbility: input.defaultAbility,
    optionalSubstitutions,
  });
}

export function characterSheetJumpDistanceAbility(
  input: CharacterSheetJumpDistanceAbilityInput,
): Either.Either<CharacterSheetJumpDistanceAbility, CharacterSheetIssue> {
  const optionalSubstitutions: CharacterSheetJumpDistanceAbilitySubstitution[] =
    [];

  for (const feature of characterSheetClassFeatureComponents(
    input.build,
    input.unitLibrary,
  )) {
    if (Either.isLeft(feature)) return Either.left(feature.left);
    for (const grant of feature.right.mechanics.grants) {
      if (
        grant.kind === "offer_ability_substitution_for_jump_distance" &&
        grant.replaces === input.defaultAbility
      ) {
        optionalSubstitutions.push({
          ability: grant.use,
          replaces: grant.replaces,
          sourceUnitId: feature.right.unitId,
        });
      }
    }
  }

  return Either.right({
    defaultAbility: input.defaultAbility,
    optionalSubstitutions,
  });
}

export function characterSheetLinkedSpeedGrants(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<
  readonly CharacterSheetLinkedSpeedGrant[],
  CharacterSheetIssue
> {
  const grants: CharacterSheetLinkedSpeedGrant[] = [];
  for (const feature of characterSheetClassFeatureComponents(
    build,
    unitLibrary,
  )) {
    if (Either.isLeft(feature)) return Either.left(feature.left);
    for (const grant of feature.right.mechanics.grants) {
      if (grant.kind !== "grant_speed") continue;
      grants.push({
        sourceUnitId: feature.right.unitId,
        speedKind: grant.speedKind,
        feet: grant.feet,
      });
    }
  }
  return Either.right(grants);
}

function* characterSheetClassFeatureComponents(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Generator<
  Either.Either<
    {
      readonly unitId: UnitRecord["id"];
      readonly mechanics: PassiveMechanics;
    },
    CharacterSheetIssue
  >
> {
  for (const unitId of characterBuildFeatureUnitIds(build, unitLibrary)) {
    const unit = getRequiredUnit(unitLibrary, unitId);
    if (Either.isLeft(unit)) {
      yield Either.left(unit.left);
      continue;
    }
    if (unit.right.kind !== "class_feature") continue;
    if (unit.right.mechanics.family === "composite") {
      for (const part of unit.right.mechanics.parts) {
        if (part.family !== "passive") continue;
        yield Either.right({ unitId, mechanics: part });
      }
      continue;
    }
    if (unit.right.mechanics.family === "passive") {
      yield Either.right({ unitId, mechanics: unit.right.mechanics });
    }
  }
}

function characterBuildJackOfAllTradesFeatureUnitId(
  build: Pick<CharacterBuild, "progression" | "features">,
  unitLibrary: UnitCatalog,
): Either.Either<UnitRecord["id"] | undefined, CharacterSheetIssue> {
  for (const unitId of characterBuildFeatureUnitIds(build, unitLibrary)) {
    const unit = getRequiredUnit(unitLibrary, unitId);
    if (Either.isLeft(unit)) return Either.left(unit.left);
    if (
      unit.right.kind === "class_feature" &&
      unit.right.mechanics.family === "passive" &&
      unit.right.mechanics.grants.some(
        (grant) => grant.kind === "jack_of_all_trades_ability_check_bonus",
      )
    ) {
      return Either.right(unitId);
    }
  }
  return Either.right(undefined);
}
