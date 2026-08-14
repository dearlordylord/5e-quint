// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.passive-defense-projection
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L110D-08-LAND-AND-FIEND-RESISTANCES druid_natures_ward warlock_fiendish_resilience
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L110D-09-MONK-PALADIN-WIZARD-LEVEL10-SHEET monk_self_restoration paladin_aura_of_courage wizard_empowered_evocation
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L110D-08-LAND-AND-FIEND-RESISTANCES druid_natures_ward warlock_fiendish_resilience
// UNIT-IDENTITY-REPLAY: L110D-08-LAND-AND-FIEND-RESISTANCES druid_natures_ward doProjectDruidNaturesWard
// UNIT-IDENTITY-REPLAY: L110D-08-LAND-AND-FIEND-RESISTANCES warlock_fiendish_resilience doSelectWarlockFiendishResilience
import { statBlockId as authoredStatBlockId } from "@dnd/shared/game-facts";
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, it, test } from "vitest";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";

import {
  Hp,
  abilityScoreAssignment,
  armorClassBuild,
  characterSheetId,
  completeLongRest,
  completeShortRest,
  rebuildCharacterSheetFixture,
  druidCircleLandBuild,
  druidWildShapeFixtureKnownFormStatBlockIds,
  empoweredEvocationDamageRollModifier,
  parseCharacterSheet,
  requireRight,
  removeSelfRestorationConditionAtTurnEnd,
  unitLibrary,
  warlockMagicalCunningBuild,
  type CharacterBuild,
} from "./test-support.test-support.ts";
import {
  characterSheetPassiveDefenseProjection,
  parseStoredFiendishResilience,
} from "./passive-defenses.ts";

const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});

if (statBlockCatalogResult.tag !== "ok") {
  throw new Error("SRD Stat Block catalog fixture must build successfully.");
}

const statBlockCatalog = statBlockCatalogResult.catalog;

export const fiendishResiliencePassiveDefenseProjectionTestName =
  "Fiendish Resilience projects and can be reselected on Short or Long Rest";
export const fiendishResiliencePassiveDefenseGateTestName =
  "Fiendish Resilience rejects Force and missing feature ownership";
export const naturesWardPassiveDefenseProjectionTestName =
  "Nature's Ward projects Poisoned immunity and land-derived resistance";
export const auraOfCouragePassiveDefenseProjectionTestName =
  "Aura of Courage projects Frightened immunity through the passive defense owner";
export const selfRestorationConditionCleanupTestName =
  "Self-Restoration projects survival protection and removes one turn-end condition";
export const empoweredEvocationDamageModifierProjectionTestName =
  "Empowered Evocation projects Intelligence modifier for Wizard Evocation spell damage";

type PassiveDefenseSelectedIdentityDriverAction =
  | "doProjectDruidNaturesWard"
  | "doSelectWarlockFiendishResilience";

type PassiveDefenseSelectedIdentityProjection =
  | {
      readonly unitId: "druid_natures_ward";
      readonly damageResistances: readonly string[];
      readonly conditionImmunities: readonly string[];
      readonly selectedLandAfterLongRest: "arid";
    }
  | {
      readonly unitId: "warlock_fiendish_resilience";
      readonly initialDamageType: "fire";
      readonly damageTypeAfterShortRest: "cold";
      readonly damageTypeAfterLongRest: "psychic";
    };

type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly PassiveDefenseSelectedIdentityDriverAction[];
  readonly expected: PassiveDefenseSelectedIdentityProjection;
};

type SelectedUnitIdentityReplay = {
  readonly taskId: "L110D-08-LAND-AND-FIEND-RESISTANCES";
  readonly unitId: "druid_natures_ward" | "warlock_fiendish_resilience";
  readonly actions: readonly PassiveDefenseSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L110D-08-LAND-AND-FIEND-RESISTANCES",
    unitId: "druid_natures_ward",
    actions: ["doProjectDruidNaturesWard"],
    sequences: [
      {
        name: "selected-druid-natures-ward-projects-land-resistance",
        actions: ["doProjectDruidNaturesWard"],
        expected: {
          unitId: "druid_natures_ward",
          damageResistances: ["lightning"],
          conditionImmunities: ["poisoned"],
          selectedLandAfterLongRest: "arid",
        },
      },
    ],
  },
  {
    taskId: "L110D-08-LAND-AND-FIEND-RESISTANCES",
    unitId: "warlock_fiendish_resilience",
    actions: ["doSelectWarlockFiendishResilience"],
    sequences: [
      {
        name: "selected-warlock-fiendish-resilience-reselects-rest-resistance",
        actions: ["doSelectWarlockFiendishResilience"],
        expected: {
          unitId: "warlock_fiendish_resilience",
          initialDamageType: "fire",
          damageTypeAfterShortRest: "cold",
          damageTypeAfterLongRest: "psychic",
        },
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Character Sheet runtime / passive defenses", () => {
  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<PassiveDefenseSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        let projection: PassiveDefenseSelectedIdentityProjection | undefined;

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          projection = passiveDefenseSelectedIdentityActions[actionName]();
        }

        expect(projection, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  test(fiendishResiliencePassiveDefenseProjectionTestName, () => {
    const sheet = requireRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:fiendish-resilience"),
        build: fiendWarlockLevelTenBuild(),
        currentHp: Hp(58),
        tempHp: Hp(0),
        unitLibrary,
        fiendishResilience: {
          damageType: "fire",
        },
      }),
    );

    expect(
      characterSheetPassiveDefenseProjection({ sheet, unitLibrary }),
    ).toMatchObject({
      _tag: "Right",
      right: {
        damageResistances: ["fire"],
        fiendishResilience: {
          damageType: "fire",
        },
      },
    });
    expect(
      requireRight(parseCharacterSheet(sheet, unitLibrary)).fiendishResilience,
    ).toEqual({ damageType: "fire" });

    const shortRested = requireRight(
      completeShortRest({
        sheet,
        unitLibrary,
        fiendishResilienceDamageType: "cold",
      }),
    );
    expect(shortRested.fiendishResilience).toEqual({
      damageType: "cold",
    });

    const longRested = requireRight(
      completeLongRest({
        sheet: shortRested,
        unitLibrary,
        fiendishResilienceDamageType: "psychic",
      }),
    );
    expect(longRested.fiendishResilience).toEqual({
      damageType: "psychic",
    });
  });

  test(fiendishResiliencePassiveDefenseGateTestName, () => {
    const sheet = requireRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:fiendish-resilience-force"),
        build: fiendWarlockLevelTenBuild(),
        currentHp: Hp(58),
        tempHp: Hp(0),
        unitLibrary,
        fiendishResilience: {
          damageType: "fire",
        },
      }),
    );

    expect(
      completeShortRest({
        sheet,
        unitLibrary,
        fiendishResilienceDamageType: "force",
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Fiendish Resilience damage type must be a non-Force damage type.",
      },
    });

    expect(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:fiendish-resilience-unowned"),
        build: warlockMagicalCunningBuild({
          warlockAdvancements: 9,
          pactSlotCount: 2,
          pactSlotLevel: 5,
        }),
        currentHp: Hp(58),
        tempHp: Hp(0),
        unitLibrary,
        fiendishResilience: {
          damageType: "fire",
        },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Fiendish Resilience selection requires the Fiendish Resilience feature.",
      },
    });

    expect(parseStoredFiendishResilience({ damageType: "cold" })).toMatchObject(
      {
        _tag: "Right",
        right: { damageType: "cold" },
      },
    );
  });

  test(naturesWardPassiveDefenseProjectionTestName, () => {
    const sheet = requireRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:natures-ward-temperate"),
        build: druidCircleLandBuild({ druidLevel: 10 }),
        currentHp: Hp(58),
        tempHp: Hp(0),
        unitLibrary,
        druidWildShapeKnownFormStatBlockIds: [
          ...druidWildShapeFixtureKnownFormStatBlockIds,
          authoredStatBlockId("stat_block_cat"),
          authoredStatBlockId("stat_block_frog"),
          authoredStatBlockId("stat_block_lizard"),
          authoredStatBlockId("stat_block_weasel"),
        ],
        druidCircleLand: { land: "temperate" },
        statBlockCatalog,
      }),
    );

    expect(
      characterSheetPassiveDefenseProjection({ sheet, unitLibrary }),
    ).toMatchObject({
      _tag: "Right",
      right: {
        damageResistances: ["lightning"],
        conditionImmunities: ["poisoned"],
        naturesWard: {
          sourceUnitId: authoredUnitId("druid_natures_ward"),
          conditionImmunities: ["poisoned"],
          resistance: {
            land: "temperate",
            damageType: "lightning",
          },
        },
      },
    });

    const rested = requireRight(
      completeLongRest({
        sheet,
        unitLibrary,
        druidCircleLandChoice: "arid",
        statBlockCatalog,
      }),
    );
    expect(
      characterSheetPassiveDefenseProjection({ sheet: rested, unitLibrary }),
    ).toMatchObject({
      _tag: "Right",
      right: {
        damageResistances: ["fire"],
        conditionImmunities: ["poisoned"],
        naturesWard: {
          resistance: {
            land: "arid",
            damageType: "fire",
          },
        },
      },
    });
  });

  test(auraOfCouragePassiveDefenseProjectionTestName, () => {
    const sheet = requireRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:aura-of-courage"),
        build: paladinLevelTenBuild(),
        currentHp: Hp(64),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );

    expect(
      characterSheetPassiveDefenseProjection({ sheet, unitLibrary }),
    ).toMatchObject({
      _tag: "Right",
      right: {
        conditionImmunities: ["frightened"],
        auraOfCourage: {
          sourceUnitId: authoredUnitId("paladin_aura_of_courage"),
          conditionImmunities: ["frightened"],
          auraMembershipSource: {
            kind: "auraOfProtection",
            condition: "frightened",
          },
        },
      },
    });
  });

  test(selfRestorationConditionCleanupTestName, () => {
    const sheet = requireRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:self-restoration"),
        build: monkLevelTenBuild(),
        currentHp: Hp(58),
        tempHp: Hp(0),
        conditions: ["charmed", "frightened", "poisoned"],
        unitLibrary,
      }),
    );

    expect(
      characterSheetPassiveDefenseProjection({ sheet, unitLibrary }),
    ).toMatchObject({
      _tag: "Right",
      right: {
        selfRestoration: {
          sourceUnitId: authoredUnitId("monk_self_restoration"),
          turnEndRemovableConditions: ["charmed", "frightened", "poisoned"],
          foodAndDrinkExhaustionPrevented: true,
        },
      },
    });

    const restored = requireRight(
      removeSelfRestorationConditionAtTurnEnd({
        sheet,
        unitLibrary,
        condition: "frightened",
      }),
    );
    expect(restored.conditions).toEqual(["charmed", "poisoned"]);

    expect(
      removeSelfRestorationConditionAtTurnEnd({
        sheet: restored,
        unitLibrary,
        condition: "frightened",
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Self-Restoration requires the chosen condition to be present.",
      },
    });
  });

  test(empoweredEvocationDamageModifierProjectionTestName, () => {
    const sheet = requireRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:empowered-evocation"),
        build: wizardEvokerLevelTenBuild(),
        currentHp: Hp(42),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const fireball = spellRecord("fireball");

    expect(
      empoweredEvocationDamageRollModifier({
        sheet,
        unitLibrary,
        spell: fireball,
        spellSourceUnitId: authoredUnitId("class_wizard"),
      }),
    ).toMatchObject({
      _tag: "Right",
      right: {
        sourceUnitId: authoredUnitId("wizard_empowered_evocation"),
        spellSourceUnitId: "class_wizard",
        school: "evocation",
        damageRollAbility: "int",
        damageRollModifier: 4,
      },
    });

    expect(
      empoweredEvocationDamageRollModifier({
        sheet,
        unitLibrary,
        spell: spellRecord("hold_person"),
        spellSourceUnitId: authoredUnitId("class_wizard"),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Empowered Evocation requires an Evocation Spell Definition.",
      },
    });

    expect(
      empoweredEvocationDamageRollModifier({
        sheet,
        unitLibrary,
        spell: fireball,
        spellSourceUnitId: authoredUnitId("class_sorcerer"),
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Empowered Evocation requires Wizard Spell Access.",
      },
    });
  });
});

function fiendWarlockLevelTenBuild() {
  const build = warlockMagicalCunningBuild({
    warlockAdvancements: 9,
    pactSlotCount: 2,
    pactSlotLevel: 5,
  });
  return {
    ...build,
    features: [
      ...build.features,
      {
        kind: "selectedClassChoice" as const,
        selectedFromUnitId: authoredUnitId("class_warlock"),
        unitId: authoredUnitId("subclass_warlock_fiend_patron"),
      },
    ],
  };
}

function monkLevelTenBuild() {
  return armorClassBuild({
    startingClass: "class_monk",
    advancements: Array.from({ length: 9 }, () => "class_monk"),
  });
}

function paladinLevelTenBuild() {
  return armorClassBuild({
    startingClass: "class_paladin",
    advancements: Array.from({ length: 9 }, () => "class_paladin"),
  });
}

function wizardEvokerLevelTenBuild(): CharacterBuild {
  return {
    ...armorClassBuild({
      startingClass: "class_wizard",
      advancements: Array.from({ length: 9 }, () => "class_wizard"),
      features: [
        {
          kind: "selectedClassChoice" as const,
          selectedFromUnitId: authoredUnitId("class_wizard"),
          unitId: authoredUnitId("subclass_wizard_evoker"),
        },
      ],
    }),
    abilityScores: requireRight(
      abilityScoreAssignment({
        str: 8,
        dex: 14,
        con: 14,
        int: 18,
        wis: 12,
        cha: 10,
      }),
    ),
    spellcasting: {
      sources: [
        {
          sourceUnitId: authoredUnitId("class_wizard" as const),
          spellcastingAbility: "int" as const,
          cantrips: [] as const,
          spellbook: [
            authoredUnitId("fireball"),
            authoredUnitId("hold_person"),
          ] as const,
          preparedSpells: [
            authoredUnitId("fireball"),
            authoredUnitId("hold_person"),
          ] as const,
          spellcastingFocuses: ["arcane_focus" as const],
        },
      ] as const,
      slotPools: {
        spellcasting: {
          kind: "spellcasting" as const,
          slots: [
            { spellLevel: 1, count: 4 },
            { spellLevel: 2, count: 3 },
            { spellLevel: 3, count: 3 },
            { spellLevel: 4, count: 3 },
            { spellLevel: 5, count: 2 },
          ],
        },
      },
    },
  };
}

function spellRecord(unitId: string) {
  const unit = unitLibrary.requireUnit(unitId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected ${unitId} to be a Spell Definition.`);
  }
  return unit;
}

const passiveDefenseSelectedIdentityActions = {
  doProjectDruidNaturesWard: (): PassiveDefenseSelectedIdentityProjection => {
    const sheet = requireRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId("character:natures-ward-replay"),
        build: druidCircleLandBuild({ druidLevel: 10 }),
        currentHp: Hp(58),
        tempHp: Hp(0),
        unitLibrary,
        druidWildShapeKnownFormStatBlockIds: [
          ...druidWildShapeFixtureKnownFormStatBlockIds,
          authoredStatBlockId("stat_block_cat"),
          authoredStatBlockId("stat_block_frog"),
          authoredStatBlockId("stat_block_lizard"),
          authoredStatBlockId("stat_block_weasel"),
        ],
        druidCircleLand: { land: "temperate" },
        statBlockCatalog,
      }),
    );
    const projection = requireRight(
      characterSheetPassiveDefenseProjection({ sheet, unitLibrary }),
    );
    const rested = requireRight(
      completeLongRest({
        sheet,
        unitLibrary,
        druidCircleLandChoice: "arid",
        statBlockCatalog,
      }),
    );
    const restedProjection = requireRight(
      characterSheetPassiveDefenseProjection({ sheet: rested, unitLibrary }),
    );
    if (restedProjection.naturesWard?.resistance.land !== "arid") {
      throw new Error("Expected Nature's Ward replay to retain arid land.");
    }
    return {
      unitId: "druid_natures_ward",
      damageResistances: projection.damageResistances,
      conditionImmunities: projection.conditionImmunities,
      selectedLandAfterLongRest: restedProjection.naturesWard.resistance.land,
    };
  },
  doSelectWarlockFiendishResilience:
    (): PassiveDefenseSelectedIdentityProjection => {
      const sheet = requireRight(
        rebuildCharacterSheetFixture({
          characterId: characterSheetId("character:fiendish-resilience-replay"),
          build: fiendWarlockLevelTenBuild(),
          currentHp: Hp(58),
          tempHp: Hp(0),
          unitLibrary,
          fiendishResilience: {
            damageType: "fire",
          },
        }),
      );
      const projection = requireRight(
        characterSheetPassiveDefenseProjection({ sheet, unitLibrary }),
      );
      const shortRested = requireRight(
        completeShortRest({
          sheet,
          unitLibrary,
          fiendishResilienceDamageType: "cold",
        }),
      );
      const longRested = requireRight(
        completeLongRest({
          sheet: shortRested,
          unitLibrary,
          fiendishResilienceDamageType: "psychic",
        }),
      );
      if (projection.fiendishResilience?.damageType !== "fire") {
        throw new Error(
          "Expected Fiendish Resilience replay to start as fire.",
        );
      }
      if (shortRested.fiendishResilience?.damageType !== "cold") {
        throw new Error(
          "Expected Fiendish Resilience replay to reselect cold on Short Rest.",
        );
      }
      if (longRested.fiendishResilience?.damageType !== "psychic") {
        throw new Error(
          "Expected Fiendish Resilience replay to reselect psychic on Long Rest.",
        );
      }
      return {
        unitId: "warlock_fiendish_resilience",
        initialDamageType: projection.fiendishResilience.damageType,
        damageTypeAfterShortRest: shortRested.fiendishResilience.damageType,
        damageTypeAfterLongRest: longRested.fiendishResilience.damageType,
      };
    },
} as const satisfies Record<
  PassiveDefenseSelectedIdentityDriverAction,
  () => PassiveDefenseSelectedIdentityProjection
>;
