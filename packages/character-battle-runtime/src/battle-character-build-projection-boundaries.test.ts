import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import {
  characterBuildFeatureUnitIds,
  characterEquipmentItemId,
  characterEquipmentItemUnitId,
} from "@dnd/character-creation-runtime";
import { characterId, combatantId, initiativeScore } from "@dnd/battle-runtime";
import {
  battleCreatureInitIssueLeaves,
  battleCreatureInitIssueMessage,
  battleCreatureInitFromCharacterBuild,
  characterArmorClassState,
  characterBuildEquippedWeaponBattleBlockers,
  characterSpellcasting,
  characterWeaponAttackActionOptions,
} from "./index.ts";
import {
  levelFiveMartialBuild,
  requireSuccess,
  unitLibrary,
} from "./sdk-integration.test-support.ts";
import type { UnitRecord } from "@dnd/surface/surface/types";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Option, Result } from "effect";
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

function projectionLibraryReplacingUnit(
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

/**
 * The catalog with each named weapon's mastery reference pointing at a
 * missing Unit, so Battle refuses the weapon itself.
 */
function projectionLibraryWithUnresolvedMasteries(
  weaponUnitIds: readonly UnitRecord["id"][],
): UnitCatalog {
  const replaced = new Map<string, UnitRecord>(
    weaponUnitIds.map((id) => {
      const weapon = unitLibrary.requireUnit(id);
      if (weapon.kind !== "weapon") {
        throw new Error(`Expected ${id} to be a weapon Unit.`);
      }
      return [
        id,
        {
          ...weapon,
          masteryUnitId: authoredUnitId(`synthetic:missing-mastery-of-${id}`),
        },
      ] as const;
    }),
  );
  return {
    getUnit: (id) => {
      const replacement = replaced.get(id);
      return replacement === undefined
        ? unitLibrary.getUnit(id)
        : Option.some(replacement);
    },
    listUnits: () => unitLibrary.listUnits(),
    requireUnit: (id) => replaced.get(id) ?? unitLibrary.requireUnit(id),
  };
}

describe("Character Build battle spell projection boundaries", () => {
  test("accumulates selected and equipped weapon-definition rejections through public initialization", () => {
    const projectionLibrary = projectionLibraryWithUnresolvedMasteries([
      authoredUnitId("weapon_dagger"),
      authoredUnitId("weapon_shortbow"),
    ]);
    const build = {
      ...levelFiveMartialBuild({
        classUnitId: authoredUnitId("class_fighter"),
        weaponUnitId: authoredUnitId("weapon_shortbow"),
      }),
      features: [
        {
          kind: "selectedClassChoice" as const,
          selectedFromUnitId: authoredUnitId("fighter_weapon_mastery"),
          unitId: authoredUnitId("weapon_dagger"),
        },
      ],
    };
    const result = battleCreatureInitFromCharacterBuild({
      combatantId: combatantId("selected-weapon-definition-admission"),
      characterId: characterId(
        "character:selected-weapon-definition-admission",
      ),
      displayName: "Selected weapon definition admission",
      build,
      initiative: initiativeScore(10),
      ammunitionStocks: [],
      resourceExpenditures: [],
      unitLibrary: projectionLibrary,
    });

    expect(result._tag).toBe("Failure");
    if (result._tag === "Success") return;
    expect(battleCreatureInitIssueLeaves(result.failure)).toEqual([
      expect.objectContaining({
        tag: "battleWeaponDefinitionAdmissionIssue",
        root: { kind: "unit", id: "weapon_dagger" },
        admissionReason: "incomplete_graph",
        mechanicsPath: {
          family: "unit",
          nodes: [
            { kind: "singleton", role: "recordMechanics" },
            { kind: "singleton", role: "reference" },
          ],
        },
      }),
      expect.objectContaining({
        tag: "battleWeaponDefinitionAdmissionIssue",
        root: { kind: "unit", id: "weapon_shortbow" },
        admissionReason: "incomplete_graph",
        mechanicsPath: {
          family: "unit",
          nodes: [
            { kind: "singleton", role: "recordMechanics" },
            { kind: "singleton", role: "reference" },
          ],
        },
      }),
    ]);
  });

  test("rejects an off-hand loadout whose catalog target is not a weapon", () => {
    const build = levelFiveMartialBuild({
      classUnitId: authoredUnitId("class_fighter"),
      weaponUnitId: authoredUnitId("weapon_longsword"),
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
      unitLibrary: projectionLibraryReplacingUnit(
        authoredUnitId("weapon_shortbow"),
        unitLibrary.requireUnit("armor_chain_mail"),
      ),
      weaponMasteries: [],
      classLevels: [{ className: "fighter", level: 5 }],
    });

    expect(result).toMatchObject({
      _tag: "Failure",
      failure: {
        message: "Off-hand weapon loadout must reference a Weapon Unit.",
      },
    });
  });

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
    const longswordUnitId = requireSuccess(
      characterEquipmentItemUnitId(authoredUnitId("weapon_longsword")),
    );
    const mainAlternative = characterEquipmentItemId({
      slot: "main",
      unitId: longswordUnitId,
    });
    const offHandAlternative = characterEquipmentItemId({
      slot: "off",
      unitId: longswordUnitId,
    });
    const focusAlternative = characterEquipmentItemId({
      slot: "main",
      unitId: requireSuccess(
        characterEquipmentItemUnitId(authoredUnitId("weapon_quarterstaff")),
      ),
    });
    const equippedBuild: typeof build = {
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
          {
            kind: "catalogItem",
            itemId: mainAlternative,
            quantity: PositiveInteger(1),
          },
          {
            kind: "catalogItem",
            itemId: offHandAlternative,
            quantity: PositiveInteger(1),
          },
          {
            kind: "authoredCatalogItem",
            itemId: focusAlternative,
            authoredItemId: "Synthetic Arcane Staff",
            spellcastingFocusKind: "arcane",
            quantity: PositiveInteger(1),
          },
          {
            kind: "authoredStartingItem",
            itemName: "Synthetic Travel Pack",
            quantity: PositiveInteger(1),
          },
        ],
        loadout: {
          ...build.equipment.loadout,
          offHandWeapon: { itemId: offHandItemId },
        },
      },
    };
    const projectionLibrary = projectionLibraryWithUnresolvedMasteries([
      authoredUnitId("weapon_dagger"),
      authoredUnitId("weapon_shortbow"),
    ]);
    const result = characterWeaponAttackActionOptions({
      build: equippedBuild,
      unitLibrary: projectionLibrary,
      weaponMasteries: [],
      classLevels: [{ className: "fighter", level: 5 }],
    });

    expect(result._tag).toBe("Failure");
    if (result._tag === "Success") return;
    expect(battleCreatureInitIssueLeaves(result.failure)).toEqual([
      expect.objectContaining({
        tag: "battleWeaponDefinitionAdmissionIssue",
        root: { kind: "unit", id: "weapon_dagger" },
        admissionReason: "incomplete_graph",
      }),
      expect.objectContaining({
        tag: "battleWeaponDefinitionAdmissionIssue",
        root: { kind: "unit", id: "weapon_shortbow" },
        admissionReason: "incomplete_graph",
      }),
    ]);
    const blockers = requireSuccess(
      characterBuildEquippedWeaponBattleBlockers({
        build: equippedBuild,
        unitLibrary: projectionLibrary,
      }),
    );
    expect(blockers).toEqual([
      {
        slot: "main",
        itemId: build.equipment.loadout.weapon?.itemId,
        weaponUnitId: "weapon_dagger",
        messages: [expect.any(String)],
        weaponDefinitionAdmittedOwnedAlternatives: [
          mainAlternative,
          focusAlternative,
        ],
      },
      {
        slot: "offHand",
        itemId: offHandItemId,
        weaponUnitId: "weapon_shortbow",
        messages: [expect.any(String)],
        weaponDefinitionAdmittedOwnedAlternatives: [offHandAlternative],
      },
    ]);
    for (const blocker of blockers) {
      for (const message of blocker.messages) {
        expect(battleCreatureInitIssueMessage(result.failure)).toContain(
          message,
        );
      }
    }
  });

  test("discloses no equipped weapon blockers when the weapon definition is admitted", () => {
    expect(
      requireSuccess(
        characterBuildEquippedWeaponBattleBlockers({
          build: levelFiveMartialBuild({
            classUnitId: authoredUnitId("class_fighter"),
            weaponUnitId: authoredUnitId("weapon_longsword"),
          }),
          unitLibrary,
        }),
      ),
    ).toEqual([]);
  });

  test("blocks an equipped weapon only when its unsupported mastery is selected", () => {
    const daggerBuild = levelFiveMartialBuild({
      classUnitId: authoredUnitId("class_fighter"),
      weaponUnitId: authoredUnitId("weapon_dagger"),
    });
    expect(
      requireSuccess(
        characterBuildEquippedWeaponBattleBlockers({
          build: daggerBuild,
          unitLibrary,
        }),
      ),
    ).toEqual([]);

    const masteryBuild = {
      ...daggerBuild,
      features: [
        {
          kind: "selectedClassChoice" as const,
          selectedFromUnitId: authoredUnitId("fighter_weapon_mastery"),
          unitId: authoredUnitId("weapon_dagger"),
        },
      ],
    };
    expect(
      requireSuccess(
        characterBuildEquippedWeaponBattleBlockers({
          build: masteryBuild,
          unitLibrary,
        }),
      ),
    ).toEqual([
      {
        slot: "main",
        itemId: daggerBuild.equipment.loadout.weapon?.itemId,
        weaponUnitId: "weapon_dagger",
        messages: [expect.any(String)],
        weaponDefinitionAdmittedOwnedAlternatives: [],
      },
    ]);
    const result = battleCreatureInitFromCharacterBuild({
      combatantId: combatantId("selected-unsupported-mastery"),
      characterId: characterId("character:selected-unsupported-mastery"),
      displayName: "Selected unsupported mastery",
      build: masteryBuild,
      initiative: initiativeScore(10),
      ammunitionStocks: [],
      resourceExpenditures: [],
      unitLibrary,
    });
    expect(result._tag).toBe("Failure");
    if (result._tag === "Success") return;
    expect(battleCreatureInitIssueLeaves(result.failure)).toEqual([
      expect.objectContaining({
        tag: "battleWeaponDefinitionAdmissionIssue",
        root: { kind: "unit", id: "weapon_dagger" },
      }),
    ]);
  });

  test("preserves all unresolved mastery selections instead of claiming no weapon blockers", () => {
    const daggerBuild = levelFiveMartialBuild({
      classUnitId: authoredUnitId("class_fighter"),
      weaponUnitId: authoredUnitId("weapon_dagger"),
    });
    const malformedSelectionBuild = {
      ...daggerBuild,
      features: [
        {
          kind: "selectedClassChoice" as const,
          selectedFromUnitId: authoredUnitId("fighter_weapon_mastery"),
          unitId: authoredUnitId("weapon_dagger"),
        },
        {
          kind: "selectedClassChoice" as const,
          selectedFromUnitId: authoredUnitId("fighter_weapon_mastery"),
          unitId: authoredUnitId("synthetic:missing-mastery-weapon"),
        },
        {
          kind: "selectedClassChoice" as const,
          selectedFromUnitId: authoredUnitId("fighter_weapon_mastery"),
          unitId: authoredUnitId("synthetic:another-missing-mastery-weapon"),
        },
      ],
    };
    const assessment = characterBuildEquippedWeaponBattleBlockers({
      build: malformedSelectionBuild,
      unitLibrary,
    });
    expect(assessment).toMatchObject({ _tag: "Failure" });
    if (Result.isSuccess(assessment)) return;
    expect(battleCreatureInitIssueLeaves(assessment.failure)).toEqual([
      expect.objectContaining({
        message: expect.stringContaining("synthetic:missing-mastery-weapon"),
      }),
      expect.objectContaining({
        message: expect.stringContaining(
          "synthetic:another-missing-mastery-weapon",
        ),
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
      unitLibrary: projectionLibraryReplacingUnit(
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
