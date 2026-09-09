import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import {
  characterBuildFeatureUnitIds,
  characterEquipmentItemId,
  characterEquipmentItemUnitId,
} from "@dnd/character-creation-runtime";
import {
  battleCreatureInitIssueLeaves,
  characterArmorClassState,
  characterSpellcasting,
  characterWeaponAttackActionOptions,
} from "./index.ts";
import {
  levelFiveMartialBuild,
  unitLibrary,
} from "./sdk-integration.test-support.ts";
import type { UnitRecord } from "@dnd/surface/surface/types";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Option } from "effect";
import { PositiveInteger } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";

function magicInitiateBuild(): ReturnType<typeof levelFiveMartialBuild> {
  return {
    ...levelFiveMartialBuild({
      classUnitId: authoredUnitId("class_fighter"),
      weaponUnitId: authoredUnitId("weapon_longsword"),
    }),
    background: authoredUnitId("background_sage"),
    magicInitiateSpellAccesses: [
      {
        featUnitId: authoredUnitId("feat_magic_initiate_wizard"),
        spellcastingAbility: "cha",
        cantrips: [authoredUnitId("fire_bolt"), authoredUnitId("light")],
        levelOneSpell: authoredUnitId("burning_hands"),
      },
    ],
  };
}

function projectionLibraryWithMissingUnit(
  missingUnitId: UnitRecord["id"],
): UnitCatalog {
  return {
    getUnit: (id) =>
      id === missingUnitId ? Option.none() : unitLibrary.getUnit(id),
    listUnits: () => unitLibrary.listUnits(),
    requireUnit: (id) => unitLibrary.requireUnit(id),
  };
}

function projectionLibraryWithWrongUnitKind(
  replacedUnitId: UnitRecord["id"],
  replacement: UnitRecord,
): UnitCatalog {
  return {
    getUnit: (id) =>
      id === replacedUnitId
        ? Option.some(replacement)
        : unitLibrary.getUnit(id),
    listUnits: () => unitLibrary.listUnits(),
    requireUnit: (id) => unitLibrary.requireUnit(id),
  };
}

describe("Character Build battle spell projection boundaries", () => {
  test("accumulates independently rejected main and off-hand weapon definitions", () => {
    const build = levelFiveMartialBuild({
      classUnitId: authoredUnitId("class_fighter"),
      weaponUnitId: authoredUnitId("weapon_dagger"),
    });
    const offHandUnitId = characterEquipmentItemUnitId(
      authoredUnitId("weapon_shortbow"),
    );
    if (offHandUnitId._tag === "Failure") {
      throw new Error("Expected an off-hand weapon Unit id fixture.");
    }
    const offHandItemId = characterEquipmentItemId({
      slot: "off",
      unitId: offHandUnitId.success,
    });
    const result = characterWeaponAttackActionOptions({
      build: {
        ...build,
        equipment: {
          ...build.equipment,
          owned: [
            ...build.equipment.owned,
            {
              kind: "catalogItem",
              itemId: offHandItemId,
              quantity: PositiveInteger(1),
            },
          ],
          loadout: {
            ...build.equipment.loadout,
            offHandWeapon: { itemId: offHandItemId },
          },
        },
      },
      unitLibrary,
      weaponMasteries: [],
      classLevels: [{ className: "fighter", level: 5 }],
    });

    expect(result._tag).toBe("Failure");
    if (result._tag === "Success") return;
    expect(battleCreatureInitIssueLeaves(result.failure)).toEqual([
      expect.objectContaining({
        tag: "battleCreatureInitIssue",
        root: { kind: "unit", id: "weapon_dagger" },
        admissionReason: "unsupported_mechanics",
      }),
      expect.objectContaining({
        tag: "battleCreatureInitIssue",
        root: { kind: "unit", id: "weapon_shortbow" },
        admissionReason: "unsupported_mechanics",
      }),
    ]);
  });

  test("reports a selected defensive feature that is unavailable", () => {
    const build = magicInitiateBuild();
    const [featureUnitId] = characterBuildFeatureUnitIds(build, unitLibrary);
    if (featureUnitId === undefined) {
      throw new Error("Expected a selected Fighter feature fixture.");
    }
    const result = characterArmorClassState({
      build,
      unitLibrary: projectionLibraryWithMissingUnit(featureUnitId),
    });

    expect(result).toMatchObject({
      _tag: "Failure",
      failure: {
        message: expect.stringContaining(featureUnitId),
      },
    });
  });

  test("reports a spell access whose selected Spell Definition is unavailable", () => {
    const build = magicInitiateBuild();
    const missingSpellId = build.magicInitiateSpellAccesses[0]?.cantrips[0];
    if (missingSpellId === undefined) {
      throw new Error("Expected Magic Initiate cantrip fixture.");
    }

    const result = characterSpellcasting({
      build,
      unitLibrary: projectionLibraryWithMissingUnit(missingSpellId),
      resourceExpenditures: [],
    });

    expect(result).toMatchObject({
      _tag: "Failure",
      failure: {
        tag: "characterBattleSpellAccessProjectionIssue",
        accessIndex: 0,
        cause: "invalidSpellSelection",
        message: expect.stringContaining(missingSpellId),
      },
    });
  });

  test("reports a spell access whose selected Unit is not a Spell Definition", () => {
    const build = magicInitiateBuild();
    const wrongKindSpellId = build.magicInitiateSpellAccesses[0]?.cantrips[0];
    if (wrongKindSpellId === undefined) {
      throw new Error("Expected Magic Initiate cantrip fixture.");
    }

    const result = characterSpellcasting({
      build,
      unitLibrary: projectionLibraryWithWrongUnitKind(
        wrongKindSpellId,
        unitLibrary.requireUnit("class_fighter"),
      ),
      resourceExpenditures: [],
    });

    expect(result).toMatchObject({
      _tag: "Failure",
      failure: {
        tag: "characterBattleSpellAccessProjectionIssue",
        accessIndex: 0,
        cause: "invalidSpellSelection",
        message: `Expected spell Unit: ${wrongKindSpellId}`,
      },
    });
  });
});
