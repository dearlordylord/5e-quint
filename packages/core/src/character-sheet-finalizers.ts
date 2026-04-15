import type { CharacterDraft } from "#/character-domain-model.ts";
import type {
  CharacterLoadout,
  CharacterLoadoutDraft,
} from "#/character-equipment.ts";
import type { CharacterSheetBuildChoices } from "#/character-feature-types.ts";
import type { CharacterSheetSpellcastingChoices } from "#/character-spellcasting.ts";
import { classRequiresOwnedSpellcasting } from "#/character-spellcasting-data.ts";
import type { CharacterClassLevels } from "#/character-domain-model.ts";
import { CASTER_CLASSES } from "#/types.ts";

export function finalizedBuildChoices(
  choices: CharacterDraft["choices"],
): CharacterSheetBuildChoices {
  return {
    primaryClassSkills: [...(choices?.primaryClassSkills ?? [])],
    multiclassSkills: {
      bard: [...(choices?.multiclassSkills?.bard ?? [])],
      ranger: [...(choices?.multiclassSkills?.ranger ?? [])],
      rogue: [...(choices?.multiclassSkills?.rogue ?? [])],
    },
    backgroundTool: choices?.backgroundTool,
    bardInstruments: [...(choices?.bardInstruments ?? [])],
    multiclassBardInstrument: choices?.multiclassBardInstrument,
    monkTool: choices?.monkTool,
    speciesSkill: choices?.speciesSkill,
    humanOriginFeat: choices?.humanOriginFeat,
    rogueLanguage: choices?.rogueLanguage,
    rangerDeftExplorerLanguages: [
      ...(choices?.rangerDeftExplorerLanguages ?? []),
    ],
    clericDivineOrder: choices?.clericDivineOrder,
    druidPrimalOrder: choices?.druidPrimalOrder,
    fighterFightingStyle: choices?.fighterFightingStyle,
    championAdditionalFightingStyle: choices?.championAdditionalFightingStyle,
    paladinFightingStyle: choices?.paladinFightingStyle,
    rangerFightingStyle: choices?.rangerFightingStyle,
    expertiseSkills: [...(choices?.expertiseSkills ?? [])],
  };
}

export function finalizedLoadout(
  loadout: CharacterLoadoutDraft | undefined,
): CharacterLoadout {
  return {
    wornArmor: loadout?.wornArmor ?? null,
    wieldedWeapon: loadout?.wieldedWeapon ?? null,
    secondaryWeapon: loadout?.secondaryWeapon ?? null,
    shield: loadout?.shield === true,
    wieldedWeaponGrip: loadout?.wieldedWeaponGrip ?? null,
  };
}

export function finalizedSpellcastingChoices(
  classLevels: CharacterClassLevels,
  choices: CharacterDraft["choices"],
  spellcasting: CharacterDraft["spellcasting"],
): CharacterSheetSpellcastingChoices {
  return CASTER_CLASSES.reduce<CharacterSheetSpellcastingChoices>(
    (entries, className) => {
      const level = classLevels[className];
      const ownedEntry =
        level > 0 && classRequiresOwnedSpellcasting(className, level, choices)
          ? spellcasting?.[className]
          : undefined;
      return {
        ...entries,
        [className]: {
          cantrips: [...(ownedEntry?.cantrips ?? [])],
          preparedSpells: [...(ownedEntry?.preparedSpells ?? [])],
          spellbook: [...(ownedEntry?.spellbook ?? [])],
        },
      };
    },
    {
      bard: { cantrips: [], preparedSpells: [], spellbook: [] },
      cleric: { cantrips: [], preparedSpells: [], spellbook: [] },
      druid: { cantrips: [], preparedSpells: [], spellbook: [] },
      paladin: { cantrips: [], preparedSpells: [], spellbook: [] },
      ranger: { cantrips: [], preparedSpells: [], spellbook: [] },
      sorcerer: { cantrips: [], preparedSpells: [], spellbook: [] },
      warlock: { cantrips: [], preparedSpells: [], spellbook: [] },
      wizard: { cantrips: [], preparedSpells: [], spellbook: [] },
    },
  );
}
