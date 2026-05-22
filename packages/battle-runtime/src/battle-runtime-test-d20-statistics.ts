import type { CharacterBattleD20Statistics } from "./battle-init.ts";

export function testCharacterD20Statistics(
  input?: Partial<CharacterBattleD20Statistics["abilityScores"]>,
): CharacterBattleD20Statistics {
  return {
    abilityScores: {
      str: input?.str ?? 10,
      dex: input?.dex ?? 10,
      con: input?.con ?? 10,
      int: input?.int ?? 10,
      wis: input?.wis ?? 10,
      cha: input?.cha ?? 10,
    },
    savingThrowProficiencies: [],
    skillProficiencies: [],
    skillExpertise: [],
  };
}
