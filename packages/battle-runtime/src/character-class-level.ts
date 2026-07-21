import {
  ClassLevel,
  characterLevel,
  type CharacterLevel,
} from "@dnd/shared/types";
import type { ClassName } from "@dnd/surface/surface/types";

export type CharacterBattleClassLevelInit = {
  readonly className: ClassName;
  readonly level: number;
};

export type CharacterBattleClassLevel = {
  readonly className: ClassName;
  readonly level: ClassLevel;
};

export function characterBattleLevel(
  classLevels: readonly CharacterBattleClassLevel[],
): CharacterLevel {
  return characterLevel(
    classLevels.reduce(
      (total, classLevel) => total + Number(classLevel.level),
      0,
    ),
  );
}
