import type {
  CreatureSpeed,
  Size,
  StatBlockValue,
} from "@dnd/surface/surface/types";

import type { BattleStatBlockExecutionSource } from "./stat-block-execution-state.ts";
import type { BattleStatBlockPresentationSource } from "./battle-runtime-context.ts";

export type LiteralStatBlockValue = Extract<
  StatBlockValue,
  { readonly kind: "literal" }
>;
type LiteralCreatureSpeedFeet = Extract<
  CreatureSpeed["feet"],
  { readonly kind: "literal" }
>;
export type LiteralStatBlockSpeed = {
  readonly kind: CreatureSpeed["kind"];
  readonly feet: LiteralCreatureSpeedFeet;
};
export type LiteralWalkStatBlockSpeed = LiteralStatBlockSpeed & {
  readonly kind: "walk";
};
export type BattleDruidWildShapeFormSpeeds = readonly [
  LiteralWalkStatBlockSpeed,
  ...LiteralStatBlockSpeed[],
];

declare const battleDruidWildShapeKnownFormBrand: unique symbol;

export type BattleDruidWildShapeKnownFormProjection =
  BattleStatBlockExecutionSource & {
    readonly presentation: BattleStatBlockPresentationSource;
    readonly statBlock: Omit<
      BattleStatBlockExecutionSource["statBlock"],
      "ac" | "size" | "speeds"
    > & {
      readonly ac: LiteralStatBlockValue;
      readonly size: Size;
      readonly speeds: BattleDruidWildShapeFormSpeeds;
    };
  };
export type BattleDruidWildShapeKnownForm =
  BattleDruidWildShapeKnownFormProjection & {
    readonly [battleDruidWildShapeKnownFormBrand]: true;
  };
