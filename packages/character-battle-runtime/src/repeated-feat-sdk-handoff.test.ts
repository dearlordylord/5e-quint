import { parseCharacterBuild } from "../../character-sheet-runtime/src/stored-sheet-parser.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection FEATURE-566 fighter_additional_fighting_style
// KERNEL-COVERAGE: parity-witness CREATION.FEAT_GRANT_OCCURRENCE.CHOICE_LIFECYCLE
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-creation.feat-grant-occurrences
import { combatantId } from "@dnd/battle-runtime";
import { characterClassLevel, unitId } from "@dnd/shared/game-facts";
import { Result } from "effect";
import { describe, expect, test } from "vitest";
import {
  advanceCharacterBuildClassLevel,
  classUnitIdFromUnitId,
  creationChoiceOptionId,
  fighterLevelGainWithFightingStyleReplacement,
} from "@dnd/character-creation-runtime";
import {
  buildFor,
  unitLibrary,
} from "../../character-creation-runtime/src/repeated-feat-grants.test-support.ts";
import {
  characterSheet,
  battleSessionFromSheets,
  requireCharacterCombatant,
} from "./sdk-integration.test-support.ts";
import { settleCharacterSheetFromBattle } from "./index.ts";

function success<A, E>(result: Result.Result<A, E>): A {
  if (Result.isFailure(result)) throw new Error(JSON.stringify(result.failure));
  return result.success;
}
describe("repeated feat grant SDK handoff", () => {
  test("Fighter5 gains level6 ASI and Champion7 style; level8 replaces primary style", () => {
    const fighter = success(
      classUnitIdFromUnitId({
        unitLibrary,
        classUnitId: unitId("class_fighter"),
      }),
    );
    const baseGain = {
      tag: "classLevelGain",
      classUnitId: fighter,
      hitPointRule: { tag: "fixedHigherLevelGain" },
    } as const;
    const six = success(
      advanceCharacterBuildClassLevel({
        build: buildFor("fighter", 5),
        unitLibrary,
        levelGain: {
          ...baseGain,
          gainedChoices: [
            {
              kind: "feat",
              featureUnitId: unitId("fighter_ability_score_improvement_l4"),
              grantLevel: characterClassLevel(6),
              selectedFeatUnitId: unitId("feat_ability_score_improvement"),
              abilityScoreIncreaseOptionId: creationChoiceOptionId(
                "ability_score:con:+2:max20",
              ),
            },
          ],
        },
      }),
    );
    const build = success(
      advanceCharacterBuildClassLevel({
        build: six,
        unitLibrary,
        levelGain: {
          ...baseGain,
          gainedChoices: [
            {
              kind: "feat",
              featureUnitId: unitId("fighter_additional_fighting_style"),
              grantLevel: characterClassLevel(7),
              selectedFeatUnitId: unitId("feat_archery"),
            },
          ],
        },
      }),
    );
    expect(build.abilityScores.con).toBe(17);
    const actorId = combatantId("combatant:additional-style-sdk");
    const sheet = characterSheet({
      characterIdText: "character:additional-style-sdk",
      combatantId: actorId,
      build,
      initiative: 20,
      unitLibrary,
    });
    expect(sheet.sheet.build.features).toEqual(
      expect.arrayContaining([
        {
          kind: "selectedClassChoice",
          unitId: "defense",
          selectedFromUnitId: "fighter_fighting_style",
        },
        {
          kind: "selectedClassChoice",
          unitId: "feat_archery",
          selectedFromUnitId: "fighter_additional_fighting_style",
        },
      ]),
    );
    const session = battleSessionFromSheets({
      battleIdText: "battle:additional-style-sdk",
      characters: [sheet],
      monsters: [],
    });
    const actor = requireCharacterCombatant(session.state, actorId);
    const settled = success(
      settleCharacterSheetFromBattle({
        sheet: sheet.sheet,
        combatantId: actor.combatantId,
        unitLibrary,
        battleSession: session,
      }),
    );
    expect(settled.build.features).toEqual(sheet.sheet.build.features);
    const replacement = success(
      fighterLevelGainWithFightingStyleReplacement({
        ...baseGain,
        unitLibrary,
        selectedFeatUnitId: unitId("feat_great_weapon_fighting"),
      }),
    );
    const eight = success(
      advanceCharacterBuildClassLevel({
        build: settled.build,
        unitLibrary,
        levelGain: {
          ...replacement,
          gainedChoices: [
            {
              kind: "feat",
              featureUnitId: unitId("fighter_ability_score_improvement_l4"),
              grantLevel: characterClassLevel(8),
              selectedFeatUnitId: unitId("feat_ability_score_improvement"),
              abilityScoreIncreaseOptionId: creationChoiceOptionId(
                "ability_score:con:+2:max20",
              ),
            },
          ],
        },
      }),
    );
    expect(
      success(
        parseCharacterBuild(JSON.parse(JSON.stringify(eight)), unitLibrary),
      ).features,
    ).toEqual(eight.features);
    const erased = {
      ...eight,
      features: eight.features.map((feature) => {
        if (
          feature.kind !== "selectedClassChoice" ||
          feature.selectedFromGrantLevel !== 8
        )
          return feature;
        const { selectedFromGrantLevel: omitted, ...selection } = feature;
        void omitted;
        return selection;
      }),
    };
    expect(Result.isFailure(parseCharacterBuild(erased, unitLibrary))).toBe(
      true,
    );
    expect(eight.features).toEqual(
      expect.arrayContaining([
        {
          kind: "selectedClassChoice",
          unitId: "feat_great_weapon_fighting",
          selectedFromUnitId: "fighter_fighting_style",
        },
        {
          kind: "selectedClassChoice",
          unitId: "feat_archery",
          selectedFromUnitId: "fighter_additional_fighting_style",
        },
      ]),
    );
  });
});
