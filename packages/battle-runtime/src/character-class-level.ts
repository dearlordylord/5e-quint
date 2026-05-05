import { ClassLevel } from "@dnd/shared/types";
import type { ClassName } from "@dnd/surface/surface/types";

export type CharacterBattleClassLevelInit = {
  readonly className: ClassName;
  readonly level: number;
};

export type CharacterBattleClassLevel = {
  readonly className: ClassName;
  readonly level: ClassLevel;
};
