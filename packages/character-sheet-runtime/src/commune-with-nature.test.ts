// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.commune-with-nature-session-invocation
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test table-caller.nature-exploration-facts
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION commune_with_nature
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION commune_with_nature
// UNIT-IDENTITY-REPLAY: L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION commune_with_nature doCastCommuneWithNature
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, it, test } from "vitest";

import {
  Either,
  Hp,
  armorClassBuild,
  castCommuneWithNature,
  characterSheetId,
  druidWildShapeFixtureKnownFormStatBlockIds,
  parseCharacterSheet,
  requireRight,
  spellSlotLevel,
  storedAvailableSheetInput,
  unitLibrary,
} from "./test-support.test-support.ts";

type CommuneWithNatureSelectedIdentityDriverAction = "doCastCommuneWithNature";

type CommuneWithNatureSelectedIdentityProjection = {
  readonly spellId: string;
  readonly spellSlotCost: "ordinary";
  readonly slotLevel: number;
  readonly slotExpended: number;
  readonly factCount: number;
  readonly answerOwner: "gm";
  readonly outdoorsRadiusMiles: number;
  readonly naturalUndergroundRadiusFeet: number;
  readonly categoryCount: number;
};

type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly CommuneWithNatureSelectedIdentityDriverAction[];
  readonly expected: CommuneWithNatureSelectedIdentityProjection;
};

type SelectedUnitIdentityReplay = {
  readonly taskId: "L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION";
  readonly unitId: "commune_with_nature";
  readonly actions: readonly CommuneWithNatureSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L19E-07-L5-DIVINATION-SOCIAL-EXPLORATION",
    unitId: "commune_with_nature",
    actions: ["doCastCommuneWithNature"],
    sequences: [
      {
        name: "selected-commune-with-nature-slot-cast-returns-gm-exploration-contract",
        actions: ["doCastCommuneWithNature"],
        expected: expectedCommuneWithNatureProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Character Sheet runtime / Commune with Nature", () => {
  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<CommuneWithNatureSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        let projection: CommuneWithNatureSelectedIdentityProjection | undefined;

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          projection = communeWithNatureSelectedIdentityActions[actionName]();
        }

        expect(projection, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  test("Commune with Nature spends a level-5 prepared spell slot and returns table-facing exploration facts", () => {
    const sheet = communeWithNatureDruidSheet({
      preparedSpells: ["commune_with_nature"],
      slots: 1,
    });
    const first = requireRight(castCommuneWithNature({ sheet, unitLibrary }));

    expect(first.invocation).toEqual({
      tag: "communeWithNature",
      spellId: "commune_with_nature",
      spellLevel: 5,
      spellSlotCost: { kind: "ordinary", spellLevel: spellSlotLevel(5) },
      preparationRequirement: "prepared",
      requiredSpellAccess: "class_prepared",
      facts: {
        count: 3,
        answerOwner: "gm",
        scope: {
          outdoorsRadiusMiles: 3,
          naturalUndergroundRadiusFeet: 300,
          blockedWhenNatureReplacedByConstruction: true,
        },
        categories: [
          "settlements",
          "planar_portals",
          "powerful_creatures",
          "plants_minerals_beasts",
          "bodies_of_water",
        ],
      },
    });
    expect(first.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 1 },
    ]);

    const second = castCommuneWithNature({ sheet: first.sheet, unitLibrary });
    expect(Either.isLeft(second)).toBe(true);
    if (Either.isLeft(second)) {
      expect(second.left.message).toBe(
        "Spell Slot spend requires an unexpended ordinary Spell Slot.",
      );
    }
  });

  test("Commune with Nature requires prepared class Spell Access", () => {
    const sheet = communeWithNatureDruidSheet({
      preparedSpells: [],
      slots: 1,
    });
    const result = castCommuneWithNature({ sheet, unitLibrary });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe(
        "Commune with Nature requires prepared class Spell Access.",
      );
    }
  });
});

const communeWithNatureSelectedIdentityActions = {
  doCastCommuneWithNature: () => {
    const result = requireRight(
      castCommuneWithNature({
        sheet: communeWithNatureDruidSheet({
          preparedSpells: ["commune_with_nature"],
          slots: 1,
        }),
        unitLibrary,
      }),
    );
    return {
      spellId: result.invocation.spellId,
      spellSlotCost: result.invocation.spellSlotCost.kind,
      slotLevel: result.invocation.spellSlotCost.spellLevel,
      slotExpended:
        (result.sheet.spellSlotExpenditures ?? []).find(
          (slot) => slot.spellLevel === spellSlotLevel(5),
        )?.expended ?? 0,
      factCount: result.invocation.facts.count,
      answerOwner: result.invocation.facts.answerOwner,
      outdoorsRadiusMiles: result.invocation.facts.scope.outdoorsRadiusMiles,
      naturalUndergroundRadiusFeet:
        result.invocation.facts.scope.naturalUndergroundRadiusFeet,
      categoryCount: result.invocation.facts.categories.length,
    };
  },
} as const satisfies Record<
  CommuneWithNatureSelectedIdentityDriverAction,
  () => CommuneWithNatureSelectedIdentityProjection
>;

function expectedCommuneWithNatureProjection(): CommuneWithNatureSelectedIdentityProjection {
  return {
    spellId: "commune_with_nature",
    spellSlotCost: "ordinary",
    slotLevel: 5,
    slotExpended: 1,
    factCount: 3,
    answerOwner: "gm",
    outdoorsRadiusMiles: 3,
    naturalUndergroundRadiusFeet: 300,
    categoryCount: 5,
  };
}

function communeWithNatureDruidSheet(input: {
  readonly preparedSpells: readonly string[];
  readonly slots: number;
}) {
  return requireRight(
    parseCharacterSheet(
      {
        ...storedAvailableSheetInput({
          characterId: characterSheetId(
            "character:commune-with-nature-druid-9",
          ),
          build: {
            ...armorClassBuild({
              startingClass: "class_druid",
              advancements: Array.from({ length: 8 }, () => "class_druid"),
            }),
            classFeatureLanguages: [
              {
                kind: "classFeatureLanguageGrant",
                sourceUnitId: authoredUnitId("druid_druidic"),
                language: "Druidic",
              },
            ],
            spellcasting: {
              sources: [
                {
                  sourceUnitId: authoredUnitId("class_druid"),
                  spellcastingAbility: "wis",
                  cantrips: ["druidcraft", "guidance", "produce_flame"],
                  spellbook: [],
                  preparedSpells: input.preparedSpells.map(authoredUnitId),
                  spellcastingFocuses: ["druidic_focus"],
                },
              ],
              slotPools: {
                spellcasting: {
                  kind: "spellcasting",
                  slots: [{ spellLevel: 5, count: input.slots }],
                },
              },
            },
          },
        }),
        hitPoints: { tag: "positive", currentHp: Hp(57), tempHp: Hp(0) },
        restFeatureUses: [],
        spellSlotExpenditures: [{ spellLevel: 5, expended: 0 }],
        createdSpellSlots: [],
        pactSlotExpenditure: undefined,
        druidWildShapeKnownForms: {
          statBlockIds: [
            ...druidWildShapeFixtureKnownFormStatBlockIds,
            "stat_block_cat",
            "stat_block_frog",
            "stat_block_bat",
            "stat_block_owl",
          ],
        },
      },
      unitLibrary,
    ),
  );
}
