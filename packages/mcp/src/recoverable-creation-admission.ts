import {
  PHASE1_WEAPON_DAGGER_UNIT_ID,
  PHASE1_WEAPON_FLAIL_UNIT_ID,
  PHASE1_WEAPON_LONGSWORD_UNIT_ID,
  PHASE1_WEAPON_QUARTERSTAFF_UNIT_ID,
  PHASE1_WEAPON_SHORTSWORD_UNIT_ID,
  PHASE1_WEAPON_SPEAR_UNIT_ID,
  WEAPON_MASTERY_OPTIONS_CHOICE_KEY,
  creationChoiceOptionId,
  type CharacterCreationSupportProfile,
} from "@dnd/character-creation-runtime";

const FORMAT_THREE_MASTERY_OPTIONS = [
  PHASE1_WEAPON_LONGSWORD_UNIT_ID,
  PHASE1_WEAPON_DAGGER_UNIT_ID,
  PHASE1_WEAPON_SHORTSWORD_UNIT_ID,
  PHASE1_WEAPON_SPEAR_UNIT_ID,
  PHASE1_WEAPON_FLAIL_UNIT_ID,
  "weapon_greataxe",
  PHASE1_WEAPON_QUARTERSTAFF_UNIT_ID,
].map(creationChoiceOptionId);

export function formatThreeCreationReplayProfile(
  profile: CharacterCreationSupportProfile,
): CharacterCreationSupportProfile {
  return {
    ...profile,
    unitOptionIdsByChoiceKey: {
      ...profile.unitOptionIdsByChoiceKey,
      [WEAPON_MASTERY_OPTIONS_CHOICE_KEY]: FORMAT_THREE_MASTERY_OPTIONS,
    },
  };
}
