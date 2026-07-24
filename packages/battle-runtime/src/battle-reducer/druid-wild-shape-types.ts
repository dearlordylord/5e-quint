// Type-only leaf for Druid Wild Shape product types. Kept separate from
// druid-wild-shape.ts and creature-state-leaves.ts to avoid a type-import cycle.

import type { BattleActiveEffect } from "../battle-state-execution.ts";
import type { BattleDruidWildShapeKnownForm } from "../druid-wild-shape-known-form-execution.ts";
import type { StatBlockExecutionAdmission } from "../stat-block-execution-state.ts";

export type ActiveDruidWildShape = {
  readonly effect: Extract<
    BattleActiveEffect,
    { readonly kind: "druidWildShapeForm" }
  >;
  readonly admission: StatBlockExecutionAdmission<BattleDruidWildShapeKnownForm>;
};
