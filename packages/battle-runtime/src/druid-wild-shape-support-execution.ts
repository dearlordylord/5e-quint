import type { CreatureType } from "@dnd/shared/game-facts";
import type { ClassLevel } from "@dnd/shared/types";

export const DRUID_WILD_SHAPE_KNOWN_FORM_SUPPORT_PROFILE =
  "druidWildShapeKnownForm";
export const DRUID_BEAST_SPELLS_CLASS_LEVEL = 18;

export type BattleDruidWildShapeKnownFormSupportProfile = {
  readonly kind: typeof DRUID_WILD_SHAPE_KNOWN_FORM_SUPPORT_PROFILE;
  readonly classLevel: ClassLevel;
  readonly knownFormRoster: {
    readonly creatureType: CreatureType;
    readonly count: number;
    readonly maxChallengeRating: number;
    readonly flySpeed: "allowed" | "forbidden";
  };
};
