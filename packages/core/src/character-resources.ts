import type { CharacterSheet } from "#/character-domain.ts";
import type { CharacterClassResourcePool } from "#/character-feature-types.ts";
import { totalClassLevels } from "#/character-domain.ts";
import { rageMaxCharges } from "#/features/class-barbarian.ts";
import { bardicInspirationMaxCharges } from "#/features/class-bard.ts";
import { channelDivinityMax } from "#/features/class-cleric.ts";
import { wildShapeMaxCharges } from "#/features/class-druid.ts";
import {
  actionSurgeMaxCharges,
  indomitableMaxCharges,
  secondWindMaxCharges,
} from "#/features/class-fighter.ts";
import { pFocusMax } from "#/features/class-monk.ts";
import { layOnHandsPoolMax } from "#/features/class-paladin.ts";
import {
  favoredEnemyFreeUses,
  naturesVeilMaxCharges,
  tirelessMaxCharges,
} from "#/features/class-ranger.ts";
import { sorceryPointsMax } from "#/features/class-sorcerer.ts";
import {
  invocationsKnown,
  pactSlotCount,
  pactSlotLevel,
} from "#/features/class-warlock.ts";

const PROFICIENCY_BONUS_BY_LEVEL = [
  2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6,
] as const;

export function deriveProficiencyBonus(sheet: CharacterSheet): number {
  const totalLevel = totalClassLevels(sheet.classLevels);
  return PROFICIENCY_BONUS_BY_LEVEL[Math.max(0, totalLevel - 1)] ?? 6;
}

export function deriveCharacterClassResources(
  sheet: CharacterSheet,
): ReadonlyArray<CharacterClassResourcePool> {
  const resources: CharacterClassResourcePool[] = [];
  const chaMod = Math.trunc((sheet.abilityScores.cha - 10) / 2);
  const wisMod = Math.trunc((sheet.abilityScores.wis - 10) / 2);

  if (sheet.classLevels.barbarian > 0) {
    resources.push({
      name: "Rage",
      uses: rageMaxCharges(sheet.classLevels.barbarian),
      rechargesOn: "longRest",
    });
  }
  if (sheet.classLevels.bard > 0) {
    resources.push({
      name: "Bardic Inspiration",
      uses: bardicInspirationMaxCharges(chaMod),
      rechargesOn: sheet.classLevels.bard >= 5 ? "shortOrLongRest" : "longRest",
    });
  }
  if (sheet.classLevels.cleric > 0 || sheet.classLevels.paladin > 0) {
    const uses = channelDivinityMax({
      clericLevel: sheet.classLevels.cleric,
      paladinLevel: sheet.classLevels.paladin,
    });
    if (uses > 0) {
      resources.push({
        name: "Channel Divinity",
        uses,
        rechargesOn: "shortRest",
      });
    }
  }
  if (sheet.classLevels.druid > 0) {
    const uses = wildShapeMaxCharges(sheet.classLevels.druid);
    if (uses > 0) {
      resources.push({
        name: "Wild Shape",
        uses,
        rechargesOn: "shortRest",
      });
    }
  }
  if (sheet.classLevels.fighter > 0) {
    resources.push({
      name: "Second Wind",
      uses: secondWindMaxCharges(sheet.classLevels.fighter),
      rechargesOn: "shortRest",
    });
  }
  if (sheet.classLevels.fighter >= 2) {
    resources.push({
      name: "Action Surge",
      uses: actionSurgeMaxCharges(sheet.classLevels.fighter),
      rechargesOn: "shortRest",
    });
  }
  if (sheet.classLevels.fighter >= 9) {
    resources.push({
      name: "Indomitable",
      uses: indomitableMaxCharges(sheet.classLevels.fighter),
      rechargesOn: "longRest",
    });
  }
  if (sheet.classLevels.monk >= 2) {
    resources.push({
      name: "Focus Points",
      uses: pFocusMax(sheet.classLevels.monk),
      rechargesOn: "shortOrLongRest",
    });
  }
  if (sheet.classLevels.paladin > 0) {
    resources.push({
      name: "Lay on Hands",
      uses: layOnHandsPoolMax(sheet.classLevels.paladin),
      rechargesOn: "longRest",
    });
  }
  if (sheet.classLevels.ranger > 0) {
    resources.push({
      name: "Favored Enemy",
      uses: favoredEnemyFreeUses(sheet.classLevels.ranger),
      rechargesOn: "longRest",
    });
  }
  if (sheet.classLevels.ranger >= 10) {
    resources.push({
      name: "Tireless",
      uses: tirelessMaxCharges(wisMod),
      rechargesOn: "longRest",
    });
  }
  if (sheet.classLevels.ranger >= 14) {
    resources.push({
      name: "Nature's Veil",
      uses: naturesVeilMaxCharges(wisMod),
      rechargesOn: "longRest",
    });
  }
  if (sheet.classLevels.sorcerer >= 2) {
    resources.push({
      name: "Sorcery Points",
      uses: sorceryPointsMax(sheet.classLevels.sorcerer),
      rechargesOn: "longRest",
    });
  }
  if (sheet.classLevels.warlock > 0) {
    resources.push({
      name: "Pact Slots",
      uses: pactSlotCount(sheet.classLevels.warlock),
      rechargesOn: "shortRest",
    });
    resources.push({
      name: `Pact Slot Level ${pactSlotLevel(sheet.classLevels.warlock)}`,
      uses: pactSlotLevel(sheet.classLevels.warlock),
      rechargesOn: "longRest",
    });
    resources.push({
      name: "Invocations Known",
      uses: invocationsKnown(sheet.classLevels.warlock),
      rechargesOn: "longRest",
    });
  }

  return resources;
}
