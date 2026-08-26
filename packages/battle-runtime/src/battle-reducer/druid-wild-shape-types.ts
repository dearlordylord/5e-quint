// Type-only leaf for Druid Wild Shape product types. Kept separate from
// druid-wild-shape.ts and creature-state-leaves.ts to avoid a type-import cycle.

import type { BattleActiveEffect } from "../battle-state-execution.ts";
import type { BattleDruidWildShapeKnownFormRuntime } from "../druid-wild-shape-known-form-runtime.ts";
import type { StatBlockExecutionAdmission } from "../stat-block-execution-state.ts";

export type ActiveDruidWildShape = {
  readonly effect: Extract<
    BattleActiveEffect,
    { readonly kind: "druidWildShapeForm" }
  >;
  readonly admission: StatBlockExecutionAdmission<BattleDruidWildShapeKnownFormRuntime>;
};
