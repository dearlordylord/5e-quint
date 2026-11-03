import assert from "node:assert/strict";
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { testProgression } from "@dnd/character-creation-runtime/test-support";
import {
  CHARACTER_CREATION_SUPPORT_PROFILE,
  createCharacterDraft,
  creationChoiceOptionId,
  fillCreationHoles,
  PHASE1_CLASS_FIGHTER_UNIT_ID,
  WEAPON_MASTERY_OPTIONS_CHOICE_KEY,
} from "@dnd/character-creation-runtime";
import { describe, expect, test } from "vitest";

import { createMcpApplicationServices } from "./composition-root.ts";
import { discoverModelFacingCreationState } from "./model-facing-creation-holes.ts";

describe("model-facing creation holes", () => {
  test.each(["weapon_dagger", "weapon_shortsword"])(
    "does not advertise or accept unsupported mastery %s",
    (weaponUnitId) => {
      const services = createMcpApplicationServices();
      const base = createCharacterDraft({ unitLibrary: services.unitLibrary });
      const draft = {
        ...base,
        selections: {
          ...base.selections,
          progression: testProgression(
            services.unitLibrary,
            authoredUnitId(PHASE1_CLASS_FIGHTER_UNIT_ID),
            1,
          ),
        },
      };
      const projected = discoverModelFacingCreationState({
        draft,
        unitLibrary: services.unitLibrary,
        supportProfile: services.characterCreationSupportProfile,
      });
      assert(projected.tag === "projected");
      const mastery = projected.value.holes.find(
        (hole) =>
          hole.source.tag === "unitChoice" &&
          hole.source.choiceKey === WEAPON_MASTERY_OPTIONS_CHOICE_KEY,
      );
      assert(mastery?.kind === "choice");
      expect(mastery.options.map(({ optionId }) => optionId)).not.toContain(
        weaponUnitId,
      );
      expect(mastery.options.length).toBeGreaterThanOrEqual(3);
      expect(
        fillCreationHoles({
          draft,
          expectedRevision: draft.revision,
          unitLibrary: services.unitLibrary,
          supportProfile: services.characterCreationSupportProfile,
          fills: [
            {
              kind: "choice",
              holeId: mastery.holeId,
              optionIds: ["weapon_flail", "weapon_spear", weaponUnitId].map(
                creationChoiceOptionId,
              ),
            },
          ],
        }),
      ).toMatchObject({
        tag: "rejected",
        issues: expect.arrayContaining([
          expect.objectContaining({ code: "unsupportedChoice" }),
        ]),
      });
    },
  );

  test("rejects a support profile that cannot satisfy a required hole", () => {
    const services = createMcpApplicationServices({
      characterCreationSupportProfile: {
        ...CHARACTER_CREATION_SUPPORT_PROFILE,
        backgroundUnitIds: [],
      },
    });
    const draft = createCharacterDraft({ unitLibrary: services.unitLibrary });

    expect(
      discoverModelFacingCreationState({
        draft,
        unitLibrary: services.unitLibrary,
        supportProfile: services.characterCreationSupportProfile,
      }),
    ).toMatchObject({
      tag: "invalidSupportProfile",
      issues: [
        {
          tag: "supportedOptionsBelowMinimum",
          holeId: "cc:draft:draft.background",
          minimum: 1,
          supportedOptionCount: 0,
        },
      ],
    });
  });

  test("reports every independently unsatisfied required hole", () => {
    const services = createMcpApplicationServices({
      characterCreationSupportProfile: {
        ...CHARACTER_CREATION_SUPPORT_PROFILE,
        backgroundUnitIds: [],
        progressionCapabilities: {
          singleClassLevelFrontiers: [],
          firstMulticlassLevelGains: [],
        },
      },
    });
    const draft = createCharacterDraft({ unitLibrary: services.unitLibrary });

    expect(
      discoverModelFacingCreationState({
        draft,
        unitLibrary: services.unitLibrary,
        supportProfile: services.characterCreationSupportProfile,
      }),
    ).toMatchObject({
      tag: "invalidSupportProfile",
      issues: [
        { holeId: "cc:draft:draft.progression.initial" },
        { holeId: "cc:draft:draft.background" },
      ],
    });
  });
});
