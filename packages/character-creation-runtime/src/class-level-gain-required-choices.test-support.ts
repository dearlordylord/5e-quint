import { Array as EffectArray, Option, Result } from "effect";
import { characterClassLevel } from "@dnd/shared/game-facts";
import { projectClassDefinitionFacts } from "./character-definition-projection.ts";
import { classLevelForUnit } from "./character-progression-types.ts";
import {
  classFeatureGrantChoiceHoles,
  subclassChoiceHolesAtLevel,
} from "./discovery.ts";
import { characterBuildProficiencies } from "./finalization.ts";
import {
  advanceCharacterBuildClassLevel,
  type CharacterBuildChoiceGain,
} from "./character-build-advancement.ts";
import { creationChoiceOptionId } from "./types.ts";

/** Supply lawful unrelated earned selections while a test varies another gain contract. */
export function advanceWithRequiredClassChoices(
  input: Parameters<typeof advanceCharacterBuildClassLevel>[0],
) {
  if (input.levelGain.gainedChoices !== undefined)
    return advanceCharacterBuildClassLevel(input);
  const owner = input.unitLibrary.getUnit(input.levelGain.classUnitId);
  if (Option.isNone(owner) || owner.value.kind !== "class")
    return advanceCharacterBuildClassLevel(input);
  const level = classLevelForUnit(input.build.progression, owner.value.id) + 1;
  const gains: CharacterBuildChoiceGain[] = [];
  const subclassHoles = subclassChoiceHolesAtLevel({
    classUnitId: owner.value.id,
    classLevel: level,
    facts: {
      ...projectClassDefinitionFacts(owner.value),
      subclassChoices: owner.value.subclassChoices.filter(
        (choice) => choice.level === level,
      ),
    },
    unitLibrary: input.unitLibrary,
  });
  const selectedSubclassIds = input.build.features.flatMap((feature) =>
    feature.kind === "selectedClassChoice" &&
    feature.selectedFromUnitId === owner.value.id
      ? [feature.unitId]
      : [],
  );
  for (const hole of subclassHoles) {
    if (hole.source.tag !== "unitChoice") continue;
    const option = hole.options[0];
    if (option === undefined) continue;
    gains.push({
      kind: "unitChoice",
      featureUnitId: hole.source.unitId,
      choiceKey: hole.source.choiceKey,
      optionIds: [option.optionId],
    });
    if (option.unitRef !== undefined)
      selectedSubclassIds.push(option.unitRef.unitId);
  }
  const subclassGrants = selectedSubclassIds.flatMap((id) => {
    const unit = input.unitLibrary.getUnit(id);
    return Option.isSome(unit) && unit.value.kind === "subclass"
      ? unit.value.featureGrants
      : [];
  });
  const proficiencies = characterBuildProficiencies(
    input.build,
    input.unitLibrary,
  );
  if (Result.isFailure(proficiencies))
    return advanceCharacterBuildClassLevel(input);
  for (const grant of [...owner.value.featureGrants, ...subclassGrants].filter(
    (grant) => grant.level === level,
  )) {
    const holes = classFeatureGrantChoiceHoles(
      grant.unitId,
      input.unitLibrary,
      {
        classLevel: level,
        grantLevel: grant.level,
        ownedSkillProficiencies: proficiencies.success.skills,
        ownedSkillExpertise: proficiencies.success.expertise,
        ownedToolProficiencies: proficiencies.success.tools,
      },
    );
    for (const hole of holes) {
      if (hole.source.tag !== "unitChoice") continue;
      if (hole.source.choiceKey === "class_feature_feat_choice") {
        const feat =
          hole.options.find(
            (option) =>
              option.unitRef?.unitId === "feat_ability_score_improvement",
          ) ?? hole.options[0];
        if (feat?.unitRef === undefined) continue;
        gains.push({
          kind: "feat",
          featureUnitId: grant.unitId,
          grantLevel: characterClassLevel(level),
          selectedFeatUnitId: feat.unitRef.unitId,
          ...(feat.unitRef.unitId === "feat_ability_score_improvement"
            ? {
                abilityScoreIncreaseOptionId: creationChoiceOptionId(
                  "ability_score:wis:+2:max20",
                ),
              }
            : {}),
        });
      } else if (
        [
          "class_feature_proficiency_choice",
          "hunters_prey",
          "attack_roll_defense_choice",
        ].includes(hole.source.choiceKey)
      ) {
        const count =
          hole.cardinality.tag === "exactly"
            ? hole.cardinality.count
            : hole.cardinality.max;
        gains.push({
          kind: "unitChoice",
          featureUnitId: grant.unitId,
          choiceKey: hole.source.choiceKey,
          optionIds: hole.options
            .slice(0, count)
            .map((option) => option.optionId),
        });
      }
    }
  }
  return advanceCharacterBuildClassLevel({
    ...input,
    levelGain: {
      ...input.levelGain,
      ...(EffectArray.isReadonlyArrayNonEmpty(gains)
        ? { gainedChoices: gains }
        : {}),
    },
  });
}
