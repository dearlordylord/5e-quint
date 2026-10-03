// RAW: .references/srd-5.2.1/classes.md:6825-6832.
import { Option, Result } from "effect";
import { expect, test } from "vitest";
import { unitId } from "@dnd/shared/game-facts";
import { Hp } from "@dnd/shared/types";
import { buildFor } from "../../character-creation-runtime/src/repeated-feat-grants.test-support.ts";
import {
  characterSheetId,
  completeShortRest,
  completeLongRest,
  createFreshCharacterSheet,
  requireSuccess,
  unitLibrary,
} from "./test-support.test-support.ts";
import { projectFixtureCatalog } from "./class-feature-catalog.test-support.ts";

test("both completed rests replace only the earned Ranger defense option", () => {
  const sheet = requireSuccess(
    createFreshCharacterSheet({
      characterId: characterSheetId("character:defense-rest"),
      build: buildFor("ranger", 7),
      unitLibrary,
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      conditions: [],
    }),
  );
  const featureUnitId = unitId("ranger_defensive_tactics");
  expect(sheet.build.features).toContainEqual({
    kind: "selectedClassChoice",
    unitId: featureUnitId,
    selectedFromUnitId: featureUnitId,
    selectedOption: {
      kind: "attackRollDefense",
      selection: "opportunityAttackDisadvantage",
    },
  });
  const replacement = {
    featureUnitId,
    selectedOption: {
      kind: "attackRollDefense",
      selection: "repeatAttackerAfterHitDisadvantage",
    },
  } as const;
  for (const rest of [completeShortRest, completeLongRest]) {
    const next = requireSuccess(
      rest({ sheet, unitLibrary, attackRollDefenseReplacement: replacement }),
    );
    expect(next.build.features).toEqual(
      sheet.build.features.map((feature) =>
        feature.kind === "selectedClassChoice" &&
        feature.unitId === featureUnitId
          ? { ...feature, selectedOption: replacement.selectedOption }
          : feature,
      ),
    );
    expect(next.build.progression).toEqual(sheet.build.progression);
    expect(next.build.spellcasting).toEqual(sheet.build.spellcasting);
    const forged = rest({
      sheet,
      unitLibrary,
      attackRollDefenseReplacement: {
        ...replacement,
        featureUnitId: unitId("fighter_fighting_style"),
      },
    });
    expect(forged).toMatchObject({
      _tag: "Failure",
      failure: {
        message:
          "Attack Roll Defense replacement requires exactly one owned selected option.",
      },
    });
    const catalog = projectFixtureCatalog(unitLibrary, (unit) =>
      unit.id === featureUnitId ? Option.none() : Option.some(unit),
    );
    expect(
      rest({
        sheet,
        unitLibrary: catalog,
        attackRollDefenseReplacement: replacement,
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: {
        message:
          "Attack Roll Defense replacement requires admitted rest-replaceable choice mechanics.",
      },
    });
  }
  expect(Result.isSuccess(completeShortRest({ sheet, unitLibrary }))).toBe(
    true,
  );
});
