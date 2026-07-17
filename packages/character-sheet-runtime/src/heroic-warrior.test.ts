// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.fighter-heroic-warrior
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L110D-02-FIGHTER-HEROIC-WARRIOR fighter_heroic_warrior
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L110D-02-FIGHTER-HEROIC-WARRIOR fighter_heroic_warrior
// UNIT-IDENTITY-REPLAY: L110D-02-FIGHTER-HEROIC-WARRIOR fighter_heroic_warrior doUseHeroicWarrior
import { describe, expect, it, test } from "vitest";

import {
  CHARACTER_SHEET_HEROIC_INSPIRATION_AVAILABLE,
  CHARACTER_SHEET_NO_HEROIC_INSPIRATION,
  Hp,
  armorClassBuild,
  characterSheetId,
  rebuildCharacterSheetFixture,
  requireRight,
  unitLibrary,
  useHeroicWarriorAtCombatTurnStart,
} from "./test-support.ts";

export const fighterHeroicWarriorCombatTurnStartTestName =
  "Heroic Warrior grants Heroic Inspiration at combat turn start when absent";
export const fighterHeroicWarriorCombatTurnStartGateTestName =
  "Heroic Warrior rejects missing feature ownership and existing Heroic Inspiration";

const fighterHeroicWarriorSelectedIdentityDriverSchema = {
  doUseHeroicWarrior: {},
} as const;

type FighterHeroicWarriorSelectedIdentityDriverAction =
  keyof typeof fighterHeroicWarriorSelectedIdentityDriverSchema;

type FighterHeroicWarriorSelectedIdentityProjection = {
  readonly unitId: "fighter_heroic_warrior";
  readonly heroicInspiration: "available";
};

type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly FighterHeroicWarriorSelectedIdentityDriverAction[];
  readonly expected: FighterHeroicWarriorSelectedIdentityProjection;
};

type SelectedUnitIdentityReplay = {
  readonly taskId: "L110D-02-FIGHTER-HEROIC-WARRIOR";
  readonly unitId: "fighter_heroic_warrior";
  readonly actions: readonly FighterHeroicWarriorSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L110D-02-FIGHTER-HEROIC-WARRIOR",
    unitId: "fighter_heroic_warrior",
    actions: ["doUseHeroicWarrior"],
    sequences: [
      {
        name: "selected-fighter-heroic-warrior-grants-heroic-inspiration",
        actions: ["doUseHeroicWarrior"],
        expected: {
          unitId: "fighter_heroic_warrior",
          heroicInspiration: "available",
        },
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Character Sheet runtime / Fighter Heroic Warrior", () => {
  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<FighterHeroicWarriorSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        let projection:
          | FighterHeroicWarriorSelectedIdentityProjection
          | undefined;

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          projection = fighterHeroicWarriorSelectedIdentityActions[actionName]();
        }

        expect(projection, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  test(fighterHeroicWarriorCombatTurnStartTestName, () => {
    const sheet = requireRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:heroic-warrior"),
        build: championFighterLevelTenBuild(),
        currentHp: Hp(60),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );

    const next = requireRight(
      useHeroicWarriorAtCombatTurnStart({ sheet, unitLibrary }),
    );

    expect(next.heroicInspiration).toEqual(
      CHARACTER_SHEET_HEROIC_INSPIRATION_AVAILABLE,
    );
  });

  test(fighterHeroicWarriorCombatTurnStartGateTestName, () => {
    const sheet = requireRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:heroic-warrior-gate"),
        build: championFighterLevelTenBuild(),
        currentHp: Hp(60),
        tempHp: Hp(0),
        heroicInspiration: CHARACTER_SHEET_HEROIC_INSPIRATION_AVAILABLE,
        unitLibrary,
      }),
    );

    expect(
      useHeroicWarriorAtCombatTurnStart({ sheet, unitLibrary }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Heroic Warrior requires starting the combat turn without Heroic Inspiration.",
      },
    });

    const noFeatureSheet = requireRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:heroic-warrior-no-feature"),
        build: armorClassBuild({
          startingClass: "class_fighter",
          advancements: Array.from({ length: 9 }, () => "class_fighter"),
        }),
        currentHp: Hp(60),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );

    expect(
      useHeroicWarriorAtCombatTurnStart({
        sheet: noFeatureSheet,
        unitLibrary,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Heroic Warrior requires a retained combat turn-start Heroic Inspiration feature.",
      },
    });
  });
});

const fighterHeroicWarriorSelectedIdentityActions = {
  doUseHeroicWarrior: (): FighterHeroicWarriorSelectedIdentityProjection => {
    const sheet = requireRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:heroic-warrior-replay"),
        build: championFighterLevelTenBuild(),
        currentHp: Hp(60),
        tempHp: Hp(0),
        heroicInspiration: CHARACTER_SHEET_NO_HEROIC_INSPIRATION,
        unitLibrary,
      }),
    );
    const next = requireRight(
      useHeroicWarriorAtCombatTurnStart({ sheet, unitLibrary }),
    );
    if (next.heroicInspiration.tag !== "available") {
      throw new Error("Heroic Warrior replay must grant Heroic Inspiration.");
    }
    return {
      unitId: "fighter_heroic_warrior",
      heroicInspiration: next.heroicInspiration.tag,
    };
  },
} as const satisfies Record<
  FighterHeroicWarriorSelectedIdentityDriverAction,
  () => FighterHeroicWarriorSelectedIdentityProjection
>;

function championFighterLevelTenBuild() {
  const build = armorClassBuild({
    startingClass: "class_fighter",
    advancements: Array.from({ length: 9 }, () => "class_fighter"),
  });
  return {
    ...build,
    features: [
      ...build.features,
      {
        kind: "selectedClassChoice" as const,
        selectedFromUnitId: "class_fighter",
        unitId: "subclass_fighter_champion",
      },
    ],
  };
}
