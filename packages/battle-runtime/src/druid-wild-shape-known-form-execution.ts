import type { BattleStatBlockPresentationSource } from "./battle-runtime-context.ts";
import type {
  BattleDruidWildShapeKnownFormExecutionFacts,
  BattleDruidWildShapeKnownFormRuntime,
} from "./druid-wild-shape-known-form-runtime.ts";
export type {
  BattleDruidWildShapeFormSpeeds,
  LiteralStatBlockSpeed,
  LiteralWalkStatBlockSpeed,
} from "./druid-wild-shape-known-form-runtime.ts";

export type BattleDruidWildShapeKnownFormProjection =
  BattleDruidWildShapeKnownFormExecutionFacts & {
    readonly presentation: BattleStatBlockPresentationSource;
  };
export type BattleDruidWildShapeKnownForm =
  BattleDruidWildShapeKnownFormProjection &
    BattleDruidWildShapeKnownFormRuntime;
