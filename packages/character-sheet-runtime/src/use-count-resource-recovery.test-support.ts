import { unitId } from "@dnd/shared/game-facts";
import { Hp, resourceCount } from "@dnd/shared/types";
import { abilityScoreAssignment } from "@dnd/character-creation-runtime";
import type { CharacterBuild } from "@dnd/character-creation-runtime/consumer-protocol";
import {
  armorClassBuild,
  characterSheetId,
  characterSheetResources,
  rebuildCharacterSheetFixture,
  requireSuccess,
  unitLibrary,
} from "./test-support.test-support.ts";
export function bardSheet(level: 4 | 5, expended = 1) {
  const build: CharacterBuild = {
    ...armorClassBuild({
      startingClass: "class_bard",
      advancements: Array.from({ length: level - 1 }, () => "class_bard"),
    }),
    abilityScores: requireSuccess(
      abilityScoreAssignment({
        str: 13,
        dex: 14,
        con: 13,
        int: 8,
        wis: 16,
        cha: 14,
      }),
    ),
    spellcasting: {
      sources: [
        {
          sourceUnitId: unitId("class_bard"),
          spellcastingAbility: "cha",
          cantrips: [],
          spellbook: [],
          preparedSpells: [],
          spellcastingFocuses: ["musical_instrument"],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: [
            { spellLevel: 1, count: 4 },
            { spellLevel: 2, count: 3 },
            ...(level === 5 ? [{ spellLevel: 3, count: 2 }] : []),
          ],
        },
      },
    },
  };
  return requireSuccess(
    rebuildCharacterSheetFixture({
      characterId: characterSheetId("character:font"),
      build,
      currentHp: Hp(20),
      tempHp: Hp(0),
      unitLibrary,
      resourceExpenditures:
        expended === 0
          ? []
          : [
              {
                tag: "useCountResource",
                unitId: unitId("bard_bardic_inspiration"),
                expended: resourceCount(expended),
              },
            ],
    }),
  );
}
export function inspirationExpended(sheet: ReturnType<typeof bardSheet>) {
  return requireSuccess(characterSheetResources(sheet, unitLibrary)).find(
    (resource) => resource.tag === "useCountResource",
  )?.expended;
}
