import {
  CHARACTER_CREATION_SUPPORT_PROFILE,
  createCharacterDraft,
} from "@dnd/character-creation-runtime";
import { describe, expect, test } from "vitest";

import { createMcpApplicationServices } from "./composition-root.ts";
import { discoverModelFacingCreationState } from "./model-facing-creation-holes.ts";

describe("model-facing creation holes", () => {
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
        supportedProgressions: [],
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
