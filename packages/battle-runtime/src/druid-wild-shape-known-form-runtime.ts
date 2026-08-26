import type {
  CreatureSpeed,
  Size,
  StatBlockValue,
} from "@dnd/surface/surface/types";

import type { BattleStatBlockExecutionSource } from "./stat-block-execution-state.ts";

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

/** Mechanical known-form facts retained by battle execution. */
export type BattleDruidWildShapeKnownFormExecutionFacts =
  BattleStatBlockExecutionSource & {
    readonly statBlock: Omit<
      BattleStatBlockExecutionSource["statBlock"],
      "ac" | "size" | "speeds"
    > & {
      readonly ac: LiteralStatBlockValue;
      readonly size: Size;
      readonly speeds: BattleDruidWildShapeFormSpeeds;
    };
  };

/** Source-free form retained by durable battle execution state. */
export type BattleDruidWildShapeKnownFormRuntime =
  BattleDruidWildShapeKnownFormExecutionFacts & {
    readonly [battleDruidWildShapeKnownFormBrand]: true;
  };
